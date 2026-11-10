// PART-A (10 พ.ย. 2569, brief 2026-11-10-avegee-food-system.md): quests tied to a character need that character hired; the lost quest fight offers retry / rest.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { syncSceneZone, CREW, GUARD } from '../src/data.js';
import { QUESTS, SIDE_QUESTS, KIN_QUESTS, questTarget, questState, questUnlocked, questCharacterHired, questMarkers, questsForActor, advanceQuest, recordQuestVerdict } from '../src/side-quests.js';
import { questJournalHtml, createQuestAction } from '../src/quest-panels.js';
import { QUEST_FIGHT_SYSTEM_TEXT } from '../src/quest-fights.js';
import { rosterId } from '../src/roster.js';
import { hireFor } from './helpers/quest-hire.mjs';
globalThis.Image ??= class {};
const make = () => { const g = createGame(); g.save = () => true; g.onChange = () => {}; g.gameCompleted = true;
  g.zoneTravel.visited = { th:true, asia:true, west:true, cyberhell:true }; g.zoneTravel.ports = { th:true, asia:true, west:true, cyberhell:true };
  g.merchantJourney = { asia:{ arrived:true }, west:{ arrived:true }, cyberhell:{ arrived:true } }; return g; };
// enter a zone the way the game hands it over: own crew per branch (Nira follows, Taan is given except in Cyberhell), no guard until hired there
const enter = (g, zone) => { if (g.zone === zone) return; g.zone = zone; syncSceneZone(zone); g.crew = g.crew.filter(c => c.self || c.follow); g.guard = null;
  if (zone !== 'cyberhell') { g.coin += 0; g.hire('taan'); } };
const goto = (g, q, hire = true) => { const p = questTarget(g, q); enter(g, p.zone); if (hire) hireFor(g, q); Object.assign(g.player, questTarget(g, q)); };
const reload = g => { const h = make(); assert.ok(h.restore(JSON.parse(JSON.stringify(g.snapshot())))); h.save = () => true; h.onChange = () => {}; return h; };
function verdict(g, q) {
  const soul = g.queue.find(s => s.case === q.caseId); assert.ok(soul);
  g.applyVerdict({ right:true, heaven:soul.pure, score:75, stars:3, tham:100, ked:75, over:0, short:0, karma:0 }, soul, 'ทดสอบ');
  g.queue = g.queue.filter(s => s !== soul);
}
function lose(g) {
  g.battle.youHp = 0; for (const f of g.battle.foes) f.atk = [999, 999];
  for (let n = 0; g.battle && !g.battle.over && n < 70; n++) { const f = g.battle.foes.find(f => f.hp > 0); g.selectFoe(f.id); g.battleAct('atk'); }
  assert.equal(g.battle?.over, 'lose'); g.endBattle();
}
function win(g) {
  for (let n = 0; g.battle && !g.battle.over && n < 70; n++) {
    for (const f of g.battle.foes) f.atk = [0, 0];
    const f = g.battle.foes.find(f => f.hp > 0); f.hp = 1; g.selectFoe(f.id); g.battleAct('atk');
  }
  assert.equal(g.battle?.over, 'win'); g.endBattle(); g.pendingReward = null;
}
const HIRED_FROM_START = { th:['taan'], asia:['taan'], west:['taan'] };   // Taan is given in every branch except Cyberhell · Nira follows every branch · the merchant is not a hire

test('every quest names the character it belongs to, and only Nira / merchant quests exist without a hire', () => {
  const g = make();
  for (const q of QUESTS) {
    const zone = q.kin ? q.from : q.zone, free = ['nira', 'merchant'].includes(q.npc) || (HIRED_FROM_START[zone] || []).includes(q.npc);
    enter(g, zone);
    assert.equal(questCharacterHired(g, q), free, `${q.id} (${q.npc}@${zone}) before hire`);
    assert.equal(questUnlocked(g, q), free, `${q.id} unlocked before hire`);
    assert.equal(questsForActor(g, q.npc, zone).some(x => x.id === q.id), free, `${q.id} owner button before hire`);
    assert.equal(questMarkers(g).some(m => m.id === q.id), free, `${q.id} map marker before hire`);
    assert.equal(questJournalHtml(g).includes(q.title), free, `${q.id} in the journal before hire`);
    if (free) continue;
    // cannot be started by a click at the home point either
    Object.assign(g.player, questTarget(g, q)); assert.equal(advanceQuest(g, q.id), false, `${q.id} accept before hire`);
    assert.equal(g.sideQuests[q.id], undefined, 'no quest record was created');
    // hire → the quest appears everywhere
    hireFor(g, q); Object.assign(g.player, questTarget(g, q));
    assert.ok(questCharacterHired(g, q) && questUnlocked(g, q), `${q.id} after hire`);
    assert.ok(questsForActor(g, q.npc, zone).some(x => x.id === q.id)); assert.ok(questMarkers(g).some(m => m.id === q.id)); assert.ok(questJournalHtml(g).includes(q.title));
    assert.ok(advanceQuest(g, q.id)); assert.equal(questState(g, q.id).step, 1);
  }
});

test('a character hired in another branch counts (roster), a character of a different branch does not', () => {
  const g = make(), q = SIDE_QUESTS.find(q => q.id === 'sqKan');
  enter(g, 'asia'); hireFor(g, q);   // Satori = asia:kan
  enter(g, 'th'); assert.ok(g.roster[rosterId('asia', 'kan')]);
  assert.ok(questUnlocked(g, q), 'read from the roster while standing in TH');
  assert.ok(questJournalHtml(g).includes(q.title));
  const h = make(); h.coin += CREW.find(c => c.k === 'kan').hire; assert.ok(h.hire('kan'));   // Kan of TH, not Satori
  assert.equal(questUnlocked(h, q), false, 'TH Kan is another person');
});

test('kin quests follow the character at the current step: the recipient in the other zone must be hired too, the quest hides (not deleted) until then', () => {
  const g = make(), q = KIN_QUESTS.find(q => q.id === 'kinKan');   // Cypher (cyberhell:kan) → Kan (th:kan)
  goto(g, q); assert.ok(advanceQuest(g, q.id)); assert.equal(questState(g, q.id).step, 1);
  assert.equal(questTarget(g, q).zone, 'th');
  assert.equal(questUnlocked(g, q), false, 'step 1 points at TH Kan, who is not hired');
  assert.ok(!questJournalHtml(g).includes(q.title)); assert.equal(questState(g, q.id).step, 1, 'progress kept');
  goto(g, q); assert.ok(questUnlocked(g, q)); assert.ok(advanceQuest(g, q.id, 0)); assert.equal(questState(g, q.id).step, 2);
});

test('old save: a quest started before the hire rule stays in the save, is hidden until the character is hired, then continues where it was', () => {
  const g = make(), q = SIDE_QUESTS.find(q => q.id === 'sqBoon');
  goto(g, q); assert.ok(advanceQuest(g, q.id)); goto(g, q); assert.ok(advanceQuest(g, q.id, 0)); assert.equal(questState(g, q.id).step, 2);
  const snap = JSON.parse(JSON.stringify(g.snapshot()));
  delete snap.roster[rosterId('west', 'boon')]; snap.crew = snap.crew.filter(c => c.k !== 'boon'); if (snap.zoneSave?.west) snap.zoneSave.west.crew = (snap.zoneSave.west.crew || []).filter(c => c.k !== 'boon');
  const h = make(); assert.ok(h.restore(snap)); h.save = () => true; h.onChange = () => {};
  assert.deepEqual({ step:h.sideQuests.sqBoon.step, choice:h.sideQuests.sqBoon.choice, caseId:h.sideQuests.sqBoon.caseId }, { step:2, choice:0, caseId:q.caseId }, 'progress not deleted');
  assert.equal(questUnlocked(h, q), false); assert.ok(!questJournalHtml(h).includes(q.title)); assert.ok(!questMarkers(h).some(m => m.id === q.id));
  goto(h, q); assert.ok(questUnlocked(h, q)); assert.ok(questJournalHtml(h).includes(q.title));
});

test('a lost quest fight: "สู้อีกครั้ง" restarts the fight with the saved choice, "พักไว้ก่อน" keeps the quest at step 3 for later (also after reload)', () => {
  for (const id of ['sqKan', 'sqGuard', 'sqBoon']) {
    const g = make(), q = SIDE_QUESTS.find(q => q.id === id);
    goto(g, q); advanceQuest(g, q.id); goto(g, q); assert.ok(advanceQuest(g, q.id, id === 'sqBoon' ? 1 : null)); verdict(g, q); goto(g, q);
    assert.ok(advanceQuest(g, id, id === 'sqBoon' ? null : 1)); assert.equal(g.battle?.kind, 'questFight');
    lose(g);
    const s = questState(g, id); assert.equal(s.step, 3); assert.equal(s.fightLost, true, 'the loss is remembered'); assert.equal(s.choice, 1); assert.equal(g.battle, null);
    // retry = what the lose window's button does: one quest action at step 3 with no new choice
    const retry = createQuestAction(g, id, 3); assert.ok(retry(null)); assert.equal(g.battle?.kind, 'questFight'); assert.equal(g.battle.questId, id); assert.equal(questState(g, id).choice, 1);
    assert.equal(retry(null), false, 'the same button cannot start twice');
    // rest = flee / lose and leave: nothing is lost, the save keeps step 3 + the loss flag, the quest window still offers the fight
    assert.ok(g.fleeBattle()); g.endBattle(); assert.equal(questState(g, id).step, 3); assert.equal(questState(g, id).fightLost, true);
    const h = reload(g); assert.equal(h.sideQuests[id].fightLost, true); assert.equal(h.sideQuests[id].step, 3);
    goto(h, q); assert.ok(advanceQuest(h, id)); assert.equal(h.battle?.kind, 'questFight'); win(h);
    assert.equal(questState(h, id).step, 4); assert.equal(questState(h, id).fightLost, undefined, 'cleared after the win'); assert.equal(questState(h, id).fought, true);
  }
});

test('UI: the lose window has exactly the two buttons (retry / rest) and the win window one; the retry label is also used in the quest window for sqBoon after a loss', () => {
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  assert.equal(QUEST_FIGHT_SYSTEM_TEXT.retry, 'สู้อีกครั้ง'); assert.equal(QUEST_FIGHT_SYSTEM_TEXT.rest, 'พักไว้ก่อน');
  assert.ok(ui.includes('data-quest-fight-retry') && ui.includes('data-quest-fight-rest') && ui.includes('data-quest-fight-next'));
  assert.ok(/outcome==='win'\?`<button[^`]*data-quest-fight-next[^`]*`:`<button[^`]*data-quest-fight-retry[^`]*data-quest-fight-rest/.test(ui), 'win → one button · lose → retry + rest');
  assert.ok(ui.includes("retryFight=fightQuest&&(s.fightLost||"), 'sqBoon shows สู้อีกครั้ง once a fight was lost');
});
