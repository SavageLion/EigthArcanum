// @ts-nocheck
import { W, muteBtn, ov, reduced, stage } from '../core/dom';
import { G, S } from '../core/state';
import { BOSSES, ELITE_SECOND } from '../data/bosses';
import { hotSave } from '../main';
import { sideEnd, sideStart } from './sideView';
import { resize } from '../core/size';
import { eventsEnd, eventsStart } from './arenaEvents';
import { FIST, LW, SPRITE_OVERRIDES, WIZ_SETS, blit, disc, makeBg } from '../render/sprites';
import { foPlan } from './bossPlans';
import { paintSpells, spellBar } from './casting';
import { CY, ECHO, GOODS, POS_HP, RO, WANDS, fightReward, hasPerk, hasWand, isMod, posHp, relPos, shuffle, spellValue, total } from './deck';
import { ARENA_LIST, getTestArena, setTestArena, showDraw, startRun } from './flow';
import { unlockEverything, RUN_LENGTHS, RUN_UNLOCK, WIZARDS, meta, noteBoss, noteRunEnd, takeUnlocks, wizardById } from '../data/meta';
import { runAvailable } from '../data/bosses';
import { codedWizardPortrait } from '../render/wizardArt';
import { GEAR, SLOT_LABEL, equip, gearOf, hasGear, lootOrShop, nearMiss, rateNow } from './gear';
import { oaEnd, oaStart } from './openArena';
import { burst, hurt } from './sim';
import { blowTrap } from './spellFx';
import { BOSS_EL, EL, RECIPES, TYPES, fuse, learnRecipe, recipeOf, spellCost, spellDesc, spellKey, spellName } from './spells';
import { mk, pixelise } from '../render/pixel';
import { circle, fl, ln, poly } from '../render/bossArt';
import { $, BONE, GOLD, clamp, rnd } from '../core/util';
import { setMusic, sfx, tone, wakeAudio } from '../core/audio';
import { fxExplosion, fxHeal } from '../render/vfx';

/* ---------- face-off arena, shared by every boss ---------- */
export const FO_ATTACKS={
 left:{zones:[0,1],hand:'l',say:'Dodge right'}, right:{zones:[1,2],hand:'r',say:'Dodge left'},
 slam:{zones:[1],hand:'both',say:'Dodge either way'}, clap:{zones:[0,2],hand:'both',say:'Stay in the middle'},
 spit:{zones:null,hand:'mouth',say:'Move at the last moment'}
};
/* the face-off is now the runner (systems/runner.ts); these are re-exported so the rest of the game keeps its imports */
export { FO_LANES, foBoss, foDodge, foFloor, foFreeze, foJump, foPlayer, foSlide, foStart, foStep } from './runner';
import { foStart } from './runner';

export function startFight(){
  const d=BOSSES[S.stage], m=(isMod('sun')||isMod('temperance'))?1.3:1;
  S.orbit=S.arena==='wheel'; S.fo=S.arena==='justice'; S.open=S.arena==='strength'; S.side=S.arena==='fool'; if(S.side){ ov.hidden=true; S.mode='intro'; resize(); }
  const hp=posHp(S.pos,total())*m*(S.orbit?1.6:S.fo?1.15:S.open?1.3:S.side?1.2:1);
  G.B={...d,def:d,rad:S.fo?105:(d.elite?56:46)*(S.side?.65:1),x:W/2,y:S.orbit?CY():150,max:hp,hp,t:0,tm:{},flash:0,burning:0,chill:0,enraged:false,ang:0,jump:3.5,bloomOuter:false};
  G.bolts=[];G.shots=[];G.rings=[];G.cols=[];G.seeds=[];G.beams=[];G.parts=[];G.helpers=[];G.bands=[];
  G.bg=makeBg(d); G.P.x=W/2;G.P.y=G.H-150;G.P.a=Math.PI/2;G.P.tr=RO;G.P.rr=RO;G.P.inv=0;G.P.shield=0;G.P.mana=G.P.spells.length?Math.round(G.P.manaMax/2):0;G.P.cd=0;G.P.cleanFight=true;G.P.moonUsed=false;G.P.beam=null;G.traps=[];S.chest=null;S.chestT=rnd(5,12);S.chestsLeft=(d.elite?1:0)+(Math.random()<.75?(Math.random()<.35?2:1):0);
  if(S.fo)foStart(); else G.fo=null; $('hint').hidden=true; $('call').hidden=true; if(S.fo){ $('hint').textContent='Swipe to change lane, jump and slide'; $('hint').hidden=false; } if(S.open)oaStart(); else oaEnd(); if(S.side)sideStart(); else sideEnd(); eventsStart();
  if(isMod('sun'))G.P.hp=G.P.max;
  G.P.freeCast=hasPerk('wildfire')?1:0; if(hasPerk('grave')) G.helpers.push({a:0,life:14,d:2.2*G.P.scale,cd:.4,s:{els:[],type:'summon',tier:0},pw:G.P.scale,c:'#e9e3cb'});
  if(isMod('death')){G.P.heldHp=G.P.hp;G.P.hp=1;}
  stage.style.setProperty('--boss',d.color);
  { const frac=S.pos/(S.order?S.order.length:16); setMusic(d.elite?'elite':'battle',S.stage,frac<.25?1:frac<.6?2:3,S.arena||'chariot'); } S.mode='intro';S.t=0; ov.hidden=true; muteBtn.hidden=false; stage.style.cursor='grab';
  $('bossname').textContent=`${d.num} · ${d.name}`; $('bossname').hidden=false;
  const tag=[d.elite&&'Elite',S.mod&&S.mod.name,!S.fo&&S.echo!==null&&`Echo: ${ECHO[S.echo].name}`].filter(Boolean).join(' · ');
  $('omen').textContent=tag; $('omen').hidden=!tag;
  $('intro').innerHTML=`<small>${S.mod?S.mod.name:`Pull ${S.pos+1} of ${total()}`}</small><b>${d.name}</b>`; $('intro').style.top=S.orbit?'13%':S.fo?'52%':S.open?'30%':'43%';
  paintSpells(); hotSave();
}
export function win(){
  setMusic('reward',S.pos); S.mode='won';S.t=0; G.P.beam=null; G.traps=[]; G.chestCall=0; if(S.open){$('call').hidden=true;} if(G.fo)G.fo.atk=null; $('hint').hidden=true; $('call').hidden=true;
  G.shots.forEach(s=>burst(s.x,s.y,GOLD,1)); G.shots=[];G.rings=[];G.cols=[];G.helpers=[];G.bands=[];
  burst(G.B.x,G.B.y,G.B.color,70); burst(G.B.x,G.B.y,GOLD,40); fxExplosion(G.B.x,G.B.y,1.7); fxHeal(G.P.x,G.P.y+10,'heal'); S.shake=reduced?0:14; S.flash=.6; sfx.win();
  G.P.scale*=Math.pow(1.1,15/Math.max(1,total()-1)); noteBoss(!!BOSSES[S.stage].elite,G.P.cleanFight); G.P.reward=fightReward(); G.P.gold+=G.P.reward.g;
  if(isMod('death')){G.P.hp=G.P.heldHp;G.P.extraPick=true;}
  G.P.hp=Math.min(G.P.max,G.P.hp+(hasGear('bloodstone')?2:1)); S.chest=null; spellBar.hidden=true; $('omen').hidden=true;
  if(S.pos+1>S.best) saveBest(S.pos+1);
}
function saveBest(v){ S.best=v; try{localStorage.setItem('ea-best',String(v));}catch(e){} }
export function die(){ G.P.deathAt=performance.now()/1000; G.P.beam=null; G.traps=[]; if(G.fo)G.fo.atk=null; $('hint').hidden=true; S.mode='dying';S.t=0;S.shake=reduced?0:12;spellBar.hidden=true;burst(G.P.x,G.P.y,BONE,50);sfx.lose(); }
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
/** Pixel Lab icon if we have it (ids: spell_<type>, el_<element>, gear_<id>, wand_<id>, good_<id>), else the old pixel map. */
export function icon(id,fallback){ return SPRITE_OVERRIDES.icons.has(id)?`<img class="ico" alt="" src="${import.meta.env.BASE_URL}assets/icons/${id}.png">`:fallback; }
/** a spell's icon with its element badge */
export function spellIcon(s){ const base=icon('spell_'+s.type,sig[s.type]), el=SPRITE_OVERRIDES.icons.has('el_'+s.els[0])?`<img class="icoel" alt="" src="${import.meta.env.BASE_URL}assets/icons/el_${s.els[0]}.png">`:''; return SPRITE_OVERRIDES.icons.has('spell_'+s.type)?`<span class="icowrap">${base}${el}</span>`:base; }
export const sig={bolt:pixIcon('bolt'),nova:pixIcon('nova'),ward:pixIcon('ward'),summon:pixIcon('summon'),beam:pixIcon('beam'),trap:pixIcon('trap'),blink:pixIcon('blink')};
const wandInfo=()=>WANDS.find(w=>w.id===G.P.wand);
/** "Your loadout": every spell, wand and piece of gear you carry, with what it does. Shown on the reward, forge and shop screens. */
const handHTML=()=>{
  const P=G.P, w=wizardById(P.wizard), rows=[];
  const row=(ic,name,tag,desc,col)=>`<div class="lo" style="--boss:${col||'var(--gold-dim)'}">${ic}<div class="txt"><b>${name}<small>${tag}</small></b><span>${desc}</span></div></div>`;
  if(w.perk) rows.push(row('<span class="lomark">★</span>',w.perkText.split(':')[0],w.name,w.perkText.includes(':')?w.perkText.split(':').slice(1).join(':').trim():w.perkText));
  P.spells.forEach(sp=>rows.push(row(spellIcon(sp),spellName(sp),`Spell · ${spellCost(sp)} mana`,spellDesc(sp),EL[sp.els[0]].c)));
  if(P.wand){ const wd=wandInfo(); rows.push(row(icon('wand_'+wd.id,pixIcon('wand')),wd.name,'Wand',wd.desc,wd.c)); }
  for(const slot of ['hat','robe','charm']){ const g=P.gear[slot]&&gearOf(P.gear[slot]); rows.push(g?row(icon('gear_'+g.id,pixIcon(slot)),g.name,SLOT_LABEL[slot]+(g.cursed?' · cursed':''),g.desc,g.cursed?'#e0405a':'var(--gold)'):`<div class="lo empty"><span class="lomark">·</span><div class="txt"><b>${SLOT_LABEL[slot]}<small>empty</small></b></div></div>`); }
  const stats=`<div class="lostats"><span>♥ ${P.hp}/${P.max}</span><span>Mana ${P.manaMax}</span><span>Bolt ${(1/rateNow()).toFixed(1)}/s</span><span>Power ×${P.scale.toFixed(2)}</span><span>${P.slots} spell slots</span></div>`;
  return `<details class="loadout" open><summary>Your loadout</summary>${stats}${rows.join('')}</details>`;
};
const goldHTML=()=>`<div class="gold"><span class="coin"></span>${G.P.gold} gold</div>`;
export function show(html){ ov.innerHTML=`<div class="inner">${html}</div>`; ov.hidden=false; ov.scrollTop=0; stage.style.cursor='default'; animateHeroes(); }
/** The raven for title, victory and defeat screens: front view, looping an animation clip (or holding its last frame). */
const HERO_FRAMES={idle:4,hurt:6};
export function heroHTML(clip='idle',hold=false){ const n=HERO_FRAMES[clip], base=import.meta.env.BASE_URL+'assets/wizard/anim/arena/'+clip+'/south/'; return `<div class="hero"><img alt="" src="${base}${hold?n-1:0}.png" data-base="${base}" data-n="${hold?0:n}"></div>`; }
function animateHeroes(){ ov.querySelectorAll('.hero img').forEach(img=>{ const n=+img.dataset.n; if(!n)return; let i=0; const t=setInterval(()=>{ if(!img.isConnected){clearInterval(t);return;} i=(i+1)%n; img.src=img.dataset.base+i+'.png'; },170); }); }
function cardHTML(s,i,label){
  const r=recipeOf(s);
  return `<button class="card${r?' secret':''}" data-i="${i}" style="--boss:${EL[s.els[0]].c}">${spellIcon(s)}<div class="txt">${label?`<small>${r?'Secret recipe · ':''}${label}</small>`:''}<b>${spellName(s)}</b><span>${spellDesc(s)}</span><em>${spellCost(s)} mana</em></div></button>`;
}
export function showPick(){
  const d=BOSSES[S.stage], el=BOSS_EL[S.stage]; S.mode='pick';
  const types=Object.keys(TYPES).sort(()=>Math.random()-.5).slice(0,3);
  const sec=ELITE_SECOND[S.stage]; const opts=types.map(type=>sec?{type,els:[el,sec],tier:1}:{type,els:[el],tier:0});
  show(`<div class="eyebrow">${S.pos+1} of ${total()} defeated · one heart restored</div>${unlockBanner()}
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
export function openShop(){ setMusic('shop',S.pos);
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
    return `<button class="shoprow" data-i="${i}" style="--boss:${it.c}" ${can?'':'disabled'}>${icon(it.wand?'wand_'+it.id:'good_'+it.id,pixIcon(it.icon))}<div class="txt"><b>${it.name}</b><span>${it.desc}${it.wand&&G.P.wand?` Replaces your ${wandInfo().name}.`:''}</span></div><em>${sold?'Sold':it.cost+' gold'}</em></button>`; };
  show(`<div class="eyebrow">The shop · before pull ${S.pos+2} of ${total()}</div><h2>Spend your gold</h2>
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
  setMusic('defeat'); S.mode='dead'; const d=BOSSES[S.stage]; noteRunEnd(total(),S.pos,false);
  show(`${heroHTML('hurt',true)}${unlockBanner()}<div class="eyebrow">The run ends on pull ${S.pos+1} of ${total()}</div><h2>${d.name} takes the hand</h2>
    <div class="stats"><div><b>${S.pos}</b><small>Bosses beaten</small></div><div><b>${meta.best[total()]||0}</b><small>Best ${total()}-run</small></div><div><b>${S.recipes.length}/${RECIPES.length}</b><small>Recipes</small></div></div>
    ${handHTML()}<p class="muted">Every spell is gone. The deck is shuffled again.</p>
    <button class="go" id="again">Start again</button>`);
  $('again').onclick=showSetup; $('again').focus({preventScroll:true});
}
export function showVictory(){
  setMusic('victory'); S.mode='victory'; noteRunEnd(total(),S.pos+1,true);
  show(`${heroHTML('idle')}${unlockBanner()}<div class="eyebrow">All ${total()} cards defeated</div><h1>The deck is yours</h1>
    <p>You cleared the deck in ${fmt(S.runSeconds)}.</p>${handHTML()}
    <div class="stats"><div><b>${S.recipes.length}/${RECIPES.length}</b><small>Secret recipes found</small></div></div>
    <button class="go" id="again">Play another run</button>`);
  $('again').onclick=showSetup;
}
export function showTitle(){
  setMusic('title'); S.mode='title'; G.pull=null; muteBtn.hidden=true; spellBar.hidden=true; $('bossname').hidden=true; $('omen').hidden=true;
  show(`${heroHTML('idle')}<div class="eyebrow">A boss-rush roguelike</div><h1>The Eighth Arcanum</h1>
    <p>Each pull, the hands deal a blind boss, omen and arena. An elite waits on every fourth pull. Beat it for gold, take its spell, then keep, fuse or sell it. Spend your gold in the shop. Die and the deck is shuffled again.</p>
    <details class="how"><summary>How it plays</summary><p class="muted">The arena card decides how you fight: open field, orbit, face-off or open arena. Chests appear mid-fight with gear, gold or mana. If one wiggles it's a mimic, so cast a spell near it before you touch it. Tap spells with your other thumb. Near misses and perfect dodges refill mana.</p></details>
    ${S.best||S.recipes.length?`<div class="stats"><div><b>${S.best} / 16</b><small>Best run</small></div><div><b>${S.recipes.length} / ${RECIPES.length}</b><small>Recipes</small></div></div>`:''}
    <button class="go" id="begin">Begin a run</button>`);
  $('begin').onclick=showSetup;
}
/** pending unlock messages (new wizard, new run length) as a banner */
export function unlockBanner(){ const u=takeUnlocks(); return u.length?`<div class="unlock">${u.map(t=>`<b>★ ${t}</b>`).join('')}</div>`:''; }
function portraitHTML(id){ const W=WIZ_SETS[id]; if(W) return `<img alt="" src="${W.front.img.src||W.front.img.toDataURL()}">`; const raven=id==='raven'&&SPRITE_OVERRIDES.wizardFront; if(raven) return `<img alt="" src="${SPRITE_OVERRIDES.wizardFront.img.src}">`; const c=codedWizardPortrait(id); return c?`<img alt="" src="${c.toDataURL()}">`:''; }
const pips=(n,max)=>'<i class="pip on"></i>'.repeat(n)+'<i class="pip"></i>'.repeat(Math.max(0,max-n));
/** between the title and the first card draw: pick a wizard and a run length */
export function showSetup(){
  const sel={w:meta.wizards.includes(meta.lastWizard)?meta.lastWizard:'raven',n:meta.runs.includes(meta.lastRun)&&runAvailable(meta.lastRun)?meta.lastRun:8};
  const paint=()=>{
    show(`<div class="eyebrow">Before the first pull</div><h2>Choose your wizard</h2>${unlockBanner()}
      <div class="eyebrow">Length of the run</div>
      <div class="runs">${RUN_LENGTHS.map(n=>{ const open=meta.runs.includes(n), ready=runAvailable(n); return `<button class="run${n===sel.n?' sel':''}" data-n="${n}" ${open&&ready?'':'disabled'}><b>${n}</b><span>${!open?RUN_UNLOCK[n]:!ready?'More bosses coming':'bosses'+(meta.best[n]?` · best ${meta.best[n]}`:'')}</span></button>`; }).join('')}</div>
      <div class="eyebrow">Wizard</div>
      <div class="wizlist">${WIZARDS.map(w=>{ const open=meta.wizards.includes(w.id); return `<button class="wiz${w.id===sel.w?' sel':''}${open?'':' locked'}" data-w="${w.id}" ${open?'':'disabled'}>${open?`<div class="wport">${portraitHTML(w.id)}</div>`:`<div class="wport lock">?</div>`}<div class="txt"><b>${open?w.name:'Locked'}</b><span>${open?w.blurb:w.unlock}</span>${open?`<div class="stats2"><em>♥ ${pips(w.hearts,6)}</em><em>✦ ${pips(Math.round(w.mana/25),5)}</em><em>↯ ${pips(Math.round((.3-w.rate)/.03)+1,5)}</em></div><small>${w.perkText}</small>`:''}</div></button>`; }).join('')}</div>
      <button class="go" id="start">Begin the run</button><div class="testbox"><button class="linkbtn" id="unlockall">Unlock everything (testing)</button><label class="testrow">Force arena (testing)<select id="testarena"><option value="">Random</option>${ARENA_LIST().map(a=>`<option value="${a.id}"${getTestArena()===a.id?' selected':''}>${a.name}</option>`).join('')}</select></label></div>`);
    $('unlockall').onclick=()=>{ unlockEverything(); paint(); };
    $('testarena').onchange=e=>setTestArena(e.target.value);
    ov.querySelectorAll('.wiz').forEach(b=>b.onclick=()=>{ sel.w=b.dataset.w; paint(); });
    ov.querySelectorAll('.run').forEach(b=>b.onclick=()=>{ sel.n=+b.dataset.n; paint(); });
    $('start').onclick=()=>startRun(sel.w,sel.n);
  };
  paint();
}
export function pause(){ if(S.paused||!['fight','intro'].includes(S.mode))return; S.paused=true;
  show(`<h2>Paused</h2><p class="muted">${BOSSES[S.stage].name} waits.</p><button class="go" id="res">Resume</button>`);
  $('res').onclick=()=>{S.paused=false;ov.hidden=true;stage.style.cursor='grab';wakeAudio();};
}
document.addEventListener('visibilitychange',()=>{ if(document.hidden)pause(); else requestWake(); });
export async function requestWake(){ try{ if(navigator.wakeLock&&!G.wakeLock){ G.wakeLock=await navigator.wakeLock.request('screen'); G.wakeLock.addEventListener('release',()=>G.wakeLock=null);} }catch(e){} }
