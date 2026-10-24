// B1: stage-local opaque bounds; no combat arithmetic or random rolls here.
const MELEE_ACTIONS = new Set(['atk', 'strike', 'guard', 'crew:taan', 'crew:dam']);
export const isMeleeAction = action => MELEE_ACTIONS.has(action);
export function planDash(source, target, gap = 8) {
  const right = (target.l + target.r) >= (source.l + source.r);
  return { x:right ? target.l - gap - source.r : target.r + gap - source.l,
    y:target.b - source.b, face:right ? 1 : -1 };
}
export function dashTiming({ contact = 260, pose = 580, reduced = false, leadIn = 0 } = {}) {
  const launch = Math.max(0, leadIn) + (reduced ? 0 : 60), travel = reduced ? 0 : 170;
  const arrive = launch + travel, hit = arrive + contact;
  const returning = arrive + Math.max(pose, contact + 100);
  return { launch, arrive, hit, returning, end:returning + travel, reduced };
}
export function dashPosition(elapsed, delta, timing) {
  if (timing.reduced) return { x:0, y:0 };
  let p = elapsed < timing.launch ? 0 : elapsed < timing.arrive
    ? (elapsed - timing.launch) / (timing.arrive - timing.launch)
    : elapsed < timing.returning ? 1 : elapsed < timing.end
    ? 1 - (elapsed - timing.returning) / (timing.end - timing.returning) : 0;
  p = Math.max(0, Math.min(1, p));
  return { x:delta.x * p || 0, y:delta.y * p || 0 };
}
// A single monotonic clock dispatches each event once, even when a background tab skips frames.
// finish is deliberately after the position has returned to zero.
export function createDashSequence({ timing, delta, onPosition, onPose, onHit, onReturn, onFinish }) {
  const fired = new Set();
  return elapsed => {
    if (fired.has('finish')) return;
    onPosition(dashPosition(elapsed, delta, timing));
    for (const [name, at, fn] of [['pose',timing.arrive,onPose],['hit',timing.hit,onHit],
      ['return',timing.returning,onReturn],['finish',timing.end,onFinish]]) {
      if (elapsed >= at && !fired.has(name)) { fired.add(name); if (fn?.() === false) { fired.add('finish'); return; } }
    }
  };
}
