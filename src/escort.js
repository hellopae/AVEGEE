// escort.js — ยมทูตพาวิญญาณที่รับทัณฑ์ครบแล้วเดินไปส่งที่ตะราง (ชุด 29C ข้อ 2)
//
// ฟังก์ชันล้วน ไม่แตะ DOM/เกม — game.js ใช้ขยับตำแหน่งจริงของยมทูต, scene.js ใช้วาด, เทสต์เรียกตรง ๆ
// รูปของ walk (afterlifeWalks[i]) เมื่อมียมทูตนำทาง:
//   path     = เส้นทางของวิญญาณ สถานี → ตะราง
//   delay    = ms ที่วิญญาณยืนรอ ระหว่างยมทูตเดินมารับ (ยมทูตที่คุมสถานีอยู่ตรงนั้นแล้ว = 0)
//   duration = delay + เวลาเดินจริงของวิญญาณ
//   escort   = { k, pickup } — k = คีย์ยมทูต · pickup = เส้นทางที่ยมทูตเดินมาหาวิญญาณ

/** ยมทูตเดินนำหน้าวิญญาณกี่พิกเซลตามเส้นทาง (วิญญาณตามติด) */
export const ESCORT_LEAD = 34;
/** ความเร็วยมทูตเดินมารับ (พิกเซลต่อ ms) เท่ากับตอนยมทูตกลับจุดประจำใน game.js stepWorld */
export const ESCORT_PICKUP_SPEED = 0.11;

export function pathLength(path) {
  let n = 0;
  for (let i = 1; i < (path?.length || 0); i++) n += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  return n;
}

/** จุดที่ระยะ dist จากต้นเส้นทาง (ตามความยาวจริง) */
export function pointAtDistance(path, dist) {
  if (!path?.length) return [0, 0];
  let left = Math.max(0, dist);
  for (let i = 1; i < path.length; i++) {
    const len = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    if (left <= len || i === path.length - 1) {
      const q = len ? Math.min(1, left / len) : 0;
      return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * q, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * q];
    }
    left -= len;
  }
  return path[path.length - 1];
}

/** ความคืบหน้า 0-1 ของวิญญาณบนเส้นทาง (หักช่วงรอยมทูตมารับออกแล้ว) */
export function soulProgress(walk) {
  const delay = walk.delay || 0;
  const travel = Math.max(1, walk.duration - delay);
  return Math.max(0, Math.min(1, (walk.elapsed - delay) / travel));
}

/** ตำแหน่งยมทูตที่กำลังนำวิญญาณ — มารับ (pickup) ก่อน แล้วเดินนำหน้าวิญญาณตามเส้นทางเดียวกัน
 *  คืน { x, y, phase:'pickup'|'lead', face } */
export function escortCrewPosition(walk) {
  const e = walk.escort;
  if (!e) return null;
  const delay = walk.delay || 0;
  if (walk.elapsed < delay && e.pickup?.length) {
    const total = pathLength(e.pickup);
    const at = pointAtDistance(e.pickup, total * (walk.elapsed / delay));
    const ahead = pointAtDistance(e.pickup, total * Math.min(1, walk.elapsed / delay) + 6);
    return { x:at[0], y:at[1], phase:'pickup', face:ahead[0] < at[0] ? -1 : 1 };
  }
  const total = pathLength(walk.path);
  const d = soulProgress(walk) * total;
  const at = pointAtDistance(walk.path, Math.min(total, d + ESCORT_LEAD));
  const ahead = pointAtDistance(walk.path, Math.min(total, d + ESCORT_LEAD + 6));
  const prev = pointAtDistance(walk.path, Math.max(0, d + ESCORT_LEAD - 6));
  const dx = ahead[0] - prev[0];
  return { x:at[0], y:at[1], phase:'lead', face:Math.abs(dx) < 0.01 ? (e.face || 1) : dx < 0 ? -1 : 1 };
}

/** วิญญาณ (หรือใคร) อยู่ตรงตำแหน่งเดียวกับตอนที่ไม่มียมทูต: ใช้ความคืบหน้าที่หักช่วงรอแล้ว */
export function soulWalkPosition(walk) {
  return pointAtDistance(walk.path, soulProgress(walk) * pathLength(walk.path));
}
