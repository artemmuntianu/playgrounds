import type { Annotation, Point2D, SolarPosition } from '../types/shadow';
import { SHADOW_CONFIG, clampObjectDepthCm } from './environmentConfig';

const DEG_TO_RAD = Math.PI / 180;
const MAX_COORD = 1e5; // safe canvas coordinate magnitude before clipping

/**
 * Optional scene/camera parameters that fully describe how the annotated
 * photo was taken. When missing, we fall back to a "level, 65° camera
 * centred on the image" assumption.
 */
export interface ShadowCameraParams {
  /** Camera pan, degrees clockwise from North (default 0). */
  cameraAzimuthDeg?: number;
  /** Horizontal lens FOV in degrees (default 65). */
  cameraFovDeg?: number;
  /**
   * Row of the horizon line. Accepts either a normalised fraction (0..1) or a
   * pixel value. Defaults to the vertical centre of the image.
   */
  horizonY?: number;
  /** Optional override for the camera pitch (deg, positive = looking down). */
  cameraPitchDeg?: number;
}

interface GroundCamera {
  /** Focal length in pixels (square pixels assumed, fx == fy). */
  f: number;
  /** Principal point (image centre). */
  cx: number;
  cy: number;
  /** Pitch in radians, positive when the camera is tilted downwards. */
  pitch: number;
  sinP: number;
  cosP: number;
  /** Horizon row in pixels. */
  horizonPx: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Builds the pinhole camera model from the image size + user supplied scene
 * parameters (FOV, horizon / pitch). All quantities are expressed relative to
 * the (unknown) camera height C, so absolute metre distances are not needed.
 */
function buildGroundCamera(
  imageWidth: number,
  imageHeight: number,
  params: ShadowCameraParams
): GroundCamera {
  const fovDeg = clamp(params.cameraFovDeg ?? 65, 5, 150);
  const f = Math.max(1, imageWidth / 2 / Math.tan((fovDeg / 2) * DEG_TO_RAD));
  const cx = imageWidth / 2;
  const cy = imageHeight / 2;

  let horizonPx = params.horizonY ?? cy;
  horizonPx = Number.isFinite(horizonPx) ? horizonPx : cy;
  // Accept normalised (0..1) horizon rows as well as raw pixel rows.
  if (horizonPx > 0 && horizonPx <= 1) {
    horizonPx *= imageHeight;
  }
  horizonPx = clamp(horizonPx, -imageHeight, imageHeight * 2);

  const pitch =
    params.cameraPitchDeg !== undefined
      ? params.cameraPitchDeg * DEG_TO_RAD
      : Math.atan2(cy - horizonPx, f); // horizon above centre => camera pitched down

  return {
    f,
    cx,
    cy,
    pitch,
    sinP: Math.sin(pitch),
    cosP: Math.cos(pitch),
    horizonPx,
  };
}

/**
 * Depth of a ground-plane pixel row, measured from the camera along the view
 * direction, in units of the camera height C.
 *
 *   D/C = (cos p - u * sin p) / (u * cos p + sin p),  u = (row - cy) / f
 */
function depthRatioAtRow(row: number, cam: GroundCamera): number {
  const u = (row - cam.cy) / cam.f;
  const denom = u * cam.cosP + cam.sinP;
  if (Math.abs(denom) < 1e-6) {
    return Infinity; // the row is the horizon -> the ground recedes to infinity
  }
  return (cam.cosP - u * cam.sinP) / denom;
}

/**
 * Inverse ground-depth at which the "horizon + 1 px" row would sit. Used as a
 * sane "very far" fallback for anchors that are not on the visible ground.
 */
function farDepthFallback(cam: GroundCamera): number {
  const row = cam.horizonPx + 1;
  return finiteOr(depthRatioAtRow(row, cam), 1e5);
}

/**
 * Depth of the annotated volume along the view axis, in camera-height units (C).
 *
 * The annotated silhouette is the *near* face of the object: the operator supplies how deep the
 * object is in centimetres (`Annotation.depth_cm`) and the engine casts the shadow of the whole
 * extruded volume instead of a zero-thickness billboard's.
 *
 * The projection is scale-invariant — every distance lives in units of the (unknown) camera height
 * C — so a centimetre value can only be expressed in those units through one assumed real-world
 * distance, `SHADOW_CONFIG.assumedCameraHeightM` (1.6 m, eye level of the photographer). Returns 0
 * (=> legacy flat cutout) when no depth was supplied.
 */
function objectDepthOffset(annotation: Annotation): number {
  const depthCm = clampObjectDepthCm(annotation.depth_cm ?? 0);
  if (depthCm <= 0) {
    return 0;
  }
  return depthCm / 100 / SHADOW_CONFIG.assumedCameraHeightM;
}

/**
 * Side band of the extruded volume: two triangles per polygon edge, connecting the near ring to the
 * far ring.
 *
 * The band is what makes a deep object's shadow a solid prism shadow. Without it, the shadow of a
 * deep but small-footprint object (a slide leg, a post) would read as two detached blobs, because
 * the volume in between blocks the light as well. It is emitted as triangles (never a bow-tie quad)
 * and filled together with the two rings in ONE path — see `paintSoftPolygon` — so overlapping
 * pieces produce a single alpha instead of darkening each other.
 */
function extrudeRingBand(near: Point2D[], far: Point2D[]): Point2D[][] {
  const count = Math.min(near.length, far.length);
  if (count < 3) {
    return [];
  }
  const band: Point2D[][] = [];
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    band.push([near[i], far[i], far[j]]);
    band.push([near[i], far[j], near[j]]);
  }
  return band;
}


/**
 * Projects an annotated 2D polygon onto the ground plane with a proper pinhole
 * camera whose intrinsics come from the user supplied scene data (FOV,
 * horizon/pitch and camera azimuth).
 *
 * Model: the annotated silhouette is treated as the *near face* of a vertical
 * prism standing at the horizontal depth of its `ground_anchor`. For every
 * silhouette vertex:
 *
 *   1. its screen row is converted into a height above the ground in units of
 *      the (unknown) camera height C:
 *          Z/C = 1 - (D_a/C) * (u*cos p + sin p) / (cos p - u*sin p)
 *   2. the vertex casts a shadow on the ground of length (Z/C)/tan(sun alt)
 *      along the direction opposite the sun (relative to the camera azimuth),
 *   3. the shadow tip is re-projected back into the image (Z = 0).
 *
 * Because every quantity is expressed in camera-height units the projection is
 * scale-invariant, and it stays valid for polygon vertices that live in the
 * off-screen margin (x/y outside [0, 1]).
 *
 * Operator-supplied depth (`annotation.depth_cm`, centimetres): the object is a
 * solid that extends that far AWAY FROM THE CAMERA from the annotated face, so
 * the same silhouette is projected twice — once from its own ground footprint
 * (the near ring) and once from the footprint shifted by that depth (the far
 * ring) — plus the side band between the two (`extrudeRingBand`). A depth of 0
 * returns just the near ring, i.e. the original flat-cutout behaviour. This is
 * a ground-space offset in depth followed by a re-projection, never a uniform
 * screen-space translation.
 *
 * Optional per-vertex "ground projection" mode: when the annotation also
 * supplies `ground_projection_coordinates` (one ground point per silhouette
 * vertex - the point of ground vertically below that vertex), each vertex is
 * reconstructed from its own base depth instead of the shared `ground_anchor`
 * depth. This is used for open / slanted structures (swing legs, bars, roof
 * edges) where the billboard assumption places shadows on top of the object.
 *
 * Returns the shadow shape as a list of rings / triangles in normalised image
 * coordinates; the first entry is always the primary (near) ring.
 */
export function projectShadowPolygons(
  annotation: Annotation,
  solar: SolarPosition,
  imageWidth: number,
  imageHeight: number,
  params: ShadowCameraParams = {}
): Point2D[][] {
  const polygon = annotation.polygon_coordinates || [];

  if (polygon.length === 0) {
    return [];
  }
  if (solar.altitude_deg <= 0) {
    // Night / sun below the horizon - no shadow is cast.
    return [polygon.map((pt) => ({ ...pt }))];
  }

  const cam = buildGroundCamera(imageWidth, imageHeight, params);

  const anchor = annotation.ground_anchor || polygon[0];
  const anchorPx = { x: anchor.x * imageWidth, y: anchor.y * imageHeight };

  // Depth (units of camera height) of the object's base on the ground plane.
  let depthAnchor = depthRatioAtRow(anchorPx.y, cam);
  if (!Number.isFinite(depthAnchor) || depthAnchor <= 0) {
    // Anchor sits on/above the horizon (far away / malformed annotation):
    // fall back to a very large but finite ground depth.
    depthAnchor = farDepthFallback(cam);
  }
  depthAnchor = clamp(depthAnchor, 1e-3, 1e6);

  const altitudeRad = solar.altitude_deg * DEG_TO_RAD;
  const tanAltitude = finiteOr(Math.tan(altitudeRad), 1e6);

  // World bearing of the shadow direction (points away from the sun) relative
  // to the camera azimuth; positive = clockwise / to the right of the camera.
  const shadowAzimuthDeg = (solar.azimuth_deg + 180) % 360;
  const cameraAzimuthDeg = params.cameraAzimuthDeg ?? 0;
  const betaDeg = ((shadowAzimuthDeg - cameraAzimuthDeg + 540) % 360) - 180;
  const sinBeta = Math.sin(betaDeg * DEG_TO_RAD);
  const cosBeta = Math.cos(betaDeg * DEG_TO_RAD);

  // Forward (depth) component of a ground point at depthAnchor, in C units.
  const forwardAnchor = depthAnchor * cam.cosP + cam.sinP;


  // Optional per-vertex ground projections ("open structure" / element mode):
  // when an annotation carries one ground point per silhouette vertex, every
  // vertex is treated as standing vertically above ITS OWN ground point rather
  // than sharing the single `ground_anchor` depth. That makes slanted members
  // (swing legs, bars, roof edges) cast shadows from their true ground
  // position instead of from the anchor depth of the whole polygon.
  const groundProjection = annotation.ground_projection_coordinates;
  const useGroundProjection =
    !!groundProjection && groundProjection.length === polygon.length;

  // Per-vertex ground footprint: depth (along the view direction, C units) and
  // lateral offset (perpendicular to the view axis, C units).
  const vertexDepths: number[] = [];
  const vertexLateral: number[] = [];

  for (let i = 0; i < polygon.length; i++) {
    if (useGroundProjection && groundProjection) {
      const base = groundProjection[i];
      const baseDepth = depthRatioAtRow(base.y * imageHeight, cam);
      const depth =
        Number.isFinite(baseDepth) && baseDepth > 0
          ? clamp(baseDepth, 1e-3, 1e6)
          : depthAnchor; // base sits on/above the horizon -> use the anchor
      const forwardBase = depth * cam.cosP + cam.sinP;
      const baseCol = base.x * imageWidth;
      vertexDepths.push(depth);
      vertexLateral.push(((baseCol - cam.cx) / cam.f) * forwardBase);
    } else {
      // Billboard fallback: the whole footprint shares the anchor depth and the
      // vertex's own column decides the lateral offset at that depth.
      vertexDepths.push(depthAnchor);
      vertexLateral.push(
        ((polygon[i].x * imageWidth - cam.cx) / cam.f) * forwardAnchor
      );
    }
  }

  // Height pass: work out how high each vertex sits above the ground it stands
  // on (per-vertex base depth in ground-projection mode, anchor depth in the
  // billboard mode), and whether the silhouette touches the ground.
  const vertexHeights: number[] = [];
  let minHeightRatio = Infinity;

  for (let i = 0; i < polygon.length; i++) {
    const row = polygon[i].y * imageHeight;
    const u = (row - cam.cy) / cam.f;
    const denom = cam.cosP - u * cam.sinP;
    const heightRatio =
      Math.abs(denom) < 1e-6
        ? 0
        : 1 - (vertexDepths[i] * (u * cam.cosP + cam.sinP)) / denom;
    const hz = Math.max(0, finiteOr(heightRatio, 0));
    vertexHeights.push(hz);
    minHeightRatio = Math.min(minHeightRatio, hz);
  }

  // A polygon whose lowest point is well above the anchor row (e.g. a canopy
  // drawn without its trunk) is "floating" - append the anchor so the shadow
  // still connects to the base of the tree. Only do this when the anchor is
  // itself on visible ground (below the horizon, inside the frame); otherwise
  // appending it would drag the shadow back into the sky. Ground-projection
  // annotations are already pinned to the ground by their own base points, so
  // the heuristic is disabled for them.
  const floatingCanopy =
    !useGroundProjection &&
    Number.isFinite(minHeightRatio) &&
    minHeightRatio > 0.05;
  const anchorOnVisibleGround =
    anchorPx.y >= cam.horizonPx + 2 && anchorPx.y <= imageHeight;

  // Ground footprint of the anchor itself (used by the floating-canopy bridge).
  const anchorLateral = ((anchorPx.x - cam.cx) / cam.f) * forwardAnchor;


  /**
   * Re-projects a ground point (lateral offset + depth, both in C units, Z = 0)
   * back into normalised image coordinates. A tip that crosses the camera plane
   * is clamped just in front of the camera so the shadow extends to (and beyond)
   * the bottom edge of the frame instead of producing a garbage coordinate.
   */
  const projectGroundPoint = (lateral: number, depth: number): Point2D | null => {
    let forward = depth * cam.cosP + cam.sinP;
    if (!(forward > 1e-3)) {
      forward = 1e-3;
    }
    const u = (cam.cosP - depth * cam.sinP) / forward;
    const x = cam.cx + (cam.f * lateral) / forward;
    const y = cam.cy + cam.f * u;

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }
    return {
      x: clamp(x, -MAX_COORD, MAX_COORD) / imageWidth,
      y: clamp(y, -MAX_COORD, MAX_COORD) / imageHeight,
    };
  };

  /**
   * One shadow ring: the shadow tips of every silhouette vertex, computed from
   * the vertex's own ground footprint displaced away from the sun, with an extra
   * `depthOffset` (C units) applied to that footprint for the far face.
   *
   * The vertex heights are shared between rings: the far face is the same
   * silhouette moved backwards in depth, not a re-derived object height.
   */
  const buildRing = (depthOffset: number): Point2D[] => {
    const ring: Point2D[] = [];
    for (let i = 0; i < polygon.length; i++) {
      const shadowLen = vertexHeights[i] / tanAltitude;
      const tip = projectGroundPoint(
        vertexLateral[i] + shadowLen * sinBeta,
        vertexDepths[i] + depthOffset + shadowLen * cosBeta
      );
      ring.push(tip ?? { ...polygon[i] });
    }

    if (floatingCanopy && anchorOnVisibleGround) {
      const anchorTip = projectGroundPoint(anchorLateral, depthAnchor + depthOffset);
      ring.push(anchorTip ?? { x: anchor.x, y: anchor.y });
    }
    return ring;
  };

  const nearRing = buildRing(0);
  const depthOffset = objectDepthOffset(annotation);
  if (depthOffset <= 0) {
    return [nearRing];
  }

  const farRing = buildRing(depthOffset);
  return [nearRing, farRing, ...extrudeRingBand(nearRing, farRing)];
}
