// T8c (Rae R2 part D, section 7): the way back through the seized world - `cyber-signal-win` page 2 (replaced: the harbours are shut), Lucifer's one line at the side gate of the colosseum (`col-pass`), the fire + controlled reapers of each zone
// (`z3-fire` `z2-fire` `z1-fire`), the freeing of each zone (`z3-restored` `z2-restored` `z1-restored`) and NR-1 (the harbour of that zone is open again).
// The generated Rae text lives in z4g-raw.js. These scenes add the gate encounter and update the Guards' fire-scene dialogue.
import { RAW_Z4G_SIGNAL_WIN_PAGE2, RAW_Z4G_SCENES, RAW_Z4G_LUCIFER_PASS, RAW_Z4G_CONTROLLED_TAP, RAW_Z4G_NR1 } from './z4g-raw.js';
import { SIGNAL_STORIES } from './e1-content.js';
import { fromRae } from './z3d-cases.js';
import { Z4G_KEYS } from './seized-keys.js';
import { RETURN_GUARD_NAMES } from './signal-arc.js';
const A = n => `img/z4-events/${n}.webp`;
const SIG = n => `img/story-sig/${n}.webp`;
export const Z4G_ART = Object.freeze({
  fire:Object.freeze({ west:A('cut-z3-fire'), asia:A('cut-z2-fire'), th:A('cut-z1-fire') }),
  guard:Object.freeze({ west:A('cut-z3-guard-hypnotized-frontier'), asia:A('cut-z2-guard-hypnotized-frontier'), th:A('cut-z1-guard-hypnotized-frontier') }),
  restored:Object.freeze({ west:SIG('story-signal-west-02'), asia:SIG('story-signal-asia-02'), th:SIG('story-signal-th-02') }),   // K4: "cut - the existing SIG picture can be used" (Rae)
  pass:A('cut-col-gate'),
});
/** `cyber-signal-win`: page 1 of the existing scene as it is; page 2 is Rae's replacement (the ships cannot sail - Nira: "we must walk back through the frontiers, zone by zone") */
const sigWin = SIGNAL_STORIES['cyber-signal-win'];
const p2 = RAW_Z4G_SIGNAL_WIN_PAGE2;
const SIGNAL_WIN = { ...sigWin, pages:[sigWin.pages[0], { image:sigWin.pages[1].image, title:p2.title.th, line:p2.line.th, en:{ title:p2.title.en, line:p2.line.en } }] };
const L2 = (th, en) => ({ th, en });
const GUARD_RELEASE = {
  // FB3-L3 (owner 26 Nov): the freed Guard now goes WITH Yama and Nira to the lord and the controlled reapers (he used to stay at the gate). PLACEHOLDER wording from Toby - Rae writes the real lines (R2).
  west:L2('แวน เฮลซิง: "เสียงในหัวข้าเงียบแล้ว ขอบคุณท่าน ทั้งห้าคนยังอยู่ใต้คำสั่ง ข้าจะไปช่วยท่านปลดพวกเขาเอง"', 'Van Helsing: "The voice in my head is gone. Thank you. The five reapers are still under its orders. I will go with you and free them."'),
  asia:L2('กวนอู: "เสียงนั้นหายไปแล้ว ท่านช่วยข้าไว้ พวกเขายังต้องการท่าน ไปเถิด ข้าจะไปด้วย"', 'Guan Yu: "The voice is gone. You freed me. They still need you. Let us go. I am coming with you."'),
  th:L2('กุมภัณฑ์: "ในที่สุดข้าก็วางกระบองลงได้ ขอบคุณท่าน ไปช่วยคนในเมืองกันเถิด ข้าจะไปกับท่านเอง"', 'Kumphan: "At last I can lower my club. Thank you. Let us go and help the people inside. I am coming with you."'),
};
/** FB3-L3 (owner 26 Nov): after the duel Nira frees the Guard from the spell - its own short scene, then he joins the team. PLACEHOLDER wording from Toby - Rae writes the real text (R2). */
const guardFreedStory = (zone, name) => {
  const title = L2(`นิราปลดสะกด · ${name.th}`, `Nira Breaks the Spell · ${name.en}`);
  const line = L2(`บรรยาย: ${name.th}ทรุดเข่าลงกลางประตู แสงเขียวในตายังวูบวาบ นิราก้าวออกมาข้างหน้า ยกแผ่นกระจกขึ้นเหนือไหล่เขา เส้นแสงเขียวที่พาดตาแตกเป็นเสี่ยงแล้วจางหายไป\nนิรา: "ปลดแล้วค่ะ คำสั่งนั้นไม่ใช่ของท่านอีกต่อไป"\n${name.th}: "ข้ากลับมาเป็นตัวข้าแล้ว ข้าจะไปกับท่าน"`,
    `Narration: ${name.en} sinks to one knee in the gateway, the green light in his eyes still flickering. Nira steps forward and raises her mirror over his shoulder. The green line across his eyes shatters and fades.\nNira: "It is broken. That order is no longer yours."\n${name.en}: "I am myself again. I will go with you."`);
  return fromRae({title,pages:[{title,line}]},Z4G_ART.guard[zone]);
};
const guardStory = (zone, name) => {
  const title = L2(`ผู้เฝ้าด่าน · ${name.th}`, `At the Gate · ${name.en}`);
  const line = L2(`บรรยาย: ${name.th}ยืนขวางประตูชายแดน แสงเขียวพาดตา\nนิรา: "ท่านคะ ผู้เฝ้าด่านถูกสะกดค่ะ เราต้องช่วยเขาก่อนเข้าเมือง"\nยามา: "ผมจะหยุดเขา แล้วพาเขากลับมาครับ"`,
    `Narration: ${name.en} blocks the frontier gate, green light across his eyes.\nNira: "Sir, the guard is under a spell. We have to free him before we go inside."\nYama: "I'll stop him and bring him back."`);
  return fromRae({title,pages:[{title,line}]},Z4G_ART.guard[zone]);
};
function returnStory(key,raw) {
  const zone=Object.keys(Z4G_KEYS.fire).find(z=>Z4G_KEYS.fire[z]===key);
  if (!zone) {
    const restoredZone=Object.keys(Z4G_KEYS.restored).find(z=>Z4G_KEYS.restored[z]===key);
    return fromRae(raw,Z4G_ART.restored[restoredZone]);
  }
  const story=fromRae(raw,Z4G_ART.fire[zone]);
  const page=story.pages[0], release=GUARD_RELEASE[zone];
  page.line=page.line.split('\n').slice(0,-1).concat(release.th).join('\n');
  page.en.line=page.en.line.split('\n').slice(0,-1).concat(release.en).join('\n');
  return story;
}
/** the scene + page title of the side gate (Rae checked them, T9: kept as they were) */
const PASS = { title:'สังเวียนที่ถูกตัดสาย', en:{ title:'The Arena With Its Lines Cut' }, pages:[{ image:Z4G_ART.pass, title:'ประตูข้างของสังเวียน', line:RAW_Z4G_LUCIFER_PASS.th, fallback:'📜', en:{ title:'The Arena\'s Side Gate', line:RAW_Z4G_LUCIFER_PASS.en } }] };
export const Z4G_STORIES = Object.freeze({
  'cyber-signal-win':SIGNAL_WIN,
  [Z4G_KEYS.passStory]:PASS,
  ...Object.fromEntries(Object.entries(RETURN_GUARD_NAMES).map(([zone,name])=>[Z4G_KEYS.guardStory[zone],guardStory(zone,name)])),
  ...Object.fromEntries(Object.entries(RETURN_GUARD_NAMES).map(([zone,name])=>[Z4G_KEYS.guardFreed[zone],guardFreedStory(zone,name)])),
  ...Object.fromEntries(Object.entries(RAW_Z4G_SCENES).map(([key,raw])=>[key,returnStory(key,raw)])),
});
/** NR-1 per zone: the title carries the zone's name (Rae's `<ชื่อโซน>` / `<Zone>` placeholder) */
const ZONE_NAME = { west:L2('ปัจฉิม', 'Western'), asia:L2('บูรพา', 'Eastern'), th:L2('สุวรรณภูมิ', 'Suvarnabhumi') };
export const Z4G_NOTICES = Object.freeze(Object.fromEntries(Object.entries(Z4G_KEYS.harbourNotice).map(([zone, key]) => [key, {
  title:RAW_Z4G_NR1.th.title.replace('<ชื่อโซน>', ZONE_NAME[zone].th), text:RAW_Z4G_NR1.th.text, button:RAW_Z4G_NR1.th.button, art:Z4G_ART.restored[zone],
  en:{ title:RAW_Z4G_NR1.en.title.replace('<Zone>', ZONE_NAME[zone].en), text:RAW_Z4G_NR1.en.text, button:RAW_Z4G_NR1.en.button },
}])));
/** what a controlled reaper says when touched (Rae 7.2): `<name>: "Block ... every ... road."` */
export const Z4G_TAP = RAW_Z4G_CONTROLLED_TAP;
