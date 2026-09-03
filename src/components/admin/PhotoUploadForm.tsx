import React from 'react';

interface PhotoUploadFormProps {
  uploadType: 'shadow' | 'additional';
  setUploadType: (t: 'shadow' | 'additional') => void;
  shadowCount: number;
  uploadError: string | null;
  handleUploadSubmit: (e: React.FormEvent) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDepthFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSegMaskFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  segPreviewUrl: string | null;
  cameraAzimuth: number;
  setCameraAzimuth: (v: number) => void;
  cameraFov: number;
  setCameraFov: (v: number) => void;
  makeThumbnail: boolean;
  setMakeThumbnail: (v: boolean) => void;
  previewUrl: string | null;
  depthPreviewUrl: string | null;
  selectedFile: File | null;
  isUploading: boolean;
}

export const PhotoUploadForm: React.FC<PhotoUploadFormProps> = ({
  uploadType,
  setUploadType,
  shadowCount,
  uploadError,
  handleUploadSubmit,
  handleFileChange,
  handleDepthFileChange,
  handleSegMaskFileChange,
  segPreviewUrl,
  cameraAzimuth,
  setCameraAzimuth,
  cameraFov,
  setCameraFov,
  makeThumbnail,
  setMakeThumbnail,
  previewUrl,
  depthPreviewUrl,
  selectedFile,
  isUploading,
}) => {
  return (
    <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <span>➕</span> Add New Photo to Playground
          </h4>
          <p className="text-xs text-slate-500">
            Select whether you are adding a 2.5D shadow photo or a standard gallery photo.
          </p>
        </div>

        {/* Type Selector Toggle */}
        <div className="flex bg-slate-200 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setUploadType('shadow')}
            disabled={shadowCount >= 4}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              uploadType === 'shadow'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            ☀️ 2.5D Shadow Photo ({shadowCount}/4)
          </button>
          <button
            type="button"
            onClick={() => setUploadType('additional')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              uploadType === 'additional'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🖼️ Additional Photo
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">
          ⚠️ {uploadError}
        </div>
      )}

      <form onSubmit={handleUploadSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Left Column: File Pickers & Config */}
          <div className="space-y-3">
            {/* Base Image Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Base Image File (.jpg, .png, .webp) *
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required
              />
            </div>

            {/* Depth Map Picker (for Shadow photos) */}
            {uploadType === 'shadow' && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1.5">
                <label className="block text-xs font-bold text-indigo-900">
                  🗺️ Monocular Depth Map (.png) (Optional)
                </label>
                <p className="text-[11px] text-indigo-700 leading-tight">
                  Enables realistic 2.5D shadow bending over slides and climbing frames.
                </p>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleDepthFileChange}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-100 file:text-indigo-800 hover:file:bg-indigo-200"
                />
              </div>
            )}

            {/* Semantic Segmentation Mask (3-colour: sky / vertical / ground) */}
            {uploadType === 'shadow' && (
              <div>
                <label htmlFor="segMaskInput" className="block text-xs font-semibold text-slate-600">
                  Semantic Mask (optional) — sky / vertical / ground
                </label>
                <input
                  id="segMaskInput"
                  type="file"
                  accept="image/png"
                  onChange={handleSegMaskFileChange}
                  className="block w-full mt-1 text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  3-colour PNG. Sky=blue (#1E78FF), vertical=red (#FF3C32), ground=green (#32BE5A).
                </p>
              </div>
            )}

            {/* Shadow Camera Parameters (for Shadow photos) */}
            {uploadType === 'shadow' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-600" title="Compass direction the camera was facing (0=North, 90=East, 180=South, 270=West)">
                    Camera Facing (°):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="360"
                    value={cameraAzimuth}
                    onChange={(e) => setCameraAzimuth(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600" title="Horizontal lens angle of view (default: 65°)">
                    Lens FOV (°):
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="120"
                    value={cameraFov}
                    onChange={(e) => setCameraFov(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            )}

            {/* Thumbnail Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="makeThumbnailCheckbox"
                checked={makeThumbnail}
                onChange={(e) => setMakeThumbnail(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="makeThumbnailCheckbox" className="text-xs text-slate-700 font-medium">
                Set as primary thumbnail for master card list
              </label>
            </div>
          </div>

          {/* Right Column: Previews */}
          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold text-slate-700 mb-1">Image Preview</div>
              <div className="w-full h-36 bg-slate-900 rounded-lg border border-slate-300 flex items-center justify-center overflow-hidden">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Upload Preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-slate-500 italic">No image selected</span>
                )}
              </div>
            </div>

            {uploadType === 'shadow' && depthPreviewUrl && (
              <div>
                <div className="text-xs font-semibold text-indigo-900 mb-1">Depth Map Preview</div>
                <div className="w-full h-24 bg-slate-900 rounded-lg border border-indigo-300 flex items-center justify-center overflow-hidden">
                  <img
                    src={depthPreviewUrl}
                    alt="Depth Preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            {uploadType === 'shadow' && segPreviewUrl && (
              <div>
                <div className="text-xs font-semibold text-emerald-900 mb-1">Semantic Mask Preview</div>
                <div className="w-full h-24 bg-slate-900 rounded-lg border border-emerald-300 flex items-center justify-center overflow-hidden">
                  <img
                    src={segPreviewUrl}
                    alt="Segmentation Mask Preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-200">
          <button
            type="submit"
            disabled={!selectedFile || isUploading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-500/20 disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : uploadType === 'shadow' ? 'Upload 2.5D Shadow Photo' : 'Upload Additional Photo'}
          </button>
        </div>
      </form>
    </div>
  );
};
