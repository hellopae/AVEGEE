import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const manifest = JSON.parse(readFileSync(new URL('../img/manifest.json',import.meta.url),'utf8'));
globalThis.fetch = async () => ({ ok:true, json:async () => manifest });
globalThis.Image = class {};
const { artUrl, bindZone } = await import('../src/art.js');
await new Promise(resolve => setImmediate(resolve));

test('construction poses resolve to all eight zone-specific transparent PNG assets', () => {
  for (const z of ['th','asia','west','cyberhell']) {
    bindZone(() => z);
    for (const k of ['taan','dam']) {
      const folder = {th:'',asia:'Asia/',west:'West/',cyberhell:'CyberHell/'}[z];
      const stem = `crew-${k}${z === 'th' ? '' : `-${z}`}`;
      const path = `img/${folder}${stem}-build-work.png`;
      assert.equal(artUrl(`crew-${k}-build-work`), path);
      assert.ok(existsSync(new URL(`../${path}`,import.meta.url)), path);
      if (z !== 'th') assert.ok(manifest.zones[z].includes(path.slice(4)),path);
      const normal = `img/${folder}${stem}.png`;
      assert.equal(artUrl(`crew-${k}`),normal);
    }
  }
});
