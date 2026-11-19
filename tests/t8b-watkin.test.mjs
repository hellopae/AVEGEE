// T8b/3 - WATSON-03's quest (Rae R2 part D section 4.4, owner G13): a former administrator who deleted the accounts of thirty elderly people by the rule comes to the tail of the queue once twelve cases are judged AND the record hall (case 10) is won,
// with the window NK-W (WATSON-03 asks to see you before the hearing), his talk before / during / after the verdict and two choices. Built like the relatives of Zone 3 (the Guard is the "crew member"). TH + EN.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CASES_BY_ZONE } from '../src/cases.js';
import { NOTICES } from '../src/z1-events.js';
import { KIN_BY_KEY } from '../src/z3g-kin.js';
import { Z4_KIN } from '../src/z4c-cases.js';
import { actorFromLegacy, syncRoster } from '../src/roster.js';
import { zone4, judge } from './helpers/zone4.mjs';
const withGuard = g => { g.guard = actorFromLegacy({ x:720, y:890 }, 'cyberhell', 'guard'); syncRoster(g); g.zoneEvents.cyberhell.cyberBreach = 'cleared'; return g; };
test('data: the row, the case, the notice (TH + EN) and the talk are Rae\'s', () => {
  const row = KIN_BY_KEY.watkin; assert.equal(row, Z4_KIN[0]); assert.equal(row.crew, 'guard'); assert.equal(row.atCases, 12); assert.equal(row.choices.length, 2);
  const c = CASES_BY_ZONE.cyberhell.find(x => x.k === 'watkin'); assert.ok(c.story && c.z4 && !c.quest && c.kind === 'tragic'); for (const f of ['en_name', 'en_who', 'en_face', 'en_line', 'en_reward', 'en_fail', 'en_secret']) assert.ok(c[f], f);
  const n = NOTICES['kin-watkin']; assert.equal(n.title, 'ผู้ดูแลระบบผู้ทำตามกฎ'); assert.equal(n.en.title, 'The Administrator Who Followed the Rule'); assert.equal(n.button, 'ฟัง WATSON-03'); assert.equal(n.en.button, 'Hear WATSON-03'); assert.match(n.detail, /กระผมขอเล่าก่อนเริ่มคดีครับ/); assert.match(n.en.detail, /I was made to answer to the letter/);
  assert.equal(row.choices[0].label, 'ให้ WATSON-03 ยืนข้าง ๆ เขาโดยไม่พูด'); assert.equal(row.choices[1].labelEn, 'Let WATSON-03 read him the exceptions he once proposed');
  assert.equal(row.choices[0].lines.length, row.choices[0].linesEn.length); assert.match(row.choices[0].lines[0], /^บรรยาย: WATSON-03 เดินไปยืนข้างผู้ดูแลระบบ/); assert.match(row.choices[1].linesEn.at(-1), /It is my duty, sir/); assert.match(row.during[0], /ไม่ใช้งาน 365 วัน/); assert.match(row.after[0], /ท่านตัดสินแล้ว กระผมขอยืนข้างเขา/);
});
test('the order: not before 12 cases, not before the record hall, not without the Guard; then at the tail with NK-W; the verdict opens his question + the two choices; once', () => {
  const g = withGuard(zone4()); g.zoneCases.cyberhell = 12; g.ensureKinCases(); assert.ok(!g.queue.some(s => s.case === 'watkin'), 'the record hall (case 10) is not won yet');
  g.zoneEvents.cyberhell.cyberSala = 'cleared'; g.zoneCases.cyberhell = 11; g.ensureKinCases(); assert.ok(!g.queue.some(s => s.case === 'watkin'), 'not before 12 cases');
  const h = zone4(); h.zoneEvents.cyberhell.cyberSala = 'cleared'; h.zoneCases.cyberhell = 12; h.ensureKinCases(); assert.ok(!h.queue.some(s => s.case === 'watkin'), 'WATSON-03 is not the Guard yet');
  g.zoneCases.cyberhell = 12; g.queue.push({ id:991, case:'other' }); g.ensureKinCases(); const at = g.queue.findIndex(s => s.case === 'watkin'); assert.equal(at, g.queue.length - 1, 'at the tail, never ahead of another soul'); assert.ok(g.notices.includes('kin-watkin'), 'NK-W'); assert.equal(g.queue[at].kin, 'watkin'); assert.equal(g.queue[at].sp, 'soul-admin-cyber');
  g.ensureKinCases(); assert.equal(g.queue.filter(s => s.case === 'watkin').length, 1, 'once');
  const soul = g.queue[at]; g.kinSpeaks(soul); assert.ok(soul.said.some(x => x.kind === 'kin' && /กฎที่เขียนไว้ตรงตัวไม่ได้ผิด/.test(x.text)), 'WATSON-03 speaks during the hearing');
  g.notices = []; g.queue.splice(at, 1); g.applyVerdict(g.judge({ def:{ k:'krata', name:'ทัณฑ์', pow:1, tags:[] }, crewK:'taan' }, { soul, intensity:1 }), soul);
  assert.ok(g.notices.includes('kin-after-watkin'), 'the question after the verdict'); assert.equal(g.kinDone.watkin.choice, null); assert.equal(g.kinDone.watkin.verdict === 'heaven' || g.kinDone.watkin.verdict === 'punished', true);
});
