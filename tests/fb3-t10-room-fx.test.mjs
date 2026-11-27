// FB3-T10 (27 Nov 2026) - O3: the weather of the outside map inside the rooms of the four zones, only in the open parts of each picture.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const ops = [];
const fakeCanvas = () => { const c = { width:0, height:0, getContext:() => ctx2d(c) }; return c; };
const ctx2d = canvas => new Proxy({ canvas, filter:'none', getTransform:() => ({ a:1, d:1, b:0, c:0, e:0, f:0 }), createLinearGradient:() => ({ addColorStop(){} }), createRadialGradient:() => ({ addColorStop(){} }) }, { get:(t, k) => k in t ? t[k] : () => {}, set:(t, k, v) => { t[k] = v; return true; } });
globalThis.document = { documentElement:{}, createElement:() => fakeCanvas() };
globalThis.Image = class { set src(v) {} };
const { openAreasOf, roomPictureStem, ROOM_AREA_FAMILIES } = await import('../src/room-open-areas.js');
const { makeRoomFx, roomEffectsOf, roomLeafAt, ROOM_FX } = await import('../src/room-fx.js');
const { roomWindAt } = await import('../src/room-tree-wind.js');
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const ZONES = ['th', 'asia', 'west', 'cyberhell'];
const KEYS = ['krata', 'dab', 'lokan', 'ngiw', 'lan', 'sawan', 'tarang', 'sala', 'krajok'];
const pictures = zone => [...KEYS.map(k => ({ k, src:`img/rooms-wide/${zone}-${k}${zone === 'th' && ['krata', 'lan', 'tarang'].includes(k) ? '-v2' : ''}.webp` })),
  { k:'tea', src:zone === 'th' ? 'img/tea-th-recovery-v2.webp' : `img/tea-${zone}-recovery.webp` }, { k:'canteen', src:zone === 'th' ? 'img/food-art/interior-th.webp' : 'img/food-art/interior.webp' }];

test('every room picture of every zone has open areas (data), well formed, and the roofs / building stay out of them', () => {
  for (const zone of ZONES) for (const { k, src: s } of pictures(zone)) {
    const a = openAreasOf(s); assert.ok(a, `${zone}/${k}: ${s}`);
    for (const poly of [a.floor, ...a.outside, ...(a.lava || [])]) { assert.ok(poly.length >= 3, `${zone}/${k} polygon`); for (const [u, v] of poly) assert.ok(u >= 0 && u <= 1 && v >= 0 && v <= 1, `${zone}/${k} point ${u},${v}`); }
    for (const [x0, y0, x1, y1] of a.leaves) { assert.ok(x0 < x1 && y0 < y1 && x0 >= 0 && y1 <= 1); }
    if (k !== 'tea' && k !== 'canteen') assert.ok(a.floor.every(([, v]) => v >= .45), `${zone}/${k}: the floor starts below the building at the back`);
  }
  assert.equal(openAreasOf('img/nowhere/unknown.webp'), null, 'a picture that is not in the table gets no weather');
  assert.equal(roomPictureStem('img/rooms-wide/th-krajok.webp?v=20261018-n1b'), 'th-krajok'); assert.equal(openAreasOf('img/rooms-wide/th-krajok.webp?v=20261018-n1b'), ROOM_AREA_FAMILIES.WIDE);
});

test('the effect of each zone: 1 cloud shadows + leaves + lava (2 light + shade, 3 snow, 4 rain follow)', () => {
  assert.deepEqual(roomEffectsOf('th'), ['cloud', 'leaves', 'lava']);
  assert.deepEqual(roomEffectsOf('nowhere'), []);
  assert.ok(ROOM_FX.maxPixels <= 300000 && ROOM_FX.frameMs >= 40, 'a small canvas, ~30 fps');
  assert.ok(ROOM_FX.maxParticles.west <= 220 && ROOM_FX.maxParticles.cyberhell <= 240, 'room particle caps');
});

test('Zone 1 leaves blow in the same gusts as the front trees: inside their box, pushed to the right by roomWindAt, still between gusts', () => {
  const box = [.88, .45, 1, .95];
  let peak = 0, pv = 0; for (let t = 0; t < 7400; t += 20) { const w = roomWindAt(t, .94); const v = w.strength * (1 + w.wave * .5); if (v > pv) { pv = v; peak = t; } }
  for (let i = 0; i < 30; i++) for (const t of [0, 1500, peak, 12000]) { const L = roomLeafAt(i, t, box); assert.ok(L.x >= box[0] && L.x <= box[2] && L.y >= box[1] && L.y <= box[3], `leaf ${i} at ${t}`); assert.ok(L.size >= 3 && L.size <= 5.6); }
  const base = i => { const t = 0; return roomLeafAt(i, t, box).x; };
  let calm = null; for (let t = 0; t < 7400; t += 10) if (roomWindAt(t, .94).strength === 0 && roomWindAt(t, .90).strength === 0) { calm = t; break; }
  assert.notEqual(calm, null); const open = [0, .1, .2], b0 = box[0];
  const shifted = [...Array(20).keys()].filter(i => Math.abs(roomLeafAt(i, peak, [0, 0, 1, 1]).x - roomLeafAt(i, calm, [0, 0, 1, 1]).x) > .01).length;
  assert.ok(shifted >= 8, 'a gust carries most leaves sideways: ' + shifted);
});

test('makeRoomFx: nothing when reduced motion or the weather switch is off, nothing for a picture without areas, draws only inside the box, destroy frees the layers', () => {
  const box = { ox:100, oy:50, w:800, h:450 };
  const draws = []; const ctx = new Proxy({ canvas:{ width:1000, height:600 }, getTransform:() => ({ a:1, d:1, b:0, c:0 }) }, { get:(t, k) => k in t ? t[k] : (...a) => { if (k === 'drawImage') draws.push(a); if (k === 'rect') draws.rect = a; } , set:() => true });
  const off = makeRoomFx({ zone:'th', bgSrc:'img/rooms-wide/th-krata-v2.webp', reduced:() => true, enabled:() => true }); draws.length = 0; off.draw(ctx, box, 1000, {}); assert.equal(draws.length, 0, 'reduced motion: nothing');
  const sw = makeRoomFx({ zone:'th', bgSrc:'img/rooms-wide/west-krata.webp', reduced:() => false, enabled:() => false }); sw.draw(ctx, box, 1000, {}); assert.equal(draws.length, 0, 'weather switch off: nothing');
  const none = makeRoomFx({ zone:'th', bgSrc:'img/unknown.webp' }); assert.equal(none.active, false); none.draw(ctx, box, 1000, {}); assert.equal(draws.length, 0);
  const on = makeRoomFx({ zone:'th', bgSrc:'img/rooms-wide/th-krata-v2.webp', reduced:() => false, enabled:() => true }); assert.equal(on.active, true); on.draw(ctx, box, 1000, {});
  assert.ok(draws.length >= 1, 'snow is laid on the picture'); for (const d of draws) { assert.deepEqual(d.slice(1), [box.ox, box.oy, box.w, box.h], 'always the picture box, through a soft mask'); }
  assert.ok(on.layers().sky && on.layers().air && on.layers().lava, 'zone 1: shadows, leaves, lava'); on.destroy(); assert.equal(on.layers().air, null);
  assert.deepEqual(makeRoomFx({ zone:'th', bgSrc:'img/rooms-wide/th-krata-v2.webp', reduced:() => false, enabled:() => true }).effects, ['cloud', 'leaves', 'lava']);
});

test('wiring: room.js lays the weather over the picture, before the characters; stops with the room; survives a GPU loss', () => {
  const room = src('src/room.js'), fx = src('src/room-fx.js');
  assert.match(room, /import \{ makeRoomFx \} from '\.\/room-fx\.js'/); assert.match(room, /const roomFx = makeRoomFx\(\{ zone:g\.zone, bgSrc, room, mirror:!!room\.mirror, reduced:prefersReducedMotion \}\)/);
  const at = room.indexOf('roomFx.draw(ctx, box, t, { bg })'); assert.ok(at > room.indexOf('const drawRoomLayer') && at < room.indexOf('const U = unit();'), 'right after the picture, before anything stands on it');
  assert.match(room, /dead = true;\s*roomFx\.destroy\(\);/);
  assert.match(fx, /gpuLossEpoch\(\)/); assert.match(fx, /reduced\(\) \|\| !enabled\(\)/);
  assert.match(fx, /quiet:true/, 'no lightning flash inside a room');
  const html = src('index.html'); assert.ok(html.includes('"./src/room-fx.js": "./src/room-fx.js?v=') && html.includes('"./src/room-open-areas.js": "./src/room-open-areas.js?v='));
  assert.doesNotMatch(fx, /\.filter\s*=\s*`?(brightness|hue|saturate|sepia)/, 'the pictures are never recoloured');
});
