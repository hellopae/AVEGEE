import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createGame, deservedOf} from '../src/game.js';
import {ALL_CASES} from '../src/cases.js';
import {WANTHONG_CASE} from '../src/z1-wanthong.js';
import {Z1_STORIES, SITA_CASE} from '../src/z1-events.js';
import {storyOf} from '../src/story.js';
import {meritDoesNotCount, meritNotCountedShown, meritsOnDossier} from '../src/merit-count.js';
import {diagnosisModel} from '../src/diagnosis.js';
import {soulPortrait, applySoulPortrait} from '../src/soul-portraits.js';
import {trialSoulNeedsMirror, trialSoulFaceClass, TRIAL_SOUL_DRAWN_FACING_RIGHT, foeNeedsMirror, FOE_DRAWN_FACING_RIGHT} from '../src/battle-facing.js';
import {MERITS, MERIT_SOLID, voice} from '../src/data.js';
import {t, setLang} from '../src/i18n.js';

// FB3-T3 (owner 26 Nov): the trial text and room (EV1 EV6 EV7 EV8 EV9 EV10 EV15 EV16 EV18 EV23 MN2 MN6) - the words are the owner's / Rae's, exactly.
globalThis.document = { documentElement:{} };
const root = new URL('..', import.meta.url).pathname;
const read = f => readFileSync(join(root, f), 'utf8');
const game = () => { const g = createGame(); g.save = () => true; g.onChange = () => {}; return g; };
const lines = o => JSON.stringify(o);

test('EV7 + EV8: Lady Wanthong\'s brief is the owner\'s line and her real merit is his sentence (typo "ลุกชาย" -> "ลูกชาย")', () => {
  assert.equal(WANTHONG_CASE.face, 'ผิดกาม : มีสามี 2 คน สุดท้ายเลือกไม่ได้จนทำให้ถูกประหาร');
  assert.equal(WANTHONG_CASE.merits[0].t, 'เสียสละ เพื่อลูกชายทุกอย่าง ทั้งๆที่เจอเหตุร้ายและพลัดพรากหลายครั้ง');
  assert.equal(WANTHONG_CASE.merits[0].fake, false);
  assert.equal(WANTHONG_CASE.merits[1].t, 'ซื่อสัตย์ต่อสามีทั้งสองตลอดมา'); assert.equal(WANTHONG_CASE.merits[1].fake, true);
  assert.ok(!lines(WANTHONG_CASE).includes('ผมเกล้าเรียบ') && !lines(WANTHONG_CASE).includes('มือกุมชายผ้า'), 'no posture of a living person');
});

test('EV10: Khun Phaen climbs onto the open-air dais - the owner\'s speech (one line, both paths), no hall, no doors, no kick', () => {
  const speech = 'ขุนแผน: "ข้าชื่อ ขุนแผน ข้าเคยเสียนางไปครั้งนึงแล้ว ข้าจะไม่ยอมเสียนางไปอีกแน่นอน ใครจะพานางไปต้องผ่านข้าไปก่อน"';
  for (const [path, lead] of [['punish', 'บรรยาย: ตราหมายกดลงบนกระดาษ ผู้คุมยังไม่ทันก้าวเข้ามา เสียงฝีเท้าหนัก ๆ ก็ก้องขึ้นมาจากบันไดหน้าแท่นตัดสิน'],
                              ['free', 'บรรยาย: ยมบาทน้อยเพิ่งวางปากกา เสียงฝีเท้าหนัก ๆ ก็ก้องขึ้นมาจากบันไดหน้าแท่นตัดสิน']]) {
    const open = storyOf(`z1-khunphaen-open-${path}`), p1 = open.pages[0].line.split('\n');
    assert.equal(p1[0], lead); assert.equal(p1[2], speech); assert.equal(p1.length, 3);
    assert.ok(p1[1].includes('ก้าวขึ้นมายืนบนแท่นตัดสินท่ามกลางหมอก') && p1[1].includes('ที่ตีนบันได ม้าสีหมอก'));
    assert.ok(open.pages[1].line.includes('ประกายเหล็กสะท้อนเข้าตาวิญญาณนางวันทองที่ยืนอยู่ข้างแท่น'));
    const win = storyOf(`z1-khunphaen-win-${path}`);
    assert.ok(win.pages[0].line.includes('นางวันทองก้าวออกมายืนคั่นกลางระหว่างเขากับยมบาทน้อย'));
    for (const st of [open, win]) for (const pg of st.pages) for (const bad of ['ประตู', 'ถีบ', 'โถง', 'บานกระแทก', 'พระนาง'])
      assert.ok(!pg.line.replace('ประตูสวรรค์', '').includes(bad), `"${bad}" is gone from ${path}: ${pg.line.slice(0, 60)}`);
  }
  assert.ok(storyOf('z1-khunphaen-win-free').pages[1].line.includes('ผมบันทึกตามที่นางขอครับ') && storyOf('z1-khunphaen-open-punish').pages[1].line.includes('เพราะเกลียดนางวันทอง'), 'D2 (Reese): she is "นาง", never "พระนาง"');
  assert.ok(!read('src/z1-wanthong.js').includes('khunTail'), 'D1: no path-specific tail on the speech');
});

test('EV15: Khun Phaen bows "ให้ยามา" - the swordsman clause is gone', () => {
  const l = storyOf('z1-khunphaen-win-punish').pages[2].line.split('\n')[0];
  assert.equal(l, 'บรรยาย: ขุนแผนหันมาหายามา วางมือขวาทาบอก ก้มศีรษะให้ยามา');
});

test('EV18 + EV23: the giant introduces himself; Yomathat at the harbor says the owner\'s three lines (read from picture e16)', () => {
  assert.equal(storyOf('frontier-th-guard-joins').pages[0].line, 'ข้าชื่อ "กุมภัณฑ์" เดี๋ยวข้าช่วยจัดการเจ้าพวกนี้เอง');
  assert.ok(!lines(Z1_STORIES).includes('ยักษ์เขียวที่ยืนเฝ้าประตูชายแดนออกมาช่วยเราสู้'));
  assert.equal(storyOf('boss-guide-th-praise').pages[0].line, [
    'บรรยาย: ยมทัต เก็บดาบและยืนมองน้องชายด้วยความภูมิใจ',
    'ยมทัต: "เก่งขึ้นมากเลยนะ แบบนี้เจ้าน่าจะดูแลโซนนี้ได้สบาย"',
    'ยมทัต: "แต่ยังมีดินแดนอื่นที่โหดร้ายกว่านี้ เมื่อเจ้าพร้อมจะเดินทางแล้ว มาหาพี่ที่ท่าเรือนะ"'].join('\n'));
});

// ---- EV9 / MN2: "(ไม่นับ)" ----
test('EV9/MN2: the rule - a made-up merit is marked once it is found out (exposed) or the case is closed, never before; a true-but-worthless one (v:0) once the case is closed', () => {
  const fake = { t:'x', v:1, fake:true }, zero = { t:'y', v:0, fake:false }, real = { t:'z', v:1, fake:false };
  assert.equal(meritDoesNotCount(fake), true); assert.equal(meritDoesNotCount(zero), true); assert.equal(meritDoesNotCount(real), false);
  assert.equal(meritNotCountedShown(fake), false, 'before it is found out nothing is shown');
  assert.equal(meritNotCountedShown({ ...fake, exposed:true }), true);
  assert.equal(meritNotCountedShown(fake, true), true, 'closed case: the whole truth');
  assert.equal(meritNotCountedShown(zero), false); assert.equal(meritNotCountedShown(zero, true), true);
  assert.equal(meritNotCountedShown({ ...real, exposed:true }, true), false, 'a real merit is never marked');
  setLang('th'); assert.equal(t('merit.notCounted'), '(ไม่นับ)'); setLang('en'); assert.equal(t('merit.notCounted'), '(not counted)'); setLang('th');
});

test('EV9/MN2: every hand-written case with a made-up merit - the owner\'s two (Wanthong "ซื่อสัตย์ต่อสามีทั้งสองตลอดมา", the heir "เคยให้สัมภาษณ์สื่อ...") and all the others - is marked after the "boast" line is pressed, and is unmarked before', () => {
  const withFake = ALL_CASES.filter(c => (c.merits || []).some(m => m.fake));
  assert.ok(withFake.length >= 20, `${withFake.length} cases have a made-up merit`);
  assert.ok(withFake.some(c => c.k === 'wanthong') && withFake.some(c => c.k === 'heir'));
  for (const c of withFake) {
    const g = game(); g.zone = c.zone || 'th';
    const soul = { case:c.k, sex:c.sex, deeds:[...c.seen.map(d => ({ ...d, known:true })), ...(c.hidden || []).map(d => ({ ...d, known:false }))], merits:c.merits.map(m => ({ ...m })), said:[], presses:2,
      lines:(c.claims || []).map((l, i) => ({ ...l, i, used:false })), pure:false };
    const fakes = soul.merits.filter(m => m.fake);
    assert.ok(soul.merits.every(m => !meritNotCountedShown(m)), `${c.k}: nothing marked before`);
    assert.equal(meritsOnDossier(soul).length, soul.merits.length, `${c.k}: all listed`);
    const boast = soul.lines.find(l => l.kind === 'boast'); if (!boast) continue;
    g.press(soul, boast.i);
    const hit = soul.merits.find(m => m.t === boast.merit);
    assert.ok(hit && meritNotCountedShown(hit), `${c.k}: "${boast.merit}" is marked after the boast is pressed`);
    assert.ok(meritsOnDossier(soul).includes(hit), `${c.k}: and still on the list (it used to vanish)`);
    for (const m of soul.merits) if (!m.fake) assert.equal(meritNotCountedShown(m), false, `${c.k}: a real merit is never marked`);
    void fakes;
  }
});

test('EV9/MN2: souls drawn by chance (every zone) - an exposed made-up merit is marked, and exposing it changes nothing the score reads', () => {
  for (const zone of ['th', 'asia', 'west', 'cyberhell']) for (let n = 0; n < 60; n++) {
    const g = game(); g.zone = zone; g.spawnSoul(); const s = g.queue.find(x => !x.case && x.merits.some(m => m.fake)); if (!s) continue;
    const before = deservedOf(s), f = s.merits.find(m => m.fake);
    assert.equal(meritNotCountedShown(f), false);
    f.exposed = true;
    assert.equal(meritNotCountedShown(f), true);
    assert.equal(deservedOf(s), before, 'the sentence the soul deserves does not move when the lie is found - a made-up merit never counted');
    return;
  }
  assert.fail('no soul with a made-up merit was drawn');
});

test('EV9/MN2: the diagnosis sheet marks it too (closed case: made-up and worthless merits; open case: only an exposed made-up one)', () => {
  const g = game(), soul = { id:1, who:'x', name:'x', sex:'m', sp:1, deserved:3, said:[], waited:0, traitKey:'accepting', deeds:[], merits:[{ t:'a', v:1, fake:true }, { t:'b', v:0, fake:false, note:'n' }, { t:'c', v:2, fake:false }] };
  const entry = { soul, verdict:{ tham:100, score:80, stars:4, short:0, over:0, coin:4 }, intensity:3, stage:'prison', readyAt:0, inspected:false, repentant:null, zone:'th', stationK:'krata', keeperK:'boon', keeperName:'บุญ', need:40, servedAt:1 };
  const closed = diagnosisModel(g, { kind:'prison', entry, soul }).merits, held = diagnosisModel(g, { kind:'held', soul }).merits;
  assert.deepEqual(closed.map(m => m.notCounted), [true, true, false]);
  assert.deepEqual(held.map(m => m.t), ['b', 'c'], 'an open case still hides the made-up one until it is found');
  assert.deepEqual(held.map(m => m.notCounted), [false, false]);
  soul.merits[0].exposed = true;
  assert.deepEqual(diagnosisModel(g, { kind:'held', soul }).merits.map(m => [m.t, m.notCounted]), [['a', true], ['b', false], ['c', false]]);
});

// ---- MN6 ----
test('MN6: the admitting line never speaks about a deed that a `deny` line already disowns; with one known deed the owner\'s own line about her real merit stands in (m5)', () => {
  assert.equal(MERIT_SOLID['เลี้ยงหมาจรมาทั้งชีวิต 14 ตัว'], '{i}เลี้ยงหมาจร เพื่อช่วยชีวิตมันจริงๆ{na}');
  assert.equal(voice(MERIT_SOLID['เลี้ยงหมาจรมาทั้งชีวิต 14 ตัว'], 'f'), 'ดิฉันเลี้ยงหมาจร เพื่อช่วยชีวิตมันจริงๆนะคะ', 'the owner\'s sentence, exactly (female voice)');
  let conflicts = 0, owners = 0, souls = 0;
  for (const zone of ['th', 'asia', 'west', 'cyberhell']) for (let n = 0; n < 150; n++) {
    const g = game(); g.zone = zone; g.queue = []; g.spawnSoul(); const s = g.queue.find(x => !x.case && !x.hard); if (!s) continue; souls++;
    const denies = s.lines.filter(l => l.kind === 'deny' && Number.isInteger(l.deedIndex)).map(l => s.deeds[l.deedIndex].t);
    for (const l of s.lines.filter(l => l.kind === 'solid'))
      for (const d of denies) if (l.t.includes(d)) conflicts++;
    if (s.lines.some(l => l.t === voice(MERIT_SOLID['เลี้ยงหมาจรมาทั้งชีวิต 14 ตัว'], s.sex))) owners++;
    assert.equal(s.lines.length, 4, 'still four statements');
  }
  assert.ok(souls > 100); assert.equal(conflicts, 0, 'no soul has a statement that admits what another one denies');
  // the m5 case: one known deed + the real merit "เลี้ยงหมาจร"
  const g = game(); let found = null;
  for (let n = 0; n < 4000 && !found; n++) { g.queue = []; g.zone = 'th'; g.spawnSoul(); const s = g.queue.find(x => !x.case && !x.hard && x.deeds.filter(d => d.known).length === 1 && x.merits.some(m => m.t === 'เลี้ยงหมาจรมาทั้งชีวิต 14 ตัว' && !m.fake) && x.lines.some(l => l.kind === 'deny')); if (s) found = s; }
  assert.ok(found, 'the m5 situation was drawn');
  assert.ok(found.lines.some(l => l.t === voice(MERIT_SOLID['เลี้ยงหมาจรมาทั้งชีวิต 14 ตัว'], found.sex)), 'the owner\'s line is one of the four');
  void MERITS; void owners;
});

// ---- EV16 ----
test('EV16: Nira\'s old desk-mate (the nurse) is drawn with img/soul-nurse.webp in the room and everywhere else her soul is shown (never the woman archetype)', () => {
  const nurse = ALL_CASES.find(c => c.k === 'nurse');
  assert.equal(soulPortrait({ case:'nurse', sex:'f' }), 'soul-nurse');
  assert.equal(applySoulPortrait({ case:'nurse', sex:'f', who:nurse.who }, 'th').sp, 'soul-nurse');
  assert.ok(read('src/art.js').includes("if (key === 'soul-nurse') return 'img/soul-nurse.webp'"));
  assert.notEqual(soulPortrait({ case:'pol', sex:'m' }), 'soul-nurse');
  const g = game(); g.storyCaseDone.nurse = false; g.zoneCases.th = 4; g.has = () => true; g.ensureStoryCase();
  const s = g.queue.find(x => x.case === 'nurse'); assert.ok(s); assert.equal(s.sp, 'soul-nurse');
});

// ---- EV6 / EV13 ----
test('EV6/EV13: the suspect stands on the right of the room and faces Yama - the story souls drawn facing right are mirrored there, and so are the spirits that are mirrored in battle', () => {
  for (const k of ['soul-wanthong-th', 'soul-false-judge-west', 'soul-loki-priest-west', 'soul-redhood-west', 'soul-soup-cook-west', 'soul-witch-bread-west', 'soul-younger-brother-west', 'soul-aiscam-cyber']) {
    assert.ok(TRIAL_SOUL_DRAWN_FACING_RIGHT.has(k), k);
    assert.equal(trialSoulFaceClass(`img/${k}.webp?v=2`), 'face-flip'); assert.equal(trialSoulNeedsMirror(`img/z1-events/${k}.webp`), true);
  }
  assert.equal(trialSoulFaceClass('img/z1-events/soul-sita-th.webp'), '', 'what already faces left is left alone');
  for (const k of FOE_DRAWN_FACING_RIGHT) if (k.startsWith('spirit-')) assert.equal(trialSoulNeedsMirror(`img/Thai/${k}-v2.webp`), true, k);
  assert.equal(trialSoulNeedsMirror('img/Thai/spirit-worker-th-v2.webp'), false);
  assert.equal(foeNeedsMirror('img/z1-events/soul-wanthong-th.webp'), false, 'the battle list is not touched (she is never an enemy in battle)');
  assert.ok(read('src/ui.js').includes('class="${trialSoulFaceClass(foeSrc)}"'));
  assert.match(read('src/interrogation-ui.css'), /\.trial-comment8 \.hud-stage \.fig\.foe>img\.face-flip\{scale:-1 1\}/);
});

// ---- EV1 ----
test('EV1: an old save that already holds Sita\'s soul (made before her hearing became the ordinary room) is given the new brief and statements, same id', () => {
  const g = game();
  g.zoneCases.th = 11; g.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared', frontierBreach:'cleared' }; g.devaVisits.th = { phase:'done' }; g.storyCaseDone.nurse = true; g.storyCaseDone.devaMonk = true;
  g.ensureStoryCase(); const s = g.queue[0], id = s.id; assert.equal(s.case, 'sitaledger');
  delete s.faceNote; s.face = 'สงบ นิ่ง'; s.lines = [{ kind:'solid', t:'old', i:0, used:false }]; s.merits = [{ t:'old merit', v:1 }];
  g.ensureStoryCase();
  assert.equal(g.queue[0].id, id); assert.equal(g.queue[0].face, SITA_CASE.face); assert.equal(g.queue[0].lines.length, 4); assert.deepEqual(g.queue[0].merits, []); assert.equal(g.queue[0].storyHearing, true);
});
