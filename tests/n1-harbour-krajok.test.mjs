// N1 — ท่าเรือ (ขอบเดิน/ปุ่ม Fast Travel/ป้ายบอส) + หอส่องกรรม (จุดฝึก/กระจก) · ใบงาน Output/Claudy/briefs/2026-10-16-avegee-n1-harbour-krajok.md
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { townFloorAt, TOWN_SPOTS, TOWN_STAIRS } from '../src/town-layout.js';
import { wideStationRoom } from '../src/room-art-assets.js';
const read = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');

test('N1-1 dock: feet cannot leave the painted pier (front face, right post and open water are blocked)', () => {
  // painted pier v4: stone top x≈2200-2305, front edge y≈1800; stairs above it
  for (const [x,y] of [[2250,1810],[2250,1830],[2300,1790],[2312,1800],[2330,1780],[2180,1790],[2200,1800],[2250,1900]]) assert.equal(townFloorAt(x,y), false, `water/rim at ${x},${y}`);
  for (const [x,y] of [[2250,1790],[2225,1780],[2284,1760],[2220,1790],[2224,1724],[2230,1700],[2240,1680]]) assert.equal(townFloorAt(x,y), true, `pier/stairs at ${x},${y}`);
  assert.ok(townFloorAt(TOWN_SPOTS.ferry.from[0], TOWN_SPOTS.ferry.from[1]), 'the Fast Travel standing point stays on the pier');
  assert.ok(TOWN_STAIRS.filter(s => s.key === 'dock').every(s => townFloorAt(...s.point)));
  // sweep: nothing walkable below the pier front or right of the right post, anywhere in the dock box
  for (let y = 1700; y < 1860; y += 4) for (let x = 2150; x < 2350; x += 4) {
    if (!townFloorAt(x,y)) continue;
    assert.ok(y <= 1796 && x <= 2292 && x >= 2188, `walkable cell outside pier footprint at ${x},${y}`);
  }
});

test('N1-2 Fast Travel button sits at the pier standing point (below the feet), not floating over the water', () => {
  const ui = read('src/ui.js');
  assert.match(ui, /id:'harbour',kind:'harbour',x:point\.x,y:point\.y,bx:point\.x,by:point\.y\+\d+,label:'ท่าเรือ · Fast Travel'/);
});

test('N1-3 cleared zone boss: no black "คุยกับ…" tag; the yellow button is anchored over the head', () => {
  const scene = read('src/scene.js'), ui = read('src/ui.js');
  assert.match(scene, /if \(!cleared\) tag\(ctx, x, y - HERO_H \* 1\.12 - 15, t,/);
  assert.doesNotMatch(scene, /cleared \? `คุยกับ/);
  assert.match(ui, /f\.dataset\.sy = SPOTS\.bossPier\.y - 92 \* 1\.12 \* CHAR_SCALE_MAP - 12;/);
});

test('N1-root counter-scaled map buttons scale around their anchor (0 0) — otherwise they drift ~(1-1/zoom)*w/2 from it', () => {
  const css = read('src/town-map.css');
  assert.match(css, /#ov > button\.repairfab,\.town-view #ov > button\.bossfab,\.town-view #ov > button\.mobfab,\.town-view #ov > button\.frontierfab\{transform-origin:0 0\}/);
});

test('N1-4 krajok room: the floor "จุดฝึก" ring/label is gone and cannot come back', () => {
  for (const zone of ['th','asia','west','cyberhell']) {
    const room = wideStationRoom(zone, 'krajok');
    assert.ok(!room.training, `${zone}: no floor training spot`);
  }
  // the drawing/trigger code only runs when room.training exists, and krajok never has one (other rooms keep theirs)
  assert.match(read('src/room-art-assets.js'), /training:!\['krata','ngiw','dab','sawan','krajok'\]\.includes\(key\)/);
  assert.match(read('src/room.js'), /if \(room\.training && !\['sala','ngiw','dab','sawan'\]\.includes\(def\.k\)\)/);
  assert.doesNotMatch(read('src/ui.js'), /ฝึกตัวละคร \/ Train character/);
});

test('N1-5 krajok room: adjustable-mirror stand is always in the room; magic mirror appears only after "วางกระจก"', () => {
  const room = read('src/room.js'), ui = read('src/ui.js');
  assert.match(room, /if \(def\.k === 'krajok'\) \{\n\s+acts\.push\(\{ y: MIRROR_SORT_Y/, 'stand + pane drawn without waiting for placed');
  assert.match(room, /if \(def\.k === 'krajok' && api\.mirrorState\?\.\(\)\.placed\) \{\n\s+acts\.push\(\{ y: MIRROR_ROOM_LAYOUT\.target\[1\]/, 'magic mirror only when placed');
  assert.match(room, /if \(def\.k === 'krajok' && mirrorObstacle\(P\.x,P\.y\)\)/, 'stand is solid from the start');
  // "ปรับองศา" disabled until placed (and until Yama stands next to the stand)
  assert.match(ui, /\['room\.krajok\.adjust', null, \(\) => mirrorCharge\?\.adjust\(\), !mirrorCharge\?\.placed\(\) \|\| !nearMirror/);
  assert.ok(fs.existsSync(new URL('../img/krajok-magic-mirror.png', import.meta.url)), 'placeholder art file exists (a real drawing overwrites it)');
});

test('N1-cache every file touched by N1 gets the -n1 token (index.html, review page, direct imports)', () => {
  const html = read('index.html'), review = read('output/game-review/index.html');
  assert.match(html, /"\.\/src\/ui\.js": "\.\/src\/ui\.js\?v=[^"]+-n1"/);
  assert.match(html, /<script type="module" src="src\/ui\.js\?v=[^"]+-n1">/);
  assert.match(html, /"\.\/src\/scene\.js": "\.\/src\/scene\.js\?v=[^"]+-n1"/);
  assert.match(html, /"\.\/src\/town-layout\.js": "\.\/src\/town-layout\.js\?v=[^"]+-n1"/);
  assert.match(html, /"\.\/src\/room\.js\?v=minigame-review-20261011": "\.\/src\/room\.js\?v=[^"]+-n1"/);
  assert.match(html, /src\/town-map\.css\?v=[^"]+-n1/);
  assert.match(review, /src\/ui\.js\?v=[^"']+-n1/);
  assert.match(read('src/town-layout.js'), /town-walkmask\.js\?v=k1d-n1/);
  assert.match(read('src/ui.js'), /room-art-assets\.js\?v=minigame-review-20261011-j4-n1/);
});
