import type { SolarPosition } from '../types/shadow';

export interface SunScreenInfo {
  diffAzimuth: number;
  screenX: number;
  screenY: number;
  inView: boolean;
  isBehind: boolean;
  screenDir: { dx: number; dy: number };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Screen-space unit vector pointing TOWARD the sun (light direction). */
export function computeSunScreenDir(
  diffAzimuth: number,
  altitudeDeg: number
): { dx: number; dy: number } {
  // Sun on the right (diffAzimuth > 0) => light comes from the right.
  const dirX = Math.sign(diffAzimuth);
  const dirY = 0.35 * Math.sign(90 - altitudeDeg) || 0.35;
  const len = Math.hypot(dirX, dirY) || 1;
  return { dx: dirX / len, dy: dirY / len };
}

/** Converts a solar position into camera-relative screen info (X, Y, in-view, direction). */
export function computeSunScreenInfo(
  solar: SolarPosition,
  cameraAzimuthDeg: number,
  cameraFovDeg: number,
  width: number,
  height: number
): SunScreenInfo {
  const diffAzimuth = ((solar.azimuth_deg - cameraAzimuthDeg + 540) % 360) - 180;
  const halfFov = cameraFovDeg / 2;
  const inView = Math.abs(diffAzimuth) <= halfFov + 10;
  const isBehind = Math.abs(diffAzimuth) > 90;

  const screenX = (0.5 + diffAzimuth / cameraFovDeg) * width;
  const screenY = clamp(0.45 - (solar.altitude_deg / 90) * 0.42, 0.04, 0.85) * height;

  return {
    diffAzimuth,
    screenX,
    screenY,
    inView,
    isBehind,
    screenDir: computeSunScreenDir(diffAzimuth, solar.altitude_deg),
  };
}
