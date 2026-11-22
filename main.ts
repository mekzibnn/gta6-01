// Solmar Heat — the entrypoint. main.ts hands the game in: it copies
// game/ and screenshots/ from this repository into the output directory
// and writes dossier.json with buildDossier from the kit's library
// (vendor/makefun-game.ts, unchanged). Outside the grader the output
// directory is $MAKEFUN_OUTPUT_DIR, or "out" when that is not set.
//
// Run it:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The dossier it writes is byte for byte what the scorer rebuilds from
// the same directory, so a local run proves the hand-in is well formed.

import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// The caps the bounty hands buildDossier. text_max_bytes is the only
// one that shapes the bytes; the others only refuse, so passing them
// makes this program fail exactly where the scorer would.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
} as const;

// Where the hand-in goes. The grader sets MAKEFUN_OUTPUT_DIR to
// /output; a local run uses "out" beside the repository.
const outDir = process.env.MAKEFUN_OUTPUT_DIR || 'out';

// A fresh hand-in every time: stale files from an older build must not
// ride along and change the dossier.
rmSync(outDir, { recursive: true, force: true });
mkdirSync(join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });

// The game itself, and the four screenshots of it.
cpSync('game', join(outDir, 'game'), { recursive: true });
if (existsSync('screenshots')) {
  cpSync('screenshots', join(outDir, 'screenshots'), { recursive: true });
}

// The dossier: the screenshots, the source text and the Game block, as
// canonical JSON. buildDossier throws DossierError on anything it
// refuses, and this program lets that error end the run.
const dossier = buildDossier(outDir, DOSSIER_CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossier);

const shotCount = 4;
console.log(`Solmar Heat handed in to ${outDir}/`);
console.log(`dossier.json: ${dossier.length} bytes, ${shotCount} screenshots, schema makefun/dossier/v1`);
