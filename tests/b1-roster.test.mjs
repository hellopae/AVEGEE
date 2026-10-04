import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { CREW, ZONES } from '../src/data.js';
import { rosterId, findActor, actorsInZone, listActors, migrateRosterSave, ROSTER_BACKUP_KEY } from '../src/roster.js';

const fixture = () => JSON.parse(readFileSync(new URL('./fixtures/b1-v3.json', import.meta.url)));
const fields = ['morale','hunger','upLv','raeng','rabiab','panya','metta','helpReadyAt'];

test('B1 IDs are unique across all kinds/zones; Nira has one global identity', () => {
  const ids = ZONES.flatMap(z => [...CREW.filter(c => c.k !== 'nira').map(c => rosterId(z.k,c.k)), rosterId(z.k,'guard')]);
  assert.equal(new Set(ids).size, 24);
  assert.equal(new Set(ZONES.map(z => rosterId(z.k,'nira'))).size, 1);
  const g = createGame();
  assert.equal(g.crewOf('taan').id, 'th:taan');
  assert.deepEqual(g.teamLimits, { normalTeamMax:2, finalTeamMax:6 });
});

test('B1 actual v3 branch topology loads all owned actors and preserves every value', () => {
  const d = fixture(), original = structuredClone(d), g = createGame();
  assert.equal(g.restore(d), true);
  assert.deepEqual(d, original, 'restore must not mutate the supplied legacy save');
  assert.equal(listActors(g.roster).length, 25);
  for (const z of ZONES) {
    const branch = z.k === d.zone ? d : d.zoneSave[z.k];
    assert.equal(actorsInZone(g.roster,z.k).length, 6);
    for (const c of branch.crew.filter(c => c.k !== 'nira')) {
      const actor = findActor(g.roster,rosterId(z.k,c.k));
      for (const k of fields) assert.equal(actor[k],c[k], `${actor.id}.${k}`);
    }
    const guard = findActor(g.roster,rosterId(z.k,'guard'));
    assert.equal(guard.morale,100);
    assert.equal(guard.upLv,branch.guard.upLv);
  }
  assert.equal(g.crewOf('nira').morale,d.crew.find(c => c.k === 'nira').morale);
  assert.deepEqual(g.snapshot().party.members,['cyberhell:taan','cyberhell:kan']);
  assert.deepEqual(g.party.members,['taan','kan']);
  assert.deepEqual(g.snapshot().frontier.zones.th.team,['th:taan','th:kan']);
  assert.equal(g.battle,null);
});

test('B1 migration is idempotent including zero morale, entry snapshots and invalid team keys', () => {
  const d = fixture();
  d.crew.find(c => c.k === 'taan').morale = 0;
  d.party.members.push('missing','taan');
  d.zoneEntry = fixture();
  const first = migrateRosterSave(d,1000), second = migrateRosterSave(first,5000);
  assert.deepEqual(second,first);
  assert.equal(first.roster['cyberhell:taan'].recoverUntil,61000);
  assert.equal(first.roster['cyberhell:taan'].morale,0);
  assert.deepEqual(first.party.members,['cyberhell:taan','cyberhell:kan']);
  assert.equal(first.zoneEntry.rosterVersion,1);
  const g = createGame(); g.restore(first);
  const h = createGame(); h.restore(JSON.parse(JSON.stringify(g.snapshot())));
  assert.deepEqual(h.snapshot().roster,g.snapshot().roster);
  assert.equal(listActors(h.roster).length,25);
});

test('B1 dormant actors share roster state; moveZone round trip preserves stats and ownership', () => {
  const imageBefore = globalThis.Image;
  globalThis.Image = class { set src(value) {} };
  try {
  const g = createGame(); assert.equal(g.restore(fixture()),true);
  const nira = g.crewOf('nira');
  const thai = g.roster['th:taan'];
  thai.morale = 7; thai.hunger = 9; thai.upLv = 8; thai.recoverUntil = 777;
  const cyber = g.crewOf('taan'); cyber.morale = 13;
  assert.equal(g.moveZone('th'),true);
  assert.equal(g.crewOf('taan'),thai);
  assert.equal(g.crewOf('nira'),nira);
  assert.equal(g.guard,g.roster['th:guard']);
  assert.equal(g.moveZone('cyberhell'),true);
  assert.equal(g.crewOf('taan'),cyber);
  assert.equal(cyber.morale,13);
  assert.equal(thai.morale,7); assert.equal(thai.hunger,9);
  assert.equal(thai.upLv,8); assert.equal(thai.recoverUntil,777);
  assert.equal(thai.homeZone,'th');
  assert.deepEqual(g.party.members,[], 'zone change keeps the previous team reset behavior');
  const h = createGame(); h.restore(JSON.parse(JSON.stringify(g.snapshot())));
  assert.equal(h.roster['th:taan'].morale,7);
  assert.equal(h.roster['th:taan'].recoverUntil,777);
  } finally { if (imageBefore) globalThis.Image = imageBefore; else delete globalThis.Image; }
});

test('B1 backup precedes migration, remains unchanged on repeat, and failed backup stops restore', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  const storage = new Map();
  Object.defineProperty(globalThis,'localStorage',{ configurable:true, value:{
    getItem:k => storage.get(k) ?? null, setItem:(k,v) => storage.set(k,v),
  }});
  try {
    const d = fixture(), g = createGame();
    assert.equal(g.restore(d),true);
    const backup = storage.get(ROSTER_BACKUP_KEY);
    assert.deepEqual(JSON.parse(backup),d);
    assert.equal(g.save(),true);
    assert.equal(JSON.parse(storage.get('avegee.save.v2')).rosterVersion,1);
    g.restore(fixture()); assert.equal(storage.get(ROSTER_BACKUP_KEY),backup);
    storage.clear(); globalThis.localStorage.setItem = () => { throw Error('quota'); };
    const h = createGame();
    assert.equal(h.restore(d),false);
    assert.equal(h.zone,'th');
  } finally {
    if (descriptor) Object.defineProperty(globalThis,'localStorage',descriptor);
    else delete globalThis.localStorage;
  }
});

test('B1 new hires and guards get IDs immediately; normal party remains limited to two', () => {
  const g = createGame(); g.coin = 10000;
  g.hire('kan'); g.hire('boon'); g.hireGuard();
  assert.equal(g.roster['th:kan'],g.crewOf('kan'));
  assert.equal(g.guard.morale,100);
  assert.equal(g.guard.id,'th:guard');
  assert.equal(g.toggleParty('taan'),true); assert.equal(g.toggleParty('kan'),true);
  assert.equal(g.toggleParty('boon'),false);
  assert.deepEqual(g.partyCrew().map(c => c.k),['taan','kan']);
});

test('B1 migration supplies missing hunger, keeps guard morale/training/CD and supports v2', () => {
  const d = fixture(); d.v = 2;
  delete d.crew.find(c => c.k === 'taan').hunger;
  d.guard.morale = 23; d.guard.hunger = 45; d.guard.helpReadyAt = 900000;
  const g = createGame(); assert.equal(g.restore(d),true);
  assert.equal(g.crewOf('taan').hunger,100);
  assert.equal(g.guard.morale,23); assert.equal(g.guard.hunger,45);
  assert.equal(g.guard.helpReadyAt,900000);
  assert.equal(g.guard.upLv,d.guard.upLv);
  const migrated = migrateRosterSave(d);
  migrated.crew.find(c => c.k === 'taan').morale = 99;
  migrated.zoneSave.th.crew.find(c => c.k === 'taan').morale = 99;
  const h = createGame(); h.restore(migrated);
  assert.equal(h.crewOf('taan').morale,d.crew.find(c => c.k === 'taan').morale);
  assert.equal(h.roster['th:taan'].morale,d.zoneSave.th.crew.find(c => c.k === 'taan').morale);
});
