# План: Элементы детской площадки + разметка на фото

> Задача: дать оператору возможность описывать, какие элементы есть на детской площадке,
> указывать для части элементов возрастную группу, размечать точки-маркеры на 4 фото,
> а end-user — фильтровать площадки по группам элементов / возрастным группам снарядов
> и видеть маркеры с подписями на детальном просмотре (с возможностью скрыть).

## Контекст: что уже есть в кодовой базе

Проект: Astro 5 + React-острова + TypeScript strict + Tailwind. Данные — в файловой системе
(`src/lib/playgroundStorage/*`), сущность `Playground` в `src/types/playground.ts`.

- Хранилище одного парка: `BASE_DIR/<slug>/playground.json`, `photos/`, `scenes/<photoId>_scene.json`.
- Тип `Playground`: `name`, `short_description`, `full_description`, `latitude/longitude`,
  `location_name`, `photos[]`, `thumbnail_photo_id`, `attributes`, `created_at`, `updated_at`.
- `PlaygroundAttributes.target_age_group: LocalizedText` — сейчас свободная строка вида
  `"3-7 years" / "3-7 anos"`.
- `PlaygroundSummary` — лёгкая сводка для списков (`attributes`, `thumbnail_url`, `photo_count`).
- Разметка теней: `SceneAnnotation` в `src/types/shadow.ts`, `annotations[]` с
  `category: 'tree'|'structure'|'building'|'other'`, `polygon_coordinates`, `ground_anchor` и т.д.
  (это — для симуляции теней, НЕ для «элементов площадки»).
- `AnnotationCanvas.tsx` — канвас поверх фото; весь расчёт координат (нормализация 0..1,
  корректное соотнесение с реальным фото) находится в `useAnnotationTool.ts`:
  `getImageRectMetrics()`, `canvasPxToNorm()`, `normToCanvasPx()`. **Этот расчёт нужно переиспользовать**,
  т.к. уже была ошибка дрейфа координат из-за привязки к «15% марже», а не к измеренному
  прямоугольнику фото.
- Мастер-вью: `src/components/viewer/PlaygroundCards.tsx` — фильтр `ageFilter` парсит
  строку `target_age_group.en` (`'0-3'|'3-7'|'7+'|'all'`) + сортировка. i18n-ключи `master.filter.*`.
- Детальный просмотр: `src/components/viewer/PlaygroundDetail.tsx` — пилюли атрибутов (shadow/temp/age),
  `ViewerShadowCanvas.tsx` рисует тени. Там же галерея фото.
- Админские формы: `src/components/admin/PlaygroundForm.tsx` (селект возраста со строковыми значениями);
  `PhotoManager.tsx` (4 shadow-фото + дополнительные); `PhotoAnnotationPage.tsx` (разметка теней).

### Уточнение терминов из ТЗ
- «наши 4 фото» = до 4 shadow-enabled фотографий (`!photo.is_additional`, лимит 4 в `PhotoManager`).
- «annotationcanvas» = `AnnotationCanvas.tsx` (и связанная логика координат в `useAnnotationTool.ts`).
---

## Целевая модель данных

### 1. Словарь возрастных групп (вместо диапазонов лет)

```ts
// src/types/playground.ts
export type AgeGroup = 'toddlers' | 'preschool' | 'schoolchildren' | 'teenagers' | 'all';
```

Локализованные подписи (EN / PT) — статический словарь (не хранится в данных):

| id              | EN                       | PT                            |
|-----------------|--------------------------|-------------------------------|
| `toddlers`      | Toddlers (0-3)           | Bebés (0-3)                   |
| `preschool`     | Preschool (3-7)          | Pré-escolar (3-7)             |
| `schoolchildren`| Schoolchildren (7-12)    | Escolares (7-12)              |
| `teenagers`     | Teenagers (12+)          | Adolescentes (12+)            |
| `all`           | All ages                 | Todas as idades               |

**Маппинг текущих строк → новые id (для миграции):**
`"0-3 years"→toddlers`, `"3-7 years"→preschool`, `"7+ years"→schoolchildren`, `"All ages"→all`.

### 2. Словарь типов и групп элементов

```ts
export type EquipmentCategoryId = 'ride_balance' | 'sport_complex' | 'development' | 'rest';
export type EquipmentTypeId =
  // ride & balance
  | 'swings_single' | 'swing_nest' | 'seesaw' | 'carousel' | 'slide'
  // sport & game complexes
  | 'ladder' | 'wall_bars' | 'monkey_bars' | 'rope_net' | 'pull_up_bar' | 'climbing_wall'
  // development
  | 'sandbox' | 'busy_board' | 'playhouse' | 'abacus'
  // rest
  | 'bench' | 'trash_bin' | 'canopy';
```
Статический словарь `EQUIPMENT_CATALOG` (в `src/lib/equipmentCatalog.ts`):
`{ type, category, label: LocalizedText, defaultAgeGroup?: AgeGroup }`.
Например: `slide → ride_balance`, `sandbox → development`, `bench → rest (default: 'all')`,
часть спортивных снарядов по умолчанию `schoolchildren`.

### 3. Элемент (экземпляр на конкретном парке) + маркеры

```ts
export interface PhotoMarker {
  photo_id: string;   // ссылка на PlaygroundPhoto.id
  x: number;          // нормализованные координаты 0..1 (по фото)
  y: number;
}

export interface PlaygroundEquipmentItem {
  id: string;                 // уникально в рамках парка, e.g. "slide_1"
  type: EquipmentTypeId;      // категория выводится из catalog
  age_group?: AgeGroup | null;// опционально; null = не задано
  custom_name?: LocalizedText;// опциональная подпись в обход catalog
  markers: PhotoMarker[];     // точки на «наших 4 фото»
}
```

### 4. Обновление сущности

```ts
// Поле attributes.target_age_group меняем НЕ пересечением, а прямо в интерфейсе:
// было `target_age_group: LocalizedText` → стало `target_age_group: { id: AgeGroup }`.

interface Playground {
  // ...существующие поля
  equipment: PlaygroundEquipmentItem[]; // NEW (по умолчанию [])
}

interface PlaygroundAttributes {
  // ...существующие поля
  target_age_group: { id: AgeGroup }; // миграция: строка → id (см. ниже)
}

interface PlaygroundSummary {
  // ...существующие поля
  equipment_types: EquipmentTypeId[];   // NEW: уникальные типы на парке (для фильтра)
  equipment_age_groups: AgeGroup[];     // NEW: возрастные группы снарядов (для фильтра)
}
```

> **Решение по хранению маркеров:** маркеры живут в `playground.json` внутри `equipment[].markers`,
> а не в `scenes/*.json`. Тени (`scenes/`) остаются отдельным слоем и не смешиваются.
> Плюс: фильтры мастер-вью строятся на одном объекте без чтения сцен; минус: список парков
> читает чуть больший JSON — некритично.

**Открытый вопрос (см. «Открытые вопросы»):** оставлять ли `attributes.target_age_group`
как «глобальную аудиторию» парка, или полностью выводить её из `equipment`. Пока оставляем
как высокоуровневый признак, но *фильтр по возрасту снарядов* строится из `equipment_age_groups`.
---

# Фазы

## Фаза 0 — Словари и модель данных (фундамент)
**Цель:** завести типы и статический каталог, не меняя UI.

- `src/types/playground.ts`: добавить `AgeGroup`, `EquipmentCategoryId`, `EquipmentTypeId`,
  `PhotoMarker`, `PlaygroundEquipmentItem`; обновить `Playground` (добавить `equipment`),
  `PlaygroundSummary` (добавить `equipment_types`, `equipment_age_groups`),
  `PlaygroundAttributes.target_age_group` → `{ id: AgeGroup }`.
- Новый файл `src/lib/equipmentCatalog.ts`: `AGE_GROUP_LABELS` (id → `LocalizedText`) и
  `EQUIPMENT_CATALOG` (type → category/label/defaultAgeGroup) + helper `getCategory(type)`.
- Новый `src/lib/i18nEq.ts` (или расширить `src/lib/i18n.ts`) для подписей каталога и возрастных групп.
- Обновить legacy-блок `PlaygroundElement.ageGroup` → перевести на `AgeGroup`
  (или оставить как есть до рефакторинга `PlaygroundViewer.tsx`, пометить в `TODO-types.md`).
- **Результат:** типы компилируются; `npm typecheck` без ошибок.

## Фаза 1 — Слой данных и API
**Цель:** персистентность + отдача сводок для фильтров.

- `src/lib/playgroundStorage/playground.ts`:
  - `createPlayground`: инициализировать `equipment: []`.
  - `updatePlayground`: не дать перезаписать/удалить `equipment` посторонними полями.
  - `listPlaygrounds`: в сводку добавить производные
    `equipment_types = [...new Set(pg.equipment.map(e => e.type))]` и
    `equipment_age_groups = [...new Set(pg.equipment.map(e => e.age_group).filter(Boolean))]`.
- (опционально) Новый `src/lib/playgroundStorage/equipment.ts`:
  `saveEquipment(id, equipment)` / `getEquipment(id)`.
- API: `src/pages/api/playgrounds/index.ts` (POST — принять `equipment`),
  `src/pages/api/playgrounds/[id].ts` (GET/PUT — отдавать/принимать `equipment`).
  Добавить `PATCH /api/playgrounds/[id]/equipment` для точечного сохранения списка и маркеров.
- API-клиент `src/lib/api.ts`: метод `updateEquipment(id, equipment)`.
- **Результат:** круд элементов через API; `GET /api/playgrounds` возвращает типы/возрасты снарядов.

## Фаза 2 — Админ: список элементов парка + возраст (миграция UI)
**Цель:** оператор составляет список элементов; у части указывает возрастную группу.
Заодно мигрируем старый возраст-инпут «диапазон лет» → название группы.

- Новый `src/components/admin/EquipmentEditor.tsx`:
  - Реестр «добавить элемент» по категориям из `EQUIPMENT_CATALOG` (4 группы-аккордеона).
  - Карточка элемента: подпись, выбор `age_group` (опционально, из `AGE_GROUP_LABELS`),
    поле `custom_name` (EN/PT опционально), удаление.
  - Итог: `PlaygroundEquipmentItem[]`; сохранение через `updateEquipment`.
- Интеграция в `src/components/admin/PlaygroundEditor.tsx` — третья вкладка «Элементы площадки».
  (Либо отдельный шаг в `PhotoManager` — решить на ревью; рекомендую отдельную вкладку.)
- **Миграция возрастного поля (общая для всего приложения):**
  - `src/components/admin/PlaygroundForm.tsx`: селект `target_age_group` — строковые значения
    `0-3/3-7/7+/All` заменить на id `AgeGroup` из `AGE_GROUP_LABELS`; EN/PT подписи из словаря.
  - Дополнительно показать сводку возрастов из `equipment`.
- **Результат:** оператор заполняет список; `npm typecheck` / `npm build` зелёные.
## Фаза 3 — Админ: разметка маркеров на 4 фото (annotationcanvas)
**Цель:** оператор расставляет точки-маркеры по элементам списка на наших 4 фото.

- Новый лёгкий `src/components/annotation/EquipmentMarkerCanvas.tsx`:
  - **Переиспользует** расчёт координат `getImageRectMetrics` / `canvasPxToNorm` из `useAnnotationTool`
    (вынести в общий хелпер `src/lib/annotationCoords.ts`, чтобы не дублировать и не повторить
    баг с «15% маржой»).
  - Режим «точка-маркер»: клик по изображению → нормализованные `{x,y}` → маркер.
  - Рисует точки (с номерами/цветами по категориям) поверх фото.
- Расширить `src/components/annotation/types.ts`: `AnnotationMode = ... | 'placing_marker'`,
  либо держать режим отдельно в новом хуке `useEquipmentMarker`.
- Новый `src/components/admin/EquipmentMarkerPage.tsx` (или вкладка в `PhotoManager`):
  слева — фото (переключение между 4 shadow-фото), справа — список элементов парка;
  оператор выбирает элемент → клик по фото → добавляется маркер `{photo_id,x,y}`;
  есть удаление маркера и переключение между 4 фото.
- Маршрут: `src/pages/admin/[id]/equipment.astro` (вход из вкладки «Элементы» → «Разметить на фото»).
- **Результат:** маркеры сохраняются в `equipment[].markers` и отображаются обратно при входе.

## Фаза 4 — Мастер-вью: фильтры
**Цель:** end-user фильтрует площадки по группам элементов и по возрастным группам снарядов
(отдельные фильтры).

- `src/components/viewer/PlaygroundCards.tsx`:
  - Новый фильтр «Группы элементов»: чекбоксы/чипы по `EquipmentCategoryId`
    (или по типу из `EQUIPMENT_CATALOG`). Логика: площадка попадает, если пересечение
    выбранных групп с `pg.equipment_types` непустое.
  - Переписать `ageFilter` с парсинга строки `target_age_group` на сопоставление
    `pg.equipment_age_groups` (из сводки). Ключи `master.filter.*` обновить на `AgeGroup`.
  - Показывать на карточке чипы групп элементов и возрастных групп снарядов.
- `src/lib/i18n.ts`: заменить ключи `master.filter.0_3/3_7/7_plus` на
  `master.filter.toddlers/preschool/schoolchildren/teenagers/all` + локализованные подписи.
- **Результат:** список фильтрует по обоим осям; старый фильтр по строке удалён.

## Фаза 5 — Детальный просмотр: маркеры на фото
**Цель:** end-user видит маркеры объектов с подписями категорий и может их скрыть.

- `src/components/viewer/PlaygroundDetail.tsx`:
  - Выбранное фото → собрать маркеры всех элементов, у которых
    `markers.some(m => m.photo_id === activePhoto.id)`.
  - Наложить поверх изображения (новая `src/components/viewer/EquipmentMarkersOverlay.tsx`,
    тот же расчёт нормализованных координат из `annotationCoords`).
  - Подпись маркера: label (из `EQUIPMENT_CATALOG` или `custom_name`) + группа/возраст.
  - Переключатель «Показать/скрыть элементы» (toggle `showEquipmentMarkers`).
  - Показывать на любом фото, для которого есть маркеры (в т.ч. additional).
- (Опционально) НЕ расширять `ViewerShadowCanvas.tsx`; рендерить оверлей отдельным `<img>`-слоем,
  т.к. `ViewerShadowCanvas` работает с `canvas` и тенью.
- **Результат:** на детальном просмотре видны маркеры с подписями; toggle скрывает/показывает.
- **Проверка по правилам фронтенда:** если компонент превышает ~250 строк — вынести в сабкомпоненты.

## Фаза 6 — i18n, миграция данных, валидация
**Цель:** локализация EN/PT, миграция существующих `playground.json`, защита от некорректных данных.

- Добавить все строки (каталог элементов, возрастные группы, кнопки «разметить», «скрыть»,
  фильтры) в `src/lib/i18n.ts` (EN + PT).
- Скрипт миграции `src/lib/playgroundStorage/migrate.ts` (и/или на этапе чтения в
  `getPlayground`/`listPlaygrounds`): `target_age_group {en:"3-7 years",pt:"3-7 anos"}` →
  `{id:"preschool"}` (маппинг из таблицы выше); недостающий `equipment` → `[]`.
- Валидация на API/типах: `age_group` из `AGE_GROUP_LABELS`, `type` из `EQUIPMENT_CATALOG`,
  `x,y` в `[0,1]`, `photo_id` существует в `photos[]`.
- **Результат:** существующие данные не ломаются; UI показывает группы, а не диапазоны лет.

---

## Definition of Done (приёмка)
1. Оператор создаёт список элементов парка (4 группы каталога), задаёт возраст части элементов.
2. Старый возраст-инпут «0-3/3-7/7+ лет» больше нигде не используется (заменён названиями групп).
3. Оператор размещает точки-маркеры на любых из 4 shadow-фото; маркеры переживают перезагрузку.
4. Мастер-вью имеет 2 независимых фильтра (группы элементов; возрастные группы снарядов).
5. Детальный просмотр показывает маркеры с подписями категорий, есть toggle «скрыть/показать».
6. Всё локализовано EN/PT. `npm typecheck`, `npm build`, `npm lint --fix` — без ошибок.
7. Данные прошлых парков мигрируются без ручных правок JSON.

---

## Риски и открытые вопросы

1. **Двойной источник возраста.** Есть `attributes.target_age_group` (глобальная аудитория парка)
   и возраст `equipment[].age_group` (у снарядов). Нужно решить: оставить оба, или выводить
   `target_age_group` из `equipment`. Влияет на фильтры, карточки и детальный вид.
2. **«4 фото».** Маркер привязан к `photo_id`. Что, если фото переименуют/удалят (деинвент)?
   Определить политику: удалять осиротевшие маркеры при удалении фото.
3. **Смешение слоёв.** `AnnotationCanvas` — про тени; добавление режима маркеров туда может
   усложнить и без того большой хук. Предпочтительно отдельный лёгкий компонент, но с общим
   расчётом координат.
4. **Производительность мастер-вью.** Сводка теперь несёт типы/возрасты снарядов. Для сотен парков
   приемлемо; при росте — агрегировать на сервере или кэшировать.
5. **Наследие `PlaygroundElement.ageGroup`.** Используется в `PlaygroundViewer.tsx` (Three.js).
   Решить: перевести на `AgeGroup` или оставить до рефакторинга 3D-вьюера (пометить в `TODO-types.md`).
6. **«Главные» фото.** Подтвердить, что оператор размечает только `!is_additional` (4 shadow-фото),
   а дополнительные фото показывают подписи без права разметки (если не решим иначе).
---

# Приложение: Персистентность на Supabase (переезд с JSON-файлов)

> Важное архитектурное изменение. Серверные ключи Supabase будут переданы позже.
> Правило: **в БД переезжают все JSON-данные**, а **бинарники фото/глубины/сегментации остаются
> на файловой системе** и отдаются как раньше через
> `GET /api/playgrounds/[id]/photo/[...filename]` (см. `src/pages/api/playgrounds/[id]/photo/[...filename].ts`).

## 1. Что переезжает, а что остаётся

| Сейчас                       | Куда                             |
|------------------------------|----------------------------------|
| `<BASE_DIR>/<id>/playground.json` (метаданные, атрибуты, photos[]) | БД: таблицы `playgrounds`, `playground_attributes(или колонки)`, `photos` |
| `<BASE_DIR>/<id>/scenes/<photoId>_scene.json` (тени) | БД: `scenes` (jsonb `scene_metadata` + `annotations`) |
| Картинки: `photos/<file>`, `_depth.<ext>`, `_seg.<ext>` | **Остаются на диске** (без изменений), путь — `data/playgrounds/<id>/photos/<filename>` |
| `NEW` equipment + markers    | БД: `equipment_items`, `equipment_markers` |

`src/lib/playgroundStorage/paths.ts` (`BASE_DIR`, `playgroundDir`)
и `src/lib/playgroundStorage/photos.ts` (картинки: `savePlaygroundPhoto`,
`savePlaygroundDepthMap`, `savePlaygroundSegMask`, `getPhotoPath`, `getPhotoUrl`) **не меняются** —
они отвечают только за файлы и остаются как есть.

## 2. Конфигурация и клиент

- Пакет `@supabase/supabase-js` уже в `package.json` (`^2.46.2`).
- Переменные окружения (в `.env`, не в git):
  `SUPABASE_URL`, `SUPABASE_KEY` (publishable), `SUPABASE_SECRET_KEY`.
- Новый модуль `src/lib/supabase.ts`:
  - `createServerClient()` — для серверного кода (API-роуты/острова), использует
    `SUPABASE_SECRET_KEY` для записи (обход RLS).
  - `createPublicClient()` — для публичного чтения (если решим отдавать данные прямо из клиента),
    использует `SUPABASE_ANON_KEY` + RLS.
  - Всё обращение к БД — только из серверных API-роутов (Astro), клиент на фронте не трогает таблицы напрямую.

## 3. Слой-маппинг (row ↔ TS-типы)

Чтобы **UI и все компоненты не переписывать**, вводим репозиторий, который собирает БД-строки
обратно в текущие типы `Playground`, `PlaygroundSummary`, `SceneAnnotation`, и наоборот.

- `src/lib/playgroundStorage/db/mapPlayground.ts`: `PlaygroundRow` → `Playground`
  (собирает `name:{en,pt}` из колонок `name_en/name_pt`, `photos[]` из таблицы `photos`,
  `attributes` из колонок).
- `src/lib/playgroundStorage/db/mapScene.ts`: строка `scenes` → `SceneAnnotation`.
- `src/lib/playgroundStorage/db/mapEquipment.ts`: `equipment_items` + `equipment_markers`
  → `PlaygroundEquipmentItem[]` (маркеры собираются в `item.markers`).
## 4. Схема БД (DDL)

> Выбор: поисковые/сортируемые текстовые поля храним отдельными колонками `*_en`/`*_pt`
> (чтобы делать `ORDER BY name_en`, SQL-фильтры по локали), а в TS-слой собираем обратно в
> `LocalizedText`. Транзитные/декор-поля — `jsonb`.

### 4.1 `playgrounds` (метаданные + атрибуты — 1:1 инлайн)

```sql
create table public.playgrounds (
  id                    text primary key,          -- тот же slug-id, что сейчас
  name_en               text not null,
  name_pt               text,
  short_description_en  text,
  short_description_pt  text,
  full_description_en   text,
  full_description_pt   text,
  location_name_en      text,
  location_name_pt      text,
  latitude              double precision not null,
  longitude             double precision not null,
  thumbnail_photo_id    text,                       -- ссылка на photos.id (FK добавлен после)
  -- атрибуты (были PlaygroundAttributes)
  shadow_coverage_en    text not null default 'Medium shade',
  shadow_coverage_pt    text not null default 'Sombra média',
  surface_temperature_en text not null default 'Warm (~28°C)',
  surface_temperature_pt text not null default 'Morno (~28°C)',
  target_age_group      text not null default 'preschool', -- AgeGroup id (мигрируем строку → id)
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
```

> **Примечание по `target_age_group`:** в рамках модели данных (раздел выше) поле превращено
> в `{ id: AgeGroup }`. В БД храним просто `text` (`'toddlers'|'preschool'|'schoolchildren'|'teenagers'|'all'`),
> а `*_en`/`*_pt` подписи берём из словаря `AGE_GROUP_LABELS` (не дублируем в таблице).

### 4.2 `photos` (метаданные фото; бинарники — на диске)

```sql
create table public.photos (
  id                    text not null,              -- photo id (photo_1, photo_<ts>)
  playground_id         text not null references public.playgrounds(id) on delete cascade,
  filename              text not null,              -- относительный путь в <id>/photos
  depth_map_filename    text,
  semantic_mask_filename text,
  camera_azimuth_deg    double precision,
  camera_fov_deg        double precision,
  scene_id              text,                       -- e.g. photo_1_scene
  is_additional         boolean not null default false,
  position              int  not null default 0,    -- порядок отображения
  created_at            timestamptz not null default now(),
  primary key (playground_id, id)
);
```

```sql
alter table public.playgrounds
  add constraint fk_playground_thumb
  foreign key (id, thumbnail_photo_id)
  references public.photos (playground_id, id)
  on delete set null;
```
### 4.3 `scenes` (сцены теней — бывшие `scenes/<photoId>_scene.json`)

```sql
create table public.scenes (
  playground_id     text not null references public.playgrounds(id) on delete cascade,
  photo_id          text not null,
  scene_metadata    jsonb not null default '{}'::jsonb, -- scene_id, camera_*, horizon_y, sun_*
  annotations       jsonb not null default '[]'::jsonb, -- Annotation[]
  updated_at        timestamptz not null default now(),
  primary key (playground_id, photo_id)
);
```

### 4.4 `equipment_items` (список элементов парка)

```sql
create table public.equipment_items (
  id            text not null,                -- e.g. slide_1 (уникально в рамках парка)
  playground_id text not null references public.playgrounds(id) on delete cascade,
  type          text not null,                -- EquipmentTypeId
  age_group     text,                         -- AgeGroup | null
  custom_name_en text,
  custom_name_pt text,
  position      int not null default 0,       -- порядок в списке
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (playground_id, id)
);
```

### 4.5 `equipment_markers` (точки на фото)

```sql
create table public.equipment_markers (
  id               uuid primary key default gen_random_uuid(),
  equipment_id     text not null,
  playground_id    text not null,
  photo_id         text not null,
  x                double precision not null, -- нормализовано 0..1
  y                double precision not null,
  created_at       timestamptz not null default now(),
  foreign key (playground_id, equipment_id)
    references public.equipment_items (playground_id, id) on delete cascade,
  foreign key (playground_id, photo_id)
    references public.photos (playground_id, id) on delete cascade
);

create index on public.photos (playground_id, is_additional);
create index on public.equipment_items (playground_id);
create index on public.equipment_markers (equipment_id);
create index on public.equipment_markers (playground_id, photo_id);
```

### 4.6 Безопасность (RLS)

- Все запросы идут через серверные API-роуты (Astro), поэтому запись выполняется
  `SUPABASE_SECRET_KEY` (обход RLS).
- Для публичных `GET`-эндпоинтов можно включить RLS и дать анонимной роли `select`
  на `playgrounds`, `photos`, `scenes`, `equipment_items`, `equipment_markers`:
  `alter table ... enable row level security; create policy "public read" on ... for select using (true);`
  Запись оставить только сервисной роли. (Решение — на усмотрение; минимально можно просто
  закрыть таблицы и ходить только через API.)
## 5. Стратегия миграции данных (JSON → Supabase)

Отдельный скрипт `scripts/migrate-to-supabase.ts` (Node/tsx, запускается вручную `npm run migrate:supabase`),
**идемпотентный** (повторный запуск не дублирует записи — upsert по PK).

Для каждого `BASE_DIR/<id>/playground.json`:
1. **`playgrounds`** — upsert строки: `id`, `name_*`, `short_description_*`, `full_description_*`,
   `location_name_*`, `latitude`, `longitude`; атрибуты: `shadow_coverage_*`, `surface_temperature_*`,
   `target_age_group` (маппинг строки → `AgeGroup` id из таблицы раздела «Модель данных»).
2. **`photos`** — upsert по `(playground_id, id)`; файлы на диске **не трогаем**,
   только переносим метаданные (`filename`, `depth_map_filename`, `semantic_mask_filename`,
   `camera_*`, `scene_id`, `is_additional`). `thumbnail_photo_id` заполняем после вставки фото.
3. **`scenes`** — upsert по `(playground_id, photo_id)`: читаем `scenes/<photoId>_scene.json`,
   кладём `scene_metadata` и `annotations` в jsonb.
4. **`equipment_items`** / **`equipment_markers`** — из нового `playground.json` поля `equipment`
   (если поле ещё нет — `[]`).
5. `thumbnail_photo_id` — обновляем FK после того, как фото вставлены.

**Опционально** — `scripts/generate-ddl.sql` (SQL для создания таблиц/индексов/политик), чтобы
применять в Supabase CLI или в SQL-редакторе.

> **Read-through / совместимость.** Пока миграция не завершена, можно оставить чтение из JSON
> (текущие функции) и включить чтение из БД после успешного прогона. Рекомендуемый порядок:
> (1) создать таблицы, (2) прогнать миграцию, (3) переключить репозиторий `playgroundStorage`
> на чтение из БД, (4) удалить старые `playground.json` после проверки.

## 6. Пересмотр фаз с учётом Supabase

Текущие фазы из раздела «Фазы» местами ссылаются на файловое хранилище. Уточнения:

- **Новая фаза (до Фазы 1) — «Фаза S: Подключение Supabase»**: создать `src/lib/supabase.ts`,
  `.env` с ключами, DDL-скрипт, применить схему, прогнать миграцию существующих данных.
- **Фаза 1 переписывается**: вместо файловых `playground.ts` — репозиторий на Supabase
  (`src/lib/playgroundStorage/db/*`): `getPlayground`, `listPlaygrounds`, `createPlayground`,
  `updatePlayground`, `deletePlayground`; сводки (`equipment_types`, `equipment_age_groups`)
  собираются из БД. `scenes.ts` тоже уходит в БД (таблица `scenes`).
- **Фото-слой остаётся на ФС**: `photos.ts`/`paths.ts` не меняются; при сохранении/удалении фото
  теперь обновляется **и** файл на диске, **и** строки в `photos` (+ каскадно `equipment_markers`,
  `scenes`).
- **Фаза 6 (миграция данных) уточняется**: теперь миграция — это и перенос JSON → Supabase,
  и маппинг `target_age_group`, и `equipment` → таблицы.
- **Деплой**: для окружения нужны `SUPABASE_URL`/`SUPABASE_SECRET_KEY`/`SUPABASE_KEY`;
  бинарники фото по-прежнему на постоянном диске хоста.






