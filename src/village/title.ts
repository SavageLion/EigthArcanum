// @ts-nocheck
import { muteBtn } from '../core/dom';
import { S } from '../core/state';
import { setMusic } from '../core/audio';
import { heroHTML, show } from '../ui/overlay';
import { meta } from '../data/meta';
import { BOSSES } from '../data/bossList';
import { $ } from '../core/util';

/** the title screen: one button, into the Sanctum */
export function showTitle(enterHub){
  setMusic('title'); S.mode='title'; muteBtn.hidden=true;
  const cards=Object.keys((meta.hunt&&meta.hunt.cards)||{}).length;
  show(`${heroHTML('idle')}<div class="eyebrow">A tarot-boss hunting roguelike</div><h1>The Eighth Arcanum</h1>
    <p>Hunt the sixty-four arcana. Explore a haunted realm room by room, take three keys from their guardians, break the seal and claim the boss's card. Every card you win changes how the next hunt begins.</p>
    <details class="how"><summary>How it plays</summary><p class="muted">Play on your phone held sideways. Drag anywhere to move; your spells cast themselves. Between rooms, choose which door to take. Win cards, equip them in the Sanctum, and shape your own build with spell modifiers and elements found along the way.</p></details>
    ${cards?`<div class="stats"><div><b>${cards} / ${BOSSES.length}</b><small>Cards claimed</small></div></div>`:''}
    <button class="go" id="begin">Enter the Sanctum</button>`);
  $('begin').onclick=enterHub;
}
