#!/usr/bin/env node
// Stamp a deploy folder with its build id:  node scripts/stamp-build.mjs <dir> <build-id> [iso-time]
//   <dir>/index.html   __BUILD_ID__ in <meta name="avegee-deploy"> -> the id   (the code a tab loads knows which build it is)
//   <dir>/version.json {"build": id, "time": iso}                              (what src/version-check.js asks "what is deployed now?")
// Run by .github/workflows/pages.yml on the staged _site/ only — the repo copy of index.html keeps the placeholder (= check disabled in dev).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function stamp(dir, rawId, time = new Date().toISOString()) {
  const id = String(rawId ?? '').trim().slice(0, 12);
  if (!/^[0-9a-zA-Z._-]{4,12}$/.test(id)) throw new Error(`bad build id: ${JSON.stringify(rawId)}`);
  const file = join(dir, 'index.html');
  const html = readFileSync(file, 'utf8');
  const meta = /(<meta name="avegee-deploy" content=")__BUILD_ID__(">)/;
  if (!meta.test(html)) throw new Error('index.html has no <meta name="avegee-deploy" content="__BUILD_ID__">');
  writeFileSync(file, html.replace(meta, `$1${id}$2`));
  writeFileSync(join(dir, 'version.json'), JSON.stringify({ build: id, time }) + '\n');
  return id;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir, id, time] = process.argv.slice(2);
  if (!dir || !id) { console.error('usage: stamp-build.mjs <dir> <build-id> [iso-time]'); process.exit(2); }
  console.log('stamped', stamp(dir, id, time));
}
