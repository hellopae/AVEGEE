// P1 (คุณเป้ 22 ต.ค. 2569) — ช่วงต้นเกม: สถานที่ลงทัณฑ์ปลดล็อกทีละ level + ลำดับแนะนำสร้าง/จ้าง
// "ไม่งั้นผู้เล่นจะไม่รู้ว่าควรสร้างอันไหนก่อน แนะนำให้เริ่มจาก ศาลาน้ำชา ป่าดาบ ประตูสวรรค์"
//
// ไฟล์นี้เป็นตารางล้วน ๆ ไม่แตะ state — game.js / ui.js / scene.js อ่านจากที่นี่ที่เดียว
// กฎสำคัญ: ล็อกเฉพาะ "การสั่งสร้างใหม่" (g.build) · อาคารที่สร้างไปแล้ว (เซฟเก่า) ยังอยู่และใช้ได้เสมอ
// เพราะ g.stations ไม่ผูกกับ level เลย · level ใช้ g.level (ขั้นของยมบาท ที่เกมใช้อยู่แล้ว — LEVELS ใน data.js)

/** ตารางปลดล็อก เรียงตามลำดับที่แนะนำให้สร้าง
 *  lv = ขั้นยมบาทที่ต้องถึงก่อนสั่งสร้างได้ · key ใช้ต่อท้าย unlock.why.<k> ใน i18n */
export const BUILD_PLAN = Object.freeze([
  { k:'krata',  lv:1 },   // โซน 1 มีให้ตั้งแต่เริ่ม · โซนอื่นสร้างเป็นที่ลงทัณฑ์แห่งแรก
  { k:'tea',    lv:1 },   // ศาลาน้ำชา — ที่นอนพัก (ไม่ต้องซื้อเตียงแยกแล้ว)
  { k:'dab',    lv:2 },   // ป่าดาบ — ฆ่า/ทำร้าย + วจีทุจริต
  { k:'sawan',  lv:3 },   // ประตูสวรรค์ — ปิดวงจรคดี ดวงบริสุทธิ์/สำนึกแล้ว
  { k:'ngiw',   lv:4 },   // ดงต้นงิ้ว — ผิดกาม
  { k:'lan',    lv:4 },   // ลานตรากตรำ — เบียดเบียน
  { k:'lokan',  lv:5 },   // โลกันตนรก — อกตัญญู
  { k:'krajok', lv:5 },   // หอส่องกรรม — เติมกระจกวิเศษ
]);

const LV = Object.fromEntries(BUILD_PLAN.map(p => [p.k, p.lv]));

/** ขั้นที่ปลดล็อกสถานีนี้ — สถานีที่ไม่อยู่ในตาราง (หอทะเบียน/ตะราง ฯลฯ) ไม่ล็อก */
export const buildUnlockLv = k => LV[k] ?? 1;

/** ล็อกอยู่ไหม — สร้างแล้วถือว่าไม่ล็อก (เซฟเก่าที่สร้างไปก่อน level ถึงต้องใช้ได้ต่อ) */
export function buildLocked(g, k) {
  if (g.stations.some(s => s.def.k === k)) return false;
  return (g.level || 1) < buildUnlockLv(k);
}

/** สถานีที่แนะนำให้สร้างถัดไป — ตัวแรกในตารางที่ยังไม่มีในโซนนี้ · ถ้าตัวนั้นยังล็อกอยู่ = ไม่แนะนำอะไร
 *  (ไม่ข้ามไปแนะนำตัวหลังที่ปลดล็อกแล้ว เพราะลำดับคือสิ่งที่คุณเป้ต้องการสื่อ) */
export function recommendedBuild(g) {
  for (const p of BUILD_PLAN) {
    if (g.stations.some(s => s.def.k === p.k)) continue;
    return buildLocked(g, p.k) ? null : p.k;
  }
  return null;
}

/** สถานีที่เพิ่งปลดล็อกพอดีที่ขั้นนี้ (ใช้ในหน้าต่างเลื่อนขั้น) */
export const unlockedAtLevel = lv => BUILD_PLAN.filter(p => p.lv === lv && p.lv > 1).map(p => p.k);

// ---------- ลำดับแนะนำจ้าง ----------
// ผูกกับลำดับอาคารด้านบน — ดูเหตุผลเต็มในรายงาน Output/Toby/2026-10-22-avegee-p1-early-game.md
//   1 ดำ        ช่างคนที่สอง: ทัณฑ์ต้องคุมกระทะจนจบ ไม่ว่างสร้าง → สร้างศาลา/ป่าดาบต้องมีดำ (ถูกสุด 120)
//   2 คนงาน     อสูรผู้ช่วย: เร่งผู้คุม 20% + นำวิญญาณจากท่าเรือไปส่ง · เปิดโบนัสของดำ
//   3 เพลิง     ป่าดาบ (Lv.2) เปิดคดีฆ่า/ทำร้าย วิญญาณดื้อ/ต่อต้านเยอะ — เพลิงคุมความดื้อโดยตรง
//   4 ยักษ์     เปรตเริ่มบุกทุก 5 คดี — ยักษ์ปราบเอง/ช่วยรบอัตโนมัติ แต่แพง 420 + ค่าแรงสูงสุด จึงมาหลังสามอย่างแรก
//   5 บุญ       ประตูสวรรค์ (Lv.3) — ผู้คุมสายสำนึก ลดกรรมยมบาท
//   6 กานต์     เปิดข้อเท็จจริงที่ซ่อน — มีประโยชน์เต็มที่เมื่อมีหลายสถานี และยืนประจำหอส่องกรรม (Lv.5)
export const HIRE_PLAN = Object.freeze([
  { id:'dam',    kind:'crew',   k:'dam' },
  { id:'worker', kind:'worker' },
  { id:'plerng', kind:'crew',   k:'plerng' },
  { id:'guard',  kind:'guard' },
  { id:'boon',   kind:'crew',   k:'boon' },
  { id:'kan',    kind:'crew',   k:'kan' },
]);

/** เลขลำดับ (1-based) ของผู้ถูกจ้าง — 0 = ไม่อยู่ในลำดับ (ทัณฑ์/นิรา มีให้ตั้งแต่เริ่ม) */
export const hireRank = id => HIRE_PLAN.findIndex(p => p.id === id) + 1;

/** จ้างแล้วหรือยัง — คนงานนับว่าจ้างแล้วเมื่อมีอย่างน้อย 1 คนในโซนนี้ */
export function hireDone(g, plan) {
  if (plan.kind === 'crew') return g.crew.some(c => c.k === plan.k);
  if (plan.kind === 'guard') return !!g.guard;
  return (g.workerState?.workers || []).some(w => w.homeZone === g.zone);
}

/** ตัวถัดไปที่แนะนำให้จ้าง (id) หรือ null เมื่อจ้างครบลำดับแล้ว */
export function recommendedHire(g) {
  return HIRE_PLAN.find(p => !hireDone(g, p) && (p.id!=='worker'||g.zoneEvents?.th?.frontierBreach==='cleared'||g.bossCleared?.th))?.id ?? null;
}
