// FB3-EV21 (owner e14, 26 Nov 2026): in the window before a fight, "นิรา" (ท่านได้จัดทีมยมทูตก่อนไปต่อสู้แล้วหรือยัง) opened the hire desk, whose cards said
// "จัดทีมได้ที่ปุ่มจัดทีม" - but that button sits behind the window. The desk now has the team toggle itself, and every pre-fight window routes its Nira card to it.
import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
import { createGame } from '../src/game.js';
const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');

test('EV21: the hire desk has a team toggle on every hired reaper card, wired to the game\'s own toggleParty', () => {
  assert.match(ui, /data-nira-party="\$\{esc\(key\)\}"/);
  assert.match(ui, /dlg\.querySelectorAll\('\[data-nira-party\]'\)\.forEach\(b => b\.onclick = \(\) => \{ if \(g\.toggleParty\(b\.dataset\.niraParty\)\)/);
  assert.doesNotMatch(ui, /จ้างแล้ว · จัดทีมได้ที่ปุ่มจัดทีม/, 'the dead-end hint is gone');
});
test('EV21: every pre-fight window (event alert, boss alert, in-battle prep) sends its Nira card to that desk and comes back to itself', () => {
  assert.match(ui, /data-event-prep="nira"\]'\)\?\.addEventListener\('click', \(\) => visit\(openNiraOffice\)\)/, 'event / boss / frontier alerts: desk, then back to the alert');
  assert.match(ui, /dlg\.querySelector\('\[data-event-prep="nira"\]'\)\?\.addEventListener\('click', \(\) => openNiraOffice\(\)\)/, 'battle prep layer: the battle guard re-opens it');
});
test('EV21: toggling a reaper changes who fights, up to the party cap', () => {
  const g = createGame(); g.save = () => true; g.onChange = () => {}; g.coin = 99999; g.hire('taan'); g.hire('dam'); g.hire('plerng');
  g.party.members = [];
  assert.equal(g.toggleParty('taan'), true); assert.equal(g.toggleParty('dam'), true);
  assert.deepEqual(g.party.members, ['taan', 'dam']);
  const max = g.partyMax(); for (const k of ['plerng', 'kan', 'boon']) { g.hire(k); g.toggleParty(k); }
  assert.ok(g.party.members.length <= max, 'never above the cap');
  const before = g.party.members.length; assert.equal(g.toggleParty('taan'), true); assert.equal(g.party.members.length, before - 1);
});
