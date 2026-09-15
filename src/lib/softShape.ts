import type { Point2D } from '../types/shadow';
import { RENDER_CONFIG } from './environmentConfig';

/** RGB triplet used for the shadow / sunlight tints. */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Axis-aligned bounding box in destination pixels. */
export interface PixelBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A pooled offscreen canvas plus its context (never allocated per frame). */
export interface ScratchCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
}

export interface SoftPolygonOptions {
  /** Target penumbra radius in destination pixels. */
  blurRadiusPx: number;
  /** Base alpha (0..1). Baked into the shape so the blur interpolates alpha correctly. */
  alpha: number;
  color: RGB;
  /** Blend mode used when the softened shape is composited back onto `ctx`. */
  composite: GlobalCompositeOperation;
  /**
   * Additional sub-paths (extra rings / triangles, same pixel & winding conventions as `polygon`)
   * filled as part of the SAME shape. Used by the depth extrusion in `shadowProjection.ts`, where
   * the far face and the side band of the object's volume must join the near face as one union
   * with a single alpha instead of being painted twice (which would darken the overlap).
   */
  extraRings?: Point2D[][];
  /** Optional contact falloff along the shadow axis (base darker than the tip). */
  fade?: {
    fromPx: Point2D;
    toPx: Point2D;
    toAlphaScale: number;
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const scratchPool = new Map<string, ScratchCanvas>();

/**
 * Returns a cleared, reusable offscreen canvas of at least the requested size.
 *
 * With `pad` the size is rounded up to `RENDER_CONFIG.scratchGranularityPx` so the continuously
 * changing bounding boxes produced while dragging the time slider do not reallocate a backing
 * store on every frame (a real stall on phones). The extra margin is transparent, so callers
 * must pass an explicit source rectangle whenever they scale the result into the photo.
 *
 * The pyramid levels of `blurCanvas` are always acquired *exactly*, because their size is what
 * defines the blur radius.
 */
export function acquireScratch(
  key: string,
  width: number,
  height: number,
  pad: boolean = false
): ScratchCanvas {
  const step = RENDER_CONFIG.scratchGranularityPx;
  const grow = (value: number): number =>
    pad ? Math.max(step, Math.ceil(Math.max(1, value) / step) * step) : Math.max(1, Math.ceil(value));
  const w = grow(width);
  const h = grow(height);

  let scratch = scratchPool.get(key);
  if (!scratch) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error(`Could not create a 2D context for scratch canvas "${key}"`);
    }
    canvas.width = w;
    canvas.height = h;
    scratch = { canvas, ctx, width: w, height: h };
    scratchPool.set(key, scratch);
  }

  if (scratch.width !== w || scratch.height !== h) {
    scratch.canvas.width = w;
    scratch.canvas.height = h;
    scratch.width = w;
    scratch.height = h;
  }

  scratch.ctx.setTransform(1, 0, 0, 1, 0, 0);
  scratch.ctx.globalAlpha = 1;
  scratch.ctx.globalCompositeOperation = 'source-over';
  scratch.ctx.imageSmoothingEnabled = true;
  scratch.ctx.imageSmoothingQuality = 'high';
  scratch.ctx.clearRect(0, 0, w, h);
  return scratch;
}

/** Releases every pooled scratch canvas (frees the working memory when the viewer unmounts). */
export function releaseScratch(): void {
  scratchPool.clear();
}

/** Normalised polygon (0..1, possibly off-frame) -> destination pixels. */
export function toPixels(polygon: Point2D[], width: number, height: number): Point2D[] {
  const out: Point2D[] = new Array(polygon.length);
  for (let i = 0; i < polygon.length; i++) {
    out[i] = { x: polygon[i].x * width, y: polygon[i].y * height };
  }
  return out;
}

/** Bounding box of a pixel-space polygon. */
export function pixelBounds(points: Point2D[]): PixelBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Twice the signed area of a ring: > 0 = counter-clockwise in screen space. */
function signedArea(points: Point2D[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area;
}

/**
 * The same ring with a guaranteed counter-clockwise winding.
 *
 * All sub-paths of a soft shape are filled in ONE path, and the nonzero fill rule yields their exact
 * union only while they wind the same way — a piece wound the other way would punch a hole into the
 * piece it overlaps.
 */
function withPositiveWinding(points: Point2D[]): Point2D[] {
  return signedArea(points) < 0 ? points.slice().reverse() : points;
}

/**
 * Appends a pixel-space polygon to the path that is already open (no `beginPath`).
 *
 * `paintSoftPolygon` builds one path out of several rings / triangles so their union is filled with
 * a single alpha; `drawPolygonPath` starts that path, this function extends it.
 */
export function continuePolygonPath(
  ctx: CanvasRenderingContext2D,
  points: Point2D[],
  offsetX: number = 0,
  offsetY: number = 0
): void {
  if (points.length < 3) return;
  ctx.moveTo(points[0].x + offsetX, points[0].y + offsetY);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x + offsetX, points[i].y + offsetY);
  }
  ctx.closePath();
}

/** Traces a pixel-space polygon on the context (no fill / no stroke). */
export function drawPolygonPath(
  ctx: CanvasRenderingContext2D,
  points: Point2D[],
  offsetX: number = 0,
  offsetY: number = 0
): void {
  if (points.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x + offsetX, points[0].y + offsetY);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x + offsetX, points[i].y + offsetY);
  }
  ctx.closePath();
}

/** Longest-side cap -> working size for the smooth full-frame effect layers. */
export function fitWorkSize(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxDimension || longest <= 0) return { width, height };
  const scale = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Approximate Gaussian blur of a transparent canvas, implemented as a resolution pyramid.
 *
 * Every step is a hardware-accelerated `drawImage`, so the result is identical in every engine
 * and never depends on `CanvasRenderingContext2D.filter` (unsupported in WebKit — the reason
 * shadows used to render as hard, aliased stripes on mobile). The visible ramp is
 * approximately `radiusPx`.
 *
 * Returns a **pooled** canvas that stays valid only until the next scratch acquisition, so the
 * result must be consumed immediately (as `paintSoftPolygon` does).
 */
export function blurCanvas(source: HTMLCanvasElement, radiusPx: number): HTMLCanvasElement {
  const width = source.width;
  const height = source.height;
  if (width < 4 || height < 4 || radiusPx < RENDER_CONFIG.blurMinRadiusPx) return source;

  const levels = clamp(Math.round(Math.log2(radiusPx + 1)), 1, RENDER_CONFIG.blurMaxLevels);
  const chain: ScratchCanvas[] = [];
  let from = source;
  let fromW = width;
  let fromH = height;

  // Down the pyramid: each halving widens the ramp by one bilinear footprint.
  for (let level = 1; level <= levels; level++) {
    const toW = Math.round(fromW / 2);
    const toH = Math.round(fromH / 2);
    if (toW < 2 || toH < 2) break;
    const stepDown = acquireScratch(`blur:${level}`, toW, toH);
    stepDown.ctx.drawImage(from, 0, 0, fromW, fromH, 0, 0, toW, toH);
    chain.push(stepDown);
    from = stepDown.canvas;
    fromW = toW;
    fromH = toH;
  }
  if (chain.length === 0) return source;

  // Back up the pyramid, clearing each level first so the sharper lower-resolution content from
  // the descent cannot bleed through the semi-transparent edges of the upscaled result. The
  // progressive upsamples sum the box footprints into a smooth ramp, which is what makes the
  // penumbra look like light rather than like a blurred bitmap.
  for (let i = chain.length - 2; i >= 0; i--) {
    const src = chain[i + 1];
    const dst = chain[i];
    dst.ctx.clearRect(0, 0, dst.width, dst.height);
    dst.ctx.drawImage(src.canvas, 0, 0, src.width, src.height, 0, 0, dst.width, dst.height);
  }

  const out = acquireScratch('blur:out', width, height);
  out.ctx.drawImage(chain[0].canvas, 0, 0, chain[0].width, chain[0].height, 0, 0, width, height);
  return out.canvas;
}

/**
 * Same as `blurCanvas`, but copied into a freshly allocated canvas — for results that are cached
 * for the lifetime of a photo (the feathered category masks).
 */
export function blurCanvasOwned(source: HTMLCanvasElement, radiusPx: number): HTMLCanvasElement {
  const blurred = blurCanvas(source, radiusPx);
  if (blurred === source) return source;

  const owned = document.createElement('canvas');
  owned.width = source.width;
  owned.height = source.height;
  const ctx = owned.getContext('2d');
  if (!ctx) return source;
  ctx.drawImage(blurred, 0, 0, source.width, source.height, 0, 0, source.width, source.height);
  return owned;
}

/**
 * Fills one projected polygon with a soft, physically-plausible edge: the shape is rendered into
 * a scratch canvas covering only its own bounding box (so the blur cost scales with the shadow,
 * never with the photo), blurred by the pyramid, then composited back onto `ctx`.
 *
 * Alpha (and the optional base -> tip falloff) live inside the shape, so the blur interpolates
 * them into a real penumbra instead of smearing a uniform fill.
 */
export function paintSoftPolygon(
  ctx: CanvasRenderingContext2D,
  polygon: Point2D[],
  width: number,
  height: number,
  options: SoftPolygonOptions
): void {
  if (polygon.length < 3) return;

  // Every ring / triangle of the shape is filled as ONE path: the nonzero fill rule then yields the
  // exact union with a single alpha, so overlapping pieces never darken each other. All pieces are
  // forced to the same winding direction, otherwise their overlaps would cancel out instead.
  const pieces: Point2D[][] = [polygon];
  for (const ring of options.extraRings ?? []) {
    if (ring && ring.length >= 3) pieces.push(ring);
  }
  const piecePixels = pieces.map((piece) => withPositiveWinding(toPixels(piece, width, height)));

  const pixels: Point2D[] = [];
  for (const piece of piecePixels) {
    for (const point of piece) pixels.push(point);
  }
  const bounds = pixelBounds(pixels);
  const pad = options.blurRadiusPx + 2;

  const ox = Math.max(0, Math.floor(bounds.x - pad));
  const oy = Math.max(0, Math.floor(bounds.y - pad));
  const ex = Math.min(width, Math.ceil(bounds.x + bounds.width + pad));
  const ey = Math.min(height, Math.ceil(bounds.y + bounds.height + pad));
  const cw = ex - ox;
  const ch = ey - oy;
  if (cw < 1 || ch < 1) return; // fully outside the frame

  const shape = acquireScratch('soft:shape', cw, ch, true);
  const { r, g, b } = options.color;
  const alpha = clamp(options.alpha, 0, 1);
  const fade = options.fade;

  if (fade && (fade.fromPx.x !== fade.toPx.x || fade.fromPx.y !== fade.toPx.y)) {
    const gradient = shape.ctx.createLinearGradient(
      fade.fromPx.x - ox,
      fade.fromPx.y - oy,
      fade.toPx.x - ox,
      fade.toPx.y - oy
    );
    gradient.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},${alpha * clamp(fade.toAlphaScale, 0, 1)})`);
    shape.ctx.fillStyle = gradient;
  } else {
    shape.ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
  }

  for (let i = 0; i < piecePixels.length; i++) {
    if (i === 0) {
      drawPolygonPath(shape.ctx, piecePixels[i], -ox, -oy);
    } else {
      continuePolygonPath(shape.ctx, piecePixels[i], -ox, -oy);
    }
  }
  shape.ctx.fill();

  const soft = blurCanvas(shape.canvas, options.blurRadiusPx);

  ctx.save();
  ctx.globalCompositeOperation = options.composite;
  ctx.globalAlpha = 1;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // Explicit source rect: the scratch canvas may be padded beyond the logical content size.
  ctx.drawImage(soft, 0, 0, cw, ch, ox, oy, cw, ch);
  ctx.restore();
}
