// SCENE-FX - painted lava / waterfalls / torches that move in the battle + interrogation backdrops; cloud shadows, snow (zone 3), rain + lightning (zone 4).
// Pixel questions are answered by one Python run (PIL / numpy / OpenCV) that re-uses the colour tests of scripts/build-scene-fx.py.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const file = u => fileURLToPath(new URL('../' + u, import.meta.url));
const layout = JSON.parse(readFileSync(file('img/scene-fx/scene-fx-layout.json'), 'utf8'));
const fx = await import('../src/scene-fluid-fx.js');
const atm = await import('../src/scene-atmosphere.js');
const amb = await import('../src/map-ambient.js');

const PY = `
import sys, json, importlib.util, numpy as np, cv2
from PIL import Image
root = sys.argv[1]
spec = importlib.util.spec_from_file_location('b', root + 'scripts/build-scene-fx.py'); b = importlib.util.module_from_spec(spec); spec.loader.exec_module(b)
lay = json.load(open(root + 'img/scene-fx/scene-fx-layout.json'))
src = {s['id']: (k, s) for k, s in lay['scenes'].items()}
out = {'sizes': {}, 'pieces': {}}
for k, s in lay['scenes'].items():
    im = Image.open(root + k); out['sizes'][k] = list(im.size)
    rgb = np.asarray(im.convert('RGB')); P = b.preds(rgb)
    spec_by_id = {sp['id']: sp for sp in b.SCENES[k]['pieces']}
    for p in s['pieces']:
        if p['kind'] == 'embers':
            lava = cv2.dilate((P['hot'] | P['hotLow'] | P['hotY']).astype(np.uint8), np.ones((9, 9), np.uint8)) > 0     # an ember starts on, or within 4 px of, painted lava
            cov = [int(lava[int(sp[1]), int(sp[0])]) for sp in p['spots']]
            out['pieces'][p['id']] = {'kind': 'embers', 'spots': len(cov), 'onLava': sum(cov)}
            continue
        m = np.asarray(Image.open(root + 'img/scene-fx/masks/' + p['mask'] + '.webp').convert('RGBA'))
        x, y, w, h = p['rect']
        full = np.zeros(rgb.shape[:2], bool); full[y:y + h, x:x + w] = m[..., 3] > 127
        pid = p['id'].split('--', 1)[1]
        ok = P[spec_by_id[pid]['pred']]
        ok = cv2.dilate(ok.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
        bx = spec_by_id[pid]['box']; inbox = np.zeros(rgb.shape[:2], bool); inbox[bx[1]:bx[3], bx[0]:bx[2]] = True
        out['pieces'][p['id']] = {'kind': p['kind'], 'maskSize': [m.shape[1], m.shape[0]], 'rect': p['rect'], 'area': int(full.sum()), 'outside': int((full & ~ok).sum()), 'outsideBox': int((full & ~inbox).sum())}
json.dump(out, sys.stdout)
`;
const px = JSON.parse(execFileSync('python3', ['-c', PY, file('')], { encoding: 'utf8', maxBuffer: 1 << 26 }));
const PIECES = Object.values(layout.scenes).flatMap(s => s.pieces);

test('SCENE-FX layout: every backdrop, mask and sheet exists and the sizes agree', () => {
  assert.ok(Object.keys(layout.scenes).length >= 6, 'the six zone-1 backdrops');
  for (const [key, s] of Object.entries(layout.scenes)) {
    assert.ok(existsSync(file(key)), key);
    assert.deepEqual(px.sizes[key], s.size, key + ' size');
    assert.ok(s.pieces.length >= 3, key + ' has pieces');
    for (const p of s.pieces) {
      const [x, y, w, h] = p.rect;
      assert.ok(x >= 0 && y >= 0 && x + w <= s.size[0] && y + h <= s.size[1], p.id + ' inside the picture');
      if (p.kind === 'embers') { assert.ok(existsSync(file(layout.sheetsDir + p.sheet))); continue; }
      assert.ok(existsSync(file(layout.masksDir + p.mask + '.webp')), p.id + ' mask');
      assert.deepEqual(px.pieces[p.id].maskSize, [w, h], p.id + ' mask is cropped to its rect');
      if (p.kind !== 'pulse') assert.ok(existsSync(file(layout.sheetsDir + p.sheet)), p.id + ' sheet');
    }
  }
});

test('SCENE-FX masks sit on the painted fluid / flame: <= 3% of a mask is outside the colour test, nothing leaves its search box', () => {
  for (const p of PIECES.filter(p => p.kind !== 'embers')) {
    const r = px.pieces[p.id];
    assert.ok(r.area > 100, p.id + ' has area');
    assert.ok(r.outside / r.area <= 0.03, `${p.id}: ${r.outside}/${r.area} mask pixels are not the painted fluid`);
    assert.equal(r.outsideBox, 0, p.id + ' stays inside its search box');
  }
  for (const p of PIECES.filter(p => p.kind === 'embers')) {
    const r = px.pieces[p.id];
    assert.ok(r.onLava >= r.spots * .9, `${p.id}: ${r.onLava}/${r.spots} embers start on painted lava`);
    if (p.group === 'embers') assert.ok(p.spots.every(s => s[8] < 0), 'embers rise');
  }
});

test('SCENE-FX only uses frames that were drawn (Codex sheets, blend / frame counts of the map), and never recolours: the three blends are plain CSS', () => {
  const map = JSON.parse(readFileSync(file('img/map-zone1/v5-fx/fx-layout.json'), 'utf8'));
  const drawn = new Map(map.pieces.map(p => [p.sheet, p]));
  for (const p of PIECES.filter(p => p.kind !== 'pulse')) {
    const d = drawn.get(p.sheet); assert.ok(d, p.sheet + ' is a sheet of the map layout');
    assert.equal(p.frames, d.frames, p.sheet + ' frames'); assert.equal(p.frameW, d.frameW); assert.equal(p.frameH, d.frameH); assert.equal(p.blend, d.blend, p.sheet + ' blend as on the map');
    assert.ok(p.opacity <= d.opacity + .2, p.id + ': lava may sit above the map strength (FX5 owner: barely visible), never far above');
  }
  const src = readFileSync(file('src/scene-fluid-fx.js'), 'utf8') + readFileSync(file('src/scene-atmosphere.js'), 'utf8');
  assert.doesNotMatch(src, /getImageData|putImageData|ctx\.filter|\.filter\s*=|blur\(|hue-rotate|saturate\(|brightness\(/, 'no recolour / filter / readback');
});

test('SCENE-FX frames mix without a jump over three loops and pulses stay gentle', () => {
  for (const [frames, fps] of [[8, 7], [8, 8]]) {
    let prev = null;
    for (let ms = 0; ms < 3 * frames / fps * 1000; ms += 10) {
      const f = fx.sceneFxFrame(frames, fps, ms), w = f.mix;
      assert.ok(f.i >= 0 && f.i < frames && f.j >= 0 && f.j < frames && w >= 0 && w < 1);
      const key = [f.i, f.j].join();
      if (prev && prev.key !== key) assert.equal(f.i, prev.j, 'the frame that was fading in becomes the first one'), assert.ok(prev.mix > .9, 'and only after the old pair finished (' + prev.mix + ')');
      prev = { key, j: f.j, mix: w };
    }
  }
  assert.deepEqual(fx.sceneFxFrame(1, 8, 999), { i: 0, j: 0, mix: 0 });
  const torch = PIECES.find(p => p.kind === 'pulse');
  for (let s = 0; s < 60; s += .1) { const a = fx.pulseLevel(torch, s); assert.ok(a >= 0 && a <= torch.depth + 1e-9, 'pulse ' + a); }
  assert.ok(torch.depth <= .25, 'flicker is a screen of the painted pixels at <= 25%');
  assert.equal(fx.sceneFxKey('url("http://127.0.0.1:8951/img/map-zone1/battle-ice-v1.webp")'), 'img/map-zone1/battle-ice-v1.webp');
  assert.deepEqual(fx.scenePieceRect({ rect: [100, 50, 20, 10] }, { x: -50, y: 10, w: 836, h: 470 }, [1672, 941]), [0, 35, 10, 5]);
});

test('SCENE-FX: no cloud shadow in the cave, the weather switch / reduced motion draw nothing, pause never freezes a flash', () => {
  assert.equal(layout.scenes['img/frontier-route/battle-cave-v1.webp'].outdoor, false, 'cave = indoors');
  for (const [k, s] of Object.entries(layout.scenes)) if (!k.includes('cave')) assert.equal(s.outdoor, true, k);
  const calls = []; const ctx = new Proxy({ canvas: { width: 780, height: 1688, clientWidth: 390, clientHeight: 844 } }, { get: (o, k) => k in o ? o[k] : (...a) => { calls.push(k); return { addColorStop() {} }; }, set: (o, k, v) => (o[k] = v, true) });
  const r = atm.drawSceneAtmosphere(ctx, 'west', 5000, 390, 844, { enabled: false });
  assert.deepEqual(r, { particles: 0 }); assert.equal(calls.length, 0, 'weather switched off: nothing drawn');
  // a strike in its flash: the paused (quiet) draw has no flash fill and no bolt
  let flashAt = null; for (let t = 0; t < 20000 && flashAt === null; t += 7) if (amb.stormFlash(t) > .1) flashAt = t;
  assert.ok(flashAt !== null);
  const fills = []; const c2 = new Proxy({ canvas: { width: 390, height: 844, clientWidth: 390, clientHeight: 844 } }, { get: (o, k) => k in o ? o[k] : (...a) => { if (k === 'fillRect') fills.push([o.fillStyle, o.globalAlpha]); return { addColorStop() {} }; }, set: (o, k, v) => (o[k] = v, true) });
  fills.length = 0; amb.drawBiomeWeather(c2, 'cyberhell', flashAt, 390, 844, false, [0, 0, 1, 1], 60, { quiet: true });
  assert.ok(!fills.some(f => f[0] === '#d7eaff'), 'paused: no flash fill');
  fills.length = 0; amb.drawBiomeWeather(c2, 'cyberhell', flashAt, 390, 844, false, [0, 0, 1, 1], 60);
  assert.ok(fills.some(f => f[0] === '#d7eaff' && f[1] <= .25), 'moving: the flash exists and is <= .25');
});

test('lightning is safe: flash <= .25, <= 2 pulses per strike, strikes >= 2.8 s apart, never more than 2 flashes in any second', () => {
  const S = amb.MAP_FX.storm; assert.ok(S.flash <= .25); assert.ok(S.pulses.length <= 2); assert.ok(S.period - S.jitter >= 2800);
  let peak = 0; const onset = [];
  let was = false;
  for (let t = 0; t < 120000; t += 5) { const f = amb.stormFlash(t); peak = Math.max(peak, f); const on = f > .02; if (on && !was) onset.push(t); was = on; }
  assert.ok(peak <= .25, 'peak ' + peak);
  for (let i = 0; i < onset.length; i++) assert.ok(onset.filter(t => t >= onset[i] && t < onset[i] + 1000).length <= 2, 'at most 2 flashes inside any second');
});

test('zone 3 snow and zone 4 rain are a real fall on a phone: density follows the map rule, bounded, desktop >= phone', () => {
  for (const z of ['west', 'cyberhell']) {
    const phone = atm.sceneWeatherCap(z, 390, 844, 3), phone1 = atm.sceneWeatherCap(z, 390, 844, 1), desk = atm.sceneWeatherCap(z, 1280, 800, 1);
    assert.ok(phone >= 150, z + ' phone ' + phone); assert.ok(desk >= phone && desk <= atm.SCENE_WEATHER.max[z] && phone1 >= phone);
  }
  assert.equal(atm.sceneWeatherCap('th', 390, 844, 1), null, 'zone 1 / 2 keep their own embers / leaves');
  assert.deepEqual(atm.SCENE_EFFECTS.west, ['cloud', 'fog', 'snow']); assert.deepEqual(atm.SCENE_EFFECTS.cyberhell, ['cloud', 'rain', 'lightning']);
});

test('cloud shadows stay at the map strength and never cover plates, hit points or damage numbers', () => {
  assert.equal(amb.cloudOpacityForZone('th'), .32);
  const src = readFileSync(file('src/scene-atmosphere.js'), 'utf8');
  for (const sel of ['.plate', '.dmg', '.battle-move-name', '.hpbar', '.nm']) assert.ok(atm.SCENE_CLEAR_SELECTOR.includes(sel), sel);
  assert.match(src, /globalCompositeOperation='destination-out'[\s\S]{0,700}for\(const h of holes\)/, 'the sky canvas is cut open over them');
  assert.match(src, /shadowBlur=12\*kk/, 'FB2-v2: the cut is feathered (shadow of an off-canvas copy), never a hard pale rectangle behind the plate');
  assert.match(src, /data-context=battle\]:not\(\.scene-atmosphere-ground\)\{z-index:30\}/, 'battle sky sits above the figures but under the fx layer (z 50)');
  const cam = readFileSync(file('src/battle-camera.css'), 'utf8'); assert.match(cam, /\.cam-world>\.cam-layer\{[^}]*z-index:50/);
});

test('SCENE-FX ground canvases blend with the painted picture and stay under the figures; the sheets are only fetched for a picture that is on screen', () => {
  const src = readFileSync(file('src/scene-atmosphere.js'), 'utf8');
  assert.match(src, /\.scene-atmosphere-ground\{z-index:0!important\}/); assert.match(src, /mix-blend-mode:overlay/); assert.match(src, /world\.prepend\(c\)/);
  assert.deepEqual([...atm.SCENE_BLENDS], ['overlay', 'screen', 'soft-light', 'luminosity']);
  const fl = readFileSync(file('src/scene-fluid-fx.js'), 'utf8'); assert.match(fl, /off screen: no load, no memory/);
});

test('every module this round changed has a new ?v= in the import map (lesson of review 451678f6)', () => {
  const html = readFileSync(file('index.html'), 'utf8');
  const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  for (const m of ['scene-fluid-fx', 'scene-atmosphere', 'map-ambient']) assert.match(map[`./src/${m}.js`], /\?v=20261106-fx5$/, m);
  assert.match(map['./src/map-ambient.js?v=mapfx-k1d'], /\?v=20261106-fx5$/);
  for (const m of ['ui', 'battle-camera']) { /* ui.js / css not edited in this round */ }
});
