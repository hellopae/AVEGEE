import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROOMS, STATIONS } from '../src/data.js';
import { setLang, t } from '../src/i18n.js';

globalThis.document ??= { documentElement:{} };   // setLang() แตะ document.documentElement.lang

// ชุด 27A — ห้องตามแบบ UI4: ข้อมูลของทั้ง 10 ห้องต้องครบและเดินได้จริง
const BG = { tea:[1024,925], tarang:[1081,976], dab:[895,1200], krajok:[1024,1024], sala:[1024,1024],
             sawan:[1024,1024], ngiw:[895,1200], lan:[1024,1024], krata:[1024,1024], lokan:[1024,1024] };
const ACTIONS = { tarang:2, sala:2 };
const inside = (x, y, polys) => polys.some(({ poly }) => {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
});
const unit = p => p.every(v => v >= 0 && v <= 1);

test('ทุกห้องมี ui4: crop ตรงสัดส่วนกรอบแบบ · พื้นที่เดิน · ปุ่มครบ', () => {
  for (const k of Object.keys(BG)) {
    const u = ROOMS[k].ui4;
    assert.ok(u, `${k} ไม่มี ui4`);
    const [w, h] = BG[k], [cx, cy, cw, ch] = u.crop;
    assert.ok(cx >= 0 && cy >= 0 && cx + cw <= 1.001 && cy + ch <= 1.001, `${k} crop เกินภาพ`);
    const ratio = (cw * w) / (ch * h);
    assert.ok(Math.abs(ratio / (1913 / 1025) - 1) < 0.03, `${k} สัดส่วน crop ${ratio.toFixed(3)} ไม่ตรงกรอบแบบ 1.866`);
    assert.ok(u.walk.length >= 1 && u.walk.every(p => p.poly.length >= 3 && p.poly.every(unit)), `${k} walk ผิดรูป`);
    assert.equal(u.actions.length, ACTIONS[k] || 1, `${k} จำนวนปุ่มไม่ตรงแบบ`);
    assert.ok(u.actions.every(unit), `${k} ตำแหน่งปุ่มนอกกรอบ`);
  }
});

test('ยมบาทเริ่มและจุดลงมือของทุกห้องอยู่ในพื้นที่เดินได้ (ไม่งั้นเดินไปกดไม่ถึง)', () => {
  for (const k of Object.keys(BG)) {
    const u = ROOMS[k].ui4;
    assert.ok(inside(...u.me, u.walk), `${k}: me อยู่นอกพื้นที่เดิน`);
    assert.ok(inside(...u.act, u.walk), `${k}: act อยู่นอกพื้นที่เดิน`);
    if (u.item) assert.ok(inside(...u.item, u.walk), `${k}: item อยู่นอกพื้นที่เดิน`);
    for (const s of u.souls || []) assert.ok(unit(s), `${k}: ตำแหน่งวิญญาณนอกกรอบ`);
    // ต้องยืนจากจุดเริ่มแล้วไปถึงจุดลงมือได้ภายในพื้นที่เดินเดียวกัน: ทั้งสองจุดต้องอยู่ในรูปเดียวกัน
    const same = u.walk.some(p => inside(...u.me, [p]) && inside(...u.act, [p]));
    assert.ok(same, `${k}: me กับ act อยู่คนละพื้นที่ที่ไม่ต่อกัน`);
  }
});

test('ข้อความของห้องมีทั้งไทยและอังกฤษ และตัวเลขความจุไม่ถูกฝังในข้อความ', () => {
  const keys = ['room.capacity', 'room.karma', 'room.roster', 'room.manage', 'room.manageHint', 'room.inspect',
    'room.inspectHint', 'room.niraCheck', 'room.repair', 'room.noneHeld', 'room.gateTitle'];
  for (const s of STATIONS) for (const part of ['desc', 'action', 'hint', 'sins']) {
    const k = `room.${s.k}.${part}`;
    const src = readFileSync(new URL('../src/i18n.js', import.meta.url), 'utf8');
    if (src.includes(`'${k}'`)) keys.push(k);
  }
  for (const k of keys) {
    setLang('th'); const th = t(k);
    setLang('en'); const en = t(k);
    assert.notEqual(th, k, `${k} ไม่มีไทย`);
    assert.notEqual(en, k, `${k} ไม่มีอังกฤษ`);
    assert.notEqual(en, th, `${k} อังกฤษเหมือนไทย`);
  }
  setLang('th');
  assert.match(t('room.capacity'), /\{n\}/);
});
