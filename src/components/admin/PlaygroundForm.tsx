import React, { useState } from 'react';
import type { AgeGroup, Playground } from '../../types/playground';
import { useReferenceData, getAgeGroups, getAgeGroupLabel } from '../../lib/equipment';

interface PlaygroundFormProps {
  initialData?: Partial<Playground>;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const PlaygroundForm: React.FC<PlaygroundFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [nameEn, setNameEn] = useState(initialData?.name?.en || '');
  const [namePt, setNamePt] = useState(initialData?.name?.pt || '');
  const [shortDescEn, setShortDescEn] = useState(initialData?.short_description?.en || '');
  const [shortDescPt, setShortDescPt] = useState(initialData?.short_description?.pt || '');
  const [fullDescEn, setFullDescEn] = useState(initialData?.full_description?.en || '');
  const [fullDescPt, setFullDescPt] = useState(initialData?.full_description?.pt || '');
  const [locationNameEn, setLocationNameEn] = useState(initialData?.location_name?.en || '');
  const [locationNamePt, setLocationNamePt] = useState(initialData?.location_name?.pt || '');
  const [latitude, setLatitude] = useState<number>(initialData?.latitude ?? 39.7436);
  const [longitude, setLongitude] = useState<number>(initialData?.longitude ?? -8.8071);

  // Attributes
  const [shadowCoverageEn, setShadowCoverageEn] = useState(
    initialData?.attributes?.shadow_coverage?.en || 'Medium shade'
  );
  const [shadowCoveragePt, setShadowCoveragePt] = useState(
    initialData?.attributes?.shadow_coverage?.pt || 'Sombra média'
  );
  const [surfaceTempEn, setSurfaceTempEn] = useState(
    initialData?.attributes?.surface_temperature?.en || 'Warm (~28°C)'
  );
  const [surfaceTempPt, setSurfaceTempPt] = useState(
    initialData?.attributes?.surface_temperature?.pt || 'Morno (~28°C)'
  );
  const [ageGroupId, setAgeGroupId] = useState<AgeGroup>(
    initialData?.attributes?.target_age_group?.id ?? 'preschool'
  );

  const [error, setError] = useState<string | null>(null);

  // Reference vocabulary (age groups) — from the DB.
  const { ready: refReady } = useReferenceData();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) {
      setError('English Name is required');
      return;
    }

    try {
      setError(null);
      await onSubmit({
        name: { en: nameEn.trim(), pt: namePt.trim() || nameEn.trim() },
        short_description: { en: shortDescEn.trim(), pt: shortDescPt.trim() || shortDescEn.trim() },
        full_description: { en: fullDescEn.trim(), pt: fullDescPt.trim() || fullDescEn.trim() },
        location_name: { en: locationNameEn.trim(), pt: locationNamePt.trim() || locationNameEn.trim() },
        latitude: Number(latitude),
        longitude: Number(longitude),
        attributes: {
          shadow_coverage: { en: shadowCoverageEn, pt: shadowCoveragePt },
          surface_temperature: { en: surfaceTempEn, pt: surfaceTempPt },
          target_age_group: { id: ageGroupId },
        },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save playground');
    }
  };

  if (!refReady) {
    return (
      <div className="p-16 text-center text-slate-400 text-sm font-medium bg-white rounded-2xl border border-slate-200">
        Loading catalogue...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-sm">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}

      {/* Basic Info Section */}
      <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
          <span>🏷️</span> Basic Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Name (English) *
            </label>
            <input
              type="text"
              required
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Sunrise Meadows Adventure Park"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Name (Portuguese)
            </label>
            <input
              type="text"
              value={namePt}
              onChange={(e) => setNamePt(e.target.value)}
              placeholder="e.g. Parque de Aventuras Sunrise Meadows"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Location Name (English)
            </label>
            <input
              type="text"
              value={locationNameEn}
              onChange={(e) => setLocationNameEn(e.target.value)}
              placeholder="e.g. Leiria Central Park"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Location Name (Portuguese)
            </label>
            <input
              type="text"
              value={locationNamePt}
              onChange={(e) => setLocationNamePt(e.target.value)}
              placeholder="e.g. Parque Central de Leiria"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Short Description (English)
            </label>
            <textarea
              rows={2}
              value={shortDescEn}
              onChange={(e) => setShortDescEn(e.target.value)}
              placeholder="Brief summary for card list..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Short Description (Portuguese)
            </label>
            <textarea
              rows={2}
              value={shortDescPt}
              onChange={(e) => setShortDescPt(e.target.value)}
              placeholder="Resumo breve para cartões..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
            />
          </div>
        </div>
      </div>

      {/* Geolocation Coordinates */}
      <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
          <span>📍</span> Geographic Coordinates (for Solar Shadow Calculation)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Latitude</label>
            <input
              type="number"
              step="0.000001"
              value={latitude}
              onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Longitude</label>
            <input
              type="number"
              step="0.000001"
              value={longitude}
              onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Attributes (Shadow, Temp, Age) */}
      <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
          <span>☀️</span> Playground Attributes (Viewer Badges)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Shadow Coverage */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ☀️ Shade Level
            </label>
            <select
              value={shadowCoverageEn}
              onChange={(e) => {
                const val = e.target.value;
                setShadowCoverageEn(val);
                if (val === 'High shade') setShadowCoveragePt('Sombra alta');
                else if (val === 'Medium shade') setShadowCoveragePt('Sombra média');
                else if (val === 'Low shade') setShadowCoveragePt('Sombra baixa');
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
            >
              <option value="High shade">High shade / Sombra alta</option>
              <option value="Medium shade">Medium shade / Sombra média</option>
              <option value="Low shade">Low shade / Sombra baixa</option>
            </select>
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              🌡️ Surface Temperature
            </label>
            <input
              type="text"
              value={surfaceTempEn}
              onChange={(e) => {
                setSurfaceTempEn(e.target.value);
                setSurfaceTempPt(e.target.value);
              }}
              placeholder="e.g. Cool (~21°C) / Warm (~30°C)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
            />
          </div>

          {/* Age Group */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              👶 Target Age Group
            </label>
            <select
              value={ageGroupId}
              onChange={(e) => setAgeGroupId(e.target.value as AgeGroup)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
            >
              {getAgeGroups().map((id) => (
                <option key={id} value={id}>
                  {getAgeGroupLabel(id).en} / {getAgeGroupLabel(id).pt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-md shadow-blue-500/20 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : initialData?.id ? 'Save Changes' : 'Create Playground'}
        </button>
      </div>
    </form>
  );
};
