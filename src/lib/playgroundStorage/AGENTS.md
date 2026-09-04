# Persistence layer (`src/lib/playgroundStorage`)

Two stores: **metadata in Supabase** (single source of truth) and **image binaries in Vercel Blob**.

## Sub-modules

- `index.ts` — public surface; re-exports `repo`, `photos`, `blob`, `slugify`.
  **Import from `lib/playgroundStorage`, not from the sub-modules directly.**
- `repo.ts` — typed re-exports of `db` functions (metadata only).
- `db/index.ts` — the actual Supabase queries + row↔domain mappers. Table shapes mirrored as
  interfaces (`PlaygroundRow`, `PhotoRow`, `SceneRow`, `EquipmentItemRow`, `EquipmentMarkerRow`).
  Uses `createServerClient()` (service role). `scenes` upserted on `(playground_id, photo_id)`.
  `getPlayground`/`listPlaygrounds` enrich each photo with resolved `photoUrl`/`depthMapUrl`/`segMaskUrl`.
- `blob.ts` — `@vercel/blob` wrapper: `putBinary` (public, deterministic pathname),
  `deleteBinary`, and `getPhotoUrl(playgroundId, filename)` → public Blob URL (cached, lazily listed).
- `photos.ts` — `savePlaygroundPhoto/DepthMap/SegMask` (upload to Blob, return the **bare filename**),
  `deletePlaygroundPhoto` (deletes the photo/depth/seg blobs).
- `slugify.ts` — lowercase + `_` slug, latin folding, capped at 64 chars.

## Key invariants

- Playground `id` = `slugify(name)`.
- `photo.filename` / `depth_map_filename` / `semantic_mask_filename` are stored in the DB as the
  **bare filename** (e.g. `photo_1.jpg`). `db/index.ts` resolves them to **Vercel Blob** URLs
  (via `blob.getPhotoUrl`) only at the API/SSR boundary — the DB never stores URLs.
- Blob pathnames are `playgrounds/<id>/photos/<filename>` (public, `addRandomSuffix: false`).
- `deletePlaygroundPhoto` deletes the photo blob and, if present, the depth + seg blobs.
- Mappers `l10n(en, pt)` → `{ en, pt }` (pt falls back to en).
- `savePlaygroundScene` upserts with `onConflict: 'playground_id,photo_id'`; `getPlaygroundScene`
  uses `.maybeSingle()` and returns `null` when absent.
- **Do NOT add a filesystem fallback for metadata.** `db` is authoritative. The authoritative
  schema and reference seed live in `scripts/generate-ddl.sql` and `scripts/reference-data.sql`;
  their row shapes mirror the interfaces in `db/index.ts` / `referenceData.ts`.
