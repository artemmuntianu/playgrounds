import React, { useState } from 'react';
import type { SceneAnnotation } from '../types/shadow';
import { AnnotationTool } from './AnnotationTool';
import { ShadowPreview } from './ShadowPreview';
import { saveScene } from '../lib/sceneIO';

export const ShadowPipelineApp: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // File URLs
  const [imageUrl, setImageUrl] = useState<string>('/ClarkV_original.jpg');
  const [depthMapUrl, setDepthMapUrl] = useState<string>('/ClarkV_depth_map.png');

  // Geographic coordinates (Default: Leiria, Portugal)
  const [latitude, setLatitude] = useState<number>(39.7436);
  const [longitude, setLongitude] = useState<number>(-8.8071);

  // Scene state
  const [scene, setScene] = useState<SceneAnnotation | null>(null);

  // Server save feedback state
  const [saveStatus, setSaveStatus] = useState<{ type: 'idle' | 'saving' | 'success' | 'error'; message?: string }>({
    type: 'idle',
  });

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setImageUrl(url);
    }
  };

  const handleDepthFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setDepthMapUrl(url);
    }
  };

  const handleAnnotationSave = (savedScene: SceneAnnotation) => {
    setScene(savedScene);
    setCurrentStep(3);
  };

  const handleDownloadJSON = () => {
    if (!scene) return;
    const jsonStr = JSON.stringify(scene, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scene.scene_metadata.scene_id || 'scene'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveToServer = async () => {
    if (!scene) return;
    setSaveStatus({ type: 'saving' });
    try {
      await saveScene(scene);
      setSaveStatus({
        type: 'success',
        message: `Successfully saved to server at data/scenes/${scene.scene_metadata.scene_id}.json`,
      });
    } catch (err: any) {
      setSaveStatus({
        type: 'error',
        message: err.message || 'Failed to save to server.',
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header & Step Wizard Indicator */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              2.5D Playground Shadow Projection Pipeline
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Annotate 2D playground scenes and simulate time-dependent solar shadows with depth map displacement.
            </p>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-4 gap-2 border-t border-gray-100 pt-4">
          {[
            { step: 1, label: '1. Load Files' },
            { step: 2, label: '2. Annotate' },
            { step: 3, label: '3. Shadow Preview' },
            { step: 4, label: '4. Export' },
          ].map((item) => (
            <button
              key={item.step}
              type="button"
              disabled={
                (item.step === 2 && !imageUrl) ||
                (item.step >= 3 && !scene)
              }
              onClick={() => setCurrentStep(item.step as 1 | 2 | 3 | 4)}
              className={`py-2 px-3 rounded-lg text-xs md:text-sm font-bold text-center transition ${
                currentStep === item.step
                  ? 'bg-blue-600 text-white shadow'
                  : item.step < currentStep
                  ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step 1: Load Files */}
      {currentStep === 1 && (
        <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 space-y-6">
          <h2 className="text-lg font-bold text-gray-900">Step 1 — Load Scene & Depth Map</h2>

          {/* Quick preset selector */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="font-bold text-blue-900 text-sm">Use Clark V Playground Preset</h3>
              <p className="text-xs text-blue-700 mt-0.5">
                Load pre-bundled <code>ClarkV_original.jpg</code> and depth map <code>ClarkV_depth_map.png</code>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setImageUrl('/ClarkV_original.jpg');
                setDepthMapUrl('/ClarkV_depth_map.png');
                setCurrentStep(2);
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow"
            >
              Use Clark V Files →
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
            {/* Custom Base Image */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                Base Playground Image (.jpg / .png)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleImageFileChange}
                className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
              {imageUrl && (
                <div className="mt-2 border rounded overflow-hidden max-h-48 bg-gray-900">
                  <img src={imageUrl} alt="Base Preview" className="h-48 w-full object-contain" />
                </div>
              )}
            </div>

            {/* Custom Depth Map */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                Monocular Depth Map (.png)
              </label>
              <input
                type="file"
                accept="image/png"
                onChange={handleDepthFileChange}
                className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
              {depthMapUrl && (
                <div className="mt-2 border rounded overflow-hidden max-h-48 bg-gray-900">
                  <img src={depthMapUrl} alt="Depth Map Preview" className="h-48 w-full object-contain" />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              disabled={!imageUrl}
              onClick={() => setCurrentStep(2)}
              className="px-6 py-2.5 font-bold text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              Proceed to Annotations →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Annotate */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white px-6 py-3 rounded-xl border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Step 2 — Object Annotation</h2>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-xs text-gray-600 hover:text-gray-900 underline font-medium"
            >
              ← Back to File Selection
            </button>
          </div>
          <AnnotationTool
            imageUrl={imageUrl}
            depthMapUrl={depthMapUrl}
            onSave={handleAnnotationSave}
            initialScene={scene || undefined}
          />
        </div>
      )}

      {/* Step 3: Shadow Preview */}
      {currentStep === 3 && scene && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold text-gray-900">Step 3 — Solar Shadow Simulation</h2>
              <div className="flex items-center gap-2 text-xs">
                <label className="font-semibold text-gray-600">Lat:</label>
                <input
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-1 border rounded text-xs"
                />
                <label className="font-semibold text-gray-600">Lon:</label>
                <input
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-1 border rounded text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                ← Back to Annotate
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Next: Export Scene →
              </button>
            </div>
          </div>

          <ShadowPreview
            imageUrl={imageUrl}
            depthMapUrl={depthMapUrl}
            scene={scene}
            latitude={latitude}
            longitude={longitude}
            onSave={handleAnnotationSave}
          />
        </div>
      )}

      {/* Step 4: Export */}
      {currentStep === 4 && scene && (
        <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 space-y-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-gray-900">Step 4 — Export Scene Annotation JSON</h2>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="text-xs text-gray-600 hover:text-gray-900 underline font-medium"
            >
              ← Back to Preview
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={handleDownloadJSON}
              className="px-5 py-2.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow transition"
            >
              📥 Download JSON File
            </button>
            <button
              type="button"
              disabled={saveStatus.type === 'saving'}
              onClick={handleSaveToServer}
              className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow transition"
            >
              {saveStatus.type === 'saving' ? 'Saving...' : '☁️ Save to Server'}
            </button>
          </div>

          {/* Server Save status toast */}
          {saveStatus.message && (
            <div
              className={`p-3 rounded-lg text-xs font-semibold ${
                saveStatus.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {saveStatus.message}
            </div>
          )}

          {/* JSON Preview */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700">
              Raw JSON Data ({scene.annotations.length} annotations)
            </label>
            <pre className="p-4 bg-gray-900 text-green-400 rounded-lg text-xs font-mono overflow-x-auto max-h-[500px]">
              {JSON.stringify(scene, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
