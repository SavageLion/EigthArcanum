// @ts-nocheck
import { GOLD, TAU } from '../core/util';
import { circle, eyes, fl, ln, poly } from './bossArt';

/* Coded art for the bosses added after the first 16. Same conventions as bossArt.ts: vector figures around the origin
   (about +-55 units), `t` is time in seconds for idle motion. They are the placeholder look until Pixel Lab art exists. */

export function drawLantern(c,t){                                    // XVII The Lantern Keeper
  const fl2=1+Math.sin(t*7)*.06;
  poly(c,[[-30,48],[-18,-8],[18,-8],[30,48],[18,40],[8,50],[0,42],[-8,50],[-18,40]]); fl(c,'#2b3a55'); ln(c,'#7a8fb5',1.6);
  circle(c,0,-18,19); fl(c,'#141a2a'); ln(c,'#7a8fb5',1.6);
  poly(c,[[-17,-10],[-9,-44],[9,-44],[17,-10],[0,-4]]); fl(c,'#1d2740');
  circle(c,-6,-18,2.6); fl(c,'#e6f0ff'); circle(c,6,-18,2.6); fl(c,'#e6f0ff');
  poly(c,[[-20,0],[-44,10],[-42,18],[-18,10]]); fl(c,'#2b3a55'); ln(c,'#7a8fb5',1.2);              // arm
  poly(c,[[-44,14],[-44,24]],false); ln(c,'#a9875a',2);
  circle(c,-44,34,17*fl2); c.globalAlpha=.25; fl(c,'#ffcf6e'); c.globalAlpha=1;                      // lantern halo
  poly(c,[[-52,24],[-36,24],[-38,46],[-50,46]]); fl(c,'#ffcf6e'); ln(c,'#7d5a22',2);
  poly(c,[[-47,30],[-41,30],[-42,42],[-46,42]]); fl(c,'#fff6d0');
  for(let i=0;i<4;i++){ const a=t*1.4+i*1.57; circle(c,Math.cos(a)*46+6,Math.sin(a)*22-6,2.8); fl(c,'#ffe9a8'); }  // wisps
}
export function drawGarden(c,t){                                     // XVIII The Glass Gardener
  poly(c,[[-3,48],[3,48],[2,10],[-2,10]]); fl(c,'#3a8f7a'); ln(c,'#79e0d0',1.2);
  poly(c,[[3,34],[24,24],[8,28]]); fl(c,'#3a8f7a'); poly(c,[[-3,38],[-24,30],[-8,32]]); fl(c,'#3a8f7a');
  for(let i=0;i<9;i++){ const a=i/9*TAU+Math.sin(t*1.2)*.12; c.save(); c.translate(0,-8); c.rotate(a); poly(c,[[0,-6],[8,-26],[0,-46],[-8,-26]]); fl(c,i%2?'#79e0d0':'#f0a8d8'); ln(c,'#e8fbff',1.1); poly(c,[[0,-6],[0,-46]],false); ln(c,'rgba(255,255,255,.55)',.8); c.restore(); }
  circle(c,0,-8,12); fl(c,'#fff6ff'); ln(c,'#f0a8d8',2); circle(c,0,-8,5); fl(c,'#79e0d0');
  for(let i=0;i<5;i++){ const a=t*.9+i*1.26,x=Math.cos(a)*50,y=Math.sin(a)*34-8; poly(c,[[x,y-6],[x+3.5,y],[x,y+6],[x-3.5,y]]); fl(c,'#e8fbff'); }
}
export function drawDoctor(c,t){                                     // XIX The Plague Doctor (elite)
  for(let i=0;i<5;i++){ const a=t*.7+i*1.3; c.globalAlpha=.3; circle(c,Math.cos(a)*44,Math.sin(a*1.2)*36+8,12+i%2*5); fl(c,'#9dbb6a'); c.globalAlpha=1; }
  poly(c,[[-36,56],[-18,-10],[18,-10],[36,56],[20,48],[0,58],[-20,48]]); fl(c,'#161218'); ln(c,'#4b4054',1.6);
  poly(c,[[-6,-8],[6,-8],[9,50],[-9,50]]); fl(c,'#2a2230');
  circle(c,0,-24,17); fl(c,'#2a2230'); ln(c,'#4b4054',1.4);
  poly(c,[[-6,-26],[6,-26],[3,-8],[-3,-8]]); fl(c,'#161218');
  poly(c,[[-5,-22],[5,-22],[0,4],[-4,-14]]); fl(c,'#d9cdb0'); ln(c,'#6f6650',1.4);                       // beak
  circle(c,-8,-28,5.5); fl(c,'#0b0814'); ln(c,'#9dbb6a',1.6); circle(c,-8,-28,2.6); fl(c,'#c8ff8a');
  circle(c,8,-28,5.5); fl(c,'#0b0814'); ln(c,'#9dbb6a',1.6); circle(c,8,-28,2.6); fl(c,'#c8ff8a');
  c.beginPath(); c.ellipse(0,-39,30,6,0,0,TAU); fl(c,'#161218'); ln(c,'#4b4054',1.4);
  poly(c,[[-16,-39],[-12,-58],[12,-58],[16,-39]]); fl(c,'#161218'); ln(c,'#4b4054',1.4);
  poly(c,[[-16,-43],[16,-43],[16,-39],[-16,-39]]); fl(c,'#6e1830');
}
export function drawKnight(c,t){                                     // XX The Rust Knight
  poly(c,[[-26,52],[-20,6],[20,6],[26,52]]); fl(c,'#7a4a2c'); ln(c,'#c98a5a',1.6);
  poly(c,[[-14,6],[14,6],[10,40],[-10,40]]); fl(c,'#5c3820');
  poly(c,[[-34,-6],[-14,-14],[-12,6],[-30,10]]); fl(c,'#a86a3c'); ln(c,'#e0b07a',1.5);                  // pauldrons
  poly(c,[[34,-6],[14,-14],[12,6],[30,10]]); fl(c,'#a86a3c'); ln(c,'#e0b07a',1.5);
  poly(c,[[-13,-30],[13,-30],[15,-6],[-15,-6]]); fl(c,'#8a5530'); ln(c,'#e0b07a',1.6);                    // helm
  poly(c,[[-9,-30],[9,-30],[0,-52]]); fl(c,'#a86a3c');
  poly(c,[[-9,-20],[9,-20],[9,-15],[-9,-15]]); fl(c,'#0b0814'); poly(c,[[-7,-19],[7,-19],[7,-16],[-7,-16]]); fl(c,'#ff9a3c');
  for(const [x,y] of [[-9,16],[9,16],[-9,28],[9,28]]) { circle(c,x,y,1.8); fl(c,'#e0b07a'); }
  poly(c,[[-3,-56+Math.sin(t*2)*2],[3,-56+Math.sin(t*2)*2],[3,52],[-3,52]]); fl(c,'#cfd7e8'); ln(c,'#6f7a96',1.2);   // sword
  poly(c,[[-14,2],[14,2],[14,7],[-14,7]]); fl(c,'#a86a3c'); ln(c,'#e0b07a',1.2);
}

/** plain stand-in used until a boss has Pixel Lab art: a glowing orb with a crown of rays and two eyes, in the boss's colour */
export function drawGeneric(c,t,col='#ffffff'){
  for(let i=0;i<10;i++){ const an=i/10*TAU+t*.5, x=Math.cos(an)*34, y=Math.sin(an)*34, r=46+Math.sin(t*4+i)*4; poly(c,[[x-7,y],[Math.cos(an)*r,Math.sin(an)*r],[x+7,y]]); fl(c,col); }
  circle(c,0,0,30); fl(c,'#1a1024'); ln(c,col,2.5); eyes(c,10,-4,5,col); poly(c,[[-9,12],[0,18],[9,12]],false); ln(c,col,2.5);
}
