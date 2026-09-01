import fs from 'node:fs/promises';
import path from 'node:path';
import type { Playground, PlaygroundSummary, PlaygroundPhoto } from '../types/playground';
import type { SceneAnnotation } from '../types/shadow';

const BASE_DIR = path.join(process.cwd(), 'data', 'playgrounds');

/**
 * Ensure the base playgrounds directory exists.
 */
async function ensureBaseDir(): Promise<void> {
  await fs.mkdir(BASE_DIR, { recursive: true });
}

/**
 * Get the directory path for a specific playground.
 */
function playgroundDir(id: string): string {
  return path.join(BASE_DIR, id);
}

/**
 * Convert a name string into a safe slug ID (lowercase, underscores only).
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 64);
}

/**
 * List all playgrounds as summaries.
 */
export async function listPlaygrounds(): Promise<PlaygroundSummary[]> {
  await ensureBaseDir();

  let entries: string[];
  try {
    entries = await fs.readdir(BASE_DIR);
  } catch {
    return [];
  }

  const summaries: PlaygroundSummary[] = [];

  for (const entry of entries) {
    const jsonPath = path.join(BASE_DIR, entry, 'playground.json');
    try {
      const raw = await fs.readFile(jsonPath, 'utf-8');
      const pg: Playground = JSON.parse(raw);

      // Determine thumbnail URL
      const thumbPhoto = pg.photos.find((p) => p.id === pg.thumbnail_photo_id);
      const thumbnail_url = thumbPhoto
        ? `/api/playgrounds/${pg.id}/photo/${thumbPhoto.filename}`
        : '';

      summaries.push({
        id: pg.id,
        name: pg.name,
        short_description: pg.short_description,
        location_name: pg.location_name,
        thumbnail_url,
        attributes: pg.attributes,
        photo_count: pg.photos.length,
        created_at: pg.created_at,
      });
    } catch {
      // Skip directories that don't have a valid playground.json
      continue;
    }
  }

  // Sort by created_at descending (newest first)
  summaries.sort((a, b) => b.created_at.localeCompare(a.created_at));

  return summaries;
}

/**
 * Get a single playground by ID.
 */
export async function getPlayground(id: string): Promise<Playground | null> {
  const jsonPath = path.join(playgroundDir(id), 'playground.json');
  try {
    const raw = await fs.readFile(jsonPath, 'utf-8');
    return JSON.parse(raw) as Playground;
  } catch {
    return null;
  }
}

/**
 * Create a new playground.
 */
export async function createPlayground(
  data: Omit<Playground, 'id' | 'created_at' | 'updated_at'>,
): Promise<Playground> {
  await ensureBaseDir();

  let id = slugify(data.name.en);
  if (!id) {
    id = `playground_${Date.now()}`;
  }

  // Ensure unique ID
  let finalId = id;
  let counter = 1;
  while (true) {
    try {
      await fs.access(playgroundDir(finalId));
      // Directory exists, try next suffix
      finalId = `${id}_${counter}`;
      counter++;
    } catch {
      // Directory doesn't exist, we can use this ID
      break;
    }
  }

  const now = new Date().toISOString();
  const playground: Playground = {
    ...data,
    id: finalId,
    created_at: now,
    updated_at: now,
  };

  // Create directory structure
  const dir = playgroundDir(finalId);
  await fs.mkdir(path.join(dir, 'photos'), { recursive: true });
  await fs.mkdir(path.join(dir, 'scenes'), { recursive: true });
  await fs.mkdir(path.join(dir, 'thumbnails'), { recursive: true });

  // Write playground.json
  await fs.writeFile(
    path.join(dir, 'playground.json'),
    JSON.stringify(playground, null, 2),
    'utf-8',
  );

  return playground;
}

/**
 * Update an existing playground.
 */
export async function updatePlayground(
  id: string,
  data: Partial<Playground>,
): Promise<Playground> {
  const existing = await getPlayground(id);
  if (!existing) {
    throw new Error(`Playground '${id}' not found`);
  }

  const updated: Playground = {
    ...existing,
    ...data,
    id, // ID cannot be changed
    created_at: existing.created_at, // created_at cannot be changed
    updated_at: new Date().toISOString(),
  };

  await fs.writeFile(
    path.join(playgroundDir(id), 'playground.json'),
    JSON.stringify(updated, null, 2),
    'utf-8',
  );

  return updated;
}

/**
 * Delete a playground and all its files.
 */
export async function deletePlayground(id: string): Promise<void> {
  const dir = playgroundDir(id);
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (err: any) {
    throw new Error(`Failed to delete playground '${id}': ${err.message}`);
  }
}

/**
 * Save a photo file for a playground.
 * Returns the relative filename (e.g. "photo_1.jpg").
 */
export async function savePlaygroundPhoto(
  playgroundId: string,
  photoId: string,
  fileBuffer: Buffer,
  mimeType: string,
): Promise<string> {
  const ext = mimeType === 'image/png' ? '.png' : mimeType === 'image/webp' ? '.webp' : '.jpg';
  const filename = `${photoId}${ext}`;
  const photosDir = path.join(playgroundDir(playgroundId), 'photos');
  await fs.mkdir(photosDir, { recursive: true });
  await fs.writeFile(path.join(photosDir, filename), fileBuffer);
  return filename;
}

/**
 * Save a depth map image for a playground photo.
 * Returns the relative filename (e.g. "photo_1_depth.png").
 */
export async function savePlaygroundDepthMap(
  playgroundId: string,
  photoId: string,
  fileBuffer: Buffer,
  mimeType: string,
): Promise<string> {
  const ext = mimeType === 'image/jpeg' ? '.jpg' : '.png';
  const filename = `${photoId}_depth${ext}`;
  const photosDir = path.join(playgroundDir(playgroundId), 'photos');
  await fs.mkdir(photosDir, { recursive: true });
  await fs.writeFile(path.join(photosDir, filename), fileBuffer);
  return filename;
}

/**
 * Delete a photo file and associated depth map / scene.
 */
export async function deletePlaygroundPhoto(
  playgroundId: string,
  photoId: string,
): Promise<void> {
  const pg = await getPlayground(playgroundId);
  if (!pg) throw new Error(`Playground '${playgroundId}' not found`);

  const photo = pg.photos.find((p) => p.id === photoId);
  if (!photo) throw new Error(`Photo '${photoId}' not found`);

  const dir = playgroundDir(playgroundId);

  // Delete the photo file
  try {
    await fs.unlink(path.join(dir, 'photos', photo.filename));
  } catch { /* ignore if file doesn't exist */ }

  // Delete depth map if exists
  if (photo.depth_map_filename) {
    try {
      await fs.unlink(path.join(dir, 'photos', photo.depth_map_filename));
    } catch { /* ignore */ }
  }

  // Delete scene if exists
  try {
    await fs.unlink(path.join(dir, 'scenes', `${photoId}_scene.json`));
  } catch { /* ignore */ }
}

/**
 * Save a scene annotation for a specific photo.
 */
export async function savePlaygroundScene(
  playgroundId: string,
  photoId: string,
  scene: SceneAnnotation,
): Promise<void> {
  const scenesDir = path.join(playgroundDir(playgroundId), 'scenes');
  await fs.mkdir(scenesDir, { recursive: true });
  await fs.writeFile(
    path.join(scenesDir, `${photoId}_scene.json`),
    JSON.stringify(scene, null, 2),
    'utf-8',
  );
}

/**
 * Get a scene annotation for a specific photo.
 */
export async function getPlaygroundScene(
  playgroundId: string,
  photoId: string,
): Promise<SceneAnnotation | null> {
  const filePath = path.join(
    playgroundDir(playgroundId),
    'scenes',
    `${photoId}_scene.json`,
  );
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as SceneAnnotation;
  } catch {
    return null;
  }
}

/**
 * Get the client-accessible URL for a playground photo.
 */
export function getPhotoUrl(playgroundId: string, filename: string): string {
  return `/api/playgrounds/${playgroundId}/photo/${filename}`;
}

/**
 * Get the absolute filesystem path for a playground photo.
 */
export function getPhotoPath(playgroundId: string, filename: string): string {
  return path.join(playgroundDir(playgroundId), 'photos', filename);
}
