// T3/14 (owner 19 Nov): the Guard's special move rests 1 minute in every zone (was 20 seconds)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GUARD } from '../src/data.js';
import { specialCooldown, GUARD_COOLDOWN_SECONDS } from '../src/actor-recovery.js';
import { actorFromLegacy } from '../src/roster.js';
test('T3/14: one value (60 s) feeds the data, the actor fallback, a reloaded guard of every zone and the card text', () => {
  assert.equal(GUARD_COOLDOWN_SECONDS, 60);
  assert.equal(GUARD.helpCdMs, 60000);
  assert.equal(specialCooldown({ k: 'guard' }), 60);
  assert.equal(specialCooldown({ k: 'guard', helpCooldownSeconds: 60 }), 60);
  for (const zone of ['th', 'asia', 'west', 'cyberhell']) {
    const g = actorFromLegacy({ x: 1, y: 1, helpReadyAt: Date.now() + 50000 }, zone, 'guard');
    assert.ok(g.helpRemainingMs > 40000 && g.helpRemainingMs <= 60000, `${zone}: a cooldown of 50 s left on an old save is kept, now capped at 60 s (${g.helpRemainingMs})`);
  }
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  assert.match(ui, /คูลดาวน์ \$\{GUARD\.helpCdMs % 60000 === 0 \? GUARD\.helpCdMs \/ 60000 \+ ' นาที'/, 'the card says "1 นาที"');
  assert.doesNotMatch(readFileSync(new URL('../src/data.js', import.meta.url), 'utf8'), /helpCdMs:20000/);
});
