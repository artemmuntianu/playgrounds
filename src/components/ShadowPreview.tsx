import React, { useState, useEffect, useRef } from 'react';
import type { SceneAnnotation, SolarPosition } from '../types/shadow';
import { getSolarPosition } from '../lib/solar';
import { computeShadowLength } from '../lib/shadowProjection';
import { renderShadows } from '../lib/shadowRenderer';

interface ShadowPreviewProps {
  imageUrl: string;
  depthMapUrl: string;
  scene: SceneAnnotation;
  latitude: number;
  longitude: number;
}

export const ShadowPreview: React.FC<ShadowPreviewProps> = ({
  imageUrl,
  depthMapUrl,
  scene,
  latitude,
  longitude,
}) => {
  const getInitialDateTimeString = () => {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const [dateTimeString, setDateTimeString] = useState<string>(getInitialDateTimeString());
  const [solar, setSolar] = useState<SolarPosition | null>(null);
  const [depthMapData, setDepthMapData] = useState<ImageData | null>(null);
  const [loadingDepth, setLoadingDepth] = useState<boolean>(true);
  const [isRendering, setIsRendering] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);

  // Load Depth Map image into offscreen canvas once
  useEffect(() => {
    if (!depthMapUrl) {
      setDepthMapData(null);
      setLoadingDepth(false);
      return;
    }

    setLoadingDepth(true);
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
        } catch (err) {
          console.warn('Could not extract depth map ImageData:', err);
          setDepthMapData(null);
        }
      }
      setLoadingDepth(false);
    };

    img.onerror = () => {
      console.warn('Failed to load depth map image from:', depthMapUrl);
      setDepthMapData(null);
      setLoadingDepth(false);
    };
  }, [depthMapUrl]);

  // Load Base Image once
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      baseImageRef.current = img;
      triggerRender();
    };
  }, [imageUrl]);

  // Trigger render when datetime, scene, or depth data changes (debounced by 200ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      triggerRender();
    }, 200);

    return () => clearTimeout(timer);
  }, [dateTimeString, scene, latitude, longitude, depthMapData]);

  /**
   * Render Schematic Sun Overlay onto canvas
   */
  const drawSchematicSunOverlay = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    sol: SolarPosition,
    cameraAzimuthDeg: number,
    cameraFovDeg: number = 65
  ) => {
    if (sol.altitude_deg <= 0) return;

    // Calculate relative azimuth angle difference (-180° to +180°)
    let diffAzimuth = (sol.azimuth_deg - cameraAzimuthDeg + 540) % 360 - 180;
    const halfFov = cameraFovDeg / 2;

    const isSunInFov = Math.abs(diffAzimuth) <= halfFov + 10; // Slight margin for sun disc radius

    if (isSunInFov) {
      // Screen X coordinate (0.0 to 1.0)
      const xNorm = 0.5 + diffAzimuth / cameraFovDeg;
      // Screen Y coordinate based on elevation angle (0.0 top of screen to 0.5 horizon)
      const yNorm = Math.max(0.04, Math.min(0.85, 0.45 - (sol.altitude_deg / 90) * 0.42));

      const sunPx = xNorm * width;
      const sunPy = yNorm * height;

      ctx.save();

      // 1. Outer Glow Halo
      const outerGlow = ctx.createRadialGradient(sunPx, sunPy, 5, sunPx, sunPy, 90);
      outerGlow.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
      outerGlow.addColorStop(0.3, 'rgba(250, 204, 21, 0.4)');
      outerGlow.addColorStop(1, 'rgba(250, 204, 21, 0)');

      ctx.beginPath();
      ctx.arc(sunPx, sunPy, 90, 0, Math.PI * 2);
      ctx.fillStyle = outerGlow;
      ctx.fill();

      // 2. Solar Rays
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.75)';
      ctx.lineWidth = 2.5;
      const numRays = 12;
      const rayLen = 45;
      for (let i = 0; i < numRays; i++) {
        const angle = (i * (360 / numRays) * Math.PI) / 180;
        const x1 = sunPx + Math.cos(angle) * 18;
        const y1 = sunPy + Math.sin(angle) * 18;
        const x2 = sunPx + Math.cos(angle) * (18 + rayLen);
        const y2 = sunPy + Math.sin(angle) * (18 + rayLen);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // 3. Inner Solar Disk
      const innerDisk = ctx.createRadialGradient(sunPx, sunPy, 0, sunPx, sunPy, 16);
      innerDisk.addColorStop(0, '#ffffff');
      innerDisk.addColorStop(0.7, '#fef08a');
      innerDisk.addColorStop(1, '#eab308');

      ctx.beginPath();
      ctx.arc(sunPx, sunPy, 16, 0, Math.PI * 2);
      ctx.fillStyle = innerDisk;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 4. Label Badge
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 6;
      ctx.fillText(
        `☀️ Sun (${sol.altitude_deg.toFixed(1)}° alt, ${sol.azimuth_deg.toFixed(0)}° az)`,
        sunPx + 22,
        sunPy + 4
      );

      ctx.restore();
    } else {
      // Sun is OUTSIDE horizontal FOV or BEHIND camera -> Draw Sun Direction Indicator Badge
      ctx.save();
      const badgeX = width - 180;
      const badgeY = 24;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, 160, 48, 8);
      ctx.fill();
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 12px sans-serif';
      const side = diffAzimuth > 0 ? 'Right ➔' : '⬅ Left';
      const isBehind = Math.abs(diffAzimuth) > 90;
      ctx.fillText(
        `☀️ Sun: ${isBehind ? 'Behind Camera' : side}`,
        badgeX + 10,
        badgeY + 20
      );

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px sans-serif';
      ctx.fillText(
        `Azimuth: ${sol.azimuth_deg.toFixed(0)}° | Alt: ${sol.altitude_deg.toFixed(0)}°`,
        badgeX + 10,
        badgeY + 36
      );

      ctx.restore();
    }
  };

  const triggerRender = () => {
    const canvas = canvasRef.current;
    const baseImg = baseImageRef.current;
    if (!canvas || !baseImg) return;

    setIsRendering(true);

    const date = new Date(dateTimeString);
    const sol = getSolarPosition(date, latitude, longitude);
    setSolar(sol);

    const w = baseImg.naturalWidth || baseImg.width;
    const h = baseImg.naturalHeight || baseImg.height;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsRendering(false);
      return;
    }

    // 1. Draw base image
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(baseImg, 0, 0, w, h);

    // 2. Overlay shadows if sun is above horizon
    if (sol.altitude_deg > 0 && scene.annotations.length > 0) {
      renderShadows(ctx, w, h, scene.annotations, sol, depthMapData, baseImg);
    }

    // 3. Draw Schematic Sun Overlay
    const cameraAzimuth = scene.scene_metadata.camera_azimuth_deg || 0;
    const cameraFov = scene.scene_metadata.camera_fov_deg || 65;
    drawSchematicSunOverlay(ctx, w, h, sol, cameraAzimuth, cameraFov);

    setIsRendering(false);
  };

  const shadowScaleFactor = solar && solar.altitude_deg > 0
    ? computeShadowLength(1.0, solar.altitude_deg)
    : 0;

  return (
    <div className="flex flex-col gap-6 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-gray-700">Date & Local Time:</label>
          <input
            type="datetime-local"
            value={dateTimeString}
            onChange={(e) => setDateTimeString(e.target.value)}
            className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-3 text-xs md:text-sm font-medium text-gray-700">
          {solar && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border border-gray-200 shadow-sm">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span>
                Sun Azimuth: <strong>{solar.azimuth_deg.toFixed(1)}°</strong> | Altitude:{' '}
                <strong>{solar.altitude_deg.toFixed(1)}°</strong>
              </span>
              {solar.altitude_deg > 0 && (
                <span className="ml-2 text-gray-500">
                  (Shadow Scale: <strong>{shadowScaleFactor.toFixed(2)}x</strong>)
                </span>
              )}
            </div>
          )}

          {isRendering && (
            <span className="text-xs text-blue-600 animate-pulse font-semibold">
              Rendering...
            </span>
          )}
        </div>
      </div>

      {/* Nighttime / No Shadow Banner */}
      {solar && solar.altitude_deg <= 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm font-semibold flex items-center gap-2">
          <span>🌙</span>
          <span>Nighttime: Sun is below the horizon ({solar.altitude_deg.toFixed(1)}°). No shadows are cast.</span>
        </div>
      )}

      {/* Main Canvas Viewport */}
      <div className="relative flex justify-center items-center bg-gray-900 rounded-lg p-2 overflow-hidden shadow-inner min-h-[400px]">
        {loadingDepth && (
          <div className="absolute inset-0 bg-gray-900/70 z-10 flex items-center justify-center text-white text-sm">
            Loading depth map...
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-[700px] h-auto object-contain rounded shadow-lg"
        />
      </div>

      {/* Legend & Details */}
      <div className="flex flex-wrap justify-between text-xs text-gray-500 border-t border-gray-100 pt-3">
        <span>
          Annotations rendered: <strong>{scene.annotations.length}</strong> object(s)
        </span>
        <span>
          Camera facing: <strong>{scene.scene_metadata.camera_azimuth_deg || 0}°</strong> | Lens FOV:{' '}
          <strong>{scene.scene_metadata.camera_fov_deg || 65}°</strong>
        </span>
      </div>
    </div>
  );
};
