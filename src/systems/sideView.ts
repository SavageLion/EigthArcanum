// @ts-nocheck
import { W } from '../core/dom';
import { G, S } from '../core/state';
import { KEYS } from '../core/input';
import { LW, SPRITE_OVERRIDES, px } from '../render/sprites';
import { arenaSeed } from '../render/arenaArt';
import { burst, hurt } from './sim';
import { $, TAU, clamp } from '../core/util';
import { tone } from '../core/audio';

/* Side-view fight ("The Fool"): the boss floats at the top and fires its usual patterns down the screen while you run and jump between
   one-way platforms. Bolts fly up on their own, so you line up under the boss. A double jump keeps it forgiving on a phone. */
const FEET=20, GRAV=1750, JUMP=700, RUN=235;
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
export function sideStart(){ makePlatforms(); G.P.x=W/2; G.P.y=groundY()-FEET; G.P.vy=0; G.P.jumps=0; G.P.drop=0; G.P.sdir='north'; G.stick=null; G.stickV={x:0,y:0}; G.sideJump=false; $('hint').textContent='Run and jump. You fire at the boss on your own.'; $('hint').hidden=false; G.sd={hint:4}; }
export function sideEnd(){ G.plats=[]; G.sd=null; G.sideJump=false; }
export function sideMove(dt){
  const P=G.P, kx=(KEYS.right?1:0)-(KEYS.left?1:0); let vx=clamp(G.stickV.x+kx,-1,1); if(Math.abs(vx)<.18)vx=0;
  P.x=clamp(P.x+vx*RUN*dt,20,W-20); P.vx=vx*6; P.sdir=G.B&&G.B.x<P.x?'west':'east';   // always face the boss, like a run-and-gun
  if(G.sideJump){ G.sideJump=false; if(P.jumps<2){ P.vy=-JUMP; P.jumps++; P.drop=0; burst(P.x,P.y+FEET,'#e6dcef',P.jumps>1?10:5); tone(P.jumps>1?700:520,.07,'square',.03); } }
  if((KEYS.down||G.stickV.y>.75)&&P.drop<=0){ const feet=P.y+FEET, on=G.plats.find(q=>!q.ground&&Math.abs(q.y-feet)<2&&Math.abs(P.x-q.x)<q.w/2+4); if(on){ P.drop=.28; P.y+=3; } }
  if(P.drop>0)P.drop-=dt;
  const prev=P.y+FEET; P.vy=Math.min(P.vy+GRAV*dt,1100); P.y+=P.vy*dt; const feet=P.y+FEET;
  if(P.vy>=0) for(const q of G.plats){ if(q.ground||P.drop<=0){ if(Math.abs(P.x-q.x)<q.w/2+4&&prev<=q.y+1&&feet>=q.y){ P.y=q.y-FEET; P.vy=0; P.jumps=0; break; } } }
  if(P.y>groundY()-FEET){ P.y=groundY()-FEET; P.vy=0; P.jumps=0; }
  P.air=P.vy<0||!G.plats.some(q=>Math.abs(q.y-(P.y+FEET))<1.5&&Math.abs(P.x-q.x)<q.w/2+4);
  if(G.B&&S.mode==='fight'&&Math.hypot(P.x-G.B.x,P.y-G.B.y)<G.B.rad*.8)hurt();
  if(G.sd&&G.sd.hint>0){ G.sd.hint-=dt; if(G.sd.hint<=0)$('hint').hidden=true; }
}
const tileAt=(T,tx,ty)=>T[((tx*7+ty*13)>>4)%5===0?(tx>>4)%16:[0,1,8,10,13][((tx>>4)+(ty>>4))%5]];
/** a side-on boss room: a dark brick back wall tinted with the boss's colour, torches, a stone floor and slab platforms */
export function sideDrawFloor(c){
  const T=SPRITE_OVERRIDES.arena.tiles, gy=px(groundY()), col=G.B?G.B.color:'#8a8498';
  if(T.length>15){ c.save(); c.beginPath(); c.rect(0,0,LW,G.LH); c.clip(); for(let ty=0;ty<G.LH;ty+=16)for(let tx=0;tx<LW;tx+=16){ c.globalAlpha=.5; c.drawImage(tileAt(T,tx,ty),tx,ty,16,16); } c.restore(); }
  c.globalAlpha=.66; c.fillStyle='#0d0716'; c.fillRect(0,0,LW,G.LH); c.globalAlpha=.16; c.fillStyle=col; c.fillRect(0,0,LW,G.LH); c.globalAlpha=1;
  // arched windows onto the sky, and torches between them
  for(const wx of [28,80,132]){ c.fillStyle='#0b0814'; c.fillRect(wx-8,40,16,46); c.beginPath(); c.arc(wx,40,8,Math.PI,0); c.fill(); c.globalAlpha=.55; c.fillStyle=col; c.fillRect(wx-6,44,12,40); c.beginPath(); c.arc(wx,44,6,Math.PI,0); c.fill(); c.globalAlpha=1; c.fillStyle='#b5afc2'; c.fillRect(wx-9,86,18,2); }
  for(const tx of [54,106]){ const ty=62; c.fillStyle='#3f3a4c'; c.fillRect(tx-1,ty,2,7); const fl=Math.floor(S.t*8+tx)%2; c.fillStyle=fl?'#f2a03d':'#ffcf6e'; c.fillRect(tx-1,ty-4,2,4); c.fillRect(tx,ty-6-fl,1,2); for(const [gr,ga] of [[13,.05],[8,.07],[4,.09]]){ c.globalAlpha=ga+.02*Math.sin(S.t*9+tx); c.fillStyle='#ff9a3c'; c.beginPath(); c.arc(tx,ty-3,gr,0,TAU); c.fill(); } c.globalAlpha=1; }
  for(const q of G.plats){
    const x=px(q.x-q.w/2), y=px(q.y), w=px(q.w);
    if(q.ground){ c.fillStyle='#120b19'; c.fillRect(0,y,LW,G.LH-y); if(T.length>15){ c.save(); c.beginPath(); c.rect(0,y,LW,G.LH-y); c.clip(); for(let tx=0;tx<LW;tx+=16){ c.globalAlpha=.85; c.drawImage(tileAt(T,tx,y),tx,y+1,16,16); } c.restore(); } c.globalAlpha=1; c.fillStyle='#b5afc2'; c.fillRect(0,y,LW,1); c.fillStyle='#5c566c'; c.fillRect(0,y+1,LW,1); continue; }
    c.fillStyle='#0b0814'; c.fillRect(x-1,y-1,w+2,8);
    if(T.length>15){ c.save(); c.beginPath(); c.rect(x,y,w,6); c.clip(); for(let tx=x-(x%16);tx<x+w;tx+=16){ c.globalAlpha=.95; c.drawImage(tileAt(T,tx,y),tx,y-4,16,16); } c.restore(); }
    c.globalAlpha=1; c.fillStyle='#b5afc2'; c.fillRect(x,y,w,1); c.fillStyle='#3f3a4c'; c.fillRect(x,y+5,w,1);
  }
}
