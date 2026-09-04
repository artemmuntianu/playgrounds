import type { APIRoute } from 'astro';
import { listPlaygrounds, createPlayground } from '../../../lib/playgroundStorage';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const summaries = await listPlaygrounds();
    return new Response(JSON.stringify(summaries), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching playgrounds:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to list playgrounds' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    if (!data.name || !data.name.en) {
      return new Response(
        JSON.stringify({ error: 'Playground English name is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const newPlayground = await createPlayground({
      name: data.name || { en: '', pt: '' },
      short_description: data.short_description || { en: '', pt: '' },
      full_description: data.full_description || { en: '', pt: '' },
      latitude: Number(data.latitude) || 39.7436,
      longitude: Number(data.longitude) || -8.8071,
      location_name: data.location_name || { en: '', pt: '' },
      photos: data.photos || [],
      thumbnail_photo_id: data.thumbnail_photo_id || '',
      equipment: data.equipment || [],
      attributes: data.attributes || {
        shadow_coverage: { en: 'Medium shade', pt: 'Sombra média' },
        surface_temperature: { en: 'Warm (~28°C)', pt: 'Morno (~28°C)' },
        target_age_group: { id: 'preschool' },
      },
    });

    return new Response(JSON.stringify(newPlayground), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error creating playground:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create playground' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
