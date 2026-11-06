// Packs downloaded Pixel Lab animation frames into public/assets/wizard/anim/ and writes manifest.json.
// Usage: node tools/pack-wizard-anim.mjs
// Expects the character ZIPs unpacked to art-source/<name>/Idle/animations/<clip>/<direction>/frame_NNN.png
import fs from 'node:fs';
import path from 'node:path';

const SETS = { arena: 'art-source/raven-80-anim', large: 'art-source/raven-112-anim' };
const CLIPS = { idle: { fps: 6, loop: true }, walk: { fps: 12, loop: true }, cast: { fps: 12, loop: false }, hurt: { fps: 12, loop: false }, death: { fps: 9, loop: false } };
const out = 'public/assets/wizard/anim';
fs.rmSync(out, { recursive: true, force: true });
const manifest = {};
for (const [set, dir] of Object.entries(SETS)) {
  const root = path.join(dir, 'Idle', 'animations');
  manifest[set] = {};
  for (const clip of fs.readdirSync(root)) {
    const dirs = fs.readdirSync(path.join(root, clip));
    let frames = 0;
    for (const d of dirs) {
      const files = fs.readdirSync(path.join(root, clip, d)).filter(f => /^frame_\d+\.png$/.test(f)).sort();
      frames = files.length;
      const dst = path.join(out, set, clip, d);
      fs.mkdirSync(dst, { recursive: true });
      files.forEach((f, i) => fs.copyFileSync(path.join(root, clip, d, f), path.join(dst, `${i}.png`)));
    }
    manifest[set][clip] = { ...(CLIPS[clip] || { fps: 10, loop: true }), frames, dirs };
  }
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(JSON.stringify(Object.fromEntries(Object.entries(manifest).map(([s, c]) => [s, Object.fromEntries(Object.entries(c).map(([k, v]) => [k, `${v.frames}f x ${v.dirs.length} dirs`]))])), null, 1));
