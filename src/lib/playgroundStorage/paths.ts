import fs from 'node:fs/promises';
import path from 'node:path';

export const BASE_DIR = path.join(process.cwd(), 'data', 'playgrounds');

/**
 * Ensure the base playgrounds directory exists.
 */
export async function ensureBaseDir(): Promise<void> {
  await fs.mkdir(BASE_DIR, { recursive: true });
}

/**
 * Get the directory path for a specific playground.
 */
export function playgroundDir(id: string): string {
  return path.join(BASE_DIR, id);
}
