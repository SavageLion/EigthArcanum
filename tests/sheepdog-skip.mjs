// The NEXT button in the corner jumps to the dawn reward pick:  node tests/sheepdog-skip.mjs
import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const root=path.resolve('prototypes/sheepdog');
const srv=http.createServer((q,s)=>{const f=path.join(root,q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]);try{s.setHeader('Content-Type',{'.html':'text/html','.png':'image/png'}[path.extname(f)]||'text/plain');s.end(fs.readFileSync(f));}catch(e){s.statusCode=404;s.end('');}}).listen(0);
await new Promise(r=>srv.on('listening',r));
const b=await chromium.launch({channel:'chrome'}),page=await b.newPage({viewport:{width:960,height:540}});const errs=[];
page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:'+srv.address().port+'/');await page.waitForTimeout(500);
await page.evaluate(()=>{window.__sd.start();window.__sd.step(30);});
const W=await page.evaluate(()=>window.__sd.W());
await page.mouse.click(W-80+36,46+14);                 // the NEXT button
await page.waitForTimeout(100);
const a=await page.evaluate(()=>({state:window.__sd.G.state,offers:window.__sd.G.offers.length,day:window.__sd.G.day}));
await page.keyboard.press('1');                         // pick the first reward
const c=await page.evaluate(()=>({state:window.__sd.G.state,day:window.__sd.G.day,mode:window.__sd.G.mode,perks:Object.keys(window.__sd.G.perks).length}));
console.log('after NEXT',JSON.stringify(a),' after pick',JSON.stringify(c));
const ok=a.state==='dawn'&&a.offers>0&&c.state==='play'&&c.day===2&&c.mode==='day'&&c.perks===1;
console.log(ok?'PASS: NEXT jumps to the reward pick and the run continues':'FAIL','errors:',errs.length?errs.join('|'):'none');
await b.close();srv.close();process.exit(ok&&!errs.length?0:1);
