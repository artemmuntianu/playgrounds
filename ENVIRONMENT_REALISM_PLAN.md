# 2.5D Environmental Realism Pipeline — Implementation Plan

> **For sub-agents.** Work each phase **in order**. Complete every task in a phase and
> verify it (`npm run typecheck`, `npm run build`) before moving on. **Do not skip
> ahead.** Keep edits **surgical** — never rewrite a whole file just to change styling /
> add one feature. This plan extends the existing **Canvas 2D** shadow pipeline; it does
> **NOT** switch the photo pipeline to three.js / WebGL.

---

## Context

This is an **Astro 5 + React + TypeScript (strict)** project. There is already a working
**2.5D sun-shadow** pipeline:

- `src/lib/solar.ts` — `getSolarPosition(date, lat, lon)` → `{ azimuth_deg, altitude_deg }`.
- `src/lib/shadowProjection.ts` — `projectShadowPolygon(...)`, pinhole ground-plane projection.
- `src/lib/depthWarp.ts` — `applyDepthWarpToPolygon(...)`.
- `src/lib/shadowRenderer.ts` — `renderShadows(ctx, w, h, annotations, solar, depthData,
  baseImage, cameraAzimuthDeg, horizonY, cameraFovDeg, cameraPitchDeg)`.
  Only two call sites are allowed: `ViewerShadowCanvas.tsx` and `ShadowPreview.tsx`
  (see `src/lib/AGENTS.md`).

Current gaps this plan fills:

1. **No weather API.** `temperature` / `shadow_coverage` strings are hardcoded in
   `data/playgrounds/*/playground.json` `attributes`; the visible `shadePct` in
   `PlaygroundDetail.tsx` (lines 92–96) is a fake formula, not connected to the render.
2. **No rain.** Zero weather/rain code exists (`weather|rain|precip` → 0 hits in `src/`).
3. **Sun light only as a sky icon.** A schematic sun disc + halo + rays already exist
   (`ViewerShadowCanvas.tsx` lines 128–163, `ShadowPreview.tsx` `drawSchematicSunOverlay`
   lines 128–244), but there is **no light emission on objects or ground** and the disc
   colors are hardcoded `rgba(...)` constants (not driven by sun altitude / cloud cover).

`three` is a `devDependency` used **only** by the legacy box editor
`src/components/PlaygroundViewer.tsx`; it is unrelated and must stay untouched.

---

## Priority (highest realism-per-effort first)

1. **Sun light / glow on objects + ground** (Phase 2) — biggest visual win, reuses existing
   polygon + blur geometry.
2. **Weather API** (Phase 3 + 4) — makes temperature/shade/rain data-driven, "time machine"
   moves weather with the slider.
3. **Rain + wet ground** (Phase 5) — depends on Phase 3/4 for precipitation.
4. **Clouds / overcast dimming** (Phase 6) — ties cloud cover to light/sky.
5. **Consolidation + perf + docs** (Phase 7 + 8).

---

## Hard constraints (MUST follow — these are the "do not" list)

- **Do NOT migrate the photo pipeline to three.js/WebGL.** All effects are Canvas 2D
  compositing (`multiply`, `screen`, `overlay`) + offscreen canvases.
- **Do NOT build a particle engine.** Rain = a tiled, pre-rendered streak canvas that is
  moved/offset each frame.
- **Do NOT create a parallel "weather store"** next to `attributes`. Derive labels from
  weather; keep static attributes only as a fallback.
- **Do NOT add a dependency** unless `package.json` lacks an equivalent. Prefer no new deps
  for this work; if unavoidable, get approval first.
- **Do NOT write tests** (project convention).
- **No new `any` types.** Use strict typed interfaces.
- **Keep components modular.** If a component grows past ~250 lines during a task, propose
  extracting a sub-component in the summary (do not silently bloat).
- **`renderShadows` signature and the two call sites must stay functional.** Extend with
  *new* exported modules/functions; do not delete the documented contract.

---

## How sub-agents verify (IMPORTANT — `npx` AND `npm` shims are blocked)

PowerShell execution policy blocks both `npx.ps1` and `npm.ps1`. **Never** rely on `npm run`
or `npx`. Invoke the underlying tools through **`node` directly**:

```sh
# typecheck
node node_modules/typescript/bin/tsc --noEmit

# build
node node_modules/astro/astro.js build
```

- Do **not** use `npm run ...` or `npx ...` (both shims fail the execution policy).
- A `"typecheck": "tsc --noEmit"` script is added to `package.json` in Phase 1 (for humans /
  other environments), but here you **must** call `node node_modules/typescript/bin/tsc`.

### KNOWN BASELINE ERRORS (pre-existing, NOT caused by this plan)

`src/components/PlaygroundViewer.tsx` (legacy three.js editor) has 3 pre-existing `tsc`
errors caused by a `@types/three@0.169.0` ↔ `three@0.185.1` version mismatch:
- `Cannot find module 'three/examples/jsm/controls/OrbitControls'`
- `Cannot find module 'three/examples/jsm/controls/TransformControls'`
- `Parameter 'event' implicitly has an 'any' type.`

Per the "leave the legacy editor alone" rule, **do not** fix these. The **phase gate** is:

> `node node_modules/typescript/bin/tsc --noEmit` must show **no NEW errors** from any file this
> plan creates/modifies (`src/types/environment.ts`, `src/lib/environmentConfig.ts`,
> `src/lib/lighting.ts`, `src/lib/clouds.ts`, `src/lib/rain.ts`, `src/lib/weather.ts`,
> `src/lib/sunOverlay.ts`, `src/pages/api/weather.ts`, and the modified components). The 3
> `PlaygroundViewer.tsx` errors may remain — they are the known baseline.

The `build` gate is the same: it must succeed except for the unrelated `PlaygroundViewer` type
errors (Astro build can still fail on those; if it does, confirm the failure is only in
`PlaygroundViewer.tsx`).

---

## File checklist (created / modified across the whole plan)

```
NEW  src/types/environment.ts                 <- Phase 1  (types)
MOD  src/types/index.ts                       <- Phase 1  (+ export * from './environment')
MOD  package.json                             <- Phase 1  (+ "typecheck")
NEW  src/lib/environmentConfig.ts             <- Phase 1  (tunable constants)
NEW  src/lib/lighting.ts                      <- Phase 2  (sun disc / ground / object light)
NEW  src/lib/clouds.ts                        <- Phase 2/6 (sky tint / dimming)
NEW  src/pages/api/weather.ts                 <- Phase 3  (Open-Meteo proxy endpoint)
NEW  src/lib/weather.ts                       <- Phase 3  (fetch + useWeather hook + derive)
DATA data/weather_fixture.json                <- Phase 3  (offline fixture for tests)
MOD  src/components/viewer/ViewerShadowCanvas.tsx <- Phase 2/4/5/6
MOD  src/components/viewer/PlaygroundDetail.tsx   <- Phase 4
MOD  src/components/ShadowPreview.tsx         <- Phase 2/7 (reuse shared sun disc)
NEW  src/lib/rain.ts                          <- Phase 5  (streak layer + wet ground)
NEW  src/lib/sunOverlay.ts                    <- Phase 7  (extract duplicate sun-position code)
MOD  src/lib/AGENTS.md                       <- Phase 8  (document new call sites)
MOD  src/lib/i18n.ts                         <- Phase 6  (new weather/sky labels, optional)
```
---

## Phase 1 — Environment types + tunable constants (foundation)

**Goal:** Introduce the shared vehicle all later phases pass around, without any visual
change. Everything must compile untouched apart from the new files.

### Tasks

1. Create `src/types/environment.ts`. Import `SolarPosition` from `./shadow`. Define:

```ts
import type { SolarPosition } from './shadow';

/** One-hour weather sample from Open-Meteo (or fixture). */
export interface WeatherSnapshot {
  temperature_c: number;
  cloud_cover_pct: number;   // 0..100
  precipitation_mm: number;  // mm during the hour
  weather_code: number;      // WMO weather code (see Phase 3)
  wind_speed_kmh: number;
  is_day: boolean;           // derived from solar altitude or weather_code
}

/** Raw hourly arrays returned by /api/weather (whole day, so the client can pick). */
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
  intensity: number;                      // 0..1, f(altitude), reduced by cloud cover
  screenX: number;                        // px, -1 if not in view
  screenY: number;
  inView: boolean;
  isBehind: boolean;
  screenDir: { dx: number; dy: number };  // unit vector pointing TOWARD the sun, screen space
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
```

2. In `src/types/index.ts` add `export * from './environment';` (it already re-exports
   `./playground` and `./shadow`).

3. Create `src/lib/environmentConfig.ts` with the exported constants below:

```ts
export const LIGHT_CONFIG = { enabled: true, intensity: 0.85, warmth: 0, blurPx: 10, offsetPx: 4 };
export const RAIN_CONFIG = { enabled: true, opacity: 0, streakLength: 14, streakAngleDeg: 14, speedPxPerSec: 900, seed: 1 };
export const CLOUD_CONFIG = { enabled: true, dimLighting: true };
export const WEATHER_DEBOUNCE_MS = 200;
export const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000; // 30 min
export const OPEN_METEO_HOURLY_FIELDS = 'temperature_2m,precipitation,cloud_cover,weather_code,wind_speed_10m';
```

4. In `package.json` scripts add: `"typecheck": "tsc --noEmit",`.

### Acceptance
- `npm run typecheck` passes (0 errors).
- `npm run build` passes.
- No runtime behaviour change yet; `attributes` still used verbatim.


---

## Phase 2 — Sun light / glow on objects & ground

**Goal:** Add light emission. Derive the sun-light vector from the *existing* shadow bearing
(light comes from the opposite side of the cast shadow), then composite a **light pass**
(object polygons + heavy blur, `screen`/`overlay`) and a **ground pass** (full-frame gradient
centred near the sun, `screen`/`overlay`), warm-tinted at low altitude. Also parameterise the
existing sun disc by altitude/cloud.

### Files
- `NEW src/lib/lighting.ts`
- `NEW src/lib/clouds.ts` (minimal — sky tint + light dimming)
- `MOD src/components/viewer/ViewerShadowCanvas.tsx`
- `MOD src/components/ShadowPreview.tsx`

### Tasks

1. **`src/lib/lighting.ts`** — implement and export:

   - `computeSunLightTarget(solar, cameraAzimuthDeg, cameraFovDeg, width, height, cloudCoverPct): SunLightTarget`
     - Reuse the relative-azimuth math already in `ShadowPreview.tsx` lines 139–148 and
       `ViewerShadowCanvas.tsx` lines 132–137:
       `diffAzimuth = ((solar.azimuth_deg - cameraAzimuthDeg + 540) % 360) - 180`.
     - `screenX = (0.5 + diffAzimuth / cameraFovDeg) * width`;
       `screenY = clamp(0.45 - (solar.altitude_deg / 90) * 0.42, 0.04, 0.85) * height`.
     - `inView = abs(diffAzimuth) <= cameraFovDeg/2 + 10`;
       `isBehind = abs(diffAzimuth) > 90`.
     - `screenDir`: unit vector toward the sun in screen space. For a sun on the right
       (`diffAzimuth > 0`) light comes from the right; set `dx = sign(diffAzimuth)`,
       `dy = 0.35 * sign(90 - altitude_deg)`; normalise.
     - `intensity = clamp(altitude_deg / 45, 0, 1) * (1 - cloudCoverPct/100 * 0.7)`.
     - `color`: warm at low altitude — interpolate `r:255`, `g: 180 + 75*min(alt/45,1)`,
       `b: 60 + 195*min(alt/45,1)`.

   - `renderSunDisc(ctx, target, width, height)` — halo + rays + disc, **parameterised** by
     `target.intensity` and `target.color` (replace hardcoded `rgba(254,240,138,…)` in the two
     components). Fades at night / overcast.

   - `renderGroundSunlight(ctx, width, height, target, config)` —
     `globalCompositeOperation = 'screen'`; radial gradient centred at `(target.screenX,
     target.screenY)` (clamp inside frame; if `!inView`, bias toward `screenDir` from the frame
     edge); radius `~ 0.55 * max(w,h)`; stops from `rgba(color, intensity*config.intensity)`
     centre → transparent edge; fill. Overcast → alpha `* (1 - cloudCoverPct/100)`.

   - `renderObjectSunlight(ctx, width, height, annotations, target, config)` —
     for each annotation with `polygon_coordinates.length >= 3`: draw the polygon **shifted
     toward the sun** by `config.offsetPx * target.screenDir`, filled white,
     `ctx.filter = blur(config.blurPx)`, `globalCompositeOperation = 'screen'`,
     `globalAlpha = config.intensity * target.intensity * (1 - cover/100)`, warm fill
     `rgb(target.color)`. Reuses the same polygon path as `shadowRenderer.ts` lines 96–102.

   - `renderSkyTint(ctx, width, height, solar, cloudCoverPct, config)` — full-frame `overlay`:
     night → dark blue-gray; day → desaturated gray at `(cloudCoverPct/100 * 0.25)`; warm amber
     near the sun. Exported from `lighting.ts` for a single call site.

2. **`src/lib/clouds.ts`** — helpers: `cloudDimFactor(cloudCoverPct): number` (0..1),
   `skyOverlayColor(solar, cloudCoverPct): { r,g,b,a }`. Keep it small; the actual tint drawing
   can live here but expose one entry point (`renderSkyTint`) so call sites don't diverge.

3. **`src/components/viewer/ViewerShadowCanvas.tsx`**:
   - Remove the inline sun-disc block (lines 127–163) and replace with
     `const lt = computeSunLightTarget(...); if (lt.inView) renderSunDisc(ctx, lt, w, h);`.
   - After the `renderShadows(...)` call (after line 125), add: `renderSkyTint(...)`,
     `renderGroundSunlight(...)`, `renderObjectSunlight(...)` — each guarded by
     `sol.altitude_deg > 0`.
   - Import from `../lib/lighting`.
   - Keep the `isAdditional` early-return (light is not applied to gallery photos).

4. **`src/components/ShadowPreview.tsx`**:
   - Replace the body of `drawSchematicSunOverlay` (lines 128–244) with calls to
     `computeSunLightTarget` + `renderSunDisc` so preview and viewer stay in sync.
     Keep the "Sun outside FOV / behind camera" badge (lines 211–242) as it is still
     useful.

### Acceptance
- `npm run typecheck` + `npm run build` pass.
- At midday, tree/structure polygons brighten on their sunward edge and the ground brightens
  toward the sun; at low sun altitude the tint is warm/orange.
- Shadows are unchanged (no regression in `renderShadows`).
- Night still shows no shadows and no light.


---

## Phase 3 — Weather API (Open-Meteo) + client + hook + fixture

**Goal:** A server proxy endpoint that returns a whole day of hourly weather, plus a client
helper and a `useWeather` hook that caches and lets the app pick the weather for a given hour
so the "time machine" moves weather with the slider. Provide an **offline fixture** so the
feature can be tested without network.

### Files
- `NEW src/pages/api/weather.ts`
- `NEW src/lib/weather.ts`
- `DATA data/weather_fixture.json`

### Tasks

1. **`src/pages/api/weather.ts`** — Astro server route (`APIRoute`), export `GET`.
   - Query params: `lat`, `lon`, optional `date` (ISO `YYYY-MM-DD`).
   - Endpoint: `process.env.OPEN_METEO_BASE_URL || 'https://api.open-meteo.com/v1/forecast'`
     (server-side; Open-Meteo needs **no API key**). Params:
     `?latitude=<lat>&longitude=<lon>&hourly=<OPEN_METEO_HOURLY_FIELDS>&timezone=auto`.
   - Parse the response and return `WeatherDayHourly`:
     `{ time, temperature_2m, precipitation, cloud_cover, weather_code, wind_speed_10m }`.
   - Also accept `?useFixture=1` (or read `process.env.USE_WEATHER_FIXTURE`) and return the
     contents of `data/weather_fixture.json` instead — this is how offline sub-agents test.
   - On error return `new Response(JSON.stringify({ error: msg }), { status: 502 })`.

2. **`src/lib/weather.ts`** — client logic, implement and export:
   - `fetchWeatherDay(lat, lon, opts?: { useFixture?: boolean }): Promise<WeatherDayHourly>`.
   - `selectWeatherAt(day: WeatherDayHourly, minutes: number): WeatherSnapshot` — pick the
     hourly index nearest to `minutes`; map to `WeatherSnapshot`; set `is_day` from
     `weather_code` (0–3 = clear/partly, mostly day) — refine in Phase 6 with solar.
   - `getWeatherCacheKey(lat, lon, day: string): string` — `lat|lon|YYYY-MM-DD`.
   - Module-level cache `Map<string, { data: WeatherDayHourly; at: number }>` with
     `WEATHER_CACHE_TTL_MS`; in-flight promise map to avoid duplicate requests;
     `deriveWeatherState(...)` helper to build `EnvironmentState`.
   - `useWeather(lat, lon, minutes): { weather: WeatherSnapshot | null; loading: boolean;
     error: string | null }` (React hook):
     - `useState` + `useEffect`; debounce `minutes` by `WEATHER_DEBOUNCE_MS` (200 ms);
     - cache key uses the **hour bucket** (`Math.floor(minutes/60)`), so requests fire when
       the hour changes, not on every slider tick;
     - on success, `selectWeatherAt(day, minutes)`; on failure, return `null` (app falls back
       to static attributes) and log a warning.

3. **`data/weather_fixture.json`** — hand-write a 24-entry `WeatherDayHourly` that starts at
   `data.weather_fixture`'s first `time`. Use realistic values: clear morning (codes 0–2),
   rain ~15:00 (code 61, precip 2–5 mm), overcast afternoon (cloud_cover 80+), warm
   temperature profile, `wind_speed_10m` ~ 5–20. This gives sub-agents a deterministic
   dataset for Phase 4/5/6 without network.

### Acceptance
- `npm run typecheck` + `npm run build` pass.
- `GET /api/weather?lat=39.7436&lon=-8.8071` returns a `WeatherDayHourly` JSON (verify in
  browser / curl; or with `&useFixture=1`).
- `useWeather` returns a snapshot that changes when `minutes` crosses an hour boundary.


---

## Phase 4 — Wire weather into the viewer (labels + render props)

**Goal:** Make the viewer's temperature/shade text **data-driven** (with static fallback) and
pass `weather` + computed `effects` into the shadow canvas so light/rain can use real cloud
cover / precipitation.

### Files
- `MOD src/components/viewer/PlaygroundDetail.tsx`
- `MOD src/components/viewer/ViewerShadowCanvas.tsx`

### Tasks (PlaygroundDetail.tsx)

1. Import `getSolarPosition` from `../lib/solar`, `useWeather` from `../lib/weather`, and a new
   helper `deriveShadePct`, `deriveTempLabel` (add these to `src/lib/weather.ts` in Phase 3:
   `deriveShadePct(solar, weather, annotations): number` and
   `deriveTempLabel(weather): { en: string; pt: string }`).

2. Near lines 92–96, replace the hardcoded `shadePct` formula with:
   - `const sol = getSolarPosition(buildDate(timeMinutes), playground.latitude, playground.longitude);`
     where `buildDate(minutes)` builds a `Date` at today's date with `minutes`.
   - `const { weather, loading: weatherLoading } = useWeather(playground.latitude, playground.longitude, timeMinutes);`
   - `const shadePct = weather ? deriveShadePct(sol, weather, activeScene?.annotations ?? []) : legacyShadePct(timeMinutes);`
     Keep `legacyShadePct` as the existing formula (lines 95–96) so behaviour is unchanged
     until weather loads.

3. Replace `tempText` (line 127) with
   `const tempText = weather ? deriveTempLabel(weather)[lang] : (playground.attributes.surface_temperature[lang] || playground.attributes.surface_temperature.en);`.

4. Build the `effects` object and pass to the canvas (lines 183–191):
   - Add `weather={weather}` and `effects={buildEffects(weather)}` props to `<ViewerShadowCanvas>`.
   - `buildEffects(weather): EnvironmentEffects` derives `LIGHT_CONFIG.intensity * (1 - cloud/100)`,
     `RAIN_CONFIG.opacity` and `intensity` from `weather.precipitation_mm`, and
     `CLOUD_CONFIG.cloudCoverPct = weather.cloud_cover_pct`.

### Tasks (ViewerShadowCanvas.tsx)

5. Add optional props to the interface:
   `weather?: WeatherSnapshot | null; effects?: Partial<EnvironmentEffects>;` (default to a
   no-op `EnvironmentEffects` when absent).

6. In `render()` (line 76+), after `renderShadows(...)` (line 112–125), stitch the Phase 2
   light calls using `effects.light.enabled` and pass `weather?.cloud_cover_pct ?? 0` into
   the `SunLightTarget` computation. Keep the `sol.altitude_deg > 0` guard.

7. The "Nighttime" overlay (lines 186–191) should also trigger if
   `weather?.is_day === false` (i.e., heavy overcast day can still feel dark). Optional.

### Acceptance
- `npm run typecheck` + `npm run build` pass.
- On the `/viewer/:id` page, the temperature pill and "shaded %" line change when the time
  slider moves (once weather loads), and fall back to static strings if the API fails.
- With `?useFixture=1` (or fixture default), the ~15:00 rain hour visibly changes the numbers.


---

## Phase 5 — Rain + wet ground (Canvas 2D animation)

**Goal:** Draw realistic rain when `weather.precipitation_mm > 0`, using a **tiled, pre-rendered
streak layer** that is only offset/animated (no particle engine). Also add a subtle wet-ground
darkening + sheen. Keep the static base+shadow+light composited into an **offscreen cache
canvas** so the animation never re-runs the expensive shadow/light passes each frame.

### Files
- `NEW src/lib/rain.ts`
- `MOD src/components/viewer/ViewerShadowCanvas.tsx`

### Tasks (src/lib/rain.ts)

1. `hashSeed(seed: number): number` — deterministic integer hash (e.g. xorshift) to seed
   random streaks so the pattern is stable for a given hour bucket (prevents flicker in the
   "time machine").

2. `createRainLayer(width, height, seed, config): HTMLCanvasElement`
   - Offscreen canvas `width x height`, transparent background.
   - Draw `N` streaks (e.g. `Math.floor(width/60)` lines) with a seeded PRNG:
     each has random `x`, `y`, length ~ `streakLength * (0.7 + rand*0.6)`, thickness ~1–2 px,
     angle = `streakAngleDeg`, color `rgba(190,210,235, alpha)` where
     `alpha ~ 0.08–0.25`. Higher `config.intensity` → more/denser streaks + higher alpha.
   - Return the canvas. (Tile it by drawing this layer twice with offset to wrap around.)

3. `renderRain(ctx, width, height, layer, offset, config)` —
   `save`; `globalCompositeOperation = 'source-over'`; `globalAlpha = config.opacity`;
   draw `layer` at `(-offset % width, ...)` and again offset by `+width` to tile horizontally;
   optionally translate the whole layer vertically and wrap with a second copy at `±height`.
   `restore`.

4. `renderWetGround(ctx, width, height, precipitationMm, config)` —
   - If `precipitationMm <= 0` return.
   - Pass 1 `multiply` a soft vertical gradient at low alpha (`0.06–0.15 * intensity`) to
     darken the ground as it wets.
   - Pass 2 `screen` a thin bright horizontal band near the base of the frame
     (`y ~ 0.8*height`) with a low-alpha white gradient to fake a specular sheen.

5. `rainIntensityFromPrecip(mm: number): number` — `clamp(mm / 4, 0, 1)` (1 mm ≈ light,
   4 mm ≈ heavy).

### Tasks (ViewerShadowCanvas.tsx)

6. Add refs: `staticCanvasRef<HTMLCanvasElement>` (offscreen cache) and
   `rainLayerRef<HTMLCanvasElement | null>`, plus `rafRef<number>`.

7. In `render()`: after drawing base + shadows + light onto the visible canvas, ALSO draw the
   same content onto `staticCanvasRef` (same size). Then if `effects.rain.enabled` and
   `weather.precipitation_mm > 0`: build/lazy-cache `rainLayerRef` via `createRainLayer(...)`
   (keyed by `effects.rain.seed`), start the RAF loop.

8. RAF loop (only while raining):
   - On each frame, `ctx.clearRect` the visible canvas, `drawImage(staticCanvasRef)`, then
     `renderRain(ctx, w, h, rainLayerRef.current, offset++ , effects.rain)`, and
     `renderWetGround(...)`.
   - Clean up with `cancelAnimationFrame(rafRef.current)` in a `return` of a `useEffect` whose
     deps are the rain-affecting values (`weather.precipitation_mm`, `effects.rain.seed`,
     `width`, `height`). Or store the state in refs and start/stop in an effect.

9. Guard: when `precipitation_mm` drops to 0, cancel the RAF loop and clear the visible canvas
   with `drawImage(staticCanvasRef)` (no rain).

### Acceptance
- `npm run typecheck` + `npm run build` pass.
- With the ~15:00 fixture hour (precip 2–5 mm), slanted streaks fall and the ground darkens
  slightly; pattern is stable for the same hour and does not shimmer while the slider sits
  still.
- Shadows/sun light still render correctly underneath the rain (no double-frame flicker).
- RAF loop stops and the frame clears when the hour becomes dry.


---

## Phase 6 — Clouds / overcast dimming + sky (uses `clouds.ts`)

**Goal:** Tie `weather.cloud_cover_pct` into lighting so heavy cloud dampens sun light, and
render an overcast sky tint. This closes the loop for rainy/overcast realism.

### Files
- `MOD src/lib/clouds.ts` (implement the helpers + tint)
- `MOD src/components/viewer/ViewerShadowCanvas.tsx`
- `MOD src/lib/i18n.ts` (optional labels)

### Tasks

1. **`src/lib/clouds.ts`** implement:
   - `cloudDimFactor(cloudCoverPct): number` — `1 - clamp(cloudCoverPct/100, 0, 1) * 0.7`
     (0 = fully cleared sun, 0.3 = heavy overcast). Used to scale light intensity.
   - `skyOverlayColor(solar, cloudCoverPct): { r,g,b,a }`:
     - night (`solar.altitude_deg <= 0`): dark blue-gray `{ 20, 28, 48, 0.55 }`.
     - overcast day: desaturated gray `{ 120,120,120, (cloudCoverPct/100)*0.25 }`.
     - clear day: transparent aura `{ 255, 244, 214, 0 }` (no-op, sun glow handles it).
   - `renderSkyOverlay(ctx, width, height, color)` — full-frame `overlay` fill with
     `rgba(color)`. (Replaces the tentative `renderSkyTint` if you put it here; keep the
     exported name `renderSkyTint` used by `ViewerShadowCanvas` in Phase 2.)

2. **`src/components/viewer/ViewerShadowCanvas.tsx`**: inside the Phase 2 light pass, multiply
   each light call's alpha by `cloudDimFactor(effects.clouds.cloudCoverPct)`. When
   `effects.clouds.enabled` and `cloudCoverPct > 40`, call `renderSkyTint(...)` (overcast haze).
   Keep the per-annotation shadow blur/opacity untouched so `renderShadows` stays stable.

3. **`src/lib/i18n.ts`** (optional, low priority): add keys like
   `'detail.rain': { en: 'Rain', pt: 'Chuva' }` and `'detail.cloudy': { en: 'Cloudy', pt: 'Nublado' }`
   if you add a small weather badge to the viewer. Only add if a badge is in scope; otherwise
   skip to keep the diff small.

### Acceptance
- `npm run typecheck` + `npm run build` pass.
- On a cloudy hour (fixture `cloud_cover` high), the scene is visibly dimmer/grayer and the
  sun disc/light fade; on a clear hour it is bright.
- `renderShadows` output is unchanged (regression check via Phase 2 smoke behaviour).



---

## Phase 7 — Consolidation, dedup, single environment state (cleanup)

**Goal:** Remove duplicated sun-position math (now in three places), converge on a single
`EnvironmentState` passed down, and explicitly mark the legacy 3D/sun-angle path so it is not
confused with the real pipeline. No new user-visible features.

### Files
- `NEW src/lib/sunOverlay.ts` (or fold into `lighting.ts`)
- `MOD src/components/viewer/ViewerShadowCanvas.tsx`
- `MOD src/components/ShadowPreview.tsx`
- `MOD src/components/viewer/PlaygroundDetail.tsx`
- `MOD src/components/PortalDashboard.tsx` (mark legacy only)

### Tasks

1. **Extract sun-position math.** The relative-azimuth / screen-position code is duplicated in
   `ViewerShadowCanvas.tsx` (lines 132–137), `ShadowPreview.tsx` (lines 139–148), and Phase 2's
   `computeSunLightTarget`. Create `src/lib/sunOverlay.ts` exporting
   `computeSunScreenInfo(solar, cameraAzimuthDeg, cameraFovDeg, width, height): {
   diffAzimuth, screenX, screenY, inView, isBehind }` and a pure
   `computeSunScreenDir(diffAzimuth, altitude_deg): { dx, dy }`. Refactor `ViewerShadowCanvas`,
   `ShadowPreview`, and `lighting.computeSunLightTarget` to call these. Delete the duplicated
   math.

2. **`renderSunDisc` becomes the single sun-icon renderer.** Ensure both `ViewerShadowCanvas`
   and `ShadowPreview` call the same `renderSunDisc(ctx, target, w, h)` and drop their private
   copies. Keep the "Sun outside FOV / behind camera" badge logic only in `ShadowPreview`.

3. **`EnvironmentState` as the prop.** In `PlaygroundDetail`, build one
   `const env: EnvironmentState = { minutes: timeMinutes, date, solar, weather, effects }` and
   pass it to `ViewerShadowCanvas` as a single prop (in addition to the unchanged
   `imageUrl`, `depthMapUrl`, `scene`, `isAdditional`). Remove the now-redundant
   `simulatedTimeMinutes` / `latitude` / `longitude` if the canvas derives solar + weather from
   `env` — OR keep them as required and add `env` as an optional augmentation. Prefer the
   minimal-diff option: keep existing required props, add `weather?`, `effects?`, `env?`.

4. **Mark legacy.** In `src/components/PortalDashboard.tsx` and `src/components/ClimateControls.tsx`,
   add a top comment `// LEGACY sun-angle editor (unconnected to the 2.5D shadow pipeline).`
   Do **not** delete them (they are referenced by the admin portal). Do **not** wire them to the
   new pipeline.

5. **Dedup i18n.** If `ShadowPreview` and viewer now show weather labels, centralise them in
   `src/lib/i18n.ts` (Phase 6) and remove any ad-hoc strings.

### Acceptance
- `npm run typecheck` + `npm run build` pass.
- No behavioural change versus the end of Phase 6 (visual regression comparison).
- `grep` shows `computeSunScreenInfo` / `renderSunDisc` imported by both canvas components
  (no strewn duplicates of the inline azimuth math).


---

## Phase 8 — Docs + final verification

**Goal:** Update the agent-facing docs so future work knows the new call sites and constants,
then run the full end-to-end check.

### Tasks
1. Update `src/lib/AGENTS.md`:
   - Add `lighting.ts`, `clouds.ts`, `rain.ts`, `weather.ts`, `sunOverlay.ts` to the "Files in
     this directory" list.
   - Extend "Call sites (the only ones allowed to invoke `renderShadows`)" with a note that
     `ViewerShadowCanvas.tsx` and `ShadowPreview.tsx` may additionally call the new
     `render*` functions in the same file; leave the `renderShadows` contract intact.
   - Add a short "Rendering order (ViewerShadowCanvas)" section: base photo → `renderShadows`
     → `renderSkyTint` → `renderGroundSunlight` → `renderObjectSunlight` → [rain overlay via
     `renderRain` + `renderWetGround`]. Note the offscreen `staticCanvas` caching rule.
2. Update this file's Checklist at the top to match reality (it already lists all files).
3. Run (per sub-agent, in order):
   ```sh
   npm run typecheck
   npm run build
   ```
4. Manual smoke (with the app running `npm dev`):
   - Load a playground, open `/viewer/:id`, move the time slider across 08:00–20:00.
   - Confirm: shadows move with sun; sun edge-light on objects; ground brightens toward sun;
     at a rainy hour the ground darkens and streaks fall; on a cloudy hour it dims.
   - Test `/api/weather?lat=39.7436&lon=-8.8071&useFixture=1`.
5. If any phase fails verification, fix it in the SAME phase before proceeding — do not carry
   known-broken state forward.

---

## Appendix A — Key constants (all configurable in `src/lib/environmentConfig.ts`)

| Constant | Default | Purpose |
|---|---|---|
| `LIGHT_CONFIG.intensity` | `0.85` | global light strength |
| `LIGHT_CONFIG.blurPx` | `10` | softness of the object light mask |
| `LIGHT_CONFIG.offsetPx` | `4` | shift of the light mask toward the sun (px) |
| `RAIN_CONFIG.streakLength` | `14` | rain streak length (px) |
| `RAIN_CONFIG.streakAngleDeg` | `14` | wind tilt of streaks |
| `RAIN_CONFIG.speedPxPerSec` | `900` | fall speed |
| `WEATHER_DEBOUNCE_MS` | `200` | slider debounce for weather fetch |
| `WEATHER_CACHE_TTL_MS` | `30*60*1000` | weather cache TTL |
| `OPEN_METEO_HOURLY_FIELDS` | `temperature_2m,precipitation,cloud_cover,weather_code,wind_speed_10m` | hourly vars |

## Appendix B — Sub-agent handoff rules (repeat before every phase)

- Verify with `npm run typecheck` then `npm run build` — **never `npx`** (PowerShell blocks the
  `npx.ps1` shim).
- Make **surgical** edits. Never rewrite a whole file to add one feature.
- Keep any component under ~250 lines; if it grows, propose extracting a sub-component.
- No new `any` types, no tests, no new dependencies without approval, no three.js/WebGL in the
  photo pipeline, no particle engine (use the tiled streak canvas), and no parallel weather
  store — derive labels from weather with a static fallback.
- Work phases in order; finish + verify one phase before starting the next.
