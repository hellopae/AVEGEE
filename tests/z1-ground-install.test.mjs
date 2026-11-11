// Z1-GROUND-INSTALL — the one-command switch to a new Codex ground pack (scripts/install-z1-ground.py): refuses a half pack, leaves the game alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const tilesOf = dir => readdirSync(join(ROOT, 'img/map-zone1', dir)).filter(f => /^r\d+-c\d+\.webp$/.test(f)).length;

test('install script refuses an incomplete pack and touches nothing', () => {
  const pack = mkdtempSync(join(tmpdir(), 'z1pack-'));
  writeFileSync(join(pack, 'r1-c1.webp'), 'not an image');
  const zs = readFileSync(join(ROOT, 'src/zone-skin.js'), 'utf8');
  const r = spawnSync('python3', ['-I', join(ROOT, 'scripts/install-z1-ground.py'), pack, '--name', 'v7', '--activate'], { encoding: 'utf8' });
  assert.notEqual(r.status, 0, 'exit code says it failed');
  assert.match(r.stderr, /r1-c1\.webp|missing chunk/);
  assert.equal(tilesOf('v7'), 70, 'the installed tiles are untouched');
  assert.equal(readFileSync(join(ROOT, 'src/zone-skin.js'), 'utf8'), zs, 'ZONE1_GROUND_SET is untouched');
});

test('the switch: ZONE1_GROUND_SET is one line, v7 and v7r are registered, v7r needs no literal file URL until it is installed', () => {
  const zs = readFileSync(join(ROOT, 'src/zone-skin.js'), 'utf8');
  assert.equal([...zs.matchAll(/export const ZONE1_GROUND_SET = '([^']+)';/g)].length, 1);
  assert.match(zs, /v7: hd2x\('v7'\)/); assert.match(zs, /v7r: hd2x\('v7r'\)/);
  assert.ok(!zs.includes('img/map-zone1/v7r/'), 'no literal URL to a folder that may not exist');
  const set = zs.match(/ZONE1_GROUND_SET = '([^']+)'/)[1];
  assert.ok(existsSync(join(ROOT, 'img/map-zone1', set, 'r1-c1.webp')), 'the active set is installed');
});
