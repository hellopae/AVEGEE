import { ENCOUNTER_BALANCE, encounterBalanceKey, frontierSplit } from './encounter-balance.js';
import { foeHpFit } from './foe-turn-fit.js';
// C1: caps refer to the whole team, including Yama and the automatic Guard.
export function partyCap(game) {
  const zones = ['th','asia','west','cyberhell'];
  const reached = Math.max(zones.indexOf(game.zone), ...Object.keys(game.zoneSave || {}).map(z => zones.indexOf(z)),
    ...Object.keys(game.bossCleared || {}).filter(z => game.bossCleared[z]).map(z => zones.indexOf(z) + 1));
  return Math.min(7, reached > 0 ? 4 + reached : game.zoneEvents?.th?.frontierBreach === 'cleared' || game.guard?.breachGuest ? 4 : 3);   // Z1-EVENTS: the gate keeper who steps out for the breach fight is the 4th member
}
export const selectablePartyMax = game => partyCap(game) - 1 - (game.guard ? 1 : 0);
const interpolate = (n, a, b, c) => n <= 5 ? a + (b-a) * (n-3)/2 : b + (c-b) * (n-5)/2;
export function encounterProfile(battle, count) {
  const n = Math.max(3, Math.min(7, count));
  // BATTLE-FX: a frontier fight rolls its own 1-3 demons (battle.frontierCount, built in startFrontierBattle) so nothing is added by party size; an older saved fight without the field keeps the old rule
  if (battle.kind === 'frontier') return { hp:1, adds:battle.frontierCount ? 0 : Math.floor((n-3)/2), kind:'frontier' };
  // T1b: the wandering ghosts (mob) and the resisting spirits (soul) have rows of their own (<zone>:mob / <zone>:soul) - hp / atk by team size
  if (battle.kind === 'mob' || battle.kind === 'soul') return { hp:1, adds:0, kind:battle.kind };
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
  const profile = encounterProfile(battle, count), n = Math.max(3, Math.min(7, count));
  const boss = battle.foes.find(f => f.boss), ordinary = battle.foes.find(f => !f.boss);
  if (boss) { boss.hp = Math.round(boss.hp * profile.hp); boss.maxHp = Math.round(boss.maxHp * profile.hp); }
  // BOSS-SKILLS: a foe may carry its own party-size curve: `partyScale:{ hp:[x3,x5,x7], atk:[x3,x5,x7] }` (multipliers for a team of 3 / 5 / 7, linear in between) - the data lives on the foe in data.js
  // (set A, 15 Nov: every boss foe that carries one - the two Lumen of the Zone 4 rescue share the same entry)
  for (const b of battle.foes.filter(f => f.boss && f.partyScale)) {
    const ps = b.partyScale, at = (row = [1, 1, 1]) => interpolate(n, row[0], row[1], row[2]);
    const hpK = at(ps.hp), atkK = at(ps.atk);
    b.hp = Math.round(b.hp * hpK); b.maxHp = Math.round(b.maxHp * hpK);
    if (b.atk) b.atk = b.atk.map(v => Math.max(1, Math.round(v * atkK)));
  }
  const source = ordinary || (boss && { ...boss, boss:false, hp:Math.max(1,Math.round(boss.maxHp / 4)), maxHp:Math.max(1,Math.round(boss.maxHp / 4)) });
  // Breach additions belong only to its boss wave; preserve earlier story waves.
  const adds = profile.kind === 'breach' && !boss ? 0 : profile.adds;
  if (source) for (let i=0;i<adds;i++) battle.foes.push({ ...source, id:`c1-${wave}-${i}`, stun:0, confuse:0, speed:Math.min(8,source.speed || 8) });
  // Keep approach waves intact; hypnosis is its own solo-Yama enemy group.
  const tuningRow = ENCOUNTER_BALANCE[encounterBalanceKey(battle, profile)];
  // T1b: the mob / soul rows are fitted for the team sizes a zone really has; any other size (a fallen team, a small team) takes the nearest fitted one
  const nearest = row => { const sizes = Object.keys(row || {}).map(Number); return sizes.length ? row[sizes.reduce((a, b) => Math.abs(b - count) < Math.abs(a - count) ? b : a)] : undefined; };
  const tuning = tuningRow?.[count] ?? (battle.kind === 'mob' || battle.kind === 'soul' ? nearest(tuningRow) : undefined);
  const split = battle.kind === 'frontier' && battle.frontierCount ? frontierSplit(count, battle.frontierCount) : null;   // share the tuned total out among the rolled demons
  if (tuning) for (const foe of battle.foes) {
    // Preserve existing pre-damage (e.g. evidence prep) while tuning full HP.
    const preparedDamage = foe.maxHp - foe.hp;
    // BATTLE-FX: optional bossHp / addsHp split — a boss that lives long enough to use its cutscene move twice (see BOSS_ULTIMATE_RHYTHM in data.js)
    // while the attendants die sooner, so the whole fight keeps about the same total HP and length.
    foe.maxHp = Math.max(1, Math.round(foe.maxHp * tuning.hp * (split?.hp ?? 1) * (foe.boss ? tuning.bossHp ?? 1 : tuning.addsHp ?? 1)));
    foe.hp = Math.max(1, foe.maxHp - preparedDamage);
    const attackRange = [tuning.atkLow ?? tuning.atk, tuning.atkHigh ?? tuning.atk];
    // Zone-boss rematch foes carry no atk of their own (game.js falls back to [14, 22 + zoneIndex*3]); scale that same base.
    const baseAtk = foe.atk || (battle.kind === 'zoneBoss' ? [14, 22 + ['th','asia','west','cyberhell'].indexOf(battle.zone) * 3] : battle.foeAtk);
    if (baseAtk) foe.atk = baseAtk.map((value, index) => Math.max(1, Math.round(value * attackRange[index] * (split?.atk ?? 1))));
  }
  // T1b: the HP correction of the fits table (a handful of fights; 1 = nothing)
  const hpFit = foeHpFit(battle, n);
  if (hpFit !== 1) for (const foe of battle.foes) { const hurt = foe.maxHp - foe.hp; foe.maxHp = Math.max(1, Math.round(foe.maxHp * hpFit)); foe.hp = Math.max(1, foe.maxHp - hurt); }
  battle.balance = { version:1, wave, partySize:count, ...profile, adds };
}
