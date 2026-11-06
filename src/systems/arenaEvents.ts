// @ts-nocheck
import { W, reduced } from '../core/dom';
import { G, S } from '../core/state';
import { px } from '../render/sprites';
import { burst, hurt } from './sim';
import { inPillar } from './openArena';
import { groundY } from './sideView';
import { $, TAU, clamp, rnd } from '../core/util';
import { sfx, tone } from '../core/audio';

/* Things that happen during a fight to break up the dodging: pickups that tempt you out of safety, and phase events when the
   boss drops below two thirds and one third of its health (hot floor in the side view, fire pools in the open arena). */
const say=(t,col)=>{ const e=$('call'); e.textContent=t; e.style.color=col; e.hidden=false; G.callT=1.4; };
export function eventsStart(){ G.pickups=[]; G.pickT=rnd(5,9); G.phase=0; G.hot=null; }
export function eventsEnd(){ G.pickups=[]; G.hot=null; }
function spot(){
  for(let n=0;n<30;n++){
    let x,y;
    if(S.side&&G.plats){ const q=G.plats[1+Math.floor(Math.random()*(G.plats.length-1))]||G.plats[0]; x=q.x+rnd(-q.w/2+14,q.w/2-14); y=q.y-26; }
    else { x=rnd(40,W-40); y=rnd(G.H*.45,G.H-120); }
    if(G.pillars.length&&inPillar(x,y,14))continue;
    if(Math.hypot(x-G.P.x,y-G.P.y)<80)continue;
    return {x,y};
  }
  return null;
}
export function eventsStep(dt){
  if(!G.pickups||S.fo||S.orbit||S.mode!=='fight')return;
  // pickups
  G.pickT-=dt;
  if(G.pickT<=0){ G.pickT=rnd(9,14); const p=spot(); if(p&&G.pickups.length<2){ const heart=G.P.hp<G.P.max&&Math.random()<.3; G.pickups.push({...p,kind:heart?'heart':'mana',t:10,age:0}); } }
  for(const k of G.pickups){ k.t-=dt; k.age+=dt; if(Math.hypot(G.P.x-k.x,G.P.y-k.y)<26){ k.t=0; burst(k.x,k.y,k.kind==='heart'?'#ff7a8a':'#7fc4ff',14); sfx.pickup?.(); tone(k.kind==='heart'?880:740,.12,'triangle',.05);
      if(k.kind==='heart'){ G.P.hp=Math.min(G.P.max,G.P.hp+1); say('+1 heart','#ff9aa8'); } else { G.P.mana=Math.min(G.P.manaMax,G.P.mana+(G.P.spells.length?40:0)); G.P.cd=0; G.P.surge=4; say('Surge! Faster bolts','#9ad0ff'); } } }
  G.pickups=G.pickups.filter(k=>k.t>0);
  if(G.P.surge>0)G.P.surge-=dt;
  if(G.callT>0){ G.callT-=dt; if(G.callT<=0&&!G.oa?.call)$('call').hidden=true; }
  // phase events
  const f=G.B.hp/G.B.max, want=f<.34?2:f<.67?1:0;
  if(want>G.phase&&(S.side||S.open)){ G.phase=want; phaseEvent(); } else if(want>G.phase)G.phase=want;
  if(G.hot){ G.hot.t+=dt; if(G.hot.t>G.hot.warn+G.hot.on)G.hot=null; else if(G.hot.t>G.hot.warn&&G.P.y+20>=groundY()-1){ hurt(); } }
}
function phaseEvent(){
  S.shake=reduced?0:6; sfx.rage?.();
  if(S.side){ G.hot={t:0,warn:1.1,on:2.3}; say('The floor ignites!','#ffb070'); }
  else if(S.open&&G.oa){ say('Fire pools!','#ffb070'); for(let i=0;i<7;i++){ const p=spot(); if(p)G.oa.patches.push({x:p.x,y:p.y,kind:'fire',t:7}); } }
}
export function pickupDraw(c){
  if(!G.pickups)return;
  for(const k of G.pickups){ if(k.t<2&&Math.floor(S.t*10)%2)continue; const x=px(k.x), y=px(k.y+Math.sin(k.age*4)*3), col=k.kind==='heart'?'#ff7a8a':'#7fc4ff';
    c.globalAlpha=.25+.08*Math.sin(S.t*8); c.fillStyle=col; c.beginPath(); c.arc(x,y,6,0,TAU); c.fill(); c.globalAlpha=1;
    c.fillStyle='#0b0814'; c.fillRect(x-3,y-3,6,6); c.fillStyle=col; if(k.kind==='heart'){ c.fillRect(x-3,y-2,2,2); c.fillRect(x+1,y-2,2,2); c.fillRect(x-2,y-1,4,3); c.fillRect(x-1,y+2,2,1); } else { c.fillRect(x-2,y-2,4,4); c.fillStyle='#ffffff'; c.fillRect(x-1,y-1,1,1); } }
  if(G.hot){ const gy=px(groundY()), w=G.hot.t<G.hot.warn; if(!w||Math.floor(S.t*12)%2){ c.globalAlpha=w?.35:.8; c.fillStyle=w?'#ff7a6e':(Math.floor(S.t*14)%2?'#f2a03d':'#e8592c'); c.fillRect(0,gy-(w?0:3),px(W),w?3:5); c.globalAlpha=1; } }
}
