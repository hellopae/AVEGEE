import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { BAL, BATTLE, BOSS_ULTIMATE, bossUltimate, LEVELS, MERCHANT, ZONES, ZONE_EVENTS, SPOTS } from '../src/data.js';
import { clearFrontierSession, frontierSession, nearFrontierGate, nearFrontierNira } from '../src/frontier.js';

test('ราคาห่อเสบียงลดครึ่งทั้งร้านและแท็บก่อสร้าง', () => {
  assert.equal(MERCHANT.stock.find(x => x.k === 'food').cost, 18);
  assert.equal(BAL.foodPrice * 10, 10);
});

test('ครบ KPI หรือบอสสาขาเก่ายังไม่จบเกมก่อนศึกสุดท้าย รวมเซฟ v3 ที่เคยติดฉากจบ', () => {
  const g = createGame();
  g.kpiPassed = BAL.kpiWin;
  g.karma = 22.4;
  g.casesDone = 25;
  g.zoneCases.th = 25;
  g.order = 100;
  g.checkEnd();
  assert.equal(g.over, null);
  const oldSave = g.snapshot();
  oldSave.over = { k:'win', title:'ทายาทบัลลังก์' };
  delete oldSave.legacyBossGate;
  const loaded = createGame();
  assert.equal(loaded.restore(oldSave), true);
  loaded.checkEnd();
  assert.equal(loaded.over, null);
  assert.equal(loaded.kpiPassed, BAL.kpiWin);
  assert.equal(loaded.casesDone, 25);
  assert.equal(loaded.bossReady(), true);
  for (const z of ZONES) loaded.bossCleared[z.k] = true;
  loaded.checkEnd();
  assert.equal(loaded.over, null);
});

test('ท่าไม้ตายออกครั้งแรกหลังเลือดต่ำกว่าครึ่ง แล้วเว้นอย่างน้อย 4 เทิร์น', () => {
  for (const z of ZONES) {
    const b = { zone:z.k, foeHp:99, foeMax:200, turn:4, ultimateUsed:false };
    assert.equal(bossUltimate({ ...b, foeHp:100 }, 20), null);
    assert.equal(bossUltimate(b, 20).damage, 34);
    assert.equal(bossUltimate({ ...b, ultimateUsed:true, ultimateLastTurn:4, turn:7 }, 20), null);
    assert.equal(bossUltimate({ ...b, ultimateUsed:true, ultimateLastTurn:4, turn:8 }, 20)?.name, BOSS_ULTIMATE[z.k].name);
  }
});

test('ทีมยมบาทน้อย ทัณฑ์ เพลิง ใช้ MP และยาจากกระเป๋าชนะบอสทั้ง 4 โซน', () => {
  const originalRandom = Math.random;
  Math.random = () => 0.5;
  try {
    for (const z of ZONES) {
      const g = createGame();
      g.zone = z.k;
      g.level = z.level;
      g.hpMax = LEVELS[z.level - 1].hpMax;
      g.hp = g.hpMax;
      g.coin = 1500;
      g.inventory.health = 10;
      g.inventory.tea = 5;
      assert.equal(g.hire('plerng'), true);
      g.party.members = ['taan', 'plerng'];
      g.zoneCases[z.k] = 10;
      // This test enters the ordinary zone-boss arena directly; story events
      // are covered separately and must be cleared before that arena opens.
      g.zoneEvents[z.k] = Object.fromEntries((ZONE_EVENTS[z.k] || [])
        .filter(event => event.atCases <= 9)
        .map(event => [event.k, 'cleared']));
      if (z.k === 'th' || z.k === 'cyberhell') {
        // These zones now use story battles at case ten; the old arena remains
        // available as a replay after clearing its boss.
        g.bossCleared[z.k] = true;
        g.player.x = SPOTS.bossPier.x;
        g.player.y = SPOTS.bossPier.y;
        assert.ok(g.startZoneBoss('rematch'));
      } else assert.ok(g.startZoneBoss());
      assert.equal(g.startBossFight(), true);
      let ultimateCount = 0, turns = 0, medicineCount = 0;
      while (!g.battle.over && turns++ < 45) {
        const b = g.battle;
        const helper = g.battleCrew().find(c => !g.crewHelpWhy(c));
        const act = b.youHp <= b.youMax - 35 && g.inventory.health ? 'health'
          : helper ? `crew:${helper.k}` : g.mp >= BATTLE.mpCost.fire ? 'fire' : 'atk';
        assert.equal(g.battleAct(act), true);
        if (act === 'health') medicineCount++;
        if (b.ultimate) ultimateCount++;
      }
      assert.equal(g.battle.over, 'win', z.k);
      assert.ok(ultimateCount > 0, `${z.k}: ต้องเจอท่าไม้ตาย`);
      assert.ok(g.coin >= 0, `${z.k}: งบยาเพียงพอ (${medicineCount} หีบ)`);
    }
  } finally { Math.random = originalRandom; }
});

test('ยมบาทเริ่มที่ประตูบน และเปิดหน้าจัดทีมแล้วเซสชันชายแดนคงศัตรูเดิม', () => {
  clearFrontierSession();
  for (const z of ZONES) {
    const s = frontierSession(z.k);
    assert.equal(nearFrontierGate(s.player), false);
    assert.ok(s.player.y >= 0.30 && s.player.y < 0.40, 'Yama starts below the upper gate, as in the frontier UI mockup');
    s.player.x = 0.5; s.player.y = 0.22;
    assert.equal(nearFrontierGate(s.player), true);
    s.player.x = 0.64; s.player.y = 0.29;
    assert.equal(nearFrontierNira(s.player), true);
    s.enemies.push({ id: 1 });
    assert.equal(frontierSession(z.k).enemies.length, 1);
  }
});

test('ผู้สร้างอยู่ข้างไซต์จนงานเสร็จ และเซฟเดิมที่ทำ buildK หายกู้กลับได้', () => {
  const previousImage = globalThis.Image;
  globalThis.Image = class {};
  try {
    const g = createGame();
    g.coin = 1000;
    assert.equal(g.build('lan'), true);
    const st = g.stations.find(x => x.def.k === 'lan');
    const builder = g.crew.find(x => x.k === 'taan');
    builder.x = st.def.x; builder.y = st.def.y;
    g.stepWorld(16);
    assert.equal(st.buildWait, false);
    assert.equal(builder.buildK, 'lan');
    const saved = g.snapshot();
    saved.crew.find(x => x.k === 'taan').buildK = null;
    const loaded = createGame();
    assert.equal(loaded.restore(saved), true);
    assert.equal(loaded.crew.find(x => x.k === 'taan').buildK, 'lan');
    st.build = Date.now() - 1;
    g.stepWorld(16);
    assert.equal(builder.buildK, null);
  } finally { globalThis.Image = previousImage; }
});
