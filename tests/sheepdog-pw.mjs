// PEN WATCH: the night as a strategy puzzle, turn-based and live-with-pause prototypes:  node tests/sheepdog-pw.mjs [--shots dir]
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
await page.mouse.click(W-190-14+95,426+15);await page.waitForTimeout(120);
const turnBtn=await page.evaluate(()=>({state:window.__sd.G.state,mode:window.__sd.pw.PW.mode}));
await page.evaluate(()=>{window.__sd.G.state='ready';});
await page.mouse.click(W-190-14+95,390+15);await page.waitForTimeout(120);
const liveBtn=await page.evaluate(()=>({state:window.__sd.G.state,mode:window.__sd.pw.PW.mode}));
const res=await page.evaluate(()=>{
  const S=window.__sd,P=S.pw,PW=P.PW,o={};
  const layout=(defended)=>{
    const A=(t,c,r)=>P.place('animal',t,c,r),D=(k,c,r)=>P.place('def',k,c,r);
    A('lamb',7,5);A('lamb',8,5);A('cow',7,4);A('goose',7,6);A('pig',5,5);A('ram',5,4);A('goat',6,3);A('normal',8,6);A('normal',8,4);A('normal',9,5);
    if(defended){D('torch',2,3);D('torch',12,7);D('bell',3,5);D('snare',3,2);D('snare',7,1);D('guard',3,6);D('thorn',4,4);D('thorn',4,6);D('thorn',7,2);D('reinf',7,8);D('reinf',4,3);D('reinf',4,7);}
  };
  const play=(defended,smart)=>{
    P.start('turn');layout(defended);P.begin();let g=0;
    while(PW.phase==='play'&&g++<60){
      if(smart){
        for(const d of PW.defs.filter(d=>(d.k==='torch'||d.k==='bell')&&!d.cd)){const near=PW.enemies.filter(e=>!e.dead&&Math.abs(e.c-d.c)+Math.abs(e.r-d.r)<=3);if(near.length&&PW.ap>0)P.fire(d);}
        const weak=Object.keys(PW.fence).map(k=>{const [c,r]=k.split(',').map(Number);return{c,r,f:PW.fence[k]};}).filter(q=>q.f.hp>0&&q.f.hp<q.f.max).sort((a,b)=>a.f.hp-b.f.hp)[0];
        if(weak&&PW.ap>0)P.repair(weak.c,weak.r);
      }
      P.end();
    }
    return PW.res?PW.res.left:-1;
  };
  // ---- the rules
  P.start('turn');
  o.badSpots=[P.place('animal','normal',2,2),P.place('animal','normal',4,3),P.place('def','torch',6,5),P.place('def','thorn',7,5)].some(Boolean)===false;   // outside the pen / on the fence / inside the pen / not a fence cell
  o.placed=[P.place('animal','cow',7,5),P.place('def','torch',2,3),P.place('def','thorn',4,4)].every(Boolean);
  o.noDouble=P.place('animal','lamb',7,5)===false;
  // ---- waves, ability cooldowns and timing
  P.start('turn');
  P.place('animal','lamb',7,5);P.place('def','torch',3,5);P.place('def','bell',3,4);P.place('def','snare',2,5);P.begin();
  P.end();                                                       // turn 1: a fox appears
  const fox=PW.enemies.find(e=>e.k==='fox');o.foxAppears=!!fox;
  fox.c=3;fox.r=5;                                              // right next to the torch
  o.torchFires=P.fire(PW.defs.find(d=>d.k==='torch'))&&fox.scared>0;
  o.cooldown=P.fire(PW.defs.find(d=>d.k==='torch'))===false;
  PW.ap=2;const bellOk=P.fire(PW.defs.find(d=>d.k==='bell'));o.bellStuns=bellOk&&fox.stun>0;
  PW.ap=1;PW.fence['4,5'].hp=1;o.repairWorks=P.repair(4,5)&&PW.fence['4,5'].hp===3;
  P.end();o.apResets=PW.ap===2;
  P.start('turn');P.place('animal','lamb',7,5);P.place('def','snare',2,5);P.begin();P.end();const f1=PW.enemies[0];f1.c=2;f1.r=5;f1.tgt={c:4,r:5};P.end();
  // ---- balance sanity: with defenses and good timing you lose fewer animals than with none
  const avg=(n,d,sm)=>{let t=0;for(let i=0;i<n;i++)t+=play(d,sm);return t/n;};
  o.none=avg(6,false,false);o.defended=avg(6,true,true);
  return o;
});
// the live prototype: turns tick by themselves, pausing stops them, actions refill with time
const live=await page.evaluate(()=>{
  const S=window.__sd,P=S.pw,PW=P.PW,o={};P.start('live');
  P.place('animal','lamb',7,5);P.place('animal','cow',7,4);P.place('def','torch',3,5);P.begin();
  o.startsUnpaused=PW.paused===false;S.step(60*6);o.turns=PW.turn;
  PW.paused=true;const t0=PW.turn;S.step(60*4);o.pausedHolds=PW.turn===t0;
  PW.paused=false;PW.ap=0;S.step(60*6);o.apRegen=PW.ap>=2;
  return o;
});
console.log('buttons',JSON.stringify(turnBtn),JSON.stringify(liveBtn));console.log(JSON.stringify(res),JSON.stringify(live));
if(shots){await page.evaluate(()=>{const S=window.__sd,P=S.pw,PW=P.PW;P.start('turn');const A=(t,c,r)=>P.place('animal',t,c,r),D=(k,c,r)=>P.place('def',k,c,r);A('lamb',7,5);A('lamb',8,5);A('cow',7,4);A('goose',7,6);A('pig',5,5);A('ram',5,4);A('goat',6,3);A('normal',8,6);D('torch',2,3);D('bell',3,5);D('snare',3,2);D('guard',3,6);D('thorn',4,4);D('reinf',4,7);S.render();});await page.screenshot({path:shots+'/pw_place.png'});
 await page.evaluate(()=>{const S=window.__sd,P=S.pw;P.begin();P.end();P.end();P.end();P.end();S.render();});await page.screenshot({path:shots+'/pw_play.png'});}
const ok=turnBtn.state==='pw'&&turnBtn.mode==='turn'&&liveBtn.state==='pw'&&liveBtn.mode==='live'&&res.badSpots&&res.placed&&res.noDouble&&res.foxAppears&&res.torchFires&&res.cooldown&&res.bellStuns&&res.repairWorks&&res.apResets&&res.defended>res.none&&live.startsUnpaused&&live.turns>=3&&live.pausedHolds&&live.apRegen;
console.log(ok?'PASS: Pen Watch plays in both modes; defenses and timing beat no defenses':'FAIL','errors:',errs.length?errs.join('|'):'none');
await b.close();srv.close();process.exit(ok&&!errs.length?0:1);
