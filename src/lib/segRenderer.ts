import type { Annotation, SolarPosition } from '../types/shadow';
import type { SegmentationData } from '../types/segmentation';
import { computeSunLightTarget } from './lighting';
import type { ShadowCameraParams } from './shadowProjection';
import { acquireScratch } from './softShape';
import { getMask } from './segMasks';
import { drawShadowLayerToCanvas } from './shadowLayer';
import { renderMaskedLightPasses } from './lightPasses';

/**
 * Renders the full environment for one photo, respecting the semantic mask: soft shadows on the
 * ground only, a sky gradient + sun glow masked to the sky, direct sunlight on the ground and a
 * directional light on vertical objects.
 *
 * This module is the **orchestrator** and the single entry point the viewer calls. The passes
 * themselves live in dedicated modules:
 * - `shadowLayer.ts` — the projected shadow layer, full resolution (depth extrusion included);
 * - `lightPasses.ts` — the three masked, capped-resolution light passes;
 * - `segMasks.ts` — the shared feathered category-mask cache;
 * - `shadowProjection.ts` / `softShape.ts` / `penumbra.ts` — geometry and soft painting.
 *
 * Resolution strategy (mobile-first):
 * - the shadow layer is painted at full resolution, because it is the only pass that carries
 *   visible detail (vector fills plus a blur confined to each shadow's own bounding box);
 * - the smooth full-frame passes are rendered at `RENDER_CONFIG.effectWorkCapPx` and upscaled
 *   (`lightPasses.ts`);
 * - every buffer is a pooled scratch canvas, so dragging the time slider does not allocate a
 *   handful of full-resolution canvases per frame (the previous behaviour, and the main reason
 *   the viewer janked and the shadow edges looked cheap on phones).
 */
export function renderSegmentedScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  annotations: Annotation[],
  solar: SolarPosition,
  seg: SegmentationData,
  cameraParams: ShadowCameraParams,
  depthMapData?: ImageData | null,
  cloudCoverPct: number = 0,
  sunLightStrength?: number,
  sunGlowAlpha?: number,
  penumbraStrength: number = 1
): void {
  const target = computeSunLightTarget(
    solar,
    cameraParams.cameraAzimuthDeg ?? 0,
    cameraParams.cameraFovDeg ?? 65,
    width,
    height,
    cloudCoverPct,
    sunLightStrength
  );

  const groundMask = getMask(seg, 'ground');

  // 1. Shadows: full resolution, clipped to the ground, multiplied onto the photo as ONE layer,
  //    so overlapping shadows behave like a single occluder instead of darkening repeatedly.
  if (solar.altitude_deg > 0 && annotations.length > 0) {
    const layer = acquireScratch('shadowLayer', width, height, true);
    drawShadowLayerToCanvas(
      layer.ctx,
      width,
      height,
      annotations,
      solar,
      cameraParams,
      depthMapData,
      penumbraStrength
    );
    layer.ctx.globalCompositeOperation = 'destination-in';
    layer.ctx.drawImage(groundMask, 0, 0, width, height);
    layer.ctx.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(layer.canvas, 0, 0, width, height, 0, 0, width, height);
    ctx.restore();
  }

  // 2. Sky, ground sunlight and vertical light, each clipped to its own semantic class. Skipped
  //    entirely at night (`target.altitude_deg <= 0`), which also skips building the sky mask.
  if (target.altitude_deg > 0) {
    renderMaskedLightPasses(
      ctx,
      width,
      height,
      seg,
      target,
      cloudCoverPct,
      sunGlowAlpha,
      annotations.length > 0
    );
  }
}
