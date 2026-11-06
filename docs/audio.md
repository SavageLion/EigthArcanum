# Audio

The game has a built-in synth for every sound, and plays recorded files when it finds them.
Nothing here is required: with no files, the synth plays.

## Generated score (default)
With no music files registered, the game plays a procedural score built in code (`src/core/score.ts`). Every boss has its own theme:

| Boss | Sound |
|---|---|
| Cinder King | fast phrygian-dominant, driving saw bass, square arps |
| Frost Matron | lydian, glassy 16th-note arps and bells |
| Hollow Bell | slow, tolling low bell on every bar, sparse |
| Storm Eye | frantic harmonic minor, 16th bass, snare fills, thunder |
| Mother of Thorns | a twisted waltz in 3/4 |
| Bone Tyrant | locrian death march |
| Mirror Witch | whole-tone, mirrored arpeggios with echoes |
| Void Sovereign | very slow, droning, choir pad and dissonance |
| Drowned Queen | slow 6/8 tide with bubbling blips |
| Clockwork Judge | mechanical: ticking hats, staccato square arps |
| Hive Mother | buzzing detuned fast arps |
| Ash Widow | creeping chromatic bass, jazzy sevenths |
| Sand Prophet | desert phrygian-dominant with hand drums |
| Emperor | regal four-on-the-floor with brass-style stabs |
| High Priestess | harp arps and choir, no drums |
| Devil | relentless double-kick, distorted 16th bass |

Also: `shop`, `reward` (after a win), `draw`, `title`, `victory`, `defeat`.

**Variety rules**
- *Energy* (0-3) layers the band in: 1 adds arpeggios, 2 adds drums and signature sounds, 3 adds the lead. A fight's energy rises as the run progresses (the first quarter is 1, the middle 2, the end 3); elites get +1 and a faster tempo.
- *Enrage* switches to full energy plus a frenzy (faster tempo, extra hats).
- *Arena* changes the tempo: face-off 90%, orbit 97%, open arena 105%.
- Every third four-bar phrase drops the drums for a breather; each theme alternates two chord loops and repeats a composed four-bar melody.
- Runs longer than 16 bosses reuse each theme in a new key.
Previews of every theme render to `docs/music-preview/*.wav` (git-ignored). Edit `THEMES` in `score.ts` to retune.
Recorded files, when added below, replace it slot by slot.

## Adding recorded audio
1. Put music in `public/assets/audio/music/` and effects in `public/assets/audio/sfx/` (mp3, ogg, aac or wav).
2. Register them in `public/assets/audio/manifest.json`:
   ```json
   { "volume": { "music": 0.5, "sfx": 0.8 },
     "music": { "title": "title.mp3", "draw": "cards.mp3", "battle": "battle.mp3", "elite": "elite.mp3", "victory": "victory.mp3", "defeat": "defeat.mp3" },
     "sfx":   { "cast": "cast.aac", "explosion": "boom.aac", "lightning": "zap.aac" } }
   ```
3. Reload. Music loops (victory and defeat play once) and crossfades between screens. The mute button silences both.

### Music slots
`title` (menu), `draw` (card pull, rewards, shop), `battle` (normal fights), `elite` (elite fights), `victory`, `defeat`.

### Effect slots
`cast hurt block strike toll coin pick win lose rage explosion ice lightning shield blink beam chest mimic shuffle card`

## Artlist (as of Nov 2026)
The connected Artlist account is on a **free trial with no AI credits**: it has one free AI generation in total,
music downloads are watermarked, and sound-effect downloads are not available. So nothing from Artlist is bundled.
The tracks below are candidates to audition (links open Artlist) once there is a subscription; check the licence
terms cover use inside a published game.

### Music candidates
| Slot | Track | Why |
|---|---|---|
| title | [Tumannoye Ozero (The Misty Lake)](https://artlist.io/royalty-free-music/song/tumannoye-ozero-the-misty-lake/109414) - Ian Post, 3:14 | moody, atmospheric |
| title / draw | [Marionette](https://artlist.io/royalty-free-music/song/marionette/134794) - Noa Ozer, 1:58 | string duet, eerie puppet-master feel for the card-dealing hands |
| battle | [Heard](https://artlist.io/royalty-free-music/song/heard/6001955) - Jeremy Chontow, 2:52, 163 bpm | driving, intense |
| battle | [Signal Collapse](https://artlist.io/royalty-free-music/song/signal-collapse/6001872) - Heron Vale, 2:15 | tense |
| elite / boss | [Attya Ensoria (Instrumental)](https://artlist.io/royalty-free-music/song/attya-ensoria-the-holy-and-the-damned-instrumental-version/65573) - Ian Post, 3:40 | dark, choral, epic |
| elite / boss | [Skaldernes Sang](https://artlist.io/royalty-free-music/song/skaldernes-sang/131010) - Blackbard, 3:06 | heavy, ritual |
| defeat | [What Tears Are Shed at the Depths of the Damp Monastery?](https://artlist.io/royalty-free-music/song/what-tears-are-shed-at-the-depths-of-the-damp-monastery-prelude-in-em-op-28-no-4/131761) - Shatzlan, 2:04 | somber piano |
| defeat | [Veil of Dawn - Piano](https://artlist.io/royalty-free-music/song/veil-of-dawn-creative-cut-piano/6001948) - Damon Power, 1:19 | gentle, sad |
| victory | none good in the first search; try "triumphant" / "fanfare" queries | |

### Sound-effect candidates
| Slot | Clip |
|---|---|
| cast | [Absolute Magic - Fire Spell Cast](https://artlist.io/sfx/track/absolute-magic---fire-spell-cast/100743), [Black Magic - Whizzing Whoosh, Wand Spell Cast](https://artlist.io/sfx/track/black-magic---whizzing-whoosh-wand-spell-cast/66349) |
| explosion | [EXPLOSION, fire hit](https://artlist.io/sfx/track/explosion-fire-hit/29396) |
| ice | [Icepick Break, Ice Debris](https://artlist.io/sfx/track/material-manipulation---icepick-break-ice-debris/65166) |
| lightning | [Thunder Wrath Strike](https://artlist.io/sfx/track/dd-adventure---thunder-wrath-strike/118222), [Lightning Shockwave, Rumbling](https://artlist.io/sfx/track/extreme-climate---lightning-shockwave-rumbling/71080) |
| shuffle | [Shuffling Deck of Cards](https://artlist.io/sfx/track/board-games---shuffling-deck-of-cards/56355), [Cards, Fast Shuffle](https://artlist.io/sfx/track/casino-central---cards-fast-shuffle/78649) |
| chest | [Open Treasure Chest With Gold Coins, Reward](https://artlist.io/sfx/track/fantasy-world---open-treasure-chest-with-gold-coins-reward/121409), [Gold Treasure Chest Open](https://artlist.io/sfx/track/vibrant-game---gold-treasure-chest-open/101651) |
| mimic | [Monster Bite, Growl, Attack](https://artlist.io/sfx/track/evolved-creatures---monster-bite-growl-attack/64916) |
| coin | [Dropping Pennies on A Wooden Table](https://artlist.io/sfx/track/coins---dropping-pennies-on-a-wooden-table-/131163) |

No candidates yet for shield, blink, beam, hurt, block, win/lose stingers: search "magic shield", "teleport", "energy beam", "player hit", "victory sting".
