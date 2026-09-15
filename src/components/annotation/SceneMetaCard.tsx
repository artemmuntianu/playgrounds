import React from 'react';

interface SceneMetaCardProps {
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
}

/**
 * Camera & scene metadata card: scene id, camera facing / lens FOV, horizon line (the projection's
 * most sensitive input) and the per-photo lighting knobs.
 *
 * Extracted from `AnnotationSidebar` to stay inside the 250-line budget. All state lives in
 * `useAnnotationTool`; this component is the form markup only.
 */
export const SceneMetaCard: React.FC<SceneMetaCardProps> = ({
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
}) => {
  return (
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
  );
};
