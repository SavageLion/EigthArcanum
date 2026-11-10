# Sheepdog (prototype)

Real-time flock-herding roguelike. You are the dog. Sheep flee from pressure, so steer the flock through the gate into the pen before time runs out.

- **Move**: drag a finger / hold the mouse (the dog runs toward it), or WASD / arrows.
- **Bark** (button or Space): a burst that kicks nearby sheep away and panics them. 2.4 s cooldown.
- **Crouch** (hold the button or C): slow, steady, calming pressure. Sheep drift away without bolting.
- Sheep have a **flight zone** around the dog (dashed ring). Approach from behind to drive them straight, from the side to turn them. They flock (cohesion, alignment, separation) and graze when left alone.
- **Types**: ewes, rams (ignore light pressure, charge and stun you), panickers (bolt and spread panic), lambs (stick to the flock).
- **Rounds** get bigger and add rocks; after each win pick one of three **perks** (bigger bark, faster paws, steadier stare, collie nose, tighter flock, treats, a second dog).
- Test: `node tests/sheepdog-bot.mjs 6 --shots dir` plays with a herding bot (wins rounds 1-2, struggles from round 3).
- Serve: `node prototypes/sheepdog/serve.mjs` then http://localhost:8084

Next: Pixel Lab sprites (dog, sheep types, fences, rocks, trees), larger scrolling farms, hazards (river, fox at dusk), night rounds, more job types (load the truck, split a marked group), a farm hub.
