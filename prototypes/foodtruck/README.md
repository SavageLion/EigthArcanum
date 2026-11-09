# Hot & Hangry: a food truck roguelike (prototype)

Forced landscape phone game (a portrait phone rotates the screen automatically). One self-contained file, `index.html`, plus a few sprites.

Run it: `node prototypes/foodtruck/serve.mjs` then open http://localhost:8081 (add a port number to change it). On a phone on the same Wi-Fi use your PC's address instead of localhost. Desktop: WASD or arrows to drive, Enter to start, 1-3 to pick upgrades, P to pause.

## The run: a road trip to the Golden Spatula Cook-off
Three legs (Town, Highway, Coast). Each leg is a long scrolling road with traffic; the leg ends in a **cook-off** shift against a boss (the Local Blogger, the Celebrity Chef, the Food Critic). Win the last one to win the run.

- **Driving:** drag up and down to change lane through the traffic, left and right to slow down or speed up. Crashes cost health and slow you; crates on the road give a free flavour for the next shift.
- **Petrol** is limited. Driving burns it (faster burns more), every stop costs a little, and running out strands you (a tow costs $40, or the run ends). Gas stations sell more, cheaper if your reviews are good.
- **Exits:** every so often the road offers a fork with an exit up and an exit down, with signs saying what is there. Steer onto a ramp to take it. Skip both and nothing happens, but you miss the stop.
- **Stops:**
  - **Lunch rush:** the shift (below), at a venue with its own rules.
  - **Kitchen:** fuse two of your dishes into one new fusion dish (it frees a menu slot), or pay for a master class to level a dish.
  - **Mechanic:** car upgrades: engine, fuel-saver tyres, armour, a second window (+1 projectile), a bigger vent (less kitchen heat and inspection), a bigger tank, plus repairs.
  - **Gas station:** buy petrol.
- **Reviews:** after every shift you get a star review from how many customers you fed, your damage and kitchen fires, with a written quip. The average rating changes your tips, petrol price and inspection.
- **The health inspector:** an inspection meter rises from kitchen fires, every shift, and bad reviews (it falls with good reviews and a bigger vent). At 100% the inspector's van appears behind you and gains on you; your dishes fire backwards to slow it (frozen and greasy food slow it more), and taking any exit loses it. If it catches you the truck is shut down and the run is over.

## The shift
Your truck drives around the lot (drag the left side) and fires food out of its window at the nearest customers. Feed customers to earn tips and experience; angry customers pound on the truck and Karens throw complaints. Level up for a choice of three: a new dish, a dish level, a flavour or a perk. After each shift: a shop, a repair and one of three relics.

## Build
- **Dishes** (up to 4): Burger, Hot Dog (pierces), Taco (shotgun), Pizza (boomerang), Ice Cream (lobbed splash), and fusions made in the kitchen.
- **Flavours** (up to 2 per dish): Spicy (burns and spreads, but heats your own kitchen: too much and the truck catches fire), Frozen, Sour, Sweet, Greasy.
- **Recipes:** a dish at level 3 with a flavour becomes a named recipe (Inferno Burger leaves fire puddles, Fire Taco ignites neighbours, Frosty Taco freezes, Pickle Dog pierces further, Dessert Pizza drops tips, Double Smash bounces).
- **Trucks:** Rusty Red (tougher, starts with burgers) and Teal Taco (faster, starts with tacos).

## Testing
`node tests/foodtruck-bot.mjs [runs] [--shots dir]` plays whole runs with an autoplay bot in a landscape viewport (it drives the road, picks exits and uses the stops), checks that a portrait phone rotates the game, and reports page errors.
