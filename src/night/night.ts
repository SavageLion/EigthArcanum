// @ts-nocheck
/* Night mode (prototype 4): a dark top-down survival horror. You are a wizard with a candle, alone in a haunted graveyard until dawn. Seven nights.
   - Light is everything: the candle's radius is your sight and your weapon (shades melt in it), but its wax burns down. Scavenge wax stubs, light lanterns
     (they restore sanity and hold monsters back), and use the Flare (a burst of light) when swarmed.
   - Sanity drains in the dark and when horrors watch you. Low sanity brings hallucinations; zero brings madness.
   - Horrors: Shades (drift in, melt in light), Stalkers (statues that freeze while lit but sprint in the dark), Crawlers (fast, erratic), Whisperers (drain sanity
     from the dark, flee light), and Hunters (a boss from the 64, slow and unstoppable: only a Flare stuns it).
   - Each night starts with a three-card spread: THREAT (what hunts you), OMEN (the night's conditions) and GIFT (a boon with a cost). Each card may be reversed,
     which twists its meaning. Between nights you choose a boon. Survive until dawn, seven times.
   Self-contained on its own 480x270 canvas (#ncv); borrows the main game's art and music. */
import { meta, saveMeta, WIZARDS } from '../data/meta';
import { BOSSES as MB } from '../data/bossList';
import { HUNT_ART, R, WIZ_ANIM, WIZ_SETS, SPRITE_OVERRIDES, blit, blitSprite, bossFrames, clipFrame, dirOf } from '../render/sprites';
import { setMusic, sfx, wakeAudio } from '../core/audio';
import { S } from '../core/state';

const W=480,H=270,WW=760,WH=440,NIGHTS=7;
const FONT='"Pixelify Sans","Courier New",monospace',SMALL='"VT323","Courier New",monospace',TAU=Math.PI*2;
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)],clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const BASEURL=()=>import.meta.env.BASE_URL,$=id=>document.getElementById(id);
let root,cv,c,box,lm,lc,inited=false,exitFn=null,hw=null;

/* ---------- the spread: Threat, Omen, Gift. Each card has an upright and a reversed meaning that edits the night's config ---------- */
const THREATS={
  death:{n:'Death',num:'XIII',icon:'el_bone',u:{t:'Shades swarm from every side',fn:c=>{c.w={shade:3,crawler:.3};c.rate*=1.4;}},r:{t:'Fewer shades, but fast, with crawlers among them',fn:c=>{c.w={shade:1.5,crawler:2};c.monSpd*=1.25;}}},
  moon:{n:'The Moon',num:'XVIII',icon:'gear_moon',u:{t:'Stalkers: statues that move in the dark',fn:c=>{c.w={angel:2,shade:1};c.rate*=.8;}},r:{t:'Many fast stalkers',fn:c=>{c.w={angel:3,shade:.5};c.rate*=1.1;c.angelSpd=1.3;}}},
  devil:{n:'The Devil',num:'XV',icon:'gear_cursedeye',u:{t:'Whisperers feed on your sanity',fn:c=>{c.w={whisper:2,crawler:1,shade:.5};}},r:{t:'Whisperers and crawlers. Your mind frays faster',fn:c=>{c.w={whisper:3,crawler:2};c.hallu*=2;}}},
  hermit:{n:'The Hermit',num:'IX',icon:'gear_hood',u:{t:'A Hunter walks the grounds',fn:c=>{c.hunters=1;c.rate*=.6;}},r:{t:'Two Hunters, but little else',fn:c=>{c.hunters=2;c.rate*=.4;}}},
  tower:{n:'The Tower',num:'XVI',icon:'gear_brim',u:{t:'Crawlers burst from the walls every 20 seconds',fn:c=>{c.waves=20;c.waveN=5;c.rate*=.8;}},r:{t:'Bigger bursts every 14 seconds',fn:c=>{c.waves=14;c.waveN=7;}}},
  judgement:{n:'Judgement',num:'XX',icon:'gear_eclipse',u:{t:'A mixed horde',fn:c=>{c.w={shade:1,angel:.6,crawler:.6,whisper:.5};c.rate*=1.2;}},r:{t:'A larger horde, but more wax in the grass',fn:c=>{c.w={shade:1,angel:.6,crawler:.6,whisper:.5};c.rate*=1.8;c.pickup*=1.5;}}},
};
const OMENS={
  star:{n:'The Star',num:'XVII',icon:'gear_stars',u:{t:'Starlight: the night is a little less dark',fn:c=>{c.star=.14;}},r:{t:'False stars: you see things that are not there',fn:c=>{c.hallu*=1.8;}}},
  sun:{n:'The Sun',num:'XIX',icon:'gear_ember',u:{t:'A false dawn: the night is 15 seconds shorter',fn:c=>{c.dawn-=15;}},r:{t:'The dawn is late: 20 seconds longer',fn:c=>{c.dawn+=20;}}},
  fool:{n:'The Fool',num:'0',icon:'gear_fool',u:{t:'Two more lanterns stand in the grounds',fn:c=>{c.lanterns+=2;}},r:{t:'Only one lantern stands',fn:c=>{c.lanterns=1;}}},
  wheel:{n:'Wheel of Fortune',num:'X',icon:'gear_hourglass',u:{t:'Gales snuff out your candle for a moment',fn:c=>{c.gust=11;}},r:{t:'Your wax burns 40% faster',fn:c=>{c.waxBurn*=1.4;}}},
  hanged:{n:'The Hanged Man',num:'XII',icon:'gear_hood',u:{t:'Fog: you see 25% less',fn:c=>{c.lightR*=.75;}},r:{t:'Thick fog: you see 40% less, but the dead drift slower',fn:c=>{c.lightR*=.6;c.monSpd*=.75;}}},
};
const GIFTS={
  empress:{n:'The Empress',num:'III',icon:'gear_heart',u:{t:'Sanity returns slowly',fn:c=>{c.sanRegen+=1.5;}},r:{t:'Sanity returns faster, but you carry less wax',fn:c=>{c.sanRegen+=2.5;c.waxMax*=.8;}}},
  magician:{n:'The Magician',num:'I',icon:'gear_eighth',u:{t:'Your Flare recharges twice as fast',fn:c=>{c.flareCd*=.5;}},r:{t:'The Flare is huge, but costs 15 more wax',fn:c=>{c.flareR*=1.5;c.flareCost+=15;}}},
  emperor:{n:'The Emperor',num:'IV',icon:'gear_crown',u:{t:'One more wound before you fall',fn:c=>{c.hp+=1;}},r:{t:'Two more wounds, but sanity drains faster',fn:c=>{c.hp+=2;c.sanDrain*=1.6;}}},
  strength:{n:'Strength',num:'VIII',icon:'gear_whetstone',u:{t:'You move 15% faster',fn:c=>{c.speed*=1.15;}},r:{t:'You move 30% faster, but wax burns 30% faster',fn:c=>{c.speed*=1.3;c.waxBurn*=1.3;}}},
  temperance:{n:'Temperance',num:'XIV',icon:'gear_silk',u:{t:'Your wax burns 35% slower',fn:c=>{c.waxBurn*=.65;}},r:{t:'Twice the wax to find, but a dimmer flame',fn:c=>{c.pickup*=2;c.lightR*=.85;}}},
};
const defaultCfg=()=>({w:{shade:1},rate:1,hunters:0,waves:0,waveN:0,lightR:1,dawn:0,lanterns:3,gust:0,sanRegen:0,waxBurn:1,waxMax:1,speed:1,flareCd:1,flareCost:0,flareR:1,hallu:1,hp:0,monSpd:1,angelSpd:1,pickup:1,sanDrain:1,star:0});
const SLOTS=[{k:'threat',n:'THREAT',set:THREATS},{k:'omen',n:'OMEN',set:OMENS},{k:'gift',n:'GIFT',set:GIFTS}];
const BOONS={
  candle:{n:'Thicker Candle',t:'Your light is 12% wider.',max:4},waxcap:{n:'Wax Reservoir',t:'+25 maximum wax.',max:4},swift:{n:'Light Feet',t:'Move 8% faster.',max:4},
  calm:{n:'Steady Mind',t:'Sanity drains 20% slower.',max:3},wick:{n:'Long Wick',t:'Lanterns burn 40% longer.',max:3},flare:{n:'Brighter Flare',t:'The Flare recharges 20% faster and reaches 10% further.',max:4},
  wound:{n:'Thick Skin',t:'+1 maximum wound, and heal one.',max:3},scav:{n:'Scavenger',t:'One more wax stub in the grounds each night.',max:4},
};
const bn=k=>(run&&run.boons[k])||0;

/* ---------- monsters ---------- */
const MON={
  shade:{n:'Shade',hp:30,r:6,spd:38,art:'wisp',sz:30,eye:'#c9a0ff',lightDmg:45},
  crawler:{n:'Crawler',hp:14,r:5,spd:84,art:'bat',sz:30,eye:'#ff7a6e',lightDmg:45},
  angel:{n:'Stalker',hp:9999,r:7,spd:74,art:'husk',sz:36,eye:'#fff2c0'},
  whisper:{n:'Whisperer',hp:25,r:6,spd:40,art:'seer',sz:32,eye:'#7affc0',lightDmg:25},
  hunter:{n:'Hunter',hp:9999,r:20,spd:30,eye:'#ff3a3a'},
};

/* ---------- state ---------- */
let scene='title',run=null,N=null,P=null,t=0,sceneT=0,paused=false,shake=0,tally=null,spread=null,boonOffer=[],msg='',msgT=0,uid=1;
const HIT=[],popups=[],stick={id:null,ox:0,oy:0,x:0,y:0,on:false,moved:false},keys={},botIn={x:0,y:0,on:false};
const IMG={};function icon(n){if(!IMG[n]){const i=new Image();i.src=BASEURL()+'assets/icons/'+n+'.png';IMG[n]=i;}return IMG[n];}
const pop=(s,x,y,col='#fff')=>popups.push({s,x,y,t:1.1,col});
const banner=(s,n=1.6)=>{msg=s;msgT=n;};

function startRun(){
  hw=WIZARDS.find(w=>w.id===meta.lastWizard)||WIZARDS[0];
  run={night:0,hp:4,max:4,boons:{},last:{}};
  drawSpread();
}
function drawSpread(){
  spread=SLOTS.map(s=>{let id;do{id=pick(Object.keys(s.set));}while(id===run.last[s.k]||(id==='hermit'&&run.night<2));run.last[s.k]=id;return {slot:s,id,rev:Math.random()<.4};});
  scene='reading';sceneT=0;setMusic('draw',run.night,1);sfx.shuffle();
}
function cfgOf(){const cfg=defaultCfg();for(const s of spread){const d=s.slot.set[s.id];(s.rev?d.r:d.u).fn(cfg);}return cfg;}
function startNight(){
  const cfg=cfgOf(),n=run.night,len=70+6*n+cfg.dawn;
  const maxWax=Math.round((100+25*bn('waxcap'))*cfg.waxMax);
  N={cfg,len,t:0,mons:[],picks:[],lanterns:[],props:[],flares:[],parts:[],eyes:[],spawnT:3,waveT:cfg.waves||0,gustT:cfg.gust||0,gust:0,hunterT:12,hunted:0,ground:null,fog:[],flareCd:0,wax:maxWax,maxWax,san:100,sanMax:100,done:false,lastWhisper:0,heart:0};
  P={x:WW/2,y:WH/2,vx:0,vy:0,hp:run.hp+cfg.hp,inv:0,face:'south',step:0,moving:false,hurtT:0,madT:0};
  buildWorld();
  popups.length=0;scene='night';sceneT=0;setMusic(n>=NIGHTS-1?'elite':'camp',n+3,1);banner(`Night ${n+1}`,2);
}
function buildWorld(){
  // ground: dark tiles with speckle
  const g=document.createElement('canvas');g.width=WW;g.height=WH;const q=g.getContext('2d');q.fillStyle='#14101c';q.fillRect(0,0,WW,WH);
  for(let y=0;y<WH;y+=20)for(let x=0;x<WW;x+=20){q.fillStyle=((x+y)/20)%2?'#171220':'#120e1a';q.fillRect(x,y,20,20);}
  for(let i=0;i<500;i++){q.fillStyle=pick(['#1d1830','#0e0a14','#221a2a','#1a2418']);q.globalAlpha=.5;q.fillRect(rnd(0,WW),rnd(0,WH),rnd(1,3),rnd(1,2));}q.globalAlpha=1;
  q.strokeStyle='#241c33';q.lineWidth=14;q.beginPath();q.moveTo(0,WH/2);q.lineTo(WW,WH/2);q.moveTo(WW/2,0);q.lineTo(WW/2,WH);q.stroke();
  N.ground=g;
  const names=['obelisk','obsidian','thorn','arch','mushroom','voideye'];
  for(let i=0;i<26;i++){const x=rnd(30,WW-30),y=rnd(30,WH-30);if(Math.hypot(x-P.x,y-P.y)<50)continue;N.props.push({name:pick(names),x,y,s:rnd(.8,1.3)});}
  N.props.sort((a,b)=>a.y-b.y);
  const near=(x,y,d)=>Math.hypot(x-P.x,y-P.y)>d;
  const nWax=Math.round((6+bn('scav'))*N.cfg.pickup);for(let i=0;i<nWax;i++){let x,y,k=0;do{x=rnd(40,WW-40);y=rnd(40,WH-40);}while(!near(x,y,60)&&k++<20);N.picks.push({x,y,ph:rnd(0,6)});}
  for(let i=0;i<N.cfg.lanterns;i++){let x,y,k=0;do{x=rnd(60,WW-60);y=rnd(50,WH-50);}while((!near(x,y,70)||N.lanterns.some(l=>Math.hypot(l.x-x,l.y-y)<110))&&k++<30);N.lanterns.push({x,y,fuel:0,hold:0});}
  for(let i=0;i<5;i++)N.fog.push({x:rnd(0,WW),y:rnd(0,WH),r:rnd(80,140),v:rnd(-6,6)});
}

/* ---------- light ---------- */
const candleR=()=>{const base=(26+34*(N.wax/N.maxWax))*(1+.12*bn('candle'))*N.cfg.lightR;return base*(N.gust>0?.35:1)*(1+.04*Math.sin(t*9+Math.sin(t*3)));};
function lights(){
  const L=[{x:P.x,y:P.y-6,r:candleR(),k:'candle'}];
  for(const l of N.lanterns)if(l.fuel>0)L.push({x:l.x,y:l.y-8,r:Math.min(70,20+l.fuel*2.4),k:'lantern'});
  for(const f of N.flares)L.push({x:f.x,y:f.y,r:f.r*(1-f.t/f.max*.7),k:'flare'});
  return L;
}
const litAt=(L,x,y)=>L.some(l=>Math.hypot(x-l.x,y-l.y)<l.r*.9);

/* ---------- spawning ---------- */
function spawn(k,x,y){
  const d=MON[k],m={id:uid++,k,x,y,hp:d.hp,r:d.r,ph:rnd(0,6),stun:0,flash:0,vx:0,vy:0,frozen:false,art:0};
  if(k==='hunter'){m.bi=pick(MB.map((b,i)=>i).filter(i=>MB[i].hp>=400||MB[i].elite));m.col=MB[m.bi].color;}
  N.mons.push(m);return m;
}
function edgePoint(dmin=190,dmax=240){
  for(let i=0;i<12;i++){const a=rnd(0,TAU),d=rnd(dmin,dmax),x=P.x+Math.cos(a)*d,y=P.y+Math.sin(a)*d;if(x>10&&x<WW-10&&y>10&&y<WH-10)return {x,y};}
  return {x:clamp(P.x+pick([-1,1])*200,10,WW-10),y:clamp(P.y+pick([-1,1])*150,10,WH-10)};
}
function pickKind(){const w=N.cfg.w,ks=Object.keys(w);let r=Math.random()*ks.reduce((a,k)=>a+w[k],0);for(const k of ks){r-=w[k];if(r<=0)return k;}return ks[0];}

/* ---------- actions ---------- */
function flare(){
  if(scene!=='night'||N.flareCd>0||paused)return;const cost=10+N.cfg.flareCost;if(N.wax<cost){pop('not enough wax',P.x,P.y-24,'#ff7a6e');return;}
  N.wax-=cost;N.flareCd=12*N.cfg.flareCd*Math.pow(.8,bn('flare'));const r=90*N.cfg.flareR*(1+.1*bn('flare'));
  N.flares.push({x:P.x,y:P.y-6,r,t:0,max:2.2});sfx.lightning();shake=4;
  for(const m of N.mons){const d=Math.hypot(m.x-P.x,m.y-P.y);if(d>r)continue;
    if(m.k==='hunter'){m.stun=3;pop('stunned',m.x,m.y-28,'#ffd27a');}
    else if(m.k==='angel'){const a=Math.atan2(m.y-P.y,m.x-P.x);m.x=clamp(m.x+Math.cos(a)*70,10,WW-10);m.y=clamp(m.y+Math.sin(a)*70,10,WH-10);m.stun=1.5;}
    else{m.hp-=70;m.flash=.2;if(m.hp<=0)kill(m);}}
  N.san=Math.min(N.sanMax,N.san+10);
}
function kill(m){m.dead=true;for(let i=0;i<6;i++)N.parts.push({x:m.x,y:m.y,vx:rnd(-40,40),vy:rnd(-40,40),t:.6,col:MON[m.k].eye});}
function hurtP(n,from){
  if(P.inv>0||scene!=='night')return;const kk=from?from.k:'madness';run.hurt=run.hurt||{};run.hurt[kk]=(run.hurt[kk]||0)+1;P.hp-=n;P.inv=1.3;P.hurtT=.4;shake=7;sfx.hurt();pop('-'+n,P.x,P.y-24,'#ff5a4a');
  if(from){const a=Math.atan2(P.y-from.y,P.x-from.x);P.x=clamp(P.x+Math.cos(a)*22,8,WW-8);P.y=clamp(P.y+Math.sin(a)*22,8,WH-8);}
  if(P.hp<=0)die();
}
function die(){scene='dead';sceneT=0;N.done=true;finishRun(false);setMusic('defeat',0);sfx.lose();}
function dawn(){
  if(scene!=='night')return;scene='dawn';sceneT=0;N.done=true;run.night++;run.hp=Math.min(run.max,P.hp+2);sfx.win();setMusic('victory',0);
  for(const m of N.mons)kill(m);
}
function finishRun(win){
  const g=win?16:run.night*2;meta.shards=(meta.shards||0)+g;meta.night=meta.night||{best:0,wins:0};meta.night.best=Math.max(meta.night.best||0,run.night);if(win)meta.night.wins=(meta.night.wins||0)+1;saveMeta();tally={win,g};
}
function offerBoons(){
  const ks=shuffle(Object.keys(BOONS).filter(k=>bn(k)<BOONS[k].max)).slice(0,3);boonOffer=ks;scene='boon';sceneT=0;setMusic('shop',run.night);
}
function takeBoon(k){
  run.boons[k]=bn(k)+1;if(k==='wound'){run.max++;run.hp=Math.min(run.max,run.hp+1);}
  if(run.night>=NIGHTS){scene='end';sceneT=0;finishRun(true);setMusic('victory',0);return;}
  drawSpread();
}

/* ---------- update ---------- */
function update(dt){
  t+=dt;sceneT+=dt;shake*=Math.pow(.02,dt);if(msgT>0)msgT-=dt;
  for(const p of popups)p.t-=dt;for(let i=popups.length-1;i>=0;i--)if(popups[i].t<=0)popups.splice(i,1);
  if(scene==='dawn'){if(N){for(const p of N.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.t-=dt;}}if(sceneT>3)offerBoons();return;}
  if(scene!=='night'||paused)return;
  const cfg=N.cfg;N.t+=dt;const L=lights();
  // player
  let ix=(keys.d||keys.ArrowRight?1:0)-(keys.a||keys.ArrowLeft?1:0)+(botIn.on?botIn.x:stick.x),iy=(keys.s||keys.ArrowDown?1:0)-(keys.w||keys.ArrowUp?1:0)+(botIn.on?botIn.y:stick.y);const l=Math.hypot(ix,iy);if(l>1){ix/=l;iy/=l;}
  P.moving=l>.12;const sp=64*cfg.speed*(1+.08*bn('swift'))*(P.hurtT>0?.6:1);
  if(P.moving){P.face=dirOf(Math.atan2(iy,ix));P.step+=dt;}P.x=clamp(P.x+ix*sp*dt,8,WW-8);P.y=clamp(P.y+iy*sp*dt,8,WH-8);P.inv-=dt;P.hurtT-=dt;
  // wax, gusts, sanity
  N.wax=Math.max(0,N.wax-1.05*cfg.waxBurn*dt);N.flareCd=Math.max(0,N.flareCd-dt);
  if(cfg.gust){N.gustT-=dt;if(N.gustT<=0){N.gust=2.2;N.gustT=cfg.gust;banner('A gale snuffs the flame',1);}if(N.gust>0)N.gust-=dt;}
  const inLantern=N.lanterns.some(q=>q.fuel>0&&Math.hypot(q.x-P.x,q.y-P.y)<Math.min(70,20+q.fuel*2.4)*.9);
  let san=-.35*cfg.sanDrain*(1-.2*bn('calm'));if(inLantern)san+=7;san+=cfg.sanRegen;
  // pickups and lanterns
  for(const pk of N.picks)if(!pk.got&&Math.hypot(pk.x-P.x,pk.y-P.y)<12){pk.got=true;N.wax=Math.min(N.maxWax,N.wax+24);pop('+wax',pk.x,pk.y-10,'#ffd27a');sfx.coin();}
  for(const q of N.lanterns){if(q.fuel>0)q.fuel-=dt/(1+.4*bn('wick'))*(1);
    if(q.fuel<=0&&Math.hypot(q.x-P.x,q.y-P.y)<16&&N.wax>=18){q.hold+=dt;if(q.hold>.7){q.hold=0;N.wax-=18;q.fuel=40*(1+.4*bn('wick'));pop('lit',q.x,q.y-20,'#ffe9a0');sfx.shield();}}else q.hold=0;}
  // spawns
  const maxAlive=6+2*run.night;N.spawnT-=dt;
  if(N.spawnT<=0){N.spawnT=5/(cfg.rate*(1+.2*run.night));if(N.mons.length<maxAlive){const e=edgePoint();spawn(pickKind(),e.x,e.y);}}
  if(cfg.hunters&&N.hunted<cfg.hunters&&N.t>=N.hunterT+N.hunted*10){N.hunted++;const e=edgePoint(220,260);spawn('hunter',e.x,e.y);banner('Something large is walking the grounds',2.4);sfx.rage();}
  if(cfg.waves){N.waveT-=dt;if(N.waveT<=0){N.waveT=cfg.waves;const n=cfg.waveN+run.night;for(let i=0;i<n;i++){const e=edgePoint(200,260);spawn('crawler',e.x,e.y);}banner('The walls give way',1.6);sfx.rage();}}
  // monsters
  let watching=0;
  for(const m of N.mons){
    const d=MON[m.k],dx=P.x-m.x,dy=P.y-m.y,dist=Math.hypot(dx,dy)||1,lit=litAt(L,m.x,m.y);m.ph+=dt;m.flash-=dt;m.stun-=dt;m.frozen=false;
    let spd=d.spd*cfg.monSpd,mvx=dx/dist,mvy=dy/dist;
    if(m.stun>0)spd=0;
    else if(m.k==='shade'){if(lit){spd*=.55;m.hp-=d.lightDmg*dt;m.flash=.05;if(m.hp<=0)kill(m);}}
    else if(m.k==='crawler'){const w=Math.sin(m.ph*7)*.9;const c0=Math.cos(w),s0=Math.sin(w);[mvx,mvy]=[mvx*c0-mvy*s0,mvx*s0+mvy*c0];if(lit){m.hp-=d.lightDmg*dt;m.flash=.05;spd*=.7;if(m.hp<=0)kill(m);}}
    else if(m.k==='angel'){if(lit){spd=0;m.frozen=true;}else spd*=cfg.angelSpd;}
    else if(m.k==='whisper'){if(dist<80){mvx=-mvx;mvy=-mvy;}else if(dist<100)spd=0;spd=Math.min(spd,40);
      if(dist<150){san-=2.5;watching++;}if(lit){m.hp-=d.lightDmg*dt;m.flash=.05;mvx=-mvx;mvy=-mvy;spd*=1.4;if(m.hp<=0)kill(m);}}
    else if(m.k==='hunter'){if(m.slow>0)spd*=.4;}
    m.x=clamp(m.x+mvx*spd*dt,6,WW-6);m.y=clamp(m.y+mvy*spd*dt,6,WH-6);m.vx=mvx*spd;m.vy=mvy*spd;
    if(m.k!=='whisper'&&lit&&dist<150&&m.k!=='hunter')watching+=.5;
    if(!m.dead&&dist<d.r+6){
      if(m.k==='shade'){hurtP(1,m);kill(m);}else if(m.k==='crawler'){hurtP(1,m);m.stun=.9;m.x-=mvx*30;m.y-=mvy*30;}
      else if(m.k==='angel'){hurtP(1,m);N.san=Math.max(0,N.san-15);m.x=clamp(m.x-mvx*95,10,WW-10);m.y=clamp(m.y-mvy*95,10,WH-10);m.stun=1.2;}
      else if(m.k==='hunter'){hurtP(1,m);m.stun=1.8;}
    }
  }
  N.mons=N.mons.filter(m=>!m.dead);
  if(watching>0)san-=Math.min(3,watching)*1;
  N.san=clamp(N.san+san*dt,0,N.sanMax);
  if(N.san<=0){P.madT+=dt;if(P.madT>8){P.madT=0;hurtP(1);pop('madness',P.x,P.y-30,'#c9a0ff');}}else P.madT=0;
  // hallucinations
  const hallu=clamp((45-N.san)/45,0,1)*cfg.hallu;
  if(Math.random()<hallu*.9*dt){const a=rnd(0,TAU),r=rnd(70,150);N.eyes.push({x:P.x+Math.cos(a)*r,y:P.y+Math.sin(a)*r,t:rnd(.8,1.6),col:pick(['#ff7a6e','#c9a0ff','#fff2c0'])});if(Math.random()<.3)pop(pick(['it is behind you','do not look','it knows your name','still here']),P.x,P.y-36,'#8a6aa8');}
  for(const e of N.eyes)e.t-=dt;N.eyes=N.eyes.filter(e=>e.t>0);
  for(const f of N.flares)f.t+=dt;N.flares=N.flares.filter(f=>f.t<f.max);
  for(const p of N.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.t-=dt;}N.parts=N.parts.filter(p=>p.t>0);
  for(const f of N.fog){f.x+=f.v*dt;if(f.x<-150)f.x=WW+150;if(f.x>WW+150)f.x=-150;}
  if(Math.random()<dt*.5&&N.san<30)sfx.toll&&0;
  if(N.t>=N.len)dawn();
}

/* ---------- drawing ---------- */
function glow(x,y,r,col,a){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');c.globalAlpha=a;c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.globalAlpha=1;}
function text(s,x,y,col='#f1e8d4',size=8,align='center',font=FONT,weight=700){c.font=`${weight} ${size}px ${font}`;c.textAlign=align;c.fillStyle='#07040f';c.fillText(s,x+.7,y+.7);c.fillStyle=col;c.fillText(s,x,y);}
function wrap(s,n){const w=s.split(' '),L=[];let l='';for(const x of w){if((l+' '+x).trim().length>n){L.push(l);l=x;}else l=(l+' '+x).trim();}if(l)L.push(l);return L;}
const img=(n,x,y,w,h,flip)=>{const i=icon(n);if(i.complete&&i.naturalWidth){c.imageSmoothingEnabled=false;if(flip){c.save();c.translate(x+w/2,y+h/2);c.scale(1,-1);c.drawImage(i,-w/2,-h/2,w,h);c.restore();}else c.drawImage(i,x,y,w,h);}};
function btn(x,y,w,h,s,main,fn){HIT.push({x,y,w,h,fn});c.fillStyle=main?'#a8322e':'transparent';c.fillRect(x,y,w,h);if(!main){c.strokeStyle='#5a4a82';c.lineWidth=2;c.strokeRect(x+1,y+1,w-2,h-2);}text(s,x+w/2,y+h/2+4,main?'#fff2e0':'#f1e8d4',main?11:9,'center',FONT);}
function wizSprite(){
  const id=hw?hw.id:'raven',dir=P.face;
  if(id==='raven'){const A=SPRITE_OVERRIDES.anim&&SPRITE_OVERRIDES.anim.arena,w=A&&A.walk&&A.walk[dir];if(P.moving&&w)return clipFrame(w,P.step);return (SPRITE_OVERRIDES.wizardDirs&&SPRITE_OVERRIDES.wizardDirs[dir])||(w&&w.frames[0]);}
  const A=WIZ_ANIM[id],w=A&&A.walk&&A.walk[dir];if(P.moving&&w)return clipFrame(w,P.step);const set=WIZ_SETS[id];return (set&&set.dirs[dir])||(w&&w.frames[0]);
}
function drawMon(m,x,y){
  const d=MON[m.k];
  c.fillStyle='rgba(0,0,0,.4)';c.beginPath();c.ellipse(x,y+d.r*.8,d.r*.9,d.r*.35,0,0,TAU);c.fill();
  if(m.k==='hunter'){const fr=bossFrames(m.bi),s=fr&&fr[Math.floor(t*5)%fr.length];if(s&&s.img){const im=s.img,k=64/(im.width*(im.hi?1/R:1));c.save();c.translate(x,y-10);c.scale(k,k);if(m.stun>0)c.globalAlpha=.6;blit(c,0,0,im);c.restore();}else{c.fillStyle=m.col;c.beginPath();c.arc(x,y-8,18,0,TAU);c.fill();}return;}
  const A=HUNT_ART.enemies[d.art];
  if(A&&A.frames.length){const im=A.frames[m.frozen?0:Math.floor(m.ph*A.fps)%A.frames.length],sz=d.sz,h=sz*im.height/im.width,flip=m.vx<-4?-1:1;c.save();c.translate(x,y);c.scale(flip,1);c.drawImage(im,-sz/2,-h*.58,sz,h);c.restore();if(m.flash>0)glow(x,y-6,sz*.55,'#ffffff',.5);
    if(m.frozen){c.strokeStyle='#fff2c0';c.globalAlpha=.4;c.lineWidth=1;c.beginPath();c.arc(x,y-6,12,0,TAU);c.stroke();c.globalAlpha=1;}}
  else{c.fillStyle=d.eye;c.beginPath();c.arc(x,y,d.r,0,TAU);c.fill();}
}
function drawNight(){
  const cfg=N.cfg,L=lights(),cam={x:clamp(P.x-W/2,0,WW-W),y:clamp(P.y-H/2,0,WH-H)};
  const jit=N.san<35?(35-N.san)/35*1.6:0,ox=-cam.x+(jit?rnd(-jit,jit):0)+(shake>.2?rnd(-shake,shake)*.5:0),oy=-cam.y+(jit?rnd(-jit,jit):0)+(shake>.2?rnd(-shake,shake)*.5:0);
  c.save();c.translate(ox,oy);
  c.drawImage(N.ground,0,0);
  // warm glow under the lights
  for(const l of L)glow(l.x,l.y,l.r*1.1,l.k==='flare'?'#fff0b0':'#ff9a50',l.k==='flare'?.35:.16);
  // pickups and lanterns (props sorted with monsters by y)
  const items=[];
  for(const p of N.props)items.push({y:p.y,fn:()=>{const D=HUNT_ART.decor[p.name];if(D)c.drawImage(D,p.x-D.width*p.s*.5*.5,p.y-D.height*p.s*.5*.9,D.width*p.s*.5,D.height*p.s*.5);else{c.fillStyle='#2a2238';c.fillRect(p.x-4,p.y-10,8,12);}}});
  for(const q of N.lanterns)items.push({y:q.y,fn:()=>{c.fillStyle='#3a2d24';c.fillRect(q.x-1.5,q.y-14,3,16);c.fillStyle=q.fuel>0?'#ffe08a':'#4a4058';c.fillRect(q.x-4,q.y-22,8,9);c.strokeStyle='#8f7440';c.lineWidth=1;c.strokeRect(q.x-3.5,q.y-21.5,7,8);if(q.fuel>0)glow(q.x,q.y-18,26,'#ffb860',.55);else if(q.hold>0){c.strokeStyle='#ffe9a0';c.beginPath();c.arc(q.x,q.y-18,10,-1.57,-1.57+TAU*q.hold/.7);c.stroke();}}});
  for(const pk of N.picks)if(!pk.got)items.push({y:pk.y,fn:()=>{c.fillStyle='#e8dcc0';c.fillRect(pk.x-2,pk.y-7,4,8);glow(pk.x,pk.y-8,9,'#ffb860',.5+.2*Math.sin(t*5+pk.ph));c.fillStyle='#ffd27a';c.fillRect(pk.x-1,pk.y-10,2,3);}});
  for(const m of N.mons)items.push({y:m.y,fn:()=>drawMon(m,Math.round(m.x),Math.round(m.y))});
  items.push({y:P.y,fn:()=>{
    c.fillStyle='rgba(0,0,0,.4)';c.beginPath();c.ellipse(P.x,P.y+1,8,3,0,0,TAU);c.fill();
    if(P.inv>0&&Math.floor(t*18)%2)c.globalAlpha=.4;const s=wizSprite();if(s)blitSprite(c,s,Math.round(P.x),Math.round(P.y)+8,hw&&hw.id!=='raven'?1.2:1.35);else{c.fillStyle='#8f6cff';c.fillRect(P.x-5,P.y-14,10,16);}c.globalAlpha=1;
    glow(P.x+6,P.y-10,10,'#ffb860',.5);}});
  items.sort((a,b)=>a.y-b.y);for(const it of items)it.fn();
  for(const p of N.parts){c.globalAlpha=clamp(p.t*2,0,1);c.fillStyle=p.col;c.fillRect(p.x,p.y,2,2);}c.globalAlpha=1;
  // fog
  for(const f of N.fog)glow(f.x,f.y,f.r,'#8a86a8',.07);
  // flares
  for(const f of N.flares){const k=f.t/f.max;c.strokeStyle='#fff6c0';c.globalAlpha=1-k;c.lineWidth=2;c.beginPath();c.arc(f.x,f.y,f.r*clamp(k*3,0,1),0,TAU);c.stroke();c.globalAlpha=1;}
  c.restore();
  // darkness
  const prog=clamp((N.t-N.len*.75)/(N.len*.25),0,1),dark=.965-prog*.55-cfg.star;
  lc.globalCompositeOperation='source-over';lc.clearRect(0,0,W,H);lc.fillStyle=`rgba(3,1,10,${dark})`;lc.fillRect(0,0,W,H);lc.globalCompositeOperation='destination-out';
  for(const l of L){const x=l.x+ox,y=l.y+oy,g=lc.createRadialGradient(x,y,l.r*.12,x,y,l.r);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(.55,'rgba(0,0,0,.9)');g.addColorStop(1,'rgba(0,0,0,0)');lc.fillStyle=g;lc.beginPath();lc.arc(x,y,l.r,0,TAU);lc.fill();}
  lc.globalCompositeOperation='source-over';c.drawImage(lm,0,0,W,H);
  if(prog>0){c.fillStyle=`rgba(255,170,90,${prog*.12})`;c.fillRect(0,0,W,H);}
  // eyes in the dark (above the darkness)
  c.save();c.translate(ox,oy);
  for(const m of N.mons){if(litAt(L,m.x,m.y))continue;const d=Math.hypot(m.x-P.x,m.y-P.y);if(d>175)continue;const big=m.k==='hunter',a=clamp(1-d/175,.25,1);c.globalAlpha=a;glow(m.x-3*(big?2:1),m.y-6,big?9:4,MON[m.k].eye,.9);glow(m.x+3*(big?2:1),m.y-6,big?9:4,MON[m.k].eye,.9);c.fillStyle='#fff';c.fillRect(m.x-4*(big?2:1),m.y-7,2,1.5);c.fillRect(m.x+2*(big?2:1),m.y-7,2,1.5);c.globalAlpha=1;}
  for(const e of N.eyes){c.globalAlpha=clamp(e.t,0,1)*.8;glow(e.x-3,e.y,4,e.col,.9);glow(e.x+3,e.y,4,e.col,.9);c.fillStyle='#fff';c.fillRect(e.x-4,e.y-1,2,1.5);c.fillRect(e.x+2,e.y-1,2,1.5);c.globalAlpha=1;}
  for(const p of popups){c.globalAlpha=clamp(p.t*2,0,1);text(p.s,p.x,p.y-(1.1-p.t)*18,p.col,8,'center',FONT);}c.globalAlpha=1;
  c.restore();
  // low sanity vignette
  if(N.san<40){const a=(40-N.san)/40*.45*(.6+.4*Math.sin(t*(3+(40-N.san)/8)));const g=c.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,W*.6);g.addColorStop(0,'rgba(120,0,20,0)');g.addColorStop(1,`rgba(120,0,20,${a})`);c.fillStyle=g;c.fillRect(0,0,W,H);}
  if(P.hurtT>0){c.fillStyle=`rgba(255,40,40,${P.hurtT*.35})`;c.fillRect(0,0,W,H);}
  hud();
}
function hud(){
  const cfg=N.cfg;
  c.fillStyle='rgba(7,4,15,.6)';c.fillRect(0,0,W,16);
  text(`Night ${run.night+1} / ${NIGHTS}`,50,11,'#f1e8d4',9,'center',FONT);
  HIT.push({x:0,y:0,w:16,h:16,fn:()=>{paused=true;}});text('II',8,11,'#a79bc0',8,'center',FONT);
  for(let i=0;i<run.max+cfg.hp;i++){const x=116+i*11;c.fillStyle=i<P.hp?'#ff6a86':'#3a2a46';c.beginPath();c.moveTo(x,12);c.bezierCurveTo(x-5,7,x-2,3,x,5.5);c.bezierCurveTo(x+2,3,x+5,7,x,12);c.fill();}
  // dawn track
  const p=clamp(N.t/N.len,0,1);c.fillStyle='#1b1430';c.fillRect(250,6,120,4);c.fillStyle=p>.75?'#ffb860':'#6a5aa8';c.fillRect(250,6,120*p,4);text('dawn',246,11,'#8f7aa8',8,'right',SMALL);img('gear_ember',372,3,10,10);
  // sanity and wax
  text('mind',396,11,'#8f7aa8',8,'right',SMALL);c.fillStyle='#1b1430';c.fillRect(398,6,36,4);c.fillStyle=N.san<30?'#ff5a6e':'#c9a0ff';c.fillRect(398,6,36*N.san/N.sanMax,4);
  text('wax',452,11,'#8f7aa8',8,'right',SMALL);c.fillStyle='#1b1430';c.fillRect(454,6,24,4);c.fillStyle=N.wax<20?'#ff7a6e':'#ffd27a';c.fillRect(454,6,24*N.wax/N.maxWax,4);
  // the spread, small
  spread.forEach((s,i)=>{const x=6+i*22;c.fillStyle='#150f26';c.fillRect(x,20,20,26);c.strokeStyle=s.rev?'#ff5a6e':'#dcb868';c.lineWidth=1;c.strokeRect(x+.5,20.5,19,25);img(s.slot.set[s.id].icon,x+4,24,12,12,s.rev);text(s.slot.n[0],x+10,43,'#8f7aa8',6,'center',SMALL);});
  if(msgT>0){c.globalAlpha=clamp(msgT*2,0,1);text(msg,240,60,'#e8d8c0',13,'center',FONT);c.globalAlpha=1;}
  // flare button
  const bx=448,by=232,r=18,ready=N.flareCd<=0&&N.wax>=10+cfg.flareCost;HIT.push({x:bx-r,y:by-r,w:2*r,h:2*r,fn:flare});
  c.fillStyle=ready?'rgba(255,200,110,.25)':'rgba(40,30,60,.6)';c.beginPath();c.arc(bx,by,r,0,TAU);c.fill();c.strokeStyle=ready?'#ffd27a':'#5a4a82';c.lineWidth=2;c.stroke();
  if(N.flareCd>0){c.strokeStyle='#ffd27a';c.beginPath();c.arc(bx,by,r+3,-1.57,-1.57+TAU*(1-N.flareCd/(12*cfg.flareCd*Math.pow(.8,bn('flare')))));c.stroke();}
  text('FLARE',bx,by+3,ready?'#ffe9a0':'#6a5a8a',8,'center',FONT);
  if(stick.on&&stick.moved){const r2=cv.getBoundingClientRect(),k=W/r2.width,sx=(stick.ox-r2.left)*k,sy=(stick.oy-r2.top)*k;c.globalAlpha=.3;c.strokeStyle='#fff';c.lineWidth=1.5;c.beginPath();c.arc(sx,sy,20,0,TAU);c.stroke();c.fillStyle='#fff';c.beginPath();c.arc(sx+stick.x*20,sy+stick.y*20,7,0,TAU);c.fill();c.globalAlpha=1;}
}
function cardFace(s,x,y,w,h,flipK){
  const d=s.slot.set[s.id];c.save();c.translate(x+w/2,y+h/2);c.scale(Math.max(.02,Math.abs(Math.cos((1-flipK)*Math.PI/2))),1);c.translate(-w/2,-h/2);
  if(flipK<.5){c.fillStyle='#241838';c.fillRect(0,0,w,h);c.strokeStyle='#dcb868';c.lineWidth=1.5;c.strokeRect(4,4,w-8,h-8);c.strokeStyle='#6a4ca8';c.strokeRect(9,9,w-18,h-18);c.fillStyle='#dcb868';c.beginPath();for(let i=0;i<8;i++){const r=i%2?7:16,a=i/8*TAU-Math.PI/2;c.lineTo(w/2+Math.cos(a)*r,h/2+Math.sin(a)*r);}c.closePath();c.fill();}
  else{c.fillStyle='#1a1228';c.fillRect(0,0,w,h);c.strokeStyle=s.rev?'#ff5a6e':'#dcb868';c.lineWidth=2;c.strokeRect(1,1,w-2,h-2);c.strokeStyle='#6a4ca8';c.lineWidth=1;c.strokeRect(6,6,w-12,h-12);
    text(String(d.num),w/2,20,'#dcb868',10,'center',FONT);img(d.icon,w/2-18,28,36,36,s.rev);wrap(d.n,13).forEach((q,i)=>text(q,w/2,82+i*10,'#f1e8d4',9,'center',FONT));
    text(s.rev?'REVERSED':'upright',w/2,h-12,s.rev?'#ff6a86':'#8f7aa8',8,'center',FONT);}
  c.restore();
}
function readingScene(){
  c.fillStyle='#07040f';c.fillRect(0,0,W,H);const g=c.createRadialGradient(240,120,10,240,120,280);g.addColorStop(0,'#26102a');g.addColorStop(1,'#07040f');c.fillStyle=g;c.fillRect(0,0,W,H);
  text(`Night ${run.night+1} of ${NIGHTS}`,240,22,'#e8d8c0',14,'center',FONT);text('The cards are drawn. Fate is not asked.',240,36,'#8f7aa8',10,'center',SMALL,400);
  spread.forEach((s,i)=>{const x=40+i*150,y=46,k=clamp((sceneT-.5-i*.8)*2.2,0,1);text(s.slot.n,x+50,y-2,'#a79bc0',8,'center',SMALL);cardFace(s,x,y,100,128,k);
    if(k>=1){const d=s.slot.set[s.id],e=s.rev?d.r:d.u;wrap(e.t,26).slice(0,3).forEach((q,j)=>text(q,x+50,y+142+j*9,s.rev?'#ff9aa8':'#d8cdee',8,'center',SMALL,400));}});
  if(sceneT>3.3)btn(170,236,140,24,'Face the night',true,startNight);
}
function nightEndScenes(){
  if(scene==='dawn'){c.fillStyle='rgba(255,190,110,.18)';c.fillRect(0,0,W,H);text('Dawn',240,110,'#ffe9a0',24,'center',FONT);text(`Night ${run.night} survived`,240,132,'#f1e8d4',11,'center',FONT);}
  if(scene==='dead'){c.fillStyle=`rgba(8,0,6,${clamp(sceneT*.6,0,.85)})`;c.fillRect(0,0,W,H);if(sceneT>.8){text('The dark takes you',240,100,'#ff7a6e',20,'center',FONT);text(`${run.night} of ${NIGHTS} nights survived  -  +${tally.g} shards`,240,124,'#a79bc0',11,'center',SMALL,400);btn(150,160,180,24,'Another night',true,startRun);btn(190,192,100,18,'Sanctum',false,()=>{scene='title';setMusic('title',0);});}}
}
function boonScene(){
  c.fillStyle='#07040f';c.fillRect(0,0,W,H);const g=c.createRadialGradient(240,120,10,240,120,280);g.addColorStop(0,'#2a1810');g.addColorStop(1,'#07040f');c.fillStyle=g;c.fillRect(0,0,W,H);
  text(`Night ${run.night} survived`,240,24,'#ffe9a0',14,'center',FONT);text('Before the next dusk, choose what to carry',240,40,'#a79bc0',10,'center',SMALL,400);
  boonOffer.forEach((k,i)=>{const x=40+i*150,y=58,w=130,h=110,b=BOONS[k];c.fillStyle='#150f26';c.fillRect(x,y,w,h);c.strokeStyle='#dcb868';c.lineWidth=1.5;c.strokeRect(x+.5,y+.5,w-1,h-1);
    text(b.n,x+w/2,y+26,'#f1e8d4',11,'center',FONT);wrap(b.t,22).forEach((q,j)=>text(q,x+w/2,y+48+j*10,'#b7a9d6',9,'center',SMALL,400));text(`level ${bn(k)+1}`,x+w/2,y+h-10,'#8f7aa8',8,'center',SMALL);HIT.push({x,y,w,h,fn:()=>takeBoon(k)});});
  text(`Wounds ${run.hp}/${run.max}`,240,200,'#ff8fa0',10,'center',SMALL,400);
}
function titleScene(){
  c.fillStyle='#07040f';c.fillRect(0,0,W,H);const g=c.createRadialGradient(240,130,10,240,130,260);g.addColorStop(0,'#2a1020');g.addColorStop(1,'#07040f');c.fillStyle=g;c.fillRect(0,0,W,H);
  glow(240,150,70,'#ff9a50',.3+.05*Math.sin(t*5));c.fillStyle='#e8dcc0';c.fillRect(237,150,6,22);c.fillStyle='#ffd27a';c.beginPath();c.ellipse(240,146,3,6+Math.sin(t*9),0,0,TAU);c.fill();
  text('THE EIGHTH ARCANUM',240,34,'#dcb868',20,'center',FONT);text('The Long Night',240,56,'#ff7a6e',14,'center',FONT);text('Seven nights. One candle. Survive until dawn.',240,76,'#a79bc0',10,'center',SMALL,400);
  btn(180,196,120,24,'Light the candle',true,startRun);btn(190,228,100,18,'Sanctum',false,leave);
  const b=(meta.night&&meta.night.best)||0;text(`Best: ${b} of ${NIGHTS} nights  -  Dawns seen: ${(meta.night&&meta.night.wins)||0}`,240,262,'#6a5a8a',9,'center',SMALL,400);
}
function endScene(){
  c.fillStyle='#07040f';c.fillRect(0,0,W,H);glow(240,120,120,'#ffb860',.3);
  text('THE LAST DAWN',240,80,'#ffe9a0',22,'center',FONT);text(`You survived all ${NIGHTS} nights  -  +${tally.g} shards`,240,104,'#a79bc0',11,'center',SMALL,400);
  btn(150,150,180,24,'Another night',true,startRun);btn(190,184,100,18,'Sanctum',false,()=>{scene='title';setMusic('title',0);});
}
function render(){
  HIT.length=0;c.setTransform(R,0,0,R,0,0);c.imageSmoothingEnabled=false;
  if(scene==='title')titleScene();else if(scene==='reading')readingScene();else if(scene==='boon')boonScene();else if(scene==='end')endScene();
  else if(N){drawNight();nightEndScenes();}
  if(paused){c.fillStyle='rgba(7,4,15,.82)';c.fillRect(0,0,W,H);HIT.length=0;text('Paused',240,90,'#dcb868',16,'center',FONT);btn(170,110,140,24,'Resume',true,()=>{paused=false;});btn(170,142,140,20,'Abandon the night',false,()=>{paused=false;die();});}
}

/* ---------- input and integration ---------- */
const pt=e=>{const r=cv.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};};
function onDown(e){
  wakeAudio();const p=pt(e);
  for(let i=HIT.length-1;i>=0;i--){const b=HIT[i];if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h)return b.fn();}
  if(scene==='night'&&!paused&&stick.id===null){stick.id=e.pointerId;stick.ox=e.clientX;stick.oy=e.clientY;stick.x=stick.y=0;stick.on=true;stick.moved=false;try{cv.setPointerCapture(e.pointerId);}catch(_){}}
}
function onMove(e){if(e.pointerId!==stick.id)return;let dx=e.clientX-stick.ox,dy=e.clientY-stick.oy;const l=Math.hypot(dx,dy),Rr=Math.max(30,innerHeight*.1);if(l>7)stick.moved=true;if(l>Rr){stick.ox+=dx/l*(l-Rr);stick.oy+=dy/l*(l-Rr);dx=dx/l*Rr;dy=dy/l*Rr;}stick.x=dx/Rr;stick.y=dy/Rr;}
function onUp(e){if(e.pointerId!==stick.id)return;stick.id=null;stick.on=false;stick.x=stick.y=0;}
function onKey(e){if(S.mode!=='night')return;const k=e.key.length===1?e.key.toLowerCase():e.key;keys[k]=e.type==='keydown';if(e.type==='keydown'){if(k==='Escape'&&scene==='night')paused=!paused;if(k===' '||k==='f')flare();}if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(k))e.preventDefault();}
function fit(){if(!box)return;const pw=innerWidth-32,ph=innerHeight;box.style.setProperty('--s',Math.max(.5,Math.min(pw/480,ph/270)).toFixed(4));}
function init(){
  if(inited)return;inited=true;root=$('night');cv=$('ncv');box=$('nbox');cv.width=W*R;cv.height=H*R;c=cv.getContext('2d');c.imageSmoothingEnabled=false;
  lm=document.createElement('canvas');lm.width=W;lm.height=H;lc=lm.getContext('2d');
  addEventListener('keydown',onKey);addEventListener('keyup',onKey);addEventListener('resize',fit);cv.addEventListener('pointerdown',onDown);cv.addEventListener('pointermove',onMove);cv.addEventListener('pointerup',onUp);cv.addEventListener('pointercancel',onUp);cv.addEventListener('contextmenu',e=>e.preventDefault());fit();
}
function leave(){if(root)root.hidden=true;const wrap=$('wrap');if(wrap)wrap.style.visibility='';S.mode='hub';setMusic('hub',0);if(exitFn)exitFn();}
export function enterNight(opts={}){
  exitFn=opts.exit;init();S.mode='night';root.hidden=false;const wrap=$('wrap');if(wrap)wrap.style.visibility='hidden';const mb=$('mute');if(mb)mb.hidden=true;fit();
  scene='title';paused=false;N=null;setMusic('title',0);
}
export function nightStep(dt){if(!root||root.hidden)return;dt=Math.min(.05,dt);update(dt);render();}
if(typeof window!=='undefined')window.__night={start:()=>startRun(),state:()=>({scene,run,N,P,spread,boonOffer}),begin:()=>{if(scene==='reading')startNight();},step:dt=>update(dt),bot:(x,y)=>{botIn.on=true;botIn.x=x;botIn.y=y;},flare:()=>flare(),boon:i=>takeBoon(boonOffer[i]),mon:MON,sceneNow:()=>scene,render,set:(k,v)=>{if(k==='san')N.san=v;if(k==='hp')P.hp=v;if(k==='wax')N.wax=v;},spawn:(k,x,y)=>spawn(k,x,y)};
