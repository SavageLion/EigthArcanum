// Packs one boss's Pixel Lab art into public/assets/boss/<slug>/ and registers it in manifest.json.
// Usage: node tools/pack-boss.mjs <bossIndex> <slug> <idleFrames> <attackFrames> [shot]
//   idleFrames / attackFrames are the playback order of art-source/boss-<slug>/{idle,attack}/<n>.png, e.g. 0,1,2,3,2,1 and 1,2,3,4,5
//   shot = also copy art-source/boss-<slug>/shot.png
import fs from 'node:fs';
import path from 'node:path';
const [idx, slug, idleArg, atkArg, shotArg] = process.argv.slice(2);
if (!idx || !slug || !idleArg || !atkArg) { console.error('usage: node tools/pack-boss.mjs <index> <slug> <idle> <attack> [shot]'); process.exit(1); }
const list = s => s.split(',').map(Number);
const idle = list(idleArg), attack = list(atkArg), src = `art-source/boss-${slug}`, out = `public/assets/boss/${slug}`;
for (const [kind, frames] of [['idle', idle], ['attack', attack]]) {
  fs.mkdirSync(`${out}/${kind}`, { recursive: true });
  for (const n of new Set(frames)) fs.copyFileSync(`${src}/${kind}/${n}.png`, `${out}/${kind}/${n}.png`);
}
const hasShot = shotArg === 'shot' || fs.existsSync(`${src}/shot.png`) && shotArg !== 'noshot';
if (hasShot) fs.copyFileSync(`${src}/shot.png`, `${out}/shot.png`);
const mf = 'public/assets/boss/manifest.json';
const man = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, 'utf8')) : {};
man[idx] = { slug, idle, attack, ...(hasShot ? { shot: true } : {}) };
fs.writeFileSync(mf, JSON.stringify(man, null, 1));
console.log(`boss ${idx} (${slug}): idle ${idle.join(',')} | attack ${attack.join(',')}${hasShot ? ' | shot' : ''}`);
