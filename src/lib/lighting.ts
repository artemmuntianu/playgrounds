import type { Annotation, SolarPosition } from '../types/shadow';
import type { SunLightTarget, LightRenderConfig, CloudRenderConfig } from '../types/environment';
import { cloudDimFactor, skyOverlayColor } from './clouds';
import { RENDER_CONFIG } from './environmentConfig';
import { paintSoftPolygon } from './softShape';
import { computeSunScreenInfo } from './sunOverlay';

const DEG_TO_RAD = Math.PI / 180;

// Default cap for the sun-light so the additive 'screen' passes produce a soft, warm highlight
// instead of clipping the photo to pure white at a clear high sun. Can be overridden per photo
// via scene_metadata.sun_light_strength.
const MAX_SUN_INTENSITY = 0.8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Screen-space position, direction and intensity of the sun for the lighting passes.
 * Light comes from the OPPOSITE side of the cast shadow, so this reuses the same
 * relative-azimuth math used by the shadow projection.
 */
export function computeSunLightTarget(
  solar: SolarPosition,
  cameraAzimuthDeg: number,
  cameraFovDeg: number,
  width: number,
  height: number,
  cloudCoverPct: number = 0,
  maxIntensity: number = MAX_SUN_INTENSITY
): SunLightTarget {
  const info = computeSunScreenInfo(solar, cameraAzimuthDeg, cameraFovDeg, width, height);

  const t = clamp(solar.altitude_deg / 45, 0, 1); // 0 low sun, 1 high sun
  const intensity = t * cloudDimFactor(cloudCoverPct) * clamp(maxIntensity, 0, 1);
  // Slightly warm near the zenith so the highlight reads as sunlight, not a white blob.
  const color = {
    r: 255,
    g: Math.round(170 + 70 * t),
    b: Math.round(70 + 170 * t),
  };

  return {
    azimuth_deg: solar.azimuth_deg,
    altitude_deg: solar.altitude_deg,
    intensity,
    screenX: info.screenX,
    screenY: info.screenY,
    inView: info.inView,
    isBehind: info.isBehind,
    screenDir: info.screenDir,
    color,
  };
}

/** Draws a parameterised sun disc (halo + rays + core), faded by intensity. */
export function renderSunDisc(
  ctx: CanvasRenderingContext2D,
  target: SunLightTarget,
  _width: number,
  _height: number
): void {
  if (!target.inView || target.altitude_deg <= 0) return;
  const a = clamp(target.intensity, 0, 1);
  const { r, g, b } = target.color;
  const x = target.screenX;
  const y = target.screenY;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  // 1. Outer glow halo
  const halo = ctx.createRadialGradient(x, y, 5, x, y, 90);
  halo.addColorStop(0, `rgba(${r},${g},${b},${0.9 * a})`);
  halo.addColorStop(0.3, `rgba(250, 204, 21,${0.4 * a})`);
  halo.addColorStop(1, 'rgba(250, 204, 21,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, 90, 0, Math.PI * 2);
  ctx.fill();

  // 2. Rays
  ctx.strokeStyle = `rgba(253, 224, 71,${0.75 * a})`;
  ctx.lineWidth = 2.5;
  const rayLen = 45;
  for (let i = 0; i < 12; i++) {
    const angle = i * (30 * DEG_TO_RAD);
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * 18, y + Math.sin(angle) * 18);
    ctx.lineTo(x + Math.cos(angle) * (18 + rayLen), y + Math.sin(angle) * (18 + rayLen));
    ctx.stroke();
  }

  // 3. Core
  const disc = ctx.createRadialGradient(x, y, 0, x, y, 16);
  disc.addColorStop(0, '#ffffff');
  disc.addColorStop(0.7, '#fef08a');
  disc.addColorStop(1, '#eab308');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Brightens the ground toward the sun with a 'screen' radial gradient. */
export function renderGroundSunlight(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  target: SunLightTarget,
  config: LightRenderConfig,
  cloudCoverPct: number = 0
): void {
  if (!config.enabled || target.altitude_deg <= 0) return;
  const { r, g, b } = target.color;
  const alpha = clamp(config.intensity * target.intensity, 0, 1) * cloudDimFactor(cloudCoverPct);
  if (alpha <= 0.001) return;

  let cx = target.inView ? target.screenX : target.screenDir.dx >= 0 ? width : 0;
  let cy = target.inView ? target.screenY : height * 0.5;
  cx = clamp(cx, 0, width);
  cy = clamp(cy, 0, height);

  const radius = Math.max(width, height) * 0.55;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
  grad.addColorStop(0.4, `rgba(${r},${g},${b},${alpha * 0.5})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** Brightens the sun-facing side of each annotated object (blurred polygon, 'screen'). */
export function renderObjectSunlight(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  annotations: Annotation[],
  target: SunLightTarget,
  config: LightRenderConfig,
  cloudCoverPct: number = 0
): void {
  if (!config.enabled || target.altitude_deg <= 0) return;
  const alpha = clamp(config.intensity, 0, 1) * target.intensity * cloudDimFactor(cloudCoverPct);
  if (alpha <= 0.001) return;

  const { r, g, b } = target.color;
  const ox = config.offsetPx * target.screenDir.dx;
  const oy = config.offsetPx * target.screenDir.dy;

  // Penumbra through the engine-independent pyramid in `softShape`: `ctx.filter` is unsupported in
  // WebKit (every browser on iOS) and silently produced hard-edged light patches on phones.
  const blurRadiusPx = config.blurPx * (Math.max(width, height) / RENDER_CONFIG.effectWorkCapPx);

  for (const annotation of annotations) {
    const pts = annotation.polygon_coordinates;
    if (!pts || pts.length < 3) continue;
    // The offset is applied in normalised space so `paintSoftPolygon` can keep working in the
    // photo's own coordinate frame.
    const shifted = pts.map((p) => ({ x: p.x + ox / width, y: p.y + oy / height }));
    paintSoftPolygon(ctx, shifted, width, height, {
      blurRadiusPx,
      alpha,
      color: { r, g, b },
      composite: 'screen',
    });
  }
}

/** Full-frame sky tint (night / overcast). No-op on a clear day. */
export function renderSkyTint(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  solar: SolarPosition | null,
  cloudCoverPct: number,
  config: CloudRenderConfig
): void {
  if (!config.enabled) return;
  const { r, g, b, a } = skyOverlayColor(solar, cloudCoverPct);
  if (a <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

