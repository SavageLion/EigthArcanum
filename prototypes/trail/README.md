# Ridgeline (prototype)

A standalone trail-running roguelike for phones. One self-contained file: `index.html` (no build, no dependencies).

- Open on the dev server: `/prototypes/trail/index.html`, or just open the file in a browser.
- You steer only your **effort** with the fader on the right. Effort sets speed, but also heart rate and legs: hills and heat push heart rate up, redlining burns legs, an empty tank is a bonk.
- Drink and eat on the move, make quick calls at trail events, draft gear at aid stations.
- Races unlock in order on the map. Bronze: finish every stage inside the cutoff. Silver: beat the par time. Gold: beat the gold time without bonking.
- `node tests/trail-bot.mjs 8` plays every race with a pacing bot (add `--effort 0.9` to see what always-sprinting does).
