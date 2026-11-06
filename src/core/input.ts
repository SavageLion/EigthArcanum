// @ts-nocheck
import { W, cv, muteBtn } from './dom';
import { G, S } from './state';
import { castSpell } from '../systems/casting';
import { RI, RO, isMod } from '../systems/deck';
import { foDodge, foThrow, pause, pixIcon } from '../systems/faceoff';
import { endBeam } from '../systems/spellFx';
import { applyMuteToMusic, snd, tone, wakeAudio } from './audio';

/* ---------- input: relative drag so your thumb never hides the wizard ---------- */
export const KEYS={left:false,right:false,up:false,down:false};
const toWorld=e=>{const r=cv.getBoundingClientRect();const y=(e.clientY-r.top)*G.H/r.height;return{x:(e.clientX-r.left)*W/r.width,y:isMod('hanged')?G.H-y:y}};
export function swapRing(){ if(!G.P||!S.orbit)return; G.P.tr=G.P.tr===RO?RI:RO; tone(G.P.tr===RI?660:440,.08,'square',.03); }
cv.addEventListener('pointerdown',e=>{ if(!G.P)return; if(S.open){ if(!G.stick)G.stick={id:e.pointerId,x:e.clientX,y:e.clientY}; try{cv.setPointerCapture(e.pointerId)}catch(_){ } e.preventDefault(); return; } if(S.fo){ if(S.mode==='fight'){G.foHold={id:e.pointerId,x:e.clientX,moved:false,t:performance.now()}; try{cv.setPointerCapture(e.pointerId)}catch(_){ } e.preventDefault();} return; } const w=toWorld(e); G.drag={id:e.pointerId,dx:G.P.x-w.x,dy:G.P.y-w.y,lx:w.x,ly:w.y,rad:0,moved:0,t:performance.now()}; try{cv.setPointerCapture(e.pointerId)}catch(_){ } e.preventDefault(); });
cv.addEventListener('pointermove',e=>{ if(S.open){ if(G.stick&&e.pointerId===G.stick.id){ let dx=(e.clientX-G.stick.x)/34,dy=(e.clientY-G.stick.y)/34; const l=Math.hypot(dx,dy); if(l>1){G.stick.x+=(dx/l)*(l-1)*34;G.stick.y+=(dy/l)*(l-1)*34;dx/=l;dy/=l;} G.stickV={x:dx,y:isMod('hanged')?-dy:dy}; } e.preventDefault(); return; } if(S.fo){ if(G.foHold&&e.pointerId===G.foHold.id&&!G.foHold.moved&&Math.abs(e.clientX-G.foHold.x)>20){G.foHold.moved=true;foDodge(e.clientX>G.foHold.x?1:-1);} e.preventDefault(); return; } if(!G.drag||e.pointerId!==G.drag.id||!G.P)return; const w=toWorld(e);
  if(S.orbit){ const dx=w.x-G.drag.lx,dy=w.y-G.drag.ly,tx=-Math.sin(G.P.a),ty=Math.cos(G.P.a),nx=Math.cos(G.P.a),ny=Math.sin(G.P.a);
    G.drag.moved+=Math.hypot(dx,dy); G.P.a+=(dx*tx+dy*ty)*1.5/G.P.rr; G.drag.rad=G.drag.rad*.9+(dx*nx+dy*ny);
    if(G.drag.rad>26&&G.P.tr===RI){swapRing();G.drag.rad=0;} else if(G.drag.rad<-26&&G.P.tr===RO){swapRing();G.drag.rad=0;}
  } else { G.P.x=w.x+G.drag.dx; G.P.y=w.y+G.drag.dy; }
  G.drag.lx=w.x;G.drag.ly=w.y;G.drag.dx=G.P.x-w.x;G.drag.dy=G.P.y-w.y; e.preventDefault(); });
const endDrag=e=>{ if(G.stick&&e.pointerId===G.stick.id){G.stick=null;G.stickV={x:0,y:0};} if(G.foHold&&e.pointerId===G.foHold.id){ if(!G.foHold.moved&&e.type==='pointerup')foThrow(); G.foHold=null; } if(G.drag&&e.pointerId===G.drag.id){ if(S.orbit&&G.drag.moved<7&&performance.now()-G.drag.t<220&&e.type==='pointerup')swapRing(); G.drag=null; } };
cv.addEventListener('pointerup',endDrag); cv.addEventListener('pointercancel',endDrag);
const keymap={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down'};
addEventListener('keydown',e=>{ if(S.fo){ if(e.key==='ArrowLeft'||e.key==='a')foDodge(-1); if(e.key==='ArrowRight'||e.key==='d')foDodge(1); if(e.key===' '){foThrow();e.preventDefault();} } const k=keymap[e.key];if(k){KEYS[k]=true;e.preventDefault();} if(e.key==='Escape'||e.key==='p')pause(); if(e.key===' '){swapRing();e.preventDefault();} if(e.key==='1'||e.key==='j')castSpell(0); if(e.key==='2'||e.key==='k')castSpell(1); if(e.key==='3'||e.key==='l')castSpell(2);});
addEventListener('keyup',e=>{ if(['1','2','3','j','k','l'].includes(e.key)&&G.P)endBeam();const k=keymap[e.key];if(k)KEYS[k]=false;});
function paintMute(){ muteBtn.setAttribute('aria-label',snd.muted?'Turn sound on':'Turn sound off');
  muteBtn.innerHTML=pixIcon(snd.muted?'off':'on'); }
muteBtn.onclick=()=>{snd.muted=!snd.muted;try{localStorage.setItem('ea-mute',snd.muted?'1':'0')}catch(e){};wakeAudio();applyMuteToMusic();paintMute();};
paintMute();
