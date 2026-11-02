// Recovery uses wall time; special moves use explicitly advanced battle time.
export const RECOVERY_MS = 120000;
export const actorStanding = actor => !!actor && !actor.recoverUntil && !actor.teaRest && (actor.morale ?? 100) > 0;
export const specialCooldown = actor => actor?.k === 'guard' ? (actor.helpCooldownSeconds || 20) : 120;
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
/** รวมน้ำหนักเป้าทั้งหมดของฝั่งเรา (ยมบาท 2 + crew 1 + Guard 3) — ใช้คำนวณตัวคูณสมดุลของศัตรู */
export function targetWeight(crew, guard) {
  return 2 + crew.filter(actorStanding).length + (actorStanding(guard) ? 3 : 0);
}

// Old deadlines were one minute after the fall. Retain elapsed wall time once.
export function migrateActorRecovery(actor, now = Date.now()) {
  if (actor.k === 'guard' || actor.recoveryVersion === 2) return actor;
  if (actor.recoverUntil) actor.recoverUntil += RECOVERY_MS - 60000;
  else if (actor.morale === 0 && !actor.teaRest) actor.recoverUntil = now + RECOVERY_MS;
  actor.recoveryVersion = 2;
  return actor;
}
