// @ts-nocheck
import { FLOOR, W, reduced } from '../core/dom';
import { G, S } from '../core/state';
import { KEYS } from '../core/input';
import { BOSSES } from '../data/bosses';
import { every } from './attacks';
import { doCast, has, proc } from './casting';
import { CY, ECHO, RI, RO, hasPerk, hasWand, isMod, relPos, toBoss, total } from './deck';
import { die, foStep, showDead, showPick, showVictory, win } from './faceoff';
import { chestSay, chestStep, hasGear, nearMiss, rateNow } from './gear';
import { sideMove } from './sideView';
import { inPillar, oaAim, oaBoss, oaMove } from './openArena';
import { beamStep, trapStep } from './spellFx';
import { recipeOf } from './spells';
import { GOLD, TAU, clamp, rnd } from '../core/util';
import { setMusicEnergy, sfx } from '../core/audio';

/* ---------- damage and hits ---------- */
export function damage(d){ if(!G.B||S.mode!=='fight')return; if(S.fo)d*=G.B.open>0?2:.34;
  if(hasGear('crown'))d*=1.4;
  G.B.hp-=d*(isMod('tower')?1.5:(isMod('moon')||isMod('hanged'))?1.25:1); if(d>=G.P.scale*3)G.B.flash=.05; if(G.B.hp<=0){G.B.hp=0;win();} }
export function burst(x,y,c,n){ for(let i=0;i<n&&G.parts.length<320;i++){ const a=rnd(0,TAU),s=rnd(30,n>5?260:90); G.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,c,life:rnd(.25,.8),t:0,r:rnd(1,3)}); } }
function clearNear(r){ G.shots=G.shots.filter(s=>{ if(Math.hypot(s.x-G.P.x,s.y-G.P.y)<r){burst(s.x,s.y,GOLD,1);return false} return true; }); }
import { fxExplosion, fxImpact, fxShield, fxShieldHit } from '../render/vfx';
export function hurt(){
  if(G.P.inv>0||S.mode!=='fight'||G.P.shield>0)return;
  if(!S.god&&hasGear('moon')&&!G.P.moonUsed){G.P.moonUsed=true;G.P.inv=1;burst(G.P.x,G.P.y,'#e6dcef',16);sfx.block();chestSay('Blocked by the locket','#e6dcef');return;}
  if(S.god){S.hits++;G.P.inv=1.4;G.P.hurtAt=performance.now()/1000;return;}
  G.P.hurtAt=performance.now()/1000; fxImpact(G.P.x,G.P.y,'#ff7a6e'); G.P.cleanFight=false; if(hasGear('blood'))G.P.mana=G.P.manaMax; G.P.hp-=isMod('tower')?2:1; if(hasWand('warding')&&G.P.hp>0){G.P.shield=2;G.P.shieldSpell=null; if(G.P.shieldFx)G.P.shieldFx.drop(); G.P.shieldFx=fxShield('#bfeaf2');} S.hits++; G.P.inv=1.5; S.shake=reduced?0:8; S.flash=.28; sfx.hurt(); burst(G.P.x,G.P.y,'#ff7a6e',16); clearNear(90);
  if(G.P.hp<=0) die();
}

/* ---------- simulation ---------- */
export function step(dt){
  S.t+=dt;
  S.shake=Math.max(0,S.shake-dt*30); S.flash=Math.max(0,S.flash-dt);
  const fighting=S.mode==='fight';
  if(fighting||S.mode==='intro') S.runSeconds+=dt;
  if(G.P&&(fighting||S.mode==='intro')){ const kx=(KEYS.right?1:0)-(KEYS.left?1:0), ky=(KEYS.down?1:0)-(KEYS.up?1:0); if(S.open||S.fo||S.side){}else if(S.orbit){G.P.a-=kx*2.4*dt;}else{G.P.x+=kx*300*dt; G.P.y+=ky*300*dt;} }
  if(G.P){ if(S.open||S.side){}else if(S.fo&&G.fo){}else if(S.orbit&&G.B){G.P.rr+=(G.P.tr-G.P.rr)*Math.min(1,dt*16);G.P.x=W/2+Math.cos(G.P.a)*G.P.rr;G.P.y=CY()+Math.sin(G.P.a)*G.P.rr;}else{G.P.x=clamp(G.P.x,18,W-18);G.P.y=clamp(G.P.y,G.H*.4,G.H-96);} G.P.inv=Math.max(0,G.P.inv-dt); G.P.vx=G.P.vx*.8+(G.P.x-(G.P.lx??G.P.x))*.2; G.P.lx=G.P.x; }
  if(S.mode==='intro'&&S.t>1.5){S.mode='fight';S.t=0;}
  if(G.B&&S.mode!=='title'){
    G.B.flash=Math.max(0,G.B.flash-dt);
    if(fighting||S.mode==='intro'){
      G.B.t+=dt;
      if(S.open){} else if(S.fo){G.B.x=W/2;G.B.y=G.H*.3;} else if(S.orbit){G.B.x=W/2;G.B.y=CY()+Math.sin(G.B.t*1.3)*3;} else if(G.B.def.move) G.B.def.move(G.B,dt); else { G.B.x=W/2+Math.sin(G.B.t*.7)*105; G.B.y=150+Math.sin(G.B.t*1.3)*10; }
    }
  }
  if(fighting){
    G.DT=dt/(G.B.chill>0?1.4:1)*(.72+.03*relPos())*(hasGear('hourglass')?.9:1)*(isMod('magician')?1.15:isMod('temperance')?.75:1);
    const ph=G.B.hp<G.B.max/2;
    if(ph&&!G.B.enraged){G.B.enraged=true;setMusicEnergy(3,true);S.flash=.2;S.shake=reduced?0:5;sfx.rage();burst(G.B.x,G.B.y,G.B.color,30);}
    if(S.side)sideMove(dt); if(S.fo)foStep(dt); else if(S.open){ oaMove(dt); oaBoss(dt); if(S.mode==='fight'&&G.oa.state==='chase')G.B.def.attack(ph); } else G.B.def.attack(ph);
    if(!S.fo&&S.mode==='fight'&&S.echo!==null&&(!S.open||G.oa.state==='chase')) ECHO[S.echo].fn(BOSSES[S.echo].color);
    if(S.orbit) every('bloom',ph?4:5.5,()=>{G.B.bloomOuter=!G.B.bloomOuter;G.bands.push({r:G.B.bloomOuter?RO:RI,w:40,t:0,warn:.85,on:.3,hit:false});});
    if(S.mode==='fight')beamStep(dt);
    if(S.mode==='fight')trapStep(dt);
    if(S.mode==='fight')chestStep(dt);
    G.P.mana=Math.min(G.P.manaMax,G.P.mana+(G.P.spells.length?7*(isMod('star')||isMod('hermit')?2:1)*(hasGear('pilgrim')?1.4:1)*dt:0)); G.P.cd=Math.max(0,G.P.cd-dt); G.P.shield=Math.max(0,G.P.shield-dt); if(G.P.shield<=0&&G.P.shieldFx){G.P.shieldFx.drop();G.P.shieldFx=null;} G.B.chill=Math.max(0,G.B.chill-dt);
    if(!S.fo)G.P.cast-=dt; if(S.open){ if(G.still>.1&&G.P.cast<=0){G.P.cast=rateNow();oaAim();} } else if(!S.fo&&G.P.cast<=0){G.P.cast+=rateNow(); if(!isMod('hermit')){ const n=hasWand('fork')?2:1; for(let i=0;i<n;i++){ const off=n>1?(i-.5)*14:0, crit=(hasWand('gambler')&&Math.random()<.15)||(hasPerk('lucky')&&Math.random()<.1), m=crit?5:1, wc=crit?'#f0a8d8':undefined, sx=G.P.x+off;
      if(S.orbit)G.bolts.push({x:sx,y:G.P.y,...toBoss(sx,G.P.y,620),d:G.P.scale*m*(G.P.tr===RI?1.5:1),r:crit?5:3,c:wc||'#ffe9a8',basic:true}); else G.bolts.push({x:sx,y:G.P.y-22,vy:-640,d:G.P.scale*m,r:crit?6:4,c:wc,basic:true}); } }}
    if(G.B.burning>0){G.B.burning-=dt;damage(5*G.P.scale*dt);}
    for(const h of G.helpers){ h.life-=dt;h.a+=dt*2.4;h.cd-=dt; const hx=G.P.x+Math.cos(h.a)*42,hy=G.P.y+Math.sin(h.a)*30; h.x=hx;h.y=hy;
      if(h.cd<=0){h.cd=.45;G.bolts.push({x:hx,y:hy,...toBoss(hx,hy,620),d:h.d,r:4.5,c:h.c,spell:h.s,pw:h.pw,pc:.25});} }
    G.helpers=G.helpers.filter(h=>h.life>0);
  }
  const hurtR=G.P?G.P.hit:5;
  for(const b of G.bolts){ if(b.basic&&hasWand('hunter')&&fighting){const v=toBoss(b.x,b.y,640);b.vx=(b.vx||0)+(v.vx-(b.vx||0))*Math.min(1,dt*7);} b.x+=(b.vx||0)*dt;b.y+=b.vy*dt; if(fighting&&Math.hypot(b.x-G.B.x,b.y-G.B.y)<G.B.rad+b.r){b.dead=true;if(b.spell||b.d>5)fxImpact(b.x,b.y,b.c||'#ffe9a8');if(b.basic&&hasWand('siphon')&&G.P.spells.length)G.P.mana=Math.min(G.P.manaMax,G.P.mana+1);damage(b.d);burst(b.x,b.y,b.c||G.B.color,b.spell?6:1);if(b.spell&&Math.random()<(b.pc??1))proc(b.spell,b.pw);} if(b.y<-20||b.y>G.H+20||b.x<-20||b.x>W+20)b.dead=true; if(!b.dead&&G.pillars.length&&inPillar(b.x,b.y)){b.dead=true;burst(b.x,b.y,'#b5afc2',2);} }
  G.bolts=G.bolts.filter(b=>!b.dead);
  for(const s of G.seeds){
    if(s.recast){s.delay-=dt;if(s.delay<=0){s.dead=true;if(fighting)doCast(s.recast,.6);}continue;}
    const dx=G.B.x-s.x,dy=G.B.y-s.y,l=Math.hypot(dx,dy)||1; s.vx+=dx/l*900*dt;s.vy+=dy/l*900*dt; s.vx*=.985;s.vy*=.985;s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
    if(l<G.B.rad-2&&fighting){damage(s.d);burst(s.x,s.y,'#9dbb6a',4);s.dead=true;} if(s.life<=0)s.dead=true;
  }
  G.seeds=G.seeds.filter(s=>!s.dead);
  const add=[];
  for(const s of G.shots){
    if(s.home>0&&G.P&&fighting){ s.home-=dt; const sp=Math.hypot(s.vx,s.vy),cur=Math.atan2(s.vy,s.vx),want=Math.atan2(G.P.y-s.y,G.P.x-s.x),d=((want-cur+Math.PI*3)%TAU)-Math.PI,na=cur+clamp(d,-2.1*dt,2.1*dt); s.vx=Math.cos(na)*sp;s.vy=Math.sin(na)*sp; }
    if(s.stall!==undefined&&!s.fired){ s.stall-=dt; s.vx*=Math.pow(.05,dt);s.vy*=Math.pow(.05,dt); if(s.stall<=0&&G.P){ s.fired=true; const a=Math.atan2(G.P.y-s.y,G.P.x-s.x); s.vx=Math.cos(a)*s.sp;s.vy=Math.sin(a)*s.sp; } }
    if(s.ret){ s.vx0=s.vx0??s.vx;s.vy0=s.vy0??s.vy; s.vx-=s.vx0*s.ret*dt*1.5;s.vy-=s.vy0*s.ret*dt*1.5; }
    s.x+=s.vx*dt;s.y+=s.vy*dt;
    if(s.bounce>0){
      if(s.x<12||s.x>W-12){s.vx*=-1;s.x=clamp(s.x,12,W-12);s.bounce--;}
      if(s.floor&&s.y>FLOOR()-6){s.vy*=-1;s.y=FLOOR()-6;s.bounce--;}
    }
    if(s.fuse!==undefined){ s.fuse-=dt; if(s.fuse<=0){ s.dead=true; const n=s.burst; for(let i=0,o=rnd(0,TAU);i<n;i++){const a=o+i/n*TAU;add.push({x:s.x,y:s.y,vx:Math.cos(a)*120,vy:Math.sin(a)*120,r:5,c:s.c,grazed:false});} } }
    if(s.x<-30||s.x>W+30||s.y<-30||s.y>G.H+30)s.dead=true;
    if(!s.dead&&G.pillars.length&&inPillar(s.x,s.y)){s.dead=true;burst(s.x,s.y,'#b5afc2',1);}
    if(G.P&&fighting&&!s.dead&&!s.seed){
      const d=Math.hypot(s.x-G.P.x,s.y-G.P.y);
      if(G.P.shield>0&&d<28+s.r){
        s.dead=true; burst(s.x,s.y,'#8fdcf0',2); fxShieldHit(G.P.shieldFx,s.x,s.y); const w=G.P.shieldSpell;
        if(w){ if(Math.random()<.4)proc(w,G.P.shieldPw); const r=recipeOf(w); if(has(w,'mirror')||(r&&r.id==='hall')) G.bolts.push({x:s.x,y:s.y,...toBoss(s.x,s.y,640),d:1.5*G.P.shieldPw,r:4,c:'#f0a8d8'}); }
      }
      else if(d<s.r*.72+hurtR){s.dead=true;hurt();}
      else if(!s.grazed&&d<s.r+20){s.grazed=true;nearMiss();if(G.P.spells.length){G.P.mana=Math.min(G.P.manaMax,G.P.mana+5);burst(s.x,s.y,'#7fc4ff',3);G.P.grazeGlow=.25;}}
    }
  }
  G.shots=G.shots.filter(s=>!s.dead).concat(add);
  for(const r of G.rings){
    r.rad+=r.v*dt;
    if(fighting&&!r.hit&&G.P){ const d=Math.hypot(G.P.x-r.x,G.P.y-r.y); if(Math.abs(d-r.rad)<r.w/2+hurtR){ const ang=Math.atan2(G.P.y-r.y,G.P.x-r.x); const off=Math.abs(((ang-r.a+Math.PI*3)%TAU)-Math.PI); if(off>r.gap){r.hit=true;hurt();} } }
    if(r.rad>G.H*1.3||(r.mine&&r.rad>r.maxR))r.dead=true;
  }
  G.rings=G.rings.filter(r=>!r.dead);
  for(const c of G.cols){ c.t+=dt; if(c.t>=c.warn&&!c.boomed){c.boomed=true;sfx.strike();S.shake=reduced?0:Math.max(S.shake,3);} if(fighting&&!c.hit&&G.P&&c.t>=c.warn&&c.t<c.warn+c.on&&Math.abs(G.P.x-c.x)<c.w/2+hurtR){c.hit=true;hurt();} if(c.t>c.warn+c.on)c.dead=true; }
  G.cols=G.cols.filter(c=>!c.dead);
  for(const k of G.bands){ k.t+=dt; if(fighting&&!k.hit&&G.P&&k.t>=k.warn&&k.t<k.warn+k.on&&Math.abs(G.P.rr-k.r)<k.w/2){k.hit=true;hurt();} if(k.t>=k.warn&&!k.boomed){k.boomed=true;sfx.toll();} if(k.t>k.warn+k.on)k.dead=true; }
  G.bands=G.bands.filter(k=>!k.dead);
  G.beams.forEach(b=>b.t-=dt); G.beams=G.beams.filter(b=>b.t>0);
  for(const p of G.parts){p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;p.vy*=.97;}
  G.parts=G.parts.filter(p=>p.t<p.life);
  if(G.P&&G.P.grazeGlow>0)G.P.grazeGlow-=dt;
  if(S.mode==='won'&&S.t>1.5){ if(S.pos===total()-1)showVictory(); else showPick(); }
  if(S.mode==='dying'&&S.t>1.3) showDead();
}
