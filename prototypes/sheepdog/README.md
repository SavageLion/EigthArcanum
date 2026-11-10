# Sheepdog (prototype)

Real-time flock-herding roguelike. You are the dog. Sheep flee from pressure, so steer the flock through the gate into the pen before time runs out.

- **Move (left thumb)**: a floating stick appears under your thumb anywhere on the left/middle of the screen. It is analog: a **light push is a slow, steady walk** (calm pressure, sheep drift away without bolting), a **full push runs**. Mouse drag works the same way; WASD / arrows too.
- **Bark (right thumb, big button or Space)**: a burst that kicks nearby sheep away and panics them. 2.4 s cooldown, with a short vibration on phones.
- **Calm (hold the button or C)**: stay slow and steady even at full push, e.g. to stare a stubborn sheep forward.
- **Bumping**: the dog is solid against sheep. You shoulder them aside and slow down (rams barely move and stun you). A hard bump while running startles the sheep (panic spreads through the flock, "BUMP!", short vibration); a slow crouching nudge does not. Test: `node tests/sheepdog-bump.mjs`.
- **FULL** button (or F) for fullscreen plus a landscape lock. The field widens to match the screen shape, so there are no black bars on a wide phone.
- Multi-touch tested with `node tests/sheepdog-touch.mjs` (emulated phone: stick, light push, bark with a second finger).
- Sheep have a **flight zone** around the dog (dashed ring). Approach from behind to drive them straight, from the side to turn them. They flock (cohesion, alignment, separation) and graze when left alone.
- **Types**: ewes, rams (ignore light pressure, charge and stun you), panickers (bolt and spread panic), lambs (stick to the flock).
- **Rounds** get bigger and add rocks; after each win pick one of three **perks** (bigger bark, faster paws, steadier stare, collie nose, tighter flock, treats, a second dog).
- Test: `node tests/sheepdog-bot.mjs 6 --shots dir` plays with a herding bot (wins rounds 1-2, struggles from round 3).
- Serve: `node prototypes/sheepdog/serve.mjs` then http://localhost:8084

Next: Pixel Lab sprites (dog, sheep types, fences, rocks, trees), larger scrolling farms, hazards (river, fox at dusk), night rounds, more job types (load the truck, split a marked group), a farm hub.
