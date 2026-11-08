// @ts-nocheck
import { R, mk } from '../render/pixel';
import { sfx } from '../core/audio';
import explosion from '../render/vfx/explosion';
import impact from '../render/vfx/impact';
import lightning from '../render/vfx/lightning';
import ice from '../render/vfx/ice';
import movement from '../render/vfx/movement';
import heal from '../render/vfx/heal';

/* Spell and hit effects from the Sprite Fusion open-source VFX library (MIT), run on one shared pixel buffer the size of the hunt canvas.
   Hunt units are logical canvas pixels (480x270); the effects work at 2 world units per art pixel and one art pixel is one physical canvas pixel. */
const W=480,H=270,WU=2, toW=g=>g*R*WU;
const hex=h=>{const v=parseInt(h.slice(1),16);return [(v>>16)&255,(v>>8)&255,v&255];};
const mix=(a,b,t)=>a.map((x,i)=>Math.round(x+(b[i]-x)*t));
const toABGR=c=>((255<<24)|(c[2]<<16)|(c[1]<<8)|c[0])>>>0;
/** 8-step ramp from white through the colour to near-black (the effects index their palettes light to dark). */
export function ramp(col){ const c=hex(col),Wh=[255,255,255],D=[14,10,26]; return [Wh,mix(c,Wh,.7),mix(c,Wh,.4),c,mix(c,D,.3),mix(c,D,.55),mix(c,D,.75),mix(c,D,.88)]; }
const rampNum=col=>ramp(col).map(toABGR);

let shakeFn=(v:number)=>{};
export const setShake=(f:(v:number)=>void)=>{ shakeFn=f; };
const active=[]; let frame=null, cvC=null, cvL=null;
function ensure(){
  const WP=W*R, HP=H*R; if(frame) return true;
  cvC=mk(WP,HP); cvL=mk(WP,HP);
  const imC=cvC.getContext('2d').createImageData(WP,HP), imL=cvL.getContext('2d').createImageData(WP,HP);
  frame={w:WP,h:HP,ox:0,oy:0,color:new Uint32Array(imC.data.buffer),light:new Uint32Array(imL.data.buffer),imC,imL};
  return true;
}
const hooks=()=>({ shake:t=>shakeFn(Math.min(10,t*20)), flash:()=>{}, ripple:()=>{}, darken:()=>{}, cue:()=>{}, kick:()=>{} });
function add(fx){ if(active.length>12) active.shift(); active.push({fx}); return fx; }

/** advance all running effects (call once per frame with the frame time) */
export function vfxStep(dt){ for(let i=active.length-1;i>=0;i--){ const e=active[i]; e.fx.update(Math.min(.05,dt)); if(e.fx.done()) active.splice(i,1); } }
/** draw every running effect onto the hunt canvas (its context is scaled by R) */
export function vfxDraw(c){
  if(!active.length||!ensure()) return;
  frame.color.fill(0); frame.light.fill(0);
  for(const e of active) e.fx.draw(frame);
  cvC.getContext('2d').putImageData(frame.imC,0,0); cvL.getContext('2d').putImageData(frame.imL,0,0);
  c.save(); c.scale(1/R,1/R); c.imageSmoothingEnabled=false;
  c.globalCompositeOperation='lighter'; c.drawImage(cvL,0,0);
  c.globalCompositeOperation='source-over'; c.drawImage(cvC,0,0); c.restore();
}
export const vfxClear=()=>{ active.length=0; };

export const fxImpact=(x,y,col,angle=0)=>add(impact({kind:'hit',x:toW(x),y:toW(y),ground:toW(y),angle,size:.9,ramp:rampNum(col),...hooks()}));
export const fxExplosion=(x,y,size=.7)=>(sfx.explosion(),add(explosion({x:toW(x),y:toW(y),ground:toW(y),size,earth:0,chunks:0,scorch:0,shockwave:50,fire:.6,...hooks()})));
export const fxLightning=(x,y)=>(sfx.lightning(),add(lightning({kind:'strike',x:toW(x),ground:toW(y),clouds:false,...hooks()})));
export const fxIce=(x,y,kind='nova',size=.7)=>(sfx.ice(),add(ice({kind,x:toW(x),ground:toW(y),size,...hooks()})));
export const fxBlink=(x,y,col)=>(sfx.blink(),add(movement({kind:'blink',x:toW(x),y:toW(y),ground:toW(y+10),colors:rampNum(col),...hooks()})));
export const fxHeal=(x,y,kind='heal')=>add(heal({kind,x:toW(x),y:toW(y)}));
