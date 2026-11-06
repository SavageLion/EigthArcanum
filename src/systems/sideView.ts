// @ts-nocheck
import { W } from '../core/dom';
import { G, S } from '../core/state';
import { KEYS } from '../core/input';
import { px } from '../render/sprites';
import { arenaSeed } from '../render/arenaArt';
import { burst } from './sim';
import { $, clamp } from '../core/util';
import { tone } from '../core/audio';

/* Side-view fight ("The Fool"): the boss floats at the top and fires its usual patterns down the screen while you run and jump between
   one-way platforms. Bolts fly up on their own, so you line up under the boss. A double jump keeps it forgiving on a phone. */
const FEET=14, GRAV=1750, JUMP=700, RUN=235;
export const groundY=()=>G.H-82;
function makePlatforms(){
  const g=groundY(), seed=arenaSeed(), L=(seed>>>3)%4, p=[{x:W/2,y:g,w:W+60,ground:true}];
  const row=(n,xs,w=104)=>xs.forEach(x=>p.push({x,y:g-115*n,w}));
  if(L===0){ row(1,[95,305]); row(2,[200]); row(3,[90,310]); }              // pyramid
  else if(L===1){ row(1,[200]); row(2,[85,315]); row(3,[200]); }            // diamond
  else if(L===2){ row(1,[85,230]); row(2,[170,330]); row(3,[85,250],96); }  // staircase zig-zag
  else { row(1,[70,200,330],84); row(2,[135,265],92); row(3,[200],110); }   // wide base
  G.plats=p;
}
export function sideStart(){ makePlatforms(); G.P.x=W/2; G.P.y=groundY()-FEET; G.P.vy=0; G.P.jumps=0; G.P.drop=0; G.P.sdir='north'; G.stick=null; G.stickV={x:0,y:0}; G.sideJump=false; $('hint').textContent='Tap or swipe up to jump (twice in the air)'; $('hint').hidden=false; G.sd={hint:4}; }
export function sideEnd(){ G.plats=[]; G.sd=null; G.sideJump=false; }
export function sideMove(dt){
  const P=G.P, kx=(KEYS.right?1:0)-(KEYS.left?1:0); let vx=clamp(G.stickV.x+kx,-1,1); if(Math.abs(vx)<.18)vx=0;
  P.x=clamp(P.x+vx*RUN*dt,20,W-20); P.vx=vx*6; P.sdir=vx>0?'east':vx<0?'west':'north';
  if(G.sideJump){ G.sideJump=false; if(P.jumps<2){ P.vy=-JUMP; P.jumps++; P.drop=0; burst(P.x,P.y+FEET,'#e6dcef',P.jumps>1?10:5); tone(P.jumps>1?700:520,.07,'square',.03); } }
  if((KEYS.down||G.stickV.y>.75)&&P.drop<=0){ const feet=P.y+FEET, on=G.plats.find(q=>!q.ground&&Math.abs(q.y-feet)<2&&Math.abs(P.x-q.x)<q.w/2+4); if(on){ P.drop=.28; P.y+=3; } }
  if(P.drop>0)P.drop-=dt;
  const prev=P.y+FEET; P.vy=Math.min(P.vy+GRAV*dt,1100); P.y+=P.vy*dt; const feet=P.y+FEET;
  if(P.vy>=0) for(const q of G.plats){ if(q.ground||P.drop<=0){ if(Math.abs(P.x-q.x)<q.w/2+4&&prev<=q.y+1&&feet>=q.y){ P.y=q.y-FEET; P.vy=0; P.jumps=0; break; } } }
  if(P.y>groundY()-FEET){ P.y=groundY()-FEET; P.vy=0; P.jumps=0; }
  if(G.sd&&G.sd.hint>0){ G.sd.hint-=dt; if(G.sd.hint<=0)$('hint').hidden=true; }
}
export function sideDrawFloor(c){
  for(const q of G.plats){
    const x=px(q.x-q.w/2), y=px(q.y), w=px(q.w);
    if(q.ground){ c.fillStyle='#14101c'; c.fillRect(0,y,px(W),G.LH-y); c.fillStyle='#8a8498'; c.fillRect(0,y,px(W),2); c.fillStyle='#5c566c'; c.fillRect(0,y+2,px(W),2); for(let tx=0;tx<px(W);tx+=16){ c.fillStyle='#2a2336'; c.fillRect(tx,y+8,1,G.LH-y); } continue; }
    c.fillStyle='#0b0814'; c.fillRect(x-1,y-1,w+2,9); c.fillStyle='#3f3a4c'; c.fillRect(x,y+3,w,4); c.fillStyle='#8a8498'; c.fillRect(x,y,w,3); c.fillStyle='#b5afc2'; c.fillRect(x,y,w,1);
    c.fillStyle='#5c566c'; for(let tx=x+8;tx<x+w-4;tx+=12)c.fillRect(tx,y+3,1,4);
  }
}
