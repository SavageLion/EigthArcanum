// @ts-nocheck
import { W } from '../core/dom';
import { G, S } from '../core/state';
import { BOSSES } from '../data/bosses';
import { hexRGB, mapSprite, mk, pixelise } from './pixel';
import { BONE, GOLD, TAU, clamp, rnd } from '../core/util';

/* ---------- pixel renderer: all art is drawn on a 160px-wide canvas and scaled up with hard edges.
   SPRITE_OVERRIDES is the slot for final art: boss sheets and wizard frames replace these placeholders. ---------- */
export const LW=160, K=LW/W;
export const SPRITE_OVERRIDES={boss:{},wizard:null};
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
export function disc(col,r){const key=col+r; if(discs[key])return discs[key]; const R=r+1,N=R*2+1,o=mk(N,N),c=o.getContext('2d');
  for(let y=-R;y<=R;y++)for(let x=-R;x<=R;x++){const d=Math.hypot(x,y); if(d<=r+.3){c.fillStyle=d<=r*.45?'#fffbee':col;c.fillRect(x+R,y+R,1,1);} else if(d<=R+.3){c.fillStyle='#0b0814';c.fillRect(x+R,y+R,1,1);}}
  return discs[key]=o;}
export const px=v=>Math.round(v*K);
export function blit(g,x,y,img){g.drawImage(img,Math.round(x-img.width/2),Math.round(y-img.height/2));}
export function makeBg(b){
  const o=mk(LW,G.LH),c=o.getContext('2d'),im=c.createImageData(LW,G.LH),d=im.data;
  const A=hexRGB(b.bg[0]),Z=hexRGB(b.bg[1]),bay=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5],cx=LW/2,cy=S.orbit?Math.round(G.H*.45*K):60,steps=4;
  for(let y=0;y<G.LH;y++)for(let x=0;x<LW;x++){
    const v=clamp(Math.hypot(x-cx,y-cy)/(G.LH*.82),0,1)*steps, lo=Math.floor(v), f=v-lo, lv=Math.min(steps,lo+(f>(bay[(y%4)*4+x%4]+.5)/16?1:0))/steps, j=(y*LW+x)*4;
    d[j]=A[0]+(Z[0]-A[0])*lv;d[j+1]=A[1]+(Z[1]-A[1])*lv;d[j+2]=A[2]+(Z[2]-A[2])*lv;d[j+3]=255;
  }
  c.putImageData(im,0,0);
  c.fillStyle=b.rays;
  for(let i=0;i<24;i++){const a=i/24*TAU,len=i%2?60:G.LH; c.globalAlpha=i%2?.14:.22; for(let r=34;r<len;r+=2)c.fillRect(Math.round(cx+Math.cos(a)*r),Math.round(cy+Math.sin(a)*r),1,1);}
  c.globalAlpha=.32;for(let i=0;i<190;i++){const a=i/190*TAU;c.fillRect(Math.round(cx+Math.cos(a)*30),Math.round(cy+Math.sin(a)*30),1,1);}
  c.fillStyle=BONE;for(let i=0;i<46;i++){c.globalAlpha=Math.random()<.3?.8:.35;c.fillRect(Math.floor(rnd(4,LW-4)),Math.floor(rnd(4,G.LH-4)),1,1);}
  c.globalAlpha=1;c.fillStyle=GOLD;
  c.fillRect(2,2,LW-4,1);c.fillRect(2,G.LH-3,LW-4,1);c.fillRect(2,2,1,G.LH-4);c.fillRect(LW-3,2,1,G.LH-4);
  [[3,3],[LW-4,3],[3,G.LH-4],[LW-4,G.LH-4]].forEach(([x,y])=>{c.fillRect(x-1,y-2,3,5);c.fillRect(x-2,y-1,5,3);});
  return o;
}
