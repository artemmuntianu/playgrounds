import type {
  AgeGroup,
  LocalizedText,
  PhotoMarker,
  Playground,
  PlaygroundAttributes,
  PlaygroundEquipmentItem,
  PlaygroundPhoto,
  PlaygroundSummary,
} from '../../../types/playground';
import type { SceneAnnotation } from '../../../types/shadow';
import { createServerClient } from '../../supabase';
import { slugify } from '../slugify';

// ---------------------------------------------------------------------------
// Row shapes (mirrors scripts/generate-ddl.sql)
// ---------------------------------------------------------------------------

interface PlaygroundRow {
  id: string;
  name_en: string;
  name_pt: string | null;
  short_description_en: string | null;
  short_description_pt: string | null;
  full_description_en: string | null;
  full_description_pt: string | null;
  location_name_en: string | null;
  location_name_pt: string | null;
  latitude: number;
  longitude: number;
  thumbnail_photo_id: string | null;
  shadow_coverage_en: string;
  shadow_coverage_pt: string;
  surface_temperature_en: string;
  surface_temperature_pt: string;
  target_age_group: string;
  created_at: string;
  updated_at: string;
}

interface PhotoRow {
  id: string;
  playground_id: string;
  filename: string;
  depth_map_filename: string | null;
  semantic_mask_filename: string | null;
  camera_azimuth_deg: number | null;
  camera_fov_deg: number | null;
  scene_id: string | null;
  is_additional: boolean;
  position: number;
}

interface SceneRow {
  playground_id: string;
  photo_id: string;
  scene_metadata: unknown;
  annotations: unknown;
}

interface EquipmentItemRow {
  id: string;
  playground_id: string;
  type: string;
  age_group: string | null;
  custom_name_en: string | null;
  custom_name_pt: string | null;
  position: number;
}

interface EquipmentMarkerRow {
  equipment_id: string;
  playground_id: string;
  photo_id: string;
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function l10n(en: string | null | undefined, pt: string | null | undefined): LocalizedText {
  return { en: en ?? '', pt: pt ?? en ?? '' };
}

function mapAttributes(row: PlaygroundRow): PlaygroundAttributes {
  return {
    shadow_coverage: l10n(row.shadow_coverage_en, row.shadow_coverage_pt),
    surface_temperature: l10n(row.surface_temperature_en, row.surface_temperature_pt),
    target_age_group: { id: (row.target_age_group as AgeGroup) ?? 'all' },
  };
}

function mapPhoto(row: PhotoRow): PlaygroundPhoto {
  return {
    id: row.id,
    filename: row.filename,
    depth_map_filename: row.depth_map_filename ?? undefined,
    semantic_mask_filename: row.semantic_mask_filename ?? undefined,
    camera_azimuth_deg: row.camera_azimuth_deg ?? undefined,
    camera_fov_deg: row.camera_fov_deg ?? undefined,
    scene_id: row.scene_id ?? undefined,
    is_additional: row.is_additional,
  };
}

function mapEquipment(
  items: EquipmentItemRow[],
  markers: EquipmentMarkerRow[],
): PlaygroundEquipmentItem[] {
  return items.map((it) => {
    const customName =
      it.custom_name_en || it.custom_name_pt
        ? { en: it.custom_name_en ?? '', pt: it.custom_name_pt ?? '' }
        : undefined;
    return {
      id: it.id,
      type: it.type as PlaygroundEquipmentItem['type'],
      age_group: (it.age_group as AgeGroup | null) ?? undefined,
      custom_name: customName,
      markers: markers
        .filter((m) => m.equipment_id === it.id)
        .map((m): PhotoMarker => ({ photo_id: m.photo_id, x: m.x, y: m.y })),
    };
  });
}

async function fetchEquipment(
  db: ReturnType<typeof createServerClient>,
  playgroundId: string,
): Promise<PlaygroundEquipmentItem[]> {
  const { data: items } = await db
    .from('equipment_items')
    .select('*')
    .eq('playground_id', playgroundId)
    .order('position', { ascending: true });
  const { data: markers } = await db
    .from('equipment_markers')
    .select('*')
    .eq('playground_id', playgroundId);
  return mapEquipment((items ?? []) as EquipmentItemRow[], (markers ?? []) as EquipmentMarkerRow[]);
}

function toPlayground(
  row: PlaygroundRow,
  photos: PlaygroundPhoto[],
  equipment: PlaygroundEquipmentItem[],
): Playground {
  return {
    id: row.id,
    name: l10n(row.name_en, row.name_pt),
    short_description: l10n(row.short_description_en, row.short_description_pt),
    full_description: l10n(row.full_description_en, row.full_description_pt),
    location_name: l10n(row.location_name_en, row.location_name_pt),
    latitude: row.latitude,
    longitude: row.longitude,
    photos,
    thumbnail_photo_id: row.thumbnail_photo_id ?? '',
    attributes: mapAttributes(row),
    equipment,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function fetchPhotos(
  db: ReturnType<typeof createServerClient>,
  playgroundId: string,
): Promise<PlaygroundPhoto[]> {
  const { data } = await db
    .from('photos')
    .select('*')
    .eq('playground_id', playgroundId)
    .order('position', { ascending: true });
  return ((data ?? []) as PhotoRow[]).map(mapPhoto);
}

// ---------------------------------------------------------------------------
// Public repo API
// ---------------------------------------------------------------------------

export async function listPlaygrounds(): Promise<PlaygroundSummary[]> {
  const db = createServerClient();
  const { data: pgData, error } = await db
    .from('playgrounds')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (pgData ?? []) as PlaygroundRow[];

  const { data: photoData } = await db.from('photos').select('playground_id, id, filename');
  const { data: equipData } = await db
    .from('equipment_items')
    .select('playground_id, type, age_group');

  const photosByPg = new Map<string, { id: string; filename: string }[]>();
  for (const p of (photoData ?? []) as { playground_id: string; id: string; filename: string }[]) {
    const list = photosByPg.get(p.playground_id) ?? [];
    list.push({ id: p.id, filename: p.filename });
    photosByPg.set(p.playground_id, list);
  }

  const equipByPg = new Map<string, { type: string; age_group: string | null }[]>();
  for (const e of (equipData ?? []) as {
    playground_id: string;
    type: string;
    age_group: string | null;
  }[]) {
    const list = equipByPg.get(e.playground_id) ?? [];
    list.push({ type: e.type, age_group: e.age_group });
    equipByPg.set(e.playground_id, list);
  }

  return rows.map((row) => {
    const photos = photosByPg.get(row.id) ?? [];
    const thumb = photos.find((p) => p.id === row.thumbnail_photo_id);
    const equipment = equipByPg.get(row.id) ?? [];
    return {
      id: row.id,
      name: l10n(row.name_en, row.name_pt),
      short_description: l10n(row.short_description_en, row.short_description_pt),
      location_name: l10n(row.location_name_en, row.location_name_pt),
      thumbnail_url: thumb ? `/api/playgrounds/${row.id}/photo/${thumb.filename}` : '',
      attributes: mapAttributes(row),
      photo_count: photos.length,
      created_at: row.created_at,
      equipment_types: [...new Set(equipment.map((e) => e.type))] as PlaygroundSummary['equipment_types'],
      equipment_age_groups: [...new Set(equipment.map((e) => e.age_group).filter(Boolean))] as AgeGroup[],
    };
  });
}

export async function getPlayground(id: string): Promise<Playground | null> {
  const db = createServerClient();
  const { data, error } = await db.from('playgrounds').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as PlaygroundRow;
  const [photos, equipment] = await Promise.all([fetchPhotos(db, id), fetchEquipment(db, id)]);
  return toPlayground(row, photos, equipment);
}

async function resolveUniqueId(db: ReturnType<typeof createServerClient>, base: string): Promise<string> {
  let id = base || `playground_${Date.now()}`;
  let counter = 1;
  while (true) {
    const existing = await db.from('playgrounds').select('id').eq('id', id).maybeSingle();
    if (!existing.data) return id;
    id = `${base || `playground_${Date.now()}`}_${counter}`;
    counter++;
  }
}

export async function createPlayground(
  data: Omit<Playground, 'id' | 'created_at' | 'updated_at'>,
): Promise<Playground> {
  const db = createServerClient();
  const now = new Date().toISOString();
  const attrs = data.attributes;
  const id = await resolveUniqueId(db, slugify(data.name.en) || `playground_${Date.now()}`);
  const row = {
    id,
    name_en: data.name.en,
    name_pt: data.name.pt ?? null,
    short_description_en: data.short_description.en ?? null,
    short_description_pt: data.short_description.pt ?? null,
    full_description_en: data.full_description.en ?? null,
    full_description_pt: data.full_description.pt ?? null,
    location_name_en: data.location_name.en ?? null,
    location_name_pt: data.location_name.pt ?? null,
    latitude: data.latitude,
    longitude: data.longitude,
    thumbnail_photo_id: data.thumbnail_photo_id || null,
    shadow_coverage_en: attrs.shadow_coverage.en,
    shadow_coverage_pt: attrs.shadow_coverage.pt,
    surface_temperature_en: attrs.surface_temperature.en,
    surface_temperature_pt: attrs.surface_temperature.pt,
    target_age_group: attrs.target_age_group.id,
    created_at: now,
    updated_at: now,
  };
  const { error } = await db.from('playgrounds').insert(row);
  if (error) throw new Error(error.message);
  return (await getPlayground(id))!;
}

export async function updatePlayground(id: string, data: Partial<Playground>): Promise<Playground> {
  const db = createServerClient();

  if (data.photos) {
    const toSync = data.photos.map((p, i) => ({
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
    }));
    const existing = await db.from('photos').select('id').eq('playground_id', id);
    const existingIds = ((existing.data ?? []) as { id: string }[]).map((r) => r.id);
    const toRemove = existingIds.filter((x) => !toSync.some((p) => p.id === x));
    if (toRemove.length) {
      await db.from('photos').delete().eq('playground_id', id).in('id', toRemove);
    }
    if (toSync.length) {
      const { error } = await db.from('photos').upsert(toSync, { onConflict: 'playground_id,id' });
      if (error) throw new Error(error.message);
    }
  }

  if (data.equipment) {
    const input = data.equipment;
    const existing = await db.from('equipment_items').select('id').eq('playground_id', id);
    const existingIds = ((existing.data ?? []) as { id: string }[]).map((r) => r.id);
    const newIds = input.map((e) => e.id);
    const toRemove = existingIds.filter((x) => !newIds.includes(x));
    if (toRemove.length) {
      await db.from('equipment_markers').delete().eq('playground_id', id).in('equipment_id', toRemove);
      await db.from('equipment_items').delete().eq('playground_id', id).in('id', toRemove);
    }
    for (let i = 0; i < input.length; i++) {
      const it = input[i];
      const itemRow = {
        id: it.id,
        playground_id: id,
        type: it.type,
        age_group: it.age_group ?? null,
        custom_name_en: it.custom_name?.en ?? null,
        custom_name_pt: it.custom_name?.pt ?? null,
        position: i,
      };
      const { error: itemErr } = await db
        .from('equipment_items')
        .upsert(itemRow, { onConflict: 'playground_id,id' });
      if (itemErr) throw new Error(itemErr.message);
      await db.from('equipment_markers').delete().eq('equipment_id', it.id).eq('playground_id', id);
      if (it.markers.length) {
        const markerRows = it.markers.map((m) => ({
          equipment_id: it.id,
          playground_id: id,
          photo_id: m.photo_id,
          x: m.x,
          y: m.y,
        }));
        const { error: markerErr } = await db.from('equipment_markers').insert(markerRows);
        if (markerErr) throw new Error(markerErr.message);
      }
    }
  }

  const patch: Partial<PlaygroundRow> = {};
  if (data.name) {
    patch.name_en = data.name.en;
    patch.name_pt = data.name.pt ?? null;
  }
  if (data.short_description) {
    patch.short_description_en = data.short_description.en ?? null;
    patch.short_description_pt = data.short_description.pt ?? null;
  }
  if (data.full_description) {
    patch.full_description_en = data.full_description.en ?? null;
    patch.full_description_pt = data.full_description.pt ?? null;
  }
  if (data.location_name) {
    patch.location_name_en = data.location_name.en ?? null;
    patch.location_name_pt = data.location_name.pt ?? null;
  }
  if (typeof data.latitude === 'number') patch.latitude = data.latitude;
  if (typeof data.longitude === 'number') patch.longitude = data.longitude;
  if (data.thumbnail_photo_id !== undefined) patch.thumbnail_photo_id = data.thumbnail_photo_id || null;
  if (data.attributes) {
    patch.shadow_coverage_en = data.attributes.shadow_coverage.en;
    patch.shadow_coverage_pt = data.attributes.shadow_coverage.pt;
    patch.surface_temperature_en = data.attributes.surface_temperature.en;
    patch.surface_temperature_pt = data.attributes.surface_temperature.pt;
    patch.target_age_group = data.attributes.target_age_group.id;
  }
  patch.updated_at = new Date().toISOString();

  const { error } = await db.from('playgrounds').update(patch).eq('id', id);
  if (error) throw new Error(error.message);

  return (await getPlayground(id))!;
}

export async function deletePlayground(id: string): Promise<void> {
  const db = createServerClient();
  const { error } = await db.from('playgrounds').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getPlaygroundScene(
  playgroundId: string,
  photoId: string,
): Promise<SceneAnnotation | null> {
  const db = createServerClient();
  const { data, error } = await db
    .from('scenes')
    .select('*')
    .match({ playground_id: playgroundId, photo_id: photoId })
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as SceneRow;
  return {
    scene_metadata: row.scene_metadata as SceneAnnotation['scene_metadata'],
    annotations: (row.annotations as SceneAnnotation['annotations']) ?? [],
  };
}

export async function savePlaygroundScene(
  playgroundId: string,
  photoId: string,
  scene: SceneAnnotation,
): Promise<void> {
  const db = createServerClient();
  const { error } = await db
    .from('scenes')
    .upsert(
      {
        playground_id: playgroundId,
        photo_id: photoId,
        scene_metadata: scene.scene_metadata,
        annotations: scene.annotations,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'playground_id,photo_id' },
    );
  if (error) throw new Error(error.message);
}

