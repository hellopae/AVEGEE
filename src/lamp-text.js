// T4 · Magic Lamp / summon system - every UI string, TH + EN, copied from Rae's R2 part A (Output/Rae/2026-11-19-avegee-r2a-zone1-2.md, sections 2.1-2.6 and 3.4).
// One place: edit a word here and it is the game's word. `lt('key', {n:2})` picks the current language (falls back to Thai) and fills {vars}.
import { getLang } from './i18n.js';

export const LAMP_TEXT = Object.freeze({
  // 2.1 cards
  'item.mirror.name':{ th:'กระจกวิเศษ', en:'Magic Mirror' },
  'item.lamp.name':{ th:'ตะเกียงวิเศษ', en:'Magic Lamp' },
  'item.clock.name':{ th:'นาฬิกาวิเศษ', en:'Magic Clock' },
  'item.mirror.desc':{ th:'ส่องดูความจริงที่ซ่อนอยู่ในคำให้การและในใจของผู้ถูกพิจารณา', en:'Look into the truth hidden in testimony and in the heart of the one before you.' },
  'item.lamp.desc':{ th:'ไฟของผู้ที่ยอมรับท่าน ตามลำดับ จุดตะเกียงแล้วเรียกเขามาช่วยในศึก', en:'The flame of those who have accepted you. Light the lamp and call one of them to your side in battle.' },
  'item.clock.desc':{ th:'ล้างเวลาพักของพลังและผู้ช่วยให้พร้อมใช้ทันที', en:'Wipe away the waiting time of your powers and helpers so they are ready at once.' },
  'state.charged':{ th:'พลังเต็ม', en:'Charged' },
  'state.spent':{ th:'พลังหมด · เติมที่หอส่องกรรม', en:'Spent · recharge at the Mirror Tower' },
  'state.notFound':{ th:'ยังไม่ได้รับ', en:'Not yet found' },
  'state.partial':{ th:'เหลือ {n}/{max} · เติมที่หอส่องกรรม', en:'{n}/{max} left · recharge at the Mirror Tower' },
  'none.lamp':{ th:'ยังไม่มีตะเกียงวิเศษ', en:'You do not have the Magic Lamp yet.' },
  'none.clock':{ th:'ยังไม่ได้รับนาฬิกาวิเศษ', en:'You do not have the Magic Clock yet.' },
  // 2.2 bag tab
  'bag.tab':{ th:'ตะเกียงวิเศษ', en:'Magic Lamp' },
  'bag.heading':{ th:'ผู้ช่วยในตะเกียง', en:'Helpers in the Lamp' },
  'bag.note':{ th:'เลือกผู้ช่วยที่จะเรียกมาในศึก เรียกได้ตนละ 3 ครั้ง ทุกครั้งผู้ช่วยจะยืนในทีมและลงมือได้ 3 ตา หมดแล้วไปเติมไฟที่หอส่องกรรม', en:'Choose who answers your call in battle. Each helper can be called 3 times. Every time, they stand in your team and act for 3 turns. When the flames run out, recharge at the Mirror Tower.' },
  'bag.empty':{ th:'ว่าง · แตะเพื่อเลือกผู้ช่วย', en:'Empty · tap to choose a helper' },
  'bag.locked':{ th:'ล็อก · เล่นมินิเกมที่หอส่องกรรมโซน {n}', en:'Locked · play the minigame at the Mirror Tower of Zone {n}' },
  'bag.unmet':{ th:'??? · ยังไม่ได้พบ', en:'??? · not yet met' },
  'bag.movesLeft':{ th:'เรียกได้อีก {n}/3 ครั้ง', en:'Calls left: {n}/3' },   // FB3-EV5: the owner cut the old "special move left" wording; the summon window no longer prints a count at all - only the flame dots
  'bag.place':{ th:'ใส่ในตะเกียง', en:'Place in Lamp' },
  'bag.swap':{ th:'เปลี่ยนผู้ช่วย', en:'Swap helper' },
  'bag.remove':{ th:'เอาออก', en:'Remove' },
  'bag.placed':{ th:'{name} อยู่ในตะเกียงแล้ว', en:'{name} is in the Lamp.' },
  'bag.full':{ th:'ช่องเต็ม · เลือกเปลี่ยนแทนตัวเดิม', en:'Lamp is full · swap with someone already in it' },
  'bag.low':{ th:'ไฟในตะเกียงริบหรี่ · เติมพลังที่หอส่องกรรม', en:"The Lamp's flame is low · recharge at the Mirror Tower" },
  'bag.pool':{ th:'ผู้ที่ยอมรับท่านแล้ว', en:'Those who have accepted you' },
  'bag.slot':{ th:'ช่อง {n}', en:'Slot {n}' },
  // 2.3 battle
  'battle.button':{ th:'อัญเชิญ', en:'Summon' },
  'battle.title':{ th:'อัญเชิญผู้ช่วย', en:'Summon a Helper' },
  'battle.call':{ th:'เรียกมา', en:'Call' },
  'battle.cancel':{ th:'ไม่เรียก', en:'Not now' },
  'battle.lampEmpty':{ th:'ตะเกียงยังว่าง · ใส่ผู้ช่วยที่เมนูกระเป๋า', en:'The Lamp is empty · place a helper from the bag menu' },
  'battle.helperSpent':{ th:'{name}: เรียกครบ 3 ครั้งแล้ว · เติมพลังที่หอส่องกรรม', en:'{name} has been called 3 times · recharge at the Mirror Tower' },
  // FB3-EV5 / FB3-R2: the helper that stands in the team (Rae's wording)
  'battle.present':{ th:'{name} ยังอยู่ในทีม · รอให้ลงมือครบ 3 ตาก่อน จึงเรียกตัวต่อไปได้', en:'{name} is still in your team. Wait until they have acted 3 times before calling the next helper.' },
  'battle.lampCut':{ th:'ยามาจุดตะเกียงวิเศษ · {name}ก้าวออกมาจากแสงไฟ', en:'Yama lights the Magic Lamp. {name} steps out of the flame.' },
  'helper.attack':{ th:'โจมตี', en:'Attack' },
  'helper.acts':{ th:'ลงมือได้อีก {n}/{max} ตา', en:'{n}/{max} turns left' },
  'helper.farewell':{ th:'{name} กลับเข้าตะเกียง', en:'{name} returns to the Lamp' },
  'battle.allSpent':{ th:'ไฟในตะเกียงริบหรี่ · ไปเติมพลังที่หอส่องกรรม', en:"The Lamp's flame is low · go and recharge at the Mirror Tower" },
  'battle.cannot':{ th:'ศึกนี้อัญเชิญไม่ได้ · ตะเกียงนิ่งสนิท', en:'You cannot summon in this fight · the Lamp stays still' },
  'battle.logCall':{ th:'อัญเชิญ {name} · {move}', en:'Summoned {name} · {move}' },
  'battle.logOut':{ th:'แสงของ {name} ในตะเกียงดับลงแล้ว', en:"{name}'s light in the Lamp has gone out." },
  'battle.groupHit':{ th:'ตีหมู่ · แรงปานกลาง', en:'Group hit · moderate power' },
  // 2.4 tower
  'tower.button':{ th:'เติมพลังของวิเศษ', en:'Recharge the Treasures' },
  'tower.heading':{ th:'เติมพลังของวิเศษ', en:'Recharge the Treasures' },
  'tower.note':{ th:'แสงจากหอส่องกรรมเติมพลังให้ของวิเศษทั้งสามชิ้น', en:'Light from the Mirror Tower refills all three treasures.' },
  'tower.recharge':{ th:'เติมพลัง', en:'Recharge' },
  'tower.rechargeAll':{ th:'เติมพลังทั้งหมด', en:'Recharge All' },
  'tower.doneOne':{ th:'{item} พลังเต็มแล้ว', en:'{item} is fully charged.' },
  'tower.doneAll':{ th:'ของวิเศษทุกชิ้นพลังเต็มแล้ว', en:'All treasures are fully charged.' },
  'tower.already':{ th:'พลังเต็มอยู่แล้ว', en:'Already fully charged.' },
  'tower.noItem':{ th:'ยังไม่ได้รับ{item}', en:'You do not have the {item} yet.' },
  'tower.upHeading':{ th:'ยกระดับตะเกียงวิเศษ', en:'Upgrade the Magic Lamp' },
  'tower.upNow':{ th:'ตะเกียงตอนนี้ใส่ผู้ช่วยได้ {n} ตน', en:'The Lamp now holds {n} helper(s).' },
  'tower.upMinigame':{ th:'เล่นมินิเกมยกระดับ', en:'Play the Upgrade Minigame' },
  'tower.upTemp':{ th:'ยกระดับ (ชั่วคราว)', en:'Upgrade (temporary)' },
  'tower.upDone':{ th:'ตะเกียงวิเศษสว่างขึ้น · ใส่ผู้ช่วยได้ {n} ตน', en:'The Lamp burns brighter · it now holds {n} helpers.' },
  'tower.upAlready':{ th:'หอส่องกรรมแห่งนี้ยกระดับตะเกียงไปแล้ว', en:'This Mirror Tower has already upgraded the Lamp.' },
  'tower.upNoLamp':{ th:'ต้องมีตะเกียงวิเศษก่อนจึงยกระดับได้', en:'You need the Magic Lamp before you can upgrade it.' },
  'tower.devTag':{ th:'DEV · ปุ่มชั่วคราว จะถอดเมื่อมีมินิเกม', en:'DEV · temporary button, removed once the minigame exists' },
  // 2.6 notices
  'notice.received.title':{ th:'ได้รับ ตะเกียงวิเศษ', en:'Magic Lamp Received' },
  'notice.received.text':{ th:'นางสีดามอบตะเกียงวิเศษให้ยามา จุดตะเกียงแล้วเรียกผู้ที่ยอมรับท่านมาสู้ข้างทีมได้ เรียกได้ตนละ 3 ครั้ง ครั้งละ 3 ตา หมดแล้วไปเติมไฟที่หอส่องกรรม ซึ่งสร้างได้แล้วตั้งแต่ตอนนี้', en:'Lady Sita has given Yama the Magic Lamp. Light it to call those who accepted you to fight at your side. Each can be called 3 times, for 3 turns each time. When the flames run out, recharge at the Mirror Tower, which you can build from now on.' },
  'notice.received.slot':{ th:' · ตอนนี้ใส่ผู้ช่วยได้ 1 ตน มี หนุมาน อยู่ในตะเกียง', en:' The Lamp holds 1 helper for now, and Hanuman is already inside it.' },
  'notice.received.button':{ th:'ดูตะเกียง', en:'See the Lamp' },
  'notice.helper.title':{ th:'ผู้ช่วยตนใหม่ในตะเกียง', en:'A New Helper in the Lamp' },
  'notice.helper.text':{ th:'{name} ยอมรับท่านแล้ว และฝากไฟไว้ในตะเกียงวิเศษ เลือกใส่ในช่องได้ที่เมนูกระเป๋า', en:'{name} has accepted you and left a flame in the Magic Lamp. Place them in a slot from the bag menu.' },
  'notice.low.title':{ th:'ไฟในตะเกียงริบหรี่', en:"The Lamp's Flame Is Low" },
  'notice.low.text':{ th:'ผู้ช่วยในตะเกียงถูกเรียกครบ 3 ครั้งแล้ว ไปเติมไฟตะเกียงที่หอส่องกรรม', en:'Your helpers have been called all 3 times. Go to the Mirror Tower to recharge the Lamp.' },
  'notice.low.button':{ th:'รับทราบ', en:'Understood' },
  // FB3-T5 / FB3-R2 (Rae): the Mirror Tower opens with the lamp - this window is only queued for an OLD save that already holds the lamp (a new lamp gets the one merged window above, `notice.received.text`).
  'notice.tower.title':{ th:'หอส่องกรรมเปิดแล้ว', en:'The Mirror Tower Is Open' },
  'notice.tower.text':{ th:'ได้ตะเกียงวิเศษแล้ว ตอนนี้สร้างหอส่องกรรมได้ ไว้เติมไฟตะเกียงเมื่อผู้ช่วยถูกเรียกครบ 3 ครั้ง', en:'With the Magic Lamp in hand, you can build the Mirror Tower now. Use it to recharge the Lamp once a helper has been called 3 times.' },
  'notice.tower.button':{ th:'รับทราบ', en:'Understood' },
  // 2.5 Kan lecture hook
  'kan.name':{ th:'กานต์', en:'Kan' },
  // 1.1 Guard labels
  'guard.generic':{ th:'ผู้เฝ้าด่าน', en:'Gate Guard' },
  'guard.th.title':{ th:'ผู้เฝ้าด่านสุวรรณภูมิ', en:'Gate Guard of Suvarnabhumi' },
});

export function lt(key, vars, lang = getLang()) {
  const row = LAMP_TEXT[key];
  if (!row) return key;
  const out = row[lang] ?? row.th;
  return vars ? out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : out;
}
