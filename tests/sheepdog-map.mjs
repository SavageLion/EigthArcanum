// Map 1 is a 5-day campaign that ends in a win screen, saves stars and returns to map select:  node tests/sheepdog-map.mjs
import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const root=path.resolve('prototypes/sheepdog');
const srv=http.createServer((q,s)=>{const f=path.join(root,q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]);try{s.setHeader('Content-Type',{'.html':'text/html','.png':'image/png'}[path.extname(f)]||'text/plain');s.end(fs.readFileSync(f));}catch(e){s.statusCode=404;s.end('');}}).listen(0);
await new Promise(r=>srv.on('listening',r));
const b=await chromium.launch({channel:'chrome'}),page=await b.newPage({viewport:{width:960,height:540}});const errs=[];
page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:'+srv.address().port+'/');await page.waitForTimeout(500);
const menu=await page.evaluate(()=>({state:window.__sd.G.state,maps:window.__sd.maps.map(m=>m.name+':'+m.days+(m.ready?'':'(soon)'))}));
console.log('menu',JSON.stringify(menu));
let res=null;
for(let attempt=1;attempt<=6;attempt++){
  res=await page.evaluate(()=>{const S=window.__sd,G=S.G;S.startMap(0);S.bot(true);const log=[];let guard=0;
    while(G.state!=='victory'&&G.state!=='lost'&&guard++<40){
      let g=0;while(G.state==='play'&&g++<60*220)S.step(1);
      if(G.state==='chores')S.chores.finish();else if(G.state==='dusk')S.cont();else if(G.state==='dawn')S.next(0);}
    return{state:G.state,day:G.day,days:G.map.days,stars:G.stars,saved:S.save.stars.home||0,runLost:G.runLost};});
  console.log('attempt',attempt,JSON.stringify(res));
  if(res.state==='victory')break;
  await page.evaluate(()=>{window.__sd.cont();});          // lost screen -> map select
}
// tap the win screen: back to the map select
const back=res.state==='victory'?await page.evaluate(()=>{window.__sd.cont();return window.__sd.G.state;}):'n/a';
const ok=menu.state==='ready'&&menu.maps.length===5&&res.state==='victory'&&res.day===5&&res.saved>=1&&back==='ready';
console.log(ok?'PASS: 5-day map is winnable, saves stars, returns to map select':'FAIL','errors:',errs.length?errs.join('|'):'none');
await b.close();srv.close();process.exit(ok&&!errs.length?0:1);
