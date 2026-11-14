// foreman.js - Dam (Kuro / Noir / Darknet) as the workers' foreman (owner 14 Nov 2026).
//   "จ้างดำแล้ว ไปรับวิญญาณแทนนิรา และทำหน้าที่แทนคนงานก่อนที่จะจ้างได้ ช่วยสร้าง ช่วยซ่อม เก็บของขาย เอาข้าวปั้นไปแจก
//    และเมื่อจ้างคนงานแล้ว ดำจะไปคุมพ่อครัวที่โรงอาหาร ... ไปคุยเพื่อสั่งให้ จ้างพ่อครัว เด็กเสิร์ฟ หรือส่งข้าวปั้นส่งใคร"
// Three states, all worked out from the save every frame - nothing new is stored (old saves just land in the right state):
//   'none'    Dam is not hired, is down (recovering) or is a station keeper the player chose -> Nira picks the souls up exactly as before
//   'field'   Dam is hired and the zone has NO workers yet -> he is the one-man crew: picks souls up at the harbour (instead of Nira), builds and repairs
//             (the old builder rule in game.js), carries cut thorns / shards to the merchant for coins, and walks rice balls to hungry crew
//   'canteen' the zone has workers -> the real workers take over those jobs; Dam stands at the canteen and is talked to for the kitchen orders
// Job state lives on the crew object (c.fm*) and is never saved: a reload simply picks the next job. Rice leaves the stock only at the hand-over, so a reload can lose nothing.
import { nearestWalk, findPath, stepTo } from './walk.js?v=k1d';
import { MERCHANT } from './data.js';
import { t } from './i18n.js';
import { actorStanding } from './actor-recovery.js';
import { canteenBuilt, canteenPoint, mealRecipients, mealRecipient, needsMeal, feedActor, foodAvailable } from './canteen.js';
import { zoneWorkers, workerStandbyPoint } from './workers.js';

export const FOREMAN = Object.freeze({
  k:'dam', workMs:1800,                 // standing time at the thorn / shard station and at the merchant (same as a worker: workers.js gather)
  sale:Object.freeze({ ngiwWood:5, dabShards:7 }),   // coins per trip (same as a worker); no wage and no food cost for him
  meet:40,                              // hands the rice over this close to the crew member (same reach a server uses)
  arrive:24, speed:.11,                 // walking speed per ms (same as workers / crew)
  retryMs:600, giveUpAfter:3,           // path search cooldown; unreachable goal -> drop the job after this many empty searches
  sayGapMs:9000,                        // minimum time between his lines
  deskOffset:Object.freeze([[-72,38],[72,38],[-72,-8],[72,-8],[0,84]]),   // where he stands next to the kitchen (first walkable one)
});

export const foremanCrew = g => g.crew?.find(c => c.k === FOREMAN.k) || null;
/** hired, on his feet, not tied to a station post the player gave him, not travelling */
export const foremanPresent = g => { const c = foremanCrew(g); return !!c && actorStanding(c) && !c.self && !c.at && !g.mapTravel; };
/** present and not already walking a soul / building / eating */
export const foremanFree = (g, c = foremanCrew(g)) => foremanPresent(g) && !c.escort && !c.buildK && !c.eatOrder && !c.cook;
export const foremanPhase = g => !foremanPresent(g) ? 'none' : zoneWorkers(g).length ? 'canteen' : 'field';
/** the crew member who walks a docked soul to the queue instead of Nira (null = Nira's old rule applies) */
export const foremanCourier = g => foremanPhase(g) === 'field' && foremanFree(g) ? foremanCrew(g) : null;
/** the desk where the player talks to him about the kitchen (null = kitchen orders stay at the canteen window) */
export function foremanDesk(g) {
  if (foremanPhase(g) !== 'canteen' || !canteenBuilt(g)) return null;
  const c = foremanCrew(g);
  return c.x == null ? null : { crew:c, x:c.x, y:c.y };
}
/** the job he is doing right now, for the talk window ('' = nothing) */
export const foremanDuty = g => {
  const c = foremanCrew(g), phase = foremanPhase(g);
  if (phase === 'canteen') return canteenBuilt(g) ? 'canteen' : 'idle';
  if (phase === 'field') return c.escort ? 'escort' : c.buildK ? 'build' : c.fm?.kind || 'idle';
  return '';
};

/** one of his lines in a speech bubble (existing crew bubble: c.say / c.sayUntil) - the same line not more often than sayGapMs */
export function foremanSay(c, key, now = Date.now()) {
  if (!c || (c.fmSayKey === key && (c.fmSayAt || 0) + FOREMAN.sayGapMs > now)) return;   // the same line is not repeated at once; a different job gets its own line straight away
  c.fmSayAt = now; c.fmSayKey = key; c.say = t(key, { name:c.name }); c.sayUntil = now + 4200;
}

const clear = c => { c.fm = null; c.fmWork = false; c.fmCarry = null; c.fmTarget = null; c.fmFail = 0; };
const posOf = a => [a.x ?? a.hx, a.y ?? a.hy];

/** walk along a path to `goal` at crew speed; true = arrived. One A* per FOREMAN.retryMs. */
function walk(c, goal, dt) {
  if (!goal) { c.fmFail = (c.fmFail || 0) + 1; return false; }
  if (Math.hypot(goal[0] - c.x, goal[1] - c.y) < FOREMAN.arrive) { c.path = null; c.moving = false; return true; }
  c.fmRetry = Math.max(0, (c.fmRetry || 0) - Math.min(dt, 120));
  if ((!c.path?.length || !c.fmTarget || Math.hypot(c.fmTarget[0] - goal[0], c.fmTarget[1] - goal[1]) > 30) && !c.fmRetry) {
    c.path = findPath(c.x, c.y, goal[0], goal[1]); c.fmTarget = goal; c.fmRetry = FOREMAN.retryMs;
    if (!c.path?.length) c.fmFail = (c.fmFail || 0) + 1; else c.fmFail = 0;
  }
  const next = c.path?.[0];
  if (next) {
    const dx = next[0] - c.x, dy = next[1] - c.y, d = Math.hypot(dx, dy);
    if (d < 2) c.path.shift();
    else {
      const step = Math.min(d, FOREMAN.speed * Math.min(dt, 120));
      if (!stepTo(c, dx / d * step, dy / d * step)) c.path = null;
      if (Math.abs(dx) > 1) c.face = dx < 0 ? -1 : 1;
    }
  }
  return false;
}

/** where he stands beside the kitchen (the first free walkable spot of FOREMAN.deskOffset) */
export function deskPoint(g) {
  const [cx, cy] = canteenPoint(g) || [0, 0];
  for (const [dx, dy] of FOREMAN.deskOffset) { const p = nearestWalk(cx + dx, cy + dy); if (p) return p; }
  return [cx, cy];
}

const gatherStation = (g, material) => g.stations.find(st => st.def.k === (material === 'dabShards' ? 'dab' : 'ngiw') && !st.build && !st.repair);
function pickJob(g, c) {
  // 1. hungry crew first (the central stock or the kitchen's ready meals - whichever the give button would use)
  if (foodAvailable(g) >= 1) {
    const r = mealRecipients(g).filter(x => x.id !== c.id && x.stamina == null && needsMeal(x)).sort((a, b) => (a.hunger ?? 100) - (b.hunger ?? 100))[0];
    if (r) return { kind:'feed', id:r.id };
  }
  // 2. cut thorns / dig shards and sell them, alternating between the two when both stations stand
  const materials = ['ngiwWood', 'dabShards'].filter(m => gatherStation(g, m));
  if (materials.length) return { kind:'gather', material:materials[(c.fmTrips || 0) % materials.length], phase:'collect', worked:0 };
  return null;
}
function jobValid(g, c, job) {
  if (job.kind === 'feed') { const r = mealRecipient(g, job.id); return !!r && needsMeal(r) && foodAvailable(g) >= 1; }
  if (job.kind === 'gather') return job.phase === 'sell' || !!gatherStation(g, job.material);
  return false;
}

/** called once per crew member per frame from game.js stepWorld (crew loop). true = he handled this frame's movement, so the normal roaming is skipped. */
export function advanceForeman(g, c, dt) {
  if (c?.k !== FOREMAN.k || !(dt > 0)) return false;
  const phase = foremanPhase(g);
  if (phase === 'none' || !foremanFree(g, c) || g.paused || g.over || g.battle) { if (c.fm || c.fmWork || c.fmCarry) clear(c); return false; }
  if (c.x == null) return false;
  if (phase === 'canteen') {
    clear(c);
    if (!canteenBuilt(g)) return false;                       // no kitchen yet: he roams around his post as before
    const arrived = walk(c, deskPoint(g), dt);
    if (!arrived && c.fmFail >= FOREMAN.giveUpAfter) { c.fmFail = 0; return false; }   // cannot reach the desk: the normal roaming takes over this frame
    if (arrived && Math.random() < .0003 * Math.min(dt, 120)) foremanSay(c, 'foreman.say.desk');
    return true;
  }
  // ---- 'field': the one-man crew ----
  c.fmCool = Math.max(0, (c.fmCool || 0) - dt);
  let job = c.fm;
  if (job && !jobValid(g, c, job)) { clear(c); c.fmCool = 800; job = null; }
  // between thorn trips a hungry crew member comes first; a load already on his back is delivered first
  if (!c.fmCool && (!job || job.kind === 'gather' && job.phase === 'collect' && !c.fmCarry && !job.worked)) {
    const next = pickJob(g, c);
    if (next && (!job || next.kind === 'feed')) { if (!job && next.kind === 'gather') c.fmTrips = (c.fmTrips || 0) + 1; c.fm = job = next; c.fmWork = false; c.path = null; c.fmFail = 0; foremanSay(c, next.kind === 'feed' ? 'foreman.say.feed' : 'foreman.say.gather'); }
  }
  if (!job) {
    // nothing to do: wait on the flat plaza in the middle of the map (the assistants' standby), not at his far post - the next soul at the harbour is then fetched sooner
    // (a pickup from his old post took ~32 s against Nira's ~18 s); not on the pier, where a man standing still would shut the way for Yama
    c.fmWork = false; c.fmCarry = null;
    const standby = workerStandbyPoint(0);
    if (!standby) return false;
    walk(c, standby, dt);
    if (c.fmFail >= FOREMAN.giveUpAfter) { c.fmFail = 0; return false; }   // no way there: ordinary roaming around his post
    return true;
  }
  if (job.kind === 'feed') {
    const r = mealRecipient(g, job.id), [rx, ry] = posOf(r);
    c.fmCarry = 'rice'; c.fmWork = false;
    if (Math.hypot(rx - c.x, ry - c.y) < FOREMAN.meet) {
      if (feedActor(g, r.id)) g.log?.(t('foreman.log.fed', { name:c.name, who:r.name }), 'good');
      clear(c); c.fmCool = 600; return true;
    }
    const goal = c.fmGoalFor === r.id && Math.hypot(c.fmGoalSrc[0] - rx, c.fmGoalSrc[1] - ry) <= 24 ? c.fmGoal : nearestWalk(rx, ry);
    if (goal !== c.fmGoal) { c.fmGoal = goal; c.fmGoalFor = r.id; c.fmGoalSrc = [rx, ry]; }
    walk(c, goal, dt);
    if (c.fmFail >= FOREMAN.giveUpAfter) { clear(c); c.fmCool = 3000; }
    return true;
  }
  // gather: collect at the station -> carry to the merchant -> sell
  const collecting = job.phase === 'collect';
  const st = collecting ? gatherStation(g, job.material) : null;
  const goal = collecting ? nearestWalk(st.def.x - 34, st.def.y + 36) : nearestWalk(MERCHANT.x, MERCHANT.y);
  if (walk(c, goal, dt)) {
    c.fmWork = true; c.fmFail = 0; job.worked = (job.worked || 0) + Math.min(dt, 120);
    if (job.worked >= FOREMAN.workMs) {
      job.worked = 0; c.fmWork = false;
      if (collecting) { c.fmCarry = job.material === 'dabShards' ? 'shards' : 'wood'; job.phase = 'sell'; c.path = null; }
      else { g.coin += FOREMAN.sale[job.material]; clear(c); c.fmCool = 400; }
    }
  } else {
    c.fmWork = false;
    if (c.fmFail >= FOREMAN.giveUpAfter) { clear(c); c.fmCool = 4000; }
  }
  return true;
}
