import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { buildDossier } from './vendor/makefun-game.ts';

// new URL('.', import.meta.url) is already the directory holding this
// file, so fileURLToPath gives the repo root directly — do NOT wrap it
// in dirname (that would climb one level up to the parent).
const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || 'out';
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

// Never delete outDir itself — the grader runs as an unprivileged user
// and cannot remove the root-owned output mount. Clear only its children.
rmSync(join(outDir, 'game'), { recursive: true, force: true });
rmSync(join(outDir, 'screenshots'), { recursive: true, force: true });
rmSync(join(outDir, 'dossier.json'), { force: true });
mkdirSync(join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(root, 'game'))) {
  cpSync(join(root, 'game'), join(outDir, 'game'), { recursive: true });
}
if (existsSync(join(root, 'screenshots'))) {
  cpSync(join(root, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}
// buildDossier returns the dossier as a Uint8Array of UTF-8 JSON bytes —
// write those bytes verbatim. (JSON.stringify on a Uint8Array would
// expand every byte into a numeric-key object and bloat the file ~12x.)
const dossier = buildDossier(outDir, CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`dossier written to ${join(outDir, 'dossier.json')}`);
console.log('Solmar Heat build complete');
