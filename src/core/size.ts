// @ts-nocheck
import { W, cv, setW, stage } from './dom';
import { G, S } from './state';
import { BOSSES } from '../data/bosses';
import { K, LW, R, makeBg, setLW } from '../render/sprites';
import { clamp } from './util';
import { sideLive } from '../systems/sideView';

/* ---------- sizing ---------- */
/** the Chariot arena is zoomed out: its world is wider (and the canvas with it) so the boss and wizard look smaller and there is more room to weave */
export const WIDE=520;
const wideWanted=()=>S.arena==='chariot'&&!S.hub&&!S.camp&&!S.lab&&['intro','fight','won','dead','victory'].includes(S.mode)&&!S.orbit&&!S.fo&&!S.open&&!S.side;
const worldWanted=()=>wideWanted()?WIDE:400;
export function resize(){
  const want=worldWanted(); if(want!==W){ const dx=(want-W)/2; setW(want); setLW(Math.round(want*K)); if(G.P)G.P.x+=dx; if(G.B){ G.B.x+=dx; if(G.B.tx!=null)G.B.tx+=dx; } }
  const pw=stage.parentElement.clientWidth, ph=stage.parentElement.clientHeight, side=sideLive();
  // the side-view fight is landscape: on a portrait phone the whole stage is turned sideways so you tilt the phone
  const rot=side&&pw<ph, ew=rot?ph:pw, eh=rot?pw:ph; G.rot=rot;
  const cw=side?Math.min(ew,Math.round(eh*1.85)):Math.min(pw,Math.round(ph*.62));
  stage.classList.toggle('side',side); stage.style.width=cw+'px'; stage.style.height=side?eh+'px':''; stage.style.transform=rot?'rotate(90deg)':''; stage.style.flex=rot?'none':''; stage.style.maxWidth=rot?'none':''; stage.style.setProperty('--u',(cw/160)+'px');
  const oldH=G.H; G.H=side?Math.max(190,W*eh/cw):Math.max(560,W*ph/cw); G.LH=Math.round(G.H*K);
  cv.width=LW*R; cv.height=G.LH*R;
  G.bg=makeBg(G.B?BOSSES[S.stage]:BOSSES[7]);
  if(G.P&&oldH!==G.H&&!side) G.P.y=clamp(G.P.y*G.H/oldH,G.H*.4,G.H-96);
}
let wasSide=false;
/** called every frame: re-lays-out the stage when the side-view fight starts or ends */
export function syncLayout(){ const s=sideLive(); if(s!==wasSide||worldWanted()!==W){ wasSide=s; resize(); } }
new ResizeObserver(resize).observe(stage.parentElement);
