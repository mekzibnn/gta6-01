// Solmar Heat, a gta6-01 entry (Node 22, standard library only).
// The entry is the game/ folder beside this file: plain static files a
// desktop browser loads offline — game/index.html, its ES modules, and the
// vendored three.js in game/vendor/. Nothing is fetched from the network.
// This program ships it: it copies game/ and screenshots/ into the output
// directory and writes /output/dossier.json, the summary the judge reads,
// using the vendored make.fun library.
//
// v7: the whole game is rewritten from scratch in one round — every module
// in game/src/ is new code (same game, same features, plus exploding cars,
// district standing, RAM/PIT units and a weapon wheel), so the transcripts
// account for the code. This program does the same job as before: copy
// game/ and screenshots/, write the dossier.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the rest refuse an entry the scorer would refuse — more than
// 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB
// of game files in all; or a path under game/ over 1000 bytes. game/
// counts beside /output's own 1000-entry cap, its screenshots/ and
// dossier.json.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

const root = fileURLToPath(new URL('.', import.meta.url));
const dest = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(from, to) {
  cpSync(from, to, { recursive: true });
}

function shipEntry() {
  mkdirSync(dest, { recursive: true });
  copyTree(join(root, 'game'), join(dest, 'game'));
  mkdirSync(join(dest, 'screenshots'), { recursive: true });
  const shots = join(root, 'screenshots');
  if (existsSync(shots)) {
    copyTree(shots, join(dest, 'screenshots'));
  }
  const dossier = buildDossier(dest, CAPS);
  writeFileSync(join(dest, 'dossier.json'), dossier);
}

shipEntry();
