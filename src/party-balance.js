import { ENCOUNTER_BALANCE, encounterBalanceKey } from './encounter-balance.js';
// C1: caps refer to the whole team, including Yama and the automatic Guard.
export function partyCap(game) {
  const zones = ['th','asia','west','cyberhell'];
  const reached = Math.max(zones.indexOf(game.zone), ...Object.keys(game.zoneSave || {}).map(z => zones.indexOf(z)),
    ...Object.keys(game.bossCleared || {}).filter(z => game.bossCleared[z]).map(z => zones.indexOf(z) + 1));
  return Math.min(7, reached > 0 ? 4 + reached : game.zoneEvents?.th?.frontierBreach === 'cleared' ? 4 : 3);
}
export const selectablePartyMax = game => partyCap(game) - 1 - (game.guard ? 1 : 0);
const interpolate = (n, a, b, c) => n <= 5 ? a + (b-a) * (n-3)/2 : b + (c-b) * (n-5)/2;
export function encounterProfile(battle, count) {
  const n = Math.max(3, Math.min(7, count));
  if (battle.kind === 'frontier') return { hp:1, adds:Math.floor((n-3)/2), kind:'frontier' };
  const breach = battle.kind === 'frontierBreach' || /Breach$/.test(battle.eventKey || '');
  if (breach) return { hp:interpolate(n,1,1.35,1.7), adds:Math.floor((n-3)/2), kind:'breach' };
  if (battle.eventKey === 'thBorderBoss') return { hp:interpolate(n,1,1.25,1.55), adds:n >= 7 ? 1 : 0, kind:'boss' };
  if (battle.kind === 'zoneBoss') return { hp:interpolate(n,1,1.35,1.7), adds:Math.floor((n-3)/2), kind:'boss' };
  if (battle.encounter === 'boss') return { hp:interpolate(n,1,1.5,2), adds:0, kind:'boss' };
  return { hp:1, adds:0, kind:'other' };
}
// Called once per newly constructed wave. Never scales a restored, ongoing encounter.
export function scaleEncounter(battle, count) {
  const wave = battle.wave || 0;
  if (battle.balance?.wave === wave) return;
  const profile = encounterProfile(battle, count);
  const boss = battle.foes.find(f => f.boss), ordinary = battle.foes.find(f => !f.boss);
  if (boss) { boss.hp = Math.round(boss.hp * profile.hp); boss.maxHp = Math.round(boss.maxHp * profile.hp); }
  const source = ordinary || (boss && { ...boss, boss:false, hp:Math.max(1,Math.round(boss.maxHp / 4)), maxHp:Math.max(1,Math.round(boss.maxHp / 4)) });
  // Breach additions belong only to its boss wave; preserve earlier story waves.
  const adds = profile.kind === 'breach' && !boss ? 0 : profile.adds;
  if (source) for (let i=0;i<adds;i++) battle.foes.push({ ...source, id:`c1-${wave}-${i}`, stun:0, confuse:0, speed:Math.min(8,source.speed || 8) });
  // Keep approach waves intact; hypnosis is its own solo-Yama enemy group.
  const tuning = ENCOUNTER_BALANCE[encounterBalanceKey(battle, profile)]?.[count];
  if (tuning) for (const foe of battle.foes) {
    // Preserve existing pre-damage (e.g. evidence prep) while tuning full HP.
    const preparedDamage = foe.maxHp - foe.hp;
    foe.maxHp = Math.max(1, Math.round(foe.maxHp * tuning.hp));
    foe.hp = Math.max(1, foe.maxHp - preparedDamage);
    const attackRange = [tuning.atkLow ?? tuning.atk, tuning.atkHigh ?? tuning.atk];
    // Zone-boss rematch foes carry no atk of their own (game.js falls back to [14, 22 + zoneIndex*3]); scale that same base.
    const baseAtk = foe.atk || (battle.kind === 'zoneBoss' ? [14, 22 + ['th','asia','west','cyberhell'].indexOf(battle.zone) * 3] : battle.foeAtk);
    if (baseAtk) foe.atk = baseAtk.map((value, index) => Math.max(1, Math.round(value * attackRange[index])));
  }
  battle.balance = { version:1, wave, partySize:count, ...profile, adds };
}
