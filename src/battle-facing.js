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
  'crew-guard', 'crew-plerng-west', 'crew-kan-west', 'crew-boon-west', 'crew-dam-west', 'crew-guard-west',   // โซน 3: ใบงาน 30B #12/#28
  'crew-plerng-cyberhell',                                                                    // โซน 4 (ตรงกับคัตซีน 30A ที่หันขวา)
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
