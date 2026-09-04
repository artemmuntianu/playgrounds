import type {
  AgeGroup,
  EquipmentCategoryId,
  EquipmentTypeId,
  LocalizedText,
} from './playground';

/** A row of the `age_groups` reference table. */
export interface AgeGroupInfo {
  id: AgeGroup;
  label: LocalizedText;
  sortOrder: number;
}

/** A row of the `equipment_categories` reference table. */
export interface EquipmentCategoryInfo {
  id: EquipmentCategoryId;
  label: LocalizedText;
  color: string;
  sortOrder: number;
}

/** A row of the `equipment_catalog` reference table. */
export interface EquipmentCatalogEntry {
  type: EquipmentTypeId;
  category: EquipmentCategoryId;
  label: LocalizedText;
  defaultAgeGroup?: AgeGroup;
  sortOrder: number;
}

/** Everything the client needs about the playground reference vocabulary. */
export interface ReferenceBundle {
  ageGroups: AgeGroupInfo[];
  categories: EquipmentCategoryInfo[];
  catalog: EquipmentCatalogEntry[];
}
