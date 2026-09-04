# Annotation tooling (`src/components/annotation`)

Operator tools to mark shadow-casting objects on a photo and tune the scene camera. React islands,
canvas 2D — **no three.js**.

## Modules

- `useAnnotationTool.ts` — core hook. Holds scene state (`scene_id`, `camera_azimuth_deg`,
  `camera_fov_deg`, `horizon_y`, `sun_light_strength`, `sun_sky_glow`), the annotation list, the
  current mode, the active polygon/anchor, per-vertex "ground bases" mode, and form state.
  `DEFAULT_HEIGHT_METERS = 10` — height is **no longer operator-set**: it only drives shadow blur
  softness, not shadow length (the length is derived from the polygon/anchor/horizon/sun).
- `types.ts` — `AnnotationMode` (`idle|drawing|setting_anchor|setting_horizon|ground_bases`) and
  `AnnotationCategory` (`tree|structure|building|other`).
- `AnnotationCanvas.tsx`, `EquipmentMarkerCanvas.tsx` — canvas render layers.
- `AnnotationSidebar.tsx`, `AnnotationToolBar.tsx` — UI controls.

## Rules

- Modes are mutually exclusive; switch only via `setMode` in the hook.
- Save/load uses the `SceneAnnotation` shape from `types/shadow.ts`.
- This is operator tooling; the actual rendering math lives in `lib` (see `src/lib/AGENTS.md`).
- Keep components < 250 lines (see `.clinerules`); break out sub-components when they grow.
