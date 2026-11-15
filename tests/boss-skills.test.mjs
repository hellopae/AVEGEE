// BOSS-SKILLS (14 Nov 2026): the data-driven boss moves (src/boss-skills.js) and their use by Wukong / the Gate Guard's test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { planSkill, skillState, skillDue, settleSummons, summonFoes, hasSkills, BOSS_SKILL_KINDS } from '../src/boss-skills.js';
import { ZONE_EVENTS } from '../src/data.js';
import { setup } from '../scripts/sim-balance2.mjs';
globalThis.Image ??= class { set src(v) {} };

const mkFoe = (skills, extra = {}) => ({ id:'f1', who:'Boss', hp:100, maxHp:100, boss:true, skills, ...extra });
const battleOf = (...foes) => ({ foes });
const sweep = { id:'sweep', kind:'groupHit', warn:1, power:.7, when:{ firstAct:3, everyActs:3 }, name:{ th:'กวาด', en:'Sweep' } };

test('plan: a warned move is announced one boss turn before it is used, then waits for its next slot', () => {
  const foe = mkFoe([sweep]), b = battleOf(foe), seen = [];
  for (let i = 0; i < 9; i++) {
    const p = planSkill(b, foe), sk = skillState(foe);
    seen.push(p ? p.mode : '-');
    if (p?.mode === 'warn') sk.pending = p.skill.id;
    if (p?.mode === 'run') { sk.pending = null; sk.used[p.skill.id] = (sk.used[p.skill.id] || 0) + 1; sk.lastUse[p.skill.id] = p.turn; }
    sk.turns = p?.turn ?? sk.turns + 1;
  }
  assert.deepEqual(seen, ['-', '-', 'warn', 'run', '-', '-', 'warn', 'run', '-']);
});
test('plan: once / maxUses / hpBelow / gap / room for summons / nothing to heal', () => {
  const foe = mkFoe([]), b = battleOf(foe);
  const once = { id:'o', kind:'heavyHit', when:{ once:true } };
  assert.equal(skillDue(b, foe, once, 1), true); skillState(foe).used.o = 1; assert.equal(skillDue(b, foe, once, 5), false);
  const two = { id:'t', kind:'heavyHit', when:{ maxUses:2 } }; skillState(foe).used.t = 2; assert.equal(skillDue(b, foe, two, 9), false);
  const low = { id:'l', kind:'heavyHit', when:{ hpBelow:.5 } }; assert.equal(skillDue(b, foe, low, 3), false); foe.hp = 50; assert.equal(skillDue(b, foe, low, 3), true);
  const gap = { id:'g', kind:'heavyHit', when:{ gap:3 } }; skillState(foe).lastUse.g = 4; assert.equal(skillDue(b, foe, gap, 6), false); assert.equal(skillDue(b, foe, gap, 7), true);
  const sum = { id:'s', kind:'summon', summon:{ max:1 } }; assert.equal(skillDue(b, foe, sum, 2), true);
  b.foes.push({ id:'c', summoned:true, summonerId:'f1', hp:5 }); assert.equal(skillDue(b, foe, sum, 2), false, 'no room');
  const heal = { id:'h', kind:'heal' }; foe.hp = foe.maxHp; assert.equal(skillDue(b, foe, heal, 2), false, 'nothing to heal'); foe.hp = 30; assert.equal(skillDue(b, foe, heal, 2), true);
  assert.deepEqual(Object.keys(BOSS_SKILL_KINDS).sort(), ['groupHit', 'heal', 'heavyHit', 'summon']);
});
test('summoned foes: made from the data, capped by max, and gone when the summoner falls', () => {
  const foe = mkFoe([]), b = battleOf(foe), skill = { id:'s', kind:'summon', summon:{ count:[3, 3], hp:20, atk:[5, 8], sp:'x', name:'Clone', max:2 } };
  const made = summonFoes(b, foe, skill, { scaleHp:v => v * 2, scaleAtk:a => a, rand:() => 0 });
  assert.equal(made.length, 2, 'capped at max'); assert.ok(made.every(f => f.summoned && f.summonerId === 'f1' && f.hp === 40 && f.boss === false));
  assert.equal(new Set(b.foes.map(f => f.id)).size, 3, 'unique ids');
  settleSummons(b); assert.equal(made.every(f => f.hp > 0), true, 'summoner alive: they stay');
  foe.hp = 0; settleSummons(b); assert.equal(made.every(f => f.hp === 0), true, 'summoner down: they vanish');
});

// ---- the real fights ----
const wukong = () => ZONE_EVENTS.asia.find(e => e.k === 'asiaWukong').foe, guard = () => ZONE_EVENTS.asia.find(e => e.k === 'asiaGuardTest').foe;
test('data: Wukong has the clone blast, the sweep and a stronger body; the Gate Guard has a warned heavy blow', () => {
  const w = wukong(), g = guard();
  assert.deepEqual(w.skills.map(s => [s.id, s.kind]), [['hairClones', 'summon'], ['staffSweep', 'groupHit']]);
  assert.ok(w.hp > 140 && w.atk[0] > 12, 'harder than the old 140 / 12-19');
  assert.deepEqual(g.skills.map(s => [s.id, s.kind]), [['gateSmash', 'heavyHit']]); assert.ok(g.hp > 110 && g.atk[0] > 10);
  for (const s of [...w.skills, ...g.skills]) { assert.ok(s.name.th && s.name.en && s.warnText.th && s.useText.th, s.id + ' has its (temporary) texts'); assert.ok((s.warn ?? 1) >= 1, 'every move is warned'); }
  assert.ok(w.skills.find(s => s.kind === 'groupHit').image.endsWith('cut-wukong-sweep-asia.webp'));
});
const startWukong = (size = 4) => { const g = setup({ zone:'asia', size, kind:'event', eventKey:'asiaWukong', moves:false }); g.save = () => true; return g; };
/** Play the queue: every ally defends, until the boss is about to take its next turn. Returns that boss's turn after it was played. */
function playToBossTurn(g, { maxSteps = 60 } = {}) {
  const b = g.battle;
  for (let i = 0; i < maxSteps && !b.over; i++) {
    const turn = g.beginBattleTurns(); assert.ok(turn);
    if (turn.side === 'foe') {
      const boss = b.foes.find(f => f.id === turn.id);
      if (!boss.boss) { g.runEnemyTurn(); g.finishBattleCommand(); continue; }
      return { boss, run: () => { assert.ok(g.runEnemyTurn()); const dmg = b.dmg, notice = b.skillNotice, ult = b.ultimate; g.finishBattleCommand(); return { dmg, notice, ult }; } };
    }
    assert.ok(g.confirmBattleCommand('defend', turn.id === 'you' ? 'you' : turn.id)); g.finishBattleCommand();
  }
  throw Error('no boss turn');
}
const keepAlive = g => { for (const a of g.battleActors()) if (a.id !== 'you') a.morale = 100; g.battle.youHp = g.battle.youMax; };
test('Wukong: the sweep is announced a round ahead (with the usual attack), then hits every ally once, with a card', () => {
  const g = startWukong(4), b = g.battle, allies = g.battleActors().length;
  for (const f of b.foes) f.skills = f.skills.filter(s => s.id === 'staffSweep');     // isolate the sweep
  let warn = null, use = null;
  for (let i = 0; i < 30 && !use; i++) {   // F3: the boss acts several times a round and uses a warned move on the first act of the NEXT round
    keepAlive(g);
    const t = playToBossTurn(g), r = t.run();
    if (r.notice?.phase === 'warn') { warn = { r, pending:skillState(t.boss).pending, hits:r.dmg.enemyHits.length }; }
    if (r.notice?.phase === 'use') use = { r, hits:r.dmg.enemyHits.length };
    if (!warn) assert.equal(r.notice, null);
  }
  assert.ok(warn, 'a warning came'); assert.equal(warn.pending, 'staffSweep'); assert.equal(warn.hits, 1, 'the warning turn still carries the normal single attack');
  assert.ok(use, 'then the move');   assert.equal(use.hits, allies, 'every ally is hit'); assert.ok(use.r.ult && use.r.ult.name && use.r.ult.image, 'full-screen card');
  assert.equal(skillState(b.foes[0]).pending, null); assert.equal(skillState(b.foes[0]).used.staffSweep, 1);
  // not the old 'half HP' rule: a skilled boss never plays the legacy group move on its own
  assert.equal(hasSkills(b.foes[0]), true);
});
test('Wukong: blowing his hair summons 2-3 clones that join the fight, and they are gone when he falls (fight ends as a win)', () => {
  const g = startWukong(4), b = g.battle;
  for (const f of b.foes) f.skills = f.skills.filter(s => s.id === 'hairClones');
  const boss = b.foes[0]; let sumTurn = null;
  for (let i = 0; i < 14 && !sumTurn; i++) {
    keepAlive(g); boss.hp = Math.min(boss.hp, Math.round(boss.maxHp * .7));      // under the hp gate
    const t = playToBossTurn(g), r = t.run();
    if (r.notice?.phase === 'use') sumTurn = r;
  }
  assert.ok(sumTurn, 'the clone blast was used'); assert.equal(sumTurn.dmg.skillOnly, true, 'that turn is not an attack');
  assert.deepEqual(sumTurn.dmg.enemyHits, []);
  const clones = b.foes.filter(f => f.summoned); assert.ok(clones.length >= 2 && clones.length <= 3, 'count ' + clones.length);
  assert.ok(clones.every(c => c.hp > 0 && c.hp < boss.maxHp / 4 && c.sp === 'boss-wukong-clone-asia' && c.summonerId === boss.id && !c.boss), 'weak, own art key, not a boss');
  keepAlive(g); g.beginBattleTurns();
  assert.ok(b.foes.filter(f => f.summoned && f.hp > 0).length >= 2, 'they act next round (turn queue)');
  // Wukong falls -> the clones vanish and the fight is won
  boss.hp = 1; b.selectedFoeId = boss.id; for (const f of b.foes) f.atk = [0, 0];
  for (let i = 0; i < 20 && !b.over; i++) {
    const turn = g.beginBattleTurns();
    if (turn.side === 'foe') { g.runEnemyTurn(); g.finishBattleCommand(); continue; }
    b.selectedFoeId = boss.id; assert.ok(g.confirmBattleCommand(turn.id === 'you' ? 'atk' : 'strike', 'you')); g.finishBattleCommand();
  }
  assert.equal(b.over, 'win'); assert.ok(b.foes.every(f => f.hp <= 0), 'every clone vanished with him');
});
test('Wukong: a lost fight is not a dead end - retry stays available (zone event goes back to pending, no save damage)', () => {
  const g = startWukong(3), b = g.battle;
  b.youHp = 1; for (const f of b.foes) f.atk = [200, 200];
  for (let i = 0; i < 12 && !b.over; i++) { const t = g.beginBattleTurns(); if (t.side === 'foe') { g.runEnemyTurn(); g.finishBattleCommand(); } else { g.confirmBattleCommand('defend', t.id); g.finishBattleCommand(); } }
  assert.equal(b.over, 'lose'); assert.equal(g.zoneEvents.asia.asiaWukong, 'pending');
});
test('Gate Guard test: the heavy blow is announced a turn ahead and hits one ally harder than a normal blow', () => {
  const g = setup({ zone:'asia', size:4, kind:'event', eventKey:'asiaGuardTest', moves:false }); g.save = () => true;
  const b = g.battle; let warn = false, heavy = null; const normals = [];
  const rnd = Math.random; Math.random = () => .5;      // fixed rolls: only the move itself changes the number
  try { for (let i = 0; i < 40 && !heavy; i++) {   // F3: used on the first act of the round after the warning
    keepAlive(g); for (const f of b.foes) f.hp = f.maxHp;
    const t = playToBossTurn(g), r = t.run(), hit = r.dmg.enemyHits[0];
    if (r.notice?.phase === 'warn') { warn = true; normals.push(hit.damage); }
    else if (r.notice?.phase === 'use') heavy = hit;
    else normals.push(hit.damage);
  } } finally { Math.random = rnd; }
  assert.ok(warn && heavy, 'warned, then used'); assert.equal(b.dmg.enemyHits.length, 1, 'single target');
  assert.ok(heavy.damage > Math.max(...normals) * 1.2, `heavy ${heavy.damage} vs normal max ${Math.max(...normals)}`);
});
test('a foe without skills plays exactly as before (no state, no notice)', () => {
  const g = setup({ zone:'asia', size:4, kind:'event', eventKey:'asiaDevaTest', moves:false }); g.save = () => true; const b = g.battle;
  for (const f of b.foes) delete f.skills;   // set A gave Kuroha moves too: take them off for this check
  keepAlive(g); const t = playToBossTurn(g), r = t.run();
  assert.equal(t.boss.sk, undefined); assert.equal(r.notice, null); assert.equal(r.dmg.skillOnly, undefined); assert.equal(hasSkills(t.boss), false);
});
test('the live state of a warned move survives a save (plain JSON)', () => {
  const foe = mkFoe([sweep]); const sk = skillState(foe); sk.pending = 'sweep'; sk.pendingLabel = sweep.name; sk.turns = 3;
  const back = JSON.parse(JSON.stringify(foe)); assert.equal(planSkill(battleOf(back), back).mode, 'run');
});

// F3: with several turns a round, boss move timing is counted in rounds and a warned move waits for the next round
test('F3: planSkill counts firstAct/everyActs in rounds and uses a warned move only in a later round (perRound 3)', () => {
  const foe = { hp:100, maxHp:100, skills:[{ id:'blow', kind:'heavyHit', warn:1, when:{ firstAct:2 } }] }, battle = { foes:[foe] };
  const act = () => { const p = planSkill(battle, foe, 3); const sk = foe.sk ||= { turns:0, pending:null, used:{}, lastUse:{} }; return p && { ...p, apply() { sk.turns = p.act; if (p.mode === 'warn') { sk.pending = p.skill.id; sk.pendingAt = p.turn; } else { sk.pending = null; sk.pendingAt = null; sk.used[p.skill.id] = 1; sk.lastUse[p.skill.id] = p.turn; } } }; };
  const seen = [];
  for (let i = 0; i < 9; i++) { const p = act(); seen.push(p ? `${p.mode}@r${p.turn}` : '-'); if (p) p.apply(); else (foe.sk ||= { turns:0, pending:null, used:{}, lastUse:{} }).turns++; }
  // acts 1-3 = round 1 (firstAct 2: nothing yet), acts 4-6 = round 2: warn on act 4, normal attacks on 5-6 (same round), use on act 7 = round 3
  assert.deepEqual(seen.slice(0, 7), ['-', '-', '-', 'warn@r2', '-', '-', 'run@r3']);
  const one = { hp:100, maxHp:100, skills:foe.skills.map(s => ({ ...s })) };
  const p1 = planSkill({ foes:[one] }, one, 1); assert.equal(p1, null, 'one act per round: firstAct 2 is still not due on act 1 (nothing changed)');
});
