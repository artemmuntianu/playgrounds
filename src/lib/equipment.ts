import { useState, useEffect } from 'react';
import type {
  EquipmentCatalogEntry,
  ReferenceBundle,
} from '../types/reference';
import type {
  AgeGroup,
  EquipmentCategoryId,
  EquipmentTypeId,
  LocalizedText,
} from '../types/playground';

export type {
  EquipmentCatalogEntry,
  ReferenceBundle,
} from '../types/reference';

// ---------------------------------------------------------------------------
// Module-level cache. All client islands share a single fetch of /api/reference.
// ---------------------------------------------------------------------------
let cache: ReferenceBundle | null = null;
let inflight: Promise<ReferenceBundle> | null = null;

const EMPTY: ReferenceBundle = { ageGroups: [], categories: [], catalog: [] };

export function getReferenceData(): Promise<ReferenceBundle> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch('/api/reference')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load reference data');
        return r.json() as Promise<ReferenceBundle>;
      })
      .then((data) => {
        cache = data ?? EMPTY;
        return cache;
      })
      .catch((err) => {
        inflight = null;
        throw err;
      });
  }
  return inflight;
}

/**
 * Load the reference vocabulary once and expose loading/ready/error state so the
 * consuming islands can gate rendering until the DB catalogue is available.
 */
export function useReferenceData(): {
  bundle: ReferenceBundle | null;
  ready: boolean;
  error: string | null;
} {
  const [bundle, setBundle] = useState<ReferenceBundle | null>(cache);
  const [ready, setReady] = useState<boolean>(Boolean(cache));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (cache) {
      setBundle(cache);
      setReady(true);
      return;
    }
    getReferenceData()
      .then((b) => {
        if (mounted) {
          setBundle(b);
          setReady(true);
        }
      })
      .catch((e: any) => {
        if (mounted) {
          setBundle(EMPTY);
          setReady(true);
          setError(e?.message || 'Failed to load reference data');
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { bundle, ready, error };
}

// ---------------------------------------------------------------------------
// Accessors over the DB-loaded bundle (with safe fallbacks).
// Replacement for the old static `equipmentCatalog.ts`.
// ---------------------------------------------------------------------------

/** Ordered age-group ids. */
export function getAgeGroups(): AgeGroup[] {
  return cache?.ageGroups.map((g) => g.id) ?? [];
}

export function getAgeGroupLabel(id: AgeGroup): LocalizedText {
  return cache?.ageGroups.find((g) => g.id === id)?.label ?? { en: id, pt: id };
}

/** Ordered equipment-category ids. */
export function getEquipmentCategories(): EquipmentCategoryId[] {
  return cache?.categories.map((c) => c.id) ?? [];
}

export function getEquipmentCatalog(): EquipmentCatalogEntry[] {
  return cache?.catalog ?? [];
}

export function getCatalogEntry(type: EquipmentTypeId): EquipmentCatalogEntry | undefined {
  return cache?.catalog.find((e) => e.type === type);
}

export function getCategory(type: EquipmentTypeId): EquipmentCategoryId {
  return getCatalogEntry(type)?.category ?? 'development';
}

export function getEquipmentLabel(type: EquipmentTypeId): LocalizedText {
  return getCatalogEntry(type)?.label ?? { en: type, pt: type };
}

/** Icon asset URL for an element type (cropped from the sprite sheets — a PNG from disk). */
export function getEquipmentIcon(type: EquipmentTypeId): string {
  return `/icons/equipment/${type}.png`;
}

export function getCategoryLabel(category: EquipmentCategoryId): LocalizedText {
  return cache?.categories.find((c) => c.id === category)?.label ?? { en: category, pt: category };
}

/** Dot-marker colour for a category (from DB, with deterministic hash fallback). */
export function getCategoryColor(category: EquipmentCategoryId | string): string {
  const known = cache?.categories.find((c) => c.id === category);
  if (known && known.color) return known.color;
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  return `hsl(${hash % 360}, 70%, 50%)`;
}
