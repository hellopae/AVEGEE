// B3 Dale: battle/team cards must describe the actual actor (zone + training), not the first crew of the same kind.
// Found in review: cross-zone final team showed one taan value (69) on all four taan cards while real damage was 35/47/57/69.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
test('B3 battle helper buttons, cooldown title and final-team cards pass the actor object to crewAbility', () => {
  // B6 selects one actor before showing their special; retain identity and description checks.
  assert.match(ui, /const special = actor\.k === 'guard' \? 'guard' : `crew:\$\{crewBattleKey\(actor\)\}`/);
  assert.match(ui, /battleChoice\(special, crewArt\(actor, '-profile'\), crewAbility\(actor\)/);
  assert.match(ui, /button\.title=g\.crewHelpWhy\(c\)\|\|crewAbility\(c\);/);
  assert.match(ui, /ท่าสู้: \$\{crewAbility\(c\)\} · คูลดาวน์/);
  assert.doesNotMatch(ui, /crewAbility\(c\.k\)\}<\/small>`;\s*\n\s*\}\)\.join/);
});
