// @ts-nocheck
import { W } from '../core/dom';
import { G, S } from '../core/state';
import { BOSSES } from '../data/bosses';
import { R, hexRGB, mapSprite, mk, pixelise } from './pixel';
import { arenaKind, paintArena } from './arenaArt';
export { R };
import { BONE, GOLD, TAU, clamp, rnd } from '../core/util';

/* ---------- pixel renderer: all art is drawn on a 160px-wide canvas and scaled up with hard edges.
   SPRITE_OVERRIDES is the slot for final art: boss sheets and wizard frames replace these placeholders. ---------- */
export let LW=160;
export const K=160/400;   // canvas units per world unit stays fixed; the Chariot arena widens both the world and the canvas so everything is drawn smaller
export const setLW=(v:number)=>{ LW=v; };
/** The 8 facing directions, clockwise from east, in screen space (y down). South = facing the camera, north = back to camera. */
export const DIRS=['east','south-east','south','south-west','west','north-west','north','north-east'];
export const dirOf=(ang:number)=>DIRS[((Math.round(ang/(Math.PI/4))%8)+8)%8];

/** A Pixel Lab image, where the feet sit relative to the image centre (ax,ay, physical px) and where the staff orb is. */
export type Sprite={img:HTMLImageElement,ax:number,ay:number,tipx:number,tipy:number};
export type Clip={fps:number,loop:boolean,frames:Sprite[]};
export type ClipSet=Record<string,Record<string,Clip>>;   // anim name -> direction -> clip
export const SPRITE_OVERRIDES:{boss:Record<number,any>,bossAtk:Record<number,any>,shot:Record<number,HTMLImageElement>,wizardDirs:Record<string,Sprite>|null,wizardBack:Sprite|null,wizardFront:Sprite|null,chest:{idle:HTMLImageElement|null,open:HTMLImageElement[],mimic:HTMLImageElement[]}|null,hands:HTMLImageElement[]|null,icons:Set<string>,anim:{arena:ClipSet,large:ClipSet},arena:{tiles:HTMLImageElement[],pillar:Sprite|null}}={boss:{},bossAtk:{},shot:{},wizardDirs:null,wizardBack:null,wizardFront:null,chest:null,hands:null,icons:new Set<string>(),anim:{arena:{},large:{}},arena:{tiles:[],pillar:null}};

/** rest = the still pose of the same direction: animation frames reuse its foot anchor so they bob instead of jitter. */
export function analyse(img:any,rest?:Sprite):Sprite{
  (img as any).hi=true;
  const c=mk(img.width,img.height),g=c.getContext('2d',{willReadFrequently:true}); g.drawImage(img,0,0);
  const d=g.getImageData(0,0,img.width,img.height).data;
  let x0=1e9,y0=1e9,x1=-1,y1=-1,tx=0,ty=0,tn=0;
  for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++){
    const i=(y*img.width+x)*4,r=d[i],gg=d[i+1],b=d[i+2],al=d[i+3]; if(al<40)continue;
    if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y;
    if(b>=170&&r>=100&&gg<=150&&b>gg+60){tx+=x;ty+=y;tn++;}   // glowing violet orb on the staff
  }
  const bw=x1-x0+1;
  return {img,ax:rest?rest.ax:(x0+bw/2)-img.width/2,ay:rest?rest.ay:(y1+1)-img.height/2,tipx:tn>2?tx/tn:x0+bw/2,tipy:tn>2?ty/tn:y0};
}
function loadImage(name:string):Promise<HTMLImageElement|null>{
  return new Promise(res=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>res(null); i.src=import.meta.env.BASE_URL+'assets/'+name; });
}
async function loadSet(folder:string):Promise<Record<string,Sprite>|null>{
  const imgs=await Promise.all(DIRS.map(d=>loadImage(`wizard/${folder}/${d}.png`)));
  if(imgs.some(i=>!i)) return null;
  const out={}; DIRS.forEach((d,i)=>out[d]=analyse(imgs[i])); return out;
}
/** wizard/anim/manifest.json lists, per set, each clip's fps/loop/frame count and the directions drawn. Missing clips just don't animate. */
async function loadClips(set:'arena'|'large',rest:Record<string,Sprite>|null){
  if(!rest) return;
  let man; try{ const r=await fetch(import.meta.env.BASE_URL+'assets/wizard/anim/manifest.json'); if(!r.ok) return; man=(await r.json())[set]; }catch(e){ return; }
  if(!man) return;
  const jobs=[];
  for(const [name,m] of Object.entries<any>(man)) for(const dir of m.dirs) jobs.push((async()=>{
    const imgs=await Promise.all(Array.from({length:m.frames},(_,n)=>loadImage(`wizard/anim/${set}/${name}/${dir}/${n}.png`)));
    if(imgs.some(i=>!i)) return;
    (SPRITE_OVERRIDES.anim[set][name] ||= {})[dir]={fps:m.fps,loop:m.loop,frames:imgs.map(i=>analyse(i,rest[dir]))};
  })());
  await Promise.all(jobs);
}
/** Pixel Lab sets for the unlockable wizards (static, 8 directions): arena size plus a scaled-up copy for the face-off back/front views. */
/** Pixel Lab obstacle and wall-column art for the Runner, per material set (flag, ash, ice, moss): low barrier, hanging blade, monolith, column */
export const RUNNER_ART:Record<string,Record<string,HTMLImageElement>>={};
async function loadRunnerArt(){ for(const set of ['flag','ash','ice','moss']){ const o={}; const k=['low','high','block','column']; const im=await Promise.all(k.map(n=>loadImage(`runner/${set}/${n}.png`))); k.forEach((n,i)=>{ if(im[i])o[n]=im[i]; }); RUNNER_ART[set]=o; } }
/** Pixel Lab spell sprites for the Runner: flying spells by shape name, ground spells as 'g-<shape>' */
export const SPELL_ART:Record<string,HTMLImageElement>={};
const SPELL_NAMES=['fireball','crystal','bell','bolt','thorn','skull','eye','bubble','cog','spore','star','coin','blade','card','note','g-flame','g-shard','g-thorns','g-bones','g-wave','g-boulder','g-spikes','g-sand','g-ring','bolt-player','hit-spark','g-cog','p-wisp','p-heart','p-shield','p-magnet','burst'];
async function loadSpellArt(){ const im=await Promise.all(SPELL_NAMES.map(n=>loadImage(`runner/spells/${n}.png`))); SPELL_NAMES.forEach((n,i)=>{ if(im[i])SPELL_ART[n]=im[i]; }); }
/** Pixel Lab props for the Sanctum (door, market stall, forge, banner) */
export const HUB_ART:Record<string,HTMLImageElement>={};
/** wandering villagers: walk cycles per direction plus the still rotations (public/assets/hub/npc, packed by tools/pack-npc.mjs) */
export const NPC_ART:Record<string,{frames:number,fps:number,dirs:string[],walk:Record<string,HTMLImageElement[]>,rot:Record<string,HTMLImageElement>}>={};
async function loadNpcs(){ let man; try{ const r=await fetch(import.meta.env.BASE_URL+'assets/hub/npc/manifest.json'); if(!r.ok) return; man=await r.json(); }catch(e){ return; }
  for(const [id,m] of Object.entries<any>(man)){ const A={frames:m.frames,fps:m.fps,dirs:m.dirs,walk:{},rot:{}}; const all=['east','north-east','north','north-west','west','south-west','south','south-east'];
    await Promise.all([...all.map(async d=>{ const im=await loadImage(`hub/npc/${id}/rot/${d}.png`); if(im)A.rot[d]=im; }),...m.dirs.map(async d=>{ const f=await Promise.all(Array.from({length:m.frames},(_,n)=>loadImage(`hub/npc/${id}/${d}/${n}.png`))); if(f.every(Boolean))A.walk[d]=f; })]); NPC_ART[id]=A; } }
async function loadHubArt(){ const k=['door','market','forge','banner','campfire','codex','dummy','board','tree','pine','well','lamp','cottage','statue','observatory','belltower','townhouse','crates','astrolabe','yew','mushrooms','moontree']; const im=await Promise.all(k.map(n=>loadImage(`hub/${n}.png`))); k.forEach((n,i)=>{ if(im[i])HUB_ART[n]=im[i]; }); }
export const FIST:{img:HTMLImageElement|null}={img:null};   // Pixel Lab boss fist for the face-off
/** per-wizard animation clips for the unlockable wizards (idle, walk, cast, hurt, death), by wizard id then clip then direction */
export const WIZ_ANIM:Record<string,Record<string,Record<string,any>>>={};
export const WIZ_SETS:Record<string,{dirs:Record<string,Sprite>,back:Sprite,front:Sprite}>={};
function scaled(img:HTMLImageElement,k:number){ const c=mk(Math.round(img.width*k),Math.round(img.height*k)),g=c.getContext('2d'); g.imageSmoothingEnabled=false; g.drawImage(img,0,0,c.width,c.height); return c as any; }
async function loadWizSets(){
  for(const id of ['ember','frost','bone','gambler']){
    const imgs=await Promise.all(DIRS.map(d=>loadImage(`wizard/sets/${id}/${d}.png`)));
    if(imgs.some(i=>!i)) continue;
    const k=id==='ember'?1:1, dirs={}; DIRS.forEach((d,i)=>dirs[d]=analyse(k===1?imgs[i]:scaled(imgs[i],k)));
    const N=DIRS.indexOf('north'), S0=DIRS.indexOf('south');
    WIZ_SETS[id]={dirs,back:analyse(scaled(imgs[N],1.4*k)),front:analyse(scaled(imgs[S0],1.4*k))};
  }
}
/** wizard/anim-sets/manifest.json lists which wizards have clips; each clip is drawn anchored on that wizard's still pose */
async function loadWizClips(){
  let man; try{ const r=await fetch(import.meta.env.BASE_URL+'assets/wizard/anim-sets/manifest.json'); if(!r.ok) return; man=await r.json(); }catch(e){ return; }
  const jobs=[];
  for(const [id,clips] of Object.entries<any>(man)){ const W_=WIZ_SETS[id]; if(!W_) continue;
    for(const [name,m] of Object.entries<any>(clips)) for(const dir of m.dirs) jobs.push((async()=>{
      const imgs=await Promise.all(Array.from({length:m.frames},(_,n)=>loadImage(`wizard/anim-sets/${id}/${name}/${dir}/${n}.png`)));
      if(imgs.some(i=>!i)) return;
      ((WIZ_ANIM[id] ||= {})[name] ||= {})[dir]={fps:m.fps,loop:m.loop,frames:imgs.map(i=>analyse(i,W_.dirs[dir]))};
    })()); }
  await Promise.all(jobs);
}
/** Loads Pixel Lab art from public/assets. Anything missing or failing to load keeps the procedural fallback. */
export async function loadSprites(){
  const [arena,large]=await Promise.all([loadSet('arena'),loadSet('large')]);
  SPRITE_OVERRIDES.wizardDirs=arena; SPRITE_OVERRIDES.wizardBack=large?large.north:null; SPRITE_OVERRIDES.wizardFront=large?large.south:null;
  await Promise.all([loadClips('arena',arena),loadClips('large',large),loadImage('fist.png').then(i=>{FIST.img=i;}),loadHubArt(),loadNpcs(),loadRunnerArt(),loadSpellArt(),loadWizSets().then(loadWizClips),loadArena(),loadBosses(),loadIcons(),loadChest(),loadHands()]);
}
async function loadHands(){ const f=await Promise.all(Array.from({length:9},(_,i)=>loadImage(`hands/${i}.png`))); if(f.some(i=>!i)) return; f.forEach(i=>{(i as any).hi=true;}); SPRITE_OVERRIDES.hands=f; }
async function loadChest(){
  const [idle,...rest]=await Promise.all([loadImage('chest/idle.png'),...Array.from({length:9},(_,i)=>loadImage(`chest/open/${i}.png`)),...Array.from({length:9},(_,i)=>loadImage(`chest/mimic/${i}.png`))]);
  if(!idle||rest.some(i=>!i)) return; [idle,...rest].forEach(i=>{(i as any).hi=true;});
  SPRITE_OVERRIDES.chest={idle,open:rest.slice(0,9),mimic:rest.slice(9)};
}
/** icons/manifest.json lists which icon ids exist; the UI falls back to the old pixel-map icons for any that don't. */
async function loadIcons(){ try{ const r=await fetch(import.meta.env.BASE_URL+'assets/icons/manifest.json'); if(r.ok) SPRITE_OVERRIDES.icons=new Set(await r.json()); }catch(e){} }
/** Hand-made boss art: an idle loop (ping-pong) and an attack pose clip. White silhouettes give the hit flash. */
function packBoss(src:HTMLImageElement){ const c=mk(src.width,src.height); c.getContext('2d').drawImage(src,0,0); (c as any).hi=true; const w=mk(src.width,src.height),g=w.getContext('2d'); g.drawImage(src,0,0); g.globalCompositeOperation='source-in'; g.fillStyle='#fff'; g.fillRect(0,0,w.width,w.height); (w as any).hi=true; return {img:c,white:w}; }
async function loadBosses(){
  let man:any; try{ const r=await fetch(import.meta.env.BASE_URL+'assets/boss/manifest.json'); if(!r.ok) return; man=await r.json(); }catch(e){ return; }
  await Promise.all(Object.entries<any>(man).map(async([idx,b])=>{
    const load=async(kind:string,order:number[])=>{ const by:Record<number,HTMLImageElement|null>={}; await Promise.all([...new Set(order)].map(async n=>{ by[n]=await loadImage(`boss/${b.slug}/${kind}/${n}.png`); })); return order.map(n=>by[n]); };
    const [idle,atk,shot]=await Promise.all([load('idle',b.idle),load('attack',b.attack),b.shot?loadImage(`boss/${b.slug}/shot.png`):Promise.resolve(null)]);
    if(idle.some(i=>!i)||atk.some(i=>!i)) return;
    SPRITE_OVERRIDES.boss[+idx]=idle.map(packBoss); SPRITE_OVERRIDES.bossAtk[+idx]=atk.map(packBoss);
    if(shot){ (shot as any).hi=true; SPRITE_OVERRIDES.shot[+idx]=shot; }
  }));
}
/** Floor tiles and pillar for the open arena. */
async function loadArena(){
  const [pillar,...tiles]=await Promise.all([loadImage('arena/pillar.png'),...Array.from({length:16},(_,i)=>loadImage(`arena/tiles/tile_${i}.png`))]);
  SPRITE_OVERRIDES.arena.tiles=tiles.every(t=>t)?tiles:[]; SPRITE_OVERRIDES.arena.pillar=pillar?analyse(pillar):null;
  const sets:any={flag:SPRITE_OVERRIDES.arena.tiles};
  for(const n of ['ash','ice','moss']){ const t=await Promise.all(Array.from({length:16},(_,i)=>loadImage(`arena/tiles-${n}/tile_${i}.png`))); if(t.every(x=>x)) sets[n]=t; }
  SPRITE_OVERRIDES.arena.sets=sets;
  const props:any={pillar:SPRITE_OVERRIDES.arena.pillar};
  for(const n of ['statue','tomb','crystal','brazier','stump']){ const im=await loadImage(`arena/props/${n}.png`); if(im) props[n]=analyse(im); }
  SPRITE_OVERRIDES.arena.props=props;
}
/** Draw a sprite with its feet-centre at logical (x,footY). Returns the staff-orb position in logical px. */
export function blitSprite(g,s:Sprite,x:number,footY:number,k=1){
  const w=s.img.width,h=s.img.height, dx=x-(w/2+s.ax)/R*k, dy=footY-(h/2+s.ay)/R*k;
  g.drawImage(s.img,Math.round(dx*R)/R,Math.round(dy*R)/R,w/R*k,h/R*k);
  return {x:dx+s.tipx/R*k,y:dy+s.tipy/R*k};
}
/** Which frame of a clip to show. age = seconds since the clip started (one-shots hold their last frame). */
export function clipFrame(c:Clip,age:number):Sprite{ const n=c.frames.length,i=Math.floor(age*c.fps); return c.frames[c.loop?i%n:Math.min(n-1,i)]; }
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
  const flat=arenaKind()==='open';   // the flagstone floor replaces the rays and stars
  if(!flat){ c.fillStyle=b.rays;
  for(let i=0;i<24;i++){const a=i/24*TAU,len=i%2?60*R:HP; c.globalAlpha=i%2?.14:.22; for(let r=34*R;r<len;r+=2)c.fillRect(Math.round(cx+Math.cos(a)*r),Math.round(cy+Math.sin(a)*r),1,1);}
  c.globalAlpha=.32;for(let i=0;i<190*R;i++){const a=i/(190*R)*TAU;c.fillRect(Math.round(cx+Math.cos(a)*30*R),Math.round(cy+Math.sin(a)*30*R),1,1);}
  c.fillStyle=BONE;for(let i=0;i<60;i++){c.globalAlpha=Math.random()<.3?.8:.35;c.fillRect(Math.floor(rnd(4*R,WP-4*R)),Math.floor(rnd(4*R,HP-4*R)),1,1);}
  }
  paintArena(c,b,WP,HP);
  c.globalAlpha=1;c.fillStyle=GOLD;c.scale(R,R);
  c.fillRect(2,2,LW-4,1);c.fillRect(2,G.LH-3,LW-4,1);c.fillRect(2,2,1,G.LH-4);c.fillRect(LW-3,2,1,G.LH-4);
  [[3,3],[LW-4,3],[3,G.LH-4],[LW-4,G.LH-4]].forEach(([x,y])=>{c.fillRect(x-1,y-2,3,5);c.fillRect(x-2,y-1,5,3);});
  (o as any).hi=true; return o;
}
