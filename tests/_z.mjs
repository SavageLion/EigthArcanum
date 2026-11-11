import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const root=path.resolve('prototypes/sheepdog');
const srv=http.createServer((q,s)=>{const f=path.join(root,q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]);try{s.setHeader('Content-Type',{'.html':'text/html','.png':'image/png'}[path.extname(f)]||'text/plain');s.end(fs.readFileSync(f));}catch(e){s.statusCode=404;s.end('');}}).listen(0);
await new Promise(r=>srv.on('listening',r));
const b=await chromium.launch({channel:'chrome'});const page=await b.newPage({viewport:{width:960,height:540}});const errs=[];page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:'+srv.address().port+'/');await page.waitForTimeout(700);
const r=await page.evaluate(()=>{const S=window.__sd,G=S.G;S.startMap(1);S.bot(true);const log=[];let guard=0;
 while(G.state!=='victory'&&G.state!=='lost'&&guard++<40){let g=0;const d0=G.day,m0=G.mode;while(G.state==='play'&&g++<60*400)S.step(1);
  log.push(`${m0} ${d0}: ${G.state} penned ${G.penned}/${G.sheep.length} lost ${G.lost} away ${G.away.length}`);
  if(G.state==='dusk')S.cont();else if(G.state==='dawn')S.next(0);}
 return log;});
console.log(r.join('\n'));console.log('errors',errs.join('|')||'none');await b.close();srv.close();
