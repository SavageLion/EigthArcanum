// @ts-nocheck
import { W, muteBtn, ov, stage } from '../core/dom';
import { G, S, newPlayer } from '../core/state';
import { meta } from '../data/meta';
import { HUB_ART, LW, R, makeBg, px } from '../render/sprites';
import { BOSSES } from '../data/bosses';
import { enterHub } from './hub';
import { paintSpells, spellBar } from './casting';
import { oaEnd } from './openArena';
import { sideEnd } from './sideView';
import { eventsEnd, eventsStart } from './arenaEvents';
import { EL, TYPES, spellCost, spellDesc, spellName } from './spells';
import { resize } from '../core/size';
import { $, TAU } from '../core/util';
import { setMusic } from '../core/audio';

/* The Spell Lab: a training yard with a dummy that cannot die. Build any spell from a type, up to two elements and a tier, equip it to a
   slot and cast it as often as you like (mana is unlimited). The readout shows total damage and damage per second over the last five seconds. */
export function enterLab(){
  S.mode='fight'; S.lab=true; S.hub=false; S.camp=false; S.arena='chariot'; S.orbit=S.fo=S.open=S.side=false; S.mod=null; S.echo=null; S.stage=0; S.pos=0; S.order=Array(8).fill(0); S.god=false; S.paused=false;
  sideEnd(); oaEnd(); eventsEnd(); G.fo=null; G.hub=null; G.pull=null;
  G.P=newPlayer(meta.lastWizard||'raven'); G.P.spells=[]; G.P.slots=3; G.P.manaMax=999; G.P.mana=999; G.P.hp=G.P.max=99; G.P.x=W/2; G.P.y=G.H-150; G.P.inv=0; G.P.cleanFight=true; G.P.gold=999;
  G.B={name:'Training Dummy',num:'',color:'#c9a867',elite:false,def:{attack(){}},rad:46,x:W/2,y:G.H*.4,max:1e12,hp:1e12,t:0,tm:{},flash:0,burning:0,chill:0,enraged:false,ang:0,jump:3.5,bloomOuter:false,lab:true};
  G.bolts=[];G.hits=[];G.shots=[];G.rings=[];G.cols=[];G.seeds=[];G.beams=[];G.parts=[];G.helpers=[];G.bands=[];G.traps=[]; S.chest=null; S.chestsLeft=0; S.chestT=999;
  G.lab={nums:[],log:[],total:0,type:'bolt',els:['fire'],tier:0};
  G.bg=makeBg(BOSSES[7]); eventsStart(); S.t=0; setMusic('shop',0); ov.hidden=true; muteBtn.hidden=false; stage.style.cursor='grab';
  for(const id of ['bossname','omen','hint','call','intro']) $(id).hidden=true;
  resize(); buildUI(); paintSpells();
}
export function leaveLab(){ const u=$('labui'); if(u)u.remove(); S.lab=false; G.lab=null; enterHub(); }
/** called by sim.damage(): records a hit for the readout and floats a number over the dummy */
export function labHit(d){ const L=G.lab; if(!L)return; L.total+=d; L.log.push({t:S.t,d}); G.B.hp=G.B.max; G.B.flash=.06; if(L.nums.length<24)L.nums.push({x:G.B.x+(Math.random()-.5)*60,y:G.B.y-30,v:d,t:0}); }
export function labStep(dt){ const L=G.lab; if(!L)return; G.P.mana=G.P.manaMax; for(const n of L.nums){ n.t+=dt; n.y-=26*dt; } L.nums=L.nums.filter(n=>n.t<.9); L.log=L.log.filter(h=>S.t-h.t<5);
  const el=$('labdps'); if(el){ const dps=L.log.reduce((s,h)=>s+h.d,0)/Math.min(5,Math.max(1,S.t)); el.textContent=`DPS ${dps.toFixed(0)} · total ${L.total.toFixed(0)}`; } }
function current(){ const L=G.lab; return {type:L.type,els:[...L.els],tier:L.tier}; }
function buildUI(){
  const old=$('labui'); if(old)old.remove();
  const L=G.lab, u=document.createElement('div'); u.id='labui'; u.className='labui';
  u.innerHTML=`<div class="labrow"><b>Spell Lab</b><span id="labdps">DPS 0 · total 0</span><button class="ghost" id="lableave">Leave</button></div>
   <div class="chips" id="labtypes">${Object.keys(TYPES).map(k=>`<button class="lchip${L.type===k?' on':''}" data-t="${k}">${TYPES[k].label}</button>`).join('')}</div>
   <div class="chips" id="labels">${Object.keys(EL).map(k=>`<button class="lchip${L.els.includes(k)?' on':''}" data-e="${k}" style="--c:${EL[k].c}">${EL[k].noun}</button>`).join('')}</div>
   <div class="labrow"><span id="labname"></span><span class="tierbox">Tier <button class="lchip${L.tier===0?' on':''}" data-r="0">0</button><button class="lchip${L.tier===1?' on':''}" data-r="1">1</button><button class="lchip${L.tier===2?' on':''}" data-r="2">2</button></span></div>
   <div class="labrow equip"><span>Equip to</span><button class="ghost" data-s="0">Slot 1</button><button class="ghost" data-s="1">Slot 2</button><button class="ghost" data-s="2">Slot 3</button><button class="ghost" id="labclear">Clear</button></div>`;
  stage.appendChild(u); refresh();
  u.querySelector('#lableave').onclick=leaveLab;
  u.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{ L.type=b.dataset.t; buildUI(); });
  u.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{ const e=b.dataset.e, i=L.els.indexOf(e); if(i>=0){ if(L.els.length>1)L.els.splice(i,1); } else { L.els.push(e); if(L.els.length>2)L.els.shift(); } buildUI(); });
  u.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{ L.tier=+b.dataset.r; buildUI(); });
  u.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{ const s=current(); G.P.spells[+b.dataset.s]=s; for(let i=0;i<3;i++) if(!G.P.spells[i]&&i<G.P.spells.length) G.P.spells[i]=s; G.P.spells=G.P.spells.filter(Boolean); paintSpells(); });
  u.querySelector('#labclear').onclick=()=>{ G.P.spells=[]; paintSpells(); };
}
function refresh(){ const s=current(), n=$('labname'); if(n)n.textContent=`${spellName(s)} · ${spellCost(s)} mana`; }
/** the dummy and the floating damage numbers (called from draw.ts) */
export function drawDummy(c){
  const art=HUB_ART.dummy, B=G.B, wob=B.flash>0?Math.round(Math.sin(S.t*60)*1):0, k=2.1;
  if(art){ const w=art.width/R*k, h=art.height/R*k; c.fillStyle='rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(px(B.x),px(B.y)+h*.45,w*.35,3,0,0,TAU); c.fill(); c.drawImage(art,Math.round((px(B.x)-w/2+wob)*R)/R,Math.round((px(B.y)-h*.55)*R)/R,w,h); if(B.flash>0){ c.globalAlpha=.4; c.fillStyle='#fff'; c.fillRect(px(B.x)-w*.3,px(B.y)-h*.3,w*.6,h*.6); c.globalAlpha=1; } }
  const L=G.lab; if(L){ c.font='700 6px "Pixelify Sans","Courier New",monospace'; c.textAlign='center'; for(const n of L.nums){ c.globalAlpha=Math.max(0,1-n.t/.9); c.fillStyle='#0b0814'; c.fillText(n.v.toFixed(0),px(n.x)+.5,px(n.y)+.5); c.fillStyle='#ffe9a8'; c.fillText(n.v.toFixed(0),px(n.x),px(n.y)); } c.globalAlpha=1; }
}
