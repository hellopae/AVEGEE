// wheel-place.js — ตำแหน่งวงคำสั่งในฉากต่อสู้ (I1-B ข้อ 2) · ฟังก์ชันล้วน ไม่แตะ DOM — ui.js วัดกรอบแล้วส่งเข้ามา
//
// กติกา: วงอยู่ "ขวาบนของตัวละครที่ถึงตา" ใกล้พอให้รู้ว่าเป็นของตัวนั้น แต่ไม่ทับตัวละคร (ฝั่งเรา/ศัตรู) และไม่ล้นกรอบฉาก
// กรอบภาพวงในแคนวาส 900×1100 (ตาราง petals ใน command-wheel.js): ลายวงกินพื้นที่ x 9.4%–95% · y 5.8%–95%
export const WHEEL_ART = Object.freeze({ x0:0.094, x1:0.95, y0:0.058, y1:0.95 });

const overlaps = (a, b, m = 2) => a.l < b.r - m && a.r > b.l + m && a.t < b.b - m && a.b > b.t + m;

/** คืน { left, top } (px ในพิกัดของกรอบฉาก) ของกล่องวง
 *  area = { w, h } ขนาดฉาก · wheel = { w, h } ขนาดกล่องวง
 *  me = { l, t, r, b } กรอบรูปตัวละครที่ถึงตา (รูปจริง ไม่รวมขอบโปร่งใสด้านข้าง) · team/foes = กรอบรูปตัวละครฝั่งเรา/ศัตรู (รวม me ได้) */
export function placeWheel({ area, wheel, me, team = [], foes = [], gap = 6 }) {
  const { x0, x1, y0, y1 } = WHEEL_ART, { w, h } = wheel;
  const clampL = v => Math.max(-x0 * w, Math.min(area.w - x1 * w, v));
  const clampT = v => Math.max(-y0 * h, Math.min(area.h - y1 * h, v));
  const left = clampL(me.r + gap - x0 * w);
  const art = t => ({ l:left + x0 * w, r:left + x1 * w, t:t + y0 * h, b:t + y1 * h });
  const hit = (t, boxes) => boxes.some(r => overlaps(art(t), r));
  // ก้นวงต้องอยู่เหนือหัวของตัวเราทุกตัวที่อยู่ขวาของผู้ถึงตา (รวมตัวเอง) ไม่งั้นวงไปทับหัวเพื่อนข้าง ๆ
  const headTop = Math.min(me.t, ...team.filter(r => r.r > me.l + 2).map(r => r.t));
  const base = clampT(headTop + 0.1 * (me.b - me.t) - y1 * h);
  // จอแนวตั้งแคบ: ศัตรูอยู่ขวาบนของทีมพอดี → ลองเลื่อนลงใต้ศัตรู แล้วยกเหนือศัตรู (ต้องกดเลือกเป้าหมายได้)
  // ถัดมา: ยกให้ก้นวงพ้นหัวทุกตัวเลย (ไม่เผื่อทับหัว) — กรณีตัวที่ถึงตาอยู่ซ้าย วงจะพาดเหนือหัวเพื่อนที่อยู่ขวา
  const candidates = [base, clampT(headTop - 4 - y1 * h)];
  if (foes.length) {
    candidates.push(clampT(Math.max(...foes.map(r => r.b)) + 4 - y0 * h), clampT(Math.min(...foes.map(r => r.t)) - 4 - y1 * h));
  }
  const top = candidates.find(t => !hit(t, foes) && !hit(t, team)) ?? candidates.find(t => !hit(t, foes)) ?? base;
  return { left, top, art:art(top) };
}

/** I1-B ข้อ 4 — ตำแหน่งปุ่ม "เก็บไอเท็มที่ตกอยู่" กลางด้านล่างของสนาม โดยไม่ทับการ์ดตัวละคร/ศัตรู
 *  area = { w, h } · btn = { w, h } · obstacles = กรอบการ์ด HUD/กล่องข้อความ (พิกัดในกรอบฉาก)
 *  คืน { x (ศูนย์กลางปุ่ม), y (ก้นปุ่ม) } — ตั้งต้นก้นปุ่ม = 96.5% ของความสูงฉาก (bottom 3.5%)
 *  ลองกลางช่องว่างระหว่างการ์ดซ้าย/ขวา → กลางฉาก → 68% แล้วเลือกตำแหน่งที่ต้องยกน้อยที่สุด · การ์ดเต็มแถวล่าง (ทีมครบบนจอแคบ) = ยกเหนือการ์ดที่ขวาง */
export function placeFinButton({ area, btn, obstacles = [], gap = 8 }) {
  const { w: W, h: H } = btn, base = area.h * 0.965;
  const bottomRow = obstacles.filter(r => r.t < base && r.b > base - H);
  const lo = Math.max(6, ...bottomRow.filter(r => (r.l + r.r) / 2 < area.w / 2).map(r => r.r + gap));
  const hi = Math.min(area.w - 6, ...bottomRow.filter(r => (r.l + r.r) / 2 >= area.w / 2).map(r => r.l - gap));
  const xs = [...(hi - lo >= W ? [(lo + hi) / 2] : []), area.w / 2, area.w * 0.68]
    .map(x => Math.max(W / 2 + 4, Math.min(area.w - W / 2 - 4, x)));
  const raise = x => {
    let y = base;
    for (let i = 0; i < 6; i++) {
      const hit = obstacles.filter(r => r.l < x + W / 2 && r.r > x - W / 2 && r.t < y && r.b > y - H);
      if (!hit.length) break;
      y = Math.min(...hit.map(r => r.t)) - gap;
    }
    return y;
  };
  return xs.map(x => ({ x, y:raise(x) })).sort((p, q) => q.y - p.y)[0];
}
