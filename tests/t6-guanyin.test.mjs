// T6/2 - Zone 2 case 12: the father of Guanyin; whatever is ruled, she comes down to thank the judge (Rae R2 part B section 2).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { STATIONS } from '../src/data.js';
import { storyOf } from '../src/story.js';
import { NOTICES } from '../src/z1-events.js';
import { setLang } from '../src/i18n.js';
import { GUANYIN, ART, GUANYIN_CASE, PETAL_NOTE } from '../src/z2b-guanyin.js';
import { Z2_STORY_CASES } from '../src/z2-events.js';
import * as L from '../src/lamp.js';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
const station = k => ({ def:STATIONS.find(d => d.k === k), crewK:null, intensity:3, fire:0, build:0, slots:[] });
function atCase12() {
  const g = createGame(); g.zone = 'asia'; g.save = () => true; g.onChange = () => {}; g.coin = 9000; g.stations.push(station('sawan'), station('krata'), station('lan'));
  g.zoneEvents.asia = { asiaPrisonFire:'cleared', asiaDevaTest:'cleared', asiaWukong:'cleared', asiaRageBreach:'cleared' }; g.zoneCases.asia = 11; g.storyCaseDone.apeelder = true;
  g.ensureStoryCase(); return g;
}
const judge = (g, { heaven = false } = {}) => { const at = g.queue.findIndex(s => s.case === 'guanyinfather'), soul = g.queue[at]; g.queue.splice(at, 1);
  g.applyVerdict(g.judge({ def:STATIONS.find(d => d.k === (heaven ? 'sawan' : 'krata')), crewK:'taan' }, { soul, intensity:1 }), soul); return soul; };

test('case 12 is the father of Guanyin, between case 11 (Akura) and case 13 (Satori\'s father); the notice NGY-1 leads into the hearing', () => {
  assert.deepEqual(Z2_STORY_CASES.map(c => c.k), ['apeelder', 'guanyinfather', 'satorifather']);
  const g = atCase12(); assert.equal(g.storyCaseOwed(), 'guanyinfather');
  const soul = g.queue.find(s => s.case === 'guanyinfather'); assert.ok(soul); assert.equal(soul.sp, 'soul-guanyin-father-asia'); assert.equal(soul.sex, 'm');
  assert.ok(g.notices.includes(GUANYIN.arriveNotice));
  assert.equal(NOTICES[GUANYIN.arriveNotice].en.title, 'The Father of One Who Is Revered'); assert.equal(NOTICES[GUANYIN.arriveNotice].button, 'เริ่มไต่สวน');
  assert.equal(GUANYIN_CASE.kind, 'twist'); assert.ok(GUANYIN_CASE.claims.some(c => c.kind === 'deny') && GUANYIN_CASE.merits.some(m => m.fake));
  assert.ok(!/ไม่เคยถามธิดา|เดือดร้อนและบาดเจ็บ/.test(JSON.stringify(GUANYIN_CASE)), 'Reese 1.1 / 1.2 are in');
});

for (const heaven of [true, false]) test(`whatever is ruled (${heaven ? 'gate of heaven' : 'a punishment station'}) she comes down: NGY-2 -> the 3-page scene -> NGY-3 (a keepsake note, no stat); she is no helper, no fight`, () => {
  const g = atCase12(); const before = { hp:g.hp, coin:g.coin, level:g.level }; judge(g, { heaven });
  assert.equal(g.storyCaseOwed(), 'satorifather', 'case 13 follows');
  assert.ok(g.storyCaseDone.guanyinfather); assert.ok(g.notices.includes(GUANYIN.afterNotice)); assert.equal(g.storyQueue.length, 0, 'the notice comes first');
  g.ackNotice(GUANYIN.afterNotice);
  const key = g.storyQueue[0].key; assert.match(key, /^z2-guanyin-thanks-(ok|off)$/);
  const s = storyOf(key); assert.equal(s.pages.length, 3);
  assert.match(s.pages[0].line, /ผมขอกราบเจ้าแม่กวนอิมครับ/); assert.match(s.pages[0].line, /ประนมมือขึ้นจรดหว่างคิ้ว/);
  assert.match(s.pages[1].line, key.endsWith('ok') ? /ไม่เกินไม่ขาด/ : /ข้าขอบคุณที่ท่านตั้งใจ/);
  assert.match(s.pages[2].line, /ผลของกรรมเป็นของผู้ทำ/); assert.ok(s.pages[0].en.line.includes('I bow to Lady Guanyin'));
  assert.ok(!JSON.stringify(s).includes('{verdictLine}'));
  g.completeStory(); assert.ok(g.notices.includes(GUANYIN.petalNotice)); assert.ok(g.journalNotes.includes(PETAL_NOTE));
  g.ackNotice(GUANYIN.petalNotice);
  assert.equal(g.battle, null); assert.equal(g.level, before.level);
  assert.ok(!Object.keys(L.SUMMONERS).some(k => /guanyin|cerberus/i.test(k)), 'neither she nor the soul is a helper of the lamp');
  const copy = createGame(); copy.restore(JSON.parse(JSON.stringify(g.snapshot()))); assert.ok(copy.storyCaseDone.guanyinfather); assert.equal(copy.storyCaseOwed(), 'satorifather');
});

test('the two versions follow the ordinary court\'s verdict (right / missed); a save already past case 12 never gets her late', () => {
  const a = atCase12(); const s = judge(a, { heaven:true }); const b = atCase12(); judge(b, { heaven:false });
  assert.ok(['ok', 'off'].includes(a.storyCaseDone.guanyinfather) && ['ok', 'off'].includes(b.storyCaseDone.guanyinfather));
  const old = createGame(); old.zone = 'asia'; old.zoneEvents.asia = { asiaRageBreach:'cleared' }; old.zoneCases.asia = 13; old.storyCaseDone.apeelder = true; old.storyCaseDone.satorifather = true;
  assert.equal(old.storyCaseOwed(), null);
});

test('pictures are .webp files that exist (placeholders until Codex draws them) and the English reaches the comic', () => {
  for (const f of [ART.portrait, ART.descends, ART.father]) { assert.ok(f.endsWith('.webp'), f); assert.ok(existsSync(new URL('../' + f, import.meta.url)), f); }
  assert.ok(existsSync(new URL('../img/z2-events/soul-guanyin-father-asia.webp', import.meta.url)));
});

test('English: the scene and the windows read in English when the game is in English', () => {
  try { setLang('en');
    const s = storyOf('z2-guanyin-thanks-ok'); assert.equal(s.title, 'White Light in the Hall'); assert.ok(s.pages[0].line.startsWith('Narration: When the verdict is done')); assert.match(s.pages[1].line, /You weighed his wrong as it was done/);
    assert.equal(storyOf('z2-guanyin-thanks-off').pages[1].line.split('\n')[0], 'Guanyin: "I have not come to say whether you weighed rightly or wrongly. I saw that you meant to weigh it true. I thank you for that."');
  } finally { setLang('th'); }
  assert.ok(storyOf('z2-guanyin-thanks-ok').pages[0].line.startsWith('บรรยาย:'));
});
