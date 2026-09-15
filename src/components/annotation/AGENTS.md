# Annotation tooling (`src/components/annotation`)

Operator tools to mark shadow-casting objects on a photo and tune the scene camera. React islands,
canvas 2D — **no three.js**.

## Modules

- `useAnnotationTool.ts` — core hook. Holds scene state (`scene_id`, `camera_azimuth_deg`,
  `camera_fov_deg`, `horizon_y`, `sun_light_strength`, `sun_sky_glow`), the annotation list, the
  current mode, the active polygon/anchor, per-vertex "ground bases" mode, form state
  (`objectDepthCm`, `DEFAULT_DEPTH_CM = 100`) and `handleUpdateAnnotation(id, patch)` — the single
  way an already-drawn object is edited. There is no height input: the projection derives the
  shadow from the polygon/anchor/horizon/sun.
- `types.ts` — `AnnotationMode` (`idle|drawing|setting_anchor|setting_horizon|ground_bases`) and
  `AnnotationCategory` (`tree|structure|building|other`).
- `AnnotationCanvas.tsx`, `EquipmentMarkerCanvas.tsx` — canvas render layers.
- `AnnotationSidebar.tsx` — sidebar shell: lays out the cards below, owns the object list (with the
  `cm deep` / `ground proj` / `Off-screen` badges and the delete button) and the save button.
  Keep it a thin composition layer — it was 369 lines before the card split, stay under 250.
- `AddAnnotationForm.tsx` — the "Add Shadow-Casting Object" card: object id, category, **Depth
  (cm)** (default `DEFAULT_DEPTH_CM = 100`, capped by `SHADOW_CONFIG.maxObjectDepthCm`) and canopy
  opacity.
- `SceneMetaCard.tsx` — the "Camera & Scene Meta" card: scene id, camera facing, lens FOV, horizon
  line and the per-photo lighting knobs.
- `SelectedAnnotationEditor.tsx` — edits the selected object after it was drawn: `depth_cm` (the
  volume the shadow is cast by) and canopy opacity. Values are clamped with
  `clampObjectDepthCm()` from `lib/environmentConfig`.
- `AnnotationToolBar.tsx` — mode buttons + off-screen presets.

## Rules

- Modes are mutually exclusive; switch only via `setMode` in the hook.
- Save/load uses the `SceneAnnotation` shape from `types/shadow.ts`.
- **Depth (cm) is part of the annotation, not the scene.** A new object defaults to
  `DEFAULT_DEPTH_CM = 100`; `0` means "flat cutout" (no volume, legacy look) and the value is
  clamped to `SHADOW_CONFIG.maxObjectDepthCm`. The engine turns it into a ground-space depth
  extrusion of the polygon (see `src/lib/AGENTS.md`) — do not implement the extrusion here.
- Edit an object through `handleUpdateAnnotation` (used by `SelectedAnnotationEditor`); never mutate
  `annotations` entries in place.
- This is operator tooling; the actual rendering math lives in `lib` (see `src/lib/AGENTS.md`).
- Keep components < 250 lines (see `.clinerules`); break out sub-components when they grow.
