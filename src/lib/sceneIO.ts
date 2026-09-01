import type { SceneAnnotation } from '../types/shadow';

/**
 * Saves a SceneAnnotation object to the server via POST /api/scene
 */
export async function saveScene(scene: SceneAnnotation): Promise<void> {
  const response = await fetch('/api/scene', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(scene),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to save scene (HTTP ${response.status})`);
  }
}

/**
 * Loads a SceneAnnotation object from the server via GET /api/scene?scene_id=...
 */
export async function loadScene(scene_id: string): Promise<SceneAnnotation> {
  const response = await fetch(`/api/scene?scene_id=${encodeURIComponent(scene_id)}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to load scene '${scene_id}' (HTTP ${response.status})`);
  }

  return response.json();
}
