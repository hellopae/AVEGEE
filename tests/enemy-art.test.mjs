import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as data from '../src/data.js';

const manifest = JSON.parse(readFileSync(new URL('../img/manifest.json', import.meta.url)));
const listed = new Set([...manifest.critical, ...manifest.rest, ...Object.values(manifest.zones).flat()].map(p => `img/${p}`));
const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
const storyResolver = ui.slice(ui.indexOf('function storyFoeArt(sp) {'), ui.indexOf('function pendingZoneEvents()'));
const keys = new Set(['boss-frontier', 'boss-tester', 'zone-boss']);
function collect(value) {
  if (!value || typeof value !== 'object') return;
  for (const [field, child] of Object.entries(value)) {
    if (['img', 'sp', 'art'].includes(field) && typeof child === 'string' && /^(mob-|boss-|zone-boss|leader-.*-possessed$)/.test(child)) keys.add(child);
    collect(child);
  }
}
collect(data);
function shipped(path, label) {
  assert.ok(path && existsSync(new URL(`../${path}`, import.meta.url)), `${label}: missing ${path}`);
  assert.ok(listed.has(path), `${label}: unregistered ${path}`);
}

for (const loaded of [false, true]) {
  test(`every data enemy resolves for maps, battle portraits and turn icons (${loaded ? 'loaded' : 'unavailable'} manifest)`, async () => {
    const previous = globalThis.fetch;
    globalThis.fetch = async () => ({ok:loaded, json:async () => manifest});
    try {
      const { artUrl, bindZone } = await import(`../src/art.js?enemy-art-${loaded}`);
      await new Promise(resolve => setImmediate(resolve));
      for (const {k:zone} of data.ZONES) {
        bindZone(() => zone);
        const context = vm.createContext({artUrl});
        vm.runInContext(storyResolver, context);
        for (const key of keys) {
          shipped(artUrl(key), `${zone}/${key}/map`);
          const standee = context.storyFoeArt(key);
          shipped(standee, `${zone}/${key}/battle+turn`);
          shipped(artUrl(`${key}-profile`) || standee, `${zone}/${key}/portrait`);
        }
      }
    } finally { globalThis.fetch = previous; }
  });
}

test('new fallback sprites are transparent 512px PNGs and existing regional identity stays intact', async () => {
  const {enemyArt} = await import('../src/enemy-art.js');
  for (const key of ['skeleton','bot','bug','worm']) {
    const png = readFileSync(new URL(`../img/mob-${key}.png`, import.meta.url));
    assert.equal(png.subarray(1,4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), 512);
    assert.equal(png.readUInt32BE(20), 512);
    assert.equal(png[25], 6, 'PNG must retain RGBA');
  }
  assert.equal(enemyArt('mob-skeleton', 'west'), 'img/West/mob-skeleton-west.png');
  assert.equal(enemyArt('mob-bug', 'cyberhell'), 'img/CyberHell/mob-bug-cyberhell.png');
  assert.equal(enemyArt('boss-frontier-west', 'cyberhell'), 'img/West/boss-frontier-west.png');
  assert.equal(enemyArt('hero-yama', 'west'), undefined);
});
