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

import { ITEMS, BAL } from './data.js';
import { drawStandee, drawSoul, img, rr } from './art.js';

const HERO_H = 0.15;      // ความสูงตัวละครเทียบกับด้านสั้นของกรอบภาพ
const CREW_H = 0.13;
const SOUL_H = 0.085;     // วิญญาณเล็กกว่าคนเป็น — ต้องพอดีปากกระทะ ไม่ใช่ล้นออกมา
const REACH  = 0.17;      // ระยะเอื้อมถึงจุดลงมือ — ยืนใกล้ ๆ ก็พอ ไม่ต้องเดินจ่อ

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
  const KEY = {};
  let raf = 0, last = performance.now(), dead = false;
  let box = { ox: 0, oy: 0, w: 1, h: 1 };     // กรอบที่ภาพฉากถูกวางจริงบน canvas

  /** ข้อ A คุณเป้ 24 ก.ย. 2569 — จุดนั่งพักฟื้นบารมี มีเฉพาะศาลาน้ำชา (def.k === 'tea')
   *  ใช้จุด "act" เดิมของห้องเป็นที่นั่ง (ศาลาไม่เคยมีปุ่มลงมืออื่นอยู่แล้ว ไม่ชนกัน)
   *  sitting=true ระหว่างนั่ง: ล็อกไม่ให้เดิน ฟื้นบารมีด้วยเวลาจริง (ไม่ผ่าน g.step() ที่พักไปพร้อมกล่องโมดัล)
   *  ลุกเองอัตโนมัติเมื่อเต็ม · ผู้เล่นกด "ลุกขึ้น" เองก่อนเต็มก็ได้ (ui.js เรียก api.setSit(false)) */
  const canSit = def.k === 'tea';
  let sitting = false, sipAt = 0, sipping = false;

  // ---- พิกัดสัดส่วน (0-1 ของภาพฉาก) → พิกเซลบน canvas ----
  const px = u => box.ox + u * box.w;
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
  const inReach = () => Math.hypot(P.x - room.act[0], (P.y - room.act[1]) * 0.7) <= REACH;

  // ---- คีย์บอร์ด: กล่องโมดัลกินคีย์ของเกมหลักไปหมด ห้องนี้จึงต้องดักเอง ----
  const onKey = e => {
    if (/input|textarea/i.test(e.target.tagName)) return;
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
    if (sitting) return;                        // นั่งอยู่ — แตะฉากไม่ให้ลุกเดินเอง ต้องกด "ลุกขึ้น"
    // box อยู่ในหน่วยพิกเซลของ canvas (backing store) — แปลงพิกัดเมาส์ให้เป็นหน่วยเดียวกัน
    const r = cv.getBoundingClientRect();
    const cx = (e.clientX - r.left) / r.width * cv.width;
    const cy = (e.clientY - r.top) / r.height * cv.height;
    const [tx, ty] = snap((cx - box.ox) / box.w, (cy - box.oy) / box.h);
    P.tx = tx; P.ty = ty;
  };
  cv.addEventListener('pointerdown', onDown);

  /** เริ่ม/เลิกนั่งพัก — ui.js ผูกกับปุ่ม "นั่งพัก"/"ลุกขึ้น" ในแผงขวา (เฉพาะศาลาน้ำชา)
   *  ต้องยืนถึงจุด (inReach) ถึงจะเริ่มนั่งได้ · ลุกได้ทุกเมื่อไม่มีเงื่อนไข */
  function setSit(on) {
    if (on) {
      if (!canSit || !inReach() || g.hp >= g.hpMax) return false;
      sitting = true; sipAt = performance.now() + 1800; sipping = false;
      P.tx = null; P.ty = null;
    } else {
      sitting = false;
    }
    return true;
  }

  function step(dt) {
    if (sitting) {
      // นั่งนิ่ง ไม่รับอินพุตเดินเลย — ฟื้นบารมีด้วยเวลาจริง (ห้องนี้เดินต่อได้แม้กล่องโมดัลจะพัก g.step() ไว้)
      if (g.hp < g.hpMax) {
        g.hp = Math.min(g.hpMax, g.hp + BAL.hpRegenSit * dt / 1000);
        if (g.hp >= g.hpMax) sitting = false;    // เต็มแล้วลุกเอง
      } else sitting = false;
      const now = performance.now();
      if (now >= sipAt) { sipping = !sipping; sipAt = now + 1800 + Math.random() * 900; }
      return;
    }
    const sp = 0.00045 * dt;                    // ความเร็วเดิน (สัดส่วนต่อมิลลิวินาที)
    let dx = 0, dy = 0;
    if (KEY.a || KEY.arrowleft) dx -= 1;
    if (KEY.d || KEY.arrowright) dx += 1;
    if (KEY.w || KEY.arrowup) dy -= 1;
    if (KEY.s || KEY.arrowdown) dy += 1;
    if (!dx && !dy && P.tx != null) {            // เดินไปจุดที่แตะไว้
      dx = P.tx - P.x; dy = P.ty - P.y;
      if (Math.hypot(dx, dy) < 0.008) { P.tx = null; dx = dy = 0; }
    }
    const d = Math.hypot(dx, dy);
    if (d > 0) {
      const nx = P.x + dx / d * sp, ny = P.y + dy / d * sp * 0.7;
      // ชนขอบแล้วไถลไปตามแกนที่ยังไปได้ — เหมือน stepTo บนแผนที่ ไม่ติดหนึบที่มุม
      if (inArea(nx, ny)) { P.x = nx; P.y = ny; }
      else if (inArea(nx, P.y)) P.x = nx;
      else if (inArea(P.x, ny)) P.y = ny;
      else P.tx = null;
      if (Math.abs(dx) > 0.001) P.face = dx < 0 ? -1 : 1;
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

    // ---- ฉาก: วางแบบ contain ไม่ครอป จุดยึดทุกจุดจึงตรงกับที่วัดจากภาพต้นฉบับเสมอ ----
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
      const s = Math.min(W / sw, H / sh);
      box = { ox: (W - sw * s) / 2, oy: (H - sh * s) / 2, w: sw * s, h: sh * s };
      ctx.fillStyle = '#120810'; ctx.fillRect(0, 0, W, H);
      // ยกแสงเฉพาะภาพฉาก ตัวละครไม่โดนด้วย จะได้ยังเด่นอยู่บนพื้นหลัง
      const bf = room.bright || brightOf(bg, bgSrc);
      if (Math.abs(bf - 1) > 0.02 && canFilter()) {
        ctx.save();
        ctx.filter = `brightness(${bf.toFixed(2)})`;
        ctx.drawImage(bg, sx, sy, sw, sh, box.ox, box.oy, box.w, box.h);
        ctx.restore();
      } else if (bf > 1.02) {                            // ไม่รองรับ filter — ทับอีกชั้นแบบบวกแสง
        ctx.drawImage(bg, sx, sy, sw, sh, box.ox, box.oy, box.w, box.h);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.5, (bf - 1) * 0.7);
        ctx.drawImage(bg, sx, sy, sw, sh, box.ox, box.oy, box.w, box.h);
        ctx.restore();
      } else ctx.drawImage(bg, sx, sy, sw, sh, box.ox, box.oy, box.w, box.h);
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
    ctx.beginPath(); ctx.ellipse(ax, ay, U * 0.075, U * 0.028, 0, 0, 7); ctx.stroke();

    // ---- คนทั้งห้อง เรียงจากหลังมาหน้า ----
    const acts = [];
    (st ? st.slots : []).forEach((sl, i) => {
      const a = room.souls[i] || room.souls[room.souls.length - 1];
      if (!a) return;
      acts.push({ y: a[1], fn: () => {
        const x = px(a[0]), y = py(a[1]);
        drawSoul(ctx, x, y, U * SOUL_H, t + sl.soul.id * 200, '#ffd9c0', sl.soul.sp || 7);
        const p = Math.min(1, sl.progress / sl.need);
        const bw = U * 0.09, bh2 = Math.max(4, U * 0.011);
        ctx.fillStyle = 'rgba(0,0,0,.72)'; rr(ctx, x - bw / 2, y + U * 0.012, bw, bh2, bh2 / 2); ctx.fill();
        ctx.fillStyle = def.fx === 'fx-ice' ? '#8fd8ff' : '#ff9d3a';
        rr(ctx, x - bw / 2, y + U * 0.012, bw * p, bh2, bh2 / 2); ctx.fill();
        // ชื่อสลับสูง-ต่ำทีละดวง + ตัดให้สั้น ไม่งั้นสามดวงที่ยืนใกล้กันป้ายทับกันจนอ่านไม่ออก
        const nm = sl.soul.who.length > 9 ? sl.soul.who.slice(0, 8) + '…' : sl.soul.who;
        label(ctx, nm, x, y + U * 0.035 + (i % 2) * U * 0.032, U * 0.026, '#ffe0c8');
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
          label(ctx, entry.soul.name || entry.soul.who, x, y + U * 0.04, U * 0.025, '#ffe0c8');
        } });
      });
      const key = def.k === 'tarang' ? 'nira' : 'boon';
      const name = def.k === 'tarang' ? 'นิรา' : 'บุญ';
      const a = room.crew || [0.30,0.80];
      acts.push({ y:a[1], fn:() => {
        const x = px(a[0]), y = py(a[1]);
        drawStandee(ctx, 'crew-' + key, x, y, U * CREW_H, t, name);
        label(ctx, name, x, y + U * 0.03, U * 0.026, '#ffe0c8');
      } });
    }

    if (st && st.crewK && room.crew) {
      const c = g.crewOf(st.crewK);
      if (c && !c.self) acts.push({ y: room.crew[1], fn: () => {
        const x = px(room.crew[0] + (def.k === 'sawan' || def.k === 'tarang' ? 0.13 : 0)), y = py(room.crew[1]);
        drawStandee(ctx, 'crew-' + c.k, x, y, U * CREW_H, t, c.glyph, room.crew[0] < room.act[0] ? 1 : -1);
        label(ctx, c.name, x, y + U * 0.03, U * 0.026, 'rgba(255,225,195,.85)');
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
        label(ctx, `เดินไปเก็บ${itemDef.name}`, x, y + U * 0.035, U * 0.024, '#ffe0a8');
      } });
    }

    acts.push({ y: P.y, fn: () => {
      // นั่งพักอยู่ — ใช้ท่านั่ง (hero-yama-sit / -sit-sip สลับกันเป็นระยะ) แทนท่ายืน (ข้อ A 24 ก.ย. 2569)
      // กำลังลงทัณฑ์อยู่ = สลับไปท่าฟาด (เจ้าของวาดมาให้ 10 ก.ย. 2569)
      const swinging = !sitting && g.swingUntil && Date.now() < g.swingUntil;
      const sitKey = sipping && img('hero-yama-sit-sip') ? 'hero-yama-sit-sip' : 'hero-yama-sit';
      const haveSitArt = !!img('hero-yama-sit');
      const key = sitting ? (haveSitArt ? sitKey : 'hero-yama')
                : swinging && img('hero-yama-atk') ? 'hero-yama-atk' : 'hero-yama';
      // จังหวะเดินแบบ Office Agent: เด้งสองจังหวะ ไม่เลื่อนภาพนิ่งไปกับพื้นเฉย ๆ
      const moving = !sitting && (P.tx != null || Object.values(KEY).some(Boolean));
      const gait = Math.floor(t / 105) % 4;
      const hop = moving && gait % 2 ? U * 0.010 : 0;
      const stretch = moving ? (gait % 2 ? 1.045 : 0.965) : 1;
      drawStandee(ctx, key, px(P.x), py(P.y) - hop, U * HERO_H * stretch, t, '👑', P.face);
      // ยังไม่มีไฟล์ท่านั่ง — ใช้ท่ายืนเดิมแทนพร้อมสัญลักษณ์ 💤 กำกับว่ากำลังพัก (ข้อ A ข้อห้าม 24 ก.ย. 2569)
      if (sitting && !haveSitArt) {
        const zx = px(P.x) + U * HERO_H * 0.34, zy = py(P.y) - U * HERO_H * 1.05 + Math.sin(t / 380) * U * 0.012;
        ctx.font = `${Math.round(U * 0.05)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('💤', zx, zy);
      }
    } });

    acts.sort((a, b) => a.y - b.y).forEach(o => o.fn());

    // ---- ป้ายบอกวิธี ----
    // ข้อ A คุณเป้ 24 ก.ย. 2569 — "ลงทัณฑ์เอง/ส่งเข้าประตูเอง" ถูกถอดออกไปแล้วจริง ๆ เมื่อวาน
    // (commit f245ecc 23 ก.ย. 2569: assign() ปฏิเสธ crew.self, attack() เลิกเรียก smite())
    // เว้นวรรค/ปุ่มขวาที่ไม่ใช่ศาลาน้ำชาตอนนี้แค่เรียก panels() เฉย ๆ ไม่ได้ "ลงมือ" อะไรจริง
    // ป้ายเดิมชวนกดแล้วไม่มีอะไรเกิดขึ้นทำให้เข้าใจผิดว่าสถานีค้าง — เอาข้อความนั้นออก
    // เปลี่ยนเป็นบอกสถานะจริงแทน: มีใครอยู่ระหว่างรับทัณฑ์ไหม ผู้คุมทำงานเองอัตโนมัติผ่านการเดินวาระ
    const hasSlots = !!(st && st.slots && st.slots.length);
    const takesSouls = def.pow > 0;      // ตรงกับเงื่อนไข cap ใน g.stCap() ที่ ui.js ใช้ตัดสินใจเรื่องเดียวกัน
    const idleTip = def.heaven ? '🕊️ ดวงที่ถึงนี่รอบุญตรวจกรรม — ดูรายชื่อที่แผงขวา'
                  : hasSlots    ? '👺 ผู้คุมกำลังลงทัณฑ์อยู่ — ดูความคืบหน้าที่แผงขวา'
                  : takesSouls  ? '📭 ยังไม่มีใครถูกส่งมาที่นี่ — ออกหมายจากห้องสอบสวนก่อน' : '';
    // เกมหยุดพักอยู่ = ไม่มีอะไรขยับทั้งฉาก (เดินวาระหยุด) ไม่ใช่แค่สถานีนี้ — ต้องบอกให้ชัดกว่าทุกป้ายอื่น
    // (ยกเว้นตอนนั่งพัก ซึ่งฟื้นด้วยเวลาจริงไม่ผ่าน g.step() จึงเดินต่อได้แม้เกมจะพักอยู่)
    const tip = sitting ? '💤 กำลังนั่งพัก — บารมีค่อย ๆ ฟื้น · กด "ลุกขึ้น" เมื่อพอแล้ว'
              : g.paused ? '⏸ เกมหยุดพักอยู่ — กด "▶ เดินวาระ" ใต้แผนที่ก่อน ทัณฑ์ถึงจะเดินหน้าต่อ'
              : near ? (canSit ? '🍵 กดปุ่ม "นั่งพัก" ในแผงขวา เพื่อฟื้นบารมีฟรี' : idleTip)
                     : '⌨ ลูกศร/WASD หรือแตะบนฉาก เพื่อเดินเข้าไป';
    const tipColor = g.paused && !sitting ? '#ff9a66' : (near || sitting) ? '#ffd27a' : 'rgba(240,225,215,.75)';
    if (tip) tag(ctx, W / 2, H - U * 0.045, tip, tipColor, U);
  }

  function frame(now) {
    if (dead) return;
    // กล่องปิดไปแล้ว/ถูกกล่องอื่นแทนที่ — เก็บตัวเองทิ้ง อย่ารอ event close
    // (event close ของ <dialog> ยิงแบบ async และมาถึงตอนกล่องใหม่เปิดไปแล้ว
    //  ผูกการเก็บกวาดไว้กับมันเมื่อไหร่ ห้องจะโดนทำลายทิ้งตั้งแต่เฟรมแรก)
    if (!alive()) { api.destroy(); return; }
    const dt = Math.min(80, now - last); last = now;
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
    inReach,
    canSit,                 // มีจุดนั่งพักไหม — เฉพาะศาลาน้ำชา (ข้อ A 24 ก.ย. 2569)
    sitting: () => sitting,
    setSit,
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

function tag(ctx, x, y, text, color, U = 400) {
  const size = Math.max(11, U * 0.027);
  ctx.font = `600 ${Math.round(size)}px "IBM Plex Sans Thai", system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + size * 1.4, h = size * 1.9;
  ctx.fillStyle = 'rgba(16,8,12,.82)';
  rr(ctx, x - w / 2, y - h / 2, w, h, h / 3); ctx.fill();
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}
