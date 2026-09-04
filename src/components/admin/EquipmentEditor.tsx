import React, { useState } from 'react';
import type { EquipmentTypeId, PlaygroundEquipmentItem } from '../../types/playground';
import { useReferenceData, getEquipmentCatalog } from '../../lib/equipment';
import { updateEquipmentApi } from '../../lib/api';
import {
  EquipmentEditorHeader,
  EquipmentEditorStatus,
  EquipmentItemCard,
  EquipmentAddPanel,
} from './EquipmentEditorParts';

interface EquipmentEditorProps {
  playgroundId: string;
  initialEquipment: PlaygroundEquipmentItem[];
  onUpdated?: (equipment: PlaygroundEquipmentItem[]) => void;
}

type EquipmentUpdater = (prev: PlaygroundEquipmentItem[]) => PlaygroundEquipmentItem[];

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

  const mutate = (updater: EquipmentUpdater) => {
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
      <EquipmentEditorHeader
        count={equipment.length}
        playgroundId={playgroundId}
        dirty={dirty}
        saving={saving}
        saved={saved}
        onSave={handleSave}
      />

      <EquipmentEditorStatus dirty={dirty} saved={saved} />

      {equipment.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-visible">
          <div className="px-4 py-2.5 border-b border-slate-100 text-xs font-extrabold text-slate-600 uppercase tracking-wide">
            Current elements
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3">
            {equipment.map((it) => (
              <EquipmentItemCard key={it.id} item={it} onRemove={removeItem} onUpdate={updateItem} />
            ))}
          </div>
        </div>
      )}

      {equipment.length === 0 && (
        <p className="text-xs text-slate-400 italic">
          No elements added yet — use the buttons below to add playground equipment.
        </p>
      )}

      <EquipmentAddPanel search={search} onSearch={setSearch} onAdd={addItem} />
    </div>
  );
};
