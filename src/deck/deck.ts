// @ts-nocheck
/* Deck mode (prototype 2): a turn-based tarot duel. Wizard on the left, boss on the right. Spells are cards that cost mana; tarot cards are one-use
   run items with an Upright and a Reversed effect. What makes it its own game:
   - Moon phases: mana arrives on a four-turn cycle (3, 5, 3, 2) and unspent mana carries over, so you plan around the full moon.
   - Your hand persists (draw 2 a turn, nothing is discarded at end of turn, hand of 7), so you build up a turn over several turns.
   - Elemental reactions: casting a different element than the one marked on the boss triggers a reaction (Fire then Frost = Steam). Defensive
     spells carry elements too, so alternating elements is the combo.
   - Wards decay by half each turn instead of vanishing.
   - The boss's next three moves are shown as a fate row of cards, and some tarot cards bend it.
   Self-contained on its own 480x270 canvas (#dcv); borrows the main game's art, music, wizards and bosses. */
import { meta, saveMeta, WIZARDS } from '../data/meta';
import { BOSSES as MB, BOSS_EL } from '../data/bossList';
import { R, SPRITE_OVERRIDES, WIZ_ANIM, WIZ_SETS, blit, blitSprite, bossFrames, clipFrame } from '../render/sprites';
import { fxExplosion, fxHeal, fxIce, fxImpact, fxLightning, setShake, vfxClear, vfxDraw, vfxStep } from '../hunt/vfx';
import { setMusic, sfx, wakeAudio } from '../core/audio';
import { S } from '../core/state';

const W=480,H=270,TRAY=170,STAGES=7,HANDMAX=7,MANAMAX=10;
const FONT='"Pixelify Sans","Courier New",monospace',SMALL='"VT323","Courier New",monospace',TAU=Math.PI*2;
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)],clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const BASE=()=>import.meta.env.BASE_URL,$=id=>document.getElementById(id);
let root,cv,c,box,inited=false,exitFn=null,hw=null;
const WX=100,WY=128,BX=372,BY=112;

/* ---------- elements, reactions, spells ---------- */
const EL={fire:{n:'Fire',col:'#ff9a5a',icon:'el_fire'},frost:{n:'Frost',col:'#8fdcf0',icon:'el_frost'},storm:{n:'Storm',col:'#f0dc55',icon:'el_storm'},earth:{n:'Earth',col:'#8fe06a',icon:'el_thorn'},arcane:{n:'Arcane',col:'#c9a0ff',icon:'spell_bolt'}};
const REACT={
  'fire+frost':{n:'Steam',t:'8 damage and strips the boss ward',fn:()=>{dmg(8,'#ffffff',{react:1});boss.ward=0;}},
  'fire+storm':{n:'Overload',t:'12 damage',fn:()=>dmg(12,'#ffd27a',{react:1})},
  'earth+fire':{n:'Ember Bloom',t:'Burn 3 for 3 turns',fn:()=>{boss.burn={d:3,t:3};}},
  'frost+storm':{n:'Superconduct',t:'Boss takes +50% for 2 turns',fn:()=>{boss.vuln=2;}},
  'earth+frost':{n:'Rime',t:'Boss deals -30% for 2 turns',fn:()=>{boss.weak=2;}},
  'earth+storm':{n:'Grounding',t:'+2 mana and draw 1',fn:()=>{gain(2);drawN(1);}},
};
const rkey=(a,b)=>[a,b].sort().join('+');
const reactOf=el=>el&&boss&&boss.mark&&boss.mark!==el?REACT[rkey(boss.mark,el)]:null;
/* kind: atk | def | util, pw: rough power for the bot */
const CARDS={
  bolt:{n:'Arcane Bolt',el:null,cost:1,icon:'spell_bolt',kind:'atk',pw:6,s:'6 dmg',t:'Deal 6 damage. No element.',fn:()=>atk(6)},
  meditate:{n:'Meditate',el:null,cost:1,icon:'gear_sage',kind:'util',pw:4,s:'draw 2',t:'Draw 2 cards.',fn:()=>drawN(2)},
  moonwell:{n:'Moonwell',el:null,cost:1,icon:'gear_moon',kind:'util',pw:5,s:'+3 mana',t:'Gain 3 mana.',fn:()=>gain(3)},
  firebolt:{n:'Firebolt',el:'fire',cost:1,icon:'el_fire',kind:'atk',pw:7,s:'7 dmg',t:'Deal 7 damage.',fn:()=>atk(7)},
  fireball:{n:'Fireball',el:'fire',cost:2,icon:'spell_meteor',kind:'atk',pw:12,s:'12 dmg',t:'Deal 12 damage.',fn:()=>atk(12)},
  immolate:{n:'Immolate',el:'fire',cost:2,icon:'gear_brim',kind:'atk',pw:12,s:'4 + burn',t:'Deal 4 damage and burn the boss for 4 a turn, 3 turns.',fn:()=>{atk(4,1,()=>{boss.burn={d:4,t:3};});}},
  inferno:{n:'Inferno',el:'fire',cost:4,icon:'gear_ember',kind:'atk',pw:26,s:'26 dmg',t:'Deal 26 damage.',fn:()=>atk(26)},
  emberward:{n:'Ember Ward',el:'fire',cost:2,icon:'gear_phoenix',kind:'def',pw:8,s:'ward 6, 4 dmg',t:'Gain 6 ward and deal 4 damage.',fn:()=>{ward(6);atk(4);}},
  shard:{n:'Frost Shard',el:'frost',cost:1,icon:'el_frost',kind:'atk',pw:6,s:'5 dmg, draw 1',t:'Deal 5 damage and draw a card.',fn:()=>{atk(5);drawN(1);}},
  icewall:{n:'Ice Wall',el:'frost',cost:2,icon:'spell_ward',kind:'def',pw:10,s:'ward 11',t:'Gain 11 ward.',fn:()=>ward(11)},
  blizzard:{n:'Blizzard',el:'frost',cost:3,icon:'spell_beam',kind:'atk',pw:14,s:'4 x 4 dmg',t:'Four hits of 4 damage.',fn:()=>atk(4,4)},
  glacier:{n:'Glacier',el:'frost',cost:3,icon:'gear_frostmantle',kind:'def',pw:14,s:'ward 14, 6 dmg',t:'Gain 14 ward and deal 6 damage.',fn:()=>{ward(14);atk(6);}},
  spark:{n:'Spark',el:'storm',cost:1,icon:'el_storm',kind:'atk',pw:5,s:'4 dmg, +1 mana',t:'Deal 4 damage and gain 1 mana.',fn:()=>{atk(4);gain(1);}},
  chain:{n:'Chain Lightning',el:'storm',cost:2,icon:'spell_orbit',kind:'atk',pw:12,s:'3 x 4 dmg',t:'Three hits of 4 damage.',fn:()=>atk(4,3)},
  thunder:{n:'Thunderclap',el:'storm',cost:3,icon:'gear_stormrobe',kind:'atk',pw:16,s:'16 dmg',t:'Deal 16 damage.',fn:()=>atk(16)},
  tempest:{n:'Tempest',el:'storm',cost:4,icon:'spell_nova',kind:'atk',pw:25,s:'4 x 6 dmg',t:'Four hits of 6 damage.',fn:()=>atk(6,4)},
  stoneskin:{n:'Stoneskin',el:'earth',cost:1,icon:'gear_mossy',kind:'def',pw:7,s:'ward 7',t:'Gain 7 ward.',fn:()=>ward(7)},
  thornwall:{n:'Thornwall',el:'earth',cost:2,icon:'el_thorn',kind:'def',pw:9,s:'ward 8, thorns 4',t:'Gain 8 ward. Attackers take 4 until your next turn.',fn:()=>{ward(8);P.thorns=4;}},
  entangle:{n:'Entangle',el:'earth',cost:2,icon:'spell_trap',kind:'atk',pw:9,s:'3 dmg, weaken',t:'Deal 3 damage. The boss deals -30% for 2 turns.',fn:()=>{atk(3,1,()=>{boss.weak=Math.max(boss.weak,2);});}},
  mend:{n:'Mend',el:'earth',cost:2,icon:'gear_heart',kind:'def',pw:8,s:'heal 8',t:'Restore 8 health.',fn:()=>heal(8)},
  verdant:{n:'Verdant Surge',el:'earth',cost:3,icon:'gear_sage',kind:'def',pw:13,s:'heal 6, ward 9',t:'Restore 6 health and gain 9 ward.',fn:()=>{heal(6);ward(9);}},
};
const START=['firebolt','firebolt','shard','shard','spark','spark','stoneskin','stoneskin','bolt','meditate'];
const WEIGHT={bolt:2,meditate:2,moonwell:2,firebolt:2,fireball:3,immolate:2.5,inferno:1.2,emberward:2,shard:2,icewall:3,blizzard:2,glacier:1.5,spark:2,chain:3,thunder:2,tempest:1.2,stoneskin:2,thornwall:2.5,entangle:2.5,mend:2,verdant:1.5};

/* ---------- tarot: one-use run items, each with an Upright and a Reversed effect ---------- */
const TAROT={
  fool:{n:'The Fool',num:0,icon:'gear_fool',u:{t:'Throw away your hand and draw 5.',fn:()=>{for(const h of hand)disc.push(h);hand=[];drawN(5);}},r:{t:'Draw 3, gain 3 mana, take 5 damage.',fn:()=>{drawN(3);gain(3);selfHit(5);}}},
  magician:{n:'The Magician',num:'I',icon:'gear_eighth',u:{t:'Your next spell is cast twice.',fn:()=>{echo=1;}},r:{t:'Your next 3 spells cost 1 less. Lose 4 health.',fn:()=>{cheap=3;selfHit(4);}}},
  priestess:{n:'The High Priestess',num:'II',icon:'gear_moon',u:{t:'Cancel the boss\'s next move.',fn:()=>cancel(1)},r:{t:'Cancel its next two moves. Lose 8 health.',fn:()=>{cancel(2);selfHit(8);}}},
  empress:{n:'The Empress',num:'III',icon:'gear_heart',u:{t:'Restore 12 health.',fn:()=>heal(12)},r:{t:'Restore 24 health, but discard your hand.',fn:()=>{heal(24);for(const h of hand)disc.push(h);hand=[];}}},
  emperor:{n:'The Emperor',num:'IV',icon:'gear_crown',u:{t:'Gain 12 ward.',fn:()=>ward(12)},r:{t:'Gain 26 ward, lose all mana.',fn:()=>{ward(26);mana=0;}}},
  lovers:{n:'The Lovers',num:'VI',icon:'gear_pearl',u:{t:'Copy a random spell in your hand.',fn:()=>{if(hand.length&&hand.length<HANDMAX){hand.push(newCard(pick(hand).d));}}},r:{t:'Copy every spell in hand. The boss gains 10 ward.',fn:()=>{for(const h of hand.slice())if(hand.length<HANDMAX)hand.push(newCard(h.d));boss.ward+=10;}}},
  chariot:{n:'The Chariot',num:'VII',icon:'gear_pilgrim',u:{t:'Gain 3 mana and draw 2.',fn:()=>{gain(3);drawN(2);}},r:{t:'Gain 6 mana. Take 6 damage.',fn:()=>{gain(6);selfHit(6);}}},
  strength:{n:'Strength',num:'VIII',icon:'gear_whetstone',u:{t:'Your spells deal +50% this turn.',fn:()=>{boost=1.5;}},r:{t:'Your spells deal +100% this turn. Take 6.',fn:()=>{boost=2;selfHit(6);}}},
  wheel:{n:'Wheel of Fortune',num:'X',icon:'gear_hourglass',u:{t:'Re-roll the boss\'s fate row.',fn:()=>{boss.intents=[];fillIntents();}},r:{t:'Bring on the full moon: +5 mana now.',fn:()=>{gain(5);moonI=1;}}},
  justice:{n:'Justice',num:'XI',icon:'gear_penny',u:{t:'Boss loses 30% of the health you have lost (at least 6).',fn:()=>dmg(Math.max(6,Math.round((P.max-P.hp)*.3)),'#ffd27a',{raw:1})},r:{t:'You and the boss both lose 10.',fn:()=>{dmg(10,'#ffd27a',{raw:1});selfHit(10);}}},
  hanged:{n:'The Hanged Man',num:'XII',icon:'gear_hood',u:{t:'End your turn. Next turn gain +4 mana.',fn:()=>{bonusMana=4;later(.45,()=>{busy=0;endTurn();});}},r:{t:'Gain 8 mana now, but skip your next draw.',fn:()=>{gain(8);skipDraw=1;}}},
  death:{n:'Death',num:'XIII',icon:'el_bone',u:{t:'Deal 25% of the boss\'s maximum health.',fn:()=>dmg(boss.max*.25,'#e9e3cb',{raw:1})},r:{t:'Deal 40% of its maximum health. Lose 25% of yours.',fn:()=>{dmg(boss.max*.4,'#e9e3cb',{raw:1});selfHit(Math.round(P.hp*.25));}}},
  devil:{n:'The Devil',num:'XV',icon:'gear_cursedeye',u:{t:'Lose 8 health. The boss takes +50% for 3 turns.',fn:()=>{selfHit(8);boss.vuln=3;}},r:{t:'Lose 8. The boss takes +50% and deals -30% for 3 turns.',fn:()=>{selfHit(8);boss.vuln=3;boss.weak=3;}}},
  tower:{n:'The Tower',num:'XVI',icon:'gear_brim',u:{t:'Cancel the boss\'s next move and deal 12.',fn:()=>{cancel(1);dmg(12,'#ffd27a',{raw:1});}},r:{t:'Deal 30. Take 10.',fn:()=>{dmg(30,'#ffd27a',{raw:1});selfHit(10);}}},
  star:{n:'The Star',num:'XVII',icon:'gear_stars',u:{t:'Your next spell costs 0.',fn:()=>{freeN=1;}},r:{t:'Your next 2 spells cost 0. Lose 4 health.',fn:()=>{freeN=2;selfHit(4);}}},
  sun:{n:'The Sun',num:'XIX',icon:'gear_ember',u:{t:'Restore 8 health and gain 2 mana.',fn:()=>{heal(8);gain(2);}},r:{t:'Restore 16 health. The boss gains 12 ward.',fn:()=>{heal(16);boss.ward+=12;}}},
  judgement:{n:'Judgement',num:'XX',icon:'gear_eclipse',u:{t:'Return 2 random spells from the discard to your hand.',fn:()=>{for(let i=0;i<2&&disc.length&&hand.length<HANDMAX;i++){hand.push(disc.splice(Math.floor(Math.random()*disc.length),1)[0]);}}},r:{t:'Shuffle the discard into the draw pile and draw 3. Take 4.',fn:()=>{draw=shuffle(draw.concat(disc));disc=[];drawN(3);selfHit(4);}}},
};

/* ---------- art helpers ---------- */
const IMG={};
function icon(n){if(!IMG[n]){const i=new Image();i.src=BASE()+'assets/icons/'+n+'.png';IMG[n]=i;}return IMG[n];}
const clipOf=a=>{const id=hw?hw.id:'raven',A=id==='raven'?(SPRITE_OVERRIDES.anim&&SPRITE_OVERRIDES.anim.arena):WIZ_ANIM[id];return A&&A[a]&&A[a].east;};
function wizSprite(){
  const id=hw?hw.id:'raven',cast=clipOf('cast'),idle=clipOf('idle'),hurt=clipOf('hurt');
  if(P.castT>0&&cast)return clipFrame(cast,Math.min(.5,.5-P.castT));
  if(P.hitT>0&&hurt)return clipFrame(hurt,Math.min(.4,.4-P.hitT));
  if(idle)return clipFrame(idle,t);
  if(id==='raven')return SPRITE_OVERRIDES.wizardDirs&&SPRITE_OVERRIDES.wizardDirs.east;const set=WIZ_SETS[id];return set&&set.dirs.east;
}
function glow(x,y,r,col,a){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');c.globalAlpha=a;c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.globalAlpha=1;}
function text(s,x,y,col='#f1e8d4',size=8,align='center',font=FONT,weight=700){c.font=`${weight} ${size}px ${font}`;c.textAlign=align;c.fillStyle='#07040f';c.fillText(s,x+.7,y+.7);c.fillStyle=col;c.fillText(s,x,y);}
function wrap(s,n){const w=s.split(' '),L=[];let l='';for(const x of w){if((l+' '+x).trim().length>n){L.push(l);l=x;}else l=(l+' '+x).trim();}if(l)L.push(l);return L;}
const popups=[];const pop=(s,x,y,col='#fff',big)=>popups.push({s,x,y,t:1,col,big});

/* ---------- run and fight state ---------- */
const MOON=[{n:'Waxing',g:3},{n:'Full',g:5},{n:'Waning',g:3},{n:'New',g:2}];
let scene='title',phase='player',run=null,P=null,boss=null,mana=0,draw=[],disc=[],hand=[],turn=0,moonI=0,echo=0,cheap=0,freeN=0,boost=1,bonusMana=0,skipDraw=0,sel=null,busy=0;
let timeline=[],projs=[],shake=0,t=0,sceneT=0,offer=[],paused=false,tally=null,uid=1,msg='',msgT=0,curEl=null;
const HIT=[],newCard=d=>({d,id:uid++,age:0});
function later(d,fn){timeline.push({t:d,fn});}
const banner=(s,n=1.2)=>{msg=s;msgT=n;};

function startRun(){
  hw=WIZARDS.find(w=>w.id===meta.lastWizard)||WIZARDS[0];
  const pool=shuffle(MB.map((b,i)=>i).filter(i=>!MB[i].elite)),order=pool.slice(0,STAGES-1);order.push(pick(MB.map((b,i)=>i).filter(i=>MB[i].elite)));
  run={stage:0,hp:50,max:50,deck:START.map(newCard),tarot:[pick(Object.keys(TAROT))],order,kills:0};
  nextFight();
}
const POOLS={fire:['strike','strike','heavy','burn','flurry','guard'],poison:['strike','burn','burn','heavy','guard','drain'],frost:['strike','hex','guard','heavy','hex','flurry'],mirror:['strike','hex','guard','heavy','hex','drain'],storm:['flurry','flurry','strike','heavy','guard','hex'],sound:['flurry','strike','hex','heavy','guard','flurry'],thorn:['strike','drain','drain','guard','heavy','flurry'],blood:['strike','drain','heavy','drain','flurry','enrage'],bone:['strike','enrage','heavy','guard','drain','flurry'],void:['hex','strike','heavy','enrage','burn','guard']};
function nextFight(){
  const bi=run.order[run.stage],m=MB[bi],fin=run.stage===STAGES-1,hp=Math.round((48+run.stage*15)*(fin?1.35:1));
  boss={bi,name:m.name,num:m.num,col:m.color,bg:m.bg,el:BOSS_EL[bi]||'void',hp,max:hp,ward:0,mark:null,burn:null,weak:0,vuln:0,str:0,intents:[],pool:POOLS[BOSS_EL[bi]]||['strike','strike','flurry','heavy','guard','hex'],fin,lunge:0,flash:0};
  P={hp:run.hp,max:run.max,ward:0,thorns:0,weak:0,burn:null,castT:0,hitT:0,flash:0};
  timeline=[];projs=[];popups.length=0;vfxClear();sel=null;hand=[];disc=[];draw=shuffle(run.deck.slice());mana=0;turn=0;moonI=0;echo=0;cheap=0;freeN=0;boost=1;bonusMana=0;skipDraw=0;
  fillIntents();scene='shuffle';sceneT=0;setMusic('draw',run.stage,2);sfx.shuffle();
}
function beginFight(){scene='fight';sceneT=0;phase='player';drawN(4,true);startTurn(true);setMusic(boss.fin?'elite':'battle',boss.bi,boss.fin?3:2);banner(boss.name,1.6);}

/* ---------- the boss's fate row ---------- */
const ILAB={strike:'Strike',flurry:'Flurry',heavy:'Crush',guard:'Guard',hex:'Hex',burn:'Scorch',drain:'Drain',enrage:'Enrage'};
const ICOL={strike:'#ff7a6e',flurry:'#ff7a6e',heavy:'#ff4a3a',guard:'#7fb8ff',hex:'#c9a0ff',burn:'#ff9a5a',drain:'#8fe06a',enrage:'#ffd27a'};
function mkIntent(k){const s=run.stage,f=boss.fin?1.1:1;
  const v={strike:5.5+1.2*s,flurry:2+.5*s,heavy:11+2.2*s,guard:6+2*s,hex:3.5+.9*s,burn:3.5+.7*s,drain:4.5+1*s,enrage:0}[k]*f;return {k,v:Math.round(v),n:k==='flurry'?3:1};}
function fillIntents(){
  while(boss.intents.length<3){const last=boss.intents.slice(-2).map(i=>i.k);let k,g=0;do{k=pick(boss.pool);}while(g++<12&&((last.length===2&&last[0]===k&&last[1]===k)||(k==='heavy'&&last[last.length-1]==='heavy')));boss.intents.push(mkIntent(k));}
}
const intDmg=i=>Math.max(1,Math.round((i.v+boss.str)*(boss.weak>0?.7:1)));
function cancel(n){for(let i=0;i<n;i++)if(boss.intents[i])boss.intents[i].cancel=true;}

/* ---------- effects ---------- */
function dmg(base,col,o={}){
  if(!boss||boss.hp<=0)return;let d=base*(o.raw||o.react?1:boost)*(P.weak>0&&!o.raw?.7:1)*(boss.vuln>0?1.5:1);d=Math.round(d);
  if(boss.ward>0&&!o.pierce){const a=Math.min(boss.ward,d);boss.ward-=a;d-=a;if(a)pop('-'+a+' ward',BX,BY-40,'#7fb8ff');}
  boss.hp=Math.max(0,boss.hp-d);boss.flash=.15;if(d)pop(String(d),BX+rnd(-16,16),BY-30,col||'#fff',1);fxImpact(BX+rnd(-14,14),BY+rnd(-16,16),col||'#ffe9a0',rnd(0,TAU));sfx.strike();
  if(boss.hp<=0)win();
}
function selfHit(n){hurtP(n,true);}
function hurtP(n,direct){
  if(!P||P.hp<=0)return;
  if(!direct&&P.thorns){dmg(P.thorns,'#8fe06a',{raw:1,pierce:1});}
  if(!direct&&P.ward>0){const a=Math.min(P.ward,n);P.ward-=a;n-=a;pop('-'+a+' ward',WX,WY-60,'#7fb8ff');sfx.block();}
  if(n>0){P.hp=Math.max(0,P.hp-n);P.hitT=.4;P.flash=.15;shake=Math.max(shake,3+n*.2);pop('-'+n,WX+rnd(-8,8),WY-56,'#ff5a4a',1);sfx.hurt();fxImpact(WX,WY-24,'#ff7a6e',rnd(0,TAU));}
  if(P.hp<=0&&scene==='fight')lose();
}
function ward(n){P.ward+=n;pop('+'+n+' ward',WX,WY-62,'#7fb8ff');fxHeal(WX,WY-24,'mana');sfx.shield();}
function heal(n){P.hp=Math.min(P.max,P.hp+n);pop('+'+n,WX,WY-62,'#8fe06a');fxHeal(WX,WY-24,'heal');}
function gain(n){mana=Math.min(MANAMAX,mana+n);pop('+'+n+' mana',WX+10,WY-50,'#9ad0ff');}
function drawN(n,quiet){
  for(let i=0;i<n;i++){
    if(!draw.length){if(!disc.length)break;draw=shuffle(disc);disc=[];if(!quiet){pop('reshuffle',WX,WY+10,'#dcb868');sfx.shuffle();}}
    const cd=draw.pop();if(hand.length>=HANDMAX){disc.push(cd);continue;}cd.age=0;hand.push(cd);if(!quiet)sfx.card();
  }
}
/** a projectile from the wizard that lands as `hits` separate strikes */
function atk(n,hits=1,after){
  const el=curEl,col=EL[el||'arcane'].col;
  for(let i=0;i<hits;i++)later(.05+i*.14,()=>{projs.push({x:WX+24,y:WY-30,tx:BX,ty:BY-6+rnd(-12,12),t:0,col,fn:()=>{dmg(n,col);if(el==='fire'&&i===0&&n>=12)fxExplosion(BX,BY,.6);if(el==='storm')fxLightning(BX+rnd(-10,10),BY+10);if(el==='frost'&&i===0)fxIce(BX,BY+10,'nova',.4);if(i===hits-1&&after)after();}});});
  sfx.cast();
}

/* ---------- turns ---------- */
function startTurn(first){
  turn++;phase='player';boost=1;
  if(!first){P.ward=Math.floor(P.ward/2);P.thorns=0;}
  const g=MOON[moonI%4].g+bonusMana;bonusMana=0;gain(g);moonI++;
  if(P.weak>0)P.weak--;
  if(P.burn){hurtP(P.burn.d,true);pop('burn',WX+14,WY-44,'#ff9a5a');P.burn.t--;if(P.burn.t<=0)P.burn=null;}
  if(P.hp<=0)return;
  if(!first){if(skipDraw){skipDraw=0;}else drawN(2);}
  sel=null;
}
function endTurn(){
  if(scene!=='fight'||phase!=='player'||busy>0)return;sel=null;phase='enemy';
  later(.45,()=>{
    const it=boss.intents.shift();boss.lunge=.5;
    later(.22,()=>{if(boss.hp<=0)return;if(it.cancel){pop('cancelled',BX,BY-50,'#dcb868');}else bossDo(it);});
    later(.95,()=>{
      if(boss.hp<=0||P.hp<=0)return;
      if(boss.burn){dmg(boss.burn.d,'#ff9a5a',{raw:1,pierce:1});boss.burn.t--;if(boss.burn.t<=0)boss.burn=null;}
      if(boss.weak>0)boss.weak--;if(boss.vuln>0)boss.vuln--;
      fillIntents();if(boss.hp>0)startTurn();
    });
  });
}
function bossDo(it){
  const d=intDmg(it);
  switch(it.k){
    case 'strike':case 'heavy':hurtP(d);if(it.k==='heavy')shake=Math.max(shake,6);break;
    case 'flurry':for(let i=0;i<it.n;i++)later(i*.14,()=>hurtP(d));break;
    case 'guard':boss.ward+=it.v;pop('+'+it.v+' ward',BX,BY-40,'#7fb8ff');sfx.shield();break;
    case 'hex':hurtP(d);P.weak=2;pop('weakened',WX,WY-72,'#c9a0ff');break;
    case 'burn':hurtP(d);P.burn={d:3,t:3};pop('burning',WX,WY-72,'#ff9a5a');break;
    case 'drain':hurtP(d);boss.hp=Math.min(boss.max,boss.hp+d);pop('+'+d,BX,BY-40,'#8fe06a');break;
    case 'enrage':boss.str+=2;pop('stronger',BX,BY-40,'#ffd27a');sfx.rage();break;
  }
}
function win(){
  if(scene!=='fight')return;scene='won';sceneT=0;timeline=[];projs=[];run.max+=4;run.hp=Math.min(run.max,P.hp+14);run.kills++;
  fxExplosion(BX,BY,1.4);shake=8;sfx.win();
}
function lose(){scene='end';sceneT=0;timeline=[];finishRun(false);setMusic('defeat',0);sfx.lose();}
function finishRun(win){
  const g=win?12:run.kills*2;meta.shards=(meta.shards||0)+g;
  meta.deck=meta.deck||{best:0,wins:0};meta.deck.best=Math.max(meta.deck.best||0,run.kills);if(win)meta.deck.wins=(meta.deck.wins||0)+1;saveMeta();tally={win,g,kills:run.kills};
}
function makeOffer(){
  const ids=Object.keys(CARDS),w=ids.map(i=>WEIGHT[i]||1),out=[];
  while(out.length<3){let r=Math.random()*w.reduce((a,b)=>a+b,0),j=0;while(r>w[j]){r-=w[j];j++;}const d=ids[j];if(out.some(o=>o.spell&&o.spell.d===d))continue;out.push({spell:newCard(d)});}
  if(run.tarot.length<3){const left=Object.keys(TAROT).filter(i=>!run.tarot.includes(i));out.push({tarot:pick(left)});}
  offer=out;
}
function goReward(){
  if(run.stage>=STAGES-1){scene='end';sceneT=0;finishRun(true);setMusic('victory',0);return;}
  scene='reward';sceneT=0;makeOffer();setMusic('reward',run.stage);sfx.shuffle();
}

/* ---------- player actions ---------- */
function costOf(cd){const d=CARDS[cd.d];if(freeN>0)return 0;return Math.max(0,d.cost-(cheap>0?1:0));}
function cast(i){
  if(scene!=='fight'||phase!=='player'||busy>0||paused)return;const cd=hand[i];if(!cd)return;const d=CARDS[cd.d],cost=costOf(cd);
  if(mana<cost){pop('need '+cost+' mana',WX,WY-62,'#ff7a6e');return;}
  mana-=cost;if(freeN>0)freeN--;else if(cheap>0)cheap--;
  hand.splice(i,1);disc.push(cd);sel=null;P.castT=.5;busy=.38;sfx.card();
  const go=()=>{curEl=d.el;const r=reactOf(d.el);d.fn();
    if(d.el){if(r){const el=d.el;later(.34,()=>{if(boss&&boss.hp>0){r.fn();pop(r.n.toUpperCase()+'!',BX,BY-56,EL[el].col,1);fxExplosion(BX,BY-4,.5);shake=Math.max(shake,3);}});}boss.mark=d.el;}};
  go();if(echo>0){echo--;later(.5,()=>{curEl=d.el;pop('echo',WX,WY-72,'#ffd27a');d.fn();});}
}
function useTarot(i,rev){
  if(scene!=='fight'||phase!=='player'||busy>0)return;const id=run.tarot[i],d=TAROT[id];if(!d)return;
  run.tarot.splice(i,1);sel=null;busy=.4;P.castT=.5;sfx.pick();pop(d.n+(rev?' (reversed)':''),240,70,'#ffd27a',1);fxHeal(WX,WY-24,'mana');(rev?d.r:d.u).fn();
}

/* ---------- drawing ---------- */
function drawCard(cd,x,y,w,h,o={}){
  const d=CARDS[cd.d],el=EL[d.el||'arcane'],k=w/58;c.save();c.translate(x,y);c.scale(k,k);const ww=58,hh=h/k,afford=o.afford!==false;
  c.fillStyle='#150f26';c.fillRect(0,0,ww,hh);c.strokeStyle=el.col;c.lineWidth=o.sel?2.2:1.3;c.strokeRect(.7,.7,ww-1.4,hh-1.4);
  const g=c.createLinearGradient(0,0,0,hh);g.addColorStop(0,el.col+'44');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(1,1,ww-2,hh-2);
  if(o.sel)glow(ww/2,hh/2,50,el.col,.4);
  const im=icon(d.icon);if(im.complete&&im.naturalWidth){c.imageSmoothingEnabled=false;c.drawImage(im,ww/2-12,10,24,24);}
  const ei=icon(el.icon);if(ei.complete&&ei.naturalWidth&&d.el){c.globalAlpha=.85;c.drawImage(ei,ww-14,2,12,12);c.globalAlpha=1;}
  c.fillStyle=afford?'#3b5bff':'#4a4560';c.beginPath();c.arc(9,9,7,0,TAU);c.fill();c.strokeStyle='#cfe0ff';c.lineWidth=1;c.stroke();text(String(o.cost!=null?o.cost:d.cost),9,12.2,'#fff',9,'center',FONT);
  const nl=wrap(d.n,o.full?14:10);nl.slice(0,2).forEach((s,i)=>text(s,ww/2,44+i*8,'#f1e8d4',7,'center',FONT));
  if(o.full){wrap(d.t,16).slice(0,5).forEach((s,i)=>text(s,ww/2,64+i*7,'#b7a9d6',6.6,'center',SMALL,400));}
  else text(d.s,ww/2,hh-5,el.col,7.4,'center',SMALL);
  if(o.react){c.fillStyle='#ffd27a';c.beginPath();c.arc(ww-6,hh-12,4,0,TAU);c.fill();text('!',ww-6,hh-9.4,'#1a0f00',7,'center',FONT);}
  c.restore();
}
function cardBack(x,y,s=1,rot=0){
  c.save();c.translate(x,y);c.rotate(rot);c.scale(s,s);c.fillStyle='#241838';c.fillRect(-20,-28,40,56);c.strokeStyle='#dcb868';c.lineWidth=1;c.strokeRect(-19,-27,38,54);c.strokeStyle='#6a4ca8';c.strokeRect(-16,-24,32,48);
  c.fillStyle='#dcb868';c.beginPath();for(let i=0;i<8;i++){const r=i%2?3.5:8,a=i/8*TAU-Math.PI/2;c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fill();c.restore();
}
function tarotCard(id,x,y,w,h,o={}){
  const d=TAROT[id];c.save();c.translate(x,y);c.fillStyle='#1a1228';c.fillRect(0,0,w,h);c.strokeStyle=o.sel?'#fff2c0':'#dcb868';c.lineWidth=o.sel?2.2:1.4;c.strokeRect(.7,.7,w-1.4,h-1.4);
  c.strokeStyle='#6a4ca8';c.lineWidth=1;c.strokeRect(3.5,3.5,w-7,h-7);
  const im=icon(d.icon),s=o.full?28:Math.min(w-12,h*.42);if(im.complete&&im.naturalWidth){c.imageSmoothingEnabled=false;c.drawImage(im,w/2-s/2,o.full?14:h*.16,s,s);}
  text(String(d.num),w/2,10,'#dcb868',7,'center',FONT);
  if(o.full){wrap(d.n,14).forEach((s2,i)=>text(s2,w/2,54+i*8,'#f1e8d4',7.5,'center',FONT));wrap('Up: '+d.u.t,22).slice(0,3).forEach((s2,i)=>text(s2,w/2,72+i*6.6,'#b7a9d6',6.2,'center',SMALL,400));wrap('Rev: '+d.r.t,22).slice(0,3).forEach((s2,i)=>text(s2,w/2,96+i*6.6,'#ff9aa8',6.2,'center',SMALL,400));}
  c.restore();
}
function bg(){
  const b=boss.bg||['#1f1140','#07040f'],g=c.createLinearGradient(0,0,0,TRAY);g.addColorStop(0,b[0]);g.addColorStop(1,b[1]);c.fillStyle=g;c.fillRect(0,0,W,H);
  c.save();c.globalAlpha=.09;c.fillStyle=boss.col;for(let i=0;i<9;i++){const a=i/9*TAU+t*.04;c.beginPath();c.moveTo(BX,BY);c.lineTo(BX+Math.cos(a)*520,BY+Math.sin(a)*520);c.lineTo(BX+Math.cos(a+.11)*520,BY+Math.sin(a+.11)*520);c.fill();}c.restore();
  c.fillStyle='rgba(8,5,16,.5)';c.beginPath();c.ellipse(WX,WY+4,56,10,0,0,TAU);c.fill();c.beginPath();c.ellipse(BX,BY+44,70,12,0,0,TAU);c.fill();
  c.strokeStyle='rgba(220,184,104,.2)';c.lineWidth=1;c.beginPath();c.moveTo(0,TRAY-.5);c.lineTo(W,TRAY-.5);c.stroke();
}
function drawBoss(){
  const b=boss,off=b.lunge>0?-Math.sin((1-b.lunge/.5)*Math.PI)*34:0,x=Math.round(BX+off),y=Math.round(BY+Math.sin(t*1.8)*3);
  glow(x,y,70,b.col,.28+.07*Math.sin(t*3));
  const fr=bossFrames(b.bi),s=fr&&fr[Math.floor(t*6)%fr.length];
  if(s&&s.img){const im=s.img,k=104/(im.width*(im.hi?1/R:1));if(b.flash>0)c.globalAlpha=.65;c.save();c.translate(x,y);c.scale(k,k);blit(c,0,0,im);c.restore();c.globalAlpha=1;if(b.flash>0)glow(x,y,48,'#fff',.4);}
  else{c.fillStyle=b.col;c.beginPath();c.arc(x,y,36,0,TAU);c.fill();}
  if(b.mark){const el=EL[b.mark];glow(x,y-52,14,el.col,.6);const im=icon(el.icon);if(im.complete&&im.naturalWidth)c.drawImage(im,x-8,y-60,16,16);}
}
function drawPlayer(){
  const lun=P.castT>0?Math.sin((1-P.castT/.5)*Math.PI)*8:0,x=Math.round(WX+lun),y=WY;
  const s=wizSprite();if(P.flash>0)c.globalAlpha=.6;
  if(s)blitSprite(c,s,x,y+6,hw&&hw.id!=='raven'?2.1:2.4);else{c.fillStyle='#8f6cff';c.fillRect(x-8,y-30,16,34);}c.globalAlpha=1;
  if(P.ward>0){c.strokeStyle='#7fb8ff';c.lineWidth=1.5;c.globalAlpha=.55+.2*Math.sin(t*4);c.beginPath();c.ellipse(x,y-24,26,34,0,0,TAU);c.stroke();c.globalAlpha=1;}
  if(P.thorns>0){c.strokeStyle='#8fe06a';c.setLineDash([3,3]);c.beginPath();c.ellipse(x,y-24,31,39,0,t,t+TAU);c.stroke();c.setLineDash([]);}
}
function bar(x,y,w,v,max,col,label){c.fillStyle='#2a1f3d';c.fillRect(x,y,w,7);c.fillStyle=col;c.fillRect(x,y,w*clamp(v/max,0,1),7);c.strokeStyle='#8f7440';c.lineWidth=1;c.strokeRect(x-.5,y-.5,w+1,8);text(label,x+w/2,y+6,'#fff',7,'center',FONT);}
function chip(s,x,y,col){c.font='700 6.5px '+SMALL;const w=c.measureText(s).width+6;c.fillStyle='rgba(7,4,15,.8)';c.fillRect(x,y,w,9);c.strokeStyle=col;c.lineWidth=1;c.strokeRect(x+.5,y+.5,w-1,8);text(s,x+3,y+7,col,7,'left',SMALL,500);return w+3;}
function intentCard(it,x,y,w,h,main){
  const col=ICOL[it.k];c.save();c.globalAlpha=it.cancel?.35:1;c.fillStyle='#150f26';c.fillRect(x,y,w,h);c.strokeStyle=col;c.lineWidth=main?2:1;c.strokeRect(x+.5,y+.5,w-1,h-1);
  const v=it.k==='guard'?it.v:it.k==='enrage'?'+':intDmg(it);const num=it.k==='flurry'?`${v}x${it.n}`:String(v);
  text(num,x+w/2,y+h*.55,col,main?14:9,'center',FONT);text(it.cancel?'cancelled':ILAB[it.k],x+w/2,y+h-3,'#c9bfe0',main?7:6,'center',SMALL);c.restore();
}
function hud(){
  c.fillStyle='rgba(7,4,15,.72)';c.fillRect(0,0,W,16);
  text(`${boss.num}  ${boss.name}`,240,11,'#f1e8d4',9,'center',FONT);text(`Fight ${run.stage+1}/${STAGES}`,26,11,'#a79bc0',8,'left',SMALL);
  HIT.push({x:0,y:0,w:22,h:16,fn:()=>{if(scene==='fight')paused=true;}});text('II',10,11,'#a79bc0',8,'center',FONT);
  // moon phases: the first is the gain that arrives next turn
  for(let i=0;i<4;i++){const m=MOON[(moonI+i)%4],x=396+i*24;c.globalAlpha=i===0?1:.5;c.strokeStyle='#dcb868';c.fillStyle=i===0?'#3a2d5c':'#1b1430';c.beginPath();c.arc(x,8,6,0,TAU);c.fill();c.stroke();text('+'+m.g,x,11,'#ffe9a0',7,'center',SMALL);c.globalAlpha=1;}
  text('mana next:',372,11,'#6a5a8a',7,'right',SMALL);
  // bars and statuses
  bar(40,150,100,P.hp,P.max,'#d0485f',`${P.hp}/${P.max}`);let sx=40;if(P.ward>0)sx+=chip('ward '+P.ward,sx,160,'#7fb8ff');
  if(P.weak>0)sx+=chip('weak '+P.weak,sx,160,'#c9a0ff');if(P.burn)sx+=chip(`burn ${P.burn.d}x${P.burn.t}`,sx,160,'#ff9a5a');if(P.thorns)chip('thorns '+P.thorns,sx,160,'#8fe06a');
  bar(322,150,100,boss.hp,boss.max,boss.hp<boss.max*.4?'#ff5a4a':boss.col,`${boss.hp}/${boss.max}`);
  let bx=322;if(boss.ward>0)bx+=chip('ward '+boss.ward,bx,160,'#7fb8ff');if(boss.burn)bx+=chip(`burn ${boss.burn.d}x${boss.burn.t}`,bx,160,'#ff9a5a');if(boss.weak>0)bx+=chip('weak '+boss.weak,bx,160,'#c9a0ff');if(boss.vuln>0)bx+=chip('vuln '+boss.vuln,bx,160,'#ff9ad8');if(boss.str>0)chip('str +'+boss.str,bx,160,'#ffd27a');
  // fate row
  text('FATE',316,28,'#6a5a8a',7,'left',SMALL);boss.intents.forEach((it,i)=>{const w=i?36:52,h=i?28:40,x=i===0?340:i===1?396:436;intentCard(it,x,i?22:18,w,h,i===0);});
  // tarot column
  run.tarot.forEach((id,i)=>{const x=6,y=30+i*38;tarotCard(id,x,y,28,36,{sel:sel&&sel.k==='t'&&sel.i===i});HIT.push({x,y,w:28,h:36,fn:()=>{if(phase==='player')sel=sel&&sel.k==='t'&&sel.i===i?null:{k:'t',i};}});});
  if(run.tarot.length)text('TAROT',20,27,'#dcb868',6.5,'center',SMALL);
  if(msgT>0){c.globalAlpha=clamp(msgT*2,0,1);text(msg,240,76,'#f1e8d4',14,'center',FONT);c.globalAlpha=1;}
}
function panel(){
  if(phase!=='player'){text('The boss acts...',223,60,'#a79bc0',10,'center',SMALL,400);return;}
  c.fillStyle='rgba(7,4,15,.82)';c.fillRect(138,26,170,116);c.strokeStyle='#5a4a82';c.lineWidth=1;c.strokeRect(138.5,26.5,169,115);
  if(!sel){text('Your turn',223,44,'#dcb868',11,'center',FONT);['Tap a card, then Cast it.','Alternate elements to trigger','reactions (look for the gold !).','Mana carries over between turns.'].forEach((s,i)=>text(s,223,62+i*11,'#a79bc0',8.5,'center',SMALL,400));return;}
  if(sel.k==='s'){const cd=hand[sel.i];if(!cd){sel=null;return;}const d=CARDS[cd.d],el=EL[d.el||'arcane'],cost=costOf(cd),r=reactOf(d.el);
    text(d.n,223,41,el.col,11,'center',FONT);text(`${el.n}  -  cost ${cost}${cost!==d.cost?' (was '+d.cost+')':''}`,223,52,'#9ad0ff',8,'center',SMALL,400);
    wrap(d.t,34).forEach((s,i)=>text(s,223,66+i*9,'#d8cdee',8.5,'center',SMALL,400));
    if(r){text(`Reaction: ${r.n}`,223,100,'#ffd27a',9,'center',FONT);wrap(r.t,34).forEach((s,i)=>text(s,223,110+i*8,'#ffe9a0',8,'center',SMALL,400));}
    else if(d.el&&boss.mark===d.el)text('Same element as the mark: no reaction',223,104,'#8f7aa8',8,'center',SMALL,400);
    const ok=mana>=cost,si=sel.i;c.fillStyle=ok?'#dcb868':'#4a4560';c.fillRect(178,121,90,16);text('Cast',223,133,ok?'#0b0818':'#a79bc0',10,'center',FONT);HIT.push({x:178,y:121,w:90,h:16,fn:()=>cast(si)});}
  else{const id=run.tarot[sel.i],d=TAROT[id];if(!d){sel=null;return;}const si=sel.i;
    text(`${d.num}  ${d.n}`,223,41,'#dcb868',10,'center',FONT);
    wrap('Upright: '+d.u.t,36).forEach((s,i)=>text(s,223,54+i*8,'#d8cdee',8,'center',SMALL,400));
    wrap('Reversed: '+d.r.t,36).forEach((s,i)=>text(s,223,82+i*8,'#ff9aa8',8,'center',SMALL,400));
    c.fillStyle='#dcb868';c.fillRect(146,121,72,16);text('Upright',182,133,'#0b0818',9,'center',FONT);HIT.push({x:146,y:121,w:72,h:16,fn:()=>useTarot(si,false)});
    c.fillStyle='#ff6a86';c.fillRect(228,121,72,16);text('Reversed',264,133,'#1a0610',9,'center',FONT);HIT.push({x:228,y:121,w:72,h:16,fn:()=>useTarot(si,true)});}
}
function tray(){
  c.fillStyle='#0d0919';c.fillRect(0,TRAY,W,H-TRAY);
  cardBack(34,TRAY+42,.9);text(String(draw.length),34,TRAY+82,'#a79bc0',9,'center',SMALL);text('draw',34,TRAY+92,'#6a5a8a',7,'center',SMALL);
  if(disc.length)cardBack(72,TRAY+42,.7,.12);text(String(disc.length),72,TRAY+82,'#a79bc0',9,'center',SMALL);text('discard',72,TRAY+92,'#6a5a8a',7,'center',SMALL);
  const n=hand.length,cw=58,ch=86,sp=n>1?Math.min(60,(318-cw)/(n-1)):0,x0=258-(cw+(n-1)*sp)/2;
  hand.forEach((cd,i)=>{const x=x0+i*sp,isSel=sel&&sel.k==='s'&&sel.i===i,rise=(1-Math.min(1,cd.age*6))*30,d=CARDS[cd.d],cost=costOf(cd),afford=mana>=cost,y=TRAY+8+rise-(isSel?12:0);
    c.globalAlpha=afford?1:.55;drawCard(cd,x,y,cw,ch,{sel:isSel,afford,cost,react:!!reactOf(d.el)&&afford});c.globalAlpha=1;
    HIT.push({x,y:TRAY,w:i<n-1?sp:cw,h:ch+10,fn:()=>{if(phase!=='player')return;if(isSel)cast(i);else sel={k:'s',i};}});});
  c.fillStyle='#142060';c.beginPath();c.arc(450,TRAY+60,22,0,TAU);c.fill();c.strokeStyle='#9ad0ff';c.lineWidth=2;c.stroke();glow(450,TRAY+60,30,'#5b84ff',.3);
  text(String(mana),450,TRAY+66,'#fff',18,'center',FONT);text('mana',450,TRAY+92,'#9ad0ff',8,'center',SMALL);
  const can=phase==='player'&&busy<=0;c.fillStyle=can?'#dcb868':'#4a4560';c.fillRect(424,TRAY+6,52,22);text('End turn',450,TRAY+20,can?'#0b0818':'#a79bc0',9,'center',FONT);HIT.push({x:424,y:TRAY+6,w:52,h:22,fn:endTurn});
}
function drawWorld(){
  c.save();if(shake>.2)c.translate(rnd(-shake,shake)*.5,rnd(-shake,shake)*.5);
  bg();drawBoss();drawPlayer();
  for(const p of projs){glow(p.x,p.y,10,p.col,.8);c.fillStyle='#fff';c.beginPath();c.arc(p.x,p.y,2.2,0,TAU);c.fill();}
  vfxDraw(c);
  for(const p of popups){c.globalAlpha=clamp(p.t*2,0,1);text(p.s,p.x,p.y-(1-p.t)*20,p.col,p.big?11:8,'center',FONT);}c.globalAlpha=1;c.restore();
}
function drawShuffle(p){
  const n=12;for(let i=0;i<n;i++){const side=i%2?1:-1,k=clamp(p*1.6-i*.04,0,1),e=k*k*(3-2*k),x=240+side*(70-70*e),y=100-e*(i*1.4-8)+Math.sin(p*10+i)*(1-e)*4;cardBack(x,y,1.15,side*(1-e)*.35);}
  text('The deck is shuffled',240,150,'#dcb868',12,'center',FONT);
}
function btn(x,y,w,h,s,main,fn){HIT.push({x,y,w,h,fn});c.fillStyle=main?'#dcb868':'transparent';c.fillRect(x,y,w,h);if(!main){c.strokeStyle='#5a4a82';c.lineWidth=2;c.strokeRect(x+1,y+1,w-2,h-2);}text(s,x+w/2,y+h/2+4,main?'#0b0818':'#f1e8d4',main?12:9,'center',FONT);}
function titleScene(){
  c.fillStyle='#07040f';c.fillRect(0,0,W,H);const g=c.createRadialGradient(240,110,10,240,110,260);g.addColorStop(0,'#2a1650');g.addColorStop(1,'#07040f');c.fillStyle=g;c.fillRect(0,0,W,H);
  [0,2,4,6,9].forEach((si,i)=>{c.save();c.translate(240+(i-2)*58,136);c.rotate((i-2)*.16);drawCard({d:START[si]},-29,-43,58,86,{});c.restore();});
  text('THE EIGHTH ARCANUM',240,34,'#dcb868',20,'center',FONT);text('Cast spells. Read the fates. Seven bosses, one deck.',240,52,'#a79bc0',11,'center',SMALL,400);
  btn(190,198,100,24,'Begin',true,startRun);btn(190,230,100,18,'Sanctum',false,leave);
  const bst=(meta.deck&&meta.deck.best)||0;text(`Best: ${bst} of ${STAGES} bosses  -  Wins: ${(meta.deck&&meta.deck.wins)||0}`,240,262,'#6a5a8a',9,'center',SMALL,400);
}
function rewardScene(){
  c.fillStyle='#07040f';c.fillRect(0,0,W,H);const g=c.createRadialGradient(240,130,10,240,130,300);g.addColorStop(0,'#241446');g.addColorStop(1,'#07040f');c.fillStyle=g;c.fillRect(0,0,W,H);
  text(`${boss.name} is felled`,240,20,'#dcb868',13,'center',FONT);text('Choose a card for your deck, or take a tarot card',240,35,'#a79bc0',10,'center',SMALL,400);
  const n=offer.length,gap=10,cw=100,x0=240-(n*cw+(n-1)*gap)/2;
  offer.forEach((o,i)=>{const x=x0+i*(cw+gap),y=46,k=clamp((sceneT-.4-i*.2)*3,0,1);if(k<=0){cardBack(x+cw/2,y+66,1.8);return;}
    c.save();c.translate(x+cw/2,y+66);c.scale(Math.abs(Math.cos((1-k)*Math.PI/2)),1);c.translate(-cw/2,-66);
    if(o.spell)drawCard(o.spell,0,0,cw,132,{full:true});else tarotCard(o.tarot,0,0,cw,132,{full:true});c.restore();
    if(sceneT>1.1)HIT.push({x,y,w:cw,h:132,fn:()=>{if(o.spell)run.deck.push(o.spell);else run.tarot.push(o.tarot);sfx.pick();run.stage++;nextFight();}});});
  btn(150,196,180,22,'Skip  (heal 10 more)',false,()=>{run.hp=Math.min(run.max,run.hp+10);run.stage++;nextFight();});
  text(`Deck: ${run.deck.length} cards  -  Tarot: ${run.tarot.length}/3`,100,250,'#6a5a8a',9,'center',SMALL,400);text(`Health: ${run.hp}/${run.max}`,400,250,'#ff8fa0',9,'center',SMALL,400);
}
function endScene(){
  c.fillStyle='#07040f';c.fillRect(0,0,W,H);const w=tally.win;
  text(w?'THE EIGHTH ARCANUM IS YOURS':'YOU FELL',240,70,w?'#dcb868':'#ff7a6e',20,'center',FONT);
  text(`${tally.kills} of ${STAGES} bosses felled  -  +${tally.g} shards`,240,100,'#a79bc0',12,'center',SMALL,400);text(`Your deck held ${run.deck.length} cards`,240,120,'#6a5a8a',10,'center',SMALL,400);
  run.deck.slice(-6).forEach((cd,i,a)=>drawCard(cd,240+(i-(a.length-1)/2)*36-14,134,28,42,{}));
  btn(150,204,180,24,'Another run',true,startRun);btn(190,234,100,18,'Sanctum',false,()=>{scene='title';setMusic('title',0);});
}
function render(){
  HIT.length=0;c.setTransform(R,0,0,R,0,0);c.imageSmoothingEnabled=false;
  if(scene==='title')titleScene();
  else if(scene==='reward')rewardScene();
  else if(scene==='end')endScene();
  else{
    if(scene==='shuffle'){bg();drawBoss();c.fillStyle='rgba(7,4,15,.5)';c.fillRect(0,0,W,TRAY);drawShuffle(clamp(sceneT/1.2,0,1));hud();tray();}
    else{drawWorld();hud();if(scene==='fight')panel();tray();if(scene==='won'){c.fillStyle='rgba(255,255,255,'+clamp(.6-sceneT,0,1)+')';c.fillRect(0,0,W,H);text(boss.name+' falls',240,90,'#ffd27a',18,'center',FONT);}}
    if(paused){c.fillStyle='rgba(7,4,15,.8)';c.fillRect(0,0,W,H);HIT.length=0;text('Paused',240,90,'#dcb868',16,'center',FONT);btn(170,110,140,24,'Resume',true,()=>{paused=false;});btn(170,142,140,20,'Abandon run',false,()=>{paused=false;lose();});}
  }
}

/* ---------- loop ---------- */
function update(dt){
  t+=dt;sceneT+=dt;shake*=Math.pow(.02,dt);if(msgT>0)msgT-=dt;if(busy>0)busy-=dt;
  for(const p of popups)p.t-=dt*1.1;for(let i=popups.length-1;i>=0;i--)if(popups[i].t<=0)popups.splice(i,1);
  vfxStep(dt);
  if(scene==='shuffle'){if(sceneT>1.35)beginFight();return;}
  if(!boss)return;boss.flash-=dt;if(boss.lunge>0)boss.lunge-=dt;
  if(P){P.castT-=dt;P.hitT-=dt;P.flash-=dt;}
  if(scene==='won'){if(sceneT>2.4)goReward();return;}
  if(scene!=='fight'||paused)return;
  for(const e of timeline)e.t-=dt;const due=timeline.filter(e=>e.t<=0);timeline=timeline.filter(e=>e.t>0);for(const e of due)e.fn();
  for(const p of projs){p.t+=dt/.26;const k=Math.min(1,p.t);p.x=WX+24+(p.tx-WX-24)*k;p.y=WY-30+(p.ty-WY+30)*k-Math.sin(k*Math.PI)*14;if(p.t>=1){p.dead=true;p.fn();}}
  projs=projs.filter(p=>!p.dead);
  for(const h of hand)h.age+=dt;
}

/* ---------- input and integration ---------- */
const pt=e=>{const r=cv.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};};
function onDown(e){
  wakeAudio();const p=pt(e);
  for(let i=HIT.length-1;i>=0;i--){const b=HIT[i];if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h){b.fn();return;}}
  if(scene==='fight'&&phase==='player')sel=null;
}
function onKey(e){
  if(S.mode!=='deck'||e.type!=='keydown')return;const k=e.key;
  if(k==='Escape'&&scene==='fight')paused=!paused;
  if(scene==='fight'&&!paused){if(k===' '||k==='Enter')endTurn();if(k>='1'&&k<='7'&&hand[+k-1]){const i=+k-1;if(sel&&sel.k==='s'&&sel.i===i)cast(i);else sel={k:'s',i};}}
}
function fit(){if(!box)return;const pw=innerWidth-32,ph=innerHeight;box.style.setProperty('--s',Math.max(.5,Math.min(pw/480,ph/270)).toFixed(4));}
function init(){
  if(inited)return;inited=true;root=$('deck');cv=$('dcv');box=$('dbox');
  setShake(v=>{shake=Math.max(shake,v);});
  cv.width=W*R;cv.height=H*R;c=cv.getContext('2d');c.imageSmoothingEnabled=false;
  addEventListener('keydown',onKey);addEventListener('resize',fit);cv.addEventListener('pointerdown',onDown);cv.addEventListener('contextmenu',e=>e.preventDefault());fit();
}
function leave(){if(root)root.hidden=true;const wrap=$('wrap');if(wrap)wrap.style.visibility='';S.mode='hub';setMusic('hub',0);if(exitFn)exitFn();}
export function enterDeck(opts={}){
  exitFn=opts.exit;init();S.mode='deck';root.hidden=false;const wrap=$('wrap');if(wrap)wrap.style.visibility='hidden';const mb=$('mute');if(mb)mb.hidden=true;fit();
  scene='title';paused=false;setMusic('title',0);
}
export function deckStep(dt){if(!root||root.hidden)return;dt=Math.min(.05,dt);update(dt);render();}
if(typeof window!=='undefined')window.__deck={start:()=>startRun(),state:()=>({scene,phase,run,P,boss,mana,hand,draw:draw.length,disc:disc.length,turn,busy,offer,moonI,cost:i=>costOf(hand[i]),react:i=>!!reactOf(CARDS[hand[i].d].el)}),cast:i=>cast(i),tarot:(i,r)=>useTarot(i,r),end:()=>endTurn(),pick:i=>{if(scene!=='reward')return;const o=offer[i];if(o.spell)run.deck.push(o.spell);else run.tarot.push(o.tarot);run.stage++;nextFight();},step:dt=>update(dt),cards:CARDS,tarotDefs:TAROT,sceneNow:()=>scene,render};
