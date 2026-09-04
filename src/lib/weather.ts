import { useState, useEffect, useRef } from 'react';
import {
  WEATHER_DEBOUNCE_MS,
  WEATHER_CACHE_TTL_MS,
  LIGHT_CONFIG,
  RAIN_CONFIG,
  CLOUD_CONFIG,
} from './environmentConfig';
import { cloudDimFactor } from './clouds';
import { rainIntensityFromPrecip } from './rain';
import type { WeatherDayHourly, WeatherSnapshot, EnvironmentEffects } from '../types/environment';
import type { SolarPosition } from '../types/shadow';

const BASE = '/api/weather';

interface CacheEntry {
  data: WeatherDayHourly;
  at: number;
}

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<WeatherDayHourly>>();

export function getWeatherCacheKey(lat: number, lon: number, date: string): string {
  return `${lat}|${lon}|${date}`;
}

export async function fetchWeatherDay(
  lat: number,
  lon: number,
  opts?: { date?: string }
): Promise<WeatherDayHourly> {
  const query = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  if (opts?.date) query.set('date', opts.date);
  const res = await fetch(`${BASE}?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch weather');
  return res.json();
}

function clampIndex(values: number[], hour: number): number {
  const v = values[hour];
  return Number.isFinite(v) ? v : 0;
}

/** Picks the hourly bucket nearest to `minutes` and maps it to a WeatherSnapshot. */
export function selectWeatherAt(day: WeatherDayHourly, minutes: number): WeatherSnapshot {
  const hour = Math.floor(minutes / 60) % Math.max(1, day.time.length);
  const code = clampIndex(day.weather_code, hour);
  return {
    temperature_c: clampIndex(day.temperature_2m, hour),
    cloud_cover_pct: clampIndex(day.cloud_cover, hour),
    precipitation_mm: clampIndex(day.precipitation, hour),
    weather_code: code,
    wind_speed_kmh: clampIndex(day.wind_speed_10m, hour),
    // Refined using solar altitude in Phase 6; a daylight default for now.
    is_day: code >= 0 && code <= 3,
  };
}

/** React hook: debounced, cached, single-flight fetch of the weather for a given day+hour. */
export function useWeather(
  lat: number,
  lon: number,
  minutes: number,
  date?: string,
): { weather: WeatherSnapshot | null; loading: boolean; error: string | null } {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    setLoading(true);
    const id = ++requestIdRef.current;

    const timer = setTimeout(async () => {
      try {
        const dateKey = date || new Date().toISOString().slice(0, 10);
        const key = getWeatherCacheKey(lat, lon, dateKey);

        const cached = cache.get(key);
        if (cached && Date.now() - cached.at < WEATHER_CACHE_TTL_MS) {
          if (id === requestIdRef.current) {
            setWeather(selectWeatherAt(cached.data, minutes));
            setError(null);
            setLoading(false);
          }
          return;
        }

        let promise = inFlight.get(key);
        if (!promise) {
          promise = fetchWeatherDay(lat, lon, { date });
          inFlight.set(key, promise);
          promise.finally(() => inFlight.delete(key));
        }

        const day = await promise;
        cache.set(key, { data: day, at: Date.now() });
        if (id === requestIdRef.current) {
          setWeather(selectWeatherAt(day, minutes));
          setError(null);
        }
      } catch (e) {
        if (id === requestIdRef.current) {
          setWeather(null);
          setError(e instanceof Error ? e.message : 'Failed to fetch weather');
        }
      } finally {
        if (id === requestIdRef.current) setLoading(false);
      }

    }, WEATHER_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [lat, lon, minutes, date]);

  return { weather, loading, error };
}

/** Shade % for the display line: night = 100, else ambient + cloud cover + object count. */
export function deriveShadePct(
  solar: SolarPosition | null,
  weather: WeatherSnapshot | null,
  annotationCount: number
): number {
  if (!solar || solar.altitude_deg <= 0) return 100;
  let shade = 30;
  if (weather) shade += weather.cloud_cover_pct * 0.5;
  shade += Math.min(30, annotationCount * 8);
  return Math.min(100, Math.round(shade));
}

/** Localised surface-temperature label from the live temperature. */
export function deriveTempLabel(weather: WeatherSnapshot): { en: string; pt: string } {
  const t = Math.round(weather.temperature_c);
  if (t <= 15) return { en: `Cool (~${t}°C)`, pt: `Fresco (~${t}°C)` };
  if (t <= 22) return { en: `Mild (~${t}°C)`, pt: `Suave (~${t}°C)` };
  if (t <= 30) return { en: `Warm (~${t}°C)`, pt: `Quente (~${t}°C)` };
  return { en: `Hot (~${t}°C)`, pt: `Muito quente (~${t}°C)` };
}

/**
 * Synthetic demo weather that overrides the live API data. Produces rain strictly between
 * 11:00 and 12:00 (minutes 660..720) so the viewer can preview the rain pipeline without a
 * real rainy hour from Open-Meteo.
 */
export function buildDemoWeather(minutes: number): WeatherSnapshot {
  const inRain = minutes >= 11 * 60 && minutes < 12 * 60;
  return {
    temperature_c: inRain ? 17 : 22,
    cloud_cover_pct: inRain ? 95 : 40,
    precipitation_mm: inRain ? 3.2 : 0,
    weather_code: inRain ? 61 : 2,
    wind_speed_kmh: inRain ? 22 : 8,
    is_day: true,
  };
}

/** Builds an EnvironmentEffects object from the current weather snapshot. */
export function buildEnvironmentEffects(weather: WeatherSnapshot | null): EnvironmentEffects {
  const cloudCoverPct = weather?.cloud_cover_pct ?? 0;
  const precip = weather?.precipitation_mm ?? 0;
  const intensity = cloudDimFactor(cloudCoverPct);
  return {
    light: { ...LIGHT_CONFIG, intensity: LIGHT_CONFIG.intensity * intensity },
    rain: {
      ...RAIN_CONFIG,
      enabled: precip > 0,
      intensity: rainIntensityFromPrecip(precip),
      opacity: rainIntensityFromPrecip(precip) * 0.5,
      seed: Math.floor(precip * 100) || 1,
    },
    clouds: { ...CLOUD_CONFIG, cloudCoverPct },
    wetGround: precip > 0,
  };
}

