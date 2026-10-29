import { ALLY_ZONE_SCALE, TRAINING_RULES } from './data.js';
import { actorTraining, effectiveAllyStats } from './progression.js';

// C1: identity is the roster ID, never a localized name or a kind shared by branches.
export const COMBAT_SKILLS = Object.freeze({
  copperInferno:{ chipParts:['เพลิงอาญา','ทองแดง'], actor:'plerng', station:'krata', name:'เพลิงอาญาทองแดง', damage:1.4, morale:6 },
  mercySeal:{ chipParts:['ตราเมตตา','พิทักษ์'], actor:'nira', station:'sawan', name:'ตราเมตตาพิทักษ์', heal:1.5, shield:18, cap:36, buff:.15, morale:6 },
  lotusSanctuary:{ chipParts:['บัวบุญ','คุ้มชีพ'], actor:'boon', station:'sawan', name:'บัวบุญคุ้มชีพ', heal:1.3, shield:24, cap:48, buff:.2, morale:6 },
  laborJudgment:{ chipParts:['กระบอง','พิพากษา','หินผา'], actor:'taan', station:'lan', name:'กระบองพิพากษาหินผา', damage:1.45, morale:6 },
  shadowCleaver:{ chipParts:['คมเงา','ทลายตรวน'], actor:'dam', station:'lan', name:'คมเงาทลายตรวน', damage:1.45, morale:6 },
  abyssGatebreaker:{ chipParts:['ทวารบาล','ทลาย','โลกันต์'], actor:'guard', station:'lokan', name:'ทวารบาลทลายโลกันต์', damage:1.3, morale:8 },
  karmaFracture:{ chipParts:['กระจกกรรม','สะท้อนคม'], actor:'kan', station:'krajok', name:'กระจกกรรมสะท้อนคม', base:28, morale:6 },
  teamJudgment:{ chipParts:['ประสาน','พิพากษา'], actor:'yama', name:'บัญชาการยมทูตประสานพิพากษา', shortName:'ประสานพิพากษา', mp:24, turns:5 },
});
export const skillForActor = actor => Object.keys(COMBAT_SKILLS).find(k => COMBAT_SKILLS[k].actor === (actor?.kind || actor?.k));
export const skillUnlocked = (game, actor, skill = skillForActor(actor)) => !!skill && !!actorTraining(game.training, actor, game.zone).moves?.[skill]?.unlocked;
export function trainingSkill(actor, station) {
  const skill = skillForActor(actor);
  return COMBAT_SKILLS[skill]?.station === station ? skill : null;
}
export function recordSkillTraining(record, actor, station, score) {
  const skill = trainingSkill(actor, station);
  if (!skill || !Number.isFinite(score) || score < 60 || score > 100) return null;
  const progress = (record.moves ||= {})[skill] ||= { successes:0, high:false, unlocked:false };
  if (progress.unlocked) return null;
  progress.successes = Math.min(2, progress.successes + 1);
  progress.high ||= score >= 80;
  if (progress.successes >= 2 && progress.high) { progress.unlocked = true; return skill; }
  return null;
}
export function skillScale(game, actor) {
  const zone = actor.homeZone === 'global' ? game.zone : actor.homeZone || game.zone;
  return (ALLY_ZONE_SCALE[zone] || ALLY_ZONE_SCALE.th).ally * TRAINING_RULES.multipliers[actorTraining(game.training, actor, game.zone).level - 1];
}
export function skillEffect(game, actor, skill) {
  const def = COMBAT_SKILLS[skill], stats = effectiveAllyStats(actor, game.zone, game.training);
  const scale = skillScale(game, actor);
  return { damage:def.base ? Math.round(def.base * scale) : Math.round((stats.dmg || 0) * (def.damage || 0)),
    heal:Math.round((stats.heal || 0) * (def.heal || 0)),
    shield:Math.min(def.cap || 0, Math.round((def.shield || 0) * scale)), buff:def.buff || 0 };
}
export function grantProtection(battle, id, effect) {
  const state = (battle.protection ||= {})[id] ||= {};
  state.shield = Math.max(state.shield || 0, effect.shield);
  state.buff = Math.min(.2, Math.max(state.buff || 0, effect.buff));
  state.attacks = 2;
  // Recipient end-turn serial avoids expiring a self-cast on the casting turn.
  state.expires = (battle.actorTurns?.[id] || 0) + 2;
}
export function absorbShield(battle, id, damage) {
  const state = battle.protection?.[id], absorbed = Math.min(state?.shield || 0, damage);
  if (state) state.shield -= absorbed;
  return { damage:damage - absorbed, absorbed };
}
export function attackBuff(battle, id, damage) {
  const state = battle.protection?.[id];
  if (!state?.buff || !state.attacks || damage <= 0) return damage;
  state.attacks--;
  const result = Math.round(damage * (1 + state.buff));
  if (!state.attacks) state.buff = 0;
  return result;
}
export function teamCombo(game) {
  return [...game.battleActors().filter(a => a.id !== 'you' && !a.guestGuide)
    .map(a => ({ actorId:a.id, kind:a.k, homeZone:a.homeZone, damage:Math.round(8 * skillScale(game, a)) })),
    { actorId:'you', kind:'yama', damage:60 + 4 * (game.level - 1) }];
}
export function applyCombo(battle, hits) {
  let target = battle.foes.find(f => f.id === battle.selectedFoeId && f.hp > 0);
  return hits.map(hit => {
    target = target?.hp > 0 ? target : battle.foes.find(f => f.hp > 0);
    if (!target) return { ...hit, foeId:null, dealt:0 };
    const dealt = Math.min(hit.damage, target.hp);
    target.hp -= dealt;
    return { ...hit, foeId:target.id, dealt };
  });
}
