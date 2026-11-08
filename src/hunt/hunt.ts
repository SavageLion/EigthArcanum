
// @ts-nocheck
/* Hunt mode: the landscape wave-survival game (see prototypes/survivors). You pick a tarot boss in the Sanctum, explore a realm of connected
   rooms (each a short wave fight), take three keys from the guardians, break the seal and claim the boss's card.
   Self-contained: it draws on its own 480x270 canvas (#hcv) inside #hunt, and borrows the main game's art, music, wizards, bosses and meta.
   Imports are only used inside functions, because the rest of the game's modules import each other in a loop. */
import { gains, meta, recordGear, saveMeta, todayKey, WIZARDS, noteBoss, noteDaily } from '../data/meta';
import { BOSSES as MB, BOSS_EL } from '../data/bossList';
import { HUNT_ART, R, SPRITE_OVERRIDES, WIZ_ANIM, WIZ_SETS, blit, blitSprite, bossFrames, clipFrame } from '../render/sprites';
import { GEAR, SLOT_LABEL, gearOf } from '../data/gear';
import { RARITY, rankOf } from '../data/rarity';
import { fxBlink, fxExplosion, fxHeal, fxIce, fxImpact, fxLightning, setShake, vfxDraw, vfxStep } from './vfx';
import { applyMuteToMusic, setMusic, sfx, snd, wakeAudio } from '../core/audio';
import { S } from '../core/state';

const W=480,H=270;
let root,cv,c,box,panel,hmute,hmenu,exitFn=null,inited=false,hw=null,prevScene='wave',daily=false;
const rnd=(a,b)=>a+Math.random()*(b-a),rint=(a,b)=>Math.floor(rnd(a,b+1)),pick=a=>a[Math.floor(Math.random()*a.length)],clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),TAU=Math.PI*2;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const AR={x0:14,y0:24,x1:466,y1:256};   // playfield
const FONT='"Pixelify Sans","Courier New",monospace',SMALL='"VT323","Courier New",monospace';
const BASE=()=>import.meta.env.BASE_URL;
const $=id=>document.getElementById(id);

/* ---------- art: all borrowed from the main game ---------- */
const ICONF={bolt:'spell_bolt',nova:'spell_nova',chain:'el_storm',meteor:'spell_meteor',orbit:'spell_orbit',ward:'spell_ward',thorns:'el_thorn',blink:'spell_blink',familiar:'spell_summon',beam:'spell_beam',trap:'spell_trap',gust:'el_sound'};
const ICONS={};
function spellIcon(id){const f=ICONF[id];if(!f)return null;if(!ICONS[id]){const i=new Image();i.src=BASE()+'assets/icons/'+f+'.png';ICONS[id]=i;}return ICONS[id];}
function wizSprite(){
  const id=hw?hw.id:'raven',dir=P.face;
  if(id==='raven'){const A=SPRITE_OVERRIDES.anim&&SPRITE_OVERRIDES.anim.arena,w=A&&A.walk&&A.walk[dir];if(P.moving&&w)return clipFrame(w,P.step);return (SPRITE_OVERRIDES.wizardDirs&&SPRITE_OVERRIDES.wizardDirs[dir])||(w&&w.frames[0]);}
  const A=WIZ_ANIM[id],w=A&&A.walk&&A.walk[dir];if(P.moving&&w)return clipFrame(w,P.step);const set=WIZ_SETS[id];return (set&&set.dirs[dir])||(w&&w.frames[0]);
}
const portraits={};
function portrait(bi){
  if(portraits[bi])return portraits[bi];const f=bossFrames(bi),im=f&&f[0]&&f[0].img;if(!im)return '';
  try{portraits[bi]=im.toDataURL?im.toDataURL():im.src;}catch(e){portraits[bi]=im.src||'';}return portraits[bi];
}

/* ---------- spells and modifiers ---------- */
const SP={
  bolt:{name:'Arcane Bolt',cat:'attack',l:'B',col:'#ffd27a',cd:.5,desc:'Fires at the nearest foe.'},
  nova:{name:'Star Nova',cat:'attack',l:'N',col:'#9ad0ff',cd:2.6,desc:'A ring of light bursts out of you.'},
  chain:{name:'Chain Spark',cat:'attack',l:'C',col:'#cfe0ff',cd:1.7,desc:'Lightning that leaps between foes.'},
  meteor:{name:'Falling Star',cat:'attack',l:'M',col:'#ff9a5a',cd:3,desc:'Stars crash down on foes.'},
  orbit:{name:'Moon Orbit',cat:'attack',l:'O',col:'#e8d8ff',cd:0,desc:'Moons circle you, hurt foes and block shots.'},
  ward:{name:'Ward',cat:'defense',l:'W',col:'#7fe0c0',cd:9,desc:'Blocks one hit, then shoves foes back.'},
  thorns:{name:'Thorn Ring',cat:'defense',l:'T',col:'#8fe06a',cd:0,desc:'A ring of thorns hurts anything close.'},
  blink:{name:'Blink',cat:'move',l:'K',col:'#c9a0ff',cd:5,desc:'Teleports you away when foes crowd in.'},
  gust:{name:'Gale',cat:'move',l:'G',col:'#bfe8ff',cd:7,desc:'Pushes foes away and speeds you up.'},
  familiar:{name:'Familiar',cat:'summon',l:'F',col:'#ffb4d8',cd:0,desc:'A spirit that fights beside you.'},
  beam:{name:'Starbeam',cat:'attack',l:'R',col:'#fff0a0',cd:4.5,desc:'A beam of light sweeps through every foe in line.'},
  trap:{name:'Rune Trap',cat:'defense',l:'P',col:'#ff9ad8',cd:3.2,desc:'Lays runes that burst when a foe steps on them.'},
};
const CATC={attack:'#ffb04a',defense:'#7fe0c0',move:'#c9a0ff',summon:'#ffb4d8'};
const ALLS=Object.keys(SP);
const MODS={
  multi:{name:'Multishot',desc:'+1 projectile, ring, beam or trap',tags:['bolt','nova','chain','meteor','orbit','familiar','beam','trap']},
  pierce:{name:'Piercing',desc:'Shots pass through 2 more foes',tags:['bolt','familiar']},
  split:{name:'Splintering',desc:'Hits burst into small shards',tags:['bolt','meteor']},
  bounce:{name:'Ricochet',desc:'Bolts bounce to another foe; sparks leap 2 more',tags:['bolt','chain']},
  haste:{name:'Quickened',desc:'20% faster cooldown',tags:ALLS},
  power:{name:'Empowered',desc:'+35% damage',tags:ALLS},
  size:{name:'Grandeur',desc:'+25% size and reach',tags:['bolt','nova','meteor','orbit','thorns','ward','gust','blink','beam','trap']},
  frost:{name:'Frostbite',desc:'Hits slow foes',tags:['bolt','nova','chain','meteor','orbit','thorns','familiar','beam','trap']},
  burn:{name:'Cinders',desc:'Hits set foes alight',tags:['bolt','nova','chain','meteor','orbit','thorns','familiar','beam','trap']},
  echo:{name:'Echo',desc:'Casts a second time',tags:['bolt','nova','chain','meteor']},
};
const REWARDS={element:{n:'Infusion',d:'Give a spell an element'},spell:{n:'New spell',d:'Learn one of three'},mod:{n:'Spell upgrade',d:'Add a modifier'},rest:{n:'Rest',d:'Heal or grow stronger'},shop:{n:'Merchant',d:'Spend stardust'},gamble:{n:'Wager',d:'Risk HP for power'}};
const TWISTS={
  calm:{name:'Quiet night',desc:'Fewer foes',mult:1,spawn:.65},
  blood:{name:'Blood moon',desc:'Foes 25% faster',mult:2,spawn:1.1,speed:1.25},
  swarm:{name:'Swarm',desc:'Many weak foes',mult:1.5,spawn:1.7,hp:.7,weak:1},
  brutes:{name:'Brutes',desc:'Few, tough foes',mult:1.6,spawn:.6,hp:1.5,heavy:1},
  haunt:{name:'Haunted',desc:'Many shooters',mult:1.5,spawn:1,seers:1},
  frenzy:{name:'Frenzy',desc:'Your spells 30% faster, foes too',mult:1.8,spawn:1.35,cd:.77},
};
const ENEMIES={
  wisp:{hp:6,spd:36,r:7,dmg:1,cost:1,col:'#8fd0ff',gem:1},
  bat:{hp:4,spd:66,r:6,dmg:1,cost:1.2,col:'#c9a0ff',gem:1},
  husk:{hp:30,spd:22,r:12,dmg:2,cost:3.4,col:'#b88a6a',gem:3},
  seer:{hp:11,spd:26,r:8,dmg:1,cost:3,col:'#ffd27a',gem:2},
  ram:{hp:15,spd:30,r:10,dmg:2,cost:3,col:'#ff7a6e',gem:2},
};
/* ---------- elements: the classic game's twelve, as infusions for your spells ---------- */
const ELS={
  fire:{n:'Fire',col:'#ff7a3a',d:'Burns foes; kills burst into embers.'},
  frost:{n:'Frost',col:'#9ad8ff',d:'Slows foes; three hits freeze one solid.'},
  storm:{n:'Storm',col:'#f0dc55',d:'Hits arc lightning to a nearby foe.'},
  thorn:{n:'Thorn',col:'#8fe06a',d:'Roots foes in place.'},
  bone:{n:'Bone',col:'#e8dfc8',d:'Kills burst into bone shards.'},
  mirror:{n:'Mirror',col:'#d8b4ff',d:'Hits echo onto a second foe.'},
  blood:{n:'Blood',col:'#e0405a',d:'Your hits heal you a little.'},
  gold:{n:'Gold',col:'#ffd27a',d:'Lucky triple-damage hits and extra stardust.'},
  poison:{n:'Poison',col:'#9ae04a',d:'Stacking poison that spreads on death.'},
  holy:{n:'Holy',col:'#fff1b0',d:'Smites elites; kills can heal you.'},
  void:{n:'Void',col:'#8a5aff',d:'Drags nearby foes into the hit.'},
  sound:{n:'Sound',col:'#cfe0ff',d:'Knocks foes back and dazes them.'},
};
const ELTAGS=['bolt','nova','chain','meteor','orbit','thorns','familiar','beam','trap'];
for(const k in ELS)MODS['el_'+k]={name:ELS[k].n+' infusion',desc:ELS[k].d,tags:ELTAGS,el:k};
const ALTARS=['market','rest','wager','treasure'];
/* ---------- stage looks: six themes, each with its own floor tiles, props and drifting motes ---------- */
const THEMES=[
  {n:'Crypt',set:'flag',tint:'rgba(30,20,60,.35)',decor:['tomb','statue','arch','pillar'],part:'dust',pc:'#a79bc0'},
  {n:'Overgrowth',set:'moss',tint:'rgba(10,50,30,.25)',decor:['stump','mushroom','thorn','mushroom'],part:'spore',pc:'#9ae04a'},
  {n:'Frost hollow',set:'ice',tint:'rgba(20,50,90,.25)',decor:['crystal','ice','ice','statue'],part:'snow',pc:'#e8f4ff'},
  {n:'Ember hall',set:'ash',tint:'rgba(70,20,10,.28)',decor:['brazier','obsidian','obsidian','pillar'],part:'ember',pc:'#ff9a4a'},
  {n:'Observatory',set:'flag',tint:'rgba(20,40,110,.38)',decor:['obelisk','statue','pillar','obelisk'],part:'star',pc:'#ffe9a0'},
  {n:'Void rift',set:'ash',tint:'rgba(60,10,90,.42)',decor:['voideye','crystal','arch','voideye'],part:'void',pc:'#b08aff'},
];
const SZ={wisp:32,bat:34,seer:34,husk:42,ram:42,mimic:36,guardian:58};
const KEYS_NEEDED=3,GC=5,GR=4;
/* every boss in the game is huntable: danger comes from its rank by health, its card power from its element */
let STARS=null;
const stars_=()=>{if(!STARS){const hs=MB.map((b,i)=>[b.hp||0,i]).sort((a,b)=>a[0]-b[0]);STARS=[];hs.forEach(([h,i],r)=>{STARS[i]=1+Math.floor(r*5/hs.length);});}return STARS;};
const bdef=bi=>{const b=MB[bi],st=stars_()[bi];return {id:bi,name:b.name,num:b.num,col:b.color,star:st,el:BOSS_EL[bi]||null,hp:300+170*st,elite:!!b.elite};};
const PW={
  burn:'Your hits set foes alight.',slow:'Your hits slow foes.',dmg:'+15% spell damage per level.',hearts:'+2 hearts, +1 per level.',haste:'Spells recharge 8% faster per level.',
  speed:'You move 8% faster per level.',gold:'+25% stardust per level.',pierce:'Begin each hunt with a piercing bolt.',multi:'Begin each hunt with a double bolt.',
};
const EL_POWER={fire:['el:fire','spell:meteor'],frost:['el:frost','spell:ward'],storm:['el:storm','spell:chain'],sound:['el:sound','spell:nova'],thorn:['el:thorn','spell:thorns'],bone:['el:bone','spell:familiar'],mirror:['el:mirror','haste'],blood:['el:blood','hearts'],gold:['el:gold','gold'],poison:['el:poison','spell:trap'],holy:['el:holy','hearts'],void:['el:void','spell:beam']};
const FALL=['dmg','haste','speed','pierce','multi','spell:orbit','spell:meteor','dmg','haste'];
const powerKey=bi=>{const p=EL_POWER[BOSS_EL[bi]];return p?p[bi%2]:FALL[bi%FALL.length];};
export const cardInfo=bi=>({text:powerText(powerKey(bi)),level:(meta.hunt&&meta.hunt.cards[bi])||0});
const powerText=k=>k.startsWith('spell:')?'Begin each hunt with '+SP[k.slice(6)].name+'.':k.startsWith('el:')?'Your first spell begins infused with '+ELS[k.slice(3)].n+'.':PW[k];
const hunt_=()=>meta.hunt||(meta.hunt={cards:{},equipped:[],wins:0});
const owned=()=>Object.keys(hunt_().cards).map(Number);
const cardSlots=()=>Math.min(4,1+Math.floor(owned().length/3));

/* ---------- state ---------- */
let scene='menu',t=0,P,spells=[],stage=1,twist=null,nextTwist=null,enemies=[],shots=[],eshots=[],gems=[],parts=[],texts=[],marks=[],rings=[],zaps=[],later=[],blasts=[],famil=[],spawnQ=[],corners=[],stat={kills:0,dmg:0,gems:0,hurt:0},shake=0,flash=0,hold=0,holdCorner=-1,boss=null,bannerT=0,banner='',clearT=0,waveT=0,waveLen=0,spawnAcc=0,gemsTaken=0,bgc=null;
let world=null,room=null,keysHeld=0,guard=null,nodeKind='fight',bossMul=1,locked=false,rewardWait=0,altarHold=0,dark=0,darkT=0,roamT=8,zones=[],hunting=null,gHit={frost:false,burn:false,dmg:1,cd:1,speed:1,gold:1,crit:0,winHeal:0},fade=0,board=[],roomsCleared=0,beams=[],traps=[],gearOn={hat:null,robe:null,charm:null},bloodAcc=0,roomTear=false,phoenixUsed=false;
const keys={},stick={id:null,ox:0,oy:0,x:0,y:0,on:false,t0:0,moved:false};
function mkSpell(id){return {id,cd:SP[id].cd*.4,m:{multi:0,pierce:0,split:0,bounce:0,haste:0,power:0,size:0,frost:0,burn:0,echo:0},ang:0,tick:0,n:0,el:null,tier:0};}
const hasSpell=id=>spells.find(s=>s.id===id);
const cdMul=()=>twist&&twist.cd||1;
const sCd=s=>SP[s.id].cd*Math.pow(.8,s.m.haste)*Math.pow(.92,s.tier||0)*cdMul()*gHit.cd;
const sDmg=(s,b)=>b*(1+.35*s.m.power)*(1+.3*(s.tier||0))*gHit.dmg*(hasGear('eclipse')&&P&&P.hp<=2?1.3:1);
const sArea=s=>1+.25*s.m.size;
function effHP(base){return base*(1+.24*(stage-1))*(twist&&twist.hp||1);}

/* ---------- waves ---------- */
function spawnGuardian(){
  const hp=effHP(30)*4.2;guard={type:'husk',x:240,y:70,vx:0,vy:0,hp,max:hp,r:17,spd:30,dmg:2,col:'#ffd27a',elite:true,slow:0,burn:0,flash:0,cd:2,st:0,stT:0,ph:0,orbCD:0,gem:14,kb:{x:0,y:0},guardian:true,name:'Key Guardian'};enemies.push(guard);
}
function typeWeights(){
  const w={wisp:5,bat:stage>=2?3:0,husk:stage>=2?2:0,seer:stage>=3?2:0,ram:stage>=4?2:0};
  if(twist){if(twist.weak){w.wisp*=2;w.bat*=2.5;w.husk=0;w.ram=0;}if(twist.heavy){w.husk*=3;w.ram*=3;w.wisp*=.3;w.bat*=.3;}if(twist.seers){w.seer=Math.max(2,w.seer)*4;}}
  return w;
}
function pickType(){const w=typeWeights();let tot=0;for(const k in w)tot+=w[k];let r=Math.random()*tot;for(const k in w){r-=w[k];if(r<=0)return k;}return 'wisp';}
function queueSpawn(type){
  let x,y,n=0;do{x=rnd(AR.x0+16,AR.x1-16);y=rnd(AR.y0+16,AR.y1-16);const edge=Math.random();if(edge<.7){if(Math.random()<.5)x=Math.random()<.5?AR.x0+14:AR.x1-14;else y=Math.random()<.5?AR.y0+14:AR.y1-14;}}while(Math.hypot(x-P.x,y-P.y)<95&&n++<30);
  marks.push({x,y,t:.6,type});
}
function makeEnemy(type,x,y,elite){
  const d=ENEMIES[type],hp=effHP(d.hp)*(elite?3.2:1);
  return {type,x,y,vx:0,vy:0,hp,max:hp,r:d.r*(elite?1.35:1),spd:d.spd*(twist&&twist.speed||1)*(twist&&twist.cd?1.3:1),dmg:d.dmg,col:d.col,elite,slow:0,burn:0,flash:0,cd:rnd(1,2.4),st:0,stT:0,ph:rnd(0,6),orbCD:0,gem:d.gem*(elite?3:1),kb:{x:0,y:0}};
}
function ringShots(b,n,sp,off,col,r=3){for(let i=0;i<n;i++){const a=off+i/n*TAU;eshots.push({x:b.x,y:b.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r,dmg:1,life:6,col});}}
function fanShots(b,n,spread,sp,col){const a=Math.atan2(P.y-b.y,P.x-b.x);for(let i=0;i<n;i++){const o=(i-(n-1)/2)*spread;eshots.push({x:b.x,y:b.y,vx:Math.cos(a+o)*sp,vy:Math.sin(a+o)*sp,r:3,dmg:1,life:6,col});}}
/* every boss gets a kit of four attacks picked from its element, so each of the 64 plays differently */
const KIT_W={
  storm:{columns:4,fan:2,ring:1},frost:{circles:3,spiral:3,ring:1},fire:{rain:3,ring:2,fan:1},thorn:{circles:2,summon:2,fan:1},bone:{summon:3,dash:2,fan:1},
  mirror:{fan:3,spiral:2,ring:1},blood:{dash:3,fan:2,ring:1},gold:{rain:2,curtain:3,fan:1},poison:{circles:3,summon:2,spiral:1},holy:{ring:2,columns:2,spiral:2},
  void:{spiral:3,circles:2,columns:1},sound:{ring:3,curtain:2,fan:1},
};
const KIT_ALL={fan:2,ring:2,spiral:1,columns:1,circles:1,summon:1,rain:1,dash:.6,curtain:1};
function seeded(n){let a=n*2654435761>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function kitFor(bi){
  const r=seeded(bi+11),w={...KIT_ALL,...(KIT_W[BOSS_EL[bi]]||{})},kit=[];
  while(kit.length<4){let tot=0;for(const k in w)if(!kit.includes(k))tot+=w[k];let q=r()*tot;for(const k in w){if(kit.includes(k))continue;q-=w[k];if(q<=0){kit.push(k);break;}}}
  return {kit,move:['hover','wander','orbit'][Math.floor(r()*3)],speed:42+r()*22};
}
function spawnBoss(bi){
  const d=hunting,k=kitFor(bi),hp=effHP(d.hp)*.55*bossMul;
  boss={kind:bi,art:bi,x:240,y:70,vx:0,vy:0,hp,max:hp,r:d.elite?24:20,t:0,cd:2,pat:0,slow:0,burn:0,flash:0,name:d.name,tx:240,ty:70,col:d.col,isBoss:true,kb:{x:0,y:0},ph:0,orbCD:0,type:'boss',dmg:2,dash:0,windup:0,kit:k.kit,move:k.move,spd:k.speed,ph2:false};
  enemies.push(boss);
}
function runPattern(b,name,ph2){
  const st=hunting.star,col=b.col,sp=58+st*7+(ph2?12:0);
  if(name==='fan'){for(let k=0;k<(ph2?3:2);k++)later.push({t:k*.3,fn:()=>fanShots(b,4+st+(ph2?2:0),.15,sp+35,col)});}
  else if(name==='ring'){ringShots(b,10+st*2+(ph2?6:0),sp,rnd(0,TAU),col);if(ph2)later.push({t:.45,fn:()=>ringShots(b,14+st,sp,.3,col)});}
  else if(name==='spiral'){const arms=ph2?3:2,n=10+st*2;for(let k=0;k<n;k++)later.push({t:k*.12,fn:()=>{for(let a=0;a<arms;a++){const ang=b.t*2+k*.38+a*TAU/arms;eshots.push({x:b.x,y:b.y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,r:2.8,dmg:1,life:6,col});}}});}
  else if(name==='columns'){[P.x,P.x-70,P.x+70,P.x-140,P.x+140].slice(0,2+Math.ceil(st/2)+(ph2?1:0)).forEach(x=>{x=clamp(x,AR.x0+12,AR.x1-12);zones.push({x:x-9,y:AR.y0,w:18,h:AR.y1-AR.y0,t:0,warn:.9,on:.3,col});});}
  else if(name==='circles'){for(let i=0;i<2+Math.ceil(st/2)+(ph2?1:0);i++)zones.push({x:clamp(P.x+rnd(-70,70),AR.x0+26,AR.x1-26),y:clamp(P.y+rnd(-45,45),AR.y0+26,AR.y1-26),r:24,t:0,warn:1,on:.4,col});}
  else if(name==='summon'){for(let i=0;i<2+(ph2?1:0);i++)queueSpawn(pick(st>=3?['bat','wisp','ram']:['bat','wisp']));ringShots(b,8,sp-10,0,col);}
  else if(name==='rain'){for(let k=0;k<10+st*2;k++)later.push({t:k*.12,fn:()=>eshots.push({x:rnd(AR.x0+10,AR.x1-10),y:AR.y0+4,vx:0,vy:80+st*6,r:3,dmg:1,life:6,col})});}
  else if(name==='curtain'){const gap=rint(2,10);for(let i=0;i<13;i++)if(Math.abs(i-gap)>1)eshots.push({x:AR.x0+14+i*34,y:AR.y0+4,vx:0,vy:78+st*5,r:3.2,dmg:1,life:6,col});if(ph2)later.push({t:.7,fn:()=>{const g2=rint(2,10);for(let i=0;i<13;i++)if(Math.abs(i-g2)>1)eshots.push({x:AR.x0+14+i*34,y:AR.y0+4,vx:0,vy:90,r:3.2,dmg:1,life:6,col});}});}
  else if(name==='dash'){const a=Math.atan2(P.y-b.y,P.x-b.x);b.dx=Math.cos(a)*240;b.dy=Math.sin(a)*240;b.windup=.6;b.cd=1.8;marks.push({x:b.x,y:b.y,t:.6,line:a});}
}
function bossAI(b,dt){
  b.t+=dt;b.cd-=dt;const ph2=b.hp/b.max<.5;
  if(ph2&&!b.ph2){b.ph2=true;sfx.rage();banner='ENRAGED';bannerT=1.3;shake=6;}
  if(b.dash>0){b.dash-=dt;b.x=clamp(b.x+b.dx*dt,AR.x0+20,AR.x1-20);b.y=clamp(b.y+b.dy*dt,AR.y0+20,AR.y1-30);b.vx=b.vy=0;return;}
  if(b.windup>0){b.windup-=dt;b.vx=b.vy=0;if(b.windup<=0)b.dash=.5;return;}
  if(b.move==='hover'){b.tx=240+Math.sin(b.t*.5)*140;b.ty=66+Math.sin(b.t*.8)*14;}
  else if(b.move==='orbit'){b.tx=240+Math.cos(b.t*.45)*120;b.ty=96+Math.sin(b.t*.45)*34;}
  else if(dist(b,{x:b.tx,y:b.ty})<8||b.t%3.4<.05){b.tx=rnd(110,370);b.ty=rnd(56,124);}
  if(b.cd<=0){b.cd=(ph2?1.6:2.3)+Math.max(0,3-hunting.star)*.25;runPattern(b,b.kit[b.pat++%b.kit.length],ph2);}
  const dx=b.tx-b.x,dy=b.ty-b.y,d=Math.hypot(dx,dy)||1,sp=b.spd*(b.slow>0?.6:1);b.vx=dx/d*sp;b.vy=dy/d*sp;
}

/* ---------- damage ---------- */
/** the status and element effects of one hit (the base damage is already applied) */
function elemHit(e,dmg,el,o){
  const col=ELS[el]&&ELS[el].col;if(!col)return;
  if(el==='fire'){e.burn=Math.max(e.burn,3.5);}
  else if(el==='frost'){e.slow=Math.max(e.slow,2);if(!e.isBoss){e.cold=(e.cold||0)+1;e.coldT=2;if(e.cold>=3){e.frozen=1.1;e.cold=0;fxIce(e.x,e.y,'freeze',.45);}}}
  else if(el==='storm'&&!o.noChain&&Math.random()<.3){const n=nearest(e.x,e.y,75,new Set([e]));if(n){zaps.push({pts:[{x:e.x,y:e.y},{x:n.x,y:n.y}],t:.14});hitEnemy(n,dmg*.6,{noChain:true,silent:true,el:'storm'});if(Math.random()<.25)fxLightning(n.x,n.y);}}
  else if(el==='thorn'){if(!e.isBoss)e.root=Math.max(e.root||0,.9);}
  else if(el==='mirror'&&!o.noChain&&Math.random()<.5){const n=nearest(e.x,e.y,180,new Set([e]));if(n){zaps.push({pts:[{x:e.x,y:e.y},{x:n.x,y:n.y}],t:.12,c:'#d8b4ff'});hitEnemy(n,dmg*.5,{noChain:true,silent:true});}}
  else if(el==='blood'){bloodAcc+=dmg;while(bloodAcc>=14){bloodAcc-=14;healPlayer(1);}}
  else if(el==='poison'){e.psn=Math.min(5,(e.psn||0)+1);e.psnT=4;}
  else if(el==='void'){for(const q of enemies){if(q.dead||q===e||q.isBoss)continue;const dx=e.x-q.x,dy=e.y-q.y,d=Math.hypot(dx,dy);if(d<55&&d>2){q.kb.x+=dx/d*90;q.kb.y+=dy/d*90;}}}
  else if(el==='sound'){if(!e.isBoss){e.stun=Math.max(e.stun||0,.3);const dx=e.x-P.x,dy=e.y-P.y,d=Math.hypot(dx,dy)||1;e.kb.x+=dx/d*70;e.kb.y+=dy/d*70;}}
}
function healPlayer(n){if(P.hp>=P.max)return;P.hp=Math.min(P.max,P.hp+n);fxHeal(P.x,P.y-8);texts.push({x:P.x,y:P.y-20,s:'+'+n,t:.8,c:'#ff9aa8'});}
/* ---------- gear: found in treasure chests, worn for the rest of the hunt ---------- */
const hasGear=id=>Object.values(gearOn).includes(id);
function gearPick(){
  const depth=roomsCleared*.5+dark*1.2,pool=GEAR.filter(g=>!hasGear(g.id));let tot=0;const ws=pool.map(g=>{const r=RARITY[g.rarity],w=r.w*(1+r.boost*depth*.15);tot+=w;return w;});
  let q=Math.random()*tot;for(let i=0;i<pool.length;i++){q-=ws[i];if(q<=0)return pool[i];}return pool[0];
}
const SPECIAL_OK=['thornweave','frostmantle','tear','phoenix','eclipse'];
function applyGear(g,sg){
  const fx=g.fx||{};
  if(fx.hearts){P.max+=sg*fx.hearts;P.hp=clamp(P.hp+(sg>0?fx.hearts:0),1,P.max);}
  const mulI=(k,v)=>{gHit[k]=sg>0?gHit[k]*v:gHit[k]/v;};
  if(fx.dmg)mulI('dmg',1+fx.dmg);if(fx.rate)mulI('cd',1-fx.rate);if(fx.gold)mulI('gold',1+fx.gold);
  if(fx.mana)mulI('cd',1-fx.mana/420);if(fx.cost)mulI('cd',1-Math.max(0,fx.cost)*.5);if(fx.regen)mulI('cd',1-fx.regen*.08);
  if(fx.winHeal)gHit.winHeal+=sg*fx.winHeal;
  if(!g.fx&&!SPECIAL_OK.includes(g.id))mulI('dmg',1+.03*(rankOf(g.rarity)+1));    // items whose classic effect needs mana or a deck get a plain damage bonus
}
function equipGear(g){const old=gearOn[g.slot]&&gearOf(gearOn[g.slot]);if(old)applyGear(old,-1);gearOn[g.slot]=g.id;applyGear(g,1);recordGear(g.id);}
function gearCardHTML(g,extra=''){return `<button class="card ${extra}" data-gear="${g.id}" style="--c:${RARITY[g.rarity].c}">${gearIconHTML(g.id)}<i>${RARITY[g.rarity].name} ${SLOT_LABEL[g.slot]}</i><b>${g.name}</b><span>${g.desc}</span></button>`;}
const gearIconHTML=id=>`<img class="sico" alt="" src="${BASE()}assets/icons/gear_${id}.png" onerror="this.style.display='none'">`;
function offerGear(n,done){
  const g=gearPick(),cur=gearOn[g.slot]&&gearOf(gearOn[g.slot]);
  setMusic('reward',room?room.id:0);
  setPanel(`<h2>${n>1?'Treasure (1 of '+n+')':'Treasure'}</h2><div class="row" style="justify-content:center">${gearCardHTML(g,'eq')}${cur?`<div style="display:flex;align-items:center;font-family:var(--small);color:#a79bc0;font-size:calc(var(--s)*10px)">replaces</div>${gearCardHTML(cur,'small')}`:''}</div>
    <div class="row" style="justify-content:center"><button class="btn" id="geq">Wear it</button><button class="btn ghost" id="gsell">Take ${g.value} stardust</button></div>`);
  $('geq').onclick=()=>{equipGear(g);sfxT('chest',.1);n>1?offerGear(n-1,done):done();};
  $('gsell').onclick=()=>{P.dust+=g.value;n>1?offerGear(n-1,done):done();};
}
/* ---------- the two newest spell shapes from the classic game: a sweeping beam and rune traps ---------- */
function castBeam(s){
  const tg=nearest(P.x,P.y,300);if(!tg)return false;const n=1+s.m.multi,a0=Math.atan2(tg.y-P.y,tg.x-P.x);
  for(let i=0;i<n;i++)beams.push({s,a:a0,off:(i-(n-1)/2)*.5,t:0,dur:1.2,tick:0});
  sfx.beam&&sfxT('beam',.5);return true;
}
function castTrap(s){
  if(!enemies.some(e=>!e.dead&&Math.hypot(e.x-P.x,e.y-P.y)<220))return false;
  const n=1+s.m.multi;for(let i=0;i<n;i++)traps.push({x:clamp(P.x+rnd(-26,26)*(i?1.6:.4),AR.x0+8,AR.x1-8),y:clamp(P.y+rnd(-16,22)*(i?1.6:.4),AR.y0+8,AR.y1-4),t:10,arm:.5,s,ph:rnd(0,6)});
  return true;
}
function updBeamsTraps(dt){
  for(const b of beams){b.t+=dt;b.tick-=dt;const tg=nearest(P.x,P.y,320);
    if(tg){const ta=Math.atan2(tg.y-P.y,tg.x-P.x)+b.off;let da=((ta-b.a+Math.PI*3)%TAU)-Math.PI;b.a+=clamp(da,-3.4*dt,3.4*dt);}
    if(b.tick<=0){b.tick=.1;const w=5*sArea(b.s),ca=Math.cos(b.a),sa=Math.sin(b.a);
      for(const e of enemies){if(e.dead)continue;const dx=e.x-P.x,dy=e.y-P.y,pr=dx*ca+dy*sa;if(pr<0||pr>340)continue;if(Math.abs(-dx*sa+dy*ca)<w+e.r)hitEnemy(e,sDmg(b.s,2.4),{el:b.s.el,frost:b.s.m.frost>0,burn:b.s.m.burn>0,silent:Math.random()<.6});}}}
  beams=beams.filter(b=>b.t<b.dur);
  for(const q of traps){q.t-=dt;if(q.arm>0){q.arm-=dt;continue;}
    let hit=false;for(const e of enemies){if(!e.dead&&Math.hypot(e.x-q.x,e.y-q.y)<14+e.r){hit=true;break;}}
    if(hit||q.t<=0){q.dead=true;if(hit){const s=q.s,a=sArea(s);fxExplosion(q.x,q.y,.45*a);blasts.push({x:q.x,y:q.y,r:3,max:36*a,spd:190,dmg:sDmg(s,12),hit:new Set(),col:s.el?ELS[s.el].col:'#ff9ad8',el:s.el,frost:s.m.frost>0,burn:s.m.burn>0,push:.5});}}}
  traps=traps.filter(q=>!q.dead);
}
function hitEnemy(e,dmg,o={}){
  if(e.dead)return;let crit=false;const el=o.el;
  if(gHit.crit&&Math.random()<gHit.crit){dmg*=5;crit=true;}
  if(el==='holy'&&(e.elite||e.isBoss||e.guardian))dmg*=1.25;
  if(el==='gold'&&Math.random()<.1){dmg*=3;crit=true;}
  if(e.frozen>0)dmg*=1.3;
  dmg=Math.max(1,dmg);e.hp-=dmg;e.flash=.1;stat.dmg+=dmg;if(!o.silent)sfxT('strike',.07);if(el&&ELS[el])e.lastEl=el;
  if(o.frost||gHit.frost)e.slow=Math.max(e.slow,2);if(o.burn||gHit.burn)e.burn=Math.max(e.burn,3);
  if(o.kx!==undefined&&!e.isBoss){e.kb.x+=o.kx;e.kb.y+=o.ky;}
  if(el&&ELS[el])elemHit(e,dmg,el,o);
  if(!o.silent){
    texts.push({x:e.x+rnd(-4,4),y:e.y-e.r-6,s:String(Math.round(dmg)),t:.6,c:crit?'#ffd27a':(el&&ELS[el]?ELS[el].col:'#f1e8d4')});
    for(let i=0;i<2;i++)parts.push({x:e.x,y:e.y,vx:rnd(-40,40),vy:rnd(-40,40),t:.25,c:(el&&ELS[el]?ELS[el].col:e.col)||'#fff',s:1});
    if(crit||(el&&Math.random()<.12))fxImpact(e.x,e.y,el&&ELS[el]?ELS[el].col:'#ffe9a0',rnd(0,TAU));
  }
  if(e.hp<=0)killEnemy(e);
}
function killEnemy(e){
  e.dead=true;stat.kills++;
  const n=e.isBoss?18:e.gem,mult=twist?twist.mult:1,tot=Math.max(1,Math.round(n*mult*gHit.gold))+(e.lastEl==='gold'?1:0);
  for(let i=0;i<tot;i++)gems.push({x:e.x+rnd(-6,6),y:e.y+rnd(-6,6),vx:rnd(-30,30),vy:rnd(-30,30),v:1,t:0});
  for(let i=0;i<(e.isBoss?40:8);i++)parts.push({x:e.x,y:e.y,vx:rnd(-90,90),vy:rnd(-90,90),t:rnd(.3,.7),c:e.col,s:2});
  rings.push({x:e.x,y:e.y,r:3,max:e.isBoss?60:14,t:.3,c:e.col});
  const el=e.lastEl;
  if(e.isBoss||e.guardian||e.mimic)fxExplosion(e.x,e.y,e.isBoss?1.2:.8);else if(Math.random()<.35)fxImpact(e.x,e.y,e.col,rnd(0,TAU));
  if(el==='fire'&&!e.isBoss){fxExplosion(e.x,e.y,.35);blasts.push({x:e.x,y:e.y,r:3,max:26,spd:180,dmg:4+stage,hit:new Set([e]),col:'#ff7a3a',el:'fire',push:.3});}
  else if(el==='bone'){for(let i=0;i<5;i++){const a=i/5*TAU+rnd(0,1);shots.push({x:e.x,y:e.y,vx:Math.cos(a)*170,vy:Math.sin(a)*170,r:2,dmg:4+stage,pierce:0,bounce:0,split:0,hit:new Set([e]),life:.6,col:'#e8dfc8',el:null});}}
  else if(el==='poison'&&e.psn){for(const q of enemies){if(q.dead||q===e||Math.hypot(q.x-e.x,q.y-e.y)>60)continue;q.psn=Math.min(5,(q.psn||0)+Math.ceil(e.psn/2));q.psnT=4;}}
  else if(el==='holy'&&Math.random()<.14)healPlayer(1);
  if(e.guardian){keysHeld++;guard=null;shake=5;clearRoom();}
  if(e.mimic){shake=4;clearRoom();}
  if(e.isBoss){shake=8;clearRoom();}
}
function hurtPlayer(d){
  if(P.inv>0||scene!=='wave')return;
  if(P.shield){P.shield=0;P.inv=.7;const w=hasSpell('ward');if(w){w.cd=sCd(w);const a=sArea(w);blasts.push({x:P.x,y:P.y,r:4,max:52*a,spd:170,dmg:sDmg(w,6),hit:new Set(),col:'#7fe0c0',push:1,el:w.el});}shake=3;sfxT('shield',.2);return;}
  P.hp-=d;P.inv=.9;shake=5;flash=.15;stat.hurt++;sfxT('hurt',.2);
  for(let i=0;i<8;i++)parts.push({x:P.x,y:P.y,vx:rnd(-80,80),vy:rnd(-80,80),t:.4,c:'#ff7a6e',s:1});
  if(hasGear('thornweave'))blasts.push({x:P.x,y:P.y,r:4,max:46,spd:210,dmg:8+stage,hit:new Set(),col:'#8fe06a',el:'thorn',push:1});
  if(hasGear('frostmantle')){for(const q of enemies)if(!q.dead&&Math.hypot(q.x-P.x,q.y-P.y)<110)q.slow=3;fxIce(P.x,P.y,'nova',.5);}
  if(P.hp<=0){
    if(hasGear('tear')&&!roomTear){roomTear=true;P.hp=1;P.inv=1.4;banner="ANGEL'S TEAR";bannerT=1.4;fxHeal(P.x,P.y-8);return;}
    if(hasGear('phoenix')&&!phoenixUsed){phoenixUsed=true;P.hp=Math.ceil(P.max/2);P.inv=2;banner='REBORN';bannerT=1.6;fxExplosion(P.x,P.y,.8);return;}
    P.hp=0;scene='dead';showEnd(false,null,0,endShards(false));
  }
}
function nearest(x,y,maxD=240,skip){let b=null,bd=maxD;for(const e of enemies){if(e.dead||(skip&&skip.has(e)))continue;const d=Math.hypot(e.x-x,e.y-y)*(e.isBoss||e.guardian?.5:1);if(d<bd){bd=d;b=e;}}return b;}

/* ---------- spell casting ---------- */
function shotOf(x,y,a,s,o={}){
  const m=s.m;shots.push(Object.assign({x,y,vx:Math.cos(a)*215,vy:Math.sin(a)*215,r:2.3*sArea(s),dmg:sDmg(s,6),pierce:m.pierce*2,bounce:m.bounce,split:m.split,frost:m.frost>0,burn:m.burn>0,el:s.el,hit:new Set(),life:1.3,col:s.el?ELS[s.el].col:SP[s.id].col},o));
}
function castBolt(s,ox=P.x,oy=P.y,src='p'){
  const tg=nearest(ox,oy,260);if(!tg)return false;const n=1+s.m.multi,a0=Math.atan2(tg.y-oy,tg.x-ox);
  for(let i=0;i<n;i++){const a=a0+(i-(n-1)/2)*.17;shotOf(ox,oy,a,s,src==='f'?{dmg:sDmg(s,3),r:2}:{});}return true;
}
function castNova(s){
  const n=1+s.m.multi,a=sArea(s),col=s.el?ELS[s.el].col:'#9ad0ff';
  for(let i=0;i<n;i++)later.push({t:i*.28,fn:()=>{if(s.el==='frost')fxIce(P.x,P.y,'nova',.5);blasts.push({x:P.x,y:P.y,r:4,max:62*a,spd:150,dmg:sDmg(s,6),hit:new Set(),col,el:s.el,frost:s.m.frost>0,burn:s.m.burn>0,push:.4});}});
  return true;
}
function castChain(s){
  const n=1+s.m.multi,used=new Set();let any=false;
  for(let k=0;k<n;k++){let cur=nearest(P.x,P.y,170,used);if(!cur)break;any=true;const pts=[{x:P.x,y:P.y}];let dmg=sDmg(s,6),last=null;
    for(let j=0;j<3+s.m.bounce*2&&cur;j++){used.add(cur);pts.push({x:cur.x,y:cur.y});hitEnemy(cur,dmg,{el:s.el,frost:s.m.frost>0,burn:s.m.burn>0,silent:j>0});last=cur;dmg*=.85;cur=nearest(cur.x,cur.y,85,used);}
    if(last&&Math.random()<.5)fxLightning(last.x,last.y);
    zaps.push({pts,t:.18});}
  return any;
}
function castMeteor(s){
  const n=1+s.m.multi;let any=false;
  for(let i=0;i<n;i++){let tg=enemies.filter(e=>!e.dead);tg=tg.length?pick(tg):null;if(!tg)break;any=true;marks.push({x:tg.x+rnd(-8,8),y:tg.y+rnd(-8,8),t:.7,meteor:s,r:24*sArea(s),warn:true});}
  return any;
}
function explodeMeteor(m){
  const s=m.meteor;fxExplosion(m.x,m.y,.5+.1*s.m.size);rings.push({x:m.x,y:m.y,r:3,max:m.r,t:.3,c:'#ff9a5a'});shake=Math.max(shake,2);
  for(const e of enemies){if(e.dead)continue;if(Math.hypot(e.x-m.x,e.y-m.y)<m.r+e.r)hitEnemy(e,sDmg(s,14),{el:s.el,frost:s.m.frost>0,burn:s.m.burn>0,kx:(e.x-m.x)*.4,ky:(e.y-m.y)*.4});}
  for(let i=0;i<14;i++)parts.push({x:m.x,y:m.y,vx:rnd(-100,100),vy:rnd(-100,100),t:.5,c:'#ffb04a',s:2});
  if(s.m.split)for(let i=0;i<4;i++)shotOf(m.x,m.y,i/4*TAU+.4,s,{dmg:sDmg(s,3),r:1.8,split:0,life:.7});
}
function castBlink(s){
  let thr=null,bd=26;for(const e of enemies){if(e.dead)continue;const d=Math.hypot(e.x-P.x,e.y-P.y);if(d<bd+e.r){bd=d;thr=e;}}
  if(!thr){for(const q of eshots){if(Math.hypot(q.x-P.x,q.y-P.y)<14){thr=q;break;}}}
  if(!thr)return false;
  let ax=P.x-thr.x,ay=P.y-thr.y;const l=Math.hypot(ax,ay)||1;ax/=l;ay/=l;
  const dd=58*sArea(s),ox=P.x,oy=P.y;P.x=clamp(P.x+ax*dd,AR.x0+8,AR.x1-8);P.y=clamp(P.y+ay*dd,AR.y0+8,AR.y1-8);P.inv=Math.max(P.inv,.45);
  fxBlink(ox,oy,'#c9a0ff');rings.push({x:ox,y:oy,r:2,max:20,t:.3,c:'#c9a0ff'});rings.push({x:P.x,y:P.y,r:2,max:16,t:.3,c:'#c9a0ff'});
  if(s.m.power)blasts.push({x:ox,y:oy,r:4,max:40,spd:160,dmg:sDmg(s,5),hit:new Set(),col:'#c9a0ff',push:.6});
  return true;
}
function castGust(s){
  if(!enemies.some(e=>!e.dead&&Math.hypot(e.x-P.x,e.y-P.y)<80))return false;
  const a=sArea(s);for(const e of enemies){if(e.dead||e.isBoss)continue;const dx=e.x-P.x,dy=e.y-P.y,d=Math.hypot(dx,dy)||1;if(d<75*a){e.kb.x+=dx/d*200;e.kb.y+=dy/d*200;}}
  P.boost=2.4;rings.push({x:P.x,y:P.y,r:4,max:75*a,t:.35,c:'#bfe8ff'});return true;
}
function updSpells(dt){
  updBeamsTraps(dt);
  for(const s of spells){
    const id=s.id;
    if(id==='orbit'){s.ang+=dt*(2.4+.5*s.m.haste);continue;}
    if(id==='thorns'){s.tick-=dt;if(s.tick<=0){s.tick=.5/(1+.25*s.m.haste)*cdMul();const R=32*sArea(s);rings.push({x:P.x,y:P.y,r:R*.5,max:R,t:.25,c:'#8fe06a'});for(const e of enemies){if(!e.dead&&Math.hypot(e.x-P.x,e.y-P.y)<R+e.r)hitEnemy(e,sDmg(s,3),{el:s.el,frost:s.m.frost>0,burn:s.m.burn>0});}}continue;}
    if(id==='familiar'){s.ang+=dt*1.6;s.tick-=dt;if(s.tick<=0){const n=1+s.m.multi;let fired=false;for(let i=0;i<n;i++){const a=s.ang+i/n*TAU,fx=P.x+Math.cos(a)*30,fy=P.y+Math.sin(a)*22,tg=nearest(fx,fy,150);if(tg){fired=true;shotOf(fx,fy,Math.atan2(tg.y-fy,tg.x-fx),s,{dmg:sDmg(s,3),r:1.9,life:.9});}}s.tick=(fired?1.1:.3)*Math.pow(.8,s.m.haste)*cdMul();}continue;}
    if(id==='ward'){if(!P.shield){s.cd-=dt;if(s.cd<=0){P.shield=1;s.cd=0;rings.push({x:P.x,y:P.y,r:2,max:18,t:.3,c:'#7fe0c0'});}}continue;}
    s.cd-=dt;if(s.cd>0)continue;
    let ok=false;
    if(id==='bolt')ok=castBolt(s);else if(id==='nova')ok=enemies.some(e=>!e.dead&&Math.hypot(e.x-P.x,e.y-P.y)<95)&&castNova(s);
    else if(id==='chain')ok=castChain(s);else if(id==='meteor')ok=castMeteor(s);else if(id==='blink')ok=castBlink(s);else if(id==='gust')ok=castGust(s);else if(id==='beam')ok=castBeam(s);else if(id==='trap')ok=castTrap(s);
    if(ok){s.cd=sCd(s);if(s.m.echo&&['bolt','nova','chain','meteor'].includes(id))later.push({t:.35,fn:()=>{if(id==='bolt')castBolt(s);else if(id==='nova')castNova(s);else if(id==='chain')castChain(s);else castMeteor(s);}});}
    else s.cd=.12;
  }
}
function orbitPositions(s){const n=2+s.m.multi,R=30*(1+.12*s.m.size),out=[];for(let i=0;i<n;i++){const a=s.ang+i/n*TAU;out.push({x:P.x+Math.cos(a)*R,y:P.y+Math.sin(a)*R*.8});}return out;}

/* ---------- main update ---------- */
function update(dt){
  t+=dt;
  if(bannerT>0)bannerT-=dt;if(shake>0)shake=Math.max(0,shake-dt*20);if(flash>0)flash-=dt;
  for(const p of parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.94;p.vy*=.94;p.t-=dt;}parts=parts.filter(p=>p.t>0);
  for(const x of texts){x.y-=14*dt;x.t-=dt;}texts=texts.filter(x=>x.t>0);
  for(const r of rings){r.r+=(r.max-r.r)*Math.min(1,dt*10);r.t-=dt;}rings=rings.filter(r=>r.t>0);
  for(const z of zaps)z.t-=dt;zaps=zaps.filter(z=>z.t>0);vfxStep(dt);
  for(const l of later)l.t-=dt;for(const l of later.filter(l=>l.t<=0))l.fn();later=later.filter(l=>l.t>0);
  if(scene==='menu'||scene==='sanctum'||scene==='panel'||scene==='dead'||scene==='won')return;
  // player
  let ix=(keys.d||keys.ArrowRight?1:0)-(keys.a||keys.ArrowLeft?1:0)+(keys.__bx||0),iy=(keys.s||keys.ArrowDown?1:0)-(keys.w||keys.ArrowUp?1:0)+(keys.__by||0);
  if(stick.on){ix+=stick.x;iy+=stick.y;}const il=Math.hypot(ix,iy);if(il>1){ix/=il;iy/=il;}
  const sp=78*gHit.speed*(P.boost>0?1.35:1);P.moving=il>.12;
  if(P.moving){P.x+=ix*sp*dt;P.y+=iy*sp*dt;P.step+=dt;if(Math.abs(ix)>Math.abs(iy))P.face=ix>0?'east':'west';else P.face=iy>0?'south':'north';}
  P.x=clamp(P.x,AR.x0+6,AR.x1-6);P.y=clamp(P.y,AR.y0+8,AR.y1-4);if(P.inv>0)P.inv-=dt;if(P.boost>0)P.boost-=dt;
  // gems
  for(const g of gems){g.t+=dt;g.x+=g.vx*dt;g.y+=g.vy*dt;g.vx*=.92;g.vy*=.92;const d=Math.hypot(P.x-g.x,P.y-g.y),pull=!locked?420:(d<46?170:0);if(pull&&d>1){g.x+=(P.x-g.x)/d*pull*dt;g.y+=(P.y-g.y)/d*pull*dt;}if(d<8){g.dead=true;P.dust+=g.v;stat.gems+=g.v;sfxT('coin',.07);}}
  gems=gems.filter(g=>!g.dead);
  if(fade>0)fade-=dt;
  if(rewardWait>0){rewardWait-=dt;if(rewardWait<=0){openRoomReward();return;}}
  darkT+=dt;if(darkT>=60){darkT=0;dark++;banner='THE DARK DEEPENS';bannerT=2.2;}
  if(!locked){
    if(ALTARS.includes(room.kind)&&!room.used){if(Math.hypot(P.x-240,P.y-140)<18){altarHold+=dt;if(altarHold>.5){altarHold=0;openAltar();return;}}else altarHold=0;}
    if(dark>=1&&room.kind!=='start'&&!ALTARS.includes(room.kind)){roamT-=dt;if(roamT<=0){roamT=Math.max(5,14-dark*2);queueSpawn(pick(['wisp','bat']));}}
    checkDoors();
  }else{
    if(!boss){waveT-=dt;if(waveT<=0){clearRoom();return;}}
    const tw=twist&&twist.spawn||1,rate=(1.25+.3*stage)*tw*(boss?.3:1)*(nodeKind==='elite'?.75:1);spawnAcc+=rate*dt;
    while(spawnAcc>0){const ty=pickType(),cost=ENEMIES[ty].cost;if(spawnAcc<cost*.6)break;spawnAcc-=cost;queueSpawn(ty);}
  }
  for(const m of marks){m.t-=dt;if(m.t<=0){m.dead=true;if(m.meteor)explodeMeteor(m);else if(m.type){const el=stage>=3&&m.type!=='wisp'&&Math.random()<.1;enemies.push(makeEnemy(m.type,m.x,m.y,el));parts.push({x:m.x,y:m.y,vx:0,vy:-20,t:.3,c:'#fff',s:2});}}}
  marks=marks.filter(m=>!m.dead);
  // enemies
  for(const e of enemies){
    if(e.dead)continue;e.ph+=dt;if(e.flash>0)e.flash-=dt;if(e.orbCD>0)e.orbCD-=dt;
    if(e.slow>0)e.slow-=dt;if(e.burn>0){e.burn-=dt;e.bt=(e.bt||0)-dt;if(e.bt<=0){e.bt=.5;hitEnemy(e,Math.max(1,e.max*.012+2));}}
    if(e.dead)continue;
    if(e.psn>0){e.psnT-=dt;e.pt=(e.pt||0)-dt;if(e.pt<=0){e.pt=.5;hitEnemy(e,e.psn*1.3,{silent:true,el:'poison'});}if(e.psnT<=0)e.psn=0;}
    if(e.coldT>0){e.coldT-=dt;if(e.coldT<=0)e.cold=0;}
    const frz=e.frozen>0?(e.frozen-=dt,1):0,rt=e.root>0?(e.root-=dt,1):0,sn=e.stun>0?(e.stun-=dt,1):0;
    if(e.dead)continue;
    if(e.guardian){e.cd-=dt;if(e.cd<=0){e.cd=3;const n=10,o=rnd(0,TAU);for(let i=0;i<n;i++){const a=o+i/n*TAU;eshots.push({x:e.x,y:e.y,vx:Math.cos(a)*56,vy:Math.sin(a)*56,r:3,dmg:1,life:6,col:'#ffd27a'});}}}
    if(e.isBoss){bossAI(e,dt);}
    else{
      const dx=P.x-e.x,dy=P.y-e.y,d=Math.hypot(dx,dy)||1,slow=e.slow>0?.55:1;let mx=0,my=0,sp2=e.spd*slow;
      if(e.type==='wisp'||e.type==='husk'){mx=dx/d;my=dy/d;}
      else if(e.type==='bat'){const a=Math.atan2(dy,dx)+Math.sin(e.ph*4)*.9;mx=Math.cos(a);my=Math.sin(a);}
      else if(e.type==='seer'){if(d<85){mx=-dx/d;my=-dy/d;}else if(d>130){mx=dx/d;my=dy/d;}else{mx=-dy/d*.4;my=dx/d*.4;}e.cd-=dt;if(e.cd<=0&&d<230){e.cd=2.3;const a=Math.atan2(dy,dx);eshots.push({x:e.x,y:e.y,vx:Math.cos(a)*72,vy:Math.sin(a)*72,r:2.8,dmg:1,life:5,col:'#ffd27a'});}}
      else if(e.type==='ram'||e.type==='mimic'){
        if(e.st===0){mx=dx/d;my=dy/d;e.cd-=dt;if(e.cd<=0&&d<130){e.st=1;e.stT=.7;e.dir=Math.atan2(dy,dx);}}
        else if(e.st===1){sp2=0;e.stT-=dt;if(e.stT<=0){e.st=2;e.stT=.5;}}
        else if(e.st===2){mx=Math.cos(e.dir);my=Math.sin(e.dir);sp2=170*slow;e.stT-=dt;if(e.stT<=0){e.st=0;e.cd=rnd(1.4,2.4);}}
      }
      e.vx=mx*sp2;e.vy=my*sp2;if(frz||rt||sn){e.vx=e.vy=0;}
    }
    e.x+=(e.vx+e.kb.x)*dt;e.y+=(e.vy+e.kb.y)*dt;e.kb.x*=.88;e.kb.y*=.88;
    e.x=clamp(e.x,AR.x0+e.r*.5,AR.x1-e.r*.5);e.y=clamp(e.y,AR.y0+e.r*.5,AR.y1-e.r*.5);
    if(Math.hypot(P.x-e.x,P.y-e.y)<e.r+P.r)hurtPlayer(e.dmg);
  }
  for(const z of zones){z.t+=dt;if(z.t>z.warn&&z.t<z.warn+z.on){const inz=z.r?Math.hypot(P.x-z.x,P.y-z.y)<z.r+3:(P.x>z.x-2&&P.x<z.x+z.w+2&&P.y>z.y&&P.y<z.y+z.h);if(inz)hurtPlayer(1);}}
  zones=zones.filter(z=>z.t<z.warn+z.on);
  // soft separation
  for(let i=0;i<enemies.length;i++){const a=enemies[i];if(a.dead||a.isBoss)continue;for(let j=i+1;j<enemies.length;j++){const b=enemies[j];if(b.dead||b.isBoss)continue;const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),m=a.r+b.r-2;if(d<m&&d>.01){const k=(m-d)/d*.5;a.x-=dx*k;a.y-=dy*k;b.x+=dx*k;b.y+=dy*k;}}}
  enemies=enemies.filter(e=>!e.dead);
  // shots
  for(const s of shots){
    s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(s.x<AR.x0||s.x>AR.x1||s.y<AR.y0||s.y>AR.y1)s.life=0;
    for(const e of enemies){if(e.dead||s.hit.has(e)||s.life<=0)continue;if(Math.hypot(e.x-s.x,e.y-s.y)<e.r+s.r){
      s.hit.add(e);hitEnemy(e,s.dmg,{el:s.el,frost:s.frost,burn:s.burn,kx:s.vx*.12,ky:s.vy*.12});
      if(s.split){for(let i=0;i<2;i++){const a=Math.atan2(s.vy,s.vx)+(i?1:-1)*.9;shots.push({x:s.x,y:s.y,vx:Math.cos(a)*190,vy:Math.sin(a)*190,r:1.7,dmg:s.dmg*.45,pierce:0,bounce:0,split:0,frost:s.frost,burn:s.burn,el:s.el,hit:new Set([e]),life:.6,col:s.col});}}
      if(s.pierce>0)s.pierce--;else if(s.bounce>0){s.bounce--;const nx=nearest(s.x,s.y,140,s.hit);if(nx){const a=Math.atan2(nx.y-s.y,nx.x-s.x);s.vx=Math.cos(a)*215;s.vy=Math.sin(a)*215;}else s.life=0;}else s.life=0;
    }}
  }
  shots=shots.filter(s=>s.life>0);
  // enemy shots (moons and thorns block them)
  const orb=spells.find(s=>s.id==='orbit'),op=orb?orbitPositions(orb):[];
  for(const q of eshots){q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt;if(q.x<AR.x0-8||q.x>AR.x1+8||q.y<AR.y0-8||q.y>AR.y1+8)q.life=0;
    for(const o of op)if(Math.hypot(o.x-q.x,o.y-q.y)<7){q.life=0;parts.push({x:q.x,y:q.y,vx:0,vy:0,t:.2,c:q.col,s:2});}
    if(q.life>0&&Math.hypot(P.x-q.x,P.y-q.y)<q.r+P.r-1){q.life=0;hurtPlayer(q.dmg);}}
  eshots=eshots.filter(q=>q.life>0);
  // orbs
  if(orb)for(const o of op)for(const e of enemies){if(e.dead||e.orbCD>0)continue;if(Math.hypot(e.x-o.x,e.y-o.y)<e.r+4*(1+.12*orb.m.size)){e.orbCD=.35;hitEnemy(e,sDmg(orb,4),{el:orb.el,frost:orb.m.frost>0,burn:orb.m.burn>0,kx:(e.x-o.x)*3,ky:(e.y-o.y)*3});}}
  // blasts (nova rings, ward shock)
  for(const b of blasts){b.r+=b.spd*dt;if(b.r>=b.max)b.dead=true;for(const e of enemies){if(e.dead||b.hit.has(e))continue;const d=Math.hypot(e.x-b.x,e.y-b.y);if(Math.abs(d-b.r)<8+e.r*.5){b.hit.add(e);hitEnemy(e,b.dmg,{el:b.el,frost:b.frost,burn:b.burn,kx:(e.x-b.x)/(d||1)*140*b.push,ky:(e.y-b.y)/(d||1)*140*b.push});}}}
  blasts=blasts.filter(b=>!b.dead);
  updSpells(dt);
}
/* ---------- the hunt: a realm of rooms ---------- */
const ROOMK={
  start:{n:'Camp',col:'#9ad0ff',g:'S'},fight:{n:'Ambush',col:'#c9a0ff',g:'x'},guard:{n:'Key guardian',col:'#ffd27a',g:'K'},
  market:{n:'Merchant',col:'#7fe0c0',g:'$'},treasure:{n:'Treasure',col:'#ffd27a',g:'*'},rest:{n:'Campfire',col:'#9ad0ff',g:'+'},wager:{n:'The Wager',col:'#ff9a9a',g:'?'},boss:{n:'The Sealed Gate',col:'#ff7a6e',g:'!'},
};
const THEMEC=['rgba(0,0,0,0)','rgba(150,50,30,.16)','rgba(40,110,150,.16)','rgba(50,120,70,.14)'];
const DOORS={N:{x:240,y:AR.y0},S:{x:240,y:AR.y1},W:{x:AR.x0,y:140},E:{x:AR.x1,y:140}};
const DIRV={N:[0,-1],S:[0,1],W:[-1,0],E:[1,0]},OPP={N:'S',S:'N',W:'E',E:'W'};
const diff=()=>Math.floor(1+roomsCleared*.55+dark*.7+(hunting?(hunting.star-1)*.4:0));
function genWorld(bossId){
  const cells=[];for(let y=0;y<GR;y++)for(let x=0;x<GC;x++)cells.push({id:y*GC+x,x,y,link:{},kind:'fight',visited:false,seen:false,cleared:false,used:false,theme:rint(0,3),twist:null,reward:null,unsealed:false});
  const at=(x,y)=>x>=0&&y>=0&&x<GC&&y<GR?cells[y*GC+x]:null;
  const start=at(0,rint(0,GR-1)),seenC=new Set([start.id]),stack=[start];
  while(stack.length){const c0=stack[stack.length-1],opts=Object.entries(DIRV).map(([d,v])=>[d,at(c0.x+v[0],c0.y+v[1])]).filter(([d,n])=>n&&!seenC.has(n.id));
    if(!opts.length){stack.pop();continue;}const [d,n]=pick(opts);c0.link[d]=n.id;n.link[OPP[d]]=c0.id;seenC.add(n.id);stack.push(n);}
  for(let i=0;i<5;i++){const c0=pick(cells),[d,v]=pick(Object.entries(DIRV)),n=at(c0.x+v[0],c0.y+v[1]);if(n&&c0.link[d]==null){c0.link[d]=n.id;n.link[OPP[d]]=c0.id;}}
  const dist={[start.id]:0},q=[start];for(let i=0;i<q.length;i++){const c0=q[i];for(const d in c0.link){const n=cells[c0.link[d]];if(dist[n.id]==null){dist[n.id]=dist[c0.id]+1;q.push(n);}}}
  const order=cells.filter(c0=>c0!==start).sort((a,b)=>dist[b.id]-dist[a.id]),bossCell=order[0];bossCell.kind='boss';
  const man=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y),gc=[];
  for(const c0 of shuffle(order.slice(1))){if(gc.length>=3)break;if(dist[c0.id]>=3&&gc.every(g=>man(g,c0)>=2)&&man(c0,bossCell)>=2)gc.push(c0);}
  while(gc.length<3){const c0=pick(order.slice(1).filter(c1=>!gc.includes(c1)));gc.push(c0);}
  for(const g of gc)g.kind='guard';
  start.kind='start';start.cleared=true;start.visited=true;
  const rest=shuffle(cells.filter(c0=>c0.kind==='fight')),alt=['market','rest','rest','wager','treasure','treasure'];
  for(let i=0;i<alt.length&&i<rest.length;i++){rest[i].kind=alt[i];rest[i].cleared=true;}
  for(const c0 of cells){if(c0.kind==='fight'){c0.twist=Math.random()<.6?pick(Object.keys(TWISTS)):null;{const q=Math.random();c0.reward=q<.34?'spell':q<.68?'mod':'element';}}if(c0.kind==='guard')c0.twist=Math.random()<.5?pick(Object.keys(TWISTS)):null;}
  const ZN=[0,1,2,3,5];for(const c0 of cells){c0.theme=c0===start?0:c0===bossCell?5:c0.kind==='treasure'?4:(Math.random()<.2?rint(0,5):ZN[c0.x]);}
  return {cells,start,bossCell,dist,at};
}
function enterRoom(c0,dir){
  room=c0;c0.visited=true;for(const d in c0.link)world.cells[c0.link[d]].seen=true;
  enemies=[];shots=[];eshots=[];marks=[];zones=[];blasts=[];later=[];beams=[];traps=[];boss=null;guard=null;rewardWait=0;altarHold=0;roomTear=false;
  const pos={N:[240,AR.y1-16],S:[240,AR.y0+18],W:[AR.x1-16,140],E:[AR.x0+16,140]};
  if(dir){P.x=pos[dir][0];P.y=pos[dir][1];}else{P.x=240;P.y=150;}
  P.inv=Math.max(P.inv,.8);scene='wave';fade=.35;
  if(!c0.cleared)startRoomWave(c0);else{locked=false;twist=null;banner=ROOMK[c0.kind].n.toUpperCase();bannerT=1.1;}
  roomMusic();
}
function startRoomWave(c0){
  locked=true;stage=diff();twist=c0.twist?TWISTS[c0.twist]:null;nodeKind=c0.kind==='guard'?'elite':c0.kind==='boss'?'boss':'fight';
  const isBoss=nodeKind==='boss',isElite=nodeKind==='elite';
  waveLen=isBoss?999:isElite?46:18+Math.min(stage,6)*1.6;waveT=waveLen;spawnAcc=0;
  banner=(isBoss?hunting.name.toUpperCase():isElite?'KEY GUARDIAN':'AMBUSH')+(twist?'  -  '+twist.name.toUpperCase():'');bannerT=2.2;
  if(isBoss)spawnBoss(hunting.id);if(isElite)spawnGuardian();
  for(const s of spells)if(s.id==='ward')s.cd=0;
  roomMusic();
}
function clearRoom(){
  if(!locked)return;locked=false;const wasBoss=room.kind==='boss',wasGuard=room.kind==='guard';room.cleared=true;roomsCleared++;stat.rooms++;
  for(const e of enemies){if(!e.dead&&!e.isBoss){e.dead=true;const mult=twist?twist.mult:1;for(let i=0;i<Math.max(1,Math.round(e.gem*.6*mult));i++)gems.push({x:e.x,y:e.y,vx:rnd(-30,30),vy:rnd(-30,30),v:1,t:0});for(let i=0;i<5;i++)parts.push({x:e.x,y:e.y,vx:rnd(-60,60),vy:rnd(-60,60),t:.4,c:e.col,s:1});}}
  enemies=[];eshots.length=0;marks.length=0;zones.length=0;boss=null;guard=null;
  if(wasBoss){awardCard();return;}
  banner=wasGuard?'KEY OBTAINED':'ROOM CLEARED';bannerT=1.8;rewardWait=1.3;if(gHit.winHeal)healPlayer(gHit.winHeal);roomMusic();sfxT('win',.5);
}
function openRoomReward(){
  const back=()=>{scene='wave';roomMusic();};setMusic('reward',room.id);
  if(room.kind==='fight'){scene='panel';openReward(room.reward,back);}else if(room.kind==='guard'){scene='panel';openReward('mod',back);}else if(room.kind==='treasure'){scene='panel';offerGear(2,back);}
}
function spawnMimic(){
  locked=true;stage=diff();twist=null;nodeKind='fight';waveLen=999;waveT=999;spawnAcc=0;const hp=effHP(36);
  enemies.push({type:'mimic',x:240,y:130,vx:0,vy:0,hp,max:hp,r:12,spd:46,dmg:2,col:'#ffb04a',elite:false,slow:0,burn:0,flash:0,cd:1.2,st:0,stT:0,ph:0,orbCD:0,gem:10,kb:{x:0,y:0},mimic:true});roomMusic();
}
function openAltar(){
  const r=room;
  if(r.kind==='treasure'){r.used=true;sfxT('chest',.1);
    if(stage>=2&&Math.random()<.2+stage*.02){r.cleared=false;banner='A MIMIC!';bannerT=1.8;sfxT('mimic',.3);shake=5;spawnMimic();return;}
    scene='panel';offerGear(1,()=>{scene='wave';roomMusic();});return;}scene='panel';setMusic('shop',r.id);openReward(r.kind==='market'?'shop':r.kind==='rest'?'rest':'gamble',()=>{r.used=true;scene='wave';roomMusic();});
}
function checkDoors(){
  if(locked)return;
  const hit={N:P.y<AR.y0+10&&Math.abs(P.x-240)<22,S:P.y>AR.y1-6&&Math.abs(P.x-240)<22,W:P.x<AR.x0+8&&Math.abs(P.y-140)<22,E:P.x>AR.x1-8&&Math.abs(P.y-140)<22};
  for(const d in hit)if(hit[d]&&room.link[d]!=null){tryGo(d);return;}
}
function tryGo(d){
  const n=world.cells[room.link[d]];
  if(n.kind==='boss'&&!n.cleared&&!n.unsealed&&keysHeld<KEYS_NEEDED){openGate(d,n);return;}
  enterRoom(n,d);
}
function openGate(d,n){
  scene='panel';const miss=KEYS_NEEDED-keysHeld,dust=30*miss,blood=4*miss;
  const go=m=>{closePanel();n.unsealed=true;bossMul=m;enterRoom(n,d);};
  setPanel(`<h2>The Sealed Gate</h2><p>Keys held: ${keysHeld} of ${KEYS_NEEDED}. The seal resists you.</p><div class="row">
    <button class="card" id="g1" ${P.dust<dust?'disabled':''}><b>Pay in stardust</b><span>${dust} stardust</span></button>
    <button class="card" id="g2" ${P.hp<=blood?'disabled':''}><b>Pay in blood</b><span>Lose ${blood} hearts</span></button>
    <button class="card" id="g3"><b>Force the gate</b><span>${hunting.name} has +${60*miss}% health</span></button></div><button class="btn ghost" id="g4">Not yet</button>`);
  $('g1').onclick=()=>{P.dust-=dust;go(1);};$('g2').onclick=()=>{P.hp-=blood;go(1);};$('g3').onclick=()=>go(1+.6*miss);
  $('g4').onclick=()=>{closePanel();const v=DIRV[d];P.x-=v[0]*34;P.y-=v[1]*34;scene='wave';};
}
function awardCard(){
  if(daily){noteDaily(stat.rooms,true);const gain=endShards(true);scene='won';banner='HUNT COMPLETE';bannerT=2;sfxT('win',.1);setTimeout(()=>showEnd(true,hunting.id,0,gain),1500);return;}
  const bi=hunting.id,h=hunt_(),lv=(h.cards[bi]||0)+1;h.cards[bi]=lv;if(!h.equipped.includes(bi)&&h.equipped.length<cardSlots())h.equipped.push(bi);h.wins=(h.wins||0)+1;
  noteBoss(true,stat.hurt===0,bi);const gain=endShards(true)+gains.boss;
  scene='won';banner='CARD CLAIMED';bannerT=2;sfxT('win',.1);setTimeout(()=>showEnd(true,bi,lv,gain),1500);
}
const lastS={};function sfxT(n,gap=.06){if(t-(lastS[n]||-9)<gap)return;lastS[n]=t;try{sfx[n]();}catch(e){}}

/* ---------- reward panels (DOM) ---------- */
const letterIcon=id=>ICONF[id]?`<img class="sico" alt="" src="${BASE()}assets/icons/${ICONF[id]}.png">`:`<div class="ico" style="--c:${SP[id].col}">${SP[id].l}</div>`;
function setPanel(html){panel.innerHTML=html;panel.classList.add('on');}
function closePanel(){panel.classList.remove('on');panel.innerHTML='';}
function compatible(modId){return spells.filter(s=>MODS[modId].tags.includes(s.id));}
function randomMods(n){
  const ok=Object.keys(MODS).filter(k=>!k.startsWith('el_')&&compatible(k).length);return shuffle(ok).slice(0,n);
}
function randomEls(n){return shuffle(Object.keys(MODS).filter(k=>k.startsWith('el_')&&compatible(k).length)).slice(0,n);}
function modCard(k,extra=''){const m=MODS[k],ec=m.el?ELS[m.el].col:'var(--frost)';return `<button class="card" data-mod="${k}" style="--c:${ec}"><i style="--c:${ec}">${m.el?'Element':'Modifier'}</i><b>${m.name}</b><span>${m.desc}</span><span style="color:var(--gold)">${compatible(k).map(s=>SP[s.id].name).join(', ')}</span>${extra}</button>`;}
function chooseTarget(modId,done){
  const list=compatible(modId);
  if(list.length===1){applyMod(list[0],modId);done();return;}
  setPanel(`<h2>Apply ${MODS[modId].name}</h2><p>${MODS[modId].desc}. Choose a spell.</p><div class="row">${list.map(s=>`<button class="card" data-sp="${s.id}">${letterIcon(s.id)}<b>${SP[s.id].name}</b><span>${modSummary(s)||'No modifiers yet'}</span></button>`).join('')}</div>`);
  panel.querySelectorAll('[data-sp]').forEach(b=>b.onclick=()=>{applyMod(spells.find(s=>s.id===b.dataset.sp),modId);done();});
}
function modSummary(s){return [s.el?ELS[s.el].n+' infusion':null,(s.tier||0)?'Level '+((s.tier||0)+1):null,...Object.entries(s.m).filter(([,v])=>v).map(([k,v])=>MODS[k].name+(v>1?' x'+v:''))].filter(Boolean).join(', ');}
function applyMod(s,k){if(k.startsWith('el_')){s.el=MODS[k].el;fxHeal(P.x,P.y-8,'mana');return;}s.m[k]++;if(k==='haste')s.cd=Math.min(s.cd,sCd(s));}
function addSpell(id){const o=spells.find(q=>q.id===id);if(o){o.tier=(o.tier||0)+1;texts.push({x:P.x,y:P.y-22,s:'LEVEL UP',t:1,c:'#ffd27a'});return;}spells.push(mkSpell(id));}
function openReward(kind,done){
  const fin=()=>{closePanel();done();};
  if(kind==='spell'){
    const have=new Set(spells.map(s=>s.id)),offer=shuffle(ALLS.filter(i=>!have.has(i))).slice(0,3);
    if(have.size&&(!offer.length||Math.random()<.45)){const ups=[...have].filter(i=>(spells.find(s=>s.id===i).tier||0)<3);if(ups.length){const up=pick(ups);if(offer.length>=3)offer[2]=up;else offer.push(up);}}
    if(!offer.length){openReward('mod',done);return;}
    setPanel(`<h2>Learn a spell</h2><div class="row">${offer.map(id=>{const o=have.has(id),tr=o?(spells.find(s=>s.id===id).tier||0):0;return `<button class="card" data-sp="${id}">${letterIcon(id)}<i style="--c:${CATC[SP[id].cat]}">${o?'Level up '+tr+' > '+(tr+1):SP[id].cat}</i><b>${SP[id].name}</b><span>${o?'Fuse it: +30% damage and 8% faster.':SP[id].desc}</span></button>`;}).join('')}</div>`);
    panel.querySelectorAll('[data-sp]').forEach(b=>b.onclick=()=>{addSpell(b.dataset.sp);fin();});
  }else if(kind==='element'){
    const offer=randomEls(3);if(!offer.length){openReward('mod',done);return;}
    setPanel(`<h2>Infuse a spell</h2><div class="row">${offer.map(k=>modCard(k)).join('')}</div>`);
    panel.querySelectorAll('[data-mod]').forEach(b=>b.onclick=()=>chooseTarget(b.dataset.mod,fin));
  }else if(kind==='mod'){
    const offer=randomMods(3);
    setPanel(`<h2>Upgrade a spell</h2><div class="row">${offer.map(k=>modCard(k)).join('')}</div>`);
    panel.querySelectorAll('[data-mod]').forEach(b=>b.onclick=()=>chooseTarget(b.dataset.mod,fin));
  }else if(kind==='rest'){
    setPanel(`<h2>A moment of rest</h2><div class="row"><button class="card" id="r1"><b>Mend</b><span>Heal 6 hearts</span></button><button class="card" id="r2"><b>Fortify</b><span>+2 max hearts and heal 2</span></button></div>`);
    $('r1').onclick=()=>{P.hp=Math.min(P.max,P.hp+6);fin();};$('r2').onclick=()=>{P.max+=2;P.hp=Math.min(P.max,P.hp+2);fin();};
  }else if(kind==='gamble'){
    setPanel(`<h2>The Wager</h2><p>The stars offer a trade.</p><div class="row"><button class="card" id="g1"><b>Take the coin</b><span>Heal 3 hearts. No risk.</span></button><button class="card" id="g2" ${P.hp<=3?'disabled':''}><b>Pay in blood</b><span>Lose 3 hearts, then gain TWO modifiers.</span></button></div>`);
    $('g1').onclick=()=>{P.hp=Math.min(P.max,P.hp+3);fin();};
    $('g2').onclick=()=>{if(P.hp<=3)return;P.hp-=3;const o1=()=>{const offer=randomMods(3);setPanel(`<h2>Choose a modifier (1 of 2)</h2><div class="row">${offer.map(k=>modCard(k)).join('')}</div>`);panel.querySelectorAll('[data-mod]').forEach(b=>b.onclick=()=>chooseTarget(b.dataset.mod,o2));};const o2=()=>{const offer=randomMods(3);setPanel(`<h2>Choose a modifier (2 of 2)</h2><div class="row">${offer.map(k=>modCard(k)).join('')}</div>`);panel.querySelectorAll('[data-mod]').forEach(b=>b.onclick=()=>chooseTarget(b.dataset.mod,fin));};o1();};
  }else if(kind==='shop'){openShop(done);}
}
function openShop(done){
  const owned=new Set(spells.map(s=>s.id)),sOffer=ALLS.filter(i=>!owned.has(i)),offers=[];
  for(const k of randomMods(2))offers.push({type:'mod',k,price:rint(16,26)});
  {const ek=randomEls(1)[0];if(ek&&Math.random()<.7)offers.push({type:'mod',k:ek,price:rint(26,36)});}
  if(sOffer.length)offers.push({type:'spell',id:pick(sOffer),price:42});
  offers.push({type:'heal',price:14});
  const draw=()=>{
    setPanel(`<h2>The Merchant</h2><p>Stardust: <b style="color:var(--gold)">${P.dust}</b></p><div class="row">${offers.map((o,i)=>{const dis=o.sold||P.dust<o.price;
      const body=o.type==='mod'?`<i style="--c:var(--frost)">Modifier</i><b>${MODS[o.k].name}</b><span>${MODS[o.k].desc}</span>`:o.type==='spell'?`${letterIcon(o.id)}<b>${SP[o.id].name}</b><span>${SP[o.id].desc}</span>`:`<i style="--c:var(--good)">Remedy</i><b>Healing draught</b><span>Heal 4 hearts</span>`;
      return `<button class="card" data-i="${i}" ${dis?'disabled':''}>${body}<span style="color:var(--gold)">${o.sold?'SOLD':o.price+' stardust'}</span></button>`;}).join('')}</div><button class="btn ghost" id="leave">Leave</button>`);
    panel.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{const o=offers[+b.dataset.i];if(o.sold||P.dust<o.price)return;P.dust-=o.price;o.sold=true;
      if(o.type==='heal'){P.hp=Math.min(P.max,P.hp+4);draw();}else if(o.type==='spell'){addSpell(o.id);draw();}else chooseTarget(o.k,draw);});
    $('leave').onclick=()=>{closePanel();done();};
  };
  draw();
}


/* ---------- cards, the Sanctum board and the end screens ---------- */
const stars=n=>'★'.repeat(n)+'☆'.repeat(5-n);
const bossImg=bi=>{const p=portrait(bi);return p?`<img alt="" src="${p}">`:'';};
function cardHTML(bi,extra=''){const b=bdef(bi),lv=hunt_().cards[bi];return `<button class="card ${extra}" data-card="${bi}" style="--c:${b.col}">${bossImg(bi)}<i>${b.num}${lv?'  Lv '+lv:''}</i><b>${b.name}</b><span>${powerText(powerKey(bi))}</span></button>`;}
function pickBoard(){
  const all=MB.map((b,i)=>i),by=(lo,hi)=>shuffle(all.filter(i=>stars_()[i]>=lo&&stars_()[i]<=hi));
  const fresh=a=>a.sort((x,y)=>(hunt_().cards[x]?1:0)-(hunt_().cards[y]?1:0))[0];
  board=[fresh(by(1,2)),fresh(by(3,3)),fresh(by(4,5))];
}
const dailyBoss=()=>{let h=0;for(const ch of todayKey())h=(h*31+ch.charCodeAt(0))>>>0;return {bi:h%MB.length,seed:h};};
function withSeed(seed,fn){const orig=Math.random;let a=seed>>>0;Math.random=()=>{a=(a+0x6D2B79F5)>>>0;let x=Math.imul(a^a>>>15,1|a);x=x+Math.imul(x^x>>>7,61|x)^x;return((x^x>>>14)>>>0)/4294967296;};try{return fn();}finally{Math.random=orig;}}
function startHunt(bi,isDaily=false){
  wakeAudio();closePanel();daily=isDaily;hunting=bdef(bi);const wz=WIZARDS.find(w=>w.id===meta.lastWizard)||WIZARDS[0];hw=wz;
  P={x:240,y:150,hp:10+wz.hearts,max:10+wz.hearts,inv:0,face:'south',step:0,moving:false,shield:0,boost:0,dust:wz.gold||0,r:5,aim:0};
  spells=[mkSpell('bolt')];gHit={frost:false,burn:false,dmg:1,cd:1,speed:1,gold:1,crit:0,winHeal:0};gearOn={hat:null,robe:null,charm:null};beams=[];traps=[];roomTear=false;phoenixUsed=false;bloodAcc=0;
  const ST={nova:'nova',ward:'ward',summon:'familiar'};if(wz.spell&&ST[wz.spell.type])spells.push(mkSpell(ST[wz.spell.type]));
  if(wz.perk==='wildfire')gHit.cd*=.9;if(wz.perk==='lucky'){gHit.crit=.1;gHit.gold*=1.3;}
  const ws=spells.find(s=>s.id==='ward');if(wz.perk==='rime'&&ws)ws.m.haste+=1;
  if(!daily)for(const bi2 of hunt_().equipped){const k=powerKey(bi2),lv=hunt_().cards[bi2]||1;
    if(k.startsWith('spell:')){const id=k.slice(6);if(!spells.some(s=>s.id===id))spells.push(mkSpell(id));}
    else if(k.startsWith('el:')){const tgt=spells.find(s=>!s.el&&ELTAGS.includes(s.id));if(tgt)tgt.el=k.slice(3);}
    else if(k==='burn')gHit.burn=true;else if(k==='slow')gHit.frost=true;else if(k==='dmg')gHit.dmg*=1+.15*lv;else if(k==='hearts'){P.max+=1+lv;P.hp=P.max;}
    else if(k==='haste')gHit.cd*=1-.08*lv;else if(k==='speed')gHit.speed*=1+.08*lv;else if(k==='gold')gHit.gold*=1+.25*lv;
    else if(k==='pierce')spells[0].m.pierce++;else if(k==='multi')spells[0].m.multi++;}
  if(!daily)for(const slot of ['hat','robe','charm']){const id=meta.loadout&&meta.loadout[slot];if(!id||!meta.forge[slot]||!meta.owned.includes(id))continue;const g=GEAR.find(x=>x.id===id);if(g){gearOn[slot]=id;applyGear(g,1);}}
  P.hp=P.max;
  const bo=daily?{}:(meta.boosts||{});P.max+=bo.heart||0;P.hp=P.max;P.dust+=15*(bo.purse||0);gHit.cd*=1-.04*(bo.well||0);
  stage=1;twist=null;nextTwist=null;enemies=[];shots=[];eshots=[];gems=[];parts=[];texts=[];marks=[];rings=[];zaps=[];later=[];blasts=[];zones=[];boss=null;guard=null;famil=[];beams=[];traps=[];
  stat={kills:0,dmg:0,gems:0,hurt:0,rooms:0};keysHeld=0;dark=0;darkT=0;roamT=8;roomsCleared=0;bossMul=1;locked=false;
  world=isDaily?withSeed(dailyBoss().seed,()=>genWorld(bi)):genWorld(bi);enterRoom(world.start,null);
}
function wizChips(){
  const open=WIZARDS.filter(w=>meta.wizards.includes(w.id)),locked=WIZARDS.length-open.length;
  return `<div class="row" style="flex-wrap:wrap;gap:calc(var(--s)*4px)">${open.map(w=>`<button class="chip ${w.id===(hw?hw.id:meta.lastWizard)?'on':''}" data-wiz="${w.id}">${w.name}</button>`).join('')}${locked?`<span class="chip" style="opacity:.45;cursor:default">${locked} locked</span>`:''}</div>`;
}
function showSanctum(){
  scene='sanctum';boss=null;locked=false;prevScene='wave';setMusic('hub',0);
  if(board.length!==3)pickBoard();
  if(!hw)hw=WIZARDS.find(w=>w.id===meta.lastWizard)||WIZARDS[0];
  const slots=cardSlots(),eq=hunt_().equipped.length,n=owned().length;
  setPanel(`<h2>The Hunt</h2><p>Choose a boss and a wizard. Clear rooms, take three keys from the guardians, break the seal, claim the card.</p>${wizChips()}
    <div class="row">${board.slice().sort((a,b)=>stars_()[a]-stars_()[b]).map(bi=>{const b=bdef(bi);return `<button class="card" data-hunt="${bi}" style="--c:${b.col}">${bossImg(bi)}<i>${b.num}  ${stars(b.star)}</i><b>${b.name}</b><span>Card: ${powerText(powerKey(bi))}</span><span style="color:var(--gold)">${hunt_().cards[bi]?'Hunt again':'Set out'}</span></button>`;}).join('')}</div>
    <div class="row" style="gap:calc(var(--s)*6px)"><button class="btn ghost" id="hcoll">Cards ${n}/${MB.length}  -  ${eq}/${slots} equipped</button><button class="btn ghost" id="hleave">Back to the village</button></div>`);
  panel.querySelectorAll('[data-hunt]').forEach(b=>b.onclick=()=>startHunt(+b.dataset.hunt));
  panel.querySelectorAll('[data-wiz]').forEach(b=>b.onclick=()=>{hw=WIZARDS.find(w=>w.id===b.dataset.wiz);meta.lastWizard=hw.id;saveMeta();showSanctum();});
  $('hcoll').onclick=showCollection;$('hleave').onclick=leaveHunt;
}
function showCollection(){
  scene='sanctum';const slots=cardSlots(),eq=hunt_().equipped;
  setPanel(`<h2>Your cards</h2><p>${owned().length?'Tap a card to equip it ('+eq.length+' of '+slots+'). Equipped cards give their power at the start of every hunt.':'Win a hunt to claim your first card.'}</p>
    <div class="grid">${owned().sort((a,b)=>a-b).map(bi=>cardHTML(bi,eq.includes(bi)?'eq small':'small')).join('')}</div><button class="btn" id="hback">Back</button>`);
  panel.querySelectorAll('[data-card]').forEach(b=>b.onclick=()=>{const bi=+b.dataset.card,h=hunt_(),i=h.equipped.indexOf(bi);if(i>=0)h.equipped.splice(i,1);else{if(h.equipped.length>=cardSlots())h.equipped.shift();h.equipped.push(bi);}saveMeta();showCollection();});
  $('hback').onclick=showSanctum;
}
function showEnd(win,cardId,lv,gain){
  scene=win?'won':'dead';board=[];
  if(win){setMusic('victory',0);setPanel(`<h2>${hunting.name} falls</h2><p>${stat.kills} foes felled  -  ${stat.rooms} rooms cleared  -  ${stat.hurt} hits taken  -  +${gain} shards</p>${lv?`<div class="row" style="justify-content:center">${cardHTML(cardId,'eq')}</div><p>${lv>1?'The card brightens to level '+lv+'.':'A new card joins your collection.'}</p>`:'<p>The daily hunt is done. Come back tomorrow.</p>'}<button class="btn" id="hback">Return to the hunt board</button>`);}
  else{setMusic('defeat',0);setPanel(`<h2>You fell</h2><p>${stat.kills} foes felled  -  ${stat.rooms} rooms cleared  -  ${keysHeld} of ${KEYS_NEEDED} keys  -  +${gain} shards. ${hunting.name} still prowls these halls.</p><button class="btn" id="hback">Return to the hunt board</button>`);}
  $('hback').onclick=()=>daily?leaveHunt():showSanctum();
}
function showPause(){
  if(scene!=='wave')return;prevScene=scene;scene='panel';
  setPanel(`<h2>Paused</h2><div class="row" style="justify-content:center"><button class="btn" id="hres">Resume</button><button class="btn ghost" id="hquit">Abandon the hunt</button></div>`);
  $('hres').onclick=()=>{closePanel();scene='wave';};$('hquit').onclick=()=>{closePanel();showEnd(false,null,0,endShards(false));};
}
function endShards(win){if(daily&&!win)noteDaily(stat.rooms,false);const g=win?4+hunting.star*2:Math.floor(stat.rooms/3);meta.shards=(meta.shards||0)+g;saveMeta();return g;}
function leaveHunt(){
  closePanel();if(root)root.hidden=true;const wrap=$('wrap');if(wrap)wrap.style.visibility='';S.mode='hub';
  if(exitFn)exitFn();
}

/* ---------- drawing ---------- */
function makeBg(){
  const b=document.createElement('canvas');b.width=W;b.height=H;const g=b.getContext('2d');g.imageSmoothingEnabled=false;
  const gr=g.createRadialGradient(240,140,40,240,140,300);gr.addColorStop(0,'#1b1434');gr.addColorStop(1,'#08050f');g.fillStyle=gr;g.fillRect(0,0,W,H);
  for(let y=AR.y0;y<AR.y1;y+=16)for(let x=AR.x0;x<AR.x1;x+=16){g.fillStyle=((x+y)>>4)%2?'#150f27':'#120c22';g.fillRect(x,y,16,16);}
  g.strokeStyle='#2a1f47';g.lineWidth=1;g.beginPath();for(let i=0;i<7;i++){const a=i/7*TAU+.4;g.moveTo(240,140);g.lineTo(240+Math.cos(a)*190,140+Math.sin(a)*120);}g.stroke();
  g.beginPath();g.ellipse(240,140,120,78,0,0,TAU);g.moveTo(240+190,140);g.ellipse(240,140,190,120,0,0,TAU);g.stroke();
  let s=7;const r=()=>(s=(s*16807)%2147483647)/2147483647;for(let i=0;i<70;i++){g.fillStyle=r()<.5?'#cbbcf0':'#ffe9a0';g.globalAlpha=.25+r()*.5;g.fillRect(AR.x0+r()*(AR.x1-AR.x0)|0,AR.y0+r()*(AR.y1-AR.y0)|0,1,1);}g.globalAlpha=1;
  // gold frame
  g.strokeStyle='#8f7440';g.lineWidth=2;g.strokeRect(AR.x0-2,AR.y0-2,AR.x1-AR.x0+4,AR.y1-AR.y0+4);g.strokeStyle='#4a3a24';g.lineWidth=1;g.strokeRect(AR.x0-5,AR.y0-5,AR.x1-AR.x0+10,AR.y1-AR.y0+10);
  return b;
}
function glow(x,y,r,col,a){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');c.globalAlpha=a;c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.globalAlpha=1;}
function text(s,x,y,col='#f1e8d4',size=8,align='left',font=FONT,weight=700){c.font=`${weight} ${size}px ${font}`;c.textAlign=align;c.fillStyle='#07040f';c.fillText(s,x+.7,y+.7);c.fillStyle=col;c.fillText(s,x,y);}
const TC=new Map();
function tintOf(img,col){const k=(img.src||'')+col;let o=TC.get(k);if(!o){o=document.createElement('canvas');o.width=img.width;o.height=img.height;const g=o.getContext('2d');g.drawImage(img,0,0);g.globalCompositeOperation='source-in';g.fillStyle=col;g.fillRect(0,0,o.width,o.height);TC.set(k,o);}return o;}
function drawEnemy(e){
  const x=Math.round(e.x),y=Math.round(e.y),r=e.r,key=e.guardian?'guardian':e.type,A=HUNT_ART.enemies[key];
  c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(x,y+r*.8,r*.9,r*.35,0,0,TAU);c.fill();
  if(e.slow>0)glow(x,y,r+9,'#9ad0ff',.3);if(e.burn>0)glow(x,y-2,r+9,'#ff7a3a',.4);if(e.psn>0)glow(x,y,r+9,'#9ae04a',.35);if(e.root>0){c.strokeStyle='#8fe06a';c.lineWidth=1;c.beginPath();c.ellipse(x,y+r*.8,r+2,r*.45,0,0,TAU);c.stroke();}
  if(e.elite&&!e.guardian){c.strokeStyle='rgba(255,210,122,.9)';c.lineWidth=1;c.beginPath();c.ellipse(x,y+r*.8,r+3,r*.5,0,0,TAU);c.stroke();glow(x,y,r+12,'#ffd27a',.18);}
  if(A&&A.frames.length){
    const img=A.frames[Math.floor(e.ph*A.fps)%A.frames.length],sz=(SZ[key]||30)*(e.elite&&!e.guardian?1.22:1),h=sz*img.height/img.width,flip=e.vx<-4?-1:1;
    c.save();c.translate(x,y);c.scale(flip,1);
    c.drawImage(img,-sz/2,-h*.58,sz,h);
    if(e.frozen>0){c.globalAlpha=.6;c.drawImage(tintOf(img,'#9ad8ff'),-sz/2,-h*.58,sz,h);c.globalAlpha=1;}
    else if(e.flash>0){c.globalAlpha=.85;c.drawImage(tintOf(img,'#ffffff'),-sz/2,-h*.58,sz,h);c.globalAlpha=1;}
    else if(e.st===1){c.globalAlpha=.35+.3*Math.sin(t*40);c.drawImage(tintOf(img,'#ff5a4a'),-sz/2,-h*.58,sz,h);c.globalAlpha=1;}
    c.restore();
  }else{c.fillStyle=e.flash>0?'#fff':e.col;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
  if((e.type==='ram'||e.type==='mimic')&&e.st===1){const a=e.dir||0;c.strokeStyle='rgba(255,122,110,.7)';c.lineWidth=1;c.setLineDash([2,2]);c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*130,y+Math.sin(a)*130);c.stroke();c.setLineDash([]);}
  if(e.hp<e.max&&!e.isBoss&&!e.guardian){c.fillStyle='#0b0818';c.fillRect(x-r,y-r-9,r*2,2);c.fillStyle='#ff7a6e';c.fillRect(x-r,y-r-9,r*2*Math.max(0,e.hp/e.max),2);}
}
/* ---------- stage looks ---------- */
const FLOORS={};
function tileSet(name){const s=SPRITE_OVERRIDES.arena&&SPRITE_OVERRIDES.arena.sets&&SPRITE_OVERRIDES.arena.sets[name];return s&&s.length>15?s:null;}
function floorFor(ti){
  if(FLOORS[ti])return FLOORS[ti];
  const th=THEMES[ti],o=document.createElement('canvas');o.width=W*R;o.height=H*R;const g=o.getContext('2d');g.scale(R,R);g.imageSmoothingEnabled=false;
  g.fillStyle='#08050f';g.fillRect(0,0,W,H);const T=tileSet(th.set);
  if(T){for(let ty=0;ty<AR.y1;ty+=16)for(let tx=0;tx<AR.x1;tx+=16){const im=T[((tx*7+ty*13)>>4)%5===0?(tx>>4)%16:[0,1,8,10,13][((tx>>4)+(ty>>4))%5]];if(im)g.drawImage(im,tx,ty,16,16);}}
  else g.drawImage(makeBg(),0,0);
  g.fillStyle='rgba(8,4,16,.34)';g.fillRect(0,0,W,H);g.fillStyle=th.tint;g.fillRect(0,0,W,H);
  const vg=g.createRadialGradient(240,140,90,240,140,300);vg.addColorStop(0,'rgba(8,4,16,0)');vg.addColorStop(1,'rgba(8,4,16,.62)');g.fillStyle=vg;g.fillRect(0,0,W,H);
  g.fillStyle='#08050f';g.fillRect(0,0,W,AR.y0-5);g.fillRect(0,AR.y1+5,W,H);g.fillRect(0,0,AR.x0-5,H);g.fillRect(AR.x1+5,0,W,H);
  g.strokeStyle='#8f7440';g.lineWidth=2;g.strokeRect(AR.x0-2,AR.y0-2,AR.x1-AR.x0+4,AR.y1-AR.y0+4);g.strokeStyle='#4a3a24';g.lineWidth=1;g.strokeRect(AR.x0-5,AR.y0-5,AR.x1-AR.x0+10,AR.y1-AR.y0+10);
  return FLOORS[ti]=o;
}
function roomProps(r){
  if(r.props)return r.props;const th=THEMES[r.theme],rn=seeded(r.id*131+r.theme*7+3),out=[],n=r.kind==='boss'?9:5+Math.floor(rn()*3);
  for(let tries=0;out.length<n&&tries<80;tries++){
    const x=AR.x0+26+rn()*(AR.x1-AR.x0-52),y=AR.y0+34+rn()*(AR.y1-AR.y0-56);
    if((Math.abs(x-240)<48&&(y<84||y>200))||(Math.abs(y-140)<48&&(x<84||x>396))||(Math.abs(x-240)<150&&Math.abs(y-140)<66))continue;
    if(out.some(o=>Math.hypot(o.x-x,o.y-y)<48))continue;
    out.push({name:th.decor[Math.floor(rn()*th.decor.length)],x,y,k:.85+rn()*.3,flip:rn()<.5});
  }
  out.sort((a,b)=>a.y-b.y);return r.props=out;
}
const PROPK={tomb:1,statue:1,pillar:1,brazier:1,crystal:1,stump:1};
function drawProp(p){
  const x=Math.round(p.x),y=Math.round(p.y);c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(x,y+2,13*p.k,4,0,0,TAU);c.fill();
  const D=HUNT_ART.decor[p.name];
  if(D){const sz=54*p.k,h=sz*D.height/D.width;c.save();c.translate(x,y+4);if(p.flip)c.scale(-1,1);c.drawImage(D,-sz/2,-h,sz,h);c.restore();}
  else if(PROPK[p.name]){const pr=SPRITE_OVERRIDES.arena.props&&SPRITE_OVERRIDES.arena.props[p.name];if(pr&&pr.img)blitSprite(c,pr,x,y,1.05*p.k);}
  if(p.name==='brazier'||p.name==='obsidian'){glow(x,y-14,22,'#ff8a3a',.16+.05*Math.sin(t*9+p.x));}
  if(p.name==='crystal'||p.name==='ice'){glow(x,y-14,20,'#9ad8ff',.12+.04*Math.sin(t*3+p.x));}
  if(p.name==='voideye'){glow(x,y-18,22,'#a070ff',.18+.06*Math.sin(t*2+p.x));}
  if(p.name==='obelisk'){glow(x,y-24,22,'#ffe9a0',.14+.05*Math.sin(t*2.4+p.x));}
  if(p.name==='mushroom'){glow(x,y-14,18,'#7af0c0',.13+.04*Math.sin(t*3+p.x));}
}
function drawAmbient(){
  const th=THEMES[room.theme],n=26;c.fillStyle=th.pc;
  for(let i=0;i<n;i++){
    const sx=(i*97.3)%(AR.x1-AR.x0),sy=(i*53.1)%(AR.y1-AR.y0);let x=AR.x0+sx,y=AR.y0+sy,a=.5,s=1;
    if(th.part==='snow'){y=AR.y0+((t*14+i*29)%(AR.y1-AR.y0));x=AR.x0+(sx+Math.sin(t*.8+i)*8+W)%(AR.x1-AR.x0);}
    else if(th.part==='ember'){y=AR.y1-((t*20+i*31)%(AR.y1-AR.y0));x=AR.x0+(sx+Math.sin(t+i)*6+W)%(AR.x1-AR.x0);a=Math.max(0,1-(AR.y1-y)/(AR.y1-AR.y0))*.9;}
    else if(th.part==='spore'){y=AR.y1-((t*7+i*23)%(AR.y1-AR.y0));x=AR.x0+(sx+Math.sin(t*.6+i*2)*14+W)%(AR.x1-AR.x0);a=.5+.3*Math.sin(t*2+i);}
    else if(th.part==='star'){a=Math.max(0,Math.sin(t*1.6+i*1.7))*.9;}
    else if(th.part==='void'){y=AR.y1-((t*11+i*37)%(AR.y1-AR.y0));x=AR.x0+(sx+Math.cos(t*.9+i)*12+W)%(AR.x1-AR.x0);a=.55;s=i%3?1:2;}
    else{x=AR.x0+(sx+t*3+W)%(AR.x1-AR.x0);y=AR.y0+(sy+Math.sin(t*.4+i)*5+H)%(AR.y1-AR.y0);a=.3;}
    c.globalAlpha=a;c.fillRect(Math.round(x),Math.round(y),s,s);
  }
  c.globalAlpha=1;
}
function drawBeamsTraps(){
  for(const q of traps){const col=q.s.el?ELS[q.s.el].col:'#ff9ad8',armed=q.arm<=0;c.globalAlpha=armed?.55+.3*Math.sin(t*6+q.ph):.3;c.strokeStyle=col;c.lineWidth=1;c.beginPath();c.ellipse(q.x,q.y,9,4,0,0,TAU);c.stroke();c.beginPath();c.moveTo(q.x-5,q.y);c.lineTo(q.x+5,q.y);c.moveTo(q.x,q.y-3);c.lineTo(q.x,q.y+3);c.stroke();c.globalAlpha=1;if(armed)glow(q.x,q.y,10,col,.22);}
  for(const b of beams){const col=b.s.el?ELS[b.s.el].col:'#fff0a0',ca=Math.cos(b.a),sa=Math.sin(b.a),al=Math.min(1,(b.dur-b.t)*3,b.t*10+.2),w=sArea(b.s);
    c.globalAlpha=al*.25;c.strokeStyle=col;c.lineWidth=10*w;c.beginPath();c.moveTo(P.x,P.y);c.lineTo(P.x+ca*340,P.y+sa*340);c.stroke();
    c.globalAlpha=al*.7;c.lineWidth=4*w;c.stroke();c.globalAlpha=al;c.strokeStyle='#fff';c.lineWidth=1.5;c.stroke();c.globalAlpha=1;glow(P.x+ca*8,P.y+sa*8,14,col,.5*al);}
}
const IMGS={};
function iconImg(name){if(!IMGS[name]){const i=new Image();i.src=BASE()+'assets/icons/'+name+'.png';IMGS[name]=i;}return IMGS[name];}
function drawBoss(b){
  const x=Math.round(b.x),y=Math.round(b.y),fr=bossFrames(b.art);
  glow(x,y,b.r+28,b.col,.32+.08*Math.sin(t*3));
  c.fillStyle='rgba(0,0,0,.4)';c.beginPath();c.ellipse(x,y+b.r,b.r,5,0,0,TAU);c.fill();
  const s=fr&&fr[Math.floor(t*6)%fr.length];
  if(s&&s.img){const im=s.img,k=(b.r*3.4)/(im.width*(im.hi?1/R:1));if(b.flash>0)c.globalAlpha=.7;c.save();c.translate(x,y);c.scale(k,k);blit(c,0,0,im);c.restore();c.globalAlpha=1;if(b.flash>0)glow(x,y,b.r+6,'#ffffff',.5);}
  else{c.fillStyle=b.col;c.beginPath();c.arc(x,y,b.r,0,TAU);c.fill();}
  if(b.windup>0){c.fillStyle='rgba(255,122,110,.5)';c.beginPath();c.arc(x,y,b.r+4+Math.sin(t*30)*2,0,TAU);c.fill();}
}
function drawRoom(){
  if(!room)return;
  // floor runes, different per room
  let s=room.id*977+13;const r=()=>(s=(s*16807)%2147483647)/2147483647;c.strokeStyle='rgba(150,120,220,.14)';c.lineWidth=1;
  for(let i=0;i<3;i++){const rx=70+r()*340,ry=60+r()*150,rr=14+r()*26;c.beginPath();c.ellipse(rx,ry,rr,rr*.6,0,0,TAU);c.stroke();c.beginPath();c.arc(rx,ry,2,0,TAU);c.stroke();}
  // altar
  if(ALTARS.includes(room.kind)){const k=ROOMK[room.kind],used=room.used,ax=240,ay=140;glow(ax,ay,26,k.col,used?.12:.45+.1*Math.sin(t*4));c.strokeStyle=used?'#4a3a6a':k.col;c.lineWidth=1.5;c.beginPath();c.ellipse(ax,ay,15,6,0,0,TAU);c.stroke();
    if(room.kind==='treasure'&&HUNT_ART.enemies.chest){c.globalAlpha=used?.35:1;c.drawImage(HUNT_ART.enemies.chest.frames[0],ax-15,ay-33,30,30);c.globalAlpha=1;}else text(k.g,ax,ay-4,used?'#4a3a6a':k.col,14,'center',FONT);text(used?'spent':k.n,ax,ay+20,used?'#6a5a8a':'#f1e8d4',8,'center',FONT);
    if(!used&&altarHold>0){c.strokeStyle='#fff6d0';c.lineWidth=2;c.beginPath();c.ellipse(ax,ay,15,6,0,-1.57,-1.57+TAU*Math.min(1,altarHold/.5));c.stroke();}
    if(!used)text('stand here',ax,ay+29,'#a79bc0',8,'center',SMALL,400);}
  // doors, with a preview of what lies beyond
  for(const d in room.link){const n=world.cells[room.link[d]],dp=DOORS[d],k=ROOMK[n.kind],open=!locked,v=DIRV[d];
    const horiz=d==='N'||d==='S',w=horiz?40:10,h=horiz?10:40;
    c.fillStyle='#050309';c.fillRect(dp.x-w/2,dp.y-h/2,w,h);
    c.strokeStyle=open?(n.kind==='boss'&&!n.unsealed&&keysHeld<KEYS_NEEDED?'#ff7a6e':'#dcb868'):'#7a2a30';c.lineWidth=2;c.strokeRect(dp.x-w/2+.5,dp.y-h/2+.5,w-1,h-1);
    if(!open){c.strokeStyle='rgba(255,122,110,.8)';c.lineWidth=1;for(let i=-2;i<=2;i++){c.beginPath();if(horiz){c.moveTo(dp.x+i*7,dp.y-4);c.lineTo(dp.x+i*7,dp.y+4);}else{c.moveTo(dp.x-4,dp.y+i*7);c.lineTo(dp.x+4,dp.y+i*7);}c.stroke();}}
    else{glow(dp.x-v[0]*4,dp.y-v[1]*4,26,'#ffe9a0',.18+.06*Math.sin(t*3));}
    const ix=dp.x-v[0]*(horiz?0:24),iy=dp.y-v[1]*(horiz?22:0);
    c.globalAlpha=n.visited&&n.cleared?.45:1;c.fillStyle='#120c22';c.beginPath();c.arc(ix,iy,7,0,TAU);c.fill();c.strokeStyle=k.col;c.lineWidth=1;c.beginPath();c.arc(ix,iy,7,0,TAU);c.stroke();text(k.g,ix,iy+3.5,k.col,9,'center',FONT);c.globalAlpha=1;
    if(n.kind==='boss'&&!n.unsealed&&keysHeld<KEYS_NEEDED){c.fillStyle='#ff7a6e';c.fillRect(ix-3,iy+7,6,5);c.strokeStyle='#ff7a6e';c.lineWidth=1;c.beginPath();c.arc(ix,iy+7,2.5,Math.PI,0);c.stroke();}
  }
}
function drawZones(){
  for(const z of zones){const on=z.t>z.warn,a=on?.55:.25+.2*Math.sin(t*20);c.fillStyle=z.col;c.strokeStyle=z.col;c.globalAlpha=on?a:.18;
    if(z.r){c.beginPath();c.arc(z.x,z.y,z.r,0,TAU);c.fill();c.globalAlpha=on?.9:.6;c.lineWidth=1;c.stroke();}else{c.fillRect(z.x,z.y,z.w,z.h);c.globalAlpha=on?.9:.6;c.lineWidth=1;c.strokeRect(z.x+.5,z.y+.5,z.w-1,z.h-1);}c.globalAlpha=1;}
}
function drawMinimap(){
  if(!world)return;const ox=18,oy=26,cs=8;
  for(const c0 of world.cells){const x=ox+c0.x*cs,y=oy+c0.y*cs,known=c0.visited||c0.seen;
    c.fillStyle=!known?'rgba(20,14,40,.55)':c0.visited?(c0.cleared?'#3d3068':'#6a3a2a'):'#2a2145';c.fillRect(x,y,cs-1,cs-1);
    if(known&&c0.kind==='boss'){c.fillStyle='#ff7a6e';c.fillRect(x+3,y+1,2,4);c.fillRect(x+3,y+6,2,1);}
    else if(c0.visited&&c0.kind==='guard'){c.fillStyle='#ffd27a';c.fillRect(x+2,y+2,3,3);}
    else if(c0.visited&&ALTARS.includes(c0.kind)){c.fillStyle=ROOMK[c0.kind].col;c.fillRect(x+3,y+3,2,2);}
    if(c0.visited)for(const d in c0.link){const n=world.cells[c0.link[d]];if(d==='E'){c.fillStyle='#8f7aa8';c.fillRect(x+cs-1,y+3,1,2);}if(d==='S'){c.fillStyle='#8f7aa8';c.fillRect(x+3,y+cs-1,2,1);}}
    if(c0===room){c.strokeStyle='#fff6d0';c.lineWidth=1;c.strokeRect(x-.5,y-.5,cs,cs);}}
  const b=world.bossCell,dx=b.x-room.x,dy=b.y-room.y,dd=Math.abs(dx)+Math.abs(dy),cx0=ox+GC*cs+14,cy0=oy+13,col=dd<=1?'#ff7a6e':dd<=3?'#ffb04a':'#8fa8ff';
  c.strokeStyle=col;c.lineWidth=1;c.beginPath();c.arc(cx0,cy0,10,0,TAU);c.stroke();
  if(dd){const a=Math.atan2(dy,dx);c.fillStyle=col;c.beginPath();c.moveTo(cx0+Math.cos(a)*8,cy0+Math.sin(a)*8);c.lineTo(cx0+Math.cos(a+2.5)*6,cy0+Math.sin(a+2.5)*6);c.lineTo(cx0+Math.cos(a-2.5)*6,cy0+Math.sin(a-2.5)*6);c.fill();}
  text(dd?dd+(dd===1?' room':' rooms'):'here',cx0,cy0+20,col,8,'center',FONT);
}
function drawPlayer(){
  const x=Math.round(P.x),y=Math.round(P.y);
  glow(x,y-6,20,'#b9a8ff',.22);c.fillStyle='rgba(0,0,0,.4)';c.beginPath();c.ellipse(x,y+6,7,2.5,0,0,TAU);c.fill();
  if(P.shield){glow(x,y-2,16,'#7fe0c0',.45);c.strokeStyle='rgba(127,224,192,.9)';c.lineWidth=1;c.beginPath();c.arc(x,y-1,11,0,TAU);c.stroke();}
  if(P.inv>0&&Math.floor(t*20)%2&&scene==='wave')c.globalAlpha=.4;
  const s=wizSprite();if(s)blitSprite(c,s,x,y+8,hw&&hw.id!=='raven'?1.2:1.35);
  c.globalAlpha=1;
}
function drawSpellFx(){
  const orb=spells.find(s=>s.id==='orbit');
  const th=spells.find(s=>s.id==='thorns');if(th){const R=32*sArea(th);c.strokeStyle='rgba(143,224,106,.25)';c.lineWidth=1;c.setLineDash([2,3]);c.beginPath();c.arc(P.x,P.y,R,0,TAU);c.stroke();c.setLineDash([]);}
  for(const m of marks){if(m.meteor){const k=1-m.t/.7;c.strokeStyle='rgba(255,154,90,.8)';c.lineWidth=1;c.beginPath();c.arc(m.x,m.y,m.r*k,0,TAU);c.stroke();c.beginPath();c.arc(m.x,m.y,m.r,0,TAU);c.setLineDash([2,3]);c.stroke();c.setLineDash([]);const fy=m.y-(m.t/.7)*110;glow(m.x,fy,10,'#ffb04a',.9);c.fillStyle='#fff6d0';c.fillRect(m.x-1,fy-1,3,3);}
    else if(m.line!==undefined){c.strokeStyle='rgba(255,122,110,'+(.35+.4*Math.sin(t*30))+')';c.lineWidth=3;c.beginPath();c.moveTo(m.x,m.y);c.lineTo(m.x+Math.cos(m.line)*320,m.y+Math.sin(m.line)*320);c.stroke();}
    else{c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=1;c.beginPath();c.arc(m.x,m.y,8*(m.t/.6)+2,0,TAU);c.stroke();}}
  for(const b of blasts){c.strokeStyle=b.col;c.globalAlpha=Math.max(.2,1-b.r/b.max);c.lineWidth=2;c.beginPath();c.arc(b.x,b.y,b.r,0,TAU);c.stroke();c.globalAlpha=1;}
  for(const r of rings){c.strokeStyle=r.c;c.globalAlpha=Math.max(0,r.t*3);c.lineWidth=1;c.beginPath();c.arc(r.x,r.y,r.r,0,TAU);c.stroke();c.globalAlpha=1;}
  for(const z of zaps){c.strokeStyle='#cfe0ff';c.lineWidth=2;c.globalAlpha=Math.min(1,z.t*8);c.beginPath();z.pts.forEach((p,i)=>{const jx=i?rnd(-2,2):0,jy=i?rnd(-2,2):0;i?c.lineTo(p.x+jx,p.y+jy):c.moveTo(p.x,p.y);});c.stroke();c.globalAlpha=1;}
  for(const s of shots){glow(s.x,s.y,s.r+4,s.col,.5);c.fillStyle=s.col;c.fillRect(Math.round(s.x-s.r),Math.round(s.y-s.r),Math.ceil(s.r*2),Math.ceil(s.r*2));c.fillStyle='#fff';c.fillRect(Math.round(s.x)-1,Math.round(s.y)-1,1,1);}
  if(orb)for(const o of orbitPositions(orb)){glow(o.x,o.y,10,'#e8d8ff',.6);c.fillStyle='#f1e8ff';c.beginPath();c.arc(o.x,o.y,3.4*(1+.12*orb.m.size),0,TAU);c.fill();c.fillStyle='#b9a8e8';c.beginPath();c.arc(o.x+1,o.y,2.4,0,TAU);c.fill();}
  const fa=spells.find(s=>s.id==='familiar');if(fa){const n=1+fa.m.multi;for(let i=0;i<n;i++){const a=fa.ang+i/n*TAU,fx=P.x+Math.cos(a)*30,fy=P.y+Math.sin(a)*22;glow(fx,fy,9,'#ffb4d8',.6);c.fillStyle='#ffd8ec';c.beginPath();c.arc(fx,fy,3,0,TAU);c.fill();c.fillStyle='#0b0818';c.fillRect(fx-1,fy-1,1,1);c.fillRect(fx+1,fy-1,1,1);}}
}
function drawHUD(){
  drawMinimap();
  // hearts
  const hw=70;text('HP',18,18,'#ff9a9a',8,'left',FONT);c.fillStyle='#0b0818';c.fillRect(32,11,hw,8);c.fillStyle='#ff5a6a';c.fillRect(33,12,(hw-2)*P.hp/P.max,6);c.fillStyle='rgba(255,255,255,.25)';c.fillRect(33,12,(hw-2)*P.hp/P.max,2);text(P.hp+'/'+P.max,32+hw/2,18.5,'#fff',7,'center',FONT);
  // wave
  const mid=240;if(boss){const bw=170;c.fillStyle='#0b0818';c.fillRect(mid-bw/2,8,bw,7);c.fillStyle=boss.col;c.fillRect(mid-bw/2+1,9,(bw-2)*Math.max(0,boss.hp/boss.max),5);text(boss.name,mid,21,'#f1e8d4',8,'center',FONT);}
  else{text(locked?(room.kind==='guard'?'KEY GUARDIAN':'AMBUSH'):'HUNTING: '+hunting.name.toUpperCase(),mid,15,'#dcb868',9,'center',FONT);if(locked){c.fillStyle='#0b0818';c.fillRect(mid-40,18,80,3);c.fillStyle='#dcb868';c.fillRect(mid-40,18,80*Math.max(0,waveT/waveLen),3);}}
  if(guard){const bw=150;c.fillStyle='#0b0818';c.fillRect(mid-bw/2,32,bw,5);c.fillStyle='#ffd27a';c.fillRect(mid-bw/2+1,33,(bw-2)*Math.max(0,guard.hp/guard.max),3);}
  if(twist&&scene==='wave')text(twist.name+'  x'+twist.mult,mid,boss?30:29,'#ffb04a',7,'center',SMALL,500);
  text('✦ '+P.dust,W-18,18,'#dcb868',9,'right',FONT);
  for(let i=0;i<KEYS_NEEDED;i++){const kx=W-18-i*13-8,ky=26;c.fillStyle=i<keysHeld?'#ffd27a':'#2a2145';c.strokeStyle=i<keysHeld?'#fff6d0':'#5a4a82';c.lineWidth=1;c.beginPath();c.arc(kx,ky+3,3,0,TAU);c.fill();c.stroke();c.fillRect(kx-.5,ky+5,1.5,6);c.fillRect(kx,ky+9,3,1.5);}
  {let gx=18;for(const slot of ['hat','robe','charm']){const id=gearOn[slot];c.fillStyle='#0b0818';c.fillRect(gx-1,63,17,17);if(id){const g=gearOf(id);c.fillStyle=RARITY[g.rarity].c;c.fillRect(gx,64,15,15);const im=iconImg('gear_'+id);if(im.complete&&im.naturalWidth)c.drawImage(im,gx+.5,64.5,14,14);}else{c.strokeStyle='#3a2d5c';c.lineWidth=1;c.strokeRect(gx+.5,64.5,14,14);}gx+=19;}}
  // spell bar
  const n=spells.length,sw=22,gap=3,x0=mid-(n*(sw+gap)-gap)/2,y0=H-5-sw;
  spells.forEach((s,i)=>{const x=x0+i*(sw+gap),def=SP[s.id];c.fillStyle='#0b0818';c.fillRect(x-1,y0-1,sw+2,sw+2);c.fillStyle=def.col;c.fillRect(x,y0,sw,sw);c.fillStyle='rgba(255,255,255,.18)';c.fillRect(x,y0,sw,5);
    const cdMax=sCd(s),k=s.id==='ward'?(P.shield?0:s.cd/cdMax):(['orbit','thorns','familiar'].includes(s.id)?0:clamp(s.cd/cdMax,0,1));
    if(k>0){c.fillStyle='rgba(7,4,15,.65)';c.fillRect(x,y0,sw,sw*k);}
    {const im=spellIcon(s.id);if(im&&im.complete&&im.naturalWidth)c.drawImage(im,x+1,y0+1,sw-2,sw-2);else text(def.l,x+sw/2,y0+sw/2+4,'#0b0818',11,'center',FONT);}c.fillStyle=s.el?ELS[s.el].col:CATC[def.cat];c.fillRect(x,y0+sw-2,sw,2);if(s.el){c.fillStyle='#0b0818';c.fillRect(x+sw-7,y0+sw-8,6,6);c.fillStyle=ELS[s.el].col;c.fillRect(x+sw-6,y0+sw-7,4,4);}for(let j=0;j<(s.tier||0);j++){c.fillStyle='#ffd27a';c.fillRect(x+1+j*3,y0+sw-6,2,2);}
    let mc=0;for(const k2 in s.m)mc+=s.m[k2];for(let j=0;j<Math.min(mc,8);j++){c.fillStyle='#0b0818';c.fillRect(x+1+j*2.6,y0+1,2,2);c.fillStyle='#fff6d0';c.fillRect(x+1.4+j*2.6,y0+1.4,1.2,1.2);}});
}
function draw(){
  c.save();if(shake>0)c.translate(rnd(-shake,shake)*.4,rnd(-shake,shake)*.4);
  if(!bgc)bgc=makeBg();
  if(scene==='menu'||scene==='sanctum'||!room){c.drawImage(bgc,0,0);c.restore();return;}
  c.drawImage(floorFor(room.theme),0,0,W,H);
  drawRoom();drawZones();drawAmbient();drawBeamsTraps();
  for(const g of gems){glow(g.x,g.y,6,'#ffe9a0',.5);c.fillStyle='#ffe9a0';c.fillRect(Math.round(g.x)-1,Math.round(g.y)-1,3,3);c.fillStyle='#fff';c.fillRect(Math.round(g.x),Math.round(g.y)-1,1,1);}
  const items=[];for(const p of roomProps(room))items.push({y:p.y,f:()=>drawProp(p)});for(const e of enemies)items.push({y:e.y,f:()=>e.isBoss?drawBoss(e):drawEnemy(e)});items.push({y:P.y,f:drawPlayer});items.sort((a,b)=>a.y-b.y);for(const it of items)it.f();
  drawSpellFx();vfxDraw(c);
  for(const q of eshots){glow(q.x,q.y,q.r+4,q.col,.6);c.fillStyle=q.col;c.beginPath();c.arc(q.x,q.y,q.r,0,TAU);c.fill();c.fillStyle='#fff';c.fillRect(Math.round(q.x)-1,Math.round(q.y)-1,2,2);}
  for(const p of parts){c.fillStyle=p.c;c.globalAlpha=Math.min(1,p.t*3);c.fillRect(Math.round(p.x),Math.round(p.y),p.s,p.s);}c.globalAlpha=1;
  for(const x of texts){c.globalAlpha=Math.min(1,x.t*3);text(x.s,x.x,x.y,x.c,7,'center',SMALL,500);}c.globalAlpha=1;
  c.restore();
  if(dark>0){c.fillStyle='rgba(10,0,24,'+Math.min(.45,dark*.09)+')';c.fillRect(0,0,W,H);}
  if(fade>0){c.fillStyle='rgba(7,4,15,'+Math.min(1,fade/.35)+')';c.fillRect(0,0,W,H);}
  if(flash>0){c.fillStyle='rgba(255,90,100,'+Math.min(.35,flash*2)+')';c.fillRect(0,0,W,H);}
  drawHUD();
  if(bannerT>0){const a=Math.min(1,bannerT*2);c.globalAlpha=a;c.fillStyle='rgba(7,4,15,.6)';c.fillRect(0,100,W,34);text(banner,240,123,'#f1e8d4',16,'center',FONT);c.globalAlpha=1;}
  if(stick.on&&stick.moved){const r=cv.getBoundingClientRect(),k=W/r.width,ox=(stick.ox-r.left)*k,oy=(stick.oy-r.top)*k;c.globalAlpha=.35;c.strokeStyle='#fff';c.lineWidth=1.5;c.beginPath();c.arc(ox,oy,22,0,TAU);c.stroke();c.fillStyle='#fff';c.beginPath();c.arc(ox+stick.x*22,oy+stick.y*22,8,0,TAU);c.fill();c.globalAlpha=1;}
}

/* ---------- input, sizing and integration with the main loop ---------- */
function onKey(e){if(S.mode!=='hunt')return;const k=e.key.length===1?e.key.toLowerCase():e.key;keys[k]=e.type==='keydown';if(e.type==='keydown'&&k==='Escape')showPause();if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(k))e.preventDefault();}
function fit(){if(!box)return;const pw=innerWidth-32,ph=innerHeight;box.style.setProperty('--s',Math.max(.5,Math.min(pw/480,ph/270)).toFixed(4));}
function initHunt(){
  if(inited)return;inited=true;
  root=$('hunt');cv=$('hcv');box=$('hbox');panel=$('hpanel');hmute=$('hmute');hmenu=$('hmenu');
  setShake(v=>{shake=Math.max(shake,v);});
  cv.width=W*R;cv.height=H*R;c=cv.getContext('2d');c.setTransform(R,0,0,R,0,0);c.imageSmoothingEnabled=false;
  addEventListener('keydown',onKey);addEventListener('keyup',onKey);addEventListener('resize',fit);
  cv.addEventListener('pointerdown',e=>{wakeAudio();if(stick.id!==null)return;stick.id=e.pointerId;stick.ox=e.clientX;stick.oy=e.clientY;stick.x=stick.y=0;stick.on=true;stick.t0=performance.now();stick.moved=false;try{cv.setPointerCapture(e.pointerId);}catch(_){}});
  cv.addEventListener('pointermove',e=>{if(e.pointerId!==stick.id)return;let dx=e.clientX-stick.ox,dy=e.clientY-stick.oy;const l=Math.hypot(dx,dy),Rr=Math.max(34,innerHeight*.12);if(l>7)stick.moved=true;if(l>Rr){stick.ox+=dx/l*(l-Rr);stick.oy+=dy/l*(l-Rr);dx=dx/l*Rr;dy=dy/l*Rr;}stick.x=dx/Rr;stick.y=dy/Rr;});
  const endStick=e=>{if(e.pointerId!==stick.id)return;stick.id=null;stick.on=false;stick.x=stick.y=0;};
  cv.addEventListener('pointerup',endStick);cv.addEventListener('pointercancel',endStick);cv.addEventListener('contextmenu',e=>e.preventDefault());
  hmenu.onclick=()=>showPause();
  const paintMute=()=>{hmute.textContent=snd.muted?'♪ off':'♪ on';};paintMute();
  hmute.onclick=()=>{snd.muted=!snd.muted;try{localStorage.setItem('ea-mute',snd.muted?'1':'0');}catch(e){}wakeAudio();applyMuteToMusic();paintMute();};
  fit();
}
/** called by the village: show the hunt board over everything */
export function enterHunt(opts){
  exitFn=opts.exit;initHunt();
  S.mode='hunt';S.hub=false;root.hidden=false;const wrap=$('wrap');if(wrap)wrap.style.visibility='hidden';fit();
  const mb=$('mute');if(mb)mb.hidden=true;
  board=[];if(opts.daily){const d=dailyBoss();startHunt(d.bi,true);}else showSanctum();
}
export function huntStep(dt){if(!root||root.hidden)return;dt=Math.min(.05,dt);update(dt);draw();}
const bossTheme=bi=>bi;
function roomMusic(){
  if(!room||scene==='sanctum')return;
  if(locked){if(room.kind==='boss')setMusic('elite',bossTheme(hunting.id),3);else if(room.kind==='guard')setMusic('elite',room.id+3,3);else setMusic('battle',room.id+roomsCleared,dark>=3?3:2);}
  else setMusic('camp',room.id);
}
if(typeof window!=='undefined')window.__hunt={enter:id=>{const n=world.cells[id];n.unsealed=true;enterRoom(n,null);},step:dt=>{update(dt);},start:(bi,dl)=>startHunt(bi,dl),state:()=>({scene,locked,stage,hp:P&&P.hp,max:P&&P.max,spells:spells&&spells.map(s=>s.id),E:enemies,ES:eshots,P,room,world,keys:keysHeld,dark,stats:stat,hunting:hunting&&hunting.id,dust:P&&P.dust}),bot:(ix,iy)=>{keys.__bx=ix;keys.__by=iy;},go:d=>tryGo(d),give:id=>addSpell(id),mod:(id,k,n=1)=>{const s=spells.find(q=>q.id===id);for(let i=0;i<n;i++)applyMod(s,k);},skip:()=>{if(locked){waveT=0.01;if(boss)boss.hp=1;}},meta:()=>meta.hunt,sanctum:()=>showSanctum(),setKeys:n=>{keysHeld=n;},mimic:()=>{room.used=true;room.cleared=false;spawnMimic();},open:()=>enterHunt({exit(){}})};
