// Presentation only. Receipts are already paid by the game; nothing here grants a reward.
const amount = n => Number.isFinite(Number(n)) ? Math.max(0, Math.round(Number(n))) : 0;
export function rewardView(receipt = {}) {
  const items = new Map();
  for (const item of receipt.items || []) {
    const n = amount(item.n);
    if (item.k && n) items.set(item.k, (items.get(item.k) || 0) + n);
  }
  return { coin:amount(receipt.coin), exp:amount(receipt.exp),
    items:[...items].map(([k,n]) => ({k,n})),
    weapons:[...new Set(receipt.weapons || [])], abilities:[...new Set(receipt.abilities || [])] };
}

/** Counts display values only. Identity guards and cancellation prevent stale dialog writes. */
export function startRewardCount({ coin = 0, exp = 0, reduced = false, duration = 750,
  onUpdate = () => {}, onDone = () => {}, isCurrent = () => true,
  now = () => performance.now(), raf = fn => requestAnimationFrame(fn), caf = id => cancelAnimationFrame(id),
  schedule = (fn,ms) => setTimeout(fn,ms), unschedule = id => clearTimeout(id) } = {}) {
  const totals = {coin:amount(coin),exp:amount(exp)}, start = now();
  const ms = Math.max(0, Math.min(800, duration));
  let frame = null, deadline = null, done = false, stopped = false;
  const cancelFrame = () => { if (frame !== null) { caf(frame); frame = null; } if (deadline !== null) { unschedule(deadline); deadline = null; } };
  const cancel = () => { stopped = true; cancelFrame(); };
  const finish = () => {
    if (stopped || done) return false;
    if (!isCurrent()) { cancel(); return false; }
    done = true; cancelFrame(); onUpdate({...totals}); onDone({...totals}); return true;
  };
  const tick = () => {
    frame = null;
    if (stopped || done) return;
    if (!isCurrent()) { cancel(); return; }
    const t = Math.min(1, Math.max(0, (now() - start) / ms));
    if (t >= 1) { finish(); return; }
    const eased = 1 - (1 - t) ** 3;
    onUpdate({coin:Math.floor(totals.coin * eased),exp:Math.floor(totals.exp * eased)});
    frame = raf(tick);
  };
  if (reduced || !ms || (!totals.coin && !totals.exp)) finish();
  else if (isCurrent()) { onUpdate({coin:0,exp:0}); frame = raf(tick); deadline = schedule(finish,ms); }
  else cancel();
  return { skip:finish, cancel, get done() { return done; } };
}

export function selectedLivingFoeId(battle) {
  const living = (battle?.foes || []).filter(f => f.hp > 0);
  return (living.find(f => f.id === battle.selectedFoeId) || living[0])?.id ?? null;
}
export function battleStatuses(actor, { defending = false, rage = 0 } = {}) {
  if (!actor || actor.hp <= 0 || actor.morale <= 0) return [];
  const list = [];
  for (const key of ['stun','confuse']) if (actor[key] > 0) list.push({key,n:actor[key]});
  if (actor.burn?.turns > 0) list.push({key:'burn',n:actor.burn.turns});
  if (defending) list.push({key:'defend',n:1});
  if (rage > 0) list.push({key:'rage',n:rage});
  return list;
}
export const SPECIAL_MOVES = Object.freeze(['fire','flameCharge','windFan','rage','valkyrieSpear','ice','hypno','cooldownClock','guard',
  'crew:nira','crew:taan','crew:plerng','crew:dam','crew:kan','crew:boon']);
export function specialMoveKey(action, ultimate = null) {
  return ultimate ? 'enemy' : SPECIAL_MOVES.includes(action) ? action : null;
}
