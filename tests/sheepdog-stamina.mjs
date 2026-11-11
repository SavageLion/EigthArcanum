// Stamina: running costs a little, SPRINT costs a lot (and is faster), crouching recovers, stamina perks work:  node tests/sheepdog-stamina.mjs
import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const root=path.resolve('prototypes/sheepdog');
const srv=http.createServer((q,s)=>{const f=path.join(root,q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]);try{s.setHeader('Content-Type',{'.html':'text/html','.js':'text/javascript','.png':'image/png'}[path.extname(f)]||'text/plain');s.end(fs.readFileSync(f));}catch(e){s.statusCode=404;s.end('');}}).listen(0);
await new Promise(r=>srv.on('listening',r));
const b=await chromium.launch({channel:'chrome'}),page=await b.newPage({viewport:{width:960,height:540}});const errs=[];
page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:'+srv.address().port+'/');await page.waitForTimeout(500);
const st=n=>page.evaluate(n=>{const S=window.__sd;S.step(n);const q=S.stam();return{stam:q.stam,max:q.max,winded:q.winded,vx:S.G.dog.vx,x:S.G.dog.x};},n);
await page.evaluate(()=>{const S=window.__sd;S.startMap(0);S.G.actT=1e9;S.G.preds=[];S.G.events=[];S.G.dog.x=120;S.G.dog.y=270;});
const a0=await st(1);
await page.keyboard.down('ArrowRight');
const a1=await st(60);                                   // 1 s of normal running
const run=a0.stam-a1.stam;
await page.keyboard.down('Shift');
const a2=await st(60);                                   // 1 s of sprinting
const sprintCost=a1.stam-a2.stam;
const sprintSpeed=Math.abs(a2.vx),runSpeed=Math.abs(a1.vx);
const a3=await st(300);                                  // keep sprinting until winded
await page.keyboard.up('Shift');await page.keyboard.up('ArrowRight');
await page.evaluate(()=>{window.__sd.G.dog.x=120;});
await page.keyboard.down('c');await page.keyboard.down('ArrowRight');   // crouch-walk
const b1=await st(120);
await page.keyboard.up('ArrowRight');await page.keyboard.up('c');
const perk=await page.evaluate(()=>{const S=window.__sd;S.G.perks.lungs=2;S.startDay();return S.stam();});
console.log(JSON.stringify({run:+run.toFixed(1),sprintCost:+sprintCost.toFixed(1),runSpeed:Math.round(runSpeed),sprintSpeed:Math.round(sprintSpeed),winded:a3.winded,after:Math.round(a3.stam),crouch:Math.round(b1.stam),perkMax:perk.max}));
const ok=run>2&&run<12&&sprintCost>run*2.5&&sprintSpeed>runSpeed*1.3&&a3.winded&&b1.stam>a3.stam+15&&perk.max===150;
console.log(ok?'PASS: stamina - run costs a bit, sprint costs a lot and is faster, crouching recovers, perks scale it':'FAIL','errors:',errs.length?errs.join('|'):'none');
await b.close();srv.close();process.exit(ok&&!errs.length?0:1);
