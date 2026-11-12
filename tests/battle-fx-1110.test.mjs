// BATTLE-FX (10 Nov): stronger enemy hits by rank · the zone boss's cutscene move every 2nd attack · border fights with 1-3 demons.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { ZONES, BOSS_ULTIMATE, BOSS_ULTIMATE_RHYTHM, bossUltimate, bossUltimateDue } from '../src/data.js';
import { FRONTIER_FOE_COUNT, rollFrontierFoeCount, FRONTIER_REWARD_SCALE, frontierSplit, legacyFrontierFoes, ENCOUNTER_BALANCE, BATTLE_FX_BOSS } from '../src/encounter-balance.js';
import { FOE_RANKS, FOE_RANK_FX, ZONE_HIT_HUE, foeRank, RECIPE_IDS } from '../src/battle-fx-map.js';
import { TEX } from '../src/battle-fx-tex.js';
import { createBattleCamera } from '../src/battle-camera.js';
import { maxOnScreen } from '../src/frontier.js';
import { combatTimeline } from '../src/battle-turns.js';

const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const game = () => { const g = createGame(); g.save = () => true; g.onChange = () => {}; (g.zoneEvents.th ||= {}).frontierBreach = 'cleared'; g.coin = 10000; return g; };
const seeded = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

// ---------------------------------------------------------------- 1. enemy hit effects by rank
test('hit weight grows normal < lord < boss in every knob, and the colours exist as art keys', () => {
  assert.deepEqual([...FOE_RANKS], ['normal', 'lord', 'boss']);
  for (const knob of ['shake', 'hitStop', 'num', 'rings', 'sparks', 'rocks', 'flash', 'recoil'])
    assert.ok(FOE_RANK_FX.normal[knob] < FOE_RANK_FX.lord[knob] && FOE_RANK_FX.lord[knob] < FOE_RANK_FX.boss[knob], knob);
  for (const r of FOE_RANKS) assert.ok(FOE_RANK_FX[r].hitStop >= 60 && FOE_RANK_FX[r].hitStop <= 90, `${r} hit-stop 60-90 ms`);
  for (const z of ['th', 'asia', 'west', 'cyberhell']) {
    const h = ZONE_HIT_HUE[z]; assert.ok(h, z);
    assert.ok(TEX[`fx-common-ring-${h.ring}`], `ring ${h.ring}`); assert.ok(TEX[`fx-common-sparks-${h.spark}`], `sparks ${h.spark}`);
  }
  assert.ok(RECIPE_IDS.includes('foe_claw_l') && RECIPE_IDS.includes('foe_ult'));
});

test('foeRank: ordinary demon / border lord / zone boss', () => {
  const b = { kind: 'frontier', foes: [{ id: 'a', sp: 7 }, { id: 'b', boss: true, sp: 'boss-frontier-th' }] };
  assert.equal(foeRank(b, 'a'), 'normal');
  assert.equal(foeRank(b, 'b'), 'lord');
  assert.equal(foeRank({ kind: 'zoneBoss', foes: [{ id: 'z', boss: true, sp: 'zone-boss' }] }, 'z'), 'boss');
  assert.equal(foeRank({ kind: 'zoneEvent', encounter: 'boss', foes: [{ id: 'z', boss: true, sp: 'leader-x' }] }, 'z'), 'boss');
  assert.equal(foeRank({ kind: 'zoneEvent', foes: [{ id: 'z', boss: true, sp: 'zone-boss' }] }, 'z'), 'boss');
  assert.equal(foeRank(b, 'a', true), 'lord', 'an ordinary demon that fires a cutscene move still hits like a lord');
  assert.equal(foeRank(b, 'missing'), 'normal');
});

test('camera: rank hit-stop / shake boost play only when camera effects are on and the OS has no reduced-motion preference', async () => {
  const run = async ({ reduced = false, off = false, hitStop = 90, boost = 3 }) => {
    const cls = new Set(); const mk = () => ({ style: { setProperty() {} }, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, dataset: {}, parentNode: null });
    const classList = { add: c => cls.add(c), remove: c => cls.delete(c), toggle: (c, on) => (on ?? !cls.has(c)) ? cls.add(c) : cls.delete(c), contains: c => cls.has(c) };
    const world = { ...mk(), classList, isConnected: true, style: {}, contains: () => true, querySelector: () => null, querySelectorAll: () => [], appendChild() {}, insertBefore() {}, removeChild() {} };
    const stage = { isConnected: true, clientWidth: 1000, clientHeight: 500, clientLeft: 0, clientTop: 0, getBoundingClientRect: () => ({ left: 0, top: 0, right: 1000, bottom: 500, width: 1000, height: 500 }), classList: { ...classList }, querySelector: () => world };
    globalThis.matchMedia = () => ({ matches: reduced }); globalThis.localStorage = { getItem: () => off ? '0' : null, setItem() {} };
    globalThis.document = { createElement: () => mk() }; globalThis.CSS = { escape: s => s };
    const cam = createBattleCamera(); cam.timeScale = 10; cam.attach(stage);
    let frozen = false, maxShift = 0;
    const done = cam.cue('foe-attack', { user: 'foe:f1', targets: ['you'], action: 'foe', power: 1, hitStop, shakeBoost: boost }).done;
    const t0 = Date.now();
    while (Date.now() - t0 < 500) { frozen ||= cls.has('cam-frozen'); const a = cam.applied(); maxShift = Math.max(maxShift, Math.abs(a.tx), Math.abs(a.ty)); await new Promise(r => setTimeout(r, 4)); }
    await done; const motion = cam.motion; cam.detach();
    return { frozen, maxShift, motion };
  };
  const on = await run({}), plain = await run({ hitStop: 0, boost: 0 });
  assert.equal(on.motion, true); assert.ok(on.frozen, 'the scene freezes for the hit-stop');
  assert.ok(on.maxShift > plain.maxShift, `boosted shake ${on.maxShift} > plain ${plain.maxShift}`);
  const reduced = await run({ reduced: true }), off = await run({ off: true });
  for (const r of [reduced, off]) { assert.equal(r.motion, false); assert.equal(r.frozen, false, 'no hit-stop'); assert.ok(r.maxShift < 0.01, 'no shake'); }
});

test('the UI wires rank into the camera cue, the canvas recipe and the struck figure; recoil follows the camera-effects gate', () => {
  const ui = read('src/ui.js'), fx = read('src/battle-fx.js');
  assert.match(ui, /hitStop:FOE_RANK_FX\[foeRank\(b, attacker, !!b\.ultimate\)\]\.hitStop/);
  assert.match(ui, /opts:\{ rank, zone:b\.zone \|\| g\.zone \}/);
  assert.match(ui, /const recoilStruck = [\s\S]{0,200}if \(!camera\.motion\) return;/);
  assert.match(fx, /FOE_RANK_FX\[X\.opts\.rank\]/); assert.match(fx, /ZONE_HIT_HUE\[X\.opts\.zone\]/);
  assert.match(fx, /numScale/);
});

// ---------------------------------------------------------------- 2. boss cutscene move
test('boss cutscene move: attack 2, 4, 6 ... (never twice in a row, not tied to HP), softer than the old 1.7x', () => {
  assert.deepEqual(Array.from({ length: 10 }, (_, i) => i + 1).filter(bossUltimateDue), [2, 4, 6, 8, 10]);
  assert.ok(BOSS_ULTIMATE_RHYTHM.first >= 2 && BOSS_ULTIMATE_RHYTHM.first <= 3, 'first within the boss\'s 2nd-3rd turn');
  assert.ok(BOSS_ULTIMATE_RHYTHM.damage < 1.7);
  for (const z of ZONES) assert.equal(bossUltimate({ zone: z.k, bossAct: 2, foeHp: 1000, foeMax: 1000 }, 100).damage, Math.round(100 * BOSS_ULTIMATE_RHYTHM.damage));
});

test('a real zone-boss fight shows the cutscene move on its 2nd and 4th attack, with damage to the whole team', () => {
  for (const zone of ['th', 'asia', 'west']) {
    const g = game(); g.zone = zone; g.hire('boon'); g.party.members = ['taan', 'boon']; g.hireGuard();
    g.startBattle({ id: 99, who: 'boss', deserved: 4 }); const B = g.battle;
    B.kind = 'zoneBoss'; B.zone = zone;
    B.foes = [{ id: 'boss', who: 'บอส', sp: 'zone-boss', boss: true, hp: 99999, maxHp: 99999, atk: [3, 3], stun: 0, confuse: 0 }]; B.selectedFoeId = 'boss';
    B.youHp = B.youMax = 99999; for (const a of g.battleActors()) a.morale = 100;
    const seen = [];
    for (let i = 0; i < 6; i++) { g.battleAct('atk'); seen.push(!!B.ultimate); if (B.ultimate) assert.equal(B.ultimate.by, 'บอส'); if (B.ultimate) assert.equal(B.dmg.enemyHits.length, g.battleActors().length); }
    assert.deepEqual(seen, [false, true, false, true, false, true], zone);
    assert.deepEqual(B.ultimateActs, [2, 4, 6]);
  }
});

test('other story bosses keep the old rule (under half HP, 4 turns apart): border lords, deva tests and possessed rulers do not move', () => {
  const g = game(); g.startBattle({ id: 99, who: 'x', deserved: 4 }); const B = g.battle;
  Object.assign(B, { kind: 'zoneEvent', zone: 'th', eventKey: 'test' });
  Object.assign(B.foes[0], { boss: true, sp: 'zone-boss', maxHp: 1000, hp: 900, atk: [3, 3] }); B.youHp = B.youMax = 99999;
  g.battleAct('atk'); g.battleAct('atk'); assert.equal(B.ultimate, null, 'attack 2 at 90 % HP: no cutscene move');
  B.foes[0].hp = 400; g.battleAct('atk'); assert.ok(B.ultimate, 'under half HP: the old rule fires');
  assert.equal(B.ultimate.damage, Math.round(Math.round(3 * 1) * 1.7) || B.ultimate.damage);
});

test('BATTLE_FX_BOSS rows are applied once on top of BALANCE-2 (bossHp / addsHp / ATK)', () => {
  for (const [key, sizes] of Object.entries(BATTLE_FX_BOSS)) for (const [size, [bossHp, addsHp]] of Object.entries(sizes)) {
    const row = ENCOUNTER_BALANCE[key][size]; assert.equal(row.bossHp, bossHp, `${key}/${size}`); assert.equal(row.addsHp, addsHp);
    assert.ok(bossHp >= 1 && bossHp <= 1.8, 'boss life capped at x1.8'); assert.ok(addsHp >= 0.5 && addsHp <= 1);
  }
});

// ---------------------------------------------------------------- 3. border fights with 1-3 demons
test('border fight demon count: 30 / 45 / 25 %, always 1-3', () => {
  assert.deepEqual(FRONTIER_FOE_COUNT.map(([n]) => n), [1, 2, 3]); assert.ok(Math.abs(FRONTIER_FOE_COUNT.reduce((a, [, p]) => a + p, 0) - 1) < 1e-9);
  const r = seeded(7), n = [0, 0, 0, 0], N = 20000;
  for (let i = 0; i < N; i++) n[rollFrontierFoeCount(r)]++;
  for (const [count, p] of FRONTIER_FOE_COUNT) assert.ok(Math.abs(n[count] / N - p) < 0.02, `${count}: ${n[count] / N}`);
  assert.equal(rollFrontierFoeCount(() => 0), 1); assert.equal(rollFrontierFoeCount(() => 0.999999), 3);
});

test('every zone: a border fight builds 1-3 selectable demons with separate HP cards, turn order and balanced HP/ATK', () => {
  for (const zone of ['th', 'asia', 'west', 'cyberhell']) for (const want of [1, 2, 3]) {
    const g = game(); g.zone = zone; g.setFrontierTeam('taan');
    const real = Math.random, rnd = seeded(zone.length * 31 + want); Math.random = rnd;
    let b = null; try { for (let i = 0; i < 200 && !(b?.frontierCount === want); i++) { g.battle = null; b = g.startFrontierBattle({ kindIdx: 0, level: 1, id: 1 }); } } finally { Math.random = real; }
    assert.equal(b.frontierCount, want, zone); assert.equal(b.foes.length, want);
    assert.equal(new Set(b.foes.map(f => f.id)).size, want, 'unique ids');
    assert.ok(b.foes.every(f => f.hp > 0 && f.hp === f.maxHp && f.atk[0] >= 1 && f.atk[1] >= f.atk[0]));
    assert.ok(b.foes.some(f => f.id === b.selectedFoeId), 'a foe is selected');
    const q = combatTimeline(g); assert.ok(q.filter(u => u.side === 'foe').length >= want, 'every demon is in the "next" timeline');
    // the foes' total HP follows the old table: HP per demon x count stays the same whatever was rolled
    const party = b.balance.partySize, old = legacyFrontierFoes(party), split = frontierSplit(party, want);
    assert.ok(Math.abs(split.hp * want - old) < 1e-9, 'total HP preserved');
  }
});

test('border-fight reward grows with the number of demons (coin and EXP), but less than proportionally', () => {
  assert.deepEqual(FRONTIER_REWARD_SCALE, { 1: 1, 2: 1.25, 3: 1.5 });
  const fight = count => {
    const g = game(); g.setFrontierTeam('taan'); g.exp = 0;
    const real = Math.random; Math.random = seeded(count); let b = null;
    try { for (let i = 0; i < 300 && b?.frontierCount !== count; i++) { g.battle = null; b = g.startFrontierBattle({ kindIdx: 0, level: 2, id: 1 }); } } finally { Math.random = real; }
    b.foes.forEach(f => { f.hp = 1; f.atk = [0, 0]; });
    for (let i = 0; i < 5 && !b.over; i++) { g.selectFoe(b.foes.find(f => f.hp > 0).id); g.battleAct('atk'); }
    assert.equal(b.over, 'win'); return { coin: b.reward.coin, exp: b.summary.exp };
  };
  const one = fight(1), two = fight(2), three = fight(3);
  assert.equal(two.coin, Math.round(one.coin * 1.25)); assert.equal(three.coin, Math.round(one.coin * 1.5));
  assert.ok(one.exp < two.exp && two.exp < three.exp && three.exp < one.exp * 3);
});

test('the border map holds a few more demons (3, then 4 from wave 4)', () => {
  assert.equal(maxOnScreen(1), 3); assert.equal(maxOnScreen(3), 3); assert.equal(maxOnScreen(4), 4); assert.equal(maxOnScreen(9), 4);
});

test('boss story fights are untouched: zone bosses and story events never roll a demon count', () => {
  const g = game(); g.zone = 'asia'; g.zoneCases.asia = 10; g.zoneEvents.asia = Object.fromEntries(['asiaPrisonFire', 'asiaDevaTest', 'asiaRageBreach'].map(k => [k, 'cleared']));
  const b = g.startZoneBoss(); assert.equal(b.frontierCount, undefined); assert.equal(b.foes.length >= 3, true);
});

test('cache-busting: the changed modules moved to a new release string', () => {
  const html = read('index.html');
  // QUEST-REWARDS (10 Nov, later the same day) moved game / ui / battle-fx-map on to 20261110-questrewards (see tests/quest-rewards.test.mjs); the rest stay on this release
  for (const m of ['data', 'sfx', 'frontier', 'battle-fx', 'encounter-balance', 'party-balance'])
    assert.match(html, new RegExp(`"\\./src/${m}\\.js": "\\./src/${m}\\.js\\?v=20261110-battlefx(-w1112)?"`), m);
  for (const m of ['game', 'ui', 'battle-fx-map'])
    assert.match(html, new RegExp(`"\\./src/${m}\\.js": "\\./src/${m}\\.js\\?v=20261110-questrewards(-w1112)?(-cook1)?(-poses)?(-homegate)?"`), m);
  assert.match(html, /src="src\/ui\.js\?v=20261110-questrewards(-w1112)?(-cook1)?(-poses)?(-homegate)?"/);
  assert.match(read('src/ui.js'), /battle-camera\.js\?v=20261110-battlefx/);
});
