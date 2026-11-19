// T4 step 2 - Magic Lamp / summon state (src/lamp.js): treasures, lamp slots, helpers unlocked by their own event (D4), 3 uses each (D2), save/load, old saves.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import * as L from '../src/lamp.js';
import { lt, LAMP_TEXT } from '../src/lamp-text.js';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
const reload = g => { const n = createGame(); n.restore(JSON.parse(JSON.stringify(g.snapshot()))); return n; };

test('12 helpers in the data, the owner\'s list; only Hanuman has an event yet and only a `ready` helper is ever shown', () => {
  assert.deepEqual(L.SUMMONER_KEYS, ['hanuman', 'kumanthong', 'yomathat', 'wukong', 'liangang', 'ryujin', 'musashi', 'eirlin', 'jormungandr', 'thor', 'lucifer', 'lupin']);
  assert.deepEqual(L.SUMMONER_KEYS.filter(k => L.SUMMONERS[k].ready), ['hanuman', 'kumanthong', 'yomathat', 'wukong', 'liangang', 'ryujin', 'musashi', 'eirlin']);   // T7b/4: Eirlin (case 10) · T5'/1: Kuman Thong (case 13) · T5'/5: Yomathat (the gate of Zone 2) · T6/3: Wukong
  assert.equal(L.SUMMONERS.hanuman.move.name.th, 'เหาะเหนือเมฆ'); assert.equal(L.SUMMONERS.hanuman.move.name.en, 'Beyond the Clouds');
  for (const k of L.SUMMONER_KEYS) { const s = L.SUMMONERS[k]; assert.ok(s.name.th && s.name.en && s.move.name.th && s.move.name.en && s.event, k); }
  const g = createGame(); L.unlockSummoner(g, 'thor');
  assert.deepEqual(L.unlockedSummoners(g), [], 'a helper whose event is not in the game yet is never listed');
});

test('a new game has no lamp, no slots; the three treasures read "not found" (lamp) / mirror state / "not found" (clock)', () => {
  const g = createGame();
  assert.equal(L.lampOwned(g), false); assert.equal(L.lampSlotCount(g), 0);
  assert.equal(L.treasureState(g, 'lamp').state, 'none'); assert.equal(L.treasureState(g, 'clock').state, 'none');
  assert.equal(L.summonWhy(g, 'hanuman', { kind:'mob' }), 'noLamp');
});

test('receiving the lamp: Hanuman unlocked, 1 slot, Hanuman in it (LAMP_FIRST_SLOT_ON = receive) - once', () => {
  assert.equal(L.LAMP_FIRST_SLOT_ON, 'receive');
  const g = createGame();
  assert.equal(L.receiveLamp(g), true); assert.equal(L.receiveLamp(g), false);
  assert.equal(L.lampOwned(g), true); assert.equal(L.lampSlotCount(g), 1);
  assert.deepEqual(L.unlockedSummoners(g), ['hanuman']); assert.deepEqual(L.slottedSummoners(g), ['hanuman']);
  assert.equal(L.summonUsesLeft(g, 'hanuman'), 3);
  assert.equal(L.summonWhy(g, 'hanuman', { kind:'mob' }), '');
  assert.equal(L.summonWhy(g, 'hanuman', { kind:'dad' }), 'cannot'); assert.equal(L.summonWhy(g, 'hanuman', { kind:'mob', over:'win' }), 'cannot');
  assert.equal(L.summonWhy(g, 'thor', { kind:'mob' }), 'empty');
});

test('3 uses, then spent; recharge at the tower gives them back; the lamp reads spent only when every slotted helper is out', () => {
  const g = createGame(); L.receiveLamp(g);
  assert.equal(L.treasureState(g, 'lamp').state, 'charged');
  assert.deepEqual(L.spendSummon(g, 'hanuman'), { used:1, left:2, out:false });
  assert.equal(L.treasureState(g, 'lamp').state, 'partial');
  L.spendSummon(g, 'hanuman'); assert.deepEqual(L.spendSummon(g, 'hanuman'), { used:3, left:0, out:true });
  assert.deepEqual(L.spendSummon(g, 'hanuman'), { used:3, left:0, out:true }, 'never counts past 3');
  assert.equal(L.summonWhy(g, 'hanuman', { kind:'mob' }), 'spent'); assert.equal(L.lampAllSpent(g), true); assert.equal(L.treasureState(g, 'lamp').state, 'spent');
  assert.deepEqual(L.rechargeTreasures(g, 'lamp'), ['lamp']);
  assert.equal(L.summonUsesLeft(g, 'hanuman'), 3); assert.equal(L.summonWhy(g, 'hanuman', { kind:'mob' }), '');
  assert.deepEqual(L.rechargeTreasures(g, 'lamp'), [], 'already full');
});

test('slots: only as many as the lamp level, a helper stands in one slot at most, an unmet helper cannot be placed', () => {
  const g = createGame(); L.receiveLamp(g); L.unlockSummoner(g, 'kumanthong'); L.SUMMONERS.kumanthong.ready || null;
  assert.equal(L.setSlot(g, 1, 'hanuman'), 'locked');
  assert.equal(L.setSlot(g, 0, 'thor'), 'unmet');
  assert.equal(L.setSlot(g, 0, 'kumanthong'), ''); assert.equal(g.magic.lamp.slots[0], 'kumanthong');
  assert.equal(L.setSlot(g, 0, null), ''); assert.equal(g.magic.lamp.slots[0], null);
  assert.equal(L.devUpgradeLamp(g, 'th'), ''); assert.equal(L.lampSlotCount(g), 1, 'the Zone 1 tower confirms level 1 (the first slot came with the lamp)');
  assert.equal(L.devUpgradeLamp(g, 'th'), 'already');
  assert.equal(L.devUpgradeLamp(g, 'asia'), ''); assert.equal(L.lampSlotCount(g), 2);
  assert.equal(L.devUpgradeLamp(g, 'cyberhell'), ''); assert.equal(L.lampSlotCount(g), 4);
  assert.equal(L.devUpgradeLamp(g, 'west'), ''); assert.equal(L.lampSlotCount(g), 4, 'never down, never above 4');
  assert.equal(L.setSlot(g, 3, 'hanuman'), ''); assert.equal(g.magic.lamp.slots.filter(x => x === 'hanuman').length, 1);
  assert.equal(L.setSlot(g, 2, 'hanuman'), ''); assert.equal(g.magic.lamp.slots.filter(x => x === 'hanuman').length, 1, 'moving him leaves one copy');
});

test('the dev upgrade is ONE flag; no lamp -> no upgrade', () => {
  assert.equal(L.LAMP_DEV_UPGRADE_BUTTON, true);
  assert.equal(L.devUpgradeLamp(createGame(), 'th'), 'noLamp');
});

test('save/load keeps the lamp, slots, uses, tower flags', () => {
  let g = createGame(); L.receiveLamp(g); L.devUpgradeLamp(g, 'asia'); L.spendSummon(g, 'hanuman');
  g = reload(g);
  assert.equal(L.lampOwned(g), true); assert.equal(L.lampSlotCount(g), 2); assert.equal(L.summonUsesLeft(g, 'hanuman'), 2); assert.equal(g.magic.lamp.towers.asia, true);
  assert.deepEqual(L.slottedSummoners(g), ['hanuman']);
});

test('old saves: no `magic` -> a whole empty one · broken `magic` is repaired · a save that already cleared Sita\'s event gets the lamp + the window (once)', () => {
  const g0 = createGame(); const d = JSON.parse(JSON.stringify(g0.snapshot())); delete d.magic;
  let g = createGame(); g.restore(d);
  assert.equal(L.lampOwned(g), false); assert.equal(L.lampSlotCount(g), 0); assert.deepEqual(g.notices, []);
  const bad = { ...d, magic:{ lamp:{ owned:'yes', level:99, slots:['nobody', 'hanuman', 7], used:{ hanuman:'2' } }, unlocked:{ ghost:true, hanuman:true } } };
  g = createGame(); g.restore(bad);
  assert.equal(g.magic.lamp.level, 4); assert.deepEqual(g.magic.lamp.slots, [null, 'hanuman', null, null]); assert.equal(g.magic.unlocked.ghost, undefined);
  const cleared = JSON.parse(JSON.stringify(g0.snapshot())); delete cleared.magic; cleared.zoneEvents = { ...(cleared.zoneEvents || {}), th:{ sitaHanuman:'cleared' } };
  g = createGame(); g.restore(cleared);
  assert.equal(L.lampOwned(g), true); assert.deepEqual(L.slottedSummoners(g), ['hanuman']); assert.deepEqual(g.notices, ['lamp-received']);
  const again = createGame(); again.restore(JSON.parse(JSON.stringify(g.snapshot()))); assert.deepEqual(again.notices, ['lamp-received'], 'saved window is not duplicated');
});

test('mirror treasure follows the existing mirror power (ammo) and the tower refills it; the clock follows the existing cooldown clock', () => {
  const g = createGame();
  assert.equal(L.treasureState(g, 'mirror').state, 'none', 'locked mirror = not found');
  g.powerLocked = () => false;                       // the real unlock is the deva fight (own tests); here only the treasure card is under test
  const p = g.powerOf('mirror'); p.ammo = p.max; assert.equal(L.treasureState(g, 'mirror').state, 'charged');
  p.ammo = 0; assert.equal(L.treasureState(g, 'mirror').state, 'spent');
  p.ammo = 1; if (p.max > 1) assert.equal(L.treasureState(g, 'mirror').state, 'partial');
  assert.deepEqual(L.rechargeTreasures(g, 'mirror'), ['mirror']); assert.equal(p.ammo, p.max);
  assert.deepEqual(L.rechargeTreasures(g, 'all'), [], 'everything is full / not owned');
  assert.equal(L.treasureState(g, 'clock').state, 'none'); g.inventory.cooldownClock = 1; assert.equal(L.treasureState(g, 'clock').state, 'charged');
});

test('every text key has Thai and English and fills {vars}', () => {
  for (const [k, row] of Object.entries(LAMP_TEXT)) assert.ok(row.th && row.en, k);
  assert.equal(lt('bag.movesLeft', { n:2 }, 'th'), 'ท่าไม้ตาย เหลือ 2/3'); assert.equal(lt('bag.movesLeft', { n:2 }, 'en'), 'Special move: 2/3 left');
  assert.equal(lt('bag.locked', { n:3 }, 'en'), 'Locked · play the minigame at the Mirror Tower of Zone 3');
});
