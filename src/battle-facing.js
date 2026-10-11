// battle-facing.js — ทิศหันหน้าของสไปรต์ในฉากต่อสู้ (ชุด 30B ข้อ 2)
//
// กติกาฉาก: ทีมเรา (ยมบาท + ยมทูต + ยักษ์) อยู่ซ้ายและต้อง "หันขวา" · ศัตรู/บอสอยู่ขวาและต้อง "หันซ้าย"
// ภาพวาดมีทิศต่างกันไปตามไฟล์ จึงตัดสินเป็นรายไฟล์ ไม่แตะไฟล์ภาพ — พลิกกระจกตอนแสดงเท่านั้น
//
// ธรรมเนียมเดิมของเกม: ภาพฝั่งเราถูกพลิก (scaleX(-1)) ทุกใบโดยดูจากภาพโซน 1–2 ที่หันซ้ายมา (ดู index.html / command-wheel.css)
// ภาพที่ "วาดหันขวามาแต่ต้น" ต้องไม่ถูกพลิก — ขึ้นทะเบียนไว้ที่นี่ · ภาพที่หันตรงเข้ากล้อง พลิกหรือไม่พลิกก็ดูเหมือนกัน คงตามเดิม
// ศัตรูแสดงตามต้นฉบับ (ส่วนใหญ่หันซ้ายหรือหันตรง) · ใบที่วาดหันขวามาต้องขึ้นทะเบียนใน FOE_DRAWN_FACING_RIGHT เพื่อพลิก
//
// เพิ่มรูปใหม่/วาดทับ: ถ้ารูปใหม่หันทิศต่างจากรายการนี้ ให้แก้ชุดข้อมูลนี้ที่เดียว (ชื่อไฟล์ไม่รวมนามสกุลและ -v2)

/** ภาพฝั่งเราที่วาดหันขวามาอยู่แล้ว → ห้ามพลิก */
export const TEAM_DRAWN_FACING_RIGHT = new Set([
  'hero-yama-west', 'hero-yama-west-atk-R',
  'crew-guard', 'crew-plerng-west', 'crew-kan-west', 'crew-boon-west', 'crew-dam-west', 'crew-guard-west',   // โซน 3: ใบงาน 30B #12/#28
  'crew-plerng-cyberhell',                                                                    // โซน 4 (ตรงกับคัตซีน 30A ที่หันขวา)
  // H2 ข้อ 7 (คุณเป้ 10 ต.ค.): "หลังจาก yama กดโจมตีธรรมดา ยังหันหน้าไปทางซ้ายอยู่เลย" (โซน 2 ชุดบูรพา)
  // F2 เคยขึ้นทะเบียน hero-yama-asia / hero-yama-cyberhell ว่าวาดหันขวา (ไม่พลิก) แต่ต้นเหตุจริงตอนนั้นคือเฟรมดาบ 0/7 หันซ้าย (แก้แล้วใน F4)
  // เทียบภาพจริง: ท่ายืนดิบของสองชุดนี้มีส่วนหลัง (หางหมวกบูรพา · ยอดหมวกนรกเครือข่าย) ชี้ไปทางขวา = หันซ้าย
  // สวนกับแผ่นดาบที่หันขวา → ถอนออกจากรายการนี้ ให้พลิกกระจกเหมือนชุดโซน 1 แล้วท่ายืนหลังฟาดจะหันขวาตรงกับแผ่นดาบ
]);

/** ภาพศัตรูที่วาดหันขวามา → พลิกให้หันซ้ายเข้าหาทีมเรา */
export const FOE_DRAWN_FACING_RIGHT = new Set([
  'mob-gaki-asia', 'mob-pret', 'mob-pret2',
]);

/** ชื่อฐานของไฟล์ภาพ: ตัด path, query, นามสกุล และ -v2 */
export function spriteKey(src) {
  return String(src || '').split('?')[0].split('/').pop().replace(/\.[a-z0-9]+$/i, '').replace(/-v\d+$/i, '');
}

/** ทีมเรา: ต้องพลิกกระจกไหม (true = พลิกตามธรรมเนียมเดิม) */
export const teamNeedsMirror = src => !TEAM_DRAWN_FACING_RIGHT.has(spriteKey(src));
/** ศัตรู: ต้องพลิกกระจกไหม */
export const foeNeedsMirror = src => FOE_DRAWN_FACING_RIGHT.has(spriteKey(src));

/** class ที่ใส่ให้ <img> — CSS: .face-native = ไม่พลิก (ฝั่งเรา) · .face-flip = พลิก (ศัตรู) */
export const teamFaceClass = src => teamNeedsMirror(src) ? '' : 'face-native';
export const foeFaceClass = src => foeNeedsMirror(src) ? 'face-flip' : '';

/** กรอบส่วนมีตัว (เศษส่วน 0-1) หลังพลิกกระจกแนวนอน — ใช้วัดตำแหน่งภาพที่ถูกพลิก */
export const mirrorBox = box => box ? { ...box, l:1 - (box.l + box.w) } : box;

/** ท่าชาร์จ/โจมตีของยมบาทที่หันขวามาแต่ต้น (ชุด 30B ข้อ 4 — พลังบ้าคลั่ง Rage แสดงที่ตัวยมบาท ไม่ใช่ที่ศัตรู)
 *  โซน 1–2 มี hero-yama[-asia]-atk · โซน 3–4 มีเฉพาะ atk-R (atk-L คือภาพกระจกหันซ้าย) · ไม่รู้จักชุด → null (ผู้เรียกถอยไปท่าเดิม) */
export function ragePoseSrc(style) {
  switch (style) {
    case 'th': return 'img/hero-yama-atk.png';
    case 'asia': return 'img/Asia/hero-yama-asia-atk.png';
    case 'west': return 'img/West/hero-yama-west-atk-R.png';
    case 'cyberhell': return 'img/CyberHell/hero-yama-cyberhell-atk-R.png';
    default: return null;
  }
}

/** I1-B ข้อ 3 — ใส่ class `.atk` ให้ .fig.you ไหม
 *  `.atk` = "ยกเลิกการพลิกกระจกของรูป" (index.html: .fig.you.atk img{transform:scaleX(1)}) ใช้กับ "รูปท่าฟาด/ท่าชาร์จ" ที่วาดหันขวามาแต่ต้นเท่านั้น
 *  ฟันดาบธรรมดา (sword) รูปที่โชว์คือ "ท่ายืน" (ซึ่งต้องถูกพลิกตามทะเบียนด้านบน) ส่วนแอนิเมชันดาบวาดบน canvas ทับแค่ 580ms
 *  ถ้าใส่ .atk ตอนนี้ ท่ายืนจะโผล่หลัง canvas หายโดยไม่ถูกพลิกค้างจนจบเทิร์น = ยมฯ หันซ้าย (ต้นเหตุจริง ดู i1b-yama-facing.test.mjs)
 *  west-hit — กรณีเดียวกันอีกทาง: ท่า atk ของบางชุด (โซน 3 ลูกไฟ, โซน 4 ลูกไฟ) ยังไม่มีไฟล์ → ui.js ถอยไปโชว์ "ท่ายืน" (standing=true)
 *  ห้ามใส่ .atk เหมือนกัน ไม่งั้นท่ายืนโซน 4 ถูกตัดการพลิก = หันซ้ายตลอดท่าสกิล */
export const figYouAtkClass = ({ usingAtk, sword, showRage, standing = false }) => !standing && ((!!usingAtk && !sword) || !!showRage);
/** ท่ายืนที่โชว์อยู่ "หันขวา" ไหม (ศัตรูอยู่ขวา) — drawnRight = ไฟล์วาดหันขวามา · mirrored = ถูกพลิกกระจกจริงตอนแสดง (class .atk ยกเลิกการพลิก) */
export const standingFacesRight = (src, { atkClass = false } = {}) =>
  TEAM_DRAWN_FACING_RIGHT.has(spriteKey(src)) !== (teamNeedsMirror(src) && !atkClass);

/** west-hit — ทิศที่ "วาดมา" ของทุกท่ายมบาทในฉากต่อสู้ (ดูภาพจริงทีละไฟล์ 11 ต.ค. 2569)
 *  ท่าฟาด/ท่าชาร์จ (atk) ที่วาดหันขวา: โซน 1-2 ใช้ไฟล์ไม่มี -R · โซน 3-4 ใช้ -R (-L คือภาพกระจกหันซ้าย)
 *  ท่าโดนตี (cry) ทั้ง 4 ชุดวาดหัน "ซ้าย" (มือชี้ซ้าย) เหมือนกันหมด — รวมชุดปัจฉิมด้วย (ท่ายืนปัจฉิมวาดหันขวา แต่ท่า cry ไม่ใช่)
 *  จึงต้องพลิกกระจกทุกชุด (ไม่ขึ้นทะเบียน TEAM_DRAWN_FACING_RIGHT) · ถ้าวาด cry ใหม่ให้หันขวา ให้ขึ้นทะเบียนที่ TEAM_DRAWN_FACING_RIGHT */
export const POSE_DRAWN_FACING_RIGHT = new Set([
  ...TEAM_DRAWN_FACING_RIGHT,
  'hero-yama-atk', 'hero-yama-asia-atk', 'hero-yama-west-atk-R', 'hero-yama-cyberhell-atk-R',
]);
/** ท่าไหน (ไฟล์ภาพ) + มี .atk หรือไม่ → ที่จอหันขวาไหม · null = ไม่รู้จักไฟล์ (หันตรงเข้ากล้อง/ไม่อยู่ในทะเบียน) */
export const heroPoseFacesRight = (src, { atkClass = false } = {}) =>
  POSE_DRAWN_FACING_RIGHT.has(spriteKey(src)) !== (teamNeedsMirror(src) && !atkClass);
