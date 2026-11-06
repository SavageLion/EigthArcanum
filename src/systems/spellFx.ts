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

export function startBeam(s,pw){ G.P.beam={s,pw,proc:.5,auto:0}; }
export function endBeam(){ if(G.P)G.P.beam=null; }
export function beamStep(dt){
  const b=G.P.beam; if(!b)return;
  if(b.auto>0){b.auto-=dt;if(b.auto<=0){G.P.beam=null;return;}}
  G.P.mana-=28*dt; if(G.P.mana<=0){G.P.mana=0;G.P.beam=null;return;}
  const d=has(b.s,'sound')?1.3:1; damage(22*b.pw*d*dt); if(S.mode!=='fight')return;
  b.proc-=dt; if(b.proc<=0){b.proc=.5;proc(b.s,b.pw);}
  const ax=G.P.x,ay=G.P.y,bx=G.B.x,by=G.B.y,dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy||1;
  G.shots=G.shots.filter(q=>{ const t=clamp(((q.x-ax)*dx+(q.y-ay)*dy)/l2,0,1); if(Math.hypot(q.x-ax-dx*t,q.y-ay-dy*t)<11){burst(q.x,q.y,EL[b.s.els[0]].c,1);return false;} return true; });
}
export function placeTrap(s,pw){ if(G.traps.length>=3)G.traps.shift(); G.traps.push({x:G.P.x,y:G.P.y,s,pw,life:12,arm:.35,lane:S.fo?G.fo.lane:null,c:EL[s.els[0]].c}); }
export function blowTrap(k,big){
  k.life=0; const r=recipeOf(k.s); burst(k.x,k.y,k.c,26); S.shake=reduced?0:Math.max(S.shake,4); sfx.toll();
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
  const ox=G.P.x,oy=G.P.y,col=EL[s.els[0]].c;
  if(S.fo){ const a=G.fo.atk,z=a&&!a.did?(a.zones||[G.fo.lane]):[]; const opts=[0,1,2].filter(n=>n!==G.fo.lane&&!z.includes(n)&&!(G.fo.linger&&G.fo.linger.lane===n)); if(opts.length){ G.fo.lane=opts[Math.floor(Math.random()*opts.length)]; G.fo.x=FO_LANES[G.fo.lane]; G.P.x=G.fo.x; G.fo.dodge=.62; G.fo.dodgedAt=G.B.t; } }
  else if(S.orbit){ const score=(a,r)=>{const x=W/2+Math.cos(a)*r,y=CY()+Math.sin(a)*r;return G.shots.filter(q=>Math.hypot(q.x-x,q.y-y)<60).length;}; const opt=[[G.P.a+1.3,G.P.tr],[G.P.a-1.3,G.P.tr],[G.P.a+1.3,G.P.tr===RO?RI:RO],[G.P.a-1.3,G.P.tr===RO?RI:RO]].sort((m,n)=>score(m[0],m[1])-score(n[0],n[1]))[0]; G.P.a=opt[0];G.P.tr=opt[1];G.P.rr=opt[1]; G.P.x=W/2+Math.cos(G.P.a)*G.P.rr;G.P.y=CY()+Math.sin(G.P.a)*G.P.rr; }
  else { let best=null,bs=1e9; for(let i=0;i<8;i++){ const a=i/8*TAU,x=clamp(G.P.x+Math.cos(a)*135,22,W-22),y=clamp(G.P.y+Math.sin(a)*135,S.open?G.H*.12:G.H*.4,G.H-96); if(G.pillars.length&&inPillar(x,y,10))continue; const sc=G.shots.filter(q=>Math.hypot(q.x-x,q.y-y)<60).length-Math.hypot(x-G.P.x,y-G.P.y)*.01+(S.open&&Math.hypot(x-G.B.x,y-G.B.y)<90?20:0); if(sc<bs){bs=sc;best=[x,y];} } if(best){G.P.x=best[0];G.P.y=best[1];G.P.lx=G.P.x;} }
  G.P.inv=Math.max(G.P.inv,.45);
  G.shots=G.shots.filter(q=>Math.hypot(q.x-ox,q.y-oy)>75);
  G.rings.push({x:ox,y:oy,rad:10,v:520,gap:TAU,a:0,w:5,c:col,hit:true,mine:true,maxR:75}); burst(ox,oy,col,20);burst(G.P.x,G.P.y,col,12);
  damage(8*pw); if(S.mode==='fight')proc(s,pw);
}
