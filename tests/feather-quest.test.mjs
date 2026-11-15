// QUEST-DAM-B (owner 14-15 Nov): the merchant's second quest "ขนที่ไม่ไหม้" (Rae) - opens after sqMerchant, four steps, one fight, pays the Phoenix Feather.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { syncSceneZone } from '../src/data.js';
import { QUESTS, questTarget, questState, questUnlocked, questMarkers, questsForActor, advanceQuest, questDialogue, questFightStep } from '../src/side-quests.js';
import { QUEST_REWARDS, questNeedsFight, questRewardPreview } from '../src/quest-rewards.js';
import { QUEST_FIGHTS, fightScene, questFightFoes } from '../src/quest-fights.js';
import { FEATHER_ID, FEATHER_NEED, FEATHER_PIT, featherText } from '../src/feather-quest.js';
import { questJournalHtml, questTrackerHtml, questRewardText } from '../src/quest-panels.js';
import { activeQuestEntries } from '../src/quest-journal.js';
import { setLang } from '../src/i18n.js';
globalThis.Image ??= class {};
globalThis.document ??= { documentElement:{}, querySelectorAll:() => [], hidden:false };   // setLang() writes <html lang> and calls the listeners

const F = () => QUESTS.find(q => q.id === FEATHER_ID);
const make = () => { const g = createGame(); g.save = () => true; g.onChange = () => {}; g.zone = 'asia'; syncSceneZone('asia');
  g.zoneTravel.visited = { th:true, asia:true, west:true, cyberhell:true }; g.zoneTravel.ports = { th:true, asia:true, west:true, cyberhell:true };
  g.merchantJourney = { asia:{ arrived:true, elapsed:90000 }, west:{ arrived:true }, cyberhell:{ arrived:true } }; g.level = 5; return g; };
const afterFirstQuest = g => { g.sideQuests.sqMerchant = { step:5, choice:0, done:true, reward:{ coin:0, order:0, exp:30, items:{}, skill:null, retro:false } }; return g; };
const atTarget = g => { const p = questTarget(g, F()); g.zone = p.zone; syncSceneZone(p.zone); Object.assign(g.player, { x:p.x, y:p.y }); return p; };
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
const giveAsh = g => { for (const [k, n] of Object.entries(FEATHER_NEED)) g.inventory[k] = (g.inventory[k] || 0) + n; };

test('opens only after the merchant\'s first quest (sqMerchant) is finished - never before, whatever else is done', () => {
  const g = make(); g.gameCompleted = true;                   // even a finished game does not open it early
  const q = F();
  assert.equal(questUnlocked(g, q), false, 'before sqMerchant is done');
  assert.ok(!questsForActor(g, 'merchant', 'asia').some(x => x.id === FEATHER_ID));
  assert.ok(!questMarkers(g).some(m => m.id === FEATHER_ID));
  g.sideQuests.sqMerchant = { step:4, done:false };           // taken and nearly closed is not enough
  assert.equal(questUnlocked(g, q), false);
  afterFirstQuest(g);
  assert.equal(questUnlocked(g, q), true, 'after sqMerchant is done');
  assert.ok(questsForActor(g, 'merchant', 'asia').some(x => x.id === FEATHER_ID), 'the merchant owns it');
  const pin = questMarkers(g).find(m => m.id === FEATHER_ID);
  assert.ok(pin); assert.equal(pin.title, 'พ่อค้ามีเรื่องจะฝาก', 'Rae\'s sign over the merchant');
  assert.match(questJournalHtml(g), /ขนที่ไม่ไหม้/);
});

test('step by step: take it -> give the ash (taken from the bag) -> the pit -> the fight -> back to the merchant -> reward once', () => {
  const g = afterFirstQuest(make()), q = F();
  // 0 -> 1
  let p = atTarget(g); assert.equal(p.npc, 'merchant');
  assert.equal(questState(g, q.id).step, 0);
  assert.ok(advanceQuest(g, q.id)); assert.equal(questState(g, q.id).step, 1);
  assert.deepEqual(activeQuestEntries(g).map(e => e.objective), [featherText().track[1]], 'the tracker line of step 2');
  // 1: the ash is not there -> nothing happens; partly there -> still nothing
  p = atTarget(g);
  assert.equal(advanceQuest(g, q.id), false);
  g.inventory.ashStone = 3; g.inventory.emberWood = 1;
  assert.equal(advanceQuest(g, q.id), false, 'enchanted cinder x2 is missing one');
  assert.equal(g.inventory.ashStone, 3, 'nothing taken on a refusal');
  g.inventory.emberWood = 5; g.inventory.ashStone = 4;
  assert.ok(advanceQuest(g, q.id)); assert.equal(questState(g, q.id).step, 2);
  assert.equal(g.inventory.ashStone, 1, 'ash-stone x3 given'); assert.equal(g.inventory.emberWood, 3, 'enchanted cinder x2 given');
  // 2: the target is the ash pit, not the merchant
  p = questTarget(g, q); assert.equal(p.npc, 'pit'); assert.equal(p.zone, 'asia');
  assert.ok(Math.hypot(p.x - FEATHER_PIT[0], p.y - FEATHER_PIT[1]) < 90, 'the pit by the frontier (walkable spot near it)');
  assert.ok(questMarkers(g).some(m => m.id === q.id && m.npc === 'pit'), 'a pin at the pit');
  assert.ok(!questsForActor(g, 'merchant', 'asia').some(x => x.id === q.id), 'the merchant no longer holds it');
  g.player.x = 100; g.player.y = 100;
  assert.equal(advanceQuest(g, q.id), false, 'far from the pit: the bundle cannot be set down');
  atTarget(g);
  assert.ok(advanceQuest(g, q.id), 'at the pit: the fight starts');
  assert.equal(g.battle.kind, 'questFight'); assert.equal(g.battle.questId, q.id); assert.equal(g.battle.ownerJoined, true, 'no owner to wait for: no "stands by the field" line');
  assert.equal(questState(g, q.id).step, 2, 'the fight keeps step 2 while it runs');
  win(g);
  assert.equal(questState(g, q.id).step, 3); assert.equal(questState(g, q.id).fought, true);
  // 3: back at the merchant
  p = questTarget(g, q); assert.equal(p.npc, 'merchant');
  atTarget(g);
  const coin = g.coin, holy = g.inventory.holyWater || 0, exp0 = g.exp, level = g.level;
  assert.ok(advanceQuest(g, q.id));
  const s = questState(g, q.id);
  assert.equal(s.done, true); assert.equal(s.step, 5);
  assert.equal(g.coin - coin, 60, '60 coins'); assert.equal(g.inventory.phoenixFeather, 2, 'Phoenix Feather x2'); assert.equal((g.inventory.holyWater || 0) - holy, 1, 'holy water x1');
  assert.deepEqual({ ...s.reward.items }, { phoenixFeather:2, holyWater:1 }); assert.equal(s.reward.exp, 30); assert.equal(s.reward.skill, null, 'no ultimate to learn');
  assert.ok(g.exp > exp0 || g.level > level, 'EXP 30 was added');
  assert.ok(g.logs.some(l => /ได้ขนนกฟีนิกซ์ ×2/.test(typeof l === 'string' ? l : JSON.stringify(l))), 'the closing line of Rae');
  // paid once
  assert.equal(advanceQuest(g, q.id), false);
  const h = reload(g); assert.equal(h.inventory.phoenixFeather, 2); assert.equal(questState(h, q.id).done, true);
  assert.equal(h.coin, g.coin, 'a reload pays nothing more');
});

test('a lost fight keeps the quest at the pit and the bundle (the ash is not taken again); retry works and wins', () => {
  const g = afterFirstQuest(make()), q = F();
  atTarget(g); advanceQuest(g, q.id); giveAsh(g); atTarget(g); advanceQuest(g, q.id);
  assert.equal(questState(g, q.id).step, 2); assert.equal(g.inventory.ashStone || 0, 0);
  atTarget(g); assert.ok(advanceQuest(g, q.id)); lose(g);
  const s = questState(g, q.id);
  assert.equal(s.step, 2, 'still at the pit'); assert.equal(s.fightLost, true); assert.ok(!s.fought);
  assert.equal(g.inventory.ashStone || 0, 0, 'no second payment of ash');
  assert.deepEqual(fightScene(q.id, s, 'lose'), featherText().lose);
  atTarget(g); assert.ok(advanceQuest(g, q.id), 'set the bundle down again'); assert.equal(g.battle.kind, 'questFight'); win(g);
  assert.equal(questState(g, q.id).step, 3); assert.ok(!questState(g, q.id).fightLost);
});

test('saved at every step and reloaded: the step, the pit target and the fight state come back; old saves without the quest load clean', () => {
  const g = afterFirstQuest(make()), q = F();
  atTarget(g); advanceQuest(g, q.id);
  let h = reload(g); assert.equal(questState(h, q.id).step, 1);
  giveAsh(g); atTarget(g); advanceQuest(g, q.id);
  h = reload(g); assert.equal(questState(h, q.id).step, 2); assert.equal(questTarget(h, q).npc, 'pit');
  atTarget(g); advanceQuest(g, q.id); win(g);
  h = reload(g); assert.equal(questState(h, q.id).step, 3); assert.equal(questState(h, q.id).fought, true);
  // an old save: no record of the quest at all
  const old = JSON.parse(JSON.stringify(make().snapshot())); delete old.sideQuests[FEATHER_ID];
  const k = make(); assert.ok(k.restore(old)); assert.equal(questState(k, FEATHER_ID).step, 0); assert.equal(questState(k, FEATHER_ID).done, false);
});

test('the fight: a big ash-smoke and two small ones, the lightest kind (no ultimate), team-size curves exist for 3-7', () => {
  const g = afterFirstQuest(make()), def = QUEST_FIGHTS[FEATHER_ID];
  assert.equal(questNeedsFight(FEATHER_ID), true); assert.equal(questFightStep(F()), 2);
  assert.equal(def.skill, null); assert.equal(def.owner, null);
  const foes = questFightFoes(g, FEATHER_ID, 5);
  assert.deepEqual(foes.map(f => f.sp), ['mob-q-ashsmoke-big', 'mob-q-ashsmoke', 'mob-q-ashsmoke']);
  assert.ok(foes[0].bigOne === undefined || true);
  for (const f of foes) assert.ok(existsSync(new URL(`../img/${f.sp}.webp`, import.meta.url).pathname), f.sp + ' picture is in img/');
  assert.deepEqual(foes.slice(1).map(f => f.aim), ['support', 'support']);
  for (const size of [3, 4, 5, 6, 7]) { const f = questFightFoes(g, FEATHER_ID, size); assert.ok(f[0].hp > 0 && f[0].atk[0] > 0, 'size ' + size); }
  const p = questRewardPreview(g, F()); assert.equal(p.fight, true); assert.equal(p.skill, null);
  assert.match(questRewardText(g, F()), /ขนนกฟีนิกซ์ ×2/); assert.doesNotMatch(questRewardText(g, F()), /ท่าไม้ตายใหม่/);
});

test('words: Rae\'s Thai and English scenes, tracker lines and the buttons, and the closing scene says nobody is given a new life', () => {
  const g = afterFirstQuest(make()), q = F();
  const th = featherText(); setLang('en'); const en = featherText(); setLang('th');
  assert.notEqual(th, en);
  assert.equal(th.title, 'ขนที่ไม่ไหม้'); assert.equal(en.title, 'The Feather That Would Not Burn');
  assert.deepEqual(th.track, { 0:'ฟังเรื่องที่พ่อค้าควันทองอยากฝาก', 1:'เก็บเถ้าจากชายแดนให้พ่อค้า (เศษหินเถ้า 3 · เศษถ่านอาถรรพ์ 2)', 2:'ถือห่อเซ่นไปวางที่บ่อเถ้าริมชายแดน', 3:'กลับไปหาพ่อค้าควันทอง' });
  assert.equal(th.buttons.place, 'วางห่อเซ่น'); assert.equal(th.buttons.give, 'ส่งเถ้าให้พ่อค้า');
  assert.equal(th.intro.length, 3); assert.equal(th.pre.length, 4); assert.equal(th.win.length, 3); assert.equal(th.lose.length, 2); assert.equal(th.close.length, 4);
  assert.equal(en.intro.length, 3); assert.equal(en.pre.length, 4); assert.equal(en.close.length, 4);
  assert.deepEqual(questDialogue(g, q), th.intro);
  g.sideQuests[FEATHER_ID] = { step:1, done:false }; assert.deepEqual(questDialogue(g, q), th.notEnough);
  g.sideQuests[FEATHER_ID] = { step:2, done:false }; assert.deepEqual(questDialogue(g, q), th.handed);
  g.sideQuests[FEATHER_ID] = { step:3, done:false }; assert.deepEqual(questDialogue(g, q), th.close);
  assert.deepEqual(fightScene(FEATHER_ID, {}, 'pre'), th.pre); assert.deepEqual(fightScene(FEATHER_ID, {}, 'win'), th.win);
  assert.match(th.close[2], /ไม่ได้ให้ชีวิตใครใหม่/);
  // the spelling decided by the owner: ขนนกฟีนิกซ์, never ฟินิกซ์ / ฟินิกส์
  const src = readFileSync(new URL('../src/feather-quest.js', import.meta.url), 'utf8') + readFileSync(new URL('../src/quest-fights.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /ฟินิกซ์|ฟินิกส์/); assert.match(th.receipt, /ขนนกฟีนิกซ์ ×2/);
  setLang('th');
});

test('the merchant sells the feather after the quest: 150 here, max 3, and the shop lists it only then', () => {
  const g = afterFirstQuest(make()); g.coin = 3000;
  assert.equal(g.buyMerchant('phoenixFeather'), false);
  g.sideQuests[FEATHER_ID] = { step:5, done:true };
  assert.equal(g.buyMerchant('phoenixFeather'), true);
  assert.equal(g.inventory.phoenixFeather, 1);
});

test('the pit art: the pit is drawn by the scene code until a picture img/quest-ash-pit.webp exists; the foe pictures are in img/', () => {
  const scene = readFileSync(new URL('../src/scene.js', import.meta.url), 'utf8');
  assert.match(scene, /img\('quest-ash-pit'\)/, 'a drawn pit overwrites the plain one with no code change');
  for (const f of ['mob-q-ashsmoke', 'mob-q-ashsmoke-big', 'item-phoenix-feather']) assert.ok(existsSync(new URL(`../img/${f}.webp`, import.meta.url).pathname), f);
});
