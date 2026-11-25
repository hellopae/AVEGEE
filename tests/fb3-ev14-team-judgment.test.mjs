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
