# PlayGround Portal

**A bilingual catalogue of children's playgrounds, with a simulated sun, shadow
and weather view.** A public mobile viewer lets anyone browse playgrounds and
"time travel" the light on each photo; an operator admin manages the playgrounds,
photos and shadow-casting objects behind it.

![Astro 7](https://img.shields.io/badge/Astro-7-FF5D01?logo=astro&logoColor=white)
![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tailwind 4](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![Canvas 2D](https://img.shields.io/badge/renderer-Canvas%202D%20(no%203D%20lib)-1f2937)
![Deploy: Vercel](https://img.shields.io/badge/deploy-Vercel-000000?logo=vercel&logoColor=white)

## Contents

- [What it does](#what-it-does)
- [Routes](#routes)
- [Architecture](#architecture)
- [The shadow engine](#the-shadow-engine)
- [Key engineering decisions](#key-engineering-decisions)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Quality gates](#quality-gates)
- [Repo tooling (offline scripts)](#repo-tooling-offline-scripts)
- [Project layout](#project-layout)
- [Good to know](#good-to-know)
- [Documentation map](#documentation-map)

## What it does

- **Public viewer** (`/viewer`): cards for every playground with filters (age
group, equipment type) and sorting; open one for a portrait-first detail view with
a **Time Machine** slider, live or demo weather, a day offset, equipment
markers, and English/Portuguese text.
- **Operator admin** (`/admin`): create and edit playgrounds, upload photos
  (with an optional depth map and semantic mask), annotate the objects that cast
  shadows, place equipment markers, and tune each photo's scene camera.
- **Shadow simulation**: given the photo's scene data and the playground's
  coordinates, the viewer computes the sun for the selected time and repaints the
  photo's shadows, sky light and weather effects - all in Canvas 2D on the device.

## Routes

**Pages**

| Route | Audience | Purpose |
|---|---|---|
| `/` | - | redirects to `/viewer` |
| `/viewer` | public | playground cards, filters and sorting |
| `/viewer/[id]` | public | detail view: Time Machine, weather, equipment markers |
| `/admin` | operator | playground list |
| `/admin/[id]` | operator | playground editor: meta, attributes, photos |
| `/admin/[id]/photos` | operator | upload photos, annotate shadow objects |
| `/admin/[id]/equipment` | operator | place equipment markers |

**API**

| API route | Methods | Purpose |
|---|---|---|
| `/api/playgrounds` | GET, POST | list / create |
| `/api/playgrounds/[id]` | GET, PUT, DELETE | read / update / delete one |
| `/api/playgrounds/[id]/photos` | POST, DELETE | upload a photo (and its depth mask) / delete one |
| `/api/playgrounds/[id]/depth` | POST | attach a depth map to an existing photo |
| `/api/playgrounds/[id]/scenes/[photoId]` | GET, POST | read / write the scene annotation |
| `/api/reference` | GET | age groups, equipment categories and catalogue |
| `/api/weather` | GET | Open-Meteo proxy (no API key needed) |

## Architecture

```
Browser
  |  Astro pages (SSR)                     React islands (client:load)
  v
Astro SSR on Vercel (@astrojs/vercel, output: server)
  |- /api/...      --> lib/playgroundStorage --> Supabase   (all metadata)
  |                                          `--> Vercel Blob (photos, depth maps, seg masks)
  |- /api/weather  --> Open-Meteo (upstream)
  `- viewport      --> lib/ shadow engine (pure Canvas 2D, on the device)
```

Two rules keep this simple: **clients never touch the database** (every island
calls `lib/api.ts`, which hits `/api/...`), and **Supabase is the single source of
truth for metadata** - there is no filesystem fallback.

## The shadow engine

The interesting part of this project lives in `src/lib`. It is an approximation,
not a 3D reconstruction, and that is a deliberate design choice: it runs on a
phone, over a single photo, with no 3D library anywhere in the project.

- **Sun position** (`solar.ts`) - a pure NOAA-style solar calculator returns
  azimuth and altitude for a place and time. At night the altitude is zero, which
  is the engine's signal to paint no shadow at all.
- **Projection** (`shadowProjection.ts`) - the core geometry. Each annotated object
  is treated as a vertical prism: its near face is the polygon the operator drew at
  its ground anchor, extruded backwards from the camera using the depth in
  centimetres that the operator entered. The camera is handled as a pinhole, so the
  horizon, the camera azimuth and the field of view all matter. Coordinates are
  normalised and are allowed to fall outside `[0, 1]`, which is exactly how a tree
  that is off-frame still casts a shadow into the picture.
- **Soft shadows** (`softShape.ts`, `penumbra.ts`) - one soft fill per object, with a
  penumbra derived from the projected footprint and the sun's altitude, and a
  base-to-tip falloff. Every piece is added to a single path so the union of the
  parts is filled exactly once - overlapping pieces of the same shadow cannot
  darken each other. The blur is a small hand-written pyramid rather than
  `ctx.filter`, which mobile WebKit ignores.
- **Masks keep light in its place** (`segmentation.ts`, `segMasks.ts`, `lightPasses.ts`)
  - per-pixel sky / ground / vertical categories come from a semantic mask that
  ships with the photo. The shadow layer is clipped to the ground mask, and the
  sky glow, direct ground sunlight and vertical light passes are each clipped to
  their own mask, so light never lands on the wrong surface.
- **Depth-aware correction** (`depthWarp.ts`) - where a foreground obstacle sits in
  front of a shadow, the depth map nudges the shadow's vertices so the result does
  not look pasted on.
- **Frame budget** (`ViewerShadowCanvas.tsx`) - the expensive passes are composited
  once per state change into an offscreen canvas. Each animation frame then draws
  that cached frame and only the moving weather layer (rain, wet ground), so
  dragging the Time Machine slider does not re-run the shadow and light maths only
  to throw the result away.
- **Masks are generated offline** by `scripts/mask_generator.py`: a SegFormer model
  produces the ADE20K segmentation, and a small HSV step recovers sky that shows
  through the leaves of a tree crown and that the network mistook for an object.

## Key engineering decisions

### One renderer, no 3D library

There is exactly one render path (`renderSegmentedScene`), called from exactly one
component. The earlier screen-space shadow renderer and the old three.js editor
were deleted rather than kept beside it, because two renderers means two sets of
bugs and no way to tell which one painted a frame.

### Metadata in the database, binaries in blob storage

All playground, photo, scene, equipment and reference records live in Supabase;
photos, depth maps and masks live in Vercel Blob under a deterministic pathname
(`playgrounds/<id>/photos/<filename>`) and are served from the CDN. The database
stores the **bare filename** and the API/SSR boundary resolves it to a public URL,
so a storage move never becomes a data migration.

### The API layer is the only server surface

Every route is server-rendered and validates its own input, because writes use the
service-role client. Limits are enforced on the server, not just hidden in the UI -
for example, at most four shadow-enabled photos per playground, with any further
photo accepted only as an "additional" one that has no shadow scene.

### The database is the reference vocabulary

Age groups, equipment categories and the equipment catalogue are rows, served by
`/api/reference` and cached in the browser. Adding a new piece of equipment is a
data change, not a code change.

### Bilingual from the start

Every human-readable field is a `LocalizedText` (`en`, `pt`) and UI strings come
from `lib/i18n.ts`, with the viewer's language choice remembered locally. Retrofitting
a second language after the fact is far more expensive than carrying it from day one.

### Gates that stay meaningful

ESLint 10 with a flat config splits rules into **errors** (rules the code satisfies
today, so a failure means a real regression) and **warnings** (deliberate tolerances
such as existing `any` types and hook dependency lists). A lint command that cannot
be green is a lint command nobody runs. `npm run typecheck` runs `tsc --noEmit` over
the strict config.

## Tech stack

| Concern | Technology |
|---|---|
| Framework | Astro 7, Vercel adapter, `output: server` (SSR) |
| Interactivity | React 18 islands (`client:load`) |
| Language | TypeScript, strict |
| Styling | Tailwind CSS 4 through `@tailwindcss/vite` |
| Rendering | Canvas 2D, hand-written 2.5D shadow engine |
| Metadata | Supabase (Postgres) via `@supabase/supabase-js` |
| Images | Vercel Blob via `@vercel/blob` |
| Weather | Open-Meteo through `/api/weather` |
| Quality | ESLint 10 flat config, `tsc --noEmit` |

## Getting started

Prerequisites: Node.js 20 or newer, a Supabase project, and (for uploads) a Vercel
Blob store.

```bash
npm install
```

1. **Create the schema.** Run `scripts/generate-ddl.sql` against your Supabase
   project, then `scripts/reference-data.sql` to seed the age group, category and
   equipment vocabulary.
2. **Configure.**

   ```bash
   cp .env.example .env.local        # Windows PowerShell: Copy-Item .env.example .env.local
   ```

   Fill in the Supabase values; add the Blob token for photo uploads.

3. **Run.**

   ```bash
   npm run dev                       # http://localhost:4321 -> redirects to /viewer
   ```

4. **Build.**

   ```bash
   npm run build                     # astro build (Vercel runs this on deploy)
   npm run preview                   # preview the production build (`npm start` is an alias)
   ```

## Environment variables

| Variable | Needed | Purpose |
|---|---|---|
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_KEY` | yes | publishable key (the quickstart name for the anon key) |
| `SUPABASE_ANON_KEY` | fallback | used when `SUPABASE_KEY` is not set |
| `SUPABASE_SECRET_KEY` | for writes | server secret used by the service-role client and the migration script |
| `BLOB_READ_WRITE_TOKEN` | for images | Vercel Blob token for photo, depth map and mask binaries |

On Vercel these come from the project environment (Production and Preview);
locally from `.env.local`, which is git-ignored. Weather needs no key.

## Quality gates

```bash
npm run lint          # ESLint 10 flat config (errors must stay at zero)
npm run lint:fix      # ...or `npm run lint -- --fix`
npm run typecheck     # tsc --noEmit
npm run build         # astro build
```

There is no test suite: `AGENTS.md` records "do not write tests" as a deliberate
project decision, and these commands are the definition of done instead.

## Repo tooling (offline scripts)

`scripts/` holds one-off helpers that are intentionally **not** wired into npm
scripts or the build:

- `mask_generator.py` - generates a photo's semantic mask (sky / ground / rest).
- `detect-icons.mjs`, `crop-icons.mjs` - split the equipment icon sheets into the
  per-equipment PNGs used by `public/icons/equipment/`.
- `generate-ddl.sql`, `reference-data.sql` - the authoritative schema and the
  reference vocabulary seed.

## Project layout

```
src/types/                 domain vocabulary (playground, shadow, environment, segmentation)
src/lib/                   engines and utilities: solar, projection, renderer, weather, i18n
src/lib/playgroundStorage/ persistence: Supabase metadata (db/) + Vercel Blob (blob.ts)
src/pages/api/             the only server surface: SSR routes, input validation
src/components/viewer/     public mobile viewer (single renderer)
src/components/annotation/ operator annotation tooling
src/components/admin/      operator admin flow
src/pages/                 Astro routes wrapping the components in layouts
src/layouts/               Base, Viewer (portrait-first) and Admin shells
scripts/                   schema, reference seed and offline generator scripts
public/icons/equipment/    equipment marker icons
```

## Good to know

- **The shadow model is an approximation by design.** Each object is a vertical
  prism at its ground anchor, extruded by the operator's depth value - not a full
  3D reconstruction. Do not "improve" it into a uniform screen-space translation.
- **The viewer is portrait-first on purpose**; phone users in landscape get an
  overlay asking them to rotate back.
- **Photos carry their own scene.** Camera azimuth, field of view and the horizon
  line are per photo, so a playground with several photos still looks consistent.
- **Additional photos are second-class by design**: they have no shadow scene, no
  camera and no simulation.

## Documentation map

| File | Owns |
|---|---|
| `AGENTS.md` | the project map: layers, commands, environment traps |
| `CONSTITUTION.md` | canonical architecture, invariants and removed legacy code |
| `src/lib/AGENTS.md` | the shadow and rendering engine |
| `src/lib/playgroundStorage/AGENTS.md` | persistence: Supabase metadata + Vercel Blob |
| `src/pages/api/AGENTS.md` | the API route map and its rules |
| `src/components/{viewer,annotation,admin}/AGENTS.md` | each UI layer |
| `src/types/AGENTS.md` | the shared domain vocabulary |