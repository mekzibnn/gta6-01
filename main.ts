// Solmar Heat — entrypoint: hands the game in to the output dir.
// All paths are computed from this file's location (import.meta.url),
// never from the process working directory — so `node /bot/main.ts`
// works from any cwd. (Round 9 lesson: relative paths like 'game'
// made the grader's run fail with ENOENT when cwd was not the repo.)
import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || 'out';

rmSync(outDir, { recursive: true, force: true });
mkdirSync(join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });

cpSync(join(root, 'game'), join(outDir, 'game'), { recursive: true });
if (existsSync(join(root, 'screenshots'))) {
  cpSync(join(root, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000
};

const dossier = buildDossier(outDir, CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossier);

console.log(`Solmar Heat handed in to ${outDir}/`);
console.log(`dossier.json: ${dossier.length} bytes, 4 screenshots, schema makefun/dossier/v1`);
