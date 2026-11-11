// The UNLOCK ALL test button on the map select screen opens locked maps:  node tests/sheepdog-unlock.mjs
import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const root=path.resolve('prototypes/sheepdog');
const srv=http.createServer((q,s)=>{const f=path.join(root,q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]);try{s.setHeader('Content-Type',{'.html':'text/html','.png':'image/png'}[path.extname(f)]||'text/plain');s.end(fs.readFileSync(f));}catch(e){s.statusCode=404;s.end('');}}).listen(0);
await new Promise(r=>srv.on('listening',r));
const b=await chromium.launch({channel:'chrome'}),page=await b.newPage({viewport:{width:960,height:540}});const errs=[];
page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:'+srv.address().port+'/');await page.waitForTimeout(500);
const W=await page.evaluate(()=>window.__sd.W());
const card2x=(W-(5*170+4*12))/2+170+12+85;                       // middle of map 2's card
await page.mouse.click(card2x,280);await page.waitForTimeout(100);       // locked: nothing happens
const locked=await page.evaluate(()=>({state:window.__sd.G.state}));
await page.mouse.click(W-190-14+95,540-30-12+15);await page.waitForTimeout(100);   // UNLOCK ALL
const flag=await page.evaluate(()=>!!window.__sd.save.unlockAll);
await page.mouse.click(card2x,280);await page.waitForTimeout(200);
const after=await page.evaluate(()=>({state:window.__sd.G.state,map:window.__sd.G.map.id}));
console.log('before',JSON.stringify(locked),'flag',flag,'after',JSON.stringify(after));
const ok=locked.state==='ready'&&flag&&after.state==='play'&&after.map==='hill';
console.log(ok?'PASS: UNLOCK ALL opens Hill Pasture':'FAIL','errors:',errs.length?errs.join('|'):'none');
await b.close();srv.close();process.exit(ok&&!errs.length?0:1);
