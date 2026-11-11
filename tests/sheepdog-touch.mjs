// Emulates a phone (multi-touch) on the Sheepdog prototype:  node tests/sheepdog-touch.mjs [--shots dir]
import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const shots=process.argv.includes('--shots')?process.argv[process.argv.indexOf('--shots')+1]:'';
const root=path.resolve('prototypes/sheepdog');
const srv=http.createServer((q,s)=>{s.setHeader('Content-Type','text/html');s.end(fs.readFileSync(path.join(root,'index.html')));}).listen(0);
await new Promise(r=>srv.on('listening',r));
const b=await chromium.launch({channel:'chrome'});
const ctx=await b.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:2});const page=await ctx.newPage();
const cdp=await ctx.newCDPSession(page);const errs=[];page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:'+srv.address().port+'/');await page.waitForTimeout(400);
const T=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts});
const S=()=>page.evaluate(()=>{const G=window.__sd.G;return {state:G.state,dog:[Math.round(G.dog&&G.dog.x),Math.round(G.dog&&G.dog.y)],crouch:G.dog&&G.dog.crouch,walk:G.dog&&G.dog.walk,cd:+G.barkCd.toFixed(2)};});
// logical canvas is 960x540 scaled to 844x390 (letterboxed): helper to place touches by world coords
const WW=await page.evaluate(()=>window.__sd.W()),sc=Math.min(844/WW,390/540),ox=(844-WW*sc)/2,oy=(390-540*sc)/2,P=(x,y,id=0)=>({x:ox+x*sc,y:oy+y*sc,id});
await T('touchStart',[P(WW/2-300,280)]);await T('touchEnd',[]);await page.waitForTimeout(200);console.log('after start tap',JSON.stringify(await S()));
const s0=await S();
// full push to the right with the left thumb (stick origin at (200,420) in world px, drag 80px right)
await T('touchStart',[P(200,420,1)]);await page.waitForTimeout(60);await T('touchMove',[P(280,420,1)]);await page.waitForTimeout(900);
const run=await S();console.log('full push right',JSON.stringify(run));
// light push: only 25px
await T('touchMove',[P(225,420,1)]);await page.waitForTimeout(500);const walk=await S();console.log('light push',JSON.stringify(walk));
// right thumb taps BARK while the left thumb is still down
await T('touchMove',[P(280,420,1),P(WW-96,444,2)]);
await T('touchStart',[P(280,420,1),P(WW-96,444,2)]);await page.waitForTimeout(80);
const bark=await S();console.log('bark with 2nd finger',JSON.stringify(bark));
if(shots)await page.screenshot({path:shots+'/sd_touch.png'});
await T('touchEnd',[]);await page.waitForTimeout(200);console.log('released',JSON.stringify(await S()));
console.log('moved right:',run.dog[0]>s0.dog[0]+40,' light push crouches:',walk.walk===true,' bark fired:',bark.cd>1,' errors:',errs.length?errs.join('|'):'none');
await b.close();srv.close();
