import React, { useState, useEffect } from 'react';
import type { Playground, PlaygroundPhoto } from '../../types/playground';
import type { SceneAnnotation } from '../../types/shadow';
import { AnnotationTool } from '../AnnotationTool';
import { ShadowPreview } from '../ShadowPreview';
import { fetchPlayground, fetchScene, savePlaygroundSceneApi } from '../../lib/api';

interface PhotoAnnotationPageProps {
  playgroundId: string;
  photoId: string;
}

export const PhotoAnnotationPage: React.FC<PhotoAnnotationPageProps> = ({
  playgroundId,
  photoId,
}) => {
  const [playground, setPlayground] = useState<Playground | null>(null);
  const [photo, setPhoto] = useState<PlaygroundPhoto | null>(null);
  const [scene, setScene] = useState<SceneAnnotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'annotate' | 'preview'>('annotate');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);
        const pg = await fetchPlayground(playgroundId);
        setPlayground(pg);

        const currentPhoto = pg.photos.find((p) => p.id === photoId);
        if (!currentPhoto) {
          throw new Error(`Photo '${photoId}' not found in playground`);
        }
        setPhoto(currentPhoto);

        // Fetch scene if already saved
        const existingScene = await fetchScene(playgroundId, photoId);
        if (existingScene) {
          setScene(existingScene);
        } else {
          // Initialize default scene annotation
          const initial: SceneAnnotation = {
            scene_metadata: {
              scene_id: `${playgroundId}_${photoId}`,
              original_image_path: `/api/playgrounds/${playgroundId}/photo/${currentPhoto.filename}`,
              depth_map_path: currentPhoto.depth_map_filename
                ? `/api/playgrounds/${playgroundId}/photo/${currentPhoto.depth_map_filename}`
                : '',
              camera_azimuth_deg: currentPhoto.camera_azimuth_deg || 0,
              camera_fov_deg: currentPhoto.camera_fov_deg || 65,
            },
            annotations: [],
          };
          setScene(initial);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load annotation workspace');
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [playgroundId, photoId]);

  const handleSaveScene = async (savedScene: SceneAnnotation) => {
    try {
      setSaveStatus('Saving annotations to server...');
      await savePlaygroundSceneApi(playgroundId, photoId, savedScene);
      setScene(savedScene);
      setSaveStatus('Annotations saved successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
      setActiveView('preview');
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
      setSaveStatus(null);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400 text-sm font-medium bg-white rounded-2xl border border-slate-200">
        Loading photo annotation workspace...
      </div>
    );
  }

  if (error || !playground || !photo) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-semibold space-y-4">
        <div>⚠️ {error || 'Photo not found'}</div>
        <a
          href={`/admin/${playgroundId}`}
          className="inline-block px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold"
        >
          ← Return to Playground
        </a>
      </div>
    );
  }

  const imageUrl = `/api/playgrounds/${playgroundId}/photo/${photo.filename}`;
  const depthMapUrl = photo.depth_map_filename
    ? `/api/playgrounds/${playgroundId}/photo/${photo.depth_map_filename}`
    : '';

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <a
              href={`/admin/${playgroundId}`}
              className="text-xs text-blue-600 font-bold hover:underline"
            >
              ← Back to {playground.name.en}
            </a>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-mono font-bold text-slate-500">{photo.id}</span>
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight mt-1">
            Shadow Annotation & Solar Simulation
          </h2>
          <p className="text-xs text-slate-500">
            Draw polygons around trees and play structures to cast dynamic time-based shadows.
          </p>
        </div>

        {/* View Toggle Buttons */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveView('annotate')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeView === 'annotate'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ✏️ 1. Annotate Objects
          </button>
          <button
            type="button"
            onClick={() => setActiveView('preview')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeView === 'preview'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ☀️ 2. Solar Simulation Preview
          </button>
        </div>
      </div>

      {saveStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <span>✅</span> {saveStatus}
        </div>
      )}

      {/* Main Workspace */}
      {activeView === 'annotate' && (
        <div className="space-y-4">
          <AnnotationTool
            imageUrl={imageUrl}
            depthMapUrl={depthMapUrl}
            onSave={handleSaveScene}
            initialScene={scene || undefined}
          />
        </div>
      )}

      {activeView === 'preview' && scene && (
        <div className="space-y-4">
          <ShadowPreview
            imageUrl={imageUrl}
            depthMapUrl={depthMapUrl}
            scene={scene}
            latitude={playground.latitude}
            longitude={playground.longitude}
          />
        </div>
      )}
    </div>
  );
};
