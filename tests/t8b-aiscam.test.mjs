// T8b/1 - case 4 of Zone 4, the retired teacher whose ledger was written over (Rae R2 part D section 3): it comes as the 5th case (after:4 = four cases judged), with its notice (NAS-1); whatever is ruled it leaves the PHANTOM-404 line
// in the journal once and HOME-67's extra line joins the pier talk. TH + EN: the case carries Rae's en_* fields (the court screen is Thai-only like every case), the notice carries English.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CASES_BY_ZONE } from '../src/cases.js';
import { NOTICES, STORY_CASE_ROWS } from '../src/z1-events.js';
import { Z4_STORY_CASES } from '../src/z4c-cases.js';
import { zone4, drain, judge } from './helpers/zone4.mjs';
test('position + data: the 5th case of Zone 4 (after:4), a story case, English on every field', () => {
  assert.deepEqual(Z4_STORY_CASES.map(r => [r.k, r.after]), [['aiscam', 4]]); assert.equal(STORY_CASE_ROWS.cyberhell, Z4_STORY_CASES);
  const c = CASES_BY_ZONE.cyberhell.find(x => x.k === 'aiscam'); assert.ok(c.story && c.zone === 'cyberhell' && !c.quest && c.kind === 'twist');
  for (const f of ['en_name', 'en_who', 'en_face', 'en_line', 'en_reward', 'en_fail', 'en_secret']) assert.ok(c[f], f);
  for (const list of ['seen', 'hidden', 'merits']) for (const x of c[list]) assert.ok(x.en, `${list} has English`); for (const cl of c.claims) assert.ok(cl.en, 'claim has English');
  assert.match(c.hidden[0].t, /PHANTOM-404/); assert.match(c.claims.at(-1).reveal, /PHANTOM-404/);
  const n = NOTICES['z4-aiscam-arrive']; assert.ok(n.title && n.text && n.button && n.en.title && n.en.text && n.en.button); assert.equal(n.en.title, 'The One Written as Someone Else'); assert.match(n.art, /soul-aiscam-cyber-profile/);
});
test('the order: nothing due before 4 cases are judged; then the teacher (with NAS-1); after the verdict the journal line + HOME-67\'s clue; never twice', () => {
  const g = zone4(); for (const n of [0, 1, 2, 3]) { g.zoneCases.cyberhell = n; assert.equal(g.storyCaseOwed(), null, `after ${n} cases`); }
  g.zoneCases.cyberhell = 4; assert.equal(g.storyCaseOwed(), 'aiscam'); g.ensureStoryCase(); assert.ok(g.notices.includes('z4-aiscam-arrive'), 'NAS-1'); const soul = g.queue.find(s => s.case === 'aiscam'); assert.ok(soul); assert.equal(soul.sp, 'soul-aiscam-cyber');
  assert.equal(g.home67HintLines().length, 0, 'no clue before the case');
  judge(g, 'aiscam'); assert.ok(g.storyCaseDone.aiscam); assert.equal(g.storyCaseOwed(), null, 'nothing else is due');
  assert.ok(g.journalNotes.some(x => /^PHANTOM-404: ครูเกษียณโดนแก้บัญชีจากภายนอก/.test(x)), 'journal'); assert.equal(g.journalNotes.filter(x => /ครูเกษียณ/.test(x)).length, 1);
  const hints = g.home67HintLines(); assert.equal(hints.length, 1); assert.match(hints[0].th, /ป้ายเดียวกัน แปลว่ามือเดียวกัน/); assert.match(hints[0].en, /The same tag means the same hand/);
  g.ensureStoryCase(); assert.ok(!g.queue.some(s => s.case === 'aiscam'), 'not queued again');
  const snap = JSON.parse(JSON.stringify(g.snapshot())); const r = zone4(); assert.equal(r.restore(snap), true); assert.ok(r.storyCaseDone.aiscam, 'a reload remembers it');
});
