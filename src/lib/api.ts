import type { Playground, PlaygroundSummary } from '../types/playground';
import type { SceneAnnotation } from '../types/shadow';

const BASE = '/api/playgrounds';

export async function fetchPlaygrounds(): Promise<PlaygroundSummary[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error('Failed to fetch playgrounds');
  return res.json();
}

export async function fetchPlayground(id: string): Promise<Playground> {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error(`Playground '${id}' not found`);
  return res.json();
}

export async function createPlayground(data: any): Promise<Playground> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create playground');
  }
  return res.json();
}

export async function updatePlayground(
  id: string,
  data: any,
): Promise<Playground> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update playground');
  }
  return res.json();
}

export async function deletePlaygroundApi(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete playground');
}

export async function updateEquipmentApi(
  id: string,
  equipment: import('../types/playground').PlaygroundEquipmentItem[],
): Promise<Playground> {
  return updatePlayground(id, { equipment });
}

export async function uploadPhoto(
  playgroundId: string,
  photoId: string,
  file: File,
  options?: {
    cameraAzimuth?: number;
    cameraFov?: number;
    isThumbnail?: boolean;
    isAdditional?: boolean;
    depthFile?: File | null;
    segMaskFile?: File | null;
  }
): Promise<Playground> {
  const form = new FormData();
  form.append('photo_id', photoId);
  form.append('file', file);
  if (options?.cameraAzimuth !== undefined) {
    form.append('camera_azimuth_deg', String(options.cameraAzimuth));
  }
  if (options?.cameraFov !== undefined) {
    form.append('camera_fov_deg', String(options.cameraFov));
  }
  if (options?.isThumbnail !== undefined) {
    form.append('is_thumbnail', String(options.isThumbnail));
  }
  if (options?.isAdditional !== undefined) {
    form.append('is_additional', String(options.isAdditional));
  }
  if (options?.depthFile) {
    form.append('depth_file', options.depthFile);
  }
  if (options?.segMaskFile) {
    form.append('seg_mask_file', options.segMaskFile);
  }

  const res = await fetch(`${BASE}/${playgroundId}/photos`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to upload photo');
  }
  return res.json();
}

export async function uploadDepthMap(
  playgroundId: string,
  photoId: string,
  depthFile: File
): Promise<Playground> {
  const form = new FormData();
  form.append('photo_id', photoId);
  form.append('depth_file', depthFile);

  const res = await fetch(`${BASE}/${playgroundId}/depth`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to upload depth map');
  }
  return res.json();
}

export async function deletePhotoApi(
  playgroundId: string,
  photoId: string,
): Promise<void> {
  const res = await fetch(
    `${BASE}/${playgroundId}/photos?photo_id=${photoId}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error('Failed to delete photo');
}

export async function fetchScene(
  playgroundId: string,
  photoId: string,
): Promise<SceneAnnotation | null> {
  const res = await fetch(`${BASE}/${playgroundId}/scenes/${photoId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch scene');
  return res.json();
}

export async function savePlaygroundSceneApi(
  playgroundId: string,
  photoId: string,
  scene: SceneAnnotation,
): Promise<void> {
  const res = await fetch(`${BASE}/${playgroundId}/scenes/${photoId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scene),
  });
  if (!res.ok) throw new Error('Failed to save scene');
}

export function getPhotoUrl(
  playgroundId: string,
  filename: string,
): string {
  return `${BASE}/${playgroundId}/photo/${filename}`;
}
