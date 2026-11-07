import { setScoreEnergy, startScore, stopScore } from './score';
/* Audio: a small synth (always available) plus optional recorded files.
   Drop files into public/assets/audio/{music,sfx}/ and list them in public/assets/audio/manifest.json
   (see docs/audio.md). Anything not in the manifest keeps playing the synth version, so the game never goes silent. */
export const snd:{ac:AudioContext|null,muted:boolean}={ac:null,muted:false};
try{ snd.muted = localStorage.getItem('ea-mute')==='1'; }catch(e){}
export function wakeAudio(){ try{ snd.ac = snd.ac || new (window.AudioContext||(window as any).webkitAudioContext)(); snd.ac.resume(); }catch(e){} musicWake(); }
export function tone(f,d,type:OscillatorType='sine',v=.1,slide=0,delay=0){
  const ac=snd.ac; if(!ac||snd.muted) return;
  const t=ac.currentTime+delay,o=ac.createOscillator(),g=ac.createGain();
  o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f+slide),t+d);
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0008,t+d);
  o.connect(g).connect(ac.destination);o.start(t);o.stop(t+d);
}
function noise(d,v=.08,hp=800,delay=0){   // filtered noise burst: whooshes, crackle, shuffles
  const ac=snd.ac; if(!ac||snd.muted) return;
  const n=Math.floor(ac.sampleRate*d), buf=ac.createBuffer(1,n,ac.sampleRate), ch=buf.getChannelData(0);
  for(let i=0;i<n;i++) ch[i]=(Math.random()*2-1)*(1-i/n);
  const s=ac.createBufferSource(), f=ac.createBiquadFilter(), g=ac.createGain(), t=ac.currentTime+delay;
  s.buffer=buf; f.type='highpass'; f.frequency.value=hp; g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0008,t+d);
  s.connect(f).connect(g).connect(ac.destination); s.start(t);
}

/* ---------- recorded files (optional) ---------- */
type Manifest={music?:Record<string,string>,sfx?:Record<string,string>,volume?:{music?:number,sfx?:number}};
let man:Manifest={}, manLoaded=false; const buffers:Record<string,AudioBuffer>={};
const base=()=>(import.meta as any).env.BASE_URL+'assets/audio/';
export async function loadAudioManifest(){
  if(manLoaded) return; manLoaded=true;
  try{ const r=await fetch(base()+'manifest.json'); if(r.ok) man=await r.json(); }catch(e){}
}
async function sample(name:string){ // decode a short effect once, on first use
  const file=man.sfx&&man.sfx[name]; if(!file||!snd.ac) return null;
  if(buffers[name]) return buffers[name];
  try{ const r=await fetch(base()+'sfx/'+file); buffers[name]=await snd.ac.decodeAudioData(await r.arrayBuffer()); return buffers[name]; }catch(e){ return null; }
}
const loading=new Set<string>();
/** play a recorded effect if we have one; returns true if it played (synth fallbacks check this) */
function playSample(name:string,vol=1):boolean{
  if(snd.muted||!snd.ac||!man.sfx||!man.sfx[name]) return false;
  const b=buffers[name];
  if(!b){ if(!loading.has(name)){ loading.add(name); sample(name); } return false; }   // first hit falls back to synth while it loads
  const s=snd.ac.createBufferSource(), g=snd.ac.createGain(); s.buffer=b; g.gain.value=vol*(man.volume?.sfx??.8); s.connect(g).connect(snd.ac.destination); s.start(); return true;
}
const fx=(name:string,synth:()=>void)=>()=>{ if(!playSample(name)) synth(); };

export const sfx={
  cast:fx('cast',()=>tone(620,.16,'triangle',.07,420)),
  hurt:fx('hurt',()=>tone(170,.28,'sawtooth',.16,-110)),
  block:fx('block',()=>tone(900,.16,'triangle',.1,500)),
  strike:fx('strike',()=>tone(1300,.09,'square',.035,-900)),
  toll:fx('toll',()=>{tone(240,.5,'sine',.13);tone(481,.4,'sine',.05)}),
  coin:fx('coin',()=>{tone(988,.07,'square',.04);tone(1319,.14,'square',.04,0,.07)}),
  pick:fx('pick',()=>[523,659,784].forEach((f,i)=>tone(f,.28,'triangle',.08,0,i*.08))),
  win:fx('win',()=>[392,523,659,784,1046].forEach((f,i)=>tone(f,.4,'triangle',.09,0,i*.11))),
  lose:fx('lose',()=>[330,262,196,131].forEach((f,i)=>tone(f,.5,'sine',.12,0,i*.2))),
  rage:fx('rage',()=>tone(90,.7,'sawtooth',.13,70)),
  /* effects added with the spell VFX */
  explosion:fx('explosion',()=>{noise(.45,.12,200);tone(90,.4,'sawtooth',.1,-60)}),
  ice:fx('ice',()=>{tone(1800,.25,'triangle',.04,-900);noise(.25,.05,3000,.03)}),
  lightning:fx('lightning',()=>{noise(.18,.12,1500);tone(220,.3,'sawtooth',.07,-150,.05)}),
  shield:fx('shield',()=>{tone(520,.35,'sine',.07,360);tone(780,.3,'triangle',.04,200,.05)}),
  blink:fx('blink',()=>{tone(900,.18,'sine',.06,-700);noise(.15,.04,2500)}),
  beam:fx('beam',()=>tone(300,.4,'sawtooth',.04,500)),
  chest:fx('chest',()=>{tone(660,.1,'triangle',.06);tone(990,.2,'triangle',.06,0,.08);noise(.2,.03,5000,.05)}),
  mimic:fx('mimic',()=>{tone(110,.3,'sawtooth',.14,-40);tone(80,.35,'square',.07,-20,.08)}),
  shuffle:fx('shuffle',()=>noise(.06,.05,2500)),
  card:fx('card',()=>{noise(.08,.07,1200);tone(300,.08,'triangle',.04,-120)}),
};

/* ---------- music: one looping track at a time, crossfaded ---------- */
export type MusicKey='title'|'hub'|'camp'|'draw'|'shop'|'reward'|'battle'|'elite'|'victory'|'defeat';
let cur:HTMLAudioElement|null=null, curKey:MusicKey|null=null, wanted:MusicKey|null=null, curSeed=0, wantedSeed=0, started=false, wantedEnergy=2, wantedArena='chariot';
const musicVol=()=>(man.volume?.music??.5);
function fade(a:HTMLAudioElement,to:number,ms:number,then?:()=>void){
  const from=a.volume, t0=performance.now();
  const step=()=>{ const k=Math.min(1,(performance.now()-t0)/ms); a.volume=Math.max(0,Math.min(1,from+(to-from)*k)); if(k<1) requestAnimationFrame(step); else then&&then(); };
  step();
}
/** ask for a track; plays once the player has interacted (browsers require it) and the file exists */
export function setMusic(key:MusicKey|null,seed=0,energy=2,arena='chariot'){
  wanted=key; wantedSeed=seed; wantedEnergy=energy; wantedArena=arena; if(key===curKey&&seed===curSeed&&started) return; started=false;
  const file=key&&man.music&&man.music[key];
  const old=cur; curKey=key; curSeed=seed; cur=null;
  if(old) fade(old,0,700,()=>{old.pause();});
  stopScore(700);
  if(!key||!snd.ac||snd.muted) return;
  if(!file){ startScore(snd.ac,key,seed,musicVol()*1.4,undefined,energy,arena); started=true; return; }   // no recorded file: play the generated score
  const a=new Audio(base()+'music/'+file); a.loop=key!=='victory'&&key!=='defeat'; a.volume=0; a.preload='auto';
  a.play().then(()=>fade(a,musicVol(),900)).catch(()=>{});
  cur=a; started=true;
}
function musicWake(){ if(wanted&&!started&&snd.ac&&!snd.muted){ curKey=null; setMusic(wanted,wantedSeed,wantedEnergy,wantedArena); } }
/** live intensity change during a fight (e.g. the boss enrages) */
export function setMusicEnergy(energy:number,frenzy=false){ wantedEnergy=energy; setScoreEnergy(energy,frenzy); }
export function applyMuteToMusic(){ if(snd.muted){ if(cur){cur.pause();} stopScore(200); } else { const k=wanted; curKey=null; cur=null; if(k) setMusic(k,wantedSeed,wantedEnergy,wantedArena); } }
