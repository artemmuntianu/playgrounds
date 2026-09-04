-- Schema DDL for PlayGround Portal metadata tables (Supabase / Postgres).
-- Mirrors the row shapes in src/lib/playgroundStorage/db/index.ts and src/lib/referenceData.ts.
-- The app supplies all ids (text slugs / ids); nothing here is auto-generated.
-- Run against the Supabase SQL editor or via the Supabase CLI.

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
  shadow_coverage_en      text not null default '',
  shadow_coverage_pt      text not null default '',
  surface_temperature_en  text not null default '',
  surface_temperature_pt  text not null default '',
  target_age_group        text not null default 'all',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table if not exists public.photos (
  playground_id           text not null references public.playgrounds(id) on delete cascade,
  id                      text not null,
  filename                text not null,
  depth_map_filename      text,
  semantic_mask_filename  text,
  camera_azimuth_deg      double precision,
  camera_fov_deg          double precision,
  scene_id                text,
  is_additional           boolean not null default false,
  position                integer not null default 0,
  primary key (playground_id, id)
);

create table if not exists public.scenes (
  playground_id  text not null references public.playgrounds(id) on delete cascade,
  photo_id       text not null,
  scene_metadata jsonb not null default '{}'::jsonb,
  annotations    jsonb not null default '[]'::jsonb,
  updated_at     timestamptz not null default now(),
  primary key (playground_id, photo_id)
);

create table if not exists public.equipment_items (
  playground_id  text not null references public.playgrounds(id) on delete cascade,
  id             text not null,
  type           text not null,
  age_group      text,
  custom_name_en text,
  custom_name_pt text,
  position       integer not null default 0,
  primary key (playground_id, id)
);

create table if not exists public.equipment_markers (
  equipment_id  text not null,
  playground_id text not null references public.playgrounds(id) on delete cascade,
  photo_id      text not null,
  x             double precision not null default 0,
  y             double precision not null default 0,
  primary key (equipment_id, playground_id, photo_id)
);

create table if not exists public.age_groups (
  id         text primary key,
  label_en   text not null,
  label_pt   text not null,
  sort_order integer not null default 0
);

create table if not exists public.equipment_categories (
  id         text primary key,
  label_en   text not null,
  label_pt   text not null,
  color      text,
  sort_order integer not null default 0
);

create table if not exists public.equipment_catalog (
  type              text primary key,
  category_id       text not null references public.equipment_categories(id),
  label_en          text not null,
  label_pt          text not null,
  default_age_group text,
  sort_order        integer not null default 0
);
