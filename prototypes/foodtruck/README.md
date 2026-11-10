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
Everything on the driving map is top-down Pixel Lab art in : the food truck (animated, rumbling, recoloured per truck and per rival), a donut-siren cop car (animated), minion cars (sedan, van, bus, scooter, muscle car, armoured pickle truck) that are rotated to face their heading and hue-tinted for variety, rooftop food statues on the buildings (hot dog, burger, donut, taco animated, pizza), animated googly-eyed trees and broccoli bushes, and landmark art in every stop (gas pumps, kitchen, garage, picnic rush, golden spatula stage). Sheets named  are 9 columns x 2 rows (row 2 is the animation). Cars honk funny things when they ram you and the truck leaves a dust trail.
