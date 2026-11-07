// @ts-nocheck
import { gearFx } from './gear';
import { W } from '../core/dom';
import { G, S } from '../core/state';
import { BOSSES, boomerang, curtain, hands, mines, swarm } from '../data/bosses';
import { column, every, fan, seed, shot, spiral, wave } from './attacks';
import { hasGear } from './gear';
import { rnd } from '../core/util';
import { sfx } from '../core/audio';

/* ---------- the pull: boss order, echoes, omens ---------- */
export const POS_HP=[90,130,170,340,260,300,350,680,440,510,590,1150,720,820,930,2100];
/** run length, and a 0-15 progress value that stays comparable across 16, 32 and 64 boss runs */
export const total=()=>S.order?S.order.length:16;
export const relPos=()=>S.pos*15/Math.max(1,total()-1);
export const posHp=(pos,tot)=>{ const t=pos*15/Math.max(1,tot-1), i=Math.floor(t), f=t-i, a=POS_HP[i], b=POS_HP[Math.min(15,i+1)]; return (a+(b-a)*f)*(tot>16?1+.25*Math.log2(tot/16):1); };
export const hasPerk=id=>!!(G.P&&G.P.perk===id);
export const RO=165, RI=95, CY=()=>Math.round(G.H*.45);
export const toBoss=(x,y,sp)=>{const a=Math.atan2(G.B.y-y,G.B.x-x);return {vx:Math.cos(a)*sp,vy:Math.sin(a)*sp};};
export const isMod=id=>S.mod&&S.mod.id===id;
export const ECHO=[
 {name:'Falling embers',fn:c=>every('e',3.2,()=>{for(let i=0;i<3;i++)shot(rnd(25,W-25),30,Math.PI/2,rnd(130,170),{r:6,c});})},
 {name:'Ice shards',fn:c=>every('e',2.6,()=>fan(2,.22,235,{r:4.5,c}))},
 {name:'Bell waves',fn:c=>every('e',4.6,()=>{wave(160,.7,c);sfx.toll();})},
 {name:'Stray lightning',fn:()=>every('e',3.4,()=>column(G.P.x))},
 {name:'Drifting seeds',fn:()=>every('e',4,()=>seed(6))},
 {name:'Bone spirals',fn:c=>{ if((G.B.t%6)<1.3) every('e',.14,()=>spiral(1,.45,120,{r:4.5,c})); }},
 {name:'Bouncing shards',fn:c=>every('e',3.3,()=>fan(2,1.3,155,{bounce:2,r:5.5,c}))}
];
ECHO[7]=ECHO[0];
ECHO[8]={name:'Rising tides',fn:c=>every('e',4.4,()=>{G.B.eside=!G.B.eside;curtain(G.B.eside,c);})};
ECHO[9]={name:'Clock hands',fn:c=>{ if((G.B.t%7)<1.3) every('e',.6,()=>hands(1,{c,r:4.5})); }};
ECHO[10]={name:'Stray bees',fn:c=>every('e',3.3,()=>swarm(3,{c}))};
ECHO[11]={name:'Ash mines',fn:c=>every('e',4,()=>mines(5,{c}))};
ECHO[12]={name:'Returning sand',fn:c=>every('e',4.2,()=>boomerang(8,{c}))};
ECHO[13]={name:'Imperial fire',fn:c=>every('e',3,()=>{for(let i=0;i<4;i++)shot(rnd(25,W-25),30,Math.PI/2,rnd(130,170),{r:6,c});})};
ECHO[14]={name:'Moon shards',fn:c=>every('e',3.2,()=>fan(3,1.3,150,{bounce:2,r:5,c}))};
ECHO[15]={name:"The Devil's swarm",fn:c=>every('e',3.3,()=>swarm(4,{c}))};
export const OMENS=[
 {id:'tower',num:'XVI',name:'The Tower',desc:'Hits cost you two hearts. You deal 50% more damage.'},
 {id:'star',num:'XVII',name:'The Star',desc:'Mana refills twice as fast.',spells:true},
 {id:'moon',num:'XVIII',name:'The Moon',desc:'Shots stay hidden until they come close to you. You deal 25% more damage.'},
 {id:'sun',num:'XIX',name:'The Sun',desc:'Refill all your hearts. The boss has 30% more health.'},
 {id:'death',num:'XIII',name:'Death',desc:'You have one heart this fight. Win and you take two spells.'},
 {id:'hermit',num:'IX',name:'The Hermit',desc:'Your bolts stop. Spells deal triple damage and mana refills twice as fast.',spells:true},
 {id:'magician',num:'I',name:'The Magician',desc:'Spells cost half. The boss attacks 15% faster.',spells:true},
 {id:'temperance',num:'XIV',name:'Temperance',desc:'The boss attacks 25% slower but has 30% more health.'},
 {id:'hanged',num:'XII',name:'The Hanged Man',desc:'The arena turns upside down. You deal 25% more damage.'}
];
export const WANDS=[
 {id:'ash',rarity:'uncommon',name:'Ashwood Wand',c:'#f0813f',cost:35,desc:'Your bolts fire 25% faster.'},
 {id:'fork',rarity:'epic',name:'Forked Wand',c:'#f0dc55',cost:50,desc:'Fires two bolts at once.'},
 {id:'hunter',rarity:'rare',name:"Hunter's Wand",c:'#9dbb6a',cost:30,desc:'Your bolts curve toward the boss.'},
 {id:'siphon',rarity:'uncommon',name:'Siphon Wand',c:'#5aa8f0',cost:40,desc:'Each bolt that hits gives you 1 mana.'},
 {id:'gambler',rarity:'rare',name:"Gambler's Wand",c:'#f0a8d8',cost:40,desc:'Bolts have a 15% chance to deal five times the damage.'},
 {id:'thrift',rarity:'common',name:'Thrifty Wand',c:'#8fdcf0',cost:30,desc:'Spells cost 20% less mana.'},
 {id:'warding',rarity:'rare',name:'Warding Wand',c:'#bfeaf2',cost:35,desc:'Taking a hit raises a shield for 2 seconds.'},
 {id:'greedy',rarity:'uncommon',name:'Greedy Wand',c:'#dcb868',cost:25,desc:'Earn 50% more gold after each fight.'}
];
export const hasWand=id=>G.P&&G.P.wand===id;
export const GOODS=[
 {id:'draught',name:'Healing Draught',icon:'potion',c:'#d9505f',cost:15,desc:'Restore one heart.',ok:()=>G.P.hp<G.P.max,fx(){G.P.hp++;}},
 {id:'locket',name:'Heart Locket',icon:'heart',c:'#f3b8ae',cost:45,desc:'Gain one extra heart and fill it.',ok:()=>G.P.max<7,fx(){G.P.max++;G.P.hp++;}},
 {id:'crystal',name:'Mana Crystal',icon:'gem',c:'#5aa8f0',cost:30,desc:'Your mana bar holds 25 more.',ok:()=>G.P.manaMax<175,fx(){G.P.manaMax+=25;}},
 {id:'tome',name:'Spell Tome',icon:'book',c:'#e46a80',cost:70,desc:'Gain a third spell slot for the rest of the run.',ok:()=>G.P.slots<3,fx(){G.P.slots=3;}},
 {id:'eye',name:'Third Eye',icon:'eye',c:'#b78cff',cost:15,desc:'Redraw your next omen once if you dislike it.',ok:()=>!G.P.thirdEye,fx(){G.P.thirdEye=true;}}
];
export const spellValue=s=>10+8*s.tier+5*(s.els.length-1);
export function fightReward(){
  const base=Math.round(10+3*relPos()), parts=[`${base} for the win`]; let g=base;
  if(BOSSES[S.stage].elite){g+=25;parts.push('25 for the elite');}
  if(G.P.cleanFight){g+=10;parts.push('10 for no hits');if(hasGear('coin')){g+=15;parts.push('15 from your coin');}}
  if(['tower','death','moon','hanged'].some(isMod)){g+=8;parts.push('8 for the omen');}
  if(hasWand('greedy')){const x=Math.round(g*.5);g+=x;parts.push(`${x} from your wand`);}
  const gm=gearFx('gold'); if(gm){ const x=Math.round(g*gm); g+=x; parts.push(`${x} from your gear`); }
  const gf=gearFx('goldFlat'); if(gf){ g+=gf; parts.push(`${gf} from your gear`); }
  return {g,parts};
}
export function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
