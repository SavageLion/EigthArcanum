Raven Astrologer, Pixel Lab pro mode, low top-down, 8 directions each. Concept: concept.png (in raven-astrologer/).
  raven-astrologer/  32px  (first pass, unused now)
  raven-64/          64px  (unused: figure too small at 2x)
  raven-80/          80px  -> public/assets/wizard/arena/   (open field, orbit, open arena: faces the boss)
  raven-112/         112px -> public/assets/wizard/large/    (north = face-off back view, south = front view for UI)
Pixel Lab ids: 32 7df3380d-..., 64 ff4bf781-..., 112 18f98419-..., 80 24286acc-1558-4ed9-886e-4db3c0148238

Animations (Pixel Lab template clips, 1 gen/direction):
  raven-80-anim/   idle(breathing-idle) walk(walking-6-frames) cast(fireball) hurt(taking-punch), all 8 directions -> anim/arena
  raven-112-anim/  idle, cast, hurt for north only (face-off back view) -> anim/large
Repack after regenerating: node tools/pack-wizard-anim.mjs
