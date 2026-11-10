# Hot & Hangry: Godot build (driving slice + stage 1: stops and shifts)

A small comparison build of the driving game in Godot 4.7 (GL Compatibility renderer, single-threaded web export), to judge the feel against the canvas version in `../foodtruck/`.

## Stage 1: stops and shifts
Stops are real buildings on the curvy road (8 per lap: 3 lunch rushes, kitchen, mechanic, 2 gas stations, cook-off). Park on the pavement mat in front of the door for 0.7 s: the camera zooms, the truck drives in behind the facade, the iris closes. Inside:
- **Lunch rush / cook-off**: the window-view shift (`shift.gd`, ported from the canvas version): cook with limited burners, flick dishes at customers, 3-throw combos, stove fires, staff, hangry waves, boss. Level-ups interrupt it.
- **Kitchen** (fuse / master class), **Mechanic** (6 upgrades, repair), **Gas** (buy petrol), **Results shop** (3 offers + staff, a dash trinket, repair, review) and the **Level-up** picker, all in `screens.gd`.
- Shared run state and rules in `run.gd` (autoload `Run`), tables in `data.gd`, Pixel Lab UI skin + helpers in `ui.gd`.
- Petrol drains as you drive and the cook-off unlocks after 3 lunch rushes.
- Not yet ported: weapon pickups, potholes/oil/cones, traffic lights, pedestrians (only the drive-by customers), title/stage screens, saving, music, the other four stages.

## Stage 2: the road fights back (`combat.gd`)
- **Heat and the Food Police**: warnings rise while you drive and with crashes, shifts and smashed stalls; from 8% heat cops spawn on the road and chase (more per warning, up to 6). Several cops touching you fill the bust meter (BUSTED = run over). Lose them by getting 800 px away for 6 s; entering a stop clears them.
- **Hangry swarm**: ordinary cars (sedan, hatchback, pickup, taxi, scooter, van, bus, charger, armoured truck) spawn on the road, chase and ram you in growing waves.
- **Rival trucks**: six named rivals (own truck models) keep their distance, circle and shoot flavoured food (frozen/sour slow, spicy burns). Beat one for cash, loot and a stolen recipe.
- **Auto-fire**: your dishes shoot the nearest enemies (flavours chill, stun, burn); nitro rams enemies for damage.
- **Loot**: kills drop coins, XP gems, petrol, repair kits and nitro; coins are pulled in as you get close; a **tip streak** multiplies the cash (x1 to x3).
- **Drive-by customers**: people on the pavement ask for a dish; roll past slowly (under about 200 px/s, so not on nitro) to sell. Their favourite dish pays 50% more.
- **Road fun**: breakable crates and fruit/flower/taco stalls (hit stalls fast), ramps (airtime, landing shockwave, big tips) and boost pads.
- **Minimap** (top right) with the ring, stops, rivals and cops, **level-ups while driving**, and a **FULL** button (top right, on every screen): fullscreen and a landscape lock where the browser allows it.
- Extra debug parameters: `?heat=40` (starting warnings, no grace), `&log=1` (print combat stats in a desktop run), `&auto=1` laps the ring.

Debug URL parameters (also `--name=value` on the command line): `?tp=gas|shift|kitchen|mechanic|cook` teleports to that stop (add `&view=1` to look without entering), `?stop=shift|gas|mechanic|kitchen|levelup|results` opens a screen directly, `&bot=1` plays the shift with a bot, `?auto=1` laps the ring, `&speed=10` speeds up time. Screenshot helper: `node tests/godot-shot.mjs <outdir> 9000 "tp=gas" "stop=results"`.

What is in the driving slice:
- A **closed, curvy ring road** (a `Curve2D`, about 7,500 px long) instead of a grid. Road, kerb, pavement and grass are drawn as lines/areas with a world-space tiling shader so the Pixel Lab tiles stay pixel-perfect on any curve.
- Shops, trees, lamps, benches, bins and hydrants from the existing Pixel Lab art, y-sorted.
- **Physics vehicles** (`vehicle.gd`, a `RigidBody2D`): engine force along the heading, tyre grip that removes sideways slide (Space = handbrake drift), speed-dependent steering, nitro, and real momentum collisions between the truck, traffic and buildings.
- 16 ambient cars that follow the road curve in two lanes and brake for what is in front.
- Camera lead and speed zoom, screen shake and sparks on crashes, dust trail.
- Controls: WASD/arrows, Space drift, Shift nitro, or touch/mouse: drag anywhere to steer, tap the on-screen DRIFT/NITRO buttons.
- `?auto=1` runs an autopilot that laps the ring (used for headless testing).

Build and run:
```
godot --headless --path prototypes/foodtruck-godot --import
godot --headless --path prototypes/foodtruck-godot --export-release "Web" build/index.html
node prototypes/foodtruck-godot/serve.mjs      # http://localhost:8082/ and https://<lan ip>:8083/
```
Needs the Godot 4.7.2 editor and the web export templates (installed in `~/dev/godot` and `%APPDATA%/Godot/export_templates/4.7.2.stable/` on this machine).

Phone note: Godot's web build needs a secure context, so plain `http://<lan ip>:8082` shows "Secure Context ... use HTTPS". Use the HTTPS port instead and accept the one-time self-signed certificate warning. Make the certificate (not committed) with:
`openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365 -subj "/CN=<lan ip>" -addext "subjectAltName=IP:<lan ip>,IP:127.0.0.1,DNS:localhost"`
