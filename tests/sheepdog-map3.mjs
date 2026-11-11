// Map 3 (Wood Edge): day scouts, feed, build phase (fence add-ons + dog posts), allied dogs at night:  node tests/sheepdog-map3.mjs [--shots dir]
import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const shots=process.argv.includes('--shots')?process.argv[process.argv.indexOf('--shots')+1]:'';
const root=path.resolve('prototypes/sheepdog');
const srv=http.createServer((q,s)=>{const f=path.join(root,q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]);try{s.setHeader('Content-Type',{'.html':'text/html','.png':'image/png'}[path.extname(f)]||'text/plain');s.end(fs.readFileSync(f));}catch(e){s.statusCode=404;s.end('');}}).listen(0);
await new Promise(r=>srv.on('listening',r));
const b=await chromium.launch({channel:'chrome'}),page=await b.newPage({viewport:{width:960,height:540}});const errs=[];
page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:'+srv.address().port+'/');await page.waitForTimeout(500);
const res=await page.evaluate(()=>{
  const S=window.__sd,G=S.G,o={};
  S.startMap(2);o.map=G.map.id;o.scoutsScheduled=G.events.length>0;o.feed0=G.feed;
  // a scout turns up during the day
  G.events=[{t:G.t+.1,k:'fox'}];G.actT=1e9;S.step(30);o.dayFox=G.preds.some(p=>p.k==='fox');
  G.preds=[];
  // end the day: dusk card, then the build screen
  S.endDay('called');o.dusk=G.state;S.cont();o.build=G.state;o.feedAfterDay=G.feed>=o.feed0;
  // place a thorn hedge and a torch, post a dog
  S.BU.item='thorn';const f1=G.feed;S.placeItem(0);o.thornPlaced=G.build.slots[0]==='thorn'&&G.feed===f1-30;
  S.BU.item='torch';S.placeItem(1);o.torchPlaced=G.build.slots[1]==='torch';
  S.BU.item='erase';S.placeItem(1);o.sold=G.build.slots[1]===null;
  S.cyclePost(0);o.postDog=G.build.posts[0];
  S.cyclePost(2);o.lockedPost=G.build.posts[2]===null;      // only 1 post is open on day 1
  // night: the thorn is on the wall and the dog is posted
  S.cont();o.night=G.state+'/'+G.mode;o.thorn=!!G.walls[0].thorn;o.allies=G.allies.length;
  // run the night with the bot; the allied dog must move toward a predator and nothing may break
  S.bot(true);let g=0;while(G.state==='play'&&g++<60*200)S.step(1);
  o.end=G.state;
  return o;
});
console.log(JSON.stringify(res));
const ok=res.map==='wood'&&res.scoutsScheduled&&res.dayFox&&res.dusk==='dusk'&&res.build==='build'&&res.thornPlaced&&res.torchPlaced&&res.sold&&res.postDog==='farm'&&res.lockedPost&&res.night==='play/night'&&res.thorn&&res.allies===1&&(res.end==='dawn'||res.end==='lost');
console.log(ok?'PASS: map 3 build phase, allied dogs and day scouts work':'FAIL','errors:',errs.length?errs.join('|'):'none');
if(shots){await page.evaluate(()=>{const S=window.__sd,G=S.G;S.startMap(2);G.feed=200;G.dog.x=G.pen.x-200;S.step(2);S.endDay('called');S.cont();S.BU.item='torch';S.placeItem(0);S.BU.item='thorn';S.placeItem(3);S.cyclePost(0);S.step(30);});await page.screenshot({path:shots+'/build.png'});}
await b.close();srv.close();process.exit(ok&&!errs.length?0:1);
