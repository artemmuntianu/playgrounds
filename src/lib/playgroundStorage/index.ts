// Playground persistence module.
// All data (playground metadata, photos metadata, equipment, scenes, reference catalog)
// routes through `repo` (the Supabase database). Only image binaries (photos/depth/seg)
// stay on the file system via `photos` + `paths`.
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
