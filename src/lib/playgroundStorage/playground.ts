import fs from 'node:fs/promises';
import path from 'node:path';
import type { Playground, PlaygroundSummary } from '../../types/playground';
import { BASE_DIR, ensureBaseDir, playgroundDir } from './paths';
import { slugify } from './slugify';

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
