// 30D — แผนที่: พื้นที่ห้ามเดิน (น้ำข้างสะพาน · ตัวอาคาร) · วงรอบตัวละคร · ไอคอน/ปุ่ม/ขนาด
import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENE, SPOTS, FRONTIER, GUARD_POST, ZONE_ENTRY } from '../src/data.js';
import { canWalk, canWalkAvoid, findPath, stepTo, nearestWalk, setBlocks, setNpcDiscs, resetWalk, inNpcDisc, NPC_RX, NPC_RY } from '../src/walk.js';
import { standPoints } from '../src/npc-stand.js';
import { frontierPath, frontierSegmentClear, frontierWalkable } from '../src/frontier-navigation.js';

const ellipseV = (x, y, d) => ((x - d[0]) / NPC_RX) ** 2 + ((y - d[1]) / NPC_RY) ** 2;
const sampled = (from, path) => {
  const pts = []; let a = from;
  for (const b of path) {
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2);
    for (let i = 0; i <= n; i++) pts.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
    a = b;
  }
  return pts;
};

test('1. น้ำสองข้างสะพาน/เกาะหน้าประตูชายแดนเหยียบไม่ได้ · สะพาน เกาะ ประตู จุดเฝ้ายักษ์ยังเดินได้', () => {
  resetWalk(); setBlocks([], []);
  for (const [x, y] of [[640, 820], [700, 760], [690, 900], [1000, 820], [985, 900], [720, 700], [950, 710], [300, 850]])
    assert.equal(canWalk(x, y), false, `น้ำที่ (${x},${y}) ต้องห้ามเดิน`);
  for (const [x, y] of [[835, 700], [835, 740], [835, 800], [835, 880], [760, 800], [910, 800], [725, 880], GUARD_POST, ZONE_ENTRY.gate, ZONE_ENTRY.nira, [FRONTIER.x, FRONTIER.y]])
    assert.equal(canWalk(x, y), true, `พื้นที่ (${x},${y}) ต้องเดินได้`);
  // ท่าเรือสองฝั่งต้องเดินได้เหมือนเดิม
  assert.equal(canWalk(470, 682), true); assert.equal(canWalk(1380, 682), true);
});

test('1. คลิกในน้ำข้างประตู → ไปยืนบนเกาะที่ใกล้ที่สุด ไม่ลงน้ำ', () => {
  resetWalk(); setBlocks([], []);
  const p = nearestWalk(660, 830);
  assert.ok(p && canWalk(p[0], p[1]));
  assert.ok(p[0] > 700, `ควรขึ้นเกาะ ได้ x=${p[0]}`);
  const path = findPath(835, 860, p[0], p[1]);
  for (const [x, y] of sampled([835, 860], path)) assert.ok(canWalk(x, y), `เส้นทางผ่านน้ำที่ (${x | 0},${y | 0})`);
});

test('2. กล่องอาคารที่ส่งเข้า setBlocks กันเดินทับทั้งหลัง แต่ช่องประจำของผู้คุม (holes) ยังเดินเข้าถึงได้', () => {
  resetWalk();
  setBlocks([[1000, 300, 1200, 480]], [[1090, 380, 1120, 500]]);
  assert.equal(canWalk(1100, 320), false);     // ยอดหลังคา/ตัวกระทะ
  assert.equal(canWalk(1010, 470), false);
  assert.equal(canWalk(1100, 440), true);       // ช่องประตู
  assert.equal(canWalk(1100, 510), true);       // นอกอาคาร
  const path = findPath(900, 420, 1100, 450);   // ไปหน้าประตูต้องอ้อมเข้าทางช่อง
  const pts = sampled([900, 420], path);
  assert.ok(pts.every(([x, y]) => canWalk(x, y)));
  assert.ok(Math.hypot(path.at(-1)[0] - 1100, path.at(-1)[1] - 450) < 12);
  setBlocks([], []);
});

test('2. วงรอบตัวละครที่ยืนอยู่: เส้นทางของยมบาทอ้อมวง · ก้าวทับไม่ได้ · ตัวละครอื่น (ไม่ avoid) ไม่เห็นวง', () => {
  resetWalk(); setBlocks([], []);
  const npc = [900, 300];
  setNpcDiscs([npc]);
  assert.equal(inNpcDisc(900, 300), true);
  assert.equal(canWalkAvoid(900, 300), false);
  assert.equal(canWalk(900, 300), true);          // ยมทูตเองยังยืนได้ ตัวละครอื่นไม่ถูกวงกัน
  const from = [700, 300], to = [1100, 300];
  const path = findPath(from[0], from[1], to[0], to[1], true);
  assert.ok(path.length >= 1);
  for (const [x, y] of sampled(from, path)) assert.ok(ellipseV(x, y, npc) >= 0.98, `ทับตัว NPC ที่ (${x | 0},${y | 0})`);
  assert.ok(Math.hypot(path.at(-1)[0] - to[0], path.at(-1)[1] - to[1]) < 12, 'ต้องไปถึงปลายทางหลังอ้อม');
  assert.ok(path.length > 1, 'เส้นตรงทะลุวงต้องถูกดัดเป็นทางอ้อม');
  // ไม่ avoid = เส้นตรงเหมือนเดิม
  const straight = sampled(from, findPath(from[0], from[1], to[0], to[1]));
  assert.ok(straight.some(([x, y]) => ellipseV(x, y, npc) < 1), 'ไม่ avoid = เส้นตรงทะลุตัวเหมือนเดิม');
  assert.ok(sampled(from, path).some(([, y]) => Math.abs(y - 300) > 15), 'ต้องเบี่ยงออกจากแนวเดิม');
  // ก้าวทีละนิดเข้าหา NPC ตรง ๆ → ไถลไปตามขอบ/หยุด ไม่เข้าไปในวง
  const me = { x: 850, y: 300 };
  for (let i = 0; i < 80; i++) stepTo(me, 3, 0, true);
  assert.ok(ellipseV(me.x, me.y, npc) >= 0.98, 'ก้าวชนวงต้องไม่ทะลุ');
  // ไม่ส่ง avoid → เดินทะลุเหมือนเดิม
  const raw = { x: 850, y: 300 };
  for (let i = 0; i < 80; i++) stepTo(raw, 3, 0);
  assert.ok(raw.x > 1000);
  // คลิกกลางตัว NPC → ได้จุดนอกวงที่ใกล้ที่สุด
  const near = nearestWalk(900, 300, undefined, true);
  assert.ok(ellipseV(near[0], near[1], npc) >= 1);
  setNpcDiscs([]);
});

test('2. ยมบาทที่ถูกยมทูตเดินมายืนทับ ออกจากวงได้ทุกทิศ (ไม่ติดค้าง)', () => {
  resetWalk(); setBlocks([], []);
  setNpcDiscs([[900, 300]]);
  const me = { x: 905, y: 302 };
  for (let i = 0; i < 60; i++) stepTo(me, 3, 0, true);   // เดินทะลุออกไปทางขวา
  assert.ok(me.x > 960, `ควรเดินพ้น ได้ x=${me.x}`);
  const path = findPath(905, 302, 1100, 302, true);
  assert.ok(path.length && Math.hypot(path.at(-1)[0] - 1100, path.at(-1)[1] - 302) < 12);
  setNpcDiscs([]);
});

test('2. standPoints รวมทุกตัวที่ยืนบนแผนที่: ยมทูต พ่อค้า ยักษ์ บอสที่ท่าเรือ ผู้ท้าทายที่รอ · ข้ามตัวที่ถูกพาไปกับวิญญาณ', () => {
  const g = { zone: 'th', crew: [{ x: 10, y: 20 }, { x: 30, y: 40, escort: true }, { x: null, y: null }, { x: 50, y: 60, path: [[1, 1]] }],
    zoneCaptivesFree: () => true, guard: { x: 720, y: 890 }, bossWalk: null, bossGuarding: { th: true }, bossCleared: {},
    zoneEventStatus: () => 'none', devaTestStatus: () => 'none', eventMapClosed: {} };
  const pts = standPoints(g);
  const has = (x, y) => pts.some(p => p[0] === x && p[1] === y);
  assert.ok(has(10, 20) && has(50, 60), 'ยมทูตที่ยืนและที่กำลังเดิน');
  assert.ok(!has(30, 40), 'ตัวที่ถูกพาไปกับวิญญาณไม่นับ');
  assert.ok(has(720, 890) && has(SPOTS.bossPier.x, SPOTS.bossPier.y));
  assert.equal(pts.length, 5);                            // ยมทูต 2 + พ่อค้า + ยักษ์ + บอส
  g.zoneCaptivesFree = () => false;
  assert.ok(standPoints(g).some(p => p[0] === 966 && p[1] === 350), 'โซน 4: ทัณฑ์/พ่อค้าที่ถูกขัง');
});

test('2. ฉากชายแดน: เส้นทางอ้อมศัตรูที่ยืนอยู่ · คลิกบนตัวศัตรู → ไปจุดใกล้ที่สุดนอกวง', () => {
  for (const zone of ['th', 'asia', 'west', 'cyberhell']) {
    const enemy = [.5, .55, .04, .03];
    const from = [.30, .55], to = [.70, .55];
    const path = frontierPath(zone, from, to, [enemy]);
    assert.ok(path.length > 1, `${zone}: ต้องอ้อมศัตรู`);
    let a = from;
    for (const b of path) { assert.ok(frontierSegmentClear(zone, a, b, [enemy]), `${zone}: ผ่านตัวศัตรู`); a = b; }
    assert.ok(Math.hypot(a[0] - to[0], a[1] - to[1]) < .02);
    const click = frontierPath(zone, from, [.5, .55], [enemy]);
    const end = click.at(-1);
    assert.ok(frontierWalkable(zone, end[0], end[1], [enemy]), `${zone}: ปลายทางต้องอยู่นอกวง`);
    // ไม่ส่งวง = พฤติกรรมเดิม (เส้นตรง)
    assert.equal(frontierPath(zone, from, to).length, 1);
  }
});

// ---------- ข้อ 3: ปุ่ม "เข้าไป" ชิดอาคารจริง ----------
import { stationButtonPos, mapInteractions } from '../src/proximity.js';
test('3. ปุ่มของอาคารอยู่บนหลังคา (F2 ข้อ 8: ลงมา 27% ของความสูงตัวอาคาร) ไม่ขึ้นกับ bw · x = กึ่งกลางตัวอาคาร · รูปยังไม่มา = สูตรเดิม', () => {
  const def = { k: 'tea', bx: 218, by: 674, bw: 460 };
  const low = stationButtonPos(def, 543, [150, 543, 290, 674]);     // กระท่อมเตี้ย ยอดอยู่ที่ y=543 สูง 131
  assert.equal(low.bx, 220); assert.equal(low.anchor, 'roof');
  assert.ok(Math.abs(low.by - (543 + 131 * 0.27)) < 1e-9);
  const tall = stationButtonPos(def, 466, [150, 466, 290, 674]);
  assert.ok(Math.abs(tall.by - (466 + 208 * 0.27)) < 1e-9);          // ตามยอดจริงและความสูงจริง ไม่ใช่ค่าคงที่
  assert.ok(tall.by > 466 && tall.by < 674);                         // อยู่ในตัวอาคาร ไม่ลอยเหนือยอด
  const fallback = stationButtonPos(def, null, null);
  assert.deepEqual(fallback, { bx: 218, by: 674 - 460 - 24, anchor: 'center' });
});
test('3. mapInteractions ส่งตำแหน่งปุ่มของสถานีผ่าน stationButtonPos (ไม่มีภาพใน node → สูตรเดิม anchor center)', () => {
  globalThis.Image ??= class { set src(_) {} };                       // node ไม่มี Image → รูปไม่โหลด → null
  const def = { k: 'tea', x: 400, y: 20, bx: 400, by: 20, bw: 80 };
  const g = { crewOf: () => null, zoneCaptivesFree: () => false, stations: [{ def, fire: 0 }], availableBuilder: () => null };
  const t = mapInteractions(g, { x: 0, y: 0 }).find(x => x.id === 'tea');
  assert.equal(t.label, 'เข้าไป');
  assert.equal(t.anchor, 'center');
  assert.equal(t.by, 20 - 80 - 24);
});

// ---------- ข้อ 4: ฉากชายแดน ปุ่มกลับโซนเหลือปุ่มเดียว สีทอง ขึ้นเมื่อเข้าใกล้ทางออก ----------
import { readFileSync } from 'node:fs';
import { nearFrontierGate } from '../src/frontier.js';
test('4. ฉากชายแดน: ไม่มีแถบกลับโซนถาวร เหลือปุ่ม #frw-gate ปุ่มเดียว สีทอง (token --gold) และปุ่มโผล่เฉพาะตอนเข้าใกล้ทางออก', () => {
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal((ui.match(/กลับเข้า\$\{esc\(gateName\)\}/g) || []).length, 1, 'ข้อความ "กลับเข้า<โซน>" ต้องมีปุ่มเดียว');
  assert.ok(!ui.includes('id="frw-exit"') && !ui.includes('#frw-exit'), 'แถบทองถาวรต้องถูกถอด');
  assert.match(html, /\.frw-fab\.frw-gate\{background:var\(--gold\)/);
  assert.equal(nearFrontierGate({ x: .485, y: .35 }), false, 'จุดเริ่มเดินยังไม่ใกล้ทางออก → ไม่มีปุ่ม');
  assert.equal(nearFrontierGate({ x: .5, y: .25 }), true, 'เดินเข้าใกล้ประตูบน → ปุ่มขึ้น');
});

// ---------- ข้อ 5: ไอคอนอีเวนต์ปีศาจบุก = รูปปีศาจ ไม่ใช่วิญญาณขาว ----------
import { ZONE_EVENTS, MOB } from '../src/data.js';
test('5. ป้ายอีเวนต์ชายแดนโซน 2-4 เลือกรูปบอสปีศาจท้ายระลอก · อีเวนต์ kind ใช้รูป mob ของ kind นั้น ไม่ตกไป spirit7', () => {
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  assert.match(ui, /function zoneEventMarkerArt\(ev\)/);
  assert.ok(ui.includes('esc(zoneEventMarkerArt(ev))'), 'ป้าย .zone-eventfab ต้องใช้ zoneEventMarkerArt');
  assert.ok(!/<img src="\$\{esc\(storyFoeArt\(foe\?\.sp\)\)\}" alt="" onerror="this\.remove\(\)"><span>⚔️/.test(ui), 'สูตรเก่า (foe.sp ว่าง → spirit7) ต้องไม่เหลือ');
  // ทุกอีเวนต์ชายแดนของโซน 2-4 มีบอสท้ายระลอกที่มี sp → รูปปีศาจเฉพาะ
  for (const z of ['asia', 'west', 'cyberhell']) {
    const evs = ZONE_EVENTS[z].filter(e => e.team === 'frontier');
    assert.ok(evs.length >= 1);
    for (const ev of evs) {
      const boss = ev.waves.flat().find(f => f.boss && f.sp);
      assert.match(boss.sp, /^boss-frontier-/, `${ev.k} ต้องมีบอสปีศาจให้ใช้เป็นไอคอน`);
    }
  }
  // อีเวนต์ที่ foe มีแต่ kind → mob kind มีชื่อไฟล์รูป
  for (const z of Object.keys(ZONE_EVENTS)) for (const ev of ZONE_EVENTS[z]) {
    const f = ev.foe || ev.foes?.[0] || ev.waves?.[0]?.[0];
    if (f?.kind != null) assert.ok(MOB.kinds[f.kind]?.img, `${ev.k} kind ${f.kind} ไม่มีรูป`);
  }
});

// ---------- ข้อ 6: ขนาดทัณฑ์/ซิสอ็อปโซน 4 เท่ายมทูตคนอื่น ----------
import { crewWalkSheet } from '../src/crew-walk-assets.js';
import { standeeFit } from '../src/art.js';
test('6. ความสูงตัวจริงของยมทูตทุกตัวทุกโซน (ท่าเดิน) อยู่ใน ±15% ของกันและกัน · ซิสอ็อปโซน 4 ไม่เตี้ยกว่าเพื่อน', () => {
  for (const z of ['th', 'asia', 'west', 'cyberhell']) {
    const hs = ['nira', 'taan', 'plerng', 'dam', 'kan', 'boon', 'guard'].map(k => {
      const s = crewWalkSheet(k, z), f = s.frames[0];
      return [k, f.h / s.frameSize.h * s.heightScale];
    });
    const max = Math.max(...hs.map(h => h[1])), min = Math.min(...hs.map(h => h[1]));
    assert.ok(min >= max * 0.85, `${z}: ${hs.map(h => h[0] + '=' + h[1].toFixed(2)).join(' ')}`);
  }
  assert.ok(crewWalkSheet('taan', 'cyberhell').heightScale >= 0.99);
});
test('6. ท่ายืน: ขยายเฉพาะทัณฑ์โซน 4 (ทุกท่า) ให้ 0.871 × fit ≈ 1 · โซนอื่น/ตัวอื่นไม่เปลี่ยน', () => {
  assert.ok(Math.abs(0.871 * standeeFit('crew-taan', 'cyberhell') - 1) < 0.01);
  assert.equal(standeeFit('crew-taan-build-work', 'cyberhell'), standeeFit('crew-taan', 'cyberhell'));
  assert.equal(standeeFit('crew-taan', 'th'), 1);
  assert.equal(standeeFit('crew-dam', 'cyberhell'), 1);
});

// ---------- ข้อ 7: กลับด้านอาคาร #11 (แท่นบัวหิมะ = st-lokan-asia โซน 2) #13 (หลังคากระเบื้องดำ = st-sala-west โซน 3) ----------
import { STATIONS, syncSceneZone, STATION_FLIP } from '../src/data.js';
test('E1 supersedes 30D orientations; zone round trips restore geometry', () => {
  const pos = () => STATIONS.map(s => [s.k, s.bx, s.by, s.x, s.y, s.hit.join()].join('|'));
  syncSceneZone('th');
  const thPos = pos();
  assert.deepEqual(STATIONS.filter(s => s.flip).map(s => s.k), ['krata']);
  syncSceneZone('asia');
  assert.deepEqual(STATIONS.filter(s => s.flip).map(s => s.k).sort(), ['krata']);
  syncSceneZone('west');
  assert.deepEqual(STATIONS.filter(s => s.flip).map(s => s.k).sort(), ['krata', 'tea']);
  syncSceneZone('cyberhell');
  assert.deepEqual(STATIONS.filter(s => s.flip).map(s => s.k), ['krata']);
  assert.deepEqual(STATION_FLIP, { th:['krata'], asia:['krata'], west:['krata','tea'], cyberhell:['krata'] });
  syncSceneZone('th');
  assert.deepEqual(pos(), thPos, 'การเปลี่ยนโซนวนกลับต้องได้ตำแหน่งเดิม ไม่ค้าง flip');
  assert.equal(STATIONS.find(s => s.k === 'lokan').flip, false);
  // ไฟล์ภาพจริงอยู่ครบ (flip ตอนวาด ไม่แตะไฟล์ของ Kittanate)
  for (const f of ['img/Asia/st-lokan-asia.png', 'img/West/st-sala-west.png'])
    assert.ok(readFileSync(new URL('../' + f, import.meta.url)).length > 1000, f);
});
