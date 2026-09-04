import React, { useRef, useEffect } from 'react';
import {
  canvasPxToNorm,
  normToCanvasPx,
} from '../../lib/annotationCoords';
import type { EquipmentMarkerDisplay } from '../viewer/ViewerShadowCanvas';

interface EquipmentMarkerCanvasProps {
  imageUrl: string;
  markers: EquipmentMarkerDisplay[];
  onPlaceMarker: (x: number, y: number) => void;
  selectable: boolean;
}

const CATEGORY_COLOR: Record<string, string> = {
  ride_balance: '#f59e0b',
  sport_complex: '#3b82f6',
  development: '#8b5cf6',
  rest: '#10b981',
  default: '#047857',
};

export const EquipmentMarkerCanvas: React.FC<EquipmentMarkerCanvasProps> = ({
  imageUrl,
  markers,
  onPlaceMarker,
  selectable,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const baseW = img.clientWidth;
    const baseH = img.clientHeight;
    if (baseW === 0 || baseH === 0) return;
    if (canvas.width !== baseW || canvas.height !== baseH) {
      canvas.width = baseW;
      canvas.height = baseH;
    }

    ctx.clearRect(0, 0, baseW, baseH);

    for (const m of markers) {
      const p = normToCanvasPx({ x: m.x, y: m.y }, canvas, img);
      const color = CATEGORY_COLOR[m.category] ?? CATEGORY_COLOR.default;

      ctx.beginPath();
      ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.font = 'bold 13px system-ui, sans-serif';
      const textW = ctx.measureText(m.label).width;
      const boxW = textW + 12;
      const boxH = 20;
      const boxX = Math.min(Math.max(p.x + 11, 4), Math.max(baseW - boxW - 4, 4));
      const boxY = Math.max(p.y - boxH - 6, 4);
      ctx.fillStyle = 'rgba(15,23,42,0.9)';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.label, boxX + 6, boxY + boxH / 2 + 0.5);
    }
  };

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, markers]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectable) return;
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    const rect = canvas.getBoundingClientRect();
    const norm = canvasPxToNorm(e.clientX - rect.left, e.clientY - rect.top, canvas, img);
    onPlaceMarker(Math.min(Math.max(norm.x, 0), 1), Math.min(Math.max(norm.y, 0), 1));
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-block border border-slate-300 rounded-lg overflow-hidden bg-slate-900 shadow-inner"
    >
      <img
        ref={imageRef}
        src={imageUrl}
        alt="Playground equipment markers"
        className="max-h-[550px] w-auto block select-none pointer-events-none"
        onLoad={draw}
      />
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className={`absolute inset-0 w-full h-full ${selectable ? 'cursor-crosshair' : 'cursor-default'}`}
      />
      {selectable && (
        <div className="absolute bottom-2 left-2 bg-slate-950/70 text-white text-[10px] font-semibold px-2 py-1 rounded-lg pointer-events-none">
          🎯 Click to place a marker
        </div>
      )}
    </div>
  );
};
