// Plays Sheepdog (day + night) with bots:  node tests/sheepdog-bot.mjs [days] [--shots dir]
import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const DAYS=+process.argv[2]||4,shots=process.argv.includes('--shots')?process.argv[process.argv.indexOf('--shots')+1]:'';
const root=path.resolve('prototypes/sheepdog');
const srv=http.createServer((q,s)=>{const f=path.join(root,q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]);try{s.setHeader('Content-Type',{'.html':'text/html','.png':'image/png'}[path.extname(f)]||'text/plain');s.end(fs.readFileSync(f));}catch(e){s.statusCode=404;s.end('');}}).listen(0);
await new Promise(r=>srv.on('listening',r));
const b=await chromium.launch({channel:'chrome'});const page=await b.newPage({viewport:{width:960,height:540}});const errs=[];
page.on('pageerror',e=>errs.push(e.message));page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await page.goto('http://localhost:'+srv.address().port+'/');await page.waitForTimeout(500);
await page.evaluate(()=>{window.__sd.start();window.__sd.bot(true);});
const run=()=>page.evaluate(()=>{const S=window.__sd;let g=0;while(S.G.state==='play'&&g++<60*200)S.step(1);return {state:S.G.state,mode:S.G.mode,day:S.G.day,left:Math.round(S.G.time),penned:S.G.penned,n:S.G.sheep.length,lost:S.G.lost,herd:S.G.herd.length,score:S.G.score};});
for(let d=1;d<=DAYS;d++){
  let r=await run();console.log('day',d,'ends',JSON.stringify(r));
  if(shots){await page.evaluate(()=>window.__sd.render());await page.screenshot({path:`${shots}/sd_d${d}_end.png`});}
  if(r.state==='dusk'){                                   // night mode on: play the night as well
    await page.evaluate(()=>window.__sd.cont());
    r=await run();console.log('night',d,'ends',JSON.stringify(r));
  }
  if(r.state!=='dawn')break;                              // victory / lost
  await page.evaluate(()=>window.__sd.next(0));
}
console.log('errors',errs.length?errs.join(' | '):'none');await b.close();srv.close();
