// @ts-nocheck
import { W, reduced } from '../core/dom';
import { G, S } from '../core/state';
import { BOSSES } from '../data/bosses';
import { K, LW, RUNNER_ART, SPRITE_OVERRIDES, WIZ_SETS, bossFrames } from '../render/sprites';
import { codedWizardSet } from '../render/wizardArt';
import { nearMiss, rateNow } from './gear';
import { burst, hurt } from './sim';
import { oaAim } from './openArena';
import { blowTrap } from './spellFx';
import { proc } from './casting';
import { relPos, isMod } from './deck';
import { BOSS_EL, EL } from './spells';
import { FINAL_ORBS, MOTION, SPELLS, drawLow, drawOrb } from './runnerSpells';
import { $, clamp, rnd } from '../core/util';
import { sfx, tone } from '../core/audio';
import { fxShield } from '../render/vfx';
const buzz=p=>{ try{ if(navigator.vibrate)navigator.vibrate(p); }catch(e){} };

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
const KIND={ low:{y0:0,y1:44,hw:30}, high:{y0:62,y1:110,hw:30}, block:{y0:0,y1:150,hw:32}, orb:{y0:48,y1:100,hw:24}, shard:{y0:0,y1:38,hw:22}, pick:{y0:20,y1:90,hw:30} };
/** boss signature patterns (weighted up for these bosses): gears keep a beat, singers sing a melody, bulls stampede, hives swarm, frost bosses draw ice lines */
const SIG={9:'metronome',22:'metronome',37:'metronome',34:'melody',41:'melody',59:'melody',44:'melody',55:'stampede',3:'stampede',40:'stampede',10:'swarm',39:'swarm',48:'swarm',29:'swarm',18:'swarm',20:'swarm',1:'shardline',45:'shardline',60:'shardline',61:'shardline'};

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

/** material set for this boss: fire bosses get ash and ember, frost bosses ice, thorn bosses moss, the rest rotate through the four */
const runTheme=()=>{ const el=BOSS_EL[S.stage]; if(el==='fire')return 'ash'; if(el==='frost')return 'ice'; if(el==='thorn')return 'moss'; return ['flag','ash','ice','moss'][((S.stage*5)>>1)%4]; };
/* ---------- state ---------- */
export function foStart(){
  G.fo={lane:1,lx:0,h:0,vy:0,slide:0,run:0,obs:[],parts:[],dist:0,speed:340,spawnT:1.4,atk:null,linger:null,x:FO_LANES[1],dodge:0,dodgedAt:-9,castT:0,runes:[],jumpBuf:0,t:0,call:0};
  G.fo.theme=runTheme(); G.foHold=null; G.B.rad=70; syncProxies(); G.fo.hint=4;
}
function syncProxies(){
  const f=G.fo; G.B.x=cx*PX; G.B.y=(hz()+4)*PX; G.P.x=X(f.lx,0)*PX; G.P.y=(gy()-f.h-50)*PX; G.fo.x=G.P.x;
}
const mod=()=>{ const rp=.72+.03*relPos(); return (G.B.chill>0?.72:1)*(isMod('magician')?1.15:isMod('temperance')?.75:1)*(hasGearHourglass()?.9:1); };
const hasGearHourglass=()=>G.P&&G.P.gear&&Object.values(G.P.gear).some(g=>g&&g.id==='hourglass');
const flavour=()=>{ const el=BOSS_EL[S.stage], seed=(S.stage*2654435761>>>0)%1000/1000; return {el, col:G.B.color, spell:el&&EL[el]?EL[el].c:G.B.color, orb:.55+seed*.3, shard:.25+(1-seed)*.25}; };

/* ---------- input ---------- */
export function foDodge(dir){ if(!S.fo||S.mode!=='fight'||!G.fo)return; const n=clamp(G.fo.lane+dir,0,2); if(n===G.fo.lane)return; G.fo.lane=n; G.fo.dodgedAt=G.B.t; tone(380+dir*40,.05,'square',.03); }
export function foJump(){ const f=G.fo; if(!S.fo||S.mode!=='fight'||!f)return; if(f.h<=.5){ f.vy=560; f.slide=0; tone(520,.07,'square',.03); buzz(8); } }
export function foSlide(){ const f=G.fo; if(!S.fo||S.mode!=='fight'||!f)return; if(f.h>.5)f.vy=-700; f.slide=.7; tone(280,.08,'square',.03); buzz(8); }
/** nova in the runner: shatters every spell in flight (obstacles stay) */
export function foFreeze(){ const f=G.fo; let n=0; f.obs=f.obs.filter(o=>{ if(o.k==='orb'||o.k==='shard'){ n++; burst(X(o.lx,o.d)*PX,Y(o.d,50)*PX,o.col,6); return false; } return true; }); f.call=.8; const e=$('call'); e.textContent=n?'Spells shattered!':'Nova'; e.style.color='#bfeaf2'; e.hidden=false; }

/* ---------- spawning ---------- */
const shuffle=a=>{ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
function add(k,lane,extra={}){ const fl=flavour(); G.fo.obs.push({k,lane,lx:(lane-1)*LANE,d:1500,spd:0,seed:Math.random()*9,col:k==='shard'?fl.spell:fl.col,...extra}); }
function combo(n){ const f=G.fo; const before=f.combo||0; f.combo=before+n; if(Math.floor(f.combo/10)>Math.floor(before/10)){ if(G.P.spells.length)G.P.mana=Math.min(G.P.manaMax,G.P.mana+10); const e=$('call'); e.textContent='Combo x'+f.combo+'!'; e.style.color='#ffe9a8'; e.hidden=false; f.call=.8; tone(980,.12,'triangle',.05); } }
function castFx(){ G.B.atkAt=performance.now()/1000; for(let i=0;i<10;i++) G.fo.parts.push({x:cx+rnd(-18,18),y:hz()+rnd(-6,14),vx:rnd(-30,30),vy:rnd(10,60),life:rnd(.3,.7),t:0,c:G.B.color,r:1.5}); }
const orbOf=()=>{ const sh=S.stage===63?FINAL_ORBS[Math.floor(Math.random()*FINAL_ORBS.length)]:(SPELLS[S.stage]||SPELLS[0])[0], m=MOTION[sh]||MOTION.fireball; return {shape:sh,spd:m.spd,wa:m.wa,wf:m.wf}; };
const lowOf=()=>({shape:S.stage===63?['ring','flame','shard','boulder'][Math.floor(Math.random()*4)]:(SPELLS[S.stage]||SPELLS[0])[1]});
/* Patterns: each is a list of hazards with a distance offset, so a "wall" fills all three lanes (only a jump or a slide gets you through) and
   sequences ask for a rhythm. spawn() returns how long the pattern is, so the next one starts after it has passed. */
const ALL=[0,1,2], pick1=()=>Math.floor(rnd(0,3));
const PATTERNS={
  single(){ const k=['low','low','high','block'][Math.floor(Math.random()*4)], n=k==='block'?1:(Math.random()<.4?2:1); shuffle([...ALL]).slice(0,n).forEach(l=>add(k,l)); return 0; },
  wallJump(){ ALL.forEach(l=>add('low',l)); return 0; },                                         // full-width barrier: jump it
  wallSlide(){ ALL.forEach(l=>add('high',l)); return 0; },                                       // full-width hanging blades: slide under
  stagger(){ const o=Math.random()<.5?[0,1,2]:[2,1,0]; o.forEach((l,i)=>add('low',l,{d:1500+i*170})); return 340; },   // a diagonal line of barriers
  slalom(){ let l=pick1(); for(let i=0;i<3;i++){ add('block',l,{d:1500+i*300}); l=(l+1+Math.floor(rnd(0,2)))%3; } return 600; },
  gate(){ const open=pick1(); ALL.filter(l=>l!==open).forEach(l=>add('block',l)); add('high',open); return 0; },      // slide through the one gap
  rhythm(){ ALL.forEach(l=>add('low',l)); ALL.forEach(l=>add('high',l,{d:1900})); return 400; },                     // jump, then slide
  rhythm2(){ ALL.forEach(l=>add('high',l)); ALL.forEach(l=>add('low',l,{d:1900})); return 400; },                     // slide, then jump
  aimed(){ castFx(); add('orb',clamp(G.fo.lane,0,2),orbOf()); if(G.B.enraged||(G.B.def&&G.B.def.elite)){ const o=shuffle([0,1,2].filter(l=>l!==G.fo.lane))[0]; add('orb',o,{...orbOf(),d:1650}); } return 150; },
  shardMix(){ castFx(); const l=pick1(); add('shard',l,{...lowOf(),spd:300}); if(Math.random()<.6)add('orb',(l+1+Math.floor(rnd(0,2)))%3,{...orbOf(),d:1600}); return 100; },
  volley(){ castFx(); const gap=pick1(); ALL.forEach((l,i)=>{ if(l!==gap)add('orb',l,{...orbOf(),d:1500+i*120}); else add('shard',l,{...lowOf(),spd:300,d:1500+i*120}); }); return 260; },   // two orbs and a ground spell
  spellWall(){ castFx(); ALL.forEach(l=>add('shard',l,{...lowOf(),spd:120})); return 0; },                    // a wall of this boss's own ground spell: jump it
  metronome(){ for(let i=0;i<3;i++) ALL.forEach(l=>add(i===1?'high':'low',l,{d:1500+i*280})); return 560; },     // jump, slide, jump in time
  melody(){ castFx(); [0,1,2,1,0].forEach((l,i)=>add('orb',l,{...orbOf(),d:1500+i*150})); return 600; },
  stampede(){ let gap=pick1(); for(let i=0;i<4;i++){ ALL.filter(l=>l!==gap).forEach(l=>add('block',l,{d:1500+i*230})); gap=clamp(gap+(Math.random()<.5?-1:1),0,2); } return 690; },
  swarm(){ castFx(); for(let i=0;i<6;i++) add('orb',pick1(),{...orbOf(),d:1500+i*110}); return 550; },
  shardline(){ castFx(); ALL.forEach(l=>add('shard',l,{...lowOf(),spd:300,d:1500+((l*2)%3)*130})); return 400; },
  barrage(){ castFx(); const o=shuffle([...ALL]); o.forEach((l,i)=>{ if(i<2)add('orb',l,{...orbOf(),d:1500+i*260}); else add('shard',l,{...lowOf(),spd:300,d:1500+i*260}); }); return 520; },
};
function spawn(){
  const fl=flavour(), enr=G.B.enraged, lvl=relPos(), spellW=.6+fl.orb;
  const W_=[['single',30],['wallJump',13],['wallSlide',12],['aimed',20*spellW],['shardMix',11*spellW]];
  const sig=SIG[S.stage]; if(sig)W_.push([sig,18]); if(lvl>=1)W_.push(['spellWall',12*(.6+(1-fl.orb)+.3)]);
  if(lvl>=1)W_.push(['stagger',8]); if(lvl>=2)W_.push(['slalom',8],['gate',7]); if(lvl>=3||enr)W_.push(['volley',9*spellW]); if(lvl>=5||enr)W_.push(['rhythm',8],['rhythm2',6]); if(enr)W_.push(['barrage',9*spellW]);
  let r=Math.random()*W_.reduce((s,w)=>s+w[1],0), name='single'; for(const w of W_){ r-=w[1]; if(r<=0){ name=w[0]; break; } }
  G.fo.last=name; return PATTERNS[name]();
}
/** a row of mana wisps down one lane (or a heart when you are hurt): worth steering for, sometimes through danger */
function spawnPickups(){
  const f=G.fo, lane=pick1();
  const r=Math.random();
  if(G.P.hp<G.P.max&&r<.3){ add('pick',lane,{sub:'heart',d:1500}); return; }
  if(r<.42){ add('pick',lane,{sub:'shield',d:1500}); return; }
  if(r<.54){ add('pick',lane,{sub:'magnet',d:1500}); return; }
  const arc=Math.random()<.35; for(let i=0;i<5;i++) add('pick',lane,{sub:'wisp',d:1500+i*95,arcH:arc?Math.sin(i/4*Math.PI)*55:0});
}

/* ---------- update ---------- */
export function foStep(dt){
  const f=G.fo; if(!f||S.mode!=='fight')return;
  if(G.B.enraged&&!f.enr){ f.enr=true; f.slow=.9; S.shake=reduced?0:10; S.flash=.25; buzz(180); const e=$('call'); e.textContent='ENRAGED'; e.style.color='#ff7a6e'; e.hidden=false; f.call=1.1; }
  if(f.slow>0){ f.slow-=dt; dt*=.35; }
  f.t+=dt; if(f.call>0){ f.call-=dt; if(f.call<=0)$('call').hidden=true; } if(f.hint>0){ f.hint-=dt; if(f.hint<=0)$('hint').hidden=true; }
  const m=mod(), base=(320+14*relPos())*m, sp=base+(G.B.enraged?35:0);
  f.speed=sp; f.dist+=sp*dt; f.run+=dt*(8+sp/95);
  f.lx=lerp(f.lx,(f.lane-1)*LANE,Math.min(1,dt*14)); f.x=X(f.lx,0)*PX;
  if(f.h>0||f.vy!==0){ f.vy-=1800*dt; f.h+=f.vy*dt; if(f.h<=0){ f.h=0; f.vy=0; for(let i=0;i<5;i++)f.parts.push({x:X(f.lx,0)+rnd(-8,8),y:gy(),vx:rnd(-30,30),vy:rnd(-25,-5),life:.35,t:0,c:'#8a7aa8',r:1.5}); } }
  if(f.slide>0)f.slide-=dt; if(G.P.surge>0)G.P.surge-=dt;
  if(G.B.atk>0)G.B.atk-=dt;
  // spawn
  f.spawnT-=dt; if(f.spawnT<=0){ const span=spawn(), e=G.B.enraged; f.spawnT=((rnd(e?.7:.95,e?1.0:1.35)-.012*relPos())/Math.max(.8,m))+span/Math.max(200,sp); }
  f.pickT=(f.pickT??5)-dt; if(f.pickT<=0){ f.pickT=rnd(6,10); spawnPickups(); }
  // my bolts: the usual auto-fire, aimed at the boss
  G.P.cast-=dt; if(G.P.cast<=0){ G.P.cast=rateNow()*(G.P.surge>0?.55:1); const sc=G.P.scale; G.P.scale=sc*(1+Math.min(.6,(f.combo||0)*.015)); oaAim(); G.P.scale=sc; }
  for(const o of f.obs) o.d-=(sp+(o.spd||0)*m)*dt;
  // runes (trap spells): destroy any spell that crosses their lane
  for(const k of G.traps){ if(k.lane==null||k.arm>0||k.life<=0)continue; const o=f.obs.find(q=>(q.k==='orb'||q.k==='shard')&&q.lane===k.lane&&q.d<140&&q.d>-30); if(o){ o.gone=true; blowTrap(k,true); } }
  if(f.magnet>0){ f.magnet-=dt; for(const o of f.obs) if(o.k==='pick'&&o.sub!=='shield'&&o.sub!=='magnet'&&o.d<900) o.lx=lerp(o.lx,f.lx,Math.min(1,dt*4)); }
  // collisions and grazes
  const px=f.lx, top=f.slide>0?42:112;
  for(const o of f.obs){ if(o.hit||o.gone)continue; const K_=KIND[o.k];
    if(o.k==='pick'){ const hh=(o.arcH||0), y0=K_.y0+hh, y1=K_.y1+hh; if(Math.abs(o.d)<30&&Math.abs(o.lx-px)<K_.hw&&f.h<y1&&f.h+top>y0){ o.gone=true; burst(G.P.x,G.P.y-30,o.sub==='heart'?'#ff7a8a':'#7fc4ff',10); tone(o.sub==='heart'?880:760+Math.random()*120,.08,'triangle',.04); buzz(10); const say=(tx,cl)=>{ $('call').textContent=tx; $('call').style.color=cl; $('call').hidden=false; f.call=.7; };
      if(o.sub==='heart'){ G.P.hp=Math.min(G.P.max,G.P.hp+1); say('+1 heart','#ff9aa8'); combo(1); }
      else if(o.sub==='shield'){ G.P.shield=Math.max(G.P.shield,4); G.P.shieldSpell=null; if(G.P.shieldFx)G.P.shieldFx.drop(); G.P.shieldFx=fxShield('#bfeaf2'); say('Shield','#bfeaf2'); }
      else if(o.sub==='magnet'){ f.magnet=7; say('Magnet','#ffb0a0'); }
      else { combo(1); G.P.mana=Math.min(G.P.manaMax,G.P.mana+(G.P.spells.length?6:0)); G.P.surge=Math.max(G.P.surge||0,1.2); } } continue; }
    const wob=o.wa?Math.sin(f.t*(o.wf||5)+o.seed)*o.wa:0;
    if(Math.abs(o.d)<20){ if(Math.abs(o.lx+wob-px)<K_.hw+16 && f.h<K_.y1 && f.h+top>K_.y0){ o.hit=true;
        if(G.P.shield>0){ o.gone=true; burst(G.P.x,G.P.y,'#8fdcf0',14); sfx.block(); const w=G.P.shieldSpell; if(w&&Math.random()<.4)proc(w,G.P.shieldPw); }
        else { const was=G.P.hp; hurt(); if(G.P.hp<was){ f.combo=0; $('call').textContent='Hit'; $('call').style.color='#ff9d94'; $('call').hidden=false; f.call=.5; } } } }
    if(!o.grazed&&o.d<-10&&(o.k==='orb'||o.k==='shard')){ o.grazed=true; if(!o.hit&&Math.abs(o.lx+wob-px)<K_.hw+16+LANE*.55){ nearMiss(); combo(1); if(G.P.spells.length){ G.P.mana=Math.min(G.P.manaMax,G.P.mana+5); G.P.grazeGlow=.25; } } }
    if(!o.passed&&o.d<-25&&(o.k==='low'||o.k==='high'||o.k==='block')){ o.passed=true; if(!o.hit)combo(1); } }
  f.obs=f.obs.filter(o=>o.d>-60&&!o.gone);
  for(const p of f.parts){ p.t+=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; } f.parts=f.parts.filter(p=>p.t<p.life);
  if(f.h===0&&Math.random()<dt*14)f.parts.push({x:X(f.lx,0)+rnd(-8,8),y:gy()-1,vx:rnd(-20,20),vy:rnd(-14,-2),life:.3,t:0,c:'#6c5d88',r:1});
  syncProxies();
}

/* ---------- drawing ---------- */
function scene(c,fn){ c.save(); c.scale(PS,PS); fn(); c.restore(); }
/** a seamless 128px floor texture built from the arena tile set for this material */
const floorTex={};
function floorTexture(theme){
  if(floorTex[theme])return floorTex[theme];
  const sets=SPRITE_OVERRIDES.arena.sets, tiles=(sets&&sets[theme])||SPRITE_OVERRIDES.arena.tiles; if(!tiles||tiles.length<16)return null;
  const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d'); g.imageSmoothingEnabled=false;
  for(let r=0;r<4;r++)for(let q=0;q<4;q++){ const tx=q*16, ty=r*16, i=((tx*7+ty*13)>>4)%5===0?(tx>>4)%16:[0,1,8,10,13][((tx>>4)+(ty>>4))%5]; g.drawImage(tiles[i],q*32,r*32,32,32); }
  return floorTex[theme]=c;
}
const TEXEL=1.6;
export function foFloor(c){
  if(!G.fo)return; const f=G.fo, t=S.t, H=sceneH(), col=G.B.color, theme=f.theme||'flag'; syncProxies();
  scene(c,()=>{
    // sky and a gothic gate on the horizon, lit in the boss's colour
    const g=c.createLinearGradient(0,0,0,hz()+30); g.addColorStop(0,'#0a0614'); g.addColorStop(.7,'#171028'); g.addColorStop(1,'#2a1638'); c.fillStyle=g; c.fillRect(0,0,270,hz()+30);
    const gl=c.createRadialGradient(cx,hz()-20,4,cx,hz()-20,140); gl.addColorStop(0,hexA(col,.55)); gl.addColorStop(1,hexA(col,0)); c.fillStyle=gl; c.fillRect(0,0,270,hz()+60);
    const hy=hz()+2; c.fillStyle='#0c0716'; c.beginPath(); c.moveTo(cx-92,hy); c.lineTo(cx-92,hy-70); c.quadraticCurveTo(cx-92,hy-130,cx,hy-168); c.quadraticCurveTo(cx+92,hy-130,cx+92,hy-70); c.lineTo(cx+92,hy); c.fill();
    c.fillStyle='#1d1430'; c.beginPath(); c.moveTo(cx-78,hy); c.lineTo(cx-78,hy-70); c.quadraticCurveTo(cx-78,hy-118,cx,hy-152); c.quadraticCurveTo(cx+78,hy-118,cx+78,hy-70); c.lineTo(cx+78,hy); c.fill();
    const ig=c.createRadialGradient(cx,hy-60,6,cx,hy-60,100); ig.addColorStop(0,hexA(col,.7)); ig.addColorStop(1,hexA(col,.05)); c.fillStyle=ig; c.beginPath(); c.moveTo(cx-66,hy); c.lineTo(cx-66,hy-68); c.quadraticCurveTo(cx-66,hy-108,cx,hy-138); c.quadraticCurveTo(cx+66,hy-108,cx+66,hy-68); c.lineTo(cx+66,hy); c.fill();
    for(let i=0;i<40;i++){ const x=(i*97+13)%270, y=((i*53)%(hz()-30))+2, tw=(Math.sin(t*2+i)+1)/2; c.globalAlpha=.2+tw*.5; c.fillStyle=i%7?'#e8e0f4':'#ffe9a8'; c.fillRect(x,y,1,1); } c.globalAlpha=1;
    for(const sx of [-70,0,70]){ c.fillStyle=hexA(col,.05); c.beginPath(); c.moveTo(cx+sx-8,0); c.lineTo(cx+sx+8,0); c.lineTo(cx+sx*2.2+26,hz()+40); c.lineTo(cx+sx*2.2-26,hz()+40); c.fill(); }   // faint light shafts
    // textured stone floor in perspective; fades into fog towards the horizon
    const tex=floorTexture(theme), gh=gy()-hz();
    c.fillStyle='#120b1e'; c.fillRect(0,hz(),270,H-hz());
    if(tex){ c.imageSmoothingEnabled=false;
      for(let y=hz();y<H;y+=2){ const s=(y+1-hz())/gh; if(s<.2)continue; const d=F/s-F, z=d+f.dist, vrow=Math.floor(((z/TEXEL)%128+128)%128), srcW=270/s/TEXEL, k=270/srcW;
        let start=(((-cx/s)/TEXEL)%128+128)%128, left=srcW, dx=0; c.globalAlpha=clamp((s-.2)/.28,0,1)*.95;
        while(left>0.5){ const seg=Math.min(128-start,left); c.drawImage(tex,start,vrow,seg,1,dx,y,seg*k,2); dx+=seg*k; left-=seg; start=0; } }
      c.globalAlpha=1; }
    const sh=c.createLinearGradient(0,hz(),0,H); sh.addColorStop(0,'rgba(8,4,16,.75)'); sh.addColorStop(.5,'rgba(8,4,16,.5)'); sh.addColorStop(1,'rgba(8,4,16,.35)'); c.fillStyle=sh; c.fillRect(0,hz(),270,H-hz());
    const fg=c.createLinearGradient(0,hz(),0,hz()+90); fg.addColorStop(0,hexA(col,.35)); fg.addColorStop(1,hexA(col,0)); c.fillStyle=fg; c.fillRect(0,hz(),270,90);
    // wall columns down both sides
    const colArt=RUNNER_ART[theme]&&RUNNER_ART[theme].column, gap=190, off=f.dist%gap;
    for(let i=10;i>=0;i--){ const d=i*gap-off; if(d<-30)continue; const s=S_(d), yb=Y(d,0);
      for(const side of [-1,1]){
        if(colArt){ const p=prep(colArt), k=210/p.h, w=p.w*k*s, h=p.h*k*s, x=cx+side*2.2*LANE*s; c.globalAlpha=clamp((1500-d)/350,0,1); if(side<0){ c.drawImage(p.img,x-w/2,yb-h,w,h); } else { c.save(); c.translate(x,0); c.scale(-1,1); c.drawImage(p.img,-w/2,yb-h,w,h); c.restore(); } c.globalAlpha=1; }
        else { const w=30*s, h=250*s, x=cx+side*2.15*LANE*s-w/2; c.fillStyle='#241a38'; c.fillRect(x,yb-h,w,h); c.fillStyle='#0f0818'; c.fillRect(x-1,yb-h,1,h); c.fillRect(x+w,yb-h,1,h); }
      } }
    const vg=c.createLinearGradient(0,0,270,0); vg.addColorStop(0,'rgba(6,3,12,.55)'); vg.addColorStop(.2,'rgba(6,3,12,0)'); vg.addColorStop(.8,'rgba(6,3,12,0)'); vg.addColorStop(1,'rgba(6,3,12,.55)'); c.fillStyle=vg; c.fillRect(0,hz(),270,H-hz());
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
    if((f.combo||0)>=3){ c.font='700 15px "Pixelify Sans",monospace'; c.textAlign='center'; const pulse=1+Math.sin(t*8)*.04; c.save(); c.translate(cx,70); c.scale(pulse,pulse); c.fillStyle='#0b0814'; c.fillText('COMBO x'+f.combo,1,1); c.fillStyle='#ffe9a8'; c.fillText('COMBO x'+f.combo,0,0); c.restore(); }
    for(const q of f.parts){ c.globalAlpha=1-q.t/q.life; c.fillStyle=q.c; c.fillRect(Math.round(q.x),Math.round(q.y),q.r,q.r); } c.globalAlpha=1;
  });
}
function drawObs(c,o,t){
  const s=S_(o.d), wob=o.wa?Math.sin(t*(o.wf||5)+o.seed)*o.wa:0, ramp=(o.k==='orb'||o.k==='shard')?clamp((1500-o.d)/420,0,1):1, lx=lerp(0,o.lx+wob,ramp), x=X(lx,o.d), yb=Y(o.d,0), col=o.col||'#e86bd0', hi=lighten(col);
  if(o.hit)c.globalAlpha=.35;
  if(o.k==='pick'){ const yy=yb-(55+(o.arcH||0)+Math.sin(t*5+o.d*.02)*3)*s, r=Math.max(2.5,10*s), pc=o.sub==='heart'?'#ff7a8a':'#7fc4ff'; c.fillStyle=hexA(pc,.28); c.beginPath(); c.arc(x,yy,r*2,0,6.3); c.fill(); c.fillStyle='#0b0814'; c.fillRect(x-r-1,yy-r-1,r*2+2,r*2+2); c.fillStyle=pc; if(o.sub==='shield'){ c.fillStyle='#bfeaf2'; c.beginPath(); c.moveTo(x-r*.9,yy-r*.8); c.lineTo(x+r*.9,yy-r*.8); c.lineTo(x+r*.8,yy+r*.2); c.lineTo(x,yy+r*1.1); c.lineTo(x-r*.8,yy+r*.2); c.fill(); c.fillStyle='#4a7aa0'; c.fillRect(x-Math.max(.5,r*.12),yy-r*.5,Math.max(1,r*.24),r*1.1); }
    else if(o.sub==='magnet'){ c.fillStyle='#ff7a6e'; c.fillRect(x-r*.9,yy-r*.9,r*.6,r*1.2); c.fillRect(x+r*.3,yy-r*.9,r*.6,r*1.2); c.fillRect(x-r*.9,yy+r*.2,r*1.8,r*.6); c.fillStyle='#e6f0ff'; c.fillRect(x-r*.9,yy-r*.9,r*.6,r*.4); c.fillRect(x+r*.3,yy-r*.9,r*.6,r*.4); }
    else if(o.sub==='heart'){ c.fillRect(x-r,yy-r*.7,r*.9,r*.9); c.fillRect(x+r*.1,yy-r*.7,r*.9,r*.9); c.fillRect(x-r*.8,yy-r*.2,r*1.6,r*1.1); c.fillRect(x-r*.3,yy+r*.7,r*.6,r*.5); } else { c.fillRect(x-r*.6,yy-r*.6,r*1.2,r*1.2); c.fillStyle='#fff'; c.fillRect(x-r*.2,yy-r*.2,Math.max(1,r*.4),Math.max(1,r*.4)); } c.globalAlpha=1; return; }
  const art=RUNNER_ART[G.fo.theme||'flag']&&RUNNER_ART[G.fo.theme||'flag'][o.k];
  if(art&&(o.k==='low'||o.k==='high'||o.k==='block')) drawObsSprite(c,o,art,x,yb,s,col);
  else if(o.k==='low'){ const w=58*s,h=40*s; c.fillStyle='#0b0814'; c.fillRect(x-w/2-1,yb-h-1,w+2,h+1); c.fillStyle='#6e5a8c'; c.fillRect(x-w/2,yb-h,w,h); c.fillStyle='#a58ccc'; c.fillRect(x-w/2,yb-h,w,Math.max(1,4*s)); c.fillStyle=col; for(let i=0;i<3;i++){ const rx=x-w/2+w*(.2+i*.3); c.fillRect(rx,yb-h*.7,Math.max(1,5*s),Math.max(2,18*s)); }
    c.fillStyle='#cfd7e8'; for(let i=0;i<4;i++){ const sx=x-w/2+w*(i/4); c.beginPath(); c.moveTo(sx,yb-h); c.lineTo(sx+w/8,yb-h-12*s); c.lineTo(sx+w/4,yb-h); c.fill(); } }
  else if(o.k==='high'){ const w=60*s, y0=yb-110*s, y1=yb-62*s; c.fillStyle='#0b0814'; c.fillRect(x-w/2-1,y0-1,w+2,y1-y0+2); const g=c.createLinearGradient(x-w/2,0,x+w/2,0); g.addColorStop(0,'#7a8fb5'); g.addColorStop(.5,'#e6f0ff'); g.addColorStop(1,'#7a8fb5'); c.fillStyle=g; c.beginPath(); c.moveTo(x-w/2,(y0+y1)/2); c.lineTo(x-w*.2,y0); c.lineTo(x+w*.2,y0); c.lineTo(x+w/2,(y0+y1)/2); c.lineTo(x+w*.2,y1); c.lineTo(x-w*.2,y1); c.fill(); c.fillStyle=col; c.fillRect(x-w*.3,(y0+y1)/2-1,w*.6,Math.max(1,2*s)); c.fillStyle='#3a2c55'; c.fillRect(x-Math.max(1,2*s),yb-250*s,Math.max(2,4*s),(y0-(yb-250*s))); }
  else if(o.k==='block'){ const w=62*s,h=140*s; c.fillStyle='#0b0814'; c.fillRect(x-w/2-1,yb-h-1,w+2,h+1); c.fillStyle='#4a3a6a'; c.fillRect(x-w/2,yb-h,w,h); c.fillStyle='#6a5891'; c.fillRect(x-w/2,yb-h,Math.max(2,8*s),h); c.fillStyle='#312447'; c.fillRect(x+w/2-Math.max(2,8*s),yb-h,Math.max(2,8*s),h);
    c.fillStyle=col; c.beginPath(); c.moveTo(x,yb-h*.78); c.lineTo(x+w*.16,yb-h*.55); c.lineTo(x,yb-h*.32); c.lineTo(x-w*.16,yb-h*.55); c.fill(); }
  else if(o.k==='orb') drawOrb(c,o.shape||'fireball',x,yb-74*s,Math.max(3,26*s),t,o.seed,col,hi);
  else if(o.k==='shard') drawLow(c,o.shape||'shard',x,yb,s,t,o.seed,col,hi);
  c.globalAlpha=1;
}
function drawObsSprite(c,o,art,x,yb,s,col){
  const p=prep(art), fade=clamp((1500-o.d)/320,0,1), base=o.hit?.35:1; let w,h,top;
  if(o.k==='low'){ const k=Math.min(72/p.w,54/p.h); w=p.w*k; h=p.h*k; top=yb-h*s; }
  else if(o.k==='block'){ const k=Math.min(70/p.w,146/p.h); w=p.w*k; h=p.h*k; top=yb-h*s; }
  else { const k=Math.min(70/p.w,100/p.h); w=p.w*k; h=p.h*k; top=yb-(62+h)*s; c.fillStyle='#4a4458'; for(let yy=top-2;yy>-4;yy-=3*Math.max(.6,s*1.4)) c.fillRect(x-Math.max(.5,1.2*s),yy,Math.max(1,2.4*s),Math.max(1,2*Math.max(.6,s*1.4))); }
  c.globalAlpha=fade*base; c.drawImage(p.img,x-w*s/2,top,w*s,h*s); c.globalAlpha=1;
  const gc=c.createRadialGradient(x,top+h*s*.4,1,x,top+h*s*.4,Math.max(4,w*s*.7)); gc.addColorStop(0,hexA(col,.3*fade*base)); gc.addColorStop(1,hexA(col,0)); c.save(); c.globalCompositeOperation='lighter'; c.fillStyle=gc; c.fillRect(x-w*s,top-h*s*.2,w*s*2,h*s*1.4); c.restore();
}
const lighten=h=>{ const n=parseInt(h.slice(1,7),16), r=n>>16&255,g=n>>8&255,b=n&255, m=v=>Math.round(v+(255-v)*.55).toString(16).padStart(2,'0'); return '#'+m(r)+m(g)+m(b); };
/** the wizard seen from behind, running: drawn after the other world sprites so bolts leave from in front of it */
const foot0=()=>gy();
export function foPlayer(c,blink){
  if(!G.fo||!G.P)return; const f=G.fo, frames=wizFrames(), dead=S.mode==='dying'||S.mode==='dead', age=dead?(performance.now()/1000-(G.P.deathAt??performance.now()/1000)):0;
  const fr=frames[Math.floor(f.run)%frames.length], p=prep(fr), air=f.h>1, sliding=f.slide>0&&!dead;
  scene(c,()=>{
    const k=96/p.h, w=p.w*k, h=p.h*k*(sliding?.58:1), x=X(f.lx,0), foot=gy()-f.h, bob=air||S.mode!=='fight'||dead?0:Math.abs(Math.sin(f.run*Math.PI/3))*2.2;
    { const gg=c.createRadialGradient(x,gy(),2,x,gy(),36); gg.addColorStop(0,'rgba(255,233,168,'+(.34+.08*Math.sin(S.t*6)).toFixed(2)+')'); gg.addColorStop(1,'rgba(255,233,168,0)'); c.fillStyle=gg; c.beginPath(); c.ellipse(x,gy()+1,36,11,0,0,6.3); c.fill(); }   // a soft pool of light marks your lane
    c.fillStyle='rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(x,gy()+1,14-f.h*.08,4,0,0,6.3); c.fill();
    if(f.magnet>0){ c.strokeStyle='rgba(255,122,110,'+(.4+.3*Math.sin(S.t*10)).toFixed(2)+')'; c.lineWidth=1.5; c.beginPath(); c.ellipse(x,foot0()-40,46,56,0,0,6.3); c.stroke(); }
    if(blink)c.globalAlpha=.4; c.save(); c.translate(x,foot-bob); if(sliding)c.rotate(-.18); if(dead)c.rotate(Math.min(age*3.2,1.45)); c.drawImage(p.img,Math.round(-w/2),Math.round(-h),w,h); c.restore(); c.globalAlpha=1;
  });
}
export const foLaneX=lane=>X((lane-1)*LANE,0)*PX, foBodyY=()=>(gy()-50)*PX;
export const foDebugSpawn=name=>name==='pickups'?spawnPickups():PATTERNS[name]();
