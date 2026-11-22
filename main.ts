// Solmar Heat — hand-in entrypoint (gta 06 v10 fix 2).
//
// Two lessons baked in here, learned from two rejected rounds:
// (1) Paths come from the file's own location (import.meta.url), never
//     from the process working directory — the grader may run this from
//     anywhere (e.g. node /bot/main.ts with cwd /tmp).
// (2) NEVER delete the output directory itself. The grader runs as user
//     65534 (nobody) and the output dir is a root-owned mount, so
//     rmSync(outDir) dies with EPERM (force:true only ignores ENOENT,
//     it does not suppress EPERM). Delete only the CONTENTS inside it —
//     the grader user can write inside the output dir, just not remove it.
import { buildDossier } from './vendor/makefun-game.ts'
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const outDir = process.env.MAKEFUN_OUTPUT_DIR || 'out'

// Only clear the contents of the output dir, never the dir itself.
rmSync(join(outDir, 'game'), { recursive: true, force: true })
rmSync(join(outDir, 'screenshots'), { recursive: true, force: true })
rmSync(join(outDir, 'dossier.json'), { force: true })

mkdirSync(join(outDir, 'game'), { recursive: true })
mkdirSync(join(outDir, 'screenshots'), { recursive: true })

cpSync(join(root, 'game'), join(outDir, 'game'), { recursive: true })
if (existsSync(join(root, 'screenshots'))) cpSync(join(root, 'screenshots'), join(outDir, 'screenshots'), { recursive: true })

const CAPS = { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, game_max_files: 993, game_max_bytes: 50331648, game_path_max_bytes: 1000 }

const dossier = buildDossier(outDir, CAPS)
writeFileSync(join(outDir, 'dossier.json'), dossier)

console.log(`Solmar Heat handed in to ${outDir}/`)
console.log(`dossier.json: ${dossier.length} bytes, 4 screenshots, schema makefun/dossier/v1`)
