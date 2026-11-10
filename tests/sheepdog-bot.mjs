// Plays the Sheepdog prototype with a herding bot:  node tests/sheepdog-bot.mjs [rounds] [--shots dir]
import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const ROUNDS=+process.argv[2]||5,shots=process.argv.includes('--shots')?process.argv[process.argv.indexOf('--shots')+1]:'';
const root=path.resolve('prototypes/sheepdog');
const srv=http.createServer((q,s)=>{const f=path.join(root,q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]);try{s.setHeader('Content-Type',{'.html':'text/html','.png':'image/png'}[path.extname(f)]||'text/plain');s.end(fs.readFileSync(f));}catch(e){s.statusCode=404;s.end('');}}).listen(0);
await new Promise(r=>srv.on('listening',r));
const b=await chromium.launch({channel:'chrome'});const page=await b.newPage({viewport:{width:960,height:540}});const errs=[];
page.on('pageerror',e=>errs.push(e.message));page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await page.goto('http://localhost:'+srv.address().port+'/');await page.waitForTimeout(500);
await page.evaluate(()=>{window.__sd.start();window.__sd.bot(true);});
for(let r=1;r<=ROUNDS;r++){
  const res=await page.evaluate(()=>{const S=window.__sd;let g=0;const t0=S.G.time;while(S.G.state==='play'&&g++<60*200)S.step(1);return {state:S.G.state,round:S.G.round,left:Math.round(S.G.time),limit:S.G.limit,inPen:S.G.inPen,need:S.G.need,n:S.G.sheep.length,types:S.G.sheep.reduce((a,s)=>(a[s.type]=(a[s.type]||0)+1,a),{})};});
  console.log('round',res.round,res.state,JSON.stringify(res));
  if(shots){await page.evaluate(()=>window.__sd.render());await page.screenshot({path:`${shots}/sd_r${r}_end.png`});}
  if(res.state!=='won')break;
  await page.evaluate(()=>window.__sd.next(0));
  if(shots){await page.evaluate(()=>{window.__sd.step(60*14);});await page.screenshot({path:`${shots}/sd_r${r+1}_mid.png`});}
}
console.log('errors',errs.length?errs.join(' | '):'none');await b.close();srv.close();
