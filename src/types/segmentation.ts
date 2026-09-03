/** Semantic categories encoded by the 3-colour segmentation mask. */
export type SegCategory = 'sky' | 'vertical' | 'ground';

export interface SegColor {
  r: number;
  g: number;
  b: number;
}

/** Maps each category to its mask colour (the source of truth for classification). */
export type SegColorMap = Record<SegCategory, SegColor>;

/**
 * Decoded segmentation mask. `categories` holds a per-pixel category index in row-major
 * order following the `SEG_CATEGORY_ORDER` constant (0 = sky, 1 = vertical, 2 = ground).
 */
export interface SegmentationData {
  width: number;
  height: number;
  categories: Uint8Array;
}
