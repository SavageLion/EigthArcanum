// Crops regions from a reference image and shrinks them to the art's native pixel size:  node tests/crop-ref.mjs <in.png> <outdir> <factor> name=x,y,w,h ...
import { chromium } from 'playwright-core';import fs from 'node:fs';
const [inp, out, fac, ...regs] = process.argv.slice(2);fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chrome' }), page = await b.newPage();
const data = 'data:image/png;base64,' + fs.readFileSync(inp).toString('base64');
for (const r of regs) {
  const [n, v] = r.split('='), [x, y, w, h] = v.split(',').map(Number);
  const url = await page.evaluate(async ([d, x, y, w, h, f]) => { const im = new Image(); im.src = d; await im.decode(); const c = document.createElement('canvas'); c.width = Math.round(w / f); c.height = Math.round(h / f); const q = c.getContext('2d'); q.imageSmoothingEnabled = false; q.drawImage(im, x, y, w, h, 0, 0, c.width, c.height); return c.toDataURL('image/png'); }, [data, x, y, w, h, +fac]);
  fs.writeFileSync(`${out}/${n}.png`, Buffer.from(url.split(',')[1], 'base64')); console.log(n);
}
await b.close();
