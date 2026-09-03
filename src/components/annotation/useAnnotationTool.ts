import { useState, useRef, useEffect } from 'react';
import type { Annotation, Point2D, SceneAnnotation } from '../../types/shadow';

// Height is no longer operator-provided. The projection derives shadow length from the polygon,
// anchor, horizon and sun — not from this value. It only drives shadow blur softness, so a fixed
// default is used.
const DEFAULT_HEIGHT_METERS = 10;

interface UseAnnotationToolArgs {
  imageUrl: string;
  depthMapUrl: string;
  onSave: (scene: SceneAnnotation) => void;
  initialScene?: SceneAnnotation;
}

export function useAnnotationTool({ imageUrl, depthMapUrl, onSave, initialScene }: UseAnnotationToolArgs) {
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
          `${index + 1}. ${ann.id}${labelTag}`,
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
      height_meters: DEFAULT_HEIGHT_METERS,
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
    const defaultAnchor = activeAnchor || activePolygon[0] || { x: 0.5, y: 0.5 };

    const newAnnotation: Annotation = {
      id: cleanId,
      category,
      height_meters: DEFAULT_HEIGHT_METERS,
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
  return {
    sceneId, setSceneId,
    cameraAzimuth, setCameraAzimuth,
    cameraFov, setCameraFov,
    horizonY, setHorizonY,
    annotations, setAnnotations,
    mode, setMode,
    activePolygon, setActivePolygon,
    activeAnchor, setActiveAnchor,
    selectedAnnotationId, setSelectedAnnotationId,
    activeGroundBases, setActiveGroundBases,
    showForm, setShowForm,
    objectId, setObjectId,
    category, setCategory,
    canopyOpacity, setCanopyOpacity,
    isOffscreen, setIsOffscreen,
    formError, setFormError,
    containerRef, imageRef, canvasRef,
    getImageRectMetrics,
    drawOverlay,
    handleCanvasClick, handleDoubleClick,
    handleFinishObject,
    handleAddOffscreenPreset,
    handleAddAnnotation,
    handleDeleteAnnotation,
    handleExportScene,
  };
}
