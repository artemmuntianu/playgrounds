import React, { useState } from 'react';
import type { Playground, PlaygroundPhoto } from '../../types/playground';
import { uploadPhoto, deletePhotoApi, updatePlayground } from '../../lib/api';

interface PhotoManagerProps {
  playground: Playground;
  onUpdate: (updated: Playground) => void;
}

export const PhotoManager: React.FC<PhotoManagerProps> = ({ playground, onUpdate }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraAzimuth, setCameraAzimuth] = useState<number>(0);
  const [cameraFov, setCameraFov] = useState<number>(65);
  const [makeThumbnail, setMakeThumbnail] = useState<boolean>(playground.photos.length === 0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadError(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    if (playground.photos.length >= 4) {
      setUploadError('Maximum of 4 photos reached for this playground.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const photoId = `photo_${Date.now()}`;
      const form = new FormData();
      form.append('photo_id', photoId);
      form.append('file', selectedFile);
      form.append('camera_azimuth_deg', String(cameraAzimuth));
      form.append('camera_fov_deg', String(cameraFov));
      form.append('is_thumbnail', String(makeThumbnail));

      const res = await fetch(`/api/playgrounds/${playground.id}/photos`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to upload photo');
      }

      const updatedPlayground: Playground = await res.json();
      onUpdate(updatedPlayground);

      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
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
    if (!confirm('Are you sure you want to delete this photo and its shadow annotations?')) {
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

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <h3 className="font-bold text-slate-800 text-base">
            Playground Photos ({playground.photos.length} / 4 max)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Add up to 4 photos. Each photo can have custom 2.5D solar shadow annotations.
          </p>
        </div>
      </div>

      {/* Existing Photos Grid */}
      {playground.photos.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-slate-300 rounded-2xl bg-white">
          <div className="text-4xl mb-3">📸</div>
          <h4 className="font-bold text-slate-700 mb-1">No Photos Added Yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Upload your first playground photo below to annotate shadow casters and enable solar simulation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {playground.photos.map((photo, index) => {
            const isThumb = playground.thumbnail_photo_id === photo.id;
            const photoUrl = `/api/playgrounds/${playground.id}/photo/${photo.filename}`;

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
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  {isThumb && (
                    <div className="absolute top-3 left-3 bg-amber-500 text-slate-950 font-extrabold text-[11px] px-2.5 py-1 rounded-md shadow-md flex items-center gap-1.5">
                      <span>⭐</span> Primary Thumbnail
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white text-[11px] px-2 py-0.5 rounded font-mono">
                    Facing: {photo.camera_azimuth_deg}° | FOV: {photo.camera_fov_deg}°
                  </div>
                </div>

                {/* Card Controls */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <div className="font-bold text-sm text-slate-800">
                      Photo {index + 1} ({photo.id})
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                      {photo.filename}
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

      {/* Upload Form Card (if photos < 4) */}
      {playground.photos.length < 4 && (
        <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-6">
          <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
            <span>➕</span> Upload New Photo ({4 - playground.photos.length} slots remaining)
          </h4>

          {uploadError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">
              ⚠️ {uploadError}
            </div>
          )}

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* File picker */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Select Image File (.jpg, .png, .webp)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  required
                />

                <div className="grid grid-cols-2 gap-3 pt-2">
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

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="makeThumbnailCheckbox"
                    checked={makeThumbnail}
                    onChange={(e) => setMakeThumbnail(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="makeThumbnailCheckbox" className="text-xs text-slate-700 font-medium">
                    Use as primary thumbnail
                  </label>
                </div>
              </div>

              {/* Preview Box */}
              <div>
                <div className="text-xs font-semibold text-slate-700 mb-1">Image Preview</div>
                <div className="w-full h-44 bg-slate-900 rounded-lg border border-slate-300 flex items-center justify-center overflow-hidden">
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
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={!selectedFile || isUploading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Upload Photo'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
