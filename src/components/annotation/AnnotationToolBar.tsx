import React from 'react';
import type { Annotation, Point2D } from '../../types/shadow';
import type { AnnotationMode } from './types';

interface AnnotationToolBarProps {
  mode: AnnotationMode;
  activePolygon: Point2D[];
  setMode: React.Dispatch<React.SetStateAction<AnnotationMode>>;
  setActivePolygon: React.Dispatch<React.SetStateAction<Point2D[]>>;
  selectedAnnotationId: string | null;
  activeGroundBases: Point2D[];
  setActiveGroundBases: React.Dispatch<React.SetStateAction<Point2D[]>>;
  annotations: Annotation[];
  handleFinishObject: () => void;
  handleAddOffscreenPreset: (position: 'top' | 'left' | 'right') => void;
}

export const AnnotationToolBar: React.FC<AnnotationToolBarProps> = ({
  mode,
  activePolygon,
  setMode,
  setActivePolygon,
  selectedAnnotationId,
  activeGroundBases,
  setActiveGroundBases,
  annotations,
  handleFinishObject,
  handleAddOffscreenPreset,
}) => {
  return (
    <div className="flex flex-wrap gap-2 mb-3 w-full justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setMode('drawing');
            setActivePolygon([]);
          }}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
            mode === 'drawing'
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
          }`}
        >
          {mode === 'drawing' ? '📍 Click anywhere (even outside photo)...' : '✏️ Draw Polygon'}
        </button>

        <button
          type="button"
          onClick={() => setMode('setting_anchor')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
            mode === 'setting_anchor'
              ? 'bg-green-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
          }`}
        >
          🎯 Set Ground Anchor
        </button>

        <button
          type="button"
          onClick={() => setMode('setting_horizon')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
            mode === 'setting_horizon'
              ? 'bg-red-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
          }`}
        >
          🌅 {mode === 'setting_horizon' ? 'Click/Drag vertically to set horizon' : 'Set Horizon Line'}
        </button>

        <button
          type="button"
          disabled={activePolygon.length < 3}
          onClick={handleFinishObject}
          className="px-3 py-1.5 text-xs font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          ✅ Finish Object ({activePolygon.length} pts)
        </button>
        <button
          type="button"
          disabled={!selectedAnnotationId}
          onClick={() => {
            if (!selectedAnnotationId) return;
            if (mode === 'ground_bases') {
              setMode('idle');
              setActiveGroundBases([]);
              return;
            }
            setActiveGroundBases([]);
            setMode('ground_bases');
          }}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
            mode === 'ground_bases'
              ? 'bg-emerald-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
          }`}
          title="Select an object in the list, then click its vertices' ground points (one per silhouette vertex). Fixes shadows for slanted/open structures such as swing legs and bars."
        >
          {mode === 'ground_bases'
            ? `Ground pt ${activeGroundBases.length}/${annotations.find((a) => a.id === selectedAnnotationId)?.polygon_coordinates.length ?? 0}`
            : 'Set Ground Projections'}
        </button>

      </div>

      {/* Quick Presets for Off-Screen Shadow Casters */}
      <div className="flex items-center gap-1.5 pt-1 md:pt-0">
        <span className="text-xs font-bold text-gray-500">Off-Screen Presets:</span>
        <button
          type="button"
          onClick={() => handleAddOffscreenPreset('top')}
          className="px-2 py-1 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300 rounded hover:bg-amber-100"
          title="Add 10m tree above photo frame"
        >
          🌲 Top Tree
        </button>
        <button
          type="button"
          onClick={() => handleAddOffscreenPreset('left')}
          className="px-2 py-1 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300 rounded hover:bg-amber-100"
          title="Add 10m tree to left of photo frame"
        >
          🌲 Left Tree
        </button>
        <button
          type="button"
          onClick={() => handleAddOffscreenPreset('right')}
          className="px-2 py-1 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300 rounded hover:bg-amber-100"
          title="Add 10m tree to right of photo frame"
        >
          🌲 Right Tree
        </button>
      </div>
    </div>
  );
};
