// node tests/build-dog-sheet.mjs <unzippedCharacterDir/Idle> out.png  -> the game's 9x5 sheet of 48px cells: column 0 the standing pose, 1..8 the walk
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [dir, outp] = process.argv.slice(2);
const rows = ['east', 'north', 'south', 'south-east', 'north-east'];
const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage();
const b64 = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const files = rows.map(r => [b64(`${dir}/rotations/${r}.png`), ...Array.from({ length: 8 }, (_, i) => b64(`${dir}/animations/walk/${r}/frame_00${i}.png`))]);
const url = await page.evaluate(async (files) => {
  const c = document.createElement('canvas'); c.width = 9 * 48; c.height = 5 * 48;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  for (let r = 0; r < files.length; r++) for (let i = 0; i < 9; i++) {
    const im = new Image(); im.src = files[r][i]; await im.decode();
    g.drawImage(im, i * 48, r * 48);
  }
  return c.toDataURL('image/png');
}, files);
fs.writeFileSync(outp, Buffer.from(url.split(',')[1], 'base64'));
await b.close();
