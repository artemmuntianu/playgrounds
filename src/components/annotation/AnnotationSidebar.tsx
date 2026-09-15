import React from 'react';
import type { Annotation } from '../../types/shadow';
import type { AnnotationCategory } from './types';
import { AddAnnotationForm } from './AddAnnotationForm';
import { SceneMetaCard } from './SceneMetaCard';
import { SelectedAnnotationEditor } from './SelectedAnnotationEditor';

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
  objectDepthCm: number;
  setObjectDepthCm: (v: number) => void;
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
  handleUpdateAnnotation: (id: string, patch: Partial<Annotation>) => void;
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
  objectDepthCm,
  setObjectDepthCm,
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
  handleUpdateAnnotation,
  handleExportScene,
}) => {
  const selectedAnnotation = annotations.find((a) => a.id === selectedAnnotationId) ?? null;

  return (
    <div className="w-full lg:w-80 flex flex-col gap-4">
      {/* Form Card */}
      {showForm && (
        <AddAnnotationForm
          isOffscreen={isOffscreen}
          formError={formError}
          objectId={objectId}
          setObjectId={setObjectId}
          category={category}
          setCategory={setCategory}
          objectDepthCm={objectDepthCm}
          setObjectDepthCm={setObjectDepthCm}
          canopyOpacity={canopyOpacity}
          setCanopyOpacity={setCanopyOpacity}
          onSubmit={handleAddAnnotation}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Scene Meta & Camera Orientation */}
      <SceneMetaCard
        sceneId={sceneId}
        setSceneId={setSceneId}
        cameraAzimuth={cameraAzimuth}
        setCameraAzimuth={setCameraAzimuth}
        cameraFov={cameraFov}
        setCameraFov={setCameraFov}
        horizonY={horizonY}
        setHorizonY={setHorizonY}
        sunLightStrength={sunLightStrength}
        setSunLightStrength={setSunLightStrength}
        sunSkyGlow={sunSkyGlow}
        setSunSkyGlow={setSunSkyGlow}
      />

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
                  {(ann.depth_cm ?? 0) > 0 && (
                    <span className="ml-1.5 px-1 py-0.2 text-[9px] bg-sky-100 text-sky-700 rounded font-bold">
                      {Math.round(ann.depth_cm ?? 0)} cm deep
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

      {/* Editor for the selected object: depth (volume) + opacity of an already-drawn polygon */}
      {selectedAnnotation && (
        <SelectedAnnotationEditor
          annotation={selectedAnnotation}
          onChange={(patch) => handleUpdateAnnotation(selectedAnnotation.id, patch)}
          onClose={() => setSelectedAnnotationId(null)}
        />
      )}

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

