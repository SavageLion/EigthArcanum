// Re-tints a PNG in place: node tests/tint-png.mjs file.png sat r g b   (sat 1 = unchanged, r g b are channel multipliers)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [file, sat, r, g, b] = process.argv.slice(2);
const br = await chromium.launch({ channel: 'chrome' }), page = await br.newPage();
const data = 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
const url = await page.evaluate(async ([d, s, mr, mg, mb]) => {
  const im = new Image(); im.src = d; await im.decode();
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const q = c.getContext('2d'); q.drawImage(im, 0, 0);
  const id = q.getImageData(0, 0, c.width, c.height), p = id.data;
  for (let i = 0; i < p.length; i += 4) {
    const l = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
    p[i] = Math.min(255, (l + (p[i] - l) * s) * mr);
    p[i + 1] = Math.min(255, (l + (p[i + 1] - l) * s) * mg);
    p[i + 2] = Math.min(255, (l + (p[i + 2] - l) * s) * mb);
  }
  q.putImageData(id, 0, 0);
  return c.toDataURL('image/png');
}, [data, +sat, +r, +g, +b]);
fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
console.log('tinted', file);
await br.close();
