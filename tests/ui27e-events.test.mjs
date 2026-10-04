import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { MOB, SPOTS, ZONE_EVENTS, ZONES } from '../src/data.js';
import { hitActor } from '../src/scene.js';

globalThis.Image = class {};

test('closing a prison alert leaves a clickable raider that burns buildings and survives restore', () => {
  const g = createGame();
  (g.zoneEvents.th ||= {}).prisonBreak = 'pending';
  g.dismissEventAlert('prisonBreak', true);
  const raider = g.mobs.find(m => m.eventKey === 'prisonBreak');
  assert.ok(raider);
  assert.deepEqual(hitActor(g, raider.x, raider.y), { kind:'eventRaider', key:'prisonBreak' });
  const st = g.stations.find(s => !s.build);
  raider.x = st.def.x; raider.y = st.def.y; raider.at = st.def.k;
  const before = st.fire;
  g.stepWorld(1000);
  assert.ok(st.fire > before);
  const copy = createGame();
  copy.restore(g.snapshot());
  assert.equal(copy.eventMapClosed['th:prisonBreak'], true);
  assert.equal(copy.mobs.some(m => m.eventKey === 'prisonBreak'), true);
  assert.equal(copy.zoneEventStatus('prisonBreak'), 'pending');
  copy.zoneEvents.th.prisonBreak = 'cleared';
  copy.stepWorld(16);
  assert.equal(copy.mobs.some(m => m.eventKey === 'prisonBreak'), false);
});

test('closed wave alerts restore their raiders in each zone', () => {
  for (const [zone, key] of [['th','frontierBreach'], ['asia','asiaRageBreach'],
    ['west','westVampireBreach'], ['cyberhell','cyberBreach']]) {
    const g = createGame();
    g.zone = zone;
    g.zoneEvents[zone] ||= {};
    g.zoneEvents[zone][key] = 'pending';
    g.dismissEventAlert(key, true);
    assert.equal(g.mobs.filter(m => m.eventKey === key).length, 1, zone);
    const copy = createGame(); copy.restore(g.snapshot());
    assert.equal(copy.eventMapClosed[`${zone}:${key}`], true, zone);
    assert.equal(copy.mobs.some(m => m.eventKey === key), true, zone);
  }
});

test('deva and waiting boss are clickable on the right bridge', () => {
  const g = createGame();
  (g.zoneEvents.th ||= {}).devaTest = 'pending';
  g.dismissEventAlert('devaTest');
  assert.deepEqual(hitActor(g, SPOTS.bossPier.x - 86, SPOTS.bossPier.y),
    { kind:'zoneEvent', key:'devaTest' });
  g.zoneEvents.th.devaTest = 'cleared';
  g.bossGuarding.th = true;
  assert.deepEqual(hitActor(g, SPOTS.bossPier.x, SPOTS.bossPier.y),
    { kind:'bossPending', key:'th' });
});

test('a dismissed branch boss stays pending through restore and can be challenged from its alert', () => {
  const g = createGame();
  g.zone = 'asia'; g.zoneCases.asia = 10;
  g.zoneEvents.asia = Object.fromEntries(ZONE_EVENTS.asia.map(ev => [ev.k, 'cleared']));
  g.bossGuarding.asia = true;
  const copy = createGame(); copy.restore(g.snapshot());
  assert.equal(copy.bossGuarding.asia, true);
  assert.deepEqual(hitActor(copy, SPOTS.bossPier.x, SPOTS.bossPier.y),
    { kind:'bossPending', key:'asia' });
  assert.equal(copy.startZoneBoss('alert')?.kind, 'zoneBoss');
});

test('west and CyberHell wave mobs use local rosters and preserve encounter stats', () => {
  const west = ZONE_EVENTS.west.find(ev => ev.k === 'westVampireBreach');
  const cyber = ZONE_EVENTS.cyberhell.find(ev => ev.k === 'cyberBreach');
  assert.deepEqual(ZONES.find(z => z.k === 'west').mobs, [10]);
  assert.deepEqual(ZONES.find(z => z.k === 'cyberhell').mobs, [11,12,13,14,15,16]);
  assert.deepEqual(west.waves.slice(0, 2).map(w => w[0].kind), [10,10]);
  assert.deepEqual(cyber.waves.slice(0, 3).map(w => w[0].kind), [11,12,13]);
  assert.deepEqual(cyber.waves.slice(0, 3).map(w => w[0].hp), [60,65,70]);
  assert.deepEqual(MOB.kinds.slice(10).map(m => m.img),
    ['mob-skeleton','mob-bot','mob-bug','mob-worm','mob-cyber-guard','mob-cyber-lancer','mob-cyber-brute']);
  assert.equal(ZONE_EVENTS.asia.find(ev => ev.k === 'asiaRageBreach').waves[2][0].sp,
    'boss-frontier-asia');
});

test('event preparation merchant stays locked until the CyberHell rescue is cleared', () => {
  const g = createGame();
  g.zone = 'cyberhell';
  g.zoneEvents.cyberhell = { cyberRescue:'pending' };
  g.coin = 500;
  assert.equal(g.zoneCaptivesFree(), false);
  assert.equal(g.buyMerchant('teaZ4'), false);
  g.zoneEvents.cyberhell.cyberRescue = 'cleared';
  assert.equal(g.zoneCaptivesFree(), true);
  assert.equal(g.buyMerchant('teaZ4'), true);
});
