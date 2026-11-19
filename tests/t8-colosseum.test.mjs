// T8a/2 - Lucifer's colosseum (Rae R2 part D 1.1-1.7): ten bouts in a row at the middle checkpoint of Frontier 3-4 with Yama + Nira + HOME-67; Rae's table lines + the winner's line after each; a lost bout = the same bout again;
// bout 9 Thor -> helper no. 10 (NT-1), bout 10 Lucifer (scene first) -> helper no. 11 (NL-1); Thor stuns, the Decree weakens only its target.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { FRONTIER, ZONE_EVENTS } from '../src/data.js';
import { storyOf } from '../src/story.js';
import { NOTICES } from '../src/z1-events.js';
import { setLang } from '../src/i18n.js';
import { BOUTS, COL, COL_EVENTS } from '../src/z4b-colosseum.js';
import { recordBossGuideWin } from '../src/boss-guides.js';
import { dungeonStatus } from '../src/zone-travel.js';
import * as L from '../src/lamp.js';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
const drain = g => { const seen = []; for (let i = 0; i < 40 && g.storyQueue.length; i++) { seen.push(g.storyQueue[0].key); g.completeStory(); } return seen; };
function onTheWalk() {
  const g = createGame(); g.save = () => true; g.onChange = () => {}; g.zone = 'west'; g.giveLamp(); g.bossCleared.asia = true; g.bossCleared.west = true; g.coin = 5000; g.hpMax = g.hp = 500;
  recordBossGuideWin(g, { over:'win', zone:'west', kind:'zoneBoss' }); g.home67 = { phase:'waiting' }; g.player.x = FRONTIER.x; g.player.y = FRONTIER.y; g.joinHome67(); drain(g); g.notices = []; g.pendingReward = null;
  assert.equal(g.beginBorderDungeon('cyberhell'), true); return g;
}
const win = (g, b) => { b.youHp = 99999; for (let i = 0; i < 40 && !b.over; i++) { for (const f of b.foes) if (f.hp > 0) { f.hp = 1; f.atk = [0, 0]; } g.selectFoe(b.foes.find(f => f.hp > 0).id); g.battleAct('atk'); } assert.equal(b.over, 'win'); g.endBattle(); };

test('ten bouts in order, Rae\'s lines, the winner\'s line after each, Yama + Nira + HOME-67 fight; Thor (9) and Lucifer (10) unlock helpers 10 and 11; the way on opens only after bout 10', () => {
  const g = onTheWalk(); assert.equal(g.colosseumDue(COL.checkpoint), true); assert.equal(g.colosseumDue(0), false, 'only at the middle checkpoint'); assert.equal(g.colosseumNext(), 1);
  assert.equal(COL_EVENTS.length, 10); assert.ok(COL_EVENTS.every(e => e.gate && e.atCases === 999)); assert.ok(ZONE_EVENTS.west.filter(e => e.colBout).length === 10);
  for (let n = 1; n <= 10; n++) {
    assert.equal(g.colosseumNext(), n); const b = g.startColosseumBout(); assert.ok(b, `bout ${n} starts`); assert.equal(b.eventKey, `colS${n}`); assert.ok(b.expeditionParty, 'the walk party fights'); assert.ok(g.battleActors().some(a => a.guestGuide && a.name === 'HOME-67'));
    const row = BOUTS[n - 1]; assert.ok(b.talk.includes(row.pre.th), `bout ${n}: the opponent's line before`); assert.equal(b.foes[0].sp, `col-s${n}`);
    if (n === 3) assert.ok(COL_EVENTS[2].win.text.includes('นายขนมต้มไหว้ผู้ชนะ'), 'Nira notes the wai'); if (n === 7) assert.ok(COL_EVENTS[6].win.text.includes('ผมเดาว่าเขาไม่ใช่เหยื่อ'), 'HOME-67 after bout 7');
    win(g, b); assert.equal(g.zoneEventStatus(`colS${n}`), 'cleared');
    const seen = drain(g);
    if (n === 9) { assert.ok(seen.includes('col-thor-win')); assert.ok(g.notices.includes('lamp-helper-thor'), 'NT-1'); assert.equal(L.SUMMONERS.thor.ready, true); }
    if (n === 10) { assert.ok(seen.includes('col-lucifer-win')); assert.ok(g.notices.includes('lamp-helper-lucifer'), 'NL-1'); }
    if (n < 9) assert.ok(!seen.some(k => k.startsWith('col-')), 'no scene between the plain bouts');
  }
  assert.equal(g.colosseumNext(), null); assert.equal(g.colosseumDue(COL.checkpoint), false, 'all ten won'); assert.equal(g.startColosseumBout(), null);
  assert.ok(L.unlockedSummoners(g).includes('thor') && L.unlockedSummoners(g).includes('lucifer'));
});
test('a lost bout: the tea house, the same bout again at no cost; Thor stuns, the Founder\'s Decree weakens only the foe it points at; TH + EN', () => {
  const g = onTheWalk(); const b = g.startColosseumBout(); win(g, b);
  const b2 = g.startColosseumBout(); assert.equal(b2.eventKey, 'colS2'); b2.team = []; b2.absentActors = g.battleActors().filter(x => x.id !== 'you').map(x => x.id); b2.youHp = 1;   // only Yama can be hit and the dice are fixed (the foe's target / hit roll no longer decide the loss)
  const realRandom = Math.random; Math.random = () => .5; try { g.battleAct('atk'); } finally { Math.random = realRandom; }
  assert.equal(b2.over, 'lose'); g.endBattle();
  assert.equal(g.zoneEventStatus('colS2'), 'pending'); assert.equal(g.colosseumNext(), 2, 'the same bout'); assert.equal(g.zoneEventStatus('colS1'), 'cleared', 'nothing lost');
  assert.equal(L.SUMMONERS.thor.move.stun.chance, .6); assert.equal(L.SUMMONERS.lucifer.move.weaken.target, true); assert.equal(L.SUMMONERS.lucifer.move.kind, 'strike'); assert.equal(L.SUMMONERS.thor.move.kind, 'group');
  for (const lang of ['th', 'en']) { setLang(lang); for (const [k, n] of [['col-gate', 2], ['col-thor-win', 1], ['col-lucifer-open', 1], ['col-lucifer-win', 1]]) { const s = storyOf(k); assert.equal(s.pages.length, n, k); for (const p of s.pages) { assert.ok(p.line && p.title); if (lang === 'en') assert.ok(!/[฀-๿]/.test(p.line + p.title), `${k} English page has no Thai`); } } }
  setLang('en'); assert.match(COL_EVENTS[7].title.en, /C-8, the Steel Colossus/); assert.match(NOTICES['col-mouth'].en.title, /Lucifer's Colosseum/); assert.equal(L.SUMMONERS.thor.name.en, 'Thor'); setLang('th');
});
