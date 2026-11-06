// @ts-nocheck
import { W, ctx, reduced } from '../core/dom';
import { G, S } from '../core/state';
import { HEART, HEART0, K, LW, R, SKULL, SPRITE_OVERRIDES, blit, blitSprite, bossFrames, clipFrame, dirOf, disc, px } from './sprites';
import { CY, RI, RO, WANDS, isMod } from '../systems/deck';
import { foBoss, foFloor } from '../systems/faceoff';
import { drawPull } from '../systems/flow';
import { drawChest, foWiz, wizSprite } from '../systems/gear';
import { oaDrawFloor, oaDrawStick } from '../systems/openArena';
import { burst } from '../systems/sim';
import { EL, spellCost } from '../systems/spells';
import { BONE, GOLD, TAU, clamp, rnd } from '../core/util';
import { circle, fl, ln, poly } from './bossArt';
import { drawArenaLayers } from './arenaArt';
import { vfxDraw, vfxStep } from './vfx';
import { pixelise } from './pixel';

/* ---------- drawing ---------- */
const gx=()=>ctx;
const pr=v=>Math.round(v*R)/R; // snap a logical coordinate to the physical pixel grid
function arcDots(x,y,rad,fromA,toA,w,col){
  const c=ctx,rr=rad*K; if(rr<1)return; const st=.8/(rr*R); c.fillStyle=col;
  for(let a=fromA;a<toA;a+=st) c.fillRect(pr(x*K+Math.cos(a)*rr-w/2),pr(y*K+Math.sin(a)*rr-w/2),w,w);
}
export function lineDots(x0,y0,x1,y1,col,w=1){ const c=ctx,n=Math.max(1,Math.round(Math.hypot(x1-x0,y1-y0)*K*R));c.fillStyle=col;for(let i=0;i<=n;i++)c.fillRect(pr((x0+(x1-x0)*i/n)*K),pr((y0+(y1-y0)*i/n)*K),w,w); }
const nowS=()=>performance.now()/1000;
/** What the wizard is doing: one-shots (hurt, cast) win over walk, which wins over idle. Returns [clip name, seconds into it]. */
function wizardAction(P){ const t=nowS();
  if(S.mode==='dying'||S.mode==='dead') return ['death',t-(P.deathAt??t)];
  if(P.hurtAt!==undefined&&t-P.hurtAt<.55) return ['hurt',t-P.hurtAt];
  if(P.castAt!==undefined&&t-P.castAt<.5) return ['cast',t-P.castAt];
  return t-(P.moveAt??-9)<.15?['walk',t]:['idle',t]; }
/** The frame to draw for a direction: the current clip if that clip exists, else idle, else the still pose. */
function wizardFrame(set,rest,dir){ const [name,age]=G.P?wizardAction(G.P):['idle',nowS()], A=SPRITE_OVERRIDES.anim[set]; const clip=A[name]?.[dir]||A.idle?.[dir]; return clip?clipFrame(clip,age):rest; }
/** facing: one of the 8 directions (south = towards the camera). Falls back to the procedural wizard if the art is missing. */
function drawWizard(x,y,fade,facing='south'){
  const c=ctx; if(fade)c.globalAlpha=.4;
  const set=SPRITE_OVERRIDES.wizardDirs; let tip;
  if(set) tip=blitSprite(c,wizardFrame('arena',set[facing],facing),px(x),px(y)+8);          // feet 8 logical px below the hitbox centre
  else { blit(c,px(x),px(y)-2,wizSprite()); tip={x:px(x)+6,y:px(y)-11}; }
  if(G.P&&G.P.wand){const w=WANDS.find(q=>q.id===G.P.wand);blit(c,tip.x,tip.y,disc(w.c,1.5));}
  if(Math.floor(S.t*6)%2){c.fillStyle='#ffffff';c.fillRect(tip.x-.25,tip.y-.25,.5,.5);}
  c.globalAlpha=1;
}
function drawPlayer(){
  const c=ctx, blink=G.P.inv>0&&Math.floor(S.t*14)%2===0;
  if(Math.hypot(G.P.x-(G.P.lx??G.P.x),G.P.y-(G.P.ly??G.P.y))>.4) G.P.moveAt=nowS(); G.P.lx=G.P.x; G.P.ly=G.P.y;
  if(S.fo&&G.fo){ if(blink)c.globalAlpha=.4; if(SPRITE_OVERRIDES.wizardBack) blitSprite(c,wizardFrame('large',SPRITE_OVERRIDES.wizardBack,'north'),px(G.P.x),px(G.P.y)+28); else blit(c,px(G.P.x),px(G.P.y),foWiz()); c.globalAlpha=1; for(const f of G.helpers){ if(f.x!==undefined) blit(c,px(f.x),px(f.y),SKULL); } if(G.P.shield>0) arcDots(G.P.x,G.P.y,48,0,TAU,1,'#bfeaf2'); return; }
  G.P.face=G.B?dirOf(Math.atan2(G.B.y-G.P.y,G.B.x-G.P.x)):'north';
  if(!(blink&&reduced)) drawWizard(G.P.x,G.P.y,blink,G.P.face);
  if(G.P.shield>0&&!(G.P.shield<1&&Math.floor(S.t*10)%2)) arcDots(G.P.x,G.P.y,28,0,TAU,1,'#bfeaf2');
  for(const f of G.helpers){ if(f.x!==undefined) blit(c,px(f.x),px(f.y),SKULL); }
  const hx=px(G.P.x),hy=px(G.P.y),r=G.P.hit<4?1:1;
  blit(c,hx,hy,disc('#ffd76a',1.5));
}
function drawBoss(){
  const c=ctx,f=bossFrames(S.stage),atk=SPRITE_OVERRIDES.bossAtk[S.stage],age=performance.now()/1000-(G.B.atkAt??-9);
  const fr=(atk&&age<.45)?atk[Math.min(atk.length-1,Math.floor(age*14))]:f[Math.floor(S.t*6)%f.length];
  const j=G.B.enraged&&!reduced?(Math.floor(S.t*14)%2):0;
  const x=px(G.B.x)+j,y=px(G.B.y);
  blit(c,x,y,fr.img);
  if(G.B.chill>0){c.fillStyle='#bfeaf2';for(let i=0;i<4;i++)c.fillRect(x+Math.round(Math.cos(S.t*2+i*1.6)*24),y+Math.round(Math.sin(S.t*2+i*1.6)*22),2,2);}
  if(G.B.flash>0) blit(c,x,y,fr.white);
  if(G.B.burning>0&&Math.random()<.5) burst(G.B.x+rnd(-30,30),G.B.y+rnd(-30,30),'#f0813f',1);
}
/* ---- HUD, drawn at physical resolution (u = one physical pixel in logical units) ---- */
const U=1/R;
const box=(x,y,w,h,col,al=1)=>{ const c=ctx; c.globalAlpha=al; c.fillStyle=col; c.fillRect(pr(x),pr(y),Math.max(U,pr(w)),Math.max(U,pr(h))); c.globalAlpha=1; };
/** gilded bar: dark trough, bevelled gold rim, optional trailing chip, shaded fill, notches and end gems */
function gildedBar(x,y,w,h,frac,trail,col,notches,gem){
  box(x-3*U,y-3*U,w+6*U,h+6*U,'#0b0814');
  box(x-2*U,y-2*U,w+4*U,h+4*U,'#8f7440');                 // rim
  box(x-2*U,y-2*U,w+4*U,U,'#f0d9a5'); box(x-2*U,y-2*U,U,h+4*U,'#dcb868');   // lit top/left edges
  box(x-2*U,y+h+U,w+4*U,U,'#57401f'); box(x+w+U,y-2*U,U,h+4*U,'#57401f');   // shaded bottom/right
  box(x,y,w,h,'#1a1024');                                  // trough
  if(trail>frac) box(x+w*frac,y,w*(trail-frac),h,'#f1e8d4',.55);   // damage chip
  if(frac>0){ box(x,y,w*frac,h,col); box(x,y,w*frac,Math.max(U,h*.3),'#ffffff',.28); box(x,y+h*.7,w*frac,h*.3,'#000000',.22); }
  for(const n of notches) box(x+w*n-U/2,y,U,h,'#0b0814',.55);
  if(gem){ for(const sx of [x-4*U,x+w+4*U]){ box(sx-U,y+h/2-3*U,2*U,6*U,'#dcb868'); box(sx-3*U,y+h/2-U,6*U,2*U,'#dcb868'); box(sx-U,y+h/2-U,2*U,2*U,'#ffffff'); } }
}
let heartImg=null, starImg=null;
function hudArt(){
  if(heartImg) return;
  const heart=(fill,rim,hi)=>pixelise(c=>{ c.beginPath();c.moveTo(0,7);c.bezierCurveTo(-11,-1,-7,-9,0,-4);c.bezierCurveTo(7,-9,11,-1,0,7);c.closePath(); fl(c,fill); ln(c,rim,1.2); if(hi){c.beginPath();c.ellipse(-4,-3,2,1.3,-.6,0,TAU);fl(c,hi);} },12,.62).img;
  heartImg={full:heart('#d9505f','#f0d9a5','#f3b8ae'),empty:heart('#2a1a33','#57401f',null)};
  starImg=pixelise(c=>{ poly(c,[[0,-9],[2.2,-2.2],[9,0],[2.2,2.2],[0,9],[-2.2,2.2],[-9,0],[-2.2,-2.2]]); fl(c,'#79c6dd'); ln(c,'#bfeaf2',1); circle(c,0,0,1.6); fl(c,'#ffffff'); },10,.6).img;
}
function drawHUD(){
  hudArt(); const c=ctx,bx=20,by=18,bw=120,bh=5;
  const hp=G.B.hp/G.B.max; G.B.trail=Math.max(hp,(G.B.trail??hp)-.004);
  gildedBar(bx,by,bw,bh,hp,G.B.trail,G.B.color,[.25,.5,.75],true);
  box(bx+bw/2-U/2,by-4*U,U,2*U,GOLD); box(bx+bw/2-U/2,by+bh+2*U,U,2*U,GOLD);   // phase tick
  for(let i=0;i<G.P.max;i++){ const low=G.P.hp===1&&i===0&&Math.floor(performance.now()/350)%2; blit(c,8+i*10+5,G.LH-14+(low?-.5:0)+4,i<G.P.hp?heartImg.full:heartImg.empty); }
  if(G.P.spells.length){
    const mx=17,my=G.LH-21,mw=57,mh=4, full=G.P.mana>=G.P.manaMax;
    gildedBar(mx,my,mw,mh,G.P.mana/G.P.manaMax,0,G.P.grazeGlow>0?'#c7e6ff':'#5aa8f0',G.P.spells.map(s=>spellCost(s)/G.P.manaMax),false);
    blit(c,9,my+mh/2,starImg); if(full&&Math.floor(performance.now()/300)%2) box(8.5,my+mh/2-.5,1,1,'#ffffff');
  }
}
export function draw(){
  const c=ctx; c.setTransform(R,0,0,R,0,0); c.imageSmoothingEnabled=false;
  c.fillStyle='#0b0814';c.fillRect(0,0,LW,G.LH);
  if(S.shake>0) c.translate(Math.round(rnd(-S.shake,S.shake)*.2),Math.round(rnd(-S.shake,S.shake)*.2));
  if(isMod('hanged')&&S.mode!=='draw'){c.translate(0,G.LH);c.scale(1,-1);}
  c.drawImage(G.bg,0,0,LW,G.LH); drawArenaLayers(c,LW); vfxStep();
  if(S.mode==='draw'){drawPull();return;}
  if(!G.B||S.mode==='shop') return;
  if(S.fo&&G.fo)foFloor(c); if(S.open&&G.oa)oaDrawFloor(c);
  if(S.orbit&&G.P){ for(const r of [RI,RO]){ const live=G.P.tr===r,rr=r*K,st=(live?5:7)/(rr*R); c.globalAlpha=live?.75:.3; c.fillStyle=live?BONE:G.B.color; for(let a=S.t*.1;a<TAU+S.t*.1;a+=st)c.fillRect(pr(LW/2+Math.cos(a)*rr),pr(CY()*K+Math.sin(a)*rr),1,1); c.globalAlpha=1; }
    for(const k of G.bands){ const w=px(k.w); if(k.t<k.warn){ if(Math.floor(S.t*12)%2){ arcDots(W/2,CY(),k.r-k.w/2,0,TAU,1,BONE); arcDots(W/2,CY(),k.r+k.w/2,0,TAU,1,BONE); } } else { arcDots(W/2,CY(),k.r,0,TAU,w,G.B.color); arcDots(W/2,CY(),k.r,0,TAU,Math.max(2,w-6),'#fffbee'); } } }
  for(const k of G.cols){
    const x0=px(k.x-k.w/2),w=px(k.w);
    if(k.t<k.warn){ const on=(Math.floor(S.t*12)%2)+1; c.fillStyle=k.c; for(let y=0;y<G.LH;y+=2)for(let x=x0+(y%4?0:1);x<x0+w;x+=on+1)c.fillRect(x,y,1,1); const m=Math.round(w/2*(1-k.t/k.warn)); c.fillRect(x0+w/2-m,0,1,G.LH);c.fillRect(x0+w/2+m,0,1,G.LH); }
    else { c.fillStyle=k.c;c.fillRect(x0-2,0,w+4,G.LH);c.fillStyle='#fffbe0';c.fillRect(x0,0,w,G.LH); }
  }
  for(const r of G.rings){ const w=Math.max(1,Math.round(r.w*K)); if(r.gap>=TAU-.01) arcDots(r.x,r.y,r.rad,0,TAU,w,r.c); else { arcDots(r.x,r.y,r.rad,r.a+r.gap,r.a-r.gap+TAU,w+2,'#0b0814'); arcDots(r.x,r.y,r.rad,r.a+r.gap,r.a-r.gap+TAU,w,r.c);} }
  if(!['won','pick','victory'].includes(S.mode)){ if(S.fo&&G.fo)foBoss(c); else drawBoss(); }
  for(const b of G.beams){ if(b.sy!==undefined) lineDots(b.sx,b.sy,G.B.x,G.B.y,GOLD); else { lineDots(b.x,0,b.x+rnd(-10,10),G.B.y*.5,'#fff2a0',2); lineDots(b.x,G.B.y*.5,b.x,G.B.y,'#fff2a0',2);} }
  for(const b of G.bolts){ if(b.c) blit(c,px(b.x),px(b.y),disc(b.c,Math.max(1,b.r*K))); else { c.fillStyle='#7d5a22';c.fillRect(px(b.x)-1,px(b.y),3,6);c.fillStyle='#ffe9a8';c.fillRect(px(b.x),px(b.y)-1,1,6); } }
  for(const s of G.seeds){ if(s.homing) blit(c,px(s.x),px(s.y),disc('#9dbb6a',1)); }
  for(const s of G.shots){
    if(isMod('moon')&&G.P&&Math.hypot(s.x-G.P.x,s.y-G.P.y)>135)continue;
    if(S.stage===0||S.stage===13){ for(let k=3;k>=1;k--){ c.globalAlpha=.55-k*.1; blit(c,px(s.x-s.vx*.011*k),px(s.y-s.vy*.011*k),disc(k>1?'#c0301a':s.c,Math.max(1.5,s.r*K*(1-.2*k)))); } c.globalAlpha=1; }
    blit(c,px(s.x),px(s.y),disc(s.c,Math.max(2,s.r*K)));
    if(s.seed) arcDots(s.x,s.y,s.r+15*clamp(s.fuse/1.15,0,1),0,TAU,1,s.c);
  }
  for(const p of G.parts){ c.fillStyle=p.c; const z=p.r>2&&p.t<p.life*.5?2:1; c.fillRect(px(p.x),px(p.y),z,z); }
  drawChest(c);
  for(const k of G.traps){ const on=k.arm<=0&&Math.floor(S.t*5)%2===0; blit(c,px(k.x),px(k.y),disc(k.c,on?3:2)); c.fillStyle=k.c; for(let i=0;i<4;i++){const a=i*1.57+S.t;c.fillRect(px(k.x)+Math.round(Math.cos(a)*7),px(k.y)+Math.round(Math.sin(a)*7),1,1);} }
  if(G.P&&G.P.beam&&G.B){ const col=EL[G.P.beam.s.els[0]].c; lineDots(G.P.x,G.P.y,G.B.x,G.B.y,'#0b0814',5); lineDots(G.P.x,G.P.y,G.B.x,G.B.y,col,3); lineDots(G.P.x,G.P.y,G.B.x,G.B.y,'#fffbee',1); }
  vfxDraw(c,'back');
  if(G.P){ if(S.mode==='dying'||S.mode==='dead'){ if(!S.fo) drawWizard(G.P.x,G.P.y,false,G.P.face||'north'); } else drawPlayer(); }
  vfxDraw(c,'front');
  c.setTransform(R,0,0,R,0,0); if(G.P&&S.mode!=='title') drawHUD(); if(S.open&&(S.mode==='fight'||S.mode==='intro')) oaDrawStick(c);
  if(S.flash>0){ c.fillStyle=`rgba(255,240,210,${Math.min(.5,S.flash)})`; c.fillRect(-4,-4,LW+8,G.LH+8); }
}
export function drawTitle(){
  const c=ctx; c.setTransform(R,0,0,R,0,0); c.imageSmoothingEnabled=false; c.drawImage(G.bg,0,0,LW,G.LH);
  const f=bossFrames(7); blit(c,LW/2,60+Math.round(Math.sin(S.t)*2),f[Math.floor(S.t*6)%f.length].img);
  for(let i=0;i<14;i++){ const a=S.t*.45+i/14*TAU,r=100+((S.t*38+i*18)%90); blit(c,px(W/2+Math.cos(a)*r),px(150+Math.sin(a)*r*.82),disc(i%2?'#b78cff':GOLD,2)); }
}
