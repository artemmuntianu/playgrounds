import React, { useState } from 'react';
import type {
  AgeGroup,
  EquipmentCategoryId,
  EquipmentTypeId,
  PlaygroundEquipmentItem,
} from '../../types/playground';
import {
  AGE_GROUPS,
  AGE_GROUP_LABELS,
  EQUIPMENT_CATALOG,
  getCategory,
  getEquipmentLabel,
} from '../../lib/equipmentCatalog';
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
};

export const EquipmentEditor: React.FC<EquipmentEditorProps> = ({
  playgroundId,
  initialEquipment,
  onUpdated,
}) => {
  const [equipment, setEquipment] = useState<PlaygroundEquipmentItem[]>(initialEquipment);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const mutate = (updater: (prev: PlaygroundEquipmentItem[]) => PlaygroundEquipmentItem[]) => {
    setEquipment(updater);
    setDirty(true);
    setSaved(false);
  };

  const addItem = (type: EquipmentTypeId) => {
    const defaultAge = EQUIPMENT_CATALOG.find((e) => e.type === type)?.defaultAgeGroup;
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

      {/* Add from catalog, grouped by category */}
      <div className="space-y-4">
        {CATEGORIES.map((cat) => (
          <div key={cat} className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="text-xs font-extrabold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <span>{CATEGORY_EMOJI[cat]}</span> {cat}
            </div>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_CATALOG.filter((e) => e.category === cat).map((entry) => (
                <button
                  key={entry.type}
                  type="button"
                  onClick={() => addItem(entry.type)}
                  className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition"
                >
                  + {entry.label.en}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Existing equipment list */}
      {equipment.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 text-xs font-extrabold text-slate-600 uppercase tracking-wide">
            Current elements
          </div>
          <div className="divide-y divide-slate-100">
            {equipment.map((it) => (
              <div key={it.id} className="p-3 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-lg">{CATEGORY_EMOJI[getCategory(it.type)]}</span>
                  <span className="text-sm font-bold text-slate-800 truncate">
                    {getEquipmentLabel(it.type).en}
                  </span>
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
                    {AGE_GROUPS.map((g) => (
                      <option key={g} value={g}>{AGE_GROUP_LABELS[g].en}</option>
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
                    className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white w-44"
                  />

                  <button
                    type="button"
                    onClick={() => removeItem(it.id)}
                    className="text-red-500 hover:text-red-700 font-bold px-2"
                    title="Remove"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {equipment.length === 0 && (
        <p className="text-xs text-slate-400 italic">
          No elements added yet — use the buttons above to add playground equipment.
        </p>
      )}
    </div>
  );
};
