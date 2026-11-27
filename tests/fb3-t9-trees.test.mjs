// FB3-T9 (27 Nov 2026) - O2 trees: the colour of the front tree in each Zone 1 room follows the building's place on the map, the map's trees sway (trunk still, reduced motion still),
// the CLEAN2 hand-overs (legacy tree art, the 404 of town-tree-willow, the signal sheets) and the handbook cards that MN1 made redundant.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
globalThis.document = { documentElement:{}, createElement:() => ({ width:0, height:0, getContext:() => ({ imageSmoothingEnabled:true, drawImage(){} }) }) };
const { frontTreeColour, frontTreeArt, mapThird, ZONE1_BUILDING_X, FRONT_TREE_ART } = await import('../src/front-tree-colour.js');
const { TOWN_SIZE } = await import('../src/town-layout.js');
const { swayBandOffset, drawSwayingTree, SWAY_BANDS, SWAY_CANOPY, SWAY_AMPLITUDE } = await import('../src/tree-sway.js');
const { roomWindAt } = await import('../src/room-tree-wind.js');
const { townPropArt } = await import('../src/town-scenery.js');
const { setActiveTownZone } = await import('../src/zone-skin.js');
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

test('room trees: left third of the map = red, middle = green, right third = white (per building, from its place on the map)', () => {
  assert.equal(mapThird(0), 'left'); assert.equal(mapThird(TOWN_SIZE.w / 3 - 1), 'left'); assert.equal(mapThird(TOWN_SIZE.w / 3), 'middle'); assert.equal(mapThird(TOWN_SIZE.w * 2 / 3 - 1), 'middle'); assert.equal(mapThird(TOWN_SIZE.w * 2 / 3), 'right'); assert.equal(mapThird(TOWN_SIZE.w), 'right');
  const table = { krata:'red', dab:'red', ngiw:'red', tarang:'green', tea:'green', canteen:'green', sawan:'green', sala:'green', lan:'white', lokan:'white', krajok:'white' };
  for (const [k, c] of Object.entries(table)) assert.equal(frontTreeColour(k), c, `${k} stands at x=${ZONE1_BUILDING_X[k]}`);
  assert.equal(frontTreeColour('nowhere'), null); assert.equal(frontTreeArt('nowhere'), null);
  // the five rooms that have a front tree: krata (left) red · tarang, tea, canteen (middle) green · lan (right) white
  assert.deepEqual(['krata', 'tarang', 'tea', 'canteen', 'lan'].map(frontTreeColour), ['red', 'green', 'green', 'green', 'white']);
  for (const [c, f] of Object.entries(FRONT_TREE_ART)) { assert.ok(existsSync(new URL('../' + f, import.meta.url)), f); assert.equal(frontTreeArt({ red:'krata', green:'tarang', white:'lan' }[c]), f); }
  // the game's own sprites of each colour, never recoloured in code: the room draws exactly the file, with the room-tree wind
  const room = src('src/room.js'); assert.match(room, /const art = frontTreeArt\(def\.k\); return art \? \{\.\.\.tree, src:art, wind:'banyan', opacity:1\}/); assert.doesNotMatch(room.slice(room.indexOf('const frontTrees'), room.indexOf('const frontTrees') + 400), /hue-rotate|saturate\(|filter/);
});

test('map trees: the canopy slides in the gusts of the rooms, the trunk and roots never move, the higher the further, nothing outside gusts', () => {
  const peak = (() => { let best = 0, bt = 0; for (let t = 0; t < 7400; t += 20) { const s = roomWindAt(t, 1000 / 1400); const v = s.strength * (1 + s.wave * .62); if (v > best) { best = v; bt = t; } } return bt; })();
  const top = swayBandOffset(peak, 1000, 180, 0), low = swayBandOffset(peak, 1000, 180, SWAY_BANDS - 1);
  assert.ok(Math.abs(top.dx) > 0.2 && Math.abs(top.dx) <= SWAY_AMPLITUDE * 180 * 1.7, 'top band moves, by well under 3 px on a 180 px tree: ' + top.dx);
  assert.ok(Math.abs(top.dx) > Math.abs(low.dx) * 3, 'the lowest canopy band hardly moves'); assert.ok(top.dy < 0, 'a little lift');
  for (let b = 1; b < SWAY_BANDS; b++) assert.ok(Math.abs(swayBandOffset(peak, 1000, 180, b - 1).dx) >= Math.abs(swayBandOffset(peak, 1000, 180, b).dx) - 1e-9, 'monotone down the canopy');
  assert.deepEqual(swayBandOffset(peak, 1000, 180, SWAY_BANDS), { dx:0, dy:0 }, 'the trunk piece');
  let calm = null; for (let t = 0; t < 7400; t += 10) if (roomWindAt(t, 1000 / 1400).strength === 0) { calm = t; break; } assert.notEqual(calm, null);
  { const c = swayBandOffset(calm, 1000, 180, 0); assert.equal(c.dx, 0); assert.equal(Math.abs(c.dy), 0, 'between gusts the tree stands still'); }
  // a gust travels: a tree far down the wind peaks later than this one
  assert.notEqual(swayBandOffset(peak, 3000, 180, 0).dx.toFixed(3), top.dx.toFixed(3));
});

/** a canvas context that only records drawImage calls */
const recorder = () => { const calls = []; return { calls, ctx:{ getTransform:() => ({ a:1, d:1, b:0, c:0 }), save(){}, restore(){}, drawImage:(...a) => calls.push(a), imageSmoothingEnabled:true, imageSmoothingQuality:'low' } }; };
const fakeImage = { naturalWidth:1199, naturalHeight:1312, width:1199, height:1312 };
test('drawSwayingTree: one still piece for trunk + roots at the same place in every frame; only canopy bands move; same pixels (no filter, no recolour)', () => {
  const peakT = 2280, calmT = 0;
  const calm = recorder(), gust = recorder();
  assert.equal(drawSwayingTree(calm.ctx, fakeImage, 100, 50, 180, 197, calmT, 0), true); assert.equal(drawSwayingTree(gust.ctx, fakeImage, 100, 50, 180, 197, peakT, 0), true);
  assert.equal(calm.calls.length, SWAY_BANDS + 1); assert.equal(gust.calls.length, SWAY_BANDS + 1);
  const trunk = c => c.calls[0]; assert.deepEqual(trunk(calm).slice(1), trunk(gust).slice(1), 'trunk piece: same source and destination in a calm and in a gust');
  assert.ok(trunk(gust)[2] >= Math.round(197 * SWAY_CANOPY) - 1 && trunk(gust)[2] <= Math.round(197 * SWAY_CANOPY) + 1, 'the trunk starts where the canopy ends');
  const moved = gust.calls.slice(1).filter((c, i) => Math.abs(c[5] - calm.calls[i + 1][5]) > 1e-6);
  assert.ok(moved.length >= 3, 'canopy bands slide: ' + moved.length);
  for (const c of gust.calls) assert.equal(c[0], gust.calls[0][0], 'every piece is cut from the same baked copy of the sprite');
  const covered = gust.calls.slice(1).reduce((s, c) => s + c[4], 0); assert.ok(covered >= Math.round(197 * SWAY_CANOPY) - 1, 'the bands cover the whole canopy (no gap)');
  // too small / rotated: one plain still draw
  const small = recorder(); assert.equal(drawSwayingTree(small.ctx, fakeImage, 0, 0, 10, 10, peakT, 0), false); assert.equal(small.calls.length, 1);
});

test('reduced motion: the map draws the still picture (no sway) - wired in town-scenery, the sway module itself never reads the preference', () => {
  const s = src('src/town-scenery.js');
  assert.match(s, /function swaySprite\(ctx,image,x,y,w,time,reduced\) \{\s*if\(reduced\|\|!image\|\|typeof document==='undefined'\)\{sprite\(ctx,image,x,y,w\);return;\}/);
  assert.match(s, /if\(p\.kind==='tree'\)swaySprite\(ctx,shown,p\.x,p\.y,p\.w,time,reduced\);else sprite\(/);
  assert.ok(src('src/scene.js').includes("reduced = !!reducedMotion?.matches") && src('src/scene.js').includes('addTownSceneryLayers(at,ctx,archiveHouse,sceneryTree,sceneryWaterfall,g,t,cameraView,reduced,img)'));
  assert.doesNotMatch(src('src/tree-sway.js'), /\.filter\s*=|hue-rotate|globalCompositeOperation|fillStyle/, 'no recolour in the sway');
});

test('CLEAN2 hand-over: legacyTreeArt and its two 3.7 MB pictures are gone; town-tree-willow is never asked of a zone that does not own it; the signal sheets left the shipped folder', () => {
  assert.doesNotMatch(src('src/dungeon-view.js'), /legacyTreeArt/); assert.doesNotMatch(src('tests/f12-input.test.mjs'), /unavailable replacement falls back/);
  for (const f of ['img/theme-v4/town-tree-asia-v1.webp', 'img/theme-v4/town-tree-c-asia-v1.webp']) assert.ok(!existsSync(new URL('../' + f, import.meta.url)), f + ' deleted');
  for (const z of ['th', 'asia', 'west']) { assert.ok(!existsSync(new URL(`../img/story-sig/boss-frontier-${z}-signal-v1.webp`, import.meta.url))); assert.ok(existsSync(new URL(`../art-src/story-sig-sheets/boss-frontier-${z}-signal-v1.webp`, import.meta.url))); assert.ok(existsSync(new URL(`../img/story-sig/boss-frontier-${z}-signal-idle.webp`, import.meta.url))); }
  const asked = []; const resolve = k => { asked.push(k); return null; }, willow = { kind:'tree', key:'town-tree-willow', fallbackKey:'town-tree-th', biome:'city', x:0, y:0, w:100 };
  setActiveTownZone('th'); townPropArt(willow, null, null, resolve); assert.ok(!asked.includes('town-tree-willow') && asked.includes('town-tree-th'), 'Zone 1 art is active: no willow request');
  asked.length = 0; setActiveTownZone('asia'); townPropArt(willow, null, null, resolve); assert.equal(asked[0], 'town-tree-willow', "Zone 2's own skin still gets its willow"); setActiveTownZone('th');
  assert.ok(src('src/art.js').includes('art-src/story-sig-sheets'));
});

test('handbook: the cards MN1 made redundant are gone, the ones with their own content stay; story.js has no English "Guard" in the Thai text', () => {
  const ui = src('src/ui.js');
  assert.doesNotMatch(ui, /<li>เลือก <b>สถานีที่ตรงชนิดกรรม<\/b> \+ <b>ระยะเวลาลงทัณฑ์<\/b> แล้วออกหมาย<\/li>/, 'old step 8 = MN1 box 3');
  assert.match(ui, /sentencingChapters\.filter\(ch => ch !== sentenceColorGuide\)/);
  for (const keep of ['ไต่สวนก่อนตัดสิน', 'กระจกวิเศษมีจำนวนจำกัด', 'สถานีที่มี = สำนวนที่จะได้รับ', 'คำตัดสินไม่จบที่คดีนั้น', 'ยมทูตแต่ละคนหิวได้']) assert.ok(ui.includes(keep), keep);
  assert.doesNotMatch(src('src/story.js'), /ยมทูตและ Guard/); assert.ok(src('src/story.js').includes('ยมทูตและผู้เฝ้าด่านจากทั้งสี่โซนที่มาช่วย'));
});
