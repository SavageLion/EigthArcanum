// Packs Pixel Lab objects for Hunt mode into public/assets/hunt/.
//   node tools/pack-hunt-art.mjs enemy <name> <unzipped object folder> [fps]   -> enemies/<name>/N.png (animation frames) + manifest.json
//   node tools/pack-hunt-art.mjs decor <name> <png file>                       -> decor/<name>.png + manifest.json
import fs from 'node:fs';
import path from 'node:path';
const [kind, name, src, fps = '8'] = process.argv.slice(2);
const out = 'public/assets/hunt', mfile = path.join(out, 'manifest.json');
const man = fs.existsSync(mfile) ? JSON.parse(fs.readFileSync(mfile, 'utf8')) : { enemies: {}, decor: [] };
if (kind === 'enemy') {
  const animRoot = path.join(src, 'animations'), dirs = fs.existsSync(animRoot) ? fs.readdirSync(animRoot) : [];
  const dst = path.join(out, 'enemies', name); fs.rmSync(dst, { recursive: true, force: true }); fs.mkdirSync(dst, { recursive: true });
  let frames = 0;
  if (dirs.length) {
    const d = path.join(animRoot, dirs[0], 'unknown'), files = fs.readdirSync(d).filter(f => /^frame_\d+\.png$/.test(f)).sort(); frames = files.length;
    files.forEach((f, i) => fs.copyFileSync(path.join(d, f), path.join(dst, `${i}.png`)));
  } else { fs.copyFileSync(path.join(src, 'rotations', 'unknown.png'), path.join(dst, '0.png')); frames = 1; }
  man.enemies[name] = { frames, fps: +fps };
} else if (kind === 'decor') {
  fs.mkdirSync(path.join(out, 'decor'), { recursive: true }); fs.copyFileSync(src, path.join(out, 'decor', name + '.png'));
  if (!man.decor.includes(name)) man.decor.push(name);
}
fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(mfile, JSON.stringify(man, null, 1));
console.log(kind, name, man.enemies[name] || '');
