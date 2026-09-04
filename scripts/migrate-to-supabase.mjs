// Migrate playground data from the local file system (data/playgrounds) into Supabase.
// Idempotent: rerunning upserts by primary key and does not duplicate records.
// Image binaries (photos/_depth/_seg) stay on disk — only metadata moves.
//
// Usage: node scripts/migrate-to-supabase.mjs
// Requires SUPABASE_URL + (SUPABASE_SECRET_KEY | SUPABASE_KEY | SUPABASE_ANON_KEY) in the environment.

import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const BASE_DIR = path.join(process.cwd(), 'data', 'playgrounds');

// Load .env.local / .env into process.env (no dependency; for Node scripts that skip Vite).
for (const file of ['.env.local', '.env']) {
  try {
    const txt = await fs.readFile(file, 'utf-8');
    for (const line of txt.split(/\r?\n/)) {
      const m = line.trim().match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
      }
    }
  } catch {
    // file may not exist
  }
}

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_KEY;
const serviceKey = process.env.SUPABASE_SECRET_KEY;
if (!url || (!anonKey && !serviceKey)) {
  console.error('Missing SUPABASE_URL / SUPABASE_KEY (or SUPABASE_ANON_KEY) / SUPABASE_SECRET_KEY');
  process.exit(1);
}
const db = createClient(url, serviceKey || anonKey, { auth: { persistSession: false } });

/** Map a legacy age-group string (or {en,pt}) to an AgeGroup id. */
function ageGroupId(value) {
  const s = (typeof value === 'string' ? value : value?.en || value?.pt || '').toLowerCase();
  if (s.includes('0-3')) return 'toddlers';
  if (s.includes('3-7')) return 'preschool';
  if (s.includes('12+')) return 'teenagers';
  if (s.includes('7+') || s.includes('7-12')) return 'schoolchildren';
  if (s.includes('all') || s.includes('todas')) return 'all';
  return 'all';
}

async function upsert(row, table, onConflict) {
  const { error } = await db.from(table).upsert(row, { onConflict });
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function migratePlayground(dir, id) {
  const pgPath = path.join(dir, 'playground.json');
  let pg;
  try {
    pg = JSON.parse(await fs.readFile(pgPath, 'utf-8'));
  } catch {
    console.warn(`skip ${id}: no playground.json`);
    return;
  }

  const attr = pg.attributes ?? {};
  const pgRow = {
    id,
    name_en: pg.name?.en ?? '',
    name_pt: pg.name?.pt ?? null,
    short_description_en: pg.short_description?.en ?? null,
    short_description_pt: pg.short_description?.pt ?? null,
    full_description_en: pg.full_description?.en ?? null,
    full_description_pt: pg.full_description?.pt ?? null,
    location_name_en: pg.location_name?.en ?? null,
    location_name_pt: pg.location_name?.pt ?? null,
    latitude: pg.latitude ?? 0,
    longitude: pg.longitude ?? 0,
    thumbnail_photo_id: pg.thumbnail_photo_id ?? null,
    shadow_coverage_en: attr.shadow_coverage?.en ?? 'Medium shade',
    shadow_coverage_pt: attr.shadow_coverage?.pt ?? 'Sombra média',
    surface_temperature_en: attr.surface_temperature?.en ?? 'Warm (~28°C)',
    surface_temperature_pt: attr.surface_temperature?.pt ?? 'Morno (~28°C)',
    target_age_group: ageGroupId(attr.target_age_group),
    created_at: pg.created_at ?? new Date().toISOString(),
    updated_at: pg.updated_at ?? new Date().toISOString(),
    // thumbnail FK references photos, so set it after photos are inserted (below).
    thumbnail_photo_id: null,
  };
  await upsert(pgRow, 'playgrounds', 'id');

  // photos (metadata only)
  const photos = pg.photos ?? [];
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    await upsert(
      {
        id: p.id,
        playground_id: id,
        filename: p.filename,
        depth_map_filename: p.depth_map_filename ?? null,
        semantic_mask_filename: p.semantic_mask_filename ?? null,
        camera_azimuth_deg: p.camera_azimuth_deg ?? null,
        camera_fov_deg: p.camera_fov_deg ?? null,
        scene_id: p.scene_id ?? null,
        is_additional: p.is_additional ?? false,
        position: i,
      },
      'photos',
      'playground_id,id',
    );
  }

  // thumbnail FK must point to an existing photo -> update now.
  if (pg.thumbnail_photo_id) {
    const { error: thumbErr } = await db
      .from('playgrounds')
      .update({ thumbnail_photo_id: pg.thumbnail_photo_id })
      .eq('id', id);
    if (thumbErr) throw new Error(`playgrounds thumbnail: ${thumbErr.message}`);
  }

  // scenes
  for (const p of photos) {
    try {
      const scene = JSON.parse(
        await fs.readFile(path.join(dir, 'scenes', `${p.id}_scene.json`), 'utf-8'),
      );
      await upsert(
        {
          playground_id: id,
          photo_id: p.id,
          scene_metadata: scene.scene_metadata ?? {},
          annotations: scene.annotations ?? [],
          updated_at: new Date().toISOString(),
        },
        'scenes',
        'playground_id,photo_id',
      );
    } catch {
      // no scene file
    }
  }

  // equipment + markers
  const equipment = pg.equipment ?? [];
  for (let i = 0; i < equipment.length; i++) {
    const it = equipment[i];
    await upsert(
      {
        id: it.id,
        playground_id: id,
        type: it.type,
        age_group: it.age_group ?? null,
        custom_name_en: it.custom_name?.en ?? null,
        custom_name_pt: it.custom_name?.pt ?? null,
        position: i,
      },
      'equipment_items',
      'playground_id,id',
    );
    for (const m of it.markers ?? []) {
      await db.from('equipment_markers').insert({
        equipment_id: it.id,
        playground_id: id,
        photo_id: m.photo_id,
        x: m.x,
        y: m.y,
      });
    }
  }

  console.log(`done: ${id} (${photos.length} photos, ${equipment.length} equipment)`);
}

async function main() {
  let entries;
  try {
    entries = await fs.readdir(BASE_DIR);
  } catch {
    console.log('No data/playgrounds directory found. Nothing to migrate.');
    return;
  }
  for (const entry of entries) {
    const dir = path.join(BASE_DIR, entry);
    const stat = await fs.stat(dir);
    if (stat.isDirectory()) {
      await migratePlayground(dir, entry);
    }
  }
  console.log('Migration finished.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
