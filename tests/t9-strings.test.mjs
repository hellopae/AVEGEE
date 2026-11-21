// T9: Rae's polished strings replace every TODO(Rae), the old scenes have their English, Reese's fixes are in the game, and no Thai leaks into an English screen.
// No dice anywhere: these are texts and tables only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
const { setLang } = await import('../src/i18n.js');
const { storyOf, STORY } = await import('../src/story.js');
const { Z1_STORIES } = await import('../src/z1-events.js');
const { SIGNAL_STORIES } = await import('../src/e1-content.js');
const { RAW_BOUTS } = await import('../src/z4a-raw.js');
const { BOUTS, COL_EVENTS } = await import('../src/z4b-colosseum.js');
const { ZONES } = await import('../src/data.js');
const { NIRA_WAKE_LINE } = await import('../src/tea-recovery.js');
const { LUPIN_LET_GO, Z4L_MOVE } = await import('../src/z4f-lupin.js');
const { Z4S_VOICE_MOVE } = await import('../src/z4e-sala.js');
const { SEV_STORIES, SEV_ARRIVE_LINES, SEV_ARRIVE_LINES_EN } = await import('../src/z3f-severin.js');
const { Z3_FRONTIER_STORIES } = await import('../src/z3c-frontier.js');
const { Z3_ARRIVE_STORIES } = await import('../src/z3c-arrival.js');
const { Z3_CASE_STORIES } = await import('../src/z3d-cases.js');
const { EIRLIN_STORIES } = await import('../src/z3e-eirlin.js');
const { Z4A_STORIES } = await import('../src/z4a-border.js');
const { Z4T_STORIES } = await import('../src/z4d-trojan.js');
const { Z4S_STORIES } = await import('../src/z4e-sala.js');
const { Z4L_STORIES } = await import('../src/z4f-lupin.js');
const { Z4G_STORIES } = await import('../src/z4g-return.js');
const { Z4H_STORIES } = await import('../src/z4h-final.js');
const TH = /[฀-๿]/;
const src = f => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');

test('no TODO(Rae) is left in src (every one was answered by Rae or kept on purpose)', () => {
  const left = [];
  for (const f of readdirSync(new URL('../src/', import.meta.url))) { if (!f.endsWith('.js')) continue; src(f).split('\n').forEach((l, i) => { if (l.includes('TODO(Rae)')) left.push(`${f}:${i + 1}`); }); }
  assert.deepEqual(left, []);
});

test('RAW_BOUTS: no Thai in any English text, and Rae\'s two status notes are cut out of the names (bout 5 move, bout 2 name)', () => {
  for (const [n, r] of Object.entries(RAW_BOUTS)) for (const k of ['name', 'pre', 'win', 'move']) assert.ok(!TH.test(r[k].en), `bout ${n} ${k}`);
  assert.equal(RAW_BOUTS[5].move.en, 'Gaze of Stone'); assert.equal(RAW_BOUTS[2].name.en, 'The Plain Ninja');
});

test('the colosseum: all ten bouts carry Rae\'s warn / use lines (TH + EN, no Thai in EN), group moves say the whole team and single moves one of you; bout 8 uses the name of R2 1.5 (Reese)', () => {
  assert.equal(BOUTS.length, 10); assert.equal(COL_EVENTS.length, 10);
  const group = new Set([5, 6, 7, 9]);
  for (const ev of COL_EVENTS) {
    const sk = ev.foe.skills[0], n = ev.colBout;
    for (const f of ['warnText', 'useText']) { assert.ok(sk[f].th && sk[f].en, `bout ${n} ${f}`); assert.ok(!TH.test(sk[f].en), `bout ${n} ${f} EN`); }
    assert.ok(group.has(n) ? /ทั้งทีม/.test(sk.warnText.th) && /whole team|all of you/.test(sk.warnText.en) : /คน(เดียว|นั้น|หนึ่ง)/.test(sk.warnText.th) && /one of you|that one/.test(sk.warnText.en), `bout ${n} says who is hit`);
    assert.ok(!/ตั้งท่า/.test(sk.warnText.th), 'the generated formula is gone');
  }
  const b8 = COL_EVENTS[7].foe.skills[0];
  assert.equal(b8.warnText.en, 'C-8, the Steel Colossus, raises an iron fist overhead. Its chest display reads [Locking target]. Next turn the fist falls on one of you, hard!');
  assert.equal(b8.useText.th, 'ยักษ์เหล็กซี-8: "[ดำเนินการ] หมัดเหล็กจากฟ้า!"');
  assert.equal(COL_EVENTS[9].foe.skills[0].useText.th, 'ลูซิเฟอร์: "ม่านปิดสังเวียน"');   // no "!" (he speaks like an announcer)
  assert.equal(COL_EVENTS[0].foe.skills[0].warnText.th, 'ซามูไรไร้นายวางมือบนด้ามดาบ นิ่งสนิท — รอบหน้าเขาจะชักดาบฟันหนักใส่คนเดียว!');
});

test('Patch\'s and the sala robot\'s use lines, Nira\'s wake line (Reese\'s EN), the worker\'s answer in two lines', () => {
  assert.equal(Z4L_MOVE.useText.th, 'แพตช์: "จังหวะของท่าน ข้าขอรับไว้"'); assert.equal(Z4L_MOVE.useText.en, 'Patch: "That beat of yours. I will take it."');
  assert.equal(Z4S_VOICE_MOVE.useText.th, 'AI Scammer Robot: "ไม่ต้องกลัวนะ ... ฉันเอง"'); assert.equal(Z4S_VOICE_MOVE.useText.en, 'AI Scammer Robot: "Do not be afraid. ... It is me."');
  assert.equal(NIRA_WAKE_LINE.th, 'นิรา: ท่านคะ ตื่นได้แล้วค่ะ ดิฉันอยู่ตรงนี้ ทุกคนลุกได้แล้วนะคะ');
  assert.equal(NIRA_WAKE_LINE.en, 'Nira: Sir, it is time to wake. I am right here. Everyone, you may rise now.');
  assert.equal(LUPIN_LET_GO.th.length, 2); assert.equal(LUPIN_LET_GO.en.length, 2); assert.ok(LUPIN_LET_GO.en.every(l => !TH.test(l)));
  assert.match(LUPIN_LET_GO.th[0], /^คนงาน: "ไม่เป็นไรครับ ผมไม่รีบ"$/); assert.match(LUPIN_LET_GO.th[1], /^บรรยาย: /);
});

test('the polished one-line texts are in the source: locked harbour (TH + Reese\'s EN), frontier exit labels (TH + EN), lost quest fight note (TH + EN) - and "ผู้ครอบงำ" is gone everywhere', () => {
  const ui = src('ui.js');
  assert.ok(ui.includes('ท่าเรือถูกล็อกจากภายนอก เรือยังออกไม่ได้จนกว่าจะช่วยผู้ถูกควบคุมของแต่ละโซนให้เป็นอิสระ ต้องเดินกลับผ่านชายแดนไปทีละโซน'));
  assert.ok(ui.includes('The harbour has been locked from outside. No boat can sail until the lord of each zone is freed from control. Walk back through the frontiers, one zone at a time.'));
  assert.ok(ui.includes('เดินกลับผ่านชายแดน · ไปโซนก่อนหน้า') && ui.includes('Walk back through the frontier · previous zone'));
  assert.ok(ui.includes('ประตูถูกแสงเขียวปิดไว้ · ช่วยผู้ถูกควบคุมของโซนนี้ก่อน') && ui.includes('Gate sealed with green light · free this zone'));
  assert.ok(ui.includes('QUEST_FIGHT_SYSTEM_TEXT.loseNoteTeaEn'));
  const q = src('quest-fights.js');
  assert.ok(q.includes('แพ้ไม่เสียอะไร ความคืบหน้าของภารกิจยังอยู่ครบ · ไปพักที่ศาลาน้ำชาก่อน แล้วกลับมาคุยเพื่อสู้ใหม่ได้') && q.includes('A defeat costs you nothing, and your quest progress is kept.'));
  for (const f of readdirSync(new URL('../src/', import.meta.url))) if (f.endsWith('.js')) assert.ok(!src(f).includes('ผู้ครอบงำ'), f);
  assert.ok(src('z4g-raw.js').includes('ผู้ถูกควบคุมของแต่ละโซนพ่าย'));   // Trojan-9's line (the one deliberate edit of the copy; scripts/extract-rae-z4g.py does it too)
});

test('the old scenes have English: cyber-duel (TH names Archon-Zero now), ending-capture, ending (2 pages), and no Thai leaks into their English', () => {
  setLang('th');
  assert.match(storyOf('cyber-duel').pages[0].line, /ศึกตัดสินกับอาร์คอน-ศูนย์$/); assert.ok(!storyOf('cyber-duel').pages[0].line.includes('ผู้ตรวจการโซน 4'));   // (the old cyber-control text in story.js is replaced at load by Rae's own, so it never shows)
  setLang('en');
  try {
    assert.equal(storyOf('cyber-duel').title, 'Zone 4 · Cutting the Line of Control'); assert.equal(storyOf('cyber-duel').pages[0].title, 'The Last Boss Remains');
    assert.equal(storyOf('ending-capture').title, 'Avici · The Final Verdict'); assert.equal(storyOf('ending-capture').pages[0].title, 'The Control Ends');
    assert.equal(storyOf('ending').title, 'Avici · Peace Across the Four Branches'); assert.equal(storyOf('ending').pages.length, 2);
    assert.equal(storyOf('ending').pages[1].title, 'Father Approves'); assert.match(storyOf('ending').pages[1].line, /^Father walks over and pats Yama lightly on the shoulder\. "Well done, my son,"/);
    for (const k of ['cyber-duel', 'ending-capture', 'ending']) { const s = storyOf(k); assert.ok(!TH.test(s.title), k); for (const p of s.pages) assert.ok(!TH.test(p.title + p.line), k); }
  } finally { setLang('th'); }
  assert.ok(storyOf('ending').pages[0].video && storyOf('ending-capture').pages[0].video);   // the videos are still on the pages
});

test('SIGNAL_STORIES: all nine scenes have English (title + every page), the Thai is untouched, Reese\'s two "shall not pass" lines are rewritten, "terms" for วาระ', () => {
  const keys = Object.keys(SIGNAL_STORIES); assert.equal(keys.length, 9);
  for (const k of keys) {
    const s = SIGNAL_STORIES[k]; assert.ok(s.en?.title, k);
    s.pages.forEach((p, i) => { if (k === 'cyber-signal-win' && i === 1) return; assert.ok(p.en?.title && p.en?.line, `${k} page ${i + 1}`); assert.equal(p.en.line.split('\n').length, p.line.split('\n').length, `${k} p${i + 1} line count`); });
  }
  const all = JSON.stringify(Object.values(SIGNAL_STORIES).flatMap(s => s.pages.map(p => p.en)));
  assert.ok(!/shall not pass|shall not\b/.test(all)); assert.ok(all.includes('Tanthasura: \\"Block ... every ... road ... little ... squirt ... you ... cannot ... pass.\\"'));
  assert.ok(all.includes('Akura: \\"Chain ... every ... road ... outsiders ... may ... not ... pass.\\"'));
  assert.ok(all.includes('It sounds every thirty terms exactly'));
  assert.equal(SIGNAL_STORIES['cyber-signal-open'].pages[0].line.split('\n')[1], 'นิรา: "ท่านคะ ดิฉันจดเวลาไว้แล้ว มันดังทุกสามสิบวาระตรงเป๊ะ ไม่ใช่เสียงของด่านค่ะ เป็นเสียงของบางอย่างที่ถูกเปิดค้างไว้"');   // Thai as it was
  setLang('en');
  try { for (const k of keys) { const s = storyOf(k); assert.ok(!TH.test(s.title), k); for (const p of s.pages) assert.ok(!TH.test(p.title + p.line), `${k}: ${p.title}`); } } finally { setLang('th'); }
});

test('the four lords\' thank-you pages and Archon-Zero\'s fall carry Rae\'s titles (TH + EN)', () => {
  assert.equal(Z4H_STORIES['z4-archon-down'].title, 'อาร์คอน-ศูนย์ล้ม'); assert.equal(Z4H_STORIES['z4-archon-down'].pages[0].title, 'รายการที่ยังไม่ปิด');
  assert.equal(Z4H_STORIES['z4-archon-down'].en.title, 'Archon-Zero Falls'); assert.equal(Z4H_STORIES['z4-archon-down'].pages[0].en.title, 'Item Not Yet Closed');
  const want = { th:['เสียงเรียกท่านพ่อ', 'The Word "Father"'], asia:['บัลลังก์ที่ไม่ใช่ของใคร', 'A Throne Nobody Else Holds'], west:['ความเย็นของตัวเอง', 'A Cold of His Own'], cyberhell:['สายที่ถูกตัดให้เป็นอิสระ', 'A Line Cut Free'] };
  for (const [z, [th, en]] of Object.entries(want)) { const s = Z4H_STORIES[`z4-ruler-free-${z}`]; assert.equal(s.pages[0].title, th, z); assert.equal(s.pages[0].en.title, en, z); }
});

test('Cerberus lines (Rae) and Yama\'s hypnosis line "ผม...ครับ" are in the frontier scenes', () => {
  const hyp = Z3_FRONTIER_STORIES['z3-hypnosis-v2'];
  assert.ok(hyp.pages[0].line.includes('แล้วมันก็ก้าวมายืนเคียงวาลดริก หันสามเศียรมาทางยามา'));
  assert.ok(hyp.pages[0].en.line.includes('Then he steps forward to stand beside Valdric and turns all three heads toward Yama.'));
  assert.ok(hyp.pages[1].line.includes('ยมบาทน้อย: "ตั้งสติไว้ครับ! ผมจะทำลายมนต์สะกดแล้วพาทุกคนกลับมา"')); assert.ok(!hyp.pages[1].line.includes('ข้าจะทำลาย'));
});

test('every scene of T4-T8 (zone 2 boss + harbour, zone 3, zone 4, the return, the finale) has English and not one Thai letter in it', () => {
  const groups = { Z3_FRONTIER_STORIES, Z3_ARRIVE_STORIES, Z3_CASE_STORIES, EIRLIN_STORIES, SEV_STORIES, Z4A_STORIES, Z4T_STORIES, Z4S_STORIES, Z4L_STORIES, Z4G_STORIES, Z4H_STORIES };
  let n = 0;
  setLang('en');
  try {
    for (const [name, group] of Object.entries(groups)) for (const key of Object.keys(group)) {
      const raw = group[key]; assert.ok(raw.en?.title || raw.pages.some(p => p.en), `${name}/${key} has no English`);
      const s = storyOf(key); assert.ok(s, key); assert.ok(!TH.test(s.title), `${key} scene title`);
      s.pages.forEach((p, i) => { assert.ok(!TH.test(p.title || '') && !TH.test(p.line || ''), `${key} page ${i + 1}`); }); n++;
    }
    // every scene anywhere that claims English (any page with `en`) is complete in English
    for (const k of new Set([...Object.keys(STORY), ...Object.keys(Z1_STORIES), ...Object.keys(SIGNAL_STORIES)])) {
      const raw = STORY[k] || Z1_STORIES[k] || SIGNAL_STORIES[k]; if (!(raw.en || raw.pages.some(p => p.en))) continue;
      const s = storyOf(k); assert.ok(!TH.test(s.title), k); s.pages.forEach((p, i) => assert.ok(!TH.test((p.title || '') + (p.line || '')), `${k} page ${i + 1}`));
    }
  } finally { setLang('th'); }
  assert.ok(n >= 50, `only ${n} scenes were checked`);
});

test('each boss arrival has an English line for every Thai line, including Severin’s original translation', () => {
  assert.equal(SEV_ARRIVE_LINES_EN.length, SEV_ARRIVE_LINES.length); assert.ok(SEV_ARRIVE_LINES_EN.length >= 8);
  assert.ok(SEV_ARRIVE_LINES_EN.every(l => !TH.test(l) && !l.includes('/*')));
  SEV_ARRIVE_LINES.forEach((l, i) => assert.equal(/^บรรยาย:/.test(l), /^Narration:/.test(SEV_ARRIVE_LINES_EN[i]), `line ${i + 1} is narration in both`));
  const west = ZONES.find(z => z.k === 'west'); assert.equal(west.bossArriveEn, SEV_ARRIVE_LINES_EN); assert.equal(west.bossArrive, SEV_ARRIVE_LINES);
  const ui = src('ui.js');
  assert.ok(ui.includes("english && z.bossArriveEn?.length === thLines.length ? z.bossArriveEn : thLines"));
  for (const z of ZONES) {
    assert.equal(z.bossArriveEn.length,z.bossArrive.length,z.k);
    assert.ok(z.bossArriveEn.every(line=>!TH.test(line)),z.k);
  }
  setLang('en');
  const lian = storyOf('z2-lian-open');
  assert.ok(lian.pages.every(p=>!TH.test(p.title+p.line)));
  assert.deepEqual(lian.pages.flatMap(p=>p.line.split('\n')),ZONES.find(z=>z.k==='asia').bossArriveEn);
  setLang('th');
});
