import type { APIRoute } from 'astro';
import {
  getPlayground,
  updatePlayground,
  savePlaygroundDepthMap,
} from '../../../../lib/playgroundStorage';

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
    const photoId = formData.get('photo_id') as string;
    const depthFile = formData.get('depth_file') as File | null;

    if (!photoId) {
      return new Response(
        JSON.stringify({ error: 'photo_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const photo = playground.photos.find((p) => p.id === photoId);
    if (!photo) {
      return new Response(
        JSON.stringify({ error: `Photo '${photoId}' not found in playground` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!depthFile) {
      return new Response(
        JSON.stringify({ error: 'depth_file is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const depthBuffer = Buffer.from(await depthFile.arrayBuffer());
    const savedDepthFilename = await savePlaygroundDepthMap(
      playgroundId,
      photoId,
      depthBuffer,
      depthFile.type
    );

    // Update photo in playground.json
    const updatedPhotos = playground.photos.map((p) =>
      p.id === photoId ? { ...p, depth_map_filename: savedDepthFilename } : p
    );

    const updatedPlayground = await updatePlayground(playgroundId, {
      photos: updatedPhotos,
    });

    return new Response(JSON.stringify(updatedPlayground), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error(`Error uploading depth map for playground ${playgroundId}:`, error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to upload depth map' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
