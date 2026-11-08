// @ts-nocheck
/* Deck mode (prototype): a fast tarot-deck boss rush. A run is seven short boss fights. Your spells are cards: you hold a hand of four, tap a card to cast it
   (it costs mana), played cards go to the discard pile and the hand refills from the shuffled draw pile. Between fights the deck is shuffled and you pick
   one of three cards to add (any may be drawn REVERSED: stronger, but it costs a heart). Playing cards of the same suit in a row builds a combo.
   Self-contained on its own 480x270 canvas (#dcv); borrows the main game's art, music, wizards and bosses. */
import { meta, saveMeta, WIZARDS } from '../data/meta';
import { BOSSES as MB, BOSS_EL } from '../data/bossList';
import { R, SPRITE_OVERRIDES, WIZ_ANIM, WIZ_SETS, blit, blitSprite, bossFrames, clipFrame } from '../render/sprites';
import { fxExplosion, fxHeal, fxIce, fxImpact, fxLightning, setShake, vfxClear, vfxDraw, vfxStep } from '../hunt/vfx';
import { applyMuteToMusic, setMusic, sfx, snd, wakeAudio } from '../core/audio';
import { S } from '../core/state';

const W=480,H=270,TRAY=192,ARB=180,PL={x0:14,x1:466,y0:92,y1:172};
const FONT='"Pixelify Sans","Courier New",monospace',SMALL='"VT323","Courier New",monospace',TAU=Math.PI*2;
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)],clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const BASE=()=>import.meta.env.BASE_URL,$=id=>document.getElementById(id);
let root,cv,c,box,inited=false,exitFn=null,hw=null;

/* ---------- suits and cards ---------- */
const SUITS={
  wands:{n:'Wands',col:'#ff9a5a',icon:'el_fire'},cups:{n:'Cups',col:'#8fdcf0',icon:'el_frost'},swords:{n:'Swords',col:'#cfe0ff',icon:'el_storm'},
  pents:{n:'Pentacles',col:'#8fe06a',icon:'el_thorn'},major:{n:'Major Arcana',col:'#ffd27a',icon:'el_holy'},
};
const ELCOL={fire:'#ff9a5a',frost:'#8fdcf0',storm:'#f0dc55',thorn:'#8fe06a',bone:'#e9e3cb',mirror:'#f0a8d8',blood:'#e0405a',gold:'#ffd27a',poison:'#7ad37a',holy:'#fff0a0',void:'#b78cff',sound:'#9ad0ff'};
/* fn(k) runs when played: k is the power multiplier (1.6 if reversed), cm the combo multiplier */
const CARDS={
  bolt:{n:'Arcane Bolt',suit:'swords',cost:1,icon:'spell_bolt',t:'A bolt for 9.',fn:k=>bolt(9*k,'#ffe9a0')},
  chain:{n:'Chain Spark',suit:'swords',cost:2,icon:'el_storm',t:'Three sparks, 8 each.',fn:k=>{for(let i=0;i<3;i++)later(i*.14,()=>{hit(8*k,{col:'#cfe0ff',zap:1});fxLightning(boss.x+rnd(-14,14),boss.y+16);});}},
  volley:{n:'Volley',suit:'swords',cost:2,icon:'spell_beam',t:'Five quick bolts, 5 each.',fn:k=>{for(let i=0;i<5;i++)later(i*.08,()=>bolt(5*k,'#cfe0ff',true));}},
  ember:{n:'Ember',suit:'wands',cost:1,icon:'el_fire',t:'6 and burning, 4 a second.',fn:k=>{bolt(6*k,'#ff9a5a',false,()=>{boss.burn=4;boss.burnD=4*k;});}},
  meteor:{n:'Falling Star',suit:'wands',cost:3,icon:'spell_meteor',t:'A star falls for 44.',fn:k=>{later(.55,()=>{hit(44*k,{col:'#ff9a5a'});fxExplosion(boss.x,boss.y+8,.9);shake=Math.max(shake,3);});}},
  pyre:{n:'Pyre',suit:'wands',cost:2,icon:'spell_orbit',t:'Burn 8 a second for 6s.',fn:k=>{boss.burn=6;boss.burnD=Math.max(boss.burnD||0,8*k);fxExplosion(boss.x,boss.y+10,.5);}},
  shard:{n:'Frost Shard',suit:'cups',cost:1,icon:'el_frost',t:'7, and chills the boss.',fn:k=>bolt(7*k,'#8fdcf0',false,()=>{boss.slow=3.5;fxIce(boss.x,boss.y+14,'nova',.5);})},
  nova:{n:'Star Nova',suit:'cups',cost:2,icon:'spell_nova',t:'12, wipes nearby shots.',fn:k=>{fxIce(P.x,P.y,'nova',.9);clearShots(P.x,P.y,74);bolt(12*k,'#9ad0ff');}},
  blizzard:{n:'Blizzard',suit:'cups',cost:3,icon:'spell_beam',t:'Five hits of 9, chills.',fn:k=>{boss.slow=4;for(let i=0;i<5;i++)later(i*.4,()=>{hit(9*k,{col:'#8fdcf0'});fxIce(boss.x+rnd(-20,20),boss.y+12,'nova',.45);});}},
  ward:{n:'Ward',suit:'pents',cost:1,icon:'spell_ward',t:'Block the next hit.',fn:k=>{P.ward+=1;if(k>1)P.ward+=1;fxHeal(P.x,P.y-6,'mana');sfx.shield();}},
  mend:{n:'Mend',suit:'pents',cost:2,icon:'gear_heart',t:'Restore a heart.',fn:k=>{heal(k>1?2:1);}},
  thorns:{n:'Thornmail',suit:'pents',cost:1,icon:'el_thorn',t:'Next hit is blocked, and returns 24.',fn:k=>{P.thorn=1;P.thornD=24*k;fxHeal(P.x,P.y-6,'mana');sfx.shield();}},
  bulwark:{n:'Bulwark',suit:'pents',cost:2,icon:'gear_mossy',t:'Two wards and 10 damage.',fn:k=>{P.ward+=2;bolt(10*k,'#8fe06a');sfx.shield();}},
  fool:{n:'The Fool',suit:'major',cost:0,icon:'gear_fool',t:'Throw your hand back, draw four.',fn:()=>{for(let i=0;i<4;i++)if(hand[i]){disc.push(hand[i]);hand[i]=null;}drawCd=0;},wild:1},
  star:{n:'The Star',suit:'major',cost:0,icon:'gear_stars',t:'Gain 4 mana. Burns up.',fn:k=>{mana=Math.min(10,mana+4*k);fxHeal(P.x,P.y-6,'mana');},exhaust:1,wild:1},
  magician:{n:'The Magician',suit:'major',cost:2,icon:'gear_eighth',t:'Your next card is cast twice.',fn:()=>{echo=true;fxHeal(P.x,P.y-6,'mana');},wild:1},
  wheel:{n:'Wheel of Fortune',suit:'major',cost:1,icon:'gear_hourglass',t:'Casts a random card, free.',fn:k=>{const ids=Object.keys(CARDS).filter(i=>i!=='wheel'&&i!=='fool');const d=pick(ids);text(CARDS[d].n+'!',P.x,P.y-30,CARDS[d].suit&&SUITS[CARDS[d].suit].col);CARDS[d].fn(k);},wild:1},
  moon:{n:'The Moon',suit:'major',cost:2,icon:'gear_moon',t:'Boss is stunned 2s and takes +50% for 5s.',fn:()=>{boss.stun=2;boss.vuln=5;fxIce(boss.x,boss.y+10,'nova',.7);},wild:1},
  tower:{n:'The Tower',suit:'major',cost:3,icon:'gear_brim',t:'A bolt of 78. You take 1.',fn:k=>{later(.3,()=>{hit(78*k,{col:'#ffd27a'});fxLightning(boss.x,boss.y+16);fxExplosion(boss.x,boss.y+8,1);shake=Math.max(shake,5);});hurtSelf(1);},wild:1},
  death:{n:'Death',suit:'major',cost:3,icon:'el_bone',t:'Strikes for 14% of the boss\'s health.',fn:k=>{later(.35,()=>{hit(boss.max*.14*k,{col:'#e9e3cb'});fxExplosion(boss.x,boss.y+8,.8);});},wild:1},
  sun:{n:'The Sun',suit:'major',cost:4,icon:'gear_ember',t:'88 damage and a heart.',fn:k=>{later(.4,()=>{hit(88*k,{col:'#ffd27a'});fxExplosion(boss.x,boss.y+8,1.1);shake=Math.max(shake,5);});heal(1);},wild:1},
};
const START=['bolt','bolt','bolt','bolt','ember','shard','ward','ward','mend','star'];
const WEIGHT={bolt:3,chain:2,volley:2,ember:3,meteor:2,pyre:2,shard:3,nova:2,blizzard:1.5,ward:2,mend:1.5,thorns:2,bulwark:1.5,fool:1.2,star:1.5,magician:1.2,wheel:1,moon:1.2,tower:.8,death:.8,sun:.6};

/* ---------- art ---------- */
const IMG={};
function icon(n){if(!IMG[n]){const i=new Image();i.src=BASE()+'assets/icons/'+n+'.png';IMG[n]=i;}return IMG[n];}
function wizSprite(){
  const id=hw?hw.id:'raven';
  const A=id==='raven'?(SPRITE_OVERRIDES.anim&&SPRITE_OVERRIDES.anim.arena):WIZ_ANIM[id];
  const d='north',w=A&&A.walk&&A.walk[d];
  if(P.moving&&w)return clipFrame(w,P.step);
  if(id==='raven')return (SPRITE_OVERRIDES.wizardDirs&&SPRITE_OVERRIDES.wizardDirs[d])||(w&&w.frames[0]);
  const set=WIZ_SETS[id];return (set&&set.dirs[d])||(w&&w.frames[0]);
}
function glow(x,y,r,col,a){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');c.globalAlpha=a;c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.globalAlpha=1;}
function text(s,x,y,col='#f1e8d4',size=8,align='center',font=FONT,weight=700){c.font=`${weight} ${size}px ${font}`;c.textAlign=align;c.fillStyle='#07040f';c.fillText(s,x+.7,y+.7);c.fillStyle=col;c.fillText(s,x,y);}
const popups=[];
function pop(s,x,y,col='#fff'){popups.push({s,x,y,t:.8,col});}
function wrap(s,n){const w=s.split(' '),L=[];let l='';for(const x of w){if((l+' '+x).trim().length>n){L.push(l);l=x;}else l=(l+' '+x).trim();}if(l)L.push(l);return L;}

/* ---------- run and fight state ---------- */
const STAGES=7;
let scene='title',run=null,P=null,boss=null,mana=5,draw=[],disc=[],hand=[null,null,null,null],drawCd=0,reshuf=0,echo=false;
let shots=[],zones=[],bolts=[],timeline=[],streak=0,lastSuit=null,comboT=0,shake=0,t=0,sceneT=0,offer=[],picked=-1,paused=false,msg='',msgT=0,uid=1,tally=null;
const stick={id:null,ox:0,oy:0,x:0,y:0,on:false,moved:false},keys={};
const newCard=(d,rev=false)=>({d,rev,id:uid++,age:0});
const later=(d,fn)=>timeline.push({t:d,fn,cm:curCm});
function banner(s,n=1.4){msg=s;msgT=n;}

function startRun(){
  hw=WIZARDS.find(w=>w.id===meta.lastWizard)||WIZARDS[0];
  const order=[];const pool=shuffle(MB.map((b,i)=>i).filter(i=>!MB[i].elite));
  for(let s=0;s<STAGES-1;s++)order.push(pool[s]);order.push(pick(MB.map((b,i)=>i).filter(i=>MB[i].elite)));
  run={stage:0,hp:5,max:5,deck:START.map(d=>newCard(d)),order,kills:0,played:0};
  nextFight();
}
function nextFight(){
  const bi=run.order[run.stage],m=MB[bi],fin=run.stage===STAGES-1,hp=Math.round(200+run.stage*115+(fin?420:0));
  const all=['aimed','ring','rain','sweep'],rot=bi%4,pats=fin?all:[0,1,2].map(i=>all[(rot+i)%4]);
  boss={bi,name:m.name,num:m.num,col:m.color,bg:m.bg,el:BOSS_EL[bi]||'void',hp,max:hp,x:240,y:56,r:22,pats,pi:0,cd:1.8,wind:0,burn:0,burnD:0,burnT:0,slow:0,vuln:0,stun:0,flash:0,seed:rnd(0,9),fin,ph2:false};
  P={x:240,y:140,hp:run.hp,ward:0,thorn:0,thornD:0,inv:0,moving:false,step:0};
  shots=[];zones=[];bolts=[];timeline=[];popups.length=0;streak=0;lastSuit=null;comboT=0;echo=false;mana=5;vfxClear();
  draw=shuffle(run.deck.slice());disc=[];hand=[null,null,null,null];drawCd=0;reshuf=0;
  scene='shuffle';sceneT=0;setMusic('draw',run.stage,2);sfx.shuffle();
}
function beginFight(){scene='fight';sceneT=0;banner(boss.name,1.8);setMusic(boss.fin?'elite':'battle',boss.bi,boss.fin?3:2);}

/* ---------- effects ---------- */
function combo(){return 1+.2*Math.min(4,Math.max(0,streak-1));}
function hit(d,o={}){
  if(!boss||boss.hp<=0)return;d*=(o.nc?1:curCm)*(boss.vuln>0?1.5:1);d=Math.round(d);boss.hp-=d;boss.flash=.12;
  fxImpact(boss.x+rnd(-10,10),boss.y+rnd(6,22),o.col||'#ffe9a0',rnd(0,TAU));pop(String(d),boss.x+rnd(-18,18),boss.y-14,o.col||'#fff');sfx.strike();
  if(boss.hp<=0)winFight();
}
let curCm=1;
function bolt(d,col,quick,onHit){bolts.push({x:P.x,y:P.y-10,d,col,onHit,sp:quick?420:300,t:0,cm:curCm});sfx.cast();}
function heal(n){run&&(P.hp=Math.min(run.max,P.hp+n));fxHeal(P.x,P.y-6,'heal');pop('+'+n+' heart',P.x,P.y-26,'#ff8fa0');}
function hurtSelf(n){P.hp=Math.max(1,P.hp-n);P.inv=.5;shake=Math.max(shake,3);sfx.hurt();pop('-'+n,P.x,P.y-24,'#ff5a4a');}
function clearShots(x,y,r){shots=shots.filter(s=>Math.hypot(s.x-x,s.y-y)>r);zones=zones.filter(z=>Math.hypot(z.x-x,z.y-y)>r);}
function hurt(){
  if(P.inv>0)return;
  if(P.thorn>0){P.thorn--;P.inv=.5;hit(P.thornD,{col:'#8fe06a',nc:1});fxHeal(P.x,P.y-6,'mana');sfx.block();return;}
  if(P.ward>0){P.ward--;P.inv=.5;sfx.block();fxImpact(P.x,P.y-6,'#7fe0c0');pop('blocked',P.x,P.y-24,'#7fe0c0');return;}
  P.hp--;P.inv=1.1;shake=Math.max(shake,4);sfx.hurt();pop('-1',P.x,P.y-24,'#ff5a4a');streak=0;
  if(P.hp<=0)loseRun();
}

function play(i){
  if(scene!=='fight'||paused)return;const cd=hand[i];if(!cd)return;const d=CARDS[cd.d];
  if(mana<d.cost){cd.shakeT=.3;banner('Not enough mana',.6);return;}
  mana-=d.cost;hand[i]=null;run.played++;
  if(d.suit==='major'){streak=lastSuit?streak+1:1;}else if(d.suit===lastSuit){streak++;}else{streak=1;lastSuit=d.suit;}comboT=5;
  curCm=combo();const k=cd.rev?1.6:1;
  if(cd.rev)hurtSelf(1);
  const go=()=>d.fn(k);go();if(echo&&cd.d!=='magician'){echo=false;later(.4,()=>{go();pop('echo',P.x,P.y-34,'#ffd27a');});}
  if(streak>=3)pop('COMBO x'+curCm.toFixed(1),P.x,P.y-38,SUITS[lastSuit||'major'].col);
  if(!d.exhaust)disc.push(cd);drawCd=Math.min(drawCd,.1);sfx.card();
}

function winFight(){
  if(scene!=='fight')return;scene='won';sceneT=0;run.hp=P.hp;run.kills++;
  fxExplosion(boss.x,boss.y+8,1.5);shake=8;sfx.win();shots=[];zones=[];banner(boss.name+' falls',2);
}
function loseRun(){scene='end';sceneT=0;tally={win:false};finishRun(false);setMusic('defeat',0);sfx.lose();}
function finishRun(win){
  const g=win?12:run.kills*2;meta.shards=(meta.shards||0)+g;
  meta.deck=meta.deck||{best:0,wins:0};meta.deck.best=Math.max(meta.deck.best||0,run.kills);if(win)meta.deck.wins=(meta.deck.wins||0)+1;saveMeta();tally={win,g,kills:run.kills};
}
function makeOffer(){
  const ids=Object.keys(CARDS),w=ids.map(i=>WEIGHT[i]||1),out=[];
  while(out.length<3){let r=Math.random()*w.reduce((a,b)=>a+b,0),j=0;while(r>w[j]){r-=w[j];j++;}const d=ids[j];if(out.some(o=>o.d===d))continue;out.push(newCard(d,Math.random()<.22+run.stage*.02&&CARDS[d].cost>0));}
  offer=out;picked=-1;
}
function goReward(){
  if(run.stage>=STAGES-1){scene='end';sceneT=0;finishRun(true);setMusic('victory',0);return;}
  scene='reward';sceneT=0;makeOffer();setMusic('reward',run.stage);sfx.shuffle();
}

/* ---------- boss attacks ---------- */
const BSP=()=>78+run.stage*7;
function aim(a,sp,col){shots.push({x:boss.x,y:boss.y+14,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,col,r:3.5});}
function bossAttack(){
  const pat=boss.pats[boss.pi++%boss.pats.length],col=ELCOL[boss.el]||'#ff7a6e',st=run.stage,sp=BSP(),ph=boss.ph2?1:0;
  if(pat==='aimed'){const n=2+Math.floor(st/2)+ph,a0=Math.atan2(P.y-boss.y-14,P.x-boss.x);for(let k=0;k<n;k++)aim(a0+(k-(n-1)/2)*.2,sp+10,col);}
  else if(pat==='ring'){const n=9+st+ph*3;for(let k=0;k<n;k++){const a=.08*Math.PI+(k/(n-1))*.84*Math.PI;aim(a,sp-14,col);}later(.45,()=>{for(let k=0;k<n;k++){const a=.08*Math.PI+((k+.5)/n)*.84*Math.PI;aim(a,sp-24,col);}});}
  else if(pat==='rain'){const n=2+Math.floor(st/2)+ph;for(let k=0;k<n;k++){const x=k===0?P.x:clamp(P.x+rnd(-90,90),PL.x0,PL.x1),y=rnd(PL.y0+6,PL.y1);zones.push({x,y,r:17,t:1.05+k*.12,max:1.05+k*.12,col});}}
  else{const n=12+ph*4;for(let k=0;k<n;k++)later(k*.09,()=>{const a=.15*Math.PI+(k/(n-1))*.7*Math.PI;aim(a,sp,col);});}
  boss.wind=.35;
}

/* ---------- update ---------- */
function update(dt){
  t+=dt;sceneT+=dt;shake*=Math.pow(.02,dt);if(msgT>0)msgT-=dt;
  for(const p of popups)p.t-=dt;for(let i=popups.length-1;i>=0;i--)if(popups[i].t<=0)popups.splice(i,1);
  vfxStep(dt);
  if(scene==='shuffle'){if(sceneT>1.35)beginFight();return;}
  if(scene==='won'){tickTimeline(dt);if(sceneT>2.4)goReward();return;}
  if(scene!=='fight'||paused)return;
  tickTimeline(dt);
  // player
  let ix=(keys.d||keys.ArrowRight?1:0)-(keys.a||keys.ArrowLeft?1:0)+stick.x,iy=(keys.s||keys.ArrowDown?1:0)-(keys.w||keys.ArrowUp?1:0)+stick.y;const l=Math.hypot(ix,iy);if(l>1){ix/=l;iy/=l;}
  P.moving=l>.1;if(P.moving){P.step+=dt;}P.x=clamp(P.x+ix*104*dt,PL.x0,PL.x1);P.y=clamp(P.y+iy*104*dt,PL.y0,PL.y1);P.inv-=dt;
  mana=Math.min(10,mana+dt*(1.15+run.stage*.04));
  if(comboT>0){comboT-=dt;if(comboT<=0)streak=0;}
  // boss
  const sl=boss.slow>0?.5:1;boss.slow-=dt;boss.vuln-=dt;boss.flash-=dt;boss.wind-=dt;
  boss.x=240+Math.sin(t*.55*sl+boss.seed)*(boss.stun>0?0:150);boss.y=56+Math.sin(t*1.3+boss.seed)*4;
  if(boss.burn>0){boss.burn-=dt;boss.burnT-=dt;if(boss.burnT<=0){boss.burnT=.5;hit(boss.burnD*.5,{col:'#ff9a5a',nc:1});}}
  if(!boss.ph2&&boss.hp<boss.max*.5){boss.ph2=true;banner('The boss is enraged',1.4);shake=5;sfx.rage();}
  if(boss.stun>0)boss.stun-=dt;else{boss.cd-=dt*sl;if(boss.cd<=0){bossAttack();boss.cd=Math.max(.85,2.2-run.stage*.1)*(boss.ph2?.75:1);}}
  // bolts
  for(const b of bolts){const dx=boss.x-b.x,dy=boss.y+12-b.y,d=Math.hypot(dx,dy)||1,s=b.sp*dt;b.t+=dt;if(d<=s+10){b.dead=true;curCm=b.cm;hit(b.d,{col:b.col});if(b.onHit)b.onHit();}else{b.x+=dx/d*s;b.y+=dy/d*s;}}
  bolts=bolts.filter(b=>!b.dead);
  // enemy shots and zones
  for(const s of shots){s.x+=s.vx*dt;s.y+=s.vy*dt;if(Math.hypot(s.x-P.x,s.y-(P.y-6))<s.r+4){s.dead=true;hurt();}if(s.y>ARB+8||s.x<-8||s.x>W+8||s.y<-8)s.dead=true;}
  shots=shots.filter(s=>!s.dead);
  for(const z of zones){z.t-=dt;if(z.t<=0){z.dead=true;fxExplosion(z.x,z.y,.35);if(Math.hypot(z.x-P.x,z.y-P.y)<z.r+3)hurt();}}
  zones=zones.filter(z=>!z.dead);
  // hand refill
  drawCd-=dt;if(reshuf>0)reshuf-=dt;
  if(drawCd<=0&&reshuf<=0){const slot=hand.indexOf(null);if(slot>=0){if(!draw.length&&disc.length){draw=shuffle(disc);disc=[];reshuf=.65;sfx.shuffle();banner('Shuffling',.6);}else if(draw.length){hand[slot]=draw.pop();hand[slot].age=0;sfx.card();drawCd=.16;}}}
  for(const h of hand)if(h){h.age+=dt;if(h.shakeT>0)h.shakeT-=dt;}
}
function tickTimeline(dt){for(const e of timeline)e.t-=dt;const due=timeline.filter(e=>e.t<=0);timeline=timeline.filter(e=>e.t>0);for(const e of due){curCm=e.cm;e.fn();}}

/* ---------- drawing ---------- */
function drawCard(cd,x,y,s,o={}){
  const d=CARDS[cd.d],su=SUITS[d.suit],afford=o.afford!==false;c.save();c.translate(x,y);c.scale(s,s);
  const w=84,h=76,col=cd.rev?'#ff5a6e':su.col;
  c.fillStyle=o.back?'#241838':'#150f26';c.fillRect(0,0,w,h);c.strokeStyle=col;c.lineWidth=o.hot?2.4:1.4;c.strokeRect(.7,.7,w-1.4,h-1.4);
  if(o.hot)glow(w/2,h/2,60,col,.35);
  const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,col+'33');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(1,1,w-2,h-2);
  const im=icon(d.icon);if(im.complete&&im.naturalWidth){c.imageSmoothingEnabled=false;if(cd.rev){c.save();c.translate(w/2,23);c.scale(1,-1);c.drawImage(im,-14,-14,28,28);c.restore();}else c.drawImage(im,w/2-14,9,28,28);}
  const si=icon(su.icon);if(si.complete&&si.naturalWidth){c.globalAlpha=.8;c.drawImage(si,w-17,3,13,13);c.globalAlpha=1;}
  c.fillStyle=afford?'#3b5bff':'#4a4560';c.beginPath();c.arc(10,10,7.5,0,TAU);c.fill();c.strokeStyle='#cfe0ff';c.lineWidth=1;c.stroke();text(String(d.cost),10,13.2,'#fff',9,'center',FONT);
  text(d.n,w/2,46,'#f1e8d4',d.n.length>13?7:8,'center',FONT);
  const L=wrap(d.t,22);L.slice(0,3).forEach((ln,i)=>text(ln,w/2,55+i*7.4,'#b7a9d6',7.6,'center',SMALL,400));
  if(cd.rev){c.fillStyle='#ff5a6e';c.fillRect(0,h-8,w,8);text('REVERSED  +60%  -1 HEART',w/2,h-1.6,'#1a0610',6,'center',FONT);}
  c.restore();
}
function cardBack(x,y,s=1,rot=0){
  c.save();c.translate(x,y);c.rotate(rot);c.scale(s,s);c.fillStyle='#241838';c.fillRect(-20,-28,40,56);c.strokeStyle='#dcb868';c.lineWidth=1;c.strokeRect(-19,-27,38,54);c.strokeStyle='#6a4ca8';c.strokeRect(-16,-24,32,48);
  c.fillStyle='#dcb868';c.beginPath();for(let i=0;i<8;i++){const r=i%2?3.5:8,a=i/8*TAU-Math.PI/2;c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fill();c.restore();
}
function bg(){
  const b=boss.bg||['#1f1140','#07040f'],g=c.createLinearGradient(0,0,0,ARB);g.addColorStop(0,b[0]);g.addColorStop(1,b[1]);c.fillStyle=g;c.fillRect(0,0,W,H);
  c.save();c.globalAlpha=.1;c.fillStyle=boss.col;for(let i=0;i<9;i++){const a=i/9*TAU+t*.05;c.beginPath();c.moveTo(240,40);c.lineTo(240+Math.cos(a)*500,40+Math.sin(a)*500);c.lineTo(240+Math.cos(a+.1)*500,40+Math.sin(a+.1)*500);c.fill();}c.restore();
  c.fillStyle='rgba(8,5,16,.55)';c.fillRect(0,PL.y0-8,W,ARB-PL.y0+8);c.strokeStyle='rgba(220,184,104,.28)';c.lineWidth=1;c.beginPath();c.moveTo(0,PL.y0-8);c.lineTo(W,PL.y0-8);c.stroke();
  c.strokeStyle='rgba(180,150,255,.12)';c.beginPath();c.ellipse(240,128,150,34,0,0,TAU);c.stroke();c.beginPath();c.ellipse(240,128,60,14,0,0,TAU);c.stroke();
}
function drawBoss(){
  const b=boss,x=Math.round(b.x),y=Math.round(b.y);glow(x,y,b.r+34,b.col,.3+.08*Math.sin(t*3));
  const fr=bossFrames(b.bi),s=fr&&fr[Math.floor(t*6)%fr.length];
  if(s&&s.img){const im=s.img,k=(b.r*3.1)/(im.width*(im.hi?1/R:1));if(b.flash>0)c.globalAlpha=.7;c.save();c.translate(x,y);c.scale(k,k);blit(c,0,0,im);c.restore();c.globalAlpha=1;if(b.flash>0)glow(x,y,b.r+8,'#fff',.45);}
  else{c.fillStyle=b.col;c.beginPath();c.arc(x,y,b.r,0,TAU);c.fill();}
  if(b.wind>0){c.strokeStyle='rgba(255,122,110,.6)';c.lineWidth=2;c.beginPath();c.arc(x,y,b.r+6+Math.sin(t*30)*2,0,TAU);c.stroke();}
  if(b.stun>0)text('stunned',x,y-b.r-8,'#ffd27a',7,'center',SMALL);
  if(b.burn>0)glow(x,y+8,18,'#ff7a30',.4);if(b.slow>0)glow(x,y+8,22,'#8fdcf0',.3);if(b.vuln>0)glow(x,y+8,26,'#b78cff',.3);
}
function drawPlayer(){
  const x=Math.round(P.x),y=Math.round(P.y);c.fillStyle='rgba(0,0,0,.4)';c.beginPath();c.ellipse(x,y+1,9,3.5,0,0,TAU);c.fill();
  if(P.inv>0&&Math.floor(t*20)%2)c.globalAlpha=.4;
  const s=wizSprite();if(s)blitSprite(c,s,x,y+8,hw&&hw.id!=='raven'?1.2:1.35);else{c.fillStyle='#8f6cff';c.fillRect(x-5,y-14,10,16);}c.globalAlpha=1;
  if(P.ward>0){c.strokeStyle='#7fe0c0';c.lineWidth=1.5;c.globalAlpha=.8;c.beginPath();c.arc(x,y-6,13+P.ward,0,TAU);c.stroke();c.globalAlpha=1;}
  if(P.thorn>0){c.strokeStyle='#8fe06a';c.setLineDash([3,3]);c.lineWidth=1.5;c.beginPath();c.arc(x,y-6,16,t*2,t*2+TAU);c.stroke();c.setLineDash([]);}
  c.fillStyle='#fff';c.globalAlpha=.9;c.beginPath();c.arc(x,y-6,1.4,0,TAU);c.fill();c.globalAlpha=1;
}
function drawWorld(){
  c.save();if(shake>.2)c.translate(rnd(-shake,shake)*.5,rnd(-shake,shake)*.5);
  bg();
  for(const z of zones){const p=1-z.t/z.max;c.strokeStyle=z.col;c.globalAlpha=.4+.4*p;c.lineWidth=1.5;c.beginPath();c.arc(z.x,z.y,z.r,0,TAU);c.stroke();c.fillStyle=z.col;c.globalAlpha=.1+.3*p;c.beginPath();c.arc(z.x,z.y,z.r*p,0,TAU);c.fill();c.globalAlpha=1;}
  drawBoss();
  for(const b of bolts){glow(b.x,b.y,9,b.col,.8);c.fillStyle='#fff';c.beginPath();c.arc(b.x,b.y,2,0,TAU);c.fill();}
  for(const s of shots){glow(s.x,s.y,8,s.col,.7);c.fillStyle=s.col;c.beginPath();c.arc(s.x,s.y,3,0,TAU);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(s.x,s.y,1.3,0,TAU);c.fill();}
  drawPlayer();vfxDraw(c);
  for(const p of popups){c.globalAlpha=clamp(p.t*2,0,1);text(p.s,p.x,p.y-(.8-p.t)*18,p.col,9,'center',FONT);}c.globalAlpha=1;
  c.restore();
}
function hud(){
  // boss bar
  const b=boss;c.fillStyle='rgba(7,4,15,.7)';c.fillRect(0,0,W,22);
  text(`${b.num}  ${b.name}`,240,9,'#f1e8d4',9,'center',FONT);
  c.fillStyle='#2a1f3d';c.fillRect(100,12,280,5);c.fillStyle=b.ph2?'#ff5a4a':b.col;c.fillRect(100,12,280*clamp(b.hp/b.max,0,1),5);c.strokeStyle='#8f7440';c.lineWidth=1;c.strokeRect(99.5,11.5,281,6);
  // hearts, stage
  for(let i=0;i<run.max;i++){const x=6+i*11,hy=27;c.fillStyle=i<P.hp?'#ff6a86':'#3a2a46';c.beginPath();c.moveTo(x+4,hy+8);c.bezierCurveTo(x-2,hy+3,x+1,hy-1,x+4,hy+2);c.bezierCurveTo(x+7,hy-1,x+10,hy+3,x+4,hy+8);c.fill();}
  if(P.ward>0)text('ward x'+P.ward,6,62,'#7fe0c0',7,'left',SMALL);
  text(`Fight ${run.stage+1}/${STAGES}`,474,9,'#a79bc0',8,'right',SMALL);
  if(streak>=2){const sc=SUITS[lastSuit||'major'].col;text(`COMBO x${streak}  (+${Math.round((combo()-1)*100)}%)`,6,46,sc,9,'left',FONT);c.fillStyle=sc;c.globalAlpha=.6;c.fillRect(6,49,70*clamp(comboT/5,0,1),2);c.globalAlpha=1;}
  if(msgT>0){c.globalAlpha=clamp(msgT*2,0,1);c.fillStyle='rgba(7,4,15,.6)';c.fillRect(0,100,W,22);text(msg,240,116,'#f1e8d4',14,'center',FONT);c.globalAlpha=1;}
  text('II',466,32,'#a79bc0',9,'center',FONT);
}
function tray(){
  c.fillStyle='#0d0919';c.fillRect(0,ARB,W,H-ARB);c.strokeStyle='#4a3a24';c.lineWidth=1;c.beginPath();c.moveTo(0,ARB+.5);c.lineTo(W,ARB+.5);c.stroke();
  // mana pips
  for(let i=0;i<10;i++){const f=clamp(mana-i,0,1);c.fillStyle='#1b1430';c.fillRect(52+i*37,ARB+3,34,5);c.fillStyle=f>=1?'#5b84ff':'#3a56b8';c.fillRect(52+i*37,ARB+3,34*f,5);}
  text(Math.floor(mana)+' mana',24,ARB+9,'#9ad0ff',8,'center',SMALL);
  // piles
  cardBack(24,TRAY+36,.9);text(String(draw.length),24,TRAY+72,'#a79bc0',9,'center',SMALL);
  if(disc.length){cardBack(456,TRAY+36,.9,.15);c.fillStyle='rgba(13,9,25,.5)';c.fillRect(436,TRAY+8,40,56);}text(String(disc.length),456,TRAY+72,'#a79bc0',9,'center',SMALL);
  for(let i=0;i<4;i++){const cd=hand[i];const x=46+i*98;if(!cd){c.strokeStyle='#2a1f3d';c.setLineDash([3,3]);c.strokeRect(x+.5,TRAY+.5,84,76);c.setLineDash([]);continue;}
    const rise=(1-Math.min(1,cd.age*6))*34,sh=cd.shakeT>0?Math.sin(t*80)*2:0,d=CARDS[cd.d],afford=mana>=d.cost,same=lastSuit&&(d.suit===lastSuit||d.suit==='major')&&streak>0;
    c.globalAlpha=Math.min(1,cd.age*8+.1)*(afford?1:.55);drawCard(cd,x+sh,TRAY+rise-(same&&afford?3:0),1,{afford,hot:same&&afford});c.globalAlpha=1;
    text(String(i+1),x+42,TRAY+rise+86,'#5a4a82',7,'center',SMALL);}
  if(reshuf>0)text('shuffling...',240,TRAY-4,'#dcb868',9,'center',FONT);
}
function drawShuffle(p){
  // two stacks riffle together
  const n=12;for(let i=0;i<n;i++){const side=i%2?1:-1,k=clamp((p*1.6)-i*.04,0,1),e=k*k*(3-2*k),x=240+side*(70-70*e),y=124-e*(i*1.4-8)+Math.sin((p*10)+i)*(1-e)*4;cardBack(x,y,1.15,side*(1-e)*.35);}
  text('The deck is shuffled',240,196,'#dcb868',12,'center',FONT);
}
function drawFightFrame(){drawWorld();hud();tray();}
function titleScene(){
  c.fillStyle='#07040f';c.fillRect(0,0,W,H);const g=c.createRadialGradient(240,110,10,240,110,260);g.addColorStop(0,'#2a1650');g.addColorStop(1,'#07040f');c.fillStyle=g;c.fillRect(0,0,W,H);
  for(let i=0;i<5;i++){const d=START[i*2],cd={d,rev:false,age:1},a=(i-2)*.16;c.save();c.translate(240+(i-2)*58,138);c.rotate(a);drawCard(cd,-42,-38,1,{});c.restore();}
  text('THE EIGHTH ARCANUM',240,34,'#dcb868',20,'center',FONT);text('Shuffle. Draw. Cast. Seven bosses, one deck.',240,52,'#a79bc0',11,'center',SMALL,400);
  btn(190,198,100,24,'Begin',true);btn(190,230,100,18,'Sanctum',false);
  const bst=(meta.deck&&meta.deck.best)||0;text(`Best: ${bst} of ${STAGES} bosses  -  Wins: ${(meta.deck&&meta.deck.wins)||0}`,240,262,'#6a5a8a',9,'center',SMALL,400);
}
const BTN=[];function btn(x,y,w,h,s,main){BTN.push({x,y,w,h,s});c.fillStyle=main?'#dcb868':'transparent';c.fillRect(x,y,w,h);if(!main){c.strokeStyle='#5a4a82';c.lineWidth=2;c.strokeRect(x+1,y+1,w-2,h-2);}text(s,x+w/2,y+h/2+4,main?'#0b0818':'#f1e8d4',main?12:9,'center',FONT);}
function rewardScene(){
  c.fillStyle='#07040f';c.fillRect(0,0,W,H);const g=c.createRadialGradient(240,130,10,240,130,300);g.addColorStop(0,'#241446');g.addColorStop(1,'#07040f');c.fillStyle=g;c.fillRect(0,0,W,H);
  text(`${boss.name} is felled`,240,20,'#dcb868',13,'center',FONT);text('Choose a card for your deck',240,36,'#a79bc0',10,'center',SMALL,400);
  offer.forEach((cd,i)=>{const x=40+i*142,y=56,k=clamp((sceneT-.5-i*.25)*3,0,1);if(k<=0){cardBack(x+63,y+57,1.7);return;}
    c.save();c.translate(x+63,y+57);c.scale(Math.abs(Math.cos((1-k)*Math.PI/2)),1);c.translate(-63,-57);
    drawCard(cd,0,0,1.5,{hot:picked===i});c.restore();});
  btn(150,206,180,22,'Skip  (heal 1 heart)',false);
  text(`Deck: ${run.deck.length} cards`,60,252,'#6a5a8a',9,'center',SMALL,400);text(`Hearts: ${run.hp}/${run.max}`,420,252,'#ff8fa0',9,'center',SMALL,400);
  text('Reversed cards hit 60% harder but cost a heart each time you play them.',240,246,'#8f7aa8',8,'center',SMALL,400);
}
function endScene(){
  c.fillStyle='#07040f';c.fillRect(0,0,W,H);const w=tally.win;
  text(w?'THE EIGHTH ARCANUM IS YOURS':'YOU FELL',240,70,w?'#dcb868':'#ff7a6e',20,'center',FONT);
  text(`${tally.kills} of ${STAGES} bosses felled  -  +${tally.g} shards`,240,100,'#a79bc0',12,'center',SMALL,400);
  text(`Your deck held ${run.deck.length} cards`,240,120,'#6a5a8a',10,'center',SMALL,400);
  run.deck.slice(-6).forEach((cd,i,a)=>{c.save();c.translate(240+(i-(a.length-1)/2)*34,168);c.scale(.4,.4);drawCard(cd,-42,-38,1,{});c.restore();});
  btn(150,204,180,24,'Another run',true);btn(190,234,100,18,'Sanctum',false);
}
function pauseLayer(){c.fillStyle='rgba(7,4,15,.8)';c.fillRect(0,0,W,H);text('Paused',240,90,'#dcb868',16,'center',FONT);btn(170,110,140,24,'Resume',true);btn(170,142,140,20,'Abandon run',false);}

function render(){
  BTN.length=0;c.setTransform(R,0,0,R,0,0);c.imageSmoothingEnabled=false;
  if(scene==='title')titleScene();
  else if(scene==='reward')rewardScene();
  else if(scene==='end')endScene();
  else if(scene==='shuffle'){bg();drawBoss();c.fillStyle='rgba(7,4,15,.5)';c.fillRect(0,0,W,H);drawShuffle(clamp(sceneT/1.2,0,1));hud();tray();}
  else{drawFightFrame();if(scene==='won'){c.fillStyle='rgba(255,255,255,'+clamp(.6-sceneT,0,1)+')';c.fillRect(0,0,W,H);text(boss.name+' falls',240,120,'#ffd27a',18,'center',FONT);}if(paused)pauseLayer();}
}

/* ---------- input and integration ---------- */
const pt=e=>{const r=cv.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};};
const inB=(p,b)=>p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h;
function onDown(e){
  wakeAudio();const p=pt(e);
  const hitBtn=BTN.find(b=>inB(p,b));
  if(paused){if(hitBtn){if(hitBtn.s==='Resume')paused=false;else{paused=false;loseRun();}}return;}
  if(scene==='title'&&hitBtn){if(hitBtn.s==='Begin')startRun();else leave();return;}
  if(scene==='end'&&hitBtn){if(hitBtn.s==='Another run')startRun();else{scene='title';setMusic('hub',0);}return;}
  if(scene==='reward'){
    if(hitBtn){run.hp=Math.min(run.max,run.hp+1);run.stage++;nextFight();return;}
    offer.forEach((cd,i)=>{const x=40+i*142,y=56;if(sceneT>1.2&&p.x>=x&&p.x<=x+126&&p.y>=y&&p.y<=y+114){run.deck.push(cd);if(cd.rev)run.hp=run.hp;run.stage++;sfx.pick();nextFight();}});
    return;
  }
  if(scene==='fight'){
    if(p.x>440&&p.y<44){paused=true;return;}
    if(p.y>=TRAY-4){for(let i=0;i<4;i++){const x=46+i*98;if(p.x>=x-6&&p.x<=x+90)play(i);}return;}
    if(stick.id!==null)return;stick.id=e.pointerId;stick.ox=e.clientX;stick.oy=e.clientY;stick.x=stick.y=0;stick.on=true;stick.moved=false;try{cv.setPointerCapture(e.pointerId);}catch(_){}
  }
}
function onMove(e){if(e.pointerId!==stick.id)return;let dx=e.clientX-stick.ox,dy=e.clientY-stick.oy;const l=Math.hypot(dx,dy),Rr=Math.max(30,innerHeight*.1);if(l>7)stick.moved=true;if(l>Rr){stick.ox+=dx/l*(l-Rr);stick.oy+=dy/l*(l-Rr);dx=dx/l*Rr;dy=dy/l*Rr;}stick.x=dx/Rr;stick.y=dy/Rr;}
function onUp(e){if(e.pointerId!==stick.id)return;stick.id=null;stick.on=false;stick.x=stick.y=0;}
function onKey(e){
  if(S.mode!=='deck')return;const k=e.key.length===1?e.key.toLowerCase():e.key;keys[k]=e.type==='keydown';
  if(e.type==='keydown'){if(k==='Escape'&&scene==='fight')paused=!paused;if('1234'.includes(k)&&k.length===1)play(+k-1);}
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(k))e.preventDefault();
}
function fit(){if(!box)return;const pw=innerWidth-32,ph=innerHeight;box.style.setProperty('--s',Math.max(.5,Math.min(pw/480,ph/270)).toFixed(4));}
function init(){
  if(inited)return;inited=true;root=$('deck');cv=$('dcv');box=$('dbox');
  setShake(v=>{shake=Math.max(shake,v);});
  cv.width=W*R;cv.height=H*R;c=cv.getContext('2d');c.imageSmoothingEnabled=false;
  addEventListener('keydown',onKey);addEventListener('keyup',onKey);addEventListener('resize',fit);
  cv.addEventListener('pointerdown',onDown);cv.addEventListener('pointermove',onMove);cv.addEventListener('pointerup',onUp);cv.addEventListener('pointercancel',onUp);cv.addEventListener('contextmenu',e=>e.preventDefault());
  fit();
}
function leave(){if(root)root.hidden=true;const wrap=$('wrap');if(wrap)wrap.style.visibility='';S.mode='hub';setMusic('hub',0);if(exitFn)exitFn();}
export function enterDeck(opts={}){
  exitFn=opts.exit;init();S.mode='deck';root.hidden=false;const wrap=$('wrap');if(wrap)wrap.style.visibility='hidden';const mb=$('mute');if(mb)mb.hidden=true;fit();
  scene='title';paused=false;setMusic('title',0);
}
export function deckStep(dt){if(!root||root.hidden)return;dt=Math.min(.05,dt);update(dt);render();}
if(typeof window!=='undefined')window.__deck={start:()=>startRun(),state:()=>({scene,run,P,boss,mana,hand,draw:draw.length,disc:disc.length,streak}),play:i=>play(i),skip:()=>{if(boss)boss.hp=1;if(scene==='fight')hit(5);},pick:i=>{if(scene==='reward'){run.deck.push(offer[i]);run.stage++;nextFight();}},begin:()=>{if(scene==='shuffle')beginFight();},step:dt=>update(dt),god:()=>{if(P)P.hp=99;},bot:(x,y)=>{stick.x=x;stick.y=y;},sh:()=>shots,zn:()=>zones,offer:()=>offer,cards:CARDS,sceneNow:()=>scene,render};
