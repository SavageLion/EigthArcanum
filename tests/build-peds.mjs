// Stitches downloaded Pixel Lab walk cycles into one sheet per pedestrian: 8 columns x 3 rows (east, south, north), 48px cells.
//   node tests/build-peds.mjs <extractedDir> <outDir> name1 name2 ...
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [src, out, ...names] = process.argv.slice(2);
const b64 = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const b = await chromium.launch({ channel: 'chrome' }), page = await b.newPage();
for (const n of names) {
  const base = `${src}/${n}/Idle`, rows = [];
  for (const d of ['east', 'south']) rows.push([...Array(8)].map((_, i) => b64(`${base}/animations/walk/${d}/frame_00${i}.png`)));
  rows.push([...Array(8)].map(() => b64(`${base}/rotations/north.png`)));
  const url = await page.evaluate(async rows => {
    const load = s => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = s; });
    const cv = document.createElement('canvas'); cv.width = 48 * 8; cv.height = 48 * 3; const q = cv.getContext('2d');
    for (let r = 0; r < rows.length; r++) for (let i = 0; i < 8; i++) q.drawImage(await load(rows[r][i]), i * 48, r * 48);
    return cv.toDataURL('image/png');
  }, rows);
  fs.writeFileSync(`${out}/ped_${n}.png`, Buffer.from(url.split(',')[1], 'base64')); console.log('ped_' + n);
}
await b.close();
