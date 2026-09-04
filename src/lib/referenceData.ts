import { createServerClient } from './supabase';
import type {
  AgeGroupInfo,
  EquipmentCatalogEntry,
  EquipmentCategoryInfo,
  ReferenceBundle,
} from '../types/reference';
import type { AgeGroup, EquipmentCategoryId, EquipmentTypeId } from '../types/playground';

// Row shapes (mirrors scripts/reference-data.sql)
interface AgeGroupRow {
  id: string;
  label_en: string;
  label_pt: string;
  sort_order: number;
}

interface CategoryRow {
  id: string;
  label_en: string;
  label_pt: string;
  color: string;
  sort_order: number;
}

interface CatalogRow {
  type: string;
  category_id: string;
  label_en: string;
  label_pt: string;
  default_age_group: string | null;
  sort_order: number;
}

/**
 * Load the whole playground reference vocabulary (age groups, equipment categories,
 * equipment catalog) from the database. This is the single source of truth for the
 * catalog that used to live in `src/lib/equipmentCatalog.ts`.
 */
export async function loadReferenceData(): Promise<ReferenceBundle> {
  const db = createServerClient();

  const [ageRes, categoryRes, catalogRes] = await Promise.all([
    db.from('age_groups').select('*').order('sort_order', { ascending: true }),
    db.from('equipment_categories').select('*').order('sort_order', { ascending: true }),
    db.from('equipment_catalog').select('*').order('sort_order', { ascending: true }),
  ]);

  if (ageRes.error) throw new Error(ageRes.error.message);
  if (categoryRes.error) throw new Error(categoryRes.error.message);
  if (catalogRes.error) throw new Error(catalogRes.error.message);

  const ageGroups: AgeGroupInfo[] = ((ageRes.data ?? []) as AgeGroupRow[]).map((r) => ({
    id: r.id as AgeGroup,
    label: { en: r.label_en, pt: r.label_pt },
    sortOrder: r.sort_order,
  }));

  const categories: EquipmentCategoryInfo[] = ((categoryRes.data ?? []) as CategoryRow[]).map(
    (r) => ({
      id: r.id as EquipmentCategoryId,
      label: { en: r.label_en, pt: r.label_pt },
      color: r.color,
      sortOrder: r.sort_order,
    }),
  );

  const catalog: EquipmentCatalogEntry[] = ((catalogRes.data ?? []) as CatalogRow[]).map((r) => ({
    type: r.type as EquipmentTypeId,
    category: r.category_id as EquipmentCategoryId,
    label: { en: r.label_en, pt: r.label_pt },
    defaultAgeGroup: (r.default_age_group as AgeGroup | null) ?? undefined,
    sortOrder: r.sort_order,
  }));

  return { ageGroups, categories, catalog };
}
