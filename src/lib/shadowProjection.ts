import type { Annotation, Point2D, SolarPosition } from '../types/shadow';

export const METRES_TO_NORM_SCALE = 0.015;

/**
 * Computes the real-world shadow length L in metres for a given height and sun altitude angle.
 * Formula: L = height / tan(altitude_deg)
 * Returns 0 if altitude_deg <= 0 (sun is on or below horizon).
 */
export function computeShadowLength(
  height_meters: number,
  altitude_deg: number
): number {
  if (altitude_deg <= 0 || height_meters <= 0) {
    return 0;
  }
  const altRad = (altitude_deg * Math.PI) / 180;
  return height_meters / Math.tan(altRad);
}

/**
 * Projects an annotation's polygon coordinates in 2D normalized screen space based on solar position.
 *
 * Screen coordinate mapping:
 * - Azimuth 0° (North) -> dx = 0, dy = -1 (pointing up)
 * - Azimuth 90° (East) -> dx = 1, dy = 0 (pointing right)
 * - Azimuth 180° (South) -> dx = 0, dy = 1 (pointing down)
 * - Azimuth 270° (West) -> dx = -1, dy = 0 (pointing left)
 */
export function projectShadowPolygon(
  annotation: Annotation,
  solar: SolarPosition,
  _imageWidth: number,
  _imageHeight: number,
  scale: number = METRES_TO_NORM_SCALE,
  cameraAzimuthDeg: number = 0
): Point2D[] {
  if (solar.altitude_deg <= 0) {
    return annotation.polygon_coordinates.map((pt) => ({ ...pt }));
  }

  const lengthMetres = computeShadowLength(
    annotation.height_meters,
    solar.altitude_deg
  );
  const lengthNorm = lengthMetres * scale;

  // The shadow is cast in the OPPOSITE direction of the sun azimuth (sun vector points from object to sun, shadow vector points from object away from sun).
  // Shadow direction azimuth = (solar.azimuth_deg + 180) % 360
  const shadowAzimuthDeg = (solar.azimuth_deg + 180) % 360;

  // Account for camera rotation: relative screen-space shadow direction
  const relativeAzimuthDeg = (shadowAzimuthDeg - cameraAzimuthDeg + 360) % 360;
  const azimuthRad = (relativeAzimuthDeg * Math.PI) / 180;

  // In 2D screen space:
  // - North (0°) -> up (dy = -1, dx = 0)
  // - East (90°) -> right (dx = 1, dy = 0)
  // - South (180°) -> down (dy = 1, dx = 0)
  // - West (270°) -> left (dx = -1, dy = 0)
  const dx = Math.sin(azimuthRad);
  const dy = -Math.cos(azimuthRad);

  return annotation.polygon_coordinates.map((pt) => ({
    x: pt.x + dx * lengthNorm,
    y: pt.y + dy * lengthNorm,
  }));
}
