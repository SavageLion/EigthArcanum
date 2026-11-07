// @ts-nocheck
import { W, reduced } from '../core/dom';
import { G, S } from '../core/state';
import { has, proc } from './casting';
import { CY, RI, RO } from './deck';
import { FO_LANES } from './faceoff';
import { inPillar } from './openArena';
import { burst, damage } from './sim';
import { EL, recipeOf } from './spells';
import { TAU, clamp } from '../core/util';
import { sfx } from '../core/audio';
import { blit, disc, px } from '../render/sprites';
import { fxBeam, fxBlink, fxExplosion, fxIce } from '../render/vfx';

export function startBeam(s,pw){ G.P.beam={s,pw,proc:.5,auto:0}; sfx.beam(); fxBeam(G.P.x,G.P.y-14,G.B.x,G.B.y,EL[s.els[0]].c); }
export function endBeam(){ if(G.P)G.P.beam=null; }
export function beamStep(dt){
  const b=G.P.beam; if(!b)return;
  if(b.auto>0){b.auto-=dt;if(b.auto<=0){G.P.beam=null;return;}}
  G.P.mana-=28*dt; if(G.P.mana<=0){G.P.mana=0;G.P.beam=null;return;}
  const d=has(b.s,'sound')?1.3:1; damage(22*b.pw*d*dt); if(S.mode!=='fight')return;
  b.proc-=dt; if(b.proc<=0){b.proc=.5;proc(b.s,b.pw);fxBeam(G.P.x,G.P.y-14,G.B.x,G.B.y,EL[b.s.els[0]].c);}
  const ax=G.P.x,ay=G.P.y,bx=G.B.x,by=G.B.y,dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy||1;
  G.shots=G.shots.filter(q=>{ const t=clamp(((q.x-ax)*dx+(q.y-ay)*dy)/l2,0,1); if(Math.hypot(q.x-ax-dx*t,q.y-ay-dy*t)<11){burst(q.x,q.y,EL[b.s.els[0]].c,1);return false;} return true; });
}
export function placeTrap(s,pw){ if(G.traps.length>=3)G.traps.shift(); G.traps.push({x:G.P.x,y:G.P.y,s,pw,life:12,arm:.35,lane:S.fo?G.fo.lane:null,c:EL[s.els[0]].c}); }
export function blowTrap(k,big){
  k.life=0; const r=recipeOf(k.s); burst(k.x,k.y,k.c,26); if(has(k.s,'frost')) fxIce(k.x,k.y+10,'nova',.8); else fxExplosion(k.x,k.y,big?.9:.55); S.shake=reduced?0:Math.max(S.shake,4); sfx.toll();
  G.shots=G.shots.filter(q=>Math.hypot(q.x-k.x,q.y-k.y)>80);
  G.rings.push({x:k.x,y:k.y,rad:10,v:500,gap:TAU,a:0,w:5,c:k.c,hit:true,mine:true,maxR:80});
  damage((big?34:12)*k.pw); if(S.mode==='fight')proc(k.s,k.pw);
}
export function trapStep(dt){
  for(const k of G.traps){ k.life-=dt; if(k.arm>0){k.arm-=dt;continue;} if(k.life<=0)continue;
    if(!S.fo&&Math.hypot(G.B.x-k.x,G.B.y-k.y)<G.B.rad+18){blowTrap(k,true);continue;}
    if(G.shots.some(q=>Math.hypot(q.x-k.x,q.y-k.y)<13))blowTrap(k,false);
    if(S.mode!=='fight')return; }
  G.traps=G.traps.filter(k=>k.life>0);
}
export function doBlink(s,pw){
  const ox=G.P.x,oy=G.P.y,col=EL[s.els[0]].c; fxBlink(ox,oy,col);
  if(S.fo){ const a=G.fo.atk,z=a&&!a.did?(a.zones||[G.fo.lane]):[]; const opts=[0,1,2].filter(n=>n!==G.fo.lane&&!z.includes(n)&&!(G.fo.linger&&G.fo.linger.lane===n)); if(opts.length){ G.fo.lane=opts[Math.floor(Math.random()*opts.length)]; G.fo.x=FO_LANES[G.fo.lane]; G.P.x=G.fo.x; G.fo.dodge=.62; G.fo.dodgedAt=G.B.t; } }
  else if(S.orbit){ const score=(a,r)=>{const x=W/2+Math.cos(a)*r,y=CY()+Math.sin(a)*r;return G.shots.filter(q=>Math.hypot(q.x-x,q.y-y)<60).length;}; const opt=[[G.P.a+1.3,G.P.tr],[G.P.a-1.3,G.P.tr],[G.P.a+1.3,G.P.tr===RO?RI:RO],[G.P.a-1.3,G.P.tr===RO?RI:RO]].sort((m,n)=>score(m[0],m[1])-score(n[0],n[1]))[0]; G.P.a=opt[0];G.P.tr=opt[1];G.P.rr=opt[1]; G.P.x=W/2+Math.cos(G.P.a)*G.P.rr;G.P.y=CY()+Math.sin(G.P.a)*G.P.rr; }
  else { let best=null,bs=1e9; for(let i=0;i<8;i++){ const a=i/8*TAU,x=clamp(G.P.x+Math.cos(a)*135,22,W-22),y=clamp(G.P.y+Math.sin(a)*135,S.open?G.H*.12:G.H*.4,G.H-96); if(G.pillars.length&&inPillar(x,y,10))continue; const sc=G.shots.filter(q=>Math.hypot(q.x-x,q.y-y)<60).length-Math.hypot(x-G.P.x,y-G.P.y)*.01+(S.open&&Math.hypot(x-G.B.x,y-G.B.y)<90?20:0); if(sc<bs){bs=sc;best=[x,y];} } if(best){G.P.x=best[0];G.P.y=best[1];G.P.lx=G.P.x;} }
  G.P.inv=Math.max(G.P.inv,.45);
  G.shots=G.shots.filter(q=>Math.hypot(q.x-ox,q.y-oy)>75);
  G.rings.push({x:ox,y:oy,rad:10,v:520,gap:TAU,a:0,w:5,c:col,hit:true,mine:true,maxR:75}); burst(ox,oy,col,20);burst(G.P.x,G.P.y,col,12);
  damage(8*pw); if(S.mode==='fight')proc(s,pw);
}

/** where the orbit spell's orbs are right now (shared by the simulation and the drawing) */
export function orbitPositions(){ const o=G.P&&G.P.orbit; if(!o)return []; const t=performance.now()/1000, out=[]; for(let i=0;i<o.n;i++){ const a=t*3.2+i*Math.PI*2/o.n; out.push({x:G.P.x+Math.cos(a)*46,y:G.P.y-16+Math.sin(a)*34}); } return out; }
export function spellExtrasStep(dt){
  for(const m of (G.meteors||[])){ m.t+=dt; if(m.t>=m.delay&&!m.done){ m.done=true; damage(32*m.pw); fxExplosion(m.tx,m.ty,1.4); S.shake=reduced?0:Math.max(S.shake,7); sfx.toll&&sfx.toll(); burst(m.tx,m.ty,m.col,30); if(m.eclipse){ for(const q of G.shots)burst(q.x,q.y,'#8a5cff',2); G.shots=[]; } if(S.mode==='fight')proc(m.s,m.pw); } }
  G.meteors=(G.meteors||[]).filter(m=>m.t<m.delay+.25);
  const o=G.P&&G.P.orbit; if(!o||S.mode!=='fight'){ if(o&&S.mode!=='fight')G.P.orbit=null; return; }
  o.t+=dt; o.cdB-=dt; if(o.t>o.life){ G.P.orbit=null; return; }
  for(const p of orbitPositions()){
    G.shots=G.shots.filter(q=>{ if(!q.seed&&Math.hypot(q.x-p.x,q.y-p.y)<15){ burst(q.x,q.y,o.col,2); if(o.halo)G.P.shield=Math.max(G.P.shield,.5); return false; } return true; });
    if(G.fo) for(const h of G.fo.obs) if((h.k==='orb'||h.k==='shard')&&!h.gone&&h.lane===G.fo.lane&&h.d<170&&h.d>-30){ h.gone=true; burst(G.P.x,G.P.y-20,o.col,8); if(o.halo)G.P.shield=Math.max(G.P.shield,.5); }
    if(o.cdB<=0&&Math.hypot(p.x-G.B.x,p.y-G.B.y)<G.B.rad+10){ o.cdB=.35; damage(7*o.pw); burst(p.x,p.y,o.col,6); if(Math.random()<.35)proc(o.s,o.pw); }
  }
}
export function drawSpellExtras(c){
  for(const m of (G.meteors||[])){ if(m.done)continue; const f=m.t/m.delay, tx=px(m.tx), ty=px(m.ty); c.globalAlpha=.25+.5*f; c.strokeStyle=m.col; c.lineWidth=1; c.beginPath(); c.ellipse(tx,ty,18*(1.2-f*.5),7*(1.2-f*.5),0,0,TAU); c.stroke(); c.globalAlpha=1;
    const y=-12+(ty+12)*f*f, x=tx-(1-f)*30; for(let i=0;i<5;i++){ c.globalAlpha=.6-i*.1; blit(c,x+i*4,y-i*7,disc(i?m.col:'#ffffff',Math.max(1,6-i))); } c.globalAlpha=1; }
  for(const p of orbitPositions()){ const o=G.P.orbit; blit(c,px(p.x),px(p.y),disc(o.col,3)); c.globalAlpha=.4; blit(c,px(p.x),px(p.y),disc('#ffffff',1.5)); c.globalAlpha=1; }
}
