/* Meta-progression: what carries over between runs (wizards, run lengths, counters). Saved in localStorage. */
export const RUN_LENGTHS=[8,16,32,64] as const;

export interface Meta{
  wizards:string[];                      // unlocked wizard ids
  runs:number[];                         // unlocked run lengths
  counters:{bosses:number;elites:number;clean:number;mimics:number;chests:number;won:Record<number,number>};
  best:Record<number,number>;            // most bosses beaten per run length
  lastWizard:string; lastRun:number;
}
const KEY='ea-meta-v1';
const fresh=():Meta=>({wizards:['raven'],runs:[8],counters:{bosses:0,elites:0,clean:0,mimics:0,chests:0,won:{8:0,16:0,32:0,64:0}},best:{8:0,16:0,32:0,64:0},lastWizard:'raven',lastRun:8});
function load():Meta{ try{ const j=JSON.parse(localStorage.getItem(KEY)||'null'); if(j&&j.counters) return {...fresh(),...j,counters:{...fresh().counters,...j.counters,won:{...fresh().counters.won,...j.counters.won}},best:{...fresh().best,...j.best}}; }catch(e){} return fresh(); }
export const meta:Meta=load(); if(!meta.runs.includes(8)) meta.runs.unshift(8);
export const saveMeta=()=>{ try{ localStorage.setItem(KEY,JSON.stringify(meta)); }catch(e){} };

export interface Wizard{
  id:string; name:string; blurb:string;
  hearts:number; mana:number; rate:number; slots:number; gold:number;      // base stats (rate = seconds between basic bolts, lower is faster)
  spell?:{type:string;els:string[];tier:number}; perk:string; perkText:string;
  unlock:string; unlocked:(m:Meta)=>boolean;
}
export const WIZARDS:Wizard[]=[
  {id:'raven',name:'Raven Astrologer',blurb:'Balanced. A seeker of the stars.',hearts:4,mana:100,rate:.2,slots:2,gold:0,perk:'',perkText:'No special trick: reliable in any fight.',unlock:'Available from the start',unlocked:()=>true},
  {id:'ember',name:'Cinder Acolyte',blurb:'A glass cannon who burns bright.',hearts:3,mana:90,rate:.16,slots:2,gold:0,spell:{type:'nova',els:['fire'],tier:0},perk:'wildfire',perkText:'Wildfire: the first spell of every fight is free.',unlock:'Beat 6 bosses in total',unlocked:m=>m.counters.bosses>=6},
  {id:'frost',name:'Frost Hermit',blurb:'Slow and sturdy behind a shield.',hearts:5,mana:100,rate:.24,slots:2,gold:0,spell:{type:'ward',els:['frost'],tier:0},perk:'rime',perkText:'Rimeguard: shields last 50% longer.',unlock:'Win 3 fights without being hit',unlocked:m=>m.counters.clean>=3},
  {id:'bone',name:'Bone Priestess',blurb:'Never fights alone.',hearts:4,mana:80,rate:.2,slots:2,gold:0,spell:{type:'summon',els:['bone'],tier:0},perk:'grave',perkText:'Grave company: every fight starts with a familiar.',unlock:'Defeat 2 elites in total',unlocked:m=>m.counters.elites>=2},
  {id:'gambler',name:'The Gambler',blurb:'Fortune favours the reckless.',hearts:3,mana:100,rate:.2,slots:2,gold:40,perk:'lucky',perkText:'Lucky streak: 10% of bolts crit for x5, and chests hold 50% more gold.',unlock:'Slay 2 mimics in total',unlocked:m=>m.counters.mimics>=2},
];
export const wizardById=(id:string)=>WIZARDS.find(w=>w.id===id)||WIZARDS[0];
export const isRunUnlocked=(n:number)=>meta.runs.includes(n);
export const RUN_UNLOCK:Record<number,string>={8:'Available from the start',16:'Win the 8-boss run',32:'Win a 16-boss run',64:'Win a 32-boss run'};

/* ---- unlock bookkeeping ---- */
let pending:string[]=[];
export const takeUnlocks=()=>{ const p=pending; pending=[]; return p; };
function check(){
  for(const w of WIZARDS) if(!meta.wizards.includes(w.id)&&w.unlocked(meta)){ meta.wizards.push(w.id); pending.push(`New wizard: ${w.name}`); }
  if(!meta.runs.includes(16)&&(meta.counters.won[8]>0||meta.counters.won[16]>0)){ meta.runs.push(16); pending.push('Unlocked: the 16-boss run'); }
  if(!meta.runs.includes(32)&&meta.counters.won[16]>0){ meta.runs.push(32); pending.push('Unlocked: the 32-boss run'); }
  if(!meta.runs.includes(64)&&meta.counters.won[32]>0){ meta.runs.push(64); pending.push('Unlocked: the 64-boss run'); }
  saveMeta();
}
export function noteBoss(elite:boolean,clean:boolean){ meta.counters.bosses++; if(elite)meta.counters.elites++; if(clean)meta.counters.clean++; check(); }
export function noteMimic(){ meta.counters.mimics++; check(); }
export function noteChest(){ meta.counters.chests++; saveMeta(); }
export function noteRunEnd(total:number,bossesBeaten:number,won:boolean){
  meta.best[total]=Math.max(meta.best[total]||0,bossesBeaten);
  if(won) meta.counters.won[total]=(meta.counters.won[total]||0)+1;
  check();
}
export function remember(wizard:string,run:number){ meta.lastWizard=wizard; meta.lastRun=run; saveMeta(); }
/** testing helper */
export function unlockEverything(){ meta.wizards=WIZARDS.map(w=>w.id); meta.runs=[...RUN_LENGTHS]; saveMeta(); }
