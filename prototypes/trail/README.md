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
