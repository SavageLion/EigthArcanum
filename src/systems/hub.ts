// @ts-nocheck
import { W, muteBtn, ov } from '../core/dom';
import { G, S, newPlayer } from '../core/state';
import { KEYS } from '../core/input';
import { BOSSES } from '../data/bosses';
import { BOOSTS, FORGE_COST, dailyStreak, dailyToday, meta, saveMeta } from '../data/meta';
import { enterLab } from './lab';
import { startRun, bossCardArt } from './flow';
import { SPELLS } from './runnerSpells';
import { HUB_ART, K, LW, R, SPRITE_OVERRIDES, blitSprite, dirOf, makeBg, px } from '../render/sprites';
import { drawWizard } from '../render/draw';
import { resize } from '../core/size';
import { eventsEnd } from './arenaEvents';
import { GEAR, SLOT_LABEL, gearOf } from './gear';
import { icon, pixIcon, show, showSetup } from './faceoff';
import { oaEnd } from './openArena';
import { sideEnd } from './sideView';
import { spellBar } from './casting';
import { $, TAU, clamp, rnd } from '../core/util';
import { setMusic, tone } from '../core/audio';

/* The Sanctum: the base you return to between runs. You walk a small hall and step onto glowing circles: the Door (choose wizard and run
   length, then begin), the Market (spend Arcana Shards on permanent starting boosts) and the Forge (unlock loadout slots and pick which gear
   you carry in). Shards are earned from bosses and runs (data/meta.ts). */
const HUBW=400;
const wallB=()=>G.H*.19;
const stations=()=>{ const wb=wallB(), my=G.H*.40; return [
  {id:'door',name:'THE DOOR',art:'door',k:1.55,fx:HUBW/2,fy:wb+16,ax:HUBW/2,ay:wb+72,ar:34,col:'#b07aff',solid:34},
  {id:'market',name:'MARKET',art:'market',k:1.5,fx:84,fy:my,ax:84,ay:my+40,ar:34,col:'#ffd27a',solid:30},
  {id:'forge',name:'FORGE',art:'forge',k:1.5,fx:316,fy:my,ax:316,ay:my+40,ar:34,col:'#ff9a5a',solid:30},
  {id:'codex',name:'CODEX',art:'codex',k:1.45,fx:70,fy:G.H*.72,ax:70,ay:G.H*.72+40,ar:34,col:'#e8d28a',solid:28},
  {id:'board',name:'DAILY RUN',art:'board',k:1.45,fx:200,fy:G.H*.72,ax:200,ay:G.H*.72+40,ar:34,col:'#9ad0ff',solid:28},
  {id:'lab',name:'SPELL LAB',art:'dummy',k:1.4,fx:330,fy:G.H*.72,ax:330,ay:G.H*.72+40,ar:34,col:'#ff8a8a',solid:26},
]; };
const tileAt=(T,tx,ty)=>T[((tx*7+ty*13)>>4)%5===0?(tx>>4)%16:[0,1,8,10,13][((tx>>4)+(ty>>4))%5]];

export function enterHub(){
  setMusic('reward',0); S.mode='hub'; S.hub=true; S.mod=null; S.orbit=S.fo=S.open=S.side=false; S.paused=false; S.t=0; sideEnd(); eventsEnd(); oaEnd();
  G.fo=null; G.pull=null; G.B=undefined; G.bolts=[]; G.shots=[]; G.rings=[]; G.cols=[]; G.parts=[]; G.seeds=[]; G.beams=[]; G.helpers=[]; G.bands=[]; G.traps=[]; G.hits=[]; G.pillars=[]; G.stick=null; G.stickV={x:0,y:0};
  G.P=newPlayer(meta.lastWizard||'raven'); G.P.x=HUBW/2; G.P.y=G.H*.56; G.P.face='south';
  G.hub={t:0,near:null,hold:0,lock:false,motes:Array.from({length:22},(_,i)=>({x:rnd(0,HUBW),y:rnd(0,G.H),v:rnd(4,14),p:rnd(0,6)}))};
  ov.hidden=true; muteBtn.hidden=false; spellBar.hidden=true; for(const id of ['bossname','omen','hint','call','intro']) $(id).hidden=true;
  resize();
}
/** applies the permanent boosts and the forged loadout to a fresh run */
export function applyHubBonuses(){
  const b=meta.boosts||{}; G.P.max+=b.heart||0; G.P.hp+=b.heart||0; G.P.gold+=15*(b.purse||0); G.P.manaMax+=10*(b.well||0);
  for(const slot of ['hat','robe','charm']){ const id=meta.loadout&&meta.loadout[slot]; if(id&&meta.forge[slot]&&meta.owned.includes(id)){ G.P.gear[slot]=id; if(id==='crown'){ G.P.max=Math.max(1,G.P.max-1); G.P.hp=Math.min(G.P.hp,G.P.max); } } }
}

export function hubStep(dt){
  const h=G.hub, P=G.P; if(!h||!P)return; h.t+=dt;
  const kx=(KEYS.right?1:0)-(KEYS.left?1:0), ky=(KEYS.down?1:0)-(KEYS.up?1:0); let vx=G.stickV.x+kx, vy=G.stickV.y+ky; const l=Math.hypot(vx,vy); if(l>1){vx/=l;vy/=l;}
  const moving=l>.12&&ov.hidden;
  if(moving){ P.x+=vx*175*dt; P.y+=vy*175*dt; P.face=dirOf(Math.atan2(vy,vx)); P.moveAt=performance.now()/1000; } else if(!ov.hidden){} else P.face=P.face||'south';
  P.x=clamp(P.x,26,HUBW-26); P.y=clamp(P.y,wallB()+44,G.H-110);
  for(const s of stations()){ const dx=P.x-s.fx, dy=(P.y+20)-(s.fy-10), d=Math.hypot(dx,dy); if(d<s.solid){ const k=(s.solid-d)/(d||1); P.x+=dx*k; P.y+=dy*k; } }
  let near=null; for(const s of stations()) if(Math.hypot(P.x-s.ax,P.y-s.ay)<s.ar)near=s;
  if((near&&near.id)!==(h.near&&h.near.id)){ h.near=near; h.hold=0; h.lock=false; }
  if(near&&!h.lock&&ov.hidden){ h.hold+=dt; if(h.hold>=.5){ h.lock=true; h.hold=0; tone(660,.1,'triangle',.05); openStation(near.id); } }
  for(const m of h.motes){ m.y-=m.v*dt; m.x+=Math.sin(h.t+m.p)*6*dt; if(m.y<0){ m.y=G.H; m.x=rnd(0,HUBW); } }
}
function openStation(id){
  if(id==='door'){ showSetup(); return; }
  if(id==='market')showMarket(); else if(id==='forge')showForge(); else if(id==='codex')showCodex(); else if(id==='board')showBoard(); else enterLab();
}
const back=()=>{ ov.hidden=true; };
const shardsTag=()=>`<span style="color:var(--gold)">✦ ${meta.shards||0} shards</span>`;

function showMarket(){
  const rows=BOOSTS.map(b=>{ const n=meta.boosts[b.id]||0, maxed=n>=b.max, can=!maxed&&(meta.shards||0)>=b.cost;
    return `<button class="shoprow" data-id="${b.id}" style="--boss:#ffd27a" ${can?'':'disabled'}><div class="wport" style="width:34px;height:34px;font-size:1.3rem;display:grid;place-items:center;color:#ffd27a">${b.glyph}</div><div class="txt"><b>${b.name} <small>${n}/${b.max}</small></b><span>${b.desc}</span></div><em>${maxed?'Owned':b.cost+' ✦'}</em></button>`; }).join('');
  show(`<div class="eyebrow">Market · ${shardsTag()}</div><h2>The Merchant</h2><p class="muted">Pay in Arcana Shards, earned from bosses and finished runs. What you buy is yours at the start of every run.</p><div class="shop">${rows}</div><button class="go" id="hubback">Back to the Sanctum</button>`);
  ov.querySelectorAll('.shoprow').forEach(b=>b.onclick=()=>{ const it=BOOSTS.find(x=>x.id===b.dataset.id); if((meta.shards||0)<it.cost||(meta.boosts[it.id]||0)>=it.max)return; meta.shards-=it.cost; meta.boosts[it.id]=(meta.boosts[it.id]||0)+1; saveMeta(); tone(880,.1,'triangle',.05); showMarket(); });
  $('hubback').onclick=back;
}
function showForge(){
  const slots=['hat','robe','charm'];
  const sec=slot=>{
    if(!meta.forge[slot]){ const c=FORGE_COST[slot], can=(meta.shards||0)>=c; return `<div class="eyebrow">${SLOT_LABEL[slot]}</div><button class="shoprow" data-unlock="${slot}" style="--boss:#ff9a5a" ${can?'':'disabled'}><div class="wport" style="width:34px;height:34px;display:grid;place-items:center;font-size:1.2rem;color:#ff9a5a">🔒</div><div class="txt"><b>Unlock the ${SLOT_LABEL[slot].toLowerCase()} slot</b><span>Start every run wearing a ${SLOT_LABEL[slot].toLowerCase()} you have found before.</span></div><em>${c} ✦</em></button>`; }
    const owned=GEAR.filter(g=>g.slot===slot&&meta.owned.includes(g.id)), cur=meta.loadout[slot];
    const none=`<button class="shoprow" data-slot="${slot}" data-gear="" style="--boss:${!cur?'#ff9a5a':'var(--gold-dim)'}"><div class="wport" style="width:34px;height:34px"></div><div class="txt"><b>Nothing</b><span>Start with this slot empty.</span></div><em>${!cur?'Chosen':''}</em></button>`;
    const rows=owned.map(g=>`<button class="shoprow" data-slot="${slot}" data-gear="${g.id}" style="--boss:${cur===g.id?'#ff9a5a':'var(--gold-dim)'}">${icon('gear_'+g.id,pixIcon(slot))}<div class="txt"><b>${g.name}</b><span>${g.desc}</span></div><em>${cur===g.id?'Chosen':''}</em></button>`).join('');
    return `<div class="eyebrow">${SLOT_LABEL[slot]}</div>${none}${rows||'<p class="muted">Gear you find in chests shows up here.</p>'}`;
  };
  show(`<div class="eyebrow">Forge · ${shardsTag()}</div><h2>The Arcane Forge</h2><p class="muted">Unlock a slot, then choose the gear you carry into every run. Gear you have worn before is kept here.</p><div class="shop">${slots.map(sec).join('')}</div><button class="go" id="hubback">Back to the Sanctum</button>`);
  ov.querySelectorAll('[data-unlock]').forEach(b=>b.onclick=()=>{ const s=b.dataset.unlock, c=FORGE_COST[s]; if((meta.shards||0)<c)return; meta.shards-=c; meta.forge[s]=true; saveMeta(); tone(880,.1,'triangle',.05); showForge(); });
  ov.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{ meta.loadout[b.dataset.slot]=b.dataset.gear||null; saveMeta(); tone(520,.06,'square',.03); showForge(); });
  $('hubback').onclick=back;
}

/** the Codex: all 64 bosses as tarot cards, revealed as you beat them */
function showCodex(sel=null){
  const seen=BOSSES.filter((b,i)=>meta.codex[i]>0).length;
  const cell=i=>{ const d=BOSSES[i], n=meta.codex[i]||0; return n>0?`<button class="cdx seen${sel===i?' sel':''}" data-i="${i}" style="--boss:${d.color}"><img alt="" src="${bossCardArt(d,i)}">${d.elite?'<i>★</i>':''}</button>`:`<button class="cdx" data-i="${i}" disabled><span>?</span></button>`; };
  const info=sel!==null?(()=>{ const d=BOSSES[sel], sp=SPELLS[sel]||SPELLS[0], t=s=>s[0].toUpperCase()+s.slice(1); return `<div class="cdxinfo" style="--boss:${d.color}"><b>${d.name}${d.elite?' · Elite':''}</b><span>Beaten ${meta.codex[sel]} time${meta.codex[sel]>1?'s':''}. Throws ${t(sp[0])} and ${t(sp[1])} spells.</span></div>`; })():'<p class="muted">Tap a card you have discovered.</p>';
  show(`<div class="eyebrow">Codex · ${seen} of ${BOSSES.length} discovered</div><h2>The Bestiary</h2>${info}<div class="cdxgrid">${BOSSES.map((b,i)=>cell(i)).join('')}</div><button class="go" id="hubback">Back to the Sanctum</button>`);
  ov.querySelectorAll('.cdx.seen').forEach(b=>b.onclick=()=>{ const y=ov.scrollTop; showCodex(+b.dataset.i); ov.scrollTop=y; });
  $('hubback').onclick=back;
}
/** the Daily Run board: the same eight bosses and arenas for everyone today, no Market boosts or Forge gear */
function showBoard(){
  const d=dailyToday(), st=dailyStreak();
  show(`<div class="eyebrow">Daily run · ${d.date}</div><h2>Today's challenge</h2>
    <p class="muted">Eight bosses, the same for everyone today, with no Market boosts or Forge gear. Win it once a day for a shard bonus that grows with your streak.</p>
    <div class="stats"><div><b>${d.best}/8</b><small>Best today</small></div><div><b>${st}</b><small>Day streak</small></div><div><b>${d.won?'Done':'Open'}</b><small>Today</small></div></div>
    <button class="go" id="dailygo">${d.best?'Try again':'Start the daily run'}</button><button class="linkbtn" id="hubback">Back to the Sanctum</button>`);
  $('dailygo').onclick=()=>startRun(meta.lastWizard,8,true); $('hubback').onclick=back;
}
/* ---------- drawing ---------- */
const sprW=(im,k)=>im.width/R*k, sprH=(im,k)=>im.height/R*k;
export function drawHub(c){
  const h=G.hub; if(!h)return; const t=S.t, wy=px(wallB()), T=SPRITE_OVERRIDES.arena.tiles, has=T.length>15;
  c.fillStyle='#0f0818'; c.fillRect(0,0,LW,G.LH);
  if(has) for(let ty=0;ty<G.LH;ty+=16)for(let tx=0;tx<LW;tx+=16){ c.globalAlpha=.75; c.drawImage(tileAt(T,tx,ty),tx,ty,16,16); }
  c.globalAlpha=.42; c.fillStyle='#110a1c'; c.fillRect(0,0,LW,G.LH); c.globalAlpha=1;
  // back wall with a lip and a shadow cast on the floor
  c.globalAlpha=.7; c.fillStyle='#07040d'; c.fillRect(0,0,LW,wy); c.globalAlpha=1;
  c.fillStyle='#8f7440'; c.fillRect(0,wy,LW,1); c.fillStyle='#4a3a24'; c.fillRect(0,wy+1,LW,1);
  const sg=c.createLinearGradient(0,wy,0,wy+24); sg.addColorStop(0,'rgba(5,2,10,.7)'); sg.addColorStop(1,'rgba(5,2,10,0)'); c.fillStyle=sg; c.fillRect(0,wy+2,LW,24);
  // rug from the door to the middle of the hall
  const rx0=px(150), rx1=px(250); c.fillStyle='#3a1a4a'; c.fillRect(rx0,wy+4,rx1-rx0,G.LH-wy-4); c.fillStyle='#4f2a63'; for(let y=wy+8;y<G.LH;y+=6)c.fillRect(rx0+3,y,rx1-rx0-6,1);
  c.fillStyle='#dcb868'; c.fillRect(rx0,wy+4,1,G.LH); c.fillRect(rx1-1,wy+4,1,G.LH); c.fillStyle='#8f7440'; c.fillRect(rx0+2,wy+4,1,G.LH); c.fillRect(rx1-3,wy+4,1,G.LH);
  const st=stations();
  // glowing circles at each station
  for(const s of st){ const ax=px(s.ax), ay=px(s.ay), p=1+Math.sin(t*3+s.ax)*.08; const g=c.createRadialGradient(ax,ay,2,ax,ay,26*p); g.addColorStop(0,hexA(s.col,.5)); g.addColorStop(1,hexA(s.col,0)); c.fillStyle=g; c.beginPath(); c.ellipse(ax,ay,26*p,9*p,0,0,TAU); c.fill();
    c.strokeStyle=hexA(s.col,h.near&&h.near.id===s.id?.95:.5); c.lineWidth=1; c.beginPath(); c.ellipse(ax,ay,13,4.4,0,0,TAU); c.stroke();
    if(h.near&&h.near.id===s.id&&h.hold>0){ c.strokeStyle='#fff6d0'; c.lineWidth=1.4; c.beginPath(); c.ellipse(ax,ay,13,4.4,0,-1.57,-1.57+TAU*Math.min(1,h.hold/.5)); c.stroke(); } }
  // everything with height, drawn back to front
  const items=[];
  for(const s of st){ const art=HUB_ART[s.art]; if(art) items.push({y:s.fy,f:()=>{ const w=sprW(art,s.k), hh=sprH(art,s.k); c.fillStyle='rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(px(s.fx),px(s.fy),w*.4,2.5,0,0,TAU); c.fill(); c.drawImage(art,Math.round((px(s.fx)-w/2)*R)/R,Math.round((px(s.fy)-hh)*R)/R,w,hh); if(s.id==='door'){ const gg=c.createRadialGradient(px(s.fx),px(s.fy)-hh*.45,2,px(s.fx),px(s.fy)-hh*.45,hh*.7); gg.addColorStop(0,'rgba(176,122,255,'+(.28+.1*Math.sin(t*3)).toFixed(2)+')'); gg.addColorStop(1,'rgba(176,122,255,0)'); c.fillStyle=gg; c.fillRect(px(s.fx)-hh,px(s.fy)-hh*1.2,hh*2,hh*1.4); } } });
    items.push({y:s.fy+3,f:()=>{ c.font='700 5px "Pixelify Sans","Courier New",monospace'; c.textAlign='center'; const ax=px(s.ax), ay=px(s.ay)+11; c.fillStyle='#0b0814'; c.fillText(s.name,ax+.6,ay+.6); c.fillStyle='#f1e8d4'; c.fillText(s.name,ax,ay); } }); }
  const br=SPRITE_OVERRIDES.arena.props&&SPRITE_OVERRIDES.arena.props.brazier, ban=HUB_ART.banner;
  for(const x of [34,366]) if(br) items.push({y:wallB()+34,f:()=>{ blitSprite(c,br,px(x),px(wallB()+34)); c.fillStyle='rgba(255,154,60,'+(.12+.05*Math.sin(t*9+x)).toFixed(2)+')'; c.beginPath(); c.arc(px(x),px(wallB()+34)-20,16,0,TAU); c.fill(); } });
  if(ban) for(const x of [128,272]) items.push({y:wallB()-1,f:()=>{ const w=sprW(ban,1.5), hh=sprH(ban,1.5); c.drawImage(ban,Math.round((px(x)-w/2)*R)/R,Math.max(1,wy-hh-1),w,hh); } });
  items.push({y:G.P.y+20,f:()=>drawWizard(G.P.x,G.P.y,false,G.P.face||'south')});
  items.sort((a,b)=>a.y-b.y); for(const it of items)it.f();
  // drifting motes and the shard counter
  for(const m of h.motes){ c.globalAlpha=.25+.25*Math.sin(h.t*2+m.p); c.fillStyle='#e8d8ff'; c.fillRect(px(m.x),px(m.y),1,1); } c.globalAlpha=1;
  c.font='700 7px "Pixelify Sans","Courier New",monospace'; c.textAlign='left'; const sx=12, sy=9; c.fillStyle='#0b0814'; c.fillText('✦ '+(meta.shards||0)+' shards',sx+.6,sy+.6); c.fillStyle='#dcb868'; c.fillText('✦ '+(meta.shards||0)+' shards',sx,sy);
  c.font='700 5px "Pixelify Sans","Courier New",monospace'; c.fillStyle='#bdb09c'; c.fillText('Walk onto a glowing circle',sx,G.LH-6);
}
function hexA(h,a){ const n=parseInt(h.slice(1,7),16); return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`; }
