// Packs Pixel Lab clips for one unlockable wizard into public/assets/wizard/anim-sets/<id>/ and merges them into manifest.json.
// Usage: node tools/pack-wizard-set-anim.mjs <wizard id> <unzipped character folder>
// The folder holds Idle/animations/<clip>/<direction>/frame_NNN.png (clips named idle, walk, cast, hurt, death: rename the template folders first).
import fs from 'node:fs';
import path from 'node:path';
const [id, dir] = process.argv.slice(2);
const CLIPS = { idle: { fps: 6, loop: true }, walk: { fps: 12, loop: true }, cast: { fps: 12, loop: false }, hurt: { fps: 12, loop: false }, death: { fps: 9, loop: false } };
const out = 'public/assets/wizard/anim-sets', mfile = path.join(out, 'manifest.json');
const manifest = fs.existsSync(mfile) ? JSON.parse(fs.readFileSync(mfile, 'utf8')) : {};
const root = path.join(dir, 'Idle', 'animations');
fs.rmSync(path.join(out, id), { recursive: true, force: true });
manifest[id] = {};
const ALIAS = { breathing_idle: 'idle', walking: 'walk', casting_a_fireball: 'cast', taking_a_punch: 'hurt', falling_backward: 'death' };   // Pixel Lab template folder names
for (const folder of fs.readdirSync(root)) {
  const clip = ALIAS[folder] || folder; if (!CLIPS[clip]) continue;
  const dirs = fs.readdirSync(path.join(root, folder)); let frames = 0;
  for (const d of dirs) {
    const files = fs.readdirSync(path.join(root, folder, d)).filter(f => /^frame_\d+\.png$/.test(f)).sort(); frames = files.length;
    const dst = path.join(out, id, clip, d); fs.mkdirSync(dst, { recursive: true });
    files.forEach((f, i) => fs.copyFileSync(path.join(root, folder, d, f), path.join(dst, `${i}.png`)));
  }
  manifest[id][clip] = { ...CLIPS[clip], frames, dirs };
}
fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(mfile, JSON.stringify(manifest, null, 1));
console.log(id, Object.fromEntries(Object.entries(manifest[id]).map(([k, v]) => [k, v.frames + 'f x ' + v.dirs.length])));
