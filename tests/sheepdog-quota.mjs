// A day needs a minimum number of sheep in the pen (the quota): miss it and the run ends; make it and the rest wander home:  node tests/sheepdog-quota.mjs
import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const root=path.resolve('prototypes/sheepdog');
const srv=http.createServer((q,s)=>{const f=path.join(root,q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]);try{s.setHeader('Content-Type',{'.html':'text/html','.png':'image/png'}[path.extname(f)]||'text/plain');s.end(fs.readFileSync(f));}catch(e){s.statusCode=404;s.end('');}}).listen(0);
await new Promise(r=>srv.on('listening',r));
const b=await chromium.launch({channel:'chrome'}),page=await b.newPage({viewport:{width:960,height:540}});const errs=[];
page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:'+srv.address().port+'/');await page.waitForTimeout(500);
const W=await page.evaluate(()=>window.__sd.W());
await page.evaluate(()=>window.__sd.setChores(true));
const pen=n=>page.evaluate(n=>{const G=window.__sd.G;G.sheep.slice(0,n).forEach(s=>{s.inPen=true;});window.__sd.step(1);return {need:window.__sd.quota(),total:G.sheep.length};},n);
// 1. below the quota when time is up: the run ends
await page.evaluate(()=>{window.__sd.startMap(0);window.__sd.G.actT=1e9;});
const t0=await pen(1);
await page.evaluate(()=>window.__sd.endDay('time'));
const fail=await page.evaluate(()=>({state:window.__sd.G.state,why:window.__sd.G.failWhy,info:window.__sd.G.failInfo}));
// 2. at the quota: the FINISH DAY button works and the unpenned sheep survive into the next day
await page.evaluate(()=>{window.__sd.startMap(0);window.__sd.G.actT=1e9;});
const t1=await pen(0);
await page.evaluate(n=>{window.__sd.G.sheep.slice(0,n).forEach(s=>{s.inPen=true;});window.__sd.step(1);},t1.need);
await page.mouse.click(W/2,20);await page.waitForTimeout(100);
const chores=await page.evaluate(()=>window.__sd.G.state);await page.evaluate(()=>window.__sd.chores.finish());
const pass=await page.evaluate(()=>({state:window.__sd.G.state,herd:window.__sd.G.herd.length,total:window.__sd.G.dayTotal}));
console.log('quota',t1.need,'of',t1.total,' fail:',JSON.stringify(fail),' pass:',JSON.stringify(pass));
const ok=t0.need>=3&&t0.need<t0.total&&fail.state==='lost'&&fail.why==='quota'&&fail.info.need===t0.need&&chores==='chores'&&pass.state==='dawn'&&pass.herd>=pass.total;
console.log(ok?'PASS: quota ends the run when missed and lets the day pass when met':'FAIL','errors:',errs.length?errs.join('|'):'none');
await b.close();srv.close();process.exit(ok&&!errs.length?0:1);
