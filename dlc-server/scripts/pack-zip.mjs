#!/usr/bin/env node
/** Alias: regen with --zip. Optional: node scripts/pack-zip.mjs <id> */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const r = spawnSync(process.execPath, [join(root, 'scripts/regen-catalog.mjs'), '--zip'], { stdio: 'inherit' });
process.exit(r.status ?? 1);
