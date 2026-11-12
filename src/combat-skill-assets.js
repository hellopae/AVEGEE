// Explicit regional map: replace paths here as regional art arrives.
const thai = {
  copperInferno:['plerng-copperInferno-cut-01','plerng-copperInferno-cut-02'],
  mercySeal:['nira-mercySeal-cut-01'], lotusSanctuary:['boon-lotusSanctuary-cut-01'],
  laborJudgment:['taan-laborJudgment-cut-01'], shadowCleaver:['dam-shadowCleaver-cut-01'],
  abyssGatebreaker:['guard-abyssGatebreaker-cut-01'], karmaFracture:['kan-karmaFracture-cut-01'],
  teamJudgment:['yama-teamJudgment-cut-01','yama-teamJudgment-cut-02'],
  // QUEST-ART (13 Nov 2026): the three quest ultimates, Codex's own drawings (2 cutscene frames each).
  eyeAwaitingPermission:['kan-eyeAwaitingPermission-cut-01','kan-eyeAwaitingPermission-cut-02'],
  letterDelivered:['boon-letterDelivered-cut-01','boon-letterDelivered-cut-02'],
  gatekeeperStand:['guard-gatekeeperStand-cut-01','guard-gatekeeperStand-cut-02'],
};
const allSkills = Object.keys(thai);
export const SKILL_SCENES = Object.fromEntries(['th','asia','west','cyberhell'].map(zone => [zone,
  Object.fromEntries(allSkills.map(skill => [skill, thai[skill].map(f => `img/skills-v1/th/${f}.webp`)]))]));
export const SKILL_ICONS = Object.fromEntries(allSkills.map(k => [k, `img/skills-v1/icons/${k}.webp`]));
export const skillScenes = (skill, zone = 'th') => SKILL_SCENES[zone]?.[skill] || SKILL_SCENES.th[skill] || [];
export const SKILL_FX = {
  copperInferno:{ projectile:'fx-fire-orb', impact:'fx-fire-explosion', shared:true, size:768 },
  mercySeal:{ impact:'mercySeal-shield-512', size:512 },
  lotusSanctuary:{ impact:'lotus-shield-512', size:512 },
  laborJudgment:{ impact:'taan-shockwave-768', size:768 },
  shadowCleaver:{ impact:'dam-slash-512', size:512 },
  abyssGatebreaker:{ impact:'guard-impact-768', size:768 },
  karmaFracture:{ projectile:'kan-mirror-shard-256', impact:'kan-impact-512', size:512 },
  teamJudgment:{ impact:'yama-impact-768', size:768 },
  eyeAwaitingPermission:{ impact:'kan-eye-reflect-512', size:512 },
  letterDelivered:{ impact:'boon-letter-glow-512', size:512 },
  gatekeeperStand:{ impact:'guard-gate-wave-768', size:768 },
};
export const SKILL_CAST_MS = { copperInferno:250, mercySeal:250, lotusSanctuary:250, laborJudgment:200, shadowCleaver:180, abyssGatebreaker:250, karmaFracture:250, teamJudgment:250, eyeAwaitingPermission:250, letterDelivered:250, gatekeeperStand:250 };
