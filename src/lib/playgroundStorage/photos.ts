import fs from 'node:fs/promises';
import path from 'node:path';
import { getPlayground } from './repo';
import { playgroundDir } from './paths';

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
 * Save a semantic (3-colour) segmentation mask for a playground photo.
 * Returns the relative filename (e.g. "photo_1_seg.png").
 */
export async function savePlaygroundSegMask(
  playgroundId: string,
  photoId: string,
  fileBuffer: Buffer,
  mimeType: string,
): Promise<string> {
  const ext = mimeType === 'image/jpeg' ? '.jpg' : '.png';
  const filename = `${photoId}_seg${ext}`;
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

  // Delete semantic segmentation mask if exists
  if (photo.semantic_mask_filename) {
    try {
      await fs.unlink(path.join(dir, 'photos', photo.semantic_mask_filename));
    } catch { /* ignore */ }
  }

  // Delete scene if exists
  try {
    await fs.unlink(path.join(dir, 'scenes', `${photoId}_scene.json`));
  } catch { /* ignore */ }
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
