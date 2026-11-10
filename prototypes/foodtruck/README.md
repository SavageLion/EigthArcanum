# Hot & Hangry

Forced-landscape phone food-truck roguelike. Single file (`index.html`), canvas, Pixel Lab art.

## The run
Three legs (Town, Downtown, Golden Spatula). Each leg is a **free-roam city**:

- **Drive** (left thumb = virtual joystick; WASD/arrows on desktop). Petrol is limited.
- **Park** inside a coloured lot for ~0.7 s to enter it:
  - **Lunch Rush** (x4 venues) - the shift. Serve 3 per leg to unlock the cook-off.
  - **Kitchen** - fuse two dishes into a new one ($20).
  - **Mechanic** - car upgrades (engine, tyres, armour, window, vent, tank).
  - **Gas** - refuel (price drops with a good rating).
  - **Cook-off** - boss shift that wins the leg.
- **Food Police**: heat (WANTED stars) rises from shifts, kitchen fires, bad reviews and crashes. Cops chase, ram you and try to box you in (bust meter fills -> run over). Your truck auto-fires food at nearby cops; lose them by getting >500 px away for 6 s. Parking in a lot clears them.

## The shift (window view)
Inside the truck, looking out of the serving window. Customers march up the street; if they reach the counter they chew on the truck. **Touch the street to aim** the food cannon (auto-aims at the closest customer when you let go). Dishes auto-fire; level-ups give new dishes, flavours, recipes (dish lv3 + flavour). Spicy overheats the kitchen. Karens throw complaints that you can shoot down.

## Test
`node tests/foodtruck-bot.mjs [runs] --shots dir` (Playwright bot, landscape + portrait rotation check). Serve with `node prototypes/foodtruck/serve.mjs` (port 8081).

## Kitchen prep (in the window view)
Dishes only fire if you have portions. Tap a dish's counter station when the moving marker is in the green zone: yellow centre = PERFECT (+3 portions and the next 2 volleys hit 1.5x), green = +2, outside = BURNT (station locks briefly). Portions trickle back slowly on their own.

## Rival trucks (city)
Named rivals (Taco Tyrant, Burger Baron, Frosty Freddie, Sour Sue) roam the city, shoot flavoured food (frozen/sour slow you, spicy burns) and ram you. Your truck auto-fires at the nearest rival or cop. Beat one for cash plus a stolen recipe (a free perk/dish/flavour card). Rivals get tougher each leg.
