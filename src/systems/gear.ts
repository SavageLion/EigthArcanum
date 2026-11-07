// @ts-nocheck
import { W } from '../core/dom';
import { G, S } from '../core/state';
import { SPRITE_OVERRIDES, WIZ_ROWS, blit, px } from '../render/sprites';
import { CY, RI, RO, hasPerk, hasWand, relPos } from './deck';
import { noteChest, noteMimic, recordGear } from '../data/meta';
import { RARITY, rankOf } from '../data/rarity';
import { foBodyY, foLaneX } from './runner';
import { FO_LANES, icon, pixIcon, show } from './faceoff';
import { inPillar } from './openArena';
import { burst, damage, hurt } from './sim';
import { COL, mapSprite, pixelise } from '../render/pixel';
import { circle, fl, ln, poly } from '../render/bossArt';
import { $, GOLD, TAU, rnd } from '../core/util';
import { sfx, tone } from '../core/audio';
import { fxExplosion, fxHeal } from '../render/vfx';

/* ---------- gear and treasure chests ---------- */
const GEAR_DATA=[
 // hats
 {id:'cap',slot:'hat',rarity:'common',name:'Apprentice Cap',fx:{mana:10},desc:'Your mana bar holds 10 more.'},
 {id:'hood',slot:'hat',rarity:'common',name:"Traveler's Hood",fx:{gold:.08},desc:'Earn 8% more gold from fights and chests.'},
 {id:'brim',slot:'hat',rarity:'uncommon',name:"Witch's Brim",desc:'Bolts fire 30% faster while your mana is above half.'},
 {id:'fool',slot:'hat',rarity:'uncommon',name:"Fool's Cap",desc:'Chests hold twice the gold, but mimics are twice as common.'},
 {id:'mitre',slot:'hat',rarity:'uncommon',name:"Scholar's Mitre",fx:{cost:.08},desc:'Spells cost 8% less mana.'},
 {id:'feather',slot:'hat',rarity:'uncommon',name:"Duelist's Hat",fx:{rate:.08},desc:'Your bolts fire 8% faster.'},
 {id:'sage',slot:'hat',rarity:'rare',name:"Sage's Hood",desc:'Every third spell you cast is free.'},
 {id:'stars',slot:'hat',rarity:'rare',name:"Starcaller's Crown",fx:{regen:.25},desc:'Mana refills 25% faster.'},
 {id:'eyes',slot:'hat',rarity:'rare',name:'Hat of Many Eyes',fx:{eye:1},desc:'Redraw one omen per run if you dislike it.'},
 {id:'crown',slot:'hat',rarity:'epic',name:'Crown of Thorns',cursed:true,fx:{dmg:.4,hearts:-1},desc:'Cursed. You deal 40% more damage but have one less heart.'},
 {id:'eclipse',slot:'hat',rarity:'epic',name:'Eclipse Hat',fx:{dmg:.1},desc:'You deal 10% more damage, and 25% more again on your last heart.'},
 {id:'eighth',slot:'hat',rarity:'legendary',name:'Crown of the Eighth',fx:{hearts:1,dmg:.12,regen:.15},desc:'One extra heart, 12% more damage and mana refills 15% faster.'},
 // robes
 {id:'quilt',slot:'robe',rarity:'common',name:'Quilted Robe',fx:{dmg:.04},desc:'You deal 4% more damage.'},
 {id:'mossy',slot:'robe',rarity:'common',name:'Mossy Cloak',fx:{goldFlat:4},desc:'Earn 4 more gold after each fight.'},
 {id:'pilgrim',slot:'robe',rarity:'common',name:"Pilgrim's Robe",fx:{regen:.4},desc:'Mana refills 40% faster.'},
 {id:'ember',slot:'robe',rarity:'uncommon',name:'Ember Robe',desc:'Near misses and perfect dodges set the boss alight.'},
 {id:'blood',slot:'robe',rarity:'uncommon',name:'Blood Robe',desc:'Taking a hit refills all your mana.'},
 {id:'silk',slot:'robe',rarity:'uncommon',name:'Silk Robe',fx:{hearts:1},desc:'One extra heart.'},
 {id:'thornweave',slot:'robe',rarity:'uncommon',name:'Thornweave',desc:'When you are hit, three homing thorns leap at the boss.'},
 {id:'ghost',slot:'robe',rarity:'rare',name:'Ghost Shroud',desc:'After a near miss or perfect dodge, nothing can hit you for half a second.'},
 {id:'frostmantle',slot:'robe',rarity:'rare',name:'Frostmantle',desc:'When you are hit, the boss is chilled for 2 seconds.'},
 {id:'stormrobe',slot:'robe',rarity:'rare',name:'Stormcaller Robe',desc:'Near misses call a lightning strike on the boss.'},
 {id:'voidshroud',slot:'robe',rarity:'epic',name:'Void Shroud',desc:'A hit drains 40 mana instead of a heart, if you have the mana.'},
 {id:'phoenix',slot:'robe',rarity:'legendary',name:'Phoenix Robe',desc:'Once per run, a fatal hit leaves you with two hearts instead.'},
 // charms
 {id:'nail',slot:'charm',rarity:'common',name:'Iron Nail',fx:{dmg:.06},desc:'You deal 6% more damage.'},
 {id:'penny',slot:'charm',rarity:'common',name:'Worn Penny',fx:{goldFlat:3},desc:'Earn 3 more gold after each fight.'},
 {id:'coin',slot:'charm',rarity:'common',name:'Lucky Coin',desc:'Earn 15 more gold when you win without being hit.'},
 {id:'hourglass',slot:'charm',rarity:'uncommon',name:'Slow Hourglass',desc:'Bosses attack 10% slower.'},
 {id:'bloodstone',slot:'charm',rarity:'uncommon',name:'Bloodstone',fx:{winHeal:1},desc:'Winning a fight restores two hearts instead of one.'},
 {id:'pearl',slot:'charm',rarity:'uncommon',name:'Mana Pearl',fx:{mana:15},desc:'Your mana bar holds 15 more.'},
 {id:'fang',slot:'charm',rarity:'uncommon',name:'Wolf Fang',desc:'Every fifth basic bolt deals triple damage.'},
 {id:'moon',slot:'charm',rarity:'rare',name:'Moon Locket',desc:'The first hit in each fight is blocked.'},
 {id:'whetstone',slot:'charm',rarity:'rare',name:'Whetstone',fx:{rate:.12,dmg:.06},desc:'Bolts fire 12% faster and you deal 6% more damage.'},
 {id:'cursedeye',slot:'charm',rarity:'rare',name:'Cursed Eye',cursed:true,fx:{dmg:.3,cost:-.2},desc:'Cursed. You deal 30% more damage, but spells cost 20% more mana.'},
 {id:'tear',slot:'charm',rarity:'epic',name:"Angel's Tear",desc:'Once per fight, a fatal hit leaves you with one heart.'},
 {id:'heart',slot:'charm',rarity:'legendary',name:'Heart of the Arcanum',fx:{hearts:2,dmg:.1,winHeal:1},desc:'Two extra hearts, 10% more damage and a win restores one extra heart.'},
];
/** every item has a rarity; sell value follows it (cursed items sell for a little less) */
export const GEAR=GEAR_DATA.map(g=>({...g,value:Math.round(RARITY[g.rarity].val*(g.cursed?.8:1))}));
/** the sum of one numeric effect over everything you are wearing (dmg, rate, regen, cost, gold, goldFlat, winHeal) */
export function gearFx(k){ let s=0; if(G.P&&G.P.gear) for(const id of Object.values(G.P.gear)){ const g=id&&gearOf(id); if(g&&g.fx&&g.fx[k])s+=g.fx[k]; } return s; }
/** effects that change your stats once, when worn or taken off: extra hearts, extra mana, the omen redraw */
export function applyStats(g,dir){ if(!g||!g.fx)return; const f=g.fx;
  if(f.hearts){ const h=f.hearts*dir; G.P.max=Math.max(1,G.P.max+h); if(h>0)G.P.hp+=h; G.P.hp=Math.min(G.P.hp,G.P.max); }
  if(f.mana){ G.P.manaMax=Math.max(20,G.P.manaMax+dir*f.mana); G.P.mana=Math.min(G.P.mana,G.P.manaMax); }
  if(f.eye)G.P.thirdEye=dir>0; }
/** a random item for a chest, mimic or shop: rarer items are weighted down early and drift up deeper into the run; mimics roll twice and keep the rarer */
export function pickGear(o={}){
  const pool=GEAR.filter(g=>!hasGear(g.id)&&!G.P.loot.includes(g.id)&&(!o.min||rankOf(g.rarity)>=rankOf(o.min))); if(!pool.length)return null; const p=relPos()/15;
  const pick=()=>{ const ws=pool.map(g=>RARITY[g.rarity].w*(1+RARITY[g.rarity].boost*p)*(g.cursed?.6:1)); let r=Math.random()*ws.reduce((x,y)=>x+y,0); for(let i=0;i<pool.length;i++){ r-=ws[i]; if(r<=0)return pool[i]; } return pool[pool.length-1]; };
  let g=pick(); if(o.mimic){ const g2=pick(); if(rankOf(g2.rarity)>rankOf(g.rarity))g=g2; } return g;
}
export const rarityTag=g=>`<small class="rar" style="color:${RARITY[g.rarity].c}">${RARITY[g.rarity].name} ${SLOT_LABEL[g.slot]}</small>`;
export const SLOT_LABEL={hat:'Hat',robe:'Robe',charm:'Charm'};
export const gearOf=id=>GEAR.find(g=>g.id===id);
export const hasGear=id=>!!(G.P&&G.P.gear&&Object.values(G.P.gear).includes(id));
export const rateNow=()=>G.P.rate/(hasWand('ash')?1.25:1)/(hasGear('brim')&&G.P.mana>G.P.manaMax/2?1.3:1)/(1+gearFx('rate'));
export function equip(g){
  const old=G.P.gear[g.slot]; let sold=0;
  if(old){ const og=gearOf(old); sold=og.value; G.P.gold+=sold; applyStats(og,-1); }
  G.P.gear[g.slot]=g.id; applyStats(g,1); recordGear(g.id);
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
export function nearMiss(){ if(hasGear('stormrobe')&&G.B&&S.mode==='fight'){ damage(6*G.P.scale); G.beams.push({x:G.B.x+rnd(-26,26),t:.16}); } if(hasGear('ember')&&G.B){G.B.burning=Math.max(G.B.burning,2.5);} if(hasGear('ghost'))G.P.inv=Math.max(G.P.inv,.5); }
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
  const r=Math.random(),goldMult=(hasGear('fool')?2:1)*(hasPerk('lucky')?1.5:1)*(1+gearFx('gold'));
  if(bonus||r<.42){ const g=pickGear({mimic:bonus}); if(g){G.P.loot.push(g.id);chestSay(`${g.name}!`,RARITY[g.rarity].c);} if(bonus){const v=15*goldMult;G.P.gold+=v;} }
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
