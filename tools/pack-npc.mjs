// Packs Pixel Lab village characters (walk cycles + rotations) into public/assets/hub/npc/<id>/ and writes manifest.json.
// Usage: node tools/pack-npc.mjs <id> <unzipped character folder> [fps]
import fs from 'node:fs';
import path from 'node:path';
const [id, dir, fps = '9'] = process.argv.slice(2);
const out = 'public/assets/hub/npc', mfile = path.join(out, 'manifest.json');
const manifest = fs.existsSync(mfile) ? JSON.parse(fs.readFileSync(mfile, 'utf8')) : {};
const walkRoot = path.join(dir, 'Idle', 'animations', 'walking'), rotRoot = path.join(dir, 'Idle', 'rotations');
fs.rmSync(path.join(out, id), { recursive: true, force: true });
fs.mkdirSync(path.join(out, id, 'rot'), { recursive: true });
for (const f of fs.readdirSync(rotRoot)) fs.copyFileSync(path.join(rotRoot, f), path.join(out, id, 'rot', f));
let frames = 0; const dirs = fs.readdirSync(walkRoot);
for (const d of dirs) {
  const files = fs.readdirSync(path.join(walkRoot, d)).filter(f => /^frame_\d+\.png$/.test(f)).sort(); frames = files.length;
  fs.mkdirSync(path.join(out, id, d), { recursive: true });
  files.forEach((f, i) => fs.copyFileSync(path.join(walkRoot, d, f), path.join(out, id, d, `${i}.png`)));
}
manifest[id] = { frames, dirs, fps: +fps };
fs.writeFileSync(mfile, JSON.stringify(manifest, null, 1));
console.log(id, manifest[id]);
