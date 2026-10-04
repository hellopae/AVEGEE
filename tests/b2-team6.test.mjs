import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { BATTLE, CREW_POWER } from '../src/data.js';

const ids = ['th:taan','asia:taan','west:taan','cyberhell:taan','th:kan','west:boon'];
function finalGame() {
  const g = createGame();
  assert.equal(g.restore(JSON.parse(readFileSync(new URL('./fixtures/b1-v3.json', import.meta.url)))), true);
  g.bossCleared = { th:true, asia:true, west:true };
  g.zoneEvents.cyberhell = { cyberRescue:'cleared', cyberFinal:'pending' };
  for (const c of Object.values(g.roster)) { c.morale = 92; c.recoverUntil = 0; c.helpReadyAt = 0; }
  return g;
}

test('B2 Nira selects six IDs across zones, duplicate kinds, no truncation; Guard is separate', () => {
  const g = finalGame();
  assert.equal(g.finalTeamCandidates().length, 20);
  for (const id of ids) assert.equal(g.toggleParty(id), true, id);
  assert.equal(g.toggleParty('asia:kan'), false);
  assert.deepEqual(g.party.finalMembers, ids);
  const h = createGame(); h.restore(JSON.parse(JSON.stringify(g.snapshot())));
  assert.deepEqual(h.party.finalMembers, ids);
  const b = h.startZoneEvent('cyberFinal');
  assert.deepEqual(b.team, ids);
  assert.deepEqual(new Set(h.battleCrew().map(c => c.id)), new Set(ids));
  assert.equal(h.battleCrew().filter(c => c.k === 'taan').length, 4);
  assert.ok(h.guard);
  assert.equal(h.battleCrew().length + 1 + 1, 8);
});

test('B2 zero morale, resting and locked branches cannot join; removal remains possible', () => {
  const g = finalGame(), c = g.roster['th:taan'];
  c.morale = 0; assert.match(g.finalTeamWhy(c), /กำลังใจ/); assert.equal(g.toggleParty(c.id), false);
  c.morale = 50; c.recoverUntil = Date.now() + 60000;
  assert.match(g.finalTeamWhy(c), /พัก/); assert.equal(g.toggleParty(c.id), false);
  c.recoverUntil = 0; assert.equal(g.toggleParty(c.id), true);
  c.morale = 0; assert.equal(g.toggleParty(c.id), true);
  g.bossCleared.th = false; assert.equal(g.toggleParty('asia:taan'), false);
  g.bossCleared.th = true;
  assert.equal(g.toggleParty('asia:taan'), true);
  g.roster['asia:taan'].morale = 0;
  assert.deepEqual(g.startZoneEvent('cyberFinal').team, []);
});

test('B2 rest stops apply ID team edits immediately and keep six into the next wave', () => {
  const g = finalGame(); for (const id of ids) g.toggleParty(id);
  const b = g.startZoneEvent('cyberFinal');
  b.wave = 3; b.pendingWave = 4; b.foes.forEach(f => f.hp = 0);
  assert.equal(g.zoneEventRestReady(), true);
  assert.equal(g.toggleParty('west:taan'), true);
  assert.equal(g.toggleParty('asia:kan'), true);
  assert.equal(g.battleCrew().length, 6);
  assert.ok(g.battleCrew().includes(g.roster['asia:kan']));
  assert.ok(!g.battleCrew().includes(g.roster['west:taan']));
  assert.equal(g.advanceZoneEventWave(true), true);
  assert.equal(g.battleCrew().length, 6);
});

test('B2 normal fights and frontier retain two local helpers despite final selection', () => {
  const g = finalGame(); for (const id of ids) g.toggleParty(id);
  g.zoneEvents.cyberhell.cyberFinal = 'locked'; g.party.members = []; g.frontierOf().team = [];
  assert.equal(g.toggleParty('taan'), true); assert.equal(g.toggleParty('kan'), true);
  assert.equal(g.toggleParty('boon'), false); assert.equal(g.toggleParty('th:taan'), false);
  g.party.members.push('boon'); assert.equal(g.battleCrew().length, 2);
  assert.equal(g.setFrontierTeam('taan'), true); assert.equal(g.setFrontierTeam('kan'), true);
  assert.equal(g.setFrontierTeam('boon'), false);
  assert.equal(g.startFrontierBattle().team.length, 2);
  assert.equal(g.battleCrew().length, 2);
});

test('B2 helper morale, cooldown and trained damage belong to the source ID after battle/save', () => {
  const g = finalGame(); for (const id of ids) g.toggleParty(id);
  const actor = g.roster['west:taan'], other = g.roster['th:taan'];
  actor.upLv = 4;
  const b = g.startZoneEvent('cyberFinal');
  for (const f of b.foes) { f.hp = f.maxHp = 10000; f.atk = [0,0]; }
  const hp = b.foes[0].hp;
  assert.equal(g.battleAct('crew:west:taan'), true);
  assert.equal(hp - b.foes[0].hp, CREW_POWER.taan.dmg + 4 * CREW_POWER.taan.trainDmg);
  assert.equal(actor.morale, 92 - BATTLE.crewMorale); assert.equal(other.morale, 92);
  assert.equal(other.helpReadyAt, 0); assert.ok(actor.helpReadyAt > Date.now());
  assert.equal(g.battleAct('crew:th:taan'), true);
  assert.equal(g.battleAct('crew:west:taan'), false);
  b.over = 'lose'; g.endBattle();
  const h = createGame(); h.restore(JSON.parse(JSON.stringify(g.snapshot())));
  assert.equal(h.roster['west:taan'].morale, actor.morale);
  assert.equal(h.roster['west:taan'].upLv, 4);
  assert.equal(h.roster['west:taan'].homeZone, 'west');
  assert.equal(h.zoneSave.west.crew.find(c => c.k === 'taan'), h.roster['west:taan']);
});

test('B2 art uses source zone for both standee/profile and keeps default lookup', async () => {
  const fetchBefore = globalThis.fetch, imageBefore = globalThis.Image;
  globalThis.fetch = async () => ({ ok:true, json:async () => JSON.parse(readFileSync(new URL('../img/manifest.json', import.meta.url))) });
  globalThis.Image = class {};
  try {
    const art = await import('../src/art.js?b2'); await new Promise(resolve => setImmediate(resolve));
    art.bindZone(() => 'cyberhell');
    for (const key of ['crew-taan','crew-taan-profile']) {
      assert.match(art.artUrl(key, 'png', 'west'), /West\/.*west/);
      assert.match(art.artUrl(key, 'png', 'asia'), /Asia\/.*asia/);
      assert.doesNotMatch(art.artUrl(key, 'png', 'th'), /CyberHell/);
      assert.match(art.artUrl(key), /CyberHell/);
    }
  } finally { globalThis.fetch = fetchBefore; globalThis.Image = imageBefore; }
});

test('B2 returning to a repair branch keeps its original builder even when sv aliases actor', () => {
  const before = globalThis.Image; globalThis.Image = class { set src(value) {} };
  try {
    const g = finalGame(); assert.equal(g.moveZone('th'), true);
    const actor = g.crewOf('dam'), st = g.stations[0];
    st.repair = Date.now() + 60000; st.repairWait = true; actor.buildK = st.def.k;
    assert.equal(g.moveZone('cyberhell'), true);
    assert.equal(g.zoneSave.th.crew.find(c => c.k === 'dam'), actor);
    assert.equal(g.moveZone('th'), true);
    assert.equal(g.crewOf('dam'), actor); assert.equal(actor.buildK, st.def.k);
    assert.equal(g.crew.find(c => c.buildK === st.def.k), actor);
  } finally { if (before) globalThis.Image = before; else delete globalThis.Image; }
});
