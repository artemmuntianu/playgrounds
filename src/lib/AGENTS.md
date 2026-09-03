# Shadow rendering logic (2.5D shadow simulation)

This directory contains the **math and rendering engine** that simulates
time-dependent sun shadows cast by annotated objects (trees, slides,
structures) onto a 2D playground photo. Shadows are computed with a **pinhole
ground-plane projection**, not a flat screen-space translation.

Every user-supplied scene parameter matters: the horizon line, camera azimuth
& FOV, the per-object `ground_anchor`, and polygon vertices that may live in
the off-screen annotation margin (outside `[0, 1]`).

## Files in this directory

- `solar.ts` — pure NOAA-style solar calculator. `getSolarPosition(date, lat,
  lon)` returns `{ azimuth_deg, altitude_deg }`. At night it returns
  `altitude_deg === 0` so callers know no shadow should render.
- `shadowProjection.ts` — **core geometry**. `projectShadowPolygon()` turns one
  `Annotation` + `SolarPosition` + image size + `ShadowCameraParams` into a
  normalised shadow polygon. `computeShadowLength()` is a legacy helper
  (`height / tan(alt)`, only used for the preview's "Shadow Scale" readout).
  `METRES_TO_NORM_SCALE` is kept for backward compatibility but is **not** used
  by the projection.
- `shadowRenderer.ts` — `renderShadows()` fills the projected polygons onto a
  canvas (`multiply` blend + blur), applies the optional depth-map warp, then
  re-composites the base image clipped to the original object polygons so an
  object is never shaded by its own shadow.
- `depthWarp.ts` — `applyDepthWarpToPolygon()` samples the depth map
  (255 = near camera) and displaces shadow vertices by a small amount over
  foreground obstacles; `sampleDepthMap()` clamps out-of-bounds coords.
- `sunOverlay.ts` — pure sun-to-screen helpers (`computeSunScreenInfo`,
  `computeSunScreenDir`); the single source of truth for sun X/Y, in-view and direction.
- `lighting.ts` — sun light passes (`computeSunLightTarget`, `renderSunDisc`,
  `renderGroundSunlight`, `renderObjectSunlight`, `renderSkyTint`).
- `clouds.ts` — `cloudDimFactor`, `skyOverlayColor` (sky tint colour).
- `weather.ts` — Open-Meteo client (`fetchWeatherDay`, `selectWeatherAt`, `useWeather`)
  plus derived display helpers (`deriveShadePct`, `deriveTempLabel`,
  `buildEnvironmentEffects`).
- `rain.ts` — rain + wet ground (`hashSeed`, `createRainLayer`, `renderRain`,
  `renderWetGround`, `rainIntensityFromPrecip`).

Types live in `../types/shadow.ts` (`Point2D`, `Annotation`,
`SceneAnnotation`, `SolarPosition`). Coordinates are **normalised** and may be
`< 0` or `> 1` (off-screen margin).

## Call sites (the only ones allowed to invoke `renderShadows`)

- `../components/viewer/ViewerShadowCanvas.tsx` — public `/viewer/...` photo
  canvas. Passes `scene.scene_metadata.camera_azimuth_deg`, `horizon_y`,
  `camera_fov_deg` and `camera_pitch_deg`. Accepts optional `weather` and `effects`
  props (from `../../lib/weather`) to drive cloud cover, rain and lighting.
- `../components/ShadowPreview.tsx` — annotation preview. Same metadata, plus a
  draggable horizon line whose value (fraction or pixel row) is passed live. Uses the
  shared `computeSunLightTarget` + `renderSunDisc`.

Both call sites are also the only ones allowed to invoke the new `render*` functions
(`lighting.ts`, `rain.ts`, `clouds.ts`). `renderShadows` itself is unchanged.

## Camera model (derived from user parameters)

- Focal length `f = (imageWidth / 2) / tan(cameraFovDeg / 2)`; square pixels,
  principal point at the image centre `(cx, cy) = (W/2, H/2)`.
- Horizon row: `horizon_y` accepts a **fraction** `(0, 1]` (stored in scene
  files, e.g. `0.3875`) **or** a pixel row. Defaults to the vertical centre.
- Camera pitch `p = atan2(cy - horizonPx, f)` (positive when the horizon is
  above the image centre, i.e. the camera looks slightly down). Can be
  overridden via `camera_pitch_deg`.
- Everything is computed **in units of the (unknown) camera height C**, which
  makes the projection scale-invariant — `height_meters` is not required by the
  geometry (it only drives blur/opacity UX in `shadowRenderer.ts`).

## Projection math (per annotation)

The annotated silhouette is treated as a **vertical cutout standing at the
horizontal ground depth of its `ground_anchor`**:

1. Anchor ground depth (in C units), from its pixel row `row_a`:
   `u = (row - cy) / f`,
   `D_a/C = (cos p - u sin p) / (u cos p + sin p)`.
2. Height ratio of each vertex (same plane of depth `D_a`):
   `Z/C = 1 - (D_a/C) * (u cos p + sin p) / (cos p - u sin p)`, clamped to
   `>= 0`. Vertices at/below the anchor row are treated as ground.
3. Shadow length on the ground, in C units: `L/C = (Z/C) / tan(solar alt)`.
4. Direction: the shadow runs **away from the sun**. Its world bearing
   `(sun_az + 180)` is converted to a relative camera bearing
   `beta = ((shadowAz - cameraAz + 540) % 360) - 180` (positive = right).
5. Ground shadow tip (Z = 0): lateral offset
   `(x - cx)/f * (D_a/C * cos p + sin p) + (L/C) sin beta`, depth
   `D_a/C + (L/C) cos beta`, then re-projected:
   `forward = depth * cos p + sin p` (clamped to a small positive value when the
   tip crosses the camera plane), `x = cx + f * lateral / forward`,
   `y = cy + f * (cos p - depth sin p) / forward`.
6. Ground shadow points always land **below the horizon** in the image; tips
   that pass the camera simply extend past the bottom of the frame (canvas
   clipping handles it). Never clamp shadow vertices back onto the horizon row —
   that was the old bug that smeared shadows into the sky.
7. If the polygon never reaches the ground (`min Z/C > 0.05`, a "floating"
   canopy) **and** the anchor is visible on the ground (row below the horizon,
   inside the frame), the anchor point is appended so the shadow stays connected
   to the tree base.

## Rendering (`renderShadows`)

- Early-out when `solar.altitude_deg <= 0` (night).
- One path per annotation: project polygon -> optional
  `applyDepthWarpToPolygon` (dominant screen-space shadow direction) -> fill
  with `multiply` blend, colour `rgb(18, 30, 50)`,
  `globalAlpha = canopy_opacity`, blur `clamp(height_meters * 0.8, 1, 18)px`.
- Afterwards the original photo is redrawn clipped to each object polygon so an
  object is never shaded by its own shadow.

## Rendering order (ViewerShadowCanvas)

Canvas 2D, **no three.js**. Static content (base + shadow + light) is composited once per
state change and cached into an offscreen `staticCanvasRef`; the visible canvas then
composites the cache every frame plus a moving rain layer, so rain never re-runs the
expensive shadow/light passes. Order:

1. `drawImage(baseImage)`.
2. `renderShadows(...)` (multiply + depth warp + object re-composite).
3. `renderSkyTint(...)` (overcast / night overlay; no-op on a clear day).
4. `renderGroundSunlight(...)` + `renderObjectSunlight(...)` (screen, warm when sun is low).
5. `renderSunDisc(...)` when the sun is in view.
6. If `effects.rain.enabled` and `precipitation_mm > 0`: cache the static frame into
   `staticCanvasRef`, then run a `requestAnimationFrame` loop that clears the visible canvas,
   draws `staticCanvasRef`, then `renderRain(...)` + `renderWetGround(...)`.

## Conventions & pitfalls

- Coordinates are normalised and may exceed `[0, 1]`; the math must handle
  off-frame rows/columns (this is how off-screen trees still cast shadows).
- `horizon_y` is usually stored as a fraction (`<= 1`), but can be a pixel row;
  always resolve before use.
- When scene metadata is missing: camera azimuth 0, FOV 65, horizon at centre.
- The model is an approximation (vertical billboard at anchor depth), not a full
  3-D reconstruction — do not "improve" it back into a uniform polygon
  translation or a horizon clamp/fade, and do not add dependencies.
