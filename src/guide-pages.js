// FB3-MN1 (owner 26 Nov, Comment10-1 / Comment10-2): the "วิธีเล่น" pages of the handbook - ten boxes on five pages, text on the left and a picture of the game on the right.
// Words: Rae R2 (Output/Rae/2026-11-26-avegee-fb3-r2-copy.md, section MN1) · Reese PASS · Claudy rulings 4 / 6 / 7 / 10 (see Output/Toby/2026-11-27-avegee-fb3-t8.md for what changed against the code).
// Pictures: captures of the real game in img/guide/ (guide-*.webp) - a real drawing / a fresh capture saved under the same name replaces one with no code change.
// Pages 4 and 5 are LOCKED until the player has reached their story (the lamp / a seized city) so a new player is not spoiled.
import { SENTENCE_COLORS, ZERO_SENTENCE_COLOR } from './sentence-colors.js';
import { STATIONS } from './data.js';

export const GUIDE_PAGE_COUNT = 5;
/** Which boxes stand on which page. */
export const GUIDE_PAGE_BOXES = Object.freeze({ 1:[1, 2, 3], 2:[4, 5], 3:[6, 7], 4:[8, 9], 5:[10] });
/** Pages that stay shut until the story reaches them - the key of the unlock check in `ctx.unlocked`. */
export const GUIDE_LOCKED_PAGES = Object.freeze({ 4:'lamp', 5:'seized' });

/** Locked-box wording (Rae: same pattern as `bag.unmet`). */
export const GUIDE_LOCK_TEXT = Object.freeze({
  head:{ th:'??? · ยังไม่ได้พบ', en:'??? · not yet met' },
  note:{ th:'หัวข้อนี้เปิดเมื่อเล่นถึงเนื้อเรื่อง', en:'This topic opens as the story reaches it' },
});

/** Numbered red circles laid over a capture (x, y = centre in the capture's own 1792 x 1120 pixels). */
const CALLOUTS = Object.freeze({
  a:{ 1:[1042, 338], 2:[1042, 176], 3:[318, 632] },
  b:{ 4:[858, 812], 5:[1042, 176] },
});
const SHOT = Object.freeze({ w:1792, h:1120 });

const COLOUR_EN = Object.freeze({ 5:'Red', 4:'Orange', 3:'Yellow', 2:'Green', 1:'White', 0:'Grey' });
const COLOUR_TH = Object.freeze({ 5:'แดง', 4:'ส้ม', 3:'เหลือง', 2:'เขียว', 1:'ขาว', 0:'เทา' });
const chipColour = v => v === 0 ? ZERO_SENTENCE_COLOR.color : SENTENCE_COLORS[Math.max(0, Math.min(4, v - 1))].color;
const chips = lang => `<div class="gp-chips" role="list">${[5, 4, 3, 2, 1, 0].map(v => `<span role="listitem" style="color:${chipColour(v)};border-color:${chipColour(v)}"><b>${(lang === 'en' ? COLOUR_EN : COLOUR_TH)[v]}</b> = ${v}</span>`).join('')}</div>`;

const TRAIT_COLOUR = Object.freeze({ concealing:'#b78ae5', resisting:'#ef7777', accepting:'#83ca96' });
const RED = '#ff7385', GREEN = '#62d891';
const col = (c, html) => `<span style="color:${c}">${html}</span>`;

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
const ul = items => `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`;

/** Boxes. `title` + `body(lang, ctx)` (ctx = { t, art, stationImg }). Thai and English side by side. */
const BOXES = Object.freeze({
  1:{ title:{ th:'1. เลือกประเด็นที่จะสอบสวน', en:'1. Choose what to question' },
    body:(lang) => lang === 'en'
      ? `${ul(['Pick the statement that looks like a lie.', 'Use your powers (Roar, Magic Mirror, Hypnosis) to bring out the truth.', 'Ask Kan to help open the truth.'])}<p><b>What was hidden in the file will come to light.</b></p>`
      : `${ul(['เลือกหัวข้อที่ดูน่าสงสัยว่าน่าจะโกหก', 'ใช้พลัง ตวาดข่มขู่ · กระจกวิเศษ · สะกดจิต เพื่อเปิดเผยความจริง', 'ให้กานต์ช่วยใช้พลังเปิดความจริง'])}<p><b>สำนวนที่ถูกปกปิดไว้ จะเปิดเผยขึ้นมา</b></p>` },
  2:{ title:{ th:'2. บาปไหน ลงทัณฑ์ที่ไหน', en:'2. Which sin, which place' },
    body:(lang) => lang === 'en'
      ? `<p>Read the file to see what kind of sin each one is, and which is the heaviest. For example:</p>${chips(lang)}<p>Choose the sin whose colour scores highest. In the picture it is ${col(RED, 'Killing / harming: hit-and-run, leaving the injured in the road')}.</p><p>This sin is red, the highest score of everything he did. Its type is ${col(RED, 'violence')}.</p>`
      : `<p>อ่านจากสำนวนว่า เป็นบาปชนิดไหน และบาปไหนแรงที่สุด เช่น</p>${chips(lang)}<p>เลือกบาปจากสีที่มีคะแนนมากที่สุด ในรูปคือ ${col(RED, 'ฆ่า/ทำร้าย ขับรถชนแล้วหนี ทิ้งคนเจ็บไว้กลางถนน')}</p><p>บาปนี้สีแดง ได้คะแนนสูงสุดในบาปที่ทำ ชนิดบาปคือ ${col(RED, 'ฆ่า/ทำร้าย')}</p>` },
  3:{ title:{ th:'3. ลงทัณฑ์ที่ไหน', en:'3. Where to send them' },
    body:(lang, ctx) => {
      const order = ['krata', 'dab', 'lokan', 'ngiw', 'lan'];
      const nameEn = { krata:'The Copper Cauldron', dab:'The Sword Forest', lokan:'Lokantara Hell', ngiw:'The Silk-Cotton Grove', lan:'The Toil Yard' };   // the game has no English station names yet (Rae's table; same words as the "you can build" windows)
      const cards = order.map(k => { const st = STATIONS.find(s => s.k === k); return `<figure class="gp-station${k === 'dab' ? ' is-pick' : ''}"><img src="${esc(ctx.stationImg(k))}" alt="" loading="lazy" onerror="this.remove()"><figcaption><b>${esc(lang === 'en' ? nameEn[k] : st.name)}</b><small>${esc(ctx.t(`room.${k}.sins`))}</small></figcaption></figure>`; }).join('');
      return `<p>${lang === 'en' ? `Sin type: ${col(RED, 'violence')}` : `ชนิดบาป ${col(RED, 'ฆ่า/ทำร้าย')}`}</p><div class="gp-stations">${cards}</div>`
        + `<p>${lang === 'en' ? 'Match the sin type to its station, then press "Issue the Writ".' : 'จับคู่ชนิดบาปกับสถานีที่ตรงกรรม แล้วกด "ออกหมาย"'}</p>`;
    } },
  4:{ title:{ th:'4. เลือกผู้คุม ตามสีของวิญญาณ', en:"4. Pick a keeper by the spirit's colour" },
    body:(lang, ctx) => {
      const keeper = (who, k, en, thTxt, enTxt) => `<div class="gp-keeper"><figure><img src="${esc(ctx.art(`crew-${k}-profile`))}" alt="" loading="lazy" onerror="this.remove()"><figcaption>${esc(lang === 'en' ? en : who)}</figcaption></figure><p>${lang === 'en' ? enTxt : thTxt}</p></div>`;
      const head = (c, icon, thT, enT) => `<h5 style="color:${c}">${icon} ${lang === 'en' ? enT : thT}</h5>`;
      return lang === 'en'
        ? `<p>The colour of a spirit's name and icon shows its nature. It shows how they behave, not how guilty they are.</p>`
          + head(TRAIT_COLOUR.concealing, '🔮', 'Purple', 'Purple – hides the truth') + `<p>Signs: tells only half, makes things up, keeps a secret, or hides a heavy sin in the file.</p>`
          + keeper('กานต์', 'kan', 'Kan', '', 'Best keeper: <b>Kan</b> can open one hidden fact in the file before you issue the writ, including mitigating reasons.')
          + head(TRAIT_COLOUR.resisting, '🔥', 'แดง', 'Red – stubborn and defiant') + `<p>Signs: will resist the verdict, or flatly deny the heaviest charge.</p>`
          + keeper('เพลิง', 'plerng', 'Plerng', '', 'Best keeper: <b>Plerng</b> controls a defiant spirit without losing time to resistance, at the cost of 2 extra rice balls per writ.')
          + head(TRAIT_COLOUR.accepting, '🍃', 'เขียว', 'Green – accepting and ready to make amends') + `<p>Signs: takes the verdict calmly, hides nothing, does not resist.</p>`
          + keeper('บุญ', 'boon', 'Boon', '', 'Best keeper: <b>Boon</b> helps lower Yama\'s karma. If you judged rightly and the punishment finishes, Yama\'s karma drops by 1, at the cost of 20% more punishment time.')
        : `<p>สีของชื่อวิญญาณและไอคอน จะบ่งบอกถึงลักษณะนิสัยของวิญญาณ (บอกนิสัย ไม่ได้บอกว่าผิดมากหรือน้อย)</p>`
          + head(TRAIT_COLOUR.concealing, '🔮', 'สีม่วง – นิสัย ปิดบังความจริง', '') + `<p>มีสัญญาณว่าจะพูดไม่หมด แต่งเรื่องขึ้น มีความลับซ่อนอยู่ หรือซ่อนกรรมหนักไว้ในสำนวน</p>`
          + keeper('กานต์', 'kan', '', 'ผู้คุมที่เหมาะ : <b>กานต์</b> มีพลังช่วยเปิดข้อเท็จจริงที่ซ่อนอยู่ เปิดความจริงในสำนวนให้ 1 ประเด็นก่อนออกหมาย รวมถึงเหตุบรรเทาโทษ', '')
          + head(TRAIT_COLOUR.resisting, '🔥', 'สีแดง – นิสัย ดื้อและต่อต้าน', '') + `<p>มีสัญญาณว่าจะขัดขืนไม่ยอมรับคำตัดสิน หรือปฏิเสธเสียงแข็งในข้อหาที่หนักที่สุด</p>`
          + keeper('เพลิง', 'plerng', '', 'ผู้คุมที่เหมาะ : <b>เพลิง</b> คุมวิญญาณต่อต้านได้โดยไม่เสียเวลาจากการขัดขืน แลกกับเสียเสบียงเพิ่ม 2 ห่อต่อ 1 หมาย', '')
          + head(TRAIT_COLOUR.accepting, '🍃', 'สีเขียว – นิสัย ยอมรับและพร้อมแก้ไข', '') + `<p>ฟังคำตัดสินอย่างสงบ ไม่ปิดบัง ไม่ต่อต้าน</p>`
          + keeper('บุญ', 'boon', '', 'ผู้คุมที่เหมาะ : <b>บุญ</b> ช่วยลดกรรมของยามา หากตัดสินถูกและงานลงทัณฑ์จบ กรรมของยามาลด 1 แลกกับใช้เวลาลงทัณฑ์เพิ่ม 20%', '');
    } },
  5:{ title:{ th:'5. อ่านค่าสีในสำนวน และคำนวณระดับทัณฑ์', en:'5. Read the colours and work out the punishment level' },
    // Numbers checked against the code (Claudy ruling 4): a sin and a mitigating reason are coloured by their weight (sentence-colors.js), a MERIT is always drawn green (ui.js publicMeritLine) and takes off its own value (data.js MERITS: 1, the life-saving ones 2) - so the example is 5 - 1 = 4, not the owner's 5 - 2 = 3.
    body:(lang) => lang === 'en'
      ? `<p>Read the colour of each sin and mitigating reason in place of a number. A merit is always shown in green: most take off 1, a great one (saving a life) takes off 2.</p>${chips(lang)}`
        + `<p>How to work it out: heaviest sin − total real merit − total mitigating reasons = punishment level.</p>`
        + `<p>In the example: heaviest sin ${col(RED, 'hit-and-run, leaving the injured in the road = 5')}<br>Merit ${col(GREEN, 'gave blood 40 times = 1')} / mitigating reasons: none = 0<br>Punishment level = ${col(RED, '5')} − ${col(GREEN, '1')} = 4</p><p>Merits marked <b>(not counted)</b> are not subtracted.</p>`
      : `<p>ดูสีของข้อความกรรมและเหตุบรรเทาโทษ เพื่อแทนจำนวนตัวเลข ส่วนบุญจะเป็นสีเขียวเสมอ บุญส่วนใหญ่หักได้ 1 บุญใหญ่อย่างช่วยชีวิตคนหักได้ 2</p>${chips(lang)}`
        + `<p>วิธีคำนวณ : กรรมหนักสุด − บุญจริงรวม − เหตุบรรเทาโทษรวม = ระดับความแรงของทัณฑ์</p>`
        + `<p>ในรูปตัวอย่าง กรรมหนักสุด ${col(RED, 'ขับรถชนแล้วหนี ทิ้งคนเจ็บไว้กลางถนน = 5')}<br>บุญ ${col(GREEN, 'บริจาคเลือดครบ 40 ครั้ง = 1')} / เหตุบรรเทาโทษ ไม่มี = 0<br>ระดับทัณฑ์ = ${col(RED, '5')} − ${col(GREEN, '1')} = 4</p><p>บุญที่มีป้าย <b>(ไม่นับ)</b> ไม่ถูกนำมาหัก</p>` },
  6:{ title:{ th:'6. ผู้คุมที่ไม่ผูกกับสี', en:'6. Keepers not tied to a colour' },
    body:(lang) => lang === 'en'
      ? `<p>Some keepers suit every colour.</p><p><b>Taan</b> keeps order: if you judged rightly and the punishment finishes, city order +2, but he must stay until the end, so he cannot build or repair.</p><p><b>Dam</b> handles crowds: with a worker helping at the station and at least 2 spirits, the work goes 25% faster.</p>`
      : `<p>ผู้คุมบางคนใช้ได้กับวิญญาณทุกสี</p><p><b>ทัณฑ์</b> คุมงานเป็นระเบียบ หากตัดสินถูกและงานลงทัณฑ์จบ ระเบียบเมือง +2 แต่ต้องคุมจนจบ จึงไม่ว่างไปสร้างหรือซ่อมอาคาร</p><p><b>ดำ</b> คุมงานหมู่ เมื่อมีคนงานมาช่วยถึงสถานีและมีวิญญาณอย่างน้อย 2 ดวง งานคุมเร็วขึ้น 25%</p>` },
  7:{ title:{ th:'7. ข้ออ้างที่ไม่นับ (ไม่นับ)', en:'7. Claims that do not count (not counted)' },
    body:(lang) => lang === 'en'
      ? `<p>Some spirits claim merits that are false, or that are not merits at all.</p><p>Those claims stay in the file, but once the truth is out they are marked <b>(not counted)</b> and are not subtracted from the punishment level.</p><p>The mark appears only after you find out: by pressing the boast, using the mirror or hypnosis, asking Kan, or closing the case.</p>`
      : `<p>วิญญาณบางดวงอ้างบุญที่ไม่จริง หรือไม่นับเป็นบุญ</p><p>ข้อที่ไม่นับยังอยู่ในสำนวน แต่เมื่อความจริงเปิดเผย จะมีป้าย <b>(ไม่นับ)</b> ต่อท้าย และไม่ถูกนำไปหักระดับทัณฑ์</p><p>ป้ายขึ้นหลังรู้ความจริงเท่านั้น: เมื่อกดข้ออวดบุญ ใช้กระจกหรือสะกดจิต ให้กานต์ช่วย หรือปิดคดีแล้ว</p>` },
  8:{ title:{ th:'8. ตะเกียงวิเศษ', en:'8. The Magic Lamp' },
    body:(lang) => lang === 'en'
      ? `<p>Given by Lady Sita after you beat Hanuman. Use it to call those who accepted you into battle. The "Summon" button is in the battle menu.</p>${ul(['Each helper can be called once.', 'When called, the helper stands in your team and can act for 3 turns before returning to the Lamp.', 'Once called, they need the Mirror Tower to recharge. The Lamp holds up to 4 helpers.'])}`
      : `<p>ได้จากนางสีดาหลังชนะหนุมาน ใช้เรียกผู้ที่ยอมรับท่านมาช่วยในศึก ปุ่ม "อัญเชิญ" อยู่ในเมนูศึก</p>${ul(['เรียกผู้ช่วยได้ตนละ 1 ครั้ง', 'เมื่อเรียกแล้ว ผู้ช่วยยืนอยู่ในทีม และสั่งโจมตีได้ 3 ตา แล้วกลับเข้าตะเกียง', 'เรียกแล้วต้องไปเติมไฟที่หอส่องกรรม · ตะเกียงใส่ผู้ช่วยได้สูงสุด 4 ตน'])}` },
  9:{ title:{ th:'9. หอส่องกรรม', en:'9. The Mirror Tower' },
    body:(lang) => lang === 'en'
      ? `<p>Can be built after the Sita and Hanuman event, when you receive the Magic Lamp. Go in to recharge all three treasures: the Magic Mirror, the Magic Lamp and the Magic Clock (once you have it).</p>`
      : `<p>สร้างได้หลังจบเหตุการณ์นางสีดาและหนุมาน (ได้ตะเกียงวิเศษ) เดินเข้าไปเติมพลังให้ของวิเศษทั้งสามชิ้น: กระจกวิเศษ ตะเกียงวิเศษ และนาฬิกาวิเศษ (เมื่อได้รับแล้ว)</p>` },
  10:{ title:{ th:'10. เมื่อเมืองถูกยึด', en:'10. When a city is seized' },
    body:(lang) => lang === 'en'
      ? `<p>When a zone is seized, its harbour closes and the reapers in town are under the spell and cannot join you.</p><ol><li>At the zone's gate only Yama and Nira can go. Fight the spellbound gate guard.</li><li>Win, and Nira breaks the spell. The guard joins your team.</li><li>Go on to fight the spellbound reapers and the frontier boss.</li><li>Win, and the zone's harbour opens again.</li></ol>`
      : `<p>เมื่อโซนใดถูกยึด ท่าเรือจะปิด และยมทูตในเมืองถูกสะกด เข้าทีมไม่ได้</p><ol><li>ที่ประตูโซน ไปได้เฉพาะยามากับนิรา สู้ผู้เฝ้าด่านที่ถูกสะกด</li><li>ชนะแล้ว นิราปลดสะกด ผู้เฝ้าด่านเข้าทีม</li><li>ไปสู้ยมทูตที่ถูกสะกดและบอสชายแดนต่อ</li><li>ชนะแล้วท่าเรือของโซนนั้นเปิดอีกครั้ง</li></ol>` },
});

/** The captures (img/guide/): `callouts` = which set of numbered circles goes over it. */
const SHOTS = Object.freeze({
  a:{ src:'img/guide/guide-room-a.webp', callouts:'a' },
  b:{ src:'img/guide/guide-room-b.webp', callouts:'b' },
  keepers:{ src:'img/guide/guide-keepers.webp' },
  notcounted:{ src:'img/guide/guide-not-counted.webp' },
  summon:{ src:'img/guide/guide-summon.webp' },
  tower:{ src:'img/guide/guide-tower.webp' },
  seized:{ src:'img/guide/guide-seized-team.webp' },
});
/** Which item goes in which column of a page, and in which order a phone reads them (one column: `order`). Desktop = two columns, text on the left and pictures on the right, like the owner's Comment10-1 / 10-2. */
export const GUIDE_LAYOUT = Object.freeze({
  1:[{ col:'L', box:1, o:1 }, { col:'R', shot:'a', o:2 }, { col:'L', box:2, o:3 }, { col:'R', box:3, o:4 }],
  2:[{ col:'L', box:4, o:1 }, { col:'R', shot:'b', o:2 }, { col:'R', box:5, o:3 }],
  3:[{ col:'L', box:6, o:1 }, { col:'R', shot:'keepers', o:2 }, { col:'L', box:7, o:3 }, { col:'R', shot:'notcounted', o:4 }],
  4:[{ col:'L', box:8, o:1 }, { col:'R', shot:'summon', o:2 }, { col:'L', box:9, o:3 }, { col:'R', shot:'tower', o:4 }],
  5:[{ col:'L', box:10, o:1 }, { col:'R', shot:'seized', o:2 }],
});

const callouts = key => !key ? '' : Object.entries(CALLOUTS[key]).map(([n, [x, y]]) => `<i class="gp-callout" style="left:${(x / SHOT.w * 100).toFixed(2)}%;top:${(y / SHOT.h * 100).toFixed(2)}%">${n}</i>`).join('');
const shotHtml = (id, order) => { const p = SHOTS[id];
  return `<figure class="gp-shot" data-gp-shot="${id}" style="order:${order}"><div class="gp-shot-frame"><img src="${esc(p.src)}" alt="" loading="lazy" onerror="this.closest('.gp-shot').remove()">${callouts(p.callouts)}</div></figure>`; };

/** One box as a card. A locked page shows every box as "??? · not yet met". */
function boxHtml(id, lang, ctx, locked, order) {
  if (locked) return `<section class="gp-box is-locked" data-gp-box="${id}" style="order:${order}"><h4>${esc(GUIDE_LOCK_TEXT.head[lang] || GUIDE_LOCK_TEXT.head.th)}</h4><p>${esc(GUIDE_LOCK_TEXT.note[lang] || GUIDE_LOCK_TEXT.note.th)}</p></section>`;
  const b = BOXES[id];
  return `<section class="gp-box" data-gp-box="${id}" style="order:${order}"><h4>${esc(b.title[lang] || b.title.th)}</h4><div class="gp-text">${b.body(lang, ctx)}</div></section>`;
}

/** The whole page. A locked page is its boxes only, each "??? · not yet met" - no title, no text, no picture of what is coming. */
export function guidePageHtml(page, lang, ctx) {
  const lockKey = GUIDE_LOCKED_PAGES[page], locked = !!lockKey && !ctx.unlocked?.[lockKey];
  const items = GUIDE_LAYOUT[page] || [];
  const col = c => items.filter(i => i.col === c && (!locked || i.box)).map(i => i.box ? boxHtml(i.box, lang, ctx, locked, i.o) : shotHtml(i.shot, i.o)).join('');
  return `<div class="gp-page${locked ? ' is-locked' : ''}" data-gp-page="${page}"><div class="gp-left">${col('L')}</div><div class="gp-right">${col('R')}</div></div>`;
}
export const guidePageLocked = (page, ctx) => { const k = GUIDE_LOCKED_PAGES[page]; return !!k && !ctx.unlocked?.[k]; };

const NAV_LABEL = Object.freeze({ prev:{ th:'หน้าก่อน', en:'Previous page' }, next:{ th:'หน้าถัดไป', en:'Next page' }, page:{ th:'หน้า', en:'Page' }, title:{ th:'วิธีสอบสวนและตัดสินคดี', en:'How to question and judge' } });

/** The pager + the current page. `root` receives the markup and the click handlers; `ctx` = { lang, t, art(key), stationImg(k), unlocked:{lamp, seized}, startPage }. Returns { show(page) }. */
export function mountGuidePages(root, ctx) {
  const lang = ctx.lang === 'en' ? 'en' : 'th';
  let page = Math.max(1, Math.min(GUIDE_PAGE_COUNT, ctx.startPage || 1));
  const nav = k => NAV_LABEL[k][lang];
  const draw = () => {
    const dots = Array.from({ length:GUIDE_PAGE_COUNT }, (_, i) => { const n = i + 1, lk = guidePageLocked(n, ctx);
      return `<button type="button" class="gp-dot${n === page ? ' is-on' : ''}${lk ? ' is-locked' : ''}" data-gp-go="${n}" aria-label="${esc(nav('page'))} ${n}${lk ? ' 🔒' : ''}" aria-current="${n === page}">${lk ? '🔒' : n}</button>`; }).join('');
    root.innerHTML = `<section class="guide-pages" data-guide-pages><header class="gp-head"><h3>${esc(nav('title'))}</h3>`
      + `<nav class="gp-nav" aria-label="${esc(nav('title'))}"><button type="button" data-gp-prev aria-label="${esc(nav('prev'))}" ${page <= 1 ? 'disabled' : ''}>‹</button>${dots}<button type="button" data-gp-next aria-label="${esc(nav('next'))}" ${page >= GUIDE_PAGE_COUNT ? 'disabled' : ''}>›</button></nav></header>`
      + `${guidePageHtml(page, lang, ctx)}</section>`;
    root.querySelector('[data-gp-prev]').onclick = () => show(page - 1);
    root.querySelector('[data-gp-next]').onclick = () => show(page + 1);
    root.querySelectorAll('[data-gp-go]').forEach(b => { b.onclick = () => show(Number(b.dataset.gpGo)); });
  };
  const show = n => { page = Math.max(1, Math.min(GUIDE_PAGE_COUNT, n)); draw(); };
  draw();
  return { show, page:() => page };
}
