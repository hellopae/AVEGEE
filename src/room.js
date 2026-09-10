// room.js — ฉากภายในของสถานีหนึ่งหลัง (10 ก.ย. 2569)
//
// เจ้าของสั่ง: "ย้ายวิญญาณไปอยู่ในกระทะ / ตรงดาบ / หน้าประตู โดยมียมทูตที่คุมอยู่ด้วย
//  และให้ตัวละครเราเดินอยู่บนหน้าต่างได้ จะได้เดินไปลงทัณฑ์เอง / เดินไปกดเติมบารมีเอง"
//
// เดิมหน้าสถานีเป็นการ์ดนิ่ง ๆ วางรูปวิญญาณเรียงกันหน้าฉาก — ไม่มีอะไรให้ทำนอกจากกดปุ่ม
// ตอนนี้เป็นฉากจริง: ภาพที่เจ้าของวาดวางเต็มกรอบ (contain ไม่ครอป จุดยึดจะได้ตรงเสมอ)
// แล้วโค้ดวางคน "ตามจุดยึด" ที่วัดจากภาพนั้นเป็นสัดส่วน 0-1
//
// **จุดยึดอยู่ที่ ROOMS ใน data.js ที่เดียว** — วาดฉากใหม่/เปลี่ยนภาพ แก้ตัวเลขชุดเดียวจบ
// ไม่มีพิกัดพิกเซลฝังอยู่ในไฟล์นี้เลย

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

  // ---- พิกัดสัดส่วน (0-1 ของภาพฉาก) → พิกเซลบน canvas ----
  const px = u => box.ox + u * box.w;
  const py = v => box.oy + v * box.h;
  const unit = () => Math.min(box.w, box.h);     // ใช้คิดความสูงตัวละครให้คงที่ทุกอัตราส่วน

  // walk = กรอบเดียว หรือ "หลายกรอบต่อกัน" ก็ได้ (ห้องทะเบียนมีลานล่าง บันได และชานบน)
  const areas = Array.isArray(room.walk[0]) ? room.walk : [room.walk];
  const inArea = (x, y) => areas.some(r => x >= r[0] && y >= r[1] && x <= r[2] && y <= r[3]);
  /** จุดที่เดินได้ซึ่งใกล้ (x,y) ที่สุด — ใช้ตอนแตะนอกพื้นที่ */
  const snap = (x, y) => {
    if (inArea(x, y)) return [x, y];
    let best = null, bd = Infinity;
    for (const r of areas) {
      const cx = Math.max(r[0], Math.min(r[2], x)), cy = Math.max(r[1], Math.min(r[3], y));
      const d = Math.hypot(cx - x, cy - y);
      if (d < bd) { bd = d; best = [cx, cy]; }
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
    // box อยู่ในหน่วยพิกเซลของ canvas (backing store) — แปลงพิกัดเมาส์ให้เป็นหน่วยเดียวกัน
    const r = cv.getBoundingClientRect();
    const cx = (e.clientX - r.left) / r.width * cv.width;
    const cy = (e.clientY - r.top) / r.height * cv.height;
    const [tx, ty] = snap((cx - box.ox) / box.w, (cy - box.oy) / box.h);
    P.tx = tx; P.ty = ty;
  };
  cv.addEventListener('pointerdown', onDown);

  function step(dt) {
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
    const bg = bgOf(bgSrc, bgFallback) || (bgFallback ? bgOf(bgFallback) : null);
    if (bg && bg.naturalWidth) {
      const s = Math.min(W / bg.naturalWidth, H / bg.naturalHeight);
      box = { ox: (W - bg.naturalWidth * s) / 2, oy: (H - bg.naturalHeight * s) / 2,
              w: bg.naturalWidth * s, h: bg.naturalHeight * s };
      ctx.fillStyle = '#120810'; ctx.fillRect(0, 0, W, H);
      // ยกแสงเฉพาะภาพฉาก ตัวละครไม่โดนด้วย จะได้ยังเด่นอยู่บนพื้นหลัง
      const bf = room.bright || brightOf(bg, bgSrc);
      if (bf > 1.02 && canFilter()) {
        ctx.save();
        ctx.filter = `brightness(${bf.toFixed(2)})`;
        ctx.drawImage(bg, box.ox, box.oy, box.w, box.h);
        ctx.restore();
      } else if (bf > 1.02) {                            // ไม่รองรับ filter — ทับอีกชั้นแบบบวกแสง
        ctx.drawImage(bg, box.ox, box.oy, box.w, box.h);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.5, (bf - 1) * 0.7);
        ctx.drawImage(bg, box.ox, box.oy, box.w, box.h);
        ctx.restore();
      } else ctx.drawImage(bg, box.ox, box.oy, box.w, box.h);
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

    if (st && st.crewK && room.crew) {
      const c = g.crewOf(st.crewK);
      if (c && !c.self) acts.push({ y: room.crew[1], fn: () => {
        const x = px(room.crew[0]), y = py(room.crew[1]);
        drawStandee(ctx, 'crew-' + c.k, x, y, U * CREW_H, t, c.glyph, room.crew[0] < room.act[0] ? 1 : -1);
        label(ctx, c.name, x, y + U * 0.03, U * 0.026, 'rgba(255,225,195,.85)');
      } });
    }

    acts.push({ y: P.y, fn: () => {
      drawStandee(ctx, 'hero-yama', px(P.x), py(P.y), U * HERO_H, t, '👑', P.face);
    } });

    acts.sort((a, b) => a.y - b.y).forEach(o => o.fn());

    // ---- ป้ายบอกวิธี ----
    const tip = near ? '⌨ กดเว้นวรรค หรือปุ่มขวา เพื่อลงมือตรงนี้'
                     : '⌨ ลูกศร/WASD หรือแตะบนฉาก เพื่อเดินเข้าไป';
    tag(ctx, W / 2, H - U * 0.045, tip, near ? '#ffd27a' : 'rgba(240,225,215,.75)', U);
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
    inReach,
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
