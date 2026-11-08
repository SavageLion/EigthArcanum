// @ts-nocheck
import { ov, stage } from '../core/dom';
import { SPRITE_OVERRIDES, bossFrames } from '../render/sprites';
import { takeUnlocks } from '../data/meta';
/* Shared UI helpers for the village overlays: pixel icons, Pixel Lab icons, the hero portrait and the boss card art. */
const ICONS={
 bolt:["..........   ",".......##....","......##.....",".....##......","....##.......","...#######...","......##.....",".....##......","....##.......","...##........","..#.........."],
 nova:["....#####....","..##.....##..",".#.........#.",".#...###...#.","#...#####...#","#...#####...#","#...#####...#",".#...###...#.",".#.........#.","..##.....##..","....#####...."],
 ward:["..#########..",".##+++++++##.",".#+++++++++#.",".#+++++++++#.",".#+++++++++#.",".##+++++++##.","..#+++++++#..","..##+++++##..","...##+++##...","....##+##....",".....###....."],
 summon:["...#######...","..#+++++++#..",".#+++++++++#.",".#+##+++##+#.",".#+##+++##+#.",".#+++#+#+++#.","..#+++++++#..","...#+#+#+#...","...#######..."],
 beam:["......##.....","......##.....",".....####....","......##.....","......##.....","......##.....","......##.....","....######...","...#++++++#..","...#++++++#..","....######..."],
 trap:["#...........#",".#..#####..#.","..#+++++++#..","..+#+++++#+..",".#++#+++#++#.",".#+++###+++#.",".#++#+++#++#.","..+#+++++#+..","..#+++++++#..",".#..#####..#.","#...........#"],
 blink:[".......##....","......#..#...",".........#...","..##....#....",".#..#..#.....","#....##......",".............","..#.....##...",".#..#.#...#..","#....#....#..",".........#..."],
 hat:["......#......",".....#+#.....",".....#+#.....","....#+++#....","....#+++#....","...#+++++#...","...#+++++#...","#############",".#++++++++++#"],
 robe:["...###.###...","..#+++#+++#..",".#+++++++++#.","#+#+++++++#+#","..#+++#+++#..","..#+++#+++#..",".#++++#++++#.",".#++++#++++#.","#+++++#+++++#","#############"],
 charm:[".....###.....","....#...#....","....#...#....",".....###.....","....#####....","...#+++++#...","..#+++#+++#..","..#++###++#..","..#+++#+++#..","...#+++++#...","....#####...."],
 book:["..#########..",".#+++++++++#.",".#+++###+++#.",".#++#+++#++#.",".#+++++#+++#.",".#++++#++++#.",".#+++++++++#.",".#++++#++++#.",".#+++++++++#.",".###########.","..#########.."],
 wand:["..........#..",".........###.","..........#..",".........#...","........#....",".......#.....","......#......",".....#.......","....#........","...#.........","..#.........."],
 potion:[".....###.....",".....#.#.....",".....#.#.....","....#...#....","...#+++++#...","..#+++++++#..","..#+++++++#..","..#+++++++#..","...#######..."],
 heart:["..###...###..",".#+++#.#+++#.","#+++++#+++++#","#+++++++++++#",".#+++++++++#.","..#+++++++#..","...#+++++#...","....#+++#....",".....#+#.....","......#......"],
 gem:["...#######...","..#+++++++#..",".#+++++++++#.","#############",".#+++++++++#.","..#+++++++#..","...#+++++#...","....#+++#....",".....#+#.....","......#......"],
 eye:[".............","....#####....","..##+++++##..",".#+++###+++#.","#+++#####+++#",".#+++###+++#.","..##+++++##..","....#####...."],
 on:["....#......#.","...##...#...#","..###....#..#","#####..#.#.#.","#####..#.#.#.","#####..#.#.#.","..###....#..#","...##...#...#","....#......#."],
 off:["....#........","...##........","..###.#...#..","#####..#.#...","#####...#....","#####..#.#...","..###.#...#..","...##........","....#........"]
};
export function pixIcon(n){ const m=ICONS[n]; let r=''; m.forEach((row,y)=>[...row].forEach((ch,x)=>{ if(ch==='#')r+=`<rect x="${x}" y="${y}" width="1" height="1" fill="currentColor"/>`; if(ch==='+')r+=`<rect x="${x}" y="${y}" width="1" height="1" fill="currentColor" opacity=".3"/>`; })); return `<svg viewBox="0 0 13 ${m.length}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`; }
export function icon(id,fallback){ return SPRITE_OVERRIDES.icons.has(id)?`<img class="ico" alt="" src="${import.meta.env.BASE_URL}assets/icons/${id}.png">`:fallback; }
export function show(html){ ov.innerHTML=`<div class="inner">${html}</div>`; ov.hidden=false; ov.scrollTop=0; stage.style.cursor='default'; animateHeroes(); }
const HERO_FRAMES={idle:4,hurt:6};
export function heroHTML(clip='idle',hold=false){ const n=HERO_FRAMES[clip], base=import.meta.env.BASE_URL+'assets/wizard/anim/arena/'+clip+'/south/'; return `<div class="hero"><img alt="" src="${base}${hold?n-1:0}.png" data-base="${base}" data-n="${hold?0:n}"></div>`; }
function animateHeroes(){ ov.querySelectorAll('.hero img').forEach(img=>{ const n=+img.dataset.n; if(!n)return; let i=0; const t=setInterval(()=>{ if(!img.isConnected){clearInterval(t);return;} i=(i+1)%n; img.src=img.dataset.base+i+'.png'; },170); }); }
export function unlockBanner(){ const u=takeUnlocks(); return u.length?`<div class="unlock">${u.map(t=>`<b>★ ${t}</b>`).join('')}</div>`:''; }
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
export function bossCardArt(d,stageIdx){
  const W=44,H=56, out=document.createElement('canvas'); out.width=W; out.height=H; const o=out.getContext('2d');
  const hex=d.color||'#ffffff', rr=parseInt(hex.slice(1,3),16),gg=parseInt(hex.slice(3,5),16),bb=parseInt(hex.slice(5,7),16);
  const bg=o.createImageData(W,H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const dx=(x-W/2)/(W/2), dy=(y-H*.5)/(H/2), dist=Math.hypot(dx,dy*.85), band=dist<.38?3:dist<.62?2:dist<.86?1:0, f=[0,.1,.2,.32][band], i=(y*W+x)*4;   // a few flat bands of colour, no checker noise
    bg.data[i]=16+(rr*.5-16)*f*2.2; bg.data[i+1]=11+(gg*.5-11)*f*2.2; bg.data[i+2]=30+(bb*.5-30)*f*2.2; bg.data[i+3]=255;
  }
  o.putImageData(bg,0,0);
  const src=bossFrames(stageIdx)[0].img, sw=src.width, sh=src.height, t=document.createElement('canvas'); t.width=sw; t.height=sh;
  const tc=t.getContext('2d'); tc.drawImage(src,0,0); const px=tc.getImageData(0,0,sw,sh).data; let x0=sw,y0=sh,x1=0,y1=0;
  for(let y=0;y<sh;y++)for(let x=0;x<sw;x++) if(px[(y*sw+x)*4+3]>40){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
  const cw=x1-x0+1, ch=y1-y0+1, k=Math.min(40/cw,46/ch), dw=Math.max(1,Math.round(cw*k)), dh=Math.max(1,Math.round(ch*k));
  const s=document.createElement('canvas'); s.width=dw; s.height=dh; const sc=s.getContext('2d'); sc.imageSmoothingEnabled=true; sc.imageSmoothingQuality='high'; sc.drawImage(src,x0,y0,cw,ch,0,0,dw,dh);
  const id=sc.getImageData(0,0,dw,dh), a=id.data;
  for(let i=0;i<a.length;i+=4){ a[i+3]=a[i+3]>110?255:0; if(a[i+3]){ a[i]=Math.round(a[i]/24)*24; a[i+1]=Math.round(a[i+1]/24)*24; a[i+2]=Math.round(a[i+2]/24)*24; } }
  sc.putImageData(id,0,0);
  const ox=Math.round((W-dw)/2), oy=Math.round(H*.5-dh/2);
  o.fillStyle='#0b0814'; for(const [ax,ay] of [[-1,0],[1,0],[0,-1],[0,1]]) o.drawImage(outline(s,'#0b0814'),ox+ax,oy+ay);
  o.drawImage(s,ox,oy);
  return out.toDataURL();
}
function outline(img,col){ const c=document.createElement('canvas'); c.width=img.width; c.height=img.height; const g=c.getContext('2d'); g.drawImage(img,0,0); g.globalCompositeOperation='source-in'; g.fillStyle=col; g.fillRect(0,0,c.width,c.height); return c; }

