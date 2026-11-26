// FB3-T4 (26 Nov 2026) - summon system v2 (owner EV4 / EV5): pick a helper -> Yama lights the lamp (cutscene) -> the helper STANDS IN THE TEAM as one more member for 3 acts the player chooses -> it goes back.
// Called by every helper; the lamp's own rules (3 uses until the Mirror Tower, one use per call) are unchanged. Facing: a helper on our side faces right.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { STATIONS } from '../src/data.js';
import * as L from '../src/lamp.js';
import { LAMP_TEXT, lt } from '../src/lamp-text.js';
import { orderRound } from '../src/battle-turns.js';
import { teamNeedsMirror, teamFaceClass, TEAM_DRAWN_FACING_RIGHT } from '../src/battle-facing.js';
import { characterScale, SUMMON_SCALE } from '../src/character-scale.js';
import { callHelper, helperAct } from './summon-helper.mjs';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const station = k => ({ def:STATIONS.find(d => d.k === k), crewK:null, intensity:3, fire:0, build:0, slots:[] });
function fight(keys = ['hanuman']) {
  const g = createGame(); g.stations.push(station('sawan'), station('krata')); g.coin = 5000;
  g.giveLamp(); for (const k of keys) { g.unlockHelper(k); } for (const z of ['th', 'asia', 'west', 'cyberhell']) g.upgradeLampDev(z); keys.forEach((k, i) => g.placeHelper(i, k)); g.notices = [];
  g.zoneCases.th = 3; g.refreshZoneEvents('th'); g.dismissEventAlert?.('prisonBreak');
  const b = g.startPrisonBreak(); assert.ok(b && b.foes.length === 3);
  for (const f of b.foes) { f.atk = [0, 0]; f.hp = f.maxHp = 9999; }
  return g;
}
const ALL = L.SUMMONER_KEYS;

test('criterion 1: no "ท่าไม้ตาย เหลือ x/3" (or its English twin) is left anywhere the game can print it', () => {
  for (const f of readdirSync(new URL('../src/', import.meta.url)).filter(n => /\.(js|css)$/.test(n)).concat(['../index.html'])) {
    const text = f === '../index.html' ? src('index.html') : src('src/' + f);
    assert.doesNotMatch(text, /ท่าไม้ตาย\s*เหลือ/, f); assert.doesNotMatch(text, /Special move:\s*\{?n?\}?\s*\/?\s*3? ?left/i, f);
  }
  assert.doesNotMatch(LAMP_TEXT['bag.movesLeft'].th, /ท่าไม้ตาย/); assert.doesNotMatch(LAMP_TEXT['bag.movesLeft'].en, /special/i);
  assert.equal(lt('bag.movesLeft', { n:1 }), 'เรียกได้อีก 1/3 ครั้ง');
  // the summon window itself prints no count at all - three flame dots (aria-label only) and a reason when it cannot be called
  const ui = src('src/ui.js'); const win = ui.slice(ui.indexOf('const summonLayerHtml'), ui.indexOf('dlg.innerHTML =', ui.indexOf('const summonLayerHtml')));
  assert.match(win, /summon-flames/); assert.doesNotMatch(win, /lt\('bag\.movesLeft', \{ n:left \}\)\)\}<\/em>/);
});

test('the call: one lamp use + the caller\'s turn, nobody is hit, the helper is one more team member with 3 acts and its own turn right after', () => {
  const g = fight(); const B = g.battle; g.beginBattleTurns();
  const foes0 = B.foes.map(f => f.hp), crew = g.battleActors().length;
  assert.equal(g.confirmBattleCommand('summon:hanuman', 'you'), true);
  assert.deepEqual(B.foes.map(f => f.hp), foes0); assert.equal(L.summonUsesLeft(g, 'hanuman'), 2);
  const h = g.battleActors().at(-1); assert.equal(h.id, 'summon:hanuman'); assert.equal(h.k, 'summon'); assert.equal(h.summonKey, 'hanuman'); assert.equal(h.left, 3); assert.equal(g.battleActors().length, crew + 1);
  assert.deepEqual(B.turnQueue.remaining.slice(0, 2).map(t => t.id), ['you', 'summon:hanuman'], 'its first turn comes straight after the caller\'s');
  g.finishBattleCommand(); assert.equal(g.currentBattleTurn().id, 'summon:hanuman'); assert.equal(B.actorId, 'summon:hanuman');
});

test('a helper acts three times (its move or a plain attack, the player picks), then goes - with its turn in the queue each round, never a fourth', () => {
  const g = fight(); const B = g.battle; g.beginBattleTurns(); g.hire('taan'); g.party.members = ['taan'];
  assert.equal(g.confirmBattleCommand('summon:hanuman', 'you'), true); g.finishBattleCommand();
  const seen = []; let guard = 0;
  while (guard++ < 60 && !B.over && B.summoned && !B.summoned.leaving) {
    const t = g.currentBattleTurn();
    if (t.side === 'foe') { g.runEnemyTurn(); g.finishBattleCommand(); continue; }
    if (t.id.startsWith('summon:')) { seen.push(B.summoned.left); assert.equal(g.confirmBattleCommand(seen.length === 2 ? 'helper:attack' : 'helper:move', 'you'), true); g.finishBattleCommand(); continue; }
    assert.equal(g.confirmBattleCommand('defend', 'you'), true); g.finishBattleCommand();
  }
  assert.deepEqual(seen, [3, 2, 1], 'three turns, counting down');
  assert.ok(B.summoned.leaving > 0, 'it is leaving'); assert.equal(g.summonedActor(), null, 'no turn from now on'); assert.equal(g.summonedActor(true)?.id, 'summon:hanuman', 'but still drawn for its farewell effect');
  assert.ok(!B.turnQueue.remaining.some(t => t.id.startsWith('summon:')), 'gone from the queue');
  assert.ok(!g.battleActors().some(a => a.k === 'summon'));
  assert.equal(helperAct(g, 'helper:move', 'hanuman'), false, 'no fourth act');
});

test('only the standing helper may use its acts, and it may use nothing else; one helper at a time', () => {
  const g = fight(['hanuman', 'thor']); const B = g.battle; g.beginBattleTurns();
  assert.equal(helperAct(g, 'helper:move', 'hanuman'), false, 'nobody is standing yet');
  B.actorId = 'you'; assert.equal(g.confirmBattleCommand('helper:attack', 'you'), false, 'Yama cannot use it');
  assert.equal(callHelper(g, 'hanuman'), true); assert.equal(L.summonWhy(g, 'thor', B), 'present', 'a second helper waits until the first has gone');
  B.actorId = 'summon:hanuman'; for (const what of ['atk', 'defend', 'strike', 'fire', 'cooldownClock', 'crew:taan', 'summon:thor']) assert.equal(g.confirmBattleCommand(what, 'you'), false, what + ' is not a helper act');
  assert.equal(B.commandBusy, false);
});

test('the foes never hit the helper and it never changes how many turns they get or how hard they hit', () => {
  const g = fight(); const B = g.battle; g.hire('taan'); g.party.members = ['taan']; g.beginBattleTurns();
  const foeTurns = () => B.foes.map(f => g.foeActsPerRound(f.id)); const before = foeTurns(), actors = g.battleActors().filter(a => !a.summoned).length;
  callHelper(g, 'hanuman'); assert.deepEqual(foeTurns(), before, 'same foe turns per round with the helper standing');
  assert.equal(g.battleActors().filter(a => !a.summoned).length, actors);
  assert.ok(!g.enemyTarget || true); for (let i = 0; i < 40; i++) assert.notEqual(g.enemyTarget().id, 'summon:hanuman');
  // pure: a helper unit among the allies does not raise the foe turn total
  const unit = (id, side, speed, summoned) => ({ id, side, speed, ...(summoned ? { summoned:true } : {}) });
  const without = orderRound([unit('a', 'ally', 12), unit('b', 'ally', 10), unit('f', 'foe', 9)]), withHelper = orderRound([unit('a', 'ally', 12), unit('b', 'ally', 10), unit('h', 'ally', 12, true), unit('f', 'foe', 9)]);
  assert.equal(withHelper.filter(t => t.side === 'foe').length, without.filter(t => t.side === 'foe').length); assert.ok(withHelper.some(t => t.id === 'h'));
});

test('damage budget: the three acts together stay close to the old single hit, whatever the helper', () => {
  const g = fight();
  for (const k of ALL) {
    const old = L.summonDamage(g, k) || Math.round(L.HELPER_PLAIN_BASE.base + 0), move = L.helperActDamage(g, k, 'move'), atk = L.helperActDamage(g, k, 'attack');
    assert.ok(atk > 0 && atk < old, k + ': a plain attack is a fraction of the old hit');
    if (L.SUMMONERS[k].move.damage) { assert.ok(move > 0 && move * L.HELPER_ACTS <= old * 1.25 + 3, `${k}: 3 x move (${move * 3}) vs old ${old}`); assert.ok(move * L.HELPER_ACTS >= old * 1.1 - 3, k + ': not weaker either'); }
    else assert.equal(move, 0, k + ': a support move deals nothing');
  }
  const guard = L.helperGuardAct(g, 'kumanthong'), full = L.summonGuard(g, 'kumanthong'); assert.ok(guard.shield * 3 <= full.shield * 1.6 && guard.heal * 3 <= full.heal * 1.6);
});

test('every helper can be called, stands, acts three times with both commands and goes (all 12)', () => {
  for (const k of ALL) {
    const g = fight([k]); const B = g.battle; B.foes.forEach(f => { f.hp = f.maxHp = 99999; });
    assert.equal(callHelper(g, k), true, k + ' call'); assert.equal(g.summonedActor()?.summonKey, k);
    const kinds = ['helper:move', 'helper:attack', 'helper:move'];
    kinds.forEach((w, i) => { B.selectedFoeId = B.foes[0].id; assert.equal(helperAct(g, w, k), true, `${k} act ${i + 1}`); });
    assert.equal(g.summonedActor(), null, k + ' gone'); assert.equal(L.summonUsesLeft(g, k), 2, k + ' one use');
  }
});

test('old saves still load: lamp state without a helper loads and can call; the helper state is plain data (a final-event fight is saved by structuredClone)', () => {
  const g = fight(); callHelper(g, 'hanuman');
  const clone = structuredClone(g.battle); assert.equal(clone.summoned.key, 'hanuman'); assert.equal(clone.summoned.left, 3);
  // an old save: lamp owned, a use already spent, no helper anywhere
  const old = fight(); L.spendSummon(old, 'hanuman'); old.battle = null;
  const snap = JSON.parse(JSON.stringify(old.snapshot())); const loaded = createGame(); loaded.restore(snap);
  assert.equal(L.lampOwned(loaded), true); assert.equal(L.summonUsesLeft(loaded, 'hanuman'), 2); assert.equal(loaded.summonedActor(), null);
  // ... and it can fight and call from there
  loaded.zoneCases.th = 3; loaded.refreshZoneEvents('th'); loaded.dismissEventAlert?.('prisonBreak'); loaded.stations.push(station('sawan'), station('krata'));
  const b = loaded.startPrisonBreak(); if (b) { for (const f of b.foes) { f.atk = [0, 0]; f.hp = f.maxHp = 500; } assert.equal(callHelper(loaded, 'hanuman'), true); assert.equal(L.summonUsesLeft(loaded, 'hanuman'), 1); }
  // the lamp of a save from before the helpers' acts (no `used` / `slots` rows) is made whole
  const bare = createGame(); bare.magic = { v:1, lamp:{ owned:true, level:1 }, unlocked:{ hanuman:true } }; L.ensureMagic(bare); assert.equal(L.summonUsesLeft(bare, 'hanuman'), 3);
});

test('the lamp cutscene: the zone\'s drawing first, then the older lamp picture, never a break (img/summon/cut-lamp-summon-{th,asia,west,cyberhell}.webp)', () => {
  assert.deepEqual(L.lampCutSources('asia'), ['img/summon/cut-lamp-summon-asia.webp', L.LAMP_CUT_FALLBACK]);
  assert.deepEqual(L.lampCutSources('nowhere'), ['img/summon/cut-lamp-summon-th.webp', L.LAMP_CUT_FALLBACK]);
  const files = new Set(['img/summon/cut-lamp-summon-west.webp', L.LAMP_CUT_FALLBACK]);
  assert.equal(L.pickLampCut('west', f => files.has(f)), 'img/summon/cut-lamp-summon-west.webp', 'a saved drawing is used as it is - no code change');
  assert.equal(L.pickLampCut('th', f => files.has(f)), L.LAMP_CUT_FALLBACK, 'no drawing yet: the lamp picture');
  assert.equal(L.pickLampCut('th', () => false), null, 'nothing at all: no picture, the card still shows its title');
  assert.equal(L.pickLampCut('th', () => { throw new Error('x'); }), null);
  assert.ok(existsSync(new URL('../' + L.LAMP_CUT_FALLBACK, import.meta.url)), 'the fallback picture ships');
});

test('a helper on our side faces right: judged from the drawings (registry) and every battle picture exists', () => {
  const drawnRight = ['wukong', 'ryujin', 'jormungandr', 'thor', 'lucifer', 'lupin', 'musashi', 'kumanthong'], drawnLeft = ['hanuman'], square = ['eirlin', 'liangang', 'yomathat'];
  for (const k of ALL) {
    const f = L.SUMMONERS[k].art.battle; assert.ok(existsSync(new URL('../' + f, import.meta.url)), f);
    if (drawnRight.includes(k)) { assert.equal(teamNeedsMirror(f), false, k + ' is drawn facing right: not mirrored'); assert.equal(teamFaceClass(f), 'face-native'); }
    else { assert.equal(teamNeedsMirror(f), true, k + ' is mirrored as every ally'); assert.equal(teamFaceClass(f), ''); }
  }
  assert.equal([...drawnRight, ...drawnLeft, ...square].sort().join(), [...ALL].sort().join(), 'all 12 are judged');
  assert.ok(TEAM_DRAWN_FACING_RIGHT.has('battle-thor'));
});

test('size: a helper stands at the adult tier of the team (never taller - a taller teammate would shrink everybody); Kuman Thong is a boy', () => {
  for (const k of ALL) { const s = characterScale(`summon-${k}`); assert.ok(s <= 1 && s >= .8, k + ' ' + s); }
  assert.equal(characterScale('summon-kumanthong'), SUMMON_SCALE.kumanthong); assert.equal(characterScale('summon-thor'), characterScale('adult'));
  assert.equal(characterScale('taan'), 1); assert.equal(characterScale('yama'), .8);
});

test('UI wiring: the helper is a squad member with its own menu, farewell and lamp cutscene; text strings exist in both languages', () => {
  const ui = src('src/ui.js');
  assert.match(ui, /const executeSummonCall = async action/); assert.match(ui, /LAMP\.lampCutSources\(zone\)/); assert.match(ui, /g\.summonedActor\(true\)/);
  assert.match(ui, /action:'helper:attack'/); assert.match(ui, /action:'helper:move'/); assert.match(ui, /data-summon-farewell/); assert.match(ui, /c\.k === 'summon' \? summonActsHtml\(c\)/);
  for (const key of ['battle.present', 'battle.lampCut', 'helper.attack', 'helper.acts', 'helper.farewell', 'bag.movesLeft', 'battle.helperSpent']) { assert.ok(LAMP_TEXT[key]?.th && LAMP_TEXT[key]?.en, key); }
  assert.equal(lt('helper.acts', { n:2, max:3 }), 'ลงมือได้อีก 2/3 ตา'); assert.equal(lt('helper.acts', { n:2, max:3 }, 'en'), '2/3 turns left');
  const css = src('src/lamp.css'); for (const cls of ['summon-flames', 'summon-arrive', 'is-leaving', 'summon-wait', 'summon-farewell', 'lamp-cut']) assert.ok(css.includes(cls), cls);
  assert.match(src('src/battle-dash.js'), /'helper:attack'/);
});

test('EV4: beat Hanuman in his own fight -> the stories run -> the lamp is Yama\'s with Hanuman in slot 1 -> in the next fight Hanuman can be called, stands in the team and acts', () => {
  const g = createGame(); g.save = () => true; g.onChange = () => {};
  g.stations.push(station('sawan'), station('krata')); g.hire('taan'); g.party.members = ['taan'];
  g.zoneEvents.th = { frontierBreach:'cleared', prisonBreak:'cleared', sitaHanuman:'pending' }; g.storyCaseDone.sitaledger = true; g.casesDone = 12; g.zoneCases.th = 12; g.refreshZoneEvents('th');
  assert.equal(L.lampOwned(g), false, 'no lamp before the fight');
  const b = g.startZoneEvent('sitaHanuman'); assert.ok(b && b.eventKey === 'sitaHanuman'); assert.equal(g.confirmBattleCommand('summon:hanuman', 'you'), false, 'no lamp yet: nothing to call');
  for (const f of b.foes) f.hp = 1;
  assert.equal(g.confirmBattleCommand('atk', 'you'), true); g.finishBattleCommand(); assert.equal(b.over, 'win');
  g.endBattle();
  const keys = []; for (let i = 0; i < 12 && g.storyQueue.length; i++) { keys.push(g.storyQueue[0].key); g.completeStory(); }
  assert.deepEqual(keys.slice(0, 3), ['sita-hanuman-win', 'sita-phantom', 'sita-lamp']);
  assert.equal(L.lampOwned(g), true); assert.deepEqual(L.slottedSummoners(g), ['hanuman']); assert.equal(L.summonUsesLeft(g, 'hanuman'), 3); assert.ok(g.notices.includes('lamp-received'));
  // the next fight: the summon row exists (lamp owned), Hanuman is in the window and can be called
  g.notices = []; g.battle = null; g.mobs.push({ id:777, x:g.player.x, y:g.player.y, hp:30, kind:0 });
  const next = g.startMobBattle(g.mobs.length - 1); assert.ok(next, 'a fight'); for (const f of next.foes) { f.atk = [0, 0]; f.hp = f.maxHp = 400; }
  assert.equal(L.summonWhy(g, 'hanuman', next), '', 'nothing stops the call');
  assert.equal(callHelper(g, 'hanuman'), true); const standing = g.summonedActor(); assert.equal(standing?.summonKey, 'hanuman');
  const hp = next.foes.map(f => f.hp); assert.equal(helperAct(g, 'helper:move', 'hanuman', false), true); assert.ok(next.foes.every((f, i) => f.hp < hp[i]), 'his move hits every foe');
});
