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

## Pixel Lab art (Pine Ridge showcase)
- `assets/pl/` holds Pixel Lab art: the trail runner (back-view 8-frame run cycle and an idle pose, used in every race), three tree types (pine, spruce, aspen), bush, wildflowers, boulders, grass tufts, clouds, and animated bird and butterfly frames.
- Pine Ridge uses them: trees and flowers sway in the breeze (more in windy weather), butterflies flutter around flower patches, birds fly across the sky and clouds drift past the mountain backdrop, with pollen motes and falling leaves in the foreground. Weather tints the backdrop. Other races keep the procedural scenery for now.
- The world sprites are drawn at full resolution on top of the low-res terrain view and clipped by the terrain in front of them.

## Ground tiles, long grass and the new map
- **Ground tiles** (Pixel Lab, `assets/pl/tile_0..15.png`): the terrain view is now textured. Each terrain type samples a 32x32 tile (meadow, tall grass, flowers, dirt trail, granite, scree, mud, water, forest floor, golden grass, red canyon sand, frost, shrub...). Races pick their own tiles: Canyon is red sand and rock, Glacier Gap is frost, Fogbank is muddy forest. Tiles are mirrored so there are no seams, and blend toward their average colour close to the camera and far away to avoid blocky or shimmering ground. The terrain view is also higher resolution than before.
- **Long grass** (Pine Ridge): thousands of grass tufts, densest around the marked course. Run through them and they bend away from you and flatten, then spring back over about two seconds.
- **Grounded sprites**: sprite art is trimmed to its visible pixels so trees, bushes and rocks stand on the ground instead of floating. Things in front of the runner draw over his legs.
- **Map**: a single road of numbered race stops, each with a card (distance, stages, medal or what you need to unlock it, weather forecast). A pulsing gold card marks your next goal and the map opens scrolled to it. HOME BASE and TRAINING are fixed buttons at the bottom; training trails and the Bear Den live in the Training menu.

## Pine Ridge: the scenic pass
- **Camera**: higher and further back (looking down the course), with a raised horizon so there is room for sky.
- **Painted backdrop** (Pixel Lab): a sunset panorama (lake, castle on a cliff with waterfalls, stone bridge, mist) centred on the direction of the aid station or finish, so you run toward it. Forested misty ridges and drifting fog bands sit in front of it, and everything scrolls as you turn and drift as you run. A sun glows off to one side.
- **Framing and props along the course**: huge pines and spruces on both sides, a wooden fence on long stretches, signposts with a glowing lantern at junctions, lupines, mossy boulders, wildflowers, bushes and the long grass.
- **Lighting**: warm sunset grade, dark vignette, and flickering additive light from the lanterns on signposts and on the aid station and finish gates.
- **HUD**: kept out of the way, with the course info now in a small block in the bottom left.

## Music (from Eighth Arcanum)
- `score.js` is the Eighth Arcanum procedural score engine (`src/core/score.ts`) transpiled for this page, so the same live-generated tracks play here with no audio files. Regenerate it with `node_modules/.bin/tsc src/core/score.ts --ignoreConfig --outDir _tmp --target es2020 --module es2020 --lib es2020,dom --skipLibCheck`, then strip the `export` keywords and wrap it as `window.EAScore` (see the header of `score.js`).
- Themes: map and training menu = `title`; home base and shop = `shop`; aid stations = `hub`; route briefing = `draw`; physio = High Priestess; bear fight = Cinder King; result = `reward` (or `victory` on gold); DNF = `defeat`.
- Each race runs one boss theme: Pine Ridge High Priestess (harp and choir), Lakeside Drowned Queen (slow tide), Canyon Sand Prophet (desert hand drums), Fogbank Hollow Bell, Skyline Emperor, Glacier Gap Frost Matron (glassy arps), Summit Void Sovereign. Storm weather switches to Storm Eye and training runs use Clockwork Judge.
- During a run the music's energy follows your heart rate: easy layers are bass and pad, harder effort adds drums and lead, and a bonk adds a frenzy.
- The note button under the fullscreen button mutes music and effects (remembered between visits).

## Flags, gates and the run UI (Pixel Lab)
- **Flags and gates**: the pink course flags are now an animated Pixel Lab sprite (7-frame wave) set just beside the marked course, alternating sides. The aid station is a wooden arch with a blue banner, lanterns and supplies; the finish is a red and white checkered arch with flags and balloons. The aid arch's lanterns glow; both keep their tall light beam. These are used in every race.
- **Run UI** (`assets/pl/ui_0..15.png` are the icon faces): a glass top bar with the name, stage, clock, cutoff and round pause, music and fullscreen buttons; a compass tape with a diamond marker for the aid station or finish (A or F) and a pink dot toward the course when you are off it; a course profile strip with event diamonds, a flag at the end and a glowing marker for you; info pills (terrain and slope, distance to the gate, on or off course, weather); a control panel with icon gauges (heart rate zones with a needle, legs, water, fuel; they glow red when low), round DRINK, GEL and MAP buttons with count badges, and a rounded steering track with a gold knob; and a restyled effort fader with zone labels and a grip knob.

## Ground upgrade (Pine Ridge)
- **New 64px Pixel Lab tiles** (`assets/pl/gt_0..15.png`): meadow, long grass, wildflower meadow, rutted dirt trail, plus dedicated *transition* tiles (grass over dirt, dirt and gravel, grass among rocks, mud with grass) and granite, scree, mud, forest floor, clover, leaf litter, shrub and stream bank.
- **Blending**: where two terrain types meet, the ground dithers into the neighbour with an ordered (Bayer) pattern and drops in the matching transition tile in the band between, so grass creeps onto the trail instead of ending in a straight line. Close to the camera it uses clean bands instead, to avoid blocky dither.
- **Variation**: the variant is chosen by large-scale noise computed once per world cell (with a little dither), tiles are flipped per patch, and a slow colour wobble shifts greens toward gold, so stretches do not repeat.
- **Detail and light**: flat flower and pebble decals, pebbles and grass clumps along the trail edges, bump lighting derived from each tile's own relief (sun side lit), long soft tree shadows falling away from the sun, and warm light pools on the ground around the lanterns.
- **Resolution**: the Pine Ridge terrain view is rendered at a higher resolution (180 columns). Grass tufts use a cheap draw path and thin out with distance to keep the frame rate up. Other races keep the original tiles and resolution.

## Trail in path coordinates (Pine Ridge)
- The marked course is drawn from dedicated Pixel Lab path tiles (`assets/pl/pt_0..3.png`: a vertical dirt trail with two ruts and a worn grass fringe). Each ground sample near the course is converted to path coordinates (distance across the trail, distance along it), so the ruts and fringe follow every bend instead of running in one fixed direction. The fringe dithers into the surrounding meadow.
- The bump light is rotated into the same frame. Close to the camera a fine grain breaks up big flat texels, and the painted castle now sits below the HUD.
