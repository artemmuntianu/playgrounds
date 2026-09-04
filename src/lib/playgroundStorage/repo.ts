import type { Playground, PlaygroundSummary } from '../../types/playground';
import type { SceneAnnotation } from '../../types/shadow';
import * as db from './db';

// The database (Supabase) is the single source of truth for all playground data.
// There is no file-system fallback anymore.

export const listPlaygrounds: () => Promise<PlaygroundSummary[]> = db.listPlaygrounds;

export const getPlayground: (id: string) => Promise<Playground | null> = db.getPlayground;

export const createPlayground: (
  data: Omit<Playground, 'id' | 'created_at' | 'updated_at'>,
) => Promise<Playground> = db.createPlayground;

export const updatePlayground: (id: string, data: Partial<Playground>) => Promise<Playground> =
  db.updatePlayground;

export const deletePlayground: (id: string) => Promise<void> = db.deletePlayground;

export const getPlaygroundScene: (
  playgroundId: string,
  photoId: string,
) => Promise<SceneAnnotation | null> = db.getPlaygroundScene;

export const savePlaygroundScene: (
  playgroundId: string,
  photoId: string,
  scene: SceneAnnotation,
) => Promise<void> = db.savePlaygroundScene;
