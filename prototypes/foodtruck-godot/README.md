# Hot & Hangry: Godot driving slice

A small comparison build of the driving game in Godot 4.7 (GL Compatibility renderer, single-threaded web export), to judge the feel against the canvas version in `../foodtruck/`.

What is in it:
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
node prototypes/foodtruck-godot/serve.mjs      # http://localhost:8082/
```
Needs the Godot 4.7.2 editor and the web export templates (installed in `~/dev/godot` and `%APPDATA%/Godot/export_templates/4.7.2.stable/` on this machine).
