// Renders every PNG in a folder (optionally filtered by prefix) onto one contact sheet so assets can be reviewed at a glance.
//   node tests/asset-sheet.mjs <dir> <out.png> [scale=3] [prefix] [cols=8]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const [dir, out, scaleArg, prefix = '', colsArg] = process.argv.slice(2), scale = +scaleArg || 3, cols = +colsArg || 8;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.png') && f.startsWith(prefix)).sort();
const items = files.map(f => ({ n: f.replace('.png', ''), d: 'data:image/png;base64,' + fs.readFileSync(path.join(dir, f)).toString('base64') }));
const b = await chromium.launch({ channel: 'chrome' }), page = await b.newPage({ viewport: { width: 1400, height: 900 } });
await page.setContent('<body style="margin:0;background:#3a3340"></body>');
const info = await page.evaluate(async ([items, scale, cols]) => {
  const ims = await Promise.all(items.map(o => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = o.d; })));
  const cw = Math.max(...ims.map(i => i.width)) * scale + 12, ch = Math.max(...ims.map(i => i.height)) * scale + 24, rows = Math.ceil(ims.length / cols);
  const cv = document.createElement('canvas'); cv.width = cw * cols; cv.height = ch * rows; document.body.appendChild(cv);
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.fillStyle = '#3a3340'; c.fillRect(0, 0, cv.width, cv.height); c.font = '10px monospace';
  ims.forEach((im, i) => { const x = (i % cols) * cw, y = Math.floor(i / cols) * ch; c.fillStyle = (i % 2 ? '#4a4252' : '#463e4e'); c.fillRect(x + 2, y + 2, cw - 4, ch - 4); c.drawImage(im, x + 6, y + 4, im.width * scale, im.height * scale); c.fillStyle = '#e8e0f0'; c.fillText(items[i].n.slice(0, Math.floor(cw / 6)), x + 6, y + ch - 6); });
  return { w: cv.width, h: cv.height };
}, [items, scale, cols]);
await page.setViewportSize({ width: Math.min(2400, info.w), height: Math.min(2400, info.h) });
await page.locator('canvas').screenshot({ path: out });
await b.close();
console.log(files.length + ' images -> ' + out);
