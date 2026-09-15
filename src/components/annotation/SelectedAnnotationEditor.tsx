import React from 'react';
import type { Annotation } from '../../types/shadow';
import { SHADOW_CONFIG, clampObjectDepthCm } from '../../lib/environmentConfig';

interface SelectedAnnotationEditorProps {
  annotation: Annotation;
  onChange: (patch: Partial<Annotation>) => void;
  onClose: () => void;
}

/**
 * Editor for an already-drawn shadow-casting object.
 *
 * Everything the operator can tune after the polygon exists lives here — most importantly the
 * object's real depth (`depth_cm`), which the engine turns into the volume that casts the shadow
 * (see `projectShadowPolygons` in lib/shadowProjection.ts). Keeping it in its own component holds
 * `AnnotationSidebar` below the 250-line budget.
 */
export const SelectedAnnotationEditor: React.FC<SelectedAnnotationEditorProps> = ({
  annotation,
  onChange,
  onClose,
}) => {
  const depthCm = clampObjectDepthCm(annotation.depth_cm ?? 0);
  const rawOpacity = Number(annotation.canopy_opacity);
  const opacity = Number.isFinite(rawOpacity) ? Math.min(1, Math.max(0, rawOpacity)) : 0.85;

  return (
    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-emerald-900 text-sm">Edit Selected Object</h3>
          <p className="text-[10px] font-mono text-emerald-700 truncate">
            {annotation.id} · {annotation.category}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-1.5 py-0.5 text-xs font-bold text-emerald-700 rounded hover:text-emerald-900 hover:bg-emerald-100"
          title="Deselect object"
        >
          ✕
        </button>
      </div>

      <div>
        <label
          className="block text-xs font-semibold text-gray-700"
          title="How deep the object is along the camera's view axis. The engine extrudes the drawn polygon by this depth and casts the shadow of the resulting volume."
        >
          Depth (cm): {depthCm}
        </label>
        <div className="flex items-center gap-2 mt-1">
          <input
            type="range"
            min="0"
            max="500"
            step="5"
            value={Math.min(depthCm, 500)}
            onChange={(e) => onChange({ depth_cm: clampObjectDepthCm(Number(e.target.value)) })}
            className="flex-1 accent-emerald-600"
          />
          <input
            type="number"
            min="0"
            max={SHADOW_CONFIG.maxObjectDepthCm}
            step="5"
            value={depthCm}
            onChange={(e) => onChange({ depth_cm: clampObjectDepthCm(Number(e.target.value)) })}
            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
          />
        </div>
        <p className="text-[10px] text-gray-500 mt-1">
          Distance the object extends away from the camera. 0 = flat cutout: the shadow has no
          thickness.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700">
          Canopy Opacity: {(opacity * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="0.1"
          max="1.0"
          step="0.05"
          value={opacity}
          onChange={(e) => onChange({ canopy_opacity: parseFloat(e.target.value) })}
          className="w-full mt-1"
        />
      </div>
    </div>
  );
};
