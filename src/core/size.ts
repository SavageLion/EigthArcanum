// @ts-nocheck
import { W, cv, stage } from './dom';
import { G } from './state';
import { K, LW, R } from '../render/sprites';
import { clamp } from './util';

/* ---------- sizing for the portrait village: a 160-unit-wide canvas stretched to the stage ---------- */
export function resize(){
  const pw=stage.parentElement.clientWidth, ph=stage.parentElement.clientHeight; if(!pw||!ph) return;
  const cw=Math.min(pw,Math.round(ph*.62));
  stage.style.width=cw+'px'; stage.style.setProperty('--u',(cw/160)+'px');
  const oldH=G.H; G.H=Math.max(560,W*ph/cw); G.LH=Math.round(G.H*K);
  cv.width=LW*R; cv.height=G.LH*R;
  if(G.P&&oldH!==G.H) G.P.y=clamp(G.P.y*G.H/oldH,G.H*.4,G.H-96);
}
export const syncLayout=()=>{};
new ResizeObserver(resize).observe(stage.parentElement);
