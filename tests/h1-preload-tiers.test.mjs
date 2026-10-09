import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { zoneAssets, zoneTiers, assetTier } from '../src/asset-preload.js';

const catalog = JSON.parse(readFileSync('img/preload-catalog.json'));
const mb = list => list.reduce((s, p) => s + statSync(p).size, 0) / 1048576;

test('H1: three tiers partition the full zone bundle exactly (nothing dropped, nothing duplicated)', () => {
  for (const zone of ['th', 'asia', 'west', 'cyberhell']) for (const opts of [{}, { firstRun:true }, { arrival:true }]) {
    const t = zoneTiers(catalog, zone, zone, opts), all = zoneAssets(catalog, zone, zone);
    const joined = [...t.critical, ...t.background, ...t.late];
    assert.equal(joined.length, new Set(joined).size, `${zone} duplicates`);
    assert.deepEqual([...joined].sort(), [...all].sort(), `${zone} ${JSON.stringify(opts)}`);
    assert(joined.every(p => existsSync(p)));
  }
});

test('H1: critical tier holds the first-screen art and is far smaller than the whole zone', () => {
  const t = zoneTiers(catalog, 'th', 'th');
  for (const p of ['img/scene-v2-opt.png', 'img/cover-v5.webp', 'img/hero-yama-walk-4dir-v2.png', 'img/map-v5/st-sala-th.webp',
    'img/crew-nira-walk-v2.png', 'img/ui/logo-th.png', 'img/spirit1.png', 'img/Thai/spirit-worker-th-v2.png', 'img/icon-fang.png'])
    assert(t.critical.includes(p), p);
  assert(mb(t.critical) < mb(zoneAssets(catalog, 'th')) * 0.5, 'critical must be < 50% of the old gate');
  // Big event-only art is deferred, never silently deleted
  for (const p of ['img/hero-yama-th-mirror-cutscene-v3.png', 'img/story-ending-03-v1.png', 'img/tea-th-recovery.png'])
    assert(t.late.includes(p), p);
  for (const p of ['img/rooms-wide/th-sala.webp', 'img/BG-Sala.webp', 'img/ui/Button1.png', 'img/fx-heal.png'])
    assert(t.background.includes(p), p);
});

test('H1: intro panels gate only the first run; panel 1 is always ready; zone arrival gates the zone introduction', () => {
  assert.equal(assetTier('img/intro-panel-03-v2.webp', { firstRun:true }).tier, 0);
  assert.equal(assetTier('img/intro-panel-03-v2.webp').tier, 1);
  assert.equal(assetTier('img/intro-panel-01-v2.webp').tier, 0);
  assert.equal(assetTier('img/Asia/intro-head-asia-v2.png', { arrival:true }).tier, 0);
  assert.notEqual(assetTier('img/Asia/intro-head-asia-v2.png').tier, 0);
  const asia = zoneTiers(catalog, 'asia', 'asia', { arrival:true });
  assert(!asia.critical.some(p => /-th\.webp$/.test(p) && /map-v5|theme-v4/.test(p)), 'other zones do not gate on Thai map art');
});

test('H1: loading screen rotates several TH+EN notes and only one preload instance owns the gate', () => {
  const src = readFileSync('src/preload.js', 'utf8');
  assert((src.match(/^  (zone => |\(\) => )\(\{ th:/gm) || []).length >= 6);
  assert(src.includes('NOTE_MS = 2500') && src.includes('en:'));
  assert(src.includes('__avegeePreload'));
});
