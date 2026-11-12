// Makes near-white speckles transparent, for every PNG under a folder:  node tests/key-white.mjs <dir>
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2];
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.png') && files.push(p); } })(root);
const br = await chromium.launch({ channel: 'chrome' }), page = await br.newPage();
let n = 0;
for (const f of files) {
  const data = 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  const url = await page.evaluate(async d => {
    const im = new Image(); im.src = d; await im.decode();
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const q = c.getContext('2d'); q.drawImage(im, 0, 0);
    const id = q.getImageData(0, 0, c.width, c.height), p = id.data;
    for (let i = 0; i < p.length; i += 4) { if (p[i + 3] > 0 && p[i] > 215 && p[i + 1] > 215 && p[i + 2] > 215) p[i + 3] = 0; }
    q.putImageData(id, 0, 0);
    return c.toDataURL('image/png');
  }, data);
  fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); n++;
}
console.log('keyed', n, 'files');
await br.close();
