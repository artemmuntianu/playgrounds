import type { Playground, PlaygroundSummary } from '../../types/playground';
import type { SceneAnnotation } from '../../types/shadow';
import { isSupabaseConfigured } from '../supabase';
import * as db from './db';
import {
  listPlaygrounds as fsListPlaygrounds,
  getPlayground as fsGetPlayground,
  createPlayground as fsCreatePlayground,
  updatePlayground as fsUpdatePlayground,
  deletePlayground as fsDeletePlayground,
} from './playground';
import {
  getPlaygroundScene as fsGetScene,
  savePlaygroundScene as fsSaveScene,
} from './scenes';

/** True when SUPABASE_URL + SUPABASE_ANON_KEY are present (checked once at import). */
const useDb = isSupabaseConfigured();

export const listPlaygrounds: () => Promise<PlaygroundSummary[]> = useDb
  ? db.listPlaygrounds
  : fsListPlaygrounds;

export const getPlayground: (id: string) => Promise<Playground | null> = useDb
  ? db.getPlayground
  : fsGetPlayground;

export const createPlayground: (
  data: Omit<Playground, 'id' | 'created_at' | 'updated_at'>,
) => Promise<Playground> = useDb ? db.createPlayground : fsCreatePlayground;

export const updatePlayground: (id: string, data: Partial<Playground>) => Promise<Playground> =
  useDb ? db.updatePlayground : fsUpdatePlayground;

export const deletePlayground: (id: string) => Promise<void> = useDb
  ? db.deletePlayground
  : fsDeletePlayground;

export const getPlaygroundScene: (
  playgroundId: string,
  photoId: string,
) => Promise<SceneAnnotation | null> = useDb ? db.getPlaygroundScene : fsGetScene;

export const savePlaygroundScene: (
  playgroundId: string,
  photoId: string,
  scene: SceneAnnotation,
) => Promise<void> = useDb ? db.savePlaygroundScene : fsSaveScene;
