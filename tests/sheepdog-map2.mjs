// Map 2 (Hill Pasture): big world with a camera, scattered / hidden sheep, bark pings, and sheep acting out:  node tests/sheepdog-map2.mjs
import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const root=path.resolve('prototypes/sheepdog');
const srv=http.createServer((q,s)=>{const f=path.join(root,q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]);try{s.setHeader('Content-Type',{'.html':'text/html','.png':'image/png'}[path.extname(f)]||'text/plain');s.end(fs.readFileSync(f));}catch(e){s.statusCode=404;s.end('');}}).listen(0);
await new Promise(r=>srv.on('listening',r));
const b=await chromium.launch({channel:'chrome'}),page=await b.newPage({viewport:{width:960,height:540}});const errs=[];
page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:'+srv.address().port+'/');await page.waitForTimeout(500);
const out=await page.evaluate(()=>{
  const S=window.__sd,G=S.G,res={};
  S.startMap(1);const [WX,WY]=S.world(),W=S.W();
  res.world=[WX,WY,W];res.bigger=WX>W*1.8&&WY>540*1.5;
  const n=G.sheep.length;res.sheep=n;res.hidden=G.sheep.filter(s=>s.hidden).length;res.unseenAtStart=G.sheep.filter(s=>!s.seen).length;
  // camera follows the dog
  const cx0=S.cam.x;G.dog.x=500;G.dog.y=700;S.step(120);res.camMoved=Math.abs(S.cam.x-cx0)>100;
  // bark pings sheep we haven't seen
  const far=G.sheep.find(s=>!s.hidden&&!s.seen);
  if(far){G.dog.x=far.x-340;G.dog.y=far.y;G.dog.vx=G.dog.vy=0;G.barkCd=0;S.bark();res.pinged=far.ping>0;}else res.pinged='no unseen sheep';
  // hidden sheep are found by walking up to them
  const h=G.sheep.find(s=>s.hidden);if(h){G.dog.x=h.x-30;G.dog.y=h.y;S.step(3);res.hiddenFound=!h.hidden;}else res.hiddenFound='none hidden';
  // a bolter that is not headed off runs off the map and comes back at dawn
  const b0=G.sheep.find(s=>!s.hidden&&!s.act&&!s.inPen);G.dog.x=G.pen.x-300;G.dog.y=G.pen.gy;
  const before=G.sheep.length,type=b0.type;b0.act='bolt';b0.warn=0;b0.bx=-30;b0.by=b0.y;b0.actT=0;
  for(let i=0;i<60*20&&G.sheep.includes(b0);i++)S.step(1);
  res.boltGone=!G.sheep.includes(b0)&&G.sheep.length===before-1&&G.away.length===1;
  // a stuck sheep is freed by standing next to it
  const st=G.sheep.find(s=>!s.hidden&&!s.act&&!s.inPen);st.act='stuck';st.free=0;G.dog.x=st.x-20;G.dog.y=st.y;G.dog.vx=G.dog.vy=0;
  for(let i=0;i<60*4;i++){G.dog.x=st.x-20;G.dog.y=st.y;G.dog.vx=G.dog.vy=0;S.step(1);}
  res.stuckFreed=st.act===null;
  // dawn: the runaway is back in the flock
  const herd0=G.sheep.length+1;S.skip();res.dawn=G.state;res.backAtDawn=G.herd.length>=herd0;
  return res;
});
console.log(JSON.stringify(out));
const ok=out.bigger&&out.hidden>=1&&out.camMoved&&out.pinged===true&&out.hiddenFound===true&&out.boltGone&&out.stuckFreed&&out.dawn==='dawn'&&out.backAtDawn;
console.log(ok?'PASS: map 2 world, find mechanic and acting-out sheep work':'FAIL','errors:',errs.length?errs.join('|'):'none');
await b.close();srv.close();process.exit(ok&&!errs.length?0:1);
