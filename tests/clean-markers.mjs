// node tests/clean-markers.mjs in.png out.png  -> paints the flat guide-marker colours left under painted buildings over with meadow green
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [inp, outp] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage();
const data = 'data:image/png;base64,' + fs.readFileSync(inp).toString('base64');
const res = await page.evaluate(async (data) => {
  const img = new Image(); img.src = data; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const im = g.getImageData(0, 0, c.width, c.height), d = im.data;
  const marks = [[0.23, 0.46, 0.86], [0.95, 0.50, 0.10], [0.84, 0.12, 0.15]];
  const grass = [0.69, 0.80, 0.33];
  let n = 0;
  const hit = new Uint8Array(c.width * c.height);
  for (let i = 0; i < c.width * c.height; i++) {
    const r = d[i * 4] / 255, gg = d[i * 4 + 1] / 255, bb = d[i * 4 + 2] / 255;
    for (const m of marks) { if (Math.hypot(r - m[0], gg - m[1], bb - m[2]) < 0.07) { hit[i] = 1; break; } }
  }
  // grow by two pixels so the blended fringe goes too
  const grown = new Uint8Array(hit);
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    if (!hit[y * c.width + x]) continue;
    for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) {
      const xx = x + ox, yy = y + oy;
      if (xx < 0 || yy < 0 || xx >= c.width || yy >= c.height) continue;
      const j = yy * c.width + xx, r = d[j * 4] / 255, gg = d[j * 4 + 1] / 255, bb = d[j * 4 + 2] / 255;
      // only fringe pixels that are bluish / orange / reddish, not the dark outlines of the objects
      if (Math.hypot(r - grass[0], gg - grass[1], bb - grass[2]) > 0.25 && Math.max(r, gg, bb) > 0.45) grown[j] = 1;
    }
  }
  for (let i = 0; i < c.width * c.height; i++) {
    if (!grown[i]) continue;
    const x = i % c.width, y = (i / c.width) | 0;
    const nz = ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1 + 1) % 1;
    d[i * 4] = (grass[0] + (nz - 0.5) * 0.05) * 255; d[i * 4 + 1] = (grass[1] + (nz - 0.5) * 0.05) * 255; d[i * 4 + 2] = (grass[2] + (nz - 0.5) * 0.04) * 255; n++;
  }
  g.putImageData(im, 0, 0);
  return { url: c.toDataURL('image/png'), n };
}, data);
fs.writeFileSync(outp, Buffer.from(res.url.split(',')[1], 'base64'));
console.log('cleaned pixels', res.n);
await b.close();
