import React, { useState, useEffect } from 'react';
import type { Playground, PlaygroundEquipmentItem } from '../../types/playground';
import { fetchPlayground, updateEquipmentApi } from '../../lib/api';
import { EquipmentMarkerCanvas } from '../annotation/EquipmentMarkerCanvas';
import type { EquipmentMarkerDisplay } from '../viewer/ViewerShadowCanvas';
import { useReferenceData, getCategory, getEquipmentLabel, getCategoryLabel, getEquipmentIcon } from '../../lib/equipment';
import { EquipmentIcon } from '../EquipmentIcon';

interface EquipmentMarkerPageProps {
  playgroundId: string;
}

export const EquipmentMarkerPage: React.FC<EquipmentMarkerPageProps> = ({ playgroundId }) => {
  const [playground, setPlayground] = useState<Playground | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activePhotoId, setActivePhotoId] = useState<string>('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');
  const [equipment, setEquipment] = useState<PlaygroundEquipmentItem[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Reference vocabulary (equipment catalog) — from the DB.
  const { ready: refReady } = useReferenceData();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const pg = await fetchPlayground(playgroundId);
        setPlayground(pg);
        setEquipment(pg.equipment);
        const shadow = pg.photos.filter((p) => !p.is_additional);
        const first = pg.photos.find((p) => p.id === pg.thumbnail_photo_id) || shadow[0] || pg.photos[0];
        setActivePhotoId(first?.id ?? '');
      } catch (err: any) {
        setError(err.message || 'Failed to load playground');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [playgroundId]);

  const shadowPhotos = playground?.photos.filter((p) => !p.is_additional) ?? [];
  const activePhoto = playground?.photos.find((p) => p.id === activePhotoId);

  const activeMarkers: EquipmentMarkerDisplay[] = activePhotoId
    ? equipment.flatMap((item) =>
        item.markers
          .filter((m) => m.photo_id === activePhotoId)
          .map((m) => ({
            x: m.x,
            y: m.y,
            label: item.custom_name?.en || getEquipmentLabel(item.type).en,
            category: getCategory(item.type),
            icon: getEquipmentIcon(item.type),
          })),
      )
    : [];

  const selectable = Boolean(activePhotoId && selectedEquipmentId);

  const updateItem = (
    equipmentId: string,
    updater: (it: PlaygroundEquipmentItem) => PlaygroundEquipmentItem,
  ) => {
    setEquipment((prev) => prev.map((it) => (it.id === equipmentId ? updater(it) : it)));
    setDirty(true);
    setSaved(false);
  };

  const handlePlaceMarker = (x: number, y: number) => {
    if (!activePhotoId || !selectedEquipmentId) return;
    updateItem(selectedEquipmentId, (it) => ({
      ...it,
      markers: [...it.markers, { photo_id: activePhotoId, x, y }],
    }));
  };

  const handleRemoveLastMarker = () => {
    if (!activePhotoId || !selectedEquipmentId) return;
    updateItem(selectedEquipmentId, (it) => {
      const filtered = [...it.markers];
      for (let i = filtered.length - 1; i >= 0; i--) {
        if (filtered[i].photo_id === activePhotoId) {
          filtered.splice(i, 1);
          break;
        }
      }
      return { ...it, markers: filtered };
    });
  };

  const handleSave = async () => {
    if (!playground) return;
    setSaving(true);
    try {
      await updateEquipmentApi(playground.id, equipment);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const imageUrl = activePhoto ? `/api/playgrounds/${playgroundId}/photo/${activePhoto.filename}` : '';

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400 text-sm font-medium bg-white rounded-2xl border border-slate-200">
        Loading equipment marker workspace...
      </div>
    );
  }

  if (error || !playground) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-semibold space-y-4">
        <div>⚠️ {error || 'Playground not found'}</div>
        <a href={`/admin/${playgroundId}`} className="inline-block px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold">
          ← Return to Playground
        </a>
      </div>
    );
  }

  if (!refReady) {
    return (
      <div className="p-16 text-center text-slate-400 text-sm font-medium bg-white rounded-2xl border border-slate-200">
        Loading catalogue...
      </div>
    );
  }

  const selectedItem = equipment.find((it) => it.id === selectedEquipmentId);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <a href={`/admin/${playgroundId}`} className="text-xs text-blue-600 font-bold hover:underline">
            ← Back to {playground.name.en}
          </a>
          <h2 className="text-xl font-black text-slate-800 tracking-tight mt-1">Equipment Markers</h2>
          <p className="text-xs text-slate-500">
            Select an element, then click on a photo to place a dot-marker for it. Save when finished.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow disabled:opacity-50"
        >
          {saving ? 'Saving...' : saved ? '✅ Saved' : '💾 Save Markers'}
        </button>
      </div>

      {(dirty || saved) && (
        <div className={`p-3 rounded-xl text-xs font-bold ${saved ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
          {saved ? '✅ Markers saved' : '⚠️ Unsaved changes — click Save Markers'}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Photos:</span>
            {(shadowPhotos.length ? shadowPhotos : playground.photos).map((photo) => {
              const ts = `/api/playgrounds/${playgroundId}/photo/${photo.filename}`;
              const active = activePhotoId === photo.id;
              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setActivePhotoId(photo.id)}
                  className={`relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition ${
                    active ? 'border-violet-500 ring-2 ring-violet-500/30' : 'border-slate-200 opacity-80 hover:opacity-100'
                  }`}
                >
                  <img src={ts} alt={photo.id} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-slate-950/60 text-white text-[9px] font-mono text-center leading-tight py-0.5">
                    {photo.is_additional ? '🖼️' : '☀️'}
                  </div>
                </button>
              );
            })}
          </div>

          {activePhoto ? (
            <EquipmentMarkerCanvas
              imageUrl={imageUrl}
              markers={activeMarkers}
              onPlaceMarker={handlePlaceMarker}
              selectable={selectable}
            />
          ) : (
            <div className="w-full aspect-[4/3] flex items-center justify-center text-slate-400 bg-white rounded-xl border border-slate-200">
              No photo available
            </div>
          )}
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
            Elements ({equipment.length})
          </h3>
          {equipment.length === 0 ? (
            <a href={`/admin/${playgroundId}`} className="text-xs text-violet-700 font-bold hover:underline">
              ← Add elements in the editor first
            </a>
          ) : (
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {equipment.map((it) => {
                const onPhoto = it.markers.filter((m) => m.photo_id === activePhotoId).length;
                const active = selectedEquipmentId === it.id;
                return (
                  <div
                    key={it.id}
                    onClick={() => setSelectedEquipmentId(it.id)}
                    className={`flex items-center justify-between p-2 text-xs border rounded-lg cursor-pointer transition ${
                      active
                        ? 'ring-2 ring-violet-400 border-violet-300 bg-violet-50'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <EquipmentIcon type={it.type} size={16} />
                      <span className="truncate">
                        <span className="font-bold text-slate-800">{it.custom_name?.en || getEquipmentLabel(it.type).en}</span>
                        <span className="ml-1.5 text-slate-400">({getCategoryLabel(getCategory(it.type)).en})</span>
                        <span className="ml-1.5 text-slate-500">• {onPhoto} marker{onPhoto !== 1 ? 's' : ''}</span>
                      </span>
                    </span>
                    {active && <span className="text-violet-600 font-bold text-sm">✏️</span>}
                  </div>
                );
              })}
            </div>
          )}

          {selectedItem && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">
                Selected: <strong>{selectedItem.custom_name?.en || getEquipmentLabel(selectedItem.type).en}</strong>
              </span>
              <button
                type="button"
                onClick={handleRemoveLastMarker}
                className="text-[11px] font-bold text-red-600 hover:underline"
              >
                Undo last marker
              </button>
            </div>
          )}
          {!selectable && equipment.length > 0 && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              Select an element above to start placing markers.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};


