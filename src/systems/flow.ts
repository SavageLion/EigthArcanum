// @ts-nocheck
import { ctx, cv, muteBtn, ov, reduced, stage } from '../core/dom';
import { G, S, newPlayer } from '../core/state';
import { BOSSES, dealOrder } from '../data/bosses';
import { hotSave } from '../main';
import { blit, bossFrames, makeBg } from '../render/sprites';
import { BOSS_SIG } from './bossPlans';
import { spellBar } from './casting';
import { ECHO, OMENS } from './deck';
import { requestWake, startFight } from './faceoff';
import { oaEnd } from './openArena';
import { BOSS_EL, EL } from './spells';
import { tone, wakeAudio } from '../core/audio';
import { $, GOLD, clamp, rnd } from '../core/util';
import { circle, fl, ln, poly } from '../render/bossArt';
import { mk, pixelise } from '../render/pixel';

/* ---------- flow ---------- */
export function startRun(){ wakeAudio(); G.P=newPlayer(); S.order=dealOrder(); S.pos=0; S.stage=S.order[0]; S.mod=null; S.orbit=false; S.echo=null; S.lastOmen=null; S.arena=null; S.fo=false; S.open=false; S.runSeconds=0; S.hits=0; G.B=null; G.bolts=[];G.shots=[];G.rings=[];G.cols=[];G.bands=[];G.parts=[];G.seeds=[];G.beams=[];G.helpers=[]; showDraw(); requestWake(); }
/* ---------- the three blind draws ---------- */
const ARENAS=[
 {id:'chariot',num:'VII',name:'The Chariot',desc:'Open field. Roam freely and weave through the shots.'},
 {id:'wheel',num:'X',name:'Wheel of Fortune',desc:'Orbit. Circle the boss on two rings. The inner ring deals 50% more damage.'},
 {id:'justice',num:'XI',name:'Justice',desc:'Face-off. Swipe to dodge, tap to throw bolts, and strike when the boss opens up.'},
 {id:'strength',num:'VIII',name:'Strength',desc:'Open arena. Run around a pillared room. You only fire when you stand still. The boss chases and charges you.'}
];
function drawOmen(){
  const pool=OMENS.filter(o=>o.id!==S.lastOmen&&(!o.spells||G.P.spells.length)&&(o.id!=='hermit'||G.P.spells.some(s=>s.type!=='ward')));
  return pool[Math.floor(Math.random()*pool.length)];
}
export function showDraw(){
  S.mode='draw'; S.stage=S.order[S.pos]; S.mod=null; S.orbit=false; S.fo=false; S.open=false; oaEnd(); S.arena=null; S.t=0;
  spellBar.hidden=true; $('bossname').hidden=true; $('omen').hidden=true; $('hint').hidden=true; muteBtn.hidden=false;
  const d=BOSSES[S.stage]; S.echo=S.pos?S.order[S.pos-1]:null;
  G.bg=makeBg(d); stage.style.setProperty('--boss',d.color);
  const omen=drawOmen(), arena=ARENAS[Math.floor(Math.random()*ARENAS.length)];
  G.pull={i:0,phase:'shuffle',t:0,omen,arena,done:false,fast:reduced};
  const art=bossFrames(S.stage)[0].img.toDataURL();
  ov.className='overlay pullov'; ov.hidden=false; ov.scrollTop=0; stage.style.cursor='default';
  ov.innerHTML=`<div class="pullhead"><div class="eyebrow">Pull ${S.pos+1} of 16${d.elite?' · Elite':''}</div><div class="gold" id="pullstatus"></div></div>
    <div class="slots">
      ${slotHTML(0,d.elite?'elite':'boss',`<img src="${art}" alt=""><b>${d.name}</b>`,'Boss')}
      ${slotHTML(1,'omencard',`<small>${omen.num}</small><b>${omen.name}</b>`,'Omen')}
      ${slotHTML(2,'arenacard',`<small>${arena.num}</small><b>${arena.name}</b>`,'Arena')}
    </div>
    <div class="reads" id="reads"></div><div class="pullfoot" id="pullfoot"></div>`;
  ov.onclick=pullTap;
  setStatus(); hotSave();
}
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
  el.style.setProperty('--fx',fx+'px'); el.style.setProperty('--fy',fy+'px'); el.classList.add('landed'); if(!reduced)el.classList.add('fly');
  tone(1250,.07,'square',.03,-500);
}
export function turnCard(){
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
  if(i===0){ const d=BOSSES[S.stage]; const note=d.elite?(S.pos===15?'The final elite. No spell follows this card.':'Elite: harder attacks, 25 more gold and a two-element spell.'):S.pos<4?'Drawn early, so weaker.':S.pos>=11?'Drawn late, so stronger.':''; const echo=S.echo===null?'':` Echo of ${BOSSES[S.echo].name}: ${ECHO[S.echo].name} in open-field and orbit fights, and your ${EL[BOSS_EL[S.echo]].noun.toLowerCase()} spells deal 25% more.`; return `<b>${d.name}</b> ${note}${echo}`; }
  if(i===1) return `<b>${G.pull.omen.name}</b> ${G.pull.omen.desc}`;
  const sig=BOSS_SIG[S.stage], extra=G.pull.arena.id==='justice'?sig.f:G.pull.arena.id==='strength'?sig.s:''; return `<b>${G.pull.arena.name}</b> ${G.pull.arena.desc}${extra?` ${BOSSES[S.stage].name}: ${extra}`:''}`;
}
function addRead(i){ const p=document.createElement('p'); p.id='read'+i; p.innerHTML=readText(i); $('reads').appendChild(p); }
function enterArena(){ ov.className='overlay'; ov.onclick=null; S.mod=G.pull.omen; S.lastOmen=G.pull.omen.id; S.arena=G.pull.arena.id; G.pull=null; startFight(); }
export function quickPull(modId,arena){ G.pull={omen:OMENS.find(o=>o.id===modId)||drawOmen(),arena:ARENAS.find(a=>a.id===arena)||ARENAS[0]}; enterArena(); }
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
function buildHands(){ if(G.handImg)return; G.handImg=pixelise(drawHandArt,104,.72).img; const o=mk(G.handImg.width,G.handImg.height),x=o.getContext('2d');x.translate(o.width,0);x.scale(-1,1);x.drawImage(G.handImg,0,0);G.handFlip=o; }
function backCol(i){ return i===0?(BOSSES[S.stage].elite?'#6e1830':'#3a2466'):i===1?'#7d5a22':'#1d5a66'; }
function cardRect(c,x,y,col,w=20,h=30){ x=Math.round(x);y=Math.round(y);c.fillStyle='#0b0814';c.fillRect(x-1,y-1,w+2,h+2);c.fillStyle=col;c.fillRect(x,y,w,h);c.fillStyle=GOLD;c.fillRect(x+2,y+2,w-4,1);c.fillRect(x+2,y+h-3,w-4,1);c.fillRect(x+2,y+2,1,h-4);c.fillRect(x+w-3,y+2,1,h-4);c.fillRect(x+w/2-1,y+h/2-1,3,3); }
export function drawPull(){
  if(!G.pull||G.pull.done)return; buildHands();
  const c=ctx,cy=Math.round(G.LH*.76),i=Math.min(G.pull.i,2),col=backCol(i),T=performance.now()/1000;
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
