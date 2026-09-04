import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(__dirname, '../data/playground-elements');
const outDir = path.resolve(__dirname, '../data/playground-elements/_crops');
fs.mkdirSync(outDir, { recursive: true });

const packs = fs
  .readdirSync(src)
  .filter((f) => /^icon_pack_\d+\.jpg$/i.test(f))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

// Thresholds for "white tile" detection.
const R = 230, G = 236, B = 240;

// Simple 4-neighbour flood fill using a Uint8 mask.
function floodFill(mask, w, h) {
  const visited = new Uint8Array(w * h);
  const comps = [];
  const stack = [];
  for (let y0 = 1; y0 < h - 1; y0++) {
    for (let x0 = 1; x0 < w - 1; x0++) {
      const start = y0 * w + x0;
      if (visited[start] || !mask[start]) continue;
      stack.length = 0;
      stack.push(start);
      visited[start] = 1;
      let minX = x0, maxX = x0, minY = y0, maxY = y0, count = 0;
      while (stack.length) {
        const cur = stack.pop();
        const cx = cur % w;
        const cy = (cur - cx) / w;
        count++;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        // neighbour indices (avoid recomputing bounds each push)
        const left = cur - 1, right = cur + 1, up = cur - w, down = cur + w;
        if (cx > 0 && !visited[left] && mask[left]) { visited[left] = 1; stack.push(left); }
        if (cx < w - 1 && !visited[right] && mask[right]) { visited[right] = 1; stack.push(right); }
        if (cy > 0 && !visited[up] && mask[up]) { visited[up] = 1; stack.push(up); }
        if (cy < h - 1 && !visited[down] && mask[down]) { visited[down] = 1; stack.push(down); }
      }
      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      if (bw >= 80 && bw <= 280 && bh >= 80 && bh <= 280 && count >= 2500) {
        comps.push({ x: minX, y: minY, w: bw, h: bh, count });
      }
    }
  }
  return comps;
}

async function processPack(file) {
  const raw = fs.readFileSync(path.join(src, file));
  const img = sharp(raw);
  const meta = await img.metadata();
  const w = meta.width;
  const h = meta.height;
  const { data, info } = await img
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = info.channels;

  const mask = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    const i = p * channels;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r >= R && g >= G && b >= B) mask[p] = 1;
  }

  const comps = floodFill(mask, w, h);
  comps.sort((a, b) => a.y - b.y || a.x - b.x);

  const base = file.replace(/\.jpg$/i, '');
  let lines = [];
  lines.push(`=== ${base} === tiles=${comps.length}`);
  for (let n = 0; n < comps.length; n++) {
    const c = comps[n];
    lines.push(`x=${c.x} y=${c.y} w=${c.w} h=${c.h} px=${c.count}`);
    const pad = 3;
    const cx = Math.max(0, c.x - pad);
    const cy = Math.max(0, c.y - pad);
    const cw = Math.min(w - cx, c.w + pad * 2);
    const ch = Math.min(h - cy, c.h + pad * 2);
    await sharp(raw).extract({ left: cx, top: cy, width: cw, height: ch }).png().toFile(path.join(outDir, `${base}__${n}.png`));
  }
  return lines.join('\n');
}

(async () => {
  const report = [];
  for (const f of packs) {
    const block = await processPack(f);
    report.push(block);
    console.log(`done ${f}`);
  }
  fs.writeFileSync(path.join(src, '_detect.txt'), report.join('\n\n'));
  console.log('detection complete');
})();
