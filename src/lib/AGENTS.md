> **Scope**: this `AGENTS.md` documents ONLY the shadow/rendering engine in `src/lib`.
> For the rest of `lib` (weather, segmentation, solar, i18n, supabase, referenceData, equipment,
> api) and for the project-wide architecture, invariants and dead code, read
> `CONSTITUTION.md` (project root) and the other per-layer `AGENTS.md` files.


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
- `shadowProjection.ts` — **core geometry**. `projectShadowPolygons()` turns one
  `Annotation` + `SolarPosition` + image size + `ShadowCameraParams` into the
  shadow shape of the object's **volume**: `[nearRing, farRing, ...sideTriangles]`
  in normalised coordinates (a depth of 0 returns just the near ring).
  `objectDepthOffset()` converts the operator's `depth_cm` into
  camera-height units through `SHADOW_CONFIG.assumedCameraHeightM` (the engine is
  scale-invariant, so an absolute size needs that one metric anchor).
- `segRenderer.ts` — **the live renderer, now just the orchestrator (95 lines)**.
  `renderSegmentedScene()` is what `ViewerShadowCanvas` calls: it resolves the sun
  target, paints the shadow layer, clips it to the ground mask, multiplies it onto the
  photo and delegates the light passes. Keep it thin — the passes live in:
  - `shadowLayer.ts` — `drawShadowLayerToCanvas()` fills every annotation through
    `paintSoftPolygon` into ONE layer (so overlapping shadows behave like a single
    occluder; the depth extrusion arrives as `extraRings`), and applies the optional
    depth-map warp to every ring;
  - `lightPasses.ts` — `renderMaskedLightPasses()`: sky + sun glow (`source-over`),
    ground sunlight (`screen`), vertical light (`screen`); each at
    `RENDER_CONFIG.effectWorkCapPx`, clipped to its category mask and upscaled;
  - `segMasks.ts` — `getMask()`: the shared feathered category-mask cache (built once
    per photo via the `WeakMap` keyed by the segmentation payload).
- `softShape.ts` — soft-shape painting: pooled scratch canvases, the
  engine-independent blur pyramid, and `paintSoftPolygon` (single path, several
  rings, `extraRings` for the extruded volume — the nonzero fill rule then yields
  their exact union with ONE alpha).
- `penumbra.ts` — `penumbraRadiusPx()` (scale-aware penumbra from the projected
  shadow + sun altitude) and the shadow base/tip helpers used by the
  contact-shadow gradient.
- `depthWarp.ts` — `applyDepthWarpToPolygon()` samples the depth map
  (255 = near camera) and displaces shadow vertices by a small amount over
  foreground obstacles; `sampleDepthMap()` clamps out-of-bounds coords.
- `sunOverlay.ts` — pure sun-to-screen helpers (`computeSunScreenInfo`,
  `computeSunScreenDir`); the single source of truth for sun X/Y, in-view and direction.
- `lighting.ts` — `computeSunLightTarget()`: the sun's screen position / direction / intensity /
  colour, i.e. the single input of the masked light passes. The old per-pass drawing helpers
  (`renderSunDisc`, `renderGroundSunlight`, `renderObjectSunlight`, `renderSkyTint`) were dead code
  since the segmented renderer took over and have been removed.
- `clouds.ts` — `cloudDimFactor()`: cloud cover damps the sun-light strength. The overcast sky blend
  itself lives in `lightPasses.ts` (`renderSkyInto`, fed the cloud percentage).
- `weather.ts` — Open-Meteo client (`fetchWeatherDay`, `selectWeatherAt`, `useWeather`)
  plus derived display helpers (`deriveShadePct`, `deriveTempLabel`,
  `buildEnvironmentEffects`).
- `rain.ts` — rain + wet ground (`hashSeed`, `createRainLayer`, `renderRain`,
  `renderWetGround`, `rainIntensityFromPrecip`).

Types live in `../types/shadow.ts` (`Point2D`, `Annotation`,
`SceneAnnotation`, `SolarPosition`). Coordinates are **normalised** and may be
`< 0` or `> 1` (off-screen margin).

## Call sites (the only ones allowed to render)

- `../components/viewer/ViewerShadowCanvas.tsx` — public `/viewer/...` photo
  canvas. Passes `scene.scene_metadata.camera_azimuth_deg`, `horizon_y`,
  `camera_fov_deg` and `camera_pitch_deg` into `renderSegmentedScene()`. Accepts
  optional `weather` and `effects` props (from `../../lib/weather`) to drive cloud
  cover, rain and lighting.

`ShadowPreview.tsx` / `ShadowPipelineApp.tsx` were removed earlier and
`shadowRenderer.ts` (`renderShadows`) has been deleted as dead code. The public
viewer is the **single renderer / single source of truth**: `renderSegmentedScene()`
(`segRenderer.ts`, delegating to `shadowLayer.ts` / `lightPasses.ts` / `segMasks.ts`) plus the
`rain.ts` helpers. Do not add a second render path.

## Camera model (derived from user parameters)

- Focal length `f = (imageWidth / 2) / tan(cameraFovDeg / 2)`; square pixels,
  principal point at the image centre `(cx, cy) = (W/2, H/2)`.
- Horizon row: `horizon_y` accepts a **fraction** `(0, 1]` (stored in scene
  files, e.g. `0.3875`) **or** a pixel row. Defaults to the vertical centre.
- Camera pitch `p = atan2(cy - horizonPx, f)` (positive when the horizon is
  above the image centre, i.e. the camera looks slightly down). Can be
  overridden via `camera_pitch_deg`.
- Everything is computed **in units of the (unknown) camera height C**, which makes
  the projection scale-invariant: no metre value is needed, and there is no per-object
  height anywhere (the old `Annotation.height_meters` field is gone). An *absolute*
  size — the operator's `Annotation.depth_cm` — is therefore converted with one
  assumed metric anchor, `SHADOW_CONFIG.assumedCameraHeightM` (1.6 m, eye level of
  the photographer).

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
8. **Depth (`Annotation.depth_cm`, operator input, default 100 cm).** The annotated
   silhouette is the *near face* of a solid that extends
   `depth_cm / 100 / assumedCameraHeightM` C units **away from the camera**. The
   silhouette is therefore projected twice — the near ring (steps 1–7) and a far
   ring with `depth += δ` and the *same* vertex heights — and a side band of two
   triangles per polygon edge joins them, so the object casts the shadow of a prism
   instead of a cutout. This is a ground-space offset in **depth** followed by a
   re-projection, never a uniform screen-space translation. `depth_cm = 0`/absent
   returns the near ring only (flat cutout). All pieces go into ONE `paintSoftPolygon`
   call (`SoftPolygonOptions.extraRings`): the nonzero fill rule then gives their exact
   union with a single alpha, so overlapping pieces cannot darken each other. Sub-paths
   must share one winding direction — `paintSoftPolygon` normalises that.

## Rendering (`drawShadowLayerToCanvas` in `shadowLayer.ts`)

- Early-out when `solar.altitude_deg <= 0` (night).
- One soft fill per annotation: project the volume rings -> optional
  `applyDepthWarpToPolygon` (dominant screen-space shadow direction, applied to every
  ring with the same direction) -> `paintSoftPolygon` with colour `rgb(18, 30, 50)`,
  alpha `canopy_opacity`, a penumbra derived from the projected footprint
  (`penumbra.ts`) and a base -> tip contact falloff. `ctx.filter` is never used
  (WebKit ignores it — see the mobile note in `softShape.ts`).
- Every annotation accumulates into ONE layer with `source-over`; the layer is then
  clipped to the ground mask and multiplied onto the photo ONCE, so overlapping
  shadows behave like a single occluder. There is no per-object re-composite step:
  the segmentation mask keeps the shadow off the objects.

## Rendering order (ViewerShadowCanvas)

Canvas 2D, **no three.js**. Static content (base + shadow + light) is composited once per
state change and cached into an offscreen `staticCanvasRef`; the visible canvas then
composites the cache every frame plus a moving rain layer, so rain never re-runs the
expensive shadow/light passes. Order:

1. `drawImage(baseImage)`.
2. `renderSegmentedScene(...)`: shadow layer (multiplied, clipped to the ground mask) →
   sky gradient + sun glow (sky mask) → direct ground sunlight (ground mask) →
   directional vertical light (vertical mask). Skipped entirely for `isAdditional`
   photos, which get no shadows / scene camera.
   - **Inside the shadow layer pass**, after painting all annotation shadows and before the
     `destination-in` groundMask clip, `eraseAnnotationSilhouettes()` punches the annotation
     polygon silhouettes out with `destination-out`. This ensures the shadow never darkens
     the annotated objects themselves, regardless of segmentation mask quality.
3. `drawEquipmentMarkers(...)` — drawn **after** `renderSegmentedScene` so dot-markers appear
   above the shadow layer.
4. If `effects.rain.enabled` and `precipitation_mm > 0`: cache the static frame into
   `staticCanvasRef`, then run a `requestAnimationFrame` loop that clears the visible canvas,
   draws `staticCanvasRef`, then `renderRain(...)` + `renderWetGround(...)`.

## Conventions & pitfalls

- Coordinates are normalised and may exceed `[0, 1]`; the math must handle
  off-frame rows/columns (this is how off-screen trees still cast shadows).
- `horizon_y` is usually stored as a fraction (`<= 1`), but can be a pixel row;
  always resolve before use.
- When scene metadata is missing: camera azimuth 0, FOV 65, horizon at centre.
- The model is an approximation (a vertical prism whose near face is the annotated
  silhouette, at the anchor's ground depth), not a full 3-D reconstruction. The
  operator-declared depth extrusion is PART of that model; do not "improve" it back
  into a uniform screen-space polygon translation or a horizon clamp/fade, and do not
  add dependencies.
- `depth_cm` is clamped to `[0, SHADOW_CONFIG.maxObjectDepthCm]` by
  `clampObjectDepthCm()` (`environmentConfig.ts`) — the single validation used by both
  the admin UI and the projection.
