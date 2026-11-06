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
- `src/main.ts` – game state, simulation, flow, input (still one big closure; see below)
- `src/core/` – `util` (math, `$`), `audio` (synth)
- `src/render/` – `pixel` (palette snapping, outline pass), `bossArt` (procedural boss figures)
- `src/style.css` – all UI styling
- `public/assets/` – shipped art (Pixel Lab output goes here)
- `art-source/` – prompts and source images, not shipped
- `docs/original-single-file.html` – the original single-file prototype

## Next refactor
The remaining code in `main.ts` shares mutable state (`P`, `B`, `S`, shot arrays...) through the closure.
Splitting it further means first moving that state into one exported object, then peeling off systems
(spells, loot/shop, tarot draw, face-off, open arena). `npm run smoke` is the safety net for that.

## Art
`SPRITE_OVERRIDES` in `main.ts` is the slot for final sprites. Any boss or the wizard without an override
falls back to the procedural art.
