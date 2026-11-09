# Hot & Hangry: a food truck roguelike (prototype)

Forced landscape phone game (a portrait phone rotates the screen automatically). One self-contained file, `index.html`, plus a few sprites.

Run it: `node prototypes/foodtruck/serve.mjs` then open http://localhost:8081 (add a port number to change it). Desktop: WASD or arrows to drive, Enter to start, 1-3 to pick upgrades, P to pause.

## The run
Five shifts. Each one:
1. **Drive around town for a parking spot.** You have 45 seconds to find one of three yellow boxes (each is a different venue). Dodge traffic, grab crates (chili, ice, lemon, sugar, oil) for a free flavour this shift, and park by stopping in the box. Arrive early for a tip bonus. Run out of time and you get the nearest spot (and a dent).
2. **Serve the rush.** Your truck drives around the lot (drag the left side of the screen) and fires food out of its window by itself at the nearest customers. Feed customers to earn tips and experience. Angry customers pound on the truck; Karens throw complaints from a distance.
3. **Level up** for a choice of three: a new dish, a dish level, a flavour or a perk.
4. **Shop and relic** after the shift: spend tips on upgrades, repair the truck, pick one of three relics.
The last shift is the **Food Critic** at the gala: feed the boss before closing time.

## Build
- **Dishes** (up to 4): Burger, Hot Dog (pierces), Taco (shotgun), Pizza (boomerang), Ice Cream (lobbed splash). Levels add damage and, every other level, projectiles.
- **Flavours** (up to 2 per dish): Spicy (burn that spreads between customers, but it heats your own kitchen: too much and the truck catches fire), Frozen (slow), Sour (stun and extra damage), Sweet (double tips, homing), Greasy (knockback and a slip).
- **Recipes:** a dish at level 3 with a flavour becomes a named recipe (Inferno Burger leaves fire puddles, Fire Taco ignites neighbours, Frosty Taco freezes, Pickle Dog pierces further, Dessert Pizza drops tips, Double Smash bounces).
- **Perks and relics** change projectile count, fire rate, damage, speed, tip pickup range, armour, food size, tips, burn, chill, stun and heat.
- **Trucks:** Rusty Red (more health, starts with burgers) and Teal Taco (faster, starts with tacos).

## Testing
`node tests/foodtruck-bot.mjs [runs] [--shots dir]` plays whole runs with an autoplay bot in a landscape viewport, checks that a portrait phone rotates the game, and reports page errors. Art: the trucks are Pixel Lab images; the customers reuse the Ridgeline characters.
