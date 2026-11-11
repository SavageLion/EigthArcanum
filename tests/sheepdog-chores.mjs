// Night chores prototype: shearing, milking, egg hunt, feeding; the board; produce becomes bones; a cared-for flock gets extra time:  node tests/sheepdog-chores.mjs [--shots dir]
import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const shots=process.argv.includes('--shots')?process.argv[process.argv.indexOf('--shots')+1]:'';
const root=path.resolve('prototypes/sheepdog');
const srv=http.createServer((q,s)=>{const f=path.join(root,q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]);try{s.setHeader('Content-Type',{'.html':'text/html','.js':'text/javascript','.png':'image/png'}[path.extname(f)]||'text/plain');s.end(fs.readFileSync(f));}catch(e){s.statusCode=404;s.end('');}}).listen(0);
await new Promise(r=>srv.on('listening',r));
const b=await chromium.launch({channel:'chrome'}),page=await b.newPage({viewport:{width:960,height:540}});const errs=[];
page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:'+srv.address().port+'/');await page.waitForTimeout(500);
// the home screen has a CHORES (testing) button
const W=await page.evaluate(()=>window.__sd.W());
await page.mouse.click(W-190-14+95,540-30-12-36+15);await page.waitForTimeout(150);
const entered=await page.evaluate(()=>({state:window.__sd.G.state,offered:window.__sd.chores.CS.offered.join(',')}));
const res=await page.evaluate(()=>{
  const S=window.__sd,C=S.chores,CS=C.CS,o={};
  const P=(x,y)=>({x,y});
  // 1. shearing: drag slowly over every cell
  C.start('shear');let m=CS.m;
  C.down(P(m.cells[0].x,m.cells[0].y));
  for(const q of m.cells){C.move(P(q.x,q.y));S.step(3);}
  C.up();while(CS.phase==='play')S.step(1);o.shear=CS.done.shear?CS.done.shear.n:-1;
  // hurrying does not clear wool
  CS.phase='board';C.start('shear');m=CS.m;C.down(P(m.cells[0].x,m.cells[0].y));for(let i=0;i<30;i++){C.move(P(m.cx-200+i*14,m.cy));S.step(1);}o.fastPct=m.pct;C.up();CS.phase='board';delete CS.done.shear;
  // 2. milking: tap each note on time
  CS.phase='board';C.start('milk');m=CS.m;
  for(const n of m.notes){while(m.t<n.t-.01&&CS.phase==='play')S.step(1);C.down(P(n.lane?S.W()/2+150:S.W()/2-150,300));}
  while(CS.phase==='play')S.step(1);o.milk=CS.done.milk.n;
  // 3. egg hunt: tap every egg (goose parked far away)
  CS.phase='board';C.start('eggs');m=CS.m;m.goose.x=-999;m.goose.y=-999;m.goose.vx=m.goose.vy=0;
  for(const e of m.eggs){C.down(P(e.x,e.y));}
  S.step(2);o.eggs=CS.done.eggs?CS.done.eggs.n:-1;
  // a poked goose freezes the player
  CS.phase='board';C.start('eggs');m=CS.m;C.down(P(m.goose.x,m.goose.y));o.pecked=m.pecks===1&&m.frozen>0;CS.phase='board';delete CS.done.eggs;
  // 4. feeding: drag feed to each trough, over and over
  CS.phase='board';C.start('feed');m=CS.m;
  for(let r=0;r<8&&CS.phase==='play';r++){for(const q of m.tr){C.down(P(m.pile.x,m.pile.y));C.move(P(q.x,q.y));C.up();S.step(40);}}
  while(CS.phase==='play')S.step(1);o.feed=CS.done.feed.n;
  // finish: produce -> bones, care buff
  CS.phase='board';const b0=S.save.bones||0;C.finish();o.bones=(S.save.bones||0)-b0;o.after=S.G.state;o.cared=S.G.cared;
  return o;
});
console.log('home button ->',JSON.stringify(entered),JSON.stringify(res));
if(shots){for(const id of ['shear','milk','eggs','feed']){await page.evaluate(id=>{const S=window.__sd,C=S.chores;S.G.state='chores';C.CS.phase='board';C.start(id);const m=C.CS.m;if(id==='shear'){for(let i=0;i<m.cells.length*.5;i++)m.cells[i].w=0;m.px=m.cx;m.py=m.cy;m.down=true;}if(id==='milk'){S.step(150);}if(id==='eggs'){m.eggs[0].got=true;m.eggs[1].got=true;}S.render();},id);await page.screenshot({path:`${shots}/chore_${id}.png`});}
 await page.evaluate(()=>{const S=window.__sd,C=S.chores;C.CS.phase='board';C.enter(['normal','cow','goose','pig'],true);C.CS.done.shear={n:9,key:'wool'};S.render();});await page.screenshot({path:shots+'/chore_board.png'});}
const ok=entered.state==='chores'&&entered.offered.includes('shear')&&entered.offered.includes('milk')&&res.shear>=8&&res.fastPct<.3&&res.milk>=18&&res.eggs===6&&res.pecked&&res.feed>=6&&res.bones>=20&&res.after==='ready'&&res.cared>=2;
console.log(ok?'PASS: all four chores play, produce pays bones and the flock is cared for':'FAIL','errors:',errs.length?errs.join('|'):'none');
await b.close();srv.close();process.exit(ok&&!errs.length?0:1);
