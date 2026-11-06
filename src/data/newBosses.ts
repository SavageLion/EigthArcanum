// @ts-nocheck
import { W } from '../core/dom';
import { G } from '../core/state';
import { column, every, fan, gapRing, ring, seed, shot, spiral, wave } from '../systems/attacks';
import { BOSSES, ELITE_SECOND, FINALS, mines, swarm } from './bosses';
import { ECHO } from '../systems/deck';
import { BOSS_SIG, OA_STYLE } from '../systems/bossPlans';
import { BOSS_EL } from '../systems/spells';
import { drawDoctor, drawGarden, drawKnight, drawLantern } from '../render/bossArt2';
import { rnd } from '../core/util';

/* Bosses 17 and up (the extra fights for the 32 and 64 boss runs). Each definition carries every per-boss table entry,
   and register() appends them, so a new boss is one object here plus a draw function in render/bossArt2.ts. */
const NEW=[
  { def:{num:'XVII',name:'The Lantern Keeper',hp:400,color:'#ffcf6e',rays:'#7a8fb5',bg:['#16233d','#0a0f1c'],draw:drawLantern,
      attack(ph){ every('wisp',ph?1.5:2.2,()=>swarm(ph?4:3,{c:'#ffcf6e'})); every('ring',ph?2.4:3.4,()=>ring(ph?18:14,120,{r:5,c:'#ffe9a8'}));
        if(ph) every('lantern',1.2,()=>fan(3,.5,160,{r:5,c:'#ffcf6e'})); }},
    el:'gold', sig:{f:'Wisps follow, then a ring of light closes in.',s:'Drifts slowly, trailing homing wisps.'}, oa:{speed:20,charges:0,move:'drift'},
    echo:{name:'Drifting wisps',fn:c=>every('e',3.4,()=>swarm(3,{c}))} },
  { def:{num:'XVIII',name:'The Glass Gardener',hp:450,color:'#79e0d0',rays:'#f0a8d8',bg:['#123a44','#0a1418'],draw:drawGarden,
      attack(ph){ every('shard',ph?1.0:1.5,()=>fan(ph?5:3,ph?1.2:.9,170,{bounce:2,r:4.5,c:'#79e0d0'})); every('bloom',ph?2.0:2.8,()=>gapRing(ph?24:18,115,3,{c:'#f0a8d8'})); }},
    el:'mirror', sig:{f:'Glass shards bounce back into your lane.',s:'Scatters shards that ricochet off the walls.'}, oa:{speed:26,charges:1,trail:'ice'},
    echo:{name:'Glass petals',fn:c=>every('e',3.2,()=>fan(3,1.3,150,{bounce:2,r:5,c}))} },
  { def:{num:'XIX',name:'The Plague Doctor',elite:true,hp:1300,color:'#9dbb6a',rays:'#4b4054',bg:['#1e2a1a','#0a0d0a'],draw:drawDoctor,
      attack(ph){ every('gas',1.7,()=>mines(ph?7:5,{c:'#9dbb6a'})); every('cough',ph?.9:1.3,()=>fan(ph?3:2,.45,185,{r:5,c:'#b8e07a'}));
        if(ph) every('spin',.2,()=>spiral(2,.31,120,{r:4.5,c:'#7fa04a'})); }},
    el:'thorn', second:'bone', sig:{f:'Poison clouds linger in two lanes.',s:'Leaves clouds of poison behind him.'}, oa:{speed:30,charges:1},
    echo:{name:'Toxic haze',fn:c=>every('e',4,()=>mines(5,{c}))} },
  { def:{num:'XX',name:'The Rust Knight',hp:600,color:'#e8a15a',rays:'#c98a5a',bg:['#3a2418','#140c08'],draw:drawKnight,
      attack(ph){ every('cleave',ph?1.0:1.45,()=>{ column(G.P.x); if(ph) column(G.P.x+rnd(80,130)*(Math.random()<.5?-1:1)); }); every('slash',ph?2.0:2.8,()=>wave(ph?150:120,1.0,'#e8a15a')); }},
    el:'blood', sig:{f:'Every swing is telegraphed in a column of light.',s:'Charges in straight lines, leaving scorched ground.'}, oa:{speed:46,charges:1,trail:'fire'},
    echo:{name:'Rust cleave',fn:c=>every('e',3.6,()=>column(G.P.x))} },
];
/** append each new boss to BOSSES and every per-boss table, at the same index */
export function registerNewBosses(list=NEW){
  for(const n of list){
    const i=BOSSES.length; BOSSES.push(n.def); BOSS_SIG[i]=n.sig; OA_STYLE[i]=n.oa; BOSS_EL[i]=n.el; ECHO[i]=n.echo; if(n.second) ELITE_SECOND[i]=n.second;
  }
}
registerNewBosses();
