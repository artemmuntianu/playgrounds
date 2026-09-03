import React, { useState, useEffect } from 'react';
import type { PlaygroundSummary } from '../../types/playground';
import { fetchPlaygrounds, deletePlaygroundApi, createPlayground } from '../../lib/api';
import { PlaygroundForm } from './PlaygroundForm';

export const PlaygroundList: React.FC = () => {
  const [playgrounds, setPlaygrounds] = useState<PlaygroundSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadPlaygrounds = async () => {
    try {
      setLoading(true);
      const data = await fetchPlaygrounds();
      setPlaygrounds(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load playgrounds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlaygrounds();
  }, []);

  const handleCreateSubmit = async (formData: any) => {
    setIsSubmitting(true);
    try {
      const created = await createPlayground(formData);
      setShowCreateModal(false);
      // Redirect to edit page
      window.location.href = `/admin/${created.id}`;
    } catch (err: any) {
      alert(`Error creating playground: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete playground "${name}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deletePlaygroundApi(id);
      setPlaygrounds((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            Playground Directory
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage physical playground datasets, photos, and solar shadow simulation models.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-2"
          >
            <span>➕</span> Add Playground
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}

      {/* Main Table or Empty State */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 text-sm font-medium bg-white rounded-2xl border border-slate-200">
          Loading playgrounds...
        </div>
      ) : playgrounds.length === 0 ? (
        <div className="bg-white p-16 rounded-2xl border-2 border-dashed border-slate-300 text-center space-y-4">
          <div className="text-5xl">🎪</div>
          <h3 className="text-lg font-bold text-slate-800">No Playgrounds Created Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Get started by creating a new playground dataset, uploading photos, and annotating shadow casters.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition"
            >
              ➕ Create New
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Thumbnail</th>
                <th className="py-3.5 px-4">Name & Location</th>
                <th className="py-3.5 px-4">Attributes</th>
                <th className="py-3.5 px-4">Photos</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {playgrounds.map((pg) => (
                <tr key={pg.id} className="hover:bg-slate-50/80 transition">
                  {/* Thumbnail */}
                  <td className="py-3 px-4 w-24">
                    <div className="w-20 h-14 bg-slate-900 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
                      {pg.thumbnail_url ? (
                        <img
                          src={pg.thumbnail_url}
                          alt={pg.name.en}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-500 font-medium">No photo</span>
                      )}
                    </div>
                  </td>

                  {/* Name & Location */}
                  <td className="py-3 px-4">
                    <a
                      href={`/admin/${pg.id}`}
                      className="font-bold text-sm text-blue-600 hover:underline block"
                    >
                      {pg.name.en}
                    </a>
                    {pg.name.pt && (
                      <div className="text-[11px] text-slate-400 italic">{pg.name.pt}</div>
                    )}
                    <div className="text-slate-500 mt-1 flex items-center gap-1">
                      <span>📍</span> {pg.location_name.en || 'No location set'}
                    </div>
                  </td>

                  {/* Attributes */}
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[10px]">
                        ☀️ {pg.attributes.shadow_coverage.en}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-red-50 text-red-800 border border-red-200 font-semibold text-[10px]">
                        🌡️ {pg.attributes.surface_temperature.en}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-semibold text-[10px]">
                        👶 {pg.attributes.target_age_group.en}
                      </span>
                    </div>
                  </td>

                  {/* Photos count */}
                  <td className="py-3 px-4 font-semibold text-slate-700">
                    <span className="px-2.5 py-1 bg-slate-100 rounded-md">
                      📸 {pg.photo_count} / 4
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/admin/${pg.id}`}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                      >
                        Edit
                      </a>
                      <a
                        href={`/viewer/${pg.id}`}
                        target="_blank"
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition"
                        title="View in Mobile Viewer"
                      >
                        Preview ↗
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDelete(pg.id, pg.name.en)}
                        className="px-2.5 py-1.5 text-red-600 hover:bg-red-50 rounded-lg font-bold transition"
                        title="Delete Playground"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <span>➕</span> Create New Playground
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <PlaygroundForm
                onSubmit={handleCreateSubmit}
                onCancel={() => setShowCreateModal(false)}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
