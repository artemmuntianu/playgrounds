import React from 'react';
import type { AnnotationMode } from './types';

export interface ImageRectMetrics {
  imgLeft: number;
  imgTop: number;
  imgW: number;
  imgH: number;
  scaleX: number;
  scaleY: number;
}

interface AnnotationCanvasProps {
  imageUrl: string;
  containerRef: React.RefObject<HTMLDivElement>;
  imageRef: React.RefObject<HTMLImageElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  mode: AnnotationMode;
  setHorizonY: (v: number) => void;
  drawOverlay: () => void;
  getImageRectMetrics: () => ImageRectMetrics | null;
  handleCanvasClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleDoubleClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  imageUrl,
  containerRef,
  imageRef,
  canvasRef,
  mode,
  setHorizonY,
  drawOverlay,
  getImageRectMetrics,
  handleCanvasClick,
  handleDoubleClick,
}) => {
  return (
        <div
          ref={containerRef}
          className="relative inline-block border border-gray-400 rounded-lg overflow-hidden shadow-inner bg-slate-900 p-8"
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Playground Base"
            className="max-h-[550px] w-auto block select-none pointer-events-none rounded border border-blue-400/50 shadow-md"
            onLoad={drawOverlay}
          />
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onDoubleClick={handleDoubleClick}
            onMouseDown={(e) => {
              if (mode === 'setting_horizon') {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const rect = canvas.getBoundingClientRect();
                const metrics = getImageRectMetrics();
                if (!metrics) return;
                const normY = Math.max(
                  0,
                  Math.min(1, (e.clientY - rect.top - metrics.imgTop) / metrics.imgH)
                );
                setHorizonY(Number(normY.toFixed(4)));
                drawOverlay();
              }
            }}
            onMouseMove={(e) => {
              if (mode === 'setting_horizon' && e.buttons === 1) {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const rect = canvas.getBoundingClientRect();
                const metrics = getImageRectMetrics();
                if (!metrics) return;
                const normY = Math.max(
                  0,
                  Math.min(1, (e.clientY - rect.top - metrics.imgTop) / metrics.imgH)
                );
                setHorizonY(Number(normY.toFixed(4)));
                drawOverlay();
              }
            }}
            className="absolute inset-0 w-full h-full cursor-crosshair z-10"
          />
        </div>
  );
};

