// @ts-nocheck
import { loadAudioManifest } from './core/audio';
import './style.css';
import '@fontsource/pixelify-sans/500.css';
import '@fontsource/pixelify-sans/700.css';
import '@fontsource/vt323/400.css';
import { G, S } from './core/state';
import { KEYS } from './core/input';
import { resize } from './core/size';
import { draw, drawTitle } from './render/draw';
import { loadSprites } from './render/sprites';
import { enterHub, hubStep } from './systems/hub';
import { huntStep } from './hunt/hunt';
import { deckStep, enterDeck } from './deck/deck';
import { readingStep, enterReading } from './reading/reading';
import { showTitle } from './village/title';
import * as _score from './core/score';
import * as _meta from './data/meta';
import { RARITY } from './data/rarity';
import { GEAR } from './data/gear';

/* The Eighth Arcanum: a title screen, the Sanctum village (systems/hub.ts) and the Hunt (hunt/hunt.ts). */
function frame(now){
  const dt=Math.min(.033,(now-G.last)/1000||0); G.last=now;
  if(S.mode==='title'){ S.t+=dt; drawTitle(); }
  else if(S.mode==='hunt'){ huntStep(dt); }
  else if(S.mode==='deck'){ deckStep(dt); }
  else if(S.mode==='reading'){ readingStep(dt); }
  else { S.t+=dt; if(S.mode==='hub')hubStep(dt); draw(); }
  requestAnimationFrame(frame);
}
function start(){
  resize();
  if(/[?&]deck/.test(location.search)){ enterHub(); enterDeck({exit:enterHub}); }
  else if(/[?&]reading/.test(location.search)){ enterHub(); enterReading({exit:enterHub}); }
  else showTitle(enterHub);
  requestAnimationFrame(t=>{G.last=t;frame(t)});
}
window.__arcana={G,S,KEYS,meta:_meta,score:_score,RARITY,GEAR,enterHub};
Promise.all([loadSprites(),loadAudioManifest()]).finally(()=>{ start(); });
