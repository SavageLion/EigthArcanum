// @ts-nocheck
import { G, S } from '../core/state';
import { hasPerk, isMod, toBoss } from './deck';
import { foFreeze, sig, spellIcon } from './faceoff';
import { chestCast, chestSay, hasGear } from './gear';
import { burst, damage } from './sim';
import { doBlink, endBeam, placeTrap, startBeam } from './spellFx';
import { BOSS_EL, EL, recipeOf, spellCost, spellName } from './spells';
import { $, TAU, rnd } from '../core/util';
import { sfx } from '../core/audio';
import { fxExplosion, fxIce, fxLightning, fxShield } from '../render/vfx';

/* ---------- spell buttons ---------- */
export const spellBar=$('spells');
export function paintSpells(){
  G.btnState='';
  if(!G.P||!G.P.spells.length){spellBar.hidden=true;return;}
  spellBar.hidden=false; spellBar.classList.toggle('three',G.P.spells.length>2);
  spellBar.innerHTML=G.P.spells.map((s,i)=>`<button class="spell" data-i="${i}" style="--boss:${EL[s.els[0]].c}" aria-label="Cast ${spellName(s)}, ${spellCost(s)} mana">${spellIcon(s)}<small>${spellCost(s)}</small></button>`).join('');
  spellBar.querySelectorAll('.spell').forEach(b=>{
    const i=+b.dataset.i;
    b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();castSpell(i);});
    b.addEventListener('click',e=>{ if(e.detail===0){castSpell(i); if(G.P.beam)G.P.beam.auto=.7;} });
  });
}
addEventListener('pointerup',()=>{ if(G.P&&G.P.beam&&!G.P.beam.auto)endBeam(); }); addEventListener('pointercancel',()=>{ if(G.P&&G.P.beam&&!G.P.beam.auto)endBeam(); });
export function syncSpells(){
  $('intro').hidden=S.mode!=='intro'||S.paused; $('manalabel').hidden=spellBar.hidden;
  if(!G.P||spellBar.hidden)return;
  const st=G.P.spells.map(s=>G.P.mana>=spellCost(s)&&G.P.cd<=0&&!G.P.beam&&!(has(s,'blood')&&G.P.hp<=1)?1:0).join('');
  if(st!==G.btnState){ G.btnState=st; [...spellBar.children].forEach((b,i)=>b.classList.toggle('low',st[i]==='0')); }
}

/* ---------- casting ---------- */
export function castSpell(i){
  if(S.mode!=='fight'||S.paused||!G.P.spells[i]||G.P.cd>0)return;
  const s=G.P.spells[i],c=G.P.freeCast>0?0:spellCost(s); if(G.P.mana<c||G.P.beam)return; if(has(s,'blood')&&G.P.hp<=1){chestSay('Not enough blood','#ff9d94');return;}
  if(has(s,'blood')){G.P.hp--;burst(G.P.x,G.P.y,'#e0405a',12);} G.P.castGold=false; if(has(s,'gold')&&G.P.gold>=5){G.P.gold-=5;G.P.castGold=true;burst(G.P.x,G.P.y,'#ffd27a',8);}
  G.P.mana-=c; if(c===0&&G.P.freeCast>0)G.P.freeCast--; if(hasGear('sage')){G.P.sageN++;if(G.P.sageN%3===0)G.P.mana+=c;} G.P.cd=.25; doCast(s,1); chestCast(); sfx.cast(); G.P.castAt=performance.now()/1000;
}
export const has=(s,e)=>s.els.includes(e);
function addSeeds(n,d){ for(let i=0;i<n;i++) G.seeds.push({x:G.P.x,y:G.P.y-14,vx:rnd(-170,170),vy:rnd(-220,-90),homing:true,d,life:4}); }
function chillShots(){ for(const q of G.shots) if(!q.chilled){q.chilled=true;q.vx*=.55;q.vy*=.55;} }
function reflectNear(r,pw,cap){
  let n=0; G.shots=G.shots.filter(q=>{ if(n<cap&&!q.seed&&Math.hypot(q.x-G.P.x,q.y-G.P.y)<r){n++;G.bolts.push({x:q.x,y:q.y,...toBoss(q.x,q.y,640),d:1.5*pw,r:4,c:'#f0a8d8'});return false;} return true; });
}
export function proc(s,pw){
  if(has(s,'poison')){ G.B.poison=Math.min(9,(G.B.poison||0)+3); burst(G.B.x,G.B.y,'#8ad24a',6); }
  if(has(s,'holy')){ G.P.shield=Math.max(G.P.shield,.8); G.shots=G.shots.filter(q=>{ if(!q.seed&&Math.hypot(q.x-G.P.x,q.y-G.P.y)<80){ burst(q.x,q.y,'#fff2b0',2); return false; } return true; }); burst(G.P.x,G.P.y,'#fff2b0',8); }
  if(has(s,'void')){ const near=[...G.shots].filter(q=>!q.seed).sort((a,b)=>Math.hypot(a.x-G.B.x,a.y-G.B.y)-Math.hypot(b.x-G.B.x,b.y-G.B.y)).slice(0,6); for(const q of near){ q.dead=true; burst(q.x,q.y,'#8a5cff',3); } if(near.length){ G.shots=G.shots.filter(q=>!q.dead); damage(3*near.length*pw); } burst(G.B.x,G.B.y,'#8a5cff',10); }
  if(has(s,'fire')){G.B.burning=3;}
  if(has(s,'frost')){G.B.chill=Math.max(G.B.chill,3); fxIce(G.B.x,G.B.y+16,'spikes',.7);}
  if(has(s,'storm')){ const r=recipeOf(s),n=r&&r.id==='thunder'?3:1; for(let i=0;i<n;i++){damage(5*pw);{const lx=G.B.x+rnd(-26,26);G.beams.push({x:lx,t:.16});fxLightning(lx,G.B.y+10);}} sfx.strike(); }
}
export function doCast(s,mult){
  const pw=G.P.scale*(1+.5*s.tier)*mult*(has(s,'blood')?2.5:1)*(G.P.castGold&&has(s,'gold')?1.6:1)*(isMod('hermit')?3:1)*(S.echo!==null&&has(s,BOSS_EL[S.echo])?1.25:1), r=recipeOf(s), col=EL[s.els[0]].c;
  if(s.type==='beam')startBeam(s,pw);
  if(s.type==='trap')placeTrap(s,pw);
  if(s.type==='blink')doBlink(s,pw);
  if(s.type==='bolt'){ G.bolts.push({x:G.P.x,y:G.P.y-22,...toBoss(G.P.x,G.P.y-22,680),d:14*pw,r:8,c:col,spell:s,pw}); }
  if(s.type==='nova'){
    const R=135+25*s.tier; let n=0;
    G.shots=G.shots.filter(q=>{ if(Math.hypot(q.x-G.P.x,q.y-G.P.y)<R){n++;burst(q.x,q.y,col,1);return false;} return true; });
    G.rings.push({x:G.P.x,y:G.P.y,rad:12,v:520,gap:TAU,a:0,w:5,c:col,hit:true,mine:true,maxR:R});
    if(has(s,'frost')) fxIce(G.P.x,G.P.y+12,'nova',1); else fxExplosion(G.P.x,G.P.y,.7+.15*s.tier);
    if(S.fo)foFreeze(); damage((10+Math.min(n,30)*1.5*(r&&r.id==='shock'?3:1))*pw); proc(s,pw);
  }
  if(s.type==='meteor'){ (G.meteors||(G.meteors=[])).push({tx:G.B.x,ty:G.B.y,t:0,delay:.55,pw:pw*(r&&r.id==='eclipse'?1.5:1),s,col,eclipse:!!(r&&r.id==='eclipse')}); sfx.rage&&sfx.rage(); }
  if(s.type==='orbit'){ G.P.orbit={t:0,life:8+s.tier,n:r&&r.id==='halo'?5:3,pw,s,col,cdB:0,halo:!!(r&&r.id==='halo')}; }
  if(s.type==='ward'){
    const t=(3+s.tier)*(has(s,'sound')?1.5:1)*(r&&r.id==='hall'?2:1)*(hasPerk('rime')?1.5:1);
    G.P.shield=Math.max(G.P.shield,t); G.P.shieldSpell=s; G.P.shieldPw=pw;
    if(G.P.shieldFx)G.P.shieldFx.drop(); G.P.shieldFx=fxShield(col);
  }
  if(s.type==='summon'){
    const n=(r&&r.id==='ossuary'?3:1)+(has(s,'sound')?1:0);
    for(let i=0;i<n&&G.helpers.length<5;i++) G.helpers.push({a:rnd(0,TAU),life:(9+2*s.tier)*(has(s,'bone')?1.5:1),d:2.2*pw,cd:rnd(.2,.5),s,pw,c:col});
  }
  if((s.type==='ward'||s.type==='summon'||s.type==='orbit')&&(has(s,'poison')||has(s,'void')||has(s,'holy')))proc(s,pw);
  if(has(s,'frost')){ chillShots(); G.B.chill=Math.max(G.B.chill,3); }
  if(has(s,'thorn')) addSeeds(r&&r.id==='wild'?6:3,3*pw);
  if(has(s,'bone')){ G.P.boneCasts=(G.P.boneCasts||0)+1; if(G.P.boneCasts%3===0&&G.P.hp<G.P.max){G.P.hp++;burst(G.P.x,G.P.y,'#a8f0b0',14);} if(s.type!=='summon'&&G.helpers.length<5) G.helpers.push({a:rnd(0,TAU),life:5,d:1.2*pw,cd:.4,s:{els:[],type:'summon',tier:0},pw,c:'#e9e3cb'}); }
  if(has(s,'mirror')){ reflectNear(110,pw,12); if(S.fo) for(let k=0;k<5;k++) G.bolts.push({x:G.P.x+rnd(-20,20),y:G.P.y-30,...toBoss(G.P.x,G.P.y-30,620),d:1.5*pw,r:4,c:'#f0a8d8'}); }
  if(has(s,'sound')&&mult===1&&(s.type==='bolt'||s.type==='nova'||s.type==='trap')) G.seeds.push({delay:.35,recast:s});
}
