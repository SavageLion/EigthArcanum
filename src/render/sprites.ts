// @ts-nocheck
import { W } from '../core/dom';
import { G, S } from '../core/state';
import { BOSSES } from '../data/bosses';
import { R, hexRGB, mapSprite, mk, pixelise } from './pixel';
export { R };
import { BONE, GOLD, TAU, clamp, rnd } from '../core/util';

/* ---------- pixel renderer: all art is drawn on a 160px-wide canvas and scaled up with hard edges.
   SPRITE_OVERRIDES is the slot for final art: boss sheets and wizard frames replace these placeholders. ---------- */
export const LW=160, K=LW/W;
/** The 8 facing directions, clockwise from east, in screen space (y down). South = facing the camera, north = back to camera. */
export const DIRS=['east','south-east','south','south-west','west','north-west','north','north-east'];
export const dirOf=(ang:number)=>DIRS[((Math.round(ang/(Math.PI/4))%8)+8)%8];

/** A Pixel Lab image plus where its visible pixels sit (physical px), and where the staff orb is. */
export type Sprite={img:HTMLImageElement,bx:number,by:number,bw:number,bh:number,tipx:number,tipy:number};
export const SPRITE_OVERRIDES:{boss:Record<number,any>,wizardDirs:Record<string,Sprite>|null,wizardBack:Sprite|null,wizardFront:Sprite|null}={boss:{},wizardDirs:null,wizardBack:null,wizardFront:null};

function analyse(img:HTMLImageElement):Sprite{
  (img as any).hi=true;
  const c=mk(img.width,img.height),g=c.getContext('2d',{willReadFrequently:true}); g.drawImage(img,0,0);
  const d=g.getImageData(0,0,img.width,img.height).data;
  let x0=1e9,y0=1e9,x1=-1,y1=-1,tx=0,ty=0,tn=0;
  for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++){
    const i=(y*img.width+x)*4,r=d[i],gg=d[i+1],b=d[i+2],al=d[i+3]; if(al<40)continue;
    if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y;
    if(b>=170&&r>=100&&gg<=150&&b>gg+60){tx+=x;ty+=y;tn++;}   // glowing violet orb on the staff
  }
  const bw=x1-x0+1,bh=y1-y0+1;
  return {img,bx:x0,by:y0,bw,bh,tipx:tn>2?tx/tn:x0+bw/2,tipy:tn>2?ty/tn:y0};
}
function loadImage(name:string):Promise<HTMLImageElement|null>{
  return new Promise(res=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>res(null); i.src=import.meta.env.BASE_URL+'assets/'+name; });
}
async function loadSet(folder:string):Promise<Record<string,Sprite>|null>{
  const imgs=await Promise.all(DIRS.map(d=>loadImage(`wizard/${folder}/${d}.png`)));
  if(imgs.some(i=>!i)) return null;
  const out={}; DIRS.forEach((d,i)=>out[d]=analyse(imgs[i])); return out;
}
/** Loads Pixel Lab art from public/assets. Anything missing or failing to load keeps the procedural fallback. */
export async function loadSprites(){
  const [arena,large]=await Promise.all([loadSet('arena'),loadSet('large')]);
  SPRITE_OVERRIDES.wizardDirs=arena; SPRITE_OVERRIDES.wizardBack=large?large.north:null; SPRITE_OVERRIDES.wizardFront=large?large.south:null;
}
/** Draw a sprite with its visible feet-centre at logical (x,footY). Returns the staff-orb position in logical px. */
export function blitSprite(g,s:Sprite,x:number,footY:number){
  const dx=x-(s.bx+s.bw/2)/R, dy=footY-(s.by+s.bh)/R;
  g.drawImage(s.img,Math.round(dx*R)/R,Math.round(dy*R)/R,s.img.width/R,s.img.height/R);
  return {x:dx+s.tipx/R,y:dy+s.tipy/R};
}
const bossCache={};
export function bossFrames(i){
  if(SPRITE_OVERRIDES.boss[i]) return SPRITE_OVERRIDES.boss[i];
  if(bossCache[i]) return bossCache[i];
  const f=[]; for(let n=0;n<8;n++){ const t=n*.26+.3; f.push(BOSSES[i].elite?pixelise(c=>BOSSES[i].draw(c,t,BOSSES[i].color),84,.47):pixelise(c=>BOSSES[i].draw(c,t,BOSSES[i].color),66,.4)); }
  return bossCache[i]=f;
}
export const WIZ_ROWS=["........kk........",".......kbbk.......","......kbbnk...kyk.","......kbbbk...yWy.",".....kbbbnk...kyk.",".....kbbbbk....t..","...kkkggggkkk..t..","..kggggggggggk.t..","...kkksssssskk.t..","....kwsswwswk..t..","....kwwwwwwk..kt..","...kbwwwwwbk.kst..","..kbbbwwwbbbkkst..","..kbbbbwbbbbbkkt..","..kbbnbbbnbbk..t..","..kbbnbbbnbbk..t..","..kbbnbgbnbbk..t..",".kbbbnbgbnbbbk.t..",".kbbnnbgbnnbbk.t..",".kkkkkkkkkkkkk.t.."];
const WIZ=mapSprite(WIZ_ROWS);
export const SKULL=mapSprite(["..kkkkk..",".kwwwwwk.","kwwwwwwwk","kwkkwkkwk","kwkkwkkwk","kwwwkwwwk",".kwwwwwk.","..kwkwk..","...kkk..."]);
const heartRows=[".kk...kk.","krrk.krrk","krprkrrrk","krrrrrrrk",".krrrrrk.","..krrrk..","...krk...","....k...."];
export const HEART=mapSprite(heartRows), HEART0=mapSprite(heartRows.map(r=>r.replace(/[rp]/g,'d')));
const discs={};
/** Round bolt with a bright core and dark rim. r is the LOGICAL radius; drawn at R x resolution. */
export function disc(col,r){ r=Math.round(r*2)/2; const key=col+r; if(discs[key])return discs[key];
  const rr=r*R, RR=Math.ceil(rr)+1, N=RR*2+1, o=mk(N,N), c=o.getContext('2d');
  for(let y=-RR;y<=RR;y++)for(let x=-RR;x<=RR;x++){const d=Math.hypot(x,y); if(d<=rr+.3){c.fillStyle=d<=rr*.45?'#fffbee':col;c.fillRect(x+RR,y+RR,1,1);} else if(d<=rr+1.3){c.fillStyle='#0b0814';c.fillRect(x+RR,y+RR,1,1);}}
  (o as any).hi=true; return discs[key]=o;}
/** logical position snapped to the physical pixel grid */
export const px=v=>Math.round(v*K*R)/R;
/** Draw centred at logical (x,y). Hi-res art (img.hi) is drawn at its native physical resolution. */
export function blit(g,x,y,img){ const k=img.hi?1/R:1, w=img.width*k, h=img.height*k; g.drawImage(img,Math.round((x-w/2)*R)/R,Math.round((y-h/2)*R)/R,w,h); }
export function makeBg(b){
  // rendered at physical resolution (LW*R x LH*R): finer dither, rays and stars; the gold frame stays at logical chunk size
  const WP=LW*R, HP=G.LH*R, o=mk(WP,HP),c=o.getContext('2d'),im=c.createImageData(WP,HP),d=im.data;
  const A=hexRGB(b.bg[0]),Z=hexRGB(b.bg[1]),bay=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5],cx=WP/2,cy=S.orbit?Math.round(G.H*.45*K*R):60*R,steps=4;
  for(let y=0;y<HP;y++)for(let x=0;x<WP;x++){
    const v=clamp(Math.hypot(x-cx,y-cy)/(HP*.82),0,1)*steps, lo=Math.floor(v), f=v-lo, lv=Math.min(steps,lo+(f>(bay[(y%4)*4+x%4]+.5)/16?1:0))/steps, j=(y*WP+x)*4;
    d[j]=A[0]+(Z[0]-A[0])*lv;d[j+1]=A[1]+(Z[1]-A[1])*lv;d[j+2]=A[2]+(Z[2]-A[2])*lv;d[j+3]=255;
  }
  c.putImageData(im,0,0);
  c.fillStyle=b.rays;
  for(let i=0;i<24;i++){const a=i/24*TAU,len=i%2?60*R:HP; c.globalAlpha=i%2?.14:.22; for(let r=34*R;r<len;r+=2)c.fillRect(Math.round(cx+Math.cos(a)*r),Math.round(cy+Math.sin(a)*r),1,1);}
  c.globalAlpha=.32;for(let i=0;i<190*R;i++){const a=i/(190*R)*TAU;c.fillRect(Math.round(cx+Math.cos(a)*30*R),Math.round(cy+Math.sin(a)*30*R),1,1);}
  c.fillStyle=BONE;for(let i=0;i<60;i++){c.globalAlpha=Math.random()<.3?.8:.35;c.fillRect(Math.floor(rnd(4*R,WP-4*R)),Math.floor(rnd(4*R,HP-4*R)),1,1);}
  c.globalAlpha=1;c.fillStyle=GOLD;c.scale(R,R);
  c.fillRect(2,2,LW-4,1);c.fillRect(2,G.LH-3,LW-4,1);c.fillRect(2,2,1,G.LH-4);c.fillRect(LW-3,2,1,G.LH-4);
  [[3,3],[LW-4,3],[3,G.LH-4],[LW-4,G.LH-4]].forEach(([x,y])=>{c.fillRect(x-1,y-2,3,5);c.fillRect(x-2,y-1,5,3);});
  (o as any).hi=true; return o;
}
