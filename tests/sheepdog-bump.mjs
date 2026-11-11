// Dog/sheep collision test for the Sheepdog prototype:  node tests/sheepdog-bump.mjs
import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const root=path.resolve('prototypes/sheepdog');
const srv=http.createServer((q,s)=>{const f=path.join(root,q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]);try{s.setHeader('Content-Type',{'.html':'text/html','.js':'text/javascript','.png':'image/png'}[path.extname(f)]||'text/plain');s.end(fs.readFileSync(f));}catch(e){s.statusCode=404;s.end('');}}).listen(0);
await new Promise(r=>srv.on('listening',r));
const b=await chromium.launch({channel:'chrome'});const page=await b.newPage({viewport:{width:960,height:540}});const errs=[];page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:'+srv.address().port+'/');
async function trial(calm){
  await page.evaluate(()=>{const S=window.__sd,G=S.G;S.start();G.sheep=G.sheep.slice(0,1);G.sheep[0].type='normal';G.sheep[0].T={r:7,zone:0,flee:0,speed:1,col:'#fff',n:'x'};Object.assign(G.sheep[0],{x:400,y:270,vx:0,vy:0,panic:0});Object.assign(G.dog,{x:300,y:270,vx:0,vy:0});G.need=99;});
  if(calm)await page.keyboard.down('c');
  await page.keyboard.down('d');
  const r=await page.evaluate(()=>{const S=window.__sd,G=S.G;let peak=0;for(let i=0;i<90;i++){S.step(1);peak=Math.max(peak,G.sheep[0].panic);}return {dog:Math.round(G.dog.x),sheep:Math.round(G.sheep[0].x),peakPanic:+peak.toFixed(2),overlap:Math.hypot(G.dog.x-G.sheep[0].x,G.dog.y-G.sheep[0].y)<13};});
  await page.keyboard.up('d');if(calm)await page.keyboard.up('c');return r;
}
const run=await trial(false),slow=await trial(true);
console.log('full-speed charge:',JSON.stringify(run));console.log('crouching nudge  :',JSON.stringify(slow));
const ok=run.peakPanic>.5&&slow.peakPanic<.2&&!run.overlap&&!slow.overlap&&run.sheep>400&&slow.sheep>=400;
console.log(ok?'PASS: solid dog, hard bump panics, gentle nudge does not':'FAIL','errors:',errs.length?errs.join('|'):'none');
await b.close();srv.close();process.exit(ok?0:1);
