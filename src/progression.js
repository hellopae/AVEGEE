import { ALLY_ZONE_SCALE, TRAINING_RULES, CREW_POWER, ITEMS, MERCHANT_STOCK_BY_ZONE } from './data.js';

const count = value => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
export function migrateStatTraining(actor) {
  // Old saves cannot identify which paid upgrades were strength. Preserve their
  // historical combat bonus once; future non-strength upgrades add no damage.
  actor.statTraining = actor.statTraining ? {
    raeng:count(actor.statTraining.raeng), rabiab:count(actor.statTraining.rabiab),
    panya:count(actor.statTraining.panya), metta:count(actor.statTraining.metta),
  } : { raeng:count(actor.upLv), rabiab:0, panya:0, metta:0 };
  return actor;
}
export function trainingLevel(exp, zone = 'th', shared = false) {
  const cap = shared ? TRAINING_RULES.exp.length : (ALLY_ZONE_SCALE[zone] || ALLY_ZONE_SCALE.th).cap;
  let level = 1;
  for (let i=1; i<cap; i++) if (count(exp) >= TRAINING_RULES.exp[i]) level = i+1;
  return level;
}
const record = (value, zone, shared) => ({ exp:count(value?.exp),
  level:trainingLevel(value?.exp, zone, shared), readyAtTick:count(value?.readyAtTick),
  attempts:{ ...(value?.attempts || {}) } });
export function normalizeTraining(value = {}) {
  value ||= {};
  return { version:1,
    shared:Object.fromEntries(['yama','nira'].map(k => [`global:${k}`,record(value.shared?.[`global:${k}`], 'th', true)])),
    zones:Object.fromEntries(Object.entries(value.zones || {}).map(([zone,actors]) => [zone,
      Object.fromEntries(Object.entries(actors || {}).map(([id,v]) => [id,record(v,zone,false)]))])),
    // B4: รอบฝึกที่กำลังเล่นต้องรอดผ่าน snapshot ตอนเริ่ม (ไม่งั้นส่งผลกลับมาไม่ได้) · createGame.restore ล้างทิ้งเองตอนโหลดเซฟ
    sequence:count(value.sequence),
    activeSession:value.activeSession && typeof value.activeSession.id === 'string' ? { ...value.activeSession } : null };
}
export function actorTraining(training, actor, zone = 'th') {
  const kind = typeof actor === 'string' ? actor : actor.kind || actor.k;
  const shared = kind === 'yama' || kind === 'nira';
  const home = shared ? 'global' : actor.homeZone || zone;
  const id = shared ? `global:${kind}` : actor.id || `${home}:${kind}`;
  return record(shared ? training?.shared?.[id] : training?.zones?.[home]?.[id], home, shared);
}
export function effectiveAllyStats(actor, zone = 'th', training) {
  const kind = typeof actor === 'string' ? actor : actor.kind || actor.k;
  const home = typeof actor === 'string' ? zone : actor.homeZone === 'global' ? zone : actor.homeZone || zone;
  const scale = ALLY_ZONE_SCALE[home] || ALLY_ZONE_SCALE.th;
  const { level } = actorTraining(training, actor, zone);
  const power = CREW_POWER[kind] || {};
  const strength = typeof actor === 'string' ? 0 : count(actor.statTraining?.raeng ?? actor.upLv);
  const mult = scale.ally * TRAINING_RULES.multipliers[level-1];
  return { ...power, level,
    dmg:power.dmg == null ? undefined : Math.round((power.dmg + strength*(power.trainDmg || 0))*mult),
    heal:power.heal == null ? undefined : Math.round(power.heal*mult),
    confuseMultiplier:Math.min(TRAINING_RULES.kanMax,scale.kan+TRAINING_RULES.kanPerLevel*(level-1)),
    normalMultiplier:scale.yama*(1+TRAINING_RULES.yamaPerLevel*(level-1)),
    order:Math.min(TRAINING_RULES.niraOrderMax,TRAINING_RULES.niraOrderBase+level-1),
    orderRegenMultiplier:1+TRAINING_RULES.niraRegenPerLevel*(level-1) };
}
export function normalAttack(base, playerLevel, zone, training) {
  return Math.round((base + (playerLevel-1)*2) * effectiveAllyStats('yama',zone,training).normalMultiplier);
}
export const merchantStock = zone => MERCHANT_STOCK_BY_ZONE[zone] || MERCHANT_STOCK_BY_ZONE.th;
export function medicineResult(k, hp, hpMax, mp, mpMax) {
  const def = ITEMS[k];
  if (!def?.consumable) return null;
  const hpGain = Math.max(0, Math.min(def.hp || 0, hpMax-hp));
  const mpGain = Math.max(0, Math.min(def.mp || 0, mpMax-mp));
  return hpGain || mpGain ? { hp:hp+hpGain, mp:mp+mpGain, hpGain, mpGain } : null;
}
