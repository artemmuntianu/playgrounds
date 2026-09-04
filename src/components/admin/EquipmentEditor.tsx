import React, { useState } from 'react';
import type {
  AgeGroup,
  EquipmentCategoryId,
  EquipmentTypeId,
  PlaygroundEquipmentItem,
} from '../../types/playground';
import {
  useReferenceData,
  getAgeGroups,
  getAgeGroupLabel,
  getEquipmentCatalog,
  getEquipmentCategories,
  getCategory,
  getCategoryLabel,
  getEquipmentLabel,
} from '../../lib/equipment';
import { EquipmentIcon } from '../EquipmentIcon';
import { updateEquipmentApi } from '../../lib/api';

interface EquipmentEditorProps {
  playgroundId: string;
  initialEquipment: PlaygroundEquipmentItem[];
  onUpdated?: (equipment: PlaygroundEquipmentItem[]) => void;
}

const CATEGORIES: EquipmentCategoryId[] = ['ride_balance', 'sport_complex', 'development', 'rest'];

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

export const EquipmentEditor: React.FC<EquipmentEditorProps> = ({
  playgroundId,
  initialEquipment,
  onUpdated,
}) => {
  const [equipment, setEquipment] = useState<PlaygroundEquipmentItem[]>(initialEquipment);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState('');

  // Reference vocabulary (catalogue) — from the DB.
  const { ready: refReady } = useReferenceData();

  const mutate = (updater: (prev: PlaygroundEquipmentItem[]) => PlaygroundEquipmentItem[]) => {
    setEquipment(updater);
    setDirty(true);
    setSaved(false);
  };

  const addItem = (type: EquipmentTypeId) => {
    const defaultAge = getEquipmentCatalog().find((e) => e.type === type)?.defaultAgeGroup;
    mutate((prev) => [
      ...prev,
      { id: `${type}_${Date.now()}`, type, age_group: defaultAge ?? undefined, markers: [] },
    ]);
  };

  const updateItem = (
    id: string,
    updater: (it: PlaygroundEquipmentItem) => PlaygroundEquipmentItem,
  ) => {
    mutate((prev) => prev.map((it) => (it.id === id ? updater(it) : it)));
  };

  const removeItem = (id: string) => {
    mutate((prev) => prev.filter((it) => it.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateEquipmentApi(playgroundId, equipment);
      setDirty(false);
      setSaved(true);
      onUpdated?.(equipment);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!refReady) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm font-medium bg-white rounded-2xl border border-slate-200">
        Loading catalogue...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
            <span>🧩</span> Playground Elements ({equipment.length})
          </h3>
          <p className="text-xs text-slate-500">
            List the equipment present on this playground, optionally pick an age group, then mark them on photos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {equipment.length > 0 ? (
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
            onClick={handleSave}
            disabled={!dirty || saving}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow disabled:opacity-50"
          >
            {saving ? 'Saving...' : saved ? '✅ Saved' : '💾 Save'}
          </button>
        </div>
      </div>

      {(dirty || saved) && (
        <div className={`p-3 rounded-xl text-xs font-bold ${saved ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
          {saved ? '✅ Elements saved' : '⚠️ Unsaved changes — click Save'}
        </div>
      )}

      {/* Existing equipment list */}
      {equipment.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-visible">
          <div className="px-4 py-2.5 border-b border-slate-100 text-xs font-extrabold text-slate-600 uppercase tracking-wide">
            Current elements
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3">
            {equipment.map((it) => (
              <div
                key={it.id}
                className="p-3 flex flex-col gap-3 border border-slate-100 bg-slate-50/50 rounded-xl"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    type="button"
                    title={`${it.custom_name?.en || getEquipmentLabel(it.type).en} — hover to see full size`}
                    className="group relative shrink-0 inline-flex items-center justify-center w-[50px] h-[50px] rounded-lg border border-slate-200 bg-white hover:border-violet-300 hover:shadow transition"
                  >
                    <EquipmentIcon type={it.type} size={LIST_ICON_SIZE} />
                    <span className="pointer-events-none absolute top-full left-1/2 z-30 hidden group-hover:flex mt-2 -translate-x-1/2 p-2 bg-white border border-slate-300 rounded-xl shadow-xl">
                      <EquipmentIcon type={it.type} size={FULL_ICON_SIZE} />
                    </span>
                  </button>

                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <span className="text-sm font-bold text-slate-800 truncate">
                      {it.custom_name?.en || getEquipmentLabel(it.type).en}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                      {getCategoryLabel(getCategory(it.type)).en}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(it.id)}
                    className="text-red-500 hover:text-red-700 font-bold px-1 shrink-0 self-start"
                    title="Remove"
                  >
                    🗑️
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={it.age_group ?? ''}
                    onChange={(e) =>
                      updateItem(it.id, (x) => ({
                        ...x,
                        age_group: e.target.value ? (e.target.value as AgeGroup) : undefined,
                      }))
                    }
                    className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white min-w-[140px]"
                  >
                    <option value="">No age group</option>
                    {getAgeGroups().map((g) => (
                      <option key={g} value={g}>{getAgeGroupLabel(g).en}</option>
                    ))}
                  </select>

                  <input
                    value={it.custom_name?.en ?? ''}
                    onChange={(e) =>
                      updateItem(it.id, (x) => ({
                        ...x,
                        custom_name: { en: e.target.value, pt: x.custom_name?.pt ?? '' },
                      }))
                    }
                    placeholder="Custom name (EN, optional)"
                    className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white flex-1 min-w-[140px]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {equipment.length === 0 && (
        <p className="text-xs text-slate-400 italic">
          No elements added yet — use the buttons below to add playground equipment.
        </p>
      )}

      {/* Add from catalog, grouped by category */}
      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-extrabold text-slate-600 uppercase tracking-wide mb-2">
            Add elements
          </h4>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search elements by name…"
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

        {getEquipmentCategories().map((cat) => {
          const matches = getEquipmentCatalog().filter((e) => {
            if (e.category !== cat) return false;
            if (!search.trim()) return true;
            const q = search.trim().toLowerCase();
            return (
              e.label.en.toLowerCase().includes(q) ||
              e.label.pt.toLowerCase().includes(q)
            );
          });
          if (matches.length === 0) return null;
          return (
            <div key={cat} className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-xs font-extrabold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <span>{CATEGORY_EMOJI[cat]}</span> {getCategoryLabel(cat).en}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {matches.map((entry) => (
                  <button
                    key={entry.type}
                    type="button"
                    onClick={() => addItem(entry.type)}
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
        })}

        {search.trim() && getEquipmentCatalog().filter((e) => {
          const q = search.trim().toLowerCase();
          return e.label.en.toLowerCase().includes(q) || e.label.pt.toLowerCase().includes(q);
        }).length === 0 && (
          <p className="text-xs text-slate-400 italic">
            No elements match “{search.trim()}”.
          </p>
        )}
      </div>
    </div>
  );
};
