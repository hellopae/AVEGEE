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
import { callHelper, helperAct } from './summon-helper.mjs';
// FB3-EV5: calling a helper = the caller's turn + one of its 3 lamp uses, and it hits nobody; the helper then stands in the team for 3 acts picked by the player (own move / plain attack). One full visit = call + 3 acts.
const summon = (g, k = 'hanuman') => callHelper(g, k);
const visit = (g, k = 'hanuman', what = 'helper:move') => { if (!callHelper(g, k)) return false; for (let i = 0; i < 3 && !g.battle.over; i++) assert.equal(helperAct(g, what, k), true, `act ${i + 1}`); return true; };

test('Summon: the call costs a use and the player\'s turn, hits nobody; the helper stands in the team and its move hits EVERY living foe for its share of the old one-hit number', () => {
  const g = fight(); const B = g.battle, before = B.foes.map(f => f.hp);
  const old = L.summonDamage(g, 'hanuman'), move = L.helperActDamage(g, 'hanuman', 'move'); assert.ok(old > 0 && move > 0 && move < old);
  assert.equal(g.confirmBattleCommand('summon:hanuman', 'you'), true);
  assert.deepEqual(B.foes.map(f => f.hp), before, 'no damage from the call'); assert.equal(B.summon.key, 'hanuman'); assert.equal(B.summon.phase, 'call');
  assert.match(B.summon.use.th, /ข้าไม่ชักอาวุธ แต่ข้าไม่ออมมือ/); assert.match(B.summon.call.th, /พระนางฝากข้ามา/);
  assert.equal(L.summonUsesLeft(g, 'hanuman'), 2, 'one of the 3 lamp uses'); assert.equal(B.commandBusy, true);
  assert.equal(B.summoned.key, 'hanuman'); assert.equal(B.summoned.left, 3);
  g.finishBattleCommand();
  assert.ok(g.battleActors().some(a => a.id === 'summon:hanuman' && a.k === 'summon'), 'one more member of the team');
  assert.equal(helperAct(g, 'helper:move', 'hanuman', false), true);
  assert.deepEqual(B.foes.map(f => f.hp), before.map(h => h - move), 'group hit'); assert.deepEqual(B.dmg.foeHits.map(h => h.damage), [move, move, move]); assert.equal(B.dmg.area, true);
  assert.equal(B.summon.phase, 'move'); assert.equal(B.summon.left, 2, 'acts left of 3');
});

test('3 acts, then the helper goes; 3 visits, then the 4th call is refused and the lamp reads spent; the fight is never stuck (attack still works)', () => {
  const g = fight();
  for (let i = 0; i < 3; i++) { assert.equal(visit(g), true, `visit ${i + 1}`); if (g.battle?.over) break; assert.equal(g.summonedActor(), null, 'gone after the third act'); }
  assert.equal(L.summonUsesLeft(g, 'hanuman'), 0);
  assert.equal(g.confirmBattleCommand('summon:hanuman', 'you'), false, 'no 4th');
  assert.equal(L.summonWhy(g, 'hanuman'), 'spent');
  g.battle.foes.forEach(f => { if (f.hp <= 0) f.hp = 50; }); g.battle.selectedFoeId = g.battle.foes.find(f => f.hp > 0).id; g.battle.actorId = 'you';
  assert.equal(g.confirmBattleCommand('atk', 'you'), true, 'the normal attack still works');
});

test('recharge at the tower gives the 3 uses back', () => {
  const g = fight(); visit(g); visit(g); visit(g);
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

test('a teammate\'s turn can be spent on the lamp too (any actor); the helper\'s acts are not boosted by rage', () => {
  const g = fight(); g.abilities.rage = true; g.battle.rageTurns = 3; g.hire('taan'); g.party.members = ['taan']; g.battle.team = ['taan'];
  const who = g.battleActors().find(a => a.id !== 'you'); assert.ok(who, 'a teammate stands in the fight');
  assert.equal(callHelper(g, 'hanuman', who.id), true, 'the caller is the teammate');
  const dmg = L.helperActDamage(g, 'hanuman', 'move'), hp0 = g.battle.foes[0].hp;
  assert.equal(helperAct(g, 'helper:move', 'hanuman', false), true);
  assert.equal(hp0 - g.battle.foes[0].hp, dmg, 'rage does not touch it'); assert.equal(g.battle.rageTurns, 3);
});

test('a helper that downs the last foe wins the fight; the lamp window "flame is low" waits after the fight once all three uses went', () => {
  const g = fight();
  for (const f of g.battle.foes) { f.hp = 5; f.maxHp = 400; }
  assert.equal(callHelper(g, 'hanuman'), true); assert.ok(g.battle.foes.every(f => f.hp > 0), 'the call alone wins nothing');
  assert.equal(helperAct(g, 'helper:move', 'hanuman', false), true);
  assert.equal(g.battle.foes.every(f => f.hp <= 0), true);
});

test('NA-3: after a fight that used the last flame, "ไฟในตะเกียงริบหรี่" is queued once (and not while a flame is left)', () => {
  const g = fight(); summon(g);
  const B = g.battle; for (const f of B.foes) f.hp = 0; B.over = 'win'; g.finishBattleCommand?.(); g.endBattle();
  assert.deepEqual(g.notices.filter(n => n === 'lamp-low'), [], 'two flames left');
  const h = fight(); visit(h); visit(h); visit(h);
  const C = h.battle; for (const f of C.foes) f.hp = 0; C.over = 'win'; h.endBattle();
  assert.deepEqual(h.notices.filter(n => n === 'lamp-low'), ['lamp-low']);
});

test('H2 (FB3-BT1): no Flee row in any fight; the summon row appears only once the lamp is owned', () => {
  const g = createGame();
  const src = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  assert.match(src, /LAMP\.lampOwned\(g\) \? \[\{id:'summon'/); assert.doesNotMatch(src, /id:'escape'/);
  g.giveLamp(); assert.equal(lampOwned(g), true);
});
