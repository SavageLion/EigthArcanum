// DROVE ROAD (Slay-the-Spire style run): map, herd levels, events, market, fireside, reward, end:  node tests/sheepdog-run.mjs [--shots dir]
import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const shots=process.argv.includes('--shots')?process.argv[process.argv.indexOf('--shots')+1]:'';
const root=path.resolve('prototypes/sheepdog');
const srv=http.createServer((q,s)=>{const f=path.join(root,q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]);try{s.setHeader('Content-Type',{'.html':'text/html','.js':'text/javascript','.png':'image/png'}[path.extname(f)]||'text/plain');s.end(fs.readFileSync(f));}catch(e){s.statusCode=404;s.end('');}}).listen(0);
await new Promise(r=>srv.on('listening',r));
const b=await chromium.launch({channel:'chrome'}),page=await b.newPage({viewport:{width:960,height:540}});const errs=[];
page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:'+srv.address().port+'/');await page.waitForTimeout(500);
const W=await page.evaluate(()=>window.__sd.W());
await page.mouse.click(W/2,540-42+15);await page.waitForTimeout(150);             // the DROVE ROAD button on the home screen
const start=await page.evaluate(()=>{const S=window.__sd,R=S.run.RUN;S.render();
  const rows=R.nodes,seen=new Set();let frontier=rows[0].map(n=>n);for(const n of frontier)seen.add(n.f+':'+n.i);
  for(let f=1;f<rows.length;f++){const nxt=[];for(const a of frontier)for(const i of a.next){const nd=rows[a.f][i];if(!seen.has(nd.f+':'+nd.i)){seen.add(nd.f+':'+nd.i);nxt.push(nd);}}frontier=nxt;}
  return{state:S.G.state,floors:rows.length,boss:rows[rows.length-1][0].type,allReachable:seen.size===rows.reduce((a,r)=>a+r.length,0),flock:R.flock.length,goal:R.goal,floor1:rows[0].filter(n=>S.run.reach(n)).length};});
if(shots)await page.screenshot({path:shots+'/run_map.png'});
const res=await page.evaluate(()=>{
  const S=window.__sd,R=S.run.RUN,G=S.G,o={visited:[],levels:0,events:0,shops:0,rests:0,perks:0};
  const click=id=>{S.render();const bt=S.run.RB().find(q=>q.id===id);if(!bt)return false;S.run.tap({x:bt.x+bt.w/2,y:bt.y+bt.h/2});return true;};
  // one real level played by the bot: it must end in the result screen
  const n1=R.nodes[0].find(n=>n.type==='herd');S.run.enter(n1);o.levelState=G.state;S.bot(true);let g=0;while(G.state==='play'&&g++<60*220)S.step(1);S.bot(false);o.afterBot=G.state;
  click('cont');o.afterCont=G.state;if(G.state==='run_perk')click('perk:0');o.backOnMap=G.state;
  // then walk the whole road, skipping each drive with NEXT
  let guard=0;
  while(R.on&&guard++<80){
    if(G.state==='run_map'){const nxt=(R.cur===null?R.nodes[0]:R.nodes[R.cur.f]).filter(n=>S.run.reach(n));if(!nxt.length)break;const nd=nxt.find(n=>n.type==='shop'||n.type==='rest'||n.type==='event')||nxt[0];o.visited.push(nd.type);S.run.enter(nd);
      if(G.state==='play'){o.levels++;S.skip();}}
    else if(G.state==='run_event'){o.events++;if(!click('opt:0'))click('opt:1');click('cont');}
    else if(G.state==='run_shop'){o.shops++;click('buy:0');click('cont');}
    else if(G.state==='run_rest'){o.rests++;click('rest1');click('cont');}
    else if(G.state==='run_res'){click('cont');}
    else if(G.state==='run_perk'){o.perks++;o.offerN=G.offers.length;click('perk:0');}
    else break;
  }
  o.end=G.state;o.flock=R.flock.length;o.endInfo=R.end;o.coinsNonNeg=R.coins>=0;
  return o;
});
const pens=await page.evaluate(()=>{const S=window.__sd,R=S.run.RUN,o={modes:new Set(),fx:[],ok:true};
  for(let i=0;i<40;i++){R.flock=Array.from({length:10},()=>({type:'normal'}));const nd={f:i%2?6:3,i:0,type:'herd',done:false,next:[]};S.run.startLevel(nd);const p=S.penInfo();o.modes.add(p.mode);o.fx.push(p.fx);
   if(!(p.fx>=0&&p.fx<=1&&p.fy>=0&&p.fy<=1&&p.dog[0]>0&&p.dog[0]<p.world[0]&&p.dog[1]>0&&p.dog[1]<p.world[1]))o.ok=false;S.step(2);}
  return{modes:[...o.modes],spread:Math.max(...o.fx)-Math.min(...o.fx),ok:o.ok};});
console.log('pens',JSON.stringify(pens));
console.log(JSON.stringify(start),JSON.stringify(res));
if(shots){await page.evaluate(()=>{const S=window.__sd;S.run.new();S.render();});await page.screenshot({path:shots+'/run_map2.png'});
 await page.evaluate(()=>{const S=window.__sd,R=S.run.RUN;const e=R.nodes[0][0];R.cur=null;R.ev=S.run.EVENTS[1];R.evRes=null;S.G.state='run_event';R.cur=e;S.render();});await page.screenshot({path:shots+'/run_event.png'});}
const ok=start.state==='run_map'&&start.floors===12&&start.boss==='boss'&&start.allReachable&&start.flock===12&&start.floor1===3&&res.levelState==='play'&&res.afterBot==='run_res'&&res.backOnMap==='run_map'&&res.levels>=3&&res.perks>=res.levels-1&&res.offerN===3&&res.events+res.shops+res.rests>=2&&pens.modes.length>=3&&pens.spread>.3&&pens.ok&&res.end==='run_end'&&res.endInfo&&res.endInfo.n===res.flock&&res.coinsNonNeg;
console.log(ok?'PASS: Drove Road run plays from the map to the end':'FAIL','errors:',errs.length?errs.join('|'):'none');
await b.close();srv.close();process.exit(ok&&!errs.length?0:1);
