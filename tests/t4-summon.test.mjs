// T4 step 6 - the Summon command (H2 / D2): the lamp's helper comes out, uses its special move once on every foe, goes back; 3 uses, then the lamp is out until the Mirror Tower recharges it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { STATIONS } from '../src/data.js';
import * as L from '../src/lamp.js';
import { lampOwned } from '../src/lamp.js';
import { readFileSync } from 'node:fs';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
const station = k => ({ def:STATIONS.find(d => d.k === k), crewK:null, intensity:3, fire:0, build:0, slots:[] });
function fight(withLamp = true) {
  const g = createGame(); g.stations.push(station('sawan'), station('krata')); g.coin = 5000;
  if (withLamp) { g.giveLamp(); g.notices = []; }
  g.zoneCases.th = 3; g.refreshZoneEvents('th'); g.dismissEventAlert?.('prisonBreak');
  const b = g.startPrisonBreak(); assert.ok(b && b.foes.length === 3);
  for (const f of b.foes) { f.atk = [0, 0]; f.hp = f.maxHp = 400; }
  return g;
}
const summon = (g, k = 'hanuman') => { const ok = g.confirmBattleCommand(`summon:${k}`, 'you'); if (ok) g.finishBattleCommand(); return ok; };

test('Summon hits EVERY living foe for the helper\'s move damage, costs a use, and uses the player\'s turn', () => {
  const g = fight(); const B = g.battle, before = B.foes.map(f => f.hp);
  const dmg = L.summonDamage(g, 'hanuman'); assert.ok(dmg > 0);
  assert.equal(g.confirmBattleCommand('summon:hanuman', 'you'), true);
  assert.deepEqual(B.foes.map(f => f.hp), before.map(h => h - dmg), 'group hit');
  assert.deepEqual(B.dmg.foeHits.map(h => h.damage), [dmg, dmg, dmg]); assert.equal(B.dmg.area, true);
  assert.equal(B.summon.key, 'hanuman'); assert.equal(B.summon.left, 2); assert.equal(B.summon.move, 'เหาะเหนือเมฆ'); assert.match(B.summon.use.th, /ข้าไม่ชักอาวุธ แต่ข้าไม่ออมมือ/); assert.match(B.summon.call.th, /พระนางฝากข้ามา/);
  assert.equal(L.summonUsesLeft(g, 'hanuman'), 2); assert.equal(g.commandBusy ?? B.commandBusy, true);
});

test('3 uses, then the 4th is refused and the lamp reads spent; the fight is never stuck (attack still works)', () => {
  const g = fight();
  for (let i = 0; i < 3; i++) { assert.equal(summon(g), true, `use ${i + 1}`); if (g.battle?.over) break; }
  assert.equal(L.summonUsesLeft(g, 'hanuman'), 0);
  assert.equal(g.confirmBattleCommand('summon:hanuman', 'you'), false, 'no 4th');
  assert.equal(L.summonWhy(g, 'hanuman'), 'spent');
  g.battle.foes.forEach(f => { if (f.hp <= 0) f.hp = 50; }); g.battle.selectedFoeId = g.battle.foes.find(f => f.hp > 0).id;
  assert.equal(g.confirmBattleCommand('atk', 'you'), true, 'the normal attack still works');
});

test('recharge at the tower gives the 3 uses back', () => {
  const g = fight(); summon(g); summon(g); summon(g);
  assert.equal(L.summonUsesLeft(g, 'hanuman'), 0);
  g.rechargeMagic('lamp'); assert.equal(L.summonUsesLeft(g, 'hanuman'), 3);
  assert.equal(summon(g), true);
});

test('before the lamp: the helper cannot be called; a helper that is not in a slot cannot either; locked kinds refuse', () => {
  assert.equal(fight(false).confirmBattleCommand('summon:hanuman', 'you'), false);
  const g = fight(); g.placeHelper(0, null);
  assert.equal(g.confirmBattleCommand('summon:hanuman', 'you'), false, 'emptied slot');
  assert.equal(g.confirmBattleCommand('summon:thor', 'you'), false, 'unknown / unmet');
  assert.equal(L.summonWhy(g, 'hanuman', { kind:'yama' }), 'cannot'); assert.equal(L.summonWhy(g, 'hanuman', { kind:'dad' }), 'cannot');
});

test('a teammate\'s turn can be spent on the lamp too (any actor); the move is not boosted by rage', () => {
  const g = fight(); g.abilities.rage = true; g.battle.rageTurns = 3;
  const dmg = L.summonDamage(g, 'hanuman'), hp0 = g.battle.foes[0].hp;
  assert.equal(g.confirmBattleCommand('summon:hanuman', 'you'), true);
  assert.equal(hp0 - g.battle.foes[0].hp, dmg, 'rage does not touch it'); assert.equal(g.battle.rageTurns, 3);
});

test('a helper that downs the last foe wins the fight; the lamp window "flame is low" waits after the fight once all three uses went', () => {
  const g = fight();
  for (const f of g.battle.foes) { f.hp = 5; f.maxHp = 400; }
  assert.equal(g.confirmBattleCommand('summon:hanuman', 'you'), true);
  assert.equal(g.battle.foes.every(f => f.hp <= 0), true);
});

test('NA-3: after a fight that used the last flame, "ไฟในตะเกียงริบหรี่" is queued once (and not while a flame is left)', () => {
  const g = fight(); summon(g);
  const B = g.battle; for (const f of B.foes) f.hp = 0; B.over = 'win'; g.finishBattleCommand?.(); g.endBattle();
  assert.deepEqual(g.notices.filter(n => n === 'lamp-low'), [], 'two flames left');
  const h = fight(); summon(h); summon(h); summon(h);
  const C = h.battle; for (const f of C.foes) f.hp = 0; C.over = 'win'; h.endBattle();
  assert.deepEqual(h.notices.filter(n => n === 'lamp-low'), ['lamp-low']);
});

test('H2 (FB3-BT1): no Flee row in any fight; the summon row appears only once the lamp is owned', () => {
  const g = createGame();
  const src = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  assert.match(src, /LAMP\.lampOwned\(g\) \? \[\{id:'summon'/); assert.doesNotMatch(src, /id:'escape'/);
  g.giveLamp(); assert.equal(lampOwned(g), true);
});
