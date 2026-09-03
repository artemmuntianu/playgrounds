import React, { useState, useEffect, useRef } from 'react';
import type { SceneAnnotation, SolarPosition } from '../../types/shadow';
import { getSolarPosition } from '../../lib/solar';
import { renderShadows } from '../../lib/shadowRenderer';

interface ViewerShadowCanvasProps {
  imageUrl: string;
  depthMapUrl?: string;
  scene?: SceneAnnotation | null;
  latitude: number;
  longitude: number;
  simulatedTimeMinutes: number; // minutes from 00:00 (e.g. 9*60 + 45 = 585 for 09:45)
  isAdditional?: boolean;
}

export const ViewerShadowCanvas: React.FC<ViewerShadowCanvasProps> = ({
  imageUrl,
  depthMapUrl,
  scene,
  latitude,
  longitude,
  simulatedTimeMinutes,
  isAdditional = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);
  const [depthMapData, setDepthMapData] = useState<ImageData | null>(null);
  const [solar, setSolar] = useState<SolarPosition | null>(null);

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
  }, [simulatedTimeMinutes, scene, latitude, longitude, depthMapData, isAdditional]);

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

    // 1. Draw base photo
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(baseImg, 0, 0, w, h);

    // If it is an additional photo, we don't render shadows or sun overlay
    if (isAdditional) {
      return;
    }

    // 2. Render shadow overlay if sun is up and scene annotations exist
    if (sol.altitude_deg > 0 && scene && scene.annotations.length > 0) {
      const meta = scene.scene_metadata;
      renderShadows(
        ctx,
        w,
        h,
        scene.annotations,
        sol,
        depthMapData,
        baseImg,
        meta.camera_azimuth_deg || 0,
        meta.horizon_y,
        meta.camera_fov_deg || 65,
        meta.camera_pitch_deg
      );
    }

    // 3. Render Sun Disc & Rays if Sun is in camera FOV
    if (sol.altitude_deg > 0 && scene) {
      const cameraAzimuthDeg = scene.scene_metadata.camera_azimuth_deg || 0;
      const cameraFovDeg = scene.scene_metadata.camera_fov_deg || 65;

      const diffAzimuth = (sol.azimuth_deg - cameraAzimuthDeg + 540) % 360 - 180;
      const halfFov = cameraFovDeg / 2;

      if (Math.abs(diffAzimuth) <= halfFov + 10) {
        const xNorm = 0.5 + diffAzimuth / cameraFovDeg;
        const yNorm = Math.max(0.06, Math.min(0.8, 0.45 - (sol.altitude_deg / 90) * 0.4));
        const sunPx = xNorm * w;
        const sunPy = yNorm * h;

        ctx.save();
        // Solar glow
        const glow = ctx.createRadialGradient(sunPx, sunPy, 5, sunPx, sunPy, 70);
        glow.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
        glow.addColorStop(0.3, 'rgba(250, 204, 21, 0.4)');
        glow.addColorStop(1, 'rgba(250, 204, 21, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sunPx, sunPy, 70, 0, Math.PI * 2);
        ctx.fill();

        // Inner Sun
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sunPx, sunPy, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.restore();
      }
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
