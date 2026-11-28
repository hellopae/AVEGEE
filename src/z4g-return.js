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
  guard:Object.freeze({ west:A('cut-z3-gate-cerberus-vanhelsing-return'), asia:A('cut-z2-gate-guanyu-return'), th:A('cut-z1-gate-kumphan-return') }),
  guardFreed:Object.freeze({ west:A('cut-z3-gate-lucifer-eye-release'), asia:A('cut-z2-gate-guanyu-release'), th:A('cut-z1-gate-kumphan-release') }),
  restored:Object.freeze({ west:SIG('story-signal-west-02'), asia:SIG('story-signal-asia-02'), th:SIG('story-signal-th-02') }),   // K4: "cut - the existing SIG picture can be used" (Rae)
  pass:A('cut-col-lucifer-safe-return'),
});
/** `cyber-signal-win`: page 1 of the existing scene as it is; page 2 is Rae's replacement (the ships cannot sail - Nira: "we must walk back through the frontiers, zone by zone") */
const sigOpen = SIGNAL_STORIES['cyber-signal-open'];
const [signalBeep, trojanSignal, signalReadout] = sigOpen.pages;
const SIGNAL_OPEN = { ...sigOpen, pages:[signalBeep, {
  ...trojanSignal, image:A('cut-frontier34-trojan9-return'), imageFallback:trojanSignal.image,
  line:trojanSignal.line.replace('แสงเขียวมิ้นต์', 'แสงม่วง'),
  en:{ ...trojanSignal.en, line:trojanSignal.en.line.replace('a mint-green light', 'a violet light') },
}, signalReadout] };
const sigWin = SIGNAL_STORIES['cyber-signal-win'];
const p2 = RAW_Z4G_SIGNAL_WIN_PAGE2;
const SIGNAL_WIN = { ...sigWin, pages:[sigWin.pages[0], { image:sigWin.pages[1].image, title:p2.title.th, line:p2.line.th, en:{ title:p2.title.en, line:p2.line.en } }] };
const L2 = (th, en) => ({ th, en });
const GUARD_RELEASE = {
  // FB3-L3 (owner 26 Nov): the freed Guard now goes WITH Yama and Nira to the lord and the controlled reapers (he used to stay at the gate). Wording: Rae R2 (ญ-2).
  west:L2('แวน เฮลซิง: "เสียงในหัวข้าเงียบแล้ว ขอบคุณ ยมทูตทั้งห้ากับหัวหน้าด่านยังอยู่ใต้คำสั่งนั้น ข้าจะไปกับท่านและช่วยปลดพวกเขาเอง"', 'Van Helsing: "The voice in my head is silent. Thank you. The five reapers and the frontier boss are still under that order. I will go with you and help free them."'),
  asia:L2('กวนอู: "เสียงนั้นเงียบแล้ว ข้าติดค้างท่านหนึ่งชีวิต ยมทูตกับหัวหน้าด่านยังถูกสะกดอยู่ ข้าจะไปกับท่าน"', 'Guan Yu: "That voice is silent. I owe you a life. The reapers and the frontier boss are still under the spell. I am going with you."'),
  th:L2('กุมภัณฑ์: "ข้าได้ถือกระบองด้วยใจข้าเองอีกครั้งแล้ว ขอบคุณท่านนิรา ยมทูตกับหัวหน้าด่านยังถูกสะกดอยู่ ข้าจะไปกับท่าน ช่วยปลดพวกเขาเอง"', 'Kumphan: "I hold my club by my own will again. Thank you, Nira. The reapers and the frontier boss are still under the spell. I am going with you to free them."'),
};
const guardAtGate = (zone, name) => zone === 'west' ? L2('เซอร์เบอรัสกับแวน เฮลซิง','Cerberus and Van Helsing') : name;
const guardFreedStory = (zone, name) => {
  const targets = guardAtGate(zone, name);
  const title = L2(`ปลดสะกด · ${targets.th}`, `The Spell Breaks · ${targets.en}`);
  const line = L2(`บรรยาย: ยามาชูสร้อย Lucifer’s Eye ให้นิราประคองแสงสีทอง มนต์ที่คุม${targets.th}จึงจางหาย\nนิรา: “ปลดแล้วค่ะ”\n${name.th}: "ข้ากลับมาเป็นตัวเองแล้ว ขอบคุณ"`,
    `Narration: Yama raises Lucifer’s Eye and Nira guides its golden light. The spell on ${targets.en} fades.\nNira: “It is broken.”\n${name.en}: “I am myself again. Thank you.”`);
  const story = fromRae({title,pages:[{title,line}]},Z4G_ART.guardFreed[zone]);
  story.pages[0].imageFallback = Z4G_ART.guard[zone];
  return story;
};
const guardStory = (zone, name) => {
  const targets = guardAtGate(zone, name);
  const title = L2(`ผู้เฝ้าด่าน · ${targets.th}`, `At the Gate · ${targets.en}`);
  const line = L2(`บรรยาย: ${targets.th}ขวางประตูไว้ ดวงตาเรืองแสงม่วง\nนิรา: “ท่านคะ ต้องหยุดผู้เฝ้าด่านก่อน แล้วเราจะใช้สร้อยปลดสะกดค่ะ”`,
    `Narration: ${targets.en} ${zone === 'west' ? 'block' : 'blocks'} the gate, eyes glowing violet.\nNira: “Sir, we must stop the gate defenders before we can break the spell with the pendant.”`);
  return fromRae({title,pages:[{title,line}]},Z4G_ART.guard[zone]);
};
const waterCaveTitle = L2('ถ้ำสายน้ำ · ริวจินกับมูซาชิ','Water Cave · Ryujin and Musashi');
const waterCaveOpen = fromRae({title:waterCaveTitle,pages:[{title:waterCaveTitle,line:L2(
  'บรรยาย: ดาบของมูซาชิกระทบเกล็ดริวจินกลางถ้ำสายน้ำ ดวงตาของทั้งคู่เรืองแสงม่วง\nนิรา: “ทั้งคู่ถูกสะกดค่ะ ถ้าปล่อยไว้ พวกเขาจะทำร้ายกันจนหยุดเองไม่ได้”\nยามา: “ผมจะหยุดทั้งสองคน คุณนิราช่วยประคองแสงจากสร้อยให้ด้วยนะครับ”',
  'Narration: Musashi’s blade strikes Ryujin’s scales in the water cave. Both their eyes glow violet.\nNira: “They are both under the spell. They will keep hurting each other until we intervene.”\nYama: “I’ll stop them both. Nira, help me guide the light from the pendant.”',
)}]}, A('cut-frontier23-ryujin-musashi-return'));
const waterCaveFreedTitle = L2('มนต์สะกดคลายลง','The Spell Breaks');
const waterCaveFreed = fromRae({title:waterCaveTitle,pages:[{title:waterCaveFreedTitle,line:L2(
  'บรรยาย: ยามาชู Lucifer’s Eye นิราประคองแสงเหนือสายน้ำ ริวจินลดศีรษะลง มูซาชิเก็บดาบเข้าฝัก\nมูซาชิ: “ข้าจำเสียงท่านได้แล้ว ท่านยามา”\nริวจิน: “หากท่านต้องการเรา เรียกเราจากตะเกียงได้อีกครั้ง”',
  'Narration: Yama raises Lucifer’s Eye and Nira guides its light across the water. Ryujin lowers his head and Musashi sheathes his swords.\nMusashi: “I remember your voice now, Lord Yama.”\nRyujin: “Should you need us, you may call us from the lamp again.”',
)}]}, A('cut-frontier23-lucifer-eye-release'));
const fatherCaveTitle = L2('ถ้ำชายแดน · บิดาทัณฑสูร','The Frontier Cave · Tanthasura’s Father');
const fatherCave = fromRae({title:fatherCaveTitle,pages:[
  {title:fatherCaveTitle,line:L2(
    'บรรยาย: ยามากับนิราพบบิดาทัณฑสูรนอนบาดเจ็บอยู่ในถ้ำ ลูกน้องของเขาหลายคนนอนสลบอยู่ใกล้ ๆ\nบิดาทัณฑสูร: “ตอนข้าล้มลง เสียงที่สั่งอยู่ในหัวก็เงียบไป ช่วยดูคนของข้าด้วย”',
    'Narration: Yama and Nira find Tanthasura’s father injured in the cave, with several of his followers unconscious nearby.\nTanthasura’s father: “When I fell, the voice in my head went quiet. Please tend to my people.”',
  )},
  {title:L2('เพื่อนเก่าที่มาเปิดกรง','The Old Friend Who Opened the Cage'),line:L2(
    'บิดาทัณฑสูร: “หลังลูกข้าแพ้ท่าน ข้าขังเขาไว้ลงโทษ ยมทัตมาช่วยเขาออกจากกรง ทั้งสองสู้กับข้าและคนของข้าจนชนะ”\nยามา: “พี่รู้จักทัณฑสูรมาตั้งแต่เด็ก ถึงได้บอกว่าจะจัดการเอง”\nบิดาทัณฑสูร: “ใช่ พอวางอาวุธ เราก็คุยกันจนเข้าใจ”',
    'Tanthasura’s father: “After my son lost to you, I locked him up as punishment. Yomathat opened his cage. Together they defeated me and my followers.”\nYama: “My brother has known him since childhood. That’s why he said he’d handle it himself.”\nTanthasura’s father: “Yes. We laid down our weapons and talked until we understood each other.”',
  )},
  {title:L2('ทางไปสุวรรณภูมิ','The Road to Suvarnabhumi'),line:L2(
    'บิดาทัณฑสูร: “แล้วเสียงนั้นก็สั่งให้พวกเราฆ่ากันเอง ยมทัตกับลูกข้าโจมตีพวกเราจนล้ม ตอนนี้ทั้งคู่มุ่งเข้าเมืองสุวรรณภูมิไปแล้ว”\nนิรา: “ดิฉันจะช่วยห้ามเลือดให้ค่ะ แล้วเราจะตามไปหยุดทั้งสองคน”',
    'Tanthasura’s father: “Then the voice ordered us to kill one another. Yomathat and my son struck us down. They’ve gone into Suvarnabhumi.”\nNira: “I’ll stop the bleeding. Then we’ll go after them.”',
  )},
]}, A('cut-frontier12-father-return-th-v2'));
fatherCave.pages[1].image = A('cut-frontier12-yomathat-rescues-tanthasura');
const westPairTitle = L2('วาลดริกกับยอร์มุนกันดร์','Valdric and Jörmungandr');
const westPairOpen = fromRae({title:westPairTitle,pages:[{title:westPairTitle,line:L2(
  'นิรา: “ยมทูตทั้งห้าถูกสะกด วาลดริกกับยอร์มุนกันดร์ก็ด้วยค่ะ”\nยามา: “เราจะช่วยยมทูตก่อน จากนั้นค่อยใช้สร้อยปลดสะกดทั้งคู่ครับ”',
  'Nira: “All five reapers are under the spell, and so are Valdric and Jörmungandr.”\nYama: “We’ll free the reapers first, then use the pendant to free them both.”',
)}]}, A('cut-west-valdric-jormungandr-return'));
westPairOpen.pages.push(SIGNAL_STORIES['signal-west-open'].pages[1]);
const westPairWin = fromRae({title:westPairTitle,pages:[{title:westPairTitle,line:L2(
  'บรรยาย: ยามากับนิราใช้สร้อยปลดสะกดวาลดริกและยอร์มุนกันดร์\nวาลดริก: “ข้าได้ยินเสียงนับสาม แล้วมันก็หยุด ราวกับมีคนรอสี่อยู่”\nยอร์มุนกันดร์: “หากท่านต้องการข้า จงเรียกข้าจากตะเกียงอีกครั้ง”',
  'Narration: Yama and Nira use the pendant to free Valdric and Jörmungandr.\nValdric: “I heard a voice count to three, then stop, as though someone was waiting for four.”\nJörmungandr: “If you need me, call me from the lamp again.”',
)}]}, A('cut-west-lucifer-eye-release'));
const repairTitle = L2('ทัณฑ์ซ่อมศาลาปัจฉิม','Taan Repairs the Western Hall');
const westRepair = fromRae({title:repairTitle,pages:[{title:repairTitle,line:L2(
  'บรรยาย: ทัณฑ์กับชาวเมืองเก็บคานที่ไหม้ออก แล้วยกไม้ใหม่ขึ้นซ่อมศาลา ปัจฉิมเริ่มกลับมาคึกคักอีกครั้ง',
  'Narration: Taan and the townspeople clear away the burned beams and raise new timber to rebuild the hall. The Western city begins to come alive again.',
)}]}, A('cut-west-taan-repair-return'));
westPairWin.pages.push(...westRepair.pages);
const eastPairTitle = L2('เหลียนกังกับอากุระ','Lian Gang and Akura');
const eastPairOpen = fromRae({title:eastPairTitle,pages:[{title:eastPairTitle,line:L2(
  'นิรา: “โคมในเมืองดับหมดแล้วค่ะ ยมทูตทั้งห้า เหลียนกัง และอากุระกำลังขวางทางเรา”\nยามา: “เราจะช่วยยมทูตก่อน แล้วค่อยใช้สร้อยปลดสะกดเหลียนกังกับอากุระครับ”',
  'Nira: “The city lanterns have all gone out. The five reapers, Lian Gang and Akura are blocking our way.”\nYama: “We’ll help the reapers first, then use the pendant to free Lian Gang and Akura.”',
)}]}, A('cut-asia-liangang-akura-return'));
eastPairOpen.pages.push(SIGNAL_STORIES['signal-asia-open'].pages[1]);
const eastPairWin = fromRae({title:eastPairTitle,pages:[{title:eastPairTitle,line:L2(
  'บรรยาย: ยามาชู Lucifer’s Eye ให้นิราประคองแสง มนต์สะกดคลายลง โซ่ของเหลียนกังกับอากุระตกกระทบพื้น\nอากุระ: “เสียงในหัวข้านับสอง เหมือนนับนักโทษ จำไว้”\nเหลียนกัง: “ไฟของข้าตอบรับตะเกียงแล้ว หากจำเป็นก็เรียกข้าเถิด”',
  'Narration: Yama raises Lucifer’s Eye and Nira guides its light. The spell breaks, and Lian Gang’s and Akura’s chains fall to the ground.\nAkura: “The voice in my head counted to two, as if counting prisoners. Remember that.”\nLian Gang: “My flame answers the lamp again. Call me if you need me.”',
)}]}, A('cut-asia-lucifer-eye-release'));
const eastRepairTitle = L2('ทัณฑ์ซ่อมศาลาบูรพา','Taan Repairs the Eastern Hall');
const eastRepair = fromRae({title:eastRepairTitle,pages:[{title:eastRepairTitle,line:L2(
  'บรรยาย: ทัณฑ์กับชาวเมืองเปลี่ยนคานที่ไหม้ ซ่อมชายคา แล้วแขวนโคมกลับเข้าที่ ศาลาบูรพาเปิดให้ชาวเมืองกลับมาใช้ได้อีกครั้ง',
  'Narration: Taan and the townspeople replace the burned beams, repair the eaves, and hang the lanterns again. The Eastern Hall reopens to the townspeople.',
)}]}, A('cut-asia-taan-repair-return'));
eastPairWin.pages.push(...eastRepair.pages);
const southPairTitle = L2('ยมทัตกับทัณฑสูร','Yomathat and Tanthasura');
const southPairOpen = fromRae({title:southPairTitle,pages:[{title:southPairTitle,line:L2(
  'นิรา: “กุมภัณฑ์ช่วยเราได้แล้วค่ะ แต่ยมทูตในเมือง พี่ยมทัต และทัณฑสูรยังถูกสะกดอยู่”\nยามา: “ช่วยยมทูตก่อนครับ แล้วเราไปหยุดพี่กับทัณฑสูรด้วยกัน”',
  'Nira: “Kumphan can help us now. The city reapers, your brother, and Tanthasura are still under the spell.”\nYama: “Let’s help the reapers first. Then we’ll stop my brother and Tanthasura together.”',
)}]}, A('cut-th-yomathat-tanthasura-return'));
southPairOpen.pages.push(SIGNAL_STORIES['signal-th-open'].pages[1]);
const southPairWin = fromRae({title:southPairTitle,pages:[{title:southPairTitle,line:L2(
  'บรรยาย: แสงจาก Lucifer’s Eye ส่องไปถึงยมทัตกับทัณฑสูร นิราประคองแสงจนทั้งคู่ค่อย ๆ วางอาวุธ\nทัณฑสูร: “เสียงนั้นขาดหายไปแล้ว ก่อนเงียบมันนับหนึ่ง”\nยมทัต: “ข้าได้สติแล้ว ยามา ไฟของข้ากลับมาตอบรับตะเกียงของเจ้า”',
  'Narration: Light from Lucifer’s Eye reaches Yomathat and Tanthasura. Nira guides it until both slowly lower their weapons.\nTanthasura: “The voice is gone. Before it fell silent, it counted to one.”\nYomathat: “I’m myself again, Yama. My flame answers your lamp once more.”',
)}]}, A('cut-th-lucifer-eye-release'));
const southRepairTitle = L2('ทัณฑ์ซ่อมศาลาสุวรรณภูมิ','Taan Repairs the Suvarnabhumi Hall');
const southRepair = fromRae({title:southRepairTitle,pages:[{title:southRepairTitle,line:L2(
  'บรรยาย: ทัณฑ์กับชาวเมืองเปลี่ยนคานที่ไหม้และยกช่อฟ้าขึ้นติดใหม่ เมื่อซ่อมเสร็จ ชาวสุวรรณภูมิก็กลับมาใช้ศาลาได้อีกครั้ง',
  'Narration: Taan and the townspeople replace the burned beams and lift the new roof finial into place. Once the work is done, the people of Suvarnabhumi return to the hall.',
)}]}, A('cut-th-taan-repair-return'));
southPairWin.pages.push(...southRepair.pages);
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
const passTitle = L2('สังเวียนที่ถูกตัดสาย','The Arena With Its Lines Cut');
const passPage = L2('ประตูข้างของสังเวียน', "The Arena’s Side Gate");
const passLine = L2(
  RAW_Z4G_LUCIFER_PASS.th + '\nนิรา: “ข้างในยังปลอดภัยหรือคะ”\nลูซิเฟอร์: “ข้าต้านคำสั่งเอาไว้ นักสู้ทุกคนในสังเวียนปลอดภัย”',
  RAW_Z4G_LUCIFER_PASS.en + '\nNira: “Is it still safe inside?”\nLucifer: “I held the order back. Every fighter in the arena is safe.”',
);
const PASS = fromRae({title:passTitle,pages:[{title:passPage,line:passLine}]},Z4G_ART.pass);
PASS.pages[0].imageFallback = A('cut-col-gate');
export const Z4G_STORIES = Object.freeze({
  'cyber-signal-open':SIGNAL_OPEN,
  'cyber-signal-win':SIGNAL_WIN,
  'signal-west-open':westPairOpen,
  'signal-west-win':westPairWin,
  'signal-asia-open':eastPairOpen,
  'signal-asia-win':eastPairWin,
  'signal-th-open':southPairOpen,
  'signal-th-win':southPairWin,
  [Z4G_KEYS.fatherCaveStory]:fatherCave,
  [Z4G_KEYS.caveOpen]:waterCaveOpen,
  [Z4G_KEYS.caveFreed]:waterCaveFreed,
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
