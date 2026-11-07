// @ts-nocheck
import { W } from './dom';
import { RO } from '../systems/deck';
import { wizardById } from '../data/meta';
/** Shared mutable game state. Everything that used to be a closure `let` lives here as G.<name>. */
export const G: any = {
  H: 720,
  scale: 1,
  P: undefined,
  B: undefined,
  bolts: [],
  hits: [],
  shots: [],
  rings: [],
  cols: [],
  parts: [],
  seeds: [],
  beams: [],
  helpers: [],
  bg: null,
  DT: 0,
  bands: [],
  pillars: [],
  plats: [],
  stick: null,
  stickV: {x:0,y:0},
  still: 0,
  oa: null,
  CHESTIMG: null,
  chestCall: 0,
  traps: [],
  LH: 288,
  pull: null,
  handImg: null,
  handFlip: null,
  fo: null,
  foHold: null,
  wizBack: null,
  wakeLock: null,
  btnState: '',
  drag: null,
  last: 0,
};



/* ---------- audio: small synth, starts from the first button press ---------- */

/* ---------- world state ---------- */
export const S={mode:'title',stage:0,t:0,shake:0,flash:0,god:false,hits:0,best:0,runSeconds:0,paused:false};
S.recipes=[];
try{ S.best=+localStorage.getItem('ea-best')||0; S.recipes=JSON.parse(localStorage.getItem('ea-recipes')||'[]'); }catch(e){}

export function newPlayer(wizardId='raven'){
  const w=wizardById(wizardId);
  return {wizard:w.id,perk:w.perk,freeCast:0,gear:{hat:null,robe:null,charm:null},loot:[],moonUsed:false,sageN:0,slots:w.slots,gold:w.gold,wand:null,thirdEye:false,reward:null,cleanFight:true,a:Math.PI/2,rr:RO,tr:RO,x:W/2,y:G.H-150,vx:0,hp:w.hearts,max:w.hearts,hit:5,inv:0,scale:1,rate:w.rate,cast:0,spells:w.spell?[{...w.spell,els:[...w.spell.els]}]:[],mana:0,manaMax:w.mana,cd:0,shield:0,shieldSpell:null,shieldPw:1,boneCasts:0,grazeGlow:0};
}
