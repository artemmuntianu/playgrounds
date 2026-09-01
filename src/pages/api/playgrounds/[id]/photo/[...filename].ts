import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getPhotoPath } from '../../../../../lib/playgroundStorage';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const playgroundId = params.id;
  const filename = params.filename;

  if (!playgroundId || !filename) {
    return new Response('Not found', { status: 404 });
  }

  // Prevent directory traversal
  const safeFilename = path.basename(filename);
  const filePath = getPhotoPath(playgroundId, safeFilename);

  try {
    const fileBuffer = await fs.readFile(filePath);
    const ext = path.extname(safeFilename).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    return new Response('Image not found', { status: 404 });
  }
};
