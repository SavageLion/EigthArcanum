// Exports the seven race worlds (heights, ground types, trees, rocks) so Blender can bake their light maps.
import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const root=path.resolve('prototypes/trail');const MIME={'.html':'text/html','.png':'image/png','.js':'text/javascript','.jpg':'image/jpeg','.json':'application/json'};
const srv=http.createServer((q,s)=>{const p=q.url.split('?')[0],f=path.join(root,p==='/'?'index.html':p.split('..').join(''));try{s.setHeader('Content-Type',MIME[path.extname(f)]||'text/plain');s.end(fs.readFileSync(f));}catch(e){s.statusCode=404;s.end();}}).listen(0);
await new Promise(r=>srv.on('listening',r));
const b=await chromium.launch({channel:'chrome'});const page=await b.newPage({viewport:{width:390,height:844}});
page.on('pageerror',e=>console.log('PE',e.message));
await page.goto('http://localhost:'+srv.address().port+'/');await page.waitForTimeout(1500);
const out=process.argv[2];fs.mkdirSync(out,{recursive:true});
const ids=['pine','lake','canyon','fog','sky','glacier','summit'];
for(let i=0;i<7;i++){
  const d=await page.evaluate(i=>{const T=window.__trail;T.reset();T.tm.new();const tm=T.tm.get();tm.idx=i;tm.rn.forEach(q=>q.enter=true);T.tm.start();const W=T.state().NAV.W;
    return {N:128,CS:8,H:Array.from(W.H),nat:Array.from(W.nat),pts:W.pts.map(p=>[p.x,p.y]),trees:W.trees.map(t=>[t.x,t.y,t.h]),decor:W.decor.filter(d=>[6,10,14].includes(d.kind)).map(d=>[d.x,d.y,d.kind,d.h])};},i);
  fs.writeFileSync(path.join(out,`world_${ids[i]}.json`),JSON.stringify(d));console.log(ids[i],d.trees.length,'trees',d.decor.length,'decor');
}
await b.close();srv.close();
