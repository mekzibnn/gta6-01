[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/mekzibnn/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/mekzibnn/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# SOLMAR HEAT — sun-soaked open-world crime: 12 story missions, 5-star dispatch with RAM/PIT units and Air One, exploding cars and burning wrecks, district standing, weapon wheel, crew, races, empire

A 3D open-world crime game for the make.fun **gta6-01** bounty ($1,666).
Leo Marin starts with a stolen car and a fixer on the phone; by the end of
the story he owns half the city.

## What you do

- **Drive** — steal cars, outrun the police, lose the heat, survive Air One.
- **Twelve story missions** — from Wheels Up to Crew Up, with payouts that
  grow from $400 to $7,500.
- **Exploding cars** — bring a car to zero health and it blows up: fireball,
  smoke, debris, screen shake. The burning wreck stays in the world, still
  on fire, still in the way.
- **District standing** — Solmar is five districts (Marina, Old Town, Docks,
  Hills, Downtown). Respect is tracked per district; work a district and
  it learns your name.
- **RAM and PIT units** — at three stars the dispatch sends specialists: a
  heavy RAM SUV that tries to run you off the road, and a PIT interceptor
  that slides alongside your rear quarter and spins you out.
- **Weapon wheel** — hold Q (or Tab) to open the radial wheel, pick one of
  four weapons, release to confirm.
- **Buy businesses** — a laundry, a car wash, a taxi company, a nightclub.
  They pay every game hour; the club pays double at night.
- **Hire a crew** — Milo (handling), Vera (wanted decay), Tank (damage).
  Any mate gets you 10% off at the garage.
- **Race the street series** — Drag, Sprint, Circuit. Entry fees, gate
  rings, par times, best times saved. Rain pays a bonus.
- **Tune the car** — engine tiers, armor, nitro charges, paint.
- **Live the city** — a day/night cycle with golden hour and lamps, weather
  that turns to rain, pedestrians who flee a chase, and a radio (SOL FM).

## Play it

Serve it locally and open it in a desktop browser:

```sh
node serve.ts
# then open http://localhost:8080
```

Controls: **WASD / arrows** drive and walk, **E** enter a car or a shop,
**Q** hold for the weapon wheel (tap to leave a car), **Shift** run,
**Space** nitro, **F** punch, **G** shoot, **X** abandon a race, **R** radio,
**P** pause, **1–9** buy in a shop.

## How it is built

- Plain ES modules in `game/src/`, no build step, no network requests.
- 3D with three.js r187, vendored offline in `game/vendor/`.
- The HUD is a 2D canvas over the 3D view; sound is synthesized WebAudio.
- Progress saves to localStorage (`solmar-heat.save.v2`).
- `main.ts` copies `game/` and `screenshots/` to `/output` and writes the
  dossier the judge reads.

## v9

The whole game is rewritten from scratch in a single round: every module
in `game/src/` is new code — same game, same features, fresh structure —
with the richer golden-hour visuals and the denser HUD from v8 (sunset
building palette, palms and beach, a full sun disc above the mission
banner, the KPD dispatch panel, crew cards, dialogue, weapon slots and
armour), so the transcripts account for the code.
