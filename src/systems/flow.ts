// @ts-nocheck
import { sideEnd } from './sideView';
import { eventsEnd } from './arenaEvents';
import { ctx, cv, muteBtn, ov, reduced, stage } from '../core/dom';
import { G, S, newPlayer } from '../core/state';
import { BOSSES, dealOrder } from '../data/bosses';
import { hotSave } from '../main';
import { SPRITE_OVERRIDES, blit, bossFrames, makeBg } from '../render/sprites';
import { BOSS_SIG } from './bossPlans';
import { spellBar } from './casting';
import { ECHO, OMENS, total } from './deck';
import { meta, remember } from '../data/meta';
import { runAvailable } from '../data/bosses';
import { requestWake, startFight } from './faceoff';
import { oaEnd } from './openArena';
import { BOSS_EL, EL } from './spells';
import { setMusic, sfx, tone, wakeAudio } from '../core/audio';
import { $, GOLD, clamp, rnd } from '../core/util';
import { circle, fl, ln, poly } from '../render/bossArt';
import { R, mk, pixelise } from '../render/pixel';

/* ---------- flow ---------- */
export function startRun(wizardId=meta.lastWizard,runLen=meta.lastRun){ wakeAudio(); if(typeof wizardId!=='string'||!meta.wizards.includes(wizardId))wizardId='raven'; if(typeof runLen!=='number'||!meta.runs.includes(runLen)||!runAvailable(runLen))runLen=8; remember(wizardId,runLen); G.P=newPlayer(wizardId); S.order=dealOrder(runLen); S.pos=0; S.stage=S.order[0]; S.mod=null; S.orbit=false; S.echo=null; S.lastOmen=null; S.arena=null; S.fo=false; S.open=false; S.runSeconds=0; S.hits=0; G.B=null; G.bolts=[];G.shots=[];G.rings=[];G.cols=[];G.bands=[];G.parts=[];G.seeds=[];G.beams=[];G.helpers=[]; showDraw(); requestWake(); }
/* ---------- the three blind draws ---------- */
const ARENAS=[
 {id:'chariot',num:'VII',name:'The Chariot',desc:'Open field. Roam freely and weave through the shots.'},
 {id:'wheel',num:'X',name:'Wheel of Fortune',desc:'Orbit. Circle the boss on two rings. The inner ring deals 50% more damage.'},
 {id:'justice',num:'XI',name:'Justice',desc:'Face-off. Swipe to dodge, tap to throw bolts, and strike when the boss opens up.'},
 {id:'fool',num:'0',name:'The Fool',desc:'Side view. Run and jump between platforms while your bolts fly up on their own. Tap or swipe up to jump, twice for a double jump.'},
 {id:'strength',num:'VIII',name:'Strength',desc:'Open arena. Run around a pillared room. You only fire when you stand still. The boss chases and charges you.'}
];
function drawOmen(){
  const pool=OMENS.filter(o=>o.id!==S.lastOmen&&(!o.spells||G.P.spells.length)&&(o.id!=='hermit'||G.P.spells.some(s=>s.type!=='ward')));
  return pool[Math.floor(Math.random()*pool.length)];
}
/** Boss portrait for the pull card, redrawn at the same chunky density as the omen/arena card art (about 36x54 pixels):
    dithered glow in the boss's colour behind a cropped, downsampled sprite with a dark outline. */
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
export function bossCardArt(d,stageIdx){
  const W=44,H=56, out=document.createElement('canvas'); out.width=W; out.height=H; const o=out.getContext('2d');
  const hex=d.color||'#ffffff', rr=parseInt(hex.slice(1,3),16),gg=parseInt(hex.slice(3,5),16),bb=parseInt(hex.slice(5,7),16);
  const bg=o.createImageData(W,H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const dx=(x-W/2)/(W/2), dy=(y-H*.5)/(H/2), dist=Math.hypot(dx,dy*.85), band=dist<.38?3:dist<.62?2:dist<.86?1:0, f=[0,.1,.2,.32][band], i=(y*W+x)*4;   // a few flat bands of colour, no checker noise
    bg.data[i]=16+(rr*.5-16)*f*2.2; bg.data[i+1]=11+(gg*.5-11)*f*2.2; bg.data[i+2]=30+(bb*.5-30)*f*2.2; bg.data[i+3]=255;
  }
  o.putImageData(bg,0,0);
  const src=bossFrames(stageIdx)[0].img, sw=src.width, sh=src.height, t=document.createElement('canvas'); t.width=sw; t.height=sh;
  const tc=t.getContext('2d'); tc.drawImage(src,0,0); const px=tc.getImageData(0,0,sw,sh).data; let x0=sw,y0=sh,x1=0,y1=0;
  for(let y=0;y<sh;y++)for(let x=0;x<sw;x++) if(px[(y*sw+x)*4+3]>40){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
  const cw=x1-x0+1, ch=y1-y0+1, k=Math.min(40/cw,46/ch), dw=Math.max(1,Math.round(cw*k)), dh=Math.max(1,Math.round(ch*k));
  const s=document.createElement('canvas'); s.width=dw; s.height=dh; const sc=s.getContext('2d'); sc.imageSmoothingEnabled=true; sc.imageSmoothingQuality='high'; sc.drawImage(src,x0,y0,cw,ch,0,0,dw,dh);
  const id=sc.getImageData(0,0,dw,dh), a=id.data;
  for(let i=0;i<a.length;i+=4){ a[i+3]=a[i+3]>110?255:0; if(a[i+3]){ a[i]=Math.round(a[i]/24)*24; a[i+1]=Math.round(a[i+1]/24)*24; a[i+2]=Math.round(a[i+2]/24)*24; } }
  sc.putImageData(id,0,0);
  const ox=Math.round((W-dw)/2), oy=Math.round(H*.5-dh/2);
  o.fillStyle='#0b0814'; for(const [ax,ay] of [[-1,0],[1,0],[0,-1],[0,1]]) o.drawImage(outline(s,'#0b0814'),ox+ax,oy+ay);
  o.drawImage(s,ox,oy);
  return out.toDataURL();
}
function outline(img,col){ const c=document.createElement('canvas'); c.width=img.width; c.height=img.height; const g=c.getContext('2d'); g.drawImage(img,0,0); g.globalCompositeOperation='source-in'; g.fillStyle=col; g.fillRect(0,0,c.width,c.height); return c; }

export function showDraw(){
  S.mode='draw'; S.stage=S.order[S.pos]; S.mod=null; S.orbit=false; S.fo=false; S.open=false; S.side=false; sideEnd(); eventsEnd(); oaEnd(); S.arena=null; S.t=0;
  spellBar.hidden=true; $('bossname').hidden=true; $('omen').hidden=true; $('hint').hidden=true; muteBtn.hidden=false;
  setMusic('draw',S.pos); const d=BOSSES[S.stage]; S.echo=S.pos?S.order[S.pos-1]:null;
  G.bg=makeBg(d); stage.style.setProperty('--boss',d.color);
  const arena=ARENAS[Math.floor(Math.random()*ARENAS.length)]; let omen=drawOmen(); while(arena.id==='fool'&&omen.id==='hanged')omen=drawOmen();   // an upside-down room makes no sense for a platformer
  G.pull={i:0,phase:'shuffle',t:0,omen,arena,done:false,fast:reduced};
  const art=bossCardArt(d,S.stage);
  ov.className='overlay pullov'; ov.hidden=false; ov.scrollTop=0; stage.style.cursor='default';
  ov.innerHTML=`<div class="pullhead"><div class="eyebrow">Pull ${S.pos+1} of ${total()}${d.elite?' · Elite':''}</div><div class="gold" id="pullstatus"></div></div>
    <div class="slots">
      ${slotHTML(0,d.elite?'elite':'boss',`<img class="art" src="${art}" alt=""><b>${d.name.replace(/^The /,'')}</b>`,d.elite?'Elite':'Boss')}
      ${slotHTML(1,'omencard',`<img class="art" alt="" src="${import.meta.env.BASE_URL}assets/cards/omen/${omen.id}.png"><small class="num">${omen.num}</small><b>${omen.name}</b>`,'Omen')}
      ${slotHTML(2,'arenacard',`<img class="art" alt="" src="${import.meta.env.BASE_URL}assets/cards/arena/${arena.id}.png"><small class="num">${arena.num}</small><b>${arena.name}</b>`,'Arena')}
    </div>
    <div class="reads" id="reads"></div><div class="pullfoot" id="pullfoot"></div>`;
  ov.onclick=pullTap;
  setStatus(); hotSave(); fitCardText(); document.fonts&&document.fonts.ready.then(fitCardText);
}
/** shrink each card title until it fits inside its banner (names run from 'Strength' to 'The Mother of Thorns') */
export function fitCardText(){ ov.querySelectorAll('.slot .front b').forEach(b=>{ b.style.fontSize=''; let fs=parseFloat(getComputedStyle(b).fontSize)||10; while((b.scrollHeight>b.clientHeight+1||b.scrollWidth>b.clientWidth+1)&&fs>5){ fs-=.5; b.style.fontSize=fs+'px'; } }); }
function slotHTML(i,kind,front,label){ return `<div class="slot ${kind}" id="slot${i}"><div class="slotin"><div class="face back"><span>?</span><em>${label}</em></div><div class="face front">${front}</div></div></div>`; }
function setStatus(){ const e=$('pullstatus'); if(!e||!G.pull)return; e.textContent=G.pull.done?'':G.pull.phase==='wait'?'Tap to turn the card':'Shuffling…'; }
function pullTap(e){
  if(!G.pull||G.pull.done||e.target.closest('button'))return;
  if(G.pull.phase==='shuffle'){G.pull.t=99;return;}
  if(G.pull.phase==='wait')turnCard();
}
function throwCard(){
  const el=$('slot'+G.pull.i); if(!el)return;
  const sr=el.getBoundingClientRect(), r=cv.getBoundingClientRect(), fx=r.left+r.width*.5-(sr.left+sr.width/2), fy=r.top+r.height*.76-(sr.top+sr.height/2);
  sfx.card(); el.style.setProperty('--fx',fx+'px'); el.style.setProperty('--fy',fy+'px'); el.classList.add('landed'); if(!reduced)el.classList.add('fly');
  tone(1250,.07,'square',.03,-500);
}
export function turnCard(){ fitCardText();
  const i=G.pull.i,el=$('slot'+i); el.classList.add('turned'); tone(700+i*120,.1,'triangle',.06);
  addRead(i);
  if(i===1&&G.P.thirdEye){ G.pull.phase='eye'; $('pullfoot').innerHTML=`<div class="shopbtns"><button class="ghost" id="redraw">Third Eye: redraw this omen</button><button class="go" id="keep">Keep this omen</button></div>`; $('redraw').onclick=()=>{ G.P.thirdEye=false; S.lastOmen=G.pull.omen.id; const o=drawOmen(); G.pull.omen=o; el.querySelector('.front').innerHTML=`<small>${o.num}</small><b>${o.name}</b>`; $('read1').innerHTML=readText(1); $('pullfoot').innerHTML=''; tone(880,.1,'triangle',.06); nextDraw(); }; $('keep').onclick=()=>{ G.P.thirdEye=false; $('pullfoot').innerHTML=''; nextDraw(); }; setStatus(); return; }
  nextDraw();
}
function nextDraw(){
  G.pull.i++; G.pull.t=0;
  if(G.pull.i>2){ G.pull.done=true; G.pull.phase='done'; setStatus(); $('pullfoot').innerHTML=`<button class="go" id="enter">Enter the arena</button>`; $('enter').onclick=e=>{e.stopPropagation();enterArena();}; return; }
  G.pull.phase='shuffle'; setStatus();
}
function readText(i){
  if(i===0){ const d=BOSSES[S.stage]; const note=d.elite?(S.pos===total()-1?'The final elite. No spell follows this card.':'Elite: harder attacks, 25 more gold and a two-element spell.'):S.pos<4?'Drawn early, so weaker.':S.pos>=11?'Drawn late, so stronger.':''; const echo=S.echo===null?'':` Echo of ${BOSSES[S.echo].name}: ${ECHO[S.echo].name} in open-field and orbit fights, and your ${EL[BOSS_EL[S.echo]].noun.toLowerCase()} spells deal 25% more.`; return `<b>${d.name}</b> ${note}${echo}`; }
  if(i===1) return `<b>${G.pull.omen.name}</b> ${G.pull.omen.desc}`;
  const sig=BOSS_SIG[S.stage], extra=G.pull.arena.id==='justice'?sig.f:G.pull.arena.id==='strength'?sig.s:''; return `<b>${G.pull.arena.name}</b> ${G.pull.arena.desc}${extra?` ${BOSSES[S.stage].name}: ${extra}`:''}`;
}
function addRead(i){ const p=document.createElement('p'); p.id='read'+i; p.innerHTML=readText(i); $('reads').appendChild(p); }
function enterArena(){ ov.className='overlay'; ov.onclick=null; S.mod=G.pull.omen; S.lastOmen=G.pull.omen.id; S.arena=G.pull.arena.id; G.pull=null; startFight(); }
export function quickPull(modId,arena){ G.pull={omen:OMENS.find(o=>o.id===modId)||drawOmen(),arena:ARENAS.find(a=>a.id===arena)||ARENAS[0]}; if(G.pull.arena.id==='fool'&&G.pull.omen.id==='hanged')G.pull.omen=OMENS.find(o=>o.id!=='hanged'); enterArena(); }
export function updateDraw(dt){
  if(!G.pull||G.pull.done)return; G.pull.t+=dt;
  const dur=G.pull.fast?.02:G.pull.i===0?1.05:.5;
  if(G.pull.phase==='shuffle'&&G.pull.t>=dur){ G.pull.phase='throw'; G.pull.t=0; throwCard(); setStatus(); }
  else if(G.pull.phase==='throw'&&G.pull.t>=(G.pull.fast?.02:.38)){ G.pull.phase='wait'; G.pull.t=0; const el=$('slot'+G.pull.i); if(el)el.classList.remove('fly'); setStatus(); }
}
function drawHandArt(c){
  c.beginPath();c.moveTo(-40,70);c.lineTo(-20,12);c.lineTo(16,12);c.lineTo(24,70);c.closePath();fl(c,'#2a3f85');ln(c,GOLD,2);
  poly(c,[[-20,12],[16,12],[18,3],[-22,3]]);fl(c,GOLD);
  c.beginPath();c.moveTo(-20,4);c.quadraticCurveTo(-27,-22,-15,-29);c.lineTo(11,-29);c.quadraticCurveTo(23,-16,15,4);c.closePath();fl(c,'#e8b98e');ln(c,'#4a2420',2);
  [-13,-4,5,14].forEach((x,i)=>{const h=[17,23,21,14][i];poly(c,[[x-4,-27],[x-3,-27-h],[x+3,-27-h],[x+4,-27]]);fl(c,'#e8b98e');ln(c,'#4a2420',1.5);});
  poly(c,[[-22,-8],[-36,-24],[-30,-30],[-16,-18]]);fl(c,'#e8b98e');ln(c,'#4a2420',1.5);
  circle(c,-3,-12,5);fl(c,'#3956a8');circle(c,-3,-12,2);fl(c,GOLD);
}
function buildHands(){ if(G.handImg)return; G.handImg=pixelise(drawHandArt,104,.72).img; const o=mk(G.handImg.width,G.handImg.height),x=o.getContext('2d');x.translate(o.width,0);x.scale(-1,1);x.drawImage(G.handImg,0,0);(o as any).hi=true; G.handFlip=o; }
function backCol(i){ return i===0?(BOSSES[S.stage].elite?'#6e1830':'#3a2466'):i===1?'#7d5a22':'#1d5a66'; }
function cardRect(c,x,y,col,w=20,h=30){ x=Math.round(x);y=Math.round(y);c.fillStyle='#0b0814';c.fillRect(x-1,y-1,w+2,h+2);c.fillStyle=col;c.fillRect(x,y,w,h);c.fillStyle=GOLD;c.fillRect(x+2,y+2,w-4,1);c.fillRect(x+2,y+h-3,w-4,1);c.fillRect(x+2,y+2,1,h-4);c.fillRect(x+w-3,y+2,1,h-4);c.fillRect(x+w/2-1,y+h/2-1,3,3); }
export function drawPull(){
  if(!G.pull||G.pull.done)return; buildHands();
  const c=ctx,cy=Math.round(G.LH*.76),i=Math.min(G.pull.i,2),col=backCol(i),T=performance.now()/1000;
  const HA=SPRITE_OVERRIDES.hands;
  if(HA){   // Pixel Lab hands: one sprite holding the deck, animated while shuffling
    let f=0,dy=0;
    if(G.pull.phase==='shuffle'&&!reduced){ f=Math.floor(T*12)%HA.length; if(Math.floor(T*14)!==G.pull.tick&&Math.random()<.4){ G.pull.tick=Math.floor(T*14); tone(1500+rnd(0,300),.02,'square',.012); } }
    else if(G.pull.phase==='throw'&&!reduced) dy=-Math.round(5*Math.sin(clamp(G.pull.t/.2,0,1)*Math.PI));
    else dy=reduced?0:Math.sin(T*2.5)*1.2;
    { const im=HA[f],k=1.4,w=im.width/R*k,h=im.height/R*k; c.drawImage(im,Math.round((80-w/2)*R)/R,Math.round((cy-4+dy-h/2+4)*R)/R,w,h); } return;   // hands drawn 40% larger than the sprite's native size
  }
  let lx=46,rx=114,ly=cy+20,ry=cy+20;
  if(G.pull.phase==='shuffle'&&!reduced){
    const w=Math.sin(T*16); lx=46-w*7; rx=114+w*7; ly=cy+20+Math.round(Math.abs(w)*2); ry=cy+20+Math.round(Math.abs(Math.cos(T*16))*2);
    for(let k=0;k<4;k++)cardRect(c,58+k-w*8,cy-16-k*2,col); for(let k=0;k<4;k++)cardRect(c,82-k+w*8,cy-16-k*2,col);
    for(let k=0;k<3;k++){ const p=((T*3.5+k/3)%1),ax=58+p*24,ay=cy-30-Math.sin(p*Math.PI)*30; cardRect(c,ax,ay,col,20,16); }
    if(Math.floor(T*14)!==G.pull.tick&&Math.random()<.4){ G.pull.tick=Math.floor(T*14); tone(1500+rnd(0,300),.02,'square',.012); }
  } else if(G.pull.phase==='throw'&&!reduced){
    const p=clamp(G.pull.t/.2,0,1); for(let k=0;k<7;k++)cardRect(c,70,cy-14-k*2,col); rx=114-34*Math.sin(p*Math.PI); ry=cy+6-Math.round(34*p);
  } else { const by=reduced?0:Math.sin(T*2.5)*1.5; for(let k=0;k<7;k++)cardRect(c,70,cy-14-k*2,col); ly=cy+20+by; ry=cy+20-by; }
  blit(c,lx,ly,G.handImg); blit(c,rx,ry,G.handFlip);
}
