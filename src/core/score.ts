/* Generative score: a small procedural synth band (pad, bass, arpeggio, drums, lead) that needs no audio files.
   Each scene has its own tempo, scale and chord loop. The same code runs live (scheduler) or offline (renderScore, used by tests). */
type Scene={bpm:number,root:number,scale:number[],prog:number[],drums:0|1|2|3,bass:'none'|'walk'|'pulse',arp:0|1|2|3,lead:0|1|2,once?:number};
const MIN=[0,2,3,5,7,8,10], PHR=[0,1,3,5,7,8,10], MAJ=[0,2,4,5,7,9,11];
export const SCENES:Record<string,Scene>={
  title:  {bpm:62, root:50,scale:MIN,prog:[0,5,3,4],drums:0,bass:'none', arp:1,lead:1},
  draw:   {bpm:84, root:52,scale:MIN,prog:[0,3,5,2],drums:0,bass:'walk', arp:2,lead:0},
  battle: {bpm:132,root:45,scale:MIN,prog:[0,0,5,4],drums:2,bass:'pulse',arp:2,lead:1},
  elite:  {bpm:148,root:43,scale:PHR,prog:[0,1,0,4],drums:3,bass:'pulse',arp:3,lead:1},
  victory:{bpm:108,root:57,scale:MAJ,prog:[0,4,5,0],drums:1,bass:'walk', arp:2,lead:2,once:11},
  defeat: {bpm:54, root:45,scale:MIN,prog:[0,5,3,0],drums:0,bass:'none', arp:0,lead:1,once:13},
};
const SHIFT=[0,3,5,-2,7,2,-5,4];       // per-boss transposition, so every fight has its own key
const hz=(m:number)=>440*Math.pow(2,(m-69)/12);
const note=(sc:number[],root:number,d:number)=>root+sc[((d%7)+7)%7]+12*Math.floor(d/7);
const rngOf=(a:number)=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};

let noiseBuf:AudioBuffer|null=null;
const noiseOf=(ac:BaseAudioContext)=>{ if(!noiseBuf||noiseBuf.sampleRate!==ac.sampleRate){ noiseBuf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; } return noiseBuf; };

/* ---- instruments (each builds a few nodes, plays at time t, and cleans itself up) ---- */
function env(ac:BaseAudioContext,out:AudioNode,t:number,a:number,peak:number,rel:number){ const g=ac.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+a+rel); g.connect(out); return g; }
function osc(ac:BaseAudioContext,type:OscillatorType,f:number,t:number,dur:number,dest:AudioNode,detune=0){ const o=ac.createOscillator(); o.type=type; o.frequency.value=f; o.detune.value=detune; o.connect(dest); o.start(t); o.stop(t+dur); }
function pad(ac,out,t,midi:number[],dur){ for(const m of midi){ const lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=900; const g=env(ac,out,t,.7,.05,dur); lp.connect(g); osc(ac,'sawtooth',hz(m),t,dur+.8,lp,-7); osc(ac,'sawtooth',hz(m),t,dur+.8,lp,7); } }
function bass(ac,out,t,m,len,v){ const lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.setValueAtTime(700,t); lp.frequency.exponentialRampToValueAtTime(180,t+len); const g=env(ac,out,t,.005,v,len); lp.connect(g); osc(ac,'sawtooth',hz(m),t,len+.05,lp); osc(ac,'square',hz(m-12),t,len+.05,lp); }
function pluck(ac,out,t,m,len,v,type:OscillatorType='triangle'){ const g=env(ac,out,t,.004,v,len); osc(ac,type,hz(m),t,len+.05,g); }
function bell(ac,out,t,m,v){ const g=env(ac,out,t,.01,v,1.6); osc(ac,'sine',hz(m),t,1.7,g); osc(ac,'sine',hz(m)*2.01,t,1.7,g); }
function kick(ac,out,t,v=.5){ const o=ac.createOscillator(), g=ac.createGain(); o.frequency.setValueAtTime(160,t); o.frequency.exponentialRampToValueAtTime(42,t+.13); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+.2); o.connect(g).connect(out); o.start(t); o.stop(t+.22); }
function hit(ac,out,t,dur,hp,v){ const s=ac.createBufferSource(); s.buffer=noiseOf(ac); const f=ac.createBiquadFilter(); f.type='highpass'; f.frequency.value=hp; const g=ac.createGain(); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+dur); s.connect(f).connect(g).connect(out); s.start(t,Math.random()*.5); s.stop(t+dur+.02); }

/* ---- one 16th-note step of a scene ---- */
function step(ac:BaseAudioContext,out:AudioNode,sc:Scene,shift:number,rng:()=>number,st:{lead:number},n:number,t:number){
  const spb=60/sc.bpm/4, s=n%16, bar=Math.floor(n/16), root=sc.root+shift, d=sc.prog[bar%sc.prog.length];
  const chord=[0,2,4].map(i=>note(sc.scale,root,d+i)), low=note(sc.scale,root,d)-12;
  if(s===0) pad(ac,out,t,[chord[0],chord[1],chord[2],chord[0]+12],spb*16);
  if(sc.bass==='pulse'&&s%2===0) bass(ac,out,t,low+(s%8===6?7:0),spb*1.6,s%8===0?.16:.1);
  if(sc.bass==='walk'&&s%4===0) bass(ac,out,t,s%8===0?low:low+7,spb*3.4,.12);
  if(sc.drums>=1){ if(s===0||(sc.drums>=2&&(s===8||(sc.drums>=3&&(s===6||s===11))))||(sc.drums===1&&s===8)) kick(ac,out,t,.45);
    if(sc.drums>=2&&(s===4||s===12)) { hit(ac,out,t,.16,1600,.14); }
    if(sc.drums>=1&&(sc.drums>=3?true:s%2===0)) hit(ac,out,t,.04,7500,sc.drums>=2?.05:.03); }
  const ap=[chord[0],chord[1],chord[2],chord[0]+12,chord[1]+12,chord[2]+12,chord[1]+12,chord[0]+12];
  if(sc.arp===1&&s%4===0) pluck(ac,out,t,ap[(s/4)%8]+12,.5,.03,'sine');
  if(sc.arp===2&&s%2===0) pluck(ac,out,t,ap[(s/2)%8]+12,.18,.035,'square');
  if(sc.arp===3) pluck(ac,out,t,ap[s%8]+12,.12,.03,'square');
  if(sc.lead&&(s===0||s===8||(sc.lead===2&&(s===4||s===12)))&&rng()<(sc.lead===2?.9:.55)){      // melody: random walk on the scale
    st.lead=Math.max(0,Math.min(9,st.lead+Math.round((rng()-.5)*4))); const m=note(sc.scale,root,st.lead+7+d%2);
    if(sc.bpm<70) bell(ac,out,t,m+12,.07); else pluck(ac,out,t,m+12,spb*5,.05,'triangle');
  }
}

/* ---- live playback ---- */
let live:{timer:number,bus:GainNode,ac:AudioContext}|null=null;
export function stopScore(fadeMs=700){
  if(!live) return; const {timer,bus,ac}=live; live=null; clearInterval(timer);
  const t=ac.currentTime; bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value,t); bus.gain.linearRampToValueAtTime(0,t+fadeMs/1000);
  setTimeout(()=>{ try{bus.disconnect();}catch(e){} },fadeMs+200);
}
export function startScore(ac:AudioContext,key:string,seed=0,vol=.8,onEnd?:()=>void){
  const sc=SCENES[key]; if(!sc) return; stopScore(500);
  const comp=ac.createDynamicsCompressor(), bus=ac.createGain(); bus.gain.setValueAtTime(0,ac.currentTime); bus.gain.linearRampToValueAtTime(vol,ac.currentTime+1); bus.connect(comp).connect(ac.destination);
  const shift=SHIFT[seed%8], rng=rngOf(seed*7919+key.length), st={lead:3}, spb=60/sc.bpm/4;
  let next=ac.currentTime+.1, n=0; const t0=next, endAt=sc.once?t0+sc.once:Infinity;
  const timer=window.setInterval(()=>{
    while(next<ac.currentTime+.25){
      if(next>=endAt){ stopScore(1500); onEnd&&onEnd(); return; }
      step(ac,bus,sc,shift,rng,st,n,next); next+=spb; n++;
    }
  },40);
  live={timer,bus,ac};
}

/* ---- offline rendering (tests, previews): schedules `seconds` of a scene on any audio context ---- */
export function renderScore(ac:BaseAudioContext,key:string,seed=0,seconds=16){
  const sc=SCENES[key], comp=ac.createDynamicsCompressor(), bus=ac.createGain(); bus.gain.value=.7; bus.connect(comp).connect(ac.destination);
  const shift=SHIFT[seed%8], rng=rngOf(seed*7919+key.length), st={lead:3}, spb=60/sc.bpm/4;
  for(let n=0;n*spb<seconds;n++) step(ac,bus,sc,shift,rng,st,n,.05+n*spb);
}
