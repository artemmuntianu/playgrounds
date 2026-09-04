# План миграции: SQLit — БД как единое хранилище справочных данных

## Цель

Перенести **всё** содержимое `src/lib/equipmentCatalog.ts` (возрастные группы, категории оборудования, каталог типов оборудования, цвета, подписи) в БД (Supabase). БД становится **единственным источником истины** для всех данных, относящихся к игровым площадкам. С диска продолжают загружаться только **jpg/png** изображения (фото, depth-карты, seg-маски, иконки `public/icons/equipment/*.png`). Совместимость со старым (файловым) подходом не сохраняем — удаляем всё под ноль.

## Текущее состояние (факты)

- `src/lib/equipmentCatalog.ts` — статический словарь: `AGE_GROUPS`, `AGE_GROUP_LABELS`, `EQUIPMENT_CATEGORIES`, `CATEGORY_LABELS`, `CATEGORY_COLORS`, `EQUIPMENT_CATALOG` + функции-аксессоры.
- Данные игровых площадок уже частично в Supabase (`src/lib/playgroundStorage/db/*`), но есть файловый фолбэк (`playground.ts`, `scenes.ts`, `normalize.ts`, `slugify.ts`, `paths.ts`), переключаемый флагом `isSupabaseConfigured()`.
- Картинки остаются на ФС (`data/playgrounds/<id>/photos/*`), отдаются через `/api/playgrounds/:id/photo/:filename`.
- Все потребители справочника — клиентские React-острова: `PlaygroundCards`, `PlaygroundDetail`, `EquipmentEditor`, `EquipmentMarkerPage`, `PlaygroundForm`, `PlaygroundList`, `EquipmentIcon`, `EquipmentMarkerCanvas`, `ViewerShadowCanvas`.

## Шаги

### 1. Типы справочника (новый файл `src/types/reference.ts`)
Общие типы: `AgeGroupInfo`, `EquipmentCategoryInfo`, `EquipmentCatalogEntry`, `ReferenceBundle`.

### 2. Серверный слой чтения справочника (`src/lib/referenceData.ts`)
- Функция `loadReferenceData(): Promise<ReferenceBundle>` — читает `age_groups`, `equipment_categories`, `equipment_catalog` через `createServerClient()`.

### 3. API-эндпоинт (`src/pages/api/reference.ts`)
- `GET /api/reference` → отдаёт `ReferenceBundle` (JSON). Используется клиентом.

### 4. Клиентский модуль `src/lib/equipment.ts`
- `useReferenceData()` — hook с модульным кэшем (один `fetch` на все острова).
- Функции-аксессоры поверх кэша с безопасными фолбэками: `getCategory`, `getEquipmentLabel`, `getCategoryLabel`, `getCategoryColor`, `getAgeGroupLabel`, `getEquipmentIcon`, `getAgeGroups`, `getEquipmentCategories`, `getEquipmentCatalog`, `getCatalogEntry`.
- Заменяет экспорт удаляемого `equipmentCatalog.ts`.

### 5. Переписать 9 компонентов-потребителей
Перевести импорт с `@/lib/equipmentCatalog` → `@/lib/equipment`, подключить `useReferenceData()` и отрисовывать после готовности данных (`ready`).

### 6. Схема БД + сид (`scripts/reference-data.sql`)
DDL для `age_groups`, `equipment_categories`, `equipment_catalog` + идемпотентный seed (все данные из текущего `equipmentCatalog.ts`).

### 7. Удалить файловый фолбэк (БД — единственный источник)
- `repo.ts` — убрать `isSupabaseConfigured` и переключение; всегда использовать `db`.
- Удалить `playground.ts`, `scenes.ts`, `normalize.ts`, `migrateAgeGroup.ts`.
- Оставить `paths.ts`, `photos.ts`, `slugify.ts` (нужны для картинок и id).

### 8. Удалить `src/lib/equipmentCatalog.ts`.

### 9. Проверка
`npm run typecheck` и `npm run build` — без ошибок. Логика отдачи картинок (jpg/png c ФС) не меняется.

## Результат
Всё, что относится к площадкам (метаданные площадки, фото-метаданные, оборудование, маркеры, сцены, **справочник категорий/оборудования/возрастов**), читается из БД. На диске — только бинарники jpg/png.
