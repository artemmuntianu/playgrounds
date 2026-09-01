import type { Point2D } from '../types/shadow';

export const DEFAULT_DEPTH_WARP_STRENGTH = 0.002;

/**
 * Samples depth value (0-255) from an ImageData object at normalized 0-1 coordinates.
 * Depth 255 = closest to camera (foreground), 0 = furthest (background).
 */
export function sampleDepthMap(
  depthMapImageData: ImageData,
  x_norm: number,
  y_norm: number
): number {
  const width = depthMapImageData.width;
  const height = depthMapImageData.height;

  if (width === 0 || height === 0) {
    return 0;
  }

  const px = Math.min(width - 1, Math.max(0, Math.floor(x_norm * width)));
  const py = Math.min(height - 1, Math.max(0, Math.floor(y_norm * height)));

  const idx = (py * width + px) * 4;
  return depthMapImageData.data[idx];
}

/**
 * Applies a depth-aware displacement to each vertex of a polygon.
 * Higher depth values (foreground) cause vertices to warp opposite to the shadow direction.
 */
export function applyDepthWarpToPolygon(
  polygon: Point2D[],
  depthMapImageData: ImageData,
  shadowDirection: { dx: number; dy: number },
  warpStrength: number = DEFAULT_DEPTH_WARP_STRENGTH
): Point2D[] {
  return polygon.map((vertex) => {
    const depth = sampleDepthMap(depthMapImageData, vertex.x, vertex.y);
    const warpAmount = (depth / 255) * warpStrength;

    return {
      x: vertex.x - shadowDirection.dx * warpAmount,
      y: vertex.y - shadowDirection.dy * warpAmount,
    };
  });
}
