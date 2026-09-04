// Playground persistence module.
// Metadata (playgrounds, photos meta, equipment, scenes, reference catalog) lives in Supabase
// via `repo`. Image binaries (photos/depth/seg) live in **Vercel Blob** (see `blob.ts`); the DB
// keeps the bare filenames and `getPhotoUrl()` resolves them to public CDN URLs.
export { slugify } from './slugify';
export {
  listPlaygrounds,
  getPlayground,
  createPlayground,
  updatePlayground,
  deletePlayground,
  getPlaygroundScene,
  savePlaygroundScene,
} from './repo';
export {
  savePlaygroundPhoto,
  savePlaygroundDepthMap,
  savePlaygroundSegMask,
  deletePlaygroundPhoto,
} from './photos';
export { getPhotoUrl } from './blob';
