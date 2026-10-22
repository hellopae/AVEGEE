// P1 (22 ต.ค. 2569) — ช่วงต้นเกม: ปลดล็อกสถานที่ทีละขั้น · นอนเมื่อสร้างศาลาน้ำชา · ลำดับแนะนำจ้าง · ตัดปุ่มงานบริหารออกจากโปรไฟล์
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { STATIONS, CREW } from '../src/data.js';
import { CASES_BY_ZONE, isPure } from '../src/cases.js';
import { BUILD_PLAN, HIRE_PLAN, buildUnlockLv, unlockedAtLevel, hireRank, recommendedHire } from '../src/unlocks.js';

globalThis.Image ??= class {};
const game = () => { const g = createGame(); g.save = () => true; g.onChange = () => {}; g.coin = 100000; return g; };
const finish = (g, k) => { const st = g.stations.at(-1); assert.equal(st.def.k, k); st.build = 0; st.buildWait = false; g.crewOf('taan').buildK = null; g.crewOf('dam') && (g.crewOf('dam').buildK = null); };

test('unlock table: tea Lv1 -> dab Lv2 -> sawan Lv3 -> ngiw/lan Lv4 -> lokan/krajok Lv5, every plan entry is a real buildable station', () => {
  assert.deepEqual(BUILD_PLAN.map(p => p.k), ['krata', 'tea', 'dab', 'sawan', 'ngiw', 'lan', 'lokan', 'krajok']);
  assert.deepEqual(BUILD_PLAN.map(p => p.lv), [1, 1, 2, 3, 4, 4, 5, 5]);
  for (const p of BUILD_PLAN) assert.ok(STATIONS.find(s => s.k === p.k && s.cost > 0), p.k);
  // every buildable station is covered by the plan (nothing silently unlocked at Lv1)
  assert.deepEqual(STATIONS.filter(s => s.cost > 0).map(s => s.k).sort(), BUILD_PLAN.map(p => p.k).sort());
  assert.equal(buildUnlockLv('sala'), 1); assert.equal(buildUnlockLv('tarang'), 1);
  assert.deepEqual(unlockedAtLevel(1), []); assert.deepEqual(unlockedAtLevel(2), ['dab']); assert.deepEqual(unlockedAtLevel(4), ['ngiw', 'lan']);
});

test('g.build refuses a locked station without charging, and accepts it the moment the level is reached', () => {
  const g = game();
  assert.equal(g.level, 1);
  for (const [k, lv] of [['dab', 2], ['sawan', 3], ['ngiw', 4], ['lan', 4], ['lokan', 5], ['krajok', 5]]) {
    const coin = g.coin;
    assert.equal(g.buildLocked(k), true, k); assert.equal(g.buildUnlockLv(k), lv);
    assert.equal(g.build(k), false, `${k} locked at Lv1`); assert.equal(g.coin, coin); assert.equal(g.stations.some(s => s.def.k === k), false);
  }
  assert.equal(g.buildLocked('tea'), false);
  assert.equal(g.hire('dam'), true);
  assert.equal(g.build('tea'), true); finish(g, 'tea');
  g.level = 2; assert.equal(g.build('dab'), true); finish(g, 'dab');
  g.level = 3; assert.equal(g.build('sawan'), true); finish(g, 'sawan');
  g.level = 4; assert.equal(g.build('ngiw'), true); finish(g, 'ngiw'); assert.equal(g.build('lan'), true); finish(g, 'lan');
  g.level = 5; assert.equal(g.build('lokan'), true); finish(g, 'lokan'); assert.equal(g.build('krajok'), true);
});

test('old saves: buildings already standing stay usable even when the level is below their unlock level', () => {
  const g = game(); g.level = 5;
  assert.equal(g.hire('dam'), true);
  for (const k of ['tea', 'dab', 'sawan', 'lokan']) { assert.equal(g.build(k), true, k); finish(g, k); }
  const save = JSON.parse(JSON.stringify(g.snapshot()));
  save.level = 1; save.exp = 0;                       // worst case: level lower than what the save already built
  const loaded = game(); loaded.restore(save);
  assert.equal(loaded.level, 1);
  for (const k of ['tea', 'dab', 'sawan', 'lokan']) {
    assert.ok(loaded.stations.some(s => s.def.k === k && !s.build), `${k} still built`);
    assert.equal(loaded.buildLocked(k), false, `${k} not locked`);
    assert.equal(loaded.has(k), true);
  }
  assert.equal(loaded.buildLocked('krajok'), true, 'unbuilt stations above the level are still locked');
  assert.equal(loaded.teaBedReady(), true);
});

test('recommended build follows tea -> dab -> sawan, never recommends a locked station, and starts with krata in a new zone', () => {
  const g = game();
  assert.equal(g.recommendedBuild(), 'tea');
  assert.equal(g.hire('dam'), true); assert.equal(g.build('tea'), true); finish(g, 'tea');
  assert.equal(g.recommendedBuild(), null, 'dab is still locked at Lv1 — nothing to recommend');
  g.level = 2; assert.equal(g.recommendedBuild(), 'dab');
  assert.equal(g.build('dab'), true); finish(g, 'dab');
  assert.equal(g.recommendedBuild(), null); g.level = 3; assert.equal(g.recommendedBuild(), 'sawan');
  const fresh = game(); fresh.stations = fresh.stations.filter(s => ['sala', 'tarang'].includes(s.def.k));
  assert.equal(fresh.recommendedBuild(), 'krata');
});

test('level-up that unlocks a station logs it once', () => {
  const g = game(); g.exp = 119; g.gainExp(5, 'test');
  assert.equal(g.level, 2);
  assert.equal(g.logs.filter(l => l.text.includes('ปลดล็อก') && l.text.includes('ป่าดาบ')).length, 1);
});

test('sleep needs a finished tea pavilion, not a bought bed', () => {
  const g = game();
  assert.equal(g.teaBedReady(), false);
  assert.equal(g.hire('dam'), true); assert.equal(g.build('tea'), true);
  assert.equal(g.teaBedReady(), false, 'scaffolding does not count'); finish(g, 'tea');
  assert.equal(g.teaBedReady(), true);
  assert.equal(g.buyTeaBed, undefined);
  assert.deepEqual(g.teaBeds, {});
});

test('named cases never surface when their worst sin has no place to go yet (locked stations stay out of the queue)', () => {
  const placeOf = { kong: 'krata', mao: 'krata', kha: 'dab', pak: 'dab', kam: 'ngiw', bian: 'lan', akata: 'lokan' };
  for (let run = 0; run < 60; run++) {
    const g = game(); g.casesDone = 5; g.spawns = 3;   // th: named cases come on every 3rd spawn
    const seen = new Set();
    for (let i = 0; i < 40; i++) {
      const c = g.nextNamedCase(g.activeTags());
      if (!c) break;
      const def = CASES_BY_ZONE.th.find(x => x.k === c.case);
      const deeds = [...def.seen, ...(def.hidden || [])];
      const primary = deeds.reduce((b, d) => !b || d.w > b.w ? d : b, null).s;
      if (!isPure(def)) assert.ok(['krata'].includes(placeOf[primary]), `${def.k}: worst sin ${primary} needs ${placeOf[primary]} which is not built`);
      else assert.fail(`pure case ${def.k} must not appear before the heaven gate exists`);
      seen.add(def.k);
    }
    assert.ok(seen.size > 0, 'there are still named cases for the krata-only start');
  }
});

test('hiring order: dam -> helper -> plerng -> guard -> boon -> kan, recommendation moves to the next un-hired entry', () => {
  assert.deepEqual(HIRE_PLAN.map(p => p.id), ['dam', 'worker', 'plerng', 'guard', 'boon', 'kan']);
  for (const p of HIRE_PLAN.filter(p => p.kind === 'crew')) assert.ok(CREW.some(c => c.k === p.k && c.hire > 0), p.k);
  assert.equal(hireRank('dam'), 1); assert.equal(hireRank('guard'), 4); assert.equal(hireRank('taan'), 0);
  const g = game();
  const walk = [];
  for (let i = 0; i < 8; i++) {
    const id = recommendedHire(g); walk.push(id);
    if (!id) break;
    if (id === 'worker') assert.ok(g.hireWorker());
    else if (id === 'guard') assert.equal(g.hireGuard(), true);
    else assert.equal(g.hire(id), true, id);
  }
  assert.deepEqual(walk, ['dam', 'worker', 'plerng', 'guard', 'boon', 'kan', null]);
});

test('profile page has no management shortcut; the pause menu still reaches the management drawer', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  assert.equal(html.includes('hero-profile-management'), false);
  assert.equal(ui.includes('hero-profile-management'), false);
  assert.ok(ui.includes("#pause-more').onclick = () => { finishPause(); openLegacyDrawer(); }"), 'drawer is still reachable from the pause menu');
  assert.ok(html.includes('id="hero-profile-bag"'), 'the bag shortcut stays');
});
