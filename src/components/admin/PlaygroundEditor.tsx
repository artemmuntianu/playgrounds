import React, { useState, useEffect } from 'react';
import type { Playground } from '../../types/playground';
import { fetchPlayground, updatePlayground } from '../../lib/api';
import { PlaygroundForm } from './PlaygroundForm';
import { PhotoManager } from './PhotoManager';

interface PlaygroundEditorProps {
  playgroundId: string;
}

export const PlaygroundEditor: React.FC<PlaygroundEditorProps> = ({ playgroundId }) => {
  const [playground, setPlayground] = useState<Playground | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'photos'>('details');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchPlayground(playgroundId);
      setPlayground(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load playground');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [playgroundId]);

  const handleUpdateDetails = async (formData: any) => {
    setIsSubmitting(true);
    setSaveSuccess(null);
    try {
      const updated = await updatePlayground(playgroundId, formData);
      setPlayground(updated);
      setSaveSuccess('Playground details saved successfully!');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400 text-sm font-medium bg-white rounded-2xl border border-slate-200">
        Loading playground data...
      </div>
    );
  }

  if (error || !playground) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-semibold space-y-4">
        <div>⚠️ {error || 'Playground not found'}</div>
        <a
          href="/admin"
          className="inline-block px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition"
        >
          ← Return to Playgrounds
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
              {playground.id}
            </span>
            <span className="text-xs text-slate-400">
              Updated: {new Date(playground.updated_at).toLocaleDateString()}
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight mt-1">
            {playground.name.en}
          </h2>
          {playground.name.pt && (
            <p className="text-xs text-slate-400 italic mt-0.5">{playground.name.pt}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/viewer/${playground.id}`}
            target="_blank"
            className="px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition border border-blue-200 flex items-center gap-1.5"
          >
            <span>📱</span> Open in Viewer ↗
          </a>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <span>✅</span> {saveSuccess}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'details'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>📝</span> General & Attributes
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('photos')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'photos'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>📸</span> Photos & Shadows ({playground.photos.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'details' && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <PlaygroundForm
            initialData={playground}
            onSubmit={handleUpdateDetails}
            onCancel={() => (window.location.href = '/admin')}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {activeTab === 'photos' && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <PhotoManager playground={playground} onUpdate={setPlayground} />
        </div>
      )}
    </div>
  );
};
