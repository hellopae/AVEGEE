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
  'crew-guard', 'crew-taan-west', 'crew-plerng-west', 'crew-kan-west', 'crew-boon-west', 'crew-dam-west', 'crew-guard-west',   // โซน 3: ใบงาน 30B #12/#28
  // FB3-EV5 (owner 26 Nov: a called helper stands in OUR team and must face right): the helpers' battle pictures, judged one by one from the drawing (sheet Output/Review/2026-11-26-fb3-t4/facing-summon.jpg).
  // Drawn facing RIGHT (head / body turned to the right) -> not mirrored. Hanuman is drawn facing left (mirrored, as before); Eirlin, Liangang and Yomathat stand square to the camera (kept as they were).
  'battle-wukong', 'battle-ryujin', 'battle-jormungandr', 'battle-thor', 'battle-lucifer', 'battle-lupin', 'battle-musashi', 'kuman-thong-battle',
  // J1: Turbo's standing PNG faces LEFT; leave it unregistered so the team renderer mirrors it.
  // H2 ข้อ 7 (คุณเป้ 10 ต.ค.): "หลังจาก yama กดโจมตีธรรมดา ยังหันหน้าไปทางซ้ายอยู่เลย" (โซน 2 ชุดบูรพา)
  // F2 เคยขึ้นทะเบียน hero-yama-asia / hero-yama-cyberhell ว่าวาดหันขวา (ไม่พลิก) แต่ต้นเหตุจริงตอนนั้นคือเฟรมดาบ 0/7 หันซ้าย (แก้แล้วใน F4)
  // เทียบภาพจริง: ท่ายืนดิบของสองชุดนี้มีส่วนหลัง (หางหมวกบูรพา · ยอดหมวกนรกเครือข่าย) ชี้ไปทางขวา = หันซ้าย
  // สวนกับแผ่นดาบที่หันขวา → ถอนออกจากรายการนี้ ให้พลิกกระจกเหมือนชุดโซน 1 แล้วท่ายืนหลังฟาดจะหันขวาตรงกับแผ่นดาบ
]);

/** ภาพศัตรูที่วาดหันขวามา → พลิกให้หันซ้ายเข้าหาทีมเรา */
export const FOE_DRAWN_FACING_RIGHT = new Set([
  'mob-gaki-asia', 'mob-pret', 'mob-pret2',
  // FB2-9 (คุณเป้ 13 พ.ย. "ในหน้าต่อสู้ วิญญาณหันหน้าไปทางอื่น"): วิญญาณ spirit-<ชนิด>-<โซน> ที่วาดหน้าหันขวา (3/4 เห็นหูซ้าย ตามองไปขวา)
  // ฉากสู้วิญญาณอยู่ขวา ทีมเราอยู่ซ้าย → ต้องพลิกให้หันซ้าย · ตัดสินจากภาพจริงทีละไฟล์ (ใบที่หันตรง/หันซ้ายอยู่แล้วไม่ขึ้นทะเบียน)
  // วาดใหม่ให้หันทิศอื่น → ลบบรรทัดนั้น · ภาพใหม่ที่หันขวา → เพิ่มชื่อ (ไม่ต้องใส่ -v2/-v3 และนามสกุล)
  'spirit-clerk-th', 'spirit-woman-th', 'spirit-elder-woman-th', 'spirit-boy-th',
  'spirit-clerk-asia', 'spirit-elder-woman-asia', 'spirit-boy-asia',
  'spirit-clerk-west', 'spirit-elder-woman-west',
  'spirit-clerk-cyberhell', 'spirit-girl-cyberhell', 'spirit-elder-woman-cyberhell',
  // FB3-EV2/EV12/EV13 (คุณเป้ 26 พ.ย. "หนุมานหันซ้าย · ขุนแผนหันซ้าย · มีตัวละครหลายตัวหันผิดทาง"): ไล่ดูทุกรูปที่ขึ้นเป็นศัตรูในศึก (แผ่นก่อน/หลัง Output/Review/2026-11-26-fb3-t2/facing-*.jpg)
  // ตัดสินจากภาพจริงทีละไฟล์ — ตัวที่วาดหันขวา (หน้า/จะงอยปาก/ท่าทางชี้ขวา) ขึ้นทะเบียนที่นี่ · ตัวที่หันตรงหรือหันซ้ายอยู่แล้วไม่ขึ้นทะเบียน
  'boss-hanuman-th', 'boss-khunphaen-th', 'boss-ryujin-asia', 'boss-tester-asia', 'boss-frontier-cyberhell', 'boss-loki-west',
  'mob-kasha-asia', 'mob-worm-cyberhell',
  'col-s1', 'col-s3', 'col-s6', 'col-s7', 'col-s8', 'col-s9',
  'spirit-business-th', 'spirit-business-asia',
  // FB3-F2 (owner 26 Nov round 2: "หงอคงฝั่งศัตรู ให้หันมาทางซ้าย"): both Wukong drawings (the boss and his split-off clone) are drawn facing RIGHT (head / eyes turned right, tail on the left) -> mirrored on the enemy side.
  // The summoned Wukong on OUR side (battle-wukong, T4) is a different drawing and stays facing right.
  'boss-wukong-asia', 'boss-wukong-clone-asia',
  // ยมทูตที่ถูกสะกดจิตมายืนฝั่งศัตรู: ภาพโซน 3 (และยักษ์โซน 1) วาดหันขวามาแต่ต้น (ดู TEAM_DRAWN_FACING_RIGHT) → ฝั่งศัตรูต้องพลิก
  'crew-guard', 'crew-taan-west', 'crew-plerng-west', 'crew-kan-west', 'crew-boon-west', 'crew-dam-west', 'crew-guard-west',
]);

/** FB3-EV6/EV13 หน้าสอบสวน: วิญญาณยืนฝั่งขวา ต้องหันซ้ายเข้าหายมบาทน้อย
 *  · วิญญาณ spirit-<ชนิด>-<โซน> ใช้ภาพวาดเดียวกับในศึก → ใช้ทะเบียนศัตรู (FOE_DRAWN_FACING_RIGHT) ชุดเดียวกัน
 *  · วิญญาณประจำเนื้อเรื่อง soul-* ไม่เคยขึ้นเป็นศัตรู จึงขึ้นทะเบียนที่นี่ — ตัดสินจากภาพจริงทีละไฟล์ (แผ่น Output/Review/2026-11-26-fb3-t3/facing-trial-*.jpg)
 *  วาดใหม่ให้หันทิศอื่น (เช่น Codex C2 วาดนางวันทองเป็นวิญญาณทับชื่อเดิม) → ลบบรรทัดนั้น */
export const TRIAL_SOUL_DRAWN_FACING_RIGHT = new Set([
  'soul-wanthong-th', 'soul-false-judge-west', 'soul-loki-priest-west', 'soul-redhood-west', 'soul-soup-cook-west',
  'soul-witch-bread-west', 'soul-younger-brother-west', 'soul-aiscam-cyber',
  // FB3-F3 (owner 26 Nov round 2: "soul-cupdealer-asia หันผิด · spirit-boy-west หันผิด · soul-admin-cyber ถูกแล้ว"): these two were drawn facing right -> mirrored in the room. soul-admin-cyber is right as it is (NOT listed).
  'soul-cupdealer-asia', 'spirit-boy-west',
]);

/** FB3-EV13: แผ่นท่าต่อสู้ของบอส (img/boss-combat-v1) ที่ "ท่ายืน (idle)" วาดหันขวา แต่ท่าตี/โดนตีของแผ่นเดียวกันหันซ้าย — วาดกลับด้านตอนแสดงเฉพาะท่ายืน
 *  (กุญแจ = คีย์ในไฟล์ combat-animation-v1/manifest.json) · วาดท่ายืนใหม่ให้หันซ้ายเมื่อไร ลบบรรทัดนี้ */
export const ATLAS_IDLE_DRAWN_FACING_RIGHT = new Set(['boss:cyberhell:boss-frontier']);
/** ศัตรูที่เล่นท่าจากแผ่นท่า: face = -1 พลิกกระจก (ยมทูตที่ถูกสะกดจิตวาดหันขวา · ท่ายืนที่วาดหันขวา) · 1 = ตามที่วาด (ศัตรูวาดหันซ้ายมา) */
export const foeAtlasFace = (key, mode) => String(key).startsWith('crew:') || (mode === 'idle' && ATLAS_IDLE_DRAWN_FACING_RIGHT.has(key)) ? -1 : 1;

/** ชื่อฐานของไฟล์ภาพ: ตัด path, query, นามสกุล และ -v2 */
export function spriteKey(src) {
  return String(src || '').split('?')[0].split('/').pop().replace(/\.[a-z0-9]+$/i, '').replace(/-v\d+$/i, '');
}

/** ทีมเรา: ต้องพลิกกระจกไหม (true = พลิกตามธรรมเนียมเดิม) */
export const teamNeedsMirror = src => !TEAM_DRAWN_FACING_RIGHT.has(spriteKey(src));
/** ศัตรู: ต้องพลิกกระจกไหม */
export const foeNeedsMirror = src => FOE_DRAWN_FACING_RIGHT.has(spriteKey(src)) || FOE_DRAWN_FACING_RIGHT.has(soulPoseBaseKey(src));
/** ท่าตกใจ/ร้องไห้ของวิญญาณ (img/soul-poses/<ชนิด>-<โซน>-<ท่า>-vN) เป็นภาพวาดคนละใบ แต่เป็นตัวเดียวกับภาพยืน → หันทิศเดียวกับ spirit-<ชนิด>-<โซน>
 *  (ไม่งั้นพอแพ้ศึกวิญญาณจะหมุนกลับไปอีกทาง) · ไม่ใช่ไฟล์ท่า → '' */
export const soulPoseBaseKey = src => {
  const m = /\/soul-poses\/([a-z-]+?)-(th|asia|west|cyberhell)-(?:scared|cry|caught-lie|necessity)-v\d+\.[a-z0-9]+$/i.exec(String(src || '').split('?')[0]);
  return m ? `spirit-${m[1]}-${m[2]}` : '';
};

/** หน้าสอบสวน: วิญญาณต้องพลิกกระจกไหม (หันซ้ายเข้าหายมบาทน้อย) */
export const trialSoulNeedsMirror = src => TRIAL_SOUL_DRAWN_FACING_RIGHT.has(spriteKey(src)) || foeNeedsMirror(src);
export const trialSoulFaceClass = src => trialSoulNeedsMirror(src) ? 'face-flip' : '';

/** class ที่ใส่ให้ <img> — CSS: .face-native = ไม่พลิก (ฝั่งเรา) · .face-flip = พลิก (ศัตรู) */
export const teamFaceClass = src => teamNeedsMirror(src) ? '' : 'face-native';
export const foeFaceClass = src => foeNeedsMirror(src) ? 'face-flip' : '';

/** กรอบส่วนมีตัว (เศษส่วน 0-1) หลังพลิกกระจกแนวนอน — ใช้วัดตำแหน่งภาพที่ถูกพลิก */
export const mirrorBox = box => box ? { ...box, l:1 - (box.l + box.w) } : box;

/** ท่าชาร์จ/โจมตีของยมบาทที่หันขวามาแต่ต้น (ชุด 30B ข้อ 4 — พลังบ้าคลั่ง Rage แสดงที่ตัวยมบาท ไม่ใช่ที่ศัตรู)
 *  โซน 1–2 มี hero-yama[-asia]-atk · โซน 3–4 มีเฉพาะ atk-R (atk-L คือภาพกระจกหันซ้าย) · ไม่รู้จักชุด → null (ผู้เรียกถอยไปท่าเดิม) */
export function rageArtSrc(style) {
  return ({ th:'img/hero-yama-rage.webp', asia:'img/Asia/hero-yama-asia-rage.webp',
    west:'img/West/hero-yama-west-rage.webp', cyberhell:'img/CyberHell/hero-yama-cyberhell-rage.webp' })[style] || null;
}
export function ragePoseSrc(style) {
  switch (style) {
    case 'th': return 'img/hero-yama-atk.webp';
    case 'asia': return 'img/Asia/hero-yama-asia-atk-v2.webp';
    case 'west': return 'img/West/hero-yama-west-atk-R.webp';
    case 'cyberhell': return 'img/CyberHell/hero-yama-cyberhell-atk-R.webp';
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
 *  ท่าสกิล (atk) ทั้ง 4 โซนใช้ไฟล์ไม่มี -R และวาดหันขวา · rage โซน 3-4 ยังใช้ -R (-L คือภาพกระจกหันซ้าย)
 *  ท่าโดนตี (cry) ทั้ง 4 ชุดวาดหัน "ซ้าย" (มือชี้ซ้าย) เหมือนกันหมด — รวมชุดปัจฉิมด้วย (ท่ายืนปัจฉิมวาดหันขวา แต่ท่า cry ไม่ใช่)
 *  จึงต้องพลิกกระจกทุกชุด (ไม่ขึ้นทะเบียน TEAM_DRAWN_FACING_RIGHT) · ถ้าวาด cry ใหม่ให้หันขวา ให้ขึ้นทะเบียนที่ TEAM_DRAWN_FACING_RIGHT */
export const POSE_DRAWN_FACING_RIGHT = new Set([
  ...TEAM_DRAWN_FACING_RIGHT,
  'hero-yama-atk', 'hero-yama-asia-atk', 'hero-yama-west-atk-R', 'hero-yama-cyberhell-atk-R',
  'hero-yama-west-atk', 'hero-yama-cyberhell-atk',
]);
/** ท่าไหน (ไฟล์ภาพ) + มี .atk หรือไม่ → ที่จอหันขวาไหม · null = ไม่รู้จักไฟล์ (หันตรงเข้ากล้อง/ไม่อยู่ในทะเบียน) */
export const heroPoseFacesRight = (src, { atkClass = false } = {}) =>
  POSE_DRAWN_FACING_RIGHT.has(spriteKey(src)) !== (teamNeedsMirror(src) && !atkClass);
