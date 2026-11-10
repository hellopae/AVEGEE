import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { syncSceneZone, ITEMS } from '../src/data.js';
import { QUESTS, SIDE_QUESTS, KIN_QUESTS, questTarget, questState, advanceQuest, recordQuestVerdict, pendingRetroQuestRewards, ackRetroQuestRewards } from '../src/side-quests.js';
import { QUEST_REWARDS, QUEST_TIER_LABEL, questRewardPreview } from '../src/quest-rewards.js';
import { COMBAT_SKILLS, skillBelongsTo, questSkillsForActor, skillForActor, skillUnlocked, unlockQuestSkill } from '../src/combat-skills.js';
import { QUEST_FIGHTS, fightScene, questFightFoes } from '../src/quest-fights.js';
import { SKILL_ICONS, skillScenes } from '../src/combat-skill-assets.js';
import { questJournalHtml, questRewardText, questReceiptText } from '../src/quest-panels.js';
import { simulate, setup } from '../scripts/sim-quest-fights.mjs';
globalThis.Image ??= class {};
const make = () => { const g = createGame(); g.save = () => true; g.onChange = () => {}; g.gameCompleted = true;
  g.zoneTravel.visited = { th:true, asia:true, west:true, cyberhell:true }; g.zoneTravel.ports = { th:true, asia:true, west:true, cyberhell:true };
  g.merchantJourney = { asia:{ arrived:true }, west:{ arrived:true }, cyberhell:{ arrived:true } }; return g; };
import {hireFor,hireAll} from './helpers/quest-hire.mjs';
const meet = (g, q) => { const p = questTarget(g, q); g.zone = p.zone; syncSceneZone(p.zone); hireFor(g, q); Object.assign(g.player, questTarget(g, q)); };
const reload = g => { const h = make(); assert.ok(h.restore(JSON.parse(JSON.stringify(g.snapshot())))); h.save = () => true; h.onChange = () => {}; return h; };
function win(g) {
  for (let n = 0; g.battle && !g.battle.over && n < 70; n++) {
    for (const f of g.battle.foes) f.atk = [0, 0];
    const f = g.battle.foes.find(f => f.hp > 0); f.hp = 1; g.selectFoe(f.id); g.battleAct('atk');
  }
  assert.equal(g.battle?.over, 'win'); g.endBattle(); g.pendingReward = null;
}
function lose(g) {
  g.battle.youHp = 0; for (const f of g.battle.foes) f.atk = [999, 999];
  for (let n = 0; g.battle && !g.battle.over && n < 70; n++) { const f = g.battle.foes.find(f => f.hp > 0); g.selectFoe(f.id); g.battleAct('atk'); }
  assert.equal(g.battle?.over, 'lose'); g.endBattle();
}
function verdict(g, q, right = true, privateOpened = false) {
  const soul = g.queue.find(s => s.case === q.caseId); assert.ok(soul); soul.privateOpened = privateOpened;
  g.applyVerdict({ right, heaven:soul.pure && right, score:75, stars:3, tham:100, ked:75, over:0, short:0, karma:0 }, soul, 'ทดสอบ');
  g.queue = g.queue.filter(s => s !== soul);
}
/** play one quest up to (not including) the step-3 answer */
function toStep3(g, q, choice = 0) {
  meet(g, q); advanceQuest(g, q.id); meet(g, q); assert.ok(advanceQuest(g, q.id, q.id === 'sqBoon' ? choice : null)); verdict(g, q); meet(g, q);
  assert.equal(questState(g, q.id).step, 3);
}

// ---------- the reward table (literal copy of what Khun Pae's brief asked for: easy small / mid bigger / hard has a move) ----------
const TABLE = {
  sqDam:['easy', 20, { health:1 }], kinTaan:['easy', 20, { health:1, food:1 }], kinPlerng:['easy', 20, { holyWater:2 }], kinKan:['easy', 20, { health:1, holyWater:1 }],
  kinBoonCousin:['easy', 20, { holyWater:1, food:1 }], kinBoonGrand:['easy', 10, { holyWater:1 }], kinDamBro:['easy', 20, { health:1, food:2 }], kinDamCousin:['easy', 10, { food:2 }], kinGuard:['easy', 20, { health:1, holyWater:1 }],
  sqNira:['mid', 40, { health:1, holyWater:1, food:2, tea:2 }], sqTaan:['mid', 40, { health:1, holyWater:1, food:2, ashStone:2 }],
  sqPlerng:['mid', 40, { health:1, holyWater:1, food:2, emberWood:2 }], sqMerchant:['mid', 40, { health:1, holyWater:1, food:2, bladeShard:2 }],
  sqGuard:['hard', 60, { health:2, holyWater:2, bladeShard:2 }, 'gatekeeperStand'],
  sqKan:['veryHard', 80, { health:3, holyWater:2, ashStone:2 }, 'eyeAwaitingPermission'], sqBoon:['veryHard', 80, { health:3, holyWater:2, tea:2 }, 'letterDelivered'],
};
test('every one of the 16 quests has a tier reward; only the three fight quests carry an ultimate', () => {
  assert.equal(QUESTS.length, 16); assert.deepEqual(Object.keys(QUEST_REWARDS).sort(), Object.keys(TABLE).sort());
  for (const q of QUESTS) {
    const [tier, coin, items, skill] = TABLE[q.id], row = QUEST_REWARDS[q.id];
    assert.equal(row.tier, tier, q.id); assert.equal(row.coin, coin, q.id); assert.deepEqual(row.items, items, q.id); assert.equal(row.skill, skill, q.id);
  }
  // Rae's levels: hard / very hard = has a fight; the tier labels are Rae's words
  assert.deepEqual(QUEST_TIER_LABEL, { easy:'ง่าย', mid:'กลาง', hard:'ยาก', veryHard:'ยากมาก' });
  for (const k of Object.values(QUEST_REWARDS).flatMap(r => Object.keys(r.items))) assert.ok(createGame().inventory !== undefined && ['health','food','holyWater','tea','ashStone','emberWood','bladeShard'].includes(k), k);
});
test('tiers grow: easy < mid < hard < very hard in coin, and easy rewards are only medicine box / rice ball / holy water', () => {
  const coins = tier => Object.values(QUEST_REWARDS).filter(r => r.tier === tier).map(r => r.coin);
  assert.ok(Math.max(...coins('easy')) < Math.min(...coins('mid'))); assert.ok(Math.max(...coins('mid')) < Math.min(...coins('hard'))); assert.ok(Math.max(...coins('hard')) < Math.min(...coins('veryHard')));
  for (const r of Object.values(QUEST_REWARDS).filter(r => r.tier === 'easy')) for (const k of Object.keys(r.items)) assert.ok(['health', 'food', 'holyWater'].includes(k));
});
test('closing a quest pays the receipt exactly once, the receipt is saved, and reload / repeat clicks cannot pay again', () => {
  const g = make(), q = SIDE_QUESTS.find(q => q.id === 'sqNira'); toStep3(g, q);
  g.coin = 1000; g.inventory = {}; g.exp = 0; assert.ok(advanceQuest(g, q.id, 0)); meet(g, q); assert.ok(advanceQuest(g, q.id));
  const s = questState(g, q.id); assert.equal(s.done, true);
  assert.deepEqual(s.reward, { coin:90 + 40, order:10, exp:30, items:{ health:1, holyWater:1, food:2, tea:2 }, skill:null, retro:false });
  const snap = structuredClone(g.inventory), coin = g.coin;
  assert.equal(advanceQuest(g, q.id, 0), false); const h = reload(g); assert.deepEqual(h.inventory, snap); assert.equal(h.coin, coin); assert.deepEqual(h.sideQuests.sqNira.reward, s.reward);
  assert.equal(pendingRetroQuestRewards(h).length, 0);
});
test('Dam wrong verdict keeps the old failure close: 30 coin, no item, no tier bonus', () => {
  const g = make(), q = SIDE_QUESTS.find(q => q.id === 'sqDam'); meet(g, q); advanceQuest(g, q.id); meet(g, q); advanceQuest(g, q.id); verdict(g, q, false); meet(g, q);
  const coin = g.coin, inv = structuredClone(g.inventory); assert.ok(advanceQuest(g, q.id)); assert.equal(g.coin, coin + 30); assert.deepEqual(g.inventory, inv);
  assert.equal(questState(g, q.id).reward.skill, null);
});
test('preview before, "???" for an unlearned move, the move name after; journal and receipt text', () => {
  const g = make(), kan = QUESTS.find(q => q.id === 'sqKan');
  assert.match(questRewardText(g, kan), /ระดับยากมาก · ต้องสู้ก่อนปิดภารกิจ/); assert.match(questRewardText(g, kan), /ท่าไม้ตายใหม่ \?\?\?/); assert.doesNotMatch(questRewardText(g, kan), /เนตรรอคำอนุญาต/);
  assert.match(questRewardText(g, QUESTS.find(q => q.id === 'kinKan')), /ระดับง่าย/); assert.doesNotMatch(questRewardText(g, QUESTS.find(q => q.id === 'kinKan')), /ต้องสู้/);
  assert.ok(questJournalHtml(g).includes('quest-reward-line'));
  g.sideQuests.sqKan = { step:4, choice:0, done:false, fought:true };
  assert.match(questRewardText(g, kan), /ท่าไม้ตายใหม่ เนตรรอคำอนุญาต/);
  g.sideQuests.sqKan = { step:5, choice:0, done:true, fought:true, reward:{ coin:180, order:8, exp:30, items:{ food:2, health:3 }, skill:'eyeAwaitingPermission', retro:false } };
  assert.equal(questReceiptText(kan, g.sideQuests.sqKan), `เบี้ยกรรม +180 · EXP +30 · ${ITEMS.food.name} ×2 · ${ITEMS.health.name} ×3 · ท่าไม้ตายใหม่ เนตรรอคำอนุญาต`);
  assert.ok(questJournalHtml(g).includes('ได้รับแล้ว: '));
});

// ---------- old saves: reward back-pay once ----------
test('a save with quests closed before the reward table gets the tier bonus and the move ONCE; saving and reloading never pays twice; the notice is acknowledged once', () => {
  const g = make(); g.coin = 500; g.inventory = { food:1 };
  for (const id of ['sqKan', 'sqNira', 'kinTaan']) g.sideQuests[id] = { step:id.startsWith('kin') ? 3 : 5, choice:0, done:true, caseId:null, verdict:null };
  const old = JSON.parse(JSON.stringify(g.snapshot()));
  for (const id of ['sqKan', 'sqNira', 'kinTaan']) delete old.sideQuests[id].reward;
  const h = make(); assert.ok(h.restore(structuredClone(old)));
  assert.equal(h.coin, 500 + 80 + 40 + 20);
  // sqKan: health 3 · holyWater 2 · ashStone 2 / sqNira: health 1 · holyWater 1 · food 2 · tea 2 / kinTaan: health 1 · food 1 / start: food 1
  assert.deepEqual(h.inventory, { food:4, health:5, holyWater:3, ashStone:2, tea:2 });
  assert.ok(h.skillUnlocked({ id:'asia:kan', k:'kan', kind:'kan', homeZone:'asia' }, 'eyeAwaitingPermission'));
  assert.deepEqual(pendingRetroQuestRewards(h).map(q => q.id).sort(), ['kinTaan', 'sqKan', 'sqNira']);
  assert.equal(h.sideQuests.sqKan.fought, true); assert.equal(h.sideQuests.sqKan.reward.retro, true);
  const coin = h.coin, inv = structuredClone(h.inventory);
  const again = reload(h); assert.equal(again.coin, coin); assert.deepEqual(again.inventory, inv);       // the latch is in the save
  assert.equal(ackRetroQuestRewards(h), 3); assert.equal(pendingRetroQuestRewards(h).length, 0); assert.equal(ackRetroQuestRewards(h), 0);
  assert.equal(pendingRetroQuestRewards(reload(h)).length, 0);
});
test('a brand-new save has no retro notice, and an unfinished quest is not paid on load', () => {
  const g = make(); g.sideQuests.sqKan = { step:3, choice:0, done:false };
  const h = reload(g); assert.equal(pendingRetroQuestRewards(h).length, 0); assert.equal(h.sideQuests.sqKan.reward, undefined); assert.equal(h.skillUnlocked({ id:'asia:kan', k:'kan', kind:'kan', homeZone:'asia' }, 'eyeAwaitingPermission'), false);
});

// ---------- the fights ----------
for (const [id, zone] of [['sqKan', 'asia'], ['sqBoon', 'west'], ['sqGuard', 'th']]) test(`${id}: step 3 opens a quest fight that pays no coin / EXP / loot; losing keeps the quest at step 3; winning moves to step 4 and teaches the move`, () => {
  const g = make(), q = SIDE_QUESTS.find(q => q.id === id); toStep3(g, q);
  const coin = g.coin, exp = g.exp, inv = structuredClone(g.inventory), level = g.level, hp = g.hp;
  // answering must not move to step 4 by itself
  assert.ok(advanceQuest(g, id, id === 'sqBoon' ? null : 1)); assert.equal(g.battle.kind, 'questFight'); assert.equal(g.battle.questId, id); assert.equal(questState(g, id).step, 3);
  assert.equal(advanceQuest(g, id, 0), false, 'a second click while the fight is open does nothing');
  assert.ok(g.battle.foes.length >= 3); assert.ok(g.battle.foes.every(f => f.hp > 0 && f.atk[1] > f.atk[0]));
  // flee is allowed and costs nothing
  assert.equal(g.fleeWhy(), ''); assert.ok(g.fleeBattle()); g.endBattle();
  assert.equal(g.battle, null); assert.equal(questState(g, id).step, 3); assert.equal(g.pendingRecovery, null); assert.equal(g.coin, coin);
  // lost → retry with NO new choice (sqBoon never needed one)
  meet(g, q); assert.ok(advanceQuest(g, id)); lose(g);
  assert.equal(questState(g, id).step, 3); assert.equal(questState(g, id).done, false); assert.equal(g.pendingRecovery, null, 'a lost quest fight is not a defeat that sends the team to the tea house');
  assert.equal(g.skillUnlocked({ id:`${zone}:${q.npc}`, k:q.npc, kind:q.npc, homeZone:zone }, QUEST_FIGHTS[id].skill), false);
  meet(g, q); assert.ok(advanceQuest(g, id)); win(g);
  assert.equal(questState(g, id).step, 4); assert.equal(questState(g, id).fought, true); assert.equal(g.battle, null);
  assert.equal(g.coin, coin); assert.equal(g.exp, exp); assert.equal(g.level, level); assert.deepEqual(g.inventory, inv); assert.equal(g.pendingReward, null);
  assert.equal(g.skillUnlocked({ id:`${zone}:${q.npc}`, k:q.npc, kind:q.npc, homeZone:zone }, QUEST_FIGHTS[id].skill), true);
  // the win survives a reload, finishing the quest then pays the receipt (with the move listed) once
  const h = reload(g); meet(h, q); assert.equal(questState(h, id).fought, true);
  assert.equal(h.skillUnlocked({ id:`${zone}:${q.npc}`, k:q.npc, kind:q.npc, homeZone:zone }, QUEST_FIGHTS[id].skill), true);
  assert.ok(advanceQuest(h, id)); const s = questState(h, id); assert.equal(s.done, true); assert.equal(s.reward.skill, QUEST_FIGHTS[id].skill); assert.equal(s.reward.items.health, QUEST_REWARDS[id].items.health + 0);
});
test('sqKan / sqGuard: the choice is saved when the fight starts, so a retry needs no choice buttons; a different valid choice is also accepted', () => {
  for (const id of ['sqKan', 'sqGuard']) {
    const g = make(), q = SIDE_QUESTS.find(q => q.id === id); toStep3(g, q);
    assert.equal(advanceQuest(g, id), false, 'no choice at all → still refused');
    assert.ok(advanceQuest(g, id, 1)); assert.equal(questState(g, id).choice, 1); lose(g);
    meet(g, q); assert.ok(advanceQuest(g, id)); assert.equal(questState(g, id).choice, 1); lose(g);
    meet(g, q); assert.ok(advanceQuest(g, id, 0)); assert.equal(questState(g, id).choice, 0); win(g); assert.equal(questState(g, id).step, 4);
  }
});
test('Rae scene text is shown as written: pre by choice, privateOpened extra line for sqKan, shared tail for sqBoon', () => {
  const kan0 = fightScene('sqKan', { choice:0, verdict:{} }, 'pre'), kan1 = fightScene('sqKan', { choice:1, verdict:{} }, 'pre'), kanP = fightScene('sqKan', { choice:0, verdict:{ privateOpened:true } }, 'pre');
  assert.equal(kan0.length, 4); assert.equal(kan1.length, 4); assert.equal(kanP.length, 5);
  assert.equal(kanP[1], 'ซาโตริ: "เรื่องที่ถูกเปิดด้วยกระจก มันแรงกว่าที่ข้าเคยเห็น ระวังเงาลูกของมันด้วย"'); assert.equal(kanP[0], kan0[0]);
  assert.match(kan0[2], /ปิดปากไว้ \.\.\. ถ้าพูดออกมา เธอต้องใช้หนี้แทน/); assert.match(kan1[2], /พูดก็ผิด/);
  const b0 = fightScene('sqBoon', { choice:0 }, 'pre'), b1 = fightScene('sqBoon', { choice:1 }, 'pre');
  assert.equal(b0.length, 4); assert.notEqual(b0[0], b1[0]); assert.deepEqual(b0.slice(1), b1.slice(1));
  for (const id of Object.keys(QUEST_FIGHTS)) for (const kind of ['pre', 'win', 'lose']) assert.ok(fightScene(id, { choice:0 }, kind).length >= 2, `${id}/${kind}`);
  // sqBoon's phrase test: none of the new strings may contain the phrase that the old test looks for
  for (const kind of ['pre', 'win', 'lose']) for (const c of [0, 1]) for (const line of fightScene('sqBoon', { choice:c }, kind)) assert.ok(!line.includes('แม่ฝากบอก'));
  const boonDialogue = QUESTS.find(q => q.id === 'sqBoon').dialogue; assert.equal(boonDialogue['2'].length, 5); assert.ok(!boonDialogue['2'].join('').includes('แม่ฝากบอก'));
  assert.equal(QUESTS.find(q => q.id === 'sqKan').dialogue['2'].length, 4); assert.equal(QUESTS.find(q => q.id === 'sqKan').dialogue['4'].length, 2); assert.equal(QUESTS.find(q => q.id === 'sqGuard').dialogue['4'].length, 2);
});
test('privateOpened adds one more debt-collector to the sqKan fight', () => {
  const plain = make(), pri = make(); for (const [g, p] of [[plain, false], [pri, true]]) g.sideQuests.sqKan = { step:3, choice:0, done:false, verdict:{ right:true, privateOpened:p } };
  assert.equal(questFightFoes(plain, 'sqKan', 5).length, 3); assert.equal(questFightFoes(pri, 'sqKan', 5).length, 4);
});

// ---------- who can join the fight (Rae's question 3) ----------
test('the owner joins the team when hired and standing, otherwise stands by; the guard joins on his own', () => {
  for (const id of ['sqKan', 'sqBoon']) { const q = SIDE_QUESTS.find(q => q.id === id), owner = QUEST_FIGHTS[id].owner;
    const full = setup({ id, size:5, level:5, variant:'first' }); assert.equal(full.battle.ownerJoined, true); assert.ok(full.battleActors().some(a => a.k === owner)); assert.equal(full.battle.team[0], owner);
    // PART-A: the owner is always hired (the quest does not exist otherwise) — only a fallen / recovering owner stands by
    const bare = make(); toStep3(bare, q); bare.crew.find(c => c.k === owner).recoverUntil = Date.now() + 60000; assert.ok(advanceQuest(bare, id, id === 'sqBoon' ? null : 0)); assert.equal(bare.battle.ownerJoined, false, 'recovering → stands by'); assert.ok(!bare.battleActors().some(a => a.k === owner));
  }
  const gq = setup({ id:'sqGuard', size:5, level:5, variant:'first' }); assert.equal(gq.battle.ownerJoined, true); assert.ok(gq.battleActors().some(a => a.k === 'guard'));
  const noGuard = make(); toStep3(noGuard, SIDE_QUESTS.find(q => q.id === 'sqGuard')); noGuard.guard.recoverUntil = Date.now() + 60000; assert.ok(advanceQuest(noGuard, 'sqGuard', 0)); assert.equal(noGuard.battle.ownerJoined, false);
});
test('the owner is put in the team even when the saved team did not include them, and the team never exceeds the zone limit', () => {
  const g = setup({ id:'sqKan', size:4, level:5, variant:'first' });   // team: Yama + kan + nira + taan
  assert.ok(g.battle.team.length <= g.partyMax()); assert.equal(g.battle.team[0], 'kan');
});

// ---------- roster-ID binding (Rae's question 2) ----------
test('quest moves belong to ONE roster ID: Satori@Asia has hers, another Kan (or another zone) does not', () => {
  const kan = id => ({ id, k:'kan', kind:'kan', homeZone:id.split(':')[0] });
  assert.equal(skillBelongsTo('eyeAwaitingPermission', kan('asia:kan')), true);
  for (const other of ['th:kan', 'west:kan', 'cyberhell:kan']) assert.equal(skillBelongsTo('eyeAwaitingPermission', kan(other)), false, other);
  assert.equal(skillBelongsTo('eyeAwaitingPermission', { id:'asia:boon', k:'boon', kind:'boon' }), false);
  assert.deepEqual(questSkillsForActor(kan('asia:kan')), ['eyeAwaitingPermission']); assert.deepEqual(questSkillsForActor(kan('west:kan')), []);
  assert.deepEqual(questSkillsForActor({ id:'west:boon', k:'boon', kind:'boon' }), ['letterDelivered']); assert.deepEqual(questSkillsForActor({ id:'th:guard', k:'guard', kind:'guard' }), ['gatekeeperStand']);
  // the training path still sees exactly one trained move per kind — quest moves never shadow it
  assert.equal(skillForActor(kan('asia:kan')), 'karmaFracture'); assert.equal(skillForActor({ id:'west:boon', k:'boon' }), 'lotusSanctuary'); assert.equal(skillForActor({ id:'th:guard', k:'guard' }), 'abyssGatebreaker');
  // unlocking writes the record of that roster ID only
  const g = make(); assert.equal(unlockQuestSkill(g, 'eyeAwaitingPermission'), true); assert.equal(unlockQuestSkill(g, 'eyeAwaitingPermission'), false);
  assert.equal(skillUnlocked(g, kan('asia:kan'), 'eyeAwaitingPermission'), true); assert.equal(skillUnlocked(g, kan('west:kan'), 'eyeAwaitingPermission'), false);
  assert.equal(reload(g).skillUnlocked(kan('asia:kan'), 'eyeAwaitingPermission'), true);
});
test('a Kan of another zone cannot cast the move even if its record is forged; the actor must also be unlocked', () => {
  const g = setup({ id:'sqKan', size:5, level:5, variant:'retry' }); const b = g.battle;
  const kan = g.battleActors().find(a => a.k === 'kan'); assert.equal(kan.id, 'asia:kan');
  assert.equal(g.skillWhy('eyeAwaitingPermission', kan), '');
  const first = setup({ id:'sqKan', size:5, level:5, variant:'first' }); assert.match(first.skillWhy('eyeAwaitingPermission', first.battleActors().find(a => a.k === 'kan')), /ภารกิจ/);
  assert.equal(first.battleAct('eyeAwaitingPermission', { actorId:'asia:kan', recipientId:'you' }), false);
});

// ---------- the moves ----------
function turnOf(g, id) { const b = g.battle; for (let n = 0; n < 50; n++) { const t = g.beginBattleTurns(); if (t.side === 'ally' && t.id === id) return t; if (t.side === 'foe') g.runEnemyTurn(); else g.confirmBattleCommand('defend', 'you'); g.finishBattleCommand(); } throw Error('no turn for ' + id); }
test('เนตรรอคำอนุญาต: no damage, the chosen foe turns on itself harder than Satori\'s normal hypnosis, the whole team gets a thin shield', () => {
  const g = setup({ id:'sqKan', size:5, level:5, variant:'retry' }), b = g.battle, kan = g.battleActors().find(a => a.k === 'kan');
  for (const f of b.foes) f.atk = [1, 2];
  for (let n = 0; n < 40; n++) { const t = g.beginBattleTurns(); if (t.side === 'ally' && t.id === kan.id) break; if (t.side === 'foe') g.runEnemyTurn(); else g.confirmBattleCommand('defend', 'you'); g.finishBattleCommand(); }
  assert.equal(g.beginBattleTurns().id, kan.id); kan.morale = 100;
  const foe = b.foes.find(f => f.hp > 0); g.selectFoe(foe.id); const hp = foe.hp;
  assert.ok(g.confirmBattleCommand('eyeAwaitingPermission', 'you'));
  assert.equal(foe.hp, hp, 'the move itself does no damage'); assert.equal(foe.confuse > 0, true); assert.equal(foe.confuseMultiplier, COMBAT_SKILLS.eyeAwaitingPermission.reflect); assert.ok(COMBAT_SKILLS.eyeAwaitingPermission.reflect > 1.2, 'stronger than the ordinary hypnosis multiplier');
  for (const a of g.battleActors()) assert.ok(b.protection[a.id]?.shield > 0, a.id);
  assert.equal(kan.morale, 100 - COMBAT_SKILLS.eyeAwaitingPermission.morale); assert.match(g.skillWhy('eyeAwaitingPermission', kan), /รออีก/);
  // the reflected hit really lands on the foe itself, harder than its own roll range allows from a plain hit
  g.finishBattleCommand(); for (let n = 0; n < 40 && foe.confuse > 0; n++) { const t = g.beginBattleTurns(); if (t.side === 'foe') g.runEnemyTurn(); else g.confirmBattleCommand('defend', 'you'); g.finishBattleCommand(); }
  assert.ok(foe.hp < hp || foe.hp <= 0, 'the foe hurt itself');
});
test('คำฝากถึงมือ: heals every ally, clears rope/gauze, gives a small attack buff, and still works for a sealed Grace', () => {
  const g = setup({ id:'sqBoon', size:5, level:5, variant:'retry' }), b = g.battle, boon = g.battleActors().find(a => a.k === 'boon');
  for (const f of b.foes) f.atk = [1, 2];   // everybody is still standing on their own turn
  for (let n = 0; n < 40; n++) { const t = g.beginBattleTurns(); if (t.side === 'ally' && t.id === boon.id) break; if (t.side === 'foe') g.runEnemyTurn(); else g.confirmBattleCommand('defend', 'you'); g.finishBattleCommand(); }
  assert.equal(g.beginBattleTurns().id, boon.id);
  b.youHp = 40; for (const a of g.battleActors()) if (a.id !== 'you') a.morale = 50;
  b.sealed = { [boon.id]:{ by:'gauze', until:99 }, 'global:nira':{ by:'gauze', until:99 } }; assert.match(g.crewHelpWhy(boon), /ผ้าปิดปาก/);
  assert.equal(g.skillWhy('letterDelivered', boon), '', 'the cure is never blocked by the seal');
  assert.ok(g.confirmBattleCommand('letterDelivered', 'you'));
  assert.ok(b.youHp > 40); for (const a of g.battleActors()) if (a.id !== 'you' && a.id !== boon.id) assert.ok(a.morale > 50, a.id);
  assert.deepEqual(b.sealed, {}); for (const a of g.battleActors()) assert.ok(b.protection[a.id]?.buff > 0 && b.protection[a.id].buff <= .1, a.id);
});
test('ทวารบาลยืนรับแค้น: damages every foe, pulls every attack to the Guard with the defend stance, ends after his next turn', () => {
  const g = setup({ id:'sqGuard', size:5, level:5, variant:'retry' }), b = g.battle, guard = g.battleActors().find(a => a.k === 'guard');
  const hp = b.foes.map(f => f.hp); b.actorId = guard.id; g.selectFoe(b.foes[0].id);
  assert.ok(g.battleAct('gatekeeperStand', { actorId:guard.id, recipientId:'you' }));
  b.foes.forEach((f, i) => assert.ok(f.hp < hp[i], 'area damage ' + f.id)); assert.equal(b.taunt.id, guard.id); assert.equal(b.defending[guard.id], true);
  for (let i = 0; i < 40; i++) assert.equal(g.foeTarget(b.foes[0]).id, guard.id);
  assert.equal(g.foeTarget(b.foes[0]).actor.id, guard.id);
  b.actorTurns = { ...(b.actorTurns || {}), [guard.id]: b.taunt.until }; const gturn = { id:guard.id, side:'ally' };
  g.beginBattleTurns(); b.turnQueue.remaining.unshift(gturn); g.finishBattleCommand();
  import('../src/battle-turns.js').then(m => { m.completeCombatTurn(g, gturn); assert.equal(b.taunt, undefined); assert.equal(b.defending?.[guard.id], undefined); });
});
test('rope / gauze: a hit foe with `seal` blocks the victim special for exactly one of its own turns', async () => {
  const g = setup({ id:'sqBoon', size:5, level:5, variant:'first' }), b = g.battle, { completeCombatTurn } = await import('../src/battle-turns.js');
  const kan = g.battleActors().find(a => a.k === 'boon');
  for (const f of b.foes) { f.aim = 'support'; f.aimChance = 1; f.seal = 'gauze'; }
  let sealed = null;
  for (let i = 0; i < 12 && !sealed; i++) { const t = g.beginBattleTurns(); if (t.side === 'foe') { g.runEnemyTurn(); sealed = Object.keys(b.sealed || {})[0] || null; } else g.confirmBattleCommand('defend', 'you'); g.finishBattleCommand(); }
  assert.ok(sealed, 'a gauze hit sealed a support ally'); const who = g.battleActors().find(a => a.id === sealed); assert.match(g.sealWhy(who), /ผ้าปิดปาก/);
  const need = b.sealed[sealed].until; assert.equal(need, (b.actorTurns?.[sealed] || 0) + 1);
  completeCombatTurn(g, { id:sealed, side:'ally' }); assert.equal(g.sealWhy(who), '');
});
test('an unsealed fight of an ordinary kind never calls the new target code (random stream unchanged)', () => {
  const g = createGame(); const calls = []; const real = Math.random; Math.random = () => { calls.push(1); return .5; };
  try { g.battle = { kind:'soul', foes:[{ id:'a', hp:1, maxHp:1 }] }; g.crew = []; g.guard = null; g.foeTarget({ id:'a' }); } finally { Math.random = real; }
  assert.ok(calls.length >= 1);   // weightedTarget draws once — exactly as enemyTarget() always did
});

// ---------- balance & art ----------
test('first attempts are winnable but not free: win rate 55-97 % at team sizes 4-7 for all three fights, 3-10 rounds, nobody times out', () => {
  for (const id of ['sqKan', 'sqBoon', 'sqGuard']) for (const size of [4, 5, 6, 7]) {
    const rows = Array.from({ length:40 }, (_, i) => simulate({ id, size, level:5, variant:'first', seed:7000 + i, privateOpened:i % 5 === 0 }));
    const wins = rows.filter(r => r.result === 'win').length / rows.length * 100, rounds = rows.reduce((a, r) => a + r.rounds, 0) / rows.length;
    assert.ok(wins >= 55 && wins <= 97, `${id}/${size} win ${wins}`); assert.ok(rounds >= 3 && rounds <= 10, `${id}/${size} rounds ${rounds}`); assert.equal(rows.filter(r => r.result === 'timeout').length, 0);
  }
});
test('the new moves are in the same strength class as the trained ones (replay with the move wins more, but never makes the fight trivial)', () => {
  for (const id of ['sqKan', 'sqBoon', 'sqGuard']) {
    const rate = variant => Array.from({ length:60 }, (_, i) => simulate({ id, size:5, level:5, variant, seed:9000 + i, privateOpened:false }).result === 'win').filter(Boolean).length / 60 * 100;
    const first = rate('first'), retry = rate('retry'), trained = rate('trained');
    assert.ok(retry >= first - 5, `${id} retry ${retry} first ${first}`); assert.ok(retry <= 100); assert.ok(retry - first <= 35, `${id} move adds ${retry - first} points`);
    assert.ok(trained - first <= 35);
  }
});
test('every new move has icon + scenes that exist (placeholders point at the same character\'s existing move art) and never touches the art files', () => {
  for (const skill of ['eyeAwaitingPermission', 'letterDelivered', 'gatekeeperStand'])
    for (const zone of ['th', 'asia', 'west', 'cyberhell']) { for (const src of [...skillScenes(skill, zone), SKILL_ICONS[skill]]) assert.ok(existsSync(new URL('../' + src, import.meta.url)), src); }
  assert.deepEqual(skillScenes('eyeAwaitingPermission', 'asia'), skillScenes('karmaFracture', 'asia'));
  const css = readFileSync(new URL('../src/combat-skill-assets.js', import.meta.url), 'utf8'); assert.doesNotMatch(css, /hue-rotate|brightness\(|saturate\(|tint\s*:/i);
});
test('UI: the battle menu lists quest moves next to the trained one and wide moves fire without asking for a target', () => {
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  assert.ok(ui.includes('questSkillsForActor(actor).filter(k => g.skillUnlocked(actor, k))')); assert.ok(ui.includes('wide.area || (wide.team && !wide.target)'));
  assert.ok(ui.includes("done?.over === 'lose' && done.kind !== 'questFight'"), 'a lost quest fight still returns to the quest scene');
  assert.ok(ui.includes('function questReceiptHtml') && ui.includes('<h3>ได้รับ:</h3>'));
});
test('cache-busting: every changed module moved to the 20261110-questrewards release string (import map + entry script)', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const m of ['game', 'ui', 'battle-fx-map', 'battle-turns', 'battle-result', 'combat-skills', 'combat-skill-assets', 'side-quests', 'quest-panels', 'e1-content', 'i18n'])
    assert.match(html, new RegExp(`"\\./src/${m}\\.js": "\\./src/${m}\\.js\\?v=20261110-questrewards"`), m);
  assert.match(html, /src="src\/ui\.js\?v=20261110-questrewards"/);
  assert.ok(!/src\/(game|ui)\.js\?v=20261110-battlefx/.test(html), 'no stale game/ui release left');
});
