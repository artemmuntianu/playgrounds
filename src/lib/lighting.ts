import type { SolarPosition } from '../types/shadow';
import type { SunLightTarget } from '../types/environment';
import { cloudDimFactor } from './clouds';
import { computeSunScreenInfo } from './sunOverlay';

// Default cap for the sun-light so the additive 'screen' passes produce a soft, warm highlight
// instead of clipping the photo to pure white at a clear high sun. Can be overridden per photo
// via scene_metadata.sun_light_strength.
const MAX_SUN_INTENSITY = 0.8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Screen-space position, direction, intensity and colour of the sun — the ONLY input the lighting
 * passes need (they are the masked sky / ground / vertical passes in `lightPasses.ts`).
 *
 * Light comes from the OPPOSITE side of the cast shadow, so this reuses the same relative-azimuth
 * math as the shadow projection (`sunOverlay.ts`); intensity falls with the altitude and with the
 * live cloud cover, and the colour warms up near the horizon.
 *
 * The former per-pass drawing helpers (`renderSunDisc`, `renderGroundSunlight`,
 * `renderObjectSunlight`, `renderSkyTint`) were dead since the segmented renderer took over and have
 * been removed — the sky glow, ground sunlight and vertical light live in `lightPasses.ts`.
 */
export function computeSunLightTarget(
  solar: SolarPosition,
  cameraAzimuthDeg: number,
  cameraFovDeg: number,
  width: number,
  height: number,
  cloudCoverPct: number = 0,
  maxIntensity: number = MAX_SUN_INTENSITY
): SunLightTarget {
  const info = computeSunScreenInfo(solar, cameraAzimuthDeg, cameraFovDeg, width, height);

  const t = clamp(solar.altitude_deg / 45, 0, 1); // 0 low sun, 1 high sun
  const intensity = t * cloudDimFactor(cloudCoverPct) * clamp(maxIntensity, 0, 1);
  // Slightly warm near the zenith so the highlight reads as sunlight, not a white blob.
  const color = {
    r: 255,
    g: Math.round(170 + 70 * t),
    b: Math.round(70 + 170 * t),
  };

  return {
    azimuth_deg: solar.azimuth_deg,
    altitude_deg: solar.altitude_deg,
    intensity,
    screenX: info.screenX,
    screenY: info.screenY,
    inView: info.inView,
    isBehind: info.isBehind,
    screenDir: info.screenDir,
    color,
  };
}
