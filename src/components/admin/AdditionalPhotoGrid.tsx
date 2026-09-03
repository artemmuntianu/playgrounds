import React from 'react';
import type { PlaygroundPhoto } from '../../types/playground';

interface AdditionalPhotoGridProps {
  photos: PlaygroundPhoto[];
  playgroundId: string;
  thumbnailPhotoId: string;
  onSetThumbnail: (id: string) => void;
  onDelete: (id: string) => void;
}

export const AdditionalPhotoGrid: React.FC<AdditionalPhotoGridProps> = ({
  photos,
  playgroundId,
  thumbnailPhotoId,
  onSetThumbnail,
  onDelete,
}) => {
  return (
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <span>🖼️</span> Additional Photos ({photos.length})
            </h4>
            <p className="text-xs text-slate-500">
              Regular gallery photos without shadow calculations. Available for viewers to browse and display.
            </p>
          </div>
        </div>

        {photos.length === 0 ? (
          <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <p className="text-xs text-slate-500">No additional gallery photos added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {photos.map((photo, index) => {
              const isThumb = thumbnailPhotoId === photo.id;
              const photoUrl = `/api/playgrounds/${playgroundId}/photo/${photo.filename}`;

              return (
                <div
                  key={photo.id}
                  className={`bg-white rounded-xl border overflow-hidden shadow-sm flex flex-col ${
                    isThumb ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200'
                  }`}
                >
                  <div className="relative aspect-video bg-slate-900">
                    <img
                      src={photoUrl}
                      alt={`Additional Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {isThumb && (
                      <div className="absolute top-2 left-2 bg-amber-500 text-slate-950 font-extrabold text-[9px] px-1.5 py-0.5 rounded shadow">
                        ⭐ Thumbnail
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 flex-1 flex flex-col justify-between gap-2">
                    <div className="text-[11px] font-bold text-slate-700 truncate">
                      {photo.filename}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      {!isThumb ? (
                        <button
                          type="button"
                          onClick={() => onSetThumbnail(photo.id)}
                          className="text-[10px] text-amber-700 font-bold hover:underline"
                        >
                          Make Thumbnail
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">Primary</span>
                      )}

                      <button
                        type="button"
                        onClick={() => onDelete(photo.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-bold"
                        title="Delete"
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

