// @ts-nocheck
import { W } from '../core/dom';
import { G } from '../core/state';
import { column, every, fan, gapRing, ring, seed, shot, spiral, wave } from '../systems/attacks';
import { BOSSES, FINALS, boomerang, curtain, hands, mines, swarm } from './bosses';
import { registerNewBosses } from './newBosses';
import { drawGeneric } from '../render/bossArt2';
import { rnd } from '../core/util';

/* Bosses 33 to 64: the extra fights for the 64 boss run. Each is a short spec row; attack patterns are picked from PAT by name
   (the third pattern only joins in phase two), so a boss is its look, its numbers and which patterns it mixes. Art lives in
   public/assets/boss/<slug> (Pixel Lab) and is registered with tools/pack-boss.mjs at indices 32 and up. */
const PAT={
  fan:  (c,ph,k)=>every('fan'+k,ph?1.0:1.5,()=>fan(ph?5:3,.9,170,{r:5,c})),
  aim:  (c,ph,k)=>every('aim'+k,ph?.8:1.2,()=>fan(ph?3:2,.35,200,{r:5,c})),
  bounce:(c,ph,k)=>every('bnc'+k,ph?1.1:1.6,()=>fan(ph?5:3,1.0,160,{bounce:2,r:4.5,c})),
  ring: (c,ph,k)=>every('ring'+k,ph?2.2:3.2,()=>ring(ph?20:14,125,{r:5,c})),
  gap:  (c,ph,k)=>every('gap'+k,ph?2.0:2.8,()=>gapRing(ph?24:18,115,3,{c})),
  spiral:(c,ph,k)=>every('spr'+k,.2,()=>spiral(ph?3:2,.3,120,{r:4.5,c})),
  column:(c,ph,k)=>every('col'+k,ph?1.1:1.6,()=>{ column(G.P.x); if(ph) column(G.P.x+rnd(80,130)*(Math.random()<.5?-1:1)); }),
  wave: (c,ph,k)=>every('wav'+k,ph?2.4:3.4,()=>wave(ph?150:120,1.0,c)),
  mines:(c,ph,k)=>every('min'+k,ph?1.5:2.1,()=>mines(ph?7:5,{c})),
  swarm:(c,ph,k)=>every('swm'+k,ph?1.5:2.2,()=>swarm(ph?4:3,{c})),
  boomer:(c,ph,k)=>every('bmr'+k,ph?1.6:2.2,()=>boomerang(ph?10:8,{c})),
  curtain:(c,ph,k)=>every('crt'+k,ph?3.0:4.2,()=>curtain(G.B.eside=!G.B.eside,c)),
  hands:(c,ph,k)=>every('hnd'+k,ph?.6:.85,()=>hands(ph?2:1,{c,r:4.5})),
  rain: (c,ph,k)=>every('rn'+k,ph?.5:.8,()=>shot(rnd(25,W-25),30,Math.PI/2,rnd(120,175),{r:5,c})),
  seed: (c,ph,k)=>every('sd'+k,ph?1.1:1.6,()=>seed(ph?10:8)),
};
/* the matching light version used when this boss is echoed into a later fight */
const ECHO_OF={fan:c=>fan(3,1,150,{c,r:5}),aim:c=>fan(2,.4,180,{c,r:5}),bounce:c=>fan(3,1.2,150,{bounce:2,r:5,c}),ring:c=>ring(12,120,{c,r:5}),gap:c=>gapRing(16,110,3,{c}),spiral:c=>spiral(2,.3,120,{c,r:4.5}),
  column:c=>column(G.P.x),wave:c=>wave(110,.9,c),mines:c=>mines(4,{c}),swarm:c=>swarm(3,{c}),boomer:c=>boomerang(7,{c}),curtain:c=>curtain(G.B.eside=!G.B.eside,c),hands:c=>hands(1,{c,r:4.5}),
  rain:c=>{for(let i=0;i<3;i++)shot(rnd(25,W-25),30,Math.PI/2,rnd(120,160),{r:5,c});},seed:c=>seed(6)};
const ROMAN=n=>{ const t=[[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']]; let s=''; for(const [v,r] of t) while(n>=v){ s+=r; n-=v; } return s; };

/* name, slug, colour, rays, bg top, bg bottom, hp, element, elite second element (or '' for a regular boss), patterns, telegraph text, style text, open-arena style, echo name */
const SPEC=[
 ['The Cartographer','cartog','#d9b36a','#a9875a','#3a2c18','#120c06',1200,'gold','',['column','fan','wave'],'Lines of ink are drawn across the lanes, then they strike.','Paces out the room, charting a route to you.',{speed:34,charges:1},'Charted lines'],
 ['The Tidewatcher','tide','#6ac5e8','#bff2ff','#0f3446','#061218',1250,'frost','',['curtain','aim','gap'],'A sweeping beam of light, with waves behind it.','Drifts back and forth, sweeping the room.',{speed:30,charges:0,move:'patrol'},'Lamp beam'],
 ['The Bone Cellist','cellist','#e8dcc0','#c9b6ff','#2c2434','#0e0a12',2900,'bone','sound',['spiral','ring','bounce'],'A slow song of spiralling notes.','Sways in time, never hurrying.',{speed:26,charges:1},'Phantom notes'],
 ['The Fox Oracle','fox','#ff9a5a','#8fb8ff','#3a2010','#140a06',1350,'fire','',['aim','swarm','bounce'],'Foxfire homes in on where you will be.','Darts and feints, then pounces.',{speed:62,charges:2,trail:'fire'},'Foxfire'],
 ['The Ink Wyrm','ink','#8a7af0','#d8d0ff','#1c1840','#080614',1400,'storm','',['spiral','wave','mines'],'Ink coils outward in slow spirals.','Slithers in long curves, leaving ink behind.',{speed:44,charges:1,trail:'ice'},'Ink spill'],
 ['The Clockwork Spider','spider','#c0a060','#f0d9a5','#2e2814','#0e0a06',1450,'gold','',['column','mines','aim'],'Gears click: columns of steel, then mines.','Moves in sharp, ticking steps.',{speed:40,charges:1,move:'grid'},'Ticking mines'],
 ['The Glass Knight','glassk','#bfeaf2','#ffffff','#143a46','#061418',3100,'mirror','frost',['bounce','column','ring'],'Shards of glass ricochet off every wall.','Strides forward behind a shield of glass.',{speed:46,charges:2},'Glass shards'],
 ['The Mycelium Matron','myc','#b07ad0','#e8b0ff','#2a1838','#0c0610',1500,'thorn','',['mines','swarm','rain'],'Spore clouds drift, then burst.','Plods slowly, spreading spores.',{speed:22,charges:0,move:'drift',trail:'ice'},'Spore clouds'],
 ['The Storm Herald','herald','#7fa8ff','#ffe9a8','#18284a','#080c1c',1550,'storm','',['column','rain','fan'],'Lightning marks a lane, then strikes.','Blinks across the sky between thunderclaps.',{speed:30,charges:0,move:'blink',blink:2.2},'Thunderclap'],
 ['The Carrion Choir','crows','#8a7ab0','#ff5a6e','#241c34','#0a0812',1600,'blood','',['swarm','fan','curtain'],'Crows peel off in homing flocks.','A flock that scatters and regroups.',{speed:54,charges:1},'Crow flock'],
 ['The Gilded Idol','idol','#f2c14e','#ff5a6e','#3a2c10','#120c04',3400,'gold','blood',['gap','column','spiral'],'Rings of gold close in with a single gap.','Stands firm and lets the arena do the work.',{speed:20,charges:2},'Golden rings'],
 ['The Mirage Sphinx','sphinx','#e8c98a','#4fd0d0','#3a3018','#12100a',1700,'mirror','',['aim','bounce','mines'],'Heat-haze copies fire from false positions.','Shimmers and re-appears beside you.',{speed:36,charges:1,move:'blink',blink:2.6},'Mirage shots'],
 ['The Choir of Teeth','teeth','#e87aa0','#ffd0e0','#3a1428','#14060e',1750,'sound','',['ring','spiral','swarm'],'A hymn in rings and spirals.','Rolls around the room, singing.',{speed:42,charges:1},'Hymn'],
 ['The Frozen Bride','bride','#bfe4f5','#ffffff','#1c3446','#08121a',1800,'frost','',['gap','aim','curtain'],'A veil of ice falls with one gap.','Glides slowly, freezing the floor behind her.',{speed:24,charges:1,trail:'ice'},'Veil of ice'],
 ['The Obsidian Colossus','colossus','#e0503a','#ff9a5a','#3a1410','#140605',3700,'fire','blood',['column','wave','rain'],'Magma columns split the floor.','Slow, heavy, and it never stops walking.',{speed:28,charges:2,trail:'fire'},'Magma columns'],
 ['The Weeping Statue','weeping','#a8c0e0','#e0f0ff','#202c40','#0a0e18',1900,'sound','',['rain','gap','mines'],'Tears fall in every lane.','Does not move. The room does the weeping.',{speed:12,charges:0,move:'drift'},'Falling tears'],
 ['The Honey Witch','honey','#f2b640','#fff0a0','#3a2a0e','#140e04',1950,'thorn','',['swarm','ring','mines'],'Bees home in, then a ring of honey drops.','Dances about, dripping honey.',{speed:36,charges:1,trail:'fire'},'Bee swarm'],
 ['The Black Swan','swan','#9aa0c8','#ff4a5a','#1c1c30','#08080e',2000,'mirror','',['boomer','fan','spiral'],'Feathers fly out and return.','Glides in wide, graceful loops.',{speed:50,charges:1},'Returning feathers'],
 ['The Crimson Jester','jester','#d83a4a','#f2c14e','#3a0c18','#140408',4000,'blood','fire',['bounce','hands','swarm'],'Knives bounce and juggle across the room.','Cartwheels and capers, impossible to predict.',{speed:58,charges:2},'Juggled knives'],
 ['The Tidepool Hydra','hydra','#3fc7b0','#bffff0','#0c3a38','#041412',2100,'frost','',['curtain','fan','gap'],'Three heads, three fans, and the tide.','Lunges from head to head.',{speed:44,charges:2},'Hydra heads'],
 ['The Void Seedling','seedling','#8a4fe0','#d8b8ff','#20103a','#0a0614',2150,'thorn','',['seed','spiral','mines'],'Seeds burst into the void.','Drifts, growing roots through the floor.',{speed:26,charges:0,move:'drift'},'Void seeds'],
 ['The Paper Emperor','paper','#f0e0d0','#e0405a','#38302c','#120e0c',4300,'gold','mirror',['wave','column','boomer'],'Folded cranes fly out and return.','Folds himself across the room in sharp creases.',{speed:34,charges:2,move:'blink',blink:2.0},'Paper cranes'],
 ['The Hollow Crown','crown','#7ae0a0','#c8ffd8','#103a24','#040e08',2300,'bone','',['ring','aim','spiral'],'Green fire rings spiral out.','Floats in circles, waiting for a head.',{speed:34,charges:1},'Green fire'],
 ['The Thunder Bull','bull','#f0d040','#fff6a0','#38300c','#120e04',2400,'storm','',['column','fan','wave'],'Charge lanes light up before it runs.','Charges again and again, horns crackling.',{speed:66,charges:3},'Bull charge'],
 ['The Pearl Diver','pearl','#c8e8f0','#ffb0d0','#143240','#060e14',2450,'frost','',['bounce','swarm','gap'],'Pearls bounce through the lanes.','Wades after you, trailing bubbles.',{speed:32,charges:1,trail:'ice'},'Pearls'],
 ['The Scarab Pharaoh','scarab','#e0b030','#4fa8ff','#3a2c08','#120c02',4600,'gold','sound',['column','curtain','swarm'],'Sand walls sweep with a single gap.','Marches in a rigid, regal line.',{speed:30,charges:2},'Scarab swarm'],
 ['The Hangman\'s Tree','gallows','#8a6a3a','#e0c080','#2c200e','#0e0a04',2600,'thorn','',['rain','mines','hands'],'Lanterns drop, nooses swing.','Rooted in place; its branches reach.',{speed:14,charges:0,move:'drift'},'Swinging lanterns'],
 ['The Opera Phantom','phantom','#d0c0f0','#ff5a8a','#2a2040','#0c0814',2700,'sound','',['spiral','aim','gap'],'A crescendo of rings, then a solo.','Sweeps across the stage in dramatic strokes.',{speed:48,charges:1,move:'blink',blink:2.4},'Aria'],
 ['The Crystal Lich','lich','#c070f0','#e8b0ff','#2a1040','#0a0414',5000,'mirror','bone',['bounce','ring','column'],'Prismatic shards split and ricochet.','Hovers in place, casting from afar.',{speed:22,charges:2},'Prism shards'],
 ['The Rime Wolf','wolf','#a8d8f0','#ffffff','#183444','#08121a',2850,'frost','',['aim','swarm','curtain'],'Ice fangs home in from three sides.','Prowls and then lunges.',{speed:64,charges:2,trail:'ice'},'Ice fangs'],
 ['The Twin Moons','moons','#dcd8f8','#202040','#201c40','#08060e',5200,'mirror','sound',['gap','spiral','bounce'],'Two moons, two rings, one gap.','Orbits you, always on the opposite side.',{speed:44,charges:1,move:'mirror'},'Moonlight'],
 ['The Eighth Arcanum','arcanum','#ffe9a8','#ff9acb','#3a2c18','#0a0610',7000,'storm','gold',['spiral','column','gap'],'Every pattern at once, from a card that never ends.','Moves like a fate, inevitable.',{speed:40,charges:2},'The final card'],
];
const FIRST=32;
const NEW64=SPEC.map(([name,slug,color,rays,b1,b2,hp,el,second,pats,f,s,oa,eo],j)=>({
  def:{num:ROMAN(FIRST+j+1),name,hp,color,rays,bg:[b1,b2],draw:(c,t)=>drawGeneric(c,t,color),...(second?{elite:true}:{}),
    attack(ph){ pats.forEach((p,k)=>{ if(k<2||ph) PAT[p](k===0?color:rays,ph,k); }); }},
  el,...(second?{second}:{}),sig:{f,s},oa,
  echo:{name:eo,fn:c=>every('e',3.6,()=>ECHO_OF[pats[0]](c))},
}));
export const SLUGS64=SPEC.map(r=>r[1]);
if(BOSSES.length===FIRST){ registerNewBosses(NEW64); FINALS[64]=BOSSES.length-1; }
