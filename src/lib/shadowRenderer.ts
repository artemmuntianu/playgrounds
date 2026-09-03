import type { Annotation, Point2D, SolarPosition } from '../types/shadow';
import {
  projectShadowPolygon,
  type ShadowCameraParams,
} from './shadowProjection';
import { applyDepthWarpToPolygon } from './depthWarp';

/**
 * Renders shadow polygons for a list of annotations onto a 2D canvas context.
 * Uses "multiply" blending mode for shadows, and re-composites foreground
 * object silhouettes on top so shadows appear UNDERNEATH trees, slides and
 * structures.
 *
 * Shadows are produced by the perspective projection in `shadowProjection.ts`
 * which honours the user supplied scene parameters (camera azimuth & FOV,
 * horizon line / camera pitch, ground anchors and off-frame vertices).
 *
 * @param ctx CanvasRenderingContext2D destination context
 * @param imageWidth Pixel width of canvas/image
 * @param imageHeight Pixel height of canvas/image
 * @param annotations Array of object annotations to render shadows for
 * @param solar Solar position (azimuth & altitude)
 * @param depthMapImageData ImageData from pre-loaded depth map (or null if unavailable)
 * @param baseImage Optional original base image to overlay foreground objects over shadows
 * @param cameraAzimuthDeg Camera pan, degrees clockwise from North
 * @param horizonY Horizon row: normalised (0..1) or pixel value
 * @param cameraFovDeg Horizontal lens FOV in degrees
 * @param cameraPitchDeg Optional camera pitch override (deg, positive = looking down)
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
  horizonY?: number,
  cameraFovDeg: number = 65,
  cameraPitchDeg?: number
): void {
  // If the sun is below the horizon no shadow is cast.
  if (!solar || solar.altitude_deg <= 0) {
    return;
  }

  const cameraParams: ShadowCameraParams = {
    cameraAzimuthDeg,
    cameraFovDeg,
    cameraPitchDeg,
  };
  if (horizonY !== undefined && horizonY !== null) {
    cameraParams.horizonY = horizonY;
  }

  // 1. Render all shadow polygons onto the ground/background
  for (const annotation of annotations) {
    if (!annotation.polygon_coordinates || annotation.polygon_coordinates.length < 3) {
      continue;
    }

    // Phase 3: raw perspective-projected shadow polygon (normalised coords)
    let polygon: Point2D[] = projectShadowPolygon(
      annotation,
      solar,
      imageWidth,
      imageHeight,
      cameraParams
    );

    if (polygon.length < 3) {
      continue;
    }

    // Phase 4: optional depth-aware warp (softens / bends shadows over
    // foreground obstacles such as slides and climbing frames).
    if (depthMapImageData) {
      const direction = dominantShadowDirection(polygon, annotation);
      polygon = applyDepthWarpToPolygon(polygon, depthMapImageData, direction);
    }

    // Phase 5: multiply the shadow onto the photo.
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';

    const baseOpacity = Math.min(1, Math.max(0, annotation.canopy_opacity));

    ctx.globalAlpha = baseOpacity;
    ctx.fillStyle = 'rgb(18, 30, 50)';

    // Soft penumbra: shadows are sharper for low objects, softer for tall ones.
    const blurPx = Math.min(18, Math.max(1, annotation.height_meters * 0.8));
    ctx.filter = `blur(${blurPx}px)`;

    ctx.beginPath();
    ctx.moveTo(polygon[0].x * imageWidth, polygon[0].y * imageHeight);
    for (let i = 1; i < polygon.length; i++) {
      ctx.lineTo(polygon[i].x * imageWidth, polygon[i].y * imageHeight);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 2. Re-composite foreground objects (trees, slides, structures) ON TOP of
  // the shadow layer so an object is never shaded by its own shadow.
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

/**
 * Unit screen-space direction of the projected shadow (from the object's base
 * towards the bulk of the cast shadow). Used by the depth warp to displace the
 * shadow over foreground geometry.
 */
function dominantShadowDirection(
  shadowPolygon: Point2D[],
  annotation: Annotation
): { dx: number; dy: number } {
  const anchor = annotation.ground_anchor || annotation.polygon_coordinates[0];
  const start = { x: anchor.x, y: anchor.y };

  let cx = 0;
  let cy = 0;
  for (const pt of shadowPolygon) {
    cx += pt.x;
    cy += pt.y;
  }
  cx /= shadowPolygon.length;
  cy /= shadowPolygon.length;

  const dx = cx - start.x;
  const dy = cy - start.y;
  const len = Math.hypot(dx, dy) || 1;
  return { dx: dx / len, dy: dy / len };
}
