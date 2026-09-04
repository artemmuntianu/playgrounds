export type Locale = 'en' | 'pt';

export const translations = {
  // Navigation
  'app.title': { en: 'Playground Explorer', pt: 'Explorador de Parques' },
  'nav.back': { en: '← Back', pt: '← Voltar' },

  // Master view
  'master.filter.toddlers': { en: 'Toddlers (0-3)', pt: 'Bebés (0-3)' },
  'master.filter.preschool': { en: 'Preschool (3-7)', pt: 'Pré-escolar (3-7)' },
  'master.filter.schoolchildren': { en: 'Schoolchildren (7-12)', pt: 'Escolares (7-12)' },
  'master.filter.teenagers': { en: 'Teenagers (12+)', pt: 'Adolescentes (12+)' },
  'master.filter.all': { en: 'All ages', pt: 'Todas as idades' },
  'master.sort.name_asc': { en: 'Name A-Z', pt: 'Nome A-Z' },
  'master.sort.name_desc': { en: 'Name Z-A', pt: 'Nome Z-A' },
  'master.sort.newest': { en: 'Newest', pt: 'Mais recente' },
  'master.sort.oldest': { en: 'Oldest', pt: 'Mais antigo' },
  'master.count': { en: '{n} playgrounds', pt: '{n} parques' },
  'master.empty': { en: 'No playgrounds available', pt: 'Nenhum parque disponível' },
  'master.filter_label': { en: 'Age Group', pt: 'Faixa Etária' },
  'master.filter_label_equip': { en: 'Equipment', pt: 'Equipamento' },
  'master.sort_label': { en: 'Sort by', pt: 'Ordenar por' },
  'master.filter_any': { en: 'Any', pt: 'Qualquer' },

  // Detail view
  'detail.time_machine': { en: 'Time Machine', pt: 'Máquina do Tempo' },
  'detail.shadows': { en: 'Shadows', pt: 'Sombras' },
  'detail.temperature': { en: 'Temperature', pt: 'Temperatura' },
  'detail.age_group': { en: 'Age Group', pt: 'Faixa Etária' },
  'detail.shaded': { en: 'shaded', pt: 'sombreado' },
  'detail.surface': { en: 'Surface', pt: 'Superfície' },
  'detail.no_photos': { en: 'No photos available', pt: 'Sem fotos disponíveis' },
  'detail.loading': { en: 'Loading...', pt: 'A carregar...' },
  'detail.not_found': { en: 'Playground not found', pt: 'Parque não encontrado' },
  'detail.gallery': { en: 'Gallery', pt: 'Galeria' },
  'detail.markers.show': { en: 'Hide equipment (N)', pt: 'Ocultar equipamento (N)' },
  'detail.markers.hide': { en: 'Show equipment', pt: 'Ver equipamento' },
  'detail.equipment': { en: 'Equipment', pt: 'Equipamento' },

  // Equipment categories
  'equipment.cat.ride_balance': { en: 'Ride & balance', pt: 'Balanço & equilíbrio' },
  'equipment.cat.sport_complex': { en: 'Sport & game', pt: 'Desporto & jogo' },
  'equipment.cat.development': { en: 'Development', pt: 'Desenvolvimento' },
  'equipment.cat.rest': { en: 'Rest', pt: 'Descanso' },
  'equipment.cat.exploration': { en: 'Exploration', pt: 'Exploração' },
  'equipment.cat.fitness': { en: 'Fitness', pt: 'Fitness' },
  'equipment.cat.creativity': { en: 'Creativity', pt: 'Criatividade' },
  'equipment.cat.amenities': { en: 'Amenities', pt: 'Comodidades' },
  'equipment.cat.sensory_play': { en: 'Sensory play', pt: 'Brincadeira sensorial' },
  'equipment.cat.adventure_course': { en: 'Adventure course', pt: 'Percurso de aventura' },
  'equipment.cat.nature_play': { en: 'Nature play', pt: 'Brincadeira na natureza' },
  'equipment.cat.gathering_hub': { en: 'Gathering hub', pt: 'Ponto de encontro' },
  'equipment.cat.inclusive_play': { en: 'Inclusive play', pt: 'Brincadeira inclusiva' },
  'equipment.cat.toddler_zone': { en: 'Toddler zone', pt: 'Zona de bebés' },
  'equipment.cat.interactive_elements': { en: 'Interactive elements', pt: 'Elementos interativos' },
  'equipment.cat.expanded_amenities': { en: 'Expanded amenities', pt: 'Comodidades alargadas' },
  'equipment.cat.tech_play': { en: 'Tech play', pt: 'Brincadeira tecnológica' },
  'equipment.cat.water_features': { en: 'Water features', pt: 'Elementos de água' },
  'equipment.cat.imaginative_stages': { en: 'Imaginative stages', pt: 'Palcos imaginativos' },
  'equipment.cat.sports_zone': { en: 'Sports zone', pt: 'Zona desportiva' },
  'equipment.cat.learning_elements': { en: 'Learning elements', pt: 'Elementos de aprendizagem' },
  'equipment.cat.maintenance_safety': { en: 'Maintenance & safety', pt: 'Manutenção e segurança' },
  'equipment.cat.functional_zones': { en: 'Functional zones', pt: 'Zonas funcionais' },

  // Orientation overlay
  'orientation.message': {
    en: 'Please rotate your phone to portrait mode for the best experience',
    pt: 'Por favor, rode o telemóvel para o modo retrato para uma melhor experiência',
  },

  // Attributes
  'attr.shadow.high': { en: 'High shade', pt: 'Sombra alta' },
  'attr.shadow.medium': { en: 'Medium shade', pt: 'Sombra média' },
  'attr.shadow.low': { en: 'Low shade', pt: 'Sombra baixa' },
} as const;

export type TranslationKey = keyof typeof translations;

/**
 * Translate a key into the given locale.
 * Supports simple {param} interpolation.
 */
export function t(
  key: TranslationKey,
  locale: Locale,
  params?: Record<string, string | number>,
): string {
  let text: string =
    (translations[key] as Record<string, string>)?.[locale] ||
    (translations[key] as Record<string, string>)?.['en'] ||
    key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }
  return text;
}

const MONTH_ABBR: Record<Locale, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
};

/** Formats a date like "Aug 3" (EN) or "3 ago" (PT). */
export function formatDayLabel(date: Date, locale: Locale): string {
  const month = MONTH_ABBR[locale][date.getMonth()] ?? '';
  return locale === 'pt' ? `${date.getDate()} ${month}` : `${month} ${date.getDate()}`;
}
