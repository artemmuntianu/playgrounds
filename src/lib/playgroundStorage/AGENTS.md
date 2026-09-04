# Persistence layer (`src/lib/playgroundStorage`)

Two stores: **metadata in Supabase** (single source of truth) and **image binaries on the local FS**.

## Sub-modules

- `index.ts` — public surface; re-exports `repo`, `photos`, `paths`, `slugify`.
  **Import from `lib/playgroundStorage`, not from the sub-modules directly.**
- `repo.ts` — typed re-exports of `db` functions (metadata only).
- `db/index.ts` — the actual Supabase queries + row↔domain mappers. Table shapes mirrored as
  interfaces (`PlaygroundRow`, `PhotoRow`, `SceneRow`, `EquipmentItemRow`, `EquipmentMarkerRow`).
  Uses `createServerClient()` (service role). `scenes` upserted on `(playground_id, photo_id)`.
- `paths.ts` — `BASE_DIR = data/playgrounds`, `playgroundDir(id)`, `ensureBaseDir()`.
- `photos.ts` — `savePlaygroundPhoto/DepthMap/SegMask`, `deletePlaygroundPhoto`, `getPhotoUrl`
  (= `/api/playgrounds/[id]/photo/<filename>`), `getPhotoPath`.
- `slugify.ts` — lowercase + `_` slug, latin folding, capped at 64 chars.

## Key invariants

- Playground `id` = `slugify(name)`.
- `photo.filename` / `depth_map_filename` / `semantic_mask_filename` are stored in the DB as the
  **bare filename** (e.g. `photo_1.jpg`), relative to `data/playgrounds/<id>/photos/`.
- `deletePlaygroundPhoto` also unlinks the depth map, seg mask and scene file; the API then
  removes the entry from `playgrounds.photos[]` and fixes `thumbnail_photo_id`.
- Mappers `l10n(en, pt)` → `{ en, pt }` (pt falls back to en).
- `savePlaygroundScene` upserts with `onConflict: 'playground_id,photo_id'`; `getPlaygroundScene`
  uses `.maybeSingle()` and returns `null` when absent.
- **Do NOT add a filesystem fallback for metadata.** `db` is authoritative. The authoritative
  schema and reference seed live in `scripts/generate-ddl.sql` and `scripts/reference-data.sql`;
  their row shapes mirror the interfaces in `db/index.ts` / `referenceData.ts`.
