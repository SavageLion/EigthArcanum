// Builds prototypes/survivors/survivors.html: template.html with the Raven's walk and idle sprites inlined as data URIs.
import fs from 'node:fs';
const b64 = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const A = 'public/assets/wizard';
const spr = { walk: {}, idle: {} };
for (const d of ['east', 'west', 'north', 'south']) {
  spr.idle[d] = b64(`${A}/arena/${d}.png`);
  spr.walk[d] = Array.from({ length: 6 }, (_, i) => b64(`${A}/anim/arena/walk/${d}/${i}.png`));
}
const t = fs.readFileSync('prototypes/survivors/template.html', 'utf8').replace('/*SPR*/{}', JSON.stringify(spr));
fs.writeFileSync('prototypes/survivors/survivors.html', t);
console.log('built', (t.length / 1024).toFixed(0) + ' KB');
