import type { Annotation, Point2D, SolarPosition } from '../types/shadow';

export const METRES_TO_NORM_SCALE = 0.04;

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
  scale: number = METRES_TO_NORM_SCALE
): Point2D[] {
  if (solar.altitude_deg <= 0) {
    return annotation.polygon_coordinates.map((pt) => ({ ...pt }));
  }

  const lengthMetres = computeShadowLength(
    annotation.height_meters,
    solar.altitude_deg
  );
  const lengthNorm = lengthMetres * scale;

  const azimuthRad = (solar.azimuth_deg * Math.PI) / 180;
  const dx = Math.sin(azimuthRad);
  const dy = -Math.cos(azimuthRad);

  return annotation.polygon_coordinates.map((pt) => ({
    x: pt.x + dx * lengthNorm,
    y: pt.y + dy * lengthNorm,
  }));
}
