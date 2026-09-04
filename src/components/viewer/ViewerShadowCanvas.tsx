import React, { useState, useEffect, useRef } from 'react';
import type { SceneAnnotation, SolarPosition } from '../../types/shadow';
import type { EnvironmentEffects, WeatherSnapshot } from '../../types/environment';
import { getSolarPosition } from '../../lib/solar';
import { createRainLayer, renderRain, renderWetGround } from '../../lib/rain';
import { RAIN_CONFIG } from '../../lib/environmentConfig';
import { loadSegmentationMask } from '../../lib/segmentation';
import { renderSegmentedScene } from '../../lib/segRenderer';
import type { ShadowCameraParams } from '../../lib/shadowProjection';
import type { SegmentationData } from '../../types/segmentation';

/** A dot-marker to overlay onto the photo (normalised 0..1 coordinates). */
export interface EquipmentMarkerDisplay {
  x: number;
  y: number;
  label: string;
  category: string;
}

interface ViewerShadowCanvasProps {
  imageUrl: string;
  depthMapUrl?: string;
  segMaskUrl?: string;
  scene?: SceneAnnotation | null;
  latitude: number;
  longitude: number;
  simulatedTimeMinutes: number; // minutes from 00:00 (e.g. 9*60 + 45 = 585 for 09:45)
  isAdditional?: boolean;
  weather?: WeatherSnapshot | null;
  effects?: EnvironmentEffects;
  /** Equipment dot-markers to draw on top of the photo (all photos). */
  equipmentMarkers?: EquipmentMarkerDisplay[];
}

const CATEGORY_COLOR: Record<string, string> = {
  ride_balance: '#f59e0b',
  sport_complex: '#3b82f6',
  development: '#8b5cf6',
  rest: '#10b981',
  default: '#047857',
};

/** Draw dot markers + labels, using the image's native pixel size as the canvas basis. */
function drawEquipmentMarkers(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  markers: EquipmentMarkerDisplay[],
): void {
  for (const m of markers) {
    const px = Math.min(Math.max(m.x, 0), 1) * w;
    const py = Math.min(Math.max(m.y, 0), 1) * h;
    const color = CATEGORY_COLOR[m.category] ?? CATEGORY_COLOR.default;

    // Pin / dot
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.stroke();

    // White center
    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Label box
    const label = m.label;
    ctx.font = 'bold 13px system-ui, sans-serif';
    const textW = ctx.measureText(label).width;
    const boxW = textW + 12;
    const boxH = 20;
    const boxX = Math.min(Math.max(px + 10, 4), Math.max(w - boxW - 4, 4));
    const boxY = Math.max(py - boxH - 6, 4);

    ctx.fillStyle = 'rgba(15,23,42,0.9)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, boxX + 6, boxY + boxH / 2 + 0.5);
  }
}


export const ViewerShadowCanvas: React.FC<ViewerShadowCanvasProps> = ({
  imageUrl,
  depthMapUrl,
  segMaskUrl,
  scene,
  latitude,
  longitude,
  simulatedTimeMinutes,
  isAdditional = false,
  weather,
  effects,
  equipmentMarkers = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);
  const [depthMapData, setDepthMapData] = useState<ImageData | null>(null);
  const [solar, setSolar] = useState<SolarPosition | null>(null);
  const [segData, setSegData] = useState<SegmentationData | null>(null);

  // Rain / static-frame cache for the animation loop.
  const staticCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rainLayerRef = useRef<HTMLCanvasElement | null>(null);
  const rainLayerSeedRef = useRef<number | null>(null);
  const rainOffsetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastRainFrameRef = useRef(0);

  const startRainAnimation = (w: number, h: number) => {
    if (rafRef.current !== null) return;
    const seed = effects?.rain.seed ?? RAIN_CONFIG.seed;
    if (rainLayerSeedRef.current !== seed || !rainLayerRef.current) {
      rainLayerRef.current = createRainLayer(w, h, seed, effects?.rain ?? RAIN_CONFIG);
      rainLayerSeedRef.current = seed;
    }
    lastRainFrameRef.current = performance.now();
    const loop = (now: number) => {
      const dt = (now - lastRainFrameRef.current) / 1000;
      lastRainFrameRef.current = now;
      rainOffsetRef.current +=
        (effects?.rain.speedPxPerSec ?? RAIN_CONFIG.speedPxPerSec) * dt;
      const canvas = canvasRef.current;
      const staticC = staticCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && staticC && ctx) {
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(staticC, 0, 0, w, h);
        renderRain(
          ctx,
          w,
          h,
          rainLayerRef.current!,
          rainOffsetRef.current,
          effects?.rain ?? RAIN_CONFIG
        );
        renderWetGround(ctx, w, h, weather?.precipitation_mm ?? 0, effects?.rain ?? RAIN_CONFIG);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const stopRainAnimation = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const canvas = canvasRef.current;
    const staticC = staticCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && staticC && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(staticC, 0, 0, canvas.width, canvas.height);
    }
  };

  // Load Depth Map (only if not additional photo)
  useEffect(() => {
    if (isAdditional || !depthMapUrl) {
      setDepthMapData(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = depthMapUrl;

    img.onload = () => {
      const offscreen = document.createElement('canvas');
      offscreen.width = img.naturalWidth || img.width;
      offscreen.height = img.naturalHeight || img.height;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        try {
          const imgData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
          setDepthMapData(imgData);
        } catch {
          setDepthMapData(null);
        }
      }
    };
    img.onerror = () => setDepthMapData(null);
  }, [depthMapUrl, isAdditional]);

  // Load Semantic Segmentation Mask (3-colour sky/vertical/ground)
  useEffect(() => {
    if (isAdditional || !segMaskUrl) {
      setSegData(null);
      return;
    }
    let cancelled = false;
    loadSegmentationMask(segMaskUrl)
      .then((seg) => {
        if (!cancelled) setSegData(seg);
      })
      .catch((err) => {
        console.warn('Failed to load segmentation mask:', err);
        if (!cancelled) setSegData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [segMaskUrl, isAdditional]);

  // Load Base Image
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      baseImageRef.current = img;
      render();
    };
  }, [imageUrl]);

  // Trigger render when time or scene changes
  useEffect(() => {
    render();
  }, [simulatedTimeMinutes, scene, latitude, longitude, depthMapData, isAdditional, weather, effects, segData]);

  const render = () => {
    const canvas = canvasRef.current;
    const baseImg = baseImageRef.current;
    if (!canvas || !baseImg) return;

    const hours = Math.floor(simulatedTimeMinutes / 60);
    const minutes = simulatedTimeMinutes % 60;
    const now = new Date();
    now.setHours(hours, minutes, 0, 0);

    const sol = getSolarPosition(now, latitude, longitude);
    setSolar(sol);

    const w = baseImg.naturalWidth || baseImg.width || 800;
    const h = baseImg.naturalHeight || baseImg.height || 600;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cloudCoverPct = effects?.clouds.cloudCoverPct ?? weather?.cloud_cover_pct ?? 0;

    // 1. Draw base photo
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(baseImg, 0, 0, w, h);

    // Draw equipment dot-markers (shown on every photo, incl. additional).
    drawEquipmentMarkers(ctx, w, h, equipmentMarkers);

    // If it is an additional photo, we don't render shadows or sun overlay
    if (isAdditional) {
      return;
    }

    const meta = scene?.scene_metadata;
    const cameraParams: ShadowCameraParams = {
      cameraAzimuthDeg: meta?.camera_azimuth_deg ?? 0,
      cameraFovDeg: meta?.camera_fov_deg ?? 65,
      cameraPitchDeg: meta?.camera_pitch_deg,
    };
    if (meta?.horizon_y !== undefined) cameraParams.horizonY = meta.horizon_y;

    // The depth map and semantic mask are always uploaded, so the segmented renderer is the only
    // path. The guard just waits for the async mask to finish loading (the base photo is already
    // drawn above); there is no ad-hoc no-mask fallback anymore.
    if (segData) {
      renderSegmentedScene(
        ctx,
        w,
        h,
        scene?.annotations ?? [],
        sol,
        segData,
        cameraParams,
        depthMapData,
        cloudCoverPct,
        meta?.sun_light_strength,
        meta?.sun_sky_glow
      );
    }

    // Cache the composited static frame (base + shadow + light) so the rain animation can
    // composite it every frame without re-running the expensive passes.
    if (!staticCanvasRef.current) {
      staticCanvasRef.current = document.createElement('canvas');
      staticCanvasRef.current.width = w;
      staticCanvasRef.current.height = h;
    }
    const staticCtx = staticCanvasRef.current.getContext('2d');
    if (staticCtx) {
      staticCtx.clearRect(0, 0, w, h);
      staticCtx.drawImage(canvas, 0, 0, w, h);
    }

    const isRaining = !!(effects?.rain.enabled && (weather?.precipitation_mm ?? 0) > 0);
    if (isRaining) {
      startRainAnimation(w, h);
    } else {
      stopRainAnimation();
    }
  };

  return (
    <div className="relative w-full aspect-[4/3] bg-white flex items-center justify-center overflow-hidden">
      {!imageUrl ? (
        <div className="text-slate-300 text-sm font-medium">No photo selected</div>
      ) : (
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
        />
      )}

      {/* Gallery Photo Badge if additional */}
      {isAdditional && (
        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
          <span>🖼️</span>
          <span>Gallery Photo</span>
        </div>
      )}

      {/* Nighttime Indicator Overlay (only for shadow-enabled photos) */}
      {!isAdditional && solar && solar.altitude_deg <= 0 && (
        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
          <span>🌙</span>
          <span>Nighttime (No sun shadows)</span>
        </div>
      )}
    </div>
  );
};
