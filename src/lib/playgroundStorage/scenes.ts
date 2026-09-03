import fs from 'node:fs/promises';
import path from 'node:path';
import type { SceneAnnotation } from '../../types/shadow';
import { playgroundDir } from './paths';

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
