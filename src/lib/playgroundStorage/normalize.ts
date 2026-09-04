import type {
  AgeGroup,
  Playground,
  PlaygroundAttributes,
  PlaygroundEquipmentItem,
} from '../../types/playground';
import { mapOldAgeGroupText } from '../migrateAgeGroup';

interface RawTargetAgeGroup {
  id?: AgeGroup;
  en?: string;
  pt?: string;
}

type RawAttributes = Partial<Omit<PlaygroundAttributes, 'target_age_group'>> & {
  target_age_group?: RawTargetAgeGroup | string | undefined | null;
};

/** A playground as parsed from legacy JSON (kept loose to tolerate old shapes). */
interface RawPlayground extends Omit<Playground, 'attributes' | 'equipment'> {
  attributes?: RawAttributes;
  equipment?: PlaygroundEquipmentItem[];
}

/**
 * Coerce a raw playground object (from disk JSON, API body, or migration) into the
 * current `Playground` shape: fills missing `equipment`, and maps a legacy
 * `target_age_group` string / {en,pt} object into a `{ id }` vocabulary reference.
 */
export function normalizePlayground(raw: RawPlayground): Playground {
  const attr: RawAttributes = raw.attributes ?? {};
  const tg = attr.target_age_group;

  let id: AgeGroup;
  if (typeof tg === 'string') {
    id = mapOldAgeGroupText(tg);
  } else if (tg && tg.id) {
    id = tg.id;
  } else {
    id = mapOldAgeGroupText(tg?.en ?? tg?.pt);
  }

  return {
    ...raw,
    attributes: {
      shadow_coverage: attr.shadow_coverage ?? { en: 'Medium shade', pt: 'Sombra média' },
      surface_temperature: attr.surface_temperature ?? { en: 'Warm (~28°C)', pt: 'Morno (~28°C)' },
      target_age_group: { id },
    },
    equipment: raw.equipment ?? [],
  };
}
