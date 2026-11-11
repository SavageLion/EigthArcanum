// Mixed herds (goose duck pig cow ...), enemy variants (coyote badger) and all five data-driven maps:  node tests/sheepdog-mixed.mjs [--shots dir]
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
  const S=window.__sd,G=S.G,o={maps:[]};
  S.save.unlockAll=true;
  for(let i=0;i<S.maps.length;i++){
    S.startMap(i);G.actT=1e9;G.day=Math.min(5,G.map.days);
    G.herd=Array.from({length:30},()=>({type:S.poolPick(G.day)}));S.startDay();
    const types=new Set(G.sheep.map(s=>s.type));
    const kinds=new Set(G.events.map(e=>e.k));
    let g=0;while(g++<60*40)S.step(1);                        // 40 seconds with enemies about, nothing may throw
    o.maps.push({id:G.map.id,world:S.world().map(Math.round).join('x'),types:[...types].join(','),enemies:[...kinds].join(','),ok:types.size>=3&&G.events.length>=0});
  }
  // each new animal does its own thing
  S.startMap(3);G.actT=1e9;G.day=3;G.events=[];
  const mk=(type,x,y)=>{const T=S.TYPES[type];return{x,y,vx:0,vy:0,type,T,hp:T.hp,panic:0,inPen:false,wa:0,graze:1,face:1,hop:0,flash:0,carried:false,bumpT:0,seen:true,hidden:false,act:null,ping:0};};
  G.sheep=[];G.preds=[];G.dog.x=100;G.dog.y=100;G.dog.vx=G.dog.vy=0;
  G.zones=[{k:'water',x:700,y:300,w:60,h:120},{k:'mud',x:300,y:600,w:100,h:80}];
  const duck=mk('duck',520,360),pig=mk('pig',300,480);G.sheep.push(duck,pig);
  const dd0=Math.hypot(duck.x-730,duck.y-360),pd0=Math.hypot(pig.x-350,pig.y-640);
  for(let i=0;i<60*6;i++){G.dog.x=100;G.dog.y=100;S.step(1);}
  o.duckSeeksWater=Math.hypot(duck.x-730,duck.y-360)<dd0-40;o.pigSeeksMud=Math.hypot(pig.x-350,pig.y-640)<pd0-30;
  // a goose is scattered further by a bark than a pig
  G.sheep=[];const goose=mk('goose',400,400),pig2=mk('pig',400,430);G.sheep.push(goose,pig2);G.dog.x=400;G.dog.y=330;G.dog.vx=G.dog.vy=0;G.barkCd=0;S.bark();
  o.gooseScatters=Math.hypot(goose.vx,goose.vy)>Math.hypot(pig2.vx,pig2.vy)*2;
  // enemy variants exist and act
  G.preds=[];G.sheep=[mk('normal',600,400),mk('normal',900,700)];G.dog.x=100;G.dog.y=100;
  S.spawnFox('coyote');S.spawnBadger();S.step(30);
  o.coyote=G.preds.some(p=>p.k==='fox'&&p.v==='coyote');o.badger=G.preds.some(p=>p.k==='bear'&&p.v==='badger');
  return o;
});
console.log(JSON.stringify(res));
const ok=res.maps.length===5&&res.maps.every(m=>m.ok)&&res.duckSeeksWater&&res.pigSeeksMud&&res.gooseScatters&&res.coyote&&res.badger;
console.log(ok?'PASS: mixed herds, new animals, enemy variants and 5 maps work':'FAIL','errors:',errs.length?errs.join('|'):'none');
if(shots){await page.evaluate(()=>{const S=window.__sd,G=S.G;S.startMap(3);G.day=4;G.herd=Array.from({length:14},()=>({type:S.poolPick(4)}));S.startDay();for(const s of G.sheep){s.hidden=false;s.seen=true;s.x=G.dog.x+60+Math.random()*180;s.y=G.dog.y-90+Math.random()*180;}S.step(5);});await page.screenshot({path:shots+'/mixed.png'});}
await b.close();srv.close();process.exit(ok&&!errs.length?0:1);
