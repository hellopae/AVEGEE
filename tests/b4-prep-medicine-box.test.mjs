// B4-R Dale: the boss-prep medicine box said "none" while a zone-2+ medicine chip was clickable
// (it only counted base health/holyWater). Both prep surfaces must count every consumable tier.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
test('prep medicine box and event-alert medicine card count medicines of every zone tier', () => {
  assert.match(ui, /const medicineCount = inv =>[^\n]*ITEMS\[k\]\?\.consumable/);
  assert.match(ui, /event-prep-speech">\$\{esc\(medicineCount\(g\.inventory\) \?/);
  assert.match(ui, /const medicine = Object\.keys\(g\.inventory\)\.filter\(k => g\.inventory\[k\] > 0 && ITEMS\[k\]\?\.consumable\)/);
  assert.doesNotMatch(ui, /esc\(medN \|\| waterN \?/);
});
