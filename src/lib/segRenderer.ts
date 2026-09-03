import type { Annotation, SolarPosition } from '../types/shadow';
import type { SegmentationData, SegCategory } from '../types/segmentation';
import type { SunLightTarget } from '../types/environment';
import { computeSunLightTarget } from './lighting';
import { projectShadowPolygon, type ShadowCameraParams } from './shadowProjection';
import { applyDepthWarpToPolygon } from './depthWarp';
import { createCategoryMaskCanvas } from './segmentation';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}

const maskCache = new WeakMap<SegmentationData, Partial<Record<SegCategory, HTMLCanvasElement>>>();

function getMask(seg: SegmentationData, category: SegCategory): HTMLCanvasElement {
  let rec = maskCache.get(seg);
  if (!rec) {
    rec = {};
    maskCache.set(seg, rec);
  }
  if (!rec[category]) {
    rec[category] = createCategoryMaskCanvas(seg, category);
  }
  return rec[category]!;
}

/** Screen-space unit direction from the object's base toward the bulk of its cast shadow. */
function dominantShadowDirection(
  polygon: { x: number; y: number }[],
  annotation: Annotation
): { dx: number; dy: number } {
  const anchor = annotation.ground_anchor || annotation.polygon_coordinates[0];
  let cx = 0;
  let cy = 0;
  for (const p of polygon) {
    cx += p.x;
    cy += p.y;
  }
  cx /= polygon.length;
  cy /= polygon.length;
  const dx = cx - anchor.x;
  const dy = cy - anchor.y;
  const len = Math.hypot(dx, dy) || 1;
  return { dx: dx / len, dy: dy / len };
}

/** Draws the projected shadow layer (multiply + blur) onto a given 2D context. */
export function drawShadowLayerToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  annotations: Annotation[],
  solar: SolarPosition,
  cameraParams: ShadowCameraParams,
  depthMapData?: ImageData | null
): void {
  for (const annotation of annotations) {
    if (!annotation.polygon_coordinates || annotation.polygon_coordinates.length < 3) continue;
    let polygon = projectShadowPolygon(annotation, solar, width, height, cameraParams);
    if (polygon.length < 3) continue;
    if (depthMapData) {
      polygon = applyDepthWarpToPolygon(
        polygon,
        depthMapData,
        dominantShadowDirection(polygon, annotation)
      );
    }

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = Math.min(1, Math.max(0, annotation.canopy_opacity));
    ctx.fillStyle = 'rgb(18, 30, 50)';
    ctx.filter = `blur(${Math.min(18, Math.max(1, annotation.height_meters * 0.8))}px)`;
    ctx.beginPath();
    ctx.moveTo(polygon[0].x * width, polygon[0].y * height);
    for (let i = 1; i < polygon.length; i++) {
      ctx.lineTo(polygon[i].x * width, polygon[i].y * height);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/** Draws an effect offscreen, clips it to a category mask, then composites it with a blend mode. */
function compositeMasked(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  draw: (octx: CanvasRenderingContext2D) => void,
  maskCanvas: HTMLCanvasElement,
  blendMode: GlobalCompositeOperation
): void {
  const off = makeCanvas(width, height);
  const octx = off.getContext('2d');
  if (!octx) return;
  octx.clearRect(0, 0, width, height);
  draw(octx);
  octx.globalCompositeOperation = 'destination-in';
  // Scale the mask to the canvas size so it always aligns with the base photo, even if the
  // mask PNG has a different intrinsic resolution than the photo.
  octx.drawImage(maskCanvas, 0, 0, width, height);
  ctx.save();
  ctx.globalCompositeOperation = blendMode;
  ctx.drawImage(off, 0, 0);
  ctx.restore();
}


/**
 * Paints the sky gradient + sun glow into an offscreen canvas that will later be clipped to
 * the sky mask. `cloudCoverPct` darkens and desaturates the gradient toward an overcast
 * blue-gray so the masked sky reflects the live cloud cover instead of staying a fixed
 * bright blue.
 */
function renderSkyInto(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  target: SunLightTarget,
  cloudCoverPct: number = 0,
  glowAlphaPeak: number = 0.55
): void {
  const cloud = clamp(cloudCoverPct / 100, 0, 1);
  // Warmth at the horizon, damped as the sky turns overcast.
  const warm = clamp(1 - target.altitude_deg / 45, 0, 1) * (1 - cloud);
  const mix = (a: number, b: number): number => Math.round(a + (b - a) * cloud);

  // Clear-day sky colours: blue at the top, warm at the horizon.
  const topClear = { r: 110, g: 160, b: 235 };
  const midClear = { r: 160, g: 190, b: 235 };
  const bottomClear = { r: 255, g: 200 - warm * 60, b: 150 - warm * 40 };

  // Heavy-overcast targets: darker, desaturated blue-gray.
  const topOvercast = { r: 88, g: 98, b: 114 };
  const midOvercast = { r: 110, g: 116, b: 126 };
  const bottomOvercast = { r: 132, g: 132, b: 132 };

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(
    0,
    `rgb(${mix(topClear.r, topOvercast.r)}, ${mix(topClear.g, topOvercast.g)}, ${mix(topClear.b, topOvercast.b)})`
  );
  g.addColorStop(
    0.7,
    `rgb(${mix(midClear.r, midOvercast.r)}, ${mix(midClear.g, midOvercast.g)}, ${mix(midClear.b, midOvercast.b)})`
  );
  g.addColorStop(
    1,
    `rgb(${mix(bottomClear.r, bottomOvercast.r)}, ${mix(bottomClear.g, bottomOvercast.g)}, ${mix(bottomClear.b, bottomOvercast.b)})`
  );
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Sun glow — a soft, tight warm highlight rather than a white blob; fades as the sky turns
  // overcast. Alpha is kept low so the 'screen' blend never clips the sky region to pure white.
  const glowAlpha = clamp(target.intensity, 0, 1) * (1 - cloud * 0.6);
  const cx = clamp(target.screenX, 0, w);
  const cy = clamp(target.screenY, 0, h);
  const rad = Math.max(w, h) * 0.26;
  const { r, g: g2, b } = target.color;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
  glow.addColorStop(0, `rgba(${r},${g2},${b},${glowAlphaPeak * glowAlpha})`);
  glow.addColorStop(0.3, `rgba(${r},${g2},${b},${glowAlphaPeak * 0.4 * glowAlpha})`);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function renderGroundDirectInto(ctx: CanvasRenderingContext2D, w: number, h: number, target: SunLightTarget): void {
  const a = clamp(target.intensity, 0, 1) * 0.5;
  const { r, g, b } = target.color;
  const cx = target.inView ? clamp(target.screenX, 0, w) : target.screenDir.dx >= 0 ? w * 0.8 : w * 0.2;
  const cy = h * 0.85;
  const rad = Math.max(w, h) * 0.5;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
  grad.addColorStop(0, `rgba(${r},${g},${b},${a})`);
  grad.addColorStop(0.5, `rgba(${r},${g},${b},${a * 0.4})`);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function renderVerticalLightInto(ctx: CanvasRenderingContext2D, w: number, h: number, target: SunLightTarget): void {
  const a = clamp(target.intensity, 0, 1) * 0.5;
  const { r, g, b } = target.color;
  const len = Math.max(w, h) * 0.5;
  const sx = w / 2 - target.screenDir.dx * len;
  const sy = h / 2 - target.screenDir.dy * len;
  const ex = w / 2 + target.screenDir.dx * len;
  const ey = h / 2 + target.screenDir.dy * len;
  const grad = ctx.createLinearGradient(sx, sy, ex, ey);
  grad.addColorStop(0, `rgba(${r},${g},${b},${a})`);
  grad.addColorStop(0.55, `rgba(${r},${g},${b},${a * 0.5})`);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Renders the full environment respecting the semantic mask: shadows only on the ground,
 * a sky gradient + sun glow masked to the sky, direct sunlight on the ground and a
 * directional light on vertical objects. Used instead of the ad-hoc shadow/light passes when
 * a segmentation mask is available.
 */
export function renderSegmentedScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  annotations: Annotation[],
  solar: SolarPosition,
  seg: SegmentationData,
  cameraParams: ShadowCameraParams,
  depthMapData?: ImageData | null,
  cloudCoverPct: number = 0,
  sunLightStrength?: number,
  sunGlowAlpha?: number
): void {
  const target = computeSunLightTarget(
    solar,
    cameraParams.cameraAzimuthDeg ?? 0,
    cameraParams.cameraFovDeg ?? 65,
    width,
    height,
    cloudCoverPct,
    sunLightStrength
  );

  const groundMask = getMask(seg, 'ground');
  const skyMask = getMask(seg, 'sky');
  const verticalMask = getMask(seg, 'vertical');

  compositeMasked(
    ctx,
    width,
    height,
    (octx) => drawShadowLayerToCanvas(octx, width, height, annotations, solar, cameraParams, depthMapData),
    groundMask,
    'multiply'
  );

  if (target.altitude_deg > 0) {
    compositeMasked(ctx, width, height, (octx) => renderSkyInto(octx, width, height, target, cloudCoverPct, sunGlowAlpha), skyMask, 'source-over');
    compositeMasked(ctx, width, height, (octx) => renderGroundDirectInto(octx, width, height, target), groundMask, 'screen');
    if (annotations.length > 0) {
      compositeMasked(ctx, width, height, (octx) => renderVerticalLightInto(octx, width, height, target), verticalMask, 'screen');
    }
  }
}
