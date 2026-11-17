// node tests/erase-rect.mjs in.png out.png x,y,w,h  -> fills a rectangle with the magenta key colour
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [inp, outp, rect] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage();
const data = 'data:image/png;base64,' + fs.readFileSync(inp).toString('base64');
const url = await page.evaluate(async ({ data, rect }) => {
  const img = new Image(); img.src = data; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const [x, y, w, h] = rect.split(',').map(Number);
  g.fillStyle = '#ff00ff'; g.fillRect(x, y, w, h);
  return c.toDataURL('image/png');
}, { data, rect });
fs.writeFileSync(outp, Buffer.from(url.split(',')[1], 'base64'));
await b.close();
