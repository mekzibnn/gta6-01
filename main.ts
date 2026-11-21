// Solmar Heat, a gta6-01 entry (Node 22, standard library only): the game is
// this directory's game/ folder — plain static files a desktop browser loads
// offline (game/index.html and its ES modules, plus the vendored three.js in
// game/vendor/, no network request) — and this program hands it in. It copies
// game/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library.
//
// v2: the game now renders in full 3D with three.js (vendored as
// game/vendor/three.module.min.js, loaded through the import map in
// game/index.html), with a chase camera behind Leo. The program itself is
// unchanged: it still copies game/ and screenshots/ and writes the dossier
// with the vendored library.
//
// v3: ten story missions (Smuggler's Run and Heat Wave join the eight),
// a garage upgrade shop with nitro (game/src/upgrades.js), a day/night
// cycle (game/src/daynight.js) that lights the streetlamps and the
// headlights, pedestrian AI on a sidewalk graph (game/src/peds.js), and a
// widget-registry HUD (game/src/hud.js). The program itself is still
// unchanged: copy game/ and screenshots/, write the dossier.
//
// v5: twelve story missions (Empire Rising and Crew Up join the ten), a
// business empire (game/src/empire.js), a recruitable crew (game/src/crew.js)
// and a street race series (game/src/races.js), with the empire income, the
// crew perks and the race gates wired into the loop, the save file and the
// HUD. The program itself is still unchanged: copy game/ and screenshots/,
// write the dossier.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of
// game files, in all, or a path under game/ over 1000 bytes: game/ counts
// beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyEntry() {
  mkdirSync(out, { recursive: true });
  cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  if (existsSync(join(here, 'screenshots'))) {
    cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
  }
  writeFileSync(join(out, 'dossier.json'), buildDossier(out, DOSSIER_CAPS));
}

copyEntry();
