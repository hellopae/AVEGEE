// T3/4 (owner 16 Nov "ได้ครับ"): the loading page shows for a short moment after EVERY ferry trip, also when the destination is already cached
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
test('T3/4: the ferry load asks the loading page for a minimum time; the cached shortcut is skipped only then', () => {
  const ui = src('src/ui.js'), pre = src('src/preload.js');
  assert.match(ui, /load:mode==='boat'\?\(\)=>preloadZone\(to,destOutfit,null,\{minMs:900\}\)/);
  assert.match(pre, /if \(!show\?\.minMs && tiers && !queue\.missing\(tiers\.critical\)\.length\)/);
  assert.match(pre, /show\.minMs - \(Date\.now\(\) - shownAt\)/);
  assert.match(pre, /export function preloadZone\(zone, outfit = zone, boot = null, show = null\)/);
  // the border walk (mode !== boat) still loads first with no forced page, and the first boot is unchanged
  assert.match(ui, /await preloadZone\(to,destOutfit\);/);
});
