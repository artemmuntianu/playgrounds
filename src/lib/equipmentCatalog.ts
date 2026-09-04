import type {
  AgeGroup,
  EquipmentCategoryId,
  EquipmentTypeId,
  LocalizedText,
} from '../types/playground';

/** Localized labels for the age-group vocabulary (not stored per playground). */
export const AGE_GROUP_LABELS: Record<AgeGroup, LocalizedText> = {
  toddlers: { en: 'Toddlers (0-3)', pt: 'Bebés (0-3)' },
  preschool: { en: 'Preschool (3-7)', pt: 'Pré-escolar (3-7)' },
  schoolchildren: { en: 'Schoolchildren (7-12)', pt: 'Escolares (7-12)' },
  teenagers: { en: 'Teenagers (12+)', pt: 'Adolescentes (12+)' },
  all: { en: 'All ages', pt: 'Todas as idades' },
};

export const AGE_GROUPS: AgeGroup[] = ['toddlers', 'preschool', 'schoolchildren', 'teenagers', 'all'];

export interface EquipmentCatalogEntry {
  type: EquipmentTypeId;
  category: EquipmentCategoryId;
  label: LocalizedText;
  defaultAgeGroup?: AgeGroup;
}

/** Static catalog of every element type an operator can select. */
export const EQUIPMENT_CATALOG: EquipmentCatalogEntry[] = [
  // ride & balance
  { type: 'swings_single', category: 'ride_balance', label: { en: 'Swing (single)', pt: 'Baloiço (individual)' }, defaultAgeGroup: 'toddlers' },
  { type: 'swing_nest', category: 'ride_balance', label: { en: 'Swing (nest)', pt: 'Baloiço (ninho)' }, defaultAgeGroup: 'preschool' },
  { type: 'seesaw', category: 'ride_balance', label: { en: 'Seesaw', pt: 'Balança' }, defaultAgeGroup: 'toddlers' },
  { type: 'carousel', category: 'ride_balance', label: { en: 'Carousel', pt: 'Carrossel' }, defaultAgeGroup: 'preschool' },
  { type: 'slide', category: 'ride_balance', label: { en: 'Slide', pt: 'Escorregador' }, defaultAgeGroup: 'preschool' },
  // sport & game complexes
  { type: 'ladder', category: 'sport_complex', label: { en: 'Ladder', pt: 'Escada' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'wall_bars', category: 'sport_complex', label: { en: 'Wall bars', pt: 'Espaldar' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'monkey_bars', category: 'sport_complex', label: { en: 'Monkey bars', pt: 'Barras (macaco)' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'rope_net', category: 'sport_complex', label: { en: 'Rope climbing net', pt: 'Rede de escalada' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'pull_up_bar', category: 'sport_complex', label: { en: 'Pull-up bar', pt: 'Barra fixa' }, defaultAgeGroup: 'teenagers' },
  { type: 'climbing_wall', category: 'sport_complex', label: { en: 'Climbing wall', pt: 'Paredão de escalada' }, defaultAgeGroup: 'schoolchildren' },
  // development
  { type: 'sandbox', category: 'development', label: { en: 'Sandbox', pt: 'Caixa de areia' }, defaultAgeGroup: 'toddlers' },
  { type: 'busy_board', category: 'development', label: { en: 'Busy board', pt: 'Painel sensorial' }, defaultAgeGroup: 'toddlers' },
  { type: 'playhouse', category: 'development', label: { en: 'Playhouse', pt: 'Casinha' }, defaultAgeGroup: 'preschool' },
  { type: 'abacus', category: 'development', label: { en: 'Abacus', pt: 'Ábaco' }, defaultAgeGroup: 'preschool' },
  // rest
  { type: 'bench', category: 'rest', label: { en: 'Bench', pt: 'Banco' }, defaultAgeGroup: 'all' },
  { type: 'trash_bin', category: 'rest', label: { en: 'Trash bin', pt: 'Caixote do lixo' }, defaultAgeGroup: 'all' },
  { type: 'canopy', category: 'rest', label: { en: 'Canopy', pt: 'Toldo' }, defaultAgeGroup: 'all' },
];

export function getCatalogEntry(type: EquipmentTypeId): EquipmentCatalogEntry | undefined {
  return EQUIPMENT_CATALOG.find((e) => e.type === type);
}

export function getCategory(type: EquipmentTypeId): EquipmentCategoryId {
  return getCatalogEntry(type)?.category ?? 'development';
}

export function getEquipmentLabel(type: EquipmentTypeId): LocalizedText {
  return getCatalogEntry(type)?.label ?? { en: type, pt: type };
}

export function getAgeGroupLabel(id: AgeGroup): LocalizedText {
  return AGE_GROUP_LABELS[id];
}
