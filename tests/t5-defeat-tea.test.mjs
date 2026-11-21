// T5'/0 (owner 19 Nov): a lost fight of ANY kind ends at the tea house - Yama lies on the bed, Nira runs in and says one line, the fallen teammates sitting there
// and Yama stand up together, then Yama is on his own again. The punishment of each kind is untouched (tests/tea-recovery covers the old flow).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { STATIONS } from '../src/data.js';
import { actorFromLegacy, syncRoster } from '../src/roster.js';
import { actorStanding } from '../src/actor-recovery.js';
import { TEA_WAKE_MS, RECOVERY_LIE_MS, RECOVERY_NIRA_RUN_MS, RECOVERY_SLEEP_MS, RECOVERY_TOTAL_MS, recoveryPhase, niraRunPose, teaBackground, teaRoom, NIRA_WAKE_LINE } from '../src/tea-recovery.js';
import { makeRoom } from '../src/room.js';
globalThis.Image ??= class { set src(v){ this._src=v; this.onerror?.(); } get src(){ return this._src; } };

function game(kinds = ['taan', 'plerng']) {
  const g = createGame(); g.zone = 'th'; g.save = () => true; g.onChange = () => {};
  g.crew = kinds.map(k => actorFromLegacy({ k, morale: 100 }, 'th'));
  g.guard = null; g.roster = {}; syncRoster(g); g.party.members = kinds;
  g.stations = STATIONS.map(def => ({ def, build: 0, slots: [] }));
  return g;
}
const withCanvas = fn => {
  const prevWindow = globalThis.window, prevDocument = globalThis.document, noop = () => {};
  const ctx = new Proxy({}, { get: (obj, key) => key in obj ? obj[key] : key === 'measureText' ? () => ({ width: 0 }) : () => new Proxy({}, { get: () => noop }) });
  globalThis.window = { addEventListener: noop, removeEventListener: noop }; globalThis.devicePixelRatio = 1;
  globalThis.addEventListener = noop; globalThis.removeEventListener = noop;
  globalThis.document = { createElement: () => ({ getContext: () => ctx }) };
  const cv = { width: 390, height: 844, getContext: () => ctx, addEventListener: noop, removeEventListener: noop, getBoundingClientRect: () => ({ width: 390, height: 844 }) };
  try { return fn(cv); } finally { globalThis.window = prevWindow; globalThis.document = prevDocument; }
};

test('the five beats of the defeat wake-up: lie -> Nira runs -> Nira speaks -> everyone stands -> done', () => {
  assert.equal(recoveryPhase(0), 'lie'); assert.equal(recoveryPhase(RECOVERY_LIE_MS - 1), 'lie');
  assert.equal(recoveryPhase(RECOVERY_LIE_MS), 'run'); assert.equal(recoveryPhase(RECOVERY_LIE_MS + RECOVERY_NIRA_RUN_MS), 'say');
  assert.equal(recoveryPhase(RECOVERY_SLEEP_MS), 'wake'); assert.equal(recoveryPhase(RECOVERY_TOTAL_MS), 'done');
  assert.ok(RECOVERY_LIE_MS >= 1500 && RECOVERY_LIE_MS <= 2000, 'Yama lies "a moment" (brief: 1.5-2 s)');
  assert.ok(NIRA_WAKE_LINE.th && NIRA_WAKE_LINE.en, 'one line, both languages');
  const room = teaRoom('th'), start = niraRunPose(0, room), mid = niraRunPose(RECOVERY_NIRA_RUN_MS / 2, room), end = niraRunPose(RECOVERY_NIRA_RUN_MS, room);
  assert.equal(start.running, true); assert.equal(end.running, false);
  assert.ok(start.point[1] > mid.point[1] && mid.point[1] > end.point[1] - 1e-9, 'she comes up from the door');
  assert.equal(end.face, room.bed[0] < end.point[0] ? -1 : 1, 'facing the bed');
});

test('a fallen teammate waits in the tea house for Nira, and stands up with Yama at the wake beat - not before, not one by one', () => withCanvas(cv => {
  const g = game(); const [taan, plerng] = g.crew;
  taan.morale = 0; g.downActor(taan);                      // fell and rests at the tea house (recovery rest)
  assert.ok(taan.teaRest?.recovery, 'sits in the tea house');
  g.hp = 1; g.pendingRecovery = { zone: 'th', stage: 'return' };
  g.updateActorRecovery(taan.recoverUntil + 60000);        // the 2-minute timer would have run out - but Yama's wake-up is pending
  assert.ok(taan.teaRest?.recovery, 'still sitting: waits for Nira');
  const R = makeRoom(cv, g, STATIONS.find(d => d.k === 'tea'), teaRoom('th'), teaBackground('th'), null);
  assert.equal(R.setSleep(true), true); assert.equal(R.recoveryBeat(), 'lie');
  R.tick(RECOVERY_LIE_MS); assert.equal(R.recoveryBeat(), 'run'); assert.equal(g.pendingRecovery.stage, 'wake', 'Nira is coming');
  R.tick(RECOVERY_NIRA_RUN_MS); assert.equal(R.recoveryBeat(), 'say');
  assert.ok(taan.teaRest?.recovery && g.pendingRecovery, 'the teammate is still sitting while she speaks');
  assert.equal(g.hp < g.hpMax || g.hp === g.hpMax, true);
  R.tick(RECOVERY_SLEEP_MS - RECOVERY_LIE_MS - RECOVERY_NIRA_RUN_MS); assert.equal(R.recoveryBeat(), 'wake');
  assert.ok(!taan.teaRest, 'the teammate is up at the very beat Yama wakes'); assert.equal(taan.morale, 50); assert.equal(taan.recoverUntil, 0); assert.ok(actorStanding(taan));
  assert.ok(g.pendingRecovery, 'Yama is not free until the last beat');
  R.tick(TEA_WAKE_MS); assert.equal(g.pendingRecovery, null); assert.equal(g.hp, g.hpMax); assert.equal(R.sleeping(), false);
  assert.ok(actorStanding(plerng), 'a teammate who never fell is untouched');
}));

test('a teammate in the tea house for an ordinary rest (not knocked out) is not touched by Nira', () => {
  const g = game(); const taan = g.crew[0];
  g.restActor?.(taan.id);                                  // may refuse (full HP) - the point is that releaseRecoveryTeam only takes recovery rests
  taan.teaRest = { phase: 'rest', zone: 'th', seat: 0, startedAt: Date.now(), until: Date.now() + 100000, returnAt: [1, 1] };
  assert.equal(g.releaseRecoveryTeam(), 0); assert.ok(taan.teaRest);
});

test('every kind of lost fight sends Yama to the tea house; the old punishments are kept; a lost quest fight keeps its step and costs nothing', () => {
  for (const kind of ['soul', 'mob', 'frontier', 'zoneBoss', 'zoneEvent', 'frontierBreach', 'devaTest', 'prisonBreak', 'questFight', 'yama', 'dad']) {
    const g = game(); g.hp = 40; const coin = g.coin;
    g.battle = { kind, zone: 'th', eventKey: 'sitaHanuman', over: 'lose', who: 'x', youHp: 0, youMax: g.hpMax, questId: 'none', bg: null };
    g.endBattle(); assert.equal(g.battle, null, kind);
    assert.ok(g.pendingRecovery, kind + ': ends at the tea house'); assert.equal(g.pendingRecovery.zone, 'th');
    if (kind === 'questFight') assert.equal(g.coin, coin, 'the quest fight costs nothing');
    g.completeTeaRecovery(); assert.equal(g.hp, g.hpMax); assert.equal(g.pendingRecovery, null);
  }
  const win = game(); win.battle = { kind: 'questFight', over: 'win', youHp: 30, questId: 'none' }; win.endBattle(); assert.equal(win.pendingRecovery, null, 'a win never wakes at the tea house');
});

test('a story fight that is lost keeps its own lost scene queued and can be fought again', () => {
  const g = game(); g.battle = { kind: 'zoneEvent', zone: 'th', eventKey: 'sitaHanuman', over: 'win', who: 'h', youHp: 1, youMax: 10 };
  // use the real lose path: battleAct sets the story + the event back to pending, endBattle sends Yama to rest
  (g.zoneEvents.th ||= {}).sitaHanuman = 'active';
  g.queueStory('sita-hanuman-lose'); g.zoneEvents.th.sitaHanuman = 'pending';
  g.battle = { kind: 'zoneEvent', zone: 'th', eventKey: 'sitaHanuman', over: 'lose', who: 'h', youHp: 0, youMax: g.hpMax };
  g.endBattle();
  assert.ok(g.storyQueue.some(s => s.key === 'sita-hanuman-lose'), 'the lost scene is still queued (the UI plays it first, then the tea house)');
  assert.equal(g.pendingRecovery.stage, 'return'); assert.equal(g.zoneEvents.th.sitaHanuman, 'pending', 'the event is not stuck');
  g.completeTeaRecovery(); assert.equal(g.pendingRecovery, null);
});

test('a save made in the middle of the wake-up resumes it (lie or Nira beat) and still ends with everybody up', () => withCanvas(cv => {
  for (const stage of ['sleep', 'wake']) {
    const g = game(); const taan = g.crew[0]; taan.morale = 0; g.downActor(taan); g.hp = 1; g.pendingRecovery = { zone: 'th', stage };
    const copy = game(); copy.restore(g.snapshot());
    const t2 = copy.crew[0];
    assert.ok(t2.teaRest?.recovery, stage + ': the sitting teammate survives the save');
    const R = makeRoom(cv, copy, STATIONS.find(d => d.k === 'tea'), teaRoom('th'), teaBackground('th'), null);
    assert.equal(R.setSleep(true), true); assert.equal(R.recoveryBeat(), stage === 'wake' ? 'run' : 'lie');
    R.tick(RECOVERY_TOTAL_MS); R.tick(1);
    assert.equal(copy.pendingRecovery, null, stage); assert.ok(!t2.teaRest); assert.equal(copy.hp, copy.hpMax);
  }
}));
