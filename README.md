# Solmar Bay — open-world crime game

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/tothimai196xx-lgtm/solmar-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/tothimai196xx-lgtm/solmar-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Solmar Bay** is an original open-world crime game built for make.fun's
"Make GTA 6" bounty (gta6-01, repo `solmar-bay`). You are Rio Calder, a driver
fresh off the ferry in a sun-soaked coastal city, taking five jobs from fixer
Mara Voss while the Bay Police watch every move. Explore the city on foot or
behind the wheel, steal cars, dodge the law, and earn your way to owning the
bay. Built by an AI agent for make.fun's "Make GTA 6" bounty, $1,666 in USDC.

Play it here: https://make.fun/r/wxz47nrz

## The game

- **A city to explore:** a procedural coastal city — gridded streets, ~100
  pastel towers with lit windows, palm-lined promenade, beach and sea, all
  under a golden-hour sky. Everything is generated from a seed, so the city
  is the same every run.
- **On foot and by car:** third-person walking with a smooth chase camera,
  arcade driving with steering, braking and handbrake slides.
- **Traffic and pedestrians:** 11 NPC cars looping the street grid and 16
  pedestrians strolling the sidewalks — they flee from gunfire and speeding
  cars.
- **Steal and drive:** walk up to any NPC car and press E to take it. Stealing
  raises your wanted level.
- **Wanted 0–5 stars:** crimes (theft, assault, shooting, hitting pedestrians
  or police) raise the heat. Bay Police cruisers chase and ram you, their
  light bars flashing. Lose them and the stars cool off; get caught and you
  are busted.
- **Five story missions** from Mara Voss: steal a car for the marina lockup,
  a timed taxi fare, five packages across the city, 60 seconds evading a
  3-star wanted level, and a finale — grab the briefcase and run the cordon
  home. Each pays out, unlocks the next, and can be replayed on failure.
- **Combat:** pistol with raycast shots, punches, muzzle sparks, screen shake,
  and health/ammo crates around the city.
- **HUD and minimap:** money, health, ammo, wanted stars, speed, clock,
  mission tracker, and a live 2D minimap with streets, the player arrow,
  mission blips and police blips.
- **Sound and save:** fully synthesized WebAudio (engine, sirens, gunshots,
  pickups, a bass line) — no audio files. Progress (money, missions, position)
  saves to localStorage with a Continue option.

## Controls

| Key | Action |
| --- | --- |
| W A S D | Move on foot / drive |
| Shift | Run |
| E | Enter / exit (steal) a car |
| F or mouse click | Shoot |
| Space | Jump on foot / handbrake in a car |
| R | Change camera |
| P | Pause |
| M | Mute |
| Enter | Start / continue mission, dismiss menus |

## Missions

1. **Hot Wheels** — steal a car and deliver it to the marina lockup ($600).
2. **The Fare** — pick up the client at Palm Plaza, reach the airport gate in time ($900).
3. **Five Packages** — collect 5 parcels scattered across the bay ($1,200).
4. **Sixty Seconds** — survive 60 seconds at 3 stars ($1,500).
5. **The Last Case** — take the briefcase at the harbour, escape to the safehouse ($3,000).

Finish all five and the bay is yours — free roam continues.

## How to run

```bash
node serve.ts
# then open http://localhost:8080
```

No build step, no network: the game is static files under `game/` and runs
offline in desktop Chrome. three.js r180 is vendored under `game/vendor/`.

## File layout

```
main.ts                  entrypoint: copies game/ + screenshots/ to /output, writes dossier.json
serve.ts                 static dev server (node serve.ts -> http://localhost:8080)
vendor/makefun-game.ts   kit library that builds the dossier
game/
  index.html             canvas + HUD DOM, loads src/main.js
  vendor/
    three.module.min.js  three.js r180 (module build)
    three.core.min.js    three.js r180 (core build, imported by the module build)
  src/
    config.js            tuning, palette, city/character/mission names
    random.js            seeded RNG (mulberry32) for a deterministic city
    city.js              procedural city: streets, towers, palms, beach, sea, sky
    vehicles.js          car models, arcade driving, NPC traffic
    people.js            pedestrians who stroll and flee
    player.js            Rio on foot, stealing cars, chase camera
    police.js            wanted 0-5 stars, cruiser chases, busted/wasted
    missions.js          five story missions from Mara Voss
    combat.js            pistol, punches, pickups, sparks, shake
    audio.js             synthesized WebAudio: engine, siren, shots, music
    hud.js               HUD, minimap, dialogue, menus
    shots.js             the four screenshot scenes + autopilot
    main.js              boot, fixed-step 60 Hz loop, state machine, save/load
screenshots/            1-start.jpg, 2-drive.jpg, 3-wanted.jpg, 4-mission.jpg
```

## Local test results

- Playwright (headless Chrome, 2026-11-17) runs of all four `?shot=...&seed=1`
  scenes: **0 console errors, 0 page errors, 0 failed requests** on every run.
- Keyboard playtest in the same browser: WASD movement, E car entry/exit
  (steal verified: wanted rose to 1 star, drove at 69 km/h), F shooting
  (ammo 24 → 23), Enter mission start, P pause/resume — all verified live,
  0 errors.
- Mission flow verified live: mission 1 "Hot Wheels" completes on reaching
  the marina lockup ($250 → $850, "Hot Wheels — complete!").
- Determinism: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` exits 0;
  two runs produce byte-identical output trees (`diff -r` clean).
- Caps (measured): game/ 16 files, 799,255 bytes (limit 993 files / 48 MiB);
  index.html 4,263 bytes (limit 1 MiB); dossier.json 579,561 bytes (limit
  1.5 MiB) with text 80,281 bytes (limit 160 KiB); each screenshot 1280×720
  JPEG, 74–102 KiB (limit 256 KiB).
- Kit check: `makefun check --worktree` — 4 passed, 0 failed (the remaining
  items are submission-time checks: public repo, push, owner file).

## Credits

Original game: city, characters, story, art and sounds are all original works
created for this bounty. No names, characters, maps or assets from any
commercial game are used. three.js is MIT-licensed. This project is MIT-licensed.
