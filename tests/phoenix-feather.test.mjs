// QUEST-DAM-B (owner 14-15 Nov): the Phoenix Feather - wakes a fallen teammate at 40 % HP, in battle only, one turn,
// once per person per fight, never on Yama; sold by the merchant only after the feather quest, at most 3 in the bag.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { STATIONS, ITEMS, MERCHANT_STOCK_BY_ZONE, PHOENIX_FEATHER } from '../src/data.js';
import { actorFromLegacy, syncRoster } from '../src/roster.js';
import { TH_DICT, EN_DICT } from './helpers/i18n-dicts.mjs';

globalThis.Image ??= class {};
function game(kinds = ['taan', 'plerng', 'kan']) {
  const g = createGame(); g.zone = 'th'; g.save = () => true; g.onChange = () => {};
  g.crew = kinds.map(k => actorFromLegacy({ k, morale: 100 }, 'th'));
  g.guard = null; g.roster = {}; syncRoster(g); g.party.members = kinds;
  g.stations = STATIONS.map(def => ({ def, build: 0, slots: [] }));
  return g;
}
function fight(g) {
  g.startBattle({ id: 200, who: 'คู่ซ้อม', deserved: 4, resist: true });
  for (const f of g.battle.foes) { f.hp = f.maxHp = 10000; f.atk = [0, 0]; }
  g.mp = g.mpMax = 1000; g.beginBattleTurns(); return g.battle;
}
const knock = (g, a) => { a.morale = 0; return g.downActor(a); };
/** use the feather the way the battle menu does (the turn must be an ally's: pick the first ally actor) */
function allyTurn(g) {
  let turn = g.beginBattleTurns(), guard = 0;
  while (turn?.side !== 'ally' && guard++ < 30) { g.runEnemyTurn(); g.finishBattleCommand(); turn = g.beginBattleTurns(); }
  if (turn?.side !== 'ally') throw Error('no ally turn');
  return turn;
}
function useFeather(g, recipientId) { allyTurn(g); return g.confirmBattleCommand('phoenixFeather', recipientId); }

test('item data: spelled ขนนกฟีนิกซ์, battle-only, a new picture file, TH + EN words from Rae', () => {
  const it = ITEMS.phoenixFeather;
  assert.equal(it.name, 'ขนนกฟีนิกซ์'); assert.equal(it.nameEn, 'Phoenix Feather');
  assert.equal(it.battleOnly, true); assert.equal(it.img, 'item-phoenix-feather');
  assert.ok(existsSync('img/item-phoenix-feather.webp'.replace(/^/, new URL('..', import.meta.url).pathname)));
  const i18n = readFileSync(new URL('../src/i18n.js', import.meta.url), 'utf8');
  for (const k of ['name', 'desc', 'howTo', 'say', 'tag', 'noneDown', 'noYama', 'once']) {
    assert.match(i18n, new RegExp(`'item\\.phoenixFeather\\.${k}': '`), `TH ${k}`);
    assert.ok(EN_DICT[`item.phoenixFeather.${k}`], `EN ${k}`);
  }
  assert.match(i18n, /'item\.phoenixFeather\.name': 'ขนนกฟีนิกซ์'/);
  // no misspelling anywhere the player can read
  const all = ['i18n.js', 'data.js', 'ui.js', 'game.js'].map(f => readFileSync(new URL('../src/' + f, import.meta.url), 'utf8')).join('\n');
  assert.doesNotMatch(all, /ฟินิกซ์|ฟินิกส์|ฟีนิกส์/);
  assert.deepEqual({ ...PHOENIX_FEATHER }, { heal: .4, questGain: 2, price: 150, maxCarry: 3, perFightEach: 1 });
});
import { existsSync } from 'node:fs';

test('wakes a fallen teammate at 40 % HP, back in the turn order, out of the fallen list, one feather used', () => {
  const g = game(); const b = fight(g); const [taan] = g.crew;
  g.inventory.phoenixFeather = 2;
  knock(g, taan);
  assert.deepEqual(b.fallen, [taan.id]);
  assert.ok(!g.battleActors().some(a => a.id === taan.id));
  assert.equal(g.phoenixWhy(taan.id), '', 'a fallen teammate can receive it');
  assert.equal(g.phoenixTargets().length, 1);
  assert.equal(useFeather(g, taan.id), true);
  assert.equal(taan.morale, Math.round(100 * PHOENIX_FEATHER.heal), '40 % of the 100 HP a teammate has');
  assert.deepEqual(b.fallen, []); assert.ok(!b.absentActors.includes(taan.id));
  assert.ok(g.battleActors().some(a => a.id === taan.id), 'on the field again');
  assert.equal(g.inventory.phoenixFeather, 1);
  assert.equal(b.commandBusy, true, 'it was a whole action: the user\'s turn is spent');
  assert.equal(taan.recoverUntil, 0, 'no tea-house rest: he never left the battle');
  assert.match(b.talk, /ลืมตาขึ้นแล้วลุกยืน/);
  g.finishBattleCommand();
  // the revived teammate takes his place in the next round of the turn order
  let guard = 0; while (!g.battleTimeline().some(x => x.id === taan.id && x.round > b.turnQueue.round) && guard++ < 3) g.advanceBattleTime(1000, true);
  assert.ok(g.battleTimeline().some(x => x.id === taan.id), 'back in the queue');
});

test('never on Yama (he has the Spare Heart), never when nobody is down, never outside a battle', () => {
  const g = game();
  g.inventory.phoenixFeather = 1;
  assert.match(g.phoenixWhy('you'), /./, 'no battle: a reason');
  fight(g); const [taan] = g.crew;
  assert.equal(g.phoenixWhy('you'), 'ขนนกนี้ใช้กับยมทูตในทีมเท่านั้น ยามามีหัวใจสำรองคอยช่วยอยู่แล้ว');
  assert.equal(g.phoenixWhy(taan.id), 'ตอนนี้ไม่มีเพื่อนในทีมที่ล้มอยู่', 'standing teammates cannot receive it');
  assert.equal(g.phoenixTargets().length, 0);
  assert.equal(useFeather(g, 'you'), false, 'the command is refused');
  assert.equal(g.inventory.phoenixFeather, 1, 'nothing spent');
  assert.equal(g.useBag('phoenixFeather'), false, 'the bag cannot use it outside battle either');
});

test('the same person can be woken only once per fight; a different fallen teammate still can; a new fight starts clean', () => {
  const g = game(); const b = fight(g); const [taan, plerng] = g.crew;
  g.inventory.phoenixFeather = 3;
  knock(g, taan); assert.equal(useFeather(g, taan.id), true); g.finishBattleCommand();
  assert.equal(taan.morale, 40);
  knock(g, taan);                                             // down again in the same fight
  assert.equal(g.phoenixWhy(taan.id), 'ขนเส้นนี้ส่งคำฝากไปถึงเขาแล้วหนึ่งครั้งในศึกนี้');
  assert.equal(g.phoenixTargets().length, 0, 'nobody left to wake');
  const before = g.inventory.phoenixFeather;
  // refused (the same turn still belongs to the next ally or foe: make it an ally turn first)
  allyTurn(g);
  assert.equal(g.confirmBattleCommand('phoenixFeather', taan.id), false);
  assert.equal(g.inventory.phoenixFeather, before);
  knock(g, plerng);
  assert.equal(g.phoenixWhy(plerng.id), '');
  assert.deepEqual(g.phoenixTargets().map(c => c.id), [plerng.id]);
  g.endBattle?.();
  const g2 = game(); const b2 = fight(g2);
  assert.equal(b2.phoenixUsed ?? null, null, 'a new fight remembers nothing');
});

test('the Guard can be woken too (he is a teammate who falls and lies down)', () => {
  const g = game(['taan']); g.guard = actorFromLegacy({ morale: 100 }, 'th', 'guard'); syncRoster(g);
  const b = fight(g); g.inventory.phoenixFeather = 1;
  knock(g, g.guard);
  assert.equal(g.phoenixWhy(g.guard.id), '');
  assert.equal(useFeather(g, g.guard.id), true);
  assert.equal(g.guard.morale, 40); assert.ok(g.guardActive());
});

test('merchant: the feather is on the shelf only after the feather quest, 150 at zone 1 and dearer in the other zones, at most 3 in the bag', () => {
  for (const [zone, price] of [['th', 150], ['asia', 185], ['west', 225], ['cyberhell', 255]]) {
    const offer = MERCHANT_STOCK_BY_ZONE[zone].find(s => s.k === 'phoenixFeather');
    assert.equal(offer.cost, price, zone); assert.equal(offer.cap, 3); assert.equal(offer.needs, 'sqMerchantFeather');
  }
  const g = game(); g.coin = 5000;
  g.merchantJourney = { asia: { arrived: true, elapsed: 90000 } };
  assert.equal(g.buyMerchant('phoenixFeather'), false, 'before the quest: not for sale');
  g.sideQuests.sqMerchantFeather = { step: 5, done: true };
  const coin = g.coin;
  assert.equal(g.buyMerchant('phoenixFeather'), true);
  assert.equal(g.coin, coin - 150); assert.equal(g.inventory.phoenixFeather, 1);
  g.buyMerchant('phoenixFeather'); g.buyMerchant('phoenixFeather');
  assert.equal(g.inventory.phoenixFeather, 3);
  const after = g.coin;
  assert.equal(g.buyMerchant('phoenixFeather'), false, 'not more than 3');
  assert.equal(g.coin, after); assert.equal(g.inventory.phoenixFeather, 3);
});

test('old saves: nothing new to load (the bag key is only there once the player owns one)', () => {
  const g = game(); const snap = JSON.parse(JSON.stringify(g.snapshot()));
  assert.ok(!('phoenixFeather' in (snap.inventory || {})));
  const h = game(); assert.equal(h.restore(snap), true);
  h.inventory.phoenixFeather = 2;
  const again = JSON.parse(JSON.stringify(h.snapshot())), k = game();
  assert.equal(k.restore(again), true); assert.equal(k.inventory.phoenixFeather, 2, 'the bag keeps it across a save');
});
