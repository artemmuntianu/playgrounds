import React from 'react';

interface PhotoDepthModalProps {
  photoId: string;
  standaloneDepthFile: File | null;
  setStandaloneDepthFile: (f: File | null) => void;
  isUploadingDepth: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const PhotoDepthModal: React.FC<PhotoDepthModalProps> = ({
  photoId,
  standaloneDepthFile,
  setStandaloneDepthFile,
  isUploadingDepth,
  handleSubmit,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 bg-indigo-900 text-white flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <span>🗺️</span> Upload Depth Map ({photoId})
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-indigo-300 hover:text-white font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-600">
            Upload a grayscale monocular depth map image (PNG) for this photo to enable realistic 2.5D shadow displacement.
          </p>

          <div>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setStandaloneDepthFile(e.target.files[0]);
                }
              }}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!standaloneDepthFile || isUploadingDepth}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg disabled:opacity-50 shadow"
            >
              {isUploadingDepth ? 'Saving...' : 'Save Depth Map'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
