// FB3 EV14 / BT8b (owner, 26 Nov 2026) - "ประสานพิพากษา" (teamJudgment)
// e8: the reward window ("รับรางวัล") was on screen while the combo was still playing and the enemy still had HP bars left.
// The game settles the whole combo in one step (b.over = 'win' at once); the UI then replays it hit by hit from skillView. The result row
// must wait for the replay (skillView) to end. BT8b: no closing slash cutscene (the second card) before Yama's own dash.
import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');

test('EV14: the result / reward row is not drawn while a skill replay (skillView) is still playing', () => {
  const m = ui.match(/const done = (b\.over[^\n]*)/);
  assert.ok(m, 'done row found');
  assert.match(m[1], /!skillView/, 'the reward button must wait for the combo replay');
  assert.match(m[1], /b\.over/);
});
test('EV14: the replay always ends - skillView is cleared on every exit of executeSkill', () => {
  const body = ui.slice(ui.indexOf('const executeSkill = async'), ui.indexOf('const executeCommand = async'));
  assert.match(body, /finally\s*\{[^}]*skillView = null/, 'a thrown error / aborted battle can not leave the reward button hidden for ever');
});
test('BT8b: teamJudgment shows only its opening card - no second slash cutscene before Yama dashes in', () => {
  assert.doesNotMatch(ui, /hit\.actorId === 'you' && !reduced\) await playSkillScene\(action,scenes\.slice\(1\)/);
  assert.match(ui, /action === 'teamJudgment' \? scenes\.slice\(0,1\) : scenes/, 'the opening card stays');
});

// ---- EV14 power ----
import { teamCombo, applyCombo, COMBO_CREW_MULT, COMBO_BOSS_CAP } from '../src/combat-skills.js';
import { createGame } from '../src/game.js';
import { effectiveAllyStats } from '../src/progression.js';
const mk = (zone, level, crew) => { const g = createGame(); g.save = () => true; g.onChange = () => {}; g.coin = 99999; g.zone = zone; g.level = level; g.abilities.teamJudgment = true; for (const k of crew) g.hire(k); g.party.members = crew.slice(); return g; };
test('EV14 power: every ally hits for at least 2x their own normal move; Yama's closing blow is at least 120', () => {
  for (const [zone, level] of [['th', 3], ['asia', 5], ['west', 7], ['cyberhell', 9]]) {
    const g = mk(zone, level, ['taan', 'dam']); g.startBattle({ id:99, who:'test', deserved:4, resist:true }); g.prepareEncounter?.();
    const hits = teamCombo(g);
    for (const a of g.battleActors().filter(a => a.id !== 'you')) {
      const normal = effectiveAllyStats(a, g.zone, g.training).dmg, hit = hits.find(h => h.actorId === a.id).damage;
      assert.ok(hit >= COMBO_CREW_MULT * normal, `${zone} ${a.k}: ${hit} vs normal ${normal}`);
    }
    const yama = hits.find(h => h.actorId === 'you').damage;
    assert.ok(yama >= 120);
  }
});
test('EV14 power: a combo never takes more than 60% of a boss\'s full HP, however strong the team (the rest falls on its attendants)', () => {
  const b = { selectedFoeId:'boss', foes:[{ id:'boss', boss:true, hp:400, maxHp:400 }, { id:'m1', hp:40, maxHp:40 }, { id:'m2', hp:40, maxHp:40 }] };
  const res = applyCombo(b, [{ damage:200 }, { damage:200 }, { damage:200 }, { damage:200 }]);
  assert.equal(b.foes[0].hp, 400 - Math.floor(400 * COMBO_BOSS_CAP), 'boss keeps 40%');
  assert.ok(b.foes[0].hp > 0);
  assert.equal(res.reduce((n, h) => n + h.dealt, 0), 240 + 40 + 40, 'overflow went to the attendants, none wasted on the capped boss');
  // an ordinary foe has no cap; a boss already below the cap can still be finished
  const c = { selectedFoeId:'a', foes:[{ id:'a', hp:150, maxHp:150 }] }; applyCombo(c, [{ damage:999 }]); assert.equal(c.foes[0].hp, 0);
  const d = { selectedFoeId:'a', foes:[{ id:'a', boss:true, hp:100, maxHp:400 }] }; applyCombo(d, [{ damage:999 }]); assert.equal(d.foes[0].hp, 0);
});
