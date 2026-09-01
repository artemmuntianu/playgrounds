import type { APIRoute } from 'astro';
import {
  getPlaygroundScene,
  savePlaygroundScene,
} from '../../../../../lib/playgroundStorage';
import type { SceneAnnotation } from '../../../../../types/shadow';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const playgroundId = params.id;
  const photoId = params.photoId;

  if (!playgroundId || !photoId) {
    return new Response(
      JSON.stringify({ error: 'Playground ID and photo ID are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const scene = await getPlaygroundScene(playgroundId, photoId);
  if (!scene) {
    return new Response(
      JSON.stringify({ error: `Scene for photo '${photoId}' not found` }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(JSON.stringify(scene), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ params, request }) => {
  const playgroundId = params.id;
  const photoId = params.photoId;

  if (!playgroundId || !photoId) {
    return new Response(
      JSON.stringify({ error: 'Playground ID and photo ID are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const scene: SceneAnnotation = await request.json();
    await savePlaygroundScene(playgroundId, photoId, scene);

    return new Response(
      JSON.stringify({ success: true, playgroundId, photoId }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error(`Error saving scene for photo ${photoId}:`, error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to save scene' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
