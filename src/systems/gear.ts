// @ts-nocheck
import { W } from '../core/dom';
import { G, S } from '../core/state';
import { SPRITE_OVERRIDES, WIZ_ROWS, blit, px } from '../render/sprites';
import { CY, RI, RO, hasPerk, hasWand, relPos } from './deck';
import { noteChest, noteMimic } from '../data/meta';
import { foBodyY, foLaneX } from './runner';
import { FO_LANES, icon, openShop, pixIcon, show } from './faceoff';
import { inPillar } from './openArena';
import { burst, hurt } from './sim';
import { COL, mapSprite, pixelise } from '../render/pixel';
import { circle, fl, ln, poly } from '../render/bossArt';
import { $, GOLD, TAU, rnd } from '../core/util';
import { sfx, tone } from '../core/audio';
import { fxExplosion, fxHeal } from '../render/vfx';

/* ---------- gear and treasure chests ---------- */
export const GEAR=[
 {id:'brim',slot:'hat',name:"Witch's Brim",value:20,desc:'Bolts fire 30% faster while your mana is above half.',H:'#20142a',h:'#7d5ad0'},
 {id:'fool',slot:'hat',name:"Fool's Cap",value:15,desc:'Chests hold twice the gold, but mimics are twice as common.',H:'#b84a5d',h:'#e4c946'},
 {id:'sage',slot:'hat',name:"Sage's Hood",value:20,desc:'Every third spell you cast is free.',H:'#2e4f2e',h:'#9dbb6a'},
 {id:'crown',slot:'hat',name:'Crown of Thorns',value:30,cursed:true,desc:'Cursed. You deal 40% more damage but have one less heart.',H:'#35121f',h:'#e0405a'},
 {id:'ember',slot:'robe',name:'Ember Robe',value:20,desc:'Near misses and perfect dodges set the boss alight.',R:'#b84a2c',r:'#6e1830'},
 {id:'ghost',slot:'robe',name:'Ghost Shroud',value:25,desc:'After a near miss or perfect dodge, nothing can hit you for half a second.',R:'#cfd7e8',r:'#8ea3bf'},
 {id:'pilgrim',slot:'robe',name:"Pilgrim's Robe",value:15,desc:'Mana refills 40% faster.',R:'#a9875a',r:'#7d5a22'},
 {id:'blood',slot:'robe',name:'Blood Robe',value:20,desc:'Taking a hit refills all your mana.',R:'#8d3350',r:'#35121f'},
 {id:'moon',slot:'charm',name:'Moon Locket',value:25,desc:'The first hit in each fight is blocked.'},
 {id:'coin',slot:'charm',name:'Lucky Coin',value:15,desc:'Earn 15 more gold when you win without being hit.'},
 {id:'hourglass',slot:'charm',name:'Slow Hourglass',value:20,desc:'Bosses attack 10% slower.'},
 {id:'bloodstone',slot:'charm',name:'Bloodstone',value:20,desc:'Winning a fight restores two hearts instead of one.'}
];
export const SLOT_LABEL={hat:'Hat',robe:'Robe',charm:'Charm'};
export const gearOf=id=>GEAR.find(g=>g.id===id);
export const hasGear=id=>!!(G.P&&G.P.gear&&Object.values(G.P.gear).includes(id));
export const rateNow=()=>G.P.rate/(hasWand('ash')?1.25:1)/(hasGear('brim')&&G.P.mana>G.P.manaMax/2?1.3:1);
export function equip(g){
  const old=G.P.gear[g.slot]; let sold=0;
  if(old){ sold=gearOf(old).value; G.P.gold+=sold; if(old==='crown'){G.P.max++;G.P.hp++;} }
  G.P.gear[g.slot]=g.id;
  if(g.id==='crown'){G.P.max=Math.max(1,G.P.max-1);G.P.hp=Math.min(G.P.hp,G.P.max);}
  return sold;
}
const wizCache={};
export function wizSprite(){
  const hat=G.P&&G.P.gear&&G.P.gear.hat&&gearOf(G.P.gear.hat),robe=G.P&&G.P.gear&&G.P.gear.robe&&gearOf(G.P.gear.robe),key=(hat?hat.id:'')+'|'+(robe?robe.id:'');
  if(wizCache[key])return wizCache[key];
  const rows=WIZ_ROWS.map((r,i)=>i<6?r.replace(/b/g,'H').replace(/n/g,'I'):i>=11?r.replace(/b/g,'R').replace(/n/g,'Q'):r);
  return wizCache[key]=mapSprite(rows,{...COL,H:hat?hat.H:COL.b,I:hat?hat.h:COL.n,R:robe?robe.R:COL.b,Q:robe?robe.r:COL.n});
}
const backCache={};
export function foWiz(){
  const hat=G.P.gear.hat&&gearOf(G.P.gear.hat),robe=G.P.gear.robe&&gearOf(G.P.gear.robe),key=(hat?hat.id:'')+'|'+(robe?robe.id:'');
  if(backCache[key])return backCache[key];
  return backCache[key]=pixelise(c=>{ poly(c,[[-18,28],[-9,-2],[9,-2],[18,28]]);fl(c,robe?robe.R:'#3956a8');ln(c,GOLD,1.5); poly(c,[[-3,0],[3,0],[4,28],[-4,28]]);fl(c,robe?robe.r:'#26336f'); poly(c,[[-16,-3],[16,-3],[5,-13],[8,-27],[-5,-14]]);fl(c,hat?hat.H:'#2a3f85');ln(c,GOLD,1.5); poly(c,[[-18,-3],[18,-3]],false);ln(c,hat?hat.h:GOLD,3); poly(c,[[21,22],[21,-22]],false);ln(c,'#a9875a',2.5); circle(c,21,-26,5);fl(c,'#ffd27a'); },60,1).img;
}
export function nearMiss(){ if(hasGear('ember')&&G.B){G.B.burning=Math.max(G.B.burning,2.5);} if(hasGear('ghost'))G.P.inv=Math.max(G.P.inv,.5); }
const chestImg=()=>G.CHESTIMG||(G.CHESTIMG=mapSprite(["..kkkkkkkkkk..",".kttttttttttk.","kttttttttttttk","kttttttttttttk","kkkkkkggkkkkkk","kttttkggkttttk","kttttkkkkttttk","kttttttttttttk","kttttttttttttk","kkkkkkkkkkkkkk"],{...COL,t:'#8a5a2c'}));
export function chestSay(t,col){ const e=$('call'); e.textContent=t; e.style.color=col||'var(--bone)'; e.hidden=false; G.chestCall=.9; }
export function spawnChest(){
  const mimic=Math.random()<(hasGear('fool')?.33:.17); let x,y,lane=null;
  if(S.fo){ lane=Math.random()<.5?0:2; x=foLaneX(lane); y=foBodyY(); }
  else if(S.orbit){ const r=Math.random()<.5?RO:RI,a=rnd(0,TAU); x=W/2+Math.cos(a)*r; y=CY()+Math.sin(a)*r; }
  else { let n=0; do{ x=rnd(40,W-40); y=rnd(G.H*.42,G.H-110); }while(G.pillars.length&&inPillar(x,y,24)&&n++<20); }
  S.chest={x,y,t:0,life:S.fo?5:6.5,mimic}; chestSay('A chest!','#ffd27a'); tone(1180,.1,'triangle',.05);
}
export function chestLoot(bonus){
  const r=Math.random(),goldMult=(hasGear('fool')?2:1)*(hasPerk('lucky')?1.5:1);
  if(bonus||r<.42){ const pool=GEAR.filter(g=>!hasGear(g.id)&&!G.P.loot.includes(g.id)); const g=pool[Math.floor(Math.random()*pool.length)]; if(g){G.P.loot.push(g.id);chestSay(`${g.name}!`,'#ffd27a');} if(bonus){const v=15*goldMult;G.P.gold+=v;} }
  else if(r<.78){ const v=Math.round((12+relPos()*2)*goldMult); G.P.gold+=v; chestSay(`+${v} gold`,'#ffd27a'); }
  else { G.P.mana=G.P.manaMax; G.P.grazeGlow=.4; fxHeal(G.P.x,G.P.y+10,'mana'); chestSay('Mana refilled','#a9d4f7'); }
  sfx.coin();
}
export function chestStep(dt){
  if(G.chestCall>0){G.chestCall-=dt;if(G.chestCall<=0)$('call').hidden=true;}
  if(S.chest){ const c=S.chest; c.t+=dt; if(c.t>=c.life){S.chest=null;return;}
    if(Math.hypot(G.P.x-c.x,G.P.y-c.y)<(S.fo?45:26)){ S.chest=null; burst(c.x,c.y,GOLD,12); chestFx(c,c.mimic?'mimic':'open'); if(!c.mimic)noteChest(); if(c.mimic){ chestSay('Mimic!','#ff9d94'); hurt(); } else chestLoot(false); }
    return; }
  if(S.chestsLeft>0){ S.chestT-=dt; if(S.chestT<=0){ S.chestsLeft--; S.chestT=rnd(9,15); spawnChest(); } }
}
export function chestCast(){ const c=S.chest; if(c&&c.mimic&&Math.hypot(G.P.x-c.x,G.P.y-c.y)<135){ S.chest=null; burst(c.x,c.y,'#ff7a6e',18); chestFx(c,'mimic'); fxExplosion(c.x,c.y,.6); noteMimic(); chestLoot(true); chestSay('Mimic slain!','#ffd27a'); } }
/** a chest (or mimic) was just opened or slain: play its animation where it stood */
export function chestFx(c,kind){ (G.chestFxs||(G.chestFxs=[])).push({x:c.x,y:c.y,kind,t0:performance.now()/1000}); if(kind==='mimic')sfx.mimic(); else sfx.chest(); }
function drawChestFx(c){ const A=SPRITE_OVERRIDES.chest; if(!A||!G.chestFxs||!G.chestFxs.length)return; const now=performance.now()/1000;
  G.chestFxs=G.chestFxs.filter(f=>now-f.t0<.9); for(const f of G.chestFxs){ const clip=f.kind==='mimic'?A.mimic:A.open, i=Math.min(clip.length-1,Math.floor((now-f.t0)*12)); c.globalAlpha=Math.min(1,(.9-(now-f.t0))*4); blit(c,px(f.x),px(f.y),clip[i]); c.globalAlpha=1; } }
export function drawChest(c){ drawChestFx(c); const k=S.chest; if(!k)return; if(k.life-k.t<1.5&&Math.floor(S.t*10)%2)return; const A=SPRITE_OVERRIDES.chest; const wig=k.mimic&&Math.floor(S.t*3)%3===0?(Math.floor(S.t*20)%2?1:-1):0; blit(c,px(k.x)+wig,px(k.y)+Math.round(Math.sin(S.t*4)),A?A.idle:chestImg()); c.fillStyle='#fff2c8'; const a=S.t*3; c.fillRect(px(k.x)+Math.round(Math.cos(a)*10),px(k.y)+Math.round(Math.sin(a)*8),1,1); }
export function lootOrShop(){ if(G.P.loot.length)showLoot(); else openShop(); }
export function showLoot(){
  S.mode='shop'; $('bossname').hidden=true; const g=gearOf(G.P.loot[0]),old=G.P.gear[g.slot]&&gearOf(G.P.gear[g.slot]);
  show(`<div class="eyebrow">From the chest · ${SLOT_LABEL[g.slot]}</div><h2>${g.name}</h2>
    <div class="shoprow" style="--boss:${g.cursed?'#e0405a':'var(--gold)'}">${icon('gear_'+g.id,pixIcon(g.slot))}<div class="txt"><b>New</b><span>${g.desc}</span></div></div>
    ${old?`<div class="shoprow" style="--boss:var(--gold-dim)">${icon('gear_'+old.id,pixIcon(g.slot))}<div class="txt"><b>Wearing: ${old.name}</b><span>${old.desc}</span></div></div>`:`<p class="muted">Your ${SLOT_LABEL[g.slot].toLowerCase()} slot is empty.</p>`}
    <div class="shopbtns"><button class="go" id="wear">${old?`Swap and sell old · +${old.value} gold`:'Put it on'}</button><button class="ghost" id="sellg">Sell it · +${g.value} gold</button></div>`);
  $('wear').onclick=()=>{ equip(g); G.P.loot.shift(); sfx.pick(); lootOrShop(); };
  $('sellg').onclick=()=>{ G.P.gold+=g.value; G.P.loot.shift(); sfx.coin(); lootOrShop(); };
}
