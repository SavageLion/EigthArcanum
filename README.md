# The Eighth Arcanum

A tarot-boss hunting roguelike on Canvas 2D. Vite + TypeScript, no game engine. Play it on a phone held sideways: the whole game is landscape, with a rotate prompt in portrait.

```
npm install
npm run dev        # dev server (reachable from your phone on the LAN)
npm run build      # typecheck + production build into dist/
npm run smoke      # build first; walks the Sanctum and plays hunts against several bosses in headless Chrome, fails on any error
node tests/hunt-bot.mjs 12   # build first; a dodging bot plays whole hunts and reports win rates
```

## The game
- **Title and Sanctum.** A walkable village (portrait, `src/systems/hub.ts`): the Hunt gate, the Market (Arcana Shards buy permanent boosts), the Forge (unlock gear slots and choose the gear you carry into every hunt), the Codex (every boss you have hunted, with its card) and the Daily Hunt board.
- **The Hunt** (landscape, `src/hunt/hunt.ts`). Pick a boss and a wizard on the hunt board. You land in a 5x4 realm of connected rooms and walk into any side of the room to leave; the whole border glows in the colour of what lies beyond (sealed sides crackle red). Fight rooms lock until the wave ends, then give a reward. Altar rooms are a merchant, campfire, wager or treasure chest (one in five chests is a mimic). Three key guardians hold the keys; the boss room is sealed (pay stardust or hearts, or force it for a tougher boss). A compass and minimap track the boss, and the dark deepens every minute.
- **Cards.** Beating a boss claims its tarot card (hunting it again levels it). A card's power comes from the boss's element: it can infuse your first spell with that element, start you with a spell, or give a numeric bonus. Equip cards on the hunt board.
- **Spells** auto-fire: bolt, nova, chain, meteor, orbit, beam, ward, thorns, trap, blink, gale, familiar. You carry four spells. A new spell can be learned into a free slot, replace one, or be **fused** into one you carry (levels add up plus one, upgrades and element carry over, a different spell lends an extra projectile); campfires let you fuse two of your own. Modifiers: multishot, pierce, split, ricochet, haste, power, size, frost, burn, echo. **Elements** (fire, frost, storm, thorn, bone, mirror, blood, gold, poison, holy, void, sound) infuse one spell each and give it a unique effect.
- **Gear** (hat, robe, charm, five rarities) drops from chests and is worn for the rest of the hunt; gear you have worn is recorded for the Forge. Wizards bring their perks (raven, sun eater, ice hermit, bone priestess, gambler).
- Controls: drag anywhere (or WASD / arrows) to move, Esc pauses. Spells cast themselves.

## Layout
- `src/main.ts`: title, village and hunt loop. `src/village/title.ts`, `src/systems/hub.ts`, `src/ui/overlay.ts` (overlays, icons, boss card art).
- `src/hunt/hunt.ts`: the whole hunt (world generation, rooms, spells, elements, bosses, rewards, cards, UI). `src/hunt/vfx.ts` runs the pixel VFX library on the hunt canvas.
- `src/data/`: `meta.ts` (saved progress: shards, boosts, gear, cards in `meta.hunt`, daily), `bossList.ts` (the 64 bosses), `gear.ts`, `rarity.ts`.
- `src/render/sprites.ts` loads all Pixel Lab art from `public/assets` (wizards and clips, bosses by index, hub props, villagers, `hunt/` enemies and decor). `src/core/` has audio (`score.ts` is the generative techno score), sizing, input and shared state.
- `prototypes/survivors/`: the standalone prototypes this mode grew from.

## Art and tools
- Bosses (64), wizards (5, 8 directions with idle, walk, cast, hurt and death clips), village props, villagers and the hunt's common enemies, guardian, chest, mimic and stage decor are Pixel Lab sprites. Packing scripts: `tools/pack-hunt-art.mjs` (enemies and decor), `tools/pack-wizard-set-anim.mjs`, `tools/pack-npc.mjs`, `tools/pack-icons.mjs`.
- The six stage looks (Crypt, Overgrowth, Frost hollow, Ember hall, Observatory, Void rift) reuse the arena floor tile sets with a tint, plus their own decor props and drifting motes.
- Music is generated live (`src/core/score.ts`): techno themes for the Sanctum, rooms, boss fights, rewards, victory and defeat. Drop recorded files into `public/assets/audio` to replace any of them (see `docs/audio.md`).

## Deploying
GitHub Pages builds `main` with `.github/workflows/pages.yml`. `vite.config.ts` uses a relative base so the build works in a subfolder.
