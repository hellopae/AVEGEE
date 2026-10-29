import { assertVersionedImports } from './helpers/versioned-imports.mjs';
// M2 round 0: zone skin table, per-zone town layout, light emitters. Zone 1 must be byte-for-byte what it was.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ZONE_SKIN, isTownZone, townSkinOf, setActiveTownZone, activeTownZone, enableTownSkin, disableTownSkin, PLANNED_ART, townSkinArt } from '../src/zone-skin.js';
import { themeArt } from '../src/theme-assets.js';
import { mapReviewArt, reviewStationBox, MAP_REVIEW_SIZES } from '../src/map-art-v5.js';
import { TOWN_TERRAIN_DIR, TOWN_TERRAIN_PREVIEW, TOWN_TERRAIN_FULL_PX, townChunkRect, townChunkUrl, townTerrainGrid } from '../src/town-terrain.js?v=k1d';
import { TOWN_FLOW_URL } from '../src/town-flow.js?v=n4';
import * as L from '../src/town-layout.js?v=k1d';
import { SCENE, STATIONS, SPOTS, syncSceneZone } from '../src/data.js';
import { fireStrength, hueStrength, emitAt } from '../src/town-lighting.js?v=fire-v2';

const reset = () => { for (const z of ['asia','west','cyberhell']) if (ZONE_SKIN[z].enabled) disableTownSkin(z); syncSceneZone('th'); };

test('Zone 1 skin resolves to exactly the files the hard-coded keys used to', () => {
  const legacy = {
    'town-judgment-th':'img/theme-v4/town-judgment-th-v2.webp', 'town-tree-th':'img/theme-v4/town-tree-th-v1.webp',
    'town-tree-red-th':'img/theme-v4/town-tree-red-th-v1.webp', 'town-tree-snow-th':'img/theme-v4/town-tree-snow-th-v1.webp',
    'town-prop-palm':'img/theme-v4/town-palm-th-v1.webp', 'town-prop-lamp-gold':'img/theme-v4/town-lamp-gold-th-v1.webp',
    'town-prop-rock':'img/map-zone1/prop-rock-v1.webp', 'town-residence-front-one':'img/town-district/house-front-one-v1.webp',
    'town-residence-right-one':'img/town-district/house-right-one-v1.webp', 'town-residence-left-two':'img/town-district/house-left-two-v1.webp',
    'town-residence-right-two':'img/town-district/house-right-two-v1.webp', 'town-waterfall-th':'img/theme-v4/town-waterfall-th-v1.webp',
    'town-house-th':'img/theme-v4/town-house-th-v1.webp', 'town-paving-th':'img/theme-v4/town-paving-th-v1.webp',
  };
  for (const [key, file] of Object.entries(legacy)) assert.equal(themeArt(key, 'th'), file, key);
  // zones that still use the old map system get the Zone 1 file for these keys, as before
  for (const [key,file] of Object.entries(legacy)) assert.equal(themeArt(key,'cyberhell'),key==='town-judgment-th'?'img/theme-v4/town-judgment-cyberhell-v2.webp':file,key);
  assert.equal(ZONE_SKIN.th.art['town-prop-torch-pillar'], 'img/map-zone1/torch-pillar-v1.webp');
  assert.equal(TOWN_TERRAIN_DIR, 'img/map-zone1/v5/');
  assert.equal(TOWN_TERRAIN_PREVIEW, 'img/map-zone1/v5/zone1-terrain-v5-preview.webp');
  assert.deepEqual({ ...TOWN_TERRAIN_FULL_PX }, { w:4915, h:3277 });
  assert.equal(TOWN_FLOW_URL, 'img/map-zone1/v4/flow-v4.png');
  assert.equal(townChunkUrl(3, 4), 'img/map-zone1/v5/r3-c4.webp');
  assert.deepEqual(townTerrainGrid('th'), { chunk:1024, cols:5, rows:4, full:{ w:4915, h:3277 }, unitX:3840/4915, unitY:2560/3277 });
  // last column / row are the short ones
  const last = townChunkRect(4, 5); assert.ok(Math.abs(last.w - 819 * 3840 / 4915) < 1e-9 && Math.abs(last.h - 205 * 2560 / 3277) < 1e-9);
  assert.deepEqual(townChunkRect(1, 1), { x:0, y:0, w:1024 * 3840 / 4915, h:1024 * 2560 / 3277 });
});

test('Zone 1 station art: facade v2 only for the four listed stations, same box limits', () => {
  for (const k of ['sala','tea','sawan','krajok']) assert.equal(mapReviewArt('st-' + k, 'th'), `img/map-v5/st-${k}-th-v2.webp`);
  for (const k of ['krata','dab','ngiw','tarang','lan']) assert.equal(mapReviewArt('st-' + k, 'th'), `img/map-v5/st-${k}-th.webp`);
  const im = { naturalWidth:1000, naturalHeight:1000 };
  assert.deepEqual(reviewStationBox({ k:'sala', bx:100, by:200, mapScale:1 }, im, 'th').w, 280 / 1000 * 1000 * Math.min(1, 330 / 280));
  const old = reviewStationBox({ k:'krata', bx:100, by:200, mapScale:2 }, im, 'th');
  assert.equal(old.w, Math.min(MAP_REVIEW_SIZES.krata[0] / 1000, MAP_REVIEW_SIZES.krata[1] / 1000) * 1000 * 2);
});

test('disabled zones retain the old map system, no skin, no town', () => {
  reset();
  for (const z of ['asia','west','cyberhell']) { assert.equal(isTownZone(z), false); assert.equal(townSkinOf(z), null); }
  assert.equal(isTownZone('th'), true);
  syncSceneZone('asia'); assert.equal(SCENE.w, 1678); assert.equal(activeTownZone(), 'th');
  syncSceneZone('th'); assert.equal(SCENE.w, 3840);
  // old per-zone station sprites still resolve through the old route
  assert.equal(mapReviewArt('st-sala', 'asia'), 'img/map-v5/st-sala-asia.webp');
});

test('switching a skin on is data: `use` lists the finished groups, the rest falls back to Zone 1', () => {
  reset();
  const P = PLANNED_ART('asia', 'map-zone2');
  assert.equal(P.judgment['town-judgment-th'], 'img/theme-v4/town-judgment-asia-v3.webp');
  assert.equal(P.torch['town-prop-torch-pillar'], 'img/map-zone2/torch-pillar-v3.webp');
  assert.equal(P.houses['town-residence-left-two'], 'img/town-district/house-left-two-asia-v3.webp');
  assert.equal(P.trees['town-tree-red-th'], 'img/frontier-route/tree-maple-v2.png');
  enableTownSkin('asia', { use:['judgment','houses'], terrain:{dir:'img/map-zone2/v1/',preview:'img/map-zone2/v1/zone2-terrain-v1-preview.webp',fullPx:{w:4915,h:3277},chunk:1024,repairs:false} });
  try {
    assert.equal(isTownZone('asia'), true);
    assert.equal(themeArt('town-judgment-th', 'asia'), 'img/theme-v4/town-judgment-asia-v3.webp');
    assert.equal(themeArt('town-residence-front-one', 'asia'), 'img/town-district/house-front-one-asia-v3.webp');
    assert.equal(themeArt('town-tree-th', 'asia'), 'img/theme-v4/town-tree-th-v1.webp', 'tree group not listed -> Zone 1 tree');
    assert.equal(themeArt('town-judgment-th', 'th'), 'img/theme-v4/town-judgment-th-v2.webp', 'Zone 1 untouched');
    assert.equal(townSkinArt('west', 'town-judgment-th'), null);
    assert.equal(townChunkUrl(2, 2, 'asia'), 'img/map-zone2/v1/r2-c2.webp');
    assert.equal(ZONE_SKIN.asia.terrain.preview, 'img/map-zone2/v1/zone2-terrain-v1-preview.webp');
    // zone-1 facades are NOT borrowed: sala of zone 2 is st-sala-asia-v3.webp, with the facade box limits of a town zone
    assert.equal(mapReviewArt('st-sala', 'asia'), 'img/map-v5/st-sala-asia-v3.webp');
    const box = reviewStationBox({ k:'sala', bx:0, by:0, mapScale:1 }, { naturalWidth:1200, naturalHeight:1200 }, 'asia');
    assert.ok(Math.abs(box.w - 280) < 1e-9 || box.w < 280.0001, 'limited by the town facade box [280,330]');
    // a zone's own tree art turns the shared-tree darkening off; the borrowed Zone 1 tree keeps it
    assert.equal(ZONE_SKIN.asia.treeTint, true, 'no own tree art yet -> the borrowed Zone 1 tree keeps its darkening');
    disableTownSkin('asia'); enableTownSkin('asia', { use:['trees'] });
    assert.equal(ZONE_SKIN.asia.treeTint, false, 'own tree art -> no darkening in code');
    assert.equal(themeArt('town-tree-th', 'asia'), 'img/frontier-route/tree-pine-v2.png');
  } finally { reset(); }
  assert.equal(ZONE_SKIN.th.treeTint, true);
});

test('syncSceneZone puts a skin-enabled zone on the 3840x2560 city, same station sites as Zone 1, then restores', () => {
  reset();
  syncSceneZone('th');
  const snap = () => JSON.stringify([STATIONS.map(d => [d.k, d.bx, d.by, d.bw, d.mapScale, d.x, d.y, d.hit]), SPOTS]);
  const zone1 = snap();
  enableTownSkin('asia', {}, { fake:true });
  try {
    syncSceneZone('asia');
    assert.deepEqual([SCENE.w, SCENE.h], [3840, 2560]);
    assert.equal(activeTownZone(), 'asia');
    assert.equal(snap(), zone1, 'same layout as Zone 1 (stations, spots) when the zone has no overrides');
    assert.equal(L.townContains(1922, 1078), true);
  } finally { reset(); }
  syncSceneZone('asia'); assert.equal(SCENE.w, 1678);
  syncSceneZone('th'); assert.equal(snap(), zone1);
});

test('town layout per zone: overrides apply in place and Zone 1 comes back exactly', () => {
  const grid = () => { let h = 0; for (let y = 0; y < 2560; y += 40) for (let x = 0; x < 3840; x += 40) h = (h * 31 + (L.townContains(x, y) ? 1 : 0)) >>> 0; return h; };
  const base = grid(), stations = JSON.stringify(L.TOWN_STATION_SITES), houses = JSON.stringify(L.TOWN_HOUSE_SITES), props = L.TOWN_PROP_SITES.length;
  const sitesRef = L.TOWN_STATION_SITES, houseRef = L.TOWN_HOUSE_SITES, propRef = L.TOWN_PROP_SITES;
  let notified = 0; const off = L.onTownLayoutChange(() => notified++);
  const table = { th:{}, asia:{
    walkRuns:[480 * 320], patches:false,                    // an empty mask: nothing walkable except pads
    stations:{ krata:{ bx:480, by:580, x:480, y:600 } },
    houses:[{ key:'front-one', x:1551, y:655, w:142 }],
    props:[],
    dais:{ w:300 },
  } };
  try {
    assert.equal(L.applyTownZoneLayout('asia', table, true), true);
    assert.equal(L.townLayoutZone(), 'asia');
    assert.equal(L.TOWN_STATION_SITES, sitesRef); assert.equal(L.TOWN_HOUSE_SITES, houseRef); assert.equal(L.TOWN_PROP_SITES, propRef);
    assert.equal(L.TOWN_STATION_SITES.krata.bx, 480); assert.equal(L.TOWN_STATION_SITES.dab.bx, JSON.parse(stations).dab.bx);
    assert.equal(L.TOWN_HOUSE_SITES.length, 1); assert.equal(L.TOWN_HOUSES.length, 1); assert.equal(L.TOWN_PROP_SITES.length, 0);
    assert.equal(L.TOWN_PROP_COLLIDERS.length, 0); assert.equal(L.TOWN_DAIS.w, 300);
    assert.equal(L.townFloorAt(1800, 600), false, 'zone mask replaced Zone 1 mask and the hand patches are off');
    assert.equal(L.townFloorAt(480, 600), true, 'station pads follow the moved station');
    assert.notEqual(grid(), base);
    assert.ok(notified >= 1);
  } finally {
    L.applyTownZoneLayout('th', table, true); off();
  }
  assert.equal(grid(), base); assert.equal(JSON.stringify(L.TOWN_STATION_SITES), stations); assert.equal(JSON.stringify(L.TOWN_HOUSE_SITES), houses);
  assert.equal(L.TOWN_PROP_SITES.length, props); assert.equal(L.TOWN_DAIS.w, 307);
});

test('owner masks for zones 2–4 disable inherited patches', () => {
  assert.ok(L.TOWN_ZONE_LAYOUT.cyberhell.walkRuns.length>0);
  assert.ok(L.TOWN_ZONE_LAYOUT.west.walkRuns.length>0);
  assert.equal(L.TOWN_ZONE_LAYOUT.west.patches,false);
  assert.ok(L.TOWN_ZONE_LAYOUT.asia.walkRuns.length>0);
  assert.equal(L.TOWN_ZONE_LAYOUT.asia.patches,false);
  assert.equal(L.TOWN_ZONE_LAYOUT.cyberhell.patches, false);
  const base = (() => { let h = 0; for (let y = 0; y < 2560; y += 40) for (let x = 0; x < 3840; x += 40) h = (h * 31 + (L.townContains(x, y) ? 1 : 0)) >>> 0; return h; })();
  L.applyTownZoneLayout('asia', L.TOWN_ZONE_LAYOUT, true);
  const asia = (() => { let h = 0; for (let y = 0; y < 2560; y += 40) for (let x = 0; x < 3840; x += 40) h = (h * 31 + (L.townContains(x, y) ? 1 : 0)) >>> 0; return h; })();
  L.applyTownZoneLayout('th', L.TOWN_ZONE_LAYOUT, true);
  assert.notEqual(asia, base, 'zone 2 owner mask replaces the temporary floor');
});

test('light emitters: Zone 1 fire reader unchanged; ice / cyan / violet need their hue range', () => {
  assert.equal(fireStrength(255, 140, 20) > .9, true);
  assert.equal(fireStrength(30, 40, 60), 0);
  const ice = ZONE_SKIN.west.light.emit.find(e => e.type === 'hue'), cyan = ZONE_SKIN.cyberhell.light.emit.find(e => e.color?.[0] === 53), violet = ZONE_SKIN.cyberhell.light.emit.find(e => e.color?.[0] === 164);
  assert.equal(hueStrength(20, 200, 255, ice) > .9, true, 'bright saturated ice-blue paint (V>=85% S>=80%) glows');
  assert.equal(hueStrength(127, 216, 255, ice), 0, 'the pale glow colour itself (S 50%) is not a source: only saturated paint is');
  assert.equal(hueStrength(255, 140, 20, ice), 0, 'orange is not ice');
  assert.equal(hueStrength(90, 110, 120, ice), 0, 'dull grey-blue does not glow');
  assert.equal(hueStrength(53, 232, 255, cyan) > .9, true); assert.equal(hueStrength(140, 20, 255, violet) > .9, true);
  assert.equal(hueStrength(201, 162, 39, cyan), 0, 'dim gold circuit lines are not read as light');
  const out = emitAt(ZONE_SKIN.west.light.emit, 20, 200, 255);
  assert.deepEqual(out.slice(1), [127, 216, 255], 'glow tint = #7FD8FF'); const fire = emitAt(ZONE_SKIN.west.light.emit, 255, 140, 20);
  assert.equal(fire[0] > .9 && fire[1] === 255 && fire[3] === 20, true);
  assert.deepEqual(ZONE_SKIN.th.light.emit, [{ type:'fire' }]);
  assert.equal(ZONE_SKIN.cyberhell.light.flame, 'img/fx/fx-cyan-flame-{k}.webp');
  assert.equal(ZONE_SKIN.th.light.flame, 'img/fx/fx-fire-flame-{k}.webp');
});

test('index.html: M2 modules have versioned imports matching the entry script', async () => {
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const f of ['zone-skin.js', 'route-geometry.js', 'town-owner-walkmask-asia.js', 'town-owner-walkmask-west.js', 'town-owner-walkmask-cyberhell.js'])
    assertVersionedImports(html, [f]);
  for (const f of ['town-layout.js', 'town-terrain.js', 'town-scenery.js', 'town-lighting.js', 'town-shade.js', 'town-flow.js', 'scene.js', 'data.js', 'game.js', 'ui.js', 'dungeon-view.js', 'zone-travel.js', 'theme-assets.js'])
    assertVersionedImports(html, [f]);
  assertVersionedImports(html, ['ui.js']);
});
