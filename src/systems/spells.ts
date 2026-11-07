// @ts-nocheck
import { S } from '../core/state';
import { hasWand, isMod } from './deck';

/* ---------- spells: a type says what it does, elements add twists ---------- */
export const TYPES={
  bolt:{label:'Bolt',cost:22,desc:'A heavy shot that seeks the boss.'},
  nova:{label:'Nova',cost:35,desc:'A blast that erases nearby shots and hurts the boss.'},
  ward:{label:'Ward',cost:30,desc:'A shield that swallows shots for a few seconds.'},
  summon:{label:'Summon',cost:45,desc:'A familiar that fights beside you.'},
  beam:{label:'Beam',cost:12,desc:'Hold the button for a ray that erases shots in its path. Drains mana while held.'},
  trap:{label:'Trap',cost:24,desc:'Set a trap where you stand. It blasts the boss or shots that touch it.'},
  blink:{label:'Blink',cost:20,desc:'Teleport to a safer spot and leave a blast behind.'},
  meteor:{label:'Meteor',cost:38,desc:'Calls a meteor down on the boss after a short delay. It cannot be dodged.'},
  orbit:{label:'Orbit',cost:28,desc:'Three orbs circle you for eight seconds, erasing shots and striking the boss on contact.'}
};
export const EL={
  fire:{noun:'Fire',adj:'Burning',c:'#f0813f',twist:'Burns the boss'},
  frost:{noun:'Frost',adj:'Frozen',c:'#8fdcf0',twist:'Slows shots and the boss'},
  sound:{noun:'Sound',adj:'Echoing',c:'#f0d9a5',twist:'Repeats the effect'},
  storm:{noun:'Storm',adj:'Charged',c:'#f0dc55',twist:'Calls down lightning'},
  thorn:{noun:'Thorn',adj:'Thorned',c:'#9dbb6a',twist:'Launches homing seeds'},
  bone:{noun:'Bone',adj:'Hallowed',c:'#e9e3cb',twist:'Raises a skull and heals every third cast'},
  mirror:{noun:'Mirror',adj:'Mirrored',c:'#f0a8d8',twist:'Turns nearby shots against the boss'},
  blood:{noun:'Blood',adj:'Bloodied',c:'#e0405a',twist:'Costs a heart to cast but deals 150% more damage'},
  gold:{noun:'Gold',adj:'Gilded',c:'#ffd27a',twist:'Spends 5 gold for 60% more damage'},
  poison:{noun:'Venom',adj:'Venomous',c:'#8ad24a',twist:'Poisons the boss: damage over time that stacks'},
  holy:{noun:'Light',adj:'Hallowed',c:'#fff2b0',twist:'Cleanses nearby shots and grants a brief shield'},
  void:{noun:'Void',adj:'Hollow',c:'#8a5cff',twist:'Erases up to six shots near the boss for bonus damage'}
};
export const BOSS_EL=['fire','frost','sound','storm','thorn','bone','mirror',null,'frost','storm','thorn','blood','gold','fire','mirror','bone'];
export const RECIPES=[
  {id:'shock',name:'Thermal Shock',type:'nova',els:['fire','frost'],desc:'Erased shots deal triple damage.'},
  {id:'thunder',name:'Thunderclap',type:'bolt',els:['storm','sound'],desc:'Every hit calls three strikes.'},
  {id:'wild',name:'Wildfire',type:'bolt',els:['thorn','fire'],desc:'Launches six seeds instead of three.'},
  {id:'ossuary',name:'The Ossuary',type:'summon',els:['bone','thorn'],desc:'Raises three familiars at once.'},
  {id:'hall',name:'Hall of Mirrors',type:'ward',els:['mirror','sound'],desc:'Lasts twice as long and returns every shot.'},
  {id:'eclipse',name:'Eclipse Meteor',type:'meteor',els:['void','fire'],desc:'The impact erases every shot on screen and hits 50% harder.'},
  {id:'halo',name:'Halo Guard',type:'orbit',els:['holy','mirror'],desc:'Five orbs circle you, and each block gives a short shield.'}
];
export function recipeOf(s){ return RECIPES.find(r=>r.type===s.type&&r.els.every(e=>s.els.includes(e)))||null; }
export function spellName(s){
  const r=recipeOf(s); const roman=['','II','III','IV','V'][s.tier]||'';
  const base=r?r.name:[...s.els.slice(1).reverse().map(e=>EL[e].adj),EL[s.els[0]].noun,TYPES[s.type].label].join(' ');
  return roman?`${base} ${roman}`:base;
}
export const spellCost=s=>Math.round((TYPES[s.type].cost+7*(s.els.length-1)+4*s.tier)*(isMod('magician')?.5:1)*(hasWand('thrift')?.8:1));
export function spellDesc(s){
  const r=recipeOf(s); const tw=s.els.map(e=>EL[e].twist).join('. ');
  return `${TYPES[s.type].desc} ${tw}.${s.tier?` Power ${s.tier+1}.`:''}${r?` ${r.desc}`:''}`;
}
export function fuse(a,b){
  const els=[...a.els]; b.els.forEach(e=>{ if(!els.includes(e)&&els.length<3) els.push(e); });
  const grew=els.length>a.els.length;
  const tier=Math.min(4,Math.max(a.tier,a.type===b.type?b.tier:0)+((a.type===b.type||!grew)?1:0));
  return {type:a.type,els,tier};
}
export function spellKey(s){return s.type+'|'+s.els.join(',')+'|'+s.tier;}
export function learnRecipe(s){ const r=recipeOf(s); if(r&&!S.recipes.includes(r.id)){ S.recipes.push(r.id); try{localStorage.setItem('ea-recipes',JSON.stringify(S.recipes))}catch(e){} } }
