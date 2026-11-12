// QUEST-REWARDS (10 Nov 2026): win-rate / length check for the three quest fights (sqKan asia, sqBoon west, sqGuard th).
// usage: node scripts/sim-quest-fights.mjs [seeds=150] [quest=all] [level=5]
// Same production loop as sim-balance2.mjs (turn queue, runEnemyTurn, confirmBattleCommand) but the fight is g.startQuestFight(id).
//   variant 'first'  : first attempt  — team abilities (fire, bigFire, teamJudgment) but NO quest ultimate and no trained moves
//   variant 'trained': trained moves on every ally (the C1 training skills) but still NO quest ultimate
//   variant 'retry'  : the owner already owns the quest ultimate and uses it (what a replay after a win looks like; the fight is only offered while it is not won, so this is a what-if)
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
globalThis.Image ??= class {};
const { createGame } = await import('../src/game.js');
const { LEVELS, ZONE_EVENTS, TRAINING_RULES } = await import('../src/data.js');
const { actorFromLegacy, syncRoster } = await import('../src/roster.js');
const { COMBAT_SKILLS, recordSkillTraining, skillForActor, unlockQuestSkill, questSkillsForActor } = await import('../src/combat-skills.js');
const { QUEST_FIGHTS } = await import('../src/quest-fights.js');
const seeded = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const zones = ['th', 'asia', 'west', 'cyberhell'];
// who stands in the team, in order, for each zone (owner first; guard only in th where he is hired)
const ROSTER = {
  sqKan:['kan', 'nira', 'taan', 'dam', 'plerng', 'boon'],
  sqBoon:['boon', 'nira', 'taan', 'dam', 'plerng', 'kan'],
  sqGuard:['guard', 'nira', 'taan', 'dam', 'plerng', 'boon'],
};
export function setup({ id, size, level, variant, privateOpened = false }) {
  const def = QUEST_FIGHTS[id], zone = def.zone;
  const g = createGame(); g.save = () => true; g.onChange = () => {}; g.zone = zone;
  const kinds = ROSTER[id].slice(0, size - 1);
  g.bossCleared = Object.fromEntries(zones.map(z => [z, true]));
  g.crew = kinds.filter(k => k !== 'guard').map(k => actorFromLegacy({ k, morale:100 }, zone));
  g.guard = kinds.includes('guard') ? actorFromLegacy({ morale:100 }, zone, 'guard') : null;
  g.roster = {}; syncRoster(g);
  g.party.members = kinds.filter(k => k !== 'guard');
  g.level = level; g.hp = g.hpMax = LEVELS[g.level - 1].hpMax; g.mp = g.mpMax = LEVELS[g.level - 1].mpMax;
  g.inventory = { health:3, holyWater:3, tea:2 };
  g.abilities.bigFire = true; g.abilities.teamJudgment = true;
  if (variant === 'trained') for (const actor of [...g.crew, g.guard].filter(Boolean)) {
    const skill = skillForActor(actor), records = actor.k === 'nira' ? g.training.shared : (g.training.zones[zone] ||= {});
    const record = records[actor.id] ||= { exp:0, readyAtTick:0, attempts:{} };
    for (const score of [60, 80]) { recordSkillTraining(record, actor, COMBAT_SKILLS[skill].station, score); record.exp += TRAINING_RULES.rewards.find(r => r.score === score).exp; }
  }
  if (variant === 'retry') unlockQuestSkill(g, def.skill);
  g.sideQuests = { [id]:{ step:3, choice:0, done:false, verdict:{ right:true, heaven:false, privateOpened } } };
  if (!g.startQuestFight(id)) throw Error(`cannot start ${id}`);
  const actual = g.battleActors().filter(a => !a.guestGuide).length;
  if (actual !== size) throw Error(`team size ${actual}, expected ${size} (${g.battleActors().map(a => a.id)})`);
  return g;
}
function choose(g, variant) {
  const b = g.battle, actor = g.battleActors().find(a => a.id === b.actorId), hero = actor.id === 'you';
  const missing = a => a.id === 'you' ? b.youMax - b.youHp : 100 - a.morale;
  const receiver = g.battleActors().slice().sort((a, c) => missing(c) - missing(a))[0];
  const questSkill = questSkillsForActor(actor).find(k => !g.skillWhy(k, actor));
  const skill = skillForActor(actor);
  const trained = variant === 'trained';
  if (missing(receiver) >= 45 && g.inventory.health > 0 && !g.battleRecipientWhy('health', receiver.id)) return ['health', receiver.id];
  if (hero && g.mp < 24 && g.inventory.holyWater > 0 && !g.battleRecipientWhy('holyWater', 'you')) return ['holyWater', 'you'];
  if (questSkill && variant === 'retry') {
    const def = COMBAT_SKILLS[questSkill];
    const worth = def.heal ? g.battleActors().filter(a => missing(a) >= 25).length >= 2 || Object.keys(b.sealed || {}).length >= 1 : def.taunt ? b.foes.filter(f => f.hp > 0).length >= 2 : true;
    if (worth) return [questSkill, 'you'];
  }
  if (['boon', 'nira'].includes(actor.k) && missing(receiver) >= 20) {
    if (trained && !g.skillWhy(skill, actor)) return [skill, receiver.id];
    if (!g.crewHelpWhy(actor)) return ['crew:' + actor.k, receiver.id];
  }
  if (hero) {
    if (!g.skillWhy('teamJudgment', actor)) return ['teamJudgment', 'you'];
    if (!b.simFireUsed && g.mp >= 8) { b.simFireUsed = true; return ['fire', 'you']; }
    return ['atk', 'you'];
  }
  if (!['boon', 'nira'].includes(actor.k)) {
    if (trained && !g.skillWhy(skill, actor)) return [skill, 'you'];
    if (actor.k === 'guard' && !g.guardHelpWhy()) return ['guard', 'you'];
    if (actor.k !== 'guard' && !g.crewHelpWhy(actor)) return ['crew:' + actor.k, 'you'];
  }
  return ['strike', 'you'];
}
export function simulate(options) {
  const random = Math.random, now = Date.now; Math.random = seeded(options.seed); Date.now = () => 1800000000000;
  try {
    const g = setup(options), b = g.battle;
    let actions = 0, uses = 0, seals = 0, firstUse = 0;
    while (!b.over && actions < 1000) {
      const turn = g.beginBattleTurns(); if (!turn) throw Error('no active turn');
      if (turn.side === 'foe') { if (!g.runEnemyTurn()) throw Error('enemy rejected'); if (b.dmg?.sealedId) seals++; }
      else {
        let [action, recipient] = choose(g, options.variant);
        const target = b.foes.find(f => f.hp > 0 && f.bigOne) || b.foes.find(f => f.hp > 0); if (target) g.selectFoe(target.id);
        if (COMBAT_SKILLS[action]?.quest) { uses++; firstUse ||= b.turnQueue.round; }
        if (!g.confirmBattleCommand(action, recipient)) { if (!g.confirmBattleCommand('strike', 'you') && !g.confirmBattleCommand('atk', 'you')) throw Error(`rejected ${turn.id}/${action}`); }
      }
      actions++; g.finishBattleCommand(); g.advanceBattleTime(1000, true);
    }
    return { ...options, result:b.over || 'timeout', rounds:b.turnQueue?.round || 0, actions, uses, seals, firstUse, heroHp:b.youHp, fallen:(b.absentActors || []).length, foes:b.foes.length };
  } finally { Math.random = random; Date.now = now; }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [seeds = '150', which = 'all', lv = '5', label = 'run'] = process.argv.slice(2), count = Number(seeds), level = Number(lv);
  const ids = which === 'all' ? ['sqKan', 'sqBoon', 'sqGuard'] : which.split(',');
  const rows = [];
  for (const id of ids) for (const variant of ['first', 'trained', 'retry']) for (const size of [4, 5, 6, 7]) {
    const samples = Array.from({ length:count }, (_, i) => simulate({ id, size, level, variant, seed:50000 + i, privateOpened:i % 5 === 0 }));
    const wins = samples.filter(r => r.result === 'win');
    const mean = (set, k) => set.length ? +(set.reduce((a, r) => a + r[k], 0) / set.length).toFixed(2) : null;
    const row = { id, variant, size, level, samples:count, winRate:+(100 * wins.length / count).toFixed(1), timeouts:samples.filter(r => r.result === 'timeout').length,
      rounds:mean(samples, 'rounds'), winRounds:mean(wins, 'rounds'), fallen:mean(samples, 'fallen'), uses:mean(samples, 'uses'), seals:mean(samples, 'seals') };
    rows.push(row); console.log(JSON.stringify(row));
  }
  const dir = fileURLToPath(new URL('../output/coordination/2026-11-10-quest-rewards/', import.meta.url));
  mkdirSync(dir, { recursive:true }); writeFileSync(dir + label + '.json', JSON.stringify({ label, count, level, rows }, null, 2) + '\n');
}
