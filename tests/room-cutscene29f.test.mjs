import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { regionalCrewCutscene } from '../src/zone-introductions.js';

const manifest = JSON.parse(readFileSync(new URL('../img/manifest.json', import.meta.url)));
const rooms = [
  ['west', 'West', 'Sala'], ['west', 'West', 'Tarang'],
  ['west', 'West', 'Krajok'], ['west', 'West', 'Sawan'],
  ['cyberhell', 'CyberHell', 'Tarang'], ['cyberhell', 'CyberHell', 'Krajok'],
  ['cyberhell', 'CyberHell', 'Sawan'],
];
const crews = ['taan', 'plerng', 'dam', 'kan', 'boon', 'guard'];

test('29F: all seven room lookups select the regional asset after manifest loads', async () => {
  const previousFetch = globalThis.fetch, previousImage = globalThis.Image;
  globalThis.fetch = async () => ({ ok: true, json: async () => manifest });
  globalThis.Image = class {};
  try {
    const art = await import('../src/art.js?29f-room-assets');
    await new Promise(resolve => setImmediate(resolve));
    for (const [zone, folder, room] of rooms) {
      art.bindZone(() => zone);
      const path = `${folder}/BG-${room}-${zone}.webp`;
      assert.equal(art.artUrl(`BG-${room}`, 'webp'), `img/${path}`);
      assert.equal(manifest.zones[zone].filter(p => p === path).length, 1);
      assert.ok(existsSync(new URL(`../img/${path}`, import.meta.url)));
    }
  } finally {
    globalThis.fetch = previousFetch;
    globalThis.Image = previousImage;
  }
});

test('29F: every crew cutscene consumer points to one existing regional JPEG', () => {
  for (const [zone, folder] of [['asia', 'Asia'], ['west', 'West'], ['cyberhell', 'CyberHell']]) {
    for (const crew of crews) {
      const path = `${folder}/crew-${crew}-${zone}-cutscene.jpeg`;
      assert.deepEqual(regionalCrewCutscene(crew, zone), { src: `img/${path}`, regional: true });
      assert.equal(manifest.zones[zone].filter(p => p === path).length, 1);
      assert.ok(existsSync(new URL(`../img/${path}`, import.meta.url)));
      assert.ok(!manifest.zones[zone].includes(`${folder}/crew-${crew}-${zone}-cutscene-${zone}.png`));
    }
  }
});

test('29F: real room dimensions preserve reference ratios; all 18 cutscenes are opaque 1375x768', () => {
  execFileSync('python3', ['-c', `
from PIL import Image
from pathlib import Path
for zone, folder, base in ${JSON.stringify(rooms)}:
    reference = Image.open(f'img/BG-{base}.webp')
    path = f'img/{folder}/BG-{base}-{zone}.webp'
    output = Image.open(path)
    assert output.format == 'WEBP', path
    assert output.width == 1024, path
    assert output.height == round(reference.height * output.width / reference.width), path
    assert output.convert('RGBA').getchannel('A').getextrema() == (255,255), path
for zone, folder in [('asia','Asia'),('west','West'),('cyberhell','CyberHell')]:
    for crew in ${JSON.stringify(crews)}:
        path = f'img/{folder}/crew-{crew}-{zone}-cutscene.jpeg'
        output = Image.open(path)
        assert output.format == 'JPEG', path
        assert output.size == (1375,768), (path, output.size)
        assert output.convert('RGBA').getchannel('A').getextrema() == (255,255), path
        assert not Path(f'img/{folder}/crew-{crew}-{zone}-cutscene-{zone}.png').exists(), path
  `]);
});
