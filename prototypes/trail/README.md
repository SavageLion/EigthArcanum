# Ridgeline (prototype)

A standalone trail-running **management** roguelike for phones. One self-contained file: `index.html` (no build, no dependencies).

- Open on the dev server: `/prototypes/trail/index.html`, or just open the file in a browser. Progress is saved in localStorage (`ridgeline-v2`).

## The loop
- **Map**: blue trails are training runs (Hill Repeats, Long Run, Heat Lab, Recovery Jog) that build four stats. Gold trails are races (Pine 5K, Canyon 15K, Skyline 30K, Summit Ultra 50K) that pay coins and medals. Silver or better unlocks the harder races from Skyline on.
- **Home base**: spend coins in the **gear shop**, **rest a day** (clears fatigue, may heal injuries), or visit the **physio tent**.
- **A run**: you only steer your **effort** with the fader. Effort sets speed but also heart rate and legs; hills and heat push heart rate up, redlining burns legs, an empty tank is a bonk. Drink and eat on the move, make quick calls at trail events, hike steep climbs.
- **Aid stations** (between race stages): refuel, pick one free item, and optionally visit the **medical tent** (one physio treatment per station, costs 40 s of race time).

## Management systems
- **Stats** (levels 0-5, from training and racing): Endurance (legs drain slower), Climbing (hills slow you less), Heat tolerance, Recovery (legs recover faster, wider physio zones).
- **Gear**: bought permanently, but you carry only as many items as you have loadout slots (start with 2, expand the pack in the shop).
- **Fatigue**: every run adds fatigue, resting removes it. High fatigue lowers your starting legs and raises injury risk. Each run costs a day.
- **Injuries**: how you run a stage (fast descents, redlining, hard climbs, falls, dehydration) rolls blisters, shin splints, tight calf, sore knee or Achilles pain, each with 3 severity levels and a real effect on the next run. They heal slowly on their own, faster with rest, or on the table.
- **Physio mini-game**: tap PRESS when the sliding marker is inside the green zone. Severity sets the number of pulses; three misses ends the session. Enough hits eases the injury one level; three perfect hits also loosens your legs (+10 start legs). Base sessions cost 15 coins; Massage gun and Recovery level widen the zone.

## Testing
- `node tests/trail-bot.mjs 4` plays every race and training trail with a pacing bot on a fresh save (and treats injuries at the tent).
- `node tests/trail-bot.mjs --season 3` plays whole seasons with a management bot (train, rest, physio, shop, race) and prints the day-by-day log.
- Add `--shots <dir>` for screenshots of every screen.

## Landscape, fullscreen and the bear fight
- The game is a 480x270 landscape canvas. Held upright, the canvas is rotated 90 degrees by CSS (touch input is mapped back), so it is always landscape. The corner button (or the F key) toggles fullscreen and asks the browser to lock landscape (works on Android Chrome; iPhone Safari has no fullscreen API, use Add to Home Screen).
- **Bear fight** (old-school boxing): the bear telegraphs a swipe from one side with a red "!". Tap DODGE toward the opposite side as the swipe lands (the dodge lasts half a second, so do not go too early). A dodged swipe leaves the bear dizzy for a moment: tap PUNCH to hit it, combos hit harder. Punching a guarding bear does nothing. It gets faster and feints as it weakens. Keys: A/D or arrows dodge, space/J punch.
- It appears as the "Bear Den" test node on the map, and as a rare trail event in the 15K and longer races (fight it for +25 coins and +12 legs, or back away and lose 8 s; losing costs 25 legs and 3 s).
- Art: Pine Ridge uses a scenic backdrop image and the runner is a pixel-art sprite (both in `assets/`). `node tests/trail-bot.mjs 2 --bear` also plays bear fights at several reaction times.

## Trail View (behind the runner, free route, find the finish)
A second way to race, on the map as the teal "Trail View" node (an orienteering test).
- A voxel-style 3D view from behind the runner. A new world is generated every run: a mountain, a lake, a river, meadows, thick brush, scree and mud, with a marked course (pink ribbons) that is the cheapest way round the mountain, plus unmarked decoy trails.
- Steer with the pad (or arrow keys / A, D), set effort with the fader as usual. Terrain changes your speed (meadow 93%, brush 66%, rocky 84%, scree 74%, mud 80%, creek 70%, trail 100%), slopes slow you and spike your heart rate, the lake blocks you.
- You are not told where the finish is. OPEN MAP (or M) shows the terrain, your position and a dashed circle the finish is somewhere inside; trails only appear on the map once you have seen them. A compass tape shows your heading and a "?" toward the circle. The clock keeps running while the map is open.
- Held upright on a phone, Trail View switches to a portrait layout (view on top, controls underneath). All other screens stay landscape.
- `node tests/trail-bot.mjs 1 --nav` runs a bot that follows the marked course and one that heads straight for the finish (the straight line is risky: it crosses the mountain and brush).
