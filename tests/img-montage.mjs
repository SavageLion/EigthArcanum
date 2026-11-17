// node tests/img-montage.mjs out.png scale a.png b.png ...  -> the images side by side, nearest-neighbour enlarged, on a grey ground
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [outp, sc, ...files] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage();
const datas = files.map(f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64'));
const url = await page.evaluate(async ({ datas, sc }) => {
  const imgs = await Promise.all(datas.map(async d => { const i = new Image(); i.src = d; await i.decode(); return i; }));
  const s = +sc, W = imgs.reduce((a, i) => a + i.width * s + 8, 8), H = Math.max(...imgs.map(i => i.height)) * s + 16;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.fillStyle = '#7a9a58'; g.fillRect(0, 0, W, H); g.imageSmoothingEnabled = false;
  let x = 8; for (const i of imgs) { g.drawImage(i, x, 8, i.width * s, i.height * s); x += i.width * s + 8; }
  return c.toDataURL('image/png');
}, { datas, sc });
fs.writeFileSync(outp, Buffer.from(url.split(',')[1], 'base64'));
await b.close();
