import type { Annotation, SolarPosition } from '../types/shadow';
import type { ShadowCameraParams } from './shadowProjection';
import { projectShadowPolygons } from './shadowProjection';
import { applyDepthWarpToPolygon } from './depthWarp';
import { SHADOW_CONFIG } from './environmentConfig';
import { paintSoftPolygon, toPixels, type SoftPolygonOptions } from './softShape';
import { penumbraRadiusPx, shadowAnchorPx, shadowTipPx } from './penumbra';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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
 * Paints the projected shadow layer onto `ctx` at full resolution (the caller clips it to the
 * ground mask and multiplies it onto the photo ONCE, so overlapping shadows behave like a single
 * occluder instead of darkening repeatedly).
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
 * An operator-supplied `Annotation.depth_cm` turns the silhouette into a solid volume: the near
 * face, the far face and the band between them are projected separately and painted as ONE shape
 * (single alpha), which is what makes the shadow of a deep object read as a prism, not a cutout.
 *
 * Extracted from `segRenderer.ts`; `renderSegmentedScene` is still the only caller.
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

    // The operator-supplied depth (`annotation.depth_cm`) makes the object a solid volume: the
    // projection returns the near face plus the far face and the side band between them, all of
    // which are painted as ONE soft shape (see `SoftPolygonOptions.extraRings`).
    const rings = projectShadowPolygons(annotation, solar, width, height, cameraParams);
    if (rings.length === 0 || rings[0].length < 3) continue;

    const warpedRings = depthMapData
      ? rings.map((ring) =>
          applyDepthWarpToPolygon(ring, depthMapData, dominantShadowDirection(rings[0], annotation))
        )
      : rings;

    const polygon = warpedRings[0];
    const extraRings = warpedRings.slice(1).filter((ring) => ring.length >= 3);

    // Penumbra and the base -> tip falloff are derived from the whole volume's footprint, so a
    // deeper object gets a correspondingly longer, softer shadow.
    const pixels = warpedRings.flatMap((ring) => toPixels(ring, width, height));
    const anchor = shadowAnchorPx(annotation, pixels, width, height);

    const options: SoftPolygonOptions = {
      blurRadiusPx: penumbraRadiusPx(pixels, solar.altitude_deg, penumbraStrength),
      alpha: clamp(annotation.canopy_opacity, 0, 1),
      color: SHADOW_CONFIG.color,
      composite: 'source-over',
      fade: {
        fromPx: anchor,
        toPx: shadowTipPx(pixels, anchor),
        toAlphaScale: SHADOW_CONFIG.tipFalloff,
      },
    };
    if (extraRings.length > 0) {
      options.extraRings = extraRings;
    }

    paintSoftPolygon(ctx, polygon, width, height, options);
  }
}
