# Public viewer (`src/components/viewer`) — single renderer

The mobile-facing front end at `/viewer`. SSR page shells + React islands.

## Modules

- `PlaygroundCards.tsx` — homepage cards (filters by age group / equipment type, sort).
- `PlaygroundDetail.tsx` — detail view. Loads `fetchPlayground` + `fetchScene`; owns the
  **Time Machine** slider (`simulatedTimeMinutes`, default 585 = 09:45), weather source
  `live` | `demo`, day offset (`0..6`), equipment-marker toggle, i18n (persisted `pmp_lang`).
- `ViewerShadowCanvas.tsx` — **the single renderer** (canvas 2D). Props: `imageUrl`,
  `depthMapUrl`, `segMaskUrl`, `scene`, `latitude`/`longitude`, `simulatedTimeMinutes`,
  `isAdditional`, `weather`, `effects`, `equipmentMarkers`. Composites base → shadows → sky tint
  → sunlight → sun disc → (optional) rain loop. Draws equipment dot-markers + icons.

## Rules (canonical)

- This is the **ONLY** call site for `renderSegmentedScene()` (and the `lib` render
  helpers: `segRenderer.ts`, `rain.ts`). The old `renderShadows()` /
  `shadowRenderer.ts` path is gone — do not bring back a second renderer.
- Cache the static frame in `staticCanvasRef`; the visible canvas re-composites it each frame plus
  the moving rain layer — never re-run the shadow/light passes per frame.
- `isAdditional` photos have **no** shadow simulation and no scene / camera az / fov.
- Equipment markers use `getCategoryColor`; icons come from `public/icons/equipment/<type>.png`.
- Prefer Tailwind inline utilities; keep components modular (< 250 lines).
