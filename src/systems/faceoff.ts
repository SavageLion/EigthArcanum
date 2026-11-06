// @ts-nocheck
import { W, muteBtn, ov, reduced, stage } from '../core/dom';
import { G, S } from '../core/state';
import { BOSSES, ELITE_SECOND } from '../data/bosses';
import { hotSave } from '../main';
import { LW, blit, disc, makeBg } from '../render/sprites';
import { foPlan } from './bossPlans';
import { paintSpells, spellBar } from './casting';
import { CY, ECHO, GOODS, POS_HP, RO, WANDS, fightReward, hasWand, isMod, shuffle, spellValue } from './deck';
import { showDraw, startRun } from './flow';
import { GEAR, SLOT_LABEL, equip, gearOf, hasGear, lootOrShop, nearMiss, rateNow } from './gear';
import { oaEnd, oaStart } from './openArena';
import { burst, hurt } from './sim';
import { blowTrap } from './spellFx';
import { BOSS_EL, EL, RECIPES, TYPES, fuse, learnRecipe, recipeOf, spellCost, spellDesc, spellKey, spellName } from './spells';
import { pixelise } from '../render/pixel';
import { circle, fl, ln, poly } from '../render/bossArt';
import { $, BONE, GOLD, clamp, rnd } from '../core/util';
import { sfx, tone, wakeAudio } from '../core/audio';

/* ---------- face-off arena, shared by every boss ---------- */
export const FO_LANES=[95,200,305], FO_ATTACKS={
 left:{zones:[0,1],hand:'l',say:'Dodge right'}, right:{zones:[1,2],hand:'r',say:'Dodge left'},
 slam:{zones:[1],hand:'both',say:'Dodge either way'}, clap:{zones:[0,2],hand:'both',say:'Stay in the middle'},
 spit:{zones:null,hand:'mouth',say:'Move at the last moment'}
};
const foCache={};
function foFrames(i){ if(foCache[i])return foCache[i]; const b=BOSSES[i],frames=[]; for(let n=0;n<8;n++){const t=n*.26+.3;frames.push(pixelise(c=>b.draw(c,t,b.color),170,1.05));} const fist=[1,-1].map(s=>pixelise(c=>drawFoFist(c,s,b.color),50,1)); return foCache[i]={frames,fist}; }
function drawFoFist(c,s,col){ circle(c,0,0,17);fl(c,'#2a1412');ln(c,col,2.5); for(let k=0;k<4;k++){c.beginPath();c.moveTo(-11+k*7,-1);c.lineTo(-11+k*7,10);ln(c,col,1.6);} poly(c,[[s*-16,-3],[s*-23,-9],[s*-21,6]]);fl(c,'#2a1412');ln(c,col,1.2); }
function drawWizBack(c){ poly(c,[[-18,28],[-9,-2],[9,-2],[18,28]]);fl(c,'#3956a8');ln(c,GOLD,1.5); poly(c,[[-3,0],[3,0],[4,28],[-4,28]]);fl(c,'#26336f'); poly(c,[[-16,-3],[16,-3],[5,-13],[8,-27],[-5,-14]]);fl(c,'#2a3f85');ln(c,GOLD,1.5); poly(c,[[-18,-3],[18,-3]],false);ln(c,GOLD,3); poly(c,[[21,22],[21,-22]],false);ln(c,'#a9875a',2.5); circle(c,21,-26,5);fl(c,'#ffd27a'); }
function foStart(){ if(!G.wizBack)G.wizBack=pixelise(drawWizBack,60,1).img; G.fo={lane:1,x:FO_LANES[1],dodge:0,dodgedAt:-9,atk:null,gap:1.2,queue:[],open:0,frozen:0,cd:0}; foFrames(S.stage); G.B.x=W/2;G.B.y=G.H*.3; }
function foSpeed(){ return (.72+.03*S.pos)*(hasGear('hourglass')?.9:1)*(isMod('magician')?1.15:isMod('temperance')?.75:1)*(G.B.chill>0?.72:1); }
function foNext(){
  if(!G.fo.queue.length) G.fo.queue=foPlan(S.stage);
  const a=G.fo.queue.shift();
  if(a.zones&&G.fo.linger){ const safe=[0,1,2].filter(z=>!a.zones.includes(z)&&z!==G.fo.linger.lane); if(!safe.length)G.fo.linger=null; }
  const base=a.warn||(G.B.enraged?.74:.96);
  G.fo.atk={...a,t:0,warn:Math.max(.34,base/foSpeed()),did:false,last:!G.fo.queue.length};
  $('hint').textContent=a.say; $('hint').hidden=false;
}
function foCall(t,col){ const e=$('call'); e.textContent=t; e.style.color=col||'var(--bone)'; e.hidden=false; G.fo.call=.7; }
function foStrike(){
  const a=G.fo.atk; a.did=true; S.shake=reduced?0:7; sfx.toll(); if(a.linger!==undefined&&!G.fo.linger)G.fo.linger={lane:a.linger,t:a.lingerT};
  const z=a.zones||[a.lock];
  G.traps.filter(k=>k.lane!==null&&z.includes(k.lane)&&k.arm<=0).forEach(k=>{blowTrap(k,true);if(S.mode==='fight'&&a.last)G.B.open=Math.max(G.B.open,1.2);}); if(S.mode!=='fight')return;
  if(z.includes(G.fo.lane)){ if(G.P.shield>0){burst(G.P.x,G.P.y,'#8fdcf0',18);sfx.block(); if(a.last){G.B.open=1;foCall('Blocked!','#bfeaf2');}} else { const was=G.P.hp; hurt(); if(G.P.hp<was)foCall('Hit','#ff9d94'); } }
  else { const perfect=G.B.t-G.fo.dodgedAt<.3&&G.fo.dodge>0; if(perfect)nearMiss(); if(perfect&&G.P.spells.length){G.P.mana=Math.min(G.P.manaMax,G.P.mana+14);G.P.grazeGlow=.25;foCall('Perfect dodge · +14 mana','#a9d4f7');} else if(a.last)foCall('Opening!','#ffd27a'); if(a.last)G.B.open=G.B.enraged?1.15:1.45; }
}
export function foStep(dt){
  if(G.fo.call>0){G.fo.call-=dt;if(G.fo.call<=0)$('call').hidden=true;}
  G.fo.cd=Math.max(0,G.fo.cd-dt);
  if(G.fo.linger){G.fo.linger.t-=dt;if(G.fo.linger.t<=0)G.fo.linger=null;else if(G.fo.lane===G.fo.linger.lane&&S.mode==='fight')hurt();}
  if(!G.fo||S.mode!=='fight')return;
  if(G.fo.dodge>0){G.fo.dodge-=dt;if(G.fo.dodge<=0)G.fo.lane=1;}
  G.fo.x+=(FO_LANES[G.fo.lane]-G.fo.x)*Math.min(1,dt*22); G.P.x=G.fo.x; G.P.y=G.H-145;
  if(G.foHold&&!G.foHold.moved&&performance.now()-G.foHold.t>180)foThrow();
  if(G.fo.frozen>0)G.fo.frozen-=dt;
  if(G.B.open>0){G.B.open-=dt;if(G.B.open<=0)G.fo.gap=G.B.enraged?.45:.65;return;}
  if(G.fo.atk){ const a=G.fo.atk; a.t+=dt; if(a.id==='spit'&&a.lock===undefined&&a.t>=a.warn-.28)a.lock=G.fo.lane; if(!a.did&&a.t>=a.warn)foStrike(); if(S.mode==='fight'&&G.fo.atk&&a.t>=a.warn+.18){G.fo.atk=null;$('hint').hidden=true;if(!a.last)G.fo.gap=.12;else if(G.B.open<=0)G.fo.gap=.5;} return; }
  G.fo.gap-=dt; if(G.fo.gap<=0)foNext();
}
export function foDodge(dir){ if(!S.fo||S.mode!=='fight'||G.fo.dodge>.1)return; const n=G.fo.lane+dir; if(n<0||n>2)return; G.fo.lane=n;G.fo.dodge=.48;G.fo.dodgedAt=G.B.t;tone(520+dir*60,.06,'square',.03); }
export function foThrow(){
  if(!S.fo||S.mode!=='fight'||G.fo.cd>0||isMod('hermit'))return; G.fo.cd=rateNow();
  const n=hasWand('fork')?2:1; for(let i=0;i<n;i++){ const crit=hasWand('gambler')&&Math.random()<.15,sx=G.P.x+(n>1?(i-.5)*14:0),sy=G.P.y-30,tx=G.B.x+rnd(-40,40),ty=G.B.y+rnd(-25,40),a=Math.atan2(ty-sy,tx-sx); G.bolts.push({x:sx,y:sy,vx:Math.cos(a)*640,vy:Math.sin(a)*640,d:3*G.P.scale*(crit?5:1),r:crit?6:4,c:crit?'#f0a8d8':'#ffe9a8',basic:true}); }
}
export function foFreeze(){ const cancel=!!(G.fo.atk&&!G.fo.atk.did); if(cancel){G.fo.atk=null;G.fo.queue=[];G.fo.gap=.9;} G.fo.frozen=cancel?1.6:.9; G.B.open=Math.max(G.B.open,G.fo.frozen); $('hint').hidden=true; foCall(cancel?'Frozen mid-swing!':'Frozen','#bfeaf2'); }
function foZone(c,i,col,alpha,dither){ const top=Math.round(G.LH*.5)+1,bot=G.LH-34; c.fillStyle=col;c.globalAlpha=alpha; for(let y=top;y<bot;y++){const p=(y-top)/(bot-top),w=14+27*p,cx=80+(i-1)*(w*2),x0=Math.round(cx-w),x1=Math.round(cx+w); if(dither){for(let x=x0;x<x1;x++)if((x+y)%2===0)c.fillRect(x,y,1,1);}else c.fillRect(x0,y,x1-x0,1);} c.globalAlpha=1; }
export function foFloor(c){ const top=Math.round(G.LH*.5),bot=G.LH-34; const drawLinger=()=>{ if(G.fo.linger&&!(G.fo.linger.t<.5&&Math.floor(S.t*10)%2))foZone(c,G.fo.linger.lane,G.B.color,.7,false); }; c.fillStyle='#160a10';c.fillRect(0,top,LW,G.LH-top); c.fillStyle='#2a1a24'; for(let y=top;y<G.LH;y+=Math.max(2,Math.round((y-top)/5)+2))c.fillRect(0,y,LW,1); c.fillStyle='#4a3440'; for(let k=-3;k<=3;k++)for(let y=top;y<G.LH;y++){const p=(y-top)/(bot-top);c.fillRect(Math.round(80+k*(14+27*p)),y,1,1);} c.fillStyle=GOLD;c.fillRect(0,top,LW,1); drawLinger();
  const a=G.fo.atk; if(a&&S.mode==='fight'){ const f=clamp(a.t/a.warn,0,1); if(isMod('moon')&&f<.6)return; const zs=a.zones||(a.lock!==undefined?[a.lock]:[G.fo.lane]); if(a.hide&&!a.did&&f>.45&&f<.93){}else if(a.fake&&!a.did&&a.warn-a.t>.28)zs.map(z=>2-z).forEach(z=>foZone(c,z,'#e8592c',.55,Math.floor(S.t*12)%2===0)); else if(!a.did)zs.forEach(z=>foZone(c,z,'#e8592c',.25+.5*f,Math.floor(S.t*12)%2===0||f<.5)); else zs.forEach(z=>foZone(c,z,'#fff2c8',.9,false)); } }
export function foBoss(c){
  const set=foFrames(S.stage),fr=set.frames[Math.floor(S.t*6)%8],j=G.B.enraged&&!reduced?Math.floor(S.t*14)%2:0,bx=80+j,by=Math.round(G.LH*.3)+(G.B.open>0?7:0);
  blit(c,bx,by,fr.img); if(G.B.flash>0)blit(c,bx,by,fr.white);
  if(G.fo.frozen>0){c.globalAlpha=.42;blit(c,bx,by,fr.white);c.globalAlpha=1;c.fillStyle='#bfeaf2';for(let i=0;i<10;i++)c.fillRect(bx+Math.round(Math.cos(i*2.2+S.t)*42),by+Math.round(Math.sin(i*1.7+S.t*1.1)*36),2,2);}
  if(G.B.open>0&&G.fo.frozen<=0){c.fillStyle='#ffd27a';for(let i=0;i<5;i++){const a=S.t*5+i*1.26;c.fillRect(bx+Math.round(Math.cos(a)*30),by-46+Math.round(Math.sin(a)*6),2,2);}}
  if(G.B.burning>0&&Math.random()<.5) burst(G.B.x+rnd(-70,70),G.B.y+rnd(-60,60),'#f0813f',1);
  const lanes=[38,80,122],tgt=Math.round(G.LH*.5)+Math.round((G.LH-34-G.LH*.5)*.55),br=Math.round(Math.sin(S.t*2.4)*2); let lx=bx-56,ly=by+24+br,rx=bx+56,ry=by+24-br; const a=G.fo.atk;
  if(a&&S.mode==='fight'){ const w=clamp(a.t/a.warn,0,1),up=Math.round(-28*Math.min(1,w*1.6)),h=a.did;
    const zl=a.zones||[]; const lm=zl.length?lanes[zl[0]]:80, rm=zl.length?lanes[zl[zl.length-1]]:80;
    if(a.hand==='l'||a.hand==='both'){ if(h){ly=tgt;lx=zl.length===1?lm-14:a.hand==='l'?(lm+rm)/2:lm;}else ly+=up; }
    if(a.hand==='r'||a.hand==='both'){ if(h){ry=tgt;rx=zl.length===1?rm+14:a.hand==='r'?(lm+rm)/2:rm;}else ry+=up; }
    if(a.hand==='mouth'){ if(!h)blit(c,bx,by+20,disc(G.B.color,2+Math.round(w*5))); else blit(c,lanes[a.lock??G.fo.lane],tgt,disc(G.B.color,9)); } }
  blit(c,lx,ly,set.fist[0].img); blit(c,rx,ry,set.fist[1].img);
}

export function startFight(){
  const d=BOSSES[S.stage], m=(isMod('sun')||isMod('temperance'))?1.3:1;
  S.orbit=S.arena==='wheel'; S.fo=S.arena==='justice'; S.open=S.arena==='strength';
  const hp=POS_HP[S.pos]*m*(S.orbit?1.6:S.fo?4:S.open?1.3:1);
  G.B={...d,def:d,rad:S.fo?105:d.elite?56:46,x:W/2,y:S.orbit?CY():150,max:hp,hp,t:0,tm:{},flash:0,burning:0,chill:0,enraged:false,ang:0,jump:3.5,bloomOuter:false};
  G.bolts=[];G.shots=[];G.rings=[];G.cols=[];G.seeds=[];G.beams=[];G.parts=[];G.helpers=[];G.bands=[];
  G.bg=makeBg(d); G.P.x=W/2;G.P.y=G.H-150;G.P.a=Math.PI/2;G.P.tr=RO;G.P.rr=RO;G.P.inv=0;G.P.shield=0;G.P.mana=G.P.spells.length?Math.round(G.P.manaMax/2):0;G.P.cd=0;G.P.cleanFight=true;G.P.moonUsed=false;G.P.beam=null;G.traps=[];S.chest=null;S.chestT=rnd(5,12);S.chestsLeft=(d.elite?1:0)+(Math.random()<.75?(Math.random()<.35?2:1):0);
  if(S.fo)foStart(); else G.fo=null; $('hint').hidden=true; $('call').hidden=true; if(S.open)oaStart(); else oaEnd();
  if(isMod('sun'))G.P.hp=G.P.max;
  if(isMod('death')){G.P.heldHp=G.P.hp;G.P.hp=1;}
  stage.style.setProperty('--boss',d.color);
  S.mode='intro';S.t=0; ov.hidden=true; muteBtn.hidden=false; stage.style.cursor='grab';
  $('bossname').textContent=`${d.num} · ${d.name}`; $('bossname').hidden=false;
  const tag=[d.elite&&'Elite',S.mod&&S.mod.name,!S.fo&&S.echo!==null&&`Echo: ${ECHO[S.echo].name}`].filter(Boolean).join(' · ');
  $('omen').textContent=tag; $('omen').hidden=!tag;
  $('intro').innerHTML=`<small>${S.mod?S.mod.name:`Pull ${S.pos+1} of 16`}</small><b>${d.name}</b>`; $('intro').style.top=S.orbit?'13%':S.fo?'52%':S.open?'30%':'43%';
  paintSpells(); hotSave();
}
export function win(){
  S.mode='won';S.t=0; G.P.beam=null; G.traps=[]; G.chestCall=0; if(S.open){$('call').hidden=true;} if(G.fo)G.fo.atk=null; $('hint').hidden=true; $('call').hidden=true;
  G.shots.forEach(s=>burst(s.x,s.y,GOLD,1)); G.shots=[];G.rings=[];G.cols=[];G.helpers=[];G.bands=[];
  burst(G.B.x,G.B.y,G.B.color,70); burst(G.B.x,G.B.y,GOLD,40); S.shake=reduced?0:14; S.flash=.6; sfx.win();
  G.P.scale*=1.1; G.P.reward=fightReward(); G.P.gold+=G.P.reward.g;
  if(isMod('death')){G.P.hp=G.P.heldHp;G.P.extraPick=true;}
  G.P.hp=Math.min(G.P.max,G.P.hp+(hasGear('bloodstone')?2:1)); S.chest=null; spellBar.hidden=true; $('omen').hidden=true;
  if(S.pos+1>S.best) saveBest(S.pos+1);
}
function saveBest(v){ S.best=v; try{localStorage.setItem('ea-best',String(v));}catch(e){} }
export function die(){ G.P.beam=null; G.traps=[]; if(G.fo)G.fo.atk=null; $('hint').hidden=true; S.mode='dying';S.t=0;S.shake=reduced?0:12;spellBar.hidden=true;burst(G.P.x,G.P.y,BONE,50);sfx.lose(); }
const ICONS={
 bolt:["..........   ",".......##....","......##.....",".....##......","....##.......","...#######...","......##.....",".....##......","....##.......","...##........","..#.........."],
 nova:["....#####....","..##.....##..",".#.........#.",".#...###...#.","#...#####...#","#...#####...#","#...#####...#",".#...###...#.",".#.........#.","..##.....##..","....#####...."],
 ward:["..#########..",".##+++++++##.",".#+++++++++#.",".#+++++++++#.",".#+++++++++#.",".##+++++++##.","..#+++++++#..","..##+++++##..","...##+++##...","....##+##....",".....###....."],
 summon:["...#######...","..#+++++++#..",".#+++++++++#.",".#+##+++##+#.",".#+##+++##+#.",".#+++#+#+++#.","..#+++++++#..","...#+#+#+#...","...#######..."],
 beam:["......##.....","......##.....",".....####....","......##.....","......##.....","......##.....","......##.....","....######...","...#++++++#..","...#++++++#..","....######..."],
 trap:["#...........#",".#..#####..#.","..#+++++++#..","..+#+++++#+..",".#++#+++#++#.",".#+++###+++#.",".#++#+++#++#.","..+#+++++#+..","..#+++++++#..",".#..#####..#.","#...........#"],
 blink:[".......##....","......#..#...",".........#...","..##....#....",".#..#..#.....","#....##......",".............","..#.....##...",".#..#.#...#..","#....#....#..",".........#..."],
 hat:["......#......",".....#+#.....",".....#+#.....","....#+++#....","....#+++#....","...#+++++#...","...#+++++#...","#############",".#++++++++++#"],
 robe:["...###.###...","..#+++#+++#..",".#+++++++++#.","#+#+++++++#+#","..#+++#+++#..","..#+++#+++#..",".#++++#++++#.",".#++++#++++#.","#+++++#+++++#","#############"],
 charm:[".....###.....","....#...#....","....#...#....",".....###.....","....#####....","...#+++++#...","..#+++#+++#..","..#++###++#..","..#+++#+++#..","...#+++++#...","....#####...."],
 book:["..#########..",".#+++++++++#.",".#+++###+++#.",".#++#+++#++#.",".#+++++#+++#.",".#++++#++++#.",".#+++++++++#.",".#++++#++++#.",".#+++++++++#.",".###########.","..#########.."],
 wand:["..........#..",".........###.","..........#..",".........#...","........#....",".......#.....","......#......",".....#.......","....#........","...#.........","..#.........."],
 potion:[".....###.....",".....#.#.....",".....#.#.....","....#...#....","...#+++++#...","..#+++++++#..","..#+++++++#..","..#+++++++#..","...#######..."],
 heart:["..###...###..",".#+++#.#+++#.","#+++++#+++++#","#+++++++++++#",".#+++++++++#.","..#+++++++#..","...#+++++#...","....#+++#....",".....#+#.....","......#......"],
 gem:["...#######...","..#+++++++#..",".#+++++++++#.","#############",".#+++++++++#.","..#+++++++#..","...#+++++#...","....#+++#....",".....#+#.....","......#......"],
 eye:[".............","....#####....","..##+++++##..",".#+++###+++#.","#+++#####+++#",".#+++###+++#.","..##+++++##..","....#####...."],
 on:["....#......#.","...##...#...#","..###....#..#","#####..#.#.#.","#####..#.#.#.","#####..#.#.#.","..###....#..#","...##...#...#","....#......#."],
 off:["....#........","...##........","..###.#...#..","#####..#.#...","#####...#....","#####..#.#...","..###.#...#..","...##........","....#........"]
};
export function pixIcon(n){ const m=ICONS[n]; let r=''; m.forEach((row,y)=>[...row].forEach((ch,x)=>{ if(ch==='#')r+=`<rect x="${x}" y="${y}" width="1" height="1" fill="currentColor"/>`; if(ch==='+')r+=`<rect x="${x}" y="${y}" width="1" height="1" fill="currentColor" opacity=".3"/>`; })); return `<svg viewBox="0 0 13 ${m.length}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`; }
export const sig={bolt:pixIcon('bolt'),nova:pixIcon('nova'),ward:pixIcon('ward'),summon:pixIcon('summon'),beam:pixIcon('beam'),trap:pixIcon('trap'),blink:pixIcon('blink')};
const wandInfo=()=>WANDS.find(w=>w.id===G.P.wand);
const handHTML=()=>{ const items=G.P.spells.map(spellName); if(G.P.wand)items.push(wandInfo().name); Object.values(G.P.gear).forEach(id=>{if(id)items.push(gearOf(id).name);}); return items.length?`<div class="hand">${items.map(n=>`<i>${n}</i>`).join('')}</div>`:''; };
const goldHTML=()=>`<div class="gold"><span class="coin"></span>${G.P.gold} gold</div>`;
export function show(html){ ov.innerHTML=`<div class="inner">${html}</div>`; ov.hidden=false; ov.scrollTop=0; stage.style.cursor='default'; }
function cardHTML(s,i,label){
  const r=recipeOf(s);
  return `<button class="card${r?' secret':''}" data-i="${i}" style="--boss:${EL[s.els[0]].c}">${sig[s.type]}<div class="txt">${label?`<small>${r?'Secret recipe · ':''}${label}</small>`:''}<b>${spellName(s)}</b><span>${spellDesc(s)}</span><em>${spellCost(s)} mana</em></div></button>`;
}
export function showPick(){
  const d=BOSSES[S.stage], el=BOSS_EL[S.stage]; S.mode='pick';
  const types=Object.keys(TYPES).sort(()=>Math.random()-.5).slice(0,3);
  const sec=ELITE_SECOND[S.stage]; const opts=types.map(type=>sec?{type,els:[el,sec],tier:1}:{type,els:[el],tier:0});
  show(`<div class="eyebrow">${S.pos+1} of 16 defeated · one heart restored</div>
    ${G.P.reward?`<div class="reward"><b>+${G.P.reward.g} gold</b><span>${G.P.reward.parts.join(' · ')}</span></div>`:''}
    <h2>Take ${d.elite?'an elite':'a'} spell from ${d.name}</h2>
    <div class="cards">${opts.map((s,i)=>cardHTML(s,i)).join('')}</div>${handHTML()}`);
  ov.querySelectorAll('.card').forEach(b=>b.onclick=()=>takeSpell(opts[+b.dataset.i]));
  S.pendingOpts=opts; hotSave();
}
export function forgeOptions(n){
  const sp=G.P.spells, out=[], seen=new Set();
  const add=(label,result,apply)=>{ const k=spellKey(result)+apply.slot; if(seen.has(k))return; seen.add(k); out.push({label,result,...apply}); };
  if(sp.length<G.P.slots) add('Keep as a new spell',n,{slot:sp.length});
  sp.forEach((s,i)=>{
    add(`Fuse: ${spellName(s)} + ${spellName(n)}`,fuse(s,n),{slot:i});
    if(s.type!==n.type) add(`Fuse: ${spellName(n)} + ${spellName(s)}`,fuse(n,s),{slot:i});
  });
  if(sp.length>=G.P.slots) sp.forEach((s,i)=>add(`Replace ${spellName(s)}`,n,{slot:i}));
  return out;
}
export function takeSpell(n){
  const opts=forgeOptions(n), v=spellValue(n);
  show(`<div class="eyebrow">Keep it, fuse it or sell it</div><h2>What becomes of ${spellName(n)}?</h2>
    ${goldHTML()}${G.P.spells.length?'<p class="muted">The first spell sets the type. The second adds its twist.</p>':''}
    <div class="cards">${opts.map((o,i)=>cardHTML(o.result,i,o.label)).join('')}
    <button class="sellrow" id="sell"><span class="coin"></span><b>Sell ${spellName(n)}</b><em>+${v} gold</em></button></div>`);
  ov.querySelectorAll('.card').forEach(b=>b.onclick=()=>{ const o=opts[+b.dataset.i]; G.P.spells[o.slot]=o.result; nextBoss(); });
  $('sell').onclick=()=>{ G.P.gold+=v; sfx.coin(); nextBoss(); };
  S.pendingFuse=opts;
}
export function nextBoss(){ G.P.spells.forEach(learnRecipe); sfx.pick(); S.mod=null; if(G.P.extraPick){G.P.extraPick=false;showPick();return;} lootOrShop(); }
export function openShop(){
  const wands=shuffle(WANDS.filter(w=>w.id!==G.P.wand)).slice(0,2);
  S.stock=[...wands.map(w=>({...w,icon:'wand',wand:true})),...shuffle(GOODS.filter(g=>g.ok())).slice(0,2)];
  if(Math.random()<.4){ const pool=GEAR.filter(g=>!hasGear(g.id)); const g=pool[Math.floor(Math.random()*pool.length)]; if(g)S.stock.push({id:g.id,name:g.name,icon:g.slot,c:g.cursed?'#e0405a':'#dcb868',cost:g.value*2+10,desc:`${SLOT_LABEL[g.slot]}. ${g.desc}`,ok:()=>!hasGear(g.id),fx(){equip(g);}}); }
  S.rerolls=0; showShop();
}
export function leaveShop(){ S.pos++; showDraw(); }
function rerollCost(){ return 5+5*S.rerolls; }
export function showShop(){
  S.mode='shop'; $('bossname').hidden=true; const rc=rerollCost();
  const row=(it,i)=>{ const sold=it.sold, can=!sold&&G.P.gold>=it.cost&&(it.wand||it.ok());
    return `<button class="shoprow" data-i="${i}" style="--boss:${it.c}" ${can?'':'disabled'}>${pixIcon(it.icon)}<div class="txt"><b>${it.name}</b><span>${it.desc}${it.wand&&G.P.wand?` Replaces your ${wandInfo().name}.`:''}</span></div><em>${sold?'Sold':it.cost+' gold'}</em></button>`; };
  show(`<div class="eyebrow">The shop · before pull ${S.pos+2} of 16</div><h2>Spend your gold</h2>
    <div class="shopstatus">${goldHTML()}<div class="gold">${G.P.hp}/${G.P.max} hearts</div></div>
    <div class="cards">${S.stock.map(row).join('')}</div>
    ${G.P.spells.length?`<div class="eyebrow">Sell a spell you own</div><div class="cards">${G.P.spells.map((s,i)=>`<button class="sellrow" data-s="${i}"><span class="coin"></span><b>${spellName(s)}</b><em>+${spellValue(s)} gold</em></button>`).join('')}</div>`:''}
    ${handHTML()}
    <div class="shopbtns"><button class="ghost" id="reroll" ${G.P.gold>=rc?'':'disabled'}>New stock · ${rc} gold</button><button class="go" id="leave">Pull the next card</button></div>`);
  ov.querySelectorAll('.shoprow').forEach(b=>b.onclick=()=>buy(S.stock[+b.dataset.i]));
  ov.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.s; G.P.gold+=spellValue(G.P.spells[i]); G.P.spells.splice(i,1); sfx.coin(); showShop(); });
  $('reroll').onclick=()=>{ G.P.gold-=rc; S.rerolls++; const r=S.rerolls; openShop(); S.rerolls=r; sfx.coin(); showShop(); };
  $('leave').onclick=leaveShop; hotSave();
}
export function buy(it){ if(it.sold||G.P.gold<it.cost)return; G.P.gold-=it.cost; it.sold=true; if(it.wand)G.P.wand=it.id; else it.fx(); sfx.coin(); showShop(); }
const fmt=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
export function showDead(){
  S.mode='dead'; const d=BOSSES[S.stage];
  show(`<div class="eyebrow">The run ends on pull ${S.pos+1} of 8</div><h2>${d.name} takes the hand</h2>
    <div class="stats"><div><b>${S.pos}</b><small>Bosses beaten</small></div><div><b>${S.best}</b><small>Best run</small></div><div><b>${S.recipes.length}/${RECIPES.length}</b><small>Recipes</small></div></div>
    ${handHTML()}<p class="muted">Every spell is gone. The deck is shuffled again.</p>
    <button class="go" id="again">Start again</button>`);
  $('again').onclick=startRun; $('again').focus({preventScroll:true});
}
export function showVictory(){
  S.mode='victory';
  show(`<div class="eyebrow">All 16 cards defeated</div><h1>The deck is yours</h1>
    <p>You cleared the deck in ${fmt(S.runSeconds)}.</p>${handHTML()}
    <div class="stats"><div><b>${S.recipes.length}/${RECIPES.length}</b><small>Secret recipes found</small></div></div>
    <button class="go" id="again">Play another run</button>`);
  $('again').onclick=startRun;
}
export function showTitle(){
  S.mode='title'; G.pull=null; muteBtn.hidden=true; spellBar.hidden=true; $('bossname').hidden=true; $('omen').hidden=true;
  show(`<div class="eyebrow">A boss-rush roguelike</div><h1>The Eighth Arcanum</h1>
    <p>Each pull, the hands deal a blind boss, omen and arena. An elite waits on every fourth pull. Beat it for gold, take its spell, then keep, fuse or sell it. Spend your gold in the shop. Die and the deck is shuffled again.</p>
    <p class="muted">The arena card decides how you fight: open field, orbit, face-off or open arena. Chests appear mid-fight with gear, gold or mana. If one wiggles it's a mimic, so cast a spell near it before you touch it. Tap spells with your other thumb. Near misses and perfect dodges refill mana.</p>
    ${S.best||S.recipes.length?`<div class="stats"><div><b>${S.best} / 16</b><small>Best run</small></div><div><b>${S.recipes.length} / ${RECIPES.length}</b><small>Recipes</small></div></div>`:''}
    <button class="go" id="begin">Begin a run</button>`);
  $('begin').onclick=startRun;
}
export function pause(){ if(S.paused||!['fight','intro'].includes(S.mode))return; S.paused=true;
  show(`<h2>Paused</h2><p class="muted">${BOSSES[S.stage].name} waits.</p><button class="go" id="res">Resume</button>`);
  $('res').onclick=()=>{S.paused=false;ov.hidden=true;stage.style.cursor='grab';wakeAudio();};
}
document.addEventListener('visibilitychange',()=>{ if(document.hidden)pause(); else requestWake(); });
export async function requestWake(){ try{ if(navigator.wakeLock&&!G.wakeLock){ G.wakeLock=await navigator.wakeLock.request('screen'); G.wakeLock.addEventListener('release',()=>G.wakeLock=null);} }catch(e){} }
