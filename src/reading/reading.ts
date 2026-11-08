// @ts-nocheck
/* Reading mode (prototype 3): a Balatro-style score game made of tarot. Each round the Fates deal a spread (Past, Present, Future): the Present card is
   this round's rule, the Future card previews the next, and the Past echoes your best hand from last round. You play 1-5 cards from a hand of eight
   to reach the round's target score; you can turn (reverse) Fate cards and your own cards. Miss the target and you lose a Fate Heart. Survive eight rounds.
   Hands: High Card, Pair, Two Pair, Triple, Full House, Quartet, Run, Suit, Trinity (a suited run: Past, Present, Future), Court. Only the cards that
   form the hand score. Harmony (Wands+Swords, Cups+Pentacles) adds mult, Clash (Wands+Cups, Swords+Pentacles) adds chips, all four suits make a Wheel,
   ranks summing to 21 are the World (x1.5). Between rounds: a shop for courts, Major Arcana, charms and hand studies.
   Self-contained on its own 480x270 canvas (#rcv). */
import { meta, saveMeta } from '../data/meta';
import { BOSSES as MB, BOSS_EL } from '../data/bossList';
import { R, blit, bossFrames } from '../render/sprites';
import { setMusic, sfx, wakeAudio } from '../core/audio';
import { S } from '../core/state';

const W=480,H=270,ROUNDS=8,HAND=8,TGT=[220,420,720,1200,2100,3500,5800,9200];
const FONT='"Pixelify Sans","Courier New",monospace',SMALL='"VT323","Courier New",monospace',TAU=Math.PI*2;
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)],clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const BASEURL=()=>import.meta.env.BASE_URL,$=id=>document.getElementById(id);
let root,cv,c,box,inited=false,exitFn=null;

/* ---------- the deck ---------- */
const SU={wands:{n:'Wands',col:'#ff9a5a',icon:'el_fire'},cups:{n:'Cups',col:'#8fdcf0',icon:'el_frost'},swords:{n:'Swords',col:'#f0dc55',icon:'el_storm'},pents:{n:'Pentacles',col:'#8fe06a',icon:'el_thorn'}};
const SUITS=Object.keys(SU);
const RK=r=>r===1?'A':r===11?'P':r===12?'N':r===13?'Q':r===14?'K':String(r);
const RNAME={11:'Page',12:'Knight',13:'Queen',14:'King'};
const cv_=c=>c.rev?0:(c.r===1?11:Math.min(c.r,10)),isCourt=c=>c.r>=11;
const MAJ={
  fool:{n:'The Fool',num:'0',icon:'gear_fool',cost:6,t:'Wild: counts as any rank and suit.'},
  magician:{n:'The Magician',num:'I',icon:'gear_eighth',cost:5,t:'+6 mult when played.'},
  priestess:{n:'High Priestess',num:'II',icon:'gear_silk',cost:4,t:'+40 chips when played.'},
  empress:{n:'The Empress',num:'III',icon:'gear_heart',cost:5,t:'+3 mult and +2 gold when played.'},
  emperor:{n:'The Emperor',num:'IV',icon:'gear_crown',cost:7,t:'x1.5 mult when played.'},
  star:{n:'The Star',num:'XVII',icon:'gear_stars',cost:5,t:'+20 chips and +1 discard when played.'},
  sun:{n:'The Sun',num:'XIX',icon:'gear_phoenix',cost:6,t:'Doubles the chips of the cards that score.'},
  world:{n:'The World',num:'XXI',icon:'gear_pearl',cost:9,t:'x2 mult when played.'},
};
let uid=1;const mkMinor=(s,r)=>({id:uid++,s,r}),mkMajor=m=>({id:uid++,m});

/* ---------- Fate cards: the Present is the round's rule; turn one over to read its reversed meaning ---------- */
const FATES={
  sun:{n:'The Sun',num:'XIX',icon:'gear_ember',u:{t:'Wands score +3 mult each',e:{suitMult:{wands:3}}},r:{t:'Wands score no chips. Target -20%',e:{suitZero:'wands',tgt:.8}}},
  moon:{n:'The Moon',num:'XVIII',icon:'gear_moon',u:{t:'Cups score +3 mult each',e:{suitMult:{cups:3}}},r:{t:'Cups score no chips. +1 discard',e:{suitZero:'cups',disc:1}}},
  justice:{n:'Justice',num:'XI',icon:'gear_penny',u:{t:'Swords score +3 mult each',e:{suitMult:{swords:3}}},r:{t:'Swords score no chips. +1 play',e:{suitZero:'swords',plays:1}}},
  empress:{n:'The Empress',num:'III',icon:'gear_heart',u:{t:'Pentacles score +3 mult each',e:{suitMult:{pents:3}}},r:{t:'Pentacles score no chips. Hands +25 chips',e:{suitZero:'pents',chips:25}}},
  tower:{n:'The Tower',num:'XVI',icon:'gear_brim',u:{t:'Target +30%',e:{tgt:1.3}},r:{t:'Hands +3 mult. -1 discard',e:{mult:3,disc:-1}}},
  star:{n:'The Star',num:'XVII',icon:'gear_stars',u:{t:'+2 discards',e:{disc:2}},r:{t:'-1 play. Hands +40 chips',e:{plays:-1,chips:40}}},
  wheel:{n:'Wheel of Fortune',num:'X',icon:'gear_hourglass',u:{t:'Hands +2 mult',e:{mult:2}},r:{t:'Hands -1 mult. +1 play',e:{mult:-1,plays:1}}},
  hermit:{n:'The Hermit',num:'IX',icon:'gear_hood',u:{t:'-1 play. Hands +5 mult',e:{plays:-1,mult:5}},r:{t:'+1 play. Hands -15 chips',e:{plays:1,chips:-15}}},
  devil:{n:'The Devil',num:'XV',icon:'gear_cursedeye',u:{t:'Hands +40 chips. Target +20%',e:{chips:40,tgt:1.2}},r:{t:'Target -10%. Hands -1 mult',e:{tgt:.9,mult:-1}}},
  judgement:{n:'Judgement',num:'XX',icon:'gear_eclipse',u:{t:'Court cards score double chips',e:{courtX:1}},r:{t:'Court cards score no chips. +1 discard',e:{courtZero:1,disc:1}}},
  strength:{n:'Strength',num:'VIII',icon:'gear_whetstone',u:{t:'Each scoring card +6 chips',e:{cpc:6}},r:{t:'Each scoring card -3 chips. +1 play',e:{cpc:-3,plays:1}}},
};
const fateEff=()=>{
  const out={suitMult:{},suitZero:null,tgt:1,mult:0,chips:0,disc:0,plays:0,courtX:0,courtZero:0,cpc:0};
  if(!rd||!rd.present)return out;const f=rd.present,e=(f.rev?FATES[f.id].r:FATES[f.id].u).e;
  for(const k in e){if(k==='suitMult')Object.assign(out.suitMult,e.suitMult);else if(k==='suitZero')out.suitZero=e.suitZero;else if(k==='tgt')out.tgt*=e.tgt;else out[k]+=e[k];}
  return out;
};

/* ---------- charms ---------- */
const CHARMS={
  wandwright:{n:'Wandwright',icon:'el_fire',cost:5,t:'Scoring Wands +2 mult each.'},cupbearer:{n:'Cupbearer',icon:'el_frost',cost:5,t:'Scoring Cups +2 mult each.'},
  swordsman:{n:'Swordsman',icon:'el_storm',cost:5,t:'Scoring Swords +2 mult each.'},potter:{n:'Potter',icon:'el_thorn',cost:5,t:'Scoring Pentacles +2 mult each.'},
  rabbit:{n:'Rabbit\'s Foot',icon:'gear_feather',cost:7,t:'+1 play each round.'},hourglass:{n:'Hourglass',icon:'gear_hourglass',cost:5,t:'+1 discard each round.'},
  ouroboros:{n:'Ouroboros',icon:'gear_eclipse',cost:6,t:'Runs and Trinities +4 mult.'},twinflame:{n:'Twin Flame',icon:'gear_phoenix',cost:6,t:'Pairs, Triples and Quartets +4 mult.'},
  jester:{n:'Court Jester',icon:'gear_fool',cost:5,t:'Scoring court cards +8 chips.'},oldmoon:{n:'Old Moon',icon:'gear_moon',cost:5,t:'Harmony and Clash bonuses doubled.'},
  coin:{n:'Gilded Coin',icon:'gear_coin',cost:4,t:'+3 gold at the end of each round.'},mirror:{n:'Mirror Shard',icon:'gear_eyes',cost:6,t:'Reversed cards +4 more mult.'},
  ember:{n:'Ember Heart',icon:'gear_ember',cost:4,t:'Every hand +20 chips.'},crystal:{n:'Crystal Ball',icon:'gear_stars',cost:5,t:'+1 turn of the Fates each round.'},
};
const CSUIT={wands:'wandwright',cups:'cupbearer',swords:'swordsman',pents:'potter'};
const has=id=>run&&run.charms.includes(id);
const HTN={high:'High Card',pair:'Pair',two:'Two Pair',triple:'Triple',full:'Full House',quartet:'Quartet',run:'Run',suit:'Suit',trinity:'Trinity',court:'Court'};

/* ---------- scoring ---------- */
function baseOf(type,L){
  const T={high:[5,1],pair:[10,2],two:[20,2],triple:[30,3],full:[40,4],quartet:[60,6],run:{3:[15,2],4:[25,3],5:[40,4]},suit:{3:[12,2],4:[20,3],5:[30,4]},trinity:{3:[35,4],4:[55,5],5:[80,7]},court:{3:[30,3],4:[40,4],5:[50,5]}};
  let b=T[type];if(!Array.isArray(b))b=b[Math.min(5,Math.max(3,L))];const lv=(run&&run.lv[type])||0;return [b[0]+10*lv,b[1]+lv];
}
function candidates(minors){
  const out=[];if(!minors.length)return out;
  const add=(type,cs,name)=>{const [bc,bm]=baseOf(type,cs.length);out.push({type,name:name||HTN[type],cs,bc,bm,val:(bc+cs.reduce((a,x)=>a+cv_(x),0))*bm});};
  const byR={},byS={};for(const x of minors){(byR[x.r]=byR[x.r]||[]).push(x);(byS[x.s]=byS[x.s]||[]).push(x);}
  const gs=Object.values(byR).sort((a,b)=>b.length-a.length);
  add('high',[minors.reduce((a,b)=>(b.r===1?11:b.r)>(a.r===1?11:a.r)?b:a)]);
  if(gs[0].length>=2)add('pair',gs[0].slice(0,2));if(gs[0].length>=3)add('triple',gs[0].slice(0,3));if(gs[0].length>=4)add('quartet',gs[0].slice(0,4));
  if(gs[1]&&gs[0].length>=2&&gs[1].length>=2)add('two',[...gs[0].slice(0,2),...gs[1].slice(0,2)]);
  if(gs[1]&&gs[0].length>=3&&gs[1].length>=2)add('full',[...gs[0].slice(0,3),...gs[1].slice(0,2)]);
  const seqs=m=>{const rs=Object.keys(m).map(Number).sort((a,b)=>a-b),res=[];let cur=[];for(const r of rs){if(cur.length&&r===cur[cur.length-1]+1)cur.push(r);else{if(cur.length>=3)res.push(cur);cur=[r];}}if(cur.length>=3)res.push(cur);return res;};
  for(const sq of seqs(byR))add('run',sq.slice(0,5).map(r=>byR[r][0]));
  for(const s of SUITS){const m={};for(const x of byS[s]||[])m[x.r]=m[x.r]||x;for(const sq of seqs(m))add('trinity',sq.slice(0,5).map(r=>m[r]),'Trinity of '+SU[s].n);
    if(byS[s]&&byS[s].length>=3)add('suit',byS[s].slice(0,5),SU[s].n+' Suit');}
  const courts=minors.filter(isCourt);if(courts.length>=3)add('court',courts.slice(0,5));
  return out;
}
/** score a play: returns the best hand, the animated steps, and the total */
function scorePlay(cards,live){
  const E=fateEff(),fool=cards.find(x=>x.m==='fool'),majors=cards.filter(x=>x.m&&x!==fool),base=cards.filter(x=>!x.m);
  let best=null,assigned=base;
  const tryIt=ms=>{const cs=candidates(ms);let b=null;for(const x of cs)if(!b||x.val>b.val)b=x;return b;};
  if(fool){for(const s of SUITS)for(let r=1;r<=14;r++){const ms=[...base,{s,r,wild:fool,id:fool.id,rev:fool.rev}];const b=tryIt(ms);if(b&&(!best||b.val>best.val)){best=b;assigned=ms;}}}
  else best=tryIt(base);
  if(!best&&!majors.length&&!fool)return null;
  const steps=[];let chips=0,mult=1,xm=1,hand='';
  if(best){chips=best.bc;mult=best.bm;hand=best.name;steps.push({t:best.name,chips,mult});}
  else hand='Arcana';
  let cardChips=0;
  for(const x of (best?best.cs:[])){
    let ch=cv_(x);if(E.suitZero===x.s)ch=0;if(isCourt(x)){if(E.courtZero)ch=0;if(E.courtX)ch*=2;if(has('jester'))ch+=8;}ch+=E.cpc;ch=Math.max(0,ch);
    let m=0;if(E.suitMult[x.s])m+=E.suitMult[x.s];if(has(CSUIT[x.s]))m+=2;if(x.rev)m+=2+(has('mirror')?4:0);
    chips+=ch;cardChips+=ch;mult+=m;steps.push({card:x.wild||x,chips:ch,mult:m,chips_:chips,mult_:mult});
  }
  for(const x of majors){
    const f=x.m;let ch=0,m=0,xx=1,g=0,d=0;
    if(f==='magician')m=6;else if(f==='priestess')ch=40;else if(f==='empress'){m=3;g=2;}else if(f==='emperor')xx=1.5;else if(f==='star'){ch=20;d=1;}else if(f==='sun')ch=cardChips;else if(f==='world')xx=2;
    if(x.rev)m+=2;chips+=ch;mult+=m;xm*=xx;steps.push({card:x,chips:ch,mult:m,xm:xx,chips_:chips,mult_:mult});
    if(live){if(g)run.gold+=g;if(d)rd.bonusDisc+=d;}
  }
  const scoring=best?best.cs:[],used=new Set(scoring.map(x=>x.s).filter(Boolean)),hasS=s=>used.has(s);
  const bonus=(t,ch,m,xx)=>{chips+=ch;mult+=m;xm*=xx;steps.push({t,chips:ch,mult:m,xm:xx,chips_:chips,mult_:mult});};
  const om=has('oldmoon')?2:1;
  if((hasS('wands')&&hasS('swords'))||(hasS('cups')&&hasS('pents')))bonus('Harmony',0,1*om,1);
  if((hasS('wands')&&hasS('cups'))||(hasS('swords')&&hasS('pents')))bonus('Clash',15*om,0,1);
  if(used.size===4)bonus('Wheel',0,2,1);
  if(scoring.length>1&&scoring.reduce((a,x)=>a+(x.r||0),0)===21)bonus('World 21',0,0,1.25);
  if(E.chips)bonus('Fate',E.chips,0,1);if(E.mult)bonus('Fate',0,E.mult,1);
  if(has('ember'))bonus('Ember Heart',20,0,1);
  const ty=best&&best.type;
  if((ty==='run'||ty==='trinity')&&has('ouroboros'))bonus('Ouroboros',0,4,1);
  if(['pair','two','triple','full','quartet'].includes(ty)&&has('twinflame'))bonus('Twin Flame',0,4,1);
  if(run&&run.echo&&ty&&run.echo===ty)bonus('Past echo',0,4,1);
  const total=Math.max(0,Math.floor(Math.max(0,chips)*Math.max(1,mult)*xm));
  return {hand,type:ty,steps,chips:Math.max(0,chips),mult:Math.max(1,mult),xm,total};
}
function bestPlay(){
  let best=null,bi=null;const h=rd.hand,n=h.length;
  for(let m=1;m<(1<<n);m++){let k=0,cs=[];for(let i=0;i<n;i++)if(m&(1<<i)){k++;cs.push(h[i]);}if(k>5)continue;const s=scorePlay(cs,false);if(s&&(!best||s.total>best.total)){best=s;bi=m;}}
  return best?{total:best.total,idx:h.map((_,i)=>i).filter(i=>bi&(1<<i))}:null;
}

/* ---------- state ---------- */
let scene='title',run=null,rd=null,t=0,sceneT=0,shake=0,paused=false,tally=null,shop=null,burn=null,msg='',msgT=0,sel=new Set(),fsel=null;
const HIT=[],popups=[];
const pop=(s,x,y,col='#fff')=>popups.push({s,x,y,t:1,col});
const banner=(s,n=1.4)=>{msg=s;msgT=n;};
const maxPlays=()=>Math.max(1,4+fateEff().plays+(has('rabbit')?1:0)),maxDisc=()=>Math.max(0,3+fateEff().disc+(has('hourglass')?1:0)+(rd?rd.bonusDisc:0)),maxTurns=()=>2+(has('crystal')?1:0);
const target=()=>Math.round(TGT[run.round]*fateEff().tgt);

function startRun(){
  const pool=shuffle(MB.map((b,i)=>i).filter(i=>!MB[i].elite)),order=pool.slice(0,ROUNDS-1);order.push(pick(MB.map((b,i)=>i).filter(i=>MB[i].elite)));
  const deck=[];for(const s of SUITS)for(let r=1;r<=10;r++)deck.push(mkMinor(s,r));
  const fates=shuffle(Object.keys(FATES)).slice(0,ROUNDS+1).map(id=>({id,rev:Math.random()<.4}));
  run={round:0,hearts:3,gold:4,deck,charms:[],lv:{},fates,order,echo:null,best:0,rounds:0};
  startRound();
}
function startRound(){
  const f=run.fates;rd={present:f[run.round],future:f[run.round+1],past:run.round?f[run.round-1]:null,draw:shuffle(run.deck.map(x=>(x.rev=false,x))),disc:[],hand:[],plays:0,discs:0,turns:0,score:0,bonusDisc:0,anim:null,over:false,types:{},bestType:null};
  sel=new Set();fsel=null;popups.length=0;drawTo();scene='shuffle';sceneT=0;setMusic('draw',run.round,2);sfx.shuffle();
}
function drawTo(){while(rd.hand.length<HAND&&(rd.draw.length||rd.disc.length)){if(!rd.draw.length){rd.draw=shuffle(rd.disc);rd.disc=[];}const x=rd.draw.pop();x.age=0;rd.hand.push(x);}}
function selCards(){return [...sel].sort((a,b)=>a-b).map(i=>rd.hand[i]).filter(Boolean);}

/* ---------- actions ---------- */
function toggle(i){if(scene!=='round'||rd.anim)return;fsel=null;if(sel.has(i))sel.delete(i);else if(sel.size<5)sel.add(i);sfx.card();}
function play(){
  if(scene!=='round'||rd.anim||!sel.size||rd.plays>=maxPlays())return;
  const cards=selCards(),sc=scorePlay(cards,true);if(!sc)return;
  rd.plays++;const idx=[...sel].sort((a,b)=>b-a);for(const i of idx)rd.hand.splice(i,1);
  rd.anim={cards,sc,i:0,t:0,chips:0,mult:1,xm:1,disp:0};rd.types[sc.type]=(rd.types[sc.type]||0)+1;sel=new Set();
  const cur=run.best;rd.lastType=sc.type;if(!rd.bestVal||sc.total>rd.bestVal){rd.bestVal=sc.total;rd.bestType=sc.type;}
}
function discard(){
  if(scene!=='round'||rd.anim||!sel.size||rd.discs>=maxDisc())return;
  const idx=[...sel].sort((a,b)=>b-a);for(const i of idx){rd.disc.push(rd.hand[i]);rd.hand.splice(i,1);}rd.discs++;sel=new Set();drawTo();sfx.shuffle();
}
function reverse(){
  if(scene!=='round'||rd.anim||!sel.size)return;
  const cs=selCards();const flips=cs.filter(x=>!x.rev).length,left=2-rd.hand.filter(x=>x.rev).length;
  const turn=cs.every(x=>x.rev);for(const x of cs){if(turn)x.rev=false;else if(!x.rev&&rd.hand.filter(y=>y.rev).length<2)x.rev=true;}sfx.pick();
}
function turnFate(which){
  if(scene!=='round'||rd.anim)return;if(rd.turns>=maxTurns()){pop('no turns left',240,110,'#ff7a6e');return;}
  const f=which==='present'?rd.present:rd.future;f.rev=!f.rev;rd.turns++;sfx.pick();
  if(which==='present'){const pm=maxPlays();if(rd.plays>pm){}}
}
function stepAnim(dt){
  const a=rd.anim;a.t+=dt;const steps=a.sc.steps;
  if(a.i<steps.length){
    if(a.t>=.3){a.t=0;const s=steps[a.i++];
      if(s.chips_!==undefined){a.chips=s.chips_;a.mult=s.mult_;}else{a.chips=s.chips;a.mult=s.mult;}if(s.xm&&s.xm!==1)a.xm*=s.xm;
      a.label=s.t||'';a.pulse=1;sfx.strike();
      if(s.card){pop((s.chips?'+'+s.chips:'')+(s.mult?' +'+s.mult+'m':''),130+a.cards.indexOf(s.card)*44,84,s.mult?'#ff9ad8':'#9ad0ff');}
      else if(s.t&&s.t!==a.sc.hand)pop(s.t,240,84,'#ffd27a');
    }
  }else if(a.t>=.35){
    a.fin=true;
    if(!a.done){a.done=true;rd.score+=a.sc.total;shake=Math.max(shake,3);sfx.coin();pop('+'+a.sc.total,240,60,'#ffe9a0');}
    if(a.t>=.9){
      for(const x of a.cards){if(!x.m||true){x.rev=false;rd.disc.push(x);}}rd.anim=null;
      if(rd.score>=target()){winRound();}
      else if(rd.plays>=maxPlays()){loseRound();}
      else drawTo();
    }
  }
}
function winRound(){
  scene='won';sceneT=0;rd.over=true;run.rounds++;run.echo=rd.bestType;
  const left=maxPlays()-rd.plays,over=rd.score>=target()*1.5?2:0,g=3+left+over+(has('coin')?3:0);run.gold+=g;rd.gain=g;sfx.win();banner('The Fates are pleased',2);
}
function loseRound(){
  const deep=rd.score<target()*.5;scene='lost';sceneT=0;rd.over=true;run.hearts-=deep?2:1;run.echo=rd.bestType;shake=8;sfx.hurt();rd.gain=0;banner(deep?'Fate strikes hard: two hearts lost':'Fate strikes: a heart is lost',2);
}
function afterRound(){
  if(run.hearts<=0){scene='end';sceneT=0;finishRun(false);setMusic('defeat',0);return;}
  if(run.round>=ROUNDS-1){scene='end';sceneT=0;finishRun(true);setMusic('victory',0);return;}
  openShop();
}
function finishRun(win){
  const g=win?14:run.rounds*2;meta.shards=(meta.shards||0)+g;meta.reading=meta.reading||{best:0,wins:0};meta.reading.best=Math.max(meta.reading.best||0,run.rounds);if(win)meta.reading.wins=(meta.reading.wins||0)+1;saveMeta();tally={win,g};
}

/* ---------- shop ---------- */
function rollShop(){
  const items=[];const owned=run.charms,majorsOwned=run.deck.filter(x=>x.m).map(x=>x.m);
  const kinds=['court','court','major','charm','charm','study'];
  while(items.length<4){
    const k=pick(kinds);
    if(k==='court'){const s=pick(SUITS),r=pick([11,12,13,14]);items.push({k,card:mkMinor(s,r),cost:3,n:`${RNAME[r]} of ${SU[s].n}`,t:'A court card for your deck. Extends runs, scores 10.'});}
    else if(k==='major'){const left=Object.keys(MAJ).filter(m=>!majorsOwned.includes(m)&&!items.some(i=>i.m===m));if(!left.length)continue;const m=pick(left);items.push({k,m,card:mkMajor(m),cost:MAJ[m].cost,n:MAJ[m].n,t:MAJ[m].t});}
    else if(k==='charm'){const left=Object.keys(CHARMS).filter(m=>!owned.includes(m)&&!items.some(i=>i.ch===m));if(!left.length)continue;const m=pick(left);items.push({k,ch:m,cost:CHARMS[m].cost,n:CHARMS[m].n,t:CHARMS[m].t});}
    else{const ty=pick(['pair','two','triple','full','run','suit','trinity','court','high']);if(items.some(i=>i.ty===ty))continue;items.push({k,ty,cost:4,n:'Study: '+HTN[ty],t:'+10 chips and +1 mult for '+HTN[ty]+' hands. Level '+((run.lv[ty]||0)+1)+'.'});}
  }
  return items;
}
function openShop(){scene='shop';sceneT=0;shop={items:rollShop(),rerolls:0,burned:false};burn=null;setMusic('shop',run.round);sfx.shuffle();}
function buy(i){
  const it=shop.items[i];if(!it||it.sold||run.gold<it.cost)return;
  if(it.k==='charm'&&run.charms.length>=4){banner('Charm slots are full: sell one first',1.4);return;}
  run.gold-=it.cost;it.sold=true;sfx.coin();
  if(it.k==='court'||it.k==='major')run.deck.push(it.card);else if(it.k==='charm')run.charms.push(it.ch);else run.lv[it.ty]=(run.lv[it.ty]||0)+1;
}
function nextRound(){run.round++;startRound();}

/* ---------- art helpers ---------- */
const IMG={};function icon(n){if(!IMG[n]){const i=new Image();i.src=BASEURL()+'assets/icons/'+n+'.png';IMG[n]=i;}return IMG[n];}
function glow(x,y,r,col,a){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');c.globalAlpha=a;c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.globalAlpha=1;}
function text(s,x,y,col='#f1e8d4',size=8,align='center',font=FONT,weight=700){c.font=`${weight} ${size}px ${font}`;c.textAlign=align;c.fillStyle='#07040f';c.fillText(s,x+.7,y+.7);c.fillStyle=col;c.fillText(s,x,y);}
function wrap(s,n){const w=s.split(' '),L=[];let l='';for(const x of w){if((l+' '+x).trim().length>n){L.push(l);l=x;}else l=(l+' '+x).trim();}if(l)L.push(l);return L;}
const img=(n,x,y,w,h,flip)=>{const i=icon(n);if(i.complete&&i.naturalWidth){c.imageSmoothingEnabled=false;if(flip){c.save();c.translate(x+w/2,y+h/2);c.scale(1,-1);c.drawImage(i,-w/2,-h/2,w,h);c.restore();}else c.drawImage(i,x,y,w,h);}};
function btn(x,y,w,h,s,main,fn,dis){HIT.push({x,y,w,h,fn:dis?()=>{}:fn});c.fillStyle=dis?'#3a3350':main?'#dcb868':'transparent';c.fillRect(x,y,w,h);if(!main&&!dis){c.strokeStyle='#5a4a82';c.lineWidth=2;c.strokeRect(x+1,y+1,w-2,h-2);}text(s,x+w/2,y+h/2+3.5,dis?'#8a80a8':main?'#0b0818':'#f1e8d4',main?11:8.5,'center',FONT);}

function drawCard(x,y,w,h,cd,o={}){
  c.save();c.translate(x,y);const k=w/46;c.scale(k,k);const ww=46,hh=h/k;
  if(cd.m){const f=MAJ[cd.m];c.fillStyle='#1a1228';c.fillRect(0,0,ww,hh);c.strokeStyle=o.sel?'#fff2c0':'#dcb868';c.lineWidth=o.sel?2.2:1.4;c.strokeRect(.7,.7,ww-1.4,hh-1.4);c.strokeStyle='#6a4ca8';c.lineWidth=1;c.strokeRect(3,3,ww-6,hh-6);
    text(f.num,ww/2,11,'#dcb868',7,'center',FONT);img(f.icon,ww/2-10,14,20,20,cd.rev);
    wrap(f.n.replace('The ',''),9).slice(0,2).forEach((s,i)=>text(s,ww/2,44+i*7,'#f1e8d4',6.4,'center',FONT));}
  else{const su=SU[cd.s];c.fillStyle='#161029';c.fillRect(0,0,ww,hh);
    const g=c.createLinearGradient(0,0,0,hh);g.addColorStop(0,su.col+'40');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(1,1,ww-2,hh-2);
    c.strokeStyle=cd.rev?'#ff5a6e':su.col;c.lineWidth=o.sel?2.4:1.3;c.strokeRect(.7,.7,ww-1.4,hh-1.4);if(o.sel)glow(ww/2,hh/2,38,su.col,.4);
    text(RK(cd.r),8,12,su.col,10,'center',FONT);img(su.icon,ww/2-11,hh/2-9,22,22,cd.rev);
    if(cd.r>=11)text(RNAME[cd.r].slice(0,6),ww/2,hh-16,'#f1e8d4',6,'center',FONT);
    c.save();c.translate(ww-8,hh-6);c.rotate(Math.PI);text(RK(cd.r),0,0,su.col,8,'center',FONT);c.restore();}
  if(cd.rev){c.fillStyle='rgba(255,70,100,.18)';c.fillRect(0,0,ww,hh);text('REV',ww/2,hh-3,'#ff6a86',6,'center',FONT);}
  c.restore();
}
function cardBack(x,y,s=1,rot=0){
  c.save();c.translate(x,y);c.rotate(rot);c.scale(s,s);c.fillStyle='#241838';c.fillRect(-20,-28,40,56);c.strokeStyle='#dcb868';c.lineWidth=1;c.strokeRect(-19,-27,38,54);c.strokeStyle='#6a4ca8';c.strokeRect(-16,-24,32,48);
  c.fillStyle='#dcb868';c.beginPath();for(let i=0;i<8;i++){const r=i%2?3.5:8,a=i/8*TAU-Math.PI/2;c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fill();c.restore();
}
function fateCard(f,x,y,w,h,label,o={}){
  const d=FATES[f.id];c.save();c.translate(x,y);c.globalAlpha=o.fade?.55:1;c.fillStyle='#1a1228';c.fillRect(0,0,w,h);c.strokeStyle=f.rev?'#ff5a6e':'#dcb868';c.lineWidth=o.sel?2.6:1.4;c.strokeRect(.7,.7,w-1.4,h-1.4);
  c.strokeStyle='#6a4ca8';c.lineWidth=1;c.strokeRect(3,3,w-6,h-6);if(o.sel)glow(w/2,h/2,w*.8,f.rev?'#ff5a6e':'#dcb868',.25);
  text(label,w/2,11,'#a79bc0',7,'center',SMALL);const s=Math.min(24,w*.34);img(d.icon,w/2-s/2,14,s,s,f.rev);
  wrap(d.n,Math.floor(w/5.4)).slice(0,2).forEach((q,i)=>text(q,w/2,14+s+9+i*7.5,'#f1e8d4',7,'center',FONT));
  if(f.rev)text('REVERSED',w/2,h-6,'#ff6a86',6.5,'center',FONT);else text('upright',w/2,h-6,'#8f7aa8',6.5,'center',SMALL);
  c.restore();
}

/* ---------- drawing ---------- */
function roundScene(){
  const E=fateEff(),tg=target();
  // top bar
  c.fillStyle='rgba(7,4,15,.72)';c.fillRect(0,0,W,16);text(`Round ${run.round+1} / ${ROUNDS}`,40,11,'#f1e8d4',9,'center',FONT);
  HIT.push({x:0,y:0,w:14,h:16,fn:()=>{paused=true;}});text('II',7,11,'#a79bc0',8,'center',FONT);
  for(let i=0;i<3;i++){const x=196+i*14;c.fillStyle=i<run.hearts?'#ff6a86':'#3a2a46';c.beginPath();c.moveTo(x,12);c.bezierCurveTo(x-6,7,x-3,2,x,5);c.bezierCurveTo(x+3,2,x+6,7,x,12);c.fill();}
  text('Fate',178,11,'#8f7aa8',8,'right',SMALL);text(run.gold+' gold',440,11,'#ffd27a',9,'right',FONT);
  // the spread
  if(rd.past){const pf=rd.past;fateCard(pf,14,20,58,76,'PAST',{fade:true});}else{c.globalAlpha=.5;cardBack(43,58,.9);c.globalAlpha=1;text('PAST',43,28,'#6a5a8a',7,'center',SMALL);}
  fateCard(rd.present,78,18,74,82,'PRESENT',{sel:fsel==='present'});HIT.push({x:78,y:18,w:74,h:82,fn:()=>{if(!rd.anim)fsel=fsel==='present'?null:'present';}});
  fateCard(rd.future,158,22,58,76,'FUTURE',{sel:fsel==='future'});HIT.push({x:158,y:22,w:58,h:76,fn:()=>{if(!rd.anim)fsel=fsel==='future'?null:'future';}});
  // boss portrait and target
  const bi=run.order[run.round],b=MB[bi],fr=bossFrames(bi),s=fr&&fr[Math.floor(t*6)%fr.length];
  glow(262,60,36,b.color,.3);if(s&&s.img){const im=s.img,k=56/(im.width*(im.hi?1/R:1));c.save();c.translate(262,56);c.scale(k,k);blit(c,0,0,im);c.restore();}
  text(b.name,262,102,'#a79bc0',7.5,'center',SMALL);
  const bx=312;text('TARGET',bx,28,'#8f7aa8',8,'left',SMALL);text(String(tg),bx,46,'#f1e8d4',18,'left',FONT);
  const shown=rd.anim?rd.score:rd.score;c.fillStyle='#2a1f3d';c.fillRect(bx,52,150,8);c.fillStyle=shown>=tg?'#8fe06a':'#dcb868';c.fillRect(bx,52,150*clamp(shown/tg,0,1),8);c.strokeStyle='#8f7440';c.lineWidth=1;c.strokeRect(bx-.5,51.5,151,9);
  text(`Score ${shown}`,bx,73,'#ffe9a0',10,'left',FONT);
  const left=maxPlays()-rd.plays,dl=maxDisc()-rd.discs,tl=maxTurns()-rd.turns;
  text(`Plays ${left}`,bx,88,left?'#9ad0ff':'#ff7a6e',9,'left',FONT);text(`Discards ${dl}`,bx+52,88,dl?'#c9bfe0':'#6a5a8a',9,'left',FONT);text(`Turns ${tl}`,bx+120,88,tl?'#dcb868':'#6a5a8a',9,'left',FONT);
  // strip: fate details or hand preview
  c.fillStyle='rgba(7,4,15,.7)';c.fillRect(8,106,464,28);c.strokeStyle='#3a2d5c';c.lineWidth=1;c.strokeRect(8.5,106.5,463,27);
  if(fsel){const f=rd[fsel],d=FATES[f.id],u=f.rev?d.r:d.u,o=f.rev?d.u:d.r;
    text(`${fsel==='present'?'Present':'Future'}: ${d.n} (${f.rev?'reversed':'upright'})  -  ${u.t}`,16,118,f.rev?'#ff9aa8':'#ffe9a0',8.5,'left',SMALL,500);text(`Turn it over: ${o.t}`,16,129,'#8f7aa8',8,'left',SMALL,400);
    btn(400,110,66,20,'Turn it',true,()=>turnFate(fsel),tl<=0);}
  else if(sel.size){const sc=scorePlay(selCards(),false);if(sc){text(`${sc.hand}`,16,118,'#ffe9a0',10,'left',FONT);text(`${sc.chips} chips  x  ${sc.mult} mult${sc.xm>1?'  x '+sc.xm:''}  =  ${sc.total}`,16,129,'#f1e8d4',9,'left',FONT);
      const bn=[...new Set(sc.steps.filter(x=>x.t&&x.t!==sc.hand).map(x=>x.t))];if(bn.length)text(bn.slice(0,3).join('  '),466,118,'#ffd27a',8,'right',SMALL,500);}
    else text('No scoring hand',16,124,'#8f7aa8',9,'left',FONT);}
  else text('Tap cards to build a hand (up to 5), then Play. Tap a Fate card to read it. Only the cards that form the hand score.',16,124,'#8f7aa8',8.5,'left',SMALL,400);
  // hand
  const n=rd.hand.length,cw=46,ch=70,sp=52,x0=240-(cw+(n-1)*sp)/2;
  rd.hand.forEach((cd,i)=>{const x=x0+i*sp,sl=sel.has(i),y=146-(sl?12:0)+(1-Math.min(1,(cd.age||0)*5))*24;drawCard(x,y,cw,ch,cd,{sel:sl});cd.age=(cd.age||0)+.016;HIT.push({x,y:140,w:i<n-1?sp:cw,h:ch+16,fn:()=>toggle(i)});});
  // piles and buttons
  cardBack(20,178,.8);text(String(rd.draw.length),20,214,'#a79bc0',9,'center',SMALL);text('draw',20,223,'#6a5a8a',7,'center',SMALL);
  if(rd.disc.length)cardBack(460,178,.6,.1);text(String(rd.disc.length),460,214,'#a79bc0',9,'center',SMALL);text('discard',460,223,'#6a5a8a',7,'center',SMALL);
  const can=!rd.anim&&sel.size>0;
  btn(120,226,76,22,'Play',true,play,!can||rd.plays>=maxPlays());btn(204,226,76,22,`Discard`,false,discard,!can||rd.discs>=maxDisc());
  btn(288,226,76,22,'Reverse',false,reverse,!can);
  text('Reverse: +2 mult, no chips. Max 2.',326,258,'#6a5a8a',7.5,'center',SMALL,400);
  // charms
  run.charms.forEach((id,i)=>{const x=8+i*22;c.fillStyle='#150f26';c.fillRect(x,240,20,20);c.strokeStyle='#dcb868';c.lineWidth=1;c.strokeRect(x+.5,240.5,19,19);img(CHARMS[id].icon,x+2,242,16,16);});
  if(!run.charms.length)text('no charms',34,254,'#4a4068',8,'center',SMALL,400);
  // scoring overlay
  if(rd.anim)scoringOverlay();
}
function scoringOverlay(){
  const a=rd.anim;c.fillStyle='#0b0818';c.fillRect(8,16,464,120);c.strokeStyle='#dcb868';c.lineWidth=1.5;c.strokeRect(8.5,16.5,463,119);
  a.cards.forEach((x,i)=>{const cx=24+i*48,lit=a.i>0&&a.sc.steps.slice(0,a.i).some(s=>s.card===(x.wild||x)||s.card===x);drawCard(cx,34,40,62,x,{sel:lit});});
  text(a.sc.hand,24,28,'#ffe9a0',11,'left',FONT);
  const px=300;text('CHIPS',px,50,'#9ad0ff',8,'left',SMALL);text(String(Math.round(a.chips)),px,72,'#9ad0ff',22,'left',FONT);
  text('x',px+72,70,'#f1e8d4',16,'center',FONT);text('MULT',px+88,50,'#ff9ad8',8,'left',SMALL);text(String(Math.round(a.mult*10)/10),px+88,72,'#ff9ad8',22,'left',FONT);
  if(a.xm>1)text('x'+a.xm,px+150,72,'#ffd27a',14,'left',FONT);
  if(a.label)text(a.label,px,92,'#ffd27a',10,'left',FONT);
  if(a.fin)text(`= ${a.sc.total}`,px,118,'#ffe9a0',22,'left',FONT);
}
function shopScene(){
  c.fillStyle='#07040f';c.fillRect(0,0,W,H);const g=c.createRadialGradient(240,130,10,240,130,300);g.addColorStop(0,'#241446');g.addColorStop(1,'#07040f');c.fillStyle=g;c.fillRect(0,0,W,H);
  text('The Shop of Fates',240,20,'#dcb868',13,'center',FONT);text(`${run.gold} gold`,448,20,'#ffd27a',11,'right',FONT);
  text(rd&&rd.gain?`Round cleared: +${rd.gain} gold`:'The Fates took a heart. Spend wisely.',240,34,'#a79bc0',9,'center',SMALL,400);
  shop.items.forEach((it,i)=>{const x=16+i*115,y=44,w=108,h=110,afford=run.gold>=it.cost&&!it.sold;
    c.fillStyle='#150f26';c.fillRect(x,y,w,h);c.strokeStyle=it.sold?'#3a3350':afford?'#dcb868':'#5a4a82';c.lineWidth=1.5;c.strokeRect(x+.5,y+.5,w-1,h-1);
    c.globalAlpha=it.sold?.35:1;
    if(it.card)drawCard(x+w/2-18,y+6,36,56,it.card,{});else img(it.k==='charm'?CHARMS[it.ch].icon:'gear_whetstone',x+w/2-14,y+12,28,28);
    wrap(it.n,17).slice(0,2).forEach((q,j)=>text(q,x+w/2,y+(it.card?72:54)+j*8,'#f1e8d4',8,'center',FONT));
    wrap(it.t,22).slice(0,4).forEach((q,j)=>text(q,x+w/2,y+(it.card?90:68)+j*7,'#b7a9d6',7,'center',SMALL,400));
    c.globalAlpha=1;
    const lab=it.sold?'sold':it.cost+' gold';c.fillStyle=it.sold?'#3a3350':afford?'#dcb868':'#4a4560';c.fillRect(x+w/2-26,y+h-4,52,13);text(lab,x+w/2,y+h+6,it.sold?'#8a80a8':afford?'#0b0818':'#a79bc0',8,'center',FONT);
    HIT.push({x,y,w,h:h+12,fn:()=>buy(i)});});
  // owned charms (tap to sell)
  text('Your charms (tap to sell)',100,184,'#8f7aa8',8,'center',SMALL,400);
  run.charms.forEach((id,i)=>{const x=20+i*52,y=190;c.fillStyle='#150f26';c.fillRect(x,y,46,36);c.strokeStyle='#dcb868';c.lineWidth=1;c.strokeRect(x+.5,y+.5,45,35);img(CHARMS[id].icon,x+15,y+3,16,16);text(CHARMS[id].n.slice(0,9),x+23,y+30,'#c9bfe0',6.5,'center',SMALL);
    HIT.push({x,y,w:46,h:36,fn:()=>{run.gold+=Math.floor(CHARMS[id].cost/2);run.charms.splice(i,1);sfx.coin();}});});
  // burn a card
  if(burn){c.fillStyle='rgba(7,4,15,.94)';c.fillRect(0,0,W,H);text('Burn which card? (it leaves your deck for good)',240,24,'#dcb868',11,'center',FONT);
    burn.forEach((cd,i)=>{const x=40+i*68,y=60;drawCard(x,y,56,86,cd,{});HIT.push({x,y,w:56,h:86,fn:()=>{run.deck=run.deck.filter(q=>q.id!==cd.id);burn=null;shop.burned=true;sfx.pick();}});});
    btn(190,190,100,22,'Cancel',false,()=>{run.gold+=2;burn=null;});return;}
  btn(270,190,92,22,'Burn a card (2g)',false,()=>{if(run.gold>=2&&!shop.burned){run.gold-=2;burn=shuffle(run.deck).slice(0,5);}},run.gold<2||shop.burned);
  btn(366,190,92,22,`Reroll (${2+shop.rerolls}g)`,false,()=>{const cst=2+shop.rerolls;if(run.gold>=cst){run.gold-=cst;shop.rerolls++;shop.items=rollShop();sfx.shuffle();}},run.gold<2+shop.rerolls);
  btn(150,232,180,26,`On to round ${run.round+2}`,true,nextRound);
  text(`Deck: ${run.deck.length} cards`,60,252,'#6a5a8a',9,'center',SMALL,400);
}
function drawShuffle(p){
  const n=12;for(let i=0;i<n;i++){const side=i%2?1:-1,k=clamp(p*1.6-i*.04,0,1),e=k*k*(3-2*k),x=240+side*(70-70*e),y=130-e*(i*1.4-8)+Math.sin(p*10+i)*(1-e)*4;cardBack(x,y,1.2,side*(1-e)*.35);}
  text('The Fates shuffle the deck',240,190,'#dcb868',12,'center',FONT);
}
function titleScene(){
  c.fillStyle='#07040f';c.fillRect(0,0,W,H);const g=c.createRadialGradient(240,110,10,240,110,260);g.addColorStop(0,'#2a1650');g.addColorStop(1,'#07040f');c.fillStyle=g;c.fillRect(0,0,W,H);
  const demo=[mkMinor('wands',5),mkMinor('cups',6),mkMinor('swords',7),mkMajor('fool'),mkMinor('pents',12)];demo.forEach((cd,i)=>{c.save();c.translate(240+(i-2)*54,136);c.rotate((i-2)*.15);drawCard(-23,-35,46,70,cd,{});c.restore();});
  text('THE EIGHTH ARCANUM',240,32,'#dcb868',20,'center',FONT);text('Read the fates. Build your hand. Survive eight rounds.',240,50,'#a79bc0',11,'center',SMALL,400);
  btn(180,196,120,24,'Begin the reading',true,startRun);btn(190,228,100,18,'Sanctum',false,leave);
  const b=(meta.reading&&meta.reading.best)||0;text(`Best: ${b} of ${ROUNDS} rounds  -  Wins: ${(meta.reading&&meta.reading.wins)||0}`,240,262,'#6a5a8a',9,'center',SMALL,400);
}
function endScene(){
  c.fillStyle='#07040f';c.fillRect(0,0,W,H);const w=tally.win;
  text(w?'YOU HAVE READ YOUR FATE':'THE FATES CLAIM YOU',240,66,w?'#dcb868':'#ff7a6e',19,'center',FONT);
  text(`${run.rounds} of ${ROUNDS} rounds cleared  -  +${tally.g} shards`,240,96,'#a79bc0',12,'center',SMALL,400);
  text(`Deck: ${run.deck.length} cards  -  Charms: ${run.charms.map(i=>CHARMS[i].n).join(', ')||'none'}`,240,114,'#6a5a8a',9,'center',SMALL,400);
  btn(150,180,180,24,'Another reading',true,startRun);btn(190,212,100,18,'Sanctum',false,()=>{scene='title';setMusic('title',0);});
}
function render(){
  HIT.length=0;c.setTransform(R,0,0,R,0,0);c.imageSmoothingEnabled=false;
  c.save();if(shake>.2)c.translate(rnd(-shake,shake)*.5,rnd(-shake,shake)*.5);
  if(scene==='title')titleScene();else if(scene==='shop')shopScene();else if(scene==='end')endScene();
  else{
    c.fillStyle='#0b0818';c.fillRect(0,0,W,H);const gr=c.createRadialGradient(240,90,10,240,90,300);gr.addColorStop(0,'#1d1238');gr.addColorStop(1,'#08050f');c.fillStyle=gr;c.fillRect(0,0,W,H);
    if(scene==='shuffle')drawShuffle(clamp(sceneT/1.2,0,1));else roundScene();
    if(scene==='won'||scene==='lost'){c.fillStyle=scene==='won'?'rgba(120,255,160,.1)':'rgba(255,60,80,.14)';c.fillRect(0,0,W,H);text(msg,240,126,scene==='won'?'#a8ffc0':'#ff9aa8',16,'center',FONT);}
  }
  for(const p of popups){c.globalAlpha=clamp(p.t*2,0,1);text(p.s,p.x,p.y-(1-p.t)*22,p.col,10,'center',FONT);}c.globalAlpha=1;
  if(msgT>0&&scene==='shop'){c.globalAlpha=clamp(msgT*2,0,1);text(msg,240,168,'#ff9aa8',10,'center',FONT);c.globalAlpha=1;}
  c.restore();
  if(paused){c.fillStyle='rgba(7,4,15,.82)';c.fillRect(0,0,W,H);HIT.length=0;text('Paused',240,90,'#dcb868',16,'center',FONT);btn(170,110,140,24,'Resume',true,()=>{paused=false;});btn(170,142,140,20,'Abandon run',false,()=>{paused=false;run.hearts=0;scene='end';finishRun(false);});}
}
function update(dt){
  t+=dt;sceneT+=dt;shake*=Math.pow(.02,dt);if(msgT>0)msgT-=dt;
  for(const p of popups)p.t-=dt*1.1;for(let i=popups.length-1;i>=0;i--)if(popups[i].t<=0)popups.splice(i,1);
  if(paused)return;
  if(scene==='shuffle'&&sceneT>1.3){scene='round';sceneT=0;banner('',0);}
  if(scene==='round'&&rd&&rd.anim)stepAnim(dt);
  if((scene==='won'||scene==='lost')&&sceneT>2.2)afterRound();
}

/* ---------- input and integration ---------- */
const pt=e=>{const r=cv.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};};
function onDown(e){wakeAudio();const p=pt(e);for(let i=HIT.length-1;i>=0;i--){const b=HIT[i];if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h){b.fn();return;}}if(scene==='round')fsel=null;}
function onKey(e){if(S.mode!=='reading'||e.type!=='keydown')return;if(e.key==='Escape')paused=!paused;if(scene==='round'&&!paused){if(e.key==='Enter')play();if(e.key==='d')discard();if(e.key==='r')reverse();if(e.key>='1'&&e.key<='8')toggle(+e.key-1);}}
function fit(){if(!box)return;const pw=innerWidth-32,ph=innerHeight;box.style.setProperty('--s',Math.max(.5,Math.min(pw/480,ph/270)).toFixed(4));}
function init(){
  if(inited)return;inited=true;root=$('reading');cv=$('rcv');box=$('rbox');cv.width=W*R;cv.height=H*R;c=cv.getContext('2d');c.imageSmoothingEnabled=false;
  addEventListener('keydown',onKey);addEventListener('resize',fit);cv.addEventListener('pointerdown',onDown);cv.addEventListener('contextmenu',e=>e.preventDefault());fit();
}
function leave(){if(root)root.hidden=true;const wrap=$('wrap');if(wrap)wrap.style.visibility='';S.mode='hub';setMusic('hub',0);if(exitFn)exitFn();}
export function enterReading(opts={}){
  exitFn=opts.exit;init();S.mode='reading';root.hidden=false;const wrap=$('wrap');if(wrap)wrap.style.visibility='hidden';const mb=$('mute');if(mb)mb.hidden=true;fit();
  scene='title';paused=false;setMusic('title',0);
}
export function readingStep(dt){if(!root||root.hidden)return;dt=Math.min(.05,dt);update(dt);render();}
if(typeof window!=='undefined')window.__reading={start:()=>startRun(),state:()=>({scene,run,rd,target:run&&rd?target():0,plays:rd?maxPlays()-rd.plays:0,discs:rd?maxDisc()-rd.discs:0,turns:rd?maxTurns()-rd.turns:0}),select:i=>{sel=new Set(i);},play:()=>play(),discard:()=>discard(),best:()=>bestPlay(),buy:i=>buy(i),next:()=>nextRound(),turn:w=>turnFate(w),step:dt=>update(dt),shop:()=>shop,reverse:()=>reverse(),scorePlay:cs=>scorePlay(cs,false),sceneNow:()=>scene,render,charms:CHARMS,majors:MAJ,fates:FATES,openShop:()=>openShop(),afterRound:()=>afterRound()};
