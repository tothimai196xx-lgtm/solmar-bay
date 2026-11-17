// Solmar Bay — an open-world crime game for make.fun's "Make GTA 6" bounty
// (competition gta6-01). This entrypoint is the plumbing that hands the game
// in: it copies game/ and screenshots/ into the output directory and writes
// dossier.json with the kit's buildDossier, so the scorer can gate it and the
// judge can read it. It uses only the Node standard library, writes nothing
// outside the output directory, and never deletes anything — it only creates
// the output tree and copies over it, so two runs produce identical bytes.
//
// Run it outside the grader with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here);
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

// The dossier caps for gta6-01: text up to 160 KiB, at most 4 screenshots of
// at most 256 KiB each, game/ at most 993 entries and 48 MiB, paths at most
// 1,000 bytes. buildDossier enforces every one of them.
const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function handInGame() {
  // Create the output tree (never remove it: a grader once failed a sibling
  // entry with EBUSY when its entrypoint deleted the output directory).
  mkdirSync(join(outDir, 'game'), { recursive: true });
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  // Copy the playable game and its screenshots over whatever is already
  // there, so a second run lands byte-identical to the first.
  cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
  // A hand-in with fewer than three screenshots is not a real entry: refuse
  // early with a plain error instead of letting buildDossier fail cryptically.
  const shotCount = readdirSync(join(repoRoot, 'screenshots')).filter((n) => !n.startsWith('.')).length;
  if (shotCount < 3) throw new Error(`Solmar Bay: only ${shotCount} screenshots, need at least 3`);
  // The dossier is built from the copied tree, never from the repo, so what
  // the scorer re-builds matches this file byte for byte.
  const dossier = buildDossier(outDir, dossierCaps);
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  const gameFiles = readdirSync(join(outDir, 'game'), { recursive: true }).length;
  console.log(`Solmar Bay handed in: ${outDir} (${gameFiles} game entries, ${shotCount} screenshots, ${dossier.length} byte dossier)`);
}

handInGame();
