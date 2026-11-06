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

## Resolution
The canvas is `LW*R` = 320 px wide (`R=2`, in `render/pixel.ts`). Code still draws in 160-unit logical coordinates through a 2x transform; art made with `pixelise()`, `disc()`, `makeBg()` and Pixel Lab images is flagged `hi` and drawn at its true 2x resolution by `blit()`. Hand-made pixel maps (hearts, skull, icons) are still logical-size and look chunkier.

## Arena looks
`render/arenaArt.ts` paints a backdrop per arena type onto the background canvas: constellations plus a drifting star layer (open field), an astrolabe plate with a turning glyph ring (orbit), a gothic hall (face-off), and flagstones from the Pixel Lab tile set with carved pillars (open arena). The HUD (gilded bars, hearts) is drawn in `render/draw.ts`; overlay screens are HTML styled in `style.css`.

## Effects, art packs and audio
- Spell effects: `render/vfx.ts` runs the Sprite Fusion open-source VFX library (`render/vfx/*.ts`, MIT) on one shared pixel buffer; the spell systems call `fxExplosion / fxIce / fxLightning / fxShield / fxBlink / fxBeam / fxImpact / fxHeal`.
- Art packers: `node tools/pack-wizard-anim.mjs` (character clips), `node tools/pack-icons.mjs` (41 UI icons: spell_, el_, gear_, wand_, good_).
- Hand-made art overrides live in `render/sprites.ts` (`SPRITE_OVERRIDES`): wizard, Cinder King boss, chest and mimic, shuffling hands, icons, arena tiles and pillar. Anything missing falls back to the procedural art.
- Audio: see `docs/audio.md` (file slots, manifest, and the licensing shortlist).

## Meta-progression
- `data/meta.ts`: the save (localStorage `ea-meta-v1`), the five wizards with their stats and perks, and the milestone rules. Wizards unlock by counters (bosses beaten, clean wins, elites, mimics); the 32-run unlocks by winning a 16-run and the 64-run by winning a 32-run.
- Wizard and run length are chosen on the setup screen (`showSetup` in `systems/faceoff.ts`). Run length is no longer fixed at 16: HP, boss speed, gold and the player's power curve scale by relative position (`relPos()`, `posHp()` in `systems/deck.ts`).
- Coded wizards (`render/wizardArt.ts`) and coded bosses (`render/bossArt2.ts`, registered in `data/newBosses.ts`) are placeholder art; Pixel Lab art overrides them. Bosses 17+ are appended to `BOSSES` and every per-boss table in one place. A run length only becomes available when enough bosses and a final boss exist (`FINALS` in `data/bosses.ts`).

## State
Everything that used to be a closure variable (`P` player, `B` boss, `shots`, `H`, ...) now lives on one
exported object: `G` in `core/state.ts` (`G.P`, `G.B`, `G.shots`...). `S` is the run/mode state.

## Typing
The gameplay modules start with `// @ts-nocheck` (they were written untyped). The next step is to type `G`
(player, boss, shot, spell interfaces) and then drop that pragma module by module.

## Art
`SPRITE_OVERRIDES` in `main.ts` is the slot for final sprites. Any boss or the wizard without an override
falls back to the procedural art.
