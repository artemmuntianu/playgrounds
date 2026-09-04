// Playground persistence module.
// Data CRUD + scenes now route through `repo` (Supabase when configured, else file system).
// Image binaries (photos/depth/seg) stay on the file system via `photos` + `paths`.
export { BASE_DIR, ensureBaseDir, playgroundDir } from './paths';
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
  getPhotoUrl,
  getPhotoPath,
} from './photos';
