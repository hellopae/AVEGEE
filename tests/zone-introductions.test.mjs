import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { authorityOf, ZONES } from '../src/data.js';
import { zoneIntroduction, regionalCrewCutscene, travelPath } from '../src/zone-introductions.js';

test('arrival introductions name the friendly ruler, separate from hostile inspectors', () => {
  for (const zone of ['asia', 'west', 'cyberhell']) {
    const intro = zoneIntroduction(zone);
    assert.equal(intro.speaker, authorityOf(zone).full);
    assert.notEqual(intro.speaker, ZONES.find(z => z.k === zone).bossName);
    assert.match(intro.image, new RegExp(`/intro-head-${zone}-v2\\.png$`));
    assert.ok(intro.welcome.length && intro.guidance.length);
  }
  assert.equal(zoneIntroduction('th'), null);
});

test('every crew power resolves the current branch PNG; Thai keeps its existing JPEG', () => {
  const folders = { asia:'Asia', west:'West', cyberhell:'CyberHell' };
  for (const key of ['taan', 'plerng', 'dam', 'kan', 'boon', 'guard']) {
    for (const [zone, folder] of Object.entries(folders)) {
      assert.deepEqual(regionalCrewCutscene(key, zone), {
        src:`img/${folder}/crew-${key}-${zone}-cutscene-${zone}.png`, regional:true,
      });
    }
    assert.equal(regionalCrewCutscene(key, 'th').src, `img/crew-${key}-cutscene.jpeg`);
  }
});

test('followers remain on the same bridge even at corners and catch up at the destination', () => {
  const route = [[10, 10], [20, 10], [20, 30]];
  const path = travelPath(route, 2);
  assert.equal(path.total, 40);
  assert.deepEqual(path.at(-2), [10, 10]);
  assert.deepEqual(path.at(20), [20, 10]);
  assert.deepEqual(path.at(25), [20, 15]);
  const yama = path.at(22), nira = path.at(22 - 2.5);
  assert.equal(yama[0], 20);
  assert.equal(nira[1], 10);
  assert.deepEqual(path.at(42.5), route.at(-1));
  assert.deepEqual(path.at(42.5 - 2.5), route.at(-1));
});


test('completed regional introductions survive saves; older saves leave new introductions available', () => {
  globalThis.Image = class {};
  const original = createGame();
  original.zoneIntroSeen.asia = true;
  const saved = original.snapshot();
  const restored = createGame();
  assert.equal(restored.restore(saved), true);
  assert.deepEqual(restored.zoneIntroSeen, { asia:true });
  delete saved.zoneIntroSeen;
  const older = createGame();
  assert.equal(older.restore(saved), true);
  assert.deepEqual(older.zoneIntroSeen, {});
});
