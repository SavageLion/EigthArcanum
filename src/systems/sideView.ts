// @ts-nocheck
import { W } from '../core/dom';
import { G, S } from '../core/state';
import { KEYS } from '../core/input';
import { LW, SPRITE_OVERRIDES, px } from '../render/sprites';
import { arenaSeed } from '../render/arenaArt';
import { burst, hurt } from './sim';
import { $, TAU, clamp } from '../core/util';
import { tone } from '../core/audio';

/* Side-view fight ("The Fool"): a landscape boss room. The boss hovers and fires its usual patterns while you run and jump over
   spikes and blocks, across moving and crumbling platforms. Your bolts aim at the boss on their own. The stage is turned sideways
   on a portrait phone (see core/size.ts), and the wizard and boss are drawn small so there is room to move. */
export const SIDE_FEET=12, SIDE_K=.65, FEET=SIDE_FEET;
const GRAV=1750, JUMP=450, RUN=175, TIER=44;
export const groundY=()=>G.H-26;
export const sideLive=()=>!!(S.side&&['intro','fight','won','dying'].includes(S.mode));
function makeLevel(){
  const g=groundY(), seed=arenaSeed(), L=(seed>>>3)%4, P=[{x:W/2,y:g,w:W+60,ground:true,kind:'ground'}];
  const st=(n,x,w=78)=>P.push({x,y:g-TIER*n,w,kind:'stone'});
  const mv=(n,x,amp,spd,w=70)=>P.push({x,x0:x,y:g-TIER*n,w,kind:'move',amp,spd});
  const cr=(n,x,w=70)=>P.push({x,y:g-TIER*n,w,kind:'crumble',stand:0,gone:0});
  let blocks=[], spikes=[];
  if(L===0){ st(1,70); st(1,330); mv(1,200,48,.9); cr(2,125); cr(2,275); st(3,200,96); blocks=[{x:140,w:26,h:20},{x:260,w:26,h:20}]; spikes=[{x:55,w:36},{x:345,w:36}]; }
  else if(L===1){ cr(1,200,90); st(2,80); st(2,320); mv(3,200,70,.7,64); blocks=[{x:90,w:24,h:24},{x:310,w:24,h:24}]; spikes=[{x:200,w:44}]; }
  else if(L===2){ st(1,60,70); mv(1,300,46,1,70); st(2,160); cr(2,330,64); st(3,70,70); cr(3,230,70); blocks=[{x:200,w:26,h:22}]; spikes=[{x:120,w:34},{x:290,w:34}]; }
  else { mv(1,110,44,.8); mv(1,290,44,1.1); st(2,200,110); cr(3,70); cr(3,330); blocks=[{x:60,w:22,h:20},{x:340,w:22,h:20},{x:200,w:22,h:20}]; spikes=[{x:130,w:30},{x:270,w:30}]; }
  G.plats=P; G.blocks=blocks.map(b=>({...b,top:g-b.h})); G.spikes=spikes;
}
export function sideStart(){ makeLevel(); G.P.x=W/2+40; G.P.y=groundY()-FEET; G.P.vy=0; G.P.jumps=0; G.P.drop=0; G.P.sdir='north'; G.stick=null; G.stickV={x:0,y:0}; G.sideJump=false; $('hint').textContent='Jump the spikes and blocks. You fire at the boss on your own.'; $('hint').hidden=false; G.sd={hint:4}; }
export function sideEnd(){ G.plats=[]; G.blocks=[]; G.spikes=[]; G.sd=null; G.sideJump=false; }
const solidTops=()=>{ const o=[]; for(const q of G.plats) if(!(q.kind==='crumble'&&q.gone>0)) o.push(q); for(const b of G.blocks) o.push({x:b.x,y:b.top,w:b.w,blk:true}); return o; };
export function sideMove(dt){
  const P=G.P, kx=(KEYS.right?1:0)-(KEYS.left?1:0); let vx=clamp(G.stickV.x+kx,-1,1); if(Math.abs(vx)<.18)vx=0;
  // moving and crumbling platforms
  for(const q of G.plats){ if(q.kind==='move'){ const nx=q.x0+Math.sin(S.t*q.spd)*q.amp; q.dx=nx-q.x; q.x=nx; } else q.dx=0; if(q.kind==='crumble'&&q.gone>0){ q.gone-=dt; if(q.gone<=0)q.stand=0; } }
  P.x=clamp(P.x+vx*RUN*dt,14,W-14); P.vx=vx*6; P.sdir=G.B&&G.B.x<P.x?'west':'east';
  for(const b of G.blocks){ if(P.y+FEET>b.top+3&&Math.abs(P.x-b.x)<b.w/2+6){ P.x=P.x<b.x?b.x-b.w/2-6:b.x+b.w/2+6; } }
  if(G.sideJump){ G.sideJump=false; if(P.jumps<2){ P.vy=-JUMP; P.jumps++; P.drop=0; burst(P.x,P.y+FEET,'#e6dcef',P.jumps>1?9:4); tone(P.jumps>1?700:520,.07,'square',.03); } }
  if((KEYS.down||G.stickV.y>.75)&&P.drop<=0){ const feet=P.y+FEET, on=G.plats.find(q=>!q.ground&&q.kind!=='crumble'&&Math.abs(q.y-feet)<2&&Math.abs(P.x-q.x)<q.w/2+4); if(on){ P.drop=.28; P.y+=3; } }
  if(P.drop>0)P.drop-=dt;
  const prev=P.y+FEET; P.vy=Math.min(P.vy+GRAV*dt,1000); P.y+=P.vy*dt; const feet=P.y+FEET;
  if(P.vy>=0) for(const q of solidTops()){ if((q.ground||q.blk||P.drop<=0)&&Math.abs(P.x-q.x)<q.w/2+3&&prev<=q.y+1.5&&feet>=q.y){ P.y=q.y-FEET; P.vy=0; P.jumps=0; break; } }
  if(P.y>groundY()-FEET){ P.y=groundY()-FEET; P.vy=0; P.jumps=0; }
  // riding / crumbling
  for(const q of G.plats){
    const on=Math.abs(q.y-(P.y+FEET))<1.5&&Math.abs(P.x-q.x)<q.w/2+3&&P.vy===0;
    if(q.kind==='move'&&on)P.x=clamp(P.x+q.dx,14,W-14);
    if(q.kind==='crumble'&&q.gone<=0){ if(on)q.stand+=dt; else if(q.stand>0)q.stand=Math.max(0,q.stand-dt*.5); if(q.stand>.55){ q.gone=2.6; q.stand=0; burst(q.x,q.y,'#b5afc2',10); } }
  }
  P.air=P.vy<0||!solidTops().some(q=>Math.abs(q.y-(P.y+FEET))<1.5&&Math.abs(P.x-q.x)<q.w/2+3);
  // spikes
  if(P.y+FEET>=groundY()-3) for(const s of G.spikes){ if(Math.abs(P.x-s.x)<s.w/2+3){ hurt(); P.vy=-300; P.jumps=0; break; } }
  if(G.B&&S.mode==='fight'&&Math.hypot(P.x-G.B.x,P.y-G.B.y)<G.B.rad*.8)hurt();
  if(G.sd&&G.sd.hint>0){ G.sd.hint-=dt; if(G.sd.hint<=0)$('hint').hidden=true; }
}
const tileAt=(T,tx,ty)=>T[((tx*7+ty*13)>>4)%5===0?(tx>>4)%16:[0,1,8,10,13][((tx>>4)+(ty>>4))%5]];
/** a side-on boss room: a dark brick back wall tinted with the boss's colour, torches, a stone floor, spikes, blocks and slab platforms */
export function sideDrawFloor(c){
  const T=SPRITE_OVERRIDES.arena.tiles, gy=px(groundY()), col=G.B?G.B.color:'#8a8498', has=T.length>15, LH=G.LH;
  if(has){ c.save(); c.beginPath(); c.rect(0,0,LW,LH); c.clip(); for(let ty=0;ty<LH;ty+=16)for(let tx=0;tx<LW;tx+=16){ c.globalAlpha=.5; c.drawImage(tileAt(T,tx,ty),tx,ty,16,16); } c.restore(); }
  c.globalAlpha=.66; c.fillStyle='#0d0716'; c.fillRect(0,0,LW,LH); c.globalAlpha=.16; c.fillStyle=col; c.fillRect(0,0,LW,LH); c.globalAlpha=1;
  const wt=Math.round(LH*.2), wh=Math.round(LH*.36);
  for(const wx of [24,56,104,136]){ c.fillStyle='#0b0814'; c.fillRect(wx-6,wt,12,wh); c.beginPath(); c.arc(wx,wt,6,Math.PI,0); c.fill(); c.globalAlpha=.55; c.fillStyle=col; c.fillRect(wx-4,wt+2,8,wh-4); c.beginPath(); c.arc(wx,wt+2,4,Math.PI,0); c.fill(); c.globalAlpha=1; c.fillStyle='#b5afc2'; c.fillRect(wx-7,wt+wh,14,1); }
  for(const tx of [40,80,120]){ const ty=wt+Math.round(wh*.55); c.fillStyle='#3f3a4c'; c.fillRect(tx-1,ty,2,5); const fl=Math.floor(S.t*8+tx)%2; c.fillStyle=fl?'#f2a03d':'#ffcf6e'; c.fillRect(tx-1,ty-3,2,3); c.fillRect(tx,ty-5-fl,1,2); for(const [gr,ga] of [[10,.04],[6,.06],[3,.08]]){ c.globalAlpha=ga+.02*Math.sin(S.t*9+tx); c.fillStyle='#ff9a3c'; c.beginPath(); c.arc(tx,ty-2,gr,0,TAU); c.fill(); } c.globalAlpha=1; }
  // floor
  c.fillStyle='#120b19'; c.fillRect(0,gy,LW,LH-gy);
  if(has){ c.save(); c.beginPath(); c.rect(0,gy,LW,LH-gy); c.clip(); for(let tx=0;tx<LW;tx+=16){ c.globalAlpha=.85; c.drawImage(tileAt(T,tx,gy),tx,gy+1,16,16); } c.restore(); }
  c.globalAlpha=1; c.fillStyle='#b5afc2'; c.fillRect(0,gy,LW,1); c.fillStyle='#5c566c'; c.fillRect(0,gy+1,LW,1);
  // spikes
  for(const s of G.spikes){ const x0=px(s.x-s.w/2), w=px(s.w), n=Math.max(2,Math.round(w/4)); c.fillStyle='#0b0814'; c.fillRect(x0-1,gy-5,w+2,6); for(let i=0;i<n;i++){ const sx=x0+i*(w/n), sw=w/n; c.fillStyle='#cfd7e8'; c.beginPath(); c.moveTo(sx,gy); c.lineTo(sx+sw/2,gy-6); c.lineTo(sx+sw,gy); c.fill(); c.fillStyle='#7a8fb5'; c.beginPath(); c.moveTo(sx+sw/2,gy-6); c.lineTo(sx+sw,gy); c.lineTo(sx+sw/2,gy); c.fill(); } }
  // blocks
  for(const b of G.blocks){ const x=px(b.x-b.w/2), y=px(b.top), w=px(b.w), h=gy-y; c.fillStyle='#0b0814'; c.fillRect(x-1,y-1,w+2,h+1); c.fillStyle='#8a8498'; c.fillRect(x,y,w,h); if(has){ c.save(); c.beginPath(); c.rect(x,y,w,h); c.clip(); c.globalAlpha=.6; c.drawImage(tileAt(T,x,y),x,y,16,16); c.drawImage(tileAt(T,x,y+16),x,y+16,16,16); c.restore(); c.globalAlpha=1; } c.fillStyle='#b5afc2'; c.fillRect(x,y,w,1); c.fillStyle='#3f3a4c'; c.fillRect(x,gy-2,w,2); }
  // platforms
  for(const q of G.plats){ if(q.ground)continue;
    let x=px(q.x-q.w/2), y=px(q.y), w=px(q.w); const crumb=q.kind==='crumble';
    if(crumb&&q.gone>0)continue; if(crumb&&q.stand>0)x+=Math.round(Math.sin(S.t*60)*.6);
    c.fillStyle='#0b0814'; c.fillRect(x-1,y-1,w+2,6);
    if(has){ c.save(); c.beginPath(); c.rect(x,y,w,4); c.clip(); for(let tx=x-(x%16);tx<x+w;tx+=16){ c.globalAlpha=.95; c.drawImage(tileAt(T,tx,y),tx,y-5,16,16); } c.restore(); }
    c.globalAlpha=1; c.fillStyle=crumb?'#c9a27a':q.kind==='move'?'#9ad0ff':'#b5afc2'; c.fillRect(x,y,w,1); c.fillStyle='#3f3a4c'; c.fillRect(x,y+3,w,1);
    if(q.kind==='move'){ c.fillStyle='#9ad0ff'; c.fillRect(x+1,y+1,1,2); c.fillRect(x+w-2,y+1,1,2); }
    if(crumb){ c.fillStyle='#5a4636'; for(let tx=x+5;tx<x+w-3;tx+=9)c.fillRect(tx,y+1,1,2); }
  }
}
