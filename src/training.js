// B4 — training sessions on top of the B3 progression state (src/progression.js).
// B3 owns the numbers (EXP table, zone caps, multipliers) and already feeds them into combat
// through g.allyStats()/g.normalAttack(); this module only awards EXP into that same state, so
// a finished session changes the real battle power with no second formula.
// Record shape (B3): training.shared['global:yama'] | training.zones[zone][rosterId]
//   { exp, level, readyAtTick, attempts:{ window, count } } · training.activeSession · training.sequence
import { ALLY_ZONE_SCALE, TRAINING_RULES, TRAINING_STATIONS } from './data.js?v=minigame-review-20261011';
import { trainingLevel as levelFromExp } from './progression.js';

export const HERO_TRAINING_ID = 'global:yama';
const integer = n => Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;

export const scoreExp = score => {
  if (!Number.isFinite(score) || score < 60 || score > 100) return 0;
  return TRAINING_RULES.rewards.reduce((exp, r) => score >= r.score ? r.exp : exp, 0);
};

const hero = () => ({ id:HERO_TRAINING_ID, kind:'yama', homeZone:'global', name:'ยมบาทน้อย / Young Yama' });
const actorOf = (g, id) => id === HERO_TRAINING_ID ? hero() : g.roster?.[id] || null;
const isShared = actor => actor.kind === 'yama' || actor.kind === 'nira';
const homeOf = (g, actor) => isShared(actor) ? 'global' : actor.homeZone || g.zone;
const capLevel = (actor, home) => isShared(actor) ? TRAINING_RULES.exp.length : (ALLY_ZONE_SCALE[home] || ALLY_ZONE_SCALE.th).cap;
const capExp = (actor, home) => TRAINING_RULES.exp[capLevel(actor, home) - 1];
const blank = () => ({ exp:0, level:1, readyAtTick:0, attempts:{} });
/** Read-only view (never creates a record). */
const peek = (g, actor) => (isShared(actor) ? g.training?.shared?.[actor.id] : g.training?.zones?.[homeOf(g, actor)]?.[actor.id]) || blank();
/** Writable record, created on first use. */
function ref(g, actor) {
  const t = g.training;
  if (isShared(actor)) return t.shared[actor.id] ||= blank();
  return (t.zones[homeOf(g, actor)] ||= {})[actor.id] ||= blank();
}
const levelOf = (g, actor) => levelFromExp(peek(g, actor).exp, homeOf(g, actor), isShared(actor));
/** Training-only multiplier shown to the player (zone scaling is separate and unchanged). */
const powerMultiplier = (actor, level) => actor.kind === 'yama'
  ? 1 + TRAINING_RULES.yamaPerLevel * (level - 1) : TRAINING_RULES.multipliers[level - 1];

export function trainingTargets(g, station) {
  const def = TRAINING_STATIONS[station];
  if (!def) return [];
  return def.actors.flatMap(kind => kind === 'yama' ? [hero()]
    : Object.values(g.roster || {}).filter(a => a.kind === kind && (isShared(a) || a.homeZone === g.zone)));   // B8: Nira is global (homeZone 'global'), she trains from any zone
}

export function trainingProgress(g, actorId) {
  const actor = actorOf(g, actorId);
  if (!actor) return { exp:0, level:1, cap:1 };
  return { exp:peek(g, actor).exp, level:levelOf(g, actor), cap:capLevel(actor, homeOf(g, actor)) };
}

export function trainingWhy(g, station, actorId) {
  const st = g.stations.find(s => s.def.k === station);
  if (!st || st.build) return 'สถานียังไม่พร้อม / Station unavailable';
  if (g.paused || g.over) return 'เกมหยุดอยู่ / Game paused';
  if (g.training?.activeSession) return 'กำลังฝึก / Training in progress';
  const actor = trainingTargets(g, station).find(a => a.id === actorId);
  if (!actor) return 'เลือกผู้ฝึกในโซนนี้ / Select a trainee in this zone';
  const rec = peek(g, actor), home = homeOf(g, actor);
  if (levelOf(g, actor) >= capLevel(actor, home)) return 'ถึงเพดานโซน / Zone level cap reached';
  if (g.tick < rec.readyAtTick) return `รอ ${rec.readyAtTick - g.tick} วาระ / ticks`;
  if (rec.attempts?.window === Math.floor(g.tick / TRAINING_RULES.windowTicks) && rec.attempts.count >= TRAINING_RULES.attemptsPerWindow)
    return `ครบ ${TRAINING_RULES.attemptsPerWindow} ครั้งในช่วง ${TRAINING_RULES.windowTicks} วาระ / Attempt limit`;
  return '';
}

/** Spends the attempt + cooldown and opens the session. Caller must save before play (rolls back otherwise). */
export function beginTraining(g, station, actorId) {
  if (trainingWhy(g, station, actorId)) return null;
  const actor = actorOf(g, actorId), rec = ref(g, actor), state = g.training;
  const window = Math.floor(g.tick / TRAINING_RULES.windowTicks);
  rec.attempts = { window, count:(rec.attempts?.window === window ? integer(rec.attempts.count) : 0) + 1 };
  rec.readyAtTick = g.tick + TRAINING_RULES.cooldownTicks;
  state.sequence = integer(state.sequence) + 1;
  const session = { id:`training:${state.sequence}`, actorId, zone:g.zone, station, seed:state.sequence * 2654435761 >>> 0 };
  state.activeSession = session;
  return { ...session };
}

/** Accepts only the active session's id; clears the session in the same step so duplicates reward nothing. */
export function finishTraining(g, result) {
  const state = g.training, session = state?.activeSession;
  if (!session || result?.sessionId !== session.id) return null;
  state.activeSession = null;
  const actor = actorOf(g, session.actorId);
  if (!actor) return null;
  const rec = ref(g, actor), home = homeOf(g, actor), before = levelOf(g, actor);
  const earned = result.completed === true && g.zone === session.zone ? scoreExp(result.score) : 0;
  const gained = Math.max(0, Math.min(capExp(actor, home), rec.exp + earned) - rec.exp);
  rec.exp += gained;
  rec.level = levelOf(g, actor);
  const cap = capLevel(actor, home);
  return { actorId:actor.id, score:result.score, exp:gained, before, level:rec.level,
    total:rec.exp, next:rec.level >= cap ? null : TRAINING_RULES.exp[rec.level],
    multiplierBefore:powerMultiplier(actor, before), multiplierAfter:powerMultiplier(actor, rec.level) };
}
