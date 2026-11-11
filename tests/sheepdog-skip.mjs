// NEXT skips the day straight to the night, and the night straight to the dawn reward pick:  node tests/sheepdog-skip.mjs
import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const root=path.resolve('prototypes/sheepdog');
const srv=http.createServer((q,s)=>{const f=path.join(root,q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]);try{s.setHeader('Content-Type',{'.html':'text/html','.png':'image/png'}[path.extname(f)]||'text/plain');s.end(fs.readFileSync(f));}catch(e){s.statusCode=404;s.end('');}}).listen(0);
await new Promise(r=>srv.on('listening',r));
const b=await chromium.launch({channel:'chrome'}),page=await b.newPage({viewport:{width:960,height:540}});const errs=[];
page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:'+srv.address().port+'/');await page.waitForTimeout(500);
await page.evaluate(()=>{window.__sd.startMap(0);window.__sd.step(30);});
const W=await page.evaluate(()=>window.__sd.W());
const snap=()=>page.evaluate(()=>({state:window.__sd.G.state,mode:window.__sd.G.mode,day:window.__sd.G.day,offers:window.__sd.G.offers.length}));
await page.mouse.click(W-80+36,46+14);await page.waitForTimeout(100);       // NEXT during the day -> night
const a=await snap();
await page.mouse.click(W-80+36,46+14);await page.waitForTimeout(100);       // NEXT during the night -> dawn
const d=await snap();
await page.keyboard.press('1');                                              // pick the first reward
const c=await snap();
console.log('after NEXT (day)',JSON.stringify(a),' after NEXT (night)',JSON.stringify(d),' after pick',JSON.stringify(c));
const ok=a.state==='play'&&a.mode==='night'&&a.day===1&&d.state==='dawn'&&d.offers>0&&c.state==='play'&&c.mode==='day'&&c.day===2;
console.log(ok?'PASS: NEXT goes day -> night -> dawn':'FAIL','errors:',errs.length?errs.join('|'):'none');
await b.close();srv.close();process.exit(ok&&!errs.length?0:1);
