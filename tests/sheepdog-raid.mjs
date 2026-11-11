// Day raids on the pen and the coin-bought pen defenses:  node tests/sheepdog-raid.mjs [--shots dir]
import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const shots=process.argv.includes('--shots')?process.argv[process.argv.indexOf('--shots')+1]:'';
const root=path.resolve('prototypes/sheepdog');
const srv=http.createServer((q,s)=>{const f=path.join(root,q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]);try{s.setHeader('Content-Type',{'.html':'text/html','.js':'text/javascript','.png':'image/png'}[path.extname(f)]||'text/plain');s.end(fs.readFileSync(f));}catch(e){s.statusCode=404;s.end('');}}).listen(0);
await new Promise(r=>srv.on('listening',r));
const b=await chromium.launch({channel:'chrome'}),page=await b.newPage({viewport:{width:960,height:540}});const errs=[];
page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:'+srv.address().port+'/');await page.waitForTimeout(500);
const res=await page.evaluate(()=>{
  const S=window.__sd,G=S.G,R=S.run.RUN,o={};
  const quiet=()=>{G.actT=1e9;G.events=[];};
  const wallRatio=()=>Math.min(...G.walls.filter(w=>w.pen&&!w.gate).map(w=>w.hp/w.max));
  // ---- 1. a raider by day goes for the fence, not the strays
  S.startMap(0);quiet();G.dog.x=60;G.dog.y=60;
  S.spawnFox(null,true);const fox=G.preds[0];fox.x=G.pen.x-200;fox.y=G.pen.y+G.pen.h/2;fox.vx=fox.vy=0;
  for(let i=0;i<60*14;i++){G.dog.x=60;G.dog.y=60;S.step(1);if(wallRatio()<1)break;}
  o.gnawed=wallRatio()<1;o.raiderIsRaid=fox.raid===true;o.notAStray=!fox.tgt||fox.tgt.inPen;
  // once the fence is through, the raider takes an animal from inside the pen
  for(const s of G.sheep.slice(0,3)){s.inPen=true;s.x=G.pen.x+60;s.y=G.pen.y+80;}
  for(const w of G.walls)if(w.pen&&!w.gate){w.hp=0;w.broken=true;}
  let took=false;for(let i=0;i<60*12&&!took;i++){G.dog.x=60;G.dog.y=60;S.step(1);took=G.sheep.some(s=>s.carried)||G.lost>0;}
  o.takesPenSheep=took;
  // ---- 2. defenses are applied to every pen of a run
  S.run.new();R.def={reinf:1,thorn:1,bell:1,torch:2,scare:1,guard:1,snare:2};
  R.flock=Array.from({length:10},()=>({type:'normal'}));S.run.startLevel({f:2,i:0,type:'herd',done:false,next:[]});quiet();
  const pw=G.walls.filter(w=>w.pen&&!w.gate);
  o.reinf=pw.every(w=>w.reinf&&w.max>=126);o.thorn=pw.every(w=>w.thorn);o.bell=pw.every(w=>w.bell);
  o.fixtures=G.fixtures.filter(f=>f.k==='torch').length===2&&G.fixtures.some(f=>f.k==='scare')&&G.fixtures.filter(f=>f.k==='snare').length===2;o.guard=G.allies.length===1;
  // a snare catches a raider that walks into it
  S.spawnFox(null,true);const f2=G.preds[G.preds.length-1];const sn=G.fixtures.find(f=>f.k==='snare');f2.x=sn.x;f2.y=sn.y;f2.vx=f2.vy=0;S.step(2);o.snared=f2.snared>0&&G.fixtures.filter(f=>f.k==='snare').length===1;
  // the guard dog drives a raider off
  G.preds=[];S.spawnFox(null,true);const f3=G.preds[0];const P=G.pen;f3.x=P.x-150;f3.y=P.y+P.h/2;f3.vx=f3.vy=0;let scared=false;
  for(let i=0;i<60*12;i++){G.dog.x=60;G.dog.y=60;S.step(1);if(f3.scared>0)scared=true;}o.guardScares=scared;
  // ---- 3. crouching beside a damaged fence mends it by day
  G.preds=[];const w0=pw[0];w0.hp=10;const mx=(w0[0]+w0[2])/2,my=(w0[1]+w0[3])/2;G.dog.x=mx-20;G.dog.y=my-20;G.dog.vx=G.dog.vy=0;
  return o;
});
await page.keyboard.down('c');
const mend=await page.evaluate(()=>{const S=window.__sd,G=S.G;const w0=G.walls.filter(w=>w.pen&&!w.gate)[0];const h0=w0.hp;const mx=(w0[0]+w0[2])/2,my=(w0[1]+w0[3])/2;for(let i=0;i<90;i++){G.dog.x=mx-20;G.dog.y=my-20;G.dog.vx=G.dog.vy=0;S.step(1);}return w0.hp-h0;});
await page.keyboard.up('c');
// the market sells defenses
const shop=await page.evaluate(()=>{const S=window.__sd,R=S.run.RUN;R.def={};R.coins=500;const sn=R.nodes.flat().find(n=>n.type==='shop');R.cur={f:sn.f-1,i:0,next:[sn.i],done:true};S.run.enter(sn);const defs=R.shop.filter(q=>q.def);const idx=R.shop.findIndex(q=>q.def);S.render();const bt=S.run.RB().find(q=>q.id==='buy:'+idx);S.run.tap({x:bt.x+bt.w/2,y:bt.y+bt.h/2});return{n:defs.length,bought:Object.keys(R.def).length};});
console.log(JSON.stringify(res),'mend +'+mend.toFixed(1),JSON.stringify(shop));
if(shots){await page.evaluate(()=>{const S=window.__sd,G=S.G,R=S.run.RUN;R.def={reinf:1,thorn:1,bell:1,torch:2,scare:1,guard:1,snare:2};S.run.startLevel({f:3,i:0,type:'herd',done:false,next:[]});G.actT=1e9;G.events=[];G.dog.x=G.pen.x-170;G.dog.y=G.pen.gy;S.spawnFox(null,true);G.preds[0].x=G.pen.x-90;G.preds[0].y=G.pen.y+20;S.step(90);});await page.screenshot({path:shots+'/raid.png'});}
const ok=res.gnawed&&res.raiderIsRaid&&res.notAStray&&res.takesPenSheep&&res.reinf&&res.thorn&&res.bell&&res.fixtures&&res.guard&&res.snared&&res.guardScares&&mend>20&&shop.n>=3&&shop.bought===1;
console.log(ok?'PASS: raiders hit the pen by day and pen defenses (bought in the market) hold them off':'FAIL','errors:',errs.length?errs.join('|'):'none');
await b.close();srv.close();process.exit(ok&&!errs.length?0:1);
