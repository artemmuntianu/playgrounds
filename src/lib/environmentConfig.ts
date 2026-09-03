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
