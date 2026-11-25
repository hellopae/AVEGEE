// FB3-BT1 (owner, 26 Nov 2026): the "หนี" button is gone from every fight - normal, boss, event, colosseum, practice - with no shortcut or other UI path left.
import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync, readdirSync } from 'node:fs';
import { createGame } from '../src/game.js';
const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const setup = () => { const g = createGame(); g.save = () => true; g.onChange = () => {}; g.coin = 10000; g.hire('taan'); g.party.members = ['taan']; g.startBattle({ id:99, who:'test', deserved:4, resist:true }); g.prepareEncounter?.(); g.beginBattleTurns(); return g; };

test('BT1: the flee command is refused in every kind of fight and ends nothing', () => {
  const g = setup(), b = g.battle;
  for (const kind of ['soul', 'mob', 'frontier', 'frontierBreach', 'questFight', 'zoneBoss', 'yama', 'dad', 'zoneEvent', 'devaTest', 'prisonBreak', 'practice', 'colosseum']) {
    b.kind = kind; b.command = null;
    assert.equal(g.confirmBattleCommand('flee', 'you'), false, kind);
    assert.equal(b.over, null, kind);
  }
});
test('BT1: no flee API on the game', () => {
  const g = createGame();
  assert.equal(g.fleeWhy, undefined); assert.equal(g.fleeBattle, undefined);
});
test('BT1: no Flee row, confirm window, shortcut or text left in the battle UI', () => {
  const ui = read('src/ui.js');
  assert.doesNotMatch(ui, /หนี \/ Flee/); assert.doesNotMatch(ui, /id:'escape'/); assert.doesNotMatch(ui, /action:'flee'/);
  assert.doesNotMatch(ui, /data-flee-ok|data-flee-cancel|fleeConfirm|performFlee|fleeWhy|fleeBattle|openFleeConfirm/);
  assert.doesNotMatch(ui, /action === 'flee'|action==='flee'|k==='flee'/);
  assert.doesNotMatch(read('src/game.js'), /FLEEABLE_KINDS|fleeWhy|fleeBattle/);
  assert.doesNotMatch(read('src/i18n.js'), /battle\.flee\./);
  // no other src file offers a flee button / key either
  for (const f of readdirSync(new URL('../src', import.meta.url)).filter(f => f.endsWith('.js'))) assert.doesNotMatch(read('src/' + f), /data-flee|battle\.flee/, f);
});
test('BT1: the menu keeps no gap - rows are a flex column, the summon row exists only once the lamp is owned', () => {
  const ui = read('src/ui.js');
  assert.match(ui, /LAMP\.lampOwned\(g\) \? \[\{id:'summon'[^\n]*\] : \[\]\),/);
  assert.match(read('src/battle-turns.css'), /\.battle9-menu \.battle-command-tabs\{display:flex;flex-direction:column;gap:4px\}/);
});
