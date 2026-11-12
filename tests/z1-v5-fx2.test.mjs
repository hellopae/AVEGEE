// Z1-V5-FX2 — canteen picture reaches the player, foam only on the shore, placed lava / glint sprites, 2x ground (v7) + its sprites.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const file = u => fileURLToPath(new URL('../' + u, import.meta.url));
const FX = 'img/map-zone1/v5-fx/', GD = 'img/map-zone1/v7r/';
const layout = JSON.parse(readFileSync(file(FX + 'fx-layout.json'), 'utf8'));
const py = (code, ...args) => JSON.parse(execFileSync('python3', ['-c', code, ...args], { encoding: 'utf8', maxBuffer: 1 << 27 }));
const fx = await import('../src/town-fluid-fx.js?v=v5fx');
const skin = await import('../src/zone-skin.js');

test('canteen: the new picture cannot be hidden by an old browser cache (cache name + entry module version changed)', async () => {
  const preload = readFileSync(file('src/preload.js'), 'utf8'), html = readFileSync(file('index.html'), 'utf8');
  const version = preload.match(/const CATALOG_VERSION = '([^']+)'/)[1];
  assert.ok(version.endsWith('-z1v5-fx3'), 'Cache Storage name follows CATALOG_VERSION: a new suffix makes every browser drop avegee-images-<old> (which held the old canteen-th.webp)');
  assert.ok(!html.includes('preload.js?v=20261027-m2-startup-ready-art-atk2-leader-art-food-art-grace-f'), 'entry script + import map moved to the new preload.js release');
  const refs = [...html.matchAll(/(?<!asset-)preload\.js\?v=([^"]+)"/g)].map(m => m[1]);
  assert.ok(refs.length >= 3 && new Set(refs.filter(r => r.startsWith('2026'))).size === 1, 'one release id everywhere');
  const l = await import('../src/canteen-art-layout.js');
  assert.equal(l.CANTEEN_ART_FLIP.th, true, 'FX3 (owner 14:10): mirrored again like the old canteen (FX2 had drawn it unmirrored)');
  assert.ok(l.CANTEEN_ART_SCALE_BY_ZONE.th > 1.2 && l.CANTEEN_ART_SCALE_BY_ZONE.th <= 1.6, 'bigger than the old 1.08 so it sits right beside the 118-150 wide houses');
  assert.equal(l.CANTEEN_ART_SCALE, 1.08, 'other zones keep their size');
  const art = readFileSync(file('src/art.js'), 'utf8');
  assert.match(art, /CANTEEN_ART_FLIP\[zone\]\?\?\['th','asia','cyberhell'\]\.includes\(zone\)/, 'zones without an entry keep the mirrored drawing');
});

test('foam: every crest sits on the shore of the painted water (<= band), pointing into the water; no foam piece covers the middle of a river', () => {
  const band = layout.bandWorld; assert.equal(band, 12);
  const crest = layout.pieces.find(p => p.id === 'river-foam--shore');
  assert.ok(crest && crest.spots.length >= 30, 'crests exist');
  const edge = layout.pieces.filter(p => p.group === 'foam' && p.kind === 'tile');
  assert.deepEqual(edge.map(p => p.mask).sort(), ['foam-ice-edge', 'foam-spirit-edge']);
  assert.ok(edge.every(p => !p.clipMask), 'the old islet-outline "-bank" masks are gone (they drew foam in the middle of the river)');
  assert.ok(!readdirSync(file(FX + 'masks')).some(f => /-bank\.webp$/.test(f)));
  // distance of each anchor from the shore: the edge mask is the band itself (alpha > 0 only within `band` of the shore)
  const m = py(`import sys,json
import numpy as np
from PIL import Image
rect=json.loads(sys.argv[2]);spots=json.loads(sys.argv[3])
a=np.asarray(Image.open(sys.argv[1]).convert("RGBA"))[...,3]
k=3840/4915;x0,y0=rect[0]*k,rect[1]*k
out=[]
for s in spots:
    mx=int((s[0]-x0)/k);my=int((s[1]-y0)/k)
    out.append(int(a[max(0,min(a.shape[0]-1,my)),max(0,min(a.shape[1]-1,mx))]) if 0<=mx<a.shape[1] and 0<=my<a.shape[0] else -1)
print(json.dumps(out))`, file(FX + 'masks/foam-spirit-edge.webp'), JSON.stringify(crest.maskRectPx), JSON.stringify(crest.spots));
  assert.ok(m.every(v => v >= 0), 'every anchor inside the foam rectangle');
  assert.ok(m.filter(v => v > 40).length / m.length > .9, 'at least 90% of the crest anchors lie inside the shore band of the water (3 units in from the shore line)');
  // band mask itself: it is thin and not a fill of the river
  const cov = py('import sys,json\nimport numpy as np\nfrom PIL import Image\nr={}\nfor n in sys.argv[2:]:\n a=np.asarray(Image.open(sys.argv[1]+"masks/"+n+".webp").convert("RGBA"))[...,3];r[n]=[float((a>10).mean()),float((a>200).mean())]\nprint(json.dumps(r))', file(FX), 'foam-spirit-edge', 'foam-ice-edge');
  for (const [n, [any, solid]] of Object.entries(cov)) assert.ok(any < .35 && solid < .3, `${n} covers ${(any * 100).toFixed(0)}% of its rectangle: a band, not the water`);
  // crest orientation: up-vector of the sprite (sin r, -cos r) points into the water; drift moves toward the shore
  for (const s of crest.spots) { assert.ok(s[2] >= 50 && s[2] <= 90); const up = [Math.sin(s[4]), -Math.cos(s[4])]; assert.ok(s[7] * up[0] + s[8] * up[1] < 0, 'swell drifts toward the shore'); }
  assert.ok(new Set(crest.spots.map(s => s[6])).size >= crest.spots.length * .9, 'crests break up into their own periods (no shared rhythm)');
  assert.ok(new Set(crest.spots.map(s => Math.round(s[5] * 20))).size > 10, 'and its own phase (waves are not in step)');
});

test('spots: glints / bubbles / steam / embers are placed only inside their own masks; mist is not used', () => {
  const groups = {}; for (const p of layout.pieces.filter(p => p.kind === 'spots')) groups[p.group] = (groups[p.group] || 0) + p.spots.length;
  for (const g of ['foam', 'sparkle', 'lava-bubble', 'lava-steam', 'embers']) assert.ok(groups[g] > 8, g);
  assert.ok(!layout.pieces.some(p => /mist/.test(p.sheet)), 'river-mist / ice-mist read as pasted lumps (owner), so they are not shipped');
  assert.ok(layout.pieces.filter(p => ['lava-bubble', 'lava-steam', 'embers'].includes(p.group)).every(p => /^(lava|lavafall)-/.test(p.mask)), 'lava effects clip to lava / lava-fall masks only');
  assert.ok(layout.pieces.filter(p => p.group === 'sparkle').every(p => /^river-/.test(p.mask)));
  for (const p of layout.pieces.filter(p => p.kind === 'spots' && p.group !== 'foam')) {
    const [x, y, w, h] = p.maskRectPx.map(v => v * 3840 / 4915);
    for (const s of p.spots) assert.ok(s[0] >= x - 2 && s[0] <= x + w + 2 && s[1] >= y - 2 && s[1] <= y + h + 2, p.id + ' spot inside its mask rectangle');
  }
  assert.deepEqual(layout.pieces.filter(p => p.kind === 'spots').map(p => p.sheet).filter((s, i, a) => a.indexOf(s) === i).sort(),
    ['embers-ash.webp', 'lava-bubble.webp', 'lava-steam.webp', 'river-foam.webp', 'water-sparkle.webp']);
  for (const s of ['river-foam', 'water-sparkle', 'lava-bubble', 'lava-steam', 'embers-ash']) assert.ok(existsSync(file(FX + 'sheets/' + s + '.webp')));
});

test('spot state: swell breathes and drifts to the shore, once plays the drawn frames then rests, rise loops and fades; nothing jumps', () => {
  const swell = { mode: 'swell', frames: 8, fps: 8, group: 'foam' }, sp = [0, 0, 60, 24, 0, .25, 6, 0, 4];
  let prev = null, worst = 0;
  for (let t = 0; t < 14; t += .02) { const s = fx.fluidSpotState(swell, sp, t); assert.ok(s.alpha >= 0 && s.alpha <= 1); if (prev) worst = Math.max(worst, Math.abs(s.alpha - prev.alpha), s.alpha > .01 && prev.alpha > .01 ? Math.abs(s.oy - prev.oy) / 4 : 0); prev = s; }   // the drift restarts only while the crest is invisible
  assert.ok(worst < .12, 'swell alpha / drift change smoothly between 20 ms samples: ' + worst);
  assert.ok(Math.abs(fx.fluidSpotState(swell, sp, 6 * .75).alpha) < 1e-9, 'a wave fades out completely before the next one starts');
  const once = { mode: 'once', frames: 8, fps: 9, group: 'lava-bubble', win: .4 }, bs = [0, 0, 40, 40, 0, 0, 5, 0, 0];
  assert.equal(fx.fluidSpotState(once, bs, 3), null, 'a bubble rests after its animation');
  const a = fx.fluidSpotState(once, bs, .1), b = fx.fluidSpotState(once, bs, 1.9); assert.ok(a.i < b.i || (a.i === b.i && a.mix < b.mix), 'frames advance through the drawn bubble');
  assert.ok(b.j <= 7 && a.i >= 0);
  const rise = { mode: 'rise', frames: 6, fps: 4, group: 'lava-steam' }, rs = [0, 0, 80, 37, 0, 0, 10, 0, -26];
  assert.ok(fx.fluidSpotState(rise, rs, 5).oy < fx.fluidSpotState(rise, rs, 1).oy, 'steam rises');
  assert.ok(fx.fluidSpotState(rise, rs, 0.001).alpha < .05 && fx.fluidSpotState(rise, rs, 9.999).alpha < .05, 'and fades in / out');
});

test('ground set v7r (v7 + the 7 repaired spots): 70 tiles of 1024 px (10 x 7; last col 614, last row 410), preview, sprites, walkmask untouched, <= 40 MB', () => {
  const g = skin.ZONE1_GROUND.v7r;
  assert.equal(skin.ZONE1_GROUND_SET, 'v7r'); assert.strictEqual(skin.ZONE_SKIN.th.terrain, g);
  assert.equal(g.chunk, 1024); assert.deepEqual({ ...g.fullPx }, { w: 9830, h: 6554 }); assert.equal(g.repairs, false);
  const sizes = py('import sys,json\nfrom PIL import Image\nprint(json.dumps({f:Image.open(sys.argv[1]+f).size for f in sys.argv[2:]}))', file(GD),
    ...Array.from({ length: 70 }, (_, i) => `r${Math.floor(i / 10) + 1}-c${i % 10 + 1}.webp`), 'zone1-terrain-v7-preview.webp');
  for (let r = 1; r <= 7; r++) for (let c = 1; c <= 10; c++) assert.deepEqual(sizes[`r${r}-c${c}.webp`], [c === 10 ? 614 : 1024, r === 7 ? 410 : 1024], `r${r}-c${c}`);
  assert.deepEqual(sizes['zone1-terrain-v7-preview.webp'], [1536, 1024]);
  assert.ok(g.preview.endsWith('zone1-terrain-v7-preview.webp') && existsSync(file(g.preview)));
  const total = readdirSync(file(GD), { recursive: true }).filter(f => statSync(file(GD + f)).isFile()).reduce((s, f) => s + statSync(file(GD + f)).size, 0);
  assert.ok(total <= 40e6, 'ground folder ' + (total / 1e6).toFixed(1) + ' MB');
  const man = JSON.parse(readFileSync(file(GD + 'manifest.json'), 'utf8'));
  assert.equal(man.tiles, 70); assert.equal(man.tilePx, 1024); assert.ok(man.quality >= 85, 'tiles are cut at a quality that keeps the painted detail');
  assert.ok(existsSync(file(GD + 'pack-manifest.json')), 'the Codex pack manifest travels with the tiles');
  assert.match(readFileSync(file('src/asset-preload.js'), 'utf8'), /v\[2-9\]\(\?:-partial\)\?/, 'preload tier knows the partial preview');
  // the walk mask is not derived from the ground set: its file and the code that builds it are untouched by this branch
  const diff = execFileSync('git', ['diff', '--name-only', '812152d2', 'HEAD'], { cwd: file('.'), encoding: 'utf8' });
  assert.ok(!/walk/i.test(diff.split('\n').filter(f => /^(art-src|src\/walk|img\/.*walk)/.test(f) && !/-walk(-[^/]*)?\.(png|webp)$/.test(f)).join('\n')), 'no walkmask file changed');
});

test('ground set v7r: pack manifest lists the 7 repaired spots, no v5 fallback left, the pier rails stay off because the repaired stair has them painted in', () => {
  const man = JSON.parse(readFileSync(file(GD + 'pack-manifest.json'), 'utf8'));
  assert.equal(man.version, '7r'); assert.deepEqual(man.fallbackParts, []); assert.deepEqual(man.fallbackPatches, []);
  assert.deepEqual([...man.repairedSpots].sort(), ['forest-r4-c1-q12', 'heaven-bridge', 'lava-low-stair', 'lava-mid-stairs', 'lava-north-stair', 'pier-stair', 'south-plaza-stair']);
  const list = JSON.parse(readFileSync(file(GD + 'sprites.json'), 'utf8'));
  for (const id of ['pier-back', 'pier-front']) assert.match(list.find(s => s.id === id).off, /v7r checked/);
});

test('ground sprites: the objects painted out of the HD chunks come back as sorted sprites (trees, beds, rocks, bridge rails, pier)', async () => {
  const list = JSON.parse(readFileSync(file(GD + 'sprites.json'), 'utf8'));
  assert.ok(list.length >= 40);
  for (const s of list) { assert.ok(existsSync(file(GD + s.src)), s.src); assert.ok(['sort', 'back', 'front'].includes(s.layer)); assert.equal(s.rectWorld.length, 4); }
  const ids = new Set(list.map(s => s.id));
  for (const id of ['river-back', 'river-front', 'pier-back', 'pier-front', 'city-tree-12', 'pilot-red-tree-02']) assert.ok(ids.has(id), id);
  assert.deepEqual(list.filter(s => s.layer === 'front').map(s => s.id).sort(), ['lava-lower-front', 'pier-front', 'river-front']);
  const m = await import('../src/town-ground-sprites.js');
  const sorted = [...list].sort((a, b) => m.groundSpriteLayerDepth(a) - m.groundSpriteLayerDepth(b));
  assert.ok(sorted.slice(0, 3).every(s => s.layer === 'back') && sorted.slice(-3).every(s => s.layer === 'front'), 'back under every character, front over every character');
  const tree = list.find(s => s.id === 'city-tree-12');
  assert.equal(m.groundSpriteLayerDepth(tree), tree.footWorld[1], 'sort sprites use their foot, so Yama walks behind a tree and in front of it');
  assert.equal(m.groundSpriteVisible(tree, [0, 0, 100, 100]), false); assert.equal(m.groundSpriteVisible(tree, [1800, 1200, 100, 100]), true);
  const scene = readFileSync(file('src/scene.js'), 'utf8');
  assert.match(scene, /addGroundSpriteLayers\(at,ctx\)/); assert.match(scene, /g\.zone==='th'\)addGroundSpriteLayers/);
  // a set without a sprite list adds nothing
  const { ZONE_SKIN } = skin, real = ZONE_SKIN.th.terrain;
  try { ZONE_SKIN.th.terrain = skin.ZONE1_GROUND.v5; const q = []; m.addGroundSpriteLayers((y, f) => q.push(y), { getTransform: () => null, canvas: { width: 390, height: 844 } }); assert.equal(q.length, 0); }
  finally { ZONE_SKIN.th.terrain = real; }
});
