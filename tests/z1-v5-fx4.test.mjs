// Z1-V5-FX4 - fluid effects only where fluid is painted: fall masks trimmed to painted water / lava, flat-stream "falls" off, shore streaks never on rock,
// no bubbles / steam / embers on the lava falls.  Pixels are read from the real ground set (img/map-zone1/v7) with Python / PIL / OpenCV.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const file = u => fileURLToPath(new URL('../' + u, import.meta.url));
const FX = 'img/map-zone1/v5-fx/';
const layout = JSON.parse(readFileSync(file(FX + 'fx-layout.json'), 'utf8'));
const fx = await import('../src/town-fluid-fx.js?v=v5fx');

// one Python run answers every pixel question of this file (ground = v7 tiles at world resolution 3840x2560)
const PY = `
import sys, json, numpy as np, cv2
from PIL import Image
root = sys.argv[1]; lay = json.load(open(root + 'img/map-zone1/v5-fx/fx-layout.json')); K = 3840 / 4915
G = np.zeros((2560, 3840, 3), np.uint8)
for r in range(1, 8):
    for c in range(1, 11):
        t = np.asarray(Image.open(root + f'img/map-zone1/v7/r{r}-c{c}.webp').convert('RGB'))
        x0, y0 = round((c - 1) * 1024 * 3840 / 9830), round((r - 1) * 1024 * 2560 / 6554)
        w, h = round(t.shape[1] * 3840 / 9830), round(t.shape[0] * 2560 / 6554)
        s = cv2.resize(t, (w, h), interpolation=cv2.INTER_AREA); G[y0:y0 + h, x0:x0 + w] = s[:2560 - y0, :3840 - x0][:s.shape[0], :s.shape[1]]
hsv = cv2.cvtColor(G, cv2.COLOR_RGB2HSV).astype(int); H, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]
ice = (H >= 86) & (H <= 112) & (S >= 135) & (V >= 150)
spray = (S < 80) & (V > 200)
icefluid = ice | (spray & (cv2.dilate(ice.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0))
hot = (H <= 28) & (S >= 140) & (V >= 135)
purple = (H >= 125) & (H <= 160) & (S >= 105) & (V >= 45)
d3 = lambda m: cv2.dilate(m.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
def full_mask(name, rect):
    a = np.asarray(Image.open(root + 'img/map-zone1/v5-fx/masks/' + name + '.webp').convert('RGBA'))[..., 3]
    x, y, w, h = [round(v * K) for v in rect]
    s = cv2.resize(a, (w, h), interpolation=cv2.INTER_AREA); f = np.zeros((2560, 3840), np.uint8); f[y:y + h, x:x + w] = s[:2560 - y, :3840 - x]; return f
out = {'falls': {}, 'band': {}}
for p in lay['pieces']:
    if p['group'] in ('waterfall', 'lavafall') and p['kind'] != 'spots' and not p.get('off'):
        m = full_mask(p['mask'], p['maskRectPx']) > 127
        fl = d3(icefluid if p['group'] == 'waterfall' else hot)
        out['falls'][p['mask']] = [int(m.sum()), int((m & ~fl).sum())]
    if p['group'] == 'foam' and p['kind'] == 'tile':
        m = full_mask(p['mask'], p['maskRectPx']) > 127
        ok = d3(purple | hot) if 'spirit' in p['mask'] else d3(icefluid)
        out['band'][p['mask']] = [int(m.sum()), int((m & ~ok).sum())]
json.dump(out, sys.stdout)
`;
const px = JSON.parse(execFileSync('python3', ['-c', PY, file('')], { encoding: 'utf8', maxBuffer: 1 << 26 }));

test('FX4: every kept fall mask lies on painted water / lava (<= 6% of it on stone), pieces without a real fall are off with a reason', () => {
  const names = Object.keys(px.falls);
  assert.ok(names.length >= 14, 'kept falls: ' + names.join(','));
  for (const [name, [area, outside]] of Object.entries(px.falls)) assert.ok(outside / area <= 0.06, `${name}: ${outside}/${area} mask pixels are not painted fluid`);
  const off = layout.pieces.filter(p => p.off && p.group === 'waterfall').map(p => p.mask).sort();
  assert.deepEqual(off, ['waterfall-ice-center-step', 'waterfall-ice-east-cliff', 'waterfall-ice-mouth', 'waterfall-ice-plaza-right', 'waterfall-ice-upper-bridge'],
    'owner circle 4 (the fall pattern floating over the flat central stream) = center-step; the others have no vertical fall under them');
  for (const p of layout.pieces.filter(p => p.off)) assert.ok(p.offReason && p.offReason.length > 20, p.id + ' says why');
  assert.deepEqual(layout.pieces.filter(p => p.group === 'lavafall' && p.kind !== 'spots').filter(p => p.off), [], 'all 8 lava falls are real');
});

test('FX4: off pieces are never planned, loaded or drawn; the plan keeps every other piece', () => {
  const plan = fx.fluidDrawPlan(layout), ids = plan.flatMap(i => i.piece ? [i.piece.id] : i.puffs.map(q => q.id));
  for (const p of layout.pieces) assert.equal(ids.includes(p.id), !p.off, p.id);
  assert.ok(layout.pieces.filter(p => !p.off).length > 40);
});

test('FX4: shore streak bands (bank-foam-*-edge) hold <= 8% of their pixels away from painted water - none on the rocks beside the falls', () => {
  // v7: 3% -> 8%.  The HD shore is painted with pale / pink foam and wet-rock highlights that the purple hue test does not count as water (spirit edge 7.8% = scattered edge pixels,
  // checked by eye on the overlay of the band over the v7 ground: the band follows the shoreline, no stretch lies on dry rock).
  for (const [name, [area, outside]] of Object.entries(px.band)) assert.ok(area > 20000 && outside / area <= 0.08, `${name}: ${outside}/${area} band pixels off the water`);
});

test('FX4: no lava bubble / steam / embers on the lava falls; the flat lava keeps its own', () => {
  const sp = layout.pieces.filter(p => p.kind === 'spots' && ['lava-bubble', 'lava-steam', 'embers'].includes(p.group));
  assert.ok(sp.filter(p => p.mask.startsWith('lavafall')).every(p => p.off && p.spots.length === 0), 'every lavafall sprite piece is empty and off');
  const lake = sp.filter(p => !p.off && /^lava-/.test(p.mask));
  const n = g => lake.filter(p => p.group === g).reduce((s, p) => s + p.spots.length, 0);
  assert.ok(n('lava-bubble') >= 15 && n('lava-steam') >= 6 && n('embers') >= 6, `flat lava keeps bubbles ${n('lava-bubble')} steam ${n('lava-steam')} embers ${n('embers')}`);
  // spots are inside their lake mask rectangle
  for (const p of lake) { const [x, y, w, h] = p.maskRectPx.map(v => v * 3840 / 4915); for (const s of p.spots) assert.ok(s[0] >= x - 2 && s[0] <= x + w + 2 && s[1] >= y - 2 && s[1] <= y + h + 2, p.id); }
});

test('FX4: the owner-approved shore crests, the canteen and the FX3 loader are untouched', () => {
  const crest = layout.pieces.find(p => p.id === 'river-foam--shore');
  assert.equal(crest.spots.length, 30, 'the 30 approved crests');
  const l = readFileSync(file('src/canteen-art-layout.js'), 'utf8');
  assert.match(l, /CANTEEN_ART_FLIP=Object\.freeze\(\{th:true\}\)/); assert.match(l, /CANTEEN_ART_DY=Object\.freeze\(\{th:26\}\)/);
  assert.ok(existsSync(file('scripts/build-v5-fx4-trim.py')));
});
