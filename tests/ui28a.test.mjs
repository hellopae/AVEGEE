import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
// art.js โหลดภาพผ่าน Image — ใน Node ไม่มี ใช้ตัวหลอกที่ไม่โหลดอะไร (img() จะคืน null เหมือนยังโหลดไม่เสร็จ)
globalThis.Image = class { set src(v) { this._src = v; } get src() { return this._src; } };
const { createGame } = await import('../src/game.js');
const { STATIONS, ZONES, ZONE_EVENTS, returnsToFrontier, syncSceneZone } = await import('../src/data.js');

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// ---------- ข้อ 1: สถานีใหญ่ขึ้นสมสัดส่วน ----------
test('ประตูสวรรค์ ดงต้นงิ้ว หอส่องกรรม ถูกขยายและกรอบคลิกใหญ่ตามภาพ (28A ข้อ 1)', () => {
  const by = Object.fromEntries(STATIONS.map(s => [s.k, s]));
  // ค่าเดิมก่อน 28A: sawan 165 · ngiw 159 · krajok 100 (ฐาน 512px) — ต้องใหญ่ขึ้นอย่างน้อย 1.3 เท่า
  assert.ok(by.sawan.bw >= 165 * 1.3, 'sawan');
  assert.ok(by.ngiw.bw >= 159 * 1.3, 'ngiw');
  assert.ok(by.krajok.bw >= 100 * 1.3, 'krajok');
  for (const k of ['sawan', 'ngiw', 'krajok']) {
    const s = by[k], [x1, y1, x2, y2] = s.hit;
    assert.ok(x1 < s.bx && s.bx < x2, `${k}: กรอบคลิกคลุมกึ่งกลางอาคาร`);
    assert.equal(y2, s.by, `${k}: ขอบล่างกรอบคลิกตรงฐานอาคาร`);
    assert.ok(y2 - y1 >= s.bw * 0.9, `${k}: กรอบคลิกสูงตามขนาดใหม่`);
  }
});

// ---------- ข้อ 2: กลับด้านโรงน้ำชาโซนบูรพา ----------
test('โรงน้ำชาหลังคาฟาง (ศาลาโซนบูรพา) วาดกลับด้าน โซนอื่นไม่กลับ (28A ข้อ 2)', () => {
  const tea = () => STATIONS.find(s => s.k === 'tea');
  for (const z of ZONES) {
    syncSceneZone(z.k);
    assert.equal(tea().flip, z.k === 'asia', z.k);
  }
  syncSceneZone('th');
});

// ---------- ข้อ 7: คำโปรยโซนบูรพา ----------
test('โซนบูรพาไม่มีคำโปรยประเทศ โซนอื่นยังมี (28A ข้อ 7)', () => {
  assert.equal(ZONES.find(z => z.k === 'asia').sub, '');
  for (const z of ZONES.filter(z => z.k !== 'asia')) assert.ok(z.sub, z.k);
  const g = createGame();
  g.canMoveZone = () => true;
  g.moveZone('asia');
  assert.ok(g.logs.some(l => /โซนบูรพา · งบตั้งต้น/.test(l.t || l.text || l.msg || JSON.stringify(l))),
    'log ย้ายโซนไม่มีตัวคั่น " — " ค้างเมื่อไม่มีคำโปรย');
  const ui = read('src/ui.js');
  const bare = ui.split('<small>${esc(z.sub)}</small>').length - 1;
  const guarded = ui.split('${z.sub ? `<small>${esc(z.sub)}</small>` : \'\'}').length - 1;
  assert.ok(bare > 0 && bare === guarded, 'การ์ดชุดทุกจุดต้องเช็ค z.sub ก่อนแสดง');
});

// ---------- ข้อ 5: ชนะศึกปีศาจชายแดน → แผนที่ชายแดน ----------
test('ชนะศึกปีศาจฝ่าชายแดนแล้วไปแผนที่ชายแดน; แพ้/ศึกอื่นไม่ไป (28A ข้อ 5)', () => {
  // โซน 1: frontierBreach เดิม
  const g = createGame();
  g.zoneCases.th = 8;
  g.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared', frontierBreach:'pending' };
  g.setFrontierTeam('taan');
  const b = g.startFrontierBreach();
  assert.ok(b);
  b.foes[0].hp = 1; g.battleAct('atk');
  g.advanceFrontierBreachWave();
  b.foes.forEach(f => { f.hp = 1; });
  g.battleAct('atk'); g.battleAct('atk');
  assert.equal(b.over, 'win');
  const done = g.endBattle();
  assert.equal(done.kind, 'frontierBreach');
  assert.equal(returnsToFrontier(done), true);

  // แพ้ไม่ไป
  assert.equal(returnsToFrontier({ ...done, over:'lose' }), false);
  // ศึกอื่นของโซน 1 ไม่ไป
  assert.equal(returnsToFrontier({ kind:'prisonBreak', over:'win' }), false);
  assert.equal(returnsToFrontier({ kind:'devaTest', over:'win' }), false);
  assert.equal(returnsToFrontier({ kind:'soul', over:'win' }), false);
  assert.equal(returnsToFrontier({ kind:'zoneEvent', zone:'th', eventKey:'thBorderBoss', over:'win' }), false);
  assert.equal(returnsToFrontier(null), false);

  // zoneEvent โหมด waves ทีมชายแดนของโซนอื่น = ศึกชายแดนเหมือนกัน
  const waves = Object.entries(ZONE_EVENTS).flatMap(([zone, evs]) =>
    evs.filter(ev => ev.mode === 'waves' && ev.team === 'frontier' && ev.k !== 'frontierBreach')
       .map(ev => ({ zone, k: ev.k })));
  assert.ok(waves.length >= 2);
  for (const { zone, k } of waves)
    assert.equal(returnsToFrontier({ kind:'zoneEvent', zone, eventKey:k, over:'win' }), true, k);

  // ui.js ต่อสายจริงทั้งสองทางเข้า (alert ชายแดนโซน 1 + alert zoneEvent) และเปิดแผนที่ชายแดนหลังศึกชนะ
  const ui = read('src/ui.js');
  assert.match(ui, /startFrontierBreach\(\)\) \{ breachTried = true; openBattle\(afterBreachBattle\)/);
  assert.match(ui, /startZoneEvent\(ev\.k\)\)[\s\S]{0,160}openBattle\(afterBreachBattle\)/);
  assert.match(ui, /function afterBreachBattle[\s\S]*returnsToFrontier\(done\)[\s\S]*openFrontierWalk\(\)/);
});

// ---------- ข้อ 6: ภาพท่าไม้ตายบอสไม่ชี้ img/raw ----------
test('ภาพ cutscene ท่าไม้ตายบอส/เทวดาอยู่ใน img/ ที่ commit จริง ทุกโซน (28A ข้อ 6)', () => {
  const need = [];
  for (const [zone, evs] of Object.entries(ZONE_EVENTS)) {
    for (const ev of evs) {
      const boss = [ev.foe, ...(ev.foes || []), ...(ev.waves || []).flat()].find(f => f?.boss);
      if (!boss) continue;
      const g = createGame();
      g.zone = zone;
      g.startBattle({ id:900, name:'x', who:'x', sp:1, deserved:20 });
      const b = g.battle;
      Object.assign(b, { kind:'zoneEvent', zone, eventKey:ev.k });
      b.foes[0].boss = true; b.foes[0].sp = boss.sp || 'spirit'; b.foes[0].maxHp = 1000; b.foes[0].hp = 400;
      b.foeHp = 400; g.mp = 100; g.mpMax = 100;
      g.battleAct('atk');
      if (b.ultimate?.image) need.push([`${zone}/${ev.k}`, b.ultimate.image]);
    }
  }
  assert.ok(need.length >= 4, 'มี ultimate ให้ตรวจ');
  for (const [tag, image] of need) {
    assert.ok(!/img\/raw\//.test(image), `${tag}: ${image}`);
    assert.ok(existsSync(new URL(`../${image}`, import.meta.url)), `${tag}: ไม่มีไฟล์ ${image}`);
  }
  // โค้ดเกมไม่อ้าง img/raw/ เป็นเส้นทางโหลดภาพอีก
  for (const f of ['src/game.js', 'src/scene.js', 'src/art.js', 'src/room.js', 'src/frontier.js'])
    assert.ok(!/['"`]img\/raw\//.test(read(f)), f);
});
