import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { FRONTIER, ZONES, ZONE_EVENTS, isFrontierBreachEvent } from '../src/data.js';
import { resetWalk } from '../src/walk.js';

globalThis.Image = class {};

// th: ผ่านคุกแตก+เทวดามาแล้ว ถึงคดีที่ 8 → frontierBreach ขึ้น pending
function thGame() {
  resetWalk();
  const g = createGame();
  g.level = 5; g.coin = 9999;
  g.hire('plerng'); g.hire('kan');
  g.zoneCases.th = 9;
  g.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared', frontierBreach:'pending' };
  g.eventMapClosed = { 'th:prisonBreak':true, 'th:devaTest':true };
  g.queue = [];
  return g;
}
const atGate = g => { g.player.x = FRONTIER.x; g.player.y = FRONTIER.y - 20; };
const farAway = g => { g.player.x = 880; g.player.y = 455; };

test('event ชายแดนบุก: แจ้งเตือน → รับทราบ → ต้องเดินไปถึงชายแดน → สู้ → จบ (state machine)', () => {
  const g = thGame();
  farAway(g);
  assert.equal(g.breachMarch(), null, 'ยังไม่รับทราบ = ยังเป็นช่วงแจ้งเตือน ไม่ใช่ช่วงเดิน');
  assert.equal(g.startFrontierBreach(), null, 'ยังไม่มีทีม สู้ไม่ได้');

  g.dismissEventAlert('frontierBreach');                     // กด "รับทราบ" (หรือปิดหน้าต่าง)
  assert.equal(g.breachMarch()?.key, 'frontierBreach', 'รับทราบแล้ว → ช่วงเดินไปชายแดน');
  assert.equal(g.nearFrontierGate(), false, 'ยังอยู่ไกลจากชายแดน');
  assert.equal(g.frontierBreachStatus(), 'pending', 'event ยังรอ ไม่ตัดเข้าสู้เอง');
  assert.equal(g.battle, null);

  // ระหว่างเดิน: ไม่มีปีศาจ event ลอยบนแผนที่ · ไม่มีตัวจับเวลา — ปล่อยเวลาผ่านนานแค่ไหน event ก็ยังรออยู่
  for (let i = 0; i < 600; i++) g.stepWorld(120);
  assert.equal(g.mobs.some(m => m.eventKey), false);
  assert.equal(g.breachMarch()?.key, 'frontierBreach');

  // เซฟ-โหลดกลางทาง: event ยังค้างช่วงเดิน
  const mid = JSON.parse(JSON.stringify(g.snapshot()));
  const loaded = createGame();
  assert.equal(loaded.restore(mid), true);
  assert.equal(loaded.frontierBreachStatus(), 'pending');
  assert.equal(loaded.breachMarch()?.key, 'frontierBreach', 'โหลดแล้วยังต้องเดินไปชายแดน');
  assert.equal(loaded.eventMapClosed['th:frontierBreach'], true);

  // ถึงชายแดน → เปิดหน้าเตรียมทีมได้ (ui) แล้วเลือกทีม → สู้
  atGate(g);
  assert.equal(g.nearFrontierGate(), true);
  assert.equal(g.setFrontierTeam('plerng'), true);
  assert.ok(g.startFrontierBreach());
  assert.equal(g.frontierBreachStatus(), 'active');
  assert.equal(g.breachMarch(), null, 'กำลังสู้ — ไม่มีช่วงเดิน');

  // เซฟกลางศึก → โหลดกลับเป็น pending และยังต้องเดินไปชายแดนต่อ (ไม่หลุดเป็นไม่มี event)
  const during = JSON.parse(JSON.stringify(g.snapshot()));
  const reloaded = createGame();
  assert.equal(reloaded.restore(during), true);
  assert.equal(reloaded.frontierBreachStatus(), 'pending');
  assert.equal(reloaded.breachMarch()?.key, 'frontierBreach');

  // แพ้ → กลับเป็น pending ช่วงเดิน (ท้าใหม่ได้) · ชนะ → cleared (เล่นผ่านสูตรต่อสู้จริง ไม่ยัดสถานะเอง)
  const fight = (setup) => {
    if (!g.battle) assert.ok(g.startFrontierBreach());
    setup(g.battle);
    for (let i = 0; i < 80 && g.battle && !g.battle.over; i++) if (!g.battleAct('atk')) g.battle.pendingWave && g.advanceFrontierBreachWave();
    const B = g.battle;
    assert.ok(B?.over, 'ศึกจบ');
    return B;
  };
  const lost = fight(B => { B.youHp = 1; B.foes.forEach(f => { f.hp = f.maxHp = 99999; f.atk = [60, 80]; }); });
  assert.equal(lost.over, 'lose');
  g.endBattle();
  assert.equal(g.frontierBreachStatus(), 'pending');
  assert.equal(g.breachMarch()?.key, 'frontierBreach', 'แพ้แล้วยังท้าใหม่ได้ ต้องกลับไปชายแดน');

  const won = fight(B => { B.foes.forEach(f => { f.hp = 1; }); B.youHp = B.youMax = 99999; });
  if (won.over === 'win' && won.pendingWave) { g.advanceFrontierBreachWave(); g.battle.foes.forEach(f => { f.hp = 1; }); for (let i = 0; i < 30 && !g.battle.over; i++) g.battleAct('atk'); }
  assert.equal(g.battle.over, 'win');
  g.endBattle();
  assert.equal(g.frontierBreachStatus(), 'cleared');
  assert.equal(g.breachMarch(), null);
});

test('ระลอกชายแดนของโซน 2–4: ใช้ flow เดียวกัน · ไม่มีปีศาจ event บนแผนที่ · ทีมที่เลือกที่ชายแดนถูกใช้ในศึก', () => {
  const found = [];
  for (const z of Object.keys(ZONE_EVENTS)) for (const ev of ZONE_EVENTS[z]) if (ev.team === 'frontier') found.push([z, ev.k]);
  assert.deepEqual(found.map(f => f[1]).sort(), ['asiaRageBreach', 'cyberBreach', 'frontierBreach', 'westVampireBreach']);
  for (const [z, k] of found) assert.equal(isFrontierBreachEvent(z, k), true);
  assert.equal(isFrontierBreachEvent('cyberhell', 'cyberFinal'), false, 'ศึกสุดท้ายไม่เปลี่ยน flow');

  const g = thGame();
  g.bossCleared.th = true;
  assert.equal(g.moveZone('asia'), true);
  g.hire('plerng'); g.hire('kan');
  g.zoneCases.asia = 7;
  g.zoneEvents.asia = { asiaPrisonFire:'cleared', asiaDevaTest:'cleared' };
  g.refreshZoneEvents('asia');
  assert.equal(g.zoneEventStatus('asiaRageBreach'), 'pending');
  assert.equal(g.breachMarch(), null, 'ยังไม่รับทราบ');
  g.dismissEventAlert('asiaRageBreach', false);
  assert.equal(g.breachMarch()?.key, 'asiaRageBreach');
  for (let i = 0; i < 200; i++) g.stepWorld(120);
  assert.equal(g.mobs.some(m => m.eventKey === 'asiaRageBreach'), false, 'ไม่มีปีศาจ event เดินบนแผนที่');

  g.setFrontierTeam('kan');
  atGate(g);
  assert.ok(g.startZoneEvent('asiaRageBreach'));
  assert.deepEqual(g.battle.team, ['kan'], 'ทีมที่จัดไว้ที่ชายแดนเข้าศึกจริง');
  assert.equal(g.breachMarch(), null);
});

test('เซฟเก่าที่มีปีศาจ event ชายแดนค้างบนแผนที่ ถูกเก็บทิ้ง', () => {
  const g = thGame();
  g.dismissEventAlert('frontierBreach', true);
  g.mobs.push({ id:777, x:760, y:680, hp:50, kind:0, eventKey:'frontierBreach' });
  g.stepWorld(16);
  assert.equal(g.mobs.some(m => m.eventKey === 'frontierBreach'), false);
});
