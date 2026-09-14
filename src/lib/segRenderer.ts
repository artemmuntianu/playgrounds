import type { Annotation, SolarPosition } from '../types/shadow';
import type { SegmentationData, SegCategory } from '../types/segmentation';
import type { SunLightTarget } from '../types/environment';
import { computeSunLightTarget } from './lighting';
import { projectShadowPolygon, type ShadowCameraParams } from './shadowProjection';
import { applyDepthWarpToPolygon } from './depthWarp';
import { createCategoryMaskCanvas } from './segmentation';
import { RENDER_CONFIG, SHADOW_CONFIG } from './environmentConfig';
import { acquireScratch, blurCanvasOwned, fitWorkSize, paintSoftPolygon, toPixels } from './softShape';
import { penumbraRadiusPx, shadowAnchorPx, shadowTipPx } from './penumbra';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const maskCache = new WeakMap<SegmentationData, Partial<Record<SegCategory, HTMLCanvasElement>>>();

/**
 * Category mask canvas, cached per segmentation payload and feathered once.
 *
 * A 1-bit mask used with `destination-in` produced hard, stair-stepped edges exactly where a
 * shadow's penumbra is visible (the ground/object silhouette), which read as "bad rendering" on
 * phones. The feather is baked into the cached canvas, so its cost is paid once per photo.
 */
function getMask(seg: SegmentationData, category: SegCategory): HTMLCanvasElement {
  let record = maskCache.get(seg);
  if (!record) {
    record = {};
    maskCache.set(seg, record);
  }
  if (!record[category]) {
    const hard = createCategoryMaskCanvas(seg, category);
    record[category] = blurCanvasOwned(hard, RENDER_CONFIG.maskFeatherPx);
  }
  return record[category]!;
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

/**
 * Paints the projected shadow layer onto `ctx` at full resolution.
 *
 * Every annotation is filled through `paintSoftPolygon`, which produces the penumbra with the
 * engine-independent resolution pyramid in `softShape.ts`. `CanvasRenderingContext2D.filter` is
 * deliberately never used: it is not Baseline (WebKit ignores it, i.e. all browsers on iOS) and
 * silently degraded the shadows to hard, aliased, over-dark stripes on mobile.
 *
 * Softness is derived from the projected shadow itself (`penumbra.ts`), so a long low-sun shadow
 * gets a wide, faint penumbra while a compact high-sun shadow stays crisp — and the falloff from
 * the object's base towards the tip reproduces a real contact shadow.
 *
 * The layer is accumulated with `source-over`; the caller multiplies the finished layer onto the
 * photo once, so overlapping shadows behave like one occluder instead of darkening repeatedly.
 */
export function drawShadowLayerToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  annotations: Annotation[],
  solar: SolarPosition,
  cameraParams: ShadowCameraParams,
  depthMapData?: ImageData | null,
  penumbraStrength: number = 1
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

    const pixels = toPixels(polygon, width, height);
    const anchor = shadowAnchorPx(annotation, pixels, width, height);

    paintSoftPolygon(ctx, polygon, width, height, {
      blurRadiusPx: penumbraRadiusPx(pixels, solar.altitude_deg, penumbraStrength),
      alpha: clamp(annotation.canopy_opacity, 0, 1),
      color: SHADOW_CONFIG.color,
      composite: 'source-over',
      fade: {
        fromPx: anchor,
        toPx: shadowTipPx(pixels, anchor),
        toAlphaScale: SHADOW_CONFIG.tipFalloff,
      },
    });
  }
}

/**
 * Renders one smooth full-frame effect (sky gradient, ground sunlight, vertical light) at the
 * capped working resolution, clips it to a category mask, then upscales it onto the photo.
 *
 * Safe to upscale: all three passes are gradients with no high-frequency detail, while capping
 * keeps the per-render cost far below the photo's pixel count. This is what makes the engine
 * mobile-first — a 12 MPx photo is no longer composited four times at full resolution on a phone.
 */
function compositeMaskedEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  work: { width: number; height: number },
  mask: HTMLCanvasElement,
  blendMode: GlobalCompositeOperation,
  draw: (octx: CanvasRenderingContext2D) => void
): void {
  const effect = acquireScratch('effect', work.width, work.height, true);
  draw(effect.ctx);
  effect.ctx.globalCompositeOperation = 'destination-in';
  effect.ctx.drawImage(mask, 0, 0, work.width, work.height);
  effect.ctx.globalCompositeOperation = 'source-over';

  ctx.save();
  ctx.globalCompositeOperation = blendMode;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // Explicit source rect: the scratch canvas may be padded beyond the working size.
  ctx.drawImage(effect.canvas, 0, 0, work.width, work.height, 0, 0, width, height);
  ctx.restore();
}

/**
 * Paints the sky gradient + sun glow into a canvas that will later be clipped to the sky mask.
 * `cloudCoverPct` darkens and desaturates the gradient toward an overcast blue-gray so the masked
 * sky reflects the live cloud cover instead of staying a fixed bright blue.
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

function renderGroundDirectInto(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  target: SunLightTarget
): void {
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

function renderVerticalLightInto(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  target: SunLightTarget
): void {
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
  grad.addColorStop(1, `rgba(0, 0, 0, 0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Renders the full environment for one photo, respecting the semantic mask: soft shadows on the
 * ground only, a sky gradient + sun glow masked to the sky, direct sunlight on the ground and a
 * directional light on vertical objects.
 *
 * Resolution strategy (mobile-first):
 * - the shadow layer is painted at full resolution, because it is the only pass that carries
 *   visible detail (vector fills plus a blur confined to each shadow's own bounding box);
 * - the smooth full-frame passes are rendered at `RENDER_CONFIG.effectWorkCapPx` and upscaled;
 * - every buffer is a pooled scratch canvas, so dragging the time slider does not allocate a
 *   handful of full-resolution canvases per frame (the previous behaviour, and the main reason
 *   the viewer janked and the shadow edges looked cheap on phones).
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
  sunGlowAlpha?: number,
  penumbraStrength: number = 1
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
  const work = fitWorkSize(width, height, RENDER_CONFIG.effectWorkCapPx);

  // 1. Shadows: full resolution, clipped to the ground, multiplied onto the photo as ONE layer,
  //    so overlapping shadows behave like a single occluder instead of darkening repeatedly.
  if (solar.altitude_deg > 0 && annotations.length > 0) {
    const layer = acquireScratch('shadowLayer', width, height, true);
    drawShadowLayerToCanvas(
      layer.ctx,
      width,
      height,
      annotations,
      solar,
      cameraParams,
      depthMapData,
      penumbraStrength
    );
    layer.ctx.globalCompositeOperation = 'destination-in';
    layer.ctx.drawImage(groundMask, 0, 0, width, height);
    layer.ctx.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(layer.canvas, 0, 0, width, height, 0, 0, width, height);
    ctx.restore();
  }

  // 2. Sky, ground sunlight and vertical light, each clipped to its own semantic class. Skipped
  //    entirely at night (`target.altitude_deg <= 0`), which also skips building the sky mask.
  if (target.altitude_deg > 0) {
    compositeMaskedEffect(ctx, width, height, work, getMask(seg, 'sky'), 'source-over', (octx) =>
      renderSkyInto(octx, work.width, work.height, target, cloudCoverPct, sunGlowAlpha)
    );
    compositeMaskedEffect(ctx, width, height, work, groundMask, 'screen', (octx) =>
      renderGroundDirectInto(octx, work.width, work.height, target)
    );
    if (annotations.length > 0) {
      compositeMaskedEffect(ctx, width, height, work, getMask(seg, 'vertical'), 'screen', (octx) =>
        renderVerticalLightInto(octx, work.width, work.height, target)
      );
    }
  }
}


