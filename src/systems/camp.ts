// @ts-nocheck
import { muteBtn, ov, stage } from '../core/dom';
import { G, S } from '../core/state';
import { BOSSES, ELITE_SECOND } from '../data/bosses';
import { gains } from '../data/meta';
import { HUB_ART, LW, R, SPRITE_OVERRIDES, blitSprite, px } from '../render/sprites';
import { drawWizard } from '../render/draw';
import { equip, gearOf, rarityTag, SLOT_LABEL } from './gear';
import { RARITY } from '../data/rarity';
import { WANDS, spellValue, total } from './deck';
import { BOSS_EL, EL, TYPES, learnRecipe, spellCost, spellDesc, spellName } from './spells';
import { forgeOptions, icon, leaveShop, makeStock, pixIcon, spellIcon } from './faceoff';
import { spellBar } from './casting';
import { hotSave } from '../main';
import { $, TAU } from '../core/util';
import { setMusic, sfx } from '../core/audio';

/* The Camp: one tap-based screen between bosses. Your reward spells sit in a tray at the top, your spell slots and gear are below, and the
   merchant and wardrobe are props you tap in the scene between them. Select a reward, tap the slot it should go to (or sell it), and
   press Next card. The same keep / fuse / replace / sell rules as before (forgeOptions in faceoff.ts). */
const col=s=>EL[s.els[0]].c;
const newOpts=()=>{ const d=BOSSES[S.stage], el=BOSS_EL[S.stage], types=Object.keys(TYPES).sort(()=>Math.random()-.5).slice(0,3), sec=ELITE_SECOND[S.stage]; return types.map(type=>sec?{type,els:[el,sec],tier:1}:{type,els:[el],tier:0}); };
export function enterCamp(){
  S.mode='pick'; S.camp=true; setMusic('shop',S.pos); muteBtn.hidden=false; spellBar.hidden=true; for(const id of ['bossname','omen','hint','call','intro']) $(id).hidden=true;
  G.camp={opts:newOpts(),claimed:false,sel:null,slot:null,panel:null,stock:makeStock(),rerolls:0,confirm:false,band:null,motes:[]};
  S.pendingOpts=G.camp.opts; ov.classList.add('camp-on'); render(); hotSave();
}
export function leaveCamp(){ S.camp=false; G.camp=null; ov.classList.remove('camp-on'); }

const gearChip=(slot)=>{ const id=G.P.gear[slot], g=id&&gearOf(id); return `<button class="chip" data-panel="gear" title="${SLOT_LABEL[slot]}"${g?` style="border-color:${RARITY[g.rarity].c}"`:''}>${g?icon('gear_'+g.id,pixIcon(slot)):`<span class="empty">${SLOT_LABEL[slot][0]}</span>`}</button>`; };
function lootHTML(){
  const id=G.P.loot[0]; if(!id)return ''; const g=gearOf(id), old=G.P.gear[g.slot]&&gearOf(G.P.gear[g.slot]);
  return `<div class="lootrow" style="--boss:${RARITY[g.rarity].c}">${icon('gear_'+g.id,pixIcon(g.slot))}<div class="txt"><small>From the chest · ${RARITY[g.rarity].name} ${SLOT_LABEL[g.slot]}</small><b style="color:${RARITY[g.rarity].c}">${g.name}</b><span>${g.desc}${old?` Replaces ${old.name}.`:''}</span></div><div class="lootbtns"><button class="go copt" id="wear">${old?`Swap +${old.value}`:'Wear'}</button><button class="ghost copt" id="sellg">Sell +${g.value}</button></div></div>`;
}
function detailHTML(){
  const C=G.camp, P=G.P;
  if(C.sel!==null&&!C.claimed){ const n=C.opts[C.sel], v=spellValue(n);
    const head=`<div class="dhead" style="--boss:${col(n)}">${spellIcon(n)}<div class="txt"><b>${spellName(n)} <small>${spellCost(n)} mana</small></b><span>${spellDesc(n)}</span></div></div>`;
    if(C.slot===null) return `${head}<p class="muted">Tap a slot to place it, or sell it.</p><button class="ghost copt" id="sellnew">Sell it · +${v} gold</button>`;
    const opts=forgeOptions(n).filter(o=>o.slot===C.slot); C.shown=opts;
    return `${head}<div class="optlist">${opts.map((o,i)=>`<button class="copt optbtn" data-o="${i}" style="--boss:${col(o.result)}"><b>${o.label}</b><span>${spellName(o.result)} · ${spellCost(o.result)} mana · ${spellDesc(o.result)}</span></button>`).join('')}</div>`;
  }
  if(C.slot!==null&&P.spells[C.slot]){ const s=P.spells[C.slot];
    return `<div class="dhead" style="--boss:${col(s)}">${spellIcon(s)}<div class="txt"><b>${spellName(s)} <small>${spellCost(s)} mana</small></b><span>${spellDesc(s)}</span></div></div><button class="ghost copt" id="sellslot">Sell it · +${spellValue(s)} gold</button>`; }
  return `<p class="muted">${C.claimed?'Reward claimed. ':C.sel===null?'Tap a reward to read it. ':''}Tap a spell to inspect it, the merchant to shop, or the wardrobe for your gear.</p>`;
}
function sheetHTML(){
  const C=G.camp, P=G.P; if(!C.panel)return '';
  if(C.panel==='shop'){ const rc=5+5*C.rerolls;
    const row=(it,i)=>{ const sold=it.sold, can=!sold&&P.gold>=it.cost&&(it.wand||it.ok());
      return `<button class="shoprow" data-i="${i}" style="--boss:${it.c}" ${can?'':'disabled'}>${icon(it.wand?'wand_'+it.id:'good_'+it.id,pixIcon(it.icon))}<div class="txt"><b>${it.name}</b><span>${it.desc}</span></div><em>${sold?'Sold':it.cost+' gold'}</em></button>`; };
    return `<div class="sheet"><div class="eyebrow">The merchant</div><div class="gold"><span class="coin"></span>${P.gold} gold</div><div class="cards">${C.stock.map(row).join('')}</div><div class="shopbtns"><button class="ghost" id="reroll" ${P.gold>=rc?'':'disabled'}>New stock · ${rc} gold</button><button class="go" id="closesheet">Back to camp</button></div></div>`; }
  const wd=P.wand&&WANDS.find(w=>w.id===P.wand);
  const rows=['hat','robe','charm'].map(slot=>{ const g=P.gear[slot]&&gearOf(P.gear[slot]); return `<div class="shoprow" style="--boss:${g?RARITY[g.rarity].c:'var(--gold-dim)'}">${g?icon('gear_'+g.id,pixIcon(slot)):''}<div class="txt"><b>${SLOT_LABEL[slot]}: ${g?g.name:'empty'} ${g?rarityTag(g):''}</b><span>${g?g.desc:'Chests and the merchant sometimes have one.'}</span></div></div>`; });
  rows.push(`<div class="shoprow" style="--boss:${wd?RARITY[wd.rarity].c:'var(--gold-dim)'}">${wd?icon('wand_'+wd.id,pixIcon('wand')):''}<div class="txt"><b>Wand: ${wd?wd.name:'none'} ${wd?`<small class="rar" style="color:${RARITY[wd.rarity].c}">${RARITY[wd.rarity].name} Wand</small>`:''}</b><span>${wd?wd.desc:'The merchant sells wands.'}</span></div></div>`);
  return `<div class="sheet"><div class="eyebrow">The wardrobe</div><p class="muted">What you are wearing. New gear from chests is offered at the top of the camp.</p><div class="cards">${rows.join('')}</div><div class="shopbtns"><button class="go" id="closesheet">Back to camp</button></div></div>`;
}
function render(){
  const C=G.camp, P=G.P, d=BOSSES[S.stage], pendingLoot=P.loot.length>0, needsConfirm=(!C.claimed)||pendingLoot;
  const slots=Array.from({length:P.slots},(_,i)=>{ const s=P.spells[i], tgt=C.sel!==null&&!C.claimed;
    return `<button class="slotbtn${tgt?' target':''}${C.slot===i?' sel':''}" data-slot="${i}" style="--boss:${s?col(s):'var(--gold-dim)'}"><span class="n">${i+1}</span>${s?`${spellIcon(s)}<b>${spellName(s)}</b><em>${spellCost(s)}</em>`:`<b class="emptyslot">${tgt?'Place here':'Empty slot'}</b>`}</button>`; }).join('');
  const wd=P.wand&&WANDS.find(w=>w.id===P.wand);
  const tray=C.claimed?`<p class="muted trayhint">Reward claimed.</p>`:C.opts.map((s,i)=>`<button class="card rcard${C.sel===i?' sel':''}" data-i="${i}" style="--boss:${col(s)}">${spellIcon(s)}<b>${spellName(s)}</b><em>${spellCost(s)} mana</em></button>`).join('');
  const nextLabel=C.confirm?(pendingLoot?'Leave the chest gear? Tap again':'Leave the reward? Tap again'):'Next card';
  ov.innerHTML=`<div class="camp">
    <header class="camphead"><div class="eyebrow">${S.pos+1} of ${total()} defeated · ${d.name}</div><div class="campstats"><span class="gold"><span class="coin"></span>${P.gold} gold</span><span>♥ ${P.hp}/${P.max}</span><span>✦ +${gains.boss} shards</span>${P.reward?`<span class="muted">+${P.reward.g} gold earned</span>`:''}</div></header>
    <section class="camptray">${lootHTML()}${C.claimed?'':`<div class="traytitle">Take ${d.elite?'an elite':'a'} spell</div>`}<div class="tray${C.claimed?' done':''}">${tray}</div></section>
    <div class="campscene" id="campscene"></div>
    <section class="campdock"><div class="slotrow">${slots}</div>
      <div class="gearrow">${wd?`<button class="chip" data-panel="gear" title="Wand">${icon('wand_'+wd.id,pixIcon('wand'))}</button>`:'<button class="chip" data-panel="gear" title="Wand"><span class="empty">W</span></button>'}${gearChip('hat')}${gearChip('robe')}${gearChip('charm')}<span class="gearhint">Wand and gear</span></div>
      <div class="detail" id="detail">${detailHTML()}</div>
      <button class="go" id="campnext">${nextLabel}</button></section>
    ${sheetHTML()}</div>`;
  ov.hidden=false; ov.scrollTop=0; stage.style.cursor='default';
  // where the scene shows through, so the canvas and the tap props line up
  const r=$('campscene').getBoundingClientRect(), s=stage.getBoundingClientRect(); C.band={y0:(r.top-s.top)/s.height*G.H,y1:(r.bottom-s.top)/s.height*G.H};
  const ym=(C.band.y0+C.band.y1)/2, pos=(x,y)=>`left:${(x/400*100).toFixed(1)}%;top:${(((y-C.band.y0)/(C.band.y1-C.band.y0))*100).toFixed(1)}%`;
  $('campscene').innerHTML=`<button class="prop" id="propshop" style="${pos(330,ym)}" aria-label="Merchant"><span>SHOP</span></button><button class="prop" id="propgear" style="${pos(70,ym)}" aria-label="Wardrobe"><span>GEAR</span></button>`;
  wire();
}
function claimed(){ const C=G.camp; C.claimed=true; C.sel=null; C.slot=null; C.confirm=false; G.P.spells.forEach(learnRecipe); sfx.pick();
  if(G.P.extraPick){ G.P.extraPick=false; C.opts=newOpts(); C.claimed=false; S.pendingOpts=C.opts; } hotSave(); render(); }
function wire(){
  const C=G.camp, P=G.P;
  ov.querySelectorAll('.rcard').forEach(b=>b.onclick=()=>{ C.sel=C.sel===+b.dataset.i?null:+b.dataset.i; C.slot=null; C.confirm=false; sfx.pick&&0; render(); });
  ov.querySelectorAll('.slotbtn').forEach(b=>b.onclick=()=>{ let i=+b.dataset.slot; if(C.sel!==null&&!C.claimed)i=Math.min(i,P.spells.length); C.slot=C.slot===i&&!(C.sel!==null&&!C.claimed)?null:i; C.confirm=false; render(); });
  ov.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{ const o=C.shown[+b.dataset.o]; P.spells[o.slot]=o.result; claimed(); });
  const sn=$('sellnew'); if(sn)sn.onclick=()=>{ P.gold+=spellValue(C.opts[C.sel]); sfx.coin(); claimed(); };
  const ss=$('sellslot'); if(ss)ss.onclick=()=>{ P.gold+=spellValue(P.spells[C.slot]); P.spells.splice(C.slot,1); C.slot=null; sfx.coin(); hotSave(); render(); };
  const wr=$('wear'); if(wr)wr.onclick=()=>{ equip(gearOf(P.loot[0])); P.loot.shift(); sfx.pick(); hotSave(); render(); };
  const sg=$('sellg'); if(sg)sg.onclick=()=>{ P.gold+=gearOf(P.loot[0]).value; P.loot.shift(); sfx.coin(); hotSave(); render(); };
  const open=p=>()=>{ C.panel=p; render(); };
  $('propshop').onclick=open('shop'); $('propgear').onclick=open('gear'); ov.querySelectorAll('[data-panel]').forEach(b=>b.onclick=open('gear'));
  const cs=$('closesheet'); if(cs)cs.onclick=()=>{ C.panel=null; render(); };
  ov.querySelectorAll('.sheet .shoprow[data-i]').forEach(b=>b.onclick=()=>{ const it=C.stock[+b.dataset.i]; if(it.sold||P.gold<it.cost)return; P.gold-=it.cost; it.sold=true; if(it.wand)P.wand=it.id; else it.fx(); sfx.coin(); hotSave(); render(); });
  const rr=$('reroll'); if(rr)rr.onclick=()=>{ const rc=5+5*C.rerolls; if(P.gold<rc)return; P.gold-=rc; C.rerolls++; C.stock=makeStock(); sfx.coin(); render(); };
  $('campnext').onclick=()=>{ const need=(!C.claimed)||P.loot.length>0; if(need&&!C.confirm){ C.confirm=true; render(); return; } P.spells.forEach(learnRecipe); S.mod=null; leaveCamp(); leaveShop(); };
}

/* ---------- the scene behind the screen ---------- */
const tileAt=(T,tx,ty)=>T[((tx*7+ty*13)>>4)%5===0?(tx>>4)%16:[0,1,8,10,13][((tx>>4)+(ty>>4))%5]];
export function drawCamp(c){
  const C=G.camp; if(!C)return; const t=S.t, ym=C.band?(C.band.y0+C.band.y1)/2:G.H*.5, T=SPRITE_OVERRIDES.arena.tiles, has=T.length>15;
  c.fillStyle='#0b0814'; c.fillRect(0,0,LW,G.LH);
  if(has) for(let ty=0;ty<G.LH;ty+=16)for(let tx=0;tx<LW;tx+=16){ c.globalAlpha=.6; c.drawImage(tileAt(T,tx,ty),tx,ty,16,16); }
  c.globalAlpha=.55; c.fillStyle='#0a0614'; c.fillRect(0,0,LW,G.LH); c.globalAlpha=1;
  const fx=px(200), fy=px(ym+40);
  const g=c.createRadialGradient(fx,fy,3,fx,fy,70); g.addColorStop(0,'rgba(255,170,80,'+(.5+.08*Math.sin(t*9)).toFixed(2)+')'); g.addColorStop(.5,'rgba(255,120,40,.18)'); g.addColorStop(1,'rgba(255,120,40,0)'); c.fillStyle=g; c.fillRect(0,fy-80,LW,160);
  const items=[], put=(art,x,y,k,extra)=>{ const im=HUB_ART[art]; if(!im)return; items.push({y,f:()=>{ const w=im.width/R*k, h=im.height/R*k; c.fillStyle='rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(px(x),px(y),w*.4,2.2,0,0,TAU); c.fill(); c.drawImage(im,Math.round((px(x)-w/2)*R)/R,Math.round((px(y)-h)*R)/R,w,h); extra&&extra(w,h); }}); };
  const kk=C.band&&(C.band.y1-C.band.y0)<150?.9:1.15; put('market',330,ym+34,kk); put('forge',70,ym+34,kk); put('campfire',200,ym+52,kk*1.1);
  items.push({y:ym+30,f:()=>drawWizard(200,ym+8,false,'south')});
  const br=SPRITE_OVERRIDES.arena.props&&SPRITE_OVERRIDES.arena.props.brazier; if(br) for(const x of [24,376]) items.push({y:ym+16,f:()=>{ blitSprite(c,br,px(x),px(ym+16)); c.fillStyle='rgba(255,154,60,'+(.12+.05*Math.sin(t*9+x)).toFixed(2)+')'; c.beginPath(); c.arc(px(x),px(ym+16)-20,16,0,TAU); c.fill(); }});
  items.sort((a,b)=>a.y-b.y); for(const it of items)it.f();
  // sparks from the fire
  for(let i=0;i<14;i++){ const p=((t*.6+i*.137)%1), x=fx+Math.sin(i*3.1+t*2)*6*p, y=fy-4-p*34; c.globalAlpha=1-p; c.fillStyle=i%3?'#ffcf6e':'#ff8a3c'; c.fillRect(Math.round(x),Math.round(y),1,1); } c.globalAlpha=1;
  // little pulses on the tappable props
  const pulse=.5+.5*Math.sin(t*3); for(const [x,col_] of [[330,'#ffd27a'],[70,'#ff9a5a']]){ c.strokeStyle=col_; c.globalAlpha=.25+.35*pulse; c.beginPath(); c.ellipse(px(x),px(ym+34)+2,18,5,0,0,TAU); c.stroke(); } c.globalAlpha=1;
}
