import type {
  AgeGroup,
  EquipmentCategoryId,
  EquipmentTypeId,
  LocalizedText,
} from '../types/playground';
import type { Locale } from './i18n';

/** Localized labels for the age-group vocabulary (not stored per playground). */
export const AGE_GROUP_LABELS: Record<AgeGroup, LocalizedText> = {
  toddlers: { en: 'Toddlers (0-3)', pt: 'BebÃ©s (0-3)' },
  preschool: { en: 'Preschool (3-7)', pt: 'PrÃ©-escolar (3-7)' },
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

/** Ordered list of every category (drives picker accordions + viewer filter). */
export const EQUIPMENT_CATEGORIES: EquipmentCategoryId[] = [
  'ride_balance', 'sport_complex', 'development', 'rest',
  'exploration', 'fitness', 'creativity', 'amenities',
  'sensory_play', 'adventure_course', 'nature_play', 'gathering_hub',
  'inclusive_play', 'toddler_zone', 'interactive_elements', 'expanded_amenities',
  'tech_play', 'water_features', 'imaginative_stages', 'eco_garden',
  'sports_zone', 'learning_elements', 'maintenance_safety', 'functional_zones',
];

/** Localized category names (matches i18n `equipment.cat.*` keys). */
const CATEGORY_LABELS: Record<EquipmentCategoryId, LocalizedText> = {
  ride_balance: { en: 'Ride & balance', pt: 'BalanÃ§o & equilÃ­brio' },
  sport_complex: { en: 'Sport & game', pt: 'Desporto & jogo' },
  development: { en: 'Development', pt: 'Desenvolvimento' },
  rest: { en: 'Rest', pt: 'Descanso' },
  exploration: { en: 'Exploration', pt: 'ExploraÃ§Ã£o' },
  fitness: { en: 'Fitness', pt: 'Fitness' },
  creativity: { en: 'Creativity', pt: 'Criatividade' },
  amenities: { en: 'Amenities', pt: 'Comodidades' },
  sensory_play: { en: 'Sensory play', pt: 'Brincadeira sensorial' },
  adventure_course: { en: 'Adventure course', pt: 'Percurso de aventura' },
  nature_play: { en: 'Nature play', pt: 'Brincadeira na natureza' },
  gathering_hub: { en: 'Gathering hub', pt: 'Ponto de encontro' },
  inclusive_play: { en: 'Inclusive play', pt: 'Brincadeira inclusiva' },
  toddler_zone: { en: 'Toddler zone', pt: 'Zona de bebÃ©s' },
  interactive_elements: { en: 'Interactive elements', pt: 'Elementos interativos' },
  expanded_amenities: { en: 'Expanded amenities', pt: 'Comodidades alargadas' },
  tech_play: { en: 'Tech play', pt: 'Brincadeira tecnolÃ³gica' },
  water_features: { en: 'Water features', pt: 'Elementos de Ã¡gua' },
  imaginative_stages: { en: 'Imaginative stages', pt: 'Palcos imaginativos' },
  eco_garden: { en: 'Eco garden', pt: 'Jardim ecolÃ³gico' },
  sports_zone: { en: 'Sports zone', pt: 'Zona desportiva' },
  learning_elements: { en: 'Learning elements', pt: 'Elementos de aprendizagem' },
  maintenance_safety: { en: 'Maintenance & safety', pt: 'ManutenÃ§Ã£o e seguranÃ§a' },
  functional_zones: { en: 'Functional zones', pt: 'Zonas funcionais' },
};

/** Dot-marker base colour per category. */
const CATEGORY_COLORS: Record<EquipmentCategoryId, string> = {
  ride_balance: '#f59e0b',
  sport_complex: '#3b82f6',
  development: '#8b5cf6',
  rest: '#10b981',
  exploration: '#0ea5e9',
  fitness: '#ef4444',
  creativity: '#ec4899',
  amenities: '#64748b',
  sensory_play: '#f97316',
  adventure_course: '#22c55e',
  nature_play: '#84cc16',
  gathering_hub: '#78350f',
  inclusive_play: '#6366f1',
  toddler_zone: '#fb7185',
  interactive_elements: '#06b6d4',
  expanded_amenities: '#78716c',
  tech_play: '#7c3aed',
  water_features: '#0284c7',
  imaginative_stages: '#a855f7',
  eco_garden: '#16a34a',
  sports_zone: '#db2777',
  learning_elements: '#eab308',
  maintenance_safety: '#475569',
  functional_zones: '#0891b2',
};
/** Static catalog of every element type an operator can select. */
export const EQUIPMENT_CATALOG: EquipmentCatalogEntry[] = [
  // ride & balance
  { type: 'swings_single', category: 'ride_balance', label: { en: 'Swing (single)', pt: 'BaloiÃ§o (individual)' }, defaultAgeGroup: 'toddlers' },
  { type: 'swing_nest', category: 'ride_balance', label: { en: 'Swing (nest)', pt: 'BaloiÃ§o (ninho)' }, defaultAgeGroup: 'preschool' },
  { type: 'seesaw', category: 'ride_balance', label: { en: 'Seesaw', pt: 'BalanÃ§a' }, defaultAgeGroup: 'toddlers' },
  { type: 'carousel', category: 'ride_balance', label: { en: 'Carousel', pt: 'Carrossel' }, defaultAgeGroup: 'preschool' },
  { type: 'slide', category: 'ride_balance', label: { en: 'Slide', pt: 'Escorregador' }, defaultAgeGroup: 'preschool' },
  // sport & game complexes
  { type: 'ladder', category: 'sport_complex', label: { en: 'Ladder', pt: 'Escada' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'wall_bars', category: 'sport_complex', label: { en: 'Wall bars', pt: 'Espaldar' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'monkey_bars', category: 'sport_complex', label: { en: 'Monkey bars', pt: 'Barras (macaco)' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'rope_net', category: 'sport_complex', label: { en: 'Rope climbing net', pt: 'Rede de escalada' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'pull_up_bar', category: 'sport_complex', label: { en: 'Pull-up bar', pt: 'Barra fixa' }, defaultAgeGroup: 'teenagers' },
  { type: 'climbing_wall', category: 'sport_complex', label: { en: 'Climbing wall', pt: 'ParedÃ£o de escalada' }, defaultAgeGroup: 'schoolchildren' },
  // development
  { type: 'sandbox', category: 'development', label: { en: 'Sandbox', pt: 'Caixa de areia' }, defaultAgeGroup: 'toddlers' },
  { type: 'busy_board', category: 'development', label: { en: 'Busy board', pt: 'Painel sensorial' }, defaultAgeGroup: 'toddlers' },
  { type: 'playhouse', category: 'development', label: { en: 'Playhouse', pt: 'Casinha' }, defaultAgeGroup: 'preschool' },
  { type: 'abacus', category: 'development', label: { en: 'Abacus', pt: 'Ãbaco' }, defaultAgeGroup: 'preschool' },
  // rest
  { type: 'bench', category: 'rest', label: { en: 'Bench', pt: 'Banco' }, defaultAgeGroup: 'all' },
  { type: 'trash_bin', category: 'rest', label: { en: 'Trash bin', pt: 'Caixote do lixo' }, defaultAgeGroup: 'all' },
  { type: 'canopy', category: 'rest', label: { en: 'Canopy', pt: 'Toldo' }, defaultAgeGroup: 'all' },
  // exploration
  { type: 'zip_line', category: 'exploration', label: { en: 'Zip line', pt: 'Slide de cabo' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'standing_spinner', category: 'exploration', label: { en: 'Standing spinner', pt: 'Carrossel de pÃ©' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'spring_rider', category: 'exploration', label: { en: 'Spring rider', pt: 'BaloiÃ§o de mola' }, defaultAgeGroup: 'toddlers' },
  { type: 'climbing_dome', category: 'exploration', label: { en: 'Climbing dome', pt: 'CÃºpula de escalada' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'tunnel', category: 'exploration', label: { en: 'Tunnel', pt: 'TÃºnel' }, defaultAgeGroup: 'toddlers' },
  // fitness
  { type: 'gymnastic_rings', category: 'fitness', label: { en: 'Gymnastic rings', pt: 'Argolas ginÃ¡sticas' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'basketball_hoop', category: 'fitness', label: { en: 'Basketball hoop', pt: 'Cesto de basquete' }, defaultAgeGroup: 'teenagers' },
  { type: 'climbing_rope', category: 'fitness', label: { en: 'Climbing rope', pt: 'Corda de escalada' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'balance_beam', category: 'fitness', label: { en: 'Balance beam', pt: 'Trave de equilÃ­brio' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'slackline', category: 'fitness', label: { en: 'Slackline', pt: 'Slackline' }, defaultAgeGroup: 'teenagers' },
  { type: 'step_stones', category: 'fitness', label: { en: 'Step stones', pt: 'Pedras de equilÃ­brio' }, defaultAgeGroup: 'toddlers' },
  // creativity
  { type: 'water_table', category: 'creativity', label: { en: 'Water table', pt: 'Mesa de Ã¡gua' }, defaultAgeGroup: 'toddlers' },
  { type: 'outdoor_chalkboard', category: 'creativity', label: { en: 'Outdoor chalkboard', pt: 'Quadro de giz' }, defaultAgeGroup: 'preschool' },
  { type: 'stone_path', category: 'creativity', label: { en: 'Stone path', pt: 'Caminho de pedra' }, defaultAgeGroup: 'all' },
  { type: 'telescope', category: 'creativity', label: { en: 'Telescope', pt: 'TelescÃ³pio' }, defaultAgeGroup: 'schoolchildren' },
  // amenities
  { type: 'drinking_fountain', category: 'amenities', label: { en: 'Drinking fountain', pt: 'Fonte de Ã¡gua' }, defaultAgeGroup: 'all' },
  { type: 'stroller_parking', category: 'amenities', label: { en: 'Stroller parking', pt: 'Parque de carrinhos' }, defaultAgeGroup: 'all' },

  // sensory play
  { type: 'music_xylophone', category: 'sensory_play', label: { en: 'Music xylophone', pt: 'Xilofone musical' }, defaultAgeGroup: 'preschool' },
  { type: 'tactile_panel', category: 'sensory_play', label: { en: 'Tactile panel', pt: 'Painel tÃ¡til' }, defaultAgeGroup: 'toddlers' },
  { type: 'optical_illusion_panel', category: 'sensory_play', label: { en: 'Optical illusion panel', pt: 'Painel de ilusÃ£o Ã³tica' }, defaultAgeGroup: 'preschool' },
  { type: 'tic_tac_toe_wall', category: 'sensory_play', label: { en: 'Tic-tac-toe wall game', pt: 'Jogo do galo de parede' }, defaultAgeGroup: 'preschool' },
  // adventure course
  { type: 'in_ground_trampoline', category: 'adventure_course', label: { en: 'In-ground trampoline', pt: 'Cama elÃ¡stica enterrada' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'tire_obstacle_course', category: 'adventure_course', label: { en: 'Tire obstacle course', pt: 'Percurso de pneus' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'rope_bridge', category: 'adventure_course', label: { en: 'Rope bridge', pt: 'Ponte de corda' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'jump_rope_station', category: 'adventure_course', label: { en: 'Jump rope station', pt: 'EstaÃ§Ã£o de saltar Ã  corda' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'sitting_logs', category: 'adventure_course', label: { en: 'Sitting logs', pt: 'Troncos de sentar' }, defaultAgeGroup: 'preschool' },
  { type: 'stone_slide', category: 'adventure_course', label: { en: 'Stone slide', pt: 'Escorregador de pedra' }, defaultAgeGroup: 'preschool' },
  { type: 'natural_climbing_area', category: 'adventure_course', label: { en: 'Natural climbing area', pt: 'Ãrea de escalada natural' }, defaultAgeGroup: 'schoolchildren' },
  // nature play
  { type: 'sensory_garden_bed', category: 'nature_play', label: { en: 'Sensory garden bed', pt: 'Canteiro sensorial' }, defaultAgeGroup: 'toddlers' },
  { type: 'birdhouse_feeder', category: 'nature_play', label: { en: 'Birdhouse / feeder station', pt: 'Casa de pÃ¡ssaros' }, defaultAgeGroup: 'all' },
  // gathering hub
  { type: 'picnic_table_canopy', category: 'gathering_hub', label: { en: 'Picnic table with canopy', pt: 'Mesa de piquenique com toldo' }, defaultAgeGroup: 'all' },
  { type: 'round_tree_bench', category: 'gathering_hub', label: { en: 'Round tree bench', pt: 'Banco redondo de Ã¡rvore' }, defaultAgeGroup: 'all' },
  { type: 'table_game_station', category: 'gathering_hub', label: { en: 'Table game station', pt: 'EstaÃ§Ã£o de jogos de mesa' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'community_toy_box', category: 'gathering_hub', label: { en: 'Community toy box', pt: 'Caixa de brinquedos' }, defaultAgeGroup: 'toddlers' },
  { type: 'pet_water_fountain', category: 'gathering_hub', label: { en: 'Pet water fountain', pt: 'Fonte para animais' }, defaultAgeGroup: 'all' },
  // inclusive play
  { type: 'wheelchair_swing', category: 'inclusive_play', label: { en: 'Wheelchair ramp platform swing', pt: 'BaloiÃ§o com rampa acessÃ­vel' }, defaultAgeGroup: 'preschool' },
  { type: 'platform_swing', category: 'inclusive_play', label: { en: 'Platform swing', pt: 'BaloiÃ§o de plataforma' }, defaultAgeGroup: 'preschool' },
  { type: 'accessible_play_table', category: 'inclusive_play', label: { en: 'Accessible play table', pt: 'Mesa de jogo acessÃ­vel' }, defaultAgeGroup: 'preschool' },
  { type: 'large_print_panel', category: 'inclusive_play', label: { en: 'Large print panel', pt: 'Painel de letras grandes' }, defaultAgeGroup: 'preschool' },
  { type: 'accessible_seating', category: 'inclusive_play', label: { en: 'Accessible seating area', pt: 'Ãrea de estar acessÃ­vel' }, defaultAgeGroup: 'all' },
  // toddler zone
  { type: 'mini_slide', category: 'toddler_zone', label: { en: 'Mini slide', pt: 'Mini escorregador' }, defaultAgeGroup: 'toddlers' },
  { type: 'bee_spring_rider', category: 'toddler_zone', label: { en: 'Bee spring rider', pt: 'BaloiÃ§o de mola abelha' }, defaultAgeGroup: 'toddlers' },
  { type: 'crawling_tunnel', category: 'toddler_zone', label: { en: 'Crawling tunnel', pt: 'TÃºnel de gatinhar' }, defaultAgeGroup: 'toddlers' },
  { type: 'soft_play_modules', category: 'toddler_zone', label: { en: 'Soft play modules', pt: 'MÃ³dulos soft play' }, defaultAgeGroup: 'toddlers' },
  { type: 'sand_play_table', category: 'toddler_zone', label: { en: 'Sand play table', pt: 'Mesa de areia' }, defaultAgeGroup: 'toddlers' },
  { type: 'toddler_book_nook', category: 'toddler_zone', label: { en: 'Toddler book nook', pt: 'Cantinho de leitura' }, defaultAgeGroup: 'toddlers' },
  // interactive elements
  { type: 'sound_effect_board', category: 'interactive_elements', label: { en: 'Sound effect board', pt: 'Painel de efeitos sonoros' }, defaultAgeGroup: 'preschool' },
  { type: 'solar_sensor_post', category: 'interactive_elements', label: { en: 'Solar sensor post', pt: 'Poste com sensor solar' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'musical_pipes', category: 'interactive_elements', label: { en: 'Musical pipes', pt: 'Tubos musicais' }, defaultAgeGroup: 'preschool' },
  { type: 'sand_drawing_board', category: 'interactive_elements', label: { en: 'Sand drawing board', pt: 'Quadro de desenho em areia' }, defaultAgeGroup: 'preschool' },
  // expanded amenities
  { type: 'charging_station', category: 'expanded_amenities', label: { en: 'Charging station', pt: 'EstaÃ§Ã£o de carregamento' }, defaultAgeGroup: 'all' },
  { type: 'u_rack_bike_parking', category: 'expanded_amenities', label: { en: 'U-rack bike parking', pt: 'Parque de bicicletas em U' }, defaultAgeGroup: 'all' },
  { type: 'modern_park_light', category: 'expanded_amenities', label: { en: 'Modern park light', pt: 'IluminaÃ§Ã£o moderna' }, defaultAgeGroup: 'all' },
  { type: 'bike_repair_station', category: 'expanded_amenities', label: { en: 'Bike repair station', pt: 'EstaÃ§Ã£o de reparaÃ§Ã£o de bicicletas' }, defaultAgeGroup: 'all' },

  // tech play
  { type: 'smart_gate', category: 'tech_play', label: { en: 'Smart gate', pt: 'PortÃ£o inteligente' }, defaultAgeGroup: 'all' },
  { type: 'digital_game_screen', category: 'tech_play', label: { en: 'Digital game screen', pt: 'EcrÃ£ de jogo digital' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'interactive_path', category: 'tech_play', label: { en: 'Interactive path', pt: 'Percurso interativo' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'ar_info_panel', category: 'tech_play', label: { en: 'AR info panel', pt: 'Painel de informaÃ§Ã£o RA' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'kinetic_power_station', category: 'tech_play', label: { en: 'Kinetic power station', pt: 'EstaÃ§Ã£o de energia cinÃ©tica' }, defaultAgeGroup: 'schoolchildren' },
  // water features
  { type: 'cascade_stream', category: 'water_features', label: { en: 'Cascade stream', pt: 'Riacho em cascata' }, defaultAgeGroup: 'all' },
  { type: 'flower_sprinkler', category: 'water_features', label: { en: 'Flower sprinkler', pt: 'Aspersor de flor' }, defaultAgeGroup: 'all' },
  { type: 'water_wheel', category: 'water_features', label: { en: 'Water wheel', pt: 'Roda de Ã¡gua' }, defaultAgeGroup: 'preschool' },
  { type: 'market_stall', category: 'water_features', label: { en: 'Market stall', pt: 'Banca de mercado' }, defaultAgeGroup: 'all' },
  { type: 'pedal_pump', category: 'water_features', label: { en: 'Pedal pump', pt: 'Bomba de pedal' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'sand_water_table', category: 'water_features', label: { en: 'Sand & water table', pt: 'Mesa de areia e Ã¡gua' }, defaultAgeGroup: 'toddlers' },
  // imaginative stages
  { type: 'amphitheater_stage', category: 'imaginative_stages', label: { en: 'Amphitheater stage', pt: 'Palco anfiteatro' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'lookout_tower', category: 'imaginative_stages', label: { en: 'Lookout tower', pt: 'Torre de vigia' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'castle_rampart', category: 'imaginative_stages', label: { en: 'Castle rampart', pt: 'Muralha de castelo' }, defaultAgeGroup: 'preschool' },
  { type: 'submarine_play', category: 'imaginative_stages', label: { en: 'Submarine play structure', pt: 'Estrutura de submarino' }, defaultAgeGroup: 'preschool' },
  // eco garden
  { type: 'compost_bin', category: 'eco_garden', label: { en: 'Compost bin', pt: 'Compostor' }, defaultAgeGroup: 'all' },
  { type: 'insect_hotel', category: 'eco_garden', label: { en: 'Insect hotel', pt: 'Hotel de insetos' }, defaultAgeGroup: 'preschool' },
  { type: 'greenhouse_dome', category: 'eco_garden', label: { en: 'Greenhouse dome', pt: 'Estufa abobadada' }, defaultAgeGroup: 'preschool' },
  { type: 'eco_signage', category: 'eco_garden', label: { en: 'Eco signage', pt: 'SinalizaÃ§Ã£o ecolÃ³gica' }, defaultAgeGroup: 'all' },
  // sports zone
  { type: 'multisport_court', category: 'sports_zone', label: { en: 'Multisport court', pt: 'Campo multiusos' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'soccer_pitch', category: 'sports_zone', label: { en: 'Soccer pitch', pt: 'Campo de futebol' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'calisthenics_frame', category: 'sports_zone', label: { en: 'Calisthenics frame', pt: 'Estrutura de calistenia' }, defaultAgeGroup: 'teenagers' },
  // learning elements
  { type: 'alphabet_panel', category: 'learning_elements', label: { en: 'Alphabet panel', pt: 'Painel do alfabeto' }, defaultAgeGroup: 'preschool' },
  { type: 'number_wall', category: 'learning_elements', label: { en: 'Number wall', pt: 'Parede dos números' }, defaultAgeGroup: 'preschool' },
  { type: 'compass_floor_design', category: 'learning_elements', label: { en: 'Compass floor design', pt: 'Bússola no chão' }, defaultAgeGroup: 'schoolchildren' },
  { type: 'musical_notes_panel', category: 'learning_elements', label: { en: 'Musical notes panel', pt: 'Painel de notas musicais' }, defaultAgeGroup: 'preschool' },
  // maintenance & safety
  { type: 'hand_sanitizer', category: 'maintenance_safety', label: { en: 'Hand sanitizer station', pt: 'EstaÃ§Ã£o de desinfetante' }, defaultAgeGroup: 'all' },
  { type: 'recycling_bin', category: 'maintenance_safety', label: { en: 'Recycling bin', pt: 'Contentor de reciclagem' }, defaultAgeGroup: 'all' },
  { type: 'surveillance_camera', category: 'maintenance_safety', label: { en: 'Surveillance camera', pt: 'CÃ¢mara de vigilÃ¢ncia' }, defaultAgeGroup: 'all' },
  { type: 'first_aid_station', category: 'maintenance_safety', label: { en: 'First aid station', pt: 'EstaÃ§Ã£o de primeiros socorros' }, defaultAgeGroup: 'all' },
  // functional zones
  { type: 'parent_seating', category: 'functional_zones', label: { en: 'Parent seating', pt: 'Ãrea de estar para pais' }, defaultAgeGroup: 'all' },
  { type: 'dog_park_zone', category: 'functional_zones', label: { en: 'Dog park zone', pt: 'Zona de cÃ£es' }, defaultAgeGroup: 'all' },
  { type: 'shade_structure', category: 'functional_zones', label: { en: 'Shade structure', pt: 'Estrutura de sombra' }, defaultAgeGroup: 'all' },
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

/** Icon asset URL for an element type (cropped from the sprite sheets). */
export function getEquipmentIcon(type: EquipmentTypeId): string {
  return `/icons/equipment/${type}.png`;
}

/** Localized category name. */
export function getCategoryLabel(category: EquipmentCategoryId): LocalizedText {
  return CATEGORY_LABELS[category] ?? { en: category, pt: category };
}

export function getCategoryLabelLocalized(category: EquipmentCategoryId, locale: Locale): string {
  return CATEGORY_LABELS[category]?.[locale] ?? category;
}

/** Dot-marker colour for a category. */
export function getCategoryColor(category: EquipmentCategoryId | string): string {
  if (category in CATEGORY_COLORS) return CATEGORY_COLORS[category as EquipmentCategoryId];
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  return `hsl(${hash % 360}, 70%, 50%)`;
}

export function getAgeGroupLabel(id: AgeGroup): LocalizedText {
  return AGE_GROUP_LABELS[id];
}

