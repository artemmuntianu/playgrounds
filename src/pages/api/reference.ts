import type { APIRoute } from 'astro';
import { loadReferenceData } from '../../lib/referenceData';

export const prerender = false;

/**
 * GET /api/reference
 * Returns the full playground reference vocabulary (age groups, equipment categories,
 * equipment catalog) loaded from the database.
 */
export const GET: APIRoute = async () => {
  try {
    const bundle = await loadReferenceData();
    return new Response(JSON.stringify(bundle), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error loading reference data:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to load reference data' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
