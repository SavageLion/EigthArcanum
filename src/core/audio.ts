/* Small synth, starts from the first button press. */
export const snd:{ac:AudioContext|null,muted:boolean}={ac:null,muted:false};
try{ snd.muted = localStorage.getItem('ea-mute')==='1'; }catch(e){}
export function wakeAudio(){ try{ snd.ac = snd.ac || new (window.AudioContext||(window as any).webkitAudioContext)(); snd.ac.resume(); }catch(e){} }
export function tone(f,d,type:OscillatorType='sine',v=.1,slide=0,delay=0){
  const ac=snd.ac; if(!ac||snd.muted) return;
  const t=ac.currentTime+delay,o=ac.createOscillator(),g=ac.createGain();
  o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f+slide),t+d);
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0008,t+d);
  o.connect(g).connect(ac.destination);o.start(t);o.stop(t+d);
}
export const sfx={
  cast(){tone(620,.16,'triangle',.07,420)},
  hurt(){tone(170,.28,'sawtooth',.16,-110)},
  block(){tone(900,.16,'triangle',.1,500)},
  strike(){tone(1300,.09,'square',.035,-900)},
  toll(){tone(240,.5,'sine',.13);tone(481,.4,'sine',.05)},
  coin(){tone(988,.07,'square',.04);tone(1319,.14,'square',.04,0,.07)},
  pick(){[523,659,784].forEach((f,i)=>tone(f,.28,'triangle',.08,0,i*.08))},
  win(){[392,523,659,784,1046].forEach((f,i)=>tone(f,.4,'triangle',.09,0,i*.11))},
  lose(){[330,262,196,131].forEach((f,i)=>tone(f,.5,'sine',.12,0,i*.2))},
  rage(){tone(90,.7,'sawtooth',.13,70)}
};
