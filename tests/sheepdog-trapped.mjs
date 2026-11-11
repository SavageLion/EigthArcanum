// The dog must never be locked in the pen when the gate shuts at night:  node tests/sheepdog-trapped.mjs
import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const root=path.resolve('prototypes/sheepdog');
const srv=http.createServer((q,s)=>{const f=path.join(root,q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]);try{s.setHeader('Content-Type',{'.html':'text/html','.png':'image/png'}[path.extname(f)]||'text/plain');s.end(fs.readFileSync(f));}catch(e){s.statusCode=404;s.end('');}}).listen(0);
await new Promise(r=>srv.on('listening',r));
const b=await chromium.launch({channel:'chrome'}),page=await b.newPage({viewport:{width:960,height:540}});const errs=[];
page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:'+srv.address().port+'/');await page.waitForTimeout(500);await page.evaluate(()=>window.__sd.setNight(true));
const res=await page.evaluate(()=>{
  const S=window.__sd,G=S.G,o={};
  const inPen=q=>{const P=G.pen;return q.x>P.x&&q.x<P.x+P.w&&q.y>P.y&&q.y<P.y+P.h;};
  S.startMap(0);G.actT=1e9;
  const P=G.pen;G.dog.x=P.x+P.w/2;G.dog.y=P.y+P.h/2;G.dog.vx=G.dog.vy=0;o.insideBefore=inPen(G.dog);
  S.endDay('called');S.cont();                    // dusk -> night: the gate shuts
  o.outsideAfter=!inPen(G.dog);o.state=G.state+'/'+G.mode;
  // and even if it somehow gets in, it can walk out through the shut gate
  G.dog.x=P.x+30;G.dog.y=P.gy;G.dog.vx=G.dog.vy=0;G.dog.crouch=false;
  for(let i=0;i<120;i++){G.dog.vx=-200;G.dog.vy=0;S.step(1);}
  o.walkedOut=G.dog.x<P.x-10;
  return o;
});
console.log(JSON.stringify(res));
const ok=res.insideBefore&&res.outsideAfter&&res.state==='play/night'&&res.walkedOut;
console.log(ok?'PASS: the dog is never trapped in the pen':'FAIL','errors:',errs.length?errs.join('|'):'none');
await b.close();srv.close();process.exit(ok&&!errs.length?0:1);
