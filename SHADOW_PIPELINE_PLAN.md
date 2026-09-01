# 2.5D Playground Shadow Projection Pipeline — Implementation Plan

> **For LLM Agents:** Work through each phase **in order**. Complete every task in a phase and verify it before moving to the next. Do **not** skip ahead.

---

## Context

This is an **Astro + React** project (see `astro.config.mjs`, `src/` directory). The goal is to add a shadow simulation feature that projects realistic, time-dependent shadows onto 2D playground images using a 2.5D hybrid approach (2D polygons + monocular depth map).

Two sample files already exist in the project root:
- `ClarkV_original.jpg` — the base playground image
- `ClarkV_depth_map.png` — the pre-generated depth map

---

## Phase 1 — Data Types & Schema

**Goal:** Define all TypeScript types used across the pipeline.

### Tasks

1. Create `src/types/shadow.ts`.
2. Define the following exported types:

```ts
// Normalised coordinate (0.0-1.0 relative to image dimensions)
export interface Point2D { x: number; y: number; }

// A single annotated shadow-casting object
export interface Annotation {
  id: string;
  category: "tree" | "structure" | "building" | "other";
  height_meters: number;       // real-world height in metres
  canopy_opacity: number;      // 0.0 (transparent) to 1.0 (opaque)
  ground_anchor: Point2D;      // base of object on the ground plane
  polygon_coordinates: Point2D[]; // silhouette/crown polygon (normalised)
}

// Top-level scene file (what gets saved/loaded as JSON)
export interface SceneAnnotation {
  scene_metadata: {
    scene_id: string;
    original_image_path: string;
    depth_map_path: string;
    camera_azimuth_deg: number; // degrees clockwise from North
  };
  annotations: Annotation[];
}

// Solar position result
export interface SolarPosition {
  azimuth_deg: number;   // degrees clockwise from North
  altitude_deg: number;  // degrees above horizon
}

// A rendered shadow layer for one annotation
export interface ShadowLayer {
  annotation_id: string;
  shadow_polygon: Point2D[]; // projected polygon before depth warp
  opacity: number;
}
```

3. Export all types from `src/types/index.ts` (create if it doesn't exist).

---

## Phase 2 — Solar Position Calculator

**Goal:** Write a pure utility that converts a timestamp + location into sun azimuth & altitude.

### Tasks

1. Create `src/lib/solar.ts`.
2. Implement and export the function:

```ts
export function getSolarPosition(
  date: Date,
  latitude_deg: number,
  longitude_deg: number
): SolarPosition
```

3. Use the **NOAA Solar Calculator** algorithm (also known as the Astronomical Algorithms method):
   - Compute Julian Date from `date`.
   - Compute Julian Century `T`.
   - Compute geometric mean longitude, mean anomaly, ecliptic longitude.
   - Convert to apparent solar coordinates (right ascension, declination).
   - Compute Hour Angle.
   - Derive **altitude** (`alpha`) and **azimuth** (`phi`) in degrees.
   - Return `{ azimuth_deg, altitude_deg }`.

4. Add a guard: if `altitude_deg <= 0` (sun is below horizon / night), return `{ azimuth_deg: 0, altitude_deg: 0 }` — no shadow should render.

5. Write a quick sanity-check in a comment: at solar noon on the summer solstice in Lisbon (~38.7N), altitude should be approximately 75 degrees.

> **Note:** Do not use any external npm packages for this. Implement the maths from scratch using standard JS `Math` functions.

---

## Phase 3 — Shadow Vector & Polygon Projection

**Goal:** Given a solar position and an annotation, compute the raw (flat, no depth) projected shadow polygon.

### Tasks

1. Create `src/lib/shadowProjection.ts`.
2. Implement and export:

```ts
export function computeShadowLength(
  height_meters: number,
  altitude_deg: number
): number
// Returns L = h / tan(alpha). Return 0 if altitude_deg <= 0.
```

3. Implement and export:

```ts
export function projectShadowPolygon(
  annotation: Annotation,
  solar: SolarPosition,
  imageWidth: number,
  imageHeight: number
): Point2D[]
```

**Logic:**
- Convert `solar.azimuth_deg` to a unit direction vector in 2D screen space.
  - Azimuth 0 deg = North = up on screen -> `dy = -1, dx = 0`
  - Azimuth 90 deg = East = right -> `dx = +1, dy = 0`
  - Formula: `dx = sin(azimuth_rad)`, `dy = -cos(azimuth_rad)`
- Compute shadow length `L` in **normalised units** using `computeShadowLength`. Use a configurable scale constant `METRES_TO_NORM_SCALE = 0.04` so that `L_norm = L_metres * METRES_TO_NORM_SCALE`.
- Translate **every vertex** of `polygon_coordinates` by the vector `(dx * L_norm, dy * L_norm)`.
- Return the translated polygon as `Point2D[]` in normalised coordinates.

---

## Phase 4 — Depth-Aware Warp

**Goal:** Use the depth map to displace shadow pixels over foreground obstacles (slides, climbers, etc.).

### Tasks

1. Create `src/lib/depthWarp.ts`.
2. Implement and export:

```ts
export function sampleDepthMap(
  depthMapImageData: ImageData,
  x_norm: number,  // normalised 0-1
  y_norm: number   // normalised 0-1
): number           // returns depth value 0-255
```

3. Implement and export:

```ts
export function applyDepthWarpToPolygon(
  polygon: Point2D[],
  depthMapImageData: ImageData,
  shadowDirection: { dx: number; dy: number },
  warpStrength: number  // tunable constant, start with 0.002
): Point2D[]
```

**Logic for each vertex:**
- Sample depth at the vertex position using `sampleDepthMap`.
- Depth value 255 = closest to camera (foreground), 0 = furthest (background).
- Compute a displacement: `warpAmount = (depth / 255) * warpStrength`.
- Shift the vertex **opposite** to the shadow direction (towards the camera) by `warpAmount`.
- Return the warped polygon.

4. Note: `ImageData` is the standard browser Canvas API type. This function will be called from within a canvas rendering context.

---

## Phase 5 — Canvas Renderer

**Goal:** Render annotated shadow layers onto the base image using a canvas with multiply blend mode.

### Tasks

1. Create `src/lib/shadowRenderer.ts`.
2. Implement and export:

```ts
export function renderShadows(
  ctx: CanvasRenderingContext2D,
  imageWidth: number,
  imageHeight: number,
  annotations: Annotation[],
  solar: SolarPosition,
  depthMapImageData: ImageData | null
): void
```

**Logic:**
- For each annotation in `annotations`:
  - Call `projectShadowPolygon(...)` to get the flat shadow polygon.
  - If `depthMapImageData` is not null, call `applyDepthWarpToPolygon(...)` to get the depth-warped polygon.
  - Convert normalised coordinates to pixel coordinates (multiply x by `imageWidth`, y by `imageHeight`).
  - Set `ctx.globalCompositeOperation = "multiply"`.
  - Set `ctx.globalAlpha = annotation.canopy_opacity`.
  - Set `ctx.fillStyle = "rgba(0, 0, 0, 1)"`.
  - Draw the polygon using `ctx.beginPath()`, `ctx.moveTo()`, `ctx.lineTo()`, `ctx.closePath()`, `ctx.fill()`.
- After all annotations: reset `ctx.globalCompositeOperation = "source-over"` and `ctx.globalAlpha = 1`.

---

## Phase 6 — Annotation Tool UI

**Goal:** Build an interactive React component that lets the operator draw polygons on the image and define object metadata.

### Tasks

1. Create `src/components/AnnotationTool.tsx`.
2. The component accepts props:

```ts
interface AnnotationToolProps {
  imageUrl: string;
  depthMapUrl: string;
  onSave: (scene: SceneAnnotation) => void;
}
```

3. UI elements required:
   - **Canvas overlay** (positioned absolutely on top of the image) — handles click events.
   - **Toolbar** with:
     - `[Draw Polygon]` button — clicking enters draw mode; each subsequent click adds a vertex; double-click closes the polygon.
     - `[Set Ground Anchor]` button — next click on the canvas sets the `ground_anchor` for the current annotation being edited.
     - `[Finish Object]` button — opens a small metadata form.
   - **Metadata form** (shown after Finish Object):
     - Text input: Object ID
     - Select: Category (`tree` / `structure` / `building` / `other`)
     - Number input: Height (metres)
     - Slider: Canopy Opacity (0-1, step 0.05)
     - `[Add to Scene]` button
   - **Annotation list** sidebar — lists all added annotations with a `[Delete]` button per row.
   - **Export JSON** button — calls `onSave(scene)` with the completed `SceneAnnotation` object.

4. Draw all polygons visually on the canvas overlay:
   - Fill: `rgba(255, 200, 0, 0.4)`
   - Stroke: `rgba(255, 200, 0, 0.9)`
   - Ground anchors: red circles of radius 6px.

---

## Phase 7 — Shadow Preview UI

**Goal:** Build a React component that combines the annotation data with a time control to render the live shadow preview.

### Tasks

1. Create `src/components/ShadowPreview.tsx`.
2. The component accepts props:

```ts
interface ShadowPreviewProps {
  imageUrl: string;
  depthMapUrl: string;
  scene: SceneAnnotation;
  latitude: number;
  longitude: number;
}
```

3. Internal state:
   - `previewDate: Date` — defaults to today at 12:00 local time.

4. UI elements:
   - An `<input type="datetime-local">` that updates `previewDate`.
   - A `<canvas>` element that:
     - Draws the base image as the first layer.
     - Loads the depth map into an offscreen canvas to extract `ImageData`.
     - Calls `getSolarPosition(previewDate, latitude, longitude)` to get solar data.
     - Calls `renderShadows(ctx, ...)` to overlay the shadow layer.
   - A status line showing: `Sun: Azimuth 214deg | Altitude 32deg | Shadow Scale 1.6x`
   - If `altitude_deg <= 0`: show a "No shadow — sun is below the horizon" message instead of the canvas.

5. Re-render the canvas every time `previewDate` changes. Use `useEffect` with `[previewDate, scene]` dependency. Apply a 200ms debounce to avoid excessive redraws.

6. The canvas must match the **natural dimensions** of `imageUrl`.

---

## Phase 8 — File I/O & API Route

**Goal:** Allow saving and loading scene annotation JSON files.

### Tasks

1. Create `src/pages/api/scene.ts` (Astro API route).
2. **POST handler:**
   - Accept a `SceneAnnotation` JSON body.
   - Validate that `scene_id` matches `/^[a-z0-9_]+$/`.
   - Save to `data/scenes/<scene_id>.json`.
   - Return `{ success: true, path: "data/scenes/<scene_id>.json" }`.
3. **GET handler:**
   - Accept a `?scene_id=` query param.
   - Read and return the corresponding JSON file.
   - Return 404 if not found.
4. Create `src/lib/sceneIO.ts` with two client-side helpers:

```ts
export async function saveScene(scene: SceneAnnotation): Promise<void>
// POSTs to /api/scene

export async function loadScene(scene_id: string): Promise<SceneAnnotation>
// GETs from /api/scene?scene_id=...
```

---

## Phase 9 — Main Page Integration

**Goal:** Wire everything together on the main page.

### Tasks

1. Edit `src/pages/index.astro` to render a React island with a `<ShadowPipelineApp />` component (use `client:load`).
2. Create `src/components/ShadowPipelineApp.tsx`.
3. The app has four sequential steps, shown with a progress indicator at the top:

   **Step 1 — Load Files**
   - File input for `original_image` (accepts `.jpg`, `.png`).
   - File input for `depth_map` (accepts `.png`).
   - On both files selected: create object URLs and advance to Step 2.

   **Step 2 — Annotate**
   - Render `<AnnotationTool imageUrl={...} depthMapUrl={...} onSave={handleSave} />`.
   - `handleSave` stores the `SceneAnnotation` in state and advances to Step 3.

   **Step 3 — Preview**
   - Two number inputs for latitude and longitude (default: `39.7436`, `-8.8071`).
   - Render `<ShadowPreview imageUrl={...} depthMapUrl={...} scene={...} latitude={...} longitude={...} />`.
   - A "Back to Annotate" button and a "Next: Export" button.

   **Step 4 — Export**
   - Display the raw JSON of the scene in a `<pre>` block.
   - A `[Download JSON]` button that triggers a file download as `<scene_id>.json`.
   - A `[Save to Server]` button that calls `saveScene(scene)`.

---

## Phase 10 — Polish & Validation

**Goal:** Ensure robustness and a clean UX.

### Tasks

1. **Input validation — enforce these rules everywhere:**
   - All `Point2D` coordinates must be clamped to `[0, 1]`.
   - `height_meters` must be `> 0`.
   - `canopy_opacity` must be in `[0, 1]`.
   - `scene_id` must match `/^[a-z0-9_]+$/`.
   - Polygon must have at least 3 vertices before "Finish Object" is enabled.

2. **Edge cases to handle:**
   - Sun below horizon (`altitude_deg <= 0`): show message, skip rendering.
   - Missing / null depth map: skip depth warp, use flat projection only.
   - Empty `annotations` array: show "No annotations — draw some objects first."

3. **UX improvements:**
   - Add a loading spinner while the canvas is re-rendering.
   - Debounce time input changes by 200ms.
   - Thin `box-shadow` and rounded corners on the canvas container.

4. **End-to-end smoke test using the existing project files:**
   - Load `ClarkV_original.jpg` as the base image.
   - Load `ClarkV_depth_map.png` as the depth map.
   - Annotate one tree object and one structure object.
   - Set time to 14:30 and verify a shadow renders on the canvas.
   - Export the JSON and verify it matches the schema defined in Phase 1.

---

## File Checklist

```
src/
  types/
    shadow.ts               <- Phase 1
    index.ts                <- Phase 1
  lib/
    solar.ts                <- Phase 2
    shadowProjection.ts     <- Phase 3
    depthWarp.ts            <- Phase 4
    shadowRenderer.ts       <- Phase 5
    sceneIO.ts              <- Phase 8
  components/
    AnnotationTool.tsx      <- Phase 6
    ShadowPreview.tsx       <- Phase 7
    ShadowPipelineApp.tsx   <- Phase 9
  pages/
    index.astro             <- Phase 9 (edit existing)
    api/
      scene.ts              <- Phase 8
data/
  scenes/                   <- Phase 8 (created at runtime)
```

---

## Key Constants (Configurable)

| Constant | Default | Description |
|---|---|---|
| `METRES_TO_NORM_SCALE` | `0.04` | Converts shadow length in metres to normalised image units |
| `DEPTH_WARP_STRENGTH` | `0.002` | Controls how much depth displaces shadow vertices |
| `SHADOW_DEBOUNCE_MS` | `200` | Delay before re-rendering after time input changes |
| `DEFAULT_LAT` | `39.7436` | Default latitude (Leiria, Portugal) |
| `DEFAULT_LON` | `-8.8071` | Default longitude (Leiria, Portugal) |
