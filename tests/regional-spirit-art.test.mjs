import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { regionalSpiritAliases, SPIRIT_ARCHETYPES } from '../src/regional-spirits.js';
import { regionalCrewCutscene, zoneIntroduction } from '../src/zone-introductions.js';
const manifest = JSON.parse(readFileSync(new URL('../img/manifest.json', import.meta.url)));
const available = path => existsSync(new URL(`../img/${path}`, import.meta.url));
test('every semantic soul portrait resolves to a registered regional asset', () => {
  for (const zone of ['th','asia','west','cyberhell']) {
    const aliases = regionalSpiritAliases(zone);
    for (const type of SPIRIT_ARCHETYPES) {
      const path = aliases[`spirit-${type}-${zone}`];
      assert.ok(manifest.zones[zone].includes(path), `${zone}/${type} absent from manifest`);
      assert.ok(available(path), `${path} absent from checkout`);
    }
    assert.ok(aliases[`soul-girl-${zone}`].includes('spirit-girl-'));
    assert.ok(aliases[`soul-boy-${zone}`].includes('spirit-boy-'));
  }
});
test('regional welcome and all six crew powers ship with their PNG assets', () => {
  for (const zone of ['asia','west','cyberhell']) {
    const files = [zoneIntroduction(zone).image, ...['taan','plerng','dam','kan','boon','guard'].map(k => regionalCrewCutscene(k,zone).src)];
    for (const src of files) {
      assert.ok(available(src.slice(4)), src);
      assert.ok(manifest.zones[zone].includes(src.slice(4)), src);
    }
  }
});

test('case-aware keys resolve to the matching image in every zone, including legacy Thai saves', async () => {
  const previousFetch = globalThis.fetch, previousImage = globalThis.Image;
  globalThis.fetch = async () => ({ ok:true, json:async () => manifest });
  globalThis.Image = class { set src(value) { this.url = value; } };
  try {
    const { artUrl, bindZone } = await import('../src/art.js?regional-test');
    const { soulPortrait } = await import('../src/soul-portraits.js');
    await new Promise(resolve => setImmediate(resolve));
    for (const zone of ['th','asia','west','cyberhell']) {
      bindZone(() => zone);
      for (const [soul,type] of [
        [{who:'นักเรียนหญิง',sex:'g',sp:10},'girl'],
        [{case:'sister',sex:'f',sp:4},'clerk'],
        [{case:'scapegoat',sp:1},'worker'],
        [{case:'A7'},'cleric'], [{case:'A3'},'officer'], [{case:'A13'},'officer'],
        [{who:'หญิงวัยเกษียณ',sex:'f'},'elder-woman'],
        [{who:'เจ้าของกิจการ',sex:'m'},'business'],
      ]) {
        const key = soulPortrait(soul,zone);
        assert.equal(key,`spirit-${type}`);
        assert.equal(artUrl(key),`img/${regionalSpiritAliases(zone)[`${key}-${zone}`]}`);
      }
    }
  } finally { globalThis.fetch=previousFetch; globalThis.Image=previousImage; }
});

test('semantic portraits retain a valid path even if the async manifest cannot load', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok:false });
  try {
    const { artUrl, bindZone } = await import('../src/art.js?missing-manifest-test');
    for (const zone of ['th','asia','west','cyberhell']) {
      bindZone(() => zone);
      for (const type of SPIRIT_ARCHETYPES) {
        assert.equal(artUrl(`spirit-${type}`),`img/${regionalSpiritAliases(zone)[`spirit-${type}-${zone}`]}`);
        assert.equal(artUrl(`spirit-${type}-profile`),null);
      }
    }
  } finally { globalThis.fetch=previousFetch; }
});
