export type Locale = 'en' | 'pt';

export const translations = {
  // Navigation
  'app.title': { en: 'Playground Explorer', pt: 'Explorador de Parques' },
  'nav.back': { en: '← Back', pt: '← Voltar' },

  // Master view
  'master.filter.all': { en: 'All ages', pt: 'Todas as idades' },
  'master.filter.0_3': { en: '0-3 years', pt: '0-3 anos' },
  'master.filter.3_7': { en: '3-7 years', pt: '3-7 anos' },
  'master.filter.7_plus': { en: '7+ years', pt: '7+ anos' },
  'master.sort.name_asc': { en: 'Name A-Z', pt: 'Nome A-Z' },
  'master.sort.name_desc': { en: 'Name Z-A', pt: 'Nome Z-A' },
  'master.sort.newest': { en: 'Newest', pt: 'Mais recente' },
  'master.sort.oldest': { en: 'Oldest', pt: 'Mais antigo' },
  'master.count': { en: '{n} playgrounds', pt: '{n} parques' },
  'master.empty': { en: 'No playgrounds available', pt: 'Nenhum parque disponível' },
  'master.filter_label': { en: 'Age Group', pt: 'Faixa Etária' },
  'master.sort_label': { en: 'Sort by', pt: 'Ordenar por' },

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
