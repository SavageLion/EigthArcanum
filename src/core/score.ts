/* Generative score: a small procedural band (pad, bass, arpeggio, drums, lead + signature sounds) that needs no audio files.
   Every boss has its own THEME (mode, tempo, time feel, drum pattern, bass style, arpeggio shape, signature sound).
   A fight's ENERGY (0-3) layers the band in as the run goes on, and a boss's enrage adds a frenzy on top.
   The same code runs live (scheduler) or offline (renderScore, used by tests and previews). */
type Bass='none'|'pulse'|'walk'|'sixteenth'|'tolling'|'drone'|'creep'|'waltz'|'march';
type Shape='up'|'updown'|'mirror'|'rand'|'broken';
interface Theme{
  bpm:number; root:number; scale:number[]; bar?:12|16;               // 16th-note steps per bar (12 = waltz / 6-8 feel)
  progs:number[][];                                                  // chord-degree loops; one is chosen per 4-bar phrase
  drums:string;                                                      // drum pattern id (see DRUMS)
  bass:Bass; arp:{rate:1|2|4;shape:Shape;wave:OscillatorType;oct:number}|null;
  lead:{density:number;wave:OscillatorType;echo?:boolean}|null;
  pad:{wave:OscillatorType;lp:number;vol:number}|null;
  fx?:Array<'bells'|'thunder'|'bubbles'|'stabs'|'ticks'|'dist'|'sevenths'|'choir'|'wobble'>;
  once?:number;                                                      // seconds, for stingers
}
const MIN=[0,2,3,5,7,8,10], DOR=[0,2,3,5,7,9,10], PHR=[0,1,3,5,7,8,10], PHD=[0,1,4,5,7,8,10], HMIN=[0,2,3,5,7,8,11],
      LYD=[0,2,4,6,7,9,11], MIX=[0,2,4,5,7,9,10], MAJ=[0,2,4,5,7,9,11], LOC=[0,1,3,5,6,8,10], WHOLE=[0,2,4,6,8,10,11];

/* drum patterns: one char per 16th step. k=kick s=snare h=hat o=open hat r=rim t=tom .=rest */
const DRUMS:Record<string,{k:string;s:string;h:string;t?:string}>={
  none:  {k:'................',s:'................',h:'................'},
  soft:  {k:'x.......x.......',s:'................',h:'..x...x...x...x.'},
  rock:  {k:'x.....x.x.......',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.'},
  four:  {k:'x...x...x...x...',s:'....x.......x...',h:'..x...x...x...x.'},
  double:{k:'x.x.x.x.x.x.x.x.',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.'},
  march: {k:'x.......x.......',s:'..x...x...x...x.',h:'................'},
  tick:  {k:'x.......x.......',s:'................',h:'xxxxxxxxxxxxxxxx'},
  tom:   {k:'x.......x...x...',s:'................',h:'..x...x...x...x.',t:'..x.x...x.x...x.'},
  storm: {k:'x..x..x.x..x..x.',s:'....x.......x.xx',h:'x.x.x.x.x.x.x.x.'},
  heart: {k:'x.........x.....',s:'................',h:'................'},
  waltz: {k:'x...........',s:'....x...x...',h:'..x...x...x.'},
  swell: {k:'x...........',s:'............',h:'..x.....x...'},
};
export const THEMES:Record<string,Theme>={
  /* ---- non-boss screens ---- */
  title:  {bpm:62,root:50,scale:MIN,progs:[[0,5,3,4],[0,3,5,4]],drums:'none',bass:'none',arp:{rate:4,shape:'up',wave:'sine',oct:1},lead:{density:.55,wave:'sine'},pad:{wave:'sawtooth',lp:900,vol:.05},fx:['bells']},
  draw:   {bpm:84,root:52,scale:MIN,progs:[[0,3,5,2],[0,5,3,2]],drums:'none',bass:'walk',arp:{rate:2,shape:'updown',wave:'square',oct:1},lead:null,pad:{wave:'sawtooth',lp:900,vol:.05}},
  shop:   {bpm:100,root:55,scale:MIX,progs:[[0,3,4,3],[0,4,3,0]],drums:'soft',bass:'walk',arp:{rate:2,shape:'broken',wave:'triangle',oct:1},lead:{density:.6,wave:'triangle'},pad:{wave:'triangle',lp:1400,vol:.06}},
  reward: {bpm:92,root:57,scale:LYD,progs:[[0,4,1,4],[0,2,4,1]],drums:'none',bass:'walk',arp:{rate:4,shape:'updown',wave:'sine',oct:2},lead:{density:.7,wave:'triangle'},pad:{wave:'triangle',lp:1500,vol:.055},fx:['bells']},
  victory:{bpm:108,root:57,scale:MAJ,progs:[[0,4,5,0]],drums:'soft',bass:'walk',arp:{rate:2,shape:'up',wave:'square',oct:1},lead:{density:.95,wave:'triangle'},pad:{wave:'sawtooth',lp:1300,vol:.05},fx:['stabs'],once:11},
  defeat: {bpm:54,root:45,scale:MIN,progs:[[0,5,3,0]],drums:'none',bass:'none',arp:null,lead:{density:.6,wave:'sine'},pad:{wave:'sawtooth',lp:700,vol:.05},once:13},
  /* ---- the 16 bosses (index = BOSSES order) ---- */
  b0: {bpm:138,root:45,scale:PHD,progs:[[0,0,5,4],[0,1,0,4]],drums:'rock',bass:'pulse',arp:{rate:2,shape:'up',wave:'square',oct:1},lead:{density:.7,wave:'sawtooth'},pad:{wave:'sawtooth',lp:1100,vol:.045}},                       // Cinder King: fiery, driving
  b1: {bpm:118,root:52,scale:LYD,progs:[[0,4,1,5],[0,2,4,1]],drums:'soft',bass:'walk',arp:{rate:1,shape:'updown',wave:'sine',oct:2},lead:{density:.5,wave:'sine'},pad:{wave:'triangle',lp:2000,vol:.05},fx:['bells']},   // Frost Matron: glassy, icy 16ths
  b2: {bpm:80,root:43,scale:MIN,progs:[[0,0,5,3],[0,5,0,4]],drums:'heart',bass:'tolling',arp:{rate:4,shape:'up',wave:'sine',oct:1},lead:{density:.4,wave:'sine'},pad:{wave:'sawtooth',lp:600,vol:.06},fx:['bells']},          // Hollow Bell: tolling, sparse
  b3: {bpm:152,root:47,scale:HMIN,progs:[[0,5,3,4],[0,3,4,0]],drums:'storm',bass:'sixteenth',arp:{rate:1,shape:'rand',wave:'sawtooth',oct:1},lead:{density:.6,wave:'sawtooth'},pad:{wave:'sawtooth',lp:800,vol:.04},fx:['thunder']}, // Storm Eye: frantic
  b4: {bpm:96,root:50,scale:DOR,bar:12,progs:[[0,4,3,4],[0,3,1,4]],drums:'waltz',bass:'waltz',arp:{rate:2,shape:'broken',wave:'triangle',oct:1},lead:{density:.7,wave:'triangle'},pad:{wave:'triangle',lp:1500,vol:.055}}, // Mother of Thorns: a twisted waltz
  b5: {bpm:112,root:41,scale:LOC,progs:[[0,1,0,4],[0,0,5,1]],drums:'march',bass:'march',arp:null,lead:{density:.5,wave:'square'},pad:{wave:'sawtooth',lp:700,vol:.06},fx:['stabs']},                                          // Bone Tyrant: a death march
  b6: {bpm:104,root:49,scale:WHOLE,progs:[[0,2,4,2],[0,3,0,4]],drums:'rock',bass:'walk',arp:{rate:2,shape:'mirror',wave:'triangle',oct:2},lead:{density:.7,wave:'sine',echo:true},pad:{wave:'sine',lp:1800,vol:.06}}, // Mirror Witch: reflected arpeggios
  b7: {bpm:66,root:38,scale:LOC,progs:[[0,1,0,6],[0,6,1,0]],drums:'heart',bass:'drone',arp:{rate:4,shape:'rand',wave:'sine',oct:2},lead:{density:.35,wave:'sine'},pad:{wave:'sawtooth',lp:500,vol:.075},fx:['choir','bells']},   // Void Sovereign: vast, dissonant
  b8: {bpm:72,root:47,scale:MIN,bar:12,progs:[[0,5,3,4],[0,3,5,2]],drums:'swell',bass:'drone',arp:{rate:2,shape:'updown',wave:'sine',oct:2},lead:{density:.5,wave:'sine'},pad:{wave:'sine',lp:1600,vol:.07},fx:['bubbles']},               // Drowned Queen: slow tide in 6/8
  b9: {bpm:124,root:48,scale:MIX,progs:[[0,3,0,4],[0,4,3,4]],drums:'tick',bass:'pulse',arp:{rate:2,shape:'up',wave:'square',oct:1},lead:{density:.55,wave:'square'},pad:{wave:'sawtooth',lp:1000,vol:.04},fx:['ticks']}, // Clockwork Judge: mechanical
  b10:{bpm:146,root:46,scale:HMIN,progs:[[0,0,3,0],[0,3,4,0]],drums:'double',bass:'pulse',arp:{rate:1,shape:'updown',wave:'sawtooth',oct:1},lead:{density:.6,wave:'sawtooth'},pad:{wave:'sawtooth',lp:900,vol:.04},fx:['wobble']}, // Hive Mother: buzzing swarm
  b11:{bpm:116,root:44,scale:HMIN,progs:[[0,5,0,4],[0,3,5,4]],drums:'rock',bass:'creep',arp:{rate:4,shape:'broken',wave:'square',oct:1},lead:{density:.45,wave:'triangle'},pad:{wave:'sawtooth',lp:700,vol:.05},fx:['sevenths']}, // Ash Widow: creeping, jazzy menace
  b12:{bpm:92,root:50,scale:PHD,progs:[[0,1,0,4],[0,4,1,0]],drums:'tom',bass:'walk',arp:{rate:2,shape:'broken',wave:'triangle',oct:1},lead:{density:.8,wave:'triangle',echo:true},pad:{wave:'triangle',lp:1200,vol:.05}}, // Sand Prophet: desert hand-drums
  b13:{bpm:126,root:43,scale:DOR,progs:[[0,3,4,0],[0,4,3,4]],drums:'four',bass:'pulse',arp:{rate:2,shape:'up',wave:'square',oct:1},lead:{density:.7,wave:'sawtooth'},pad:{wave:'sawtooth',lp:1500,vol:.055},fx:['stabs']}, // Emperor: regal, four on the floor
  b14:{bpm:76,root:54,scale:LYD,progs:[[0,4,1,5],[0,2,5,4]],drums:'none',bass:'drone',arp:{rate:1,shape:'updown',wave:'sine',oct:2},lead:{density:.55,wave:'sine'},pad:{wave:'triangle',lp:2200,vol:.065},fx:['choir','bells']}, // High Priestess: harp and choir
  b15:{bpm:162,root:40,scale:PHD,progs:[[0,1,0,4],[0,0,1,5]],drums:'double',bass:'sixteenth',arp:{rate:2,shape:'up',wave:'sawtooth',oct:1},lead:{density:.7,wave:'sawtooth'},pad:{wave:'sawtooth',lp:1000,vol:.05},fx:['dist','stabs']}, // Devil: relentless double-kick
};
/** which theme a request maps to: bosses by index (runs past 16 bosses reuse the themes in a new key) */
export function themeKeyFor(key:string,seed:number){ return key==='battle'||key==='elite'?'b'+(seed%16):key; }
const SHIFT=[0,3,5,-2,7,2,-5,4];
export const SCENES=THEMES;   // kept for older callers

const hz=(m:number)=>440*Math.pow(2,(m-69)/12);
const note=(sc:number[],root:number,d:number)=>root+sc[((d%7)+7)%7]+12*Math.floor(d/7);
const rngOf=(a:number)=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
let noiseBuf:AudioBuffer|null=null;
const noiseOf=(ac:BaseAudioContext)=>{ if(!noiseBuf||noiseBuf.sampleRate!==ac.sampleRate){ noiseBuf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; } return noiseBuf; };

/* ---- instruments (each builds a few nodes, plays at time t, and cleans itself up) ---- */
function env(ac:BaseAudioContext,out:AudioNode,t:number,a:number,peak:number,rel:number){ const g=ac.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+a+rel); g.connect(out); return g; }
function osc(ac:BaseAudioContext,type:OscillatorType,f:number,t:number,dur:number,dest:AudioNode,detune=0){ const o=ac.createOscillator(); o.type=type; o.frequency.value=f; o.detune.value=detune; o.connect(dest); o.start(t); o.stop(t+dur); return o; }
function pad(ac:BaseAudioContext,out:AudioNode,t:number,midi:number[],dur:number,wave:OscillatorType,lp:number,vol:number){ for(const m of midi){ const f=ac.createBiquadFilter(); f.type='lowpass'; f.frequency.value=lp; const g=env(ac,out,t,.8,vol,dur); f.connect(g); osc(ac,wave,hz(m),t,dur+.9,f,-7); osc(ac,wave,hz(m),t,dur+.9,f,7); } }
function bassNote(ac:BaseAudioContext,out:AudioNode,t:number,m:number,len:number,v:number,dist=false){
  const lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=dist?4:.7; lp.frequency.setValueAtTime(dist?1800:700,t); lp.frequency.exponentialRampToValueAtTime(dist?260:180,t+len);
  const g=env(ac,out,t,.005,dist?v*.8:v,len); lp.connect(g);
  osc(ac,'sawtooth',hz(m),t,len+.05,lp); osc(ac,'square',hz(m-12),t,len+.05,lp);
  if(dist) osc(ac,'sawtooth',hz(m),t,len+.05,lp,18);        // detuned third voice for grit
}
function pluck(ac:BaseAudioContext,out:AudioNode,t:number,m:number,len:number,v:number,type:OscillatorType='triangle',slide=0){ const g=env(ac,out,t,.004,v,len); const o=osc(ac,type,hz(m),t,len+.05,g); if(slide){ o.frequency.setValueAtTime(hz(m),t); o.frequency.exponentialRampToValueAtTime(Math.max(30,hz(m+slide)),t+len); } }
function bell(ac:BaseAudioContext,out:AudioNode,t:number,m:number,v:number,len=1.6){ const g=env(ac,out,t,.01,v,len); osc(ac,'sine',hz(m),t,len+.1,g); osc(ac,'sine',hz(m)*2.01,t,len+.1,g); osc(ac,'sine',hz(m)*3.02,t,len*.6,g); }
function kick(ac:BaseAudioContext,out:AudioNode,t:number,v=.5){ const o=ac.createOscillator(), g=ac.createGain(); o.frequency.setValueAtTime(160,t); o.frequency.exponentialRampToValueAtTime(42,t+.13); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+.2); o.connect(g).connect(out); o.start(t); o.stop(t+.22); }
function hit(ac:BaseAudioContext,out:AudioNode,t:number,dur:number,hp:number,v:number){ const s=ac.createBufferSource(); s.buffer=noiseOf(ac); const f=ac.createBiquadFilter(); f.type='highpass'; f.frequency.value=hp; const g=ac.createGain(); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+dur); s.connect(f).connect(g).connect(out); s.start(t,Math.random()*.5); s.stop(t+dur+.02); }
function tom(ac:BaseAudioContext,out:AudioNode,t:number,f=110,v=.3){ const o=ac.createOscillator(), g=ac.createGain(); o.frequency.setValueAtTime(f*1.6,t); o.frequency.exponentialRampToValueAtTime(f,t+.09); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+.22); o.connect(g).connect(out); o.start(t); o.stop(t+.25); }
function stab(ac:BaseAudioContext,out:AudioNode,t:number,midi:number[],len:number,v:number){ for(const m of midi){ const f=ac.createBiquadFilter(); f.type='lowpass'; f.frequency.setValueAtTime(2600,t); f.frequency.exponentialRampToValueAtTime(500,t+len); const g=env(ac,out,t,.01,v,len); f.connect(g); osc(ac,'sawtooth',hz(m),t,len+.05,f,-5); osc(ac,'sawtooth',hz(m),t,len+.05,f,5); } }

interface Live{energy:number;frenzy:boolean;tempo:number}
/* ---- one 16th-note step ---- */
function step(ac:BaseAudioContext,out:AudioNode,th:Theme,shift:number,rng:()=>number,motif:number[][],n:number,t:number,lv:Live,spb:number){
  const bar=th.bar||16, s=n%bar, b=Math.floor(n/bar), phrase=Math.floor(b/4), bi=b%4, E=Math.min(3,lv.energy), fz=lv.frenzy;
  const prog=th.progs[phrase%th.progs.length], d=prog[bi%prog.length], root=th.root+shift, sc=th.scale;
  const sec=phrase%4, breakdown=sec===2&&!fz;                       // every 3rd phrase drops the drums for a breather
  const tri=[0,2,4].map(i=>note(sc,root,d+i)); if(th.fx?.includes('sevenths')) tri.push(note(sc,root,d+6));
  const low=note(sc,root,d)-12, fifth=low+7, per=bar===12?12:16, half=bar===12?6:8, qtr=bar===12?3:4;
  const fxOn=(x:string)=>th.fx?.includes(x as any);
  // pad (and choir shimmer)
  if(th.pad&&s===0) pad(ac,out,t,[tri[0],tri[1],tri[2],tri[0]+12],spb*bar,th.pad.wave,th.pad.lp,th.pad.vol*(E===0?1.15:1));
  if(fxOn('choir')&&s===0) pad(ac,out,t,[tri[0]+12,tri[2]+12],spb*bar,'sine',2400,.03);
  // bass (always on)
  switch(th.bass){
    case 'pulse': if(s%2===0) bassNote(ac,out,t,low+(s%half===half-2?7:0),spb*1.6,s%half===0?.16:.1); break;
    case 'walk': if(s%qtr===0) bassNote(ac,out,t,s%half===0?low:fifth,spb*qtr*.85,.12); break;
    case 'sixteenth': bassNote(ac,out,t,low+(s%4===3?12:0)+(s%8===6?7:0),spb*.9,s%4===0?.15:.09,fxOn('dist')||th.drums==='storm'); break;
    case 'tolling': if(s===0){ bassNote(ac,out,t,low,spb*8,.2); bell(ac,out,t,low+24,.1,2.4); } break;
    case 'drone': if(s===0){ const g=env(ac,out,t,1.2,.13,spb*bar); osc(ac,'sine',hz(low),t,spb*bar+1.3,g); osc(ac,'sine',hz(fifth),t,spb*bar+1.3,g); } break;
    case 'creep': if(s%qtr===0){ const stepIx=[0,1,2,1][(s/qtr)%4]; bassNote(ac,out,t,note(sc,root,d+stepIx)-12,spb*qtr*.8,.12); } break;
    case 'waltz': if(s===0) bassNote(ac,out,t,low,spb*4,.15); if(s===4||s===8) stab(ac,out,t,[tri[0],tri[1],tri[2]],spb*3,.018); break;
    case 'march': if(s%8===0) bassNote(ac,out,t,low,spb*4,.17); if(s%8===4) bassNote(ac,out,t,fifth,spb*3,.12); break;
  }
  // drums (from energy 2 up; frenzy adds hats)
  if(E>=2&&!breakdown){ const D=DRUMS[th.drums]||DRUMS.none, c=(p:string)=>p[s%p.length];
    if(c(D.k)==='x') kick(ac,out,t,.45);
    if(c(D.s)==='x') hit(ac,out,t,.15,1600,.13);
    if(c(D.h)==='x') hit(ac,out,t,.04,7500,E>=3?.05:.035);
    if(D.t&&c(D.t)==='x') tom(ac,out,t,95+((n>>2)%3)*22,.3);
    if(fz&&s%2===1) hit(ac,out,t,.03,9000,.03); }
  else if(E===1&&!breakdown&&th.drums!=='none'&&s===0) kick(ac,out,t,.3);                  // a lone heartbeat at energy 1
  // arpeggio (from energy 1)
  if(th.arp&&E>=1){ const A=th.arp, every=A.rate===1?1:A.rate===2?2:4*(bar===12?1:1), k=Math.floor(s/every);
    if(s%every===0){ const seq=A.shape==='up'?[0,1,2,3,4,5,6,7]:A.shape==='updown'?[0,1,2,3,4,3,2,1]:A.shape==='mirror'?[0,1,2,3,3,2,1,0]:A.shape==='broken'?[0,2,1,3,2,4,3,5]:null;
      const full=[tri[0],tri[1],tri[2],tri[0]+12,tri[1]+12,tri[2]+12,tri[0]+24,tri[1]+24];
      const m=(seq?full[seq[k%8]%full.length]:full[Math.floor(rng()*6)])+12*(A.oct-1);
      const v=(fxOn('wobble')?.026:.03)*(breakdown?1.2:1);
      pluck(ac,out,t,m,A.rate===1?.1:A.rate===2?.17:.45,v,A.wave);
      if(fxOn('wobble')) pluck(ac,out,t,m+.2,.1,.02,A.wave);
      if(th.lead?.echo&&A.shape==='mirror') pluck(ac,out,t+spb*3,m,.15,.012,A.wave); } }
  // lead (from energy 3, or always at the quiet end of the band)
  if(th.lead&&(E>=3||E===0||th.drums==='none')&&!breakdown){ const pos=motif[bi%motif.length], idx=[0,4,6,8,12,10,2,14].indexOf(s);
    if(idx>=0&&pos[idx]!==undefined&&pos[idx]>=0){ const m=note(sc,root,pos[idx]+7+d%2)+12, len=spb*(th.lead.wave==='sine'?6:4);
      if(th.bass==='drone'||th.lead.wave==='sine') bell(ac,out,t,m,.06,1.5); else pluck(ac,out,t,m,len,.05,th.lead.wave);
      if(th.lead.echo) pluck(ac,out,t+spb*3,m,len,.025,th.lead.wave); } }
  // signature sounds
  if(fxOn('bells')&&s===0&&(bi===0||bi===2)) bell(ac,out,t,tri[2]+24,.05,2.4);
  if(fxOn('stabs')&&E>=2&&(s===0||s===8)&&!breakdown) stab(ac,out,t,[tri[0],tri[1],tri[2]],spb*3,.035);
  if(fxOn('ticks')&&E>=1&&s%4===2) hit(ac,out,t,.02,6000,.045);
  if(fxOn('thunder')&&s===0&&rng()<(E>=2?.45:.2)){ hit(ac,out,t,.9,120,.12); kick(ac,out,t,.3); }
  if(fxOn('bubbles')&&s%3===0&&rng()<.35) pluck(ac,out,t,tri[Math.floor(rng()*3)]+36,.22,.025,'sine',7);
}
/** a 4-bar melody (scale degrees per slot, -1 = rest) that repeats every phrase, so themes feel composed, not random */
function makeMotif(th:Theme,seed:number){ const r=rngOf(seed*31+th.bpm), out:number[][]=[]; let cur=2+Math.floor(r()*3);
  for(let b=0;b<4;b++){ const bar:number[]=[]; for(let i=0;i<8;i++){ if(r()<(th.lead?.density||.5)*(i%2===0?1:.55)){ cur=Math.max(-2,Math.min(8,cur+Math.round((r()-.5)*4))); bar.push(cur); } else bar.push(-1); } out.push(bar); }
  out[3][7]=-1; out[3][0]=out[0][0]>=0?out[0][0]:cur; return out; }

/* ---- live playback ---- */
let live:{timer:number,bus:GainNode,ac:AudioContext,lv:Live}|null=null;
export const scoreRunning=()=>!!live;
export function setScoreEnergy(energy:number,frenzy=false){ if(live){ live.lv.energy=energy; live.lv.frenzy=frenzy; } }
export function stopScore(fadeMs=700){
  if(!live) return; const {timer,bus,ac}=live; live=null; clearInterval(timer);
  const t=ac.currentTime; bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value,t); bus.gain.linearRampToValueAtTime(0,t+fadeMs/1000);
  setTimeout(()=>{ try{bus.disconnect();}catch(e){} },fadeMs+200);
}
const TEMPO:Record<string,number>={chariot:1,wheel:.97,justice:.9,strength:1.05};
export function startScore(ac:AudioContext,key:string,seed=0,vol=.8,onEnd?:()=>void,energy=2,arena='chariot'){
  const tk=themeKeyFor(key,seed), th=THEMES[tk]; if(!th) return; stopScore(500);
  const comp=ac.createDynamicsCompressor(), bus=ac.createGain(); bus.gain.setValueAtTime(0,ac.currentTime); bus.gain.linearRampToValueAtTime(vol,ac.currentTime+1); bus.connect(comp).connect(ac.destination);
  const isBoss=tk[0]==='b'&&tk!=='b', lv:Live={energy:key==='elite'?Math.min(3,energy+1):energy,frenzy:false,tempo:1};
  const shift=(isBoss?SHIFT[Math.floor(seed/16)%8]:SHIFT[seed%8]), rng=rngOf(seed*7919+tk.length), motif=makeMotif(th,seed);
  const bpm=th.bpm*(isBoss?(TEMPO[arena]||1)*(key==='elite'?1.04:1):1), spb=60/bpm/4;
  let next=ac.currentTime+.1, n=0; const t0=next, endAt=th.once?t0+th.once:Infinity;
  const timer=window.setInterval(()=>{
    while(next<ac.currentTime+.25){
      if(next>=endAt){ stopScore(1500); onEnd&&onEnd(); return; }
      step(ac,bus,th,shift,rng,motif,n,next,lv,spb*(lv.frenzy?.94:1)); next+=spb*(lv.frenzy?.94:1); n++;
    }
  },40);
  live={timer,bus,ac,lv};
}

/* ---- offline rendering (tests, previews): schedules `seconds` of a theme on any audio context ---- */
export function renderScore(ac:BaseAudioContext,key:string,seed=0,seconds=16,energy=3,frenzy=false){
  const tk=themeKeyFor(key,seed), th=THEMES[tk], comp=ac.createDynamicsCompressor(), bus=ac.createGain(); bus.gain.value=.7; bus.connect(comp).connect(ac.destination);
  const isBoss=tk[0]==='b'&&tk!=='b', shift=(isBoss?SHIFT[Math.floor(seed/16)%8]:SHIFT[seed%8]), rng=rngOf(seed*7919+tk.length), motif=makeMotif(th,seed), spb=60/th.bpm/4;
  const lv:Live={energy,frenzy,tempo:1};
  for(let n=0;n*spb<seconds;n++) step(ac,bus,th,shift,rng,motif,n,.05+n*spb,lv,spb);
}
