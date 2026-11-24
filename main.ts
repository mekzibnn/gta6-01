// Solmar Heat v12 — dossier builder entrypoint (plain JavaScript, no TS syntax).
// The grader runs `node /bot/main.ts` from a cwd that is NOT /bot, as an
// unprivileged user, with /output a root-owned mount: so every path is
// absolute (resolved from import.meta.url), and we NEVER remove outDir
// itself — only its children.
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { mkdirSync, cpSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || 'out';
const gameDir = join(root, 'game');
const shotsDir = join(root, 'screenshots');

mkdirSync(outDir, { recursive: true });
// Remove only children of outDir — never outDir itself (root-owned mount).
for (const child of ['game', 'screenshots', 'dossier.json']) {
  const p = join(outDir, child);
  if (existsSync(p)) rmSync(p, { recursive: true, force: true });
}
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

// buildDossier returns a Uint8Array — write its bytes verbatim.
const dossier = buildDossier(outDir, CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log('dossier written:', join(outDir, 'dossier.json'), dossier.length, 'bytes');
