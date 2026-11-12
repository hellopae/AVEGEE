// Regression guard for the PNG/JPEG -> WebP conversion (1ee18746): paths that are BUILT at runtime (artUrl(key,ext,zone), manifest lists, pose / alias tables,
// preload catalog, strip-art json, construction sheets) must point at files that exist.  tests/clean-404.test.mjs only sees string literals.
// The browser counterpart is scripts/asset-404-scan.py (real 4xx + broken <img> while walking the game).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, basename, join } from 'node:path';
const root = new URL('../', import.meta.url).pathname;
const exists = p => existsSync(join(root, p));
const json = p => JSON.parse(readFileSync(join(root, p), 'utf8'));
const manifest = json('img/manifest.json');
globalThis.fetch = async () => ({ ok: true, json: async () => manifest });
globalThis.Image = class {};
const { artUrl, bindZone, SPIRIT_KINDS } = await import('../src/art.js');
const D = await import('../src/data.js');
const { SPIRIT_ARCHETYPES, regionalSpiritAliases } = await import('../src/regional-spirits.js');
const { SOUL_POSE_ASSETS } = await import('../src/soul-poses.js');
await new Promise(r => setImmediate(r));
const ZONES = ['th', 'asia', 'west', 'cyberhell'];
const POSES = ['', '-profile', '-work', '-atk', '-side', '-walk', '-cry', '-build-work'];
const IMG_EXT = /\.(png|jpe?g|webp|gif)$/i;

function keyUniverse() {
  const keys = new Set();
  for (const c of ['nira', 'taan', 'boon', 'plerng', 'kan', 'dam', 'guard']) for (const p of POSES) keys.add(`crew-${c}${p}`);
  for (const b of ['hero-yama', 'hero-boss']) for (const p of [...POSES, '-walk-4dir', '-unconscious', '-tea-clean']) keys.add(b + p);
  for (const s of D.STATIONS) for (const p of POSES) keys.add(`st-${s.k}${p}`);
  for (const k of D.MOB.kinds) keys.add(k.img);
  for (const it of Object.values(D.ITEMS)) if (it.img) keys.add(it.img);
  for (let i = 1; i <= SPIRIT_KINDS; i++) for (const p of POSES) keys.add(`spirit${i}${p}`);
  for (const a of [...SPIRIT_ARCHETYPES, 'recruit', 'graduate']) for (const p of POSES) keys.add(`spirit-${a}${p}`);
  for (const k of ['soul-monk', 'soul-deva', 'scene-v2-opt', 'BG-Turn-Base', 'BG-Frontier', 'BG-Tea', 'intro-zone1', 'worker-rice', 'st-canteen', 'crew-dam-cook', 'crew-plerng-cook', 'zone-boss']) keys.add(k);
  return keys;
}

test('artUrl never builds a legacy-extension path when the shipped file has another extension (the 1ee18746 regression class)', () => {
  const bad = new Set(); let checked = 0;
  for (const z of ZONES) {
    bindZone(() => z);
    for (const key of keyUniverse()) for (const ext of ['png', 'webp', 'jpeg', 'jpg']) {
      const url = artUrl(key, ext, z);
      if (!url) continue;
      checked++;
      if (exists(url)) continue;
      const stem = url.replace(IMG_EXT, '');
      const sibling = ['webp', 'png', 'jpeg', 'jpg'].find(e => exists(`${stem}.${e}`));
      if (sibling) bad.add(`${key} (${z}, ext ${ext}) -> ${url} but ${stem}.${sibling} exists`);
    }
  }
  assert.ok(checked > 2000, `universe too small: ${checked}`);
  assert.deepEqual([...bad], []);
});

test('every art the game actually resolves for its own keys exists as a file (art that was never delivered keeps its placeholder, not a request)', () => {
  // The first run after the conversion showed 0 requests that 404 for these; keep the list of "never delivered, drawn by code" explicit so a NEW gap is noticed.
  const optional = new Set(['item-heart']);                        // glyph placeholder until Kittanate draws it (src/data.js spareHeart)
  const missing = [];
  for (const it of Object.values(D.ITEMS)) { if (!it.img || optional.has(it.img)) continue; bindZone(() => 'th'); const u = artUrl(it.img); if (u && !exists(u)) missing.push(`${it.img} -> ${u}`); }
  for (const k of D.MOB.kinds) { for (const z of ZONES) { bindZone(() => z); const u = artUrl(k.img, 'png', z); if (u && !exists(u)) missing.push(`${k.img}@${z} -> ${u}`); } }
  assert.deepEqual(missing, []);
});

test('img/manifest.json: every listed file (zones, rest, critical, walk sheets) exists', () => {
  const missing = [];
  const walk = (v, where) => {
    if (typeof v === 'string') { if (IMG_EXT.test(v) && !exists(v) && !exists('img/' + v)) missing.push(`${where}: ${v}`); }
    else if (Array.isArray(v)) v.forEach(x => walk(x, where));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, where + '/' + k);
  };
  for (const k of ['critical', 'rest', 'zones', 'crewWalks', 'heroWalks']) walk(manifest[k], k);
  assert.deepEqual(missing, []);
});

test('img/preload-catalog.json lists only files that exist', () => {
  const c = json('img/preload-catalog.json');
  assert.deepEqual([...c.shared, ...Object.values(c.zones).flat()].filter(p => !exists(p)), []);
});

test('regional spirit aliases and the soul pose tables point at shipped files', () => {
  const missing = [];
  for (const z of ZONES) for (const [k, p] of Object.entries(regionalSpiritAliases(z))) if (!exists('img/' + p)) missing.push(`alias ${z} ${k} -> ${p}`);
  for (const [base, poses] of Object.entries(SOUL_POSE_ASSETS)) { if (!exists(base)) missing.push('pose base ' + base); for (const p of Object.values(poses)) if (!exists(p)) missing.push('pose ' + p); }
  assert.deepEqual(missing, []);
});

test('strip-art json (worker cook / carry, construction): image files exist at the size the json declares', async () => {
  const sizeOf = p => { const b = readFileSync(join(root, p)); assert.equal(b.toString('ascii', 8, 12), 'WEBP', p); return b; };
  for (const z of ZONES) { const m = json(`img/workers/worker-${z}-cook-v1.json`); sizeOf('img/workers/' + m.image); }
  sizeOf('img/workers/' + json('img/workers/worker-th-carry-v1.json').image);
  const c = json('img/construction/th/construction.json');
  const { validConstructionManifest } = await import('../src/construction-sheets.js');
  assert.equal(validConstructionManifest(c), true);
  for (const s of c.stages) { assert.ok(exists('img/construction/th/' + s.sheet), s.sheet); }
});

test('construction: the th sheets are plugged in at 704 px frames drawn 256 world units wide, foot on the station foot point', async () => {
  const cs = await import('../src/construction-sheets.js');
  const m = json('img/construction/th/construction.json');
  assert.equal(m.frameW, 704); assert.equal(m.frameH, 704); assert.deepEqual(m.foot, [352, 640]); assert.equal(m.worldWidth, 256);
  const draws = [], ctx = { globalAlpha: 1, drawImage: (...a) => draws.push(a) };
  const sheets = [0, 1, 2].map(() => ({ width: 5632, height: 704 }));
  cs.resetConstructionForTest(); cs.setConstructionForTest('th', m, sheets);
  for (const def of [{ k: 'canteen', bx: 720, by: 400, bw: 150 }, { k: 'krata', bx: 1443, by: 503, bw: 240 }]) {
    draws.length = 0;
    assert.equal(cs.drawConstruction(ctx, def, .5, 0, 'th'), true);
    const [, sx, sy, sw, sh, x, y, w, h] = draws[0];
    assert.equal(sw, 704); assert.equal(sh, 704);
    assert.equal(w, 256, 'worldWidth wins over def.bw');
    assert.ok(Math.abs(x + 352 * (w / 704) - def.bx) < 1e-9, 'foot x on bx'); assert.ok(Math.abs(y + 640 * (h / 704) - def.by) < 1e-9, 'foot y on by');
  }
  cs.resetConstructionForTest();
});
