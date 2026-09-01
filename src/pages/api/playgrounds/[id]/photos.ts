import type { APIRoute } from 'astro';
import {
  getPlayground,
  updatePlayground,
  savePlaygroundPhoto,
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

  if (playground.photos.length >= 4) {
    return new Response(
      JSON.stringify({ error: 'Maximum limit of 4 photos reached for this playground' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const photoId = (formData.get('photo_id') as string) || `photo_${Date.now()}`;
    const cameraAzimuth = Number(formData.get('camera_azimuth_deg')) || 0;
    const cameraFov = Number(formData.get('camera_fov_deg')) || 65;
    const isThumbnail = formData.get('is_thumbnail') === 'true';

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'Image file is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const savedFilename = await savePlaygroundPhoto(
      playgroundId,
      photoId,
      buffer,
      file.type
    );

    const newPhoto: PlaygroundPhoto = {
      id: photoId,
      filename: savedFilename,
      camera_azimuth_deg: cameraAzimuth,
      camera_fov_deg: cameraFov,
      scene_id: `${photoId}_scene`,
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
