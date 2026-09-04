import type { APIRoute } from 'astro';
import { OPEN_METEO_HOURLY_FIELDS } from '../../lib/environmentConfig';
import type { WeatherDayHourly } from '../../types/environment';

export const prerender = false;

function json(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/weather?lat=..&lon=..
 * Proxies Open-Meteo (no API key) and returns a whole day of hourly weather so the client
 * can "time-travel" the weather with the slider.
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    const lat = parseFloat(url.searchParams.get('lat') ?? '');
    const lon = parseFloat(url.searchParams.get('lon') ?? '');
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return new Response(
        JSON.stringify({ error: 'Valid lat & lon query parameters are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const base = process.env.OPEN_METEO_BASE_URL || 'https://api.open-meteo.com/v1/forecast';
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      hourly: OPEN_METEO_HOURLY_FIELDS,
      timezone: 'auto',
    });

    // Optional specific forecast day (YYYY-MM-DD) — defaults to today.
    const date = url.searchParams.get('date');
    if (date) {
      params.set('start_date', date);
      params.set('end_date', date);
    }

    const res = await fetch(`${base}?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Open-Meteo responded with ${res.status}`);
    }

    const raw = await res.json();
    const data: WeatherDayHourly = {
      time: raw.hourly.time,
      temperature_2m: raw.hourly.temperature_2m,
      precipitation: raw.hourly.precipitation,
      cloud_cover: raw.hourly.cloud_cover,
      weather_code: raw.hourly.weather_code,
      wind_speed_10m: raw.hourly.wind_speed_10m,
    };

    return json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch weather.';
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
