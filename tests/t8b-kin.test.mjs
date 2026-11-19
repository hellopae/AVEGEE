// T8b/4 - cases 8 and 9 of Zone 4 (Rae R2 part D section 5): the elder sister of the reaper Cypher (a lullaby singer) and the uncle of the reaper Buffer (keeper of the archive). Both are story cases (after:8 / after:9), only after the Trojan-9 fight (case 7) is done;
// each has its notice (NK8 / NK9), leaves its PHANTOM-404 journal line once; HOME-67's "its name has AI in it" joins his pier talk after case 9. TH + EN.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CASES_BY_ZONE } from '../src/cases.js';
import { NOTICES } from '../src/z1-events.js';
import { Z4_STORY_CASES } from '../src/z4c-cases.js';
import { zone4, judge } from './helpers/zone4.mjs';
test('position + data: case 8 and case 9, story cases of Zone 4 with English on every field and the PHANTOM-404 code on the ledger', () => {
  assert.deepEqual(Z4_STORY_CASES.map(r => [r.k, r.after, r.needsEvent]), [['aiscam', 4, 'cyberRescue'], ['kin8', 8, 'cyberBreach'], ['kin9', 9, 'cyberBreach']]);
  for (const k of ['kin8', 'kin9']) { const c = CASES_BY_ZONE.cyberhell.find(x => x.k === k); assert.ok(c.story && c.z4 && !c.quest && c.kind === 'twist', k);
    for (const f of ['en_name', 'en_who', 'en_face', 'en_line', 'en_reward', 'en_fail', 'en_secret']) assert.ok(c[f], `${k}.${f}`);
    for (const list of ['seen', 'hidden', 'merits']) for (const x of c[list]) assert.ok(x.en, `${k}.${list} has English`); for (const cl of c.claims) assert.ok(cl.en, `${k} claim has English`);
    assert.ok(c.hidden.some(h => /PHANTOM-404/.test(h.t)), `${k} ledger carries the code`); }
  const a = NOTICES['z4-kin8-arrive'], b = NOTICES['z4-kin9-arrive']; assert.equal(a.en.title, 'Cypher\'s Elder Sister'); assert.equal(b.en.title, 'Buffer\'s Uncle'); assert.equal(a.title, 'พี่สาวของไซเฟอร์'); assert.equal(b.title, 'ลุงของบัฟเฟอร์');
  for (const n of [a, b]) { assert.ok(n.text && n.button && n.en.text && n.en.button); assert.match(n.art, /soul-(singer|archivist)-cyber-profile/); }
});
test('the order: case 8 only after the Trojan-9 fight; then case 9; each leaves its journal line; HOME-67\'s clue after case 9; case 10 is the next thing (not a case)', () => {
  const g = zone4(); g.storyCaseDone.aiscam = true;
  g.zoneCases.cyberhell = 8; assert.equal(g.storyCaseOwed(), null, 'the Trojan-9 fight is not over yet'); g.zoneEvents.cyberhell.cyberBreach = 'cleared';
  assert.equal(g.storyCaseOwed(), 'kin8'); g.zoneCases.cyberhell = 7; assert.equal(g.storyCaseOwed(), null, 'not before the 8th');
  g.zoneCases.cyberhell = 8; g.ensureStoryCase(); assert.ok(g.notices.includes('z4-kin8-arrive'), 'NK8'); assert.equal(g.queue.find(s => s.case === 'kin8').sp, 'soul-singer-cyber');
  judge(g, 'kin8'); assert.ok(g.storyCaseDone.kin8); assert.ok(g.journalNotes.some(x => /^PHANTOM-404: เสียงของนักร้องถูกลอกไปใช้ในสายโทรศัพท์หลอกลวง/.test(x)));
  assert.equal(g.zoneCases.cyberhell, 9, 'the verdict counted the 8th case'); assert.equal(g.storyCaseOwed(), 'kin9'); g.ensureStoryCase(); assert.ok(g.notices.includes('z4-kin9-arrive'), 'NK9'); assert.equal(g.queue.find(s => s.case === 'kin9').sp, 'soul-archivist-cyber');
  assert.ok(!g.home67HintLines().some(h => /AI/.test(h.th)), 'no clue yet'); judge(g, 'kin9');
  assert.ok(g.journalNotes.some(x => /^PHANTOM-404: บรรทัดหนีงานถูกเพิ่มภายหลังในบัญชีหอจดหมายเหตุ/.test(x)));
  const hint = g.home67HintLines().find(h => /AI/.test(h.th)); assert.match(hint.th, /สามคดี สามคน สามเสียง/); assert.match(hint.en, /Three cases, three people, three voices/);
  assert.equal(g.storyCaseOwed(), null); g.ensureStoryCase(); assert.ok(!g.queue.some(s => ['kin8', 'kin9'].includes(s.case)), 'never queued twice');
});
