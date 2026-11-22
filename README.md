# SOLMAR HEAT — sun-soaked open-world crime: 12 story missions, 5-star dispatch with RAM/PIT units and Air One, exploding cars and burning wrecks, district standing, weapon wheel, crew, races, empire

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/mekzibnn/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/mekzibnn/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmar Heat is a 3D low-poly open-world crime game set in the fictional
city of Solmar at golden hour. Steal a car, outrun the KPD, build an
empire, and climb from Nobody to Kingpin.

## What is in the game

- **12 story missions** (M1 Wheels Up through M12 Crew Up), each with a
  name, a stage counter, an objective, a next-mission hint and a cash
  reward. Smuggle goods from the pier to the fence, survive a 5-star
  heat lock, and take over the city.
- **5-star police dispatch**: patrol cars, RAM and PIT units at wanted
  3+, plus Air One, the police helicopter with its spotlight cone.
- **Exploding cars and persistent burning wrecks**: a wrecked car burns
  on the street with a charred body and an orange flame, and the blast
  chains into the cars around it.
- **District standing**: Marina, Old Town, Docks, Hills and Downtown
  each track your respect, and it is saved with your run.
- **Weapon wheel**: hold Q, pick a slot, release to arm it. Fists,
  Pistol, SMG and Shotgun — no ammo to count, just pick and go.
- **Crew**: hire Milo (+25% handling), Vera (heat decays 1.6x faster)
  and Tank (1.5x ram damage). Hiring a mate also cuts upgrade prices.
- **Street races**: Sprint, Circuit and Drag, with gates, prizes and
  best times.
- **Empire**: buy four businesses — the laundry, the diner, Taco Bay
  and Vinyl Records — and collect hourly income, day and night.
- **A living city**: pedestrians with panic, traffic, taxis, a beach
  with umbrellas, palms on every block corner, a drifting cloud layer
  and a big yellow sun disc that hangs over the mission banner.
- **Day and night, weather, radio**: SOL FM 98.4 plays Solmar Nights
  while the lamps come on and the weather turns.

## Controls

| Key | Action |
| --- | --- |
| W / A / S / D | Drive, or walk on foot |
| Space | Nitro (when the garage fitted it) |
| E | Steal a car, or open a shop menu |
| F | Leave the car |
| Q (hold) | Weapon wheel, then 1-4 to pick |
| 1 / 2 / 3 | Buy from a shop menu |
| X | Abandon the active race |
| P | Pause and save |

## How to play

Start at the hideout on foot. Press E next to the sedan to steal it —
the KPD notices, so drive to the garage and follow the mission banner.
Buy upgrades at the garage, launder money at the laundry, hire a crew
at the crew office, and race at the drag strip. Progress saves to the
browser automatically when you pause.

## Run it

```sh
node serve.ts
# open http://localhost:8080/
```

The game is static files under `game/` with no build step. Three.js is
vendored under `game/vendor/`.
