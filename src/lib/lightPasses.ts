import type { SegmentationData } from '../types/segmentation';
import type { SunLightTarget } from '../types/environment';
import { RENDER_CONFIG } from './environmentConfig';
import { acquireScratch, clamp, fitWorkSize } from './softShape';
import { getMask } from './segMasks';

/**
 * The three smooth, full-frame light passes of the segmented renderer — sky gradient + sun glow,
 * direct sunlight on the ground, and a directional light on vertical objects — each rendered at a
 * capped working resolution, clipped to its semantic mask and upscaled onto the photo.
 *
 * Mobile-first rationale (extracted from `segRenderer.ts`, behaviour unchanged):
 * - all three passes are gradients with no high-frequency detail, so `RENDER_CONFIG.effectWorkCapPx`
 *   plus a bilinear upscale is visually free and keeps the per-render cost far below the photo's
 *   pixel count (a 12 MPx photo is no longer composited four times at full resolution on a phone);
 * - every buffer is a pooled scratch canvas, so dragging the time slider does not allocate a
 *   handful of full-resolution canvases per frame.
 */
function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/**
 * Renders one smooth full-frame effect into a scratch canvas, clips it to a category mask, then
 * upscales it onto `ctx` with the given blend mode.
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
  const cloud = clamp01(cloudCoverPct / 100);
  // Warmth at the horizon, damped as the sky turns overcast.
  const warm = clamp01(1 - target.altitude_deg / 45) * (1 - cloud);
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
  const glowAlpha = clamp01(target.intensity) * (1 - cloud * 0.6);
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


/** Brightens the ground toward the sun (or the sun-facing side when the sun is out of frame). */
function renderGroundDirectInto(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  target: SunLightTarget
): void {
  const a = clamp01(target.intensity) * 0.5;
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

/** Directional light across vertical objects (trees, structures), along the sun direction. */
function renderVerticalLightInto(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  target: SunLightTarget
): void {
  const a = clamp01(target.intensity) * 0.5;
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
 * Applies all three masked light passes to `ctx`, in order:
 * sky (`source-over`) -> ground sunlight (`screen`) -> vertical light (`screen`).
 *
 * The caller skips this entirely at night (`target.altitude_deg <= 0`), which also skips building
 * the sky mask. The vertical pass only makes sense when the photo has annotated objects; the masks
 * come from the shared `segMasks.ts` cache, so re-fetching one here is free.
 */
export function renderMaskedLightPasses(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  seg: SegmentationData,
  target: SunLightTarget,
  cloudCoverPct: number = 0,
  sunGlowAlpha?: number,
  hasAnnotations: boolean = false
): void {
  const work = fitWorkSize(width, height, RENDER_CONFIG.effectWorkCapPx);
  const groundMask = getMask(seg, 'ground');

  compositeMaskedEffect(ctx, width, height, work, getMask(seg, 'sky'), 'source-over', (octx) =>
    renderSkyInto(octx, work.width, work.height, target, cloudCoverPct, sunGlowAlpha)
  );
  compositeMaskedEffect(ctx, width, height, work, groundMask, 'screen', (octx) =>
    renderGroundDirectInto(octx, work.width, work.height, target)
  );
  if (hasAnnotations) {
    compositeMaskedEffect(ctx, width, height, work, getMask(seg, 'vertical'), 'screen', (octx) =>
      renderVerticalLightInto(octx, work.width, work.height, target)
    );
  }
}
