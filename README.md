# The Eighth Arcanum

Boss-rush roguelike on Canvas 2D. Vite + TypeScript, no game engine.

```
npm install
npm run dev        # dev server (reachable from your phone on the LAN)
npm run build      # typecheck + production build into dist/
npm run smoke      # build first; plays the first 16 bosses x 4 arenas in headless Chrome, fails on any error
```

## Layout
- `index.html` – shell: canvas and overlay divs
- `src/main.ts` – boot, game loop, `window.__arcana` test hook
- `src/core/` – `dom` (canvas/overlay refs), `state` (shared state), `util`, `audio`, `input`, `size`
- `src/data/` – `bosses.ts` (the first 16 bosses and the run order), `newBosses.ts` (bosses 16-31), `newBosses64.ts` (bosses 32-63), `meta.ts` (saves, wizards, run lengths 8/16/32/64)
- `src/systems/` – gameplay: `attacks` (bullet patterns), `bossPlans` (per-boss face-off/open-arena behaviour),
  `spells`, `casting`, `spellFx`, `gear` (gear + chests), `deck` (boss order, omens, wands, shop goods),
  `flow` (title, tarot draw, run start), `faceoff` (fight start/win/lose, reward, shop screens),
  `openArena`, `runner` + `runnerSpells` (the Justice arena), `sideView` (switched off platformer), `arenaEvents` (pickups, phase events), `sim` (damage + per-frame step)
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

## The four arenas
- **The Chariot** (open field), **Wheel of Fortune** (orbit), **Strength** (pillared room): see `systems/sim.ts` and `systems/openArena.ts`.
- **Justice = The Run** (`systems/runner.ts`): a three-lane perspective corridor. The player and boss keep proxy positions in world units that match their screen positions, so bolts, beams, shields and VFX from the other arenas still land correctly. The scene is drawn in a 270-wide space scaled into the 160-unit canvas.
  - Hazards: low barriers (jump), hanging blades (slide), monoliths (change lane), flying spells (slide under or swap lane) and ground spells (jump). Patterns are listed in `PATTERNS`; some bosses have signature patterns (`SIG`).
  - Art: obstacles and wall columns come from `public/assets/runner/<flag|ash|ice|moss>/`, spells from `public/assets/runner/spells/` (Pixel Lab; the coded shapes in `runnerSpells.ts` are the fallback). Boss spell shapes are listed per boss in `SPELLS`.
  - Pickups: mana wisps, hearts, shields, magnets. Combo: grazes, passed obstacles and wisps add up and raise bolt damage.
- `systems/sideView.ts` is a side-on platformer fight that is switched off (add its entry back to `ARENAS` in `flow.ts` to bring it back).
- Testing: the wizard screen has "Unlock everything" and "Force arena" options. `prototypes/boss-runner.html` is the standalone runner test page (`node tools/build-runner.mjs`).

## The Sanctum (base)
`systems/hub.ts`: the hall you return to between runs (`S.mode==='hub'`). The wizard walks it with the stick or arrow keys and steps onto glowing circles: the **Door** (opens the wizard and run-length screen), the **Market** (spend Arcana Shards on permanent starting boosts) and the **Forge** (unlock gear slots, choose the gear you carry into each run). Shards, boosts, owned gear and the loadout live in `data/meta.ts` (`shards`, `boosts`, `owned`, `forge`, `loadout`); shards are earned per boss and per finished run. `applyHubBonuses()` applies them in `startRun`. Props are Pixel Lab art in `public/assets/hub/`. Next steps: a Spell Lab with a training dummy, a Codex of bosses, daily runs.

## The Camp (between bosses)
`systems/camp.ts` replaces the stacked reward, fuse, chest and shop screens with one tap-based screen (`showPick` now calls `enterCamp`). Reward spells sit in a tray; tap one, then tap the slot it should go to (keep / fuse / replace come from `forgeOptions`) or sell it. Chest gear appears above the tray with Wear / Sell. The merchant and the wardrobe are props you tap in the scene (`makeStock` in `faceoff.ts` builds the stock). "Next card" asks for a second tap if you are leaving a reward or chest gear behind. The old screens (`takeSpell`, `showShop`, `showLoot`) are still in the code.

## Sanctum stations (all six)
Door, Market, Forge, plus **Codex** (a bestiary of all 64 bosses, filled in as you beat them; \`meta.codex\`), **Daily Run** (the same seeded 8-boss run and arenas for everyone each day, no Market boosts or Forge gear; first win of the day pays a shard bonus that grows with the streak: \`dailyToday\`, \`noteDaily\` in \`data/meta.ts\`, \`startRun(..., daily)\` in \`systems/flow.ts\`) and the **Spell Lab** (\`systems/lab.ts\`: a dummy that cannot die, a spell builder for any type, element pair and tier, unlimited mana and a DPS readout; it runs as a normal fight with \`S.lab\` set).

## Spells: 9 elements and 9 types
Types: bolt, nova, ward, summon, beam, trap, blink, **meteor** (a delayed, undodgeable hit) and **orbit** (orbs that circle you, erase shots and strike the boss). Elements: fire, frost, sound, storm, thorn, bone, mirror, blood, gold and the newest **poison** (stacking damage over time), **holy** (cleanses nearby shots, brief shield) and **void** (erases shots near the boss for bonus damage). Elements are assigned to bosses in `data/elementAssign.ts`. New recipes: Eclipse Meteor (meteor + void + fire) and Halo Guard (orbit + holy + mirror). Meteor and orbit logic is in `systems/spellFx.ts` (`spellExtrasStep`, `drawSpellExtras`); the Spell Lab builds any combination.

## Testing: smoke, audit and balance bots
- `npm run smoke`: plays the first 16 bosses in all four arenas and clicks through the Camp (fails on any console or page error).
- `node tests/audit.mjs`: about 440 mechanic checks (every boss in every arena including enrage, all 9 types x 12 elements, wands, gear, wizards, omens, Runner rules and pickups, the Camp flows, Sanctum economy, daily seed, Spell Lab). Needs a build first. Exits 1 on any failure.
- `node tests/bot.mjs --len 8,16 --runs 30 --skills 0.8 --wizards raven,ember`: balance bots (`tests/botlib.js`) play whole runs by stepping the simulation without rendering, then print win rates by run length, wizard, arena, omen and boss, the deadliest bosses and the slowest kills. A bot's `skill` is how fast it reacts and how often it slips; it sees every shot, so treat results as relative (compare arenas, bosses and wizards), not as a prediction of human win rates.

The unlockable wizards can have animation clips too: `node tools/pack-wizard-set-anim.mjs <id> <unzipped Pixel Lab character folder>` writes `public/assets/wizard/anim-sets/<id>/` and the manifest (idle, walk, cast, hurt, death, 8 directions). The Sun Eater (id `ember`) has all five; `WIZ_DRAW_K` in `render/draw.ts` sets each wizard's drawn size relative to the Raven.
