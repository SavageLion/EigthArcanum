// END RUN (testing) leaves the run, keeps the bones and returns to map select; FULL is on the home screen:  node tests/sheepdog-endrun.mjs [--shots dir]
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
if(shots){await page.evaluate(()=>window.__sd.render());await page.screenshot({path:shots+'/home.png'});}
await page.mouse.click(W-50+20,6+14);await page.waitForTimeout(150);                 // FULL on the home screen
const stillHome=await page.evaluate(()=>window.__sd.G.state);
await page.evaluate(()=>{window.__sd.startMap(0);window.__sd.step(20);});
const b0=await page.evaluate(()=>window.__sd.save.bones||0);
await page.mouse.click(W-80+36,78+14);await page.waitForTimeout(150);                  // END RUN
const after=await page.evaluate(()=>({state:window.__sd.G.state,bones:window.__sd.save.bones||0}));
console.log('home after FULL tap:',stillHome,' after END RUN:',JSON.stringify(after),' bones before',b0);
const ok=stillHome==='ready'&&after.state==='ready'&&after.bones>b0;
console.log(ok?'PASS: END RUN returns to map select with bones; FULL button is on the home screen':'FAIL','errors:',errs.length?errs.join('|'):'none');
await b.close();srv.close();process.exit(ok&&!errs.length?0:1);
