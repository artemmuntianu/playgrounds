import { getPlayground } from './repo';
import { putBinary, deleteBinary, getPhotoUrl } from './blob';

const photosPathname = (playgroundId: string, filename: string): string =>
  `playgrounds/${encodeURIComponent(playgroundId)}/photos/${encodeURIComponent(filename)}`;

/** Save a photo to Vercel Blob; returns the bare stored filename (DB stays filename-based). */
export async function savePlaygroundPhoto(
  playgroundId: string,
  photoId: string,
  fileBuffer: Buffer,
  mimeType: string,
): Promise<string> {
  const ext = mimeType === 'image/png' ? '.png' : mimeType === 'image/webp' ? '.webp' : '.jpg';
  const filename = `${photoId}${ext}`;
  await putBinary(photosPathname(playgroundId, filename), fileBuffer, mimeType);
  return filename;
}

/** Save a depth map to Vercel Blob; returns the bare stored filename. */
export async function savePlaygroundDepthMap(
  playgroundId: string,
  photoId: string,
  fileBuffer: Buffer,
  mimeType: string,
): Promise<string> {
  const ext = mimeType === 'image/jpeg' ? '.jpg' : '.png';
  const filename = `${photoId}_depth${ext}`;
  await putBinary(photosPathname(playgroundId, filename), fileBuffer, mimeType);
  return filename;
}

/** Save a semantic segmentation mask to Vercel Blob; returns the bare stored filename. */
export async function savePlaygroundSegMask(
  playgroundId: string,
  photoId: string,
  fileBuffer: Buffer,
  mimeType: string,
): Promise<string> {
  const ext = mimeType === 'image/jpeg' ? '.jpg' : '.png';
  const filename = `${photoId}_seg${ext}`;
  await putBinary(photosPathname(playgroundId, filename), fileBuffer, mimeType);
  return filename;
}

/** Delete a photo's blobs (photo + optional depth map + optional seg mask). */
export async function deletePlaygroundPhoto(
  playgroundId: string,
  photoId: string,
): Promise<void> {
  const pg = await getPlayground(playgroundId);
  if (!pg) throw new Error(`Playground '${playgroundId}' not found`);

  const photo = pg.photos.find((p) => p.id === photoId);
  if (!photo) throw new Error(`Photo '${photoId}' not found`);

  const names = [photo.filename, photo.depth_map_filename, photo.semantic_mask_filename].filter(
    (n): n is string => Boolean(n),
  );
  for (const name of names) {
    const url = await getPhotoUrl(playgroundId, name);
    if (url) await deleteBinary(url);
  }
}

