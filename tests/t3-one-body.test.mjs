// T3/1 (owner 18 Nov, G6): every reaper (and the Guard) has ONE body in the world at any time, and goes back to his post when the work is done.
// The bodies are counted with the same predicates the screen uses (src/crew-presence.js: mapBodyDrawn / residentPresent / keeperPresent).
import test from 'node:test';
import assert from 'node:assert/strict';
import { harbourTravel } from './helpers/travel.mjs';
import { createGame } from '../src/game.js';
import { STATIONS, CREW, GUARD_POST, syncSceneZone } from '../src/data.js';
import { resetWalk, nearestWalk } from '../src/walk.js?v=k1d';
import { crewViews, crewAwayReason, residentPresent, ROOM_RESIDENT, CREW_HOME_STATION, HOME_RADIUS } from '../src/crew-presence.js';
import { actorStanding } from '../src/actor-recovery.js';
import { actorFromLegacy, syncRoster } from '../src/roster.js';

globalThis.Image = class {};
const realNow = Date.now;
let CLOCK = realNow();
const useClock = () => { Date.now = () => CLOCK; };
test.after(() => { Date.now = realNow; });

const soul = id => ({ id, who: `ผู้ทดสอบ${id}`, sp: 1, sex: 'm', deserved: 3, deeds: [{ w: 3, s: 'kong', t: 'กรรม', known: true }], merits: [] });
const station = k => ({ def: STATIONS.find(x => x.k === k), slots: [], crewK: null, build: 0, repair: 0, fire: 0 });
const ALL_STATIONS = ['tarang', 'sala', 'krata', 'dab', 'ngiw', 'lokan', 'lan', 'sawan', 'krajok', 'canteen', 'tea'];
function setup(zone = 'th') {
  resetWalk(); CLOCK = realNow(); useClock();
  const g = createGame(); g.save = () => true; g.onChange = () => {};
  g.coin = 99999; g.food = 999;
  if (zone !== 'th') { assert.equal(harbourTravel(g, zone), true); g.coin = 99999; g.food = 999; }
  for (const k of ALL_STATIONS) if (!g.stations.some(s => s.def.k === k)) g.stations.push(station(k));
  g.syncBlocks?.(true);
  for (const k of ['plerng', 'kan', 'boon', 'dam']) g.hire(k);
  g.queue = []; g.courtArrivals = [];
  return g;
}
const run = (g, ms, each, step = 250) => { for (let t = 0; t < ms; t += step) { CLOCK += step; g.stepWorld(step); g.advanceAfterlife(step); each?.(); } };

/** the rules: at most one body in the world (map / escort walk / pick-up), standing reapers have exactly one, and nobody stands in a room that is not where he really is */
function checkBodies(g, label) {
  for (const c of g.crew) {
    const views = crewViews(g, c);
    const world = views.filter(v => ['map', 'walk', 'transit'].includes(v));
    assert.ok(world.length <= 1, `${label}: ${c.k} drawn ${world.length}x in the world: ${views}`);
    if (actorStanding(c) && c.x != null && !g.mapTravel) assert.equal(world.length + (views.includes('canteen-room') ? 1 : 0), 1, `${label}: ${c.k} has no body at all: ${views}`);
    const away = crewAwayReason(g, c);
    for (const v of views.filter(x => x.startsWith('room-'))) {
      const room = v.split(':')[1];
      if (v.startsWith('room-resident')) assert.equal(away, null, `${label}: resident ${c.k} stands in ${room} while away (${away})`);
      else assert.equal(c.at, room, `${label}: keeper ${c.k} stands in ${room} but works at ${c.at}`);
    }
    // two different rooms at once is only allowed for Dam's two sword groves (they are the same sword school office, one room is open at a time)
    const rooms = new Set(views.filter(x => x.startsWith('room-')).map(x => x.split(':')[1]));
    if (c.k !== 'dam') assert.ok(rooms.size <= 1, `${label}: ${c.k} stands in several rooms ${[...rooms]}`);
  }
}

test('G6: the reaper who is away guarding another station is NOT standing in his own room (the reported double Plerng)', () => {
  const g = setup();
  g.queue.push(soul(9001));
  assert.equal(g.assign(9001, 'dab', 'plerng', 3), true);
  const p = g.crewOf('plerng');
  assert.equal(residentPresent(g, 'krata'), false, 'Plerng is busy with the sword grove - the kettle hall has no Plerng');
  assert.equal(crewViews(g, p).some(v => v === 'room-resident:krata'), false);
  assert.equal(residentPresent(g, 'sawan'), true, 'Boon is free: still stands at the heaven gate');
  assert.equal(residentPresent(g, 'ngiw'), true, 'Dam is free');
  checkBodies(g, 'after assign');
});

/** how far a free reaper is from the post he waits at: his own building's front yard (Dam: canteen, Plerng: kettle hall) or his home point */
function homeDistance(c) {
  const sk = CREW_HOME_STATION[c.k], d = sk && STATIONS.find(s => s.k === sk);
  const [x, y] = (sk === 'canteen' || sk === 'krata') && d ? [d.x, d.y] : [c.hx, c.hy];
  return Math.hypot(c.x - x, c.y - y);
}

let seq = 9100;
function runJob(g, crewK, stK, label, tailMs = 90000) {
  g.queue.push(soul(++seq));
  assert.equal(g.assign(seq, stK, crewK, 3), true, `${label}: assign`);
  checkBodies(g, label + ' / assigned');
  const seen = new Set();
  const busy = () => g.stations.some(s => s.slots.length) || g.afterlifeWalks.length || g.transits.some(v => CLOCK < (v.arriveAt || 0));
  let idle = 0;
  for (let i = 0; i < 4000 && idle < tailMs; i++) {            // until the job is over, then 90 s more for the walk back to the post
    run(g, 500, () => { checkBodies(g, label); for (const v of crewViews(g, g.crewOf(crewK))) seen.add(v); }, 500);
    idle = busy() ? 0 : idle + 500;
  }
  return seen;
}
const finished = (g, crewK, label) => {
  const c = g.crewOf(crewK);
  assert.equal(c.at ?? null, null, `${label}: released from the station`);
  assert.equal(c.escort ?? null, null, `${label}: no escort left`);
};

test('G6 zone 1: one body per reaper through every job (assign -> fetch the soul -> guard -> escort to the cells) and each one is back at his post', () => {
  for (const [crewK, stK] of [['plerng', 'dab'], ['plerng', 'krata'], ['kan', 'lokan'], ['boon', 'dab'], ['taan', 'ngiw']]) {
    const g = setup(), label = `${crewK}@${stK}`;
    const seen = runJob(g, crewK, stK, label);
    finished(g, crewK, label);
    for (const v of ['transit', 'map', 'walk'].concat(crewK === 'taan' ? [] : [`room-guard:${stK}`])) assert.ok(seen.has(v) || v === 'transit', `${label}: the job was really played through (${v})`);
    assert.ok(homeDistance(g.crewOf(crewK)) <= HOME_RADIUS, `${label}: back at his post, ${Math.round(homeDistance(g.crewOf(crewK)))} away`);
  }
});

test('G6 zones 2-4: same rule (plerng sent to a grove and back, kan walks to the mirror tower, nobody drawn twice)', () => {
  for (const zone of ['asia', 'west', 'cyberhell']) {
    const g = setup(zone), label = `${zone}:plerng@dab`;
    assert.equal(g.zone, zone);
    const seen = runJob(g, 'plerng', 'dab', label, 60000);
    finished(g, 'plerng', label);
    assert.ok(seen.has('room-guard:dab') && seen.has('walk'), label + ' played through');
    assert.ok(homeDistance(g.crewOf('plerng')) <= HOME_RADIUS, `${label}: back at the kettle hall`);
    const kan = g.crewOf('kan');            // Kan has been strolling around her post all through the job
    const krajok = STATIONS.find(s => s.k === 'krajok');
    assert.ok(Math.hypot(kan.hx - krajok.x, kan.hy - krajok.y) < 200, `${zone}: Kan's post is beside the mirror tower (${Math.round(Math.hypot(kan.hx - krajok.x, kan.hy - krajok.y))})`);
    assert.ok(homeDistance(kan) <= HOME_RADIUS, `${zone}: Kan is at the mirror tower, ${Math.round(homeDistance(kan))} away`);
    checkBodies(g, zone);
  }
});

test('G6: Dam waits at the canteen - desk beside it once the kitchen stands with workers; his post is the canteen door before that', () => {
  const g = setup();
  const dam = g.crewOf('dam'), canteen = STATIONS.find(s => s.k === 'canteen');
  assert.ok(Math.hypot(dam.hx - canteen.x, dam.hy - canteen.y) < 200, 'home point beside the canteen');
  g.zoneEvents.th ||= {}; g.zoneEvents.th.frontierBreach = 'cleared';
  assert.ok(g.hireWorker('cook'));
  dam.x = 300; dam.y = 1500; dam.path = null;                       // far away (after a job)
  run(g, 150000, () => checkBodies(g, 'dam-desk'));
  assert.ok(Math.hypot(dam.x - canteen.x, dam.y - canteen.y) < 220, `Dam stands by the canteen (${Math.round(Math.hypot(dam.x - canteen.x, dam.y - canteen.y))})`);
});

test('G6: a courier walk (Dam walking a soul back to the queue) is the ONLY Dam on the map while it lasts, then he stands where the soul ends', () => {
  const g = setup();
  const dam = g.crewOf('dam'), prison = g.stations.find(s => s.def.k === 'tarang').def;
  const soulBack = soul(9990), tailPt = [1700, 1200];
  assert.ok(g.startAfterlifeWalk(soulBack, [prison.x, prison.y], tailPt, 'queue', null, null, 'dam'));
  const walk = g.afterlifeWalks.at(-1);
  assert.equal(walk.courier, 'dam');
  checkBodies(g, 'courier start');
  assert.deepEqual(crewViews(g, dam).filter(v => ['map', 'walk', 'transit'].includes(v)), ['walk'], 'only the walking Dam is drawn, not a second one standing on the map');
  let guard = 0;
  while (g.afterlifeWalks.includes(walk) && guard++ < 400) { g.advanceAfterlife(250); g.stepWorld(250); checkBodies(g, 'courier walk'); }
  assert.ok(!g.afterlifeWalks.includes(walk));
  assert.deepEqual(crewViews(g, dam).filter(v => ['map', 'walk', 'transit'].includes(v)), ['map']);
  const end = walk.path.at(-1);
  assert.ok(Math.hypot(dam.x - end[0], dam.y - end[1]) < 200, 'Dam ends beside the soul');
});

test('G6: the Guard has one body too and goes back to his gate post in every zone', () => {
  for (const zone of ['th', 'asia', 'west', 'cyberhell']) {
    const g = setup(zone);
    g.guard = actorFromLegacy({ x: GUARD_POST[0], y: GUARD_POST[1] }, zone, 'guard'); syncRoster(g);   // the hire rules are not what is tested here
    const post = nearestWalk(GUARD_POST[0], GUARD_POST[1]) || GUARD_POST;
    const far = nearestWalk(600, 1400) || [600, 1400];
    Object.assign(g.guard, { x: far[0], y: far[1], path: null, target: null });
    g.mobs = [];
    run(g, 100000, null, 500);
    assert.ok(Math.hypot(g.guard.x - GUARD_POST[0], g.guard.y - GUARD_POST[1]) < 12, `${zone}: the Guard is at the gate post (${Math.round(Math.hypot(g.guard.x - GUARD_POST[0], g.guard.y - GUARD_POST[1]))} away)`);
  }
});
