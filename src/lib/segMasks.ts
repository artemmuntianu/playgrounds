import type { SegmentationData, SegCategory } from '../types/segmentation';
import { createCategoryMaskCanvas } from './segmentation';
import { RENDER_CONFIG } from './environmentConfig';
import { blurCanvasOwned } from './softShape';

/**
 * Feathered category-mask cache (sky / vertical / ground), keyed by the segmentation payload.
 *
 * A 1-bit mask used with `destination-in` produced hard, stair-stepped edges exactly where a
 * shadow's penumbra is visible (the ground / object silhouette), which read as "bad rendering" on
 * phones. The feather is baked into the cached canvas, so its cost is paid once per photo — hence
 * the `WeakMap`: an entry dies together with the segmentation payload it belongs to.
 *
 * Extracted from `segRenderer.ts` so the shadow pass and the light passes share ONE cache (a mask
 * must never be built twice for the same photo).
 */
const maskCache = new WeakMap<SegmentationData, Partial<Record<SegCategory, HTMLCanvasElement>>>();

/** Cached (and feathered) category mask canvas for one segmentation payload. */
export function getMask(seg: SegmentationData, category: SegCategory): HTMLCanvasElement {
  let record = maskCache.get(seg);
  if (!record) {
    record = {};
    maskCache.set(seg, record);
  }
  if (!record[category]) {
    const hard = createCategoryMaskCanvas(seg, category);
    record[category] = blurCanvasOwned(hard, RENDER_CONFIG.maskFeatherPx);
  }
  return record[category]!;
}
