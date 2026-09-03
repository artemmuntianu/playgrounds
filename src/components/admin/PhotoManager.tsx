import React, { useState } from 'react';
import type { Playground, PlaygroundPhoto } from '../../types/playground';
import { uploadPhoto, uploadDepthMap, deletePhotoApi, updatePlayground } from '../../lib/api';
import { PhotoUploadForm } from './PhotoUploadForm';
import { PhotoDepthModal } from './PhotoDepthModal';
import { ShadowPhotoGrid } from './ShadowPhotoGrid';
import { AdditionalPhotoGrid } from './AdditionalPhotoGrid';

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

      <ShadowPhotoGrid
        photos={shadowPhotos}
        playgroundId={playground.id}
        thumbnailPhotoId={playground.thumbnail_photo_id}
        onSetThumbnail={handleSetThumbnail}
        onDelete={handleDeletePhoto}
        onUploadDepth={setDepthModalPhotoId}
      />

      <AdditionalPhotoGrid
        photos={additionalPhotos}
        playgroundId={playground.id}
        thumbnailPhotoId={playground.thumbnail_photo_id}
        onSetThumbnail={handleSetThumbnail}
        onDelete={handleDeletePhoto}
      />

      <PhotoUploadForm
        uploadType={uploadType}
        setUploadType={setUploadType}
        shadowCount={shadowPhotos.length}
        uploadError={uploadError}
        handleUploadSubmit={handleUploadSubmit}
        handleFileChange={handleFileChange}
        handleDepthFileChange={handleDepthFileChange}
        cameraAzimuth={cameraAzimuth}
        setCameraAzimuth={setCameraAzimuth}
        cameraFov={cameraFov}
        setCameraFov={setCameraFov}
        makeThumbnail={makeThumbnail}
        setMakeThumbnail={setMakeThumbnail}
        previewUrl={previewUrl}
        depthPreviewUrl={depthPreviewUrl}
        selectedFile={selectedFile}
        isUploading={isUploading}
      />

      {depthModalPhotoId && (
        <PhotoDepthModal
          photoId={depthModalPhotoId}
          standaloneDepthFile={standaloneDepthFile}
          setStandaloneDepthFile={setStandaloneDepthFile}
          isUploadingDepth={isUploadingDepth}
          handleSubmit={handleStandaloneDepthUpload}
          onClose={() => {
            setDepthModalPhotoId(null);
            setStandaloneDepthFile(null);
          }}
        />
      )}
    </div>
  );
};


