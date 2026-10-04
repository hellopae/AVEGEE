// Recovery uses wall time; special moves use explicitly advanced battle time.
export const RECOVERY_MS = 60000;
export const actorStanding = actor => !!actor && !actor.recoverUntil && (actor.morale ?? 100) > 0;
export const specialCooldown = actor => actor?.k === 'guard' || actor?.k === 'boon' ? 20 : 15;
export function weightedTarget(crew, guard, random = Math.random) {
  const targets = [{id:'you',weight:2}, ...crew.filter(actorStanding).map(actor => ({id:actor.id,actor,weight:1})),
    ...(actorStanding(guard) ? [{id:guard.id,actor:guard,weight:3}] : [])];
  let pick = random() * targets.reduce((sum,t) => sum+t.weight,0);
  return targets.find(t => (pick -= t.weight) < 0) || targets.at(-1);
}
export function recoverActor(actor, now, safePoint) {
  if (!actor.recoverUntil || now < actor.recoverUntil) return false;
  actor.recoverUntil = 0; actor.morale = 50;
  [actor.x,actor.y] = safePoint; actor.path = null;
  return true;
}
