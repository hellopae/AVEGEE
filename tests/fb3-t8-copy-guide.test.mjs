// FB3-T8 (27 Nov 2026) - Rae's R2 wording in the game, the lamp rule "one call per helper", and the five handbook pages (MN1).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { LAMP_TEXT } from '../src/lamp-text.js';
import { NOTICES } from '../src/z1-events.js';
import { MERITS, MERIT_SOLID, MERIT_SOLID_EN, voice, STATIONS, GUARD_NAMES } from '../src/data.js';
import { Z4G_STORIES } from '../src/z4g-return.js';
import { Z4G_KEYS } from '../src/seized-keys.js';
import { LIB_TEXT } from '../src/liberation-text.js';
import { setLang, t } from '../src/i18n.js';
import { SUMMON_USES, HELPER_ACTS, LAMP_MAX_SLOTS } from '../src/lamp.js';
import { PLERNG_WARRANT_FOOD, keeperWorkPlan } from '../src/interrogation.js';
import { deservedOf } from '../src/game.js';
import { sentenceColor, SENTENCE_COLORS, ZERO_SENTENCE_COLOR } from '../src/sentence-colors.js';
import { GUIDE_LAYOUT, GUIDE_LOCKED_PAGES, GUIDE_PAGE_COUNT, guidePageHtml, guidePageLocked } from '../src/guide-pages.js';
globalThis.document = { documentElement:{} };
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const srcFiles = readdirSync(new URL('../src/', import.meta.url)).filter(n => n.endsWith('.js'));
/** the player-facing part of a line: everything before a trailing `// comment` (a line that is only a comment has none) */
const code = line => { const c = line.trim(); if (/^(\/\/|\/\*|\*)/.test(c)) return ''; const i = line.search(/\s\/\/\s/); return i < 0 ? line : line.slice(0, i); };

test('criterion 1: no "หอกระจก" is left in any text the player reads, and no lamp text still calls the lamp rule a "ท่าไม้ตาย" count', () => {
  for (const f of srcFiles) for (const [i, line] of src('src/' + f).split('\n').entries()) {
    assert.ok(!code(line).includes('หอกระจก'), `${f}:${i + 1} still says หอกระจก`);
    if (/ตะเกียง|หอส่องกรรม/.test(code(line))) assert.ok(!/ท่าไม้ตาย(ใช้ได้|ไปสามครั้ง|เหลือ)/.test(code(line)), `${f}:${i + 1} still counts special moves`);
  }
  for (const [k, row] of Object.entries(LAMP_TEXT)) { assert.ok(!/หอกระจก/.test(row.th), k); assert.ok(!/special move/i.test(row.en), k); }
  assert.equal(GUARD_NAMES.th.title.th, 'ผู้เฝ้าด่านสุวรรณภูมิ'); assert.equal(LAMP_TEXT['guard.th.title'].th, 'ผู้เฝ้าด่านสุวรรณภูมิ');
  // the generated files and the scripts that write them agree (a re-run gives the same words)
  assert.ok(!src('src/z4a-raw.js').includes('หอกระจก') && src('src/z4a-raw.js').includes('ไปเติมที่หอส่องกรรม ข้าไม่ให้ใครง่าย ๆ'));
  assert.ok(src('src/z4c-raw.js').includes('แพตช์ฝากหน้ากากไว้ในตะเกียงวิเศษ ท่านเรียกเขาในศึกได้ เรียกได้ 1 ครั้ง อยู่ในทีม 3 ตา หมดแล้วเติมไฟที่หอส่องกรรม'));
  assert.ok(src('scripts/extract-rae-z4b.py').includes('เรียกได้ 1 ครั้ง อยู่ในทีม 3 ตา') && src('scripts/extract-rae-z4a.py').includes("replace('หอกระจก', 'หอส่องกรรม')"));
});

test('the lamp rule in words: once per helper, 3 turns in the team, recharge at the Mirror Tower - every helper window and the lamp texts say it', () => {
  assert.equal(SUMMON_USES, 1); assert.equal(HELPER_ACTS, 3); assert.equal(LAMP_MAX_SLOTS, 4);
  const helperKeys = Object.keys(NOTICES).filter(k => k.startsWith('lamp-helper-') && NOTICES[k].text.includes('เรียกได้ 1 ครั้ง อยู่ในทีม 3 ตา หมดแล้วเติมไฟที่หอส่องกรรม'));
  assert.ok(helperKeys.length >= 5, 'the windows built from the generic text are not the ones with their own words');
  for (const k of ['lamp-helper-eirlin', 'lamp-helper-jormungandr', 'lamp-helper-thor', 'lamp-helper-lucifer', 'lamp-helper-lupin']) {
    const n = NOTICES[k]; if (!n) continue;
    assert.ok(n.text.includes('เรียกได้ 1 ครั้ง อยู่ในทีม 3 ตา หมดแล้วเติมไฟที่หอส่องกรรม'), k + ' th'); assert.match(n.en.text, /once, and (he|she) stays in your team for 3 turns\. When the flame is spent, recharge at the Mirror Tower\./, k + ' en');
  }
  assert.match(LAMP_TEXT['bag.note'].th, /เรียกได้ตนละ 1 ครั้ง/); assert.match(LAMP_TEXT['notice.received.text'].th, /เรียกได้ตนละ 1 ครั้ง อยู่ในทีม 3 ตา/);
  assert.equal(LAMP_TEXT['bag.movesLeft'], undefined);
  assert.doesNotMatch(Object.values(LAMP_TEXT).map(r => r.th + r.en).join(' '), /เรียก\S* ?(ได้ )?(ตนละ )?3 ครั้ง|called 3 times|called all 3|Calls left|n\/3/);
  assert.ok(!/เรียกเขามาสามครั้ง/.test(src('src/z1-events.js')) && src('src/z1-events.js').includes('เรียกเขามาครั้งเดียวมันก็ริบ'));
});

test('Rae R2 wording, checked item by item (ก ข ค ช ซ ฌ ญ ฎ ฏ ฉ)', () => {
  // ก
  assert.ok(src('src/game.js').includes('บุญข้อนี้ไม่นับ ทำเครื่องหมาย (ไม่นับ) ไว้ในสำนวนแล้ว'));
  // ข - all seven merits have a line, the owner's first, the others in the same shape; the English reference says nothing about a child's / relative's sex
  assert.deepEqual(Object.keys(MERIT_SOLID).sort(), MERITS.map(m => m.t).sort());
  assert.equal(voice(MERIT_SOLID['เลี้ยงหมาจรมาทั้งชีวิต 14 ตัว'], 'f'), 'ดิฉันเลี้ยงหมาจร เพื่อช่วยชีวิตมันจริงๆนะคะ');
  assert.equal(voice(MERIT_SOLID['เคยบวชให้แม่หนึ่งพรรษา'], 'm'), 'ผมบวชให้แม่ครบพรรษา เพื่อทดแทนคุณท่านจริงๆนะครับ');
  assert.equal(voice(MERIT_SOLID['เคยกระโดดลงคลองช่วยเด็กจมน้ำ'], 'f'), 'ดิฉันกระโดดลงไปช่วยเด็กคนนั้น เพราะไม่อยากให้เขาจมน้ำตายจริงๆนะคะ');
  for (const [m, line] of Object.entries(MERIT_SOLID)) { assert.match(line, /^\{i\}/); assert.match(line, /จริงๆ\{na\}$/); assert.doesNotMatch(line, /ผม|ดิฉัน|ครับ|ค่ะ|คะ/); assert.ok(MERIT_SOLID_EN[m], m); }
  assert.match(MERIT_SOLID_EN['ส่งเสียหลานเรียนจนจบทั้งที่ไม่ใช่ลูก'], /my niece or nephew .* for them to|wanted them to have a future/); assert.match(MERIT_SOLID_EN['เคยกระโดดลงคลองช่วยเด็กจมน้ำ'], /let them drown/);
  assert.doesNotMatch(Object.values(MERIT_SOLID_EN).join(' '), /\bhim\b|\bhis\b/);
  // ค - e12 title, Kumphan has just arrived
  assert.ok(src('src/z1-events.js').includes("title:'กุมภัณฑ์เข้าช่วย'") && !src('src/z1-events.js').includes('ยักษ์ทวารบาลออกมาช่วย'));
  // ช ซ - the one lamp window; the tower window stays for an old save only
  assert.equal(LAMP_TEXT['notice.tower.title'].th, 'หอส่องกรรมเปิดแล้ว'); assert.equal(LAMP_TEXT['notice.tower.title'].en, 'The Mirror Tower Is Open');
  assert.match(LAMP_TEXT['notice.received.text'].th, /ซึ่งสร้างได้แล้วตั้งแต่ตอนนี้$/); assert.match(LAMP_TEXT['notice.received.text'].en, /which you can build from now on\.$/);
  const both = key => { setLang('th'); const a = t(key); setLang('en'); const b = t(key); setLang('th'); return [a, b]; };
  assert.deepEqual(both('unlock.towerEvent'), ['เปิดหลังได้ตะเกียงวิเศษ', 'Opens once you have the Magic Lamp']);
  assert.deepEqual(both('unlock.towerWhen'), ['สร้างได้หลังจบเหตุการณ์นางสีดาและหนุมาน (ได้ตะเกียงวิเศษ)', 'can be built after the Sita and Hanuman event (when you receive the Magic Lamp)']);
  // ญ - liberation scenes: the freed Guard does not say "I go with you" in his own scene, the last line of the fire scene does; the team labels
  for (const zone of ['th', 'asia', 'west']) {
    const freed = Z4G_STORIES[Z4G_KEYS.guardFreed[zone]].pages[0], fire = Z4G_STORIES[Z4G_KEYS.fire[zone]].pages[0];
    assert.doesNotMatch(freed.line, /ไปกับท่าน/); assert.match(freed.line, /ขอบคุณ"$/); assert.match(fire.line, /ข้าจะไปกับท่าน/); assert.match(fire.en.line, /I (am going|will go) with you/);
  }
  assert.equal(LIB_TEXT['team.duel'].th, 'ที่ประตู มีเพียงยามากับนิราที่เข้าไปได้'); assert.equal(LIB_TEXT['team.lord'].en, 'Yama · Nira · {guard} (freed from the spell)');
  // ฎ - "you can build X now" windows, kitchen help, the fireball hint
  const b = NOTICES['build-open-dab']; assert.ok(b.text.endsWith('เดินไปที่ป้ายก่อสร้างบนแผนที่แล้วกดสร้างได้เลย')); assert.match(b.en.text, /^Yama has risen in rank, and the Sword Forest can now be built\. Walk to its building spot on the map and press build\.$/);
  assert.match(both('g5.hintIdle')[0], /โดน 5 ครั้งชนะ พลาด 3 ครั้งแพ้$/); assert.match(both('g5.hintIdle')[1], /5 hits win, 3 misses lose\.$/);
  assert.match(both('canteen.help')[0], /^พ่อครัวปั้นข้าวเข้าคลังเสบียงเองทุก \{sec\} วินาที ได้ครั้งละ \{batch\} ห่อ/); assert.match(both('canteen.help')[1], /for \{price\} karma coins of ingredients/);
  for (const k of ['canteen.help.foreman', 'foreman.canteen.go']) assert.deepEqual(both(k), [k, k], k + ' is gone');
  assert.ok(src('src/canteen.js').includes("w.reason='เบี้ยไม่พอซื้อวัตถุดิบ'"));
  // ฉ
  assert.ok(src('src/ui.js').includes("const STORY_HEARING_LOCKED_NOTE = 'ใช้ไม่ได้ในคดีนี้';"));
  // Z4A clock window: the technical bracket is gone
  const clock = Object.values(NOTICES).find(n => n.title === 'นาฬิกาย้อนเวลา'); assert.ok(clock && !/cooldownClock|รายละเอียดตาม/.test(clock.text + clock.en.text));
  // the z1-guard-name scene
  const guard = src('src/z1-events.js'); assert.ok(guard.includes('เพิ่งตามมาถึงด่านนี้ แต่ข้ายินดีช่วยท่านเต็มที่') && !guard.includes('ตั้งแต่รุ่นพ่อข้าเฝ้าด่านนี้'));
});

test('Reese notes: the purple trait uses a crystal ball (not an evil-eye amulet), Boon "helps lower Yama\'s karma"', () => {
  for (const f of ['src/interrogation.js', 'src/sentencing-guide.js', 'src/guide-pages.js', 'src/data.js']) assert.ok(!src(f).includes('🧿'), f);
  assert.ok(src('src/interrogation.js').includes("icon:'🔮'"));
  assert.ok(!/ชำระกรรม/.test(src('src/interrogation.js') + src('src/sentencing-guide.js') + src('src/guide-pages.js')));
  assert.match(src('src/guide-pages.js'), /ช่วยลดกรรมของยามา/);
});

// ---------------------------------------------------------------- MN1 · the handbook pages
const ctx = (unlocked = {}, lang = 'th') => ({ lang, t, art: k => 'img/' + k + '.webp', stationImg: k => 'img/rooms-wide/th-' + k + '.webp', unlocked });
const textOf = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('MN1: five pages, ten boxes, every box in Thai and English; two columns on a desktop, reading order for a phone', () => {
  assert.equal(GUIDE_PAGE_COUNT, 5);
  const boxes = Object.values(GUIDE_LAYOUT).flat().filter(i => i.box).map(i => i.box).sort((a, b) => a - b); assert.deepEqual(boxes, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  for (let p = 1; p <= 5; p++) for (const lang of ['th', 'en']) {
    const html = guidePageHtml(p, lang, ctx({ lamp:true, seized:true }, lang));
    for (const i of GUIDE_LAYOUT[p].filter(i => i.box)) assert.match(html, new RegExp(`data-gp-box="${i.box}"`));
    assert.ok(textOf(html).length > 200, `page ${p} ${lang}`);
    assert.doesNotMatch(html, /undefined|NaN|\[object/);
    const orders = [...html.matchAll(/style="order:(\d+)"/g)].map(m => Number(m[1])); assert.deepEqual([...orders].sort((a, b) => a - b), GUIDE_LAYOUT[p].map(i => i.o).sort((a, b) => a - b), 'one reading order per item');
  }
  const p1 = guidePageHtml(1, 'th', ctx()); for (const s of ['เลือกประเด็นที่จะสอบสวน', 'บาปไหน ลงทัณฑ์ที่ไหน', 'ลงทัณฑ์ที่ไหน', 'data-gp-shot="a"']) assert.ok(p1.includes(s), s);
  for (const k of ['krata', 'dab', 'lokan', 'ngiw', 'lan']) assert.ok(p1.includes(`th-${k}.webp`), k);
  assert.match(p1, /gp-station is-pick/); const css = src('src/guide-pages.css'); assert.match(css, /@media\(max-width:760px\)/); assert.match(css, /\.gp-left,\.gp-right\{display:contents\}/);
  for (const f of ['guide-room-a', 'guide-room-b', 'guide-keepers', 'guide-not-counted', 'guide-summon', 'guide-tower', 'guide-seized-team']) assert.ok(src('src/guide-pages.js').includes(`img/guide/${f}.webp`) && readFileSync(new URL(`../img/guide/${f}.webp`, import.meta.url)).length > 1000, f);
});

test('MN1: pages 4 and 5 are locked against spoilers until the lamp / a seized city - a locked page shows "???" and nothing of what is coming', () => {
  assert.deepEqual(GUIDE_LOCKED_PAGES, { 4:'lamp', 5:'seized' });
  for (const lang of ['th', 'en']) {
    for (const [p, key, words] of [[4, 'lamp', /ตะเกียงวิเศษ|Magic Lamp|หอส่องกรรม|Mirror Tower/], [5, 'seized', /เมืองถูกยึด|seized|ปลดสะกด/]]) {
      const shut = guidePageHtml(p, lang, ctx({}, lang)), open = guidePageHtml(p, lang, ctx({ [key]:true }, lang));
      assert.ok(guidePageLocked(p, ctx({}))); assert.ok(!guidePageLocked(p, ctx({ [key]:true })));
      assert.match(shut, lang === 'th' ? /\?\?\? · ยังไม่ได้พบ/ : /\?\?\? · not yet met/); assert.match(shut, lang === 'th' ? /หัวข้อนี้เปิดเมื่อเล่นถึงเนื้อเรื่อง/ : /opens as the story reaches it/);
      assert.doesNotMatch(textOf(shut), words, `page ${p} ${lang} locked leaks`); assert.doesNotMatch(shut, /gp-shot|<img/); assert.match(textOf(open), words);
    }
  }
  for (const p of [1, 2, 3]) assert.ok(!guidePageLocked(p, ctx({})), 'pages 1-3 are open from the start');
  // the wiring: the lamp opens page 4, a seized (or once-seized) world opens page 5
  const ui = src('src/ui.js'); assert.match(ui, /unlocked:\{ lamp:LAMP\.lampOwned\(g\), seized:seizedActive\(g\) \|\| g\.zoneEvents\?\.cyberhell\?\.signalClose === 'cleared' \}/); assert.match(ui, /<div data-gp-root><\/div>/);
});

test('MN1: the numbers in the pages are the numbers of the code (Claudy ruling 4)', () => {
  const th = [1, 2, 3, 4, 5].map(p => textOf(guidePageHtml(p, 'th', ctx({ lamp:true, seized:true })))).join(' '), en = [1, 2, 3, 4, 5].map(p => textOf(guidePageHtml(p, 'en', ctx({ lamp:true, seized:true }, 'en')))).join(' ');
  // colour chips = sentence-colors.js
  assert.deepEqual([5, 4, 3, 2, 1, 0].map(v => sentenceColor(v).name), ['แดง', 'ส้ม', 'เหลือง', 'เขียว', 'ขาว', 'เทา']);
  for (const [v, n] of [[5, 'แดง'], [4, 'ส้ม'], [3, 'เหลือง'], [2, 'เขียว'], [1, 'ขาว'], [0, 'เทา']]) assert.ok(th.includes(`${n} = ${v}`), n);
  for (const [v, n] of [[5, 'Red'], [4, 'Orange'], [3, 'Yellow'], [2, 'Green'], [1, 'White'], [0, 'Grey']]) assert.ok(en.includes(`${n} = ${v}`), n);
  assert.equal(SENTENCE_COLORS.length + 1, 6); assert.equal(ZERO_SENTENCE_COLOR.name, 'เทา');
  // the worked example: heaviest sin 5 (hit-and-run, kha), the blood-donation merit is worth 1 in MERITS (the owner's picture said 2), no mitigating reason -> level 4, by the real formula
  const blood = MERITS.find(m => m.t === 'บริจาคเลือดครบ 40 ครั้ง'); assert.equal(blood.v, 1);
  const soul = { deeds:[{ t:'ขับรถชนแล้วหนี ทิ้งคนเจ็บไว้กลางถนน', s:'kha', w:5, known:true }], merits:[{ ...blood, fake:false }] }; assert.equal(deservedOf(soul), 4);
  assert.ok(th.includes('บริจาคเลือดครบ 40 ครั้ง = 1') && th.includes('5 − 1 = 4') && !th.includes('5 − 2 = 3')); assert.ok(en.includes('gave blood 40 times = 1') && en.includes('5 − 1 = 4'));
  assert.equal(deservedOf({ deeds:[{ w:5, s:'kha' }, { w:-1, s:'kha' }], merits:[{ v:1, fake:false }] }), 3, 'a mitigating reason (w < 0) is taken off as well');
  assert.equal(deservedOf({ deeds:[{ w:5, s:'kha' }], merits:[{ v:1, fake:true }] }), 5, 'a made-up merit is never taken off');
  // keepers: Plerng 2 rice balls, Boon -1 karma and +20% time, Taan +2 order, Dam 25% (interrogation.js roles), Kan 1 hidden fact
  assert.equal(PLERNG_WARRANT_FOOD, 2); assert.ok(th.includes('เสบียงเพิ่ม 2 ห่อต่อ 1 หมาย') && en.includes('2 extra rice balls per writ'));
  assert.equal(keeperWorkPlan({ pure:false }, 'boon').completionKarma, -1); assert.ok(Math.abs(1 / keeperWorkPlan({ pure:false }, 'boon').speedMultiplier - 1.2) < 1e-9); assert.ok(th.includes('กรรมของยามาลด 1') && th.includes('เพิ่ม 20%') && en.includes('drops by 1') && en.includes('20% more'));
  assert.equal(keeperWorkPlan({ pure:false }, 'taan').completionOrder, 2); assert.ok(th.includes('ระเบียบเมือง +2') && en.includes('city order +2'));
  assert.match(src('src/interrogation.js'), /งานคุมของดำเร็วขึ้นอีก 25%/); assert.ok(th.includes('เร็วขึ้น 25%') && en.includes('25% faster'));
  assert.equal(keeperWorkPlan({ pure:false }, 'dam').crowdSupport, true);
  // the lamp: one call each, 3 turns in the team, 4 slots at most
  assert.ok(th.includes('เรียกผู้ช่วยได้ตนละ 1 ครั้ง') && th.includes('สั่งโจมตีได้ 3 ตา') && th.includes('สูงสุด 4 ตน') && en.includes('called once') && en.includes('act for 3 turns') && en.includes('up to 4 helpers'));
  // the real power names (ruling 7): "ตวาดข่มขู่" is the button, the guide uses it
  assert.ok(th.includes('ตวาดข่มขู่') && !th.includes('ใช้พลัง ข่มขู่')); assert.ok(STATIONS.find(s => s.k === 'dab').name === 'ป่าดาบอสิปัตตะ' && th.includes('ป่าดาบอสิปัตตะ'));
  setLang('en'); assert.equal(t('room.dab.sins'), 'violence - harmful speech'); assert.ok(en.includes('violence - harmful speech') || guidePageHtml(1, 'en', { ...ctx({}, 'en'), t }).includes('violence')); setLang('th');
  assert.ok(en.includes('(not counted)') && t('merit.notCounted') === '(ไม่นับ)', 'the English mark is the game\'s own wording');
});

test('MN1: the handbook mounts the pages, the importmap and the stylesheet know the new files', () => {
  const html = src('index.html'); assert.ok(html.includes('"./src/guide-pages.js": "./src/guide-pages.js?v=')); assert.ok(html.includes('href="src/guide-pages.css?v='));
  assert.match(src('src/ui.js'), /import \{ mountGuidePages \} from '\.\/guide-pages\.js'/);
});
