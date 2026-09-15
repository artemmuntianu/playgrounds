import type { Annotation, Point2D } from '../types/shadow';
import { SHADOW_CONFIG } from './environmentConfig';
import { clamp, pixelBounds } from './softShape';

const DEG_TO_RAD = Math.PI / 180;

/**
 * Softness grows as the sun grazes the horizon: the light travels further through the penumbra
 * cone, so a long shadow reads as a wide, faint, soft shape while a high-sun shadow stays crisp.
 */
export function sunPenumbraFactor(altitudeDeg: number): number {
  const sinAltitude = clamp(Math.sin(altitudeDeg * DEG_TO_RAD), 0, 1);
  return clamp(1 + (1 - sinAltitude) * SHADOW_CONFIG.lowSunBoost, 1, SHADOW_CONFIG.maxSunFactor);
}

/**
 * Penumbra radius (destination pixels) for one projected shadow polygon.
 *
 * Softness is derived from the *projected geometry*, so it is automatically correct for the
 * photo resolution and for the time of day. The removed per-object `height_meters * 0.8` formula
 * gave every annotation the same (arbitrary) blur instead.
 *
 * `strength` is the optional per-scene operator knob (`scene_metadata.penumbra_strength`).
 */
export function penumbraRadiusPx(
  pixels: Point2D[],
  altitudeDeg: number,
  strength: number = 1
): number {
  const bounds = pixelBounds(pixels);
  const longSide = Math.max(bounds.width, bounds.height);
  const shortSide = Math.min(bounds.width, bounds.height);

  const raw =
    longSide *
    SHADOW_CONFIG.penumbraBase *
    sunPenumbraFactor(altitudeDeg) *
    clamp(strength, 0.2, 4);

  // A thin sliver (a swing leg) must stay readable: never blur more than its own half-width.
  const thinCap = Math.max(SHADOW_CONFIG.minRadiusPx, shortSide * SHADOW_CONFIG.thinShapeRatio);

  return clamp(
    Math.min(raw, thinCap),
    SHADOW_CONFIG.minRadiusPx,
    SHADOW_CONFIG.maxRadiusPx
  );
}

/**
 * Screen-space base of a shadow: the annotated ground anchor, or the lowest projected vertex when
 * the anchor is missing. This is the darkest end of the shadow (the contact point).
 */
export function shadowAnchorPx(
  annotation: Annotation,
  pixels: Point2D[],
  width: number,
  height: number
): Point2D {
  const anchor = annotation.ground_anchor;
  if (anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.y)) {
    return { x: anchor.x * width, y: anchor.y * height };
  }
  let lowest = pixels[0];
  for (const point of pixels) {
    if (point.y > lowest.y) lowest = point;
  }
  return lowest;
}

/** The projected vertex furthest from the shadow base — the fading end of the shadow. */
export function shadowTipPx(pixels: Point2D[], anchor: Point2D): Point2D {
  let tip = pixels[0];
  let bestDistance = -1;
  for (const point of pixels) {
    const dx = point.x - anchor.x;
    const dy = point.y - anchor.y;
    const distance = Math.hypot(dx, dy);
    if (distance > bestDistance) {
      bestDistance = distance;
      tip = point;
    }
  }
  return tip;
}
