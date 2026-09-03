import React from 'react';
import type { Annotation } from '../../types/shadow';
import type { AnnotationCategory } from './types';

interface AnnotationSidebarProps {
  showForm: boolean;
  isOffscreen: boolean;
  formError: string | null;
  objectId: string;
  setObjectId: (v: string) => void;
  category: AnnotationCategory;
  setCategory: (c: AnnotationCategory) => void;
  canopyOpacity: number;
  setCanopyOpacity: (v: number) => void;
  handleAddAnnotation: (e: React.FormEvent) => void;
  setShowForm: (v: boolean) => void;
  sceneId: string;
  setSceneId: (v: string) => void;
  cameraAzimuth: number;
  setCameraAzimuth: (v: number) => void;
  cameraFov: number;
  setCameraFov: (v: number) => void;
  horizonY: number;
  setHorizonY: (v: number) => void;
  sunLightStrength: number;
  setSunLightStrength: (v: number) => void;
  sunSkyGlow: number;
  setSunSkyGlow: (v: number) => void;
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  setSelectedAnnotationId: React.Dispatch<React.SetStateAction<string | null>>;
  handleDeleteAnnotation: (id: string) => void;
  handleExportScene: () => void;
}

export const AnnotationSidebar: React.FC<AnnotationSidebarProps> = ({
  showForm,
  isOffscreen,
  formError,
  objectId,
  setObjectId,
  category,
  setCategory,
  canopyOpacity,
  setCanopyOpacity,
  handleAddAnnotation,
  setShowForm,
  sceneId,
  setSceneId,
  cameraAzimuth,
  setCameraAzimuth,
  cameraFov,
  setCameraFov,
  horizonY,
  setHorizonY,
  sunLightStrength,
  setSunLightStrength,
  sunSkyGlow,
  setSunSkyGlow,
  annotations,
  selectedAnnotationId,
  setSelectedAnnotationId,
  handleDeleteAnnotation,
  handleExportScene,
}) => {
  return (
    <div className="w-full lg:w-80 flex flex-col gap-4">
      {/* Form Card */}
      {showForm && (
        <form
          onSubmit={handleAddAnnotation}
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
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Scene Meta & Camera Orientation */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
        <h3 className="font-bold text-gray-800 text-sm">Camera & Scene Meta</h3>
        <div>
          <label className="block text-xs font-semibold text-gray-600">Scene ID</label>
          <input
            type="text"
            value={sceneId}
            onChange={(e) => setSceneId(e.target.value)}
            className="w-full mt-1 px-2.5 py-1 text-sm border border-gray-300 rounded"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-600" title="Direction photo is facing (0°=North, 90°=East, 180°=South, 270°=West)">
              Camera Facing (°):
            </label>
            <input
              type="number"
              min="0"
              max="360"
              value={cameraAzimuth}
              onChange={(e) => setCameraAzimuth(Number(e.target.value))}
              className="w-full mt-1 px-2.5 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600" title="Horizontal lens angle of view in degrees">
              Lens FOV (°):
            </label>
            <input
              type="number"
              min="30"
              max="120"
              value={cameraFov}
              onChange={(e) => setCameraFov(Number(e.target.value))}
              className="w-full mt-1 px-2.5 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600" title="Y-coordinate of the horizon line in pixels">
            Horizon Line (px):
          </label>
          <input
            type="number"
            min="0"
            max="2000"
            value={horizonY}
            onChange={(e) => setHorizonY(Number(e.target.value))}
            className="w-full mt-1 px-2.5 py-1 text-sm border border-gray-300 rounded"
          />
        </div>

        {/* Lighting tuning knobs (override per-photo for photos with different base brightness) */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label
              className="block text-xs font-semibold text-gray-600"
              title="Overall sun-light strength (0..1). Lower it if the photo renders too bright / washed out."
            >
              Sun Light:
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={sunLightStrength}
              onChange={(e) => setSunLightStrength(Number(e.target.value))}
              className="w-full mt-1 accent-indigo-600"
            />
            <div className="text-[10px] text-gray-500 text-right">{sunLightStrength.toFixed(2)}</div>
          </div>
          <div>
            <label
              className="block text-xs font-semibold text-gray-600"
              title="Peak sun glow in the sky (0..1). Lower it to tame a white hotspot around the sun."
            >
              Sky Glow:
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={sunSkyGlow}
              onChange={(e) => setSunSkyGlow(Number(e.target.value))}
              className="w-full mt-1 accent-indigo-600"
            />
            <div className="text-[10px] text-gray-500 text-right">{sunSkyGlow.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Objects List */}
      <div className="flex-1 p-4 bg-gray-50 border border-gray-200 rounded-lg flex flex-col min-h-[200px]">
        <h3 className="font-bold text-gray-800 text-sm mb-1">
          Annotated Objects ({annotations.length})
        </h3>
        <p className="text-[10px] text-gray-500 mb-2">
          Select an object, then <strong>Set Ground Projections</strong> to mark the ground point below each of its vertices (for slanted/open structures).
        </p>

        {annotations.length === 0 ? (
          <p className="text-xs text-gray-500 italic my-auto text-center">
            No objects added yet. Draw inside or outside the photo frame to start.
          </p>
        ) : (
          <div className="space-y-2 overflow-y-auto max-h-[250px] pr-1">
            {annotations.map((ann, i) => (
              <div
                key={ann.id}
                onClick={() =>
                  setSelectedAnnotationId((prev) => (prev === ann.id ? null : ann.id))
                }
                className={`flex items-center justify-between p-2 text-xs border rounded shadow-sm cursor-pointer ${
                  selectedAnnotationId === ann.id
                    ? 'ring-2 ring-emerald-400 border-emerald-300 bg-emerald-50'
                    : ann.is_offscreen
                      ? 'bg-amber-50/70 border-amber-200'
                      : 'bg-white border-gray-200'
                }`}
              >
                <div>
                  <span className="font-bold text-gray-800">
                    {i + 1}. {ann.id}
                  </span>
                  <span className="ml-1 text-gray-500">
                    ({ann.category})
                  </span>
                  {ann.ground_projection_coordinates &&
                    ann.ground_projection_coordinates.length === ann.polygon_coordinates.length && (
                      <span className="ml-1.5 px-1 py-0.2 text-[9px] bg-emerald-100 text-emerald-700 rounded font-bold">
                        ground proj
                      </span>
                    )}
                  {ann.is_offscreen && (
                    <span className="ml-1.5 px-1 py-0.2 text-[9px] bg-amber-200 text-amber-900 rounded font-bold">
                      Off-screen
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteAnnotation(ann.id);
                  }}
                  className="text-red-500 hover:text-red-700 font-bold ml-2 px-1.5 py-0.5 rounded hover:bg-red-50"
                  title="Delete Object"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save/Next Button */}
      <button
        type="button"
        disabled={annotations.length === 0}
        onClick={handleExportScene}
        className="w-full py-3 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow transition"
      >
        Save & Proceed to Preview →
      </button>
    </div>
  );
};

