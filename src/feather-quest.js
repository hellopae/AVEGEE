// feather-quest.js - the merchant's second quest "ขนที่ไม่ไหม้" / "The Feather That Would Not Burn" (owner 14-15 Nov 2026).
//   Script, system words and foes: Rae, Output/Rae/2026-11-14-avegee-merchant-quest.md (TH + EN, copied here word for word - change them through Rae).
//   Rules from the owner's decisions (Output/Claudy/briefs/2026-11-15-avegee-owner-decisions-boss-quest.md, items 4-6):
//     opens after the merchant's first quest (sqMerchant) is finished - the owner: "เปิดตอนหลังก็ได้ครับ"
//     the item is spelled ขนนกฟีนิกซ์ everywhere
// Steps kept in g.sideQuests.sqMerchantFeather.step (the same record every side quest has, so old saves load and nothing new is saved):
//   0  not taken      the merchant tells the story, the player takes it
//   1  taken          bring ash-stone x3 + enchanted cinder x2 to the merchant (the bundle's ash)
//   2  bundle tied    walk to the ash pit by the frontier and set the bundle down -> the fight (a lost fight keeps step 2, the bundle is not lost)
//   3  fight won      go back to the merchant to close the quest (reward: Phoenix Feather x2 + 60 coins + holy water x1 + EXP 30)
//   5  done           (the usual closing step of every side quest)
import { getLang } from './i18n.js';

export const FEATHER_ID = 'sqMerchantFeather';
/** what the merchant asks for: Rae 1 / step 2 (the same item keys the frontier drops: ashStone = เศษหินเถ้า, emberWood = เศษถ่านอาถรรพ์) */
export const FEATHER_NEED = Object.freeze({ ashStone:3, emberWood:2 });
/** the ash pit by the frontier gate (zone 2 / asia town map, 3840x2560 scene): left of the gate, 300 units away from the gate's own "enter" reach (105), on the open plaza */
export const FEATHER_PIT = Object.freeze([1660, 2150]);
export const featherHas = g => Object.entries(FEATHER_NEED).every(([k, n]) => (g.inventory?.[k] || 0) >= n);
export const featherDone = g => !!g.sideQuests?.[FEATHER_ID]?.done;

const TEXT = {
  th: {
    title:'ขนที่ไม่ไหม้',
    pin:'พ่อค้ามีเรื่องจะฝาก',
    pitName:'บ่อเถ้าริมชายแดน',
    track:{ 0:'ฟังเรื่องที่พ่อค้าควันทองอยากฝาก', 1:'เก็บเถ้าจากชายแดนให้พ่อค้า (เศษหินเถ้า 3 · เศษถ่านอาถรรพ์ 2)', 2:'ถือห่อเซ่นไปวางที่บ่อเถ้าริมชายแดน', 3:'กลับไปหาพ่อค้าควันทอง' },
    buttons:{ give:'ส่งเถ้าให้พ่อค้า', place:'วางห่อเซ่น', take:'รับภารกิจ', talk:'คุย · ดำเนินภารกิจ' },
    have:(k, n, need) => `${{ ashStone:'เศษหินเถ้า', emberWood:'เศษถ่านอาถรรพ์' }[k]} ${n}/${need}`,
    receipt:'✓ ได้ขนนกฟีนิกซ์ ×2',
    intro:[
      'พ่อค้าควันทอง: "ท่านจำได้ไหมที่ข้าเคยบอกว่าของบนแผงข้าบางชิ้นมีเจ้าของ ข้ายังไม่เคยบอกว่ามีควันอีกก้อนหนึ่งที่ไม่เหลือเจ้าของแล้ว"',
      'พ่อค้าควันทอง: "ญาติจุดธูปให้คนตาย แต่คนตายไปเกิดแล้ว หรือไม่มีใครเหลือให้รับ ควันก้อนนั้นไม่มีปลายทาง มันตกลงเป็นเถ้าที่บ่อริมชายแดน ทุกครั้งที่ควันตกลงไป มีนกตัวหนึ่งลุกขึ้นจากเถ้านั้นไปรับมันต่อ"',
      'พ่อค้าควันทอง: "ข้าอยากฝากห่อควันค้างของข้าให้นกตัวนั้น แต่ควันที่ไม่มีเจ้าของรุมคนขายของอย่างข้า ข้าไปเองไม่ได้ ท่านไปแทนข้าได้ไหม"',
    ],
    notEnough:[
      'พ่อค้าควันทอง: "ห่อเซ่นต้องมีเถ้าจากชายแดนห่อไปด้วย นกจะได้จำกลิ่นทางกลับ ขอเศษหินเถ้าสามชิ้นกับเศษถ่านอาถรรพ์สองชิ้น"',
      'พ่อค้าควันทอง: "ทุกวันนี้ข้าซื้อของพวกนี้จากท่านเป็นราคา คราวนี้ข้าขอเป็นของฝาก ข้าจะจดไว้ว่าท่านให้ ไม่ใช่ข้าซื้อ"',
    ],
    handed:[
      'พ่อค้าควันทอง: "ครบ ข้านับสองรอบ ปกติข้านับรอบเดียว"',
      'พ่อค้าควันทอง: "ห่อนี้ผูกด้วยปมควันทอง อย่าแก้ปมระหว่างทาง ถึงบ่อเถ้าแล้ววางลงบนพื้นแล้วถอยออกมา ควันที่ไม่มีเจ้าของจะออกมาถามทาง ถามว่า \'ถึงใคร\' ท่านไม่ต้องตอบมัน ทำให้มันสงบก็พอ"',
    ],
    pre:[
      'ท่านวางห่อเซ่นลงที่ขอบบ่อเถ้าริมชายแดน เถ้าเย็นเฉียบ ปมควันทองสั่นแผ่ว ๆ',
      'ควันก้อนใหญ่ลุกขึ้นจากกองเถ้า ตามด้วยควันเล็กอีกหลายสาย ไม่มีหน้า ไม่มีมือ มีแต่ช่องวงรีเรียงกันเป็นแถว เหมือนปากที่ถามอยู่ตลอด',
      'เงาเซ่น: "ส่งถึงใคร ... ส่งถึงใคร ... ของข้าถึงใคร ..."',
      'ห่อเซ่นในมือท่านอุ่นวาบขึ้นหนึ่งครั้ง ราวกับมันรู้ว่าควันพวกนี้เป็นพวกเดียวกับมัน',
    ],
    win:[
      'ควันก้อนสุดท้ายไม่ได้สลายหาย มันหมุนวนช้า ๆ แล้วไหลเข้าไปในห่อเซ่น ปมควันทองคลายออกเอง',
      'กลางบ่อเถ้า เปลวทองเรียวลุกขึ้นแล้วกางเป็นปีก นกตัวหนึ่งที่ประกอบจากควันทองและเถ้าขาวลอยขึ้นเหนือบ่อ มันก้มรับห่อเซ่นไว้ในปากโดยไม่ส่งเสียง',
      'ขนเส้นเดียวหลุดจากหางของมัน ลอยลงมาอยู่ในฝ่ามือท่าน ไม่ร้อน ไม่เย็น มีกลิ่นธูปอ่อน ๆ ติดมาด้วย',
    ],
    lose:[
      'เงาเซ่นถอยกลับลงบ่อเถ้า ห่อเซ่นยังอยู่ครบ ปมควันทองไม่คลาย',
      'ควันพวกนี้ไม่ไล่ตามผู้ที่ล้ม ท่านตั้งหลักแล้วกลับไปวางห่อใหม่ได้',
    ],
    close:[
      'พ่อค้าควันทอง: "ท่านกลับมาแล้ว กลิ่นธูปติดตัวท่านมาด้วย ข้ารู้เลยว่านกรับห่อไปแล้ว"',
      'พ่อค้าควันทอง: "ขนเส้นนั้นข้าไม่ขอแบ่ง ไม่ขอซื้อ และไม่คิดราคา มันเป็นของท่าน เพราะท่านคือคนส่งถึงมือ"',
      'พ่อค้าควันทอง: "ข้าบอกเรื่องที่ข้ารู้ไว้ก่อน ขนนี้ไม่ได้ให้ชีวิตใครใหม่ มันพาคำของคนที่ยังคิดถึงเขาไปถึงตัวเขา ใครล้มลง วางขนนี้ที่อกเขา ส่วนใหญ่เขาจะลุกเอง"',
      'พ่อค้าควันทอง: "ข้าไปบ่อเถ้าได้แล้ว ควันไม่รุมข้าอีก นกให้ขนมาปีละไม่กี่เส้น ท่านอยากได้อีกมาหาข้าได้ ข้าไม่ขายถูกหรอกนะ แต่ข้าจะติดป้ายให้ว่า ไม่มีเจ้าของ แต่ถึงใครสักคนเสมอ"',
    ],
  },
  en: {
    title:'The Feather That Would Not Burn',
    pin:'The merchant has a favor to ask',
    pitName:'The ash pit by the frontier',
    track:{ 0:"Hear the merchant's favor", 1:'Gather frontier ash for the merchant (ash-stone 3 · enchanted cinder 2)', 2:'Carry the bundle to the ash pit by the frontier', 3:'Return to the merchant' },
    buttons:{ give:'Give the ash', place:'Set down the bundle', take:'Take the quest', talk:'Talk · continue' },
    have:(k, n, need) => `${{ ashStone:'Ash-stone', emberWood:'Enchanted cinder' }[k]} ${n}/${need}`,
    receipt:'✓ Received Phoenix Feather ×2',
    intro:[
      'Smoke-Gold Merchant: "You remember I told you some of what is on my stall has an owner. I never told you there is one more smoke that has none left."',
      'Smoke-Gold Merchant: "Families light incense for the dead. But the dead have been reborn, or there is no one left to receive it, and that smoke has nowhere to go. It falls as ash into the pit by the frontier. Every time some falls, a bird rises out of the ash to carry it on."',
      'Smoke-Gold Merchant: "I want to hand my bundle of stranded smoke to that bird. But smoke with no owner swarms a trader like me. I cannot go myself. Will you go in my place?"',
    ],
    notEnough:[
      'Smoke-Gold Merchant: "The bundle must carry frontier ash so the bird knows the scent home. I need three pieces of ash-stone and two pieces of enchanted cinder."',
      'Smoke-Gold Merchant: "Usually I buy these from you at a price. This time I am asking them as a gift. I will write it down that you gave them, not that I bought them."',
    ],
    handed:[
      'Smoke-Gold Merchant: "All there. I counted twice. I usually count once."',
      'Smoke-Gold Merchant: "The bundle is tied with a smoke-gold knot. Do not undo it on the road. At the pit, set it on the ground and step back. The ownerless smoke will come out to ask the way, asking \'to whom\'. Do not answer it. Just quiet it."',
    ],
    pre:[
      'You set the bundle down at the edge of the ash pit by the frontier. The ash is cold. The smoke-gold knot trembles faintly.',
      'A great column of smoke rises from the ash, followed by smaller wisps. No faces, no hands, only rows of oval hollows, like mouths forever asking.',
      'Ash-smoke: "To whom ... to whom ... whom is mine for ..."',
      'The bundle warms once in your hand, as if it knew the smoke is its kin.',
    ],
    win:[
      'The last smoke does not vanish. It turns slowly and pours into the bundle, and the smoke-gold knot loosens by itself.',
      'In the middle of the pit a thin golden flame rises and opens into wings. A bird made of golden smoke and white ash lifts above the pit. It bows and takes the bundle in its beak without a sound.',
      'One feather slips from its tail and drifts down into your palm. It is neither warm nor cold, and a faint scent of incense clings to it.',
    ],
    lose:[
      'The ash-smoke sinks back into the pit. The bundle is untouched, its knot still tied.',
      'The smoke does not chase those who fall. Steady yourself, then go back and set the bundle down again.',
    ],
    close:[
      'Smoke-Gold Merchant: "You are back, and the scent of incense came with you. I know the bird took the bundle."',
      'Smoke-Gold Merchant: "I will not ask to share that feather, or to buy it, or to price it. It is yours. You are the one who delivered."',
      'Smoke-Gold Merchant: "Let me tell you what I know first. This feather does not give anyone a new life. It carries the words of those who still miss them, straight to them. Lay it on the chest of whoever falls. Most of the time, they get up on their own."',
      'Smoke-Gold Merchant: "I can reach the pit now, and the smoke no longer swarms me. The bird gives a few feathers a year. If you want more, come to me. I will not sell cheap, but I will put a tag on each one: no owner, yet it always reaches someone."',
    ],
  },
};
export const featherText = () => TEXT[getLang() === 'en' ? 'en' : 'th'];
/** the conversation lines for the step the quest is at now (the quest window shows these) */
export function featherLines(g, s) {
  const x = featherText();
  if (s.done) return x.close;
  switch (s.step) {
    case 0: return x.intro;
    case 1: return x.notEnough;
    case 2: return x.handed;
    default: return x.close;
  }
}
/** the line the journal / tracker shows for the step */
export const featherObjective = s => featherText().track[Math.min(3, Math.max(0, s?.step || 0))];
