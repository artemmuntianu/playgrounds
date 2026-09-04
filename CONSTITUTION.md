# Project Constitution — PlayGround Portal

> **Canonical source of truth for the app's architecture and the intent behind it.**
> Every agent must read this before changing anything. If this file disagrees with an
> old comment or guide, **this file wins**. Update it whenever the architecture changes.

## 1. What this app is

A server-rendered (SSR) Astro app — **PlayGround Portal** — for cataloguing, annotating and
visualising children's playgrounds with time-dependent sun shadows, weather and equipment
overlays. Two audiences:

- **Mobile viewer** (`/viewer`) — *public*. Browse playgrounds, "time-travel" shadows/weather
  on a photo, see equipment dot-markers. Portrait-first, styled for phones.
- **Operator admin** (`/admin`) — *internal*. CRUD playgrounds, upload photos, annotate
  shadow-casting objects, place equipment markers, tune scene camera params.

## 2. Tech stack (source of truth: `package.json`)

- Astro **^7.2.9**, **Node adapter**, `output: 'server'`, `mode: 'standalone'` (SSR, `node dist/server/entry.mjs`).
- React **18.3** (client islands), Tailwind **3.4** (inline utility classes).
- TypeScript **strict**, `moduleResolution: bundler`, `jsx: react-jsx`.
- `@supabase/supabase-js` (persistence). No other external services are required at runtime
  (weather is proxied from Open-Meteo; no API key).
- `npm run build` → `astro build`, `npm start` → `node dist/server/entry.mjs`.

> Note: the older note "Astro 5" is stale — `package.json` is authoritative.

## 3. Layered architecture (bottom ↑ top)

```
src/types/                 ← domain vocabulary (Playground, Annotation, Environment, Segmentation)
src/lib/                   ← pure logic/engines (solar, shadows, weather, segmentation, i18n, …)
src/lib/playgroundStorage/ ← persistence abstraction (metadata → Supabase, images → FS)
src/pages/api/             ← Astro API endpoints (the ONLY way clients touch DB/files)
src/components/            ← React islands + rendering canvases (admin / annotation / viewer)
src/pages/                 ← Astro SSR routes wrapping components in layouts
src/layouts/               ← HTML shells (Base, Viewer, Admin)
```

Rules that MUST hold:

- **Client components never touch the DB directly.** They call `lib/api.ts` (fetch helpers)
  → `/api/...` → `lib/playgroundStorage` / `lib/supabase`. Single write path.
- **Supabase is the single source of truth for ALL metadata** (playgrounds, photo meta,
  equipment, scenes, reference catalog). There is **no** filesystem fallback for metadata anymore.
- **Image binaries** (photos, depth maps, seg masks) live only on the local FS at
  `data/playgrounds/<id>/photos/`, served via `/api/playgrounds/[id]/photo/[...filename]`.
- **Env**: Supabase creds come from `.env.local` (git-ignored). Server reads them into
  `process.env` at runtime (`lib/supabase.ts`). `isSupabaseConfigured()` is true only when
  `SUPABASE_URL` + `SUPABASE_SECRET_KEY` are set.

## 4. Security & config rules

- Writes go through API routes using the **service-role** client (`createServerClient()`),
  bypassing RLS — so API routes must validate their own inputs. No auth is wired for admin;
  treat `/admin` and all `/api` as validated-but-trusted.
- `.env.local` is git-ignored. Never paste real Supabase keys into code or docs.
- Uploaded binaries write to `data/` (git-ignored), never into the repo.

## 5. Canonical invariants (do not break)

1. **The public viewer is the single renderer.** `ViewerShadowCanvas` (canvas 2D) is the only
   place that may call `renderShadows()` and the `render*`/`segRenderer` helpers. The old
   `ShadowPreview` / `ShadowPipelineApp` were removed — do not resurrect them.
2. **Shadow maths are an approximation** (pinhole ground-plane projection; each object is a
   vertical billboard at its `ground_anchor` depth) — NOT a full 3D reconstruction. Never
   "improve" it into a uniform polygon translation or a horizon clamp/fade, and never add
   dependencies to the `lib` engine.
3. **Coordinates are normalised** and may fall outside `[0,1]` (off-screen objects still cast
   shadows). `horizon_y` may be a fraction (≤1) OR a pixel row; resolve before use.
4. **No new `any` types.** Existing `any` are tracked in `TODO-types.md`. New code passes strict TS.
5. **i18n** uses `Locale = 'en' | 'pt'`, keys in `lib/i18n.ts`, bilingual `LocalizedText { en, pt }`.
6. **Equipment reference vocabulary lives in the DB** (`age_groups`, `equipment_categories`,
   `equipment_catalog`), served by `/api/reference` and cached client-side in `lib/equipment.ts`
   (falls back to raw ids when empty). The old static `equipmentCatalog.ts` is gone.
7. **Weather** is proxied from Open-Meteo (no API key) via `/api/weather`; `data/weather_fixture.json`
   is the offline fixture (`useFixture=1` / `USE_WEATHER_FIXTURE=1`).

## 6. What was removed (legacy / filesystem fallbacks)

The following were dead or replaced metadata-with-filesystem fallbacks, so they were deleted:

- The **three.js editor** (`PortalDashboard.tsx`, `PlaygroundViewer.tsx`, `ClimateControls.tsx`),
  the legacy `PlaygroundElement` / `PlaygroundManifest` types and `types/three-examples.d.ts`,
  plus the `three` + `@types/three` deps. It was not wired to any route.
- The **filesystem scene pipeline** `/api/scene` + `lib/sceneIO.ts` (wrote `data/scenes/*.json`).
  The current scene path is `/api/playgrounds/[id]/scenes/[photoId]` → the `scenes` DB table.
- `/api/manifest` (wrote `data/playground.json`) and `/api/reconstruct` (Gemini, wrote `uploads/`),
  the empty `uploads/` dir, and the `@google/generative-ai` dep.
- The obsolete `migrate:supabase` script reference in `package.json`.
- The unused `isSupabaseConfigured()` / `createPublicClient()` in `lib/supabase.ts`.

The schema lives in `scripts/generate-ddl.sql` and the reference vocabulary seed in
`scripts/reference-data.sql` — run both against Supabase.

## 7. Conventions worth repeating

- `package.json` is authoritative for the framework version (currently Astro `^7.2.9`).
- Supabase is **required**. Only image binaries
  (photos / depth maps / seg masks) live on the local FS under `data/playgrounds/<id>/photos/`.

## 8. Keeping this doc in sync

- After changing an interface/route/renderer, update the affected layer's `AGENTS.md`; if it
  crosses layer boundaries, update this constitution too.
- Prefer a per-layer `AGENTS.md` next to the code it describes over editing this top file,
  except for cross-cutting invariants.
