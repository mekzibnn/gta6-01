[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/mekzibnn/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/mekzibnn/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

# Solmar Heat — Streets of the Sun

An open-world crime game in the spirit of GTA 6, built for make.fun's
gta6-01 bounty. Everything is original: the city of Solmar, its people,
cars, story, art, sound and music.

You are Leo Marin, a courier pulled into fixer Mara's jobs across a
sun-soaked coastal city. Drive and steal cars, outrun the SCPD wanted
system, run eight story missions, pick up taxi fares, and find ten hidden
packages — on foot and behind the wheel.

## How to play

Serve `game/` with any static server and open `index.html` in desktop
Chrome (or run `node serve.ts` and open http://localhost:8080). No network
request, no build step. The city renders in full 3D (three.js, vendored in
`game/vendor/`) with a chase camera behind Leo.

- **WASD / arrows** — walk and drive (Shift to run, Space handbrake)
- **E** — enter / steal a car, exit, use shops (Spray & Go, El Gato Guns,
  Clinica Sol), pick up taxi fares, open the garage
- **F** — punch · **Q** — cycle weapons · **1–4** — weapon slots (buy guns
  at El Gato Guns) · **mouse** — aim, click to shoot
- **R** — change radio station · **C** — chase / high camera
- **P / Esc** — pause · **M** — mute

Progress saves to localStorage on mission complete and on pause.

## What's in the city

- A seeded grid city in full 3D: roads, blocks, buildings, Central Park, a
  beach and the sea, the Marina, Portside Bank and the Palm Strip, with a
  chase camera, golden-hour and night lighting, and a checkered race flag
  on Palm Strip
- Traffic that cruises the roads, pedestrians on the sidewalks, parked cars
  to steal
- A 0–5 star wanted system with police cars that chase and ram, foot cops
  that chase, punch and (at 3+ stars) shoot, and the Air One helicopter
  circling overhead at 4+ stars
- Eight story missions — including a street race, an Air One survival job
  and a five-star finale — plus taxi fares, street races and hidden packages
- Respect ranks (Nobody → Solmar Legend) tracked per district, and a crew:
  Dante and Rosa join once Leo earns Street King respect and fight beside him
- A radio with three stations (SOL FM, PALM 87, HEAT 102), a garage with
  engine / armor / paint upgrades, and four weapon slots (fists, pistol,
  SMG, shotgun)
- HUD with cash, health, wanted stars, respect, mission objective and timer,
  speed, weapon slots and ammo, radio, a live minimap, and a day/night cycle
- Procedural WebAudio: engine hum, sirens, gunshots and three radio stations

## Files

- `game/` — the playable game, plain static files (`game/index.html`)
- `screenshots/` — 4 real renders of the game (the first by name is the cover)
- `main.ts` — copies `game/` and `screenshots/` to `/output` and writes
  `/output/dossier.json` with the vendored make.fun library

## License

MIT — see LICENSE.
