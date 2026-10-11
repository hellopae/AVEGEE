// Active battle seconds, advanced by the same clock as ally specials.
export const YAMA_SKILL_SECONDS = Object.freeze({
  fire:12, windFan:18, ice:16, hypno:24, flameCharge:28, valkyrieSpear:40, rage:60,
});
export const yamaSkillRemaining = (battle, skill) => Math.ceil((battle?.skillRemainingMs?.[skill] || 0) / 1000);
export const immediateSelfSkill = skill => skill === 'rage';
