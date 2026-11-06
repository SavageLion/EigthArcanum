// @ts-nocheck
import { TAU } from '../core/util';
import { circle, fl, ln, poly } from './bossArt';
import { R, mk, pixelise } from './pixel';
import { DIRS, analyse } from './sprites';

/* Coded wizards (placeholder art until Pixel Lab sets exist): a front and a back view per wizard, drawn as vectors and snapped to pixels.
   Units are 1:1 with canvas pixels at the scale used below; the figure stands roughly 58 units tall around the origin. */
const LOOKS={
  ember:  {robe:'#b8402a',robe2:'#6e1830',trim:'#f2a03d',skin:'#e8b98e',hat:'flamehood',staff:'flame',glow:'#ffd27a'},
  frost:  {robe:'#7aa6c9',robe2:'#3b5f85',trim:'#dff6ff',skin:'#e6dcef',hat:'roundhood',beard:true,staff:'crystal',glow:'#bfeaf2'},
  bone:   {robe:'#d9d2bb',robe2:'#3a2a3a',trim:'#a9875a',skin:'#f1e8d4',hat:'bonecrown',mask:true,staff:'bone',glow:'#a8f0b0'},
  gambler:{robe:'#5a2a7a',robe2:'#1d5a3a',trim:'#e4c946',skin:'#e8b98e',hat:'tophat',staff:'cane',glow:'#f0a8d8'},
};
export const hasCodedArt=id=>!!LOOKS[id];

function staffHead(c,L,x,y){
  if(L.staff==='flame'){ circle(c,x,y,4); fl(c,'#e8592c'); poly(c,[[x-3,y-2],[x,y-10],[x+3,y-2]]); fl(c,'#ffd27a'); circle(c,x,y,2); fl(c,'#fff2c8'); }
  else if(L.staff==='crystal'){ poly(c,[[x,y-9],[x+5,y],[x,y+7],[x-5,y]]); fl(c,'#8fdcf0'); ln(c,'#dff6ff',1); poly(c,[[x,y-9],[x,y+7]],false); ln(c,'#ffffff',.8); }
  else if(L.staff==='bone'){ circle(c,x,y-2,5); fl(c,'#f1e8d4'); ln(c,'#6f6650',1); circle(c,x-2,y-3,1.3); fl(c,'#0b0814'); circle(c,x+2,y-3,1.3); fl(c,'#0b0814'); poly(c,[[x-2,y+3],[x+2,y+3],[x+1.5,y+6],[x-1.5,y+6]]); fl(c,'#f1e8d4'); }
  else { poly(c,[[x-4,y-4],[x+4,y-4],[x+4,y+4],[x-4,y+4]]); fl(c,'#f1e8d4'); ln(c,'#0b0814',1); circle(c,x-1.5,y-1.5,.9); fl(c,'#b02050'); circle(c,x+1.5,y+1.5,.9); fl(c,'#b02050'); }
}
function figure(c,L,back){
  c.beginPath(); c.ellipse(0,27,15,4,0,0,TAU); fl(c,'rgba(11,8,20,.45)');
  // staff (held on the figure's right hand: the viewer's right from the front, left from behind)
  const sx=back?-17:17;
  poly(c,[[sx,29],[sx,-22]],false); ln(c,'#a9875a',2); staffHead(c,L,sx,-27);
  // robe + trim
  poly(c,[[-14,27],[-9,-5],[9,-5],[14,27]]); fl(c,L.robe); ln(c,L.trim,1.3);
  poly(c,[[-3.5,-5],[3.5,-5],[6,27],[-6,27]]); fl(c,L.robe2);
  poly(c,[[-10,8],[10,8],[10,11.5],[-10,11.5]]); fl(c,L.trim);
  // sleeves
  poly(c,[[-10,-3],[-19,12],[-14,15],[-7,3]]); fl(c,L.robe); ln(c,L.trim,1);
  poly(c,[[10,-3],[sx*(back?1:1)>0?18:-18,6],[sx>0?15:-15,10],[7,2]]); fl(c,L.robe); ln(c,L.trim,1);
  // hood behind the head
  if(L.hat==='flamehood'){ poly(c,[[-10,-8],[0,-27],[10,-8],[7,-2],[-7,-2]]); fl(c,L.robe); ln(c,L.trim,1); poly(c,[[-3,-25],[0,-36],[3,-25]]); fl(c,'#e8592c'); poly(c,[[-1.5,-26],[0,-33],[1.5,-26]]); fl(c,'#ffd27a'); }
  if(L.hat==='roundhood'){ circle(c,0,-12,11); fl(c,L.robe); ln(c,L.trim,1); }
  if(L.hat==='bonecrown'||L.hat==='tophat'){ circle(c,0,-12,9.5); fl(c,L.robe2); }
  // head
  circle(c,0,-11,7); fl(c,back?L.robe2:L.skin);
  if(!back){
    if(L.beard){ poly(c,[[-6,-10],[6,-10],[4,4],[0,9],[-4,4]]); fl(c,'#f4f8ff'); ln(c,'#b9c4f5',.8); }
    if(L.mask){ circle(c,0,-11,7); fl(c,'#f1e8d4'); ln(c,'#6f6650',1); poly(c,[[-2,-6],[2,-6],[1.2,-2],[-1.2,-2]]); fl(c,'#6f6650'); }
    circle(c,-3,-12.5,L.mask?1.9:1.1); fl(c,L.mask?'#0b0814':'#1a1024'); circle(c,3,-12.5,L.mask?1.9:1.1); fl(c,L.mask?'#0b0814':'#1a1024');
    if(L.hat==='flamehood'){ circle(c,-3,-12.5,1.1); fl(c,'#ffd27a'); circle(c,3,-12.5,1.1); fl(c,'#ffd27a'); }
  }
  // headwear drawn over the head
  if(L.hat==='bonecrown'){ for(const [dx,h] of [[-7,12],[-3.5,16],[0,19],[3.5,16],[7,12]]){ poly(c,[[dx-1.8,-17],[dx,-17-h*.55],[dx+1.8,-17]]); fl(c,'#f1e8d4'); }
    poly(c,[[-9,-17],[9,-17],[9,-15],[-9,-15]]); fl(c,L.trim); for(const s of [-1,1]){ poly(c,[[s*9,-16],[s*14,-22],[s*13,-29]],false); ln(c,'#d9d2bb',1.5); poly(c,[[s*13,-24],[s*17,-26]],false); ln(c,'#d9d2bb',1.2); } }
  if(L.hat==='tophat'){ c.beginPath(); c.ellipse(0,-17,12,3,0,0,TAU); fl(c,'#1a1024'); ln(c,L.trim,1); poly(c,[[-7,-17],[7,-17],[6,-31],[-6,-31]]); fl(c,'#1a1024'); ln(c,L.trim,1); poly(c,[[-7,-20.5],[7,-20.5],[7,-18],[-7,-18]]); fl(c,L.trim); poly(c,[[1,-31],[6,-34],[8,-28]]); fl(c,'#f1e8d4'); ln(c,'#0b0814',.8); poly(c,[[-6,-31],[6,-31]],false); ln(c,L.trim,1); }
  // a little glow on the staff head so it reads as magic
  c.beginPath(); c.arc(sx,-27,7,0,TAU); c.globalAlpha=.25; fl(c,L.glow); c.globalAlpha=1;
}
const make=(L,back,N,sc)=>pixelise(c=>figure(c,L,back),N,sc).img;

/** Direction sprites for a coded wizard: back view for north-ish facings, front view for south-ish, front mirrored for west. */
export function codedWizardSet(id){
  const L=LOOKS[id]; if(!L) return null;
  const front=make(L,false,40,.44), back=make(L,true,40,.44), west=mk(front.width,front.height);
  const g=west.getContext('2d'); g.translate(west.width,0); g.scale(-1,1); g.drawImage(front,0,0); west.hi=true;
  const k=.44*R, nph=front.width, tip=(img,flip)=>({tipx:nph/2+(flip?-17:17)*k,tipy:nph/2-27*k});
  const mkS=(img,flip)=>{ const s=analyse(img); Object.assign(s,tip(img,flip)); return s; };
  const F=mkS(front,false), B=mkS(back,true), W=mkS(west,true);
  const m={north:B,'north-east':B,'north-west':B,south:F,'south-east':F,'south-west':F,east:F,west:W};
  return DIRS.reduce((o,d)=>(o[d]=m[d],o),{});
}
/** large back view for the face-off, and a big front portrait for the menus */
export function codedWizardLarge(id){ const L=LOOKS[id]; if(!L) return null; const img=make(L,true,56,.68), s=analyse(img); s.tipx=img.width/2-17*.68*R; s.tipy=img.height/2-27*.68*R; return s; }
export function codedWizardPortrait(id){ const L=LOOKS[id]; return L?make(L,false,64,.95):null; }
