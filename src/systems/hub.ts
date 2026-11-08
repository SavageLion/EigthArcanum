// @ts-nocheck
import { enterDeck } from '../deck/deck';
import { W, muteBtn, ov } from '../core/dom';
import { G, S, newPlayer } from '../core/state';
import { KEYS } from '../core/input';
import { BOSSES } from '../data/bossList';
import { BOOSTS, FORGE_COST, dailyStreak, dailyToday, meta, saveMeta } from '../data/meta';
import { HUB_ART, K, LW, NPC_ART, R, SPRITE_OVERRIDES, blitSprite, dirOf, px } from '../render/sprites';
import { drawWizard } from '../render/draw';
import { resize } from '../core/size';
import { GEAR, SLOT_LABEL, gearOf, rarityTag } from '../data/gear';
import { RARITY, rankOf } from '../data/rarity';
import { bossCardArt, icon, pixIcon, show } from '../ui/overlay';
import { $, TAU, clamp, rnd } from '../core/util';
import { setMusic, tone } from '../core/audio';
import { cardInfo, enterHunt } from '../hunt/hunt';

/* The Sanctum is a small village: a walled gate at the top (the Door), a main street running down to a plaza with a campfire and a well, and the
   Market, Forge, Codex and Daily Hunt board each in their own corner, joined by cobbled lanes, with cottages, lamps and trees around.
   The view follows you through a world bigger than the screen. Step onto a glowing circle to use a building. Shards are earned from bosses and
   runs (data/meta.ts). */
const ZOOM=.5, HUBW=400, WW=900, WH=1000, GATE=175, PLAZA={x:450,y:600,r:80};
const STATIONS=[
  {id:'door',name:'THE HUNT',art:'door',k:1.7,fx:450,fy:166,ax:450,ay:236,ar:34,col:'#b07aff',solid:34},
  {id:'market',name:'MARKET',art:'market',k:1.5,fx:225,fy:430,ax:225,ay:474,ar:34,col:'#ffd27a',solid:30},
  {id:'forge',name:'FORGE',art:'forge',k:1.5,fx:675,fy:430,ax:675,ay:474,ar:34,col:'#ff9a5a',solid:30},
  {id:'codex',name:'CODEX',art:'codex',k:1.45,fx:205,fy:790,ax:205,ay:834,ar:34,col:'#e8d28a',solid:28},
  {id:'board',name:'DAILY HUNT',art:'board',k:1.45,fx:450,fy:900,ax:450,ay:942,ar:34,col:'#9ad0ff',solid:28},
];
const stations=()=>STATIONS;
/** lanes: x0,y0,x1,y1,width */
const LANES=[[450,236,450,942,58],[225,492,675,492,46],[450,600,205,834,40],[450,600,695,834,40],[225,474,225,492,40],[675,474,675,492,40]];
const laneDist=(x,y)=>{ let d=1e9; for(const [x0,y0,x1,y1,w] of LANES){ const dx=x1-x0, dy=y1-y0, t=clamp(((x-x0)*dx+(y-y0)*dy)/(dx*dx+dy*dy),0,1); d=Math.min(d,Math.hypot(x-(x0+dx*t),y-(y0+dy*t))-w/2); } return Math.min(d,Math.hypot(x-PLAZA.x,y-PLAZA.y)-PLAZA.r); };
const rngOf=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
/** scenery with a solid footprint, built once: houses of several kinds, statues, well, campfire, lamps, market clutter, then trees, hedges and glowing mushrooms filling the gaps */
let DECO=null, TUFTS=null, SPARKS=null;
const SWAYS=new Set(['tree','moontree','pine','yew']);
/** warm window glows per building: [x offset, height up the sprite] in sprite fractions */
const WINDOWS={cottage:[[0,.5]],observatory:[[0,.4]],townhouse:[[-.12,.62],[.14,.36]],belltower:[[0,.52]]};
function buildVillage(){
  const r=rngOf(7), D=[]; const add=(art,x,y,k,solid,o={})=>D.push({art,x,y,k,solid,ph:r()*6,flip:r()<.5,...o});
  const free=(x,y,m)=>laneDist(x,y)>m&&D.every(d=>Math.hypot(d.x-x,d.y-y)>(d.solid+m))&&STATIONS.every(s=>Math.hypot(s.fx-x,s.fy-y)>s.solid+m+44&&Math.hypot(s.ax-x,s.ay-y)>56+m);
  const HK={cottage:1.55,observatory:1.6,townhouse:1.55,belltower:1.75};
  for(const [art,x,y] of [['townhouse',105,330],['cottage',795,330],['observatory',100,640],['belltower',800,640],['cottage',110,900],['townhouse',790,930],['belltower',215,300],['observatory',690,300],['townhouse',230,620],['cottage',670,640],['observatory',320,930],['belltower',585,930]]) if(free(x,y,26)) add(art,x,y,HK[art],30,{flip:r()<.5});
  for(const [x,y] of [[352,596],[548,650],[340,300],[560,300]]) add('statue',x,y,1.2,12,{flip:false});
  add('well',555,560,1.25,18,{flip:false}); add('campfire',450,612,1.1,12,{glow:'#ff9a3c',flip:false});
  for(const [x,y] of [[405,310],[495,310],[405,540],[495,540],[368,690],[532,690],[405,830],[495,830],[330,462],[570,462],[318,790],[582,790],[150,520],[750,520]]) add('lamp',x,y,1.25,5,{glow:'#ffb45a',flip:false});
  // market clutter and curios near the buildings
  for(const [art,x,y,k] of [['crates',160,455,1.1],['crates',745,455,1.1],['crates',275,835,1.1],['astrolabe',330,690,1.2],['astrolabe',590,760,1.2],['crates',628,820,1.1]]) if(free(x,y,10)) add(art,x,y,k,14);
  const tree=(x,y)=>{ const q=r(); add(q<.4?'pine':q<.72?'tree':'moontree',x,y,(q<.4?1.4:1.25)*(.92+r()*.2),9); };
  for(let y=210;y<=980;y+=58) for(const x0 of [26,874]){ const x=x0+(r()-.5)*44, yy=y+(r()-.5)*26; if(free(x,yy,16)) tree(x,yy); }
  for(let x=50;x<=850;x+=60){ const x1=x+(r()-.5)*30, yy=986+(r()-.5)*14; if(free(x1,yy,16)) tree(x1,yy); }
  for(let i=0,n=0;i<1200&&n<26;i++){ const x=70+r()*760, y=250+r()*700; if(free(x,y,52)){ tree(x,y); n++; } }
  for(let i=0,n=0;i<1600&&n<30;i++){ const x=50+r()*800, y=240+r()*740; if(free(x,y,14)){ add(r()<.8?'yew':'mushrooms',x,y,(r()<.5?.8:1)+(r()*.25),6); n++; } }
  DECO=D.sort((a,b)=>a.y-b.y);
  TUFTS=Array.from({length:1500},()=>({x:r()*WW,y:GATE+r()*(WH-GATE),c:Math.floor(r()*3),h:r()<.3?2:1}));
  SPARKS=Array.from({length:230},()=>({x:r()*WW,y:GATE+20+r()*(WH-GATE-20),p:r()*6,s:r()<.5?'#ffe9a0':'#bcd0ff'}));
}
/** villagers wander the lanes on fixed routes and pause at the stops */
const NPC_DEFS=[
  {id:'monk',k:.9,spd:34,route:[[450,300],[450,470],[330,492],[225,508],[330,492],[450,500],[450,640],[450,760],[450,640],[570,500],[675,508],[570,492],[450,470]]},
  {id:'cat',k:.8,spd:26,route:[[392,668],[510,668],[455,656],[400,640],[392,668]],rot:true},
];
let NPCS=null;
const npcDir=(dx,dy,id)=>{ const ds=NPC_ART[id]?NPC_ART[id].dirs:['east','west']; const want=Math.abs(dx)>Math.abs(dy)?(dx>0?'east':'west'):(dy>0?'south':'north'); return ds.includes(want)?want:(dx>0?'east':'west'); };
function npcStep(dt){
  if(!NPCS) NPCS=NPC_DEFS.map((d,i)=>({...d,i:1,x:d.route[0][0],y:d.route[0][1],wait:i*2,dir:'south',moving:false,ph:0}));
  for(const n of NPCS){ n.ph+=dt; if(n.wait>0){ n.wait-=dt; n.moving=false; continue; }
    const tgt=n.route[n.i%n.route.length], dx=tgt[0]-n.x, dy=tgt[1]-n.y, d=Math.hypot(dx,dy);
    if(d<2){ n.i=(n.i+1)%n.route.length; n.wait=Math.random()<.45?1.2+Math.random()*3:0; n.moving=false; continue; }
    n.dir=npcDir(dx,dy,n.id); n.moving=true; n.x+=dx/d*n.spd*dt; n.y+=dy/d*n.spd*dt; }
}
const mod=(a,n)=>((a%n)+n)%n;
const tileAt=(T,tx,ty)=>T[mod((tx*7+ty*13)>>4,5)===0?mod(tx>>4,16):[0,1,8,10,13][mod((tx>>4)+(ty>>4),5)]];
const camOf=()=>{ const vw=HUBW/ZOOM, vh=G.H/ZOOM; return {x:clamp(G.P.x-vw/2,0,Math.max(0,WW-vw)),y:clamp(G.P.y-vh*.52,0,Math.max(0,WH-vh))}; };

export function enterHub(){
  if(!DECO) buildVillage(); NPCS=null;
  setMusic('hub',0); S.mode='hub'; S.hub=true; S.paused=false; S.t=0; G.stick=null; G.stickV={x:0,y:0};
  G.P=newPlayer(meta.lastWizard||'raven'); G.P.x=PLAZA.x; G.P.y=PLAZA.y+110; G.P.face='north';
  const c0=camOf();
  G.hub={t:0,near:null,hold:0,lock:false,cx:c0.x,cy:c0.y,motes:Array.from({length:70},(_,i)=>({x:rnd(0,WW),y:rnd(GATE,WH),v:rnd(3,10),p:rnd(0,6)}))};
  ov.hidden=true; muteBtn.hidden=false;
  resize();
}

export function hubStep(dt){
  const h=G.hub, P=G.P; if(!h||!P)return; h.t+=dt;
  const kx=(KEYS.right?1:0)-(KEYS.left?1:0), ky=(KEYS.down?1:0)-(KEYS.up?1:0); let vx=G.stickV.x+kx, vy=G.stickV.y+ky; const l=Math.hypot(vx,vy); if(l>1){vx/=l;vy/=l;}
  const moving=l>.12&&ov.hidden;
  if(moving){ P.x+=vx*175*dt; P.y+=vy*175*dt; P.face=dirOf(Math.atan2(vy,vx)); P.moveAt=performance.now()/1000; } else if(!ov.hidden){} else P.face=P.face||'south';
  P.x=clamp(P.x,30,WW-30); P.y=clamp(P.y,GATE+56,WH-24);
  const push=(x,y,r)=>{ const dx=P.x-x, dy=(P.y+20)-(y-8), d=Math.hypot(dx,dy); if(d<r){ const k=(r-d)/(d||1); P.x+=dx*k; P.y+=dy*k; } };
  for(const s of STATIONS) push(s.fx,s.fy,s.solid);
  for(const d of DECO) if(Math.abs(d.x-P.x)<50&&Math.abs(d.y-P.y)<60) push(d.x,d.y,d.solid);
  let near=null; for(const s of STATIONS) if(Math.hypot(P.x-s.ax,P.y-s.ay)<s.ar)near=s;
  if((near&&near.id)!==(h.near&&h.near.id)){ h.near=near; h.hold=0; h.lock=false; }
  if(near&&!h.lock&&ov.hidden){ h.hold+=dt; if(h.hold>=.5){ h.lock=true; h.hold=0; tone(660,.1,'triangle',.05); openStation(near.id); } }
  npcStep(dt);
  const c=camOf(), k=Math.min(1,dt*8); h.cx+=(c.x-h.cx)*k; h.cy+=(c.y-h.cy)*k;
  for(const m of h.motes){ m.y-=m.v*dt; m.x+=Math.sin(h.t+m.p)*8*dt; if(m.y<GATE){ m.y=WH; m.x=rnd(0,WW); } }
}
function openStation(id){
  if(id==='door'){ enterDeck({exit:enterHub}); return; }
  if(id==='market')showMarket(); else if(id==='forge')showForge(); else if(id==='codex')showCodex(); else showBoard();
}
const back=()=>{ ov.hidden=true; };
const shardsTag=()=>`<span style="color:var(--gold)">✦ ${meta.shards||0} shards</span>`;

function showMarket(){
  const rows=BOOSTS.map(b=>{ const n=meta.boosts[b.id]||0, maxed=n>=b.max, can=!maxed&&(meta.shards||0)>=b.cost;
    return `<button class="shoprow" data-id="${b.id}" style="--boss:#ffd27a" ${can?'':'disabled'}><div class="wport" style="width:34px;height:34px;font-size:1.3rem;display:grid;place-items:center;color:#ffd27a">${b.glyph}</div><div class="txt"><b>${b.name} <small>${n}/${b.max}</small></b><span>${b.desc}</span></div><em>${maxed?'Owned':b.cost+' ✦'}</em></button>`; }).join('');
  show(`<div class="eyebrow">Market · ${shardsTag()}</div><h2>The Merchant</h2><p class="muted">Pay in Arcana Shards, earned from bosses and hunts. What you buy is yours at the start of every hunt.</p><div class="shop">${rows}</div><button class="go" id="hubback">Back to the Sanctum</button>`);
  ov.querySelectorAll('.shoprow').forEach(b=>b.onclick=()=>{ const it=BOOSTS.find(x=>x.id===b.dataset.id); if((meta.shards||0)<it.cost||(meta.boosts[it.id]||0)>=it.max)return; meta.shards-=it.cost; meta.boosts[it.id]=(meta.boosts[it.id]||0)+1; saveMeta(); tone(880,.1,'triangle',.05); showMarket(); });
  $('hubback').onclick=back;
}
function showForge(){
  const slots=['hat','robe','charm'];
  const sec=slot=>{
    if(!meta.forge[slot]){ const c=FORGE_COST[slot], can=(meta.shards||0)>=c; return `<div class="eyebrow">${SLOT_LABEL[slot]}</div><button class="shoprow" data-unlock="${slot}" style="--boss:#ff9a5a" ${can?'':'disabled'}><div class="wport" style="width:34px;height:34px;display:grid;place-items:center;font-size:1.2rem;color:#ff9a5a">🔒</div><div class="txt"><b>Unlock the ${SLOT_LABEL[slot].toLowerCase()} slot</b><span>Start every run wearing a ${SLOT_LABEL[slot].toLowerCase()} you have found before.</span></div><em>${c} ✦</em></button>`; }
    const owned=GEAR.filter(g=>g.slot===slot&&meta.owned.includes(g.id)).sort((a,b)=>rankOf(b.rarity)-rankOf(a.rarity)), cur=meta.loadout[slot];
    const none=`<button class="shoprow" data-slot="${slot}" data-gear="" style="--boss:${!cur?'#ff9a5a':'var(--gold-dim)'}"><div class="wport" style="width:34px;height:34px"></div><div class="txt"><b>Nothing</b><span>Start with this slot empty.</span></div><em>${!cur?'Chosen':''}</em></button>`;
    const rows=owned.map(g=>`<button class="shoprow" data-slot="${slot}" data-gear="${g.id}" style="--boss:${RARITY[g.rarity].c}">${icon('gear_'+g.id,pixIcon(slot))}<div class="txt"><b>${g.name} ${rarityTag(g)}</b><span>${g.desc}</span></div><em>${cur===g.id?'Chosen':''}</em></button>`).join('');
    return `<div class="eyebrow">${SLOT_LABEL[slot]}</div>${none}${rows||'<p class="muted">Gear you find in chests shows up here.</p>'}`;
  };
  show(`<div class="eyebrow">Forge · ${shardsTag()}</div><h2>The Arcane Forge</h2><p class="muted">Unlock a slot, then choose the gear you carry into every hunt. Gear you have worn in a hunt is kept here.</p><div class="shop">${slots.map(sec).join('')}</div><button class="go" id="hubback">Back to the Sanctum</button>`);
  ov.querySelectorAll('[data-unlock]').forEach(b=>b.onclick=()=>{ const s=b.dataset.unlock, c=FORGE_COST[s]; if((meta.shards||0)<c)return; meta.shards-=c; meta.forge[s]=true; saveMeta(); tone(880,.1,'triangle',.05); showForge(); });
  ov.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{ meta.loadout[b.dataset.slot]=b.dataset.gear||null; saveMeta(); tone(520,.06,'square',.03); showForge(); });
  $('hubback').onclick=back;
}

/** the Codex: all 64 bosses as tarot cards, revealed as you beat them */
function showCodex(sel=null){
  const seen=BOSSES.filter((b,i)=>meta.codex[i]>0).length;
  const cell=i=>{ const d=BOSSES[i], n=meta.codex[i]||0; return n>0?`<button class="cdx seen${sel===i?' sel':''}" data-i="${i}" style="--boss:${d.color}"><img alt="" src="${bossCardArt(d,i)}">${d.elite?'<i>★</i>':''}</button>`:`<button class="cdx" data-i="${i}" disabled><span>?</span></button>`; };
  const info=sel!==null?(()=>{ const d=BOSSES[sel], ci=cardInfo(sel); return `<div class="cdxinfo" style="--boss:${d.color}"><b>${d.name}${d.elite?' · Elite':''}</b><span>Beaten ${meta.codex[sel]} time${meta.codex[sel]>1?'s':''}. Card: ${ci.text}${ci.level?' (level '+ci.level+')':''}</span></div>`; })():'<p class="muted">Tap a card you have discovered.</p>';
  show(`<div class="eyebrow">Codex · ${seen} of ${BOSSES.length} hunted</div><h2>The Bestiary</h2>${info}<div class="cdxgrid">${BOSSES.map((b,i)=>cell(i)).join('')}</div><button class="go" id="hubback">Back to the Sanctum</button>`);
  ov.querySelectorAll('.cdx.seen').forEach(b=>b.onclick=()=>{ const y=ov.scrollTop; showCodex(+b.dataset.i); ov.scrollTop=y; });
  $('hubback').onclick=back;
}
/** the Daily Hunt board: the same boss, realm and rooms for everyone today, no Market boosts or Forge gear */
function showBoard(){
  const d=dailyToday(), st=dailyStreak();
  show(`<div class="eyebrow">Daily hunt · ${d.date}</div><h2>Today's quarry</h2>
    <p class="muted">One boss and one realm, the same for everyone today, with no Market boosts, cards or Forge gear. Win it once a day for a shard bonus that grows with your streak.</p>
    <div class="stats"><div><b>${d.won?'Slain':d.best?'Hunting':'Unhunted'}</b><small>Today</small></div><div><b>${st}</b><small>Day streak</small></div></div>
    <button class="go" id="dailygo">${d.best?'Hunt again':'Begin the daily hunt'}</button><button class="linkbtn" id="hubback">Back to the Sanctum</button>`);
  $('dailygo').onclick=()=>{ ov.hidden=true; enterHunt({exit:enterHub,daily:true}); }; $('hubback').onclick=back;
}
/* ---------- drawing ---------- */
const sprW=(im,k)=>im.width/R*k, sprH=(im,k)=>im.height/R*k;
const lanePath=ex=>{ const p=new Path2D(); for(const [x0,y0,x1,y1,w] of LANES){ const hw=w/2+ex, dx=x1-x0, dy=y1-y0, l=Math.hypot(dx,dy), nx=-dy/l*hw, ny=dx/l*hw; p.moveTo(x0+nx,y0+ny); p.lineTo(x1+nx,y1+ny); p.lineTo(x1-nx,y1-ny); p.lineTo(x0-nx,y0-ny); p.closePath(); p.moveTo(x0+hw,y0); p.arc(x0,y0,hw,0,TAU,true); p.moveTo(x1+hw,y1); p.arc(x1,y1,hw,0,TAU,true); } p.moveTo(PLAZA.x+PLAZA.r+ex,PLAZA.y); p.arc(PLAZA.x,PLAZA.y,PLAZA.r+ex,0,TAU,true); return p; };
const GRASS=['#1c2238','#262e4a','#0c0f1b'];
export function drawHub(c){
  const h=G.hub; if(!h)return; const t=S.t, T=SPRITE_OVERRIDES.arena.tiles, has=T.length>15;
  const camX=Math.round(h.cx*K*R)/R, camY=Math.round(h.cy*K*R)/R, vx0=h.cx-70, vx1=h.cx+HUBW/ZOOM+70, vy0=h.cy-90, vy1=h.cy+G.H/ZOOM+70;
  const seen=(x,y)=>x>vx0&&x<vx1&&y>vy0&&y<vy1;
  c.fillStyle='#07040d'; c.fillRect(0,0,LW,G.LH);
  c.save(); c.scale(ZOOM,ZOOM); c.translate(-camX,-camY);
  // grass with tufts, then the cobbled lanes and plaza over it
  c.fillStyle='#121626'; c.fillRect(0,px(GATE-30),px(WW),px(WH-GATE+60));
  for(const u of TUFTS) if(seen(u.x,u.y)){ c.fillStyle=GRASS[u.c]; c.fillRect(px(u.x),px(u.y),1,u.h); }
  for(const u of SPARKS) if(seen(u.x,u.y)){ c.globalAlpha=Math.max(0,Math.sin(t*1.6+u.p*3))*.8; c.fillStyle=u.s; c.fillRect(px(u.x),px(u.y),1,1); } c.globalAlpha=1;
  c.save(); c.scale(K,K); c.fillStyle='#07040d'; c.fill(lanePath(5)); c.fillStyle='#5a4a38'; c.fill(lanePath(3)); c.restore();
  c.save(); c.scale(K,K); c.clip(lanePath(0)); c.scale(1/K,1/K);
  c.fillStyle='#2a2033'; c.fillRect(px(h.cx-70),px(h.cy-90),px(HUBW/ZOOM+140),px(G.H/ZOOM+160));
  if(has){ c.globalAlpha=.85; const x0=Math.floor(px(h.cx-70)/16)*16, y0=Math.floor(px(h.cy-90)/16)*16; for(let ty=y0;ty<px(vy1);ty+=16)for(let tx=x0;tx<px(vx1);tx+=16) c.drawImage(tileAt(T,tx,ty),tx,ty,16,16); c.globalAlpha=1; }
  c.restore();
  // the gate wall across the top: stone with a lip, banners and braziers
  const wy=px(GATE), wh=px(46); c.fillStyle='#2a2233'; c.fillRect(0,wy-wh,px(WW),wh); c.fillStyle='#1c1626'; for(let y=wy-wh+4;y<wy;y+=6)c.fillRect(0,y,px(WW),1); for(let x=0;x<px(WW);x+=14)for(let y=wy-wh;y<wy;y+=12)c.fillRect(x+((y/12|0)%2?7:0),y,1,6);
  c.fillStyle='#8f7440'; c.fillRect(0,wy-1,px(WW),1); c.fillStyle='#4a3a24'; c.fillRect(0,wy,px(WW),1);
  const sg=c.createLinearGradient(0,wy,0,wy+22); sg.addColorStop(0,'rgba(5,2,10,.7)'); sg.addColorStop(1,'rgba(5,2,10,0)'); c.fillStyle=sg; c.fillRect(0,wy+1,px(WW),22);
  c.fillStyle='#07040d'; c.fillRect(0,wy-wh-60,px(WW),60);
  // glowing circles at each station
  for(const s of STATIONS){ if(!seen(s.ax,s.ay)) continue; const ax=px(s.ax), ay=px(s.ay), p=1+Math.sin(t*3+s.ax)*.08; const g=c.createRadialGradient(ax,ay,2,ax,ay,26*p); g.addColorStop(0,hexA(s.col,.5)); g.addColorStop(1,hexA(s.col,0)); c.fillStyle=g; c.beginPath(); c.ellipse(ax,ay,26*p,9*p,0,0,TAU); c.fill();
    c.strokeStyle=hexA(s.col,h.near&&h.near.id===s.id?.95:.5); c.lineWidth=1; c.beginPath(); c.ellipse(ax,ay,13,4.4,0,0,TAU); c.stroke();
    if(h.near&&h.near.id===s.id&&h.hold>0){ c.strokeStyle='#fff6d0'; c.lineWidth=1.4; c.beginPath(); c.ellipse(ax,ay,13,4.4,0,-1.57,-1.57+TAU*Math.min(1,h.hold/.5)); c.stroke(); } }
  // everything with height, drawn back to front
    const items=[], sprite=(art,x,y,k,shadow,flip,sway)=>{ const w=sprW(art,k), hh=sprH(art,k), X=px(x), Y=px(y); if(shadow){ c.fillStyle='rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(X,Y,w*.38,2.4,0,0,TAU); c.fill(); } c.save(); c.translate(X,Y); if(sway) c.transform(1,0,sway,1,0,0); if(flip) c.scale(-1,1); c.drawImage(art,Math.round(-w/2*R)/R,-hh,w,hh); c.restore(); return hh; };
  for(const s of STATIONS){ if(!seen(s.fx,s.fy)) continue; const art=HUB_ART[s.art]; if(art) items.push({y:s.fy,f:()=>{ const hh=sprH(art,s.k); sprite(art,s.fx,s.fy,s.k,true); if(s.id==='door'){ const gg=c.createRadialGradient(px(s.fx),px(s.fy)-hh*.45,2,px(s.fx),px(s.fy)-hh*.45,hh*.7); gg.addColorStop(0,'rgba(176,122,255,'+(.28+.1*Math.sin(t*3)).toFixed(2)+')'); gg.addColorStop(1,'rgba(176,122,255,0)'); c.fillStyle=gg; c.fillRect(px(s.fx)-hh,px(s.fy)-hh*1.2,hh*2,hh*1.4); } } });
    items.push({y:s.ay+11,f:()=>{ c.font='700 5px "Pixelify Sans","Courier New",monospace'; c.textAlign='center'; const ax=px(s.ax), ay=px(s.ay)+11; c.fillStyle='#0b0814'; c.fillText(s.name,ax+.6,ay+.6); c.fillStyle='#f1e8d4'; c.fillText(s.name,ax,ay); } }); }
  const glowAt=(x,y,rad,col,a)=>{ const g=c.createRadialGradient(px(x),px(y),1,px(x),px(y),rad); g.addColorStop(0,hexA(col,a)); g.addColorStop(1,hexA(col,0)); c.fillStyle=g; c.beginPath(); c.arc(px(x),px(y),rad,0,TAU); c.fill(); };
  for(const d of DECO){ if(!seen(d.x,d.y)) continue; const art=HUB_ART[d.art]; if(!art) continue;
    items.push({y:d.y,f:()=>{
      const w=sprW(art,d.k), hh=sprH(art,d.k), sway=SWAYS.has(d.art)?Math.sin(t*1.15+d.ph)*.028+Math.sin(t*.37+d.x*.01)*.012:0;
      if(d.glow){ const q=.16+.05*Math.sin(t*7+d.x)+.04*Math.sin(t*13.3+d.x*2)+.03*Math.sin(t*23+d.ph), g=c.createRadialGradient(px(d.x),px(d.y)-6,2,px(d.x),px(d.y)-6,30); g.addColorStop(0,hexA(d.glow,q*2)); g.addColorStop(1,hexA(d.glow,0)); c.fillStyle=g; c.beginPath(); c.ellipse(px(d.x),px(d.y),30,16,0,0,TAU); c.fill(); }
      sprite(art,d.x,d.y,d.k,d.art!=='lamp'&&d.art!=='mushrooms',d.flip,sway);
            if(WINDOWS[d.art]){ c.globalCompositeOperation='lighter'; for(const [ox,oy] of WINDOWS[d.art]){ const a=.1+.07*Math.sin(t*1.7+d.ph+ox*9); glowAt(d.x+ox*(d.flip?-1:1)*w/K,d.y-hh*oy/K,10,'#ffc46a',a); } c.globalCompositeOperation='source-over'; }
      if(d.art==='lamp'){ c.globalCompositeOperation='lighter'; glowAt(d.x,d.y-hh*.78/K,5,'#ffd890',.35+.15*Math.sin(t*17+d.ph)); c.globalCompositeOperation='source-over'; }
      if(d.art==='campfire'){ c.globalCompositeOperation='lighter'; for(let i=0;i<7;i++){ const age=((t*.55+i/7)%1), ex=px(d.x)+Math.sin(i*5.3+t*1.3)*3.5, ey=px(d.y)-6-age*26; c.globalAlpha=(1-age)*.9; c.fillStyle=i%2?'#ffb45a':'#ff7a3a'; c.fillRect(ex,ey,1,1); } c.globalAlpha=1; glowAt(d.x,d.y-4,16,'#ff8a3a',.18+.08*Math.sin(t*11)); c.globalCompositeOperation='source-over'; }
      if(d.art==='well'||d.art==='astrolabe'||d.art==='mushrooms'||d.art==='moontree'){ c.globalCompositeOperation='lighter'; const n=d.art==='well'?6:4; for(let i=0;i<n;i++){ const age=((t*.35+i/n+d.ph)%1), ex=px(d.x)+Math.sin(i*4.1+d.ph)*w*.22, ey=px(d.y)-hh*(d.art==='well'?.38:.55)-age*(d.art==='well'?18:10); c.globalAlpha=Math.sin(age*Math.PI)*.9; c.fillStyle=i%2?'#ffe9a0':'#bcd8ff'; c.fillRect(ex,ey,1,1); } c.globalAlpha=1; c.globalCompositeOperation='source-over'; }
    } }); }
  for(const n of NPCS||[]){ if(!seen(n.x,n.y)) continue; const A=NPC_ART[n.id]; if(!A) continue;
    items.push({y:n.y,f:()=>{ const fr=n.moving&&A.walk[n.dir]?A.walk[n.dir][Math.floor(n.ph*A.fps)%A.frames]:(A.rot[n.dir]||A.rot.south||A.rot.east); if(!fr) return; sprite(fr,n.x,n.y+3,n.k,true,false,0); } }); }
  const br=SPRITE_OVERRIDES.arena.props&&SPRITE_OVERRIDES.arena.props.brazier, ban=HUB_ART.banner;
  if(br) for(const x of [360,540]) items.push({y:GATE+40,f:()=>{ blitSprite(c,br,px(x),px(GATE+40)); c.fillStyle='rgba(255,154,60,'+(.12+.05*Math.sin(t*9+x)).toFixed(2)+')'; c.beginPath(); c.arc(px(x),px(GATE+40)-20,16,0,TAU); c.fill(); } });
  if(ban) for(const x of [300,600,120,780]) items.push({y:GATE-1,f:()=>{ const w=sprW(ban,1.3), hh=sprH(ban,1.3); c.save(); c.translate(px(x),Math.max(1,wy-hh-1)); c.transform(1,0,Math.sin(t*1.6+x)*.05,1,0,0); c.drawImage(ban,Math.round(-w/2*R)/R,0,w,hh); c.restore(); } });
  items.push({y:G.P.y+20,f:()=>drawWizard(G.P.x,G.P.y,false,G.P.face||'south')});
  items.sort((a,b)=>a.y-b.y); for(const it of items)it.f();
  // fireflies drifting over the village
  for(const m of h.motes){ if(!seen(m.x,m.y)) continue; c.globalAlpha=.3+.4*Math.sin(h.t*2+m.p); c.fillStyle=m.p>3?'#ffe9a0':'#cfe0ff'; c.fillRect(px(m.x),px(m.y),1,1); } c.globalAlpha=1;
  // bats flap across the village and a slow mist drifts along the ground
  for(let i=0;i<5;i++){ const dir=i%2?-1:1, bx=mod(t*(18+i*4)*dir+i*263,WW+240)-120, by=300+i*130+Math.sin(t*1.7+i*2)*16+Math.sin(t*.4+i)*30; if(!seen(bx,by)) continue; const X=px(bx), Y=px(by), up=Math.floor(t*9+i)%2; c.fillStyle='#08060f'; c.fillRect(X-.5,Y,1.5,1); c.fillRect(X-2,Y+(up?-1:0),1.5,1); c.fillRect(X+1.5,Y+(up?-1:0),1.5,1); c.fillRect(X-3,Y+(up?-2:1),1,1); c.fillRect(X+3,Y+(up?-2:1),1,1); }
  for(let i=0;i<7;i++){ const fx=mod(t*(5+i%3*2)+i*173,WW+500)-250, fy=260+i*118+Math.sin(t*.3+i)*20; if(!seen(fx,fy)) continue; const g=c.createRadialGradient(px(fx),px(fy),4,px(fx),px(fy),70); g.addColorStop(0,'rgba(150,165,215,.075)'); g.addColorStop(1,'rgba(150,165,215,0)'); c.fillStyle=g; c.beginPath(); c.ellipse(px(fx),px(fy),70,20,0,0,TAU); c.fill(); }
  c.restore();
  // a shooting star every so often
  { const p=(S.t%9)/1.1; if(p<1){ const x=LW*(.9-.55*p), y=G.LH*(.05+.2*p), g=c.createLinearGradient(x,y,x+22,y-9); g.addColorStop(0,'rgba(255,245,200,.9)'); g.addColorStop(1,'rgba(255,245,200,0)'); c.strokeStyle=g; c.lineWidth=1; c.beginPath(); c.moveTo(x,y); c.lineTo(x+22,y-9); c.stroke(); } }
  // dusk vignette, shard counter and hint stay fixed on screen
  const vg=c.createRadialGradient(LW/2,G.LH*.5,LW*.35,LW/2,G.LH*.5,LW*.95); vg.addColorStop(0,'rgba(8,4,16,0)'); vg.addColorStop(1,'rgba(8,4,16,.55)'); c.fillStyle=vg; c.fillRect(0,0,LW,G.LH);
  c.font='700 7px "Pixelify Sans","Courier New",monospace'; c.textAlign='left'; const sx=12, sy=9; c.fillStyle='#0b0814'; c.fillText('✦ '+(meta.shards||0)+' shards',sx+.6,sy+.6); c.fillStyle='#dcb868'; c.fillText('✦ '+(meta.shards||0)+' shards',sx,sy);
  c.font='700 5px "Pixelify Sans","Courier New",monospace'; c.fillStyle='#bdb09c'; c.fillText('Explore the village. Step onto a glowing circle',sx,G.LH-6);
}
function hexA(h,a){ const n=parseInt(h.slice(1,7),16); return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`; }
