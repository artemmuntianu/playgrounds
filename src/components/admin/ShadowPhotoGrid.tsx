import React from 'react';
import type { PlaygroundPhoto } from '../../types/playground';

interface ShadowPhotoGridProps {
  photos: PlaygroundPhoto[];
  playgroundId: string;
  thumbnailPhotoId: string;
  onSetThumbnail: (id: string) => void;
  onDelete: (id: string) => void;
  onUploadDepth: (id: string) => void;
}

export const ShadowPhotoGrid: React.FC<ShadowPhotoGridProps> = ({
  photos,
  playgroundId,
  thumbnailPhotoId,
  onSetThumbnail,
  onDelete,
  onUploadDepth,
}) => {
  return (
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <span>☀️</span> 2.5D Solar Shadow Photos ({photos.length} / 4)
            </h4>
            <p className="text-xs text-slate-500">
              Interactive photos with depth map support, solar azimuth orientation, and polygon shadow casting.
            </p>
          </div>
        </div>

        {photos.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <div className="text-3xl mb-2">☀️</div>
            <p className="text-xs font-semibold text-slate-600">No shadow-enabled photos added yet.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Use the upload form below to add a photo with shadow simulation.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {photos.map((photo, index) => {
              const isThumb = thumbnailPhotoId === photo.id;
              const photoUrl = photo.photoUrl ?? '';
              const depthUrl = photo.depthMapUrl ?? null;

              return (
                <div
                  key={photo.id}
                  className={`bg-white rounded-xl border-2 overflow-hidden shadow-sm transition flex flex-col ${
                    isThumb ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200'
                  }`}
                >
                  {/* Photo Preview Container */}
                  <div className="relative aspect-video bg-slate-900 overflow-hidden group">
                    <img
                      src={photoUrl}
                      alt={`Shadow Photo ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />

                    {isThumb && (
                      <div className="absolute top-3 left-3 bg-amber-500 text-slate-950 font-extrabold text-[11px] px-2.5 py-1 rounded-md shadow-md flex items-center gap-1.5">
                        <span>⭐</span> Primary Thumbnail
                      </div>
                    )}

                    {/* Depth Map Mini Overlay indicator */}
                    {depthUrl && (
                      <div className="absolute top-3 right-3 bg-indigo-900/85 backdrop-blur-sm text-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-400/30 flex items-center gap-1 shadow">
                        <span>🗺️</span> Depth Map Active
                      </div>
                    )}

                    <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white text-[11px] px-2 py-0.5 rounded font-mono">
                      Facing: {photo.camera_azimuth_deg}° | FOV: {photo.camera_fov_deg}°
                    </div>
                  </div>

                  {/* Card Controls */}
                  <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-800">
                          Photo #{index + 1} ({photo.id})
                        </span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold text-[10px]">
                          2.5D Shadow
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                        {photo.filename}
                      </div>

                      {/* Depth Map status info */}
                      <div className="mt-2 text-xs flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100">
                        <span className="text-slate-600 font-medium">
                          {photo.depth_map_filename ? (
                            <span className="text-indigo-700 font-semibold flex items-center gap-1">
                              <span>🗺️</span> {photo.depth_map_filename}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No depth map attached</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUploadDepth(photo.id)}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-bold hover:underline"
                        >
                          {photo.depth_map_filename ? 'Replace Depth Map' : '+ Upload Depth Map'}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div className="flex gap-2">
                        <a
                          href={`/admin/${playgroundId}/photos?photo=${photo.id}`}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
                        >
                          <span>✏️</span> Annotate Shadows
                        </a>

                        {!isThumb && (
                          <button
                            type="button"
                            onClick={() => onSetThumbnail(photo.id)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-700 rounded-lg text-xs font-semibold transition border border-slate-200"
                          >
                            Set as Thumbnail
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onDelete(photo.id)}
                        className="px-2.5 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition"
                        title="Delete Photo"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
  );
};

