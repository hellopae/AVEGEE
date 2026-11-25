// T5'/1 · Case 13 - Lady Wanthong -> Khun Phaen (the fight) -> Kuman Thong (the helper in the lamp).
// Text: Rae R2 part A section 4 (Output/Rae/2026-11-19-avegee-r2a-zone1-2.md, checked by Reese). Every Thai line below is Rae's line, copied as written; the notice windows carry her English too
// (the cutscene pages are Thai-only like every other cutscene of the game). Keys are Rae's section 13: `wanthong` (the case), `z1-khunphaen-open-<path>` / `z1-khunphaen-win-<path>` (the scenes,
// <path> = `punish` or `free` - the two versions of her table), `khunPhaen` (the fight event), `khunphaen` (the boss moves).
// Pictures are Codex slots under img/z1-events/ (see ART): until they are drawn a labelled placeholder with the right pixel size stands in (scripts/build-t5-placeholders.py) - a real drawing
// saved under the same name replaces it, no code change.
export const WANTHONG = Object.freeze({ caseKey:'wanthong', eventKey:'khunPhaen', arriveNotice:'z1-wanthong-arrive' });
export const WANTHONG_PATHS = Object.freeze(['punish', 'free']);

export const ART = Object.freeze({
  sprite:'img/z1-events/soul-wanthong-th.webp', portrait:'img/z1-events/soul-wanthong-th-profile.webp',
  khunSprite:'img/z1-events/boss-khunphaen-th.webp', khunPortrait:'img/z1-events/boss-khunphaen-th-profile.webp',
  arrives:'img/z1-events/cut-khunphaen-arrives-th.webp',   // C3 - Khun Phaen climbs onto the open-air judgment dais, the mist-grey horse at the foot of the stairs
  yields:'img/z1-events/cut-khunphaen-yields-th.webp',     // C4 - Khun Phaen on one knee, Wanthong between him and Yama
  gift:'img/z1-events/cut-khunphaen-gift-th.webp',         // C5 - the bow, the boy with the topknot (never a baby)
});

// ---- 4.3 the case (cases.js schema; `kind:'twist'` = one false merit + one `deny` the player can catch; the sin is light-to-middle, never a heavy sentence) ----
export const WANTHONG_CASE = Object.freeze({
  k:'wanthong', zone:'th', sex:'f', sp:'soul-wanthong-th', kind:'twist', calm:true, story:true,
  name:'นางวันทอง', who:'หญิงในเรื่องเล่าเก่า ผู้ถูกกล่าวหาว่ามีใจให้ชายสองคน',
  face:'ผิดกาม : มีสามี 2 คน สุดท้ายเลือกไม่ได้จนทำให้ถูกประหาร',
  seen:[
    { t:'ใจเอนเอียงไปทั้งสองฝ่าย ไม่เลือกให้ชัดว่าจะอยู่กับใคร', s:'kam', w:2 },
    { t:'การแย่งชิงตัวนางก่อให้เกิดความบาดหมางและเดือดร้อนหลายครั้ง', s:'bian', w:3 },
  ],
  hidden:[
    { t:'ถูกบังคับให้ไปอยู่เรือนขุนช้างหลังมีข่าวว่าขุนแผนตายในศึก โดยไม่มีโอกาสเลือกด้วยตนเอง', s:'bian', w:-2 },
    { t:'ภายหลังเมื่อมีโอกาสเลือกจริง นางก็ไม่เลือกใคร เพราะเสียดายความสุขสบายในเรือนหลังนั้นอยู่ส่วนหนึ่งด้วย', s:'kam', w:2 },
  ],
  merits:[
    { t:'เสียสละ เพื่อลูกชายทุกอย่าง ทั้งๆที่เจอเหตุร้ายและพลัดพรากหลายครั้ง', v:2, fake:false },
    { t:'ซื่อสัตย์ต่อสามีทั้งสองตลอดมา', v:1, fake:true },
  ],
  line:'"หม่อมฉันรู้ว่าหม่อมฉันผิดเจ้าค่ะ จะให้ผิดมากหรือน้อย หม่อมฉันขอฟังจากท่าน"',
  claims:[
    { kind:'deny', t:'หม่อมฉันไม่เคยมีใจให้ใครนอกจากพี่ขุนแผนเลยเจ้าค่ะ',
      reveal:'นางนิ่งไปนาน แล้วพูดเบา ๆ ว่า "...หม่อมฉันเสียดายเรือนหลังนั้นอยู่บ้างเจ้าค่ะ ท่านถามตรง ๆ หม่อมฉันก็ไม่กล้าโกหก"' },
    { kind:'boast', t:'ท่านดูบุญของหม่อมฉันด้วยเจ้าค่ะ หม่อมฉันซื่อสัตย์ต่อสามีทั้งสองตลอดมา',
      merit:'ซื่อสัตย์ต่อสามีทั้งสองตลอดมา',
      reveal:'ท่านถามว่าซื่อสัตย์ต่อใครในวันไหน นางนิ่งไป — นางเก็บสิ่งของจากทั้งสองฝ่ายไว้ในหีบใบเดียวกัน ไม่เคยคืนให้ใคร และไม่เคยบอกใครว่ายังเก็บอยู่' },
    { kind:'solid', t:'เรื่องที่ผู้คนเดือดร้อนเพราะการแย่งชิงหม่อมฉัน หม่อมฉันรับเจ้าค่ะ ไม่ว่าหม่อมฉันตั้งใจหรือไม่' },
    { kind:'solid', t:'หม่อมฉันไม่ขอให้ท่านเมตตาเพราะหม่อมฉันเป็นหญิง หรือเพราะผู้คนเล่าเรื่องหม่อมฉันด้วยความสงสาร ขอเพียงให้ท่านเขียนความจริงลงหมาย' },
  ],
  secret:'ส่องกระจกแล้ว ไม่พบความอาฆาตในใจนางเลย พบเพียงความรู้สึกผิดที่ไม่เคยพูด และความรักต่อลูกที่ยังไม่จาง',
  reward:'นางวันทองก้มศีรษะรับหมายด้วยสองมือ แล้วเดินตามผู้คุมไปโดยไม่หันกลับ',
  fail:'ยมบาทน้อยยังมองหมายบนโต๊ะ ปลายปากกาค้างเหนือกระดาษโดยไม่ลง',
});

// ---- 4.2 the windows (NW-1 the case arrives · NW-2 the fight alert · NW-3 banner · NW-4 win · NW-5 lose) ----
export const WANTHONG_TEXT = Object.freeze({
  arrive:{ title:'วิญญาณจากเรื่องเล่าเก่า', text:'วิญญาณนางวันทองมาถึงคิวพิจารณา ตามบัญชีระบุข้อหาใจสองใจ ผู้คนในสำนวนเก่าต่างมีส่วนในเรื่องนี้ โปรดไต่สวนด้วยความละเอียด', button:'เริ่มไต่สวน',
    en:{ title:'A Soul from an Old Tale', text:'The soul of Lady Wanthong has reached the queue. The ledger names the charge as a divided heart. Many people in the old record had a hand in this. Please hear her carefully.', button:'Begin the hearing' } },
  title:{ th:'ขุนแผนบุกเข้ามา', en:'Khun Phaen Bursts In' },
  alert:{ th:'ขุนแผนนักรบเก่ามาขวางไม่ให้ลงโทษนางวันทอง เขาไม่ใช่ศัตรู แต่จะไม่ยอมถอยจนกว่าจะเห็นฝีมือท่าน', en:'The old warrior Khun Phaen has come to stop Wanthong\'s sentence. He is no enemy, but he will not yield until he has seen your mettle.' },
  go:{ th:'รับมือ', en:'Face him' }, retry:{ th:'สู้อีกครั้ง', en:'Try again' },
  banner:{ th:'ศึกปกป้องนางวันทอง · ขุนแผน', en:'Defending Wanthong · Khun Phaen' },
  win:{ title:'ขุนแผนวางดาบ', text:'ขุนแผนยอมรับ นางวันทองขอรับคำตัดสินด้วยตัวเอง', button:'ต่อ',
    en:{ title:'Khun Phaen Lays Down His Sword', text:'Khun Phaen yields. Wanthong asks to accept the verdict herself.', button:'Continue' } },
  lose:{ title:'ขุนแผนรอท่านอยู่', text:'ขุนแผนหยุดดาบไว้ก่อน ท่านตั้งหลักแล้วลองอีกครั้งได้', button:'สู้อีกครั้ง',
    en:{ title:'Khun Phaen Waits', text:'Khun Phaen stays his blade for now. Steady yourself and try again.', button:'Try again' } },
  // 4.5 lines in the fight
  lines:{ start:'ขุนแผน: "ดาบฟ้าฟื้นของข้าไม่เคยหักเพราะใคร ตั้งหลักให้ดี"', half:'ขุนแผน: "ฝีมือดี ท่านไม่ใช่ผู้ถือบัญชีที่รู้แต่เขียน!"' },
  linesEn:{ start:'The Fa Fuen blade has never broken for anyone. Steady yourself.', half:'Good steel in you. You are no scribe who only writes!' },
});

// ---- 4.4 the opening scene: two versions (the verdict the player gave) with three variables ----
const OPEN = Object.freeze({
  punish:{
    lead:'บรรยาย: ตราหมายกดลงบนกระดาษ ผู้คุมยังไม่ทันก้าวเข้ามา เสียงฝีเท้าหนัก ๆ ก็ก้องขึ้นมาจากบันไดหน้าแท่นตัดสิน',
    yamaLine:'ยมบาทน้อย: "ท่านขุนแผน ผมออกหมายตามระดับที่บัญชีและคำให้การรองรับครับ ผมไม่ได้ตัดสินเพราะเกลียดนางวันทอง"' },
  free:{
    lead:'บรรยาย: ยมบาทน้อยเพิ่งวางปากกา เสียงฝีเท้าหนัก ๆ ก็ก้องขึ้นมาจากบันไดหน้าแท่นตัดสิน',
    yamaLine:'ยมบาทน้อย: "ท่านขุนแผน ผมไม่ได้ลงโทษนางครับ ท่านไม่ต้องห่วง"' },
});
const openStory = path => ({ title:'นักรบผู้มาขวาง', pages:[
  { image:ART.arrives, fallback:'📜', title:'ข้าชื่อขุนแผน', line:
    OPEN[path].lead + '\n'
    + 'บรรยาย: ชายร่างกำยำในผ้าโพกศีรษะลายยันต์เก่า ผ้านุ่งโจงสีเข้ม ผ้าประเจียดสีเหลืองซีดพันต้นแขน ก้าวขึ้นมายืนบนแท่นตัดสินท่ามกลางหมอก ดาบฟ้าฟื้นเก่าคร่ำประดับอยู่ข้างเอว ที่ตีนบันได ม้าสีหมอกตัวหนึ่งยืนนิ่งอยู่ในหมอกบาง ๆ\n'
    + 'ขุนแผน: "ข้าชื่อ ขุนแผน ข้าเคยเสียนางไปครั้งนึงแล้ว ข้าจะไม่ยอมเสียนางไปอีกแน่นอน ใครจะพานางไปต้องผ่านข้าไปก่อน"' },
  { image:ART.arrives, fallback:'📜', title:'ข้าไม่ได้มาเพื่อฆ่า', line:
    OPEN[path].yamaLine + '\n'
    + 'ขุนแผน: "ข้ารู้ว่าท่านไม่ได้เกลียด ข้าเคยตัดสินคนด้วยดาบมามากพอที่จะดูออก แต่นางไม่ได้ผิดคนเดียว ข้ามีส่วน ข้าไม่ยอมให้นางรับคนเดียว"\n'
    + 'ขุนแผน: "ข้าไม่ได้มาเพื่อฆ่าท่าน ข้าแค่อยากรู้ว่าท่านปกป้องความถูกต้องได้ถึงที่สุดหรือไม่ จงตั้งหลัก!"\n'
    + 'บรรยาย: ขุนแผนชักดาบออกจากฝักครึ่งเล่ม ประกายเหล็กสะท้อนเข้าตาวิญญาณนางวันทองที่ยืนอยู่ข้างแท่น นางไม่ขยับ' },
] });

// ---- 4.6 the win scene (3 pages; `{farewellLine}` follows the path) ----
const FAREWELL = Object.freeze({
  punish:'บรรยาย: ผู้คุมเดินเข้ามาเงียบ ๆ นางวันทองก้มศีรษะให้ขุนแผนอีกครั้งแล้วเดินตามผู้คุมไปยังสถานีที่ยมบาทน้อยกำหนดไว้ ขุนแผนมองตามจนลับตา',
  free:'นางวันทอง: "หม่อมฉันขอเรียนท่านยมบาทน้อยเจ้าค่ะ ท่านปล่อยหม่อมฉันด้วยความเมตตา แต่หม่อมฉันมีบาป ขอให้ท่านบันทึกโทษเบาที่สุดไว้ในแฟ้มเถิด"\n'
    + 'ยมบาทน้อย: "ผมบันทึกตามที่นางขอครับ"\n'
    + 'บรรยาย: นางวันทองก้มศีรษะให้ขุนแผน แล้วเดินไปรอที่ประตูสวรรค์ ขุนแผนมองตามจนลับตา',
});
const winStory = path => ({ title:'ใจของผู้ที่ต้องรับ', pages:[
  { image:ART.yields, fallback:'📜', title:'พอเถิดเจ้าค่ะ', line:
    'บรรยาย: ขุนแผนเข่าข้างหนึ่งทรุดลง ปลายดาบฟ้าฟื้นปักพื้น เขาพยายามพยุงตัวขึ้นอีกครั้ง นางวันทองก้าวออกมายืนคั่นกลางระหว่างเขากับยมบาทน้อย ยกมือขึ้นเสมออก\n'
    + 'ขุนแผน: "ข้ายังยืนได้ ข้ายังไม่แพ้"\n'
    + 'นางวันทอง: "พอเถิดเจ้าค่ะ พี่ขุนแผน หม่อมฉันขอรับคำตัดสินของท่านด้วยตัวเอง ใจหม่อมฉันเอนไปสองทางจริง จะให้พี่ต้องรบแทนหม่อมฉันอีกไม่ได้ บาปที่หม่อมฉันทำไว้ หม่อมฉันขอรับเอง"' },
  { image:ART.yields, fallback:'📜', title:'ไว้พบกันชาติหน้า', line:
    'บรรยาย: ขุนแผนนิ่งอยู่นาน แล้วค่อย ๆ ปล่อยด้ามดาบ นิ้วที่เคยกำจนซีดคลายออกทีละนิ้ว\n'
    + 'ขุนแผน: "ข้าเข้าใจแล้ว ครั้งก่อนข้าพานางหนีด้วยมือข้าเอง ครั้งนี้นางไม่ได้ขอให้ข้าพา นางขอให้ข้ายืนดู นั่นยากกว่ารบเสียอีก"\n'
    + 'ขุนแผน: "ลาก่อนวันทอง ไว้เราพบกันใหม่ชาติหน้า ชาตินั้นข้าจะถามนางก่อนที่จะชักดาบ"\n'
    + 'นางวันทอง: "เจ้าค่ะ ขอให้ชาติหน้า เราไม่ต้องรบกันเพราะหม่อมฉันอีก"\n'
    + FAREWELL[path] },
  { image:ART.gift, fallback:'📜', title:'คำขอโทษของนักรบ', line:
    'บรรยาย: ขุนแผนหันมาหายามา วางมือขวาทาบอก ก้มศีรษะให้ยามา\n'
    + 'ขุนแผน: "ท่านยมบาทน้อย ข้ายกดาบใส่ผู้ที่ทำหน้าที่ถูกต้อง ข้าผิดเอง ข้าขออภัย คำพูดอย่างเดียวไม่พอ กุมารทองอยู่ข้างกายข้ามานาน เขาอยากมาช่วยท่าน ข้าจึงขอแนะนำให้ท่านรู้จักเขา"\n'
    + 'บรรยาย: ละอองแสงสีทองสายหนึ่งลอยออกมาจากชายผ้าของขุนแผน เล็ก ๆ ลอยเรี่ยพื้น แล้วรวมกันเป็นเด็กชายผมจุกวัยราวเจ็ดแปดขวบ กายเรืองแสงทองจาง ๆ ยืนเงยหน้ามองยามา\n'
    + 'กุมารทอง: "ยามา ข้าชื่อกุมารทอง ข้าอยากไปช่วยเจ้าเอง ข้าจะคอยกางแสงทองปกป้องพวกเจ้า"\n'
    + 'ยมบาทน้อย: "ขอบคุณครับ กุมารทอง เราจะคอยดูแลกันนะ"\n'
    + 'บรรยาย: ประกายทองดวงเล็กลอยเข้าไปในตะเกียงวิเศษที่ห้อยข้างเอวยามา ไส้ตะเกียงสว่างขึ้นอีกดวง' },
] });

export const WANTHONG_STORIES = Object.freeze({
  ...Object.fromEntries(WANTHONG_PATHS.map(p => [`z1-khunphaen-open-${p}`, openStory(p)])),
  ...Object.fromEntries(WANTHONG_PATHS.map(p => [`z1-khunphaen-win-${p}`, winStory(p)])),
  // 4.6 last note: the lost fight needs only NW-5, or this one line
  'z1-khunphaen-lose':{ title:'ขุนแผนรอท่านอยู่', pages:[
    { image:ART.yields, fallback:'📜', title:'ขุนแผนรอท่านอยู่', line:'ขุนแผน: "ลุกเถอะ ข้าไม่ฟันผู้ที่ล้ม ตั้งหลักแล้วมาใหม่"' },
  ] },
});
export const WANTHONG_STORY_KEYS = Object.freeze(Object.keys(WANTHONG_STORIES));

export const WANTHONG_NOTICES = Object.freeze({
  [WANTHONG.arriveNotice]:{ ...WANTHONG_TEXT.arrive, art:ART.portrait },
});

/** 4.7 the helper Kuman Thong - the text rows (Thai + English) for lamp.js */
export const KUMAN_THONG = Object.freeze({
  name:{ th:'กุมารทอง', en:'Kuman Thong' },
  move:{ name:{ th:'แสงทองคุ้มกาย', en:'Golden Aegis' },
    desc:{ th:'กุมารทองกางแสงทองเป็นม่านคุ้มกันทั้งทีม และพยุงผู้ที่ล้มให้ลุกขึ้นได้', en:'Kuman Thong spreads a curtain of golden light over the team and helps the fallen back to their feet.' } },
  say:{ call:{ th:'กุมารทอง: "ยามา ข้ามาแล้ว ไม่ต้องกลัว"', en:'Kuman Thong: "Yama, I’m here. Don’t be afraid."' },
    use:{ th:'กุมารทอง: "ข้าจะไม่ให้ใครแตะต้องพวกท่าน!"', en:'Kuman Thong: "I will not let anyone touch you!"' },
    end:{ th:'กุมารทอง: "ไฟข้าเหลือน้อยแล้ว แต่ข้าไม่เหนื่อยหรอก"', en:'Kuman Thong: "My flame is low, but I am not tired."' } },
  /** two lines the helper may say when tapped in the bag (4.8, offered by Rae - optional) */
  chat:[
    { th:'ท่านขุนแผนบอกให้ข้าเตือนว่าท่านต้องกินข้าวตรงเวลา', en:'Lord Khun Phaen told me to remind you to eat on time.' },
    { th:'ข้าไม่ได้เศร้านะ ท่านขุนแผนบอกว่าชาติหน้าเขาจะถามก่อน', en:'I am not sad. Lord Khun Phaen said that next life he will ask first.' },
  ],
});
