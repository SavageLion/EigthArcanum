// @ts-nocheck
import { W } from '../core/dom';
import { G } from '../core/state';
import { column, every, fan, gapRing, ring, seed, shot, spiral, wave } from '../systems/attacks';
import { shuffle } from '../systems/deck';
import { burst } from '../systems/sim';
import { drawBell, drawBone, drawCinder, drawDevil, drawEmperor, drawFrost, drawHive, drawJudge, drawMirror, drawPriestess, drawProphet, drawQueen, drawStorm, drawThorn, drawVoid, drawWidow } from '../render/bossArt';
import { GOLD, TAU, rnd } from '../core/util';
import { sfx } from '../core/audio';

/* ---------- boss art: engraved card figures ---------- */


/* ---------- the deck ---------- */
export const BOSSES=[
{num:'I',name:'The Cinder King',hp:90,color:'#f0813f',rays:'#e8743b',bg:['#471813','#1c0a0c'],draw:drawCinder,
 attack(ph){ every('fan',1.15,()=>fan(ph?7:5,ph?1.05:.8,175));
   if(ph) every('rain',2.3,()=>{for(let i=0;i<4;i++)shot(rnd(25,W-25),30,Math.PI/2,rnd(130,180),{r:6.5,c:'#ffc15e'})}); },},
{num:'II',name:'The Frost Matron',hp:170,color:'#8fdcf0',rays:'#79c6dd',bg:['#16364f','#0b1324'],draw:drawFrost,
 attack(ph){ every('ring',1.7,()=>gapRing(ph?26:20,125,4));
   if(ph) every('shard',.62,()=>fan(1,0,250,{r:4.5,c:'#e6f7fa'})); },},
{num:'III',name:'The Hollow Bell',hp:230,color:'#f0d9a5',rays:'#c9a76b',bg:['#3b2a1a','#150e12'],draw:drawBell,
 attack(ph){ every('wave',ph?1.5:2.1,()=>{wave(165,.62);sfx.toll();});
   every('fan',ph?1.3:1.9,()=>fan(3,.34,170,{r:5,c:'#ffe9bd'})); },},
{num:'IV',name:'The Storm Eye',hp:300,color:'#f0dc55',rays:'#8c97c9',bg:['#232a52','#0c0e20'],draw:drawStorm,
 attack(ph){ every('col',ph?.95:1.3,()=>{column(G.P.x); if(ph)column(G.P.x+rnd(70,140)*(Math.random()<.5?-1:1));});
   every('spark',ph?1.5:2.2,()=>fan(5,.9,190,{r:4.5,c:'#fff2a0'})); },},
{num:'V',name:'The Mother of Thorns',hp:380,color:'#e46a80',rays:'#9dbb6a',bg:['#23401f','#0d1610'],draw:drawThorn,
 attack(ph){ every('seed',ph?1.1:1.55,()=>{seed(ph?10:8); if(ph)seed(8);});
   if(ph) every('vine',.16,()=>spiral(2,.36,125,{r:4.5,c:'#b9d57a'})); },},
{num:'VI',name:'The Bone Tyrant',hp:620,color:'#e9e3cb',rays:'#a8f0b0',bg:['#2c2a35','#100e16'],draw:drawBone,
 attack(ph){ if((G.B.t%4.2)<2.8) every('sp',.1,()=>spiral(ph?3:2,.29,130,{r:5}));
   every('skull',ph?1.2:1.9,()=>fan(ph?3:1,.3,235,{r:7,c:'#a8f0b0'})); },},
{num:'VII',name:'The Mirror Witch',hp:800,color:'#f0a8d8',rays:'#aebed6',bg:['#3a2548','#120c1c'],draw:drawMirror,
 move(b,dt){ b.jump-=dt; if(b.jump<=0){ b.jump=4.2; burst(b.x,b.y,'#f0a8d8',14); b.tx=rnd(70,W-70); b.x=b.tx; b.flash=.2; } b.y=150+Math.sin(b.t*1.3)*10; },
 attack(ph){ every('bounce',ph?1.05:1.4,()=>fan(ph?5:4,1.5,165,{bounce:ph?3:2,floor:ph,r:6}));
   every('aim',1.8,()=>fan(1,0,240,{r:4.5,c:'#ffffff'})); },},
{num:'VIII',name:'The Void Sovereign',hp:1200,color:'#b78cff',rays:'#dcb868',bg:['#1f1140','#07040f'],draw:drawVoid,
 attack(ph){ const k=Math.floor(G.B.t/7)%3;
   if(k===0){ every('sp',.1,()=>spiral(ph?3:2,.27,130,{r:5})); }
   if(k===1){ every('wave',1.5,()=>{wave(170,.6);sfx.toll();}); every('gr',1.5,()=>gapRing(20,120,4,{c:GOLD})); }
   if(k===2){ every('col',1.0,()=>{column(G.P.x);column(G.P.x+rnd(80,150)*(Math.random()<.5?-1:1));}); every('seed',1.6,()=>seed(8)); }
   if(ph) every('fan',1.5,()=>fan(5,.9,195,{r:5,c:GOLD})); },}
];

/* ---------- the larger deck: five more regular bosses and three elites ---------- */
export function curtain(fromLeft,c){ const gap=rnd(G.H*.42,G.H*.8); for(let y=G.H*.28;y<G.H-20;y+=30){ if(Math.abs(y-gap)>46) shot(fromLeft?-8:W+8,y,fromLeft?0:Math.PI,105,{r:5.5,c}); } }
export function hands(n,o){ G.B.hand=(G.B.hand||0)+.17; for(let i=0;i<n;i++) [85,125,165].forEach(s=>shot(G.B.x,G.B.y,G.B.hand+i/n*TAU,s,o)); }
export function swarm(n,o){ for(let i=0;i<n;i++) shot(G.B.x,G.B.y,rnd(0,TAU),rnd(95,130),{home:1.7,r:4.5,...o}); }
export function mines(n,o){ for(let i=0;i<n;i++){ const a=i/n*TAU+G.B.t; shot(G.B.x,G.B.y,a,175,{stall:.95,sp:210,r:5.5,...o}); } }
export function boomerang(n,o){ ring(n,190,{ret:.75,r:5.5,...o}); }
const NEW_BOSSES=[
 {num:'IX',name:'The Drowned Queen',color:'#6cc2db',rays:'#6cc2db',bg:['#10394a','#071420'],draw:drawQueen,attack(ph){ every('cur',ph?2.2:2.9,()=>{G.B.side=!G.B.side;curtain(G.B.side);}); every('fan',ph?1.5:2,()=>fan(3,.5,165,{r:5})); }},
 {num:'X',name:'The Clockwork Judge',color:'#e4c946',rays:'#dcb868',bg:['#2d2c55','#10101f'],draw:drawJudge,attack(ph){ if((G.B.t%5)<3.4) every('hand',ph?.42:.56,()=>hands(ph?3:2)); every('strike',ph?1.6:2.4,()=>column(G.P.x)); }},
 {num:'XI',name:'The Hive Mother',color:'#f2a03d',rays:'#e4c946',bg:['#4a3412','#171007'],draw:drawHive,attack(ph){ every('sw',ph?1.25:1.8,()=>swarm(ph?7:5)); if(ph) every('r',2.5,()=>ring(10,105,{r:4.5,c:'#e4c946'})); }},
 {num:'XII',name:'The Ash Widow',color:'#e8592c',rays:'#f0813f',bg:['#3b1712','#130807'],draw:drawWidow,attack(ph){ every('mine',ph?1.7:2.3,()=>mines(ph?10:8)); every('fan',ph?1.6:2.4,()=>fan(3,.4,180,{r:5,c:'#ffd27a'})); }},
 {num:'XIII',name:'The Sand Prophet',color:'#f0d9a5',rays:'#a9875a',bg:['#57401f','#1a120b'],draw:drawProphet,attack(ph){ every('boom',ph?1.7:2.3,()=>boomerang(ph?16:12)); if(ph) every('sp',.2,()=>spiral(1,.4,120,{r:4.5,c:'#f2a03d'})); else every('a',1.8,()=>fan(2,.26,190,{r:5,c:'#f2a03d'})); }},
 {num:'XIV',name:'The Emperor',elite:true,color:'#f2a03d',rays:'#e8592c',bg:['#55201a','#1b0a0a'],draw:drawEmperor,attack(ph){ every('fan',ph?.95:1.3,()=>fan(ph?9:7,1.2,180)); every('col',ph?1.3:1.9,()=>{column(G.P.x);if(ph)column(G.P.x+rnd(80,150)*(Math.random()<.5?-1:1));}); every('rain',2.6,()=>{for(let i=0;i<5;i++)shot(rnd(25,W-25),30,Math.PI/2,rnd(130,180),{r:6,c:'#ffc15e'});}); }},
 {num:'XV',name:'The High Priestess',elite:true,color:'#b9c4f5',rays:'#bfeaf2',bg:['#262a63','#0b0d24'],draw:drawPriestess,
  move(b,dt){ b.jump-=dt; if(b.jump<=0){ b.jump=4.6; burst(b.x,b.y,'#b9c4f5',14); b.x=rnd(80,W-80); b.flash=.15; } b.y=150+Math.sin(b.t*1.3)*8; },
  attack(ph){ every('gr',ph?1.3:1.7,()=>gapRing(ph?28:24,125,4)); every('b',ph?1.5:2.1,()=>fan(5,1.5,160,{bounce:ph?3:2,floor:ph,r:5.5,c:'#f0a8d8'})); if(ph) every('h',.6,()=>hands(2,{c:'#ffffff',r:4.5})); }},
 {num:'XVI',name:'The Devil',elite:true,color:'#e0405a',rays:'#b02050',bg:['#4d1020','#17060c'],draw:drawDevil,attack(ph){ if((G.B.t%4.4)<3) every('sp',.11,()=>spiral(ph?3:2,.29,130,{r:5})); every('sw',ph?1.3:1.9,()=>swarm(ph?7:5,{c:'#ffd27a'})); every('m',ph?2.1:3,()=>mines(8,{c:'#f2a03d'})); }}
];
BOSSES.push(...NEW_BOSSES);
BOSSES[7].elite=true;
export const TOTAL=16, ELITE_POS=[3,7,11,15];
/** every fourth pull is an elite, and the last pull is the run's final boss */
const isElitePull=p=>p%4===3;
export const FINALS={16:7,32:31};   // run length -> final boss index (32 and 64 get theirs when those bosses exist)
export const runAvailable=n=>n===16||(BOSSES.length>=n&&FINALS[n]!==undefined);
export function dealOrder(total=16){
  const fin=FINALS[total]??7, pool=BOSSES.map((b,i)=>i).filter(i=>i<total&&i!==fin);
  const regular=shuffle(pool.filter(i=>!BOSSES[i].elite)), elites=shuffle(pool.filter(i=>BOSSES[i].elite)), any=shuffle(pool);
  const out=[];
  for(let p=0;p<total;p++) out.push(p===total-1?fin:(isElitePull(p)?(elites.shift()??any[p%any.length]):(regular.shift()??any[p%any.length])));
  return out;
}
export const ELITE_SECOND={13:'storm',14:'frost',15:'thorn'};
