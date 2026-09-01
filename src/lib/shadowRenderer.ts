import type { Annotation, Point2D, SolarPosition } from '../types/shadow';
import { projectShadowPolygon } from './shadowProjection';
import { applyDepthWarpToPolygon } from './depthWarp';

/**
 * Renders shadow polygons for a list of annotations onto a 2D canvas context.
 * Uses "multiply" blending mode for shadows, and re-composites foreground object
 * silhouettes on top so shadows appear UNDERNEATH trees, sliders, and structures.
 *
 * @param ctx CanvasRenderingContext2D destination context
 * @param imageWidth Pixel width of canvas/image
 * @param imageHeight Pixel height of canvas/image
 * @param annotations Array of object annotations to render shadows for
 * @param solar Solar position (azimuth & altitude)
 * @param depthMapImageData ImageData from pre-loaded depth map (or null if unavailable)
 * @param baseImage Optional original base image to overlay foreground objects over shadows
 */
export function renderShadows(
  ctx: CanvasRenderingContext2D,
  imageWidth: number,
  imageHeight: number,
  annotations: Annotation[],
  solar: SolarPosition,
  depthMapImageData: ImageData | null,
  baseImage?: CanvasImageSource | null
): void {
  // If sun is below horizon or altitude invalid, do not draw shadows
  if (!solar || solar.altitude_deg <= 0) {
    return;
  }

  const azimuthRad = (solar.azimuth_deg * Math.PI) / 180;
  const dx = Math.sin(azimuthRad);
  const dy = -Math.cos(azimuthRad);

  // 1. Render all shadow polygons onto the ground/background
  for (const annotation of annotations) {
    if (!annotation.polygon_coordinates || annotation.polygon_coordinates.length < 3) {
      continue;
    }

    // Phase 3: Raw projected polygon
    let polygon: Point2D[] = projectShadowPolygon(
      annotation,
      solar,
      imageWidth,
      imageHeight
    );

    // Phase 4: Depth-aware warp if depth map is present
    if (depthMapImageData) {
      polygon = applyDepthWarpToPolygon(polygon, depthMapImageData, { dx, dy });
    }

    // Phase 5: Multiply shadow onto canvas
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = Math.min(1, Math.max(0, annotation.canopy_opacity));
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';

    ctx.beginPath();
    const firstPoint = polygon[0];
    ctx.moveTo(firstPoint.x * imageWidth, firstPoint.y * imageHeight);

    for (let i = 1; i < polygon.length; i++) {
      const pt = polygon[i];
      ctx.lineTo(pt.x * imageWidth, pt.y * imageHeight);
    }

    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 2. Re-composite foreground objects (trees, sliders, structures) ON TOP of the shadow layer
  if (baseImage) {
    for (const annotation of annotations) {
      if (!annotation.polygon_coordinates || annotation.polygon_coordinates.length < 3) {
        continue;
      }

      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;

      ctx.beginPath();
      const firstPoint = annotation.polygon_coordinates[0];
      ctx.moveTo(firstPoint.x * imageWidth, firstPoint.y * imageHeight);

      for (let i = 1; i < annotation.polygon_coordinates.length; i++) {
        const pt = annotation.polygon_coordinates[i];
        ctx.lineTo(pt.x * imageWidth, pt.y * imageHeight);
      }

      ctx.closePath();
      ctx.clip();

      // Redraw original object imagery cleanly over the shadow
      ctx.drawImage(baseImage, 0, 0, imageWidth, imageHeight);
      ctx.restore();
    }
  }

  // Reset context defaults after all annotations are rendered
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1.0;
}
