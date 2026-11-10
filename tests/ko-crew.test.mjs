// KO-CREW (owner 6 Nov): a teammate whose morale is gone stays in the scene lying down; the tea-house rest starts when the battle is over.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { STATIONS } from '../src/data.js';
import { actorFromLegacy, syncRoster } from '../src/roster.js';
import { RECOVERY_MS, actorStanding } from '../src/actor-recovery.js';

function game(kinds = ['taan', 'plerng'], guard = false) {
  const g = createGame(); g.zone = 'th'; g.save = () => true;
  g.crew = kinds.map(k => actorFromLegacy({ k, morale: 100 }, 'th'));
  g.guard = guard ? actorFromLegacy({ morale: 100 }, 'th', 'guard') : null;
  g.roster = {}; syncRoster(g); g.party.members = kinds;
  g.stations = STATIONS.map(def => ({ def, build: 0, slots: [] }));
  return g;
}
function fight(g) {
  g.startBattle({ id: 200, who: 'คู่ซ้อม', deserved: 4, resist: true });
  for (const f of g.battle.foes) { f.hp = f.maxHp = 10000; f.atk = [0, 0]; }
  g.mp = g.mpMax = 1000; g.beginBattleTurns(); return g.battle;
}
const knock = (g, a) => { a.morale = 0; return g.downActor(a); };

test('KO-CREW: a teammate who falls in battle stays in the scene (lying), out of turns / targets, with no rest and no recovery clock yet', () => {
  const g = game(); const b = fight(g); const [taan, plerng] = g.crew;
  assert.ok(g.battleActors().some(a => a.id === taan.id));
  assert.equal(knock(g, taan), true);
  assert.deepEqual(b.fallen, [taan.id]); assert.ok(b.absentActors.includes(taan.id));
  assert.equal(taan.recoverUntil, 0, 'no recovery clock during the battle'); assert.ok(!taan.teaRest, 'not at the tea house yet');
  assert.deepEqual(g.battleFallen().map(a => a.id), [taan.id], 'still drawn');
  assert.ok(!g.battleActors().some(a => a.id === taan.id), 'no turn, not a target');
  assert.ok(g.battleTimeline().length > 0 && !g.battleTimeline().some(x => x.id === taan.id), 'not in the turn order');
  for (let i = 0; i < 200; i++) assert.notEqual(g.enemyTarget().id, taan.id, 'enemies never pick the fallen');
  assert.equal(knock(g, taan), false, 'a second call is a no-op (no duplicate)');
  g.updateActorRecovery(Date.now() + 5000); assert.equal(b.fallen.length, 1); assert.equal(taan.recoverUntil, 0, 'ticks during the battle start nothing'); assert.ok(!taan.teaRest);
  assert.ok(actorStanding(plerng), 'the others fight on');
});

test('KO-CREW: when the battle is over (win, lose or flee) the fallen go to the tea house with the same RECOVERY_MS; the rest starts then, not at the fall', () => {
  for (const result of ['win', 'lose', 'flee']) {
    const g = game(); const b = fight(g); const taan = g.crew[0];
    knock(g, taan); const fellAt = Date.now();
    b.over = result; g.updateActorRecovery(Date.now() + 1000);
    assert.equal(taan.recoverUntil, 0, result + ': the result screen is still open - still lying in the scene');
    const before = Date.now(); g.endBattle(); const after = Date.now();
    assert.ok(taan.recoverUntil >= before + RECOVERY_MS && taan.recoverUntil <= after + RECOVERY_MS + 50, result + ': recovery clock = battle end + RECOVERY_MS (' + RECOVERY_MS + ')');
    assert.ok(taan.teaRest?.recovery, result + ': at the tea house'); assert.equal(taan.recoveryVersion, 2);
    assert.ok(!actorStanding(taan));
    g.updateActorRecovery(taan.recoverUntil + 1); assert.equal(taan.morale, 50, 'back after the rest, like before'); assert.ok(!taan.teaRest);
  }
});

test('KO-CREW: the Guard is a teammate like the rest: lies down at 0 HP, rests at the tea house when the battle is over, then returns to his post; a non-participant rests at once', () => {
  const g = game(['taan'], true); const b = fight(g); const guard = g.guard;
  assert.equal(knock(g, guard), true);
  assert.equal(guard.morale, 0); assert.deepEqual(g.battleFallen().map(a => a.id), [guard.id]); assert.ok(!g.guardActive()); assert.equal(guard.recoverUntil, 0, 'no clock while the battle is open');
  g.endBattle(); assert.ok(guard.recoverUntil > Date.now() + RECOVERY_MS - 2000 && guard.teaRest?.recovery, 'Guard: same tea-house rest, same RECOVERY_MS'); assert.ok(!g.guardActive(), 'off the gate while he rests');
  g.updateActorRecovery(guard.recoverUntil + 1); assert.equal(guard.morale, 50); assert.ok(g.guardActive(), 'back on duty'); assert.ok(!guard.teaRest);
  const h = game(['taan', 'plerng']); h.party.members = ['taan']; fight(h); const out = h.crew[1];
  assert.equal(knock(h, out), true); assert.ok(out.recoverUntil > 0 && out.teaRest, 'not on the field: rests at once as before'); assert.ok(!h.battle.fallen?.length);
});

test('KO-CREW: save / load with a fallen teammate neither breaks nor duplicates, and a revived one returns to the fight', () => {
  const g = game(); const b = fight(g); const taan = g.crew[0]; knock(g, taan);
  const snap = JSON.parse(JSON.stringify(g.snapshot()));          // normal battles are not saved: the fallen has morale 0 and no clock -> one rest after the load
  const h = createGame(); h.save = () => true; h.restore(snap); const t2 = h.crew.find(c => c.k === 'taan');
  h.updateActorRecovery(); h.updateActorRecovery(); assert.ok(t2.teaRest?.recovery || t2.recoverUntil > 0 || t2.morale > 0); const until = t2.recoverUntil;
  h.updateActorRecovery(Date.now() + 10); assert.equal(t2.recoverUntil, until, 'not restarted');
  taan.morale = 40; g.updateActorRecovery();
  assert.ok(!b.fallen.includes(taan.id) && !b.absentActors.includes(taan.id)); assert.ok(g.battleActors().some(a => a.id === taan.id), 'revived: in the fight again');
});

test('KO-CREW: the scene draws the fallen lying in their old slot, greyed card, unclickable; tilt (or the `:ko` sprite) comes from battle-ko', () => {
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8'), css = readFileSync(new URL('../src/battle-turns.css', import.meta.url), 'utf8');
  assert.match(ui, /g\.battleFallen\(\)\) if \(!squadMembers\.some/); assert.match(ui, /b\.squadOrder/); assert.match(ui, /is-fallen/); assert.match(ui, /\.\.\.g\.battleActors\(\), \.\.\.g\.battleFallen\(\)/);
  assert.match(css, /\.battle-squad \.is-fallen[^{]*\{pointer-events:none/); assert.match(css, /\.battle-portrait\.is-fallen\{opacity:\.55/);
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8'), map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  for (const k of Object.keys(map).filter(k => /\.\/src\/(game|ui)\.js/.test(k))) assert.match(map[k], /\?v=(20261106-kocrew(-guard)?-home-slots|20261110-perf)$/, k);
  assert.match(html, /src\/ui\.js\?v=(20261106-kocrew-home-slots|20261110-perf)/); assert.match(html, /battle-turns\.css\?v=20261106-kocrew-home-slots/);
});
