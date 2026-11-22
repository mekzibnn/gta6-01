[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/mekzibnn/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/mekzibnn/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# SOLMAR HEAT — sun-soaked open-world crime: 12 story missions, 5-star dispatch with RAM/PIT units and Air One, exploding cars and burning wrecks, district standing, weapon wheel, crew, races, empire

An open-world crime game in the golden-hour city of Solmar. Steal cars, outrun the KPD, run twelve story missions, buy up the town's businesses, hire a crew, race the strip, and build an empire — while the sun hangs low over the Marina and Air One circles overhead.

## Play

```sh
node serve.ts
# open http://localhost:8080 in desktop Chrome
```

- **W A S D** — drive / walk (W is the throttle, S the brake)
- **E** — steal a car, open a shop, get in and out
- **Space** — burn a nitro charge
- **Q (hold)** — weapon wheel, then **1–4** to pick, release to confirm
- **P** — pause (progress saves)
- **X** — abandon a race

## What is in the city

- **12 story missions** — from "Wheels Up" to "Crew Up", each with its own stages, dialogue and reward.
- **5-star dispatch** — the KPD answers the heat with patrol cars, and at three stars the RAM and PIT specialists arrive, named on the dispatch panel with their distance.
- **Air One** — the police helicopter, spotlight cone sweeping the streets.
- **Exploding cars and burning wrecks** — a car at zero health goes up, throws the driver out, and keeps burning on the road; the blast chains into the cars around it.
- **District standing** — Marina, Old Town, Docks, Hills and Downtown each keep score of what you do there.
- **Weapon wheel** — hold Q, pick a slot, release to confirm. Four slots, no ammo to count.
- **Crew** — Milo (handling +25%), Vera (heat decays slower), Tank (damage 1.5x). A hired mate also takes 10% off the garage.
- **Races** — Sprint, Circuit and Drag out of the Race Office, with entry fees, gates and prizes.
- **Empire** — four businesses to buy, each paying its hourly rate as the clock crosses the hour.
- **Garage** — engine tiers, armour tiers (None / Light / Heavy) and nitro.
- **Day and night, weather, peds** — the clock rolls from golden hour to night, the sky changes, the lamps come on, and the sidewalks stay busy.

## The build

- `game/` is plain static files: `index.html` plus the modules under `game/src/`, with Three.js vendored under `game/vendor/`.
- `main.ts` hands the game in: it copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's `buildDossier`.
- `serve.ts` serves the game for local play.
- `shots.json` lists the four dossier screenshots.

## Screenshots

1. **Cover** — golden hour on the avenue: the sport car, the cops closing in, a wreck burning, Air One overhead.
2. **Drive** — the Sprint line at dusk.
3. **Mission** — a Smuggler's Run drop at the Fence.
4. **Night** — Solmar after dark, lamps on, heat up.
