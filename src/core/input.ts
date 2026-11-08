// @ts-nocheck
import { cv, muteBtn } from './dom';
import { G, S } from './state';
import { pixIcon } from '../ui/overlay';
import { applyMuteToMusic, snd, wakeAudio } from './audio';

/* ---------- input for the village: a floating thumb-stick, or WASD / arrow keys ---------- */
export const KEYS={left:false,right:false,up:false,down:false};
cv.addEventListener('pointerdown',e=>{ if(!G.P||!S.hub)return; if(!G.stick)G.stick={id:e.pointerId,x:e.clientX,y:e.clientY,t:performance.now()}; try{cv.setPointerCapture(e.pointerId)}catch(_){ } e.preventDefault(); });
cv.addEventListener('pointermove',e=>{
  if(!S.hub||!G.stick||e.pointerId!==G.stick.id)return;
  let dx=(e.clientX-G.stick.x)/34,dy=(e.clientY-G.stick.y)/34; const l=Math.hypot(dx,dy);
  if(l>1){ G.stick.x+=(dx/l)*(l-1)*34; G.stick.y+=(dy/l)*(l-1)*34; dx/=l; dy/=l; }
  G.stickV={x:dx,y:dy}; e.preventDefault();
});
const endDrag=e=>{ if(G.stick&&e.pointerId===G.stick.id){ G.stick=null; G.stickV={x:0,y:0}; } };
cv.addEventListener('pointerup',endDrag); cv.addEventListener('pointercancel',endDrag);
const keymap={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down'};
addEventListener('keydown',e=>{ const k=keymap[e.key]; if(k&&S.hub){ KEYS[k]=true; e.preventDefault(); } });
addEventListener('keyup',e=>{ const k=keymap[e.key]; if(k)KEYS[k]=false; });
function paintMute(){ muteBtn.setAttribute('aria-label',snd.muted?'Turn sound on':'Turn sound off'); muteBtn.innerHTML=pixIcon(snd.muted?'off':'on'); }
muteBtn.onclick=()=>{ snd.muted=!snd.muted; try{localStorage.setItem('ea-mute',snd.muted?'1':'0')}catch(e){} wakeAudio(); applyMuteToMusic(); paintMute(); };
paintMute();
