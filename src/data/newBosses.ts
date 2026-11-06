// @ts-nocheck
import { W } from '../core/dom';
import { G } from '../core/state';
import { column, every, fan, gapRing, ring, seed, shot, spiral, wave } from '../systems/attacks';
import { BOSSES, ELITE_SECOND, boomerang, curtain, hands, mines, swarm } from './bosses';
import { ECHO } from '../systems/deck';
import { BOSS_SIG, OA_STYLE } from '../systems/bossPlans';
import { BOSS_EL } from '../systems/spells';
import { drawDoctor, drawGarden, drawGeneric, drawKnight, drawLantern } from '../render/bossArt2';
import { rnd } from '../core/util';

/* Bosses 17 and up (the extra fights for the 32 and 64 boss runs). Each definition carries every per-boss table entry,
   and registerNewBosses() appends them, so a new boss is one object here plus Pixel Lab art registered with tools/pack-boss.mjs.
   `draw` is only the fallback figure for a boss that has no sprite yet. */
const NEW=[
  /* 16 */ { def:{num:'XVII',name:'The Lantern Keeper',hp:400,color:'#ffcf6e',rays:'#7a8fb5',bg:['#16233d','#0a0f1c'],draw:drawLantern,
      attack(ph){ every('wisp',ph?1.5:2.2,()=>swarm(ph?4:3,{c:'#ffcf6e'})); every('ring',ph?2.4:3.4,()=>ring(ph?18:14,120,{r:5,c:'#ffe9a8'}));
        if(ph) every('lantern',1.2,()=>fan(3,.5,160,{r:5,c:'#ffcf6e'})); }},
    el:'gold', sig:{f:'Wisps follow, then a ring of light closes in.',s:'Drifts slowly, trailing homing wisps.'}, oa:{speed:20,charges:0,move:'drift'},
    echo:{name:'Drifting wisps',fn:c=>every('e',3.4,()=>swarm(3,{c}))} },
  /* 17 */ { def:{num:'XVIII',name:'The Glass Gardener',hp:450,color:'#79e0d0',rays:'#f0a8d8',bg:['#123a44','#0a1418'],draw:drawGarden,
      attack(ph){ every('shard',ph?1.0:1.5,()=>fan(ph?5:3,ph?1.2:.9,170,{bounce:2,r:4.5,c:'#79e0d0'})); every('bloom',ph?2.0:2.8,()=>gapRing(ph?24:18,115,3,{c:'#f0a8d8'})); }},
    el:'mirror', sig:{f:'Glass shards bounce back into your lane.',s:'Scatters shards that ricochet off the walls.'}, oa:{speed:26,charges:1,trail:'ice'},
    echo:{name:'Glass petals',fn:c=>every('e',3.2,()=>fan(3,1.3,150,{bounce:2,r:5,c}))} },
  /* 18 */ { def:{num:'XIX',name:'The Plague Doctor',elite:true,hp:1300,color:'#9dbb6a',rays:'#4b4054',bg:['#1e2a1a','#0a0d0a'],draw:drawDoctor,
      attack(ph){ every('gas',1.7,()=>mines(ph?7:5,{c:'#9dbb6a'})); every('cough',ph?.9:1.3,()=>fan(ph?3:2,.45,185,{r:5,c:'#b8e07a'}));
        if(ph) every('spin',.2,()=>spiral(2,.31,120,{r:4.5,c:'#7fa04a'})); }},
    el:'thorn', second:'bone', sig:{f:'Poison clouds linger in two lanes.',s:'Leaves clouds of poison behind him.'}, oa:{speed:30,charges:1},
    echo:{name:'Toxic haze',fn:c=>every('e',4,()=>mines(5,{c}))} },
  /* 19 */ { def:{num:'XX',name:'The Rust Knight',hp:600,color:'#e8a15a',rays:'#c98a5a',bg:['#3a2418','#140c08'],draw:drawKnight,
      attack(ph){ every('cleave',ph?1.0:1.45,()=>{ column(G.P.x); if(ph) column(G.P.x+rnd(80,130)*(Math.random()<.5?-1:1)); }); every('slash',ph?2.0:2.8,()=>wave(ph?150:120,1.0,'#e8a15a')); }},
    el:'blood', sig:{f:'Every swing is telegraphed in a column of light.',s:'Charges in straight lines, leaving scorched ground.'}, oa:{speed:46,charges:1,trail:'fire'},
    echo:{name:'Rust cleave',fn:c=>every('e',3.6,()=>column(G.P.x))} },
  /* 20 */ { def:{num:'XXI',name:'The Moth Queen',hp:650,color:'#c9b6ff',rays:'#e6dcef',bg:['#2a2144','#0e0a1c'],draw:drawGeneric,
      attack(ph){ every('dust',ph?1.6:2.2,()=>mines(ph?6:4,{c:'#c9b6ff'})); every('wing',ph?3.2:4.4,()=>curtain(Math.random()<.5,'#e6dcef')); if(ph) every('scales',.22,()=>spiral(2,.4,115,{r:4,c:'#c9b6ff'})); }},
    el:'sound', sig:{f:'Wing-beats sweep the arena in walls with one gap.',s:'Flutters erratically, shedding dust mines.'}, oa:{speed:34,charges:0,move:'drift'},
    echo:{name:'Dust motes',fn:c=>every('e',4,()=>mines(4,{c}))} },
  /* 21 */ { def:{num:'XXII',name:'The Candle Eater',hp:700,color:'#ffb86b',rays:'#ffd28a',bg:['#3b2414','#150b08'],draw:drawGeneric,
      attack(ph){ every('drip',ph?.5:.8,()=>shot(rnd(25,W-25),30,Math.PI/2,rnd(120,170),{r:5,c:'#ffd28a'})); every('flare',ph?2.2:3,()=>ring(ph?16:12,125,{r:5.5,c:'#ff8a3d'})); }},
    el:'fire', sig:{f:'Hot wax rains down every lane.',s:'Lumbers after you, leaving pools of wax.'}, oa:{speed:30,charges:1,trail:'fire'},
    echo:{name:'Dripping wax',fn:c=>every('e',3,()=>{for(let i=0;i<3;i++)shot(rnd(25,W-25),30,Math.PI/2,rnd(120,160),{r:5,c});})} },
  /* 22 */ { def:{num:'XXIII',name:'The Hourglass Abbot',elite:true,hp:1500,color:'#e0c27a',rays:'#a9875a',bg:['#3a3018','#131008'],draw:drawGeneric,
      attack(ph){ every('sand',ph?1.5:2,()=>boomerang(ph?10:8,{c:'#e0c27a'})); every('col',ph?1.1:1.5,()=>column(G.P.x)); if(ph) every('tick',2.4,()=>wave(110,.9,'#f0d9a5')); }},
    el:'gold', second:'sound', sig:{f:'Sand sweeps out and returns on a delay.',s:'Moves in stuttering steps, like a slow clock.'}, oa:{speed:24,charges:1},
    echo:{name:'Returning grains',fn:c=>every('e',4,()=>boomerang(8,{c}))} },
  /* 23 */ { def:{num:'XXIV',name:'The Coral King',hp:760,color:'#ff8f7a',rays:'#ffd0c4',bg:['#103a4a','#06141c'],draw:drawGeneric,
      attack(ph){ every('tide',ph?2.6:3.6,()=>curtain(G.B.eside=!G.B.eside,'#ff8f7a')); every('bubble',ph?.9:1.3,()=>fan(ph?5:4,1.0,150,{bounce:1,r:5,c:'#ffd0c4'})); }},
    el:'frost', sig:{f:'The tide rushes in from alternating sides.',s:'Scuttles sideways, then charges.'}, oa:{speed:48,charges:1},
    echo:{name:'Rising tide',fn:c=>every('e',4.4,()=>{G.B.eside=!G.B.eside;curtain(G.B.eside,c);})} },
  /* 24 */ { def:{num:'XXV',name:'The Marionette',hp:820,color:'#d98aa0',rays:'#f0c0d0',bg:['#3a1c2c','#140a10'],draw:drawGeneric,
      attack(ph){ every('strings',ph?.55:.8,()=>hands(ph?2:1,{c:'#d98aa0',r:4.5})); every('snap',ph?2.4:3.2,()=>fan(3,.7,170,{home:1.2,r:5,c:'#f0c0d0'})); }},
    el:'mirror', sig:{f:'Strings of shots spin in slow spirals.',s:'Jerks about on invisible strings.'}, oa:{speed:38,charges:1},
    echo:{name:'Pulled strings',fn:c=>every('e',.6,()=>{ if((G.B.t%7)<1.3) hands(1,{c,r:4.5}); })} },
  /* 25 */ { def:{num:'XXVI',name:'The Salt Wraith',hp:880,color:'#dfe8ef',rays:'#9aa6b8',bg:['#1f2b36','#0a0e12'],draw:drawGeneric,
      attack(ph){ every('ring',ph?1.5:2,()=>gapRing(ph?26:20,120,4,{c:'#dfe8ef'})); every('shake',ph?1.0:1.5,()=>fan(ph?7:5,1.4,150,{bounce:1,r:4.5,c:'#f4f8fb'})); }},
    el:'bone', sig:{f:'Rings close with a single gap, then salt ricochets.',s:'Glides slowly, scattering bouncing grains.'}, oa:{speed:22,charges:0,move:'drift'},
    echo:{name:'Salt spray',fn:c=>every('e',3.2,()=>fan(3,1.3,150,{bounce:1,r:5,c}))} },
  /* 26 */ { def:{num:'XXVII',name:'The Iron Maiden',elite:true,hp:1600,color:'#9aa6b8',rays:'#c8d2e0',bg:['#22262e','#0a0b0e'],draw:drawGeneric,
      attack(ph){ every('spikes',ph?.9:1.3,()=>{ column(G.P.x); if(ph){column(G.P.x-90);column(G.P.x+90);} }); every('fan',1.4,()=>fan(ph?7:5,.9,180,{r:5,c:'#9aa6b8'})); if(ph) every('ring',3,()=>gapRing(22,110,3,{c:'#c8d2e0'})); }},
    el:'blood', second:'bone', sig:{f:'Spikes rise in three lanes at once.',s:'Slams forward in heavy charges.'}, oa:{speed:50,charges:2},
    echo:{name:'Iron spikes',fn:c=>every('e',3.6,()=>column(G.P.x))} },
  /* 27 */ { def:{num:'XXVIII',name:'The Ember Hound',hp:940,color:'#ff6a3d',rays:'#ffb070',bg:['#40160e','#180806'],draw:drawGeneric,
      attack(ph){ every('bark',ph?1.0:1.4,()=>fan(3,.7,200,{r:5,c:'#ff6a3d'})); every('howl',ph?3.0:4.2,()=>ring(ph?20:14,130,{r:5,c:'#ffb070'})); if(ph) every('chase',1.5,()=>swarm(3,{c:'#ff6a3d'})); }},
    el:'fire', sig:{f:'Three snapping fans, then a howling ring.',s:'Fast and relentless; it bites at your heels.'}, oa:{speed:60,charges:2,trail:'fire'},
    echo:{name:'Hound fire',fn:c=>every('e',3.3,()=>swarm(3,{c}))} },
  /* 28 */ { def:{num:'XXIX',name:'The Dream Eater',hp:1000,color:'#9fb6ff',rays:'#c8d4ff',bg:['#1c2448','#080b1c'],draw:drawGeneric,
      attack(ph){ every('orb',ph?1.6:2.4,()=>fan(2,.5,90,{r:9,c:'#9fb6ff'})); every('mist',ph?1.2:1.8,()=>swarm(ph?4:3,{c:'#c8d4ff'})); }},
    el:'sound', sig:{f:'Huge slow orbs drift while mist homes in.',s:'Floats lazily, trailing homing mist.'}, oa:{speed:18,charges:0,move:'drift'},
    echo:{name:'Dream mist',fn:c=>every('e',3.3,()=>swarm(4,{c}))} },
  /* 29 */ { def:{num:'XXX',name:'The Venom Bishop',hp:1060,color:'#7ad37a',rays:'#b8f0b0',bg:['#16341c','#08120a'],draw:drawGeneric,
      attack(ph){ every('venom',ph?1.0:1.5,()=>seed(ph?10:8)); every('coil',.18,()=>spiral(ph?3:2,.33,110,{r:4.5,c:'#7ad37a'})); }},
    el:'thorn', sig:{f:'Venom seeds burst into coiling spirals.',s:'Strides forward, spitting seeds.'}, oa:{speed:40,charges:1},
    echo:{name:'Venom seeds',fn:c=>every('e',3.8,()=>seed(6))} },
  /* 30 */ { def:{num:'XXXI',name:'The Eclipse Dancer',hp:1120,color:'#f2c86b',rays:'#ffe08a',bg:['#2c2210','#0e0a06'],draw:drawGeneric,
      attack(ph){ every('arms',.2,()=>spiral(ph?4:3,.28,130,{r:4.5,c:'#f2c86b'})); every('ring',ph?2.2:3,()=>gapRing(ph?24:18,120,4,{c:'#ffe08a'})); }},
    el:'gold', sig:{f:'A spiral dance, broken by closing rings.',s:'Spins around you in wide arcs.'}, oa:{speed:52,charges:1},
    echo:{name:'Eclipse spin',fn:c=>every('e',.4,()=>{ if((G.B.t%6)<1.2) spiral(2,.3,120,{c,r:4.5}); })} },
  /* 31: the 32-run's final boss */ { def:{num:'XXXII',name:'The World Eater',elite:true,hp:2400,color:'#7ad0ff',rays:'#b0e8ff',bg:['#0c2a44','#040c16'],draw:drawGeneric,
      attack(ph){ every('coil',.17,()=>spiral(ph?4:3,.3,120,{r:4.5,c:'#7ad0ff'})); every('col',ph?1.2:1.7,()=>column(G.P.x)); every('wave',ph?2.6:3.6,()=>wave(130,1,'#b0e8ff'));
        if(ph) every('rain',2.4,()=>{for(let i=0;i<5;i++)shot(rnd(25,W-25),30,Math.PI/2,rnd(130,180),{r:6,c:'#b0e8ff'})}); }},
    el:'storm', second:'frost', sig:{f:'Everything at once: coils, columns and waves.',s:'Circles the room, never still.'}, oa:{speed:36,charges:2},
    echo:{name:"The world's hunger",fn:c=>every('e',3,()=>fan(5,1.2,150,{c,r:5}))} },
];
/** append each new boss to BOSSES and every per-boss table, at the same index */
export function registerNewBosses(list=NEW){
  for(const n of list){
    const i=BOSSES.length; BOSSES.push(n.def); BOSS_SIG[i]=n.sig; OA_STYLE[i]=n.oa; BOSS_EL[i]=n.el; ECHO[i]=n.echo; if(n.second) ELITE_SECOND[i]=n.second;
  }
}
registerNewBosses();
