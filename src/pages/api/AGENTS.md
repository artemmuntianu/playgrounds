# API / backend layer (`src/pages/api`)

The **only** server surface the browser talks to. Every client data flow starts here.
`prerender = false` on **every** route (SSR). Never bypass this layer from client code.

## Route map

| Route | Methods | Purpose | Backing module |
|---|---|---|---|
| `/api/playgrounds` | GET, POST | list summaries / create | `lib/playgroundStorage` |
| `/api/playgrounds/[id]` | GET, PUT, DELETE | read / update / delete one | `lib/playgroundStorage` |
| `/api/playgrounds/[id]/photos` | POST, DELETE | upload photo (+depth+seg) / delete photo | `playgroundStorage.photos` |
| `/api/playgrounds/[id]/depth` | POST | attach a depth map to a photo | `playgroundStorage.photos` |
| `/api/playgrounds/[id]/scenes/[photoId]` | GET, POST | read/write scene annotation | `db.get/savePlaygroundScene` |
| `/api/reference` | GET | age groups + categories + catalog | `lib/referenceData` |
| `/api/weather` | GET | Open-Meteo proxy | env config |

## Rules

- Always return JSON. Errors are `{ error: string }` with a sensible status:
  400 invalid input, 404 missing resource, 500 internal, 502 upstream failure.
- Mutating routes use the **service-role** client → validate inputs, never trust the body.
  Examples: `POST /api/playgrounds` requires `data.name.en`; `[id]/photos` enforces limits.
- **Photo limit**: max **4 shadow-enabled** photos (`!is_additional`) per playground; beyond that
  only `is_additional` photos are accepted (enforced in `[id]/photos.ts`). `thumbnail_photo_id`
  auto-sets to the uploaded id if the playground had none.
- `GET /api/weather` requires `lat` + `lon`; optional `date` (YYYY-MM-DD).
  Upstream errors → 502. `OPEN_METEO_BASE_URL` is overridable.
- GET list routes return the array directly (no envelope); detail endpoints return the object or 404.

> All metadata (including scenes) lives in Supabase; there is no filesystem fallback. Scenes are
> stored in the `scenes` DB table via `/api/playgrounds/[id]/scenes/[photoId]`.
