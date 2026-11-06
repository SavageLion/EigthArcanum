// @ts-nocheck
import { S } from '../core/state';
import { G } from '../core/state';
import { reduced } from '../core/dom';
import { sfx } from '../core/audio';
import { R, mk } from './pixel';
import { K } from './sprites';
import explosion from './vfx/explosion';
import impact from './vfx/impact';
import lightning from './vfx/lightning';
import ice from './vfx/ice';
import energy from './vfx/energy';
import movement from './vfx/movement';
import heal from './vfx/heal';
import shield from './vfx/shield';

/* Spell and hit effects from the Sprite Fusion open-source VFX library (MIT), run on one shared pixel buffer.
   Game units -> effect world units: the effects work at 2 world units per art pixel, and one art pixel is one physical canvas pixel. */
const WU=2, toW=g=>g*K*R*WU;

const hex=h=>{const v=parseInt(h.slice(1),16);return [(v>>16)&255,(v>>8)&255,v&255];};
const mix=(a,b,t)=>a.map((x,i)=>Math.round(x+(b[i]-x)*t));
const toHex=c=>'#'+c.map(x=>x.toString(16).padStart(2,'0')).join('');
const toABGR=c=>((255<<24)|(c[2]<<16)|(c[1]<<8)|c[0])>>>0;
/** 8-step ramp from white through the colour to near-black (the effects index their palettes light to dark). */
export function ramp(col){ const c=hex(col),W=[255,255,255],D=[14,10,26];
  return [W,mix(c,W,.7),mix(c,W,.4),c,mix(c,D,.3),mix(c,D,.55),mix(c,D,.75),mix(c,D,.88)]; }
const rampHex=col=>ramp(col).map(toHex), rampNum=col=>ramp(col).map(toABGR);

const active=[]; let frame=null, cvC=null, cvL=null, last=0;
function ensure(){
  const WP=G.bg?G.bg.width:0, HP=G.bg?G.bg.height:0; if(!WP) return false;
  if(frame&&frame.w===WP&&frame.h===HP) return true;
  cvC=mk(WP,HP); cvL=mk(WP,HP);
  const imC=cvC.getContext('2d').createImageData(WP,HP), imL=cvL.getContext('2d').createImageData(WP,HP);
  frame={w:WP,h:HP,ox:0,oy:0,color:new Uint32Array(imC.data.buffer),light:new Uint32Array(imL.data.buffer),imC,imL};
  return true;
}
const hooks=()=>({ shake:t=>{ if(!reduced) S.shake=Math.max(S.shake,Math.min(10,t*20)); }, flash:()=>{}, ripple:()=>{}, darken:()=>{}, cue:()=>{}, kick:()=>{} });
function add(fx,extra={}){ if(active.length>14) active.shift(); const e={fx,shield:!!extra.shield}; active.push(e); return fx; }

/** advance all running effects (call once per frame) */
export function vfxStep(){
  const now=performance.now()/1000, dt=Math.min(.05,now-(last||now)); last=now;
  for(let i=active.length-1;i>=0;i--){ const e=active[i]; e.fx.update(dt); if(e.fx.done()) active.splice(i,1); }
}
/** draw effects for one layer: 'back' = far side of shields, 'front' = everything else */
export function vfxDraw(c,layer){
  if(!active.length||!ensure()) return;
  const list=layer==='back'?active.filter(e=>e.shield):active; if(!list.length) return;
  frame.color.fill(0); frame.light.fill(0);
  for(const e of list) e.fx.draw(frame, e.shield?layer:undefined);
  cvC.getContext('2d').putImageData(frame.imC,0,0); cvL.getContext('2d').putImageData(frame.imL,0,0);
  c.save(); c.scale(1/R,1/R); c.imageSmoothingEnabled=false;
  c.globalCompositeOperation='lighter'; c.drawImage(cvL,0,0);
  c.globalCompositeOperation='source-over'; c.drawImage(cvC,0,0); c.restore();
}
export const vfxActive=()=>active.length>0;

/* ---- game-facing helpers (all positions in game units) ---- */
export const fxImpact=(x,y,col,angle)=>add(impact({kind:'hit',x:toW(x),y:toW(y),ground:toW(y),angle,size:1.1,ramp:rampNum(col),...hooks()}));
export const fxExplosion=(x,y,size=.8)=>(sfx.explosion(),add(explosion({x:toW(x),y:toW(y),ground:toW(y),size,earth:0,chunks:0,scorch:0,shockwave:50,fire:.6,...hooks()})));
export const fxLightning=(x,y)=>(sfx.lightning(),add(lightning({kind:'strike',x:toW(x),ground:toW(y),clouds:false,...hooks()})));
export const fxIce=(x,y,kind='nova',size=.8)=>(sfx.ice(),add(ice({kind,x:toW(x),ground:toW(y),size,...hooks()})));
export const fxBlink=(x,y,col)=>(sfx.blink(),add(movement({kind:'blink',x:toW(x),y:toW(y),ground:toW(y+10),colors:rampNum(col),...hooks()})));
export const fxHeal=(x,y,kind='heal')=>add(heal({kind,x:toW(x),y:toW(y)}));
export const fxBeam=(x0,y0,x1,y1,col)=>add(energy({kind:'beam',actor:{hand:()=>({x:toW(x0),y:toW(y0),a:Math.atan2(y1-y0,x1-x0)})},to:[toW(x1),toW(y1)],colors:rampNum(col),hold:.5,...hooks()}));
/** dome around the player; follows G.P until dropped */
export function fxShield(col,radius=26){
  sfx.shield();
  return add(shield({actor:{feet:()=>[toW(G.P.x),toW(G.P.y+14)]},radius,hold:Infinity,hits:[],colors:rampHex(col),...hooks()}),{shield:true});
}
export const fxShieldHit=(fx,x,y)=>fx&&fx.hit(toW(x),toW(y));
