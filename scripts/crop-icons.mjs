import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(__dirname, '../data/playground-elements');
const outDir = path.resolve(__dirname, '../public/icons/equipment');
fs.mkdirSync(outDir, { recursive: true });

const T = 130;
const MAP = {
  // TODO if instructed explicitly
};

(async () => {
  const cache = {};
  async function open(pack) {
    if (!cache[pack]) {
      const f = path.join(src, `icon_pack_${pack}.jpg`);
      cache[pack] = { buf: fs.readFileSync(f), meta: await sharp(f).metadata() };
    }
    return cache[pack];
  }
  let count = 0;
  for (const [slug, [pack, x, y]] of Object.entries(MAP)) {
    const { buf, meta } = await open(pack);
    const cw = Math.min(T, meta.width - x);
    const ch = Math.min(T, meta.height - y);
    await sharp(buf)
      .extract({ left: x, top: y, width: cw, height: ch })
      .resize(100, 100, { fit: 'fill' })
      .png()
      .toFile(path.join(outDir, `${slug}.png`));
    count++;
  }
  console.log(`cropped ${count} icons`);
})();
