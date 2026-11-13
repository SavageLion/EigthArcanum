// Measures the opaque bounding box of each character set's south and east idle frame, writes art/sizes.json:
//   node tests/measure-sprites.mjs <artDir> set1 set2 ...
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const [art, ...sets] = process.argv.slice(2);
const br = await chromium.launch({ channel: 'chrome' }), page = await br.newPage();
const out = {};
for (const s of sets) {
  out[s] = {};
  for (const d of ['south', 'east']) {
    const f = path.join(art, s, 'idle', d, '0.png');
    if (!fs.existsSync(f)) continue;
    const data = 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
    out[s][d] = await page.evaluate(async u => {
      const im = new Image(); im.src = u; await im.decode();
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const q = c.getContext('2d'); q.drawImage(im, 0, 0);
      const p = q.getImageData(0, 0, c.width, c.height).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (p[(y * c.width + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      return { cw: c.width, ch: c.height, x0, y0, x1: x1 + 1, y1: y1 + 1 };
    }, data);
  }
}
fs.writeFileSync(path.join(art, 'sizes.json'), JSON.stringify(out, null, 1));
console.log(Object.entries(out).map(([k, v]) => `${k}: south ${v.south ? v.south.x1 - v.south.x0 + 'x' + (v.south.y1 - v.south.y0) : '-'} east ${v.east ? v.east.x1 - v.east.x0 + 'x' + (v.east.y1 - v.east.y0) : '-'}`).join('\n'));
await br.close();
