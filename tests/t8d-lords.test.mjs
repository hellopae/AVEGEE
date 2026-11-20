// T8d (Rae R2 part D section 8.3 - 8.6): after the reinforcements - `cyber-reinforcements-advance` -> `cyber-control` (the four lords under Archon-Zero's hand) -> the four possessed lords one by one (their own broken voice
// at the start of the fight, their thanks on a page after it) -> `cyber-duel` (text as it was) -> Archon-Zero (his lines + the half-way lines of him / HOME-67 / Nira) -> the three lines after the win -> `ending-capture`
// -> the dais -> `ending` (2 pages) -> `ending-coda` (not compulsory). TH + EN. No dice: every foe 1 hp / atk 0 (final-event-helpers win); the half-way line is checked by setting the boss's hp.
import test from 'node:test';
import assert from 'node:assert/strict';
import { finalGame, win, roundTrip, finishBossJustice } from './final-event-helpers.mjs';
import { storyOf } from '../src/story.js';
import { setLang } from '../src/i18n.js';
import { finalEventActors } from '../src/final-event.js';
import { RAW_Z4H_RULERS, RAW_Z4H_DUEL, RAW_Z4H_AFTER_WIN, RAW_Z4H_SCENES } from '../src/z4h-raw.js';
import { Z4H, Z4H_RULER_START, Z4H_DUEL } from '../src/z4h-final.js';
globalThis.Image ??= class {};
globalThis.document ??= { documentElement:{} };
const THAI = /[฀-๿]/;
const ZONES = ['th', 'asia', 'west', 'cyberhell'];
const EN_NAME = { th:'Yamabat', asia:'Zhao Wen', west:'Halvar', cyberhell:'Nexar' };
/** the map part of the finale: the three waves + the cutscenes, then `cyber-reinforcements-advance` and `cyber-control` (choreography as the map plays it) */
function toTheLords() {
  const g = finalGame(); const s = g.finalEventState();
  g.beginFinalArrival(); g.advanceFinalArrival(1200); g.beginFinalChapter(); g.completeStory(); g.dismissFinalPreparation();
  for (let i = 1; i <= 3; i++) { assert.ok(g.startFinalEncounter(`minion:${i}`)); win(g); g.endBattle(); assert.equal(g.acknowledgeFinalReward(), true); }
  g.completeStory(); g.completeStory(); assert.equal(s.presentation, 'reinforcementMap');
  assert.equal(g.continueFinalMapScene(), true); assert.deepEqual(g.storyQueue.map(p => p.key), ['cyber-reinforcements-advance']);
  g.completeStory(); assert.deepEqual(g.storyQueue.map(p => p.key), ['cyber-control']); g.completeStory(); assert.equal(s.presentation, 'prepare'); g.dismissFinalPreparation();
  return g;
}

test('cyber-reinforcements / -advance / cyber-control: Rae\'s text, TH + EN, the same pictures; WATSON-03 still speaks (he is the Zone 4 Guard); no "four waves" left', () => {
  const pic = { 'cyber-reinforcements':'img/story-cyberhell-reinforcements-01.webp', 'cyber-reinforcements-advance':'img/story-cyberhell-reinforcements-02.webp', 'cyber-control':'img/story-cyberhell-02-v3.webp' };
  for (const [k, img] of Object.entries(pic)) {
    setLang('th'); const th = storyOf(k); setLang('en'); const en = storyOf(k); setLang('th');
    assert.equal(th.pages[0].image, img, k); assert.equal(th.pages[0].title, RAW_Z4H_SCENES[k].pages[0].title.th); assert.equal(en.pages[0].line, RAW_Z4H_SCENES[k].pages[0].line.en); assert.ok(!THAI.test(en.pages[0].line + en.pages[0].title + en.title), `${k} EN`);
    assert.ok(!/สี่ระลอก/.test(th.pages[0].line), `${k}: no "four waves"`);
  }
  assert.match(storyOf('cyber-reinforcements').pages[0].line, /WATSON-03: "กระผมบันทึกว่าท่านเป็นรายการที่ยังไม่ถูกปิด/); assert.match(storyOf('cyber-reinforcements').pages[0].line, /ปีศาจสามระลอกพ่ายแพ้แล้ว/);
  assert.match(storyOf('cyber-control').pages[0].line, /ผมจะแค่ตัดสายที่พันอยู่รอบท่าน/);
  setLang('th'); const ap = storyOf('cyber-approach'); assert.equal(ap.pages[0].title, 'สามระลอกผ่านแล้ว แต่ลูกน้องยังเหลืออีกมาก'); assert.match(ap.pages[0].line, /นิรา: "ท่านคะ ดิฉันไม่เห็นทางไหนที่จะผ่านไปได้ค่ะ"/); assert.equal(ap.pages[0].image, 'img/story-cyberhell-01-v2.webp');
  setLang('en'); try { const e = storyOf('cyber-approach'); assert.equal(e.pages[0].title, 'Three waves down, and still so many servants'); assert.match(e.pages[0].line, /Nira: "Sir, I see no path through\."$/); assert.ok(!THAI.test(e.pages[0].line + e.title)); } finally { setLang('th'); }
});

test('the four lords: ruler 1 -> 4 in order; each starts in his own broken voice (TH / EN), is thanked on a page after the fight, and nobody is hurt in the pictures (no blood in the texts)', () => {
  const g = toTheLords(); const seen = [];
  for (const z of ZONES) {
    setLang('en'); const talkEn = (g.startFinalEncounter(`ruler:${z}`), g.battle.talk); g.battle = null; g.finalEvent.activeEncounter = null; g.finalEvent.phase = 'staging'; g.zoneEvents.cyberhell.cyberFinal = 'active';
    setLang('th'); const b = g.startFinalEncounter(`ruler:${z}`); assert.ok(b, z);
    assert.equal(talkEn, `${EN_NAME[z]}: "${RAW_Z4H_RULERS[z].before.en}"`); assert.equal(b.talk, `${RAW_Z4H_RULERS[z].nameTh}: "${RAW_Z4H_RULERS[z].before.th}"`); assert.deepEqual(Z4H_RULER_START[z], { th:b.talk, en:talkEn });
    assert.ok(!THAI.test(talkEn), z); assert.equal(b.foes[0].sp, `leader-${z}-possessed`);
    win(g); g.endBattle(); assert.equal(g.acknowledgeFinalReward(), true);
    assert.deepEqual(g.storyQueue.map(p => p.key), z === 'cyberhell' ? [Z4H.rulerFree[z], 'cyber-duel'] : [Z4H.rulerFree[z]], 'his thanks first (after the fourth: then the duel scene)'); const th = storyOf(Z4H.rulerFree[z]);
    assert.equal(th.pages[0].line, `${RAW_Z4H_RULERS[z].nameTh}: "${RAW_Z4H_RULERS[z].after.th}"`); setLang('en'); const en = storyOf(Z4H.rulerFree[z]); setLang('th');
    assert.equal(en.pages[0].line, `${EN_NAME[z]}: "${RAW_Z4H_RULERS[z].after.en}"`); assert.ok(!THAI.test(en.pages[0].line + en.title + en.pages[0].title), `${z} EN`); assert.ok(!/เลือด|ตาย|blood|dead|corpse/i.test(th.pages[0].line + en.pages[0].line));
    g.completeStory(); seen.push(z); assert.deepEqual(g.finalEvent.rulersCleared, seen);
  }
  assert.equal(g.finalEvent.phase, 'bossReady'); assert.deepEqual(g.storyQueue.map(p => p.key), ['cyber-duel'], 'cyber-duel (its text as it was) plays after the four lords');
  assert.match(storyOf('cyber-duel').pages[0].line, /หัวหน้าทั้งสี่เป็นอิสระแล้ว/);
});

test('Archon-Zero: his start line, the half-way lines (him, HOME-67 freed and standing at the side, Nira) once, the three lines after the win come BEFORE ending-capture; TH + EN', () => {
  const g = toTheLords(); for (const z of ZONES) { g.startFinalEncounter(`ruler:${z}`); win(g); g.endBattle(); g.acknowledgeFinalReward(); } while (g.storyQueue.length) g.completeStory(); g.dismissFinalPreparation?.();
  setLang('th'); const b = g.startFinalEncounter('boss'); assert.ok(b); assert.equal(b.talk, `อาร์คอน-ศูนย์: "${RAW_Z4H_DUEL.start.th}"`);
  assert.equal(b.halfLine, [`อาร์คอน-ศูนย์: "${RAW_Z4H_DUEL.half.th}"`, `HOME-67: "${RAW_Z4H_DUEL.halfHome67.th}"`, `นิรา: "${RAW_Z4H_DUEL.halfNira.th}"`].join('\n'));
  assert.equal(Z4H_DUEL.half.en, [`Archon-Zero: "${RAW_Z4H_DUEL.half.en}"`, `HOME-67: "${RAW_Z4H_DUEL.halfHome67.en}"`, `Nira: "${RAW_Z4H_DUEL.halfNira.en}"`].join('\n')); assert.ok(!THAI.test(Z4H_DUEL.half.en + Z4H_DUEL.start.en));
  assert.equal(Z4H_DUEL.start.en, `Archon-Zero: "I have recorded you from the start. Item not yet closed. I will close you myself."`);
  // not yet half way: the start line stays; once the boss is at half hp the half line is said (once)
  const boss = b.foes.find(f => f.boss); b.youHp = b.youMax; for (const f of b.foes) f.atk = [0, 0];
  assert.equal(g.battleAct('atk'), true); assert.equal(b.talk === b.halfLine, boss.hp <= boss.maxHp / 2); boss.hp = Math.floor(boss.maxHp / 2); assert.equal(g.battleAct('atk'), true); assert.equal(b.talk, b.halfLine, 'the half-way lines');
  b.talk = 'x'; g.battleAct('atk'); assert.equal(b.talk === b.halfLine, false, 'said once');
  win(g); g.endBattle();
  assert.deepEqual(g.storyQueue.map(p => p.key), ['z4-archon-down', 'ending-capture'], 'the three lines after the win, then the capture');
  const th = storyOf('z4-archon-down'); setLang('en'); const en = storyOf('z4-archon-down'); setLang('th');
  assert.equal(th.pages[0].line, [`อาร์คอน-ศูนย์: "${RAW_Z4H_AFTER_WIN[0].th}"`, `HOME-67: "${RAW_Z4H_AFTER_WIN[1].th}"`, `ยมบาทน้อย: "${RAW_Z4H_AFTER_WIN[2].th}"`].join('\n'));
  assert.equal(en.pages[0].line, [`Archon-Zero: "${RAW_Z4H_AFTER_WIN[0].en}"`, `HOME-67: "${RAW_Z4H_AFTER_WIN[1].en}"`, `Yama: "${RAW_Z4H_AFTER_WIN[2].en}"`].join('\n')); assert.ok(!THAI.test(en.pages[0].line + en.pages[0].title + en.title));
  assert.equal(th.pages[0].image, 'img/story-cyberhell-03-v4.webp'); assert.deepEqual(finalEventActors(g), [], 'justice phase: nobody stands on the map (HOME-67 is free)');
  // a reload before the pages are read keeps both, in this order
  const h = roundTrip(g); assert.deepEqual(h.storyQueue.map(p => p.key), ['z4-archon-down', 'ending-capture']);
});

test('the ending: ending-capture (as it was) -> the dais -> ending (2 pages, as it was) -> ending-coda (Rae, not compulsory) -> only then the end window; the game is completed; the coda is not queued twice', () => {
  const g = toTheLords(); for (const z of ZONES) { g.startFinalEncounter(`ruler:${z}`); win(g); g.endBattle(); g.acknowledgeFinalReward(); } while (g.storyQueue.length) g.completeStory(); g.dismissFinalPreparation?.();
  g.startFinalEncounter('boss'); win(g); g.endBattle(); assert.equal(g.gameCompleted, false);
  finishBossJustice(g); assert.equal(g.gameCompleted, true); assert.deepEqual(g.storyQueue.map(p => p.key), ['ending'], 'the coda comes once the ending is read');
  assert.equal(storyOf('ending').pages.length, 2); assert.match(storyOf('ending').pages[1].line, /ทำได้ดีมากลูกพ่อ/);
  g.completeStory(); assert.deepEqual(g.storyQueue.map(p => p.key), ['ending-coda']); assert.equal(g.over?.k, 'finalWin', 'the end window waits for the story queue (ui.js)');
  setLang('th'); const th = storyOf('ending-coda'); setLang('en'); const en = storyOf('ending-coda'); setLang('th');
  assert.equal(th.title, 'ผู้ที่ยืนข้างผู้ถือบัญชี'); assert.equal(en.title, 'Those Who Stand Beside the Ledger-Keeper'); assert.match(th.pages[0].line, /HOME-67: "ผมไม่เคยเห็นตัวเลขไหนสบายตาเท่านี้มาก่อนครับ"/); assert.match(en.pages[0].line, /Nira: "I should like to open a new notebook\."/); assert.ok(!THAI.test(en.pages[0].line + en.title));
  assert.equal(th.pages[0].image, 'img/z4-events/cut-ending-coda.webp');
  g.completeStory(); assert.equal(g.storyQueue.length, 0); const h = roundTrip(g); assert.equal(h.gameCompleted, true); assert.deepEqual(h.storyQueue, [], 'nothing replays');
  // the game goes on after the ending: HOME-67 is back on the pier (not bound), Zone 4 has no army
  assert.equal(h.finalUnderway(), false); assert.deepEqual(finalEventActors(h), []);
});
