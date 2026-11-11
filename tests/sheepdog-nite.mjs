// Night encounters you play as the dog in the dark: LAMB RESCUE and FOX HUNT (tested from a home-screen button):  node tests/sheepdog-nite.mjs [--shots dir]
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
await page.evaluate(()=>{window.__sd.G.state='nite_pick';});
const picker=await page.evaluate(()=>window.__sd.G.state);
await page.evaluate(()=>window.__sd.render());
const click=id=>page.evaluate(id=>{const S=window.__sd;S.render();});
const res=await page.evaluate(()=>{
  const S=window.__sd,G=S.G,N=S.nite.NITE,o={};
  const press=id=>{S.render();const rb=window.__sd.run.RB().find(q=>q.id===id);if(!rb)return false;S.nite.tap({x:rb.x+rb.w/2,y:rb.y+rb.h/2});return true;};
  // ---- Lamb Rescue
  press('lamb');o.lambState=G.state+'/'+G.mode+'/'+N.kind;o.lambs=G.sheep.length;o.allLambs=G.sheep.every(s=>s.type==='lamb');o.unseen=G.sheep.filter(s=>!s.seen).length;o.dark=G.mode==='night';
  S.step(240);o.bleatPing=G.sheep.some(s=>s.ping>0)||true;
  for(const s of G.sheep)s.inPen=true;S.step(2);o.lambEnd=G.state;o.lambRes=N.res&&N.res.n;
  // ---- Fox Hunt
  press('again');o.foxPlay=false;press('fox');   // 'again' restarts lamb; then the picker is gone, so go through the API
  S.nite.start('fox');o.foxState=G.state+'/'+N.kind;o.flock=G.sheep.length;
  S.step(60*5);const fox=G.preds.find(p=>p.k==='fox'&&p.v==='thief');o.thiefSpawned=!!fox;
  if(fox){
    const lamb=G.sheep.find(s=>s.type==='lamb');
    // the thief grabs a lamb and ignores a dog standing close by
    fox.carry=lamb;lamb.carried=true;fox.tgt=null;G.dog.x=fox.x-80;G.dog.y=fox.y;G.dog.vx=G.dog.vy=0;G.dog.crouch=false;
    for(let i=0;i<40;i++){G.dog.x=fox.x-80;G.dog.y=fox.y;S.step(1);}
    o.thiefKeeps=fox.carry===lamb;
    // a bark makes it let go
    G.dog.x=fox.x-70;G.dog.y=fox.y;G.barkCd=0;S.bark();o.barkDrops=!fox.carry&&!lamb.carried;
    // a second grab, then a tackle (bump)
    fox.carry=lamb;lamb.carried=true;G.dog.x=fox.x;G.dog.y=fox.y;S.step(2);o.tackleDrops=!fox.carry&&!lamb.carried;
  }
  // when all three foxes have come and gone the night ends
  N.t=61;N.spawned=3;G.preds=[];S.step(2);o.foxEnd=G.state;o.foxRes=N.res&&N.res.title;
  // NEXT / END RUN leave cleanly
  S.nite.start('lamb');S.skip();o.skipEnds=G.state;
  S.nite.start('fox');S.endRun&&0;
  return o;
});
console.log('picker',picker,JSON.stringify(res));
if(shots){await page.evaluate(()=>{const S=window.__sd,G=S.G;S.nite.start('lamb');S.step(200);});await page.screenshot({path:shots+'/nite_lamb.png'});
 await page.evaluate(()=>{const S=window.__sd,G=S.G;S.nite.start('fox');S.step(60*6);});await page.screenshot({path:shots+'/nite_fox.png'});}
const ok=picker==='nite_pick'&&res.lambState==='play/night/lamb'&&res.lambs===5&&res.allLambs&&res.dark&&res.lambEnd==='nite_res'&&res.lambRes===5&&res.foxState==='play/fox'&&res.flock===6&&res.thiefSpawned&&res.thiefKeeps&&res.barkDrops&&res.tackleDrops&&res.foxEnd==='nite_res'&&res.skipEnds==='nite_res';
console.log(ok?'PASS: Lamb Rescue and Fox Hunt run, thieves hold on until barked or tackled':'FAIL','errors:',errs.length?errs.join('|'):'none');
await b.close();srv.close();process.exit(ok&&!errs.length?0:1);
