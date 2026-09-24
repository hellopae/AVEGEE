// src/minigames/util.js — ของใช้ร่วมของมินิเกม "เร่งการทำงาน" ทุกหลัง (ชุดที่ 9 คุณเป้ 24 ก.ย. 2569)
//
// กติการ่วมของทุกเกมในโฟลเดอร์นี้ (ดูใบงาน Output/Claudy/briefs/2026-09-24-avegee-batch9-minigames.md):
//  - ห้ามวาด/gen ภาพใหม่ — ใช้ glyph + สีจาก CSS var(--…) ที่มีอยู่แล้วเท่านั้น (DOM+CSS ล้วน ไม่มี canvas)
//  - run(host, opts) ต้องคืนฟังก์ชัน stop() ที่ยกเลิก timer/rAF ของตัวเองได้แบบปลอดภัย เรียกซ้ำได้
//  - opts.alive() ต้องถูกเช็คก่อนตั้งเฟรม/ตัวจับเวลาใหม่ทุกครั้ง — ถ้า false (กล่องสถานีถูกปิด/แทนที่
//    ระหว่างเล่น) ให้เงียบ ๆ หยุดเอง ห้ามเรียก onWin/onLose แล้ว (ui.js จะไม่ฟังผลอีกต่อไป)
//  - เวลาเล่นจบทั้งรอบต้องอยู่ในช่วง 15–45 วินาทีเสมอทุกระดับความยาก (opts.level 0-4)

/** สร้าง element ย่อ ๆ กันเขียน document.createElement ซ้ำทุกไฟล์ */
export function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

/** สลับลำดับแบบ Fisher-Yates — ไม่แก้ array เดิม */
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** เกลี่ยค่าตามขั้นความยาก (opts.level 0-4) เป็นเส้นตรงระหว่าง lo (ขั้น 0) กับ hi (ขั้น 4) */
export const lerpByLevel = (level, lo, hi) => lo + (hi - lo) * (clamp(level, 0, 4) / 4);

/** ลูป requestAnimationFrame มาตรฐานที่ทุกเกมใช้ร่วมกัน — เช็ค alive() เองทุกเฟรมตามธรรมเนียมโค้ดเดิม
 *  (room.js frame() ก็เช็คแบบนี้) ปิดกล่องกลางทาง = เฟรมถัดไปไม่ทำงานต่อ ไม่ error ไม่ค้าง
 *  คืนฟังก์ชัน stop() ไว้ยกเลิกเองตอนผู้เล่นกด "ปิด"/"ยอมแพ้" ก่อนจะจบตามเงื่อนไขเกม */
export function rafLoop(step, alive) {
  let raf = 0, dead = false;
  const frame = now => {
    if (dead || !alive()) return;
    step(now);
    if (!dead) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => { dead = true; cancelAnimationFrame(raf); };
}
