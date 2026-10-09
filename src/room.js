import { actorStanding } from './actor-recovery.js';
import { drawYamaSword, SWORD_DURATION_MS } from './yama-sword.js';
import { fitSoulName, soulNameplateWidth } from './soul-nameplate.js';
import { potLayout, drawPotSoul } from './pot-souls.js';
import { TEA_SLEEP_MS, TEA_BLACKOUT_MS, TEA_WAKE_MS, TEA_REST_TOTAL_MS, teaSleepPhase, teaRecoveredHp, roomImageBox } from './tea-recovery.js';
import { regenMp } from './mp-regen.js';
// room.js — ฉากภายในของสถานีหนึ่งหลัง (10 ก.ย. 2569)
//
// ห้องสถานีแสดงวิญญาณ ผู้คุม และตัวละครที่ผู้เล่นบังคับเดินได้
//
// เดิมหน้าสถานีเป็นการ์ดนิ่ง ๆ วางรูปวิญญาณเรียงกันหน้าฉาก — ไม่มีอะไรให้ทำนอกจากกดปุ่ม
// ตอนนี้เป็นฉากจริง: ภาพที่เจ้าของวาดวางเต็มกรอบ (contain ไม่ครอป จุดยึดจะได้ตรงเสมอ)
// แล้วโค้ดวางคน "ตามจุดยึด" ที่วัดจากภาพนั้นเป็นสัดส่วน 0-1
//
// **จุดยึดอยู่ที่ ROOMS ใน data.js ที่เดียว** — วาดฉากใหม่/เปลี่ยนภาพ แก้ตัวเลขชุดเดียวจบ
// ไม่มีพิกัดพิกเซลฝังอยู่ในไฟล์นี้เลย

import { walkDirection } from './walk-direction.js';
import { walkStridePx, walkSlices, walkDrawDistance, WALK_GRACE_MS, WALK_MAX_CATCHUP_MS } from './walk-motion.js';
import { ITEMS, BAL } from './data.js';
import { drawStandee, drawHeroWalk, drawSoul, img, rr } from './art.js';
import { t as tr } from './i18n.js';

const HERO_H = 0.15;      // ความสูงตัวละครเทียบกับด้านสั้นของกรอบภาพ
const CREW_H = 0.13;
const SOUL_H = 0.085;     // วิญญาณเล็กกว่าคนเป็น — ต้องพอดีปากกระทะ ไม่ใช่ล้นออกมา
const REACH  = 0.17;      // ระยะเอื้อมถึงจุดลงมือ — ยืนใกล้ ๆ ก็พอ ไม่ต้องเดินจ่อ

/** ตรวจตลอดทางในหนึ่งเฟรม ไม่ให้ก้าวข้ามช่องที่ห้ามเดินซึ่งแคบกว่าระยะก้าว */
export function walkSegmentInside(x1, y1, x2, y2, inArea) {
  const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 0.002));
  for (let i = 1; i <= steps; i++) {
    const f = i / steps;
    if (!inArea(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f)) return false;
  }
  return true;
}

const bgCache = new Map();
const lumCache = new Map();

/** ปรับแสงฉากให้เท่ากันทุกห้อง — ภาพที่เจ้าของวาดมาสว่างไม่เท่ากัน
 *  หอทะเบียนกรรมมืดกว่าห้องอื่นราวหนึ่งในสาม เข้าไปแล้วแทบมองไม่เห็นอะไรเลย
 *  (เจ้าของเจอ 10 ก.ย. 2569) · วัดความสว่างเฉลี่ยจากภาพย่อครั้งเดียวแล้วจำไว้
 *  ห้องไหนอยากคุมเองก็ใส่ bright ใน ROOMS ทับได้ */
// เป้าความสว่างเฉลี่ยของฉากในห้อง (0-255)
// 74 ยังมืดเกินไปบนจอจริง เจ้าของบอกว่า "มืดทุกหน้าเลย" (10 ก.ย. 2569)
const LUM_TARGET = 86;

/** เบราว์เซอร์นี้ตั้ง ctx.filter ได้ไหม — เช็คครั้งเดียว
 *  (เช็คหลัง restore ไม่ได้ เพราะค่ามันถูกคืนกลับเป็น none เสมอ ไม่ว่าจะรองรับหรือไม่) */
let filterOk = null;
function canFilter() {
  if (filterOk !== null) return filterOk;
  try {
    const c = document.createElement('canvas').getContext('2d');
    c.filter = 'brightness(1.2)';
    filterOk = c.filter !== 'none' && c.filter !== '';
  } catch { filterOk = false; }
  return filterOk;
}
/** เบราว์เซอร์นี้ผสมสีแบบ color/multiply บน canvas ได้ไหม — เช็คครั้งเดียว
 *  ถ้าไม่ได้ ค่า globalCompositeOperation จะถูกเมินเงียบ ๆ แล้วสีทองกับไล่เงาจะถูกวาด "ทับ" ฉากทั้งใบ
 *  กรณีนั้นข้ามการย้อมแสงไปเลยดีกว่า (เห็นฉากสว่างเกิน ดีกว่าเห็นแผ่นสีทึบ) */
let blendOk = null;
function canBlend() {
  if (blendOk !== null) return blendOk;
  try {
    const c = document.createElement('canvas').getContext('2d');
    c.globalCompositeOperation = 'color';
    const a = c.globalCompositeOperation;
    c.globalCompositeOperation = 'multiply';
    blendOk = a === 'color' && c.globalCompositeOperation === 'multiply';
  } catch { blendOk = false; }
  return blendOk;
}

/** ลดแสงฉากที่ "สว่างเกิน" ลงมา — ค่าอยู่ที่ ROOMS[k].light ใน data.js (ตอนนี้มีแค่ประตูสวรรค์)
 *  brightOf() ข้างล่างยกแสงได้อย่างเดียว (Math.max(1, …)) ภาพที่สว่างเกินจึงหลุดผ่านไปทั้งใบ
 *  ประตูสวรรค์ความสว่างเฉลี่ย 195 ขาวจ้าเกือบครึ่งภาพ ขณะที่ห้องอื่นอยู่ราว 45-93 (เจ้าของเจอ 10 ก.ย. 2569)
 *  shade ไล่เงาเทากลางแบบ multiply เป็นวงรอบ at (ประตู) ตรงกลางมืดน้อย ขอบมืดมาก
 *              ประตูจึงยังเป็นจุดที่สว่างที่สุดในภาพ = ยังดูออกว่าแสงมาจากสวรรค์
 *  ไฟล์ภาพไม่ถูกแก้ — ถ้าวาดฉากใหม่ให้โทนถูกแล้ว ลบ light ออกจาก ROOMS ได้เลย */
function applyLight(ctx, L, box) {
  if (!L || !canBlend()) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(box.ox, box.oy, box.w, box.h); ctx.clip();
  if (L.tint) {
    ctx.globalCompositeOperation = 'color';
    ctx.globalAlpha = L.mix ?? 0.5;
    ctx.fillStyle = L.tint;
    ctx.fillRect(box.ox, box.oy, box.w, box.h);
  }
  if (L.shade) {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'multiply';
    const at = L.at || [0.5, 0.5];
    const cx = box.ox + at[0] * box.w, cy = box.oy + at[1] * box.h;
    const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(box.w, box.h) * (L.r ?? 0.75));
    L.shade.forEach(([pos, col]) => gr.addColorStop(pos, col));
    ctx.fillStyle = gr;
    ctx.fillRect(box.ox, box.oy, box.w, box.h);
  }
  ctx.restore();
}

function brightOf(bg, src) {
  if (lumCache.has(src)) return lumCache.get(src);
  let f = 1;
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 48;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(bg, 0, 0, 48, 48);
    const d = x.getImageData(0, 0, 48, 48).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
    const mean = sum / (d.length / 4);
    f = Math.max(1, Math.min(2.4, LUM_TARGET / Math.max(1, mean)));
  } catch { f = 1; }
  lumCache.set(src, f);
  return f;
}
/** โหลดภาพฉากของสถานี — ไม่มีไฟล์ก็ถอยไปเวทีกลาง */
function bgOf(src, fallback) {
  if (bgCache.has(src)) { const r = bgCache.get(src); return r.ok ? r.el : (fallback ? bgOf(fallback) : null); }
  const el = new Image();
  const rec = { el, ok: false };
  el.onload = () => { rec.ok = true; };
  el.onerror = () => { rec.ok = false; };
  el.src = src;
  bgCache.set(src, rec);
  return null;
}

/** ฉากภายในหนึ่งห้อง — เรียก destroy() ทุกครั้งที่ปิดหน้า ไม่งั้นลูปเฟรมค้างอยู่ตลอดเกม */
export function makeRoom(cv, g, def, room, bgSrc, bgFallback, alive = () => true) {
  const P = { x: room.me[0], y: room.me[1], tx: null, ty: null, face: 1 };
  const mirrorRoom = !!room.mirror;       // 29M: ภาพศาลาไทยใหม่ไม่ต้องกลับซ้ายขวาแล้ว (บันไดอยู่ล่างขวาในไฟล์)
  const KEY = {};
  let raf = 0, last = performance.now(), dead = false;
  let box = { ox: 0, oy: 0, w: 1, h: 1 };     // กรอบที่ภาพฉากถูกวางจริงบน canvas

  /** ข้อ A คุณเป้ 24 ก.ย. 2569 — จุดนั่งพักฟื้นบารมี มีเฉพาะศาลาน้ำชา (def.k === 'tea')
   *  ใช้จุด "act" เดิมของห้องเป็นที่นั่ง (ศาลาไม่เคยมีปุ่มลงมืออื่นอยู่แล้ว ไม่ชนกัน)
   *  sitting=true ระหว่างนั่ง: ล็อกไม่ให้เดิน เติม MP ด้วยเวลาจริง (ไม่ผ่าน g.step() ที่พักไปพร้อมกล่องโมดัล)
   *  ลุกเองอัตโนมัติเมื่อเต็ม · ผู้เล่นกด "ลุกขึ้น" เองก่อนเต็มก็ได้ (ui.js เรียก api.setSit(false)) */
  const canSit = def.k === 'tea';
  let sitting = false, sipAt = 0, sipping = false;
  let lying = false, sleepElapsed = 0, recoverySleep = false, sleepStartHp = 0;
  const mpAcc = { frac:0 };   // เศษ MP ที่ยังไม่ครบหน่วย (ข้อ 5 ชุด 30B)
  // ข้อ 7 ใบงานชุดที่ 9 (มินิเกม "เร่งการทำงาน") — ระหว่างมินิเกมเปิดทับอยู่ ห้องนี้ต้อง
  // "เดินต่อได้ตามปกติแต่ไม่รับอินพุตซ้ำ" กันเว้นวรรค/ลูกศรของห้องไปชนกับปุ่มของมินิเกม
  // (คีย์บอร์ดผูกกับ window ทั้งคู่ ปิดจาก CSS อย่างเดียวไม่พอ) ui.js เรียก api.lock(true/false)
  let locked = false;
  // แอนิเมชันเดิน — ใช้สไปรท์เดินชุดเดียวกับบนแผนที่ (art.js drawHeroWalk) เฟรมเปลี่ยนตามระยะที่เดินจริง
  let walkDist = 0, simClock = 0, movedSim = -1e9, direction = 'down';
  // F1 — "กำลังเดิน" นับด้วยนาฬิกาของการเดินเอง (ไม่ใช่นาฬิกาเฟรม) เฟรมช้า/กระตุกจะได้ไม่สลับท่ายืน↔ท่าเดินมั่ว

  // ---- พิกัดสัดส่วน (0-1 ของภาพฉาก) → พิกเซลบน canvas ----
  const px = u => box.ox + (mirrorRoom ? 1 - u : u) * box.w;
  const py = v => box.oy + v * box.h;
  const unit = () => Math.min(box.w, box.h);     // ใช้คิดความสูงตัวละครให้คงที่ทุกอัตราส่วน

  // walk รองรับทั้งกรอบและ polygon — ฉากหน้าผาใช้ polygon เพื่อไม่ให้กรอบสี่เหลี่ยมคร่อมเหว
  const areas = Array.isArray(room.walk) && (Array.isArray(room.walk[0]) || room.walk[0]?.poly)
    ? room.walk : [room.walk];
  const insidePoly = (x, y, p) => {
    let hit = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const a = p[i], b = p[j];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
    }
    return hit;
  };
  const inArea = (x, y) => areas.some(a => a.poly ? insidePoly(x, y, a.poly)
                                                   : x >= a[0] && y >= a[1] && x <= a[2] && y <= a[3]);
  /** จุดที่เดินได้ซึ่งใกล้ (x,y) ที่สุด — ใช้ตอนแตะนอกพื้นที่ */
  const snap = (x, y) => {
    if (inArea(x, y)) return [x, y];
    let best = null, bd = Infinity;
    for (const a of areas) {
      if (!a.poly) {
        const cx = Math.max(a[0], Math.min(a[2], x)), cy = Math.max(a[1], Math.min(a[3], y));
        const d = Math.hypot(cx - x, cy - y);
        if (d < bd) { bd = d; best = [cx, cy]; }
        continue;
      }
      for (let i = 0; i < a.poly.length; i++) {
        const p = a.poly[i], q = a.poly[(i + 1) % a.poly.length];
        const vx = q[0] - p[0], vy = q[1] - p[1];
        const u = Math.max(0, Math.min(1, ((x - p[0]) * vx + (y - p[1]) * vy) / (vx * vx + vy * vy || 1)));
        const cx = p[0] + u * vx, cy = p[1] + u * vy, d = Math.hypot(cx - x, cy - y);
        if (d < bd) { bd = d; best = [cx, cy]; }
      }
    }
    return best || [x, y];
  };

  /** ยืนถึงจุดลงมือหรือยัง — ผู้เรียกใช้ตัดสินว่าปุ่มกดได้ไหม */
  const inTrainingReach = () => {
    const at = room.training || room.act;
    return Math.hypot(P.x-at[0], (P.y-at[1])*.7) <= REACH;
  };
  const inReach = () => Math.hypot(P.x - room.act[0], (P.y - room.act[1]) * 0.7) <= REACH;

  // ---- คีย์บอร์ด: กล่องโมดัลกินคีย์ของเกมหลักไปหมด ห้องนี้จึงต้องดักเอง ----
  const onKey = e => {
    if (/input|textarea/i.test(e.target.tagName)) return;
    if (locked || lying) return;         // มินิเกมกำลังเปิดอยู่ — ปล่อยให้มินิเกมจัดการคีย์เอง
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' '].includes(k)) {
      if (k === ' ') { e.preventDefault(); if (api.onAct) api.onAct(); return; }
      e.preventDefault();
      KEY[k] = e.type === 'keydown';
      if (e.type === 'keydown') { P.tx = null; P.ty = null; }
    }
  };
  addEventListener('keydown', onKey);
  addEventListener('keyup', onKey);

  // ---- แตะ/คลิกบนฉาก = เดินไปตรงนั้น ----
  const onDown = e => {
    if (locked || sitting || lying) return;              // มินิเกมกำลังเปิดอยู่ — แตะฉากไม่ให้ตัวละครเดิน
    // box อยู่ในหน่วยพิกเซลของ canvas (backing store) — แปลงพิกัดเมาส์ให้เป็นหน่วยเดียวกัน
    const r = cv.getBoundingClientRect();
    const cx = (e.clientX - r.left) / r.width * cv.width;
    const cy = (e.clientY - r.top) / r.height * cv.height;
    const visualX = (cx - box.ox) / box.w;
    const [tx, ty] = snap(mirrorRoom ? 1 - visualX : visualX, (cy - box.oy) / box.h);
    P.tx = tx; P.ty = ty;
  };
  cv.addEventListener('pointerdown', onDown);

  /** เริ่ม/เลิกนั่งพัก — ui.js ผูกกับปุ่ม "นั่งพัก"/"ลุกขึ้น" ในแผงขวา (เฉพาะศาลาน้ำชา)
   *  ต้องยืนถึงจุด (inReach) ถึงจะเริ่มนั่งได้ · ลุกได้ทุกเมื่อไม่มีเงื่อนไข */
  function setSit(on) {
    if (on) {
      if (lying || !canSit || !inReach() || g.mp >= g.mpMax) return false;
      sitting = true; sipAt = performance.now() + 1800; sipping = false;
      P.x = room.act[0]; P.y = room.act[1];
      P.tx = null; P.ty = null;
    } else {
      sitting = false;
    }
    return true;
  }

  function setSleep(emergency = false) {
    if (!canSit || lying || sitting || (!emergency &&
        (!g.teaBeds[g.zone] || Math.hypot(P.x-room.bed[0], P.y-room.bed[1]) > REACH || g.hp >= g.hpMax))) return false;
    lying = true; recoverySleep = emergency;
    sleepElapsed = emergency && g.pendingRecovery?.stage === 'wake' ? TEA_SLEEP_MS : 0;
    sleepStartHp = g.hp;
    P.x = room.bed[0]; P.y = room.bed[1]; P.tx = null; P.ty = null;
    return true;
  }

  function step(dt) {
    if (lying) {
      sleepElapsed += dt;
      g.hp = teaRecoveredHp(sleepStartHp, g.hpMax, sleepElapsed);
      if (sleepElapsed >= TEA_SLEEP_MS + TEA_BLACKOUT_MS && recoverySleep && g.pendingRecovery?.stage !== 'wake') g.finishTeaSleep();
      if (sleepElapsed >= TEA_REST_TOTAL_MS) {
        lying = false;
        P.x = room.bed[0]; P.y = room.bed[1] + 0.09;
        if (recoverySleep) g.completeTeaRecovery();
        else { g.hp = g.hpMax; g.save(); g.onChange(); }
      }
      return;
    }
    if (sitting) {
      // นั่งนิ่ง ไม่รับอินพุตเดินเลย — เติม MP ด้วยเวลาจริง (ห้องนี้เดินต่อได้แม้กล่องโมดัลจะพัก g.step() ไว้)
      if (g.mp < g.mpMax) {
        regenMp(g, mpAcc, dt);   // ชุด 30B ข้อ 5 — MP เป็นจำนวนเต็มเสมอ (ดู mp-regen.js)
        if (g.mp >= g.mpMax) sitting = false;
      } else sitting = false;
      const now = performance.now();
      if (now >= sipAt) { sipping = !sipping; sipAt = now + 1800 + Math.random() * 900; }
      return;
    }
    for (const slice of walkSlices(dt, Infinity)) walkStep(slice);   // F1: เดินทีละก้อนเล็ก (เวลานั่ง/นอนด้านบนใช้ dt เต็มเหมือนเดิม)
  }

  function walkStep(dt) {
    simClock += dt;
    // ความเร็วเดิน = ความสูงตัวละคร/วินาที (walk-motion.js) แปลงเป็นหน่วยของด้านสูงภาพฉาก — เท่ากันทุกจอ ทุกเฟรมเรต
    const sp = walkStridePx(unit() * HERO_H, dt) / box.h;
    let dx = 0, dy = 0;
    if (KEY.a || KEY.arrowleft) dx -= 1;
    if (KEY.d || KEY.arrowright) dx += 1;
    if (mirrorRoom) dx = -dx;
    if (KEY.w || KEY.arrowup) dy -= 1;
    if (KEY.s || KEY.arrowdown) dy += 1;
    if (!dx && !dy && P.tx != null) {            // เดินไปจุดที่แตะไว้
      dx = P.tx - P.x; dy = P.ty - P.y;
      if (Math.hypot(dx, dy) < 0.008) { P.tx = null; dx = dy = 0; }
    }
    const aspect = box.w / box.h;
    const d = Math.hypot(dx * aspect, dy);
    if (d > 0) {
      const stride = P.tx != null ? Math.min(sp, d) : sp;
      const nx = P.x + dx / d * stride, ny = P.y + dy / d * stride;
      // ชนขอบแล้วไถลไปตามแกนที่ยังไปได้ — เหมือน stepTo บนแผนที่ ไม่ติดหนึบที่มุม
      const bx = P.x, by = P.y;
      if (walkSegmentInside(bx, by, nx, ny, inArea)) { P.x = nx; P.y = ny; }
      else if (walkSegmentInside(bx, by, nx, by, inArea)) P.x = nx;
      else if (walkSegmentInside(bx, by, bx, ny, inArea)) P.y = ny;
      else P.tx = null;
      const stepPx = Math.hypot((P.x - bx) * box.w, (P.y - by) * box.h);
      if (stepPx > 0.05) { walkDist += stepPx; direction = walkDirection((P.x - bx) * box.w * (mirrorRoom ? -1 : 1), (P.y - by) * box.h, direction); movedSim = simClock; }
      if (Math.abs(dx) > 0.001) P.face = (mirrorRoom ? -dx : dx) < 0 ? -1 : 1;
    }
    const ii = g.items.findIndex(it => it.from === def.k);
    if (ii >= 0 && room.item && Math.hypot(P.x - room.item[0], (P.y - room.item[1]) * 0.75) < 0.055) {
      if (g.collectItem(ii) && api.onCollect) api.onCollect();
    }
  }

  function draw(t, st) {
    // ขนาดจริงของ canvas ต้องตามกรอบที่ CSS จัดให้ ไม่งั้นภาพถูกยืดผิดสัดส่วน
    // (ตั้ง width/height ไว้ตายตัวใน HTML แล้วปล่อยให้ CSS ยืด = ฉากบิดทั้งใบ)
    //
    // **วาดด้วยพิกเซลของ canvas ตรง ๆ ทั้งไฟล์** ไม่ตั้ง transform ตาม dpr
    // ทุกขนาด (ตัวละคร ตัวหนังสือ หลอด) คิดเป็นสัดส่วนของ U ซึ่งมาจากกรอบภาพจริง
    // จอ dpr เท่าไหร่ก็ได้สัดส่วนเดียวกัน — เคยตั้ง transform แล้วมีจุดที่ผสมหน่วยกัน
    // จนตัวละครใหญ่ผิดขนาดหลายเท่า (เจ้าของเจอ 10 ก.ย. 2569: วิญญาณล้นทั้งจอ)
    const dpr = Math.min(2, devicePixelRatio || 1);
    const rect = cv.getBoundingClientRect();
    const bw = Math.max(64, Math.round((rect.width || cv.clientWidth || 640) * dpr));
    const bh = Math.max(64, Math.round((rect.height || cv.clientHeight || 420) * dpr));
    if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
    const W = bw, H = bh;
    const ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;

    // ---- ฉาก: โซน 1 บนจอกว้างใช้พื้นที่เต็มกรอบ; จอเล็กยังคงสัดส่วนภาพเดิม ----
    // room.crop = [sx,sy,sw,sh] สัดส่วน 0-1 ของภาพต้นฉบับ — ถ้ามี ตัดเฉพาะส่วนนั้นมาขยายเต็มกรอบ
    // แทนที่จะยัดภาพทั้งใบ (ใช้ซูมเข้าไปในอาคารโดยไม่ต้องวาดภาพใหม่ — ข้อ D คุณเป้ 24 ก.ย. 2569)
    // จุดยึด (me/walk/act/item) ของห้องที่มี crop ต้องวัดใหม่เทียบกับกรอบที่ครอปแล้ว ไม่ใช่ภาพเต็มอีกต่อไป
    const bg = bgOf(bgSrc, bgFallback) || (bgFallback ? bgOf(bgFallback) : null);
    if (bg && bg.naturalWidth) {
      const crop = room.crop;
      const sx = crop ? crop[0] * bg.naturalWidth  : 0;
      const sy = crop ? crop[1] * bg.naturalHeight : 0;
      const sw = crop ? crop[2] * bg.naturalWidth  : bg.naturalWidth;
      const sh = crop ? crop[3] * bg.naturalHeight : bg.naturalHeight;
      // ภาพฉากวางแบบ contain ไม่ยืด/ไม่ครอปซ้ำ — โซน 1 ใช้ room.crop ตัดแถบกว้างตามแบบ UI4 มาแล้ว
      // กรอบหน้าสถานีบนจอกว้างมีสัดส่วนเท่ากับแถบนั้น จึงเต็มพอดี
      box = roomImageBox(W, H, sw, sh, canSit || room.cover);
      ctx.fillStyle = '#120810'; ctx.fillRect(0, 0, W, H);
      // ห้องศาลาโซนไทยใช้ภาพฉากเดิม แต่หันให้ตรงกับสไปรท์บนแผนที่;
      // จุดเดิน/จุดนั่งแปลงผ่าน px และ pointer เพื่อให้ยังตรงกับภาพที่กลับด้าน
      const drawRoomBg = () => {
        ctx.save();
        if (mirrorRoom) { ctx.translate(box.ox * 2 + box.w, 0); ctx.scale(-1, 1); }
        ctx.drawImage(bg, sx, sy, sw, sh, box.ox, box.oy, box.w, box.h);
        ctx.restore();
      };
      // ยกแสงเฉพาะภาพฉาก ตัวละครไม่โดนด้วย จะได้ยังเด่นอยู่บนพื้นหลัง
      const bf = room.bright || brightOf(bg, bgSrc);
      if (Math.abs(bf - 1) > 0.02 && canFilter()) {
        ctx.save();
        ctx.filter = `brightness(${bf.toFixed(2)})`;
        drawRoomBg();
        ctx.restore();
      } else if (bf > 1.02) {                            // ไม่รองรับ filter — ทับอีกชั้นแบบบวกแสง
        drawRoomBg();
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.5, (bf - 1) * 0.7);
        drawRoomBg();
        ctx.restore();
      } else drawRoomBg();
      applyLight(ctx, room.light, box);                 // ห้องที่สว่างเกิน — ย้อมลงเฉพาะภาพฉาก
    } else {
      box = { ox: 0, oy: 0, w: W, h: H };
      ctx.fillStyle = '#221324'; ctx.fillRect(0, 0, W, H);
    }

    const U = unit();

    // ---- วงแหวนบอกจุดลงมือ ----
    const ax = px(room.act[0]), ay = py(room.act[1]);
    const q = 0.5 + 0.5 * Math.sin(t / 300);
    const near = inReach();
    ctx.strokeStyle = near ? `rgba(255,205,120,${0.55 + q * 0.45})` : 'rgba(255,205,120,.30)';
    ctx.lineWidth = 2.5;
    if (!sitting && !lying) {
      ctx.beginPath(); ctx.ellipse(ax, ay, U * 0.075, U * 0.028, 0, 0, 7); ctx.stroke();
    }

    if (room.training) {
      const [x,y] = room.training, ready = inTrainingReach();
      ctx.strokeStyle = ready ? '#ffe29a' : 'rgba(255,226,154,.65)';
      ctx.beginPath(); ctx.ellipse(px(x),py(y),U*.065,U*.022,0,0,Math.PI*2); ctx.stroke();
      ctx.font = `${Math.max(12,U*.023)}px sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe29a'; ctx.fillText('จุดฝึก',px(x),py(y)+U*.045);
    }
    const chains = (x,y) => {
      if(def.k !== 'tarang') return;
      ctx.save();ctx.strokeStyle='#a7a4a1';ctx.lineWidth=Math.max(1,U*.0018);
      for(const side of [-1,1]) {
        const ax=x+side*U*.025, ay=y-U*SOUL_H*.42;
        const bx=x+side*U*.065, by=y+U*.012;
        for(let i=0;i<10;i++) {
          const f=i/9, lx=ax+(bx-ax)*f, ly=ay+(by-ay)*f+Math.sin(f*Math.PI)*U*.012;
          ctx.beginPath();ctx.ellipse(lx,ly,U*.004,U*.0025,i%2?Math.PI/3:-Math.PI/3,0,Math.PI*2);ctx.stroke();
        }
        ctx.beginPath();ctx.ellipse(ax,ay,U*.008,U*.003,0,0,Math.PI*2);ctx.stroke();
      }
      ctx.restore();
    };
    // ---- คนทั้งห้อง เรียงจากหลังมาหน้า ----
    const acts = [];
    (st ? st.slots : []).forEach((sl, i) => {
      const a = room.souls[i] || room.souls[room.souls.length - 1];
      if (!a) return;
      acts.push({ y: a[1], fn: () => {
        const x = px(a[0]), y = py(a[1]);
        // F2 ข้อ 5: กระทะทองแดง — วิญญาณยืนในกระทะ มีไฟลุกใต้ตัว (src/pot-souls.js) · แท่นเดิมเหลือไว้เป็นจุดวางชื่อ/หลอดความคืบหน้า
        const pot = def.k === 'krata' ? potLayout(bgSrc) : null;
        if (pot) drawPotSoul(ctx, pot, i, { px, py, U, t }, (sx, sy) => drawSoul(ctx, sx, sy, U * SOUL_H, t + sl.soul.id * 200, '#ffd9c0', sl.soul.sp || 7));
        else drawSoul(ctx, x, y, U * SOUL_H, t + sl.soul.id * 200, '#ffd9c0', sl.soul.sp || 7);
        chains(x,y);
        const p = Math.min(1, sl.progress / sl.need);
        const bw = U * 0.09, bh2 = Math.max(4, U * 0.011);
        ctx.fillStyle = 'rgba(0,0,0,.72)'; rr(ctx, x - bw / 2, y + U * 0.012, bw, bh2, bh2 / 2); ctx.fill();
        ctx.fillStyle = def.fx === 'fx-ice' ? '#8fd8ff' : '#ff9d3a';
        rr(ctx, x - bw / 2, y + U * 0.012, bw * p, bh2, bh2 / 2); ctx.fill();
        // ชื่อสลับสูง-ต่ำทีละดวง + ตัดให้สั้น ไม่งั้นสามดวงที่ยืนใกล้กันป้ายทับกันจนอ่านไม่ออก
        const nm = sl.soul.who.length > 9 ? sl.soul.who.slice(0, 8) + '…' : sl.soul.who;
        if (def.k === 'tarang') soulNameplate(ctx, sl.soul.name || sl.soul.who, x, y, U, soulNameplateWidth(room.souls, i, box.w, U));
        else soulLabel(ctx, nm, x, y + U * 0.033 + (i % 2) * U * 0.024, U);
      } });
    });

    if (def.k === 'tarang' || def.k === 'sawan') {
      const stage = def.k === 'tarang' ? 'prison' : 'gate';
      const occupied = st?.slots.length || 0;
      const waiting = [
        ...(def.k === 'tarang' ? (g.held || []).map(soul => ({ soul })) : []),
        ...(g.sentences || []).filter(x => x.zone === g.zone && x.stage === stage),
      ].slice(0, Math.max(0, room.souls.length - occupied));
      waiting.forEach((entry, i) => {
        const a = room.souls[i + occupied];
        acts.push({ y:a[1], fn:() => {
          const x = px(a[0]), y = py(a[1]);
          drawSoul(ctx, x, y, U * SOUL_H, t + entry.soul.id * 200,
                   entry.inspected || entry.checked ? '#d4f9cf' : '#ffd9c0', entry.soul.sp || 7);
          chains(x,y);
          if (def.k === 'tarang') soulNameplate(ctx, entry.soul.name || entry.soul.who, x, y, U,
            soulNameplateWidth(room.souls, i + occupied, box.w, U));
          else soulLabel(ctx, entry.soul.name || entry.soul.who, x, y + U * 0.036 + (i % 2) * U * 0.024, U);
        } });
      });
    }
    // (ชุด 27A: ตัดป้ายชื่อใต้ NPC/ผู้คุม/ของในฉากออก — แบบ UI4 ไม่มีตัวหนังสือบนฉาก)
    // NPC ประจำห้อง — นิรา (ตะราง) / บุญ (ประตูสวรรค์) / กานต์ (หอส่องกรรม ข้อ A-2 คุณเป้ 24 ก.ย. 2569)
    // กานต์เป็นยมทูตตัวเดียวกับใน CREW (ใช้ภาพ crew-kan เดิม ไม่วาดใหม่ — ตามข้อห้ามใบงาน "ห้ามใช้ภาพอื่นแทน")
    // ข้อ I-2 คุณเป้เจอ 25 ก.ย. 2569 — ประตูสวรรค์ (sawan) มอบหมายผู้คุมได้จริงผ่านระบบเดียวกับ
    // สถานีลงทัณฑ์ทั่วไป (pow:6 > 0) ถ้าผู้เล่นสั่งให้ "บุญ" (ตัวเดียวกับ NPC ประจำห้องนี้) เข้าเวร
    // จะมีทั้ง NPC ประจำห้อง (บล็อกนี้) และผู้คุมเข้าเวร (บล็อกด้านล่าง room.crew+0.13) วาดพร้อมกัน
    // กลายเป็น "บุญ" สองตัวยืนคนละจุด — ตัวที่เข้าเวรจริงต้องมาแทนตัวประจำ ไม่ใช่ยืนคู่กัน
    // (ตะราง/หอส่องกรรมไม่เจอเคสนี้: นิราเป็น reader ห้ามมอบหมาย · กานต์ที่หอส่องกรรม pow:0 ไม่เคยมี crewK)
    // ซ้ำกับผู้คุมเข้าเวรด้านล่างเฉพาะตอน "ตัวเดียวกัน" เข้าเวรอยู่จริง (เช่น บุญเข้าเวรที่ sawan เอง)
    // ถ้าเข้าเวรเป็นคนอื่น (เช่น ดำมาคุมแทน) NPC ประจำห้องยังต้องยืนอยู่ตามปกติ ไม่ใช่หายไปด้วย
    if ((def.k === 'tarang' || def.k === 'sawan' || def.k === 'krajok')) {
      const key = def.k === 'tarang' ? 'nira' : def.k === 'sawan' ? 'boon' : 'kan';
      const name = def.k === 'tarang' ? 'นิรา' : def.k === 'sawan' ? 'บุญ' : 'กานต์';
      if (!(st && st.crewK === key)) {
        const a = room.crew || [0.30,0.80];
        acts.push({ y:a[1], fn:() => {
          const x = px(a[0]), y = py(a[1]);
          drawStandee(ctx, 'crew-' + key, x, y, U * CREW_H, t, name);
        } });
      }
    }

    if (st && st.crewK && room.crew) {
      const c = g.crewOf(st.crewK);
      const guard = room.guard || [room.crew[0] + (def.k === 'sawan' || def.k === 'tarang' ? 0.13 : 0), room.crew[1]];
      if (actorStanding(c) && !c.self) acts.push({ y: guard[1], fn: () => {
        const x = px(guard[0]), y = py(guard[1]);
        drawStandee(ctx, 'crew-' + c.k, x, y, U * CREW_H, t, c.glyph, room.crew[0] < room.act[0] ? 1 : -1);
      } });
    }

    const roomItem = g.items.find(it => it.from === def.k);
    if (roomItem && room.item) {
      const itemDef = ITEMS[roomItem.k];
      acts.push({ y: room.item[1], fn: () => {
        const x = px(room.item[0]), y = py(room.item[1]);
        const pulse = 0.5 + 0.5 * Math.sin(t / 420);
        ctx.fillStyle = `rgba(255,215,125,${0.12 + pulse * 0.18})`;
        ctx.beginPath(); ctx.arc(x, y - U * 0.035, U * 0.07, 0, 7); ctx.fill();
        drawStandee(ctx, itemDef.img, x, y, U * 0.085, t, itemDef.glyph || '🎁');
      } });
    }

    // ข้อ D คุณเป้ 25 ก.ย. 2569 — ถ้วยน้ำชาที่ศาลาเลิกเป็น "ของเก็บ" แล้ว (เดินเก็บแล้วบารมีไม่เพิ่มจริง
    // ตามที่คุณเป้เจอ — STATIONS.tea ไม่มี visit/drop อีกต่อไป ดู data.js) เหลือเป็นของประกอบฉากนิ่ง ๆ
    // วางอยู่ที่จุดเดิม (room.item) ตลอดเวลา "ยกเว้น" ตอนนั่งพัก — ตอนนั่ง ถ้วยไปอยู่ในมือยมบาทน้อยแทน
    // อยู่แล้วในภาพ hero-yama-sit(-sip).png ที่เจ้าของวาดมาให้ (ไม่ต้องวาดถ้วยซ้อนเพิ่ม) ลุกขึ้นแล้ว
    // ถ้วยที่วางในฉากก็กลับมาโผล่ที่เดิมทันที (ไม่มีอนิเมชันเคลื่อนที่ — แค่ซ่อน/โผล่ตามสถานะนั่ง)
    if (def.k === 'tea' && room.item && !room.noCup && !sitting) {
      acts.push({ y: room.item[1], fn: () => {
        const x = px(room.item[0]), y = py(room.item[1]);
        drawStandee(ctx, ITEMS.tea.img, x, y, U * 0.07, t, ITEMS.tea.glyph);
      } });
    }

    acts.push({ y: P.y, fn: () => {
      // นั่งพักอยู่ — ใช้ภาพดื่มชาที่ตัดเสื่อออกแล้ว เพื่อวางบนเบาะจริงในฉาก
      // กำลังลงทัณฑ์อยู่ = สลับไปท่าฟาด (เจ้าของวาดมาให้ 10 ก.ย. 2569)
      if (lying && teaSleepPhase(sleepElapsed) === 'wake') {
        ctx.save();
        ctx.globalAlpha = Math.min(1,(sleepElapsed-TEA_SLEEP_MS-TEA_BLACKOUT_MS)/TEA_WAKE_MS);
        drawStandee(ctx,'hero-yama',px(P.x),py(room.bed[1]+0.09),U*HERO_H,t,'👑',P.face);
        ctx.restore(); return;
      }
      if (lying) {
        const down = img('hero-yama-unconscious');
        if (down) {
          const width = U * 0.24, height = width * down.naturalHeight / down.naturalWidth;
          ctx.drawImage(down, px(P.x)-width/2, py(P.y)-height/2, width, height);
        }
        return;
      }
      const swinging = !sitting && g.swingUntil && Date.now() < g.swingUntil;
      const sitKey = 'hero-yama-tea-clean';
      const haveSitArt = !!img('hero-yama-tea-clean');
      const key = sitting ? (haveSitArt ? sitKey : 'hero-yama')
                : swinging && img('hero-yama-atk') ? 'hero-yama-atk' : 'hero-yama';
      // เดินอยู่จริง (ขยับตำแหน่งในช่วง 120ms ที่ผ่านมา) → ใช้สไปรท์เดิน 4 เฟรมเหมือนบนแผนที่
      // สไปรท์เดินวาดหันซ้าย drawHeroWalk พลิกให้ตามทิศ P.face เอง · ไม่มีไฟล์เดินก็ถอยไปท่ายืนเด้งเดิม
      const moving = !sitting && !swinging && simClock - movedSim < WALK_GRACE_MS;
      const heroH = U * HERO_H;
      if (swinging && def.k === 'dab' && drawYamaSword(ctx, g.outfit || g.zone, px(P.x), py(P.y), heroH,
          SWORD_DURATION_MS - (g.swingUntil - Date.now()), P.face)) return;
      if (!(moving && drawHeroWalk(ctx, px(P.x), py(P.y), heroH, walkDrawDistance(walkDist, heroH), P.face, direction))) {
        const gait = Math.floor(t / 180) % 4;
        const hop = moving && gait % 2 ? U * 0.010 : 0;
        const stretch = moving ? (gait % 2 ? 1.045 : 0.965) : 1;
        drawStandee(ctx, key, px(P.x), py(P.y) - hop, heroH * stretch, t, '👑', P.face);
      }
      // ยังไม่มีไฟล์ท่านั่ง — ใช้ท่ายืนเดิมแทนพร้อมสัญลักษณ์ 💤 กำกับว่ากำลังพัก (ข้อ A ข้อห้าม 24 ก.ย. 2569)
      if (sitting && !haveSitArt) {
        const zx = px(P.x) + U * HERO_H * 0.34, zy = py(P.y) - U * HERO_H * 1.05 + Math.sin(t / 380) * U * 0.012;
        ctx.font = `${Math.round(U * 0.05)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('💤', zx, zy);
      }
    } });

    acts.sort((a, b) => a.y - b.y).forEach(o => o.fn());

  }

  function frame(now) {
    if (dead) return;
    // กล่องปิดไปแล้ว/ถูกกล่องอื่นแทนที่ — เก็บตัวเองทิ้ง อย่ารอ event close
    // (event close ของ <dialog> ยิงแบบ async และมาถึงตอนกล่องใหม่เปิดไปแล้ว
    //  ผูกการเก็บกวาดไว้กับมันเมื่อไหร่ ห้องจะโดนทำลายทิ้งตั้งแต่เฟรมแรก)
    if (!alive()) { api.destroy(); return; }
    // F1 — ไล่เวลาจริงให้ครบ (เพดาน 250ms) หั่นเป็นก้อนเล็ก ไม่ตัดที่ 50ms เหมือนเดิม ความเร็วไม่ตกตามเฟรมเรต
    const dt = Math.min(WALK_MAX_CATCHUP_MS, now - last); last = now;
    step(dt);
    if (api.onFrame) api.onFrame(inReach());
    draw(now, api.st);
    raf = requestAnimationFrame(frame);
  }

  const api = {
    st: null,               // สถานีที่กำลังเปิดอยู่ (ผู้เรียกอัปเดตให้)
    onAct: null,            // กดเว้นวรรคตอนยืนถึง
    onFrame: null,          // แจ้งผู้เรียกว่ายืนถึงหรือยัง (ไว้เปิด/ปิดปุ่ม)
    onCollect: null,        // เก็บของในห้องแล้ว ให้แผงข้อมูลด้านข้างวาดใหม่
    inReach, inTrainingReach,
    /** ชุด 29C — จุดบนฉากเป็นเปอร์เซ็นต์ของ canvas (ไว้วางปุ่ม HTML ลอยเหนือตัวละคร)
     *  u,v = สัดส่วน 0-1 ของภาพฉากเหมือน ROOMS · up = ยกขึ้นกี่ส่วนของด้านสั้นของกรอบ (CREW_H = เหนือหัวคน) */
    anchor(u, v, up = 0) {
      const w = cv.width || 1, h = cv.height || 1;
      return [px(u) / w * 100, (py(v) - up * unit()) / h * 100];
    },
    crewHeight: CREW_H,
    canSit,                 // มีจุดนั่งพักไหม — เฉพาะศาลาน้ำชา (ข้อ A 24 ก.ย. 2569)
    sitting: () => sitting,
    sleeping: () => lying,
    sleepPhase: () => lying ? teaSleepPhase(sleepElapsed) : null,
    nearBed: () => !!room.bed && Math.hypot(P.x-room.bed[0], P.y-room.bed[1]) <= REACH,
    setSleep,
    setSit,
    lock: v => { locked = !!v; },   // มินิเกม "เร่งการทำงาน" เปิดอยู่ — ห้องหยุดรับอินพุตชั่วคราว (ชุดที่ 9)
    project: ([x, y]) => {
      const rect = cv.getBoundingClientRect();
      return [px(x) / cv.width * rect.width,
              (box.oy + y * box.h) / cv.height * rect.height];
    },
    pos: () => [P.x, P.y, P.tx, P.ty],       // ไว้ส่องตอนดีบัก
    /** เดินหนึ่งเฟรมด้วยมือ — แท็บที่ไม่ได้อยู่หน้าจอ rAF ไม่ยิงเลย ทดสอบจากคอนโซลต้องใช้ตัวนี้
     *  (แนวเดียวกับ G.step() ที่เกมเปิดไว้ให้อยู่แล้ว) */
    tick(dt = 16) { step(dt); if (api.onFrame) api.onFrame(inReach()); draw(performance.now(), api.st); },
    start() {
      draw(performance.now(), api.st);   // วาดใบแรกทันที — ก่อนหน้านี้กรอบภาพยังไม่ถูกคำนวณ
      raf = requestAnimationFrame(frame); //  แตะฉากก่อนเฟรมแรกจะได้พิกัดเพี้ยน
    },
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      removeEventListener('keydown', onKey);
      removeEventListener('keyup', onKey);
      cv.removeEventListener('pointerdown', onDown);
    },
  };
  return api;
}

function label(ctx, text, x, y, size, color) {
  ctx.font = `600 ${Math.round(Math.max(10, size))}px "IBM Plex Sans Thai", system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.8)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

/** F2 ข้อ 3 — ชื่อวิญญาณใต้ตัว: เล็ก เรียบ ไม่เกะกะ (เดิมใช้ label() ขนาด U*0.025 ตัวใหญ่จนบังฉาก) */
function soulLabel(ctx, text, x, y, U) {
  const size = Math.max(10, U * 0.0155);
  ctx.font = `500 ${Math.round(size)}px "IBM Plex Sans Thai", system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = 'rgba(255,224,200,.92)'; ctx.fillText(text, x, y);
}

function tag(ctx, x, y, text, color, U = 400) {
  const size = Math.max(11, U * 0.027);
  ctx.font = `600 ${Math.round(size)}px "IBM Plex Sans Thai", system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + size * 1.4, h = size * 1.9;
  ctx.fillStyle = 'rgba(16,8,12,.82)';
  rr(ctx, x - w / 2, y - h / 2, w, h, h / 3); ctx.fill();
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

function soulNameplate(ctx, name, x, y, U, maxWidth) {
  const size = Math.max(10, U * 0.018), pad = size * 0.55;
  ctx.font = `600 ${size}px "IBM Plex Sans Thai", system-ui, sans-serif`;
  const text = fitSoulName(name, Math.max(0, maxWidth - pad * 2), s => ctx.measureText(s).width);
  const width = Math.min(maxWidth, ctx.measureText(text).width + pad * 2), height = size * 1.65;
  const top = y + U * 0.012;
  ctx.fillStyle = 'rgba(16,8,12,.92)';
  rr(ctx, x - width / 2, top, width, height, height / 3); ctx.fill();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe0c8'; ctx.fillText(text, x, top + height / 2);
}
