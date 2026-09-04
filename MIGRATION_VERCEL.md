# Migration Plan — PlayGround Portal → Vercel (Hobby / free) + Vercel Blob + GitHub

> Status: **Code migration COMPLETE & pushed** to `artemmuntianu/playgrounds` (branch `main`).
> Remaining = manual deployment from the Vercel dashboard (Phase 8 / owner steps) + env vars + image upload.
>
> Note: the git-linked path (`create_git_project`) requires a **Vercel ⇄ GitHub Login Connection**,
> which wasn't present, so deployment is done manually from the dashboard (import the repo).

## Why this is needed

The app is currently Astro **SSR** (`output: 'server'`) running on the **Node adapter**
(`mode: 'standalone'`, served via `node dist/server/entry.mjs`). Vercel functions run on an
**ephemeral, read-only filesystem**, so two things won't work as-is:

1. **Image binaries** stored on the local FS (`data/playgrounds/<id>/photos/`) won't persist or be
   readable across function invocations.
2. The **Node adapter** must be replaced with the **Vercel adapter** (`@astrojs/vercel`).

## Decisions (confirmed with the owner)

1. **Repo**: new **private** GitHub repo named **`Playgrounds`**, set as the local `origin`.
2. **Blob approach**: **keep bare filenames in the database** and add a **URL resolver** that maps
   `(playgroundId, filename)` → the public Vercel Blob URL. Do **not** stuff blob URLs into the DB.
3. **Images**: the owner uploads them manually. This plan documents the manual Vercel + app steps.
   The owner will also remove unneeded files from `.\data` and `.\public`.
4. **Weather fixture**: **removed** (no offline fixture; live Open-Meteo only).
5. **Tailwind**: **upgrade the integration** so the `@astrojs/tailwind` ↔ `astro@7` peer conflict
   is resolved → use **Tailwind v4 + `@tailwindcss/vite`**.

---

## Phase 0 — Manual cleanup (owner)

- [ ] Delete unneeded images / files from `.\data` and `.\public`.
- [ ] Keep the runtime equipment icons under `public/icons/equipment/*.png` (the app needs them).
- [ ] `data/` is git-ignored, so it won't be committed regardless.

## Phase 1 — Git repo

- [ ] Create the private GitHub repo `Playgrounds` (GitHub MCP `create_repository`, `private: true`).
- [ ] `git remote add origin <repo-url>`
- [ ] Add `*.log` and `.vercel/` to `.gitignore` (build logs / local Vercel metadata).
- [ ] Commit & push `main`.

## Phase 2 — Switch to the Vercel adapter

- [ ] `npm install @astrojs/vercel @vercel/blob --legacy-peer-deps` (tolerates the pre-existing
      `@astrojs/tailwind` peer mismatch, removed later in Phase 5).
- [ ] `npm uninstall @astrojs/node`
- [ ] `astro.config.mjs`: `import vercel from '@astrojs/vercel'`, `adapter: vercel()`, drop
      `mode: 'standalone'`, keep `output: 'server'`, `security`, tailwind/react integrations.
- [ ] Verify: `npm run build` then inspect `build.log`.

## Phase 3 — Image binaries → Vercel Blob (bare filenames + URL resolver)

Keep DB storing bare `filename` / `depth_map_filename` / `semantic_mask_filename`. Add a resolver
that turns those into public Blob URLs.

- [ ] `src/lib/playgroundStorage/blob.ts` (NEW): thin wrapper around `@vercel/blob`.
      - `putBinary(pathname, buffer, contentType) → { url }` (`access: 'public'`, `addRandomSuffix: false`).
      - `deleteBinary(url)`.
      - `getPhotoUrl(playgroundId, filename): Promise<string>` — resolves `playgrounds/<id>/photos/<filename>`
        to a public URL, backed by an in-memory `pathname → url` cache seeded by `put()` responses
        and lazily populated with a single `list({ prefix })` per playground.
- [ ] `src/lib/playgroundStorage/photos.ts`:
      - `savePlaygroundPhoto/DepthMap/SegMask` → upload to Blob at `playgrounds/<id>/photos/<filename>`,
        **still return the bare filename** (DB unchanged).
      - `deletePlaygroundPhoto` → `deleteBinary(url)` for photo/depth/seg; drop the FS unlink + dead
        `scenes/*.json` delete.
      - Remove `getPhotoPath`; repurpose `getPhotoUrl` to call the Blob resolver.
- [ ] Delete `src/pages/api/playgrounds/[id]/photo/[...filename].ts` (no longer serving from FS; the
      browser fetches the Blob CDN URL directly).
- [ ] Delete `src/lib/playgroundStorage/paths.ts` and its re-exports in `index.ts` (FS is gone; keep `slugify`).
- [ ] Enrich server responses **before** they reach the browser: in `src/lib/playgroundStorage/db/index.ts`
      (`getPlayground` + `listPlaygrounds`), set resolved `photoUrl` / `depthMapUrl` / `segMaskUrl` on each photo.
- [ ] Add optional resolved-URL fields to `PlaygroundPhoto` (`src/types/playground.ts`) for the *response*
      (DB never stores them).
- [ ] Update consumer components to use the resolved URL fields for `<img src>` (keep `filename` for labels):
      - `src/components/admin/AdditionalPhotoGrid.tsx`
      - `src/components/admin/EquipmentMarkerPage.tsx`
      - `src/components/admin/PhotoAnnotationPage.tsx` (also `original_image_path` / `depth_map_path`)
      - `src/components/admin/ShadowPhotoGrid.tsx`
      - `src/components/viewer/PlaygroundDetail.tsx` (passes `imageUrl`/`depthMapUrl`/`segMaskUrl` to `ViewerShadowCanvas`)
- [ ] Remove the unused `getPhotoUrl` in `src/lib/api.ts`.

## Phase 4 — Remove the weather fixture

- [ ] `src/pages/api/weather.ts`: delete the `FIXTURE_PATH`, the `useFixture` flag/branch, and the
      `weather_fixture.json` read. Keep the live Open-Meteo proxy path.
- [ ] Remove `USE_WEATHER_FIXTURE` from `.env.example`.
- [ ] Update docs that mention the fixture (`CONSTITUTION.md` §5, `src/pages/api/AGENTS.md`).

## Phase 5 — Upgrade Tailwind integration (v3 + @astrojs/tailwind → v4 + @tailwindcss/vite)

- [ ] `npm uninstall @astrojs/tailwind tailwindcss`
- [ ] `npm install tailwindcss @tailwindcss/vite --legacy-peer-deps`
- [ ] Create `src/styles/global.css` with `@import "tailwindcss";` (+ any v4 theme config via `@theme`).
- [ ] Import `../styles/global.css` in the Astro layouts (`BaseLayout`, `AdminLayout`, `ViewerLayout`).
- [ ] `astro.config.mjs`: remove the `tailwind()` integration; add `vite: { plugins: [tailwindcss()] }`.
- [ ] Delete `tailwind.config.mjs` (v4 is CSS-first).
- [ ] Verify the build still emits utility CSS; spot-check inline utilities.

## Phase 6 — Environment & docs

- [ ] `.env.example`: add `BLOB_READ_WRITE_TOKEN` (and `BLOB_BASE_URL` if used); drop `USE_WEATHER_FIXTURE`.
- [ ] Update `src/lib/playgroundStorage/AGENTS.md` (Blob, resolver, no FS), `src/pages/api/AGENTS.md`
      (route map: remove `[...filename]`, note Blob), and `CONSTITUTION.md` (image binaries now on Blob).

## Phase 7 — Verify

- [ ] `npm run build` → succeeds with the Vercel adapter.
- [ ] `npm run typecheck` → passes (strict TS, no new `any`).
- [ ] `npm run lint --fix` (if any lint set up), then commit.

## Phase 8 — Push & deploy

- [ ] Commit & push `main` to `Playgrounds`.
- [ ] Vercel: link the repo (`Playgrounds`) → create/link a Hobby project (Vercel auto-detects Astro).
- [ ] Set project env vars (Production + Preview): `SUPABASE_URL`, `SUPABASE_KEY` (or `SUPABASE_ANON_KEY`),
      `SUPABASE_SECRET_KEY`, `BLOB_READ_WRITE_TOKEN`.
- [ ] Attach a **Vercel Blob** store to the project (this generates/attaches `BLOB_READ_WRITE_TOKEN`).
- [ ] Deploy; watch build logs; promote preview → production; capture the final URL.

## Manual steps for the owner (from the app + Vercel dashboard)

1. **Vercel Blob**: Dashboard → app project → Storage → **Create Blob Store** (region e.g. `arn1`,
   **Public**). Copy the **Read/Write token** into the project's `BLOB_READ_WRITE_TOKEN` env var
   (Production + Preview).
2. **Supabase**: add the exact `SUPABASE_URL` / `SUPABASE_KEY` (anon) / `SUPABASE_SECRET_KEY`
   values from your local `.env.local` into the Vercel project env vars.
3. **Deploy** (automatic on push, or trigger from the dashboard).
4. **Upload images** in the admin UI (`/admin` → playground → photos). Each upload uploads the photo,
   the optional depth map and the semantic mask to **Vercel Blob**; the DB keeps the bare filenames
   and the resolver produces the public CDN URLs.
5. Verify public `/viewer` cards show thumbnails and detail pages render photos + shadows.

## Risks / notes

- **`@vercel/blob` is an add-on** on the Hobby plan (small free allowance; verify current limits in the
  dashboard). `BLOB_READ_WRITE_TOKEN` is injected once a store is attached.
- The **URL resolver** calls `list()` once per playground per warm function instance (cached thereafter),
  so the public viewer may incur a tiny first-request cost per photo until the cache warms.
- **Admin is unauthenticated** (trusted, per `CONSTITUTION.md`) — unchanged by this migration.
- After Tailwind v4 upgrade, verify classes that were Tailwind v3-only (rare) render correctly.
- The offline weather fixture is gone; `/api/weather` now always proxies Open-Meteo.
