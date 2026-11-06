// Copies art-source/icons/*.png into public/assets/icons and writes manifest.json (the list of ids the UI may use).
import fs from 'node:fs';
import path from 'node:path';
const src = 'art-source/icons', out = 'public/assets/icons';
fs.mkdirSync(out, { recursive: true });
const ids = [];
for (const f of fs.readdirSync(src).filter(f => f.endsWith('.png'))) { fs.copyFileSync(path.join(src, f), path.join(out, f)); ids.push(f.slice(0, -4)); }
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(ids.sort()));
console.log(ids.length + ' icons:', ids.join(' '));
