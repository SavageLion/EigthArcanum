# Ridgeline (prototype)

A trail-running **management** game for phones, played in portrait. One page, no build, no dependencies: `index.html` (+ `assets/`). Open `/prototypes/trail/index.html` on the dev server. Progress is saved in localStorage (`ridgeline-v2`). The corner button toggles fullscreen (and asks for portrait lock).

## The loop
- **Map** (drag to scroll): blue trails are training runs (Hill Repeats, Long Run, Heat Lab, Recovery Jog) that build four stats. Gold trails are 7 set races, none random: Pine Ridge 5K, Lakeside 10K, Canyon Loop 15K, Fogbank 21K, Skyline 30K, Glacier Gap 42K and Summit Ultra 50K. Each has its own fixed landscapes (every stage is a hand-seeded world with its own mountain, lake, river, biome mix and trail), its own fixed events and bear stages, and its own climate. The Bear Den is a boxing mini-game test.
- **Home base**: gear shop, rest a day, physio tent.
- **Every run is a Trail View**: you run behind the runner in a generated 3D-style world (mountain, lake, river, meadow, brush, scree, mud) and have to find the finish. Steer with the pad (or arrow keys), set effort with the fader. The marked course (pink ribbons) is the cheapest way round the mountain; unmarked decoy trails lead nowhere; cutting across country is faster on paper but terrain slows you (meadow 93%, brush 66%, rocky 84%, scree 74%, mud 80%, creek 70%, trail 100%) and slopes spike your heart rate. OPEN MAP (or M) shows terrain and a dashed circle the finish is inside; trails only appear on the map once seen. The clock keeps running while you read it.
- Multi-stage races generate a new world per stage; the finish gate is the aid station.

## Management systems
- **Effort and body**: effort sets speed but also heart rate and legs; hills and heat push heart rate up, redlining burns legs, an empty tank is a bonk. Drink and eat on the move. Trail events (creek, steep climb, scree, fork, orange slices, heat wave, hot spot, bear) fire as you cover distance.
- **Stats** (levels 0-5): Endurance, Climbing, Heat tolerance, Recovery.
- **Gear**: bought permanently, carried in a loadout limited by pack slots.
- **Fatigue and days**: every run adds fatigue and costs a day; rest clears it.
- **Injuries** (blister, shin splints, tight calf, sore knee, Achilles) are rolled from how hard you ran and carry into the next run until eased by rest or the physio mini-game (timing bar), at base (15 coins) or in the medical tent at an aid station (costs race time).
- **Bear fight**: dodge the telegraphed swipe, punch while it is open. Appears as a rare trail event and at the Bear Den.
- Pine Ridge uses a scenic backdrop image behind the terrain (`assets/pine_bg.jpg`).

## Testing
- `node tests/trail-bot.mjs 2` plays every race and training trail with a bot that follows the marked course (and treats injuries in the tent).
- `--bear` also plays bear fights at several reaction times, `--nav` compares a course-following bot with one that heads straight for the finish, `--season 3` plays whole management seasons, `--shots <dir>` saves screenshots of the main screens.

## Finding the aid station and finish
- The gate is marked from the start. The map shows it as a green dot (blue banner in the world = aid station, red and white checkered = finish) and prints the marked course as a pink dotted line. The compass tape shows a green A or F at the gate's exact bearing and the distance shows on screen.
- A tall light beam stands over the gate so it can be seen from far away over hills.
- You can follow the marked course (ribbons on the cheapest way round the mountain), or cut your own route for a shortcut: terrain and slopes slow you, the lake blocks you, and unmarked trails may lead nowhere.
- A line under the terrain name says whether you are on the marked course; off course it shows how far the ribbons are and a pink dot on the compass points to them.

## Route briefing
Every stage opens on the map with the clock stopped. Study the gate (green dot), the pink marked course, the terrain legend and your start, then press START (or Enter / space). During the run the map is still available but the clock keeps running while it is open.

## Elevation graph
A profile of the marked course sits under the compass: ticks are trail events still ahead, the coloured bar at the right is the gate (blue aid station, red finish), the white dot is your position along the course (dimmer when you are off it), and the caption gives the course's total climb. Drink and gel buttons work during runs.

## Entries and weather
- **Entries are earned**: Pine Ridge is open. Lakeside needs any Pine medal; Canyon needs silver at Pine; Fogbank needs silver at Lakeside; Skyline needs silver at Canyon; Glacier Gap needs silver at Fogbank and 6 stat levels; Summit needs silver at Skyline and at Glacier. Locked races show what you need, and finishing a race that earns you a new entry says so on the result screen.
- **Weather is random but visible**: every race shows a forecast on the map, and it re-rolls each day you spend (a run, a rest day). Each race has its own climate (hot canyon, foggy Fogbank, stormy ridges, cold glacier...). Effects: **Heat wave** (heat up, drink 35% faster), **Rain** (mud, rock and scree slick, legs tire faster, less visibility), **Fog** (you only see a short way, with a mist overlay), **Windy** (a random wind: tailwind speeds you up, headwind slows you, shown on the HUD), **Cold snap** (flurries, lower heart rate, less water used, stiffer legs), **Storm** (rain, gusts, lightning, poor visibility). Pick races by the weather you want.
