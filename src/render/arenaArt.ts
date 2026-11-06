// @ts-nocheck
import { G, S } from '../core/state';
import { RI, RO } from '../systems/deck';
import { BONE, GOLD, TAU } from '../core/util';
import { R, mk } from './pixel';
import { K, SPRITE_OVERRIDES } from './sprites';

/* Per-arena backdrops. Each paints onto the physical-resolution background canvas (WP x HP) after the boss-coloured
   gradient: open field = night sky with constellations, orbit = astrolabe plate, face-off = gothic hall, open arena = flagstones. */

const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const px1=(c,x,y,col,al=1,w=1)=>{c.globalAlpha=al;c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),w,w);};
function dotRing(c,cx,cy,r,col,al,gap=1){ const n=Math.max(8,Math.round(TAU*r/gap)); for(let i=0;i<n;i++){ const a=i/n*TAU; px1(c,cx+Math.cos(a)*r,cy+Math.sin(a)*r,col,al); } }
function dotLine(c,x0,y0,x1,y1,col,al,gap=1){ const n=Math.max(1,Math.round(Math.hypot(x1-x0,y1-y0)/gap)); for(let i=0;i<=n;i++) px1(c,x0+(x1-x0)*i/n,y0+(y1-y0)*i/n,col,al); }
const orbitCentre=()=>({cx:0,cy:Math.round(G.H*.45*K*R)});

/** Look of this fight's arena. Deterministic from the boss + position, so the card art, the floor and the props always agree. */
const hash=(a,b)=>{ let h=(a*374761393+b*668265263)^0x5bd1e995; h=Math.imul(h^h>>>13,1274126177); return (h^h>>>16)>>>0; };
export const arenaSeed=()=>hash(S.stage+1,(S.pos||0)+7);
export const THEMES=['flag','ash','ice','moss'];
export const arenaTheme=()=>{ const t=THEMES[arenaSeed()%THEMES.length]; return SPRITE_OVERRIDES.arena.sets&&SPRITE_OVERRIDES.arena.sets[t]?t:'flag'; };
export const arenaKind=()=>S.fo?'hall':S.orbit?'orbit':S.open?'open':'sky';

export function paintArena(c,b,WP,HP){
  const kind=arenaKind();
  G.bgDust=null; G.bgGlyph=null;
  if(kind==='open') flagstones(c,b,WP,HP);
  else if(kind==='orbit') astrolabe(c,b,WP,HP);
  else if(kind==='hall') hall(c,b,WP,HP);
  else sky(c,b,WP,HP);
  c.globalAlpha=1;
}

/* ---- open arena: flagstone floor from the Pixel Lab tile set, darkened and tinted toward the boss ---- */
function flagstones(c,b,WP,HP){
  const th=arenaTheme(), tiles=(SPRITE_OVERRIDES.arena.sets&&SPRITE_OVERRIDES.arena.sets[th])||SPRITE_OVERRIDES.arena.tiles; if(tiles.length<16) return; const flag=th==='flag';
  const rng=mulberry(1234+S.stage*7), T=32, PLAIN=flag?[0,1,8,10,13]:[1,4,8,12,13], CRACK=flag?[2,3,9,15]:[0,7,9,5], MOSS=flag?[7,14]:[2,11], INLAY=flag?[4,5,6,11,12]:[3,6,10,14,15];
  for(let ty=0;ty*T<HP;ty++) for(let tx=0;tx*T<WP;tx++){
    const r=rng(); const i=r<.58?PLAIN[(rng()*5)|0]:r<.8?CRACK[(rng()*4)|0]:r<.9?MOSS[(rng()*2)|0]:INLAY[(rng()*5)|0];
    c.drawImage(tiles[i],tx*T,ty*T);
  }
  c.globalAlpha=.6; c.fillStyle=b.bg[1]; c.fillRect(0,0,WP,HP);           // sink the floor so bolts and shots stay readable
  c.globalAlpha=.1; c.fillStyle=b.color; c.fillRect(0,0,WP,HP);
  c.globalAlpha=1; const g=c.createRadialGradient(WP/2,HP*.5,HP*.12,WP/2,HP*.5,HP*.78); g.addColorStop(0,'rgba(11,8,20,0)'); g.addColorStop(1,'rgba(11,8,20,.72)'); c.fillStyle=g; c.fillRect(0,0,WP,HP);
}

/* ---- open field: constellations, plus a drifting star layer drawn every frame ---- */
/** soft dithered cloud blobs in a colour, painted pixel by pixel so they match the rest of the art */
function cloud(c,cx,cy,rx,ry,col,al,rng){ for(let y=-ry;y<=ry;y+=2) for(let x=-rx;x<=rx;x+=2){ const d=Math.hypot(x/rx,y/ry); if(d<1&&rng()<(1-d)*1.1) px1(c,cx+x,cy+y,col,al*(1-d*.5),2); } }
function skyStyle(c,b,WP,HP,rng){
  const v=arenaSeed()%4;
  if(v===1){ for(let k=0;k<5;k++) cloud(c,WP*rng(),HP*(.1+rng()*.7),60+rng()*70,22+rng()*26,b.rays,.14,rng); }                                   // nebula
  else if(v===2){ for(let k=0;k<3;k++){ const y0=HP*(.12+k*.12), ph=rng()*6; for(let x=0;x<WP;x+=2){ const y=y0+Math.sin(x*.012+ph)*26; for(let t=0;t<34;t+=2) if(((x>>1)+(t>>1))%3) px1(c,x,y+t,k%2?'#8fe0c8':b.rays,.1*(1-t/34),2); } } }  // aurora
  else if(v===3){ for(let k=0;k<9;k++) cloud(c,WP*rng(),HP*(.05+rng()*.6),50+rng()*60,14+rng()*14,'#0b0814',.45,rng); }                      // storm banks
}
function sky(c,b,WP,HP){
  const rng=mulberry(77+S.stage*13); skyStyle(c,b,WP,HP,mulberry(arenaSeed()));
  for(let k=0;k<3;k++){
    const n=5+((rng()*3)|0); let x=WP*(.15+rng()*.7), y=HP*(.12+rng()*.62); const pts=[];
    for(let i=0;i<n;i++){ pts.push([x,y]); x+= (rng()-.5)*WP*.22; y+=(rng()-.35)*HP*.07; x=Math.min(WP-14,Math.max(14,x)); y=Math.min(HP-40,Math.max(40,y)); }
    for(let i=1;i<n;i++) dotLine(c,pts[i-1][0],pts[i-1][1],pts[i][0],pts[i][1],b.rays,.2,2);
    for(const [sx,sy] of pts){ px1(c,sx-1,sy-1,'#f0d9a5',.9,3); px1(c,sx,sy,'#ffffff',1,1); }
  }
  const d=mk(WP,HP), dc=d.getContext('2d'), r2=mulberry(5+S.stage);
  for(let i=0;i<150;i++) px1(dc,r2()*WP,r2()*HP,BONE,.25+r2()*.4);
  for(let i=0;i<16;i++){ const x=r2()*WP,y=r2()*HP; px1(dc,x,y,'#f0d9a5',.9,2); px1(dc,x-2,y+.5,'#f0d9a5',.35); px1(dc,x+3,y+.5,'#f0d9a5',.35); px1(dc,x+.5,y-2,'#f0d9a5',.35); px1(dc,x+.5,y+3,'#f0d9a5',.35); }
  d.hi=true; G.bgDust=d;
}

/* ---- orbit: engraved astrolabe plate, plus a ring of zodiac-style glyphs that turns slowly ---- */
const GLYPHS=[
 ["..###..",".#...#.","#..#..#","#.###.#","#..#..#",".#...#.","..###.."],   // sun
 ["..###..",".#.....","#......","#......","#......",".#.....","..###.."],   // moon
 ["...#...","...#...","#######","..###..",".#.#.#.","#..#..#","...#..."],   // star
 ["...#...","..#.#..",".#...#.","#.....#",".#...#.","..#.#..","...#..."],   // diamond
 ["#.....#",".#...#.","..#.#..","...#...","..#.#..",".#...#.","#.....#"],   // cross
 ["...#...","..#.#..","..#.#..",".#...#.",".#...#.","#######","......."],   // triangle
 ["#######",".#...#.",".#...#.","..#.#..","..#.#..","...#...","......."],   // inverted
 [".#####.","#.....#","#.###.#","#.#.#.#","#.###.#","#.....#",".#####."],   // ring
];
function astrolabe(c,b,WP,HP){
  const {cy}=orbitCentre(), cx=WP/2, ro=RO*K*R, ri=RI*K*R, gold='#8f7440';
  c.globalAlpha=.4; c.fillStyle='#0b0814'; c.beginPath(); c.arc(cx,cy,ro+16,0,TAU); c.fill();
  dotRing(c,cx,cy,ro+16,GOLD,.55); dotRing(c,cx,cy,ro+10,gold,.3); dotRing(c,cx,cy,(ro+ri)/2,gold,.16,2); dotRing(c,cx,cy,ri-7,gold,.25,2); dotRing(c,cx,cy,38,gold,.2,2);
  const ov=arenaSeed()%3; if(ov===1){ for(let k=0;k<6;k++){ const a=k*TAU/6; dotLine(c,cx,cy,cx+Math.cos(a)*ri,cy+Math.sin(a)*ri,b.rays,.12,3); } dotRing(c,cx,cy,ri*.6,b.rays,.2,2); } else if(ov===2){ for(let k=0;k<3;k++){ const a=k*TAU/3-TAU/4, pts=[0,1,2].map(j=>[cx+Math.cos(a+j*TAU/3)*ri*.9,cy+Math.sin(a+j*TAU/3)*ri*.9]); dotLine(c,pts[0][0],pts[0][1],pts[1][0],pts[1][1],b.rays,.14,3); } }
  for(let deg=0;deg<360;deg+=3){ const a=deg*Math.PI/180, big=deg%30===0, mid=deg%15===0, len=big?8:mid?5:3, r0=ro+16; dotLine(c,cx+Math.cos(a)*r0,cy+Math.sin(a)*r0,cx+Math.cos(a)*(r0+len),cy+Math.sin(a)*(r0+len),big?GOLD:gold,big?.7:.4); }
  for(let k=0;k<12;k++){ const a=k*TAU/12+TAU/24; dotLine(c,cx+Math.cos(a)*(ri-7),cy+Math.sin(a)*(ri-7),cx+Math.cos(a)*(ro+10),cy+Math.sin(a)*(ro+10),gold,.12,2); }
  // glyph ring (separate canvas so it can rotate)
  const rr=(ro+ri)/2, S2=Math.ceil((rr+8)*2)+2, g=mk(S2,S2), gc=g.getContext('2d');
  const NG=[8,12,16][arenaSeed()%3];
  for(let k=0;k<NG;k++){ const a=k*TAU/NG-TAU/4, gx=S2/2+Math.cos(a)*rr-3.5, gy=S2/2+Math.sin(a)*rr-3.5, m=GLYPHS[k%GLYPHS.length]; m.forEach((row,y)=>[...row].forEach((ch,x)=>{ if(ch==='#') px1(gc,gx+x,gy+y,GOLD,.55); })); }
  g.hi=true; G.bgGlyph=g;
}
export function drawArenaLayers(c,LW){
  if(G.bgGlyph){ const w=G.bgGlyph.width/R, h=G.bgGlyph.height/R; c.save(); c.translate(LW/2,Math.round(G.H*.45*K*R)/R); c.rotate(S.t*.035); c.drawImage(G.bgGlyph,-w/2,-h/2,w,h); c.restore(); }
  if(G.bgDust){ const w=G.bgDust.width/R, h=G.bgDust.height/R, y=(performance.now()/1000*9)%h; c.drawImage(G.bgDust,0,y-h,w,h); c.drawImage(G.bgDust,0,y,w,h); }
}

/* ---- face-off: gothic hall: rose window behind the boss, fluted columns at each side ---- */
function hall(c,b,WP,HP){
  const floor=Math.round(HP*.5), cx=WP/2, cy=Math.round(HP*.2);
  dotRing(c,cx,cy,70,b.rays,.28); dotRing(c,cx,cy,64,b.rays,.14,2); dotRing(c,cx,cy,26,b.rays,.3);
  for(let k=0;k<16;k++){ const a=k*TAU/16; dotLine(c,cx+Math.cos(a)*26,cy+Math.sin(a)*26,cx+Math.cos(a)*70,cy+Math.sin(a)*70,b.rays,.18,2); }
  for(let k=0;k<8;k++){ const a=k*TAU/8+TAU/16; dotRing(c,cx+Math.cos(a)*48,cy+Math.sin(a)*48,9,b.rays,.22,2); }
  const hv=arenaSeed()%3;
  if(hv===1){ for(const dx of [-70,70]) { dotRing(c,cx+dx,cy+30,24,b.rays,.2,2); dotRing(c,cx+dx,cy+30,10,b.rays,.2); } }
  else if(hv===2){ for(let k=0;k<5;k++){ const x=WP*(.2+k*.15); dotLine(c,x,cy-40,x,floor,b.rays,.12,3); dotRing(c,x,cy-40,12,b.rays,.18,2); } }
  for(const side of [0,1]){
    const w=hv===2?30:22, x0=side?WP-w:0;
    c.globalAlpha=1; c.fillStyle='#150d1f'; c.fillRect(x0,0,w,floor);
    for(let x=0;x<w;x+=5){ c.globalAlpha=.55; c.fillStyle='#241636'; c.fillRect(x0+x,0,2,floor); c.globalAlpha=.35; c.fillStyle='#0b0814'; c.fillRect(x0+x+2,0,1,floor); }
    const edge=side?x0:x0+w-2; c.globalAlpha=.8; c.fillStyle='#8f7440'; c.fillRect(edge,0,2,floor);
    c.globalAlpha=1; c.fillStyle='#2a1a38'; c.fillRect(side?x0-4:0,0,w+4,9); c.fillRect(side?x0-4:0,floor-9,w+4,9);
    c.fillStyle=GOLD; c.fillRect(side?x0-4:0,9,w+4,1); c.fillRect(side?x0-4:0,floor-10,w+4,1);
  }
  const g=c.createLinearGradient(0,0,0,floor); g.addColorStop(0,'rgba(11,8,20,.55)'); g.addColorStop(.35,'rgba(11,8,20,0)'); c.fillStyle=g; c.fillRect(0,0,WP,floor);
}
