// @ts-nocheck
import { W, cv, stage } from './dom';
import { G, S } from './state';
import { BOSSES } from '../data/bosses';
import { K, LW, R, makeBg } from '../render/sprites';
import { clamp } from './util';

/* ---------- sizing ---------- */
export function resize(){
  const pw=stage.parentElement.clientWidth, ph=stage.parentElement.clientHeight;
  const cw=Math.min(pw,Math.round(ph*.62)); stage.style.width=cw+'px'; stage.style.setProperty('--u',(cw/LW)+'px');
  const oldH=G.H; G.H=Math.max(560,W*ph/cw); G.LH=Math.round(G.H*K);
  cv.width=LW*R; cv.height=G.LH*R;
  G.bg=makeBg(G.B?BOSSES[S.stage]:BOSSES[7]);
  if(G.P&&oldH!==G.H) G.P.y=clamp(G.P.y*G.H/oldH,G.H*.4,G.H-96);
}
new ResizeObserver(resize).observe(stage.parentElement);
