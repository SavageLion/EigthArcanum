# Hot & Hangry

Forced-landscape phone food-truck roguelike. Single file (`index.html`), canvas, Pixel Lab art.

## The run
Three legs (Town, Downtown, Golden Spatula). Each leg is a **free-roam city**:

- **Drive**: touch anywhere to steer (floating joystick; a ghost joystick shows bottom-left). WASD/arrows on desktop. Petrol is limited.
- **Park** inside a coloured lot for ~0.7 s to enter it: Lunch Rush (x4 venues, serve 3 per leg), Kitchen (fuse dishes), Mechanic (car upgrades), Gas, Cook-off (boss shift that wins the leg).
- **Food Police**: heat (WANTED stars) rises from shifts, kitchen fires, bad reviews and crashes. Cops chase, ram you and try to box you in (bust meter fills -> run over). Lose them by getting >500 px away for 6 s; parking in a lot clears them.
- **Rival trucks**: six named rivals (Taco Tyrant, Burger Baron, Frosty Freddie, Sour Sue, Pizza Pete, Dessert Dolly) roam the city, 2 at a time on leg 1 up to 4 on leg 3. They shoot flavoured food (frozen/sour slow you, spicy burns) and ram. Your truck auto-fires at the nearest rival or cop. Beat one for cash plus a stolen recipe (free perk/dish/flavour card).
- **Map**: wide map top-right with markers ($ rush, K kitchen, M mechanic, G gas, * cook-off, R rival, white = you). Tap it for the full city map. Edge arrows point to off-screen stops.

## Stages and unlocks
Each stage is its own map with its own look, size and difficulty: Sunny Town (start), Dusty Highway, Frostbite Harbour (icy, slidey driving), Neon Downtown (dense, dark) and The Golden Spatula (final gala). Clearing a stage's cook-off unlocks new stages (saved between runs) and you pick the next one from the stage screen. Beat the Golden Spatula to win the run. Trucks unlock too: Grape Soda (clear Dusty Highway), Pickle Express (clear Frostbite Harbour), Golden Spatula rig (clear The Golden Spatula).
After each shift you can hang one **dash trinket** (the old relics) for a permanent perk.

## City swarm
Ordinary cars are the minions. Rush hour builds as the leg goes on: sedans, scooters, vans and (later) buses chase and ram you in growing waves, plus a hangry pack every ~40 s. Your truck auto-fires at the nearest ones (each dish picks a different target), kills give cash and XP, and you can level up while driving. Cops (heat) and rivals are the elites. Chargers dash at you and armoured cars halve damage. Only stops (and rivals) show on the minimap: no direction arrows. Entering a lot clears everything.

The city is regenerated each leg: 7x5 roads with random spacing and widths (about 3600-4400 px wide), lots of different sizes placed irregularly in their blocks, buildings, parks and ponds. 13 stops: 5 lunch rushes, 2 kitchens, 2 mechanics, 3 gas stations, 1 cook-off.

## The shift (window view): cook, flick, combo
You are inside the truck looking out of the serving window at a hungry queue. You can flick **any** food at **any** customer, but you can only throw what you have cooked.

- **Cook**: you have 2 burners (a third with Sous Chef Gordon). **Tap a dish** to put a burner on it (or take it off). A cooking dish adds a portion every few seconds, up to 4 in stock. Decide what to cook: tacos for crowds, hot dogs for lines, ice cream for chilling.
- **Flick**: drag from a dish toward a customer and let go. The food flies from that dish's station; flicks snap to the customer nearest your finger (Magnet perks widen the snap). Empty stations can't throw.
- **Combos** (chain 3 throws; the CHAIN panel shows your last three, COMBOS button shows the list): same dish x3 = TRIPLE DECKER (giant piercing shot); spicy + frozen within 3 = THERMAL SHOCK (burns and stuns everyone); A,B,A = SURF & TURF (chain lightning); 3 different dishes = COMBO MEAL (hits every customer).
- Flavours, recipes and fusions still work (spicy burns and spreads but heats the kitchen, frozen chills, sour stuns, sweet doubles tips, greasy knocks back).
- **Stove fires**: now and then a station catches fire (it stops cooking and can't throw, and drains the truck): tap it 3 times to put it out. Spicy dishes and burners catch fire more.
- **Staff** (hired from the shop after a shift, max 4): Sous Chef Gordon (third burner), Waiter Wendy (+35% tips), Dishwasher Dave (cooler kitchen, auto-extinguishes), Bouncer Bruno (less chewing), Intern Kevin (free, cooks 25% faster).
- Hangry waves arrive every ~20 s. Customers who reach the counter chew on the truck; Karens throw complaints you can tap or shoot down.

## Test
`node tests/foodtruck-bot.mjs [runs] --shots dir` (Playwright bot, landscape + portrait rotation check). Serve with `node prototypes/foodtruck/serve.mjs` (port 8081).

## Map art (Pixel Lab, top-down)
Everything on the driving map is top-down Pixel Lab art in `assets/tt/`: the food truck (animated, rumbling, recoloured per truck and per rival), a donut-siren cop car (animated), minion cars (sedan, van, bus, scooter, muscle car, armoured pickle truck) that are rotated to face their heading and hue-tinted for variety, rooftop food statues on the buildings (hot dog, burger, donut, taco animated, pizza), animated googly-eyed trees and broccoli bushes, and landmark art in every stop (gas pumps, kitchen, garage, picnic rush, golden spatula stage). Sheets named `*_a.png` are 9 columns x 2 rows (row 2 is the animation). Cars honk funny things when they ram you and the truck leaves a dust trail.

## Sunny Town: detailed angled top-down art (assets/sl/)
Sunny Town now uses the new detailed painterly style (style-anchored Pixel Lab sprites). The ground (pavement, roads, crosswalks, lane marks, bins, hydrants, manholes, lawns, plazas) is baked per 512px chunk; shopfronts (3 variants, stacked in rows facing the street), cafe terraces, trees and the stop landmarks (rush plaza, kitchen, garage, gas station, cook-off stage) are y-sorted sprites with collision footprints. Every vehicle is an 8-direction sprite (food truck, taxi traffic, donut-siren cop car, van, bus, scooter, muscle car, armoured truck); rival trucks and traffic are hue-shifted. The player truck plays an attack animation (serving window flaps, recoil, smoke) in the direction it is firing. Other stages still use the older look. `slice.html` is the original standalone art test.

## Town life, obstacles, warnings, stops and music
- **Zoomed out** a little (0.78x) so you see more street.
- **Living town**: animated shops (fluttering awnings), trees, terraces and stop landmarks; pedestrians stroll the sidewalks (they hop out of the way, chat, and cannot be hit); traffic lights that cycle and that the civilian traffic obeys (so cars queue at red); steam from manholes, chimney smoke, bunting.
- **Road obstacles**: cones (knock them over, +heat), striped barriers and a parked wagon (solid), potholes (damage and slow) and oil slicks (you slide). Cops and minions get stuck on them too.
- **Warnings**: cops now arrive almost straight away (heat 8+) and each warning adds more cops. Crashes, cones and traffic raise warnings, keeping to a stop lowers them. The HUD shows WARNINGS stars (max 5).
- **Stops** have painted bays, fluttering bunting, a pulsing border and an animated landmark. Parking triggers an entry animation: the truck pulls in, the camera zooms, an iris closes with an ENTERING banner, and the iris opens again when you leave.
- **Music**: the Eighth Arcanum procedural score engine (`score.js`, copied from Ridgeline) now plays per scene (title/stages, driving battle themes whose energy follows your warnings, shift theme, hub for kitchen/mechanic/gas, shop for results, victory/defeat). Mute with the title-screen button.

## Street fun layer (Sunny Town)
Things that give you something to chase, risk or cause every few seconds while driving:
- **Loot**: everything you kill drops coins and an XP gem instead of paying out directly, plus a small chance of a petrol can, a repair kit, a nitro bottle or a weapon crate. Loot pops out, bounces and is pulled to you when you are close. Smashing crates and stalls drops it too.
- **Coin trails**: every ~14 s a line of coins appears along a nearby road. Mystery weapon crates (with a light beam) appear on the road every ~35 s.
- **Drive-by customers**: people on the pavement wave you down with a dish bubble and a countdown ring. Roll slowly past (under ~125 px/s, so no nitro) for half a second to sell them a dish. Their favourite dish (one you carry) pays 50% more.
- **Tip streak**: sales, coins, near misses with traffic, smashes, crates and air time build a streak that multiplies coin and sale cash (up to x3). It drops after 4.5 s of nothing.
- **Nitro**: refills as you drive well (and from near misses, sales, ramp landings, pickups). Tap the NITRO button (or Space/Shift) to burn it: 1.7x speed, flames, and you ram minions, cops and rivals for damage. Too fast to sell to customers.
- **Ramps and boost pads**: wooden ramps launch the truck into the air (no collisions with traffic/obstacles; landing shockwave hurts nearby enemies and pays coins). Blue chevron pads give a speed burst.
- **Smashables**: market stalls (fruit, flowers, tacos) are solid unless you hit them at speed (or nitro): they explode into produce and coins (+2 heat). Crates break on touch. Stalls block cops and minions too.
- **Weapon pickups** (16 s): Ketchup Cannon (5-shot piercing fan), Flame Trail (burning fire behind you), Ice Slick (slows chasers), Pie Turret (homing pies). Shown in the HUD with a timer.

Test: `node tests/foodtruck-fun.mjs [--shots dir]` checks ramps, stalls, crates, loot, customers, nitro and all four weapons.

## Solid traffic
Cars are solid: the truck can no longer drive through civilian cars, minions, cops or rivals. A crash shoves the car away (it stalls for a second and eases back to its lane), bounces the truck, costs HP and adds heat in proportion to the impact speed (gentle bumps are free). With nitro on you bowl cars aside for free (+streak, +heat) instead.

## Stop buildings and a softer town (Sunny Town)
- **Stops are real buildings** now (Pixel Lab, `assets/sl/bld_*.png`): the diner/food hall (lunch rush), bakery kitchen, garage, gas station with a canopy, and the cook-off theatre. Each stands on the street frontage of its block at 1.5x scale with a glowing doorway, ambient animation (chimney smoke, string lights, welding sparks, fireworks, door glow) and a name sign above the roof. The rest of the block is filled with shops around it.
- **Entering**: pull up on the pavement in front of the door (a pulsing painted mat with chevrons marks the spot) and stop for 0.7 s. The camera zooms in, the truck drives into the doorway and disappears behind the facade, the iris closes with an ENTERING banner. The old giant tinted lot squares and separate parking pad are gone.
- **Softer layout**: road junctions have rounded kerbs, park blocks have a winding path and (often) a round pond with lily pads, plaza blocks have a round fountain with spray. The road network underneath is still a grid.

## All-Pixel-Lab art pass (town and UI)
- **UI skin** (`assets/ui/`): 9-slice panel and button frames (`panel`, `btn`, `btn_main`, `btn_dis`) used by every `panel()` and `btn()` call, plus 32px icons: 5 dishes (`d_*`), 5 flavours (`f_*`), 10 dash trinkets (`r_*`), 8 perks (`p_*`), 6 car upgrades (`u_*`), 5 staff portraits (`s_*`), 4 combos (`c_*`) and HUD icons (`i_coin`, `i_fuel`, `i_heart`, `i_star`, `i_siren`, `i_nitro`, `i_kit`, `i_gem`, `i_weap`). Dishes in the kitchen, level-up cards, stations, chain panel and projectiles use the icons through `food()`. If an image is missing the old vector drawing is the fallback.
- **Town variety**: 11 shopfronts (bakery, pizzeria, sushi, ice cream, bookshop, florist, arcade, barber + the first three), 4 tree types (oak, maple, cherry blossom, pine), planter bushes, street lamps, benches, bins and hydrants as sprites along every street.
- **Pedestrians**: 8 new characters (suit, jogger, shopper, skater, old man, tourist, kid, student) with 8-frame walk cycles east/south (north uses the back view, west mirrors east). The drive-by customers use them too.
- **Traffic**: hatchback, pickup and taxi join the sedan for civilian and hostile traffic; the Burger Baron, Frosty Freddie, Pizza Pete and Dessert Dolly rivals have their own truck models.
- **Fun layer**: market stalls (fruit, flowers, tacos), crates, ramps, boost pads, potholes, oil slicks, fire and ice patches, ketchup and pie shots are all sprites now.
- **Ground**: asphalt, paving, lawn and plaza use Pixel Lab tiles (`gt_*`, 28px crops baked into 112px patterns) instead of code-drawn noise.
- Tools in `tests/`: `asset-sheet.mjs` (contact sheet of a folder), `pl-dl.mjs` / `pl-dl8.sh` (download Pixel Lab results), `trim-png.mjs`, `build-peds.mjs`.
