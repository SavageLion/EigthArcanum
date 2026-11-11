// Kennel: buy and use dogs, buy upgrades, stats apply in the game, bones are earned:  node tests/sheepdog-kennel.mjs [--shots dir]
import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const shots=process.argv.includes('--shots')?process.argv[process.argv.indexOf('--shots')+1]:'';
const root=path.resolve('prototypes/sheepdog');
const srv=http.createServer((q,s)=>{const f=path.join(root,q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]);try{s.setHeader('Content-Type',{'.html':'text/html','.png':'image/png'}[path.extname(f)]||'text/plain');s.end(fs.readFileSync(f));}catch(e){s.statusCode=404;s.end('');}}).listen(0);
await new Promise(r=>srv.on('listening',r));
const b=await chromium.launch({channel:'chrome'}),page=await b.newPage({viewport:{width:960,height:540}});const errs=[];
page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:'+srv.address().port+'/');await page.waitForTimeout(500);
const W=await page.evaluate(()=>window.__sd.W());
// open the kennel with a tap on the KENNEL button, then go back
await page.mouse.click(14+65,540-30-12+15);await page.waitForTimeout(100);
const inKennel=await page.evaluate(()=>window.__sd.G.state);
if(shots){await page.evaluate(()=>window.__sd.render());await page.screenshot({path:shots+'/kennel.png'});}
await page.mouse.click(14+(W-960)/2+45,12+16);await page.waitForTimeout(100);
const back=await page.evaluate(()=>window.__sd.G.state);
const res=await page.evaluate(()=>{
  const S=window.__sd,G=S.G,o={};
  S.save.bones=500;
  S.startMap(0);const base=S.stats();
  o.boughtKelpie=S.buyDog('kelpie');o.bones1=S.save.bones;o.usingKelpie=S.save.dog==='kelpie';
  const kel=S.stats();o.kelpieFaster=kel.speed>base.speed*1.15&&kel.bark<base.bark;
  S.buyDog('oes');const oes=S.stats();o.oesBigBark=oes.bark>base.bark*1.3;
  S.setDog('husky');o.huskyLocked=S.save.dog!=='husky';
  S.buyDog('husky');o.huskyLight=S.stats().light>base.light*1.25;
  o.poorCannotBuy=(()=>{S.save.bones=10;return S.buyDog('pyr')===false;})();
  S.save.bones=500;o.upFlock=S.buyUp('flock');S.setDog('collie');S.startMap(0);o.flock=G.herd.length;   // 8 + 1
  // a run that is lost pays bones
  const b0=S.save.bones;G.sheep.length=0;G.herd=[];G.state='play';G.mode='night';S.step(2);o.lostPays=S.save.bones>b0&&G.lastBones>0;
  return o;
});
console.log('tap kennel ->',inKennel,' back ->',back,JSON.stringify(res));
const ok=inKennel==='kennel'&&back==='ready'&&res.boughtKelpie&&res.bones1<500&&res.usingKelpie&&res.kelpieFaster&&res.oesBigBark&&res.huskyLight&&res.poorCannotBuy&&res.upFlock&&res.flock===9&&res.lostPays;
console.log(ok?'PASS: kennel dogs, upgrades and bones work':'FAIL','errors:',errs.length?errs.join('|'):'none');
await b.close();srv.close();process.exit(ok&&!errs.length?0:1);
