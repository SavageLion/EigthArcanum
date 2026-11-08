// @ts-nocheck
import { W, cv, stage } from './dom';
import { G } from './state';
import { K, LW, R } from '../render/sprites';
import { clamp } from './util';

/* ---------- sizing for the landscape village: a 160-unit-wide canvas stretched to a 16:9 stage ---------- */
export function resize(){
  const pw=stage.parentElement.clientWidth, ph=stage.parentElement.clientHeight; if(!pw||!ph) return;
  const cw=Math.min(pw,Math.round(ph*1.78));
  stage.style.width=cw+'px'; stage.style.setProperty('--u',(cw/160)+'px');
  const oldH=G.H; G.H=Math.max(180,W*ph/cw); G.LH=Math.round(G.H*K);
  cv.width=LW*R; cv.height=G.LH*R;
  
}
export const syncLayout=()=>{};
new ResizeObserver(resize).observe(stage.parentElement);
