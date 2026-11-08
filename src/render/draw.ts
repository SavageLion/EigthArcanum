// @ts-nocheck
import { ctx, W } from '../core/dom';
import { G, S } from '../core/state';
import { LW, R, SPRITE_OVERRIDES, WIZ_ANIM, WIZ_SETS, blit, blitSprite, bossFrames, clipFrame, disc, px } from './sprites';
import { drawHub } from '../systems/hub';
import { GOLD, TAU } from '../core/util';

/* Village drawing: the Sanctum itself lives in systems/hub.ts; this file holds the walking wizard and the title backdrop. */
const nowS=()=>performance.now()/1000;
/** how big each unlockable wizard is drawn relative to the Raven (their sprites come in different canvas sizes) */
const WIZ_DRAW_K={ember:.9,frost:.9};
function wizardSprites(id){
  if(!id||id==='raven') return {dirs:SPRITE_OVERRIDES.wizardDirs,clips:SPRITE_OVERRIDES.anim.arena};
  const W_=WIZ_SETS[id]; return W_?{dirs:W_.dirs,clips:WIZ_ANIM[id]}:{dirs:null,clips:null};
}
/** the frame to draw for a direction: walk while moving, otherwise idle, otherwise the still pose */
function wizardFrame(rest,dir,clips){ const P=G.P, name=P&&nowS()-(P.moveAt??-9)<.15?'walk':'idle', clip=clips&&(clips[name]?.[dir]||clips.idle?.[dir]); return clip?clipFrame(clip,nowS()):rest; }
/** facing: one of the 8 directions (south = towards the camera) */
export function drawWizard(x,y,fade,facing='south'){
  const c=ctx; if(fade)c.globalAlpha=.4;
  const WS=wizardSprites(G.P&&G.P.wizard), set=WS.dirs; let tip={x:px(x)+6,y:px(y)-11};
  if(set){ const fr=wizardFrame(set[facing],facing,WS.clips); if(fr) tip=blitSprite(c,fr,px(x),px(y)+8,WIZ_DRAW_K[G.P&&G.P.wizard]||1); }
  if(Math.floor(S.t*6)%2){c.fillStyle='#ffffff';c.fillRect(tip.x-.25,tip.y-.25,.5,.5);}
  c.globalAlpha=1;
}
export function draw(){
  const c=ctx; c.setTransform(R,0,0,R,0,0); c.imageSmoothingEnabled=false;
  c.fillStyle='#0b0814';c.fillRect(0,0,LW,G.LH);
  if(S.mode==='hub') drawHub(c);
}
export function drawTitle(){
  const c=ctx; c.setTransform(R,0,0,R,0,0); c.imageSmoothingEnabled=false;
  c.fillStyle='#0b0814'; c.fillRect(0,0,LW,G.LH);
  const f=bossFrames(7); if(f&&f.length) blit(c,LW/2,60+Math.round(Math.sin(S.t)*2),f[Math.floor(S.t*6)%f.length].img);
  for(let i=0;i<14;i++){ const a=S.t*.45+i/14*TAU,r=100+((S.t*38+i*18)%90); blit(c,px(W/2+Math.cos(a)*r),px(150+Math.sin(a)*r*.82),disc(i%2?'#b78cff':GOLD,2)); }
}
