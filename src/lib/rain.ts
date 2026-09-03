import type { RainRenderConfig } from '../types/environment';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Deterministic 32-bit integer hash (xorshift) — keeps rain stable for a given hour bucket. */
export function hashSeed(seed: number): number {
  let x = seed | 0;
  if (x === 0) x = 0x9e3779b9;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return x >>> 0;
}

/** Mulberry32 PRNG — deterministic random stream from a seed. */
function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rain intensity (0..1) from precipitation mm/hour. */
export function rainIntensityFromPrecip(mm: number): number {
  return clamp(mm / 4, 0, 1);
}

/** Pre-renders a tiled streak layer (transparent) for a given seed + config. */
export function createRainLayer(
  width: number,
  height: number,
  seed: number,
  config: RainRenderConfig
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const rand = mulberry32(hashSeed(seed));
  const alpha = clamp(config.opacity * 1.6, 0.02, 0.4);
  const count = Math.floor((width / 60) * (1 + config.intensity * 2));
  const rad = (config.streakAngleDeg * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = Math.cos(rad); // positive = downward

  ctx.lineWidth = 1.4;
  for (let i = 0; i < count; i++) {
    const x = rand() * width;
    const y = -rand() * height;
    const len = config.streakLength * (0.7 + rand() * 0.6) * (0.6 + config.intensity * 0.8);
    const a = alpha * (0.5 + rand() * 0.5);
    ctx.strokeStyle = `rgba(190, 210, 235, ${a})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx * len, y + dy * len);
    ctx.stroke();
  }
  return canvas;
}

/** Draws the cached streak layer at a moving vertical offset (wraps vertically). */
export function renderRain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layer: HTMLCanvasElement,
  offsetY: number,
  config: RainRenderConfig
): void {
  const alpha = clamp(config.opacity, 0, 1);
  if (alpha <= 0.001) return;
  const oy = offsetY % height;
  const sy = oy - height;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = alpha;
  ctx.drawImage(layer, 0, sy);
  ctx.drawImage(layer, 0, sy + height);
  ctx.restore();
}

/** Darkens the ground and adds a subtle specular sheen when it is wet. */
export function renderWetGround(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  precipitationMm: number,
  config: RainRenderConfig
): void {
  const intensity = rainIntensityFromPrecip(precipitationMm);
  if (intensity <= 0.001) return;

  // Darken (multiply) — stronger toward the bottom (the ground plane).
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const dark = ctx.createLinearGradient(0, 0, 0, height);
  dark.addColorStop(0, `rgba(40, 50, 70, ${0.06 + intensity * 0.08})`);
  dark.addColorStop(1, `rgba(18, 28, 48, ${0.12 + intensity * 0.18})`);
  ctx.fillStyle = dark;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Specular sheen band near the base of the frame.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const sheenY = height * 0.8;
  const sheen = ctx.createLinearGradient(0, sheenY - 40, 0, sheenY + 40);
  sheen.addColorStop(0, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.5, `rgba(255,255,255,${0.05 + intensity * 0.08})`);
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, sheenY - 40, width, 80);
  ctx.restore();
}
