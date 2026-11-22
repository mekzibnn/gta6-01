// Solmar Heat — the make.fun entrypoint (gta 06 v10).
// Copies the game and the screenshots into the output directory and
// writes the build dossier the grader reads. Node 22, stdlib only,
// no network, deterministic: the same input always yields the same
// bytes, so both grader runs produce an identical dossier.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

function copyTree(src, dest) {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true, dereference: true });
}

function main() {
  mkdirSync(outDir, { recursive: true });
  // A clean output tree, so a stale file from an earlier run can never
  // leak into this build.
  for (const name of ['game', 'screenshots', 'dossier.json']) {
    const target = join(outDir, name);
    if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  }
  copyTree(join(repoRoot, 'game'), join(outDir, 'game'));
  copyTree(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'));
  const dossier = buildDossier(outDir, caps);
  // buildDossier returns the exact dossier bytes (a Uint8Array), a
  // string, or a plain object — write each form as-is so both runs
  // produce identical bytes.
  if (typeof dossier === 'string') {
    writeFileSync(join(outDir, 'dossier.json'), dossier, 'utf8');
  } else if (dossier instanceof Uint8Array) {
    writeFileSync(join(outDir, 'dossier.json'), dossier);
  } else {
    writeFileSync(join(outDir, 'dossier.json'), JSON.stringify(dossier, null, 2) + '\n', 'utf8');
  }
}

main();
