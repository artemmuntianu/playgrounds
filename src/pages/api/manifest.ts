import type { APIRoute } from 'astro';
import fs from 'fs/promises';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'data', 'playground.json');

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2));
  return new Response(JSON.stringify({ status: 'success' }), { status: 200 });
};

export const GET: APIRoute = async () => {
  try {
    const data = await fs.readFile(DATA_PATH, 'utf-8');
    return new Response(data, { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ elements: [] }), { status: 200 });
  }
};
