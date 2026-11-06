// @ts-nocheck
import './style.css';
import '@fontsource/pixelify-sans/500.css';
import '@fontsource/pixelify-sans/700.css';
import '@fontsource/vt323/400.css';
import { G, S, newPlayer } from './core/state';
import { swapRing } from './core/input';
import { resize } from './core/size';
import { BOSSES, ELITE_POS, TOTAL, dealOrder } from './data/bosses';
import { draw, drawTitle } from './render/draw';
import { bossFrames, loadSprites } from './render/sprites';
import { foPlan } from './systems/bossPlans';
import { castSpell, syncSpells } from './systems/casting';
import { CY, GOODS, OMENS, RI, RO, WANDS } from './systems/deck';
import { buy, foDodge, foThrow, forgeOptions, leaveShop, nextBoss, openShop, showShop, showTitle, takeSpell } from './systems/faceoff';
import { quickPull, showDraw, startRun, turnCard, updateDraw } from './systems/flow';
import { GEAR, chestLoot, equip, gearOf, lootOrShop, showLoot, spawnChest } from './systems/gear';
import { damage, step } from './systems/sim';
import { endBeam } from './systems/spellFx';
import { EL, TYPES, spellCost, spellName } from './systems/spells';

function frame(now){
  const dt=Math.min(.033,(now-G.last)/1000||0); G.last=now;
  if(S.mode==='title'){ S.t+=dt; drawTitle(); }
  else { syncSpells(); if(S.mode==='draw'&&!S.paused)updateDraw(dt); if(!S.paused&&S.mode!=='pick'&&S.mode!=='dead'&&S.mode!=='victory'&&S.mode!=='draw'&&S.mode!=='shop') step(dt); draw(); }
  requestAnimationFrame(frame);
}
export function hotSave(){ S.saved=G.P?{order:S.order,pos:S.pos,hp:G.P.hp,seconds:S.runSeconds,used:S.usedOmens,gear:G.P.gear,slots:G.P.slots,gold:G.P.gold,wand:G.P.wand,max:G.P.max,manaMax:G.P.manaMax,thirdEye:G.P.thirdEye,spells:G.P.spells.map(s=>({...s}))}:null; }
function start(data){
  resize();
  const d=data&&data.saved;
  if(d&&Array.isArray(d.spells)&&Array.isArray(d.order)&&d.order.length===TOTAL){
    G.P=newPlayer(); G.P.spells=d.spells; G.P.gear=d.gear||G.P.gear; G.P.slots=d.slots||2; G.P.gold=d.gold||0; G.P.wand=d.wand||null; G.P.max=d.max||4; G.P.manaMax=d.manaMax||100; G.P.thirdEye=!!d.thirdEye; G.P.scale=Math.pow(1.1,d.pos); G.P.hp=Math.min(G.P.max,d.hp); S.order=d.order; S.pos=d.pos; S.usedOmens=d.used||[]; S.runSeconds=d.seconds||0;
    showDraw();
  } else showTitle();
  requestAnimationFrame(t=>{G.last=t;frame(t)});
}
try{ window.claude?.hot?.snapshot?.(()=>({saved:S.saved||null})); }catch(e){}
loadSprites().finally(()=>{ window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {}); });

window.__arcana={damage,endBeam,EL,TYPES,get traps(){return G.traps},foPlan,CY,RO,RI,spawnChest,showLoot,lootOrShop,GEAR,gearOf,equip,chestLoot,get oa(){return G.oa},setStick(x,y){G.stickV={x,y}},quickPull,foDodge,foThrow,updateDraw,turnCard,get fo(){return G.fo},get pull(){return G.pull},bossFrames,dealOrder,ELITE_POS,showShop,openShop,leaveShop,buy,WANDS,GOODS,showDraw,OMENS,swapRing,S,BOSSES,step,startRun,takeSpell,forgeOptions,castSpell,spellName,spellCost,nextBoss,get P(){return G.P},get B(){return G.B},get shots(){return G.shots},counts:()=>({shots:G.shots.length,rings:G.rings.length,cols:G.cols.length})};
