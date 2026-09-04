import type { AgeGroup } from '../types/playground';

/**
 * Map a legacy age-group string (e.g. "3-7 years", "0-3 anos", "All ages")
 * to a vocabulary `AgeGroup` id. Used when migrating legacy playground.json
 * data and by the read-through compatibility layer.
 */
export function mapOldAgeGroupText(value: string | undefined | null): AgeGroup {
  if (!value) return 'all';
  const s = value.toLowerCase();
  if (s.includes('0-3')) return 'toddlers';
  if (s.includes('3-7')) return 'preschool';
  if (s.includes('7+') || s.includes('7-12')) return 'schoolchildren';
  if (s.includes('12+')) return 'teenagers';
  if (s.includes('all') || s.includes('todas') || s.includes('idades')) return 'all';
  // Default fallback for unknown text
  return 'all';
}
