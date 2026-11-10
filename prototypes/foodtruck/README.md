# Hot & Hangry

Forced-landscape phone food-truck roguelike. Single file (`index.html`), canvas, Pixel Lab art.

## The run
Three legs (Town, Downtown, Golden Spatula). Each leg is a **free-roam city**:

- **Drive**: touch anywhere to steer (floating joystick; a ghost joystick shows bottom-left). WASD/arrows on desktop. Petrol is limited.
- **Park** inside a coloured lot for ~0.7 s to enter it: Lunch Rush (x4 venues, serve 3 per leg), Kitchen (fuse dishes), Mechanic (car upgrades), Gas, Cook-off (boss shift that wins the leg).
- **Food Police**: heat (WANTED stars) rises from shifts, kitchen fires, bad reviews and crashes. Cops chase, ram you and try to box you in (bust meter fills -> run over). Lose them by getting >500 px away for 6 s; parking in a lot clears them.
- **Rival trucks**: six named rivals (Taco Tyrant, Burger Baron, Frosty Freddie, Sour Sue, Pizza Pete, Dessert Dolly) roam the city, 2 at a time on leg 1 up to 4 on leg 3. They shoot flavoured food (frozen/sour slow you, spicy burns) and ram. Your truck auto-fires at the nearest rival or cop. Beat one for cash plus a stolen recipe (free perk/dish/flavour card).
- **Map**: wide map top-right with markers ($ rush, K kitchen, M mechanic, G gas, * cook-off, R rival, white = you). Tap it for the full city map. Edge arrows point to off-screen stops.

## The shift (window view)
You are inside the truck looking out of the serving window; customers march up the street and chew on the counter if they reach it. There is no gun: **staff and meal prep** do the work.

- **Prep**: each dish has a big counter station. Tap it when the marker is in the green (yellow centre = PERFECT: +3 portions and the next 2 volleys hit 1.5x; green +2; outside = BURNT). Dishes are thrown from their station only while they have portions.
- **Focus**: tap a customer to make the whole kitchen target them.
- **Staff** (hired from the shop after a shift, max 4): Sous Chef Gordon (auto-preps), Waiter Wendy (+35% tips), Dishwasher Dave (cooler kitchen), Bouncer Bruno (less chewing), Intern Kevin (free, lucky extra portions).
- Level-ups give dishes, flavours and recipes (dish lv3 + flavour). Spicy overheats the kitchen; Karens throw complaints you can shoot down.

## Test
`node tests/foodtruck-bot.mjs [runs] --shots dir` (Playwright bot, landscape + portrait rotation check). Serve with `node prototypes/foodtruck/serve.mjs` (port 8081).
