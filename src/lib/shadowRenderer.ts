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
  baseImage?: CanvasImageSource | null,
  cameraAzimuthDeg: number = 0,
  horizonY: number = imageHeight * 0.5
): void {
  // If sun is below horizon or altitude invalid, do not draw shadows
  if (!solar || solar.altitude_deg <= 0) {
    return;
  }

  // Adjust solar azimuth relative to camera azimuth so shadows align with photo perspective
  const relativeAzimuthDeg = (solar.azimuth_deg - cameraAzimuthDeg + 360) % 360;
  const azimuthRad = (relativeAzimuthDeg * Math.PI) / 180;
  const dx = Math.sin(azimuthRad);
  const dy = Math.cos(azimuthRad);

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
      imageHeight,
      undefined,
      cameraAzimuthDeg
    );

    // Phase 4: Depth-aware warp if depth map is present
    if (depthMapImageData) {
      polygon = applyDepthWarpToPolygon(polygon, depthMapImageData, { dx, dy });
    }

    // Phase 5: Multiply shadow onto canvas with soft penumbra, atmospheric sky tint, and horizon clamping
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';

    const anchor = annotation.ground_anchor || annotation.polygon_coordinates[0];
    const anchorPx = { x: anchor.x * imageWidth, y: anchor.y * imageHeight };

    // Clamp or fade opacity as shadow approaches or crosses the horizon (horizonY)
    let baseOpacity = Math.min(1, Math.max(0, annotation.canopy_opacity));
    
    // Calculate average Y of shadow polygon
    let avgY = anchorPx.y;
    for (const pt of polygon) {
      avgY += pt.y * imageHeight;
    }
    avgY /= (polygon.length + 1);

    if (avgY < horizonY) {
      // If shadow extends above horizon, fade out smoothly
      const fadeFactor = Math.max(0, (avgY - (horizonY - 50)) / 50);
      baseOpacity *= fadeFactor;
    }

    ctx.globalAlpha = baseOpacity;
    
    // Atmospheric sky tint (deep cool blue-grey)
    ctx.fillStyle = 'rgb(18, 30, 50)';

    // Dynamic blur based on object height & shadow length (sharp near ground anchor, softer at tip)
    const blurPx = Math.min(18, Math.max(1, annotation.height_meters * 0.8));
    ctx.filter = `blur(${blurPx}px)`;

    ctx.beginPath();
    ctx.moveTo(anchorPx.x, anchorPx.y);

    for (let i = 0; i < polygon.length; i++) {
      const pt = polygon[i];
      let py = pt.y * imageHeight;
      // Clamp shadow points below or at horizon level so shadows do not float incorrectly in the sky
      if (py < horizonY) {
        py = horizonY;
      }
      ctx.lineTo(pt.x * imageWidth, py);
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
