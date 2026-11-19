// T7/1 - Zone 3 case 0 (Rae R2 part C section 1): no Cerberus, three spirits under a spell, z3-arrive on the first arrival, z3-clear + N0-4' after the last, PHANTOM-404 on Poena's roster, English on every page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { ZONE_EVENTS } from '../src/data.js';
import { storyOf } from '../src/story.js';
import { setLang } from '../src/i18n.js';
import { harbourTravel } from './helpers/travel.mjs';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
const west = () => { const g = createGame(); g.bossCleared.asia = true; g.save = () => true; g.onChange = () => {}; assert.equal(harbourTravel(g, 'west'), true); return g; };
test('Zone 3 case 0: z3-arrive on the first arrival, 3 spirits, z3-clear + N0-4, journal note, no Cerberus', () => {
  const g = west();
  assert.ok(g.storyQueue.some(s => s.key === 'z3-arrive'), 'z3-arrive is queued on arrival');
  const ev = ZONE_EVENTS.west.find(e => e.k === 'westHypnotized');
  assert.equal(ev.foes.reduce((n, f) => n + f.count, 0), 3);
  assert.ok(!JSON.stringify(ev).includes('เซอร์เบอรัส') && !JSON.stringify(ZONE_EVENTS.west.map(e => e.k)).includes('erberus'), 'no Cerberus fight in Zone 3 case 0');
  g.storyQueue.length = 0;
  const b = g.startZoneEvent('westHypnotized');
  assert.ok(b); assert.match(b.talk, /นิรา/); assert.ok(b.firstLine.includes('ดวงแรก'));
  assert.deepEqual(b.foes.map(f => f.who), ['วิญญาณถูกสะกด', 'วิญญาณถูกสะกด', 'วิญญาณถูกสะกด']);
  b.youHp = 99999;
  b.foes[0].hp = 0; g.battleAct('atk'); assert.ok(b.firstSaid, 'Nira says the first-spirit line once the first falls');
  for (let n = 0; n < 30 && !b.over; n++) { const f = b.foes.find(v => v.hp > 0); if (!f) break; f.hp = 1; g.selectFoe(f.id); g.battleAct('atk'); }
  assert.equal(b.over, 'win'); assert.match(b.talk, /ทุกดวงกลับเข้าคิวแล้ว/);
  g.endBattle();
  assert.equal(g.zoneEventStatus('westHypnotized'), 'cleared');
  assert.ok(g.storyQueue.some(s => s.key === 'z3-clear')); assert.ok(g.notices.includes('z3-cleared'));
  g.completeStory();
  assert.ok(g.journalNotes.some(n => n.startsWith('PHANTOM-404: ใบเวรของโพเอน่า')));
});
test('z3-arrive / z3-clear carry English on every page and the Zone 3 robes line', () => {
  for (const lang of ['th', 'en']) {
    setLang(lang);
    for (const [k, pages] of [['z3-arrive', 2], ['z3-clear', 1]]) {
      const s = storyOf(k); assert.equal(s.pages.length, pages);
      for (const p of s.pages) { assert.ok(p.line && p.title); if (lang === 'en') assert.ok(!/[฀-๿]/.test(p.line + p.title), `${k} English page has no Thai`); }
    }
  }
  setLang('en'); assert.match(storyOf('z3-arrive').pages[0].line, /Poena: "You came, and you came through the gate/); setLang('th');
});
