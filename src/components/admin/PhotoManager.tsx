import React, { useState } from 'react';
import type { Playground, PlaygroundPhoto } from '../../types/playground';
import { uploadPhoto, uploadDepthMap, deletePhotoApi, updatePlayground } from '../../lib/api';

interface PhotoManagerProps {
  playground: Playground;
  onUpdate: (updated: Playground) => void;
}

export const PhotoManager: React.FC<PhotoManagerProps> = ({ playground, onUpdate }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // New photo upload form state
  const [uploadType, setUploadType] = useState<'shadow' | 'additional'>('shadow');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDepthFile, setSelectedDepthFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [depthPreviewUrl, setDepthPreviewUrl] = useState<string | null>(null);
  const [cameraAzimuth, setCameraAzimuth] = useState<number>(0);
  const [cameraFov, setCameraFov] = useState<number>(65);
  const [makeThumbnail, setMakeThumbnail] = useState<boolean>(playground.photos.length === 0);

  // Modal for adding/replacing depth map on existing photo
  const [depthModalPhotoId, setDepthModalPhotoId] = useState<string | null>(null);
  const [standaloneDepthFile, setStandaloneDepthFile] = useState<File | null>(null);
  const [isUploadingDepth, setIsUploadingDepth] = useState(false);

  const shadowPhotos = playground.photos.filter((p) => !p.is_additional);
  const additionalPhotos = playground.photos.filter((p) => p.is_additional);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadError(null);
    }
  };

  const handleDepthFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedDepthFile(file);
      setDepthPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    if (uploadType === 'shadow' && shadowPhotos.length >= 4) {
      setUploadError('Maximum of 4 shadow-enabled photos reached. You can add Additional Photos instead.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const photoId = `photo_${Date.now()}`;
      const updatedPlayground = await uploadPhoto(playground.id, photoId, selectedFile, {
        cameraAzimuth,
        cameraFov,
        isThumbnail: makeThumbnail,
        isAdditional: uploadType === 'additional',
        depthFile: selectedDepthFile,
      });

      onUpdate(updatedPlayground);

      // Reset form
      setSelectedFile(null);
      setSelectedDepthFile(null);
      setPreviewUrl(null);
      setDepthPreviewUrl(null);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSetThumbnail = async (photoId: string) => {
    try {
      const updated = await updatePlayground(playground.id, {
        thumbnail_photo_id: photoId,
      });
      onUpdate(updated);
    } catch (err: any) {
      alert(`Failed to set thumbnail: ${err.message}`);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo and its associated files?')) {
      return;
    }

    try {
      await deletePhotoApi(playground.id, photoId);
      const updatedPhotos = playground.photos.filter((p) => p.id !== photoId);
      let newThumbId = playground.thumbnail_photo_id;
      if (newThumbId === photoId) {
        newThumbId = updatedPhotos.length > 0 ? updatedPhotos[0].id : '';
      }
      onUpdate({
        ...playground,
        photos: updatedPhotos,
        thumbnail_photo_id: newThumbId,
      });
    } catch (err: any) {
      alert(`Failed to delete photo: ${err.message}`);
    }
  };

  const handleStandaloneDepthUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depthModalPhotoId || !standaloneDepthFile) return;

    setIsUploadingDepth(true);
    try {
      const updated = await uploadDepthMap(playground.id, depthModalPhotoId, standaloneDepthFile);
      onUpdate(updated);
      setDepthModalPhotoId(null);
      setStandaloneDepthFile(null);
    } catch (err: any) {
      alert(`Error uploading depth map: ${err.message}`);
    } finally {
      setIsUploadingDepth(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <span>📸</span> Playground Photo Library ({playground.photos.length} total)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage up to 4 shadow-enabled photos with depth maps, plus any additional regular photos for the gallery.
          </p>
        </div>
      </div>

      {/* SECTION 1: Shadow-Enabled Photos (Up to 4) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <span>☀️</span> 2.5D Solar Shadow Photos ({shadowPhotos.length} / 4)
            </h4>
            <p className="text-xs text-slate-500">
              Interactive photos with depth map support, solar azimuth orientation, and polygon shadow casting.
            </p>
          </div>
        </div>

        {shadowPhotos.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <div className="text-3xl mb-2">☀️</div>
            <p className="text-xs font-semibold text-slate-600">No shadow-enabled photos added yet.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Use the upload form below to add a photo with shadow simulation.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shadowPhotos.map((photo, index) => {
              const isThumb = playground.thumbnail_photo_id === photo.id;
              const photoUrl = `/api/playgrounds/${playground.id}/photo/${photo.filename}`;
              const depthUrl = photo.depth_map_filename
                ? `/api/playgrounds/${playground.id}/photo/${photo.depth_map_filename}`
                : null;

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
                          onClick={() => setDepthModalPhotoId(photo.id)}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-bold hover:underline"
                        >
                          {photo.depth_map_filename ? 'Replace Depth Map' : '+ Upload Depth Map'}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div className="flex gap-2">
                        <a
                          href={`/admin/${playground.id}/photos?photo=${photo.id}`}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
                        >
                          <span>✏️</span> Annotate Shadows
                        </a>

                        {!isThumb && (
                          <button
                            type="button"
                            onClick={() => handleSetThumbnail(photo.id)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-700 rounded-lg text-xs font-semibold transition border border-slate-200"
                          >
                            Set as Thumbnail
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(photo.id)}
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

      {/* SECTION 2: Additional Gallery Photos */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <span>🖼️</span> Additional Photos ({additionalPhotos.length})
            </h4>
            <p className="text-xs text-slate-500">
              Regular gallery photos without shadow calculations. Available for viewers to browse and display.
            </p>
          </div>
        </div>

        {additionalPhotos.length === 0 ? (
          <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <p className="text-xs text-slate-500">No additional gallery photos added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {additionalPhotos.map((photo, index) => {
              const isThumb = playground.thumbnail_photo_id === photo.id;
              const photoUrl = `/api/playgrounds/${playground.id}/photo/${photo.filename}`;

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
                          onClick={() => handleSetThumbnail(photo.id)}
                          className="text-[10px] text-amber-700 font-bold hover:underline"
                        >
                          Make Thumbnail
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">Primary</span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(photo.id)}
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

      {/* SECTION 3: Unified Upload Form */}
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
              disabled={shadowPhotos.length >= 4}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                uploadType === 'shadow'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              ☀️ 2.5D Shadow Photo ({shadowPhotos.length}/4)
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

      {/* MODAL: Upload/Replace Depth Map on Existing Photo */}
      {depthModalPhotoId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-indigo-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <span>🗺️</span> Upload Depth Map ({depthModalPhotoId})
              </h3>
              <button
                type="button"
                onClick={() => {
                  setDepthModalPhotoId(null);
                  setStandaloneDepthFile(null);
                }}
                className="text-indigo-300 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStandaloneDepthUpload} className="p-6 space-y-4">
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
                  onClick={() => {
                    setDepthModalPhotoId(null);
                    setStandaloneDepthFile(null);
                  }}
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
      )}
    </div>
  );
};
