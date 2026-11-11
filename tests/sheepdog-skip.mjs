// NEXT: with the night off it skips the day to the reward pick; with the night on, day -> night -> dawn:  node tests/sheepdog-skip.mjs
import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const root=path.resolve('prototypes/sheepdog');
const srv=http.createServer((q,s)=>{const f=path.join(root,q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]);try{s.setHeader('Content-Type',{'.html':'text/html','.png':'image/png'}[path.extname(f)]||'text/plain');s.end(fs.readFileSync(f));}catch(e){s.statusCode=404;s.end('');}}).listen(0);
await new Promise(r=>srv.on('listening',r));
const b=await chromium.launch({channel:'chrome'}),page=await b.newPage({viewport:{width:960,height:540}});const errs=[];
page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:'+srv.address().port+'/');await page.waitForTimeout(500);
const snap=()=>page.evaluate(()=>({state:window.__sd.G.state,mode:window.__sd.G.mode,day:window.__sd.G.day,offers:window.__sd.G.offers.length,lost:window.__sd.G.lost}));
const W=await page.evaluate(()=>window.__sd.W());
const next=async()=>{await page.mouse.click(W-80+36,46+14);await page.waitForTimeout(100);};
// night off (the default): NEXT -> dawn reward pick, nobody lost, then the next day
await page.evaluate(()=>{window.__sd.startMap(0);window.__sd.step(30);});
await next();const a=await snap();
await page.keyboard.press('1');const a2=await snap();
// night on: day -> night -> dawn
await page.evaluate(()=>{window.__sd.setNight(true);window.__sd.startMap(0);window.__sd.step(30);});
await next();const n1=await snap();await next();const n2=await snap();
console.log('night off:',JSON.stringify(a),'->',JSON.stringify(a2),'  night on:',JSON.stringify(n1),'->',JSON.stringify(n2));
const ok=a.state==='dawn'&&a.offers>0&&a.lost===0&&a2.state==='play'&&a2.day===2&&a2.mode==='day'&&n1.state==='play'&&n1.mode==='night'&&n2.state==='dawn';
console.log(ok?'PASS: NEXT skips the day (night off) and day -> night -> dawn (night on)':'FAIL','errors:',errs.length?errs.join('|'):'none');
await b.close();srv.close();process.exit(ok&&!errs.length?0:1);
