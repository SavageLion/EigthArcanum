// @ts-nocheck
import { W, reduced } from '../core/dom';
import { G, S } from '../core/state';
import { BOSSES } from '../data/bosses';
import { K, LW, SPRITE_OVERRIDES, WIZ_SETS, bossFrames } from '../render/sprites';
import { codedWizardSet } from '../render/wizardArt';
import { nearMiss, rateNow } from './gear';
import { burst, hurt } from './sim';
import { oaAim } from './openArena';
import { blowTrap } from './spellFx';
import { proc } from './casting';
import { relPos, isMod } from './deck';
import { BOSS_EL, EL } from './spells';
import { $, clamp, rnd } from '../core/util';
import { sfx, tone } from '../core/audio';

/* The Runner (the "Justice" arena): you run down a three-lane corridor toward the boss on the horizon. Its spells fly down the lanes with no
   warning, and obstacles (low barriers, hanging blades, solid blocks) come with them. Jump, slide or change lane. Your bolts, spells and gear
   work as in the other arenas: the player and boss keep "proxy" positions in world units that match where they appear on screen, so bolts,
   beams, shields and effects all land in the right place. The scene is drawn in a 270-unit-wide space (PS maps it to the 160-unit canvas). */
const PS=LW/270, PX=PS/K;               // scene unit -> canvas unit, scene unit -> world unit
const F=190, LANE=78, BOSSD=1500, HZ=.27, GY=.86;
const sceneH=()=>G.LH/PS, hz=()=>Math.round(sceneH()*HZ), gy=()=>Math.round(sceneH()*GY), cx=135;
const S_=d=>F/(F+d), X=(lx,d)=>cx+lx*S_(d), Y=(d,h=0)=>hz()+(gy()-hz())*S_(d)-h*S_(d);
const lerp=(a,b,t)=>a+(b-a)*t;
export const FO_LANES=[95,200,305];
/** hazard kinds: y0..y1 is the height band each occupies, so jumping clears 'low' and 'shard', sliding clears 'high' and 'orb', and 'block' needs a lane change */
const KIND={ low:{y0:0,y1:44,hw:30}, high:{y0:62,y1:110,hw:30}, block:{y0:0,y1:150,hw:32}, orb:{y0:48,y1:100,hw:24}, shard:{y0:0,y1:38,hw:22} };

/* ---------- sprite prep: crop to the opaque box so feet and centre anchor exactly ---------- */
const prepCache=new WeakMap();
function prep(img){
  if(!img)return null; let p=prepCache.get(img); if(p)return p;
  const c=document.createElement('canvas'); c.width=img.width; c.height=img.height; const g=c.getContext('2d',{willReadFrequently:true}); g.drawImage(img,0,0);
  const d=g.getImageData(0,0,c.width,c.height).data; let x0=c.width,y0=c.height,x1=0,y1=0;
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++) if(d[(y*c.width+x)*4+3]>40){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
  if(x1<x0){ x0=0;y0=0;x1=c.width-1;y1=c.height-1; }
  const w=x1-x0+1,h=y1-y0+1, o=document.createElement('canvas'); o.width=w; o.height=h; o.getContext('2d').drawImage(c,x0,y0,w,h,0,0,w,h);
  p={img:o,w,h}; prepCache.set(img,p); return p;
}
const white=img=>{ const p=prep(img); if(p.white)return p.white; const c=document.createElement('canvas'); c.width=p.w; c.height=p.h; const g=c.getContext('2d'); g.drawImage(p.img,0,0); g.globalCompositeOperation='source-in'; g.fillStyle='#fff'; g.fillRect(0,0,p.w,p.h); p.white=c; return c; };
function wizFrames(){
  const id=G.P&&G.P.wizard, raven=!id||id==='raven';
  if(raven){ const w=SPRITE_OVERRIDES.anim.arena.walk&&SPRITE_OVERRIDES.anim.arena.walk.north; if(w) return w.frames.map(f=>f.img); const d=SPRITE_OVERRIDES.wizardDirs; if(d)return [d.north.img]; }
  const W_=WIZ_SETS[id]; if(W_)return [W_.dirs.north.img]; return [codedWizardSet(id).north.img];
}

/* ---------- state ---------- */
export function foStart(){
  G.fo={lane:1,lx:0,h:0,vy:0,slide:0,run:0,obs:[],parts:[],dist:0,speed:340,spawnT:1.4,atk:null,linger:null,x:FO_LANES[1],dodge:0,dodgedAt:-9,castT:0,runes:[],jumpBuf:0,t:0,call:0};
  G.foHold=null; G.B.rad=70; syncProxies(); G.fo.hint=4;
}
function syncProxies(){
  const f=G.fo; G.B.x=cx*PX; G.B.y=(hz()+4)*PX; G.P.x=X(f.lx,0)*PX; G.P.y=(gy()-f.h-50)*PX; G.fo.x=G.P.x;
}
const mod=()=>{ const rp=.72+.03*relPos(); return (G.B.chill>0?.72:1)*(isMod('magician')?1.15:isMod('temperance')?.75:1)*(hasGearHourglass()?.9:1); };
const hasGearHourglass=()=>G.P&&G.P.gear&&Object.values(G.P.gear).some(g=>g&&g.id==='hourglass');
const flavour=()=>{ const el=BOSS_EL[S.stage], seed=(S.stage*2654435761>>>0)%1000/1000; return {el, col:G.B.color, spell:el&&EL[el]?EL[el].c:G.B.color, orb:.55+seed*.3, shard:.25+(1-seed)*.25}; };

/* ---------- input ---------- */
export function foDodge(dir){ if(!S.fo||S.mode!=='fight'||!G.fo)return; const n=clamp(G.fo.lane+dir,0,2); if(n===G.fo.lane)return; G.fo.lane=n; G.fo.dodgedAt=G.B.t; tone(380+dir*40,.05,'square',.03); }
export function foJump(){ const f=G.fo; if(!S.fo||S.mode!=='fight'||!f)return; if(f.h<=.5){ f.vy=560; f.slide=0; tone(520,.07,'square',.03); } }
export function foSlide(){ const f=G.fo; if(!S.fo||S.mode!=='fight'||!f)return; if(f.h>.5)f.vy=-700; f.slide=.7; tone(280,.08,'square',.03); }
/** nova in the runner: shatters every spell in flight (obstacles stay) */
export function foFreeze(){ const f=G.fo; let n=0; f.obs=f.obs.filter(o=>{ if(o.k==='orb'||o.k==='shard'){ n++; burst(X(o.lx,o.d)*PX,Y(o.d,50)*PX,o.col,6); return false; } return true; }); f.call=.8; const e=$('call'); e.textContent=n?'Spells shattered!':'Nova'; e.style.color='#bfeaf2'; e.hidden=false; }

/* ---------- spawning ---------- */
const shuffle=a=>{ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
function add(k,lane,extra={}){ const fl=flavour(); G.fo.obs.push({k,lane,lx:(lane-1)*LANE,d:1500,spd:0,seed:Math.random()*9,col:k==='shard'?fl.spell:fl.col,...extra}); }
function castFx(){ G.B.atkAt=performance.now()/1000; for(let i=0;i<10;i++) G.fo.parts.push({x:cx+rnd(-18,18),y:hz()+rnd(-6,14),vx:rnd(-30,30),vy:rnd(10,60),life:rnd(.3,.7),t:0,c:G.B.color,r:1.5}); }
function spawn(){
  const fl=flavour(), enr=G.B.enraged, r=Math.random(), pl=clamp(G.fo.lane,0,2), elite=G.B.def&&G.B.def.elite;
  const pObs=.46, pOrb=pObs+fl.orb*.34, pShard=1; // roughly: obstacles ~46%, orbs, then shards
  if(r<pObs){
    const q=Math.random();
    if(q<.45){ const n=Math.random()<.4?2:1; shuffle([0,1,2]).slice(0,n).forEach(l=>add('low',l)); }
    else if(q<.75){ const open=Math.floor(rnd(0,3)); [0,1,2].filter(l=>l!==open).forEach(l=>add('block',l)); if(enr)add('low',open,{d:1750}); }
    else { const n=Math.random()<.5?2:1; shuffle([0,1,2]).slice(0,n).forEach(l=>add('high',l)); }
  } else if(r<pOrb){ castFx(); add('orb',pl,{spd:240,wob:true}); if(enr||elite){ const o=shuffle([0,1,2].filter(l=>l!==pl))[0]; add('orb',o,{spd:240,wob:true,d:1650}); } }
  else { castFx(); const l=Math.floor(rnd(0,3)); add('shard',l,{spd:300}); if(Math.random()<.5)add('orb',(l+1+Math.floor(rnd(0,2)))%3,{spd:240,wob:true,d:1600}); }
}

/* ---------- update ---------- */
export function foStep(dt){
  const f=G.fo; if(!f||S.mode!=='fight')return;
  f.t+=dt; if(f.call>0){ f.call-=dt; if(f.call<=0)$('call').hidden=true; } if(f.hint>0){ f.hint-=dt; if(f.hint<=0)$('hint').hidden=true; }
  const m=mod(), base=(320+14*relPos())*m, sp=base+(G.B.enraged?35:0);
  f.speed=sp; f.dist+=sp*dt; f.run+=dt*(8+sp/95);
  f.lx=lerp(f.lx,(f.lane-1)*LANE,Math.min(1,dt*14)); f.x=X(f.lx,0)*PX;
  if(f.h>0||f.vy!==0){ f.vy-=1800*dt; f.h+=f.vy*dt; if(f.h<=0){ f.h=0; f.vy=0; for(let i=0;i<5;i++)f.parts.push({x:X(f.lx,0)+rnd(-8,8),y:gy(),vx:rnd(-30,30),vy:rnd(-25,-5),life:.35,t:0,c:'#8a7aa8',r:1.5}); } }
  if(f.slide>0)f.slide-=dt;
  if(G.B.atk>0)G.B.atk-=dt;
  // spawn
  f.spawnT-=dt; if(f.spawnT<=0){ spawn(); const e=G.B.enraged; f.spawnT=(rnd(e?.7:.95,e?1.0:1.35)-.012*relPos())/Math.max(.8,m); }
  // my bolts: the usual auto-fire, aimed at the boss
  G.P.cast-=dt; if(G.P.cast<=0){ G.P.cast=rateNow()*(G.P.surge>0?.55:1); oaAim(); }
  for(const o of f.obs) o.d-=(sp+(o.spd||0)*m)*dt;
  // runes (trap spells): destroy any spell that crosses their lane
  for(const k of G.traps){ if(k.lane==null||k.arm>0||k.life<=0)continue; const o=f.obs.find(q=>(q.k==='orb'||q.k==='shard')&&q.lane===k.lane&&q.d<140&&q.d>-30); if(o){ o.gone=true; blowTrap(k,true); } }
  // collisions and grazes
  const px=f.lx, top=f.slide>0?42:112;
  for(const o of f.obs){ if(o.hit||o.gone)continue; const K_=KIND[o.k], wob=o.wob?Math.sin(f.t*5+o.seed)*14:0;
    if(Math.abs(o.d)<20){ if(Math.abs(o.lx+wob-px)<K_.hw+16 && f.h<K_.y1 && f.h+top>K_.y0){ o.hit=true;
        if(G.P.shield>0){ o.gone=true; burst(G.P.x,G.P.y,'#8fdcf0',14); sfx.block(); const w=G.P.shieldSpell; if(w&&Math.random()<.4)proc(w,G.P.shieldPw); }
        else { const was=G.P.hp; hurt(); if(G.P.hp<was){ $('call').textContent='Hit'; $('call').style.color='#ff9d94'; $('call').hidden=false; f.call=.5; } } } }
    if(!o.grazed&&o.d<-10&&(o.k==='orb'||o.k==='shard')){ o.grazed=true; if(!o.hit&&Math.abs(o.lx+wob-px)<K_.hw+16+LANE*.55){ nearMiss(); if(G.P.spells.length){ G.P.mana=Math.min(G.P.manaMax,G.P.mana+5); G.P.grazeGlow=.25; } } } }
  f.obs=f.obs.filter(o=>o.d>-60&&!o.gone);
  for(const p of f.parts){ p.t+=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; } f.parts=f.parts.filter(p=>p.t<p.life);
  if(f.h===0&&Math.random()<dt*14)f.parts.push({x:X(f.lx,0)+rnd(-8,8),y:gy()-1,vx:rnd(-20,20),vy:rnd(-14,-2),life:.3,t:0,c:'#6c5d88',r:1});
  syncProxies();
}

/* ---------- drawing ---------- */
function scene(c,fn){ c.save(); c.scale(PS,PS); fn(); c.restore(); }
export function foFloor(c){
  if(!G.fo)return; const f=G.fo, t=S.t, H=sceneH(), col=G.B.color; syncProxies();
  scene(c,()=>{
    const g=c.createLinearGradient(0,0,0,hz()+30); g.addColorStop(0,'#0c0716'); g.addColorStop(.7,'#1d1030'); g.addColorStop(1,'#3a1844'); c.fillStyle=g; c.fillRect(0,0,270,hz()+30);
    for(let i=0;i<46;i++){ const x=(i*97+13)%270, y=((i*53)%(hz()-6))+2, tw=(Math.sin(t*2+i)+1)/2; c.globalAlpha=.25+tw*.6; c.fillStyle=i%7?'#e8e0f4':'#ffe9a8'; c.fillRect(x,y,1,1); } c.globalAlpha=1;
    const gl=c.createRadialGradient(cx,hz(),4,cx,hz(),120); gl.addColorStop(0,hexA(col,.5)); gl.addColorStop(1,hexA(col,0)); c.fillStyle=gl; c.fillRect(0,0,270,hz()+60);
    for(let y=hz();y<H;y+=2){ const s=(y+1-hz())/(gy()-hz()); if(s<.012)continue; const d=F/s-F, z=d+f.dist, par=Math.floor(z/64)&1, rw=1.5*LANE*s;
      c.fillStyle=par?'#150e22':'#1a1229'; c.fillRect(0,y,270,2); c.fillStyle=par?'#2a2040':'#31264a'; c.fillRect(cx-rw,y,rw*2,2);
      c.fillStyle=hexA(col,.5*Math.min(1,s+.2)); for(const k of [-1.5,-.5,.5,1.5]) c.fillRect(Math.round(cx+k*LANE*s),y,Math.abs(k)===1.5?2:1.5,2); }
    const fg=c.createLinearGradient(0,hz(),0,hz()+70); fg.addColorStop(0,'rgba(58,24,68,.95)'); fg.addColorStop(1,'rgba(58,24,68,0)'); c.fillStyle=fg; c.fillRect(0,hz(),270,70);
    const gap=170, off=f.dist%gap;
    for(let i=11;i>=0;i--){ const d=i*gap-off; if(d<-20)continue; const s=S_(d), w=30*s, h=250*s, yb=Y(d,0);
      for(const side of [-1,1]){ const x=cx+side*2.15*LANE*s-w/2; c.fillStyle='#241a38'; c.fillRect(x,yb-h,w,h); c.fillStyle='#3a2c55'; c.fillRect(x+(side>0?0:w-Math.max(1,3*s)),yb-h,Math.max(1,3*s),h); c.fillStyle='#0f0818'; c.fillRect(x-1,yb-h,1,h); c.fillRect(x+w,yb-h,1,h);
        const fy=yb-h*.62, fl=Math.sin(t*9+i*3+side)*.5+.5; c.fillStyle='rgba(255,154,60,'+(.18+.1*fl).toFixed(2)+')'; c.beginPath(); c.arc(x+w/2,fy,Math.max(2,15*s),0,6.3); c.fill(); c.fillStyle=fl>.5?'#ffcf6e':'#f2a03d'; c.fillRect(x+w/2-Math.max(1,2*s),fy-Math.max(2,6*s),Math.max(2,4*s),Math.max(2,8*s)); } }
  });
}
function hexA(h,a){ const n=parseInt(h.slice(1,7),16); return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`; }
export function foBoss(c){
  if(!G.fo)return; const f=G.fo, t=S.t;
  scene(c,()=>{
    const fr=bossFrames(S.stage), atk=SPRITE_OVERRIDES.bossAtk[S.stage], age=performance.now()/1000-(G.B.atkAt??-9);
    const sprite=(atk&&age<.5)?atk[Math.min(atk.length-1,Math.floor(age*atk.length/.5))]:fr[Math.floor(t*6)%fr.length], p=prep(sprite.img);
    const k=Math.min(175/p.w,190/p.h), w=p.w*k, h=p.h*k, bx=cx+(G.B.enraged&&!reduced?(Math.floor(t*14)%2):0), by=hz()-h*.46+Math.sin(t*1.6)*3;
    const gl=c.createRadialGradient(bx,by+h*.4,4,bx,by+h*.4,95); gl.addColorStop(0,hexA(G.B.color,.32)); gl.addColorStop(1,hexA(G.B.color,0)); c.fillStyle=gl; c.fillRect(bx-100,by-60,200,220);
    c.drawImage(p.img,Math.round(bx-w/2),Math.round(by),w,h);
    if(G.B.flash>0){ c.globalAlpha=.6; c.drawImage(white(sprite.img),Math.round(bx-w/2),Math.round(by),w,h); c.globalAlpha=1; }
    if(G.B.chill>0){ c.globalAlpha=.3; c.drawImage(white(sprite.img),Math.round(bx-w/2),Math.round(by),w,h); c.globalAlpha=1; }
    // hazards, far to near
    const items=[...f.obs].sort((a,b)=>b.d-a.d); for(const o of items) drawObs(c,o,t);
    for(const q of f.parts){ c.globalAlpha=1-q.t/q.life; c.fillStyle=q.c; c.fillRect(Math.round(q.x),Math.round(q.y),q.r,q.r); } c.globalAlpha=1;
  });
}
function drawObs(c,o,t){
  const s=S_(o.d), wob=o.wob?Math.sin(t*5+o.seed)*14:0, ramp=(o.k==='orb'||o.k==='shard')?clamp((1500-o.d)/420,0,1):1, lx=lerp(0,o.lx+wob,ramp), x=X(lx,o.d), yb=Y(o.d,0), col=o.col||'#e86bd0', hi=lighten(col);
  if(o.hit)c.globalAlpha=.35;
  if(o.k==='low'){ const w=58*s,h=40*s; c.fillStyle='#0b0814'; c.fillRect(x-w/2-1,yb-h-1,w+2,h+1); c.fillStyle='#6e5a8c'; c.fillRect(x-w/2,yb-h,w,h); c.fillStyle='#a58ccc'; c.fillRect(x-w/2,yb-h,w,Math.max(1,4*s)); c.fillStyle=col; for(let i=0;i<3;i++){ const rx=x-w/2+w*(.2+i*.3); c.fillRect(rx,yb-h*.7,Math.max(1,5*s),Math.max(2,18*s)); }
    c.fillStyle='#cfd7e8'; for(let i=0;i<4;i++){ const sx=x-w/2+w*(i/4); c.beginPath(); c.moveTo(sx,yb-h); c.lineTo(sx+w/8,yb-h-12*s); c.lineTo(sx+w/4,yb-h); c.fill(); } }
  else if(o.k==='high'){ const w=60*s, y0=yb-110*s, y1=yb-62*s; c.fillStyle='#0b0814'; c.fillRect(x-w/2-1,y0-1,w+2,y1-y0+2); const g=c.createLinearGradient(x-w/2,0,x+w/2,0); g.addColorStop(0,'#7a8fb5'); g.addColorStop(.5,'#e6f0ff'); g.addColorStop(1,'#7a8fb5'); c.fillStyle=g; c.beginPath(); c.moveTo(x-w/2,(y0+y1)/2); c.lineTo(x-w*.2,y0); c.lineTo(x+w*.2,y0); c.lineTo(x+w/2,(y0+y1)/2); c.lineTo(x+w*.2,y1); c.lineTo(x-w*.2,y1); c.fill(); c.fillStyle=col; c.fillRect(x-w*.3,(y0+y1)/2-1,w*.6,Math.max(1,2*s)); c.fillStyle='#3a2c55'; c.fillRect(x-Math.max(1,2*s),yb-250*s,Math.max(2,4*s),(y0-(yb-250*s))); }
  else if(o.k==='block'){ const w=62*s,h=140*s; c.fillStyle='#0b0814'; c.fillRect(x-w/2-1,yb-h-1,w+2,h+1); c.fillStyle='#4a3a6a'; c.fillRect(x-w/2,yb-h,w,h); c.fillStyle='#6a5891'; c.fillRect(x-w/2,yb-h,Math.max(2,8*s),h); c.fillStyle='#312447'; c.fillRect(x+w/2-Math.max(2,8*s),yb-h,Math.max(2,8*s),h);
    c.fillStyle=col; c.beginPath(); c.moveTo(x,yb-h*.78); c.lineTo(x+w*.16,yb-h*.55); c.lineTo(x,yb-h*.32); c.lineTo(x-w*.16,yb-h*.55); c.fill(); }
  else if(o.k==='orb'){ const r=Math.max(3,26*s), y=yb-74*s, pulse=1+Math.sin(t*14+o.seed)*.12;
    c.fillStyle=hexA(col,.28); c.beginPath(); c.arc(x,y,r*1.9*pulse,0,6.3); c.fill(); c.fillStyle=hexA(hi,.45); c.beginPath(); c.arc(x,y,r*1.25,0,6.3); c.fill();
    c.fillStyle=col; c.beginPath(); c.arc(x,y,r,0,6.3); c.fill(); c.fillStyle=hi; c.beginPath(); c.arc(x-r*.2,y-r*.2,r*.5,0,6.3); c.fill();
    for(let i=0;i<4;i++){ const a=t*7+i*1.6+o.seed; c.fillStyle=hi; c.fillRect(x+Math.cos(a)*r*1.5,y+Math.sin(a)*r*1.5,Math.max(1,2*s),Math.max(1,2*s)); } }
  else if(o.k==='shard'){ const w=44*s,h=52*s, y=yb-h*.5, spin=t*6+o.seed; c.fillStyle=hexA(col,.25); c.beginPath(); c.arc(x,y,w*.9,0,6.3); c.fill();
    c.fillStyle='#0b0814'; c.beginPath(); c.moveTo(x,yb-h-1); c.lineTo(x+w*.5+1,yb-h*.35); c.lineTo(x+w*.25,yb+1); c.lineTo(x-w*.25,yb+1); c.lineTo(x-w*.5-1,yb-h*.35); c.fill();
    c.fillStyle=col; c.beginPath(); c.moveTo(x,yb-h); c.lineTo(x+w*.5,yb-h*.35); c.lineTo(x+w*.25,yb); c.lineTo(x-w*.25,yb); c.lineTo(x-w*.5,yb-h*.35); c.fill(); c.fillStyle=hi; c.fillRect(x-w*.12+Math.sin(spin)*w*.12,yb-h*.85,Math.max(1,w*.14),h*.55); }
  c.globalAlpha=1;
}
const lighten=h=>{ const n=parseInt(h.slice(1,7),16), r=n>>16&255,g=n>>8&255,b=n&255, m=v=>Math.round(v+(255-v)*.55).toString(16).padStart(2,'0'); return '#'+m(r)+m(g)+m(b); };
/** the wizard seen from behind, running: drawn after the other world sprites so bolts leave from in front of it */
export function foPlayer(c,blink){
  if(!G.fo||!G.P)return; const f=G.fo, frames=wizFrames(), dead=S.mode==='dying'||S.mode==='dead', age=dead?(performance.now()/1000-(G.P.deathAt??performance.now()/1000)):0;
  const fr=frames[Math.floor(f.run)%frames.length], p=prep(fr), air=f.h>1, sliding=f.slide>0&&!dead;
  scene(c,()=>{
    const k=96/p.h, w=p.w*k, h=p.h*k*(sliding?.58:1), x=X(f.lx,0), foot=gy()-f.h, bob=air||S.mode!=='fight'||dead?0:Math.abs(Math.sin(f.run*Math.PI/3))*2.2;
    c.fillStyle='rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(x,gy()+1,14-f.h*.08,4,0,0,6.3); c.fill();
    if(blink)c.globalAlpha=.4; c.save(); c.translate(x,foot-bob); if(sliding)c.rotate(-.18); if(dead)c.rotate(Math.min(age*3.2,1.45)); c.drawImage(p.img,Math.round(-w/2),Math.round(-h),w,h); c.restore(); c.globalAlpha=1;
  });
}
export const foLaneX=lane=>X((lane-1)*LANE,0)*PX, foBodyY=()=>(gy()-50)*PX;
