import React from 'react';
import type {
  AgeGroup,
  EquipmentCategoryId,
  EquipmentTypeId,
  PlaygroundEquipmentItem,
} from '../../types/playground';
import type { EquipmentCatalogEntry } from '../../types/reference';
import {
  getAgeGroups,
  getAgeGroupLabel,
  getEquipmentCatalog,
  getEquipmentCategories,
  getCategory,
  getCategoryLabel,
  getEquipmentLabel,
} from '../../lib/equipment';
import { EquipmentIcon } from '../EquipmentIcon';

const CATEGORY_EMOJI: Record<EquipmentCategoryId, string> = {
  ride_balance: '🛝',
  sport_complex: '🧗',
  development: '🧸',
  rest: '🪑',
  exploration: '🧭',
  fitness: '🏋️',
  creativity: '🎨',
  amenities: '🚰',
  sensory_play: '🧩',
  adventure_course: '🧗',
  nature_play: '🌿',
  gathering_hub: '🧺',
  inclusive_play: '♿',
  toddler_zone: '🍼',
  interactive_elements: '✨',
  expanded_amenities: '🔌',
  tech_play: '📱',
  water_features: '💧',
  imaginative_stages: '🎭',
  sports_zone: '⚽',
  learning_elements: '🔤',
  maintenance_safety: '🛡️',
  functional_zones: '📍',
};

const LIST_ICON_SIZE = 50;
const FULL_ICON_SIZE = 100;

// --- Header ---
export interface EquipmentEditorHeaderProps {
  count: number;
  playgroundId: string;
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}

export const EquipmentEditorHeader: React.FC<EquipmentEditorHeaderProps> = ({
  count,
  playgroundId,
  dirty,
  saving,
  saved,
  onSave,
}) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
    <div>
      <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
        <span>🧩</span> Playground Elements ({count})
      </h3>
      <p className="text-xs text-slate-500">
        List the equipment present on this playground, optionally pick an age group, then mark them on
        photos.
      </p>
    </div>
    <div className="flex items-center gap-2">
      {count > 0 ? (
        <a
          href={`/admin/${playgroundId}/equipment`}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow"
        >
          🎯 Mark on Photos →
        </a>
      ) : (
        <span className="px-4 py-2 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl cursor-not-allowed">
          🎯 Mark on Photos (add elements first)
        </span>
      )}
      <button
        type="button"
        onClick={onSave}
        disabled={!dirty || saving}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow disabled:opacity-50"
      >
        {saving ? 'Saving...' : saved ? '✅ Saved' : '💾 Save'}
      </button>
    </div>
  </div>
);

// --- Status banner ---
export interface EquipmentEditorStatusProps {
  dirty: boolean;
  saved: boolean;
}

export const EquipmentEditorStatus: React.FC<EquipmentEditorStatusProps> = ({ dirty, saved }) =>
  dirty || saved ? (
    <div
      className={`p-3 rounded-xl text-xs font-bold ${
        saved
          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          : 'bg-amber-50 text-amber-800 border border-amber-200'
      }`}
    >
      {saved ? '✅ Elements saved' : '⚠️ Unsaved changes — click Save'}
    </div>
  ) : null;

// --- Existing equipment item card ---
export interface EquipmentItemCardProps {
  item: PlaygroundEquipmentItem;
  onRemove: (id: string) => void;
  onUpdate: (
    id: string,
    updater: (it: PlaygroundEquipmentItem) => PlaygroundEquipmentItem,
  ) => void;
}

export const EquipmentItemCard: React.FC<EquipmentItemCardProps> = ({ item, onRemove, onUpdate }) => (
  <div className="p-3 flex flex-col gap-3 border border-slate-100 bg-slate-50/50 rounded-xl">
    <div className="flex items-start gap-3 min-w-0">
      <button
        type="button"
        title={`${item.custom_name?.en || getEquipmentLabel(item.type).en} — hover to see full size`}
        className="group relative shrink-0 inline-flex items-center justify-center w-[50px] h-[50px] rounded-lg border border-slate-200 bg-white hover:border-violet-300 hover:shadow transition"
      >
        <EquipmentIcon type={item.type} size={LIST_ICON_SIZE} />
        <span className="pointer-events-none absolute top-full left-1/2 z-30 hidden group-hover:flex mt-2 -translate-x-1/2 p-2 bg-white border border-slate-300 rounded-xl shadow-xl">
          <EquipmentIcon type={item.type} size={FULL_ICON_SIZE} />
        </span>
      </button>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <span className="text-sm font-bold text-slate-800 truncate">
          {item.custom_name?.en || getEquipmentLabel(item.type).en}
        </span>
        <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-1.5 py-0.5 rounded w-fit">
          {getCategoryLabel(getCategory(item.type)).en}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="text-red-500 hover:text-red-700 font-bold px-1 shrink-0 self-start"
        title="Remove"
      >
        🗑️
      </button>
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <select
        value={item.age_group ?? ''}
        onChange={(e) =>
          onUpdate(item.id, (x) => ({
            ...x,
            age_group: e.target.value ? (e.target.value as AgeGroup) : undefined,
          }))
        }
        className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white min-w-[140px]"
      >
        <option value="">No age group</option>
        {getAgeGroups().map((g) => (
          <option key={g} value={g}>
            {getAgeGroupLabel(g).en}
          </option>
        ))}
      </select>

      <input
        value={item.custom_name?.en ?? ''}
        onChange={(e) =>
          onUpdate(item.id, (x) => ({
            ...x,
            custom_name: { en: e.target.value, pt: x.custom_name?.pt ?? '' },
          }))
        }
        placeholder="Custom name (EN, optional)"
        className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white flex-1 min-w-[140px]"
      />
    </div>
  </div>
);

// --- Addable category group ---
export interface EquipmentCategoryGroupProps {
  category: EquipmentCategoryId;
  matches: EquipmentCatalogEntry[];
  onAdd: (type: EquipmentTypeId) => void;
}

export const EquipmentCategoryGroup: React.FC<EquipmentCategoryGroupProps> = ({
  category,
  matches,
  onAdd,
}) => (
  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
    <div className="text-xs font-extrabold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
      <span>{CATEGORY_EMOJI[category]}</span> {getCategoryLabel(category).en}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {matches.map((entry) => (
        <button
          key={entry.type}
          type="button"
          onClick={() => onAdd(entry.type)}
          title={`Add ${entry.label.en} — hover to see full size`}
          className="group flex items-center gap-2.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition"
        >
          <span className="relative shrink-0 inline-flex items-center justify-center w-[50px] h-[50px]">
            <EquipmentIcon type={entry.type} size={LIST_ICON_SIZE} />
            <span className="pointer-events-none absolute top-full left-1/2 z-30 hidden group-hover:flex mt-2 -translate-x-1/2 p-2 bg-white border border-slate-300 rounded-xl shadow-xl">
              <EquipmentIcon type={entry.type} size={FULL_ICON_SIZE} />
            </span>
          </span>
          <span className="truncate">+ {entry.label.en}</span>
        </button>
      ))}
    </div>
  </div>
);

// --- Add-from-catalog panel (search + grouped buttons) ---
export interface EquipmentAddPanelProps {
  search: string;
  onSearch: (value: string) => void;
  onAdd: (type: EquipmentTypeId) => void;
}

export const EquipmentAddPanel: React.FC<EquipmentAddPanelProps> = ({ search, onSearch, onAdd }) => {
  const catalog = getEquipmentCatalog();
  const trimmed = search.trim();
  const q = trimmed.toLowerCase();

  const matchesFor = (cat: EquipmentCategoryId) =>
    catalog.filter((e) => {
      if (e.category !== cat) return false;
      if (!q) return true;
      return e.label.en.toLowerCase().includes(q) || e.label.pt.toLowerCase().includes(q);
    });

  const hasAnyMatch =
    !q || catalog.some((e) => e.label.en.toLowerCase().includes(q) || e.label.pt.toLowerCase().includes(q));

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-extrabold text-slate-600 uppercase tracking-wide mb-2">
          Add elements
        </h4>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search elements by name…"
          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>

      {getEquipmentCategories().map((cat) => {
        const matches = matchesFor(cat);
        if (matches.length === 0) return null;
        return <EquipmentCategoryGroup key={cat} category={cat} matches={matches} onAdd={onAdd} />;
      })}

      {!hasAnyMatch && (
        <p className="text-xs text-slate-400 italic">No elements match “{trimmed}”.</p>
      )}
    </div>
  );
};


