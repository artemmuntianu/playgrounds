import type { Point2D } from '../types/shadow';

export interface ImageRectMetrics {
  imgLeft: number;
  imgTop: number;
  imgW: number;
  imgH: number;
  scaleX: number;
  scaleY: number;
}

/**
 * Measure the *real* on-screen rectangle of the photo inside the canvas, relative to the
 * canvas element. This is the same approach used by the shadow annotation tool and avoids
 * the historical drift caused by assuming a fixed margin instead of the measured rect.
 */
export function getImageRectMetrics(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
): ImageRectMetrics | null {
  const canvasRect = canvas.getBoundingClientRect();
  const imgRect = img.getBoundingClientRect();
  if (
    canvasRect.width === 0 ||
    canvasRect.height === 0 ||
    imgRect.width === 0 ||
    imgRect.height === 0
  ) {
    return null;
  }
  return {
    imgLeft: imgRect.left - canvasRect.left,
    imgTop: imgRect.top - canvasRect.top,
    imgW: imgRect.width,
    imgH: imgRect.height,
    scaleX: canvas.width / canvasRect.width,
    scaleY: canvas.height / canvasRect.height,
  };
}

/** Convert a click (CSS px relative to the canvas) into normalised image coords (0..1). */
export function canvasPxToNorm(
  px: number,
  py: number,
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
): Point2D {
  const m = getImageRectMetrics(canvas, img);
  if (!m) return { x: 0, y: 0 };
  return {
    x: (px - m.imgLeft) / m.imgW,
    y: (py - m.imgTop) / m.imgH,
  };
}

/** Convert normalised image coords to canvas *buffer* pixels (for drawing). */
export function normToCanvasPx(
  pt: Point2D,
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
): Point2D {
  const m = getImageRectMetrics(canvas, img);
  if (!m) return { x: 0, y: 0 };
  return {
    x: (m.imgLeft + pt.x * m.imgW) * m.scaleX,
    y: (m.imgTop + pt.y * m.imgH) * m.scaleY,
  };
}
