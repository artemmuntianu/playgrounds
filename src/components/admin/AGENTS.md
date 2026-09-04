# Admin flow (`src/components/admin`)

Internal operator UI under `/admin` to manage playgrounds, photos and annotations. Desktop-first,
sidebar layout (`AdminLayout.astro`).

## Modules

- `PlaygroundList.tsx` — list/cards via `fetchPlaygrounds()`, link to the editor.
- `PlaygroundEditor.tsx` — main editor for one playground (meta, attributes, photo grid).
- `PlaygroundForm.tsx`, `EquipmentEditor.tsx`, `EquipmentEditorParts.tsx`,
  `EquipmentMarkerPage.tsx`, `PhotoManager.tsx`, `PhotoUploadForm.tsx`, `PhotoAnnotationPage.tsx`,
  `PhotoDepthModal.tsx`, `AdditionalPhotoGrid.tsx`, `ShadowPhotoGrid.tsx`.
- Routes: `/admin`, `/admin/[id]`, `/admin/[id]/equipment`, `/admin/[id]/photos`.
  These are SSR shells with `client:load` islands.

## Rules

- All data flows through `lib/api.ts` (→ `/api/...`). Never touch Supabase from the client.
- Photo upload: **max 4 shadow photos** + unlimited `is_additional` (also enforced server-side).
- Annotations + equipment markers are saved via `/api/playgrounds/[id]/scenes/[photoId]`
  and the playground update (the `equipment` array).
- Keep components modular (< 250 lines, see `.clinerules`); do not rewrite a whole file to change
  styling — use surgical patches.
