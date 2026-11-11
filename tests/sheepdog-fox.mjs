// A fox cornered against the edge must leave the map and come back somewhere else:  node tests/sheepdog-fox.mjs
import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const root=path.resolve('prototypes/sheepdog');
const srv=http.createServer((q,s)=>{const f=path.join(root,q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]);try{s.setHeader('Content-Type',{'.html':'text/html','.png':'image/png'}[path.extname(f)]||'text/plain');s.end(fs.readFileSync(f));}catch(e){s.statusCode=404;s.end('');}}).listen(0);
await new Promise(r=>srv.on('listening',r));
const b=await chromium.launch({channel:'chrome'}),page=await b.newPage({viewport:{width:960,height:540}});const errs=[];
page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:'+srv.address().port+'/');await page.waitForTimeout(500);await page.evaluate(()=>window.__sd.setNight(true));
const res=await page.evaluate(()=>{
  const S=window.__sd,G=S.G;S.start();S.endDay('called');S.cont();
  G.events=[{t:G.t+.05,k:'fox'}];S.step(10);
  const f=G.preds.find(p=>p.k==='fox');if(!f)return{err:'no fox spawned'};
  const H=540;f.x=10;f.y=H-10;f.vx=f.vy=0;G.dog.x=70;G.dog.y=H-40;G.dog.crouch=false;
  let sawExit=false,gone=false,returned=false,t=0;
  for(let i=0;i<60*20;i++){
    G.dog.x=Math.min(G.dog.x,90);       // keep the dog parked next to the corner
    S.step(1);t++;
    const fox=G.preds.find(p=>p.k==='fox');
    if(fox&&fox.exit)sawExit=true;
    if(sawExit&&!fox)gone=true;
    if(gone&&fox&&!fox.exit){returned=true;break;}
  }
  return{sawExit,gone,returned,seconds:+(t/60).toFixed(1),foxes:G.preds.filter(p=>p.k==='fox').length};
});
console.log(JSON.stringify(res));
const ok=res.sawExit&&res.gone&&res.returned;
console.log(ok?'PASS: cornered fox leaves the map and returns':'FAIL','errors:',errs.length?errs.join('|'):'none');
await b.close();srv.close();process.exit(ok&&!errs.length?0:1);
