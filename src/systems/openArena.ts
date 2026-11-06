// @ts-nocheck
import { W, reduced } from '../core/dom';
import { G, S } from '../core/state';
import { KEYS } from '../core/input';
import { lineDots } from '../render/draw';
import { LW, SPRITE_OVERRIDES, blitSprite, px } from '../render/sprites';
import { ring } from './attacks';
import { OA_STYLE } from './bossPlans';
import { hasPerk, hasWand, isMod, relPos } from './deck';
import { burst, hurt } from './sim';
import { $, BONE, TAU, clamp, rnd } from '../core/util';
import { sfx, tone } from '../core/audio';

function makePillars(){ const a=G.H*.42,b=G.H*.68; G.pillars=[{x:95,y:a,w:48,h:48},{x:305,y:a,w:48,h:48},{x:95,y:b,w:48,h:48},{x:305,y:b,w:48,h:48}]; }
export const inPillar=(x,y,m=0)=>G.pillars.some(p=>Math.abs(x-p.x)<p.w/2+m&&Math.abs(y-p.y)<p.h/2+m);
export function oaStart(){ makePillars(); G.oa={state:'chase',t:0,tx:0,ty:0,vx:0,vy:0,hint:4,hit:false,patches:[],left:0,slowed:0}; G.still=0; G.stickV={x:0,y:0}; G.B.x=W/2; G.B.y=G.H*.2; G.P.x=W/2; G.P.y=G.H-150; $('hint').textContent='Stand still to fire'; $('hint').hidden=false; }
export function oaEnd(){ G.oa=null; G.pillars=[]; G.stick=null; G.stickV={x:0,y:0}; }
export function oaMove(dt){
  const kx=(KEYS.right?1:0)-(KEYS.left?1:0),ky=(KEYS.down?1:0)-(KEYS.up?1:0);
  let vx=G.stickV.x+kx,vy=G.stickV.y+ky; const l=Math.hypot(vx,vy); if(l>1){vx/=l;vy/=l;}
  const sp=210*(G.oa&&G.oa.slowed>0?.55:1),moving=Math.hypot(vx,vy)>.12;
  if(moving){ G.still=0; const nx=clamp(G.P.x+vx*sp*dt,22,W-22); if(!inPillar(nx,G.P.y,10))G.P.x=nx; const ny=clamp(G.P.y+vy*sp*dt,G.H*.12,G.H-96); if(!inPillar(G.P.x,ny,10))G.P.y=ny; G.P.vx=vx*6; } else { G.still+=dt; G.P.vx=0; }
}
export function oaBoss(dt){
  const o=G.oa, st=OA_STYLE[S.stage]||OA_STYLE[5]; o.t+=dt; const slow=(G.B.chill>0?.6:1)*(.85+.025*relPos()), sp=st.speed*(G.B.enraged?1.4:1)*slow;
  if(st.pull&&o.state!=='stun'){ const a=Math.atan2(G.B.y-G.P.y,G.B.x-G.P.x),nx=clamp(G.P.x+Math.cos(a)*st.pull*dt,22,W-22),ny=clamp(G.P.y+Math.sin(a)*st.pull*dt,G.H*.12,G.H-96); if(!inPillar(nx,ny,10)){G.P.x=nx;G.P.y=ny;} }
  if(o.state==='chase'){
    o.tick=(o.tick||0)+dt;
    const m=st.move;
    if(!m||m==='drift'){ const a=Math.atan2(G.P.y-G.B.y,G.P.x-G.B.x); G.B.x+=Math.cos(a)*sp*dt; G.B.y+=Math.sin(a)*sp*dt; }
    else if(m==='flee'){ const a=Math.atan2(G.B.y-G.P.y,G.B.x-G.P.x); G.B.x+=Math.cos(a)*sp*dt; G.B.y+=Math.sin(a)*sp*dt; }
    else if(m==='patrol'){ o.dir=o.dir||1; G.B.x+=o.dir*sp*dt; G.B.y+=(G.H*.26-G.B.y)*Math.min(1,dt*2); if(G.B.x<55||G.B.x>W-55)o.dir*=-1; }
    else if(m==='mirror'){ const tx=W-G.P.x,ty=clamp(G.H*.56-(G.P.y-G.H*.56)*.55,G.H*.14,G.H*.5); G.B.x+=(tx-G.B.x)*Math.min(1,dt*2.6); G.B.y+=(ty-G.B.y)*Math.min(1,dt*2.6); }
    else if(m==='blink'){ if(o.tick>st.blink/(G.B.enraged?1.3:1)){ o.tick=0; burst(G.B.x,G.B.y,G.B.color,14); let n=0,x,y; do{x=rnd(55,W-55);y=rnd(G.H*.14,G.H-130);}while(Math.hypot(x-G.P.x,y-G.P.y)<130&&n++<12); G.B.x=x;G.B.y=y;G.B.flash=.1; tone(800,.08,'triangle',.04); } }
    else if(m==='grid'){ if(o.tick>(G.B.enraged?.6:.85)){ o.tick=0; const dx=G.P.x-G.B.x,dy=G.P.y-G.B.y,step=62; if(Math.abs(dx)>Math.abs(dy))G.B.x+=Math.sign(dx)*step; else G.B.y+=Math.sign(dy)*step; tone(1000,.04,'square',.03); } }
    G.B.x=clamp(G.B.x,48,W-48);G.B.y=clamp(G.B.y,G.H*.12,G.H-96);
    if(st.trail&&(o.trailT=(o.trailT||0)-dt)<=0){ o.trailT=.42; if(o.patches.length<26)o.patches.push({x:G.B.x,y:G.B.y,kind:st.trail,t:st.trail==='fire'?3.2:4.5}); }
    if(st.charges&&o.t>(G.B.enraged?3.2:4.6)){ o.left=st.charges; o.state='windup'; o.t=0; o.tx=G.P.x; o.ty=G.P.y; sfx.rage(); }
  }
  else if(o.state==='windup'){ if(o.t>(o.left<st.charges?.42:.8)){ const a=Math.atan2(o.ty-G.B.y,o.tx-G.B.x),v=470; o.vx=Math.cos(a)*v; o.vy=Math.sin(a)*v; o.state='dash'; o.t=0; o.hit=false; } }
  else if(o.state==='dash'){ G.B.x+=o.vx*dt; G.B.y+=o.vy*dt; if(st.trail&&(o.trailT=(o.trailT||0)-dt)<=0){o.trailT=.1; if(o.patches.length<26)o.patches.push({x:G.B.x,y:G.B.y,kind:st.trail,t:2.4});}
    if(o.t>.82||G.B.x<50||G.B.x>W-50||G.B.y<G.H*.12||G.B.y>G.H-90){ G.B.x=clamp(G.B.x,50,W-50); G.B.y=clamp(G.B.y,G.H*.12,G.H-90); S.shake=reduced?0:7; sfx.toll(); o.left--; if(o.left>0){ o.state='windup'; o.t=0; o.tx=G.P.x; o.ty=G.P.y; } else { o.state='stun'; o.t=0; ring(14,120,{r:5}); $('call').textContent='Stunned!'; $('call').style.color='#a8f0b0'; $('call').hidden=false; o.call=.7; } } }
  else if(o.state==='stun'){ if(o.t>1.3){ o.state='chase'; o.t=0; } }
  for(const q of o.patches){ q.t-=dt; if(Math.hypot(G.P.x-q.x,G.P.y-q.y)<22){ if(q.kind==='fire')hurt(); else o.slowed=.2; } }
  o.patches=o.patches.filter(q=>q.t>0);
  if(o.slowed>0)o.slowed-=dt;
  if(o.call>0){o.call-=dt;if(o.call<=0)$('call').hidden=true;}
  if(o.hint>0){o.hint-=dt;if(o.hint<=0)$('hint').hidden=true;}
  if(Math.hypot(G.P.x-G.B.x,G.P.y-G.B.y)<(o.state==='dash'?44:36)) hurt();
}
export function oaAim(){ if(isMod('hermit'))return; const n=hasWand('fork')?2:1; for(let i=0;i<n;i++){ const crit=(hasWand('gambler')&&Math.random()<.15)||(hasPerk('lucky')&&Math.random()<.1),sx=G.P.x+(n>1?(i-.5)*14:0),a=Math.atan2(G.B.y-G.P.y,G.B.x-sx); G.bolts.push({x:sx,y:G.P.y,vx:Math.cos(a)*640,vy:Math.sin(a)*640,d:G.P.scale*(crit?5:1),r:crit?5:3,c:crit?'#f0a8d8':'#ffe9a8',basic:true}); } }
export function oaDrawFloor(c){
  const pil=SPRITE_OVERRIDES.arena.pillar;
  if(!SPRITE_OVERRIDES.arena.tiles.length){ c.fillStyle='#0b0814'; c.globalAlpha=.3; for(let x=0;x<LW;x+=16)c.fillRect(x,0,1,G.LH); for(let y=0;y<G.LH;y+=16)c.fillRect(0,y,LW,1); c.globalAlpha=1; }
  if(pil) for(const p of G.pillars){ const fy=px(p.y+p.h/2); c.globalAlpha=.4; c.fillStyle='#0b0814'; c.beginPath(); c.ellipse(px(p.x),fy-.5,11,3,0,0,TAU); c.fill(); c.globalAlpha=1; blitSprite(c,pil,px(p.x),fy+1); }
  else for(const p of G.pillars){ const x=px(p.x-p.w/2),y=px(p.y-p.h/2),w=px(p.w),h=px(p.h); c.fillStyle='#0b0814';c.fillRect(x-1,y-1,w+2,h+6); c.fillStyle='#3f3a4c';c.fillRect(x,y+h-1,w,5); c.fillStyle='#8a8498';c.fillRect(x,y,w,h); c.fillStyle='#b5afc2';c.fillRect(x,y,w,2);c.fillRect(x,y,2,h); c.fillStyle='#5c566c';c.fillRect(x+6,y+6,w-12,1);c.fillRect(x+6,y+h-7,w-12,1); }
  if(G.oa)for(const q of G.oa.patches){ const cx=px(q.x),cy=px(q.y),col=q.kind==='fire'?(Math.floor(S.t*8+q.x)%2?'#f2a03d':'#e8592c'):q.kind==='ice'?'#bfeaf2':'#d9d2bb'; c.fillStyle=col; c.globalAlpha=q.t<.6&&Math.floor(S.t*10)%2?.3:.85; for(let i=0;i<7;i++){const a=i*.9+q.x;c.fillRect(cx+Math.round(Math.cos(a)*(2+i%4*2)),cy+Math.round(Math.sin(a)*(2+i%4*2)),2,2);} c.globalAlpha=1; }
  if(G.oa&&S.mode==='fight'&&G.oa.state==='windup'&&Math.floor(S.t*12)%2){ lineDots(G.B.x,G.B.y,G.oa.tx,G.oa.ty,'#ff7a6e',2); }
}
export function oaDrawStick(c){ if(!G.stick)return; const r=c.canvas.getBoundingClientRect(),sx=(G.stick.x-r.left)*LW/r.width,sy=(G.stick.y-r.top)*G.LH/r.height; c.fillStyle=BONE; c.globalAlpha=.55; for(let a=0;a<TAU;a+=.2)c.fillRect(Math.round(sx+Math.cos(a)*14),Math.round(sy+Math.sin(a)*14),1,1); c.globalAlpha=.8; c.fillRect(Math.round(sx+G.stickV.x*13)-3,Math.round(sy+G.stickV.y*13)-3,6,6); c.globalAlpha=1; }
