// Builds prototypes/boss-runner.html: the runner template with the Mirror Witch and wizard sprites embedded as data URIs.
import fs from 'fs';
const A='public/assets/', b64=p=>'data:image/png;base64,'+fs.readFileSync(A+p).toString('base64');
const assets={
  bossIdle:[0,1,2,3].map(i=>b64(`boss/mirror/idle/${i}.png`)),
  bossAtk:[1,2,3,4].map(i=>b64(`boss/mirror/attack/${i}.png`)),
  wizWalk:[0,1,2,3,4,5].map(i=>b64(`wizard/anim/arena/walk/north/${i}.png`)),
};
const out=fs.readFileSync('prototypes/boss-runner.template.html','utf8').replace('/*ASSETS*/',()=>JSON.stringify(assets));
fs.writeFileSync('prototypes/boss-runner.html',out); console.log('wrote',(out.length/1024).toFixed(0)+'KB');
