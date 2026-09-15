# Domain types (`src/types`)

This is the shared vocabulary for the whole app. `index.ts` re-exports all modules; import types
from here. Do not invent parallel shapes in components.

## Modules

- `playground.ts` — `LocalizedText { en, pt }`, `AgeGroup`, `EquipmentCategoryId`,
  `EquipmentTypeId`, `PhotoMarker`, `PlaygroundEquipmentItem`, `PlaygroundPhoto`,
  `PlaygroundAttributes`, `Playground`, `PlaygroundSummary`.
- `shadow.ts` — `Point2D` (normalised, **may be <0 or >1** off-frame), `Annotation`
  (incl. optional `ground_projection_coordinates` for open structures, the operator-set
  `depth_cm` — the object's real depth, which the engine extrudes the polygon by — and
  `is_offscreen`),
  `SceneAnnotation` (`scene_metadata`: `camera_azimuth_deg`, `camera_fov_deg`, `camera_pitch_deg`,
  `horizon_y`, `sun_light_strength`, `sun_sky_glow`), `SolarPosition`.
- `environment.ts` — `WeatherSnapshot`, `WeatherDayHourly`, `SunLightTarget`, config interfaces
  (`LightRenderConfig`, `RainRenderConfig`, `CloudRenderConfig`), `EnvironmentEffects`.
- `segmentation.ts` — `SegCategory` (`sky|vertical|ground`), `SegColor`, `SegColorMap`,
  `SegmentationData` (per-pixel `categories` in `SEG_CATEGORY_ORDER` order).
- `reference.ts` — `AgeGroupInfo`, `EquipmentCategoryInfo`, `EquipmentCatalogEntry`, `ReferenceBundle`.

## Rules

- Use `LocalizedText` for every bilingual field; use `t()` from `lib/i18n` for UI strings.
- Keep the normalised/off-frame contract of `Point2D` and the fraction-or-pixel contract of
  `horizon_y`. These are load-bearing assumptions in the shadow engine (`lib/AGENTS.md`).
- `SegCategory` index order matches `SEG_CATEGORY_ORDER` in `lib/environmentConfig.ts` — keep in sync.
