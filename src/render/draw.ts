// @ts-nocheck
import { W, ctx, reduced } from '../core/dom';
import { G, S } from '../core/state';
import { HEART, HEART0, K, LW, SKULL, SPRITE_OVERRIDES, blit, bossFrames, disc, px } from './sprites';
import { CY, RI, RO, WANDS, isMod } from '../systems/deck';
import { foBoss, foFloor } from '../systems/faceoff';
import { drawPull } from '../systems/flow';
import { drawChest, foWiz, wizSprite } from '../systems/gear';
import { oaDrawFloor, oaDrawStick } from '../systems/openArena';
import { burst } from '../systems/sim';
import { EL, spellCost } from '../systems/spells';
import { BONE, GOLD, TAU, clamp, rnd } from '../core/util';

/* ---------- drawing ---------- */
const gx=()=>ctx;
function arcDots(x,y,rad,fromA,toA,w,col){
  const c=ctx,rr=rad*K; if(rr<1)return; const st=.8/rr; c.fillStyle=col;
  for(let a=fromA;a<toA;a+=st) c.fillRect(Math.round(x*K+Math.cos(a)*rr-w/2),Math.round(y*K+Math.sin(a)*rr-w/2),w,w);
}
export function lineDots(x0,y0,x1,y1,col,w=1){ const c=ctx,n=Math.max(1,Math.round(Math.hypot(x1-x0,y1-y0)*K));c.fillStyle=col;for(let i=0;i<=n;i++)c.fillRect(Math.round((x0+(x1-x0)*i/n)*K),Math.round((y0+(y1-y0)*i/n)*K),w,w); }
function drawWizard(x,y,fade){
  const c=ctx; if(fade)c.globalAlpha=.4;
  blit(c,px(x)+(G.P&&G.P.vx>2?1:G.P&&G.P.vx<-2?-1:0)*0,px(y)-2,SPRITE_OVERRIDES.wizard||wizSprite());
  if(G.P&&G.P.wand){const w=WANDS.find(q=>q.id===G.P.wand);c.fillStyle=w.c;c.fillRect(px(x)+5,px(y)-12,3,3);}
  if(Math.floor(S.t*6)%2){c.fillStyle='#ffffff';c.fillRect(px(x)+6,px(y)-11,1,1);}
  c.globalAlpha=1;
}
function drawPlayer(){
  const c=ctx, blink=G.P.inv>0&&Math.floor(S.t*14)%2===0;
  if(S.fo&&G.fo){ if(blink)c.globalAlpha=.4; blit(c,px(G.P.x),px(G.P.y),foWiz()); c.globalAlpha=1; for(const f of G.helpers){ if(f.x!==undefined) blit(c,px(f.x),px(f.y),SKULL); } if(G.P.shield>0) arcDots(G.P.x,G.P.y,48,0,TAU,1,'#bfeaf2'); return; }
  if(!(blink&&reduced)) drawWizard(G.P.x,G.P.y,blink);
  if(G.P.shield>0&&!(G.P.shield<1&&Math.floor(S.t*10)%2)) arcDots(G.P.x,G.P.y,28,0,TAU,1,'#bfeaf2');
  for(const f of G.helpers){ if(f.x!==undefined) blit(c,px(f.x),px(f.y),SKULL); }
  const hx=px(G.P.x),hy=px(G.P.y),r=G.P.hit<4?1:1;
  c.fillStyle='#0b0814';c.fillRect(hx-2,hy-2,5,5);c.fillStyle='#ffd76a';c.fillRect(hx-r,hy-r,3,3);c.fillStyle='#ffffff';c.fillRect(hx,hy,1,1);
}
function drawBoss(){
  const c=ctx,f=bossFrames(S.stage),fr=f[Math.floor(S.t*6)%f.length];
  const j=G.B.enraged&&!reduced?(Math.floor(S.t*14)%2):0;
  const x=px(G.B.x)+j,y=px(G.B.y);
  blit(c,x,y,fr.img);
  if(G.B.chill>0){c.fillStyle='#bfeaf2';for(let i=0;i<4;i++)c.fillRect(x+Math.round(Math.cos(S.t*2+i*1.6)*24),y+Math.round(Math.sin(S.t*2+i*1.6)*22),2,2);}
  if(G.B.flash>0) blit(c,x,y,fr.white);
  if(G.B.burning>0&&Math.random()<.5) burst(G.B.x+rnd(-30,30),G.B.y+rnd(-30,30),'#f0813f',1);
}
function drawHUD(){
  const c=ctx,bx=20,by=18,bw=120;
  c.fillStyle='#0b0814';c.fillRect(bx-1,by-1,bw+2,6);
  c.fillStyle='#35263f';c.fillRect(bx,by,bw,4);
  c.fillStyle=G.B.color;c.fillRect(bx,by,Math.round(bw*G.B.hp/G.B.max),4);
  c.fillStyle='#ffffff';c.globalAlpha=.35;c.fillRect(bx,by,Math.round(bw*G.B.hp/G.B.max),1);c.globalAlpha=1;
  c.fillStyle=GOLD;c.fillRect(bx+bw/2,by-2,1,8);
  for(let i=0;i<G.P.max;i++) c.drawImage(i<G.P.hp?HEART:HEART0,8+i*10,G.LH-14);
  if(G.P.spells.length){
    const mx=8,my=G.LH-22,mw=66;
    c.fillStyle='#0b0814';c.fillRect(mx-1,my-1,mw+2,6);
    c.fillStyle='#1c2f4c';c.fillRect(mx,my,mw,4);
    c.fillStyle=G.P.grazeGlow>0?'#c7e6ff':'#5aa8f0';c.fillRect(mx,my,Math.round(mw*G.P.mana/G.P.manaMax),4);
    c.fillStyle='#0b0814';G.P.spells.forEach(s=>c.fillRect(mx+Math.round(mw*spellCost(s)/G.P.manaMax),my,1,4));
  }
}
export function draw(){
  const c=ctx; c.setTransform(1,0,0,1,0,0); c.imageSmoothingEnabled=false;
  c.fillStyle='#0b0814';c.fillRect(0,0,LW,G.LH);
  if(S.shake>0) c.translate(Math.round(rnd(-S.shake,S.shake)*.2),Math.round(rnd(-S.shake,S.shake)*.2));
  if(isMod('hanged')&&S.mode!=='draw'){c.translate(0,G.LH);c.scale(1,-1);}
  c.drawImage(G.bg,0,0);
  if(S.mode==='draw'){drawPull();return;}
  if(!G.B||S.mode==='shop') return;
  if(S.fo&&G.fo)foFloor(c); if(S.open&&G.oa)oaDrawFloor(c);
  if(S.orbit&&G.P){ for(const r of [RI,RO]){ const live=G.P.tr===r,rr=r*K,st=(live?5:7)/rr; c.globalAlpha=live?.75:.3; c.fillStyle=live?BONE:G.B.color; for(let a=S.t*.1;a<TAU+S.t*.1;a+=st)c.fillRect(Math.round(LW/2+Math.cos(a)*rr),Math.round(CY()*K+Math.sin(a)*rr),1,1); c.globalAlpha=1; }
    for(const k of G.bands){ const w=px(k.w); if(k.t<k.warn){ if(Math.floor(S.t*12)%2){ arcDots(W/2,CY(),k.r-k.w/2,0,TAU,1,BONE); arcDots(W/2,CY(),k.r+k.w/2,0,TAU,1,BONE); } } else { arcDots(W/2,CY(),k.r,0,TAU,w,G.B.color); arcDots(W/2,CY(),k.r,0,TAU,Math.max(2,w-6),'#fffbee'); } } }
  for(const k of G.cols){
    const x0=px(k.x-k.w/2),w=px(k.w);
    if(k.t<k.warn){ const on=(Math.floor(S.t*12)%2)+1; c.fillStyle=k.c; for(let y=0;y<G.LH;y+=2)for(let x=x0+(y%4?0:1);x<x0+w;x+=on+1)c.fillRect(x,y,1,1); const m=Math.round(w/2*(1-k.t/k.warn)); c.fillRect(x0+w/2-m,0,1,G.LH);c.fillRect(x0+w/2+m,0,1,G.LH); }
    else { c.fillStyle=k.c;c.fillRect(x0-2,0,w+4,G.LH);c.fillStyle='#fffbe0';c.fillRect(x0,0,w,G.LH); }
  }
  for(const r of G.rings){ const w=Math.max(1,Math.round(r.w*K)); if(r.gap>=TAU-.01) arcDots(r.x,r.y,r.rad,0,TAU,w,r.c); else { arcDots(r.x,r.y,r.rad,r.a+r.gap,r.a-r.gap+TAU,w+2,'#0b0814'); arcDots(r.x,r.y,r.rad,r.a+r.gap,r.a-r.gap+TAU,w,r.c);} }
  if(!['won','pick','victory'].includes(S.mode)){ if(S.fo&&G.fo)foBoss(c); else drawBoss(); }
  for(const b of G.beams){ if(b.sy!==undefined) lineDots(b.sx,b.sy,G.B.x,G.B.y,GOLD); else { lineDots(b.x,0,b.x+rnd(-10,10),G.B.y*.5,'#fff2a0',2); lineDots(b.x,G.B.y*.5,b.x,G.B.y,'#fff2a0',2);} }
  for(const b of G.bolts){ if(b.c) blit(c,px(b.x),px(b.y),disc(b.c,Math.max(1,Math.round(b.r*K)))); else { c.fillStyle='#7d5a22';c.fillRect(px(b.x)-1,px(b.y),3,6);c.fillStyle='#ffe9a8';c.fillRect(px(b.x),px(b.y)-1,1,6); } }
  for(const s of G.seeds){ if(s.homing) blit(c,px(s.x),px(s.y),disc('#9dbb6a',1)); }
  for(const s of G.shots){
    if(isMod('moon')&&G.P&&Math.hypot(s.x-G.P.x,s.y-G.P.y)>135)continue;
    blit(c,px(s.x),px(s.y),disc(s.c,Math.max(2,Math.round(s.r*K))));
    if(s.seed) arcDots(s.x,s.y,s.r+15*clamp(s.fuse/1.15,0,1),0,TAU,1,s.c);
  }
  for(const p of G.parts){ c.fillStyle=p.c; const z=p.r>2&&p.t<p.life*.5?2:1; c.fillRect(px(p.x),px(p.y),z,z); }
  drawChest(c);
  for(const k of G.traps){ const on=k.arm<=0&&Math.floor(S.t*5)%2===0; blit(c,px(k.x),px(k.y),disc(k.c,on?3:2)); c.fillStyle=k.c; for(let i=0;i<4;i++){const a=i*1.57+S.t;c.fillRect(px(k.x)+Math.round(Math.cos(a)*7),px(k.y)+Math.round(Math.sin(a)*7),1,1);} }
  if(G.P&&G.P.beam&&G.B){ const col=EL[G.P.beam.s.els[0]].c; lineDots(G.P.x,G.P.y,G.B.x,G.B.y,'#0b0814',5); lineDots(G.P.x,G.P.y,G.B.x,G.B.y,col,3); lineDots(G.P.x,G.P.y,G.B.x,G.B.y,'#fffbee',1); }
  if(G.P&&S.mode!=='dying'&&S.mode!=='dead') drawPlayer();
  c.setTransform(1,0,0,1,0,0); if(G.P&&S.mode!=='title') drawHUD(); if(S.open&&(S.mode==='fight'||S.mode==='intro')) oaDrawStick(c);
  if(S.flash>0){ c.fillStyle=`rgba(255,240,210,${Math.min(.5,S.flash)})`; c.fillRect(-4,-4,LW+8,G.LH+8); }
}
export function drawTitle(){
  const c=ctx; c.setTransform(1,0,0,1,0,0); c.imageSmoothingEnabled=false; c.drawImage(G.bg,0,0);
  const f=bossFrames(7); blit(c,LW/2,60+Math.round(Math.sin(S.t)*2),f[Math.floor(S.t*6)%f.length].img);
  for(let i=0;i<14;i++){ const a=S.t*.45+i/14*TAU,r=100+((S.t*38+i*18)%90); blit(c,px(W/2+Math.cos(a)*r),px(150+Math.sin(a)*r*.82),disc(i%2?'#b78cff':GOLD,2)); }
  const sv=G.P; drawWizard(W/2,270,false);
}
