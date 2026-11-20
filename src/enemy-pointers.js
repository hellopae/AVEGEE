// enemy-pointers.js — ลูกศร / ตัวชี้บอกตำแหน่งศัตรูบนแผนที่ (คุณเป้ 14 พ.ย. 2569: "เมื่อมีปีศาจบุกเข้ามา เราไม่รู้ว่าอยู่ตำแหน่งไหนบนแผนที่")
// ไฟล์นี้ "คำนวณล้วน ๆ" ไม่แตะ DOM: ui.js เอาผลไปวาด (ดู updateEnemyPointers) และเทสต์เรียกตรง (tests/enemy-pointers.test.mjs)
//   1) enemyPointerTargets(g)   → รายการศัตรูทุกตัวที่ผู้เล่นต้อง "เดินไปหา" ตอนนี้ (พิกัดโลก)
//   2) layoutPointers(...)      → ศัตรูในจอ = ตัวชี้เหนือหัว · ศัตรูนอกจอ = ลูกศรชิดขอบจอ (รวมตัวที่ใกล้กัน · หลบ HUD · ชี้ตรงไปที่ตัว)
// ศัตรูถูกปราบ/เหตุการณ์จบ = หายไปจากรายการเอง (ไม่มีสถานะเก็บค้าง) · แผนที่ซูมออกสุดจนเห็นทุกตัว = มีแต่ตัวชี้เหนือหัว
import { MOB, FRONTIER, ZONE_EVENTS } from './data.js';
import { waitingEvents } from './npc-stand.js';
import { devaMapActors } from './deva-map.js';
import { finalEventActors } from './final-event.js';
import { westRescuePending, WEST_RESCUE } from './west-events.js';

export const POINTER = Object.freeze({
  badge: 52,            // เส้นผ่านศูนย์กลางป้ายลูกศรบนจอ (px) — แตะง่ายด้วยนิ้ว
  tip: 15,              // หัวลูกศรยื่นออกนอกวงกลมป้ายกี่ px (ต้องตรงกับ .ep-dir i ใน enemy-pointers.css)
  edge: 5,              // ห่างขอบจอ (นอกเหนือจากครึ่งป้ายและหัวลูกศร)
  gap: 62,              // ลูกศรสองอันใกล้กันกว่านี้ (px ตามเส้นขอบจอ) = รวมเป็นอันเดียวมีเลข ×N
  maxArrows: 6,         // ลูกศรนอกจอสูงสุดพร้อมกัน (ใกล้สุด/สำคัญสุดมาก่อน)
  maxHeads: 10,         // ตัวชี้เหนือหัวสูงสุด
  tagLift: 38,          // เปรต/ปีศาจ event มีป้าย/ปุ่ม "กดเพื่อเข้าสู้" อยู่เหนือหัวแล้ว → ตัวชี้ยกสูงขึ้นอีกเท่านี้ ไม่ทับป้าย
  headGap: 34,          // ตัวชี้อยู่เหนือหัวศัตรู (px บนจอ) — เว้นที่ให้ป้าย "กดเพื่อเข้าสู้" ที่มีอยู่
  inView: 14,           // จุดกลางตัวต้องอยู่ในจอลึกเข้ามาเท่านี้ถึงนับว่า "อยู่ในจอ"
  metersPerUnit: 1 / 20, // ระยะที่โชว์: หน่วยแผนที่ → "เมตร" คร่าว ๆ (ปัดเป็นห้า)
  peekMs: 2600,         // กดลูกศรแล้วกล้องไปดูศัตรูกี่ ms ก่อนกลับมาตามยมบาท
  charH: 96,            // ความสูงเริ่มต้นของตัวศัตรูบนแผนที่ (หน่วยแผนที่ ก่อนคูณสเกลตัวละคร)
});

/** ศัตรูทุกตัวที่ผู้เล่นต้องเดินไปหาบนแผนที่ตอนนี้ — พิกัดโลก
 *  { id, kind, x, y, h, icon, priority, boss }  priority: ยิ่งน้อยยิ่งสำคัญ (ลูกศรเต็มก่อน) · icon: ให้ ui.js แปลงเป็นรูป
 *  ตัดทิ้งโดยตั้งใจ: บอสโซนที่เฝ้าสะพาน (ท้าเมื่อไรก็ได้ ไม่ใช่ "ต้องไปหา") — ดูรายงาน "ต้องให้คุณเป้ตัดสิน" */
export function enemyPointerTargets(g) {
  if (!g || g.over || g.battle) return [];
  const out = [];
  const rescue = westRescuePending(g);
  // ปีศาจ/วิญญาณที่เดินบนแผนที่: ปีศาจ event (คุกแตก / ไฟไหม้คุก ฯลฯ) สำคัญสุด · เปรตทั่วไปรองลงมา
  // จ้างยักษ์ทวารบาลแล้ว เปรตทั่วไปเป็นงานของยักษ์ (ไม่มีปุ่มสู้ให้ผู้เล่น) → ไม่ชี้ · ปีศาจ event ยังชี้
  const guarded = typeof g.guardActive === 'function' && g.guardActive();
  if (!rescue) for (const m of g.mobs || []) {
    const raider = !!m.eventKey;
    if (!raider && guarded) continue;
    out.push({ id:`mob:${m.id}`, kind:raider ? 'raider' : 'mob', x:m.x, y:m.y, h:MOB.h, priority:raider ? 1 : 4, lift:POINTER.tagLift,
      icon:{ art:m.eventArt || MOB.kinds[m.kind ?? 0]?.img || MOB.img }, boss:false });
  }
  // โซน 2–4 + ชายแดนโซน 1: ปีศาจที่บุกรออยู่ที่ประตูชายแดน (ไม่มีตัวเดินบนแผนที่) → ชี้ที่ประตู
  const frontier = (ZONE_EVENTS[g.zone] || []).find(ev => ev.team === 'frontier' &&
    g.zoneEventStatus?.(ev.k) === 'pending' && !(ev.k === 'frontierBreach' && g.devaTestStatus?.() !== 'cleared'));
  if (frontier) out.push({ id:`frontier:${frontier.k}`, kind:'frontier', x:FRONTIER.x, y:FRONTIER.y, h:150, priority:0,
    icon:{ event:frontier }, boss:true });
  // ผู้ท้าชิงที่ยืนรอที่ท่าเรือ (หงอคง · เทวดาทดสอบ · พี่ใหญ่ · หนุมาน ...)
  for (const ev of waitingEvents(g)) out.push({ id:`wait:${ev.key}`, kind:'waiting', x:ev.x, y:ev.y, h:90, priority:2,
    icon:{ art:ev.art }, boss:true });
  // เทวดาทดสอบที่ลงมา / ศึกสุดท้ายโซน 4 (เฉพาะตัวที่ถึงคิวสู้)
  for (const a of devaMapActors(g)) if (a.enabled) out.push({ id:a.id, kind:'deva', x:a.x, y:a.y, h:100, priority:2,
    icon:{ art:a.art, zone:a.sourceZone }, boss:true });
  for (const a of finalEventActors(g)) if (a.enabled && !a.reinforcement && !a.bound) out.push({ id:`final:${a.id}`, kind:'final', x:a.x, y:a.y, h:78, priority:2,
    icon:{ art:a.art, zone:a.sourceZone }, boss:true });
  // ช่วยทัณฑ์/พ่อค้า (โซน 3): ปีศาจรุมอยู่จุดเดียว
  if (rescue) out.push({ id:'rescue:west', kind:'raider', x:WEST_RESCUE.x, y:WEST_RESCUE.y, h:72, priority:1,
    icon:{ art:'mob-skeleton' }, boss:false });
  return out;
}

/** ระยะโลก → ตัวเลขที่โชว์ ("เมตร" คร่าว ๆ ปัดเป็นห้า ขั้นต่ำ 5) */
export const roughDistance = units => Math.max(5, Math.round(units * POINTER.metersPerUnit / 5) * 5);

// ---------- เรขาคณิตขอบจอ ----------
/** ตำแหน่งบนเส้นรอบรูปสี่เหลี่ยม [x0,y0,x1,y1] ตามเข็มนาฬิกาจากมุมซ้ายบน: พารามิเตอร์ s ∈ [0, P) */
export function perimeterPoint(r, s) {
  const [x0, y0, x1, y1] = r, w = x1 - x0, h = y1 - y0, P = 2 * (w + h);
  s = ((s % P) + P) % P;
  if (s <= w) return { x:x0 + s, y:y0 };
  if (s <= w + h) return { x:x1, y:y0 + (s - w) };
  if (s <= 2 * w + h) return { x:x1 - (s - w - h), y:y1 };
  return { x:x0, y:y1 - (s - 2 * w - h) };
}
/** จุดบนเส้นรอบรูป → พารามิเตอร์ s (จุดต้องอยู่บนเส้นรอบรูปอยู่แล้ว) */
export function perimeterParam(r, p) {
  const [x0, y0, x1, y1] = r, w = x1 - x0, h = y1 - y0, eps = 1e-6;
  if (Math.abs(p.y - y0) < eps) return p.x - x0;
  if (Math.abs(p.x - x1) < eps) return w + (p.y - y0);
  if (Math.abs(p.y - y1) < eps) return w + h + (x1 - p.x);
  return 2 * w + h + (y1 - p.y);
}
/** รังสีจากกลางสี่เหลี่ยมไปทิศ (dx,dy) ตัดขอบสี่เหลี่ยม r ตรงไหน */
export function rayToRect(r, dx, dy) {
  const [x0, y0, x1, y1] = r, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const hw = (x1 - x0) / 2, hh = (y1 - y0) / 2;
  if (!dx && !dy) return { x:cx, y:y0 };
  const k = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
  return { x:cx + dx * k, y:cy + dy * k };
}
const overlaps = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
const boxAt = (p, r) => [p.x - r, p.y - r, p.x + r, p.y + r];
const circular = (a, b, P) => { const d = Math.abs(a - b) % P; return Math.min(d, P - d); };

/** จัดตำแหน่งตัวชี้ทั้งหมดบนจอ
 *  @param targets  จาก enemyPointerTargets
 *  @param view     { width, height, sx, sy, tx, ty }  (mapViewport — แปลงพิกัดโลก → พิกเซลจอ: x*sx+tx)
 *  @param opts     { player:{x,y}, charScale, safe:{t,r,b,l}, blockers:[[x0,y0,x1,y1],…] (ส่วนของ HUD ที่ห้ามทับ) }
 *  @returns { heads:[{id,kind,x,y,target}], arrows:[{id,x,y,angle,dist,count,members:[target…],target}] }  x,y = พิกัดจอ (กึ่งกลางป้าย / ปลายลูกศรบนหัว) */
export function layoutPointers(targets, view, opts = {}) {
  const heads = [], arrows = [];
  if (!view || !view.sx || !view.sy || !view.width || !view.height) return { heads, arrows };
  const { width: W, height: H } = view;
  const player = opts.player || { x:0, y:0 }, cs = opts.charScale || 1;
  const safe = { t:0, r:0, b:0, l:0, ...(opts.safe || {}) };
  const blockers = opts.blockers || [];
  const R = POINTER.badge / 2, m = R + POINTER.tip + POINTER.edge;
  const rect = [safe.l + m, safe.t + m, W - safe.r - m, H - safe.b - m];
  if (rect[2] <= rect[0] || rect[3] <= rect[1]) return { heads, arrows };
  const far = [];
  for (const tg of targets) {
    const px = tg.x * view.sx + view.tx, py = tg.y * view.sy + view.ty;
    const bodyY = py - (tg.h || POINTER.charH) * cs * view.sy / 2;
    const dist = Math.hypot(tg.x - player.x, tg.y - player.y);
    const ins = POINTER.inView;
    if (px >= ins && px <= W - ins && bodyY >= ins && bodyY <= H - ins) {
      const headY = py - (tg.h || POINTER.charH) * cs * view.sy;
      heads.push({ id:tg.id, kind:tg.kind, x:px, y:Math.max(safe.t + 22, headY - POINTER.headGap - (tg.lift || 0)), dist, target:tg });
    } else far.push({ tg, px, py: bodyY, dist });
  }
  heads.sort((a, b) => a.dist - b.dist); heads.length = Math.min(heads.length, POINTER.maxHeads);
  // ลูกศรนอกจอ: สำคัญก่อน แล้วใกล้ก่อน — ตัวที่ใกล้กันบนขอบจอรวมกัน
  far.sort((a, b) => a.tg.priority - b.tg.priority || a.dist - b.dist);
  const P = 2 * ((rect[2] - rect[0]) + (rect[3] - rect[1]));
  const cx = W / 2, cy = H / 2;
  for (const f of far) {
    const hit = rayToRect(rect, f.px - cx, f.py - cy);
    const s = perimeterParam(rect, hit);
    const merge = arrows.find(a => circular(a.s, s, P) < POINTER.gap);
    if (merge) { merge.count++; merge.members.push(f.tg); continue; }
    if (arrows.length >= POINTER.maxArrows) continue;
    // หลบ HUD: เลื่อนไปตามขอบจอทีละก้าว สลับซ้าย/ขวา จนเจอที่ว่าง (ไม่ทับ HUD ไม่ชนลูกศรอื่น)
    let pos = hit, at = s, step = 8, ok = false;
    for (let k = 0; k <= Math.floor(P / 2 / step); k++) {
      for (const sign of k ? [1, -1] : [1]) {
        const ss = s + sign * k * step, p = perimeterPoint(rect, ss), box = boxAt(p, R);
        if (blockers.some(b => overlaps(box, b))) continue;
        if (arrows.some(a => circular(a.s, ss, P) < POINTER.gap)) continue;
        pos = p; at = ss; ok = true; break;
      }
      if (ok) break;
    }
    if (!ok) continue;
    const angle = Math.atan2(f.py - pos.y, f.px - pos.x);
    arrows.push({ id:f.tg.id, kind:f.tg.kind, x:pos.x, y:pos.y, s:at, angle, dist:f.dist, count:1, members:[f.tg], target:f.tg });
  }
  for (const a of arrows) {
    // ป้ายรวม: โชว์ตัวที่ใกล้สุดเป็นหลัก · ระยะ = ตัวที่ใกล้สุดในกลุ่ม
    const d = t => Math.hypot(t.x - player.x, t.y - player.y);
    a.members.sort((p, q) => p.priority - q.priority || d(p) - d(q));
    a.target = a.members[0]; a.id = a.target.id; a.kind = a.target.kind;
    a.dist = Math.min(...a.members.map(d));
  }
  return { heads, arrows };
}
