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
- **Day / night loop**: each **day** you herd the flock into the pen (finish early to earn more **lantern oil**; tap CALL DUSK once 60% are penned). At **dusk** the gate shuts and the **night** begins: darkness with a lantern circle around you, and sheep left outside are exposed.
  - **Foxes** sneak in from the edges, grab lambs and strays and run off with them; bark, chase or bump to make them drop the sheep. With no strays they dig under the fence.
  - **Wolf packs** announce themselves with a howl and an edge arrow, circle the flock, then rush an outer sheep and bite (hp: ewe 2, ram 4, lamb 1) or gnaw the fence. Bark scares them, a crouching stare makes them hesitate, alpha wolves take two barks.
  - Sheep **huddle** when predators are near. The pen fence has hp: hold **CALM** next to a damaged or broken wall to repair it. Hold out until the **dawn** bar fills.
  - Survivors carry over (+1 lamb and +1 sheep each dawn). Lose the whole flock and the run ends. Pick one of three **perks** at every dawn: bark, paws, stare, nose, bell, treats, second dog (chases predators at night), bright lantern, **flares** (button, E), campfire, sturdy fence.
- **Maps**: a map-select screen. Map 1, Home Paddock, is a 5-day campaign: day 5 is a final night (alpha pack, no bear) and surviving it shows a win screen with 1-3 stars (3 = no sheep lost over the whole run). Stars and best score are saved in localStorage; maps 2-5 are listed as coming soon. A NEXT button (top right) skips to the dawn reward pick. Cornered foxes and wolves leave the map and come back later from another edge. Tests: sheepdog-map.mjs, sheepdog-skip.mjs, sheepdog-fox.mjs.
- Keys: Space bark, C calm/stare/repair, E flare, N call dusk, F fullscreen.
- Test: `node tests/sheepdog-bot.mjs 6 --shots dir` plays days and nights with bots (herding by day, predator-chasing and fence-mending by night).
- Serve: `node prototypes/sheepdog/serve.mjs` then http://localhost:8084

Next: Pixel Lab sprites (dog, sheep types, fences, rocks, trees), larger scrolling farms, hazards (river, fox at dusk), night rounds, more job types (load the truck, split a marked group), a farm hub.
