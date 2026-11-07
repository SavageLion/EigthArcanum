// @ts-nocheck
/* Boss-specific spell shapes for the Runner. Every boss throws one flying spell (head height: slide under it or change lane) and one
   ground spell (jump it). The shape says who is attacking: the Cinder King throws fireballs and flame, the Bone Cellist throws notes and
   rolling bones, the Gilded Idol throws spinning coins and boulders. Colours come from the boss, except shapes that have a natural colour. */

/** The boss's flying spell as a bullet sprite for the other arenas (bosses without their own shot art): the same Pixel Lab sprite the Runner uses, tinted for the boss. Returns null if the art is missing. */
const UPRIGHT=new Set(['note','card','bell','eye','skull','coin','bubble','crystal','fireball','bolt','spore']);
export function bulletArt(stage,col,t){ const shape=(SPELLS[stage]||SPELLS[0])[0], A=art(shape,col); if(!A)return null; return {img:A,spin:UPRIGHT.has(shape)?0:(SPIN[shape]||2)}; }
/** per boss index: [flying spell, ground spell]. The final boss (63) rotates through several. */
export const SPELLS=[
 ['fireball','flame'],['crystal','shard'],['bell','ring'],['bolt','ring'],['thorn','thorns'],['skull','bones'],['crystal','shard'],['eye','ring'],
 ['bubble','wave'],['cog','cog'],['spore','thorns'],['fireball','thorns'],['star','sand'],['coin','boulder'],['star','shard'],['fireball','flame'],
 ['fireball','ring'],['crystal','thorns'],['spore','bones'],['blade','boulder'],['spore','sand'],['fireball','flame'],['cog','sand'],['bubble','thorns'],
 ['card','spikes'],['crystal','sand'],['blade','spikes'],['fireball','flame'],['eye','wave'],['spore','thorns'],['star','ring'],['skull','boulder'],
 ['card','sand'],['bubble','wave'],['note','bones'],['fireball','flame'],['bubble','wave'],['cog','spikes'],['blade','spikes'],['spore','thorns'],
 ['bolt','ring'],['note','bones'],['coin','boulder'],['eye','sand'],['skull','spikes'],['crystal','shard'],['crystal','boulder'],['bubble','boulder'],
 ['spore','wave'],['blade','wave'],['card','spikes'],['bubble','wave'],['eye','thorns'],['card','spikes'],['coin','shard'],['bolt','boulder'],
 ['bubble','wave'],['coin','sand'],['skull','thorns'],['note','ring'],['crystal','shard'],['crystal','shard'],['star','ring'],['eye','ring'],
];
export const FINAL_ORBS=['eye','star','fireball','crystal','skull','bolt','note','coin'];
/** how each flying spell moves: extra approach speed, sideways wobble amplitude and rate */
export const MOTION={ fireball:{spd:240,wa:14,wf:5}, crystal:{spd:265,wa:8,wf:4}, bell:{spd:200,wa:0,wf:3}, bolt:{spd:340,wa:24,wf:11}, thorn:{spd:240,wa:10,wf:4}, skull:{spd:230,wa:16,wf:4},
  eye:{spd:200,wa:10,wf:3}, bubble:{spd:190,wa:20,wf:3}, cog:{spd:255,wa:6,wf:4}, spore:{spd:200,wa:22,wf:3.5}, star:{spd:245,wa:12,wf:5}, coin:{spd:265,wa:10,wf:6}, blade:{spd:310,wa:8,wf:5}, card:{spd:270,wa:18,wf:4.5}, note:{spd:215,wa:18,wf:4} };
const PAL={ coin:['#e0b050','#ffe9a8'], skull:['#d9d3b8','#fffbe6'], card:['#f1e8d4','#ffffff'], bones:['#d9d3b8','#fffbe6'], boulder:['#6a5d78','#a89bb8'], sand:['#d8b878','#f4e2b0'], spikes:['#cfd7e8','#ffffff'], thorns:['#4a7a44','#9bd68a'] };
export const palette=(shape,col,hi)=>PAL[shape]||[col,hi];

import { SPELL_ART } from '../render/sprites';
const T=6.2832;
/** shapes that keep their own colours; everything else is tinted toward the boss's colour */
const NATURAL=new Set(['coin','skull','card','bell','cog','note','g-bones','g-boulder','g-sand','g-spikes','g-thorns']);
const SPIN={blade:5,thorn:2.5,star:2,cog:3};
const tintCache={};
function art(name,col){ const im=SPELL_ART[name]; if(!im)return null; if(NATURAL.has(name))return im; const k=name+col; if(tintCache[k])return tintCache[k]; const c=document.createElement('canvas'); c.width=im.width; c.height=im.height; const g=c.getContext('2d'); g.drawImage(im,0,0); g.globalCompositeOperation='source-atop'; g.fillStyle=rgba(col,.38); g.fillRect(0,0,c.width,c.height); return tintCache[k]=c; }
const arc=(c,x,y,r)=>{ c.beginPath(); c.arc(x,y,Math.max(.5,r),0,T); };
const poly=(c,pts)=>{ c.beginPath(); pts.forEach(([a,b],i)=>i?c.lineTo(a,b):c.moveTo(a,b)); c.closePath(); };
const rgba=(h,a)=>{ const n=parseInt(h.slice(1,7),16); return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`; };

/** flying spell, centred on (x,y) with radius r (already perspective-scaled) */
export function drawOrb(c,shape,x,y,r,t,seed,col,hi){
  const A=art(shape,col);
  if(A){ const sz=r*3.1, sw=shape==='coin'||shape==='card'?Math.max(.15,Math.abs(Math.cos(t*(shape==='coin'?6:5)+seed))):1;
    { const rr=r*2.1*(1+Math.sin(t*14+seed)*.08), g=c.createRadialGradient(x,y,1,x,y,rr); g.addColorStop(0,rgba(col,.4)); g.addColorStop(1,rgba(col,0)); c.fillStyle=g; c.beginPath(); c.arc(x,y,rr,0,T); c.fill(); }
    c.save(); c.translate(x,y); if(SPIN[shape])c.rotate(t*SPIN[shape]+seed); c.scale(sw,1); c.drawImage(A,-sz/2,-sz/2,sz,sz); c.restore(); return; }
  const [m,h]=palette(shape,col,hi), glow=()=>{ c.fillStyle=rgba(m,.26); arc(c,x,y,r*1.9*(1+Math.sin(t*14+seed)*.1)); c.fill(); };
  switch(shape){
    case 'fireball': { for(let i=4;i>=1;i--){ c.fillStyle=rgba(i%2?m:h,.38-.07*i); arc(c,x+Math.sin(t*9+i+seed)*r*.25,y-i*r*.55,r*(1-.17*i)); c.fill(); }
      glow(); c.fillStyle=m; arc(c,x,y,r); c.fill(); c.fillStyle=h; arc(c,x-r*.1,y+r*.1,r*.55); c.fill(); c.fillStyle='#fff'; arc(c,x,y+r*.15,r*.22); c.fill(); break; }
    case 'crystal': { glow(); c.fillStyle='#0b0814'; poly(c,[[x,y-r*1.3],[x+r*.9,y],[x,y+r*1.3],[x-r*.9,y]]); c.fill(); c.fillStyle=m; poly(c,[[x,y-r*1.2],[x+r*.8,y],[x,y+r*1.2],[x-r*.8,y]]); c.fill(); c.fillStyle=h; poly(c,[[x,y-r*1.2],[x+r*.8,y],[x,y]]); c.fill(); c.fillStyle='rgba(255,255,255,.7)'; c.fillRect(x-r*.12,y-r*.7,Math.max(1,r*.2),r*.5); break; }
    case 'bell': { for(let i=0;i<2;i++){ const p=((t*1.6+i*.5+seed)%1); c.strokeStyle=rgba(h,.5*(1-p)); c.lineWidth=Math.max(1,r*.18); arc(c,x,y,r*(1.1+p*1.1)); c.stroke(); }
      glow(); c.fillStyle='#0b0814'; poly(c,[[x-r*.35,y-r*1.1],[x+r*.35,y-r*1.1],[x+r*1.05,y+r*.8],[x-r*1.05,y+r*.8]]); c.fill(); c.fillStyle=m; poly(c,[[x-r*.3,y-r],[x+r*.3,y-r],[x+r*.95,y+r*.7],[x-r*.95,y+r*.7]]); c.fill(); c.fillStyle=h; c.fillRect(x-r*.2,y-r*.9,r*.16,r*1.4); arc(c,x+Math.sin(t*9)*r*.2,y+r*.95,r*.28); c.fill(); break; }
    case 'bolt': { glow(); c.strokeStyle=h; c.lineWidth=Math.max(1.5,r*.34); c.lineJoin='round'; c.beginPath(); for(let i=0;i<=6;i++){ const yy=y-r*1.4+i*r*.47, xx=x+((i%2?1:-1)*r*.55)*(i===0||i===6?0:1)+Math.sin(t*30+i+seed)*r*.12; i?c.lineTo(xx,yy):c.moveTo(xx,yy); } c.stroke(); c.strokeStyle='#fff'; c.lineWidth=Math.max(1,r*.12); c.stroke(); break; }
    case 'thorn': { const rot=t*3+seed; glow(); c.fillStyle=m; for(let i=0;i<8;i++){ const a=rot+i*T/8; poly(c,[[x+Math.cos(a-.22)*r*.8,y+Math.sin(a-.22)*r*.8],[x+Math.cos(a)*r*1.5,y+Math.sin(a)*r*1.5],[x+Math.cos(a+.22)*r*.8,y+Math.sin(a+.22)*r*.8]]); c.fill(); } c.fillStyle='#2a3a28'; arc(c,x,y,r*.85); c.fill(); c.fillStyle=h; arc(c,x-r*.2,y-r*.2,r*.35); c.fill(); break; }
    case 'skull': { glow(); c.fillStyle='#0b0814'; arc(c,x,y-r*.1,r*1.08); c.fill(); c.fillStyle=m; arc(c,x,y-r*.1,r); c.fill(); c.fillRect(x-r*.55,y+r*.5,r*1.1,r*.6); c.fillStyle=h; arc(c,x-r*.25,y-r*.35,r*.35); c.fill(); c.fillStyle='#120a1c'; arc(c,x-r*.38,y-r*.1,r*.26); c.fill(); arc(c,x+r*.38,y-r*.1,r*.26); c.fill(); c.fillRect(x-r*.1,y+r*.2,r*.2,r*.25); c.fillStyle='#120a1c'; for(let i=-1;i<=1;i++)c.fillRect(x+i*r*.3-r*.06,y+r*.65,r*.12,r*.35); c.fillStyle=rgba(col,.6); arc(c,x-r*.38,y-r*.1,r*.1); c.fill(); arc(c,x+r*.38,y-r*.1,r*.1); c.fill(); break; }
    case 'eye': { glow(); c.fillStyle='#0b0814'; c.beginPath(); c.ellipse(x,y,r*1.4,r*.95,0,0,T); c.fill(); c.fillStyle='#f3ecd8'; c.beginPath(); c.ellipse(x,y,r*1.3,r*.85,0,0,T); c.fill(); const lx=Math.sin(t*2+seed)*r*.25; c.fillStyle=m; arc(c,x+lx,y,r*.62); c.fill(); c.fillStyle='#120a1c'; c.beginPath(); c.ellipse(x+lx,y,r*.14,r*.5,0,0,T); c.fill(); c.fillStyle=h; arc(c,x+lx-r*.2,y-r*.2,r*.14); c.fill(); break; }
    case 'bubble': { c.fillStyle=rgba(m,.22); arc(c,x,y,r*1.25); c.fill(); c.strokeStyle=rgba(h,.85); c.lineWidth=Math.max(1,r*.14); arc(c,x,y,r*1.1); c.stroke(); c.fillStyle=rgba(m,.35); arc(c,x,y+r*.1,r*.8); c.fill(); c.fillStyle='rgba(255,255,255,.85)'; arc(c,x-r*.4,y-r*.4,r*.24); c.fill(); arc(c,x+r*.3,y+r*.45,r*.1); c.fill(); break; }
    case 'cog': { const rot=t*4+seed; glow(); c.fillStyle='#0b0814'; arc(c,x,y,r*1.2); c.fill(); c.fillStyle=m; for(let i=0;i<8;i++){ const a=rot+i*T/8; poly(c,[[x+Math.cos(a-.2)*r*.9,y+Math.sin(a-.2)*r*.9],[x+Math.cos(a-.15)*r*1.3,y+Math.sin(a-.15)*r*1.3],[x+Math.cos(a+.15)*r*1.3,y+Math.sin(a+.15)*r*1.3],[x+Math.cos(a+.2)*r*.9,y+Math.sin(a+.2)*r*.9]]); c.fill(); } arc(c,x,y,r); c.fill(); c.fillStyle=h; arc(c,x-r*.15,y-r*.15,r*.55); c.fill(); c.fillStyle='#120a1c'; arc(c,x,y,r*.3); c.fill(); break; }
    case 'spore': { glow(); const pts=[[0,0,1],[-.7,-.5,.6],[.7,-.4,.65],[-.5,.6,.55],[.6,.65,.5]]; for(const [a,b,k] of pts){ const wx=Math.sin(t*3+a*5+seed)*r*.1; c.fillStyle=m; arc(c,x+a*r+wx,y+b*r,r*.62*k); c.fill(); c.fillStyle=h; arc(c,x+a*r+wx-r*.12,y+b*r-r*.12,r*.22*k); c.fill(); } break; }
    case 'star': { const rot=t*2+seed; glow(); c.fillStyle='#0b0814'; c.beginPath(); for(let i=0;i<10;i++){ const a=rot+i*T/10-1.57, rr=(i%2?.55:1.35)*r*1.08; c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr); } c.closePath(); c.fill(); c.fillStyle=m; c.beginPath(); for(let i=0;i<10;i++){ const a=rot+i*T/10-1.57, rr=(i%2?.5:1.3)*r; c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr); } c.closePath(); c.fill(); c.fillStyle=h; arc(c,x,y,r*.35); c.fill(); break; }
    case 'coin': { const sw=Math.abs(Math.cos(t*6+seed)); glow(); c.fillStyle='#0b0814'; c.beginPath(); c.ellipse(x,y,Math.max(1,r*1.15*sw),r*1.15,0,0,T); c.fill(); c.fillStyle=m; c.beginPath(); c.ellipse(x,y,Math.max(1,r*sw),r,0,0,T); c.fill(); c.fillStyle=h; c.beginPath(); c.ellipse(x,y,Math.max(1,r*.7*sw),r*.7,0,0,T); c.fill(); c.fillStyle=m; c.fillRect(x-Math.max(.5,r*.08*sw),y-r*.4,Math.max(1,r*.16*sw),r*.8); break; }
    case 'blade': { const rot=t*9+seed; glow(); c.fillStyle='#0b0814'; for(let i=0;i<4;i++){ const a=rot+i*T/4; poly(c,[[x+Math.cos(a)*r*1.5,y+Math.sin(a)*r*1.5],[x+Math.cos(a+.5)*r*.55,y+Math.sin(a+.5)*r*.55],[x+Math.cos(a-1.1)*r*.5,y+Math.sin(a-1.1)*r*.5]]); c.fill(); } c.fillStyle=m; for(let i=0;i<4;i++){ const a=rot+i*T/4; poly(c,[[x+Math.cos(a)*r*1.35,y+Math.sin(a)*r*1.35],[x+Math.cos(a+.5)*r*.5,y+Math.sin(a+.5)*r*.5],[x,y]]); c.fill(); } c.fillStyle=h; arc(c,x,y,r*.28); c.fill(); break; }
    case 'card': { const sw=Math.cos(t*5+seed), w=Math.max(r*.15,Math.abs(sw)*r*1.0), hh=r*1.4; glow(); c.fillStyle='#0b0814'; c.fillRect(x-w-1,y-hh-1,w*2+2,hh*2+2); c.fillStyle=sw>0?m:h; c.fillRect(x-w,y-hh,w*2,hh*2); if(sw>0){ c.fillStyle=col; poly(c,[[x,y-hh*.5],[x+w*.6,y],[x,y+hh*.5],[x-w*.6,y]]); c.fill(); } else { c.fillStyle=col; c.fillRect(x-w*.7,y-hh*.7,w*1.4,hh*1.4); c.fillStyle=h; c.fillRect(x-w*.5,y-hh*.5,w,hh); } break; }
    case 'note': { glow(); c.fillStyle='#0b0814'; c.beginPath(); c.ellipse(x-r*.3,y+r*.7,r*.78,r*.58,-.4,0,T); c.fill(); c.fillRect(x+r*.3,y-r*1.5,r*.34,r*2.3); c.fillStyle=m; c.beginPath(); c.ellipse(x-r*.3,y+r*.7,r*.65,r*.46,-.4,0,T); c.fill(); c.fillRect(x+r*.38,y-r*1.4,r*.2,r*2.1); poly(c,[[x+r*.55,y-r*1.4],[x+r*1.4,y-r*.7],[x+r*1.2,y-r*.1],[x+r*.55,y-r*.7]]); c.fill(); c.fillStyle=h; c.beginPath(); c.ellipse(x-r*.45,y+r*.6,r*.25,r*.16,-.4,0,T); c.fill(); break; }
    default: { glow(); c.fillStyle=m; arc(c,x,y,r); c.fill(); c.fillStyle=h; arc(c,x-r*.2,y-r*.2,r*.5); c.fill(); }
  }
}

/** ground spell with its base on (x,yb); s = perspective scale. Jump it. */
export function drawLow(c,shape,x,yb,s,t,seed,col,hi){
  const G_=art('g-'+shape,col)||(shape==='cog'?art('cog',col):null);
  if(G_&&shape!=='ring'){ const spin=shape==='boulder'||shape==='cog', w=(shape==='cog'?46:66)*s, h=(shape==='cog'?46:44)*s; c.fillStyle='rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(x,yb,w*.45,h*.12,0,0,T); c.fill();
    if(spin){ c.save(); c.translate(x,yb-h*.5); c.rotate(t*4+seed); c.drawImage(G_,-w/2,-h/2,w,h); c.restore(); } else c.drawImage(G_,x-w/2,yb-h,w,h); return; }
  if(G_&&shape==='ring'){ const w=70*s, h=46*s, p=(t*2+seed)%1; c.globalAlpha=.8; c.drawImage(G_,x-w/2*(1+p*.1),yb-h*.75,w*(1+p*.1),h*.9); c.globalAlpha=1; return; }
  const [m,h]=palette(shape,col,hi), w=46*s, hh=44*s;
  switch(shape){
    case 'flame': { c.fillStyle=rgba(m,.28); c.beginPath(); c.ellipse(x,yb,w*.9,hh*.35,0,0,T); c.fill(); for(let i=0;i<4;i++){ const fx=x+(i-1.5)*w*.42, fl=Math.sin(t*10+i*2+seed)*.2+1, fh=hh*(.7+.3*((i*7)%3)/2)*fl; c.fillStyle=i%2?m:h; poly(c,[[fx-w*.22,yb],[fx+Math.sin(t*8+i)*w*.08,yb-fh],[fx+w*.22,yb]]); c.fill(); } c.fillStyle='#fff6d0'; poly(c,[[x-w*.1,yb],[x,yb-hh*.45],[x+w*.1,yb]]); c.fill(); break; }
    case 'thorns': { c.fillStyle='#0b0814'; for(let i=0;i<5;i++){ const fx=x+(i-2)*w*.38; poly(c,[[fx-w*.2,yb+1],[fx+((i%2)?w*.1:-w*.1),yb-hh*(.8+.25*(i%3))-1],[fx+w*.2,yb+1]]); c.fill(); } for(let i=0;i<5;i++){ const fx=x+(i-2)*w*.38; c.fillStyle=m; poly(c,[[fx-w*.16,yb],[fx+((i%2)?w*.1:-w*.1),yb-hh*(.8+.25*(i%3))],[fx+w*.16,yb]]); c.fill(); c.fillStyle=h; poly(c,[[fx,yb],[fx+((i%2)?w*.1:-w*.1),yb-hh*(.8+.25*(i%3))],[fx+w*.16,yb]]); c.fill(); } break; }
    case 'bones': { const rot=t*5+seed; c.fillStyle='#0b0814'; arc(c,x,yb-hh*.45,hh*.52); c.fill(); c.fillStyle=m; arc(c,x,yb-hh*.45,hh*.46); c.fill(); c.fillStyle='#120a1c'; arc(c,x-hh*.17,yb-hh*.5,hh*.12); c.fill(); arc(c,x+hh*.17,yb-hh*.5,hh*.12); c.fill(); c.fillRect(x-hh*.04,yb-hh*.4,hh*.08,hh*.12);
      c.save(); c.translate(x,yb-hh*.45); c.rotate(Math.sin(rot)*.2); c.fillStyle=h; c.fillRect(-w*.85,hh*.34,w*1.7,hh*.1); arc(c,-w*.85,hh*.39,hh*.12); c.fill(); arc(c,w*.85,hh*.39,hh*.12); c.fill(); c.restore(); break; }
    case 'wave': { c.fillStyle='#0b0814'; c.beginPath(); c.moveTo(x-w,yb+1); c.quadraticCurveTo(x-w*.4,yb-hh*1.3,x+w*.2,yb-hh*.9); c.quadraticCurveTo(x+w*.5,yb-hh*.7,x+w*.35,yb-hh*.45); c.quadraticCurveTo(x+w*.8,yb-hh*.3,x+w,yb+1); c.fill(); c.fillStyle=m; c.beginPath(); c.moveTo(x-w*.92,yb); c.quadraticCurveTo(x-w*.4,yb-hh*1.2,x+w*.2,yb-hh*.82); c.quadraticCurveTo(x+w*.42,yb-hh*.66,x+w*.3,yb-hh*.45); c.quadraticCurveTo(x+w*.7,yb-hh*.28,x+w*.92,yb); c.fill(); c.fillStyle=h; c.fillRect(x-w*.3+Math.sin(t*6)*w*.05,yb-hh*.82,w*.55,Math.max(1,hh*.08)); c.fillStyle='rgba(255,255,255,.8)'; arc(c,x+w*.1,yb-hh*.95,Math.max(1,hh*.07)); c.fill(); break; }
    case 'boulder': { const rot=t*4+seed; c.save(); c.translate(x,yb-hh*.5); c.rotate(rot); c.fillStyle='#0b0814'; poly(c,[[-hh*.6,-hh*.1],[-hh*.3,-hh*.55],[hh*.25,-hh*.58],[hh*.62,-hh*.1],[hh*.45,hh*.45],[-hh*.35,hh*.5]]); c.fill(); c.fillStyle=m; poly(c,[[-hh*.52,-hh*.08],[-hh*.26,-hh*.48],[hh*.22,-hh*.5],[hh*.54,-hh*.08],[hh*.4,hh*.4],[-hh*.3,hh*.43]]); c.fill(); c.fillStyle=h; poly(c,[[-hh*.26,-hh*.48],[hh*.22,-hh*.5],[0,-hh*.1],[-hh*.3,-hh*.05]]); c.fill(); c.restore(); break; }
    case 'ring': { const p=(t*2+seed)%1; c.strokeStyle=rgba(m,.35); c.lineWidth=Math.max(1,hh*.2); c.beginPath(); c.ellipse(x,yb-hh*.08,w*(.7+p*.35),hh*.3*(.8+p*.3),0,0,T); c.stroke(); c.strokeStyle=h; c.lineWidth=Math.max(1,hh*.1); c.beginPath(); c.ellipse(x,yb-hh*.08,w*.8,hh*.3,0,0,T); c.stroke(); c.fillStyle=rgba(m,.3); c.beginPath(); c.ellipse(x,yb-hh*.08,w*.62,hh*.22,0,0,T); c.fill(); c.fillStyle=h; poly(c,[[x-w*.1,yb-hh*.08],[x,yb-hh*.75],[x+w*.1,yb-hh*.08]]); c.fill(); break; }
    case 'cog': { const rot=t*5+seed, cy=yb-hh*.45; c.save(); c.translate(x,cy); c.rotate(rot); const R=hh*.62; c.fillStyle='#0b0814'; arc(c,0,0,R*1.1); c.fill(); c.fillStyle=m; for(let i=0;i<8;i++){ c.save(); c.rotate(i*T/8); c.fillRect(-R*.16,-R*1.05,R*.32,R*.45); c.restore(); } arc(c,0,0,R*.85); c.fill(); c.fillStyle=h; arc(c,-R*.15,-R*.15,R*.45); c.fill(); c.fillStyle='#120a1c'; arc(c,0,0,R*.25); c.fill(); c.restore(); break; }
    case 'spikes': { c.fillStyle='#0b0814'; c.fillRect(x-w-1,yb-hh*.18-1,w*2+2,hh*.2+1); for(let i=0;i<5;i++){ const sx=x-w+i*(w*2/5); c.fillStyle=m; poly(c,[[sx,yb-hh*.16],[sx+w*.2,yb-hh*(.95+.1*(i%2))],[sx+w*.4,yb-hh*.16]]); c.fill(); c.fillStyle=h; poly(c,[[sx+w*.2,yb-hh*(.95+.1*(i%2))],[sx+w*.4,yb-hh*.16],[sx+w*.2,yb-hh*.16]]); c.fill(); } break; }
    case 'sand': { c.fillStyle='#0b0814'; c.beginPath(); c.ellipse(x,yb-hh*.15,w*1.05,hh*.33,0,0,T); c.fill(); c.fillStyle=m; c.beginPath(); c.ellipse(x,yb-hh*.17,w,hh*.3,0,0,T); c.fill(); for(let i=0;i<3;i++){ c.fillStyle=i%2?h:m; c.beginPath(); c.ellipse(x+Math.sin(t*4+i+seed)*w*.12,yb-hh*(.3+i*.2),w*(.75-i*.2),hh*.2,0,0,T); c.fill(); } c.fillStyle='#fff6d0'; for(let i=0;i<4;i++){ const a=t*6+i*1.6+seed; c.fillRect(x+Math.cos(a)*w*.6,yb-hh*.7+Math.sin(a*1.3)*hh*.25,Math.max(1,hh*.05),Math.max(1,hh*.05)); } break; }
    default: { /* shard */ c.fillStyle='#0b0814'; poly(c,[[x,yb-hh*1.2-1],[x+w*.5+1,yb-hh*.4],[x+w*.25,yb+1],[x-w*.25,yb+1],[x-w*.5-1,yb-hh*.4]]); c.fill(); c.fillStyle=m; poly(c,[[x,yb-hh*1.2],[x+w*.5,yb-hh*.4],[x+w*.25,yb],[x-w*.25,yb],[x-w*.5,yb-hh*.4]]); c.fill(); c.fillStyle=h; c.fillRect(x-w*.12+Math.sin(t*6+seed)*w*.12,yb-hh*1.0,Math.max(1,w*.14),hh*.6); }
  }
}
