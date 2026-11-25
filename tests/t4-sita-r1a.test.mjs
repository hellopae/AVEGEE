// T4 step 1 - R1 A (Rae, Output/Rae/2026-11-16-avegee-r1.md A1-A6): Sita's case now has three verdicts (sentence / do not sentence / hold), all end with Hanuman,
// and the three scenes that depend on the verdict (`sita-hanuman-open-*`, `sita-return-*`) carry exactly the lines of Rae's tables.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { STATIONS, ZONE_EVENTS } from '../src/data.js';
import { SITA, SITA_CHOICE_KEYS, NOTICES, Z1_STORIES } from '../src/z1-events.js';
import { storyOf } from '../src/story.js';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };

const station = k => ({ def:STATIONS.find(d => d.k === k), crewK:null, intensity:3, fire:0, build:0, slots:[] });
/** A Zone 1 game that stands at the 12th case (the 11 before it counted, the frontier event cleared) with Sita at the head of the queue. */
function atSita() {
  const g = createGame(); g.stations.push(station('sawan'), station('krata'));
  g.zoneCases.th = 11; g.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared', frontierBreach:'cleared' }; g.devaVisits.th = { phase:'done' };
  g.storyCaseDone.nurse = true; g.storyCaseDone.devaMonk = true;
  g.ensureStoryCase(); assert.equal(g.queue[0].case, 'sitaledger');
  return g;
}
const allText = o => JSON.stringify(o);

test('A1/A2 (+ FB3-EV1): the hearing text - the owner\'s Comment9 wording where he changed it, Rae\'s everywhere else; no "suspicious" headline, no tag, no merits on the card, four statements, one of them the only `deny`', () => {
  assert.equal(SITA.caseTitle, 'คดีที่ 12 · นางสีดา');
  assert.equal(SITA.hearing.chargeTag, undefined, 'FB3-EV1: no tag on the card');
  assert.equal(SITA.hearing.charge, 'แฟ้มสั่งให้รับโทษ 9 วาระ ไม่ระบุความผิด');
  assert.equal(SITA.hearing.niraNote, '(นิราอ่านแล้ว.. รู้สึกว่าบัญชีมีความไม่ปกติ)');
  assert.equal(SITA.hearing.line, '"หม่อมฉันไม่ทราบว่า แฟ้มเขียนความผิดว่าอะไรไว้เจ้าค่ะ ทราบเพียงแค่ถูกเรียกมา"', 'the record starts with this');
  assert.deepEqual(SITA.hearing.claims.map(c => c.t), [
    'หม่อมฉันมาตามที่บัญชีเรียกเจ้าค่ะ ท่านจะตัดสินอย่างไร หม่อมฉันขอฟัง',
    'หม่อมฉันไม่เคยทำสิ่งใด ที่ต้องรับโทษ 9 วาระเจ้าค่ะ',
    'หม่อมฉันไม่ขอให้ท่านเมตตา เพราะหม่อมฉันเป็นใครเจ้าค่ะ ขอเพียงให้ตัดสินจากความจริง',
    'ถ้าท่านจะถามสิ่งใดอีก หม่อมฉันยินดีตอบเจ้าค่ะ']);
  assert.deepEqual(SITA.hearing.claims.map(c => c.kind), ['solid', 'deny', 'solid', 'solid']);
  assert.equal(SITA.hearing.claims[1].reveal, 'นิราเทียบกับแฟ้มต้นฉบับ หมึกในช่องผู้กระทำเข้มกว่าบรรทัดอื่นของหน้าเดียวกัน');
  assert.equal(SITA.hearing.merits, undefined, 'FB3-EV1: the card shows no merits');
  assert.deepEqual(SITA.notices.arrive, { ...SITA.notices.arrive, title:'วิญญาณนามสูงมาถึงแล้ว', text:'วิญญาณนางสีดามาถึงคิวพิจารณา แฟ้มระบุให้รับโทษเก้าวาระ', button:'เริ่มไต่สวน' });
  assert.equal(NOTICES['sita-arrive'].en.title, 'A Revered Soul Has Arrived');
  for (const banned of ['ไม่ชอบมาพากล', 'ข้อมูลน่าสงสัย', 'ประทับตราแล้วตราไม่ติด', 'ไม่ได้มาเพื่อให้ใครเชื่อ'])
    assert.ok(!allText(SITA).includes(banned) && !allText(Z1_STORIES).includes(banned), `13 Nov wording "${banned}" is gone`);
});

test('FB3-EV1: she stands in the ordinary room - card = the charge line + Nira\'s remark (nothing else), statements in the owner\'s order, record = the old first claim, green name (no secret)', () => {
  const s = atSita().queue[0];
  assert.equal(s.storyHearing, true);
  assert.equal(s.face, 'แฟ้มสั่งให้รับโทษ 9 วาระ ไม่ระบุความผิด'); assert.equal(s.faceNote, '(นิราอ่านแล้ว.. รู้สึกว่าบัญชีมีความไม่ปกติ)');
  assert.deepEqual(s.merits, []); assert.deepEqual(s.deeds, []);
  assert.deepEqual(s.lines.map(l => l.t), SITA.hearing.claims.map(c => c.t));
  assert.deepEqual(s.said.map(x => x.text), [SITA.hearing.line]);
  assert.equal(s.traitKey, 'accepting', 'green - a secret would have made her "concealing"');
  assert.equal(s.presses, 2, 'the ordinary number of questions');
  // pressing the `deny` line: only what Nira sees in the file - nobody is "caught", nothing is said about her being wrong
  const g = atSita(); const sita = g.queue[0]; const out = g.press(sita, 1);
  assert.deepEqual(out.map(x => x.kind), ['truth']); assert.equal(out[0].text, SITA.hearing.claims[1].reveal);
});

test('A3: Nira advises holding the case - only the hold verdict carries the "Nira advises" tag', () => {
  assert.equal(SITA.hearing.nira.tag, 'นิราแนะนำ');
  assert.match(SITA.hearing.nira.say, /ขอแนะนำให้พักคดีไว้ก่อนเพื่อตรวจสอบ/);
  assert.deepEqual(SITA.hearing.choices.filter(c => c.advised).map(c => c.k), ['hold']);
});

test('A4: three verdicts, in this order, each with its own spoken lines', () => {
  assert.deepEqual(SITA_CHOICE_KEYS, ['punish', 'free', 'hold']);
  const lines = Object.fromEntries(SITA.hearing.choices.map(c => [c.k, c.lines]));
  assert.equal(lines.punish[0], 'ยมบาทน้อย: "ผมออกหมายตามระดับที่เลือกครับ"');
  assert.equal(lines.free[0], 'ยมบาทน้อย: "ผมไม่ลงโทษครับ เชิญพระนางรอที่ประตูสวรรค์"');
  assert.equal(lines.hold.length, 4); assert.match(lines.hold[1], /^นิรา: "รับทราบค่ะ/);
});

for (const [k, lead, yama, sita, yamaBack] of [
  ['punish', 'ก่อนหมายจะถึงมือผู้คุม', 'หมายนั้นผมยังไม่ได้บังคับใช้ครับ', 'หม่อมฉันไม่ถือโทษท่านเจ้าค่ะ ท่านทำตามบัญชีที่ท่านได้รับ', 'ผมต่างหากที่ต้องขออภัยพระนางครับ ที่เกือบออกหมายโดยไม่ตรวจก่อน'],
  ['free', 'ก่อนประตูสวรรค์จะเปิด', 'ผมเพิ่งตัดสินให้พระนางไม่ต้องรับโทษครับ', 'ขอบพระคุณที่ท่านไม่ตัดสินจากบัญชีเพียงอย่างเดียวเจ้าค่ะ', 'ผมต่างหากที่ต้องขอบคุณครับ ที่พระนางใจเย็นพอให้ผมตรวจ'],
  ['hold', 'ขณะนิราพลิกแฟ้ม', 'ผมกำลังตรวจแฟ้มของพระนางอยู่พอดีครับ', 'ขอบพระคุณที่ท่านฟังหม่อมฉันก่อนอ่านบัญชีเจ้าค่ะ', 'ผมต่างหากที่ต้องขอบคุณครับ ที่พระนางใจเย็นพอให้ผมตรวจ'],
]) {
  test(`A5/A6 verdict "${k}": Hanuman comes down with that verdict's lead, the fight is the same fight, the win/return scenes carry the verdict's lines`, () => {
    let g = atSita();
    assert.equal(g.resolveSitaCase(k, k === 'punish' ? { station:'x', crew:'taan', level:2 } : null), true);
    assert.equal(g.zoneCases.th, 12); assert.equal(g.sitaChoice, k);
    assert.deepEqual(g.storyQueue.map(p => p.key), [`sita-hanuman-open-${k}`]);
    const open = storyOf(`sita-hanuman-open-${k}`);
    assert.equal(open.pages.length, 2);
    assert.match(open.pages[0].line, new RegExp(lead)); assert.match(open.pages[1].line, new RegExp(yama.replace(/[()]/g, '')));
    assert.match(open.pages[0].line, /ท่านจะตัดสินพระนางอย่างไร ข้าไม่ได้มาฟังคำตัดสิน/);
    // the verdict survives a save/load and the same Hanuman fight follows
    const d = JSON.parse(JSON.stringify(g.snapshot())); g = createGame(); g.restore(d);
    assert.equal(g.sitaChoice, k);
    while (g.storyQueue.length) g.completeStory();
    const ev = ZONE_EVENTS.th.find(e => e.k === 'sitaHanuman');
    assert.equal(g.zoneEventStatus('sitaHanuman'), 'pending'); assert.ok(ev.alert.th.includes('ไม่ว่าท่านจะตัดสินอย่างไร'));
    const win = storyOf('sita-hanuman-win'); assert.equal(win.pages.length, 2);
    assert.match(win.pages[0].line, /พอเถิดหนุมาน ท่านทำเพื่อหม่อมฉันมาตลอด/); assert.match(win.pages[1].line, /ข้าขอโทษ/);
    const ret = storyOf(`sita-return-${k}`);
    assert.ok(ret.pages[0].line.includes(sita), 'Sita\'s first line'); assert.ok(ret.pages[1].line.includes(yamaBack), 'Yama\'s first line');
    // after the fight: win -> phantom -> the lamp -> the verdict's own return scene
    g.startZoneEvent('sitaHanuman');
    for (const f of g.battle.foes) f.atk = [0, 0];
    const f = g.battle.foes[0]; f.hp = 1; g.battle.selectedFoeId = f.id; assert.equal(g.battleAct('atk'), true);
    assert.equal(g.battle.over, 'win'); g.endBattle();
    assert.deepEqual(g.storyQueue.map(p => p.key).filter(x => x.startsWith('sita-')), ['sita-hanuman-win', 'sita-phantom', 'sita-lamp', `sita-return-${k}`]);
  });
}

test('the verdict changes nothing the player is scored on (Rae A4: the three paths score the same)', () => {
  const marks = SITA_CHOICE_KEYS.map(k => { const g = atSita(); const before = [g.karma, g.order, g.coin, g.hp]; g.resolveSitaCase(k, null); return [before, [g.karma, g.order, g.coin, g.hp]]; });
  for (const [before, after] of marks) assert.deepEqual(after, before);
});

test('the court still refuses to sentence / escort her through the normal desk (she is only ever heard)', () => {
  const g = atSita(); const sita = g.queue[0];
  assert.equal(g.assignBlock(sita.id, 'krata', 'taan')?.key, 'storyHearing');
  assert.equal(g.assignBlock(sita.id, 'krata', 'taan', true)?.key, undefined, 'FB3-EV1: her own hearing (the ordinary room) asks the ordinary writ questions - and never assigns her');
  assert.equal(g.resolveSitaCase('suspend'), false, 'the 13 Nov verdict keys are gone');
});

test('old saves: the 13 Nov verdict keys and half-played scenes keep their place', () => {
  let g = atSita(); g.resolveSitaCase('hold');
  const d = JSON.parse(JSON.stringify(g.snapshot()));
  d.sitaChoice = 'pavilion'; d.storyQueue = [{ key:'sita-hanuman-open', reward:null, stage:'comic' }]; d.storySeen = { 'sita-return':true };
  g = createGame(); g.restore(d);
  assert.equal(g.sitaChoice, 'free');
  assert.deepEqual(g.storyQueue.map(p => p.key), ['sita-hanuman-open-hold']);
  assert.ok(g.storySeen['sita-return-hold'] && !g.storySeen['sita-return']);
  assert.ok(storyOf(g.storyQueue[0].key), 'the renamed scene exists');
});
