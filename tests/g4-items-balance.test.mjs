// G4 — one item name in every zone · Large medkit / Large holy water (zone 2+) · every reaper can rest at the
// tea pavilion · endgame enemy atk · weapon special-effect cooldown
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { BATTLE, ITEMS, LEGACY_ITEM_IDS, MERCHANT_STOCK_BY_ZONE, STATIONS, WEAPON_EFFECT_COOLDOWN, ZONE_EVENTS } from '../src/data.js';
import { merchantStock, medicineResult } from '../src/progression.js';
import { actorStanding } from '../src/actor-recovery.js';
import { meleeSwing, weaponOnHit, weaponCooldownState, weaponEffectLines } from '../src/weapons.js';
import { setLang, t, englishKeys } from '../src/i18n.js';
import { readFileSync } from 'node:fs';

globalThis.Image ??= class {};
globalThis.document ??= { documentElement:{} };
const game = () => { const g = createGame(); g.save = () => true; g.onChange = () => {}; g.coin = 10000; return g; };
const ZONES = ['th', 'asia', 'west', 'cyberhell'];
const FOUR = ['tea', 'food', 'holyWater', 'health'];
function withRandom(values, fn) {
  const real = Math.random; let i = 0;
  Math.random = () => values[i++ % values.length];
  try { return fn(); } finally { Math.random = real; }
}

// ---------------------------------------------------------------- 1. one name in every zone
test('G4 item ids: zone variants are gone; every zone shelf sells the same four ids', () => {
  for (const k of Object.keys(ITEMS)) assert.doesNotMatch(k, /Z[234]$/, k);
  for (const old of Object.keys(LEGACY_ITEM_IDS)) { assert.equal(ITEMS[old], undefined, old); assert.ok(ITEMS[LEGACY_ITEM_IDS[old]]); }
  for (const zone of ZONES) {
    const ids = merchantStock(zone).map(s => s.k);
    for (const k of ['tea', 'health', 'holyWater']) assert.ok(ids.includes(k), `${zone} sells ${k}`);
    for (const s of merchantStock(zone)) assert.ok(ITEMS[s.k], `${zone}:${s.k} exists`);
    assert.ok(!ids.some(k => /Z[234]$/.test(k)), zone);
  }
});

test('G4 names: Thai and English names are identical across zones (4 names), from one source', () => {
  const th = { tea:'น้ำชา', food:'ข้าวปั้น', holyWater:'น้ำมนต์', health:'กล่องยา' };
  const en = { tea:'Tea', food:'Rice Ball', holyWater:'Holy Water', health:'Medkit' };
  for (const lang of ['th', 'en']) {
    setLang(lang);
    for (const k of FOUR) {
      const def = ITEMS[k];
      assert.equal(t(def.nameKey), (lang === 'th' ? th : en)[k], `${lang}:${k}`);
    }
  }
  setLang('th');
  assert.deepEqual([ITEMS.healthLarge.name, ITEMS.holyWaterLarge.name], ['กล่องยาขนาดใหญ่', 'น้ำมนต์ขวดใหญ่']);
  setLang('en');
  assert.deepEqual([t(ITEMS.healthLarge.nameKey), t(ITEMS.holyWaterLarge.nameKey)], ['Large Medkit', 'Large Holy Water']);
  setLang('th');
  for (const zone of ZONES) for (const s of merchantStock(zone)) if (FOUR.includes(s.k)) assert.equal(ITEMS[s.k].nameKey, ITEMS[s.k].nameKey);
});

test('G4 old saves: zone-variant ids merge into the new items, counts add up, nothing lost (inventory, map drops, codex)', () => {
  const g = game(); g.hp = 50;
  const save = JSON.parse(JSON.stringify(g.snapshot()));
  save.inventory = { healthZ2: 2, health: 1, teaZ4: 3, holyWaterZ3: 1, holyWaterZ2: 2, lotus: 1 };
  save.items = [{ k:'healthZ4', x:100, y:100 }];
  save.discoverySeen = { 'item:healthZ2': true, 'item:lotus': true };
  save.discoveryQueue = ['item:teaZ3', 'item:tea'];
  const h = game(); assert.equal(h.restore(save), true);
  // the legacy map drop (healthZ4) becomes a normal 'health' drop (the game may pick it up on load)
  assert.equal((h.inventory.health || 0) + h.items.filter(it => it.k === 'health').length, 4);
  assert.deepEqual({ ...h.inventory, health:undefined }, { health:undefined, tea:3, holyWater:3, lotus:1 });
  assert.ok(![...Object.keys(h.inventory), ...h.items.map(it => it.k)].some(k => /Z[234]$/.test(k)));
  assert.equal(h.discoverySeen['item:health'], true);
  assert.equal(h.discoverySeen['item:healthZ2'], undefined);
  assert.ok(h.discoveryQueue.includes('item:tea')); assert.ok(!h.discoveryQueue.some(id => /Z[234]$/.test(id)));
  assert.equal(h.discoveryQueue.filter(id => id === 'item:tea').length, 1, 'no duplicate');
  // and they can actually be used
  const had = h.inventory.health; h.hp = 10; assert.equal(h.useBag('health'), true); assert.equal(h.inventory.health, had - 1);
});

// ---------------------------------------------------------------- 2. Large items
test('G4 Large items: restore 100%, zone 2+ shelf only, ~1.8x price', () => {
  assert.equal(ITEMS.healthLarge.hpRatio, 1); assert.equal(ITEMS.holyWaterLarge.mpRatio, 1);
  assert.deepEqual(medicineResult('healthLarge', 3, 137, 0, 0, 'battle'), { hp:137, mp:0, hpGain:134, mpGain:0 });
  assert.deepEqual(medicineResult('holyWaterLarge', 137, 137, 5, 72, 'bag'), { hp:137, mp:72, hpGain:0, mpGain:67 });
  assert.ok(!merchantStock('th').some(s => /Large$/.test(s.k)), 'Thai zone has no Large items');
  const ratios = [];
  for (const zone of ['asia', 'west', 'cyberhell']) {
    const stock = merchantStock(zone), cost = k => stock.find(s => s.k === k)?.cost;
    assert.ok(cost('healthLarge') && cost('holyWaterLarge'), zone);
    for (const [big, small] of [['healthLarge', 'health'], ['holyWaterLarge', 'holyWater']]) {
      const r = cost(big) / cost(small); ratios.push(r);
      assert.ok(r >= 1.7 && r <= 1.9, `${zone}:${big} ratio ${r}`);
      assert.equal(cost(big) % 5, 0, 'rounded to 5');
    }
  }
  assert.ok(ratios.length === 6);
  assert.equal(MERCHANT_STOCK_BY_ZONE.th.length, 5);
});

test('G4 Large items: buy in zone 2+, refused in the Thai zone, usable by Yama / reaper / Guard / in battle', () => {
  const th = game(); th.zone = 'th';
  assert.equal(th.buyMerchant('healthLarge'), false); assert.equal(th.buyMerchant('holyWaterLarge'), false);
  const g = game(); g.zone = 'asia';
  g.zoneCaptivesFree = () => true;
  const price = merchantStock('asia').find(s => s.k === 'healthLarge').cost, coin = g.coin;
  assert.equal(g.buyMerchant('healthLarge'), true); assert.equal(g.coin, coin - price);
  assert.equal(g.buyMerchant('holyWaterLarge'), true);
  assert.equal(g.inventory.healthLarge, 1); assert.equal(g.inventory.holyWaterLarge, 1);
  g.hp = 5; g.mp = 0;
  assert.equal(g.useBag('healthLarge'), true); assert.equal(g.hp, g.hpMax);
  assert.equal(g.useBag('holyWaterLarge'), true); assert.equal(g.mp, g.mpMax);
  // reaper and Guard drink the Large medkit but not Large holy water
  g.hire('taan'); g.hireGuard();
  for (const c of [g.crewOf('taan'), g.guard]) {
    c.morale = 5; g.inventory.healthLarge = 1; g.inventory.holyWaterLarge = 1;
    assert.equal(g.useBag('holyWaterLarge', c.id), false);
    assert.equal(g.useBag('healthLarge', c.id), true); assert.equal(c.morale, 100);
    assert.equal(g.inventory.healthLarge, undefined);
  }
  // in battle
  g.party.members = ['taan']; g.startBattle({ id:99, who:'t', deserved:4, resist:true });
  g.battle.foes.forEach(f => { f.hp = f.maxHp = 10000; f.atk = [0, 0]; });
  const taan = g.crewOf('taan'); taan.morale = 10; g.inventory.healthLarge = 2;
  assert.equal(g.confirmBattleCommand('healthLarge', taan.id), true); assert.equal(taan.morale, 100);
  g.finishBattleCommand();
  g.battle.youHp = 1; g.mp = 0; g.inventory.holyWaterLarge = 1;
  assert.equal(g.confirmBattleCommand('healthLarge', 'you'), true); assert.equal(g.battle.youHp, g.battle.youMax);
  g.finishBattleCommand();
  assert.equal(g.confirmBattleCommand('holyWaterLarge', 'you'), true); assert.equal(g.mp, g.mpMax);
});

// ---------------------------------------------------------------- 3. every reaper can rest
const tea = g => g.stations.push({ def:STATIONS.find(s => s.k === 'tea'), build:0, slots:[], fire:0 });
test('G4 tea rest for a regular reaper: needs pavilion + HP < 50 + standing; travel, 60 s rest, save/load, full HP, back to post', () => {
  const g = game(); g.hire('taan'); g.hire('dam');
  const taan = g.crewOf('taan'); taan.morale = 30;
  assert.equal(g.restActor(taan.id), false, 'no pavilion');
  tea(g);
  taan.morale = 50; assert.equal(g.restActor(taan.id), false, 'HP not low');
  taan.morale = 30;
  assert.equal(g.restActor(g.crewOf('nira').id), false, 'Nira is a reader, not a worker');
  assert.equal(g.restActor('nope'), false);
  taan.x = taan.hx; taan.y = taan.hy;   // as stepWorld places a reaper on the map
  const original = [taan.x, taan.y], now = Date.now();
  // working at a station: resting releases the job
  taan.at = 'dab';
  assert.ok(g.restActor(taan.id, now)); assert.equal(taan.teaRest.phase, 'travel');
  assert.equal(taan.at, null, 'released from work'); assert.equal(actorStanding(taan), false);
  assert.equal(g.restActor(taan.id), false, 'cannot start twice');
  assert.equal(g.freeCrew().some(c => c.k === 'taan'), false);
  g.updateActorRecovery(now + 1000);
  // survives a real save/load
  const clone = game(); assert.ok(clone.restore(JSON.parse(JSON.stringify(g.snapshot()))));
  const t2 = clone.crewOf('taan'); assert.deepEqual(t2.teaRest, taan.teaRest);
  clone.updateActorRecovery(now + 60000);
  assert.equal(t2.teaRest.phase, 'rest');
  const started = t2.teaRest.startedAt; assert.equal(t2.teaRest.until - started, 60000);
  clone.updateActorRecovery(started + 59999); assert.equal(t2.morale, 30); assert.equal(actorStanding(t2), false);
  clone.updateActorRecovery(started + 60000);
  assert.equal(t2.morale, 100); assert.equal(t2.teaRest, null); assert.ok(actorStanding(t2));
  assert.deepEqual([t2.x, t2.y], original);
  // a reaper that was never placed on the map yet starts from the post
  const dam = clone.crewOf('dam'); dam.morale = 10; dam.x = dam.y = null;
  assert.ok(clone.restActor(dam.id)); assert.deepEqual(dam.teaRest.returnAt, [dam.hx, dam.hy]); dam.teaRest = null; dam.morale = 10;
  // cannot rest in battle
  clone.party.members = ['dam']; clone.startBattle({ id:5, who:'x', deserved:4, resist:true });
  assert.equal(clone.restActor(dam.id), false, 'not during battle');
});

test('G4 tea rest: Guard keeps working through the same method (restGuard alias) and the dialog lists regular reapers too', () => {
  const g = game(); g.hireGuard(); tea(g); g.guard.morale = 20;
  assert.ok(g.restGuard()); assert.equal(g.guard.teaRest.phase, 'travel');
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  assert.match(ui, /hungerWidget\(c\) \+ guardRestWidget\(c\)/, 'rest widget on every reaper card');
  assert.match(ui, /dlg\.querySelectorAll\('\[data-guard-status\]'\)/, 'live refresh for all cards');
  const scene = readFileSync(new URL('../src/scene.js', import.meta.url), 'utf8');
  assert.match(scene, /c\.teaRest\?\.phase !== 'travel'/, 'walking reaper is drawn on the map');
});

// ---------------------------------------------------------------- 4. endgame enemy attack
test('G4 enemy atk: cyber breach and the final-line waves hit harder than before G4', () => {
  const OLD_BREACH = [[10, 16], [11, 17], [12, 18], [15, 23]];
  const breach = ZONE_EVENTS.cyberhell.find(e => e.k === 'cyberBreach').waves.map(w => w[0].atk);
  breach.forEach((atk, i) => { assert.ok(atk[0] >= OLD_BREACH[i][0] * 1.4 && atk[1] >= OLD_BREACH[i][1] * 1.4, `breach wave ${i + 1}`); });
  const OLD_FINAL = [[10, 16], [11, 17], [12, 18], [13, 19], [13, 20], [14, 21], [15, 22], [16, 23], [17, 25]];
  const fin = ZONE_EVENTS.cyberhell.find(e => e.k === 'cyberFinal').waves.map(w => w[0].atk);
  fin.forEach((atk, i) => { assert.ok(atk[0] > OLD_FINAL[i][0] && atk[1] > OLD_FINAL[i][1], `final wave ${i + 1}`); });
  // other zones' breach fights untouched
  const atks = (zone, key) => ZONE_EVENTS[zone].find(e => e.k === key).waves.map(w => w[0].atk);
  assert.deepEqual(atks('th', 'frontierBreach'), [[6, 13], [6, 13]]);
  assert.deepEqual(atks('asia', 'asiaRageBreach'), [[8, 13], [9, 14], [12, 19]]);
  assert.deepEqual(atks('west', 'westVampireBreach'), [[9, 14], [10, 15], [10, 15], [13, 20]]);
});

// ---------------------------------------------------------------- 5. weapon cooldown
function caneBattle() {
  const g = createGame(); g.zone = 'th'; g.save = () => true; g.onChange = () => {};
  g.weapons.owned.cane = true; g.weapons.equipped = 'cane';
  g.zoneEvents.th = { prisonBreak:'pending' };
  const b = g.startPrisonBreak(); b.foes.forEach(f => { f.hp = f.maxHp = 99999; f.atk = [0, 0]; });
  return { g, b };
}
const swingBase = () => { const g = createGame(); g.zone = 'th'; return g.normalAttack(BATTLE.atk[0] + Math.floor(0.5 * (BATTLE.atk[1] - BATTLE.atk[0] + 1))); };

test('G4 weapon cooldown: drain triggers, then rests 3 turns, strike bonus never stops; new battle starts ready', () => {
  assert.equal(WEAPON_EFFECT_COOLDOWN, 3);
  const { g, b } = caneBattle(); b.youHp = 40;
  const log = [];
  for (let i = 0; i < 9; i++) {
    const before = b.youHp;
    withRandom([0.5, 0.9, 0.9], () => g.battleAct('atk')); g.finishBattleCommand();
    log.push({ gain:b.youHp - before, cd:b.weaponCd, dmg:b.dmg.foe });
  }
  // turns 1,5,9 drain; turns in between rest (cd shows 3 right after the trigger, then 2,1,0)
  assert.deepEqual(log.map(x => x.gain > 0), [true, false, false, false, true, false, false, false, true]);
  assert.deepEqual(log.map(x => x.cd), [3, 2, 1, 0, 3, 2, 1, 0, 3]);
  assert.ok(log.every(x => x.dmg === Math.round(swingBase() * 1.20)), 'plain +20% strike bonus always applies');
  assert.equal(weaponCooldownState(b, 'cane').cd, 3);
  assert.equal(weaponCooldownState(b, null), null);
  // a fresh battle is ready, nothing was saved
  const h = caneBattle(); assert.equal(h.b.weaponCd, undefined); assert.equal(weaponCooldownState(h.b, 'cane').cd, 0);
  assert.equal('weaponCd' in JSON.parse(JSON.stringify(g.snapshot())), false);
});

test('G4 weapon cooldown: nothing happens (and nothing is rolled) while resting, for burn / crit / replay', () => {
  // pure functions
  assert.deepEqual(weaponOnHit('fang', { dealt:50, targetMax:100, youHp:1, youMax:100 }, () => 0, false), { burn:null, heal:0, replay:0 });
  assert.ok(weaponOnHit('fang', { dealt:50, targetMax:100, youHp:1, youMax:100 }, () => 0, true).burn);
  assert.ok(weaponOnHit('trojan', { dealt:50, targetMax:100, youHp:1, youMax:100 }, () => 0, true).replay);
  assert.equal(weaponOnHit('trojan', { dealt:50, targetMax:100, youHp:1, youMax:100 }, () => 0, false).replay, 0);
  assert.equal(weaponOnHit('cane', { dealt:50, targetMax:100, youHp:1, youMax:100 }, () => 0, false).heal, 0);
  assert.ok(weaponOnHit('cane', { dealt:50, targetMax:100, youHp:1, youMax:100 }, () => 0, true).heal > 0);
  const ready = meleeSwing(20, 28, 0.2, 'chain', true), resting = meleeSwing(20, 28, 0.2, 'chain', false);
  assert.equal(ready.crit, true); assert.equal(ready.proc, true);          // 0.2 is in the weapon-only crit band (.18-.25)
  assert.equal(resting.crit, false); assert.equal(resting.proc, false);
  assert.equal(resting.dmg, Math.round(20 * 1.25), 'strike bonus remains while the crit bonus rests');
  assert.equal(meleeSwing(20, 28, 0.1, 'chain', true).proc, false, 'a natural crit is not a weapon proc');
  // in a real battle: fang ignites once, no second ignite until the cooldown is over
  const g = createGame(); g.zone = 'th'; g.save = () => true; g.onChange = () => {};
  g.weapons.owned.fang = true; g.weapons.equipped = 'fang'; g.zoneEvents.th = { prisonBreak:'pending' };
  const b = g.startPrisonBreak(); b.foes.forEach(f => { f.hp = f.maxHp = 99999; f.atk = [0, 0]; });
  const ignites = [];
  for (let i = 0; i < 5; i++) {
    withRandom([0.5, 0.9, 0.05], () => g.battleAct('atk')); g.finishBattleCommand();
    ignites.push(b.weaponNote?.k === 'ignite');
  }
  assert.deepEqual(ignites, [true, false, false, false, true]);
});

test('G4 weapon cooldown is shown on screen: HUD badge + attack button, TH and EN text, effect line mentions it', () => {
  for (const lang of ['th', 'en']) {
    setLang(lang);
    for (const key of ['battle.weapon.cooling', 'battle.weapon.ready', 'weapon.effect.cooldown']) assert.notEqual(t(key), key, `${lang}:${key}`);
    assert.ok(t('battle.weapon.cooling', { name:'X', n:2 }).includes('2'));
    assert.ok(weaponEffectLines('cane').at(-1).includes('3'), lang);
  }
  setLang('th');
  const en = new Set(englishKeys());
  for (const key of ['battle.weapon.cooling', 'battle.weapon.ready', 'weapon.effect.cooldown', 'g1.healthLarge.name', 'g1.holyWaterLarge.name', 'g1.healthLarge.desc', 'g1.holyWaterLarge.desc']) assert.ok(en.has(key), key);
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  assert.match(ui, /weapon-cd\$\{weaponCd\.cd \? ' cooling' : ''\}/);
  assert.match(ui, /class="wcd-ico"><img src="img\/fx-slash\.png" alt=""><em>\$\{weaponCd\.cd\}<\/em>/);
});
