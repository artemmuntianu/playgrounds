import type { SolarPosition } from './shadow';

/** One-hour weather sample from Open-Meteo (or fixture). */
export interface WeatherSnapshot {
  temperature_c: number;
  cloud_cover_pct: number;   // 0..100
  precipitation_mm: number;  // mm during the hour
  weather_code: number;      // WMO weather code
  wind_speed_kmh: number;
  is_day: boolean;           // derived from solar altitude or weather_code
}

/** Raw hourly arrays returned by the weather endpoint (whole day). */
export interface WeatherDayHourly {
  time: string[];            // ISO strings per hour
  temperature_2m: number[];
  precipitation: number[];
  cloud_cover: number[];
  weather_code: number[];
  wind_speed_10m: number[];
}

/** Screen-space position + direction + intensity of the sun, for lighting passes. */
export interface SunLightTarget {
  azimuth_deg: number;
  altitude_deg: number;
  intensity: number;                       // 0..1, f(altitude), reduced by cloud cover
  screenX: number;                         // px, -1 if not in view
  screenY: number;
  inView: boolean;
  isBehind: boolean;
  screenDir: { dx: number; dy: number };   // unit vector pointing toward the sun, screen space
  color: { r: number; g: number; b: number }; // warm when altitude is low
}

export interface LightRenderConfig {
  enabled: boolean;
  intensity: number;   // global multiplier (0..1)
  warmth: number;      // 0 neutral .. 1 warm (low altitude / overcast)
  blurPx: number;
  offsetPx: number;    // shift of the object light mask toward the sun
}

export interface RainRenderConfig {
  enabled: boolean;
  intensity: number;   // 0..1, derived from precipitation_mm
  opacity: number;
  streakLength: number;
  streakAngleDeg: number; // wind-driven tilt
  speedPxPerSec: number;
  seed: number;        // deterministic per hour bucket
}

export interface CloudRenderConfig {
  enabled: boolean;
  cloudCoverPct: number; // 0..100
  dimLighting: boolean;  // reduce sun light when overcast
}

export interface EnvironmentEffects {
  light: LightRenderConfig;
  rain: RainRenderConfig;
  clouds: CloudRenderConfig;
  wetGround: boolean;
}

export interface EnvironmentState {
  minutes: number;                 // minutes from 00:00
  date: Date;
  solar: SolarPosition | null;     // null when night (altitude <= 0)
  weather: WeatherSnapshot | null;
  effects: EnvironmentEffects;
}
