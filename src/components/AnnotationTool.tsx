import React, { useState, useRef, useEffect } from 'react';
import type { Annotation, Point2D, SceneAnnotation } from '../types/shadow';

interface AnnotationToolProps {
  imageUrl: string;
  depthMapUrl: string;
  onSave: (scene: SceneAnnotation) => void;
  initialScene?: SceneAnnotation;
}

export const AnnotationTool: React.FC<AnnotationToolProps> = ({
  imageUrl,
  depthMapUrl,
  onSave,
  initialScene,
}) => {
  const [sceneId, setSceneId] = useState<string>(
    initialScene?.scene_metadata.scene_id || `scene_${Date.now()}`
  );
  const [cameraAzimuth, setCameraAzimuth] = useState<number>(
    initialScene?.scene_metadata.camera_azimuth_deg || 0
  );
  const [cameraFov, setCameraFov] = useState<number>(
    initialScene?.scene_metadata.camera_fov_deg || 65
  );
  const [horizonY, setHorizonY] = useState<number>(
    initialScene?.scene_metadata.horizon_y ?? 0.35
  );
  const [annotations, setAnnotations] = useState<Annotation[]>(
    initialScene?.annotations || []
  );

  const [mode, setMode] = useState<'idle' | 'drawing' | 'setting_anchor' | 'setting_horizon' | 'ground_bases'>('idle');
  const [activePolygon, setActivePolygon] = useState<Point2D[]>([]);
  const [activeAnchor, setActiveAnchor] = useState<Point2D | null>(null);

  // Selection + per-vertex ground projection mode ("open structures", variant C)
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [activeGroundBases, setActiveGroundBases] = useState<Point2D[]>([]);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [objectId, setObjectId] = useState('');
  const [category, setCategory] = useState<'tree' | 'structure' | 'building' | 'other'>('tree');
  const [heightMeters, setHeightMeters] = useState<number>(8.0);
  const [canopyOpacity, setCanopyOpacity] = useState<number>(0.85);
  const [isOffscreen, setIsOffscreen] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Margin padding percentage around image to allow off-screen drawing (15% on each side)
  const MARGIN_PCT = 0.15;

  useEffect(() => {
    if (showForm && !objectId) {
      setObjectId(`${category}_${annotations.length + 1}`);
    }
  }, [showForm, category, annotations.length, objectId]);

  // ---------------------------------------------------------------------------
  // Coordinate system.
  //
  // The canvas fills the padded container (the dark "off-screen margin" band)
  // while the real photo is the <img> underneath. Normalised annotation
  // coordinates (0..1 = photo area) MUST be derived from the *measured* image
  // rectangle on screen. Deriving them from a fixed 15% margin assumed inside
  // the canvas buffer made every saved point drift by roughly the margin width
  // (the buffer is CSS-stretched over a padded container), which is why the
  // annotation mask and its shadow appeared shifted down-left in the preview.
  // ---------------------------------------------------------------------------
  const getImageRectMetrics = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return null;
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
      // Image rectangle in CSS pixels, relative to the canvas element.
      imgLeft: imgRect.left - canvasRect.left,
      imgTop: imgRect.top - canvasRect.top,
      imgW: imgRect.width,
      imgH: imgRect.height,
      // Canvas buffer pixels -> CSS pixels (the buffer is stretched by CSS).
      scaleX: canvas.width / canvasRect.width,
      scaleY: canvas.height / canvasRect.height,
    };
  };

  // Convert a canvas click (px/py in CSS pixels relative to the canvas element)
  // to normalised image coordinates (0..1 = photo, outside values = off-screen).
  const canvasPxToNorm = (px: number, py: number): Point2D => {
    const m = getImageRectMetrics();
    if (!m) return { x: 0, y: 0 };
    return {
      x: (px - m.imgLeft) / m.imgW,
      y: (py - m.imgTop) / m.imgH,
    };
  };

  // Convert normalised image coordinates to canvas *buffer* pixels (for drawing).
  const normToCanvasPx = (pt: Point2D) => {
    const m = getImageRectMetrics();
    if (!m) return { x: 0, y: 0 };
    return {
      x: (m.imgLeft + pt.x * m.imgW) * m.scaleX,
      y: (m.imgTop + pt.y * m.imgH) * m.scaleY,
    };
  };

  // Render annotations & active polygon on canvas
  const drawOverlay = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const baseW = img.clientWidth;
    const baseH = img.clientHeight;
    if (baseW === 0 || baseH === 0) return;

    // Canvas dimensions include the 15% outer margin (rounded to whole buffer
    // pixels so the size comparison below is stable across redraws).
    const totalW = Math.round(baseW * (1 + 2 * MARGIN_PCT));
    const totalH = Math.round(baseH * (1 + 2 * MARGIN_PCT));

    if (canvas.width !== totalW || canvas.height !== totalH) {
      canvas.width = totalW;
      canvas.height = totalH;
    }

    ctx.clearRect(0, 0, totalW, totalH);

    // Draw outer off-screen margin background indicator
    // Photo rectangle in canvas *buffer* pixels (matches the <img> on screen).
    const photoMetrics = getImageRectMetrics();
    const photoX = photoMetrics ? photoMetrics.imgLeft * photoMetrics.scaleX : baseW * MARGIN_PCT;
    const photoY = photoMetrics ? photoMetrics.imgTop * photoMetrics.scaleY : baseH * MARGIN_PCT;
    const photoW = photoMetrics ? photoMetrics.imgW * photoMetrics.scaleX : baseW;
    const photoH = photoMetrics ? photoMetrics.imgH * photoMetrics.scaleY : baseH;

    // Dark tint for off-screen canvas margin
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.fillRect(0, 0, totalW, totalH);

    // Clear photo inner rectangle
    ctx.clearRect(photoX, photoY, photoW, photoH);

    // Draw photo border frame indicator
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(photoX, photoY, photoW, photoH);
    ctx.setLineDash([]); // Reset line dash

    // Photo label badge
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('📷 Photo Boundary (0,0 to 1,1)', photoX + 6, photoY + 16);

    // Draw Horizon Line
    const horizonYpx = horizonY * photoH;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(photoX, photoY + horizonYpx);
    ctx.lineTo(photoX + photoW, photoY + horizonYpx);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`🌅 Horizon Level (${(horizonY * 100).toFixed(1)}%)`, photoX + 6, photoY + horizonYpx - 6);

    // Render existing annotations
    annotations.forEach((ann, index) => {
      if (ann.polygon_coordinates.length > 0) {
        ctx.beginPath();
        const startPx = normToCanvasPx(ann.polygon_coordinates[0]);
        ctx.moveTo(startPx.x, startPx.y);

        for (let i = 1; i < ann.polygon_coordinates.length; i++) {
          const ptPx = normToCanvasPx(ann.polygon_coordinates[i]);
          ctx.lineTo(ptPx.x, ptPx.y);
        }
        ctx.closePath();

        ctx.fillStyle = ann.is_offscreen
          ? 'rgba(239, 68, 68, 0.3)' // Red tint for off-screen
          : 'rgba(255, 200, 0, 0.35)'; // Amber tint for inside photo
        ctx.fill();

        ctx.strokeStyle = ann.is_offscreen ? '#ef4444' : 'rgba(255, 200, 0, 0.9)';
        ctx.lineWidth = 2;
        if (ann.is_offscreen) ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px sans-serif';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        const labelTag = ann.is_offscreen ? ' (Off-screen)' : '';
        ctx.fillText(
          `${index + 1}. ${ann.id} (${ann.height_meters}m)${labelTag}`,
          startPx.x + 4,
          startPx.y - 4
        );
        ctx.shadowBlur = 0;
      }

      // Draw ground anchor
      if (ann.ground_anchor) {
        const anchorPx = normToCanvasPx(ann.ground_anchor);
        ctx.beginPath();
        ctx.arc(anchorPx.x, anchorPx.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = ann.is_offscreen ? '#f97316' : '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Draw per-vertex ground projections (variant C): a dashed plumb line from
      // each silhouette vertex down to the ground point vertically below it.
      if (
        ann.ground_projection_coordinates &&
        ann.ground_projection_coordinates.length === ann.polygon_coordinates.length
      ) {
        ctx.setLineDash([4, 3]);
        ann.ground_projection_coordinates.forEach((gp, gi) => {
          const vPx = normToCanvasPx(ann.polygon_coordinates[gi]);
          const gPx = normToCanvasPx(gp);

          ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(vPx.x, vPx.y);
          ctx.lineTo(gPx.x, gPx.y);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(gPx.x, gPx.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#10b981';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
        ctx.setLineDash([]);
      }
    });

    // Ground-bases mode overlay: highlight the next vertex to give a ground
    // point to, and draw the vertical (plumb) guide through it. Because the
    // camera is pitched, a plumb line in the image points toward the vertical
    // vanishing point V = (cx, cy + f/tan(pitch)).
    if (mode === 'ground_bases') {
      const target = annotations.find((a) => a.id === selectedAnnotationId);
      const targetPolygon = target?.polygon_coordinates;

      if (targetPolygon && activeGroundBases.length < targetPolygon.length) {
        const vertex = targetPolygon[activeGroundBases.length];
        const vertexPx = normToCanvasPx(vertex);

        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(vertexPx.x, vertexPx.y);

        const fPx = baseW / 2 / Math.tan((cameraFov * Math.PI) / 360);
        const pitch = Math.atan2(baseH / 2 - horizonY * baseH, fPx);
        const vertexImgX = vertex.x * baseW;
        const vertexImgY = vertex.y * baseH;

        let endPx = { x: vertexPx.x, y: totalH };
        if (Math.abs(pitch) > 1e-4) {
          const vImgY = baseH / 2 + fPx / Math.tan(pitch);
          const dirX = baseW / 2 - vertexImgX;
          const dirY = vImgY - vertexImgY;
          const t =
            dirY > 0
              ? (2 * baseH - vertexImgY) / dirY
              : (2 * baseH - vertexImgY) / (Math.abs(dirY) + 1e-6);
          endPx = normToCanvasPx({
            x: (vertexImgX + dirX * t) / baseW,
            y: (vertexImgY + dirY * t) / baseH,
          });
        }
        ctx.lineTo(endPx.x, endPx.y);
        ctx.stroke();
        ctx.restore();

        // Marker on the target vertex
        ctx.beginPath();
        ctx.arc(vertexPx.x, vertexPx.y, 8, 0, Math.PI * 2);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // In-progress ground base markers
      if (targetPolygon) {
        activeGroundBases.forEach((gp, gi) => {
          const vPx = normToCanvasPx(targetPolygon[gi]);
          const gPx = normToCanvasPx(gp);
          ctx.setLineDash([4, 3]);
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(vPx.x, vPx.y);
          ctx.lineTo(gPx.x, gPx.y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(gPx.x, gPx.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#10b981';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }
    }

    // Render active drawing polygon
    if (activePolygon.length > 0) {
      ctx.beginPath();
      const firstPx = normToCanvasPx(activePolygon[0]);
      ctx.moveTo(firstPx.x, firstPx.y);

      for (let i = 1; i < activePolygon.length; i++) {
        const ptPx = normToCanvasPx(activePolygon[i]);
        ctx.lineTo(ptPx.x, ptPx.y);
      }

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Vertex handles
      activePolygon.forEach((pt) => {
        const handlePx = normToCanvasPx(pt);
        ctx.beginPath();
        ctx.arc(handlePx.x, handlePx.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }

    // Active anchor handle
    if (activeAnchor) {
      const anchorPx = normToCanvasPx(activeAnchor);
      ctx.beginPath();
      ctx.arc(anchorPx.x, anchorPx.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  };

  useEffect(() => {
    drawOverlay();
  }, [annotations, activePolygon, activeAnchor, activeGroundBases, selectedAnnotationId, mode]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const normPt = canvasPxToNorm(px, py);

    if (mode === 'drawing') {
      setActivePolygon((prev) => [...prev, normPt]);
    } else if (mode === 'setting_anchor') {
      setActiveAnchor(normPt);
      setMode('idle');
    } else if (mode === 'ground_bases') {
      const target = annotations.find((a) => a.id === selectedAnnotationId);
      if (!target) {
        setMode('idle');
        return;
      }
      const next = [...activeGroundBases, normPt];
      setActiveGroundBases(next);
      if (next.length >= target.polygon_coordinates.length) {
        setAnnotations((prev) =>
          prev.map((a) =>
            a.id === selectedAnnotationId
              ? { ...a, ground_projection_coordinates: next }
              : a
          )
        );
        setActiveGroundBases([]);
        setMode('idle');
      }
    }
  };

  const handleDoubleClick = () => {
    if (mode === 'drawing' && activePolygon.length >= 3) {
      setMode('idle');
    }
  };

  const handleFinishObject = () => {
    if (activePolygon.length < 3) {
      alert('Please draw a polygon with at least 3 points first.');
      return;
    }
    // Check if object is off-screen (any point outside 0.0 - 1.0)
    const isOut = activePolygon.some((p) => p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1);
    setIsOffscreen(isOut);
    setShowForm(true);
    setFormError(null);
  };

  // Preset button: Quick add off-screen tree above the frame
  const handleAddOffscreenPreset = (position: 'top' | 'left' | 'right') => {
    let poly: Point2D[] = [];
    let anchor: Point2D = { x: 0.5, y: -0.05 };
    let idPrefix = 'offscreen_tree';

    if (position === 'top') {
      poly = [
        { x: 0.35, y: -0.22 },
        { x: 0.65, y: -0.22 },
        { x: 0.65, y: -0.05 },
        { x: 0.35, y: -0.05 },
      ];
      anchor = { x: 0.5, y: -0.05 };
      idPrefix = 'tree_top_outside';
    } else if (position === 'left') {
      poly = [
        { x: -0.22, y: 0.2 },
        { x: -0.05, y: 0.2 },
        { x: -0.05, y: 0.6 },
        { x: -0.22, y: 0.6 },
      ];
      anchor = { x: -0.05, y: 0.4 };
      idPrefix = 'tree_left_outside';
    } else if (position === 'right') {
      poly = [
        { x: 1.05, y: 0.2 },
        { x: 1.22, y: 0.2 },
        { x: 1.22, y: 0.6 },
        { x: 1.05, y: 0.6 },
      ];
      anchor = { x: 1.05, y: 0.4 };
      idPrefix = 'tree_right_outside';
    }

    const uniqueId = `${idPrefix}_${annotations.length + 1}`;
    const newAnn: Annotation = {
      id: uniqueId,
      category: 'tree',
      height_meters: 10.0,
      canopy_opacity: 0.85,
      ground_anchor: anchor,
      polygon_coordinates: poly,
      is_offscreen: true,
    };

    setAnnotations([...annotations, newAnn]);
  };

  const handleAddAnnotation = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = objectId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    if (!cleanId) {
      setFormError('Object ID is required.');
      return;
    }
    if (annotations.some((a) => a.id === cleanId)) {
      setFormError('Object ID must be unique.');
      return;
    }
    if (heightMeters <= 0) {
      setFormError('Height must be greater than 0 metres.');
      return;
    }

    const defaultAnchor = activeAnchor || activePolygon[0] || { x: 0.5, y: 0.5 };

    const newAnnotation: Annotation = {
      id: cleanId,
      category,
      height_meters: Number(heightMeters),
      canopy_opacity: Number(canopyOpacity),
      ground_anchor: defaultAnchor,
      polygon_coordinates: activePolygon,
      is_offscreen: isOffscreen,
    };

    setAnnotations([...annotations, newAnnotation]);
    setActivePolygon([]);
    setActiveAnchor(null);
    setShowForm(false);
    setObjectId('');
    setFormError(null);
    setMode('idle');
  };

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations(annotations.filter((a) => a.id !== id));
    setSelectedAnnotationId((cur) => (cur === id ? null : cur));
  };

  const handleExportScene = () => {
    const cleanSceneId = sceneId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'playground_scene';
    const scene: SceneAnnotation = {
      scene_metadata: {
        scene_id: cleanSceneId,
        original_image_path: imageUrl,
        depth_map_path: depthMapUrl,
        camera_azimuth_deg: Number(cameraAzimuth),
        camera_fov_deg: Number(cameraFov),
        horizon_y: Number(horizonY),
      },
      annotations,
    };
    onSave(scene);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      {/* Left: Image Canvas Container with Off-screen Margins */}
      <div className="flex-1 flex flex-col items-center">
        <div className="flex flex-wrap gap-2 mb-3 w-full justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('drawing');
                setActivePolygon([]);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                mode === 'drawing'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {mode === 'drawing' ? '📍 Click anywhere (even outside photo)...' : '✏️ Draw Polygon'}
            </button>

            <button
              type="button"
              onClick={() => setMode('setting_anchor')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                mode === 'setting_anchor'
                  ? 'bg-green-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              🎯 Set Ground Anchor
            </button>

            <button
              type="button"
              onClick={() => setMode('setting_horizon')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                mode === 'setting_horizon'
                  ? 'bg-red-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              🌅 {mode === 'setting_horizon' ? 'Click/Drag vertically to set horizon' : 'Set Horizon Line'}
            </button>

            <button
              type="button"
              disabled={activePolygon.length < 3}
              onClick={handleFinishObject}
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              ✅ Finish Object ({activePolygon.length} pts)
            </button>
            <button
              type="button"
              disabled={!selectedAnnotationId}
              onClick={() => {
                if (!selectedAnnotationId) return;
                if (mode === 'ground_bases') {
                  setMode('idle');
                  setActiveGroundBases([]);
                  return;
                }
                setActiveGroundBases([]);
                setMode('ground_bases');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                mode === 'ground_bases'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
              title="Select an object in the list, then click its vertices' ground points (one per silhouette vertex). Fixes shadows for slanted/open structures such as swing legs and bars."
            >
              {mode === 'ground_bases'
                ? `Ground pt ${activeGroundBases.length}/${annotations.find((a) => a.id === selectedAnnotationId)?.polygon_coordinates.length ?? 0}`
                : 'Set Ground Projections'}
            </button>

          </div>

          {/* Quick Presets for Off-Screen Shadow Casters */}
          <div className="flex items-center gap-1.5 pt-1 md:pt-0">
            <span className="text-xs font-bold text-gray-500">Off-Screen Presets:</span>
            <button
              type="button"
              onClick={() => handleAddOffscreenPreset('top')}
              className="px-2 py-1 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300 rounded hover:bg-amber-100"
              title="Add 10m tree above photo frame"
            >
              🌲 Top Tree
            </button>
            <button
              type="button"
              onClick={() => handleAddOffscreenPreset('left')}
              className="px-2 py-1 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300 rounded hover:bg-amber-100"
              title="Add 10m tree to left of photo frame"
            >
              🌲 Left Tree
            </button>
            <button
              type="button"
              onClick={() => handleAddOffscreenPreset('right')}
              className="px-2 py-1 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300 rounded hover:bg-amber-100"
              title="Add 10m tree to right of photo frame"
            >
              🌲 Right Tree
            </button>
          </div>
        </div>

        {/* Padded Canvas Viewport Container */}
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
        <p className="text-xs text-gray-500 mt-2 text-center">
          The dark padded area around the photo is the <strong>off-screen margin</strong>. Draw trees or structures outside the photo border to cast shadows into the scene!
        </p>
      </div>

      {/* Right Sidebar */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        {/* Form Card */}
        {showForm && (
          <form
            onSubmit={handleAddAnnotation}
            className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg space-y-3 shadow-md"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-indigo-900 text-sm">Add Shadow-Casting Object</h3>
              {isOffscreen && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-200 text-amber-800 rounded">
                  Off-Screen Object
                </span>
              )}
            </div>

            {formError && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                {formError}
              </p>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700">Object ID</label>
              <input
                type="text"
                value={objectId}
                onChange={(e) => setObjectId(e.target.value)}
                className="w-full mt-1 px-2.5 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. tree_outside_top"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700">Category</label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as 'tree' | 'structure' | 'building' | 'other')
                }
                className="w-full mt-1 px-2.5 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
              >
                <option value="tree">Tree</option>
                <option value="structure">Structure (Slide, Climber)</option>
                <option value="building">Building</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700">
                Height (metres): {heightMeters}m
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="100"
                value={heightMeters}
                onChange={(e) => setHeightMeters(parseFloat(e.target.value) || 1.0)}
                className="w-full mt-1 px-2.5 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700">
                Canopy Opacity: {(canopyOpacity * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={canopyOpacity}
                onChange={(e) => setCanopyOpacity(parseFloat(e.target.value))}
                className="w-full mt-1"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700 transition"
              >
                Add to Scene
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Scene Meta & Camera Orientation */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
          <h3 className="font-bold text-gray-800 text-sm">Camera & Scene Meta</h3>
          <div>
            <label className="block text-xs font-semibold text-gray-600">Scene ID</label>
            <input
              type="text"
              value={sceneId}
              onChange={(e) => setSceneId(e.target.value)}
              className="w-full mt-1 px-2.5 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-600" title="Direction photo is facing (0°=North, 90°=East, 180°=South, 270°=West)">
                Camera Facing (°):
              </label>
              <input
                type="number"
                min="0"
                max="360"
                value={cameraAzimuth}
                onChange={(e) => setCameraAzimuth(Number(e.target.value))}
                className="w-full mt-1 px-2.5 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600" title="Horizontal lens angle of view in degrees">
                Lens FOV (°):
              </label>
              <input
                type="number"
                min="30"
                max="120"
                value={cameraFov}
                onChange={(e) => setCameraFov(Number(e.target.value))}
                className="w-full mt-1 px-2.5 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600" title="Y-coordinate of the horizon line in pixels">
              Horizon Line (px):
            </label>
            <input
              type="number"
              min="0"
              max="2000"
              value={horizonY}
              onChange={(e) => setHorizonY(Number(e.target.value))}
              className="w-full mt-1 px-2.5 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
        </div>

        {/* Objects List */}
        <div className="flex-1 p-4 bg-gray-50 border border-gray-200 rounded-lg flex flex-col min-h-[200px]">
          <h3 className="font-bold text-gray-800 text-sm mb-1">
            Annotated Objects ({annotations.length})
          </h3>
          <p className="text-[10px] text-gray-500 mb-2">
            Select an object, then <strong>Set Ground Projections</strong> to mark the ground point below each of its vertices (for slanted/open structures).
          </p>

          {annotations.length === 0 ? (
            <p className="text-xs text-gray-500 italic my-auto text-center">
              No objects added yet. Draw inside or outside the photo frame to start.
            </p>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[250px] pr-1">
              {annotations.map((ann, i) => (
                <div
                  key={ann.id}
                  onClick={() =>
                    setSelectedAnnotationId((prev) => (prev === ann.id ? null : ann.id))
                  }
                  className={`flex items-center justify-between p-2 text-xs border rounded shadow-sm cursor-pointer ${
                    selectedAnnotationId === ann.id
                      ? 'ring-2 ring-emerald-400 border-emerald-300 bg-emerald-50'
                      : ann.is_offscreen
                        ? 'bg-amber-50/70 border-amber-200'
                        : 'bg-white border-gray-200'
                  }`}
                >
                  <div>
                    <span className="font-bold text-gray-800">
                      {i + 1}. {ann.id}
                    </span>
                    <span className="ml-1 text-gray-500">
                      ({ann.category}, {ann.height_meters}m)
                    </span>
                    {ann.ground_projection_coordinates &&
                      ann.ground_projection_coordinates.length === ann.polygon_coordinates.length && (
                        <span className="ml-1.5 px-1 py-0.2 text-[9px] bg-emerald-100 text-emerald-700 rounded font-bold">
                          ground proj
                        </span>
                      )}
                    {ann.is_offscreen && (
                      <span className="ml-1.5 px-1 py-0.2 text-[9px] bg-amber-200 text-amber-900 rounded font-bold">
                        Off-screen
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAnnotation(ann.id);
                    }}
                    className="text-red-500 hover:text-red-700 font-bold ml-2 px-1.5 py-0.5 rounded hover:bg-red-50"
                    title="Delete Object"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save/Next Button */}
        <button
          type="button"
          disabled={annotations.length === 0}
          onClick={handleExportScene}
          className="w-full py-3 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow transition"
        >
          Save & Proceed to Preview →
        </button>
      </div>
    </div>
  );
};
