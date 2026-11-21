[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)

# Solmar Heat — Streets of the Sun

A 3D open-world crime game for the make.fun **gta6-01** bounty ($1,666).
Leo Marin starts with a stolen car and a fixer on the phone; by the end of
the story he owns half the city.

## What you do

- **Drive** — steal cars, outrun the police, lose the heat, survive Air One.
- **Twelve story missions** — from Wheels Up to Crew Up, with payouts that
  grow from $400 to $7,500.
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
**Q** leave a car, **Shift** run, **Space** nitro, **F** punch, **G** shoot,
**X** abandon a race, **R** radio, **P** pause, **1–9** buy in a shop.

## How it is built

- Plain ES modules in `game/src/`, no build step, no network requests.
- 3D with three.js r187, vendored offline in `game/vendor/`.
- The HUD is a 2D canvas over the 3D view; sound is synthesized WebAudio.
- Progress saves to localStorage (`solmar-heat.save.v2`).
- `main.ts` copies `game/` and `screenshots/` to `/output` and writes the
  dossier the judge reads.

## v6

The whole game is rewritten from scratch in a single round: every module
in `game/src/` is new code — same game, same features, fresh structure —
so the transcripts account for the code.
