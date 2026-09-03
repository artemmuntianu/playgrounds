import type { SolarPosition } from '../types/shadow';

/**
 * Reduces sun-light strength as cloud cover rises. 0 clear -> 1, heavy overcast -> ~0.3.
 */
export function cloudDimFactor(cloudCoverPct: number): number {
  const c = Math.min(100, Math.max(0, cloudCoverPct));
  return 1 - (c / 100) * 0.7;
}

/**
 * Returns the full-frame overlay colour for a given sun + cloud cover.
 * - Night (sun below horizon): dark blue-gray.
 * - Overcast day: desaturated gray scaled by cloud cover.
 * - Clear day: transparent (no-op; the sun glow handles the sky).
 */
export function skyOverlayColor(
  solar: SolarPosition | null,
  cloudCoverPct: number
): { r: number; g: number; b: number; a: number } {
  if (!solar || solar.altitude_deg <= 0) {
    return { r: 20, g: 28, b: 48, a: 0.55 };
  }
  const c = Math.min(100, Math.max(0, cloudCoverPct));
  if (c >= 20) {
    return { r: 120, g: 120, b: 120, a: (c / 100) * 0.25 };
  }
  return { r: 255, g: 244, b: 214, a: 0 };
}
