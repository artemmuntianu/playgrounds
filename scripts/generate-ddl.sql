-- Supabase schema for the Playground Portal.
-- Apply via Supabase SQL editor or `supabase db push`.

create table if not exists public.playgrounds (
  id                      text primary key,
  name_en                 text not null,
  name_pt                 text,
  short_description_en    text,
  short_description_pt    text,
  full_description_en     text,
  full_description_pt     text,
  location_name_en        text,
  location_name_pt        text,
  latitude                double precision not null,
  longitude               double precision not null,
  thumbnail_photo_id      text,
  shadow_coverage_en      text not null default 'Medium shade',
  shadow_coverage_pt      text not null default 'Sombra média',
  surface_temperature_en  text not null default 'Warm (~28°C)',
  surface_temperature_pt  text not null default 'Morno (~28°C)',
  target_age_group        text not null default 'preschool', -- AgeGroup id
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table if not exists public.photos (
  id                     text not null,
  playground_id          text not null references public.playgrounds(id) on delete cascade,
  filename               text not null,
  depth_map_filename     text,
  semantic_mask_filename text,
  camera_azimuth_deg     double precision,
  camera_fov_deg         double precision,
  scene_id               text,
  is_additional          boolean not null default false,
  position               int not null default 0,
  created_at             timestamptz not null default now(),
  primary key (playground_id, id)
);

alter table public.playgrounds
  add constraint fk_playground_thumb
  foreign key (id, thumbnail_photo_id)
  references public.photos (playground_id, id)
  on delete set null;

create table if not exists public.scenes (
  playground_id  text not null references public.playgrounds(id) on delete cascade,
  photo_id       text not null,
  scene_metadata jsonb not null default '{}'::jsonb,
  annotations    jsonb not null default '[]'::jsonb,
  updated_at     timestamptz not null default now(),
  primary key (playground_id, photo_id)
);

create table if not exists public.equipment_items (
  id             text not null,
  playground_id  text not null references public.playgrounds(id) on delete cascade,
  type           text not null,               -- EquipmentTypeId
  age_group      text,                        -- AgeGroup | null
  custom_name_en text,
  custom_name_pt text,
  position       int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (playground_id, id)
);

create table if not exists public.equipment_markers (
  id            uuid primary key default gen_random_uuid(),
  equipment_id  text not null,
  playground_id text not null,
  photo_id      text not null,
  x             double precision not null,
  y             double precision not null,
  created_at    timestamptz not null default now(),
  foreign key (playground_id, equipment_id) references public.equipment_items (playground_id, id) on delete cascade,
  foreign key (playground_id, photo_id) references public.photos (playground_id, id) on delete cascade
);

create index if not exists idx_photos_playground on public.photos (playground_id, is_additional);
create index if not exists idx_equipment_items_playground on public.equipment_items (playground_id);
create index if not exists idx_equipment_markers_item on public.equipment_markers (equipment_id);
create index if not exists idx_equipment_markers_photo on public.equipment_markers (playground_id, photo_id);

-- RLS (optional; the app talks to the DB only through server API routes).
-- Reads can be opened to the anonymous role; writes stay server-only.
-- alter table public.playgrounds enable row level security;
-- alter table public.photos enable row level security;
-- alter table public.scenes enable row level security;
-- alter table public.equipment_items enable row level security;
-- alter table public.equipment_markers enable row level security;
-- create policy "public read playgrounds" on public.playgrounds for select using (true);
-- create policy "public read photos" on public.photos for select using (true);
-- create policy "public read scenes" on public.scenes for select using (true);
-- create policy "public read equipment_items" on public.equipment_items for select using (true);
-- create policy "public read equipment_markers" on public.equipment_markers for select using (true);
