# The Eighth Arcanum

Boss-rush roguelike on Canvas 2D. Vite + TypeScript, no game engine.

```
npm install
npm run dev        # dev server (reachable from your phone on the LAN)
npm run build      # typecheck + production build into dist/
npm run smoke      # build first; plays all 16 bosses x 4 arenas in headless Chrome, fails on any error
```

## Layout
- `index.html` – shell: canvas and overlay divs
- `src/main.ts` – boot, game loop, `window.__arcana` test hook
- `src/core/` – `dom` (canvas/overlay refs), `state` (shared state), `util`, `audio`, `input`, `size`
- `src/data/bosses.ts` – the 16 boss definitions
- `src/systems/` – gameplay: `attacks` (bullet patterns), `bossPlans` (per-boss face-off/open-arena behaviour),
  `spells`, `casting`, `spellFx`, `gear` (gear + chests), `deck` (boss order, omens, wands, shop goods),
  `flow` (title, tarot draw, run start), `faceoff` (fight start/win/lose, reward, shop screens),
  `openArena`, `sim` (damage + per-frame step)
- `src/render/` – `pixel` (palette snapping), `bossArt` (procedural boss figures), `sprites` (sprite cache, overrides), `draw` (frame drawing)
- `src/style.css` – all UI styling
- `public/assets/` – shipped art (Pixel Lab output goes here); `art-source/` – prompts and sources, not shipped
- `docs/original-single-file.html` – the original single-file prototype

## State
Everything that used to be a closure variable (`P` player, `B` boss, `shots`, `H`, ...) now lives on one
exported object: `G` in `core/state.ts` (`G.P`, `G.B`, `G.shots`...). `S` is the run/mode state.

## Typing
The gameplay modules start with `// @ts-nocheck` (they were written untyped). The next step is to type `G`
(player, boss, shot, spell interfaces) and then drop that pragma module by module.

## Art
`SPRITE_OVERRIDES` in `main.ts` is the slot for final sprites. Any boss or the wizard without an override
falls back to the procedural art.
