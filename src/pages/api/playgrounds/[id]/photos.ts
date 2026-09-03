import type { APIRoute } from 'astro';
import {
  getPlayground,
  updatePlayground,
  savePlaygroundPhoto,
  savePlaygroundDepthMap,
  savePlaygroundSegMask,
  deletePlaygroundPhoto,
} from '../../../../lib/playgroundStorage';
import type { PlaygroundPhoto } from '../../../../types/playground';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  const playgroundId = params.id;
  if (!playgroundId) {
    return new Response(JSON.stringify({ error: 'Playground ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const playground = await getPlayground(playgroundId);
  if (!playground) {
    return new Response(
      JSON.stringify({ error: `Playground '${playgroundId}' not found` }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const depthFile = formData.get('depth_file') as File | null;
    const segMaskFile = formData.get('seg_mask_file') as File | null;
    const photoId = (formData.get('photo_id') as string) || `photo_${Date.now()}`;
    const cameraAzimuth = Number(formData.get('camera_azimuth_deg')) || 0;
    const cameraFov = Number(formData.get('camera_fov_deg')) || 65;
    const isThumbnail = formData.get('is_thumbnail') === 'true';
    const isAdditional = formData.get('is_additional') === 'true';

    // Count existing shadow photos
    const existingShadowPhotos = playground.photos.filter((p) => !p.is_additional);
    if (!isAdditional && existingShadowPhotos.length >= 4) {
      return new Response(
        JSON.stringify({
          error: 'Maximum limit of 4 shadow-enabled photos reached. You can still add additional photos.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'Image file is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Save main photo
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const savedFilename = await savePlaygroundPhoto(
      playgroundId,
      photoId,
      buffer,
      file.type
    );

    // Save optional depth map
    let savedDepthFilename: string | undefined = undefined;
    if (depthFile && depthFile.size > 0) {
      const depthBuffer = Buffer.from(await depthFile.arrayBuffer());
      savedDepthFilename = await savePlaygroundDepthMap(
        playgroundId,
        photoId,
        depthBuffer,
        depthFile.type
      );
    }

    // Save optional semantic segmentation mask
    let savedSegFilename: string | undefined = undefined;
    if (segMaskFile && segMaskFile.size > 0) {
      const segBuffer = Buffer.from(await segMaskFile.arrayBuffer());
      savedSegFilename = await savePlaygroundSegMask(
        playgroundId,
        photoId,
        segBuffer,
        segMaskFile.type
      );
    }

    const newPhoto: PlaygroundPhoto = {
      id: photoId,
      filename: savedFilename,
      depth_map_filename: savedDepthFilename,
      semantic_mask_filename: savedSegFilename,
      camera_azimuth_deg: isAdditional ? undefined : cameraAzimuth,
      camera_fov_deg: isAdditional ? undefined : cameraFov,
      scene_id: isAdditional ? undefined : `${photoId}_scene`,
      is_additional: isAdditional,
    };

    const updatedPhotos = [...playground.photos, newPhoto];
    const newThumbnailId =
      isThumbnail || !playground.thumbnail_photo_id
        ? photoId
        : playground.thumbnail_photo_id;

    const updatedPlayground = await updatePlayground(playgroundId, {
      photos: updatedPhotos,
      thumbnail_photo_id: newThumbnailId,
    });

    return new Response(JSON.stringify(updatedPlayground), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error(`Error uploading photo to playground ${playgroundId}:`, error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to upload photo' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const DELETE: APIRoute = async ({ params, url }) => {
  const playgroundId = params.id;
  const photoId = url.searchParams.get('photo_id');

  if (!playgroundId || !photoId) {
    return new Response(
      JSON.stringify({ error: 'Playground ID and photo_id parameter are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const playground = await getPlayground(playgroundId);
  if (!playground) {
    return new Response(
      JSON.stringify({ error: `Playground '${playgroundId}' not found` }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    await deletePlaygroundPhoto(playgroundId, photoId);

    const updatedPhotos = playground.photos.filter((p) => p.id !== photoId);
    let newThumbnailId = playground.thumbnail_photo_id;
    if (newThumbnailId === photoId) {
      newThumbnailId = updatedPhotos.length > 0 ? updatedPhotos[0].id : '';
    }

    const updatedPlayground = await updatePlayground(playgroundId, {
      photos: updatedPhotos,
      thumbnail_photo_id: newThumbnailId,
    });

    return new Response(JSON.stringify(updatedPlayground), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error(`Error deleting photo ${photoId} from playground ${playgroundId}:`, error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to delete photo' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
