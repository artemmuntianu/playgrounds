import React from 'react';
import type { AnnotationCategory } from './types';
import { SHADOW_CONFIG } from '../../lib/environmentConfig';

interface AddAnnotationFormProps {
  isOffscreen: boolean;
  formError: string | null;
  objectId: string;
  setObjectId: (v: string) => void;
  category: AnnotationCategory;
  setCategory: (c: AnnotationCategory) => void;
  objectDepthCm: number;
  setObjectDepthCm: (v: number) => void;
  canopyOpacity: number;
  setCanopyOpacity: (v: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

/**
 * "Add Shadow-Casting Object" card: the last step after drawing a polygon (Object ID, category, the
 * real depth of the volume whose shadow is cast, canopy opacity).
 *
 * Extracted from `AnnotationSidebar` to stay inside the 250-line budget. All state lives in
 * `useAnnotationTool`; this component is the form markup + submit hook-up only.
 */
export const AddAnnotationForm: React.FC<AddAnnotationFormProps> = ({
  isOffscreen,
  formError,
  objectId,
  setObjectId,
  category,
  setCategory,
  objectDepthCm,
  setObjectDepthCm,
  canopyOpacity,
  setCanopyOpacity,
  onSubmit,
  onCancel,
}) => {
  return (
    <form
      onSubmit={onSubmit}
      className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg space-y-3 shadow-md"
    >
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-indigo-900 text-sm">Add Shadow-Casting Object</h3>
        {isOffscreen && (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-200 text-amber-800 rounded">
            Off-Screen Object
          </span>
        )}
      </div>

      {formError && (
        <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
          {formError}
        </p>
      )}

      <div>
        <label className="block text-xs font-semibold text-gray-700">Object ID</label>
        <input
          type="text"
          value={objectId}
          onChange={(e) => setObjectId(e.target.value)}
          className="w-full mt-1 px-2.5 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. tree_outside_top"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700">Category</label>
        <select
          value={category}
          onChange={(e) =>
            setCategory(e.target.value as AnnotationCategory)
          }
          className="w-full mt-1 px-2.5 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
        >
          <option value="tree">Tree</option>
          <option value="structure">Structure (Slide, Climber)</option>
          <option value="building">Building</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label
          className="block text-xs font-semibold text-gray-700"
          title="How deep the object is along the camera's view axis. The engine extrudes the drawn polygon by this depth and casts the shadow of the resulting volume."
        >
          Depth (cm)
        </label>
        <input
          type="number"
          min="0"
          max={SHADOW_CONFIG.maxObjectDepthCm}
          step="5"
          value={objectDepthCm}
          onChange={(e) => setObjectDepthCm(Number(e.target.value))}
          className="w-full mt-1 px-2.5 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-[10px] text-gray-500 mt-1">
          How far the object extends away from the camera. 0 cm = flat cutout (no shadow
          thickness). Editable later via the object list.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700">
          Canopy Opacity: {(canopyOpacity * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="0.1"
          max="1.0"
          step="0.05"
          value={canopyOpacity}
          onChange={(e) => setCanopyOpacity(parseFloat(e.target.value))}
          className="w-full mt-1"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="flex-1 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700 transition"
        >
          Add to Scene
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-200 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
