// node tests/img-sample.mjs image.png x,y x,y ...  -> prints rgb (0..1) at those pixels
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [file, ...pts] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage();
const data = 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
const out = await page.evaluate(async ({ data, pts }) => {
  const img = new Image(); img.src = data; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  return pts.map(p => { const [x, y] = p.split(',').map(Number); const d = g.getImageData(x, y, 1, 1).data; return p + ' -> ' + [d[0], d[1], d[2]].map(v => (v / 255).toFixed(2)).join(' '); });
}, { data, pts });
console.log(out.join('\n'));
await b.close();
