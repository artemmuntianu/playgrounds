import type { SegCategory, SegColorMap, SegmentationData } from '../types/segmentation';
import { RENDER_CONFIG, SEG_CATEGORY_ORDER, SEGMENT_DEFAULT_COLORS } from './environmentConfig';
import { fitWorkSize } from './softShape';

function categoryIndex(category: SegCategory): number {
  return SEG_CATEGORY_ORDER.indexOf(category);
}

/** Classifies an RGB pixel to the nearest category by squared distance to the mask colours. */
export function classifyPixel(
  r: number,
  g: number,
  b: number,
  colorMap: SegColorMap
): SegCategory {
  let best: SegCategory = 'ground';
  let bestDist = Infinity;
  for (const cat of SEG_CATEGORY_ORDER) {
    const c = colorMap[cat];
    const dr = r - c.r;
    const dg = g - c.g;
    const db = b - c.b;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = cat;
    }
  }
  return best;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load segmentation mask'));
    img.src = url;
  });
}

/** Loads a 3-colour mask PNG and decodes it into a per-pixel category array. */
export async function loadSegmentationMask(
  url: string,
  colorMap: SegColorMap = SEGMENT_DEFAULT_COLORS,
  maxDimension: number = RENDER_CONFIG.segDecodeCapPx
): Promise<SegmentationData> {
  const img = await loadImage(url);
  const source = fitWorkSize(
    img.naturalWidth || img.width,
    img.naturalHeight || img.height,
    maxDimension
  );
  const w = source.width;
  const h = source.height;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create 2d context for segmentation mask');

  // Nearest-neighbour: the mask is three flat colours, and any bilinear blending between them
  // would create in-between colours that `classifyPixel` maps to an arbitrary category. Sampling
  // also caps the decode cost, which is a per-pixel loop over the whole mask on the main thread.
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const categories = new Uint8Array(w * h);

  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    categories[i] = categoryIndex(classifyPixel(data[o], data[o + 1], data[o + 2], colorMap));
  }

  return { width: w, height: h, categories };
}

/**
 * Builds an opaque-white mask canvas for a category (used as an `destination-in` clip during
 * compositing so an effect only paints on that semantic class).
 */
export function createCategoryMaskCanvas(
  seg: SegmentationData,
  category: SegCategory
): HTMLCanvasElement {
  const w = seg.width;
  const h = seg.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const idx = categoryIndex(category);
  const out = ctx.createImageData(w, h);
  const d = out.data;
  const cats = seg.categories;

  for (let i = 0; i < w * h; i++) {
    if (cats[i] === idx) {
      const o = i * 4;
      d[o] = 255;
      d[o + 1] = 255;
      d[o + 2] = 255;
      d[o + 3] = 255;
    }
  }

  ctx.putImageData(out, 0, 0);
  return canvas;
}
