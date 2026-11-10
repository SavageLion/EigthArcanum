# Hot & Hangry

Forced-landscape phone food-truck roguelike. Single file (`index.html`), canvas, Pixel Lab art.

## The run
Three legs (Town, Downtown, Golden Spatula). Each leg is a **free-roam city**:

- **Drive**: touch anywhere to steer (floating joystick; a ghost joystick shows bottom-left). WASD/arrows on desktop. Petrol is limited.
- **Park** inside a coloured lot for ~0.7 s to enter it: Lunch Rush (x4 venues, serve 3 per leg), Kitchen (fuse dishes), Mechanic (car upgrades), Gas, Cook-off (boss shift that wins the leg).
- **Food Police**: heat (WANTED stars) rises from shifts, kitchen fires, bad reviews and crashes. Cops chase, ram you and try to box you in (bust meter fills -> run over). Lose them by getting >500 px away for 6 s; parking in a lot clears them.
- **Rival trucks**: six named rivals (Taco Tyrant, Burger Baron, Frosty Freddie, Sour Sue, Pizza Pete, Dessert Dolly) roam the city, 2 at a time on leg 1 up to 4 on leg 3. They shoot flavoured food (frozen/sour slow you, spicy burns) and ram. Your truck auto-fires at the nearest rival or cop. Beat one for cash plus a stolen recipe (free perk/dish/flavour card).
- **Map**: wide map top-right with markers ($ rush, K kitchen, M mechanic, G gas, * cook-off, R rival, white = you). Tap it for the full city map. Edge arrows point to off-screen stops.

## The shift (window view): order tickets
You are inside the truck looking out of the serving window. Every customer walks up with an **order bubble** (a dish, sometimes with a required flavour ring). Pick a dish from the counter, then **tap or drag it onto the customer who ordered it**.

- Right dish: fed, tip, and **COMBO** (up to +64%). Wrong dish: they get angry (>:( ), move faster and chew harder, and your combo resets.
- Dishes serve extra matching customers (taco serves 3 at once; Intern Kevin and the Cast Iron Pan add more), so queue of mobs with the same order = big wins.
- Flavours on a serve: spicy x1.4 tips (heats the kitchen), frozen chills the whole queue, sour stuns the 3 nearest, sweet doubles tips, greasy pushes the crowd back.
- Customers who reach the counter chew on the truck. Karens throw complaints: tap them to dismiss.
- **Stove fires**: now and then a station catches fire (it can't serve and drains the truck): tap it 3 times to put it out. Spicy dishes catch fire more.
- **Staff** (hired from the shop after a shift, max 4): Sous Chef Gordon (auto-serves the front customer), Waiter Wendy (+35% tips), Dishwasher Dave (cooler kitchen, auto-extinguishes), Bouncer Bruno (less chewing), Intern Kevin (free, lucky extra serves).
- The Food Critic boss wants a run of orders (a new one after each correct serve).

## Test
`node tests/foodtruck-bot.mjs [runs] --shots dir` (Playwright bot, landscape + portrait rotation check). Serve with `node prototypes/foodtruck/serve.mjs` (port 8081).
