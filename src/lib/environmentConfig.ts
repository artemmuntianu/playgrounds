export const LIGHT_CONFIG = {
  enabled: true,
  intensity: 0.85,
  warmth: 0,
  blurPx: 10,
  offsetPx: 4,
} as const;

export const RAIN_CONFIG = {
  enabled: true,
  intensity: 0,
  opacity: 0,
  streakLength: 14,
  streakAngleDeg: 14,
  speedPxPerSec: 900,
  seed: 1,
} as const;

export const CLOUD_CONFIG = {
  enabled: true,
  cloudCoverPct: 0,
  dimLighting: true,
} as const;

export const WEATHER_DEBOUNCE_MS = 200;
export const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000; // 30 min
export const OPEN_METEO_HOURLY_FIELDS =
  'temperature_2m,precipitation,cloud_cover,weather_code,wind_speed_10m';

/** Category index order used by the segmentation mask (0 = sky, 1 = vertical, 2 = ground). */
export const SEG_CATEGORY_ORDER = ['sky', 'vertical', 'ground'] as const;

/** Default mask colours (sky / vertical / ground). Override via `colorMap` per photo if needed. */
export const SEGMENT_DEFAULT_COLORS = {
  sky: { r: 30, g: 120, b: 255 },
  vertical: { r: 255, g: 60, b: 50 },
  ground: { r: 50, g: 190, b: 90 },
} as const;

/**
 * Fixed (non-operator) render tuning. The engine is mobile-first: every smooth, full-frame
 * effect layer is rendered at a capped resolution and upscaled, while the shadow layer stays at
 * full resolution because it is the only pass that carries visible detail.
 */
export const RENDER_CONFIG = {
  /** Long side (px) of the working canvas used for the smooth full-frame effect layers. */
  effectWorkCapPx: 1024,
  /** Long side (px) used when decoding a segmentation mask PNG (drives the per-pixel decode cost). */
  segDecodeCapPx: 1024,
  /** Feather (px, at mask resolution) applied to category masks so `destination-in` clipping is not 1-bit. */
  maskFeatherPx: 1.25,
  /** Scratch canvases are rounded up to this granularity so a time-slider drag does not reallocate. */
  scratchGranularityPx: 64,
  /** Blur radii below this are skipped (the pyramid would not add a level). */
  blurMinRadiusPx: 1.25,
  /** Maximum number of halving steps in the blur pyramid (=> ramp up to ~2^6 px). */
  blurMaxLevels: 6,
} as const;

/**
 * Shadow penumbra policy — the single source of realistic shadow softness on every engine.
 *
 * This replaces the old `ctx.filter = 'blur(...)'` approach: `CanvasRenderingContext2D.filter`
 * is not Baseline (unsupported by WebKit, i.e. every browser on iOS), where the assignment is
 * silently ignored and shadows are filled with hard, aliased edges.
 */
export const SHADOW_CONFIG = {
  /** Penumbra as a fraction of the projected shadow's long side. */
  penumbraBase: 0.055,
  /** Extra penumbra towards a grazing sun (0 = disabled). */
  lowSunBoost: 1.1,
  /** Upper bound of the low-sun penumbra multiplier. */
  maxSunFactor: 2.4,
  /** Penumbra may not exceed this fraction of the shadow's short side (a thin sliver must stay readable). */
  thinShapeRatio: 0.6,
  /** Hard limits for the penumbra radius in destination pixels. */
  minRadiusPx: 1.5,
  maxRadiusPx: 26,
  /** Alpha at the far end of a shadow relative to its base (contact-shadow falloff). */
  tipFalloff: 0.68,
  /**
   * Metric anchor for operator-supplied real-world sizes (`Annotation.depth_cm`). The projection
   * works in units of the (unknown) camera height C, so an absolute size can only be expressed in
   * those units through one assumed real-world distance: 1.6 m is a standing photographer's eye
   * level, which is how these photos are taken.
   */
  assumedCameraHeightM: 1.6,
  /** Upper bound for an operator-supplied object depth (cm); anything larger is clamped. */
  maxObjectDepthCm: 2000,
  /** Cool ambient tint that is multiplied onto the ground. */
  color: { r: 18, g: 30, b: 50 },
} as const;


/**
 * Single source of truth for an operator-supplied object depth (`Annotation.depth_cm`, admin UI):
 * non-finite input becomes 0 (flat cutout) and the value is clamped to the range the projection
 * supports. Used by the admin form/editor and by the projection itself.
 */
export function clampObjectDepthCm(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(SHADOW_CONFIG.maxObjectDepthCm, Math.max(0, Math.round(value)));
}

