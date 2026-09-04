import { put, del, list } from '@vercel/blob';

export interface BinaryUpload {
  url: string;
}

// pathname -> public url cache. Seeded by uploads, lazily filled on read per playground prefix.
const urlCache = new Map<string, string>();
const listedPrefixes = new Set<string>();

function token(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

function blobPathname(playgroundId: string, filename: string): string {
  return `playgrounds/${encodeURIComponent(playgroundId)}/photos/${encodeURIComponent(filename)}`;
}

function photosPrefix(playgroundId: string): string {
  return `playgrounds/${encodeURIComponent(playgroundId)}/photos/`;
}

/** Upload a binary to Vercel Blob at a deterministic pathname (public, CDN-served). */
export async function putBinary(
  pathname: string,
  buffer: Buffer,
  contentType: string,
): Promise<BinaryUpload> {
  const t = token();
  const { url } = await put(pathname, buffer, {
    access: 'public',
    addRandomSuffix: false,
    contentType,
    ...(t ? { token: t } : {}),
  });
  urlCache.set(pathname, url);
  return { url };
}

/** Delete a blob by its public URL. */
export async function deleteBinary(url: string): Promise<void> {
  const t = token();
  await del(url, t ? { token: t } : {});
}

/**
 * Resolve a bare stored filename to its public Vercel Blob URL.
 * Cached in-memory per pathname; on a cold read lists the playground's photo prefix once.
 * Returns '' when Blob is not configured (no token) or the blob is unknown.
 */
export async function getPhotoUrl(playgroundId: string, filename: string): Promise<string> {
  const pathname = blobPathname(playgroundId, filename);
  const cached = urlCache.get(pathname);
  if (cached) return cached;

  const t = token();
  if (t) {
    const prefix = photosPrefix(playgroundId);
    if (!listedPrefixes.has(prefix)) {
      const { blobs } = await list({ prefix, limit: 1000, token: t });
      for (const b of blobs) urlCache.set(b.pathname, b.url);
      listedPrefixes.add(prefix);
    }
  }
  return urlCache.get(pathname) ?? '';
}
