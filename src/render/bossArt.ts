import { TAU, GOLD, rnd } from '../core/util';

/* Procedural boss figures: placeholder art until Pixel Lab sheets replace them (see SPRITE_OVERRIDES). */
export function poly(c,pts,close=true){ c.beginPath(); pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); if(close)c.closePath(); }
export const ln=(c,col,w=2)=>{c.strokeStyle=col;c.lineWidth=w;c.lineJoin='round';c.lineCap='round';c.stroke()};
export const fl=(c,col)=>{c.fillStyle=col;c.fill()};
export function circle(c,x,y,r){c.beginPath();c.arc(x,y,r,0,TAU);}
export function eyes(c,dx,y,r,col){ [ -dx,dx ].forEach(s=>{circle(c,s,y,r);fl(c,col)}); }

export function drawCinder(c,t){
  for(let i=0;i<7;i++){ const a=-Math.PI/2+(i-3)*.38, h=30+Math.sin(t*9+i*2)*9, x=Math.cos(a)*30,y=Math.sin(a)*30;
    poly(c,[[x-11,y+5],[x+Math.cos(a)*h,y+Math.sin(a)*h],[x+11,y+5]]); fl(c,i%2?'#f2a03d':'#e8592c'); }
  circle(c,0,4,36); fl(c,'#2a1412'); ln(c,'#e8743b',2.5);
  poly(c,[[-30,-22],[-34,-46],[-16,-30],[0,-52],[16,-30],[34,-46],[30,-22]]); fl(c,GOLD); ln(c,'#7d5a22',1.5);
  eyes(c,13,0,5,'#ffd27a'); poly(c,[[-14,16],[-6,23],[0,17],[6,23],[14,16]],false); ln(c,'#f2a03d',2.5);
}
export function drawFrost(c,t){
  for(let i=0;i<10;i++){ c.save(); c.rotate(i/10*TAU+t*.15); poly(c,[[-5,-30],[0,-54-(i%2)*10],[5,-30]]); fl(c,i%2?'#bfeaf2':'#79c6dd'); c.restore(); }
  poly(c,[[0,-40],[30,-12],[26,34],[-26,34],[-30,-12]]); fl(c,'#1d3a58'); ln(c,'#a9e3f0',2.5);
  poly(c,[[0,-24],[17,-6],[12,18],[-12,18],[-17,-6]]); fl(c,'#e6f7fa');
  eyes(c,7,-4,3,'#1d3a58'); poly(c,[[0,-40],[0,-26]],false); ln(c,'#a9e3f0',1.5);
}
export function drawBell(c,t){
  c.rotate(Math.sin(t*2.4)*.16);
  c.beginPath(); c.moveTo(-40,32); c.quadraticCurveTo(-27,20,-25,-12); c.quadraticCurveTo(-22,-40,0,-40); c.quadraticCurveTo(22,-40,25,-12); c.quadraticCurveTo(27,20,40,32); c.closePath();
  fl(c,'#a9875a'); ln(c,'#f0d9a5',2.5);
  poly(c,[[-27,8],[27,8]],false); ln(c,'#5f4628',2); poly(c,[[-30,18],[30,18]],false); ln(c,'#5f4628',2);
  circle(c,0,-44,6); ln(c,'#f0d9a5',3);
  c.beginPath(); c.ellipse(-9,-14,5,8,0,0,TAU); c.ellipse(9,-14,5,8,0,0,TAU); fl(c,'#2a1a10');
  c.save(); c.rotate(Math.sin(t*5)*.3); poly(c,[[0,32],[0,42]],false); ln(c,'#f0d9a5',2.5); circle(c,0,46,6); fl(c,'#f0d9a5'); c.restore();
}
export function drawStorm(c,t){
  for(let i=0;i<8;i++){ const a=i/8*TAU+t*.5; circle(c,Math.cos(a)*36,Math.sin(a)*24,15); fl(c,i%2?'#3d4a73':'#55628f'); }
  c.beginPath(); c.ellipse(0,0,34,20,0,0,TAU); fl(c,'#f3ecc8'); ln(c,'#1b2038',2.5);
  const lx=Math.sin(t*1.7)*9, ly=Math.cos(t*1.1)*5;
  circle(c,lx,ly,12); fl(c,'#e4c946'); circle(c,lx,ly,6); fl(c,'#14162b');
  const bolt=Math.floor(t*6)%2; poly(c,[[-22+bolt*44,20],[-16+bolt*44,34],[-23+bolt*44,34],[-14+bolt*44,52]],false); ln(c,'#e4c946',2.5);
}
export function drawThorn(c,t){
  for(let i=0;i<9;i++){ c.save(); c.rotate(i/9*TAU+Math.sin(t*.8)*.25); c.beginPath(); c.moveTo(-10,-14); c.quadraticCurveTo(-18,-38,0,-58); c.quadraticCurveTo(18,-38,10,-14); c.closePath(); fl(c,i%2?'#8d3350':'#b84a5d'); ln(c,'#35121f',1.5);
    poly(c,[[9,-36],[17,-40],[11,-30]]); fl(c,'#e6d7a8'); c.restore(); }
  circle(c,0,0,23); fl(c,'#2e4f2e'); ln(c,'#9dbb6a',2.5);
  circle(c,0,0,10+Math.sin(t*3)*2); fl(c,'#e0c65c'); circle(c,0,0,4); fl(c,'#2a1a10');
}
export function drawBone(c,t){
  for(let i=0;i<6;i++){ const s=i<3?-1:1,k=i%3; c.beginPath(); c.moveTo(s*14,12+k*11); c.quadraticCurveTo(s*(50+Math.sin(t*2+k)*3),6+k*12,s*38,34+k*11); ln(c,'#d9d2bb',4); }
  c.beginPath(); c.moveTo(-30,-6); c.bezierCurveTo(-34,-48,34,-48,30,-6); c.quadraticCurveTo(30,12,17,18); c.lineTo(17,30); c.lineTo(-17,30); c.lineTo(-17,18); c.quadraticCurveTo(-30,12,-30,-6); c.closePath(); fl(c,'#ebe4cd'); ln(c,'#6f6650',2);
  eyes(c,12,-6,8.5,'#20142a'); eyes(c,12,-6,2.5,'#a8f0b0');
  poly(c,[[0,4],[-5,13],[5,13]]); fl(c,'#20142a');
  [-10,-3,4,11].forEach(x=>{poly(c,[[x,20],[x,30]],false);ln(c,'#6f6650',1.5)});
}
export function drawMirror(c,t){
  for(let i=0;i<6;i++){ const a=i/6*TAU+t*.8; c.save(); c.translate(Math.cos(a)*56,Math.sin(a)*40); c.rotate(a); poly(c,[[-5,-9],[6,-3],[1,10]]); fl(c,'#cfd7e8'); c.restore(); }
  c.beginPath(); c.ellipse(0,0,32,44,0,0,TAU); fl(c,'#8ea3bf'); ln(c,GOLD,4);
  c.save(); c.clip(); poly(c,[[-40,-20],[20,-50],[-6,50],[-40,50]]); fl(c,'#b8c7da'); c.restore();
  c.beginPath(); c.moveTo(-14,28); c.quadraticCurveTo(-16,-8,0,-14); c.quadraticCurveTo(16,-8,14,28); c.closePath(); fl(c,'#2b2238');
  poly(c,[[-13,-9],[0,-40],[13,-9]]); fl(c,'#2b2238');
  eyes(c,5,2,2.2,'#f0a8d8');
}
export function drawVoid(c,t,color){
  for(let i=0;i<24;i++){ c.save(); c.rotate(i/24*TAU+t*.1); const h=i%2?18:32+Math.sin(t*3+i)*5; poly(c,[[-4,-42],[0,-42-h],[4,-42]]); fl(c,i%2?'#7d5ad0':GOLD); c.restore(); }
  circle(c,0,0,44); fl(c,'#06040c'); ln(c,GOLD,2.5);
  for(let i=0;i<5;i++){ const a=i/5*TAU-t*.4; const x=Math.cos(a)*26,y=Math.sin(a)*26; c.beginPath(); c.ellipse(x,y,7,4,0,0,TAU); fl(c,'#efe6c9'); circle(c,x,y,2.4); fl(c,'#7d2bd0'); }
  circle(c,0,0,9); fl(c,'#efe6c9'); circle(c,0,0,5); fl(c,'#b02050');
}
export function drawQueen(c,t){
  for(let i=0;i<8;i++){ const s=i<4?-1:1,k=i%4; c.beginPath(); c.moveTo(s*10,10+k*5); c.quadraticCurveTo(s*(38+Math.sin(t*2+k)*8),14+k*10,s*(22+k*7),46+Math.sin(t*3+i)*5); ln(c,k%2?'#2f8f9f':'#6cc2db',5); }
  c.beginPath(); c.moveTo(-26,34); c.quadraticCurveTo(-30,-6,0,-14); c.quadraticCurveTo(30,-6,26,34); c.closePath(); fl(c,'#1d3a58'); ln(c,'#6cc2db',2.5);
  circle(c,0,-22,17); fl(c,'#bfeaf2'); eyes(c,6,-23,3,'#1d3a58');
  poly(c,[[-17,-32],[-20,-52],[-8,-40],[0,-56],[8,-40],[20,-52],[17,-32]]); fl(c,GOLD); ln(c,'#7d5a22',1.5);
}
export function drawJudge(c,t){
  for(let i=0;i<12;i++){ c.save(); c.rotate(i/12*TAU); poly(c,[[-5,-44],[0,-56],[5,-44]]); fl(c,GOLD); c.restore(); }
  circle(c,0,0,44); fl(c,'#3d4a73'); ln(c,GOLD,3); circle(c,0,0,35); fl(c,'#f1e8d4');
  for(let i=0;i<12;i++){ const a=i/12*TAU; circle(c,Math.cos(a)*29,Math.sin(a)*29,2); fl(c,'#20142a'); }
  c.save(); c.rotate(t*.8); poly(c,[[0,0],[0,-28]],false); ln(c,'#b02050',3.5); c.restore();
  c.save(); c.rotate(t*2.4); poly(c,[[0,0],[0,-20]],false); ln(c,'#20142a',4); c.restore();
  circle(c,0,0,5); fl(c,GOLD);
}
export function drawHive(c,t){
  for(let i=0;i<6;i++){ const a=i/6*TAU+.5; c.save(); c.translate(Math.cos(a)*24,Math.sin(a)*24); poly(c,[...Array(6)].map((_,k)=>[Math.cos(k/6*TAU)*16,Math.sin(k/6*TAU)*16])); fl(c,i%2?'#e4c946':'#f2a03d'); ln(c,'#7d5a22',2); c.restore(); }
  circle(c,0,0,17); fl(c,'#2a1412'); eyes(c,7,-2,4,'#e4c946');
  for(let i=0;i<5;i++){ const a=t*2.2+i*1.26,r=48+Math.sin(t*5+i)*7,x=Math.cos(a)*r,y=Math.sin(a)*r; circle(c,x,y,4); fl(c,'#e4c946'); poly(c,[[x-4,y-3],[x,y-8],[x+4,y-3]]); fl(c,'#f1e8d4'); }
}
export function drawWidow(c,t){
  [-1,1].forEach(s=>{ for(let k=0;k<4;k++){ const b=Math.sin(t*3+k)*4; c.beginPath(); c.moveTo(s*14,-8+k*7); c.lineTo(s*(44+k*2),-30+k*17+b); c.lineTo(s*(55-k),-2+k*15+b); ln(c,k%2?'#4a2420':'#f0813f',4); } });
  circle(c,0,16,23); fl(c,'#2a1412'); ln(c,'#e8592c',2); poly(c,[[0,4],[8,16],[0,28],[-8,16]]); fl(c,'#e8592c');
  circle(c,0,-14,15); fl(c,'#4a2420'); for(let i=0;i<4;i++){ circle(c,-9+i*6,-17+(i%2)*4,2.5); fl(c,'#ffd27a'); }
}
export function drawProphet(c,t){
  c.beginPath(); c.moveTo(-34,44); c.quadraticCurveTo(-30,-10,-14,-30); c.quadraticCurveTo(0,-48,14,-30); c.quadraticCurveTo(30,-10,34,44); c.closePath(); fl(c,'#a9875a'); ln(c,'#f0d9a5',2.5);
  c.beginPath(); c.ellipse(0,-20,12,14,0,0,TAU); fl(c,'#20142a'); eyes(c,5,-22,2.4,'#f2a03d');
  poly(c,[[-13,0],[13,0],[3,16],[13,34],[-13,34],[-3,16]]); fl(c,'#f1e8d4'); ln(c,'#4a2420',2);
  poly(c,[[-7,27],[7,27],[11,33],[-11,33]]); fl(c,'#f2a03d');
  for(let i=0;i<6;i++){ const a=t*1.1+i*1.05; circle(c,Math.cos(a)*50,Math.sin(a)*28-2,2.5); fl(c,'#f0d9a5'); }
}
export function drawEmperor(c,t){
  for(let i=0;i<7;i++){ c.save(); c.rotate((i-3)*.34); poly(c,[[-8,-40],[0,-62-Math.sin(t*5+i)*7],[8,-40]]); fl(c,i%2?'#f2a03d':'#e8592c'); c.restore(); }
  [-1,1].forEach(s=>{ c.beginPath(); c.moveTo(s*24,-24); c.quadraticCurveTo(s*64,-40,s*54,-6); c.quadraticCurveTo(s*48,-22,s*28,-10); c.closePath(); fl(c,'#ebe4cd'); ln(c,'#6f6650',2); });
  poly(c,[[-48,50],[-38,4],[38,4],[48,50]]); fl(c,'#b02050'); ln(c,GOLD,3); poly(c,[[-8,8],[8,8],[12,50],[-12,50]]); fl(c,GOLD);
  circle(c,0,-10,28); fl(c,'#2a1412'); ln(c,GOLD,3); eyes(c,11,-13,5,'#ffd27a'); poly(c,[[-11,3],[0,8],[11,3]],false); ln(c,'#f2a03d',3);
  poly(c,[[-24,-28],[-28,-50],[-12,-36],[0,-56],[12,-36],[28,-50],[24,-28]]); fl(c,GOLD); ln(c,'#7d5a22',2);
}
export function drawPriestess(c,t){
  [-1,1].forEach(s=>{ poly(c,[[s*48,-48],[s*62,-48],[s*62,50],[s*48,50]]); fl(c,s<0?'#20142a':'#f1e8d4'); ln(c,GOLD,2); });
  c.beginPath(); c.moveTo(-34,50); c.quadraticCurveTo(-32,-14,0,-22); c.quadraticCurveTo(32,-14,34,50); c.closePath(); fl(c,'#3d4a9c'); ln(c,'#bfeaf2',2.5);
  circle(c,0,-22,18); fl(c,'#e6dcef'); eyes(c,7,-23,3,'#3d4a9c');
  c.beginPath(); c.arc(0,-50,14,0,TAU); fl(c,'#f1e8d4'); c.beginPath(); c.arc(5,-50,12,0,TAU); fl(c,'#3d4a9c');
  poly(c,[[0,-6],[0,34]],false); ln(c,'#bfeaf2',3); poly(c,[[-9,8],[9,8]],false); ln(c,'#bfeaf2',3);
  for(let i=0;i<4;i++){ const a=t*1.4+i*1.57; circle(c,Math.cos(a)*26,18+Math.sin(a)*16,3); fl(c,'#f0a8d8'); }
}
export function drawDevil(c,t){
  [-1,1].forEach(s=>{ c.beginPath(); c.moveTo(s*22,-22); c.quadraticCurveTo(s*52,-42,s*38,-68); c.quadraticCurveTo(s*34,-44,s*12,-34); c.closePath(); fl(c,'#2a1412'); ln(c,'#e8592c',2); c.beginPath(); c.moveTo(s*30,6); c.lineTo(s*68,-14+Math.sin(t*3)*6); c.lineTo(s*56,14); c.lineTo(s*64,32); c.lineTo(s*30,28); c.closePath(); fl(c,'#4a2420'); ln(c,'#b02050',2); });
  c.beginPath(); c.moveTo(-30,-16); c.quadraticCurveTo(0,-46,30,-16); c.lineTo(20,20); c.lineTo(8,42); c.lineTo(-8,42); c.lineTo(-20,20); c.closePath(); fl(c,'#b02050'); ln(c,'#35121f',2.5);
  eyes(c,12,-8,6,'#ffd27a'); eyes(c,12,-8,2.5,'#0b0814');
  poly(c,[[-12,16],[-6,22],[0,16],[6,22],[12,16],[6,30],[-6,30]]); fl(c,'#0b0814');
  poly(c,[[-3,-34],[3,-34],[6,-24],[0,-14],[-6,-24]]); fl(c,GOLD);
}
