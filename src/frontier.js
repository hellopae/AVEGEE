// src/frontier.js — แผนที่ชายแดน: เดินสำรวจ + เลือกศัตรูเข้าสู้เอง (ข้อ A ชุด 14 คุณเป้ 26 ก.ย. 2569)
//
// เดิม: กดเข้าชายแดน → จัดทีม → ตัดเข้าฉากสู้ทันที (สุ่มศัตรู) → ชนะ เก็บของ → กลับ "แผนที่โซน"
// ตอนนี้:  กดเข้าชายแดน → จัดทีม (หน้าเดิม ไม่แตะ) → เข้า "แผนที่ชายแดน" (ไฟล์นี้) →
//   ยมน้อยเดินเอง (คลิก/แตะ/WASD เหมือนแผนที่หลัก) → ศัตรูของโซนนั้นค่อย ๆ เดินเข้ามาทีละตัวจากขอบ
//   จนถึงจุดในสนามแล้ว "หยุดยืนรอ" (ไม่ไล่ล่าเรา — ดูเหตุผลเลือกแบบนี้ในรายงาน Toby ข้อ A6) →
//   เดินเข้าไปใกล้ตัวไหน ปุ่ม "เริ่มต่อสู้" ลอยขึ้นเหนือหัวตัวนั้น → กดแล้วตัดเข้าฉากต่อสู้เดิมกับตัวนั้น
//   เป๊ะ (ไม่แตะฉากต่อสู้/ค่าพลัง/คูลดาวน์เลย) → ชนะ เก็บของที่ตก → กลับมา "แผนที่ชายแดน" ต่อ (ไฟล์นี้)
//   ตัวที่แพ้หายไปจากสนาม ตัวอื่นยังยืนรออยู่เหมือนเดิม
//
// เก็บ "เซสชันชายแดน" (ตำแหน่งยมน้อย + รายชื่อศัตรูที่ยังยืนอยู่) ไว้ในตัวแปรโมดูลนี้เอง
// **ไม่ผ่าน g.snapshot()/restore()** — ตั้งใจ ใบงานอนุญาตให้ "ออกเกมกลางชายแดนแล้วกลับมา = เริ่ม
// ชายแดนใหม่ได้" (ข้อ A8) เพราะของที่ทิ้งไว้ในสนามไม่มีค่าอะไรต้องรักษา (ต่างจากสถานี/ยมทูตในโซน)
// อยู่ในหน่วยความจำ JS เฉย ๆ จึงอยู่รอดข้าม "เปิด/ปิดกล่องระหว่างไปสู้แล้วกลับมา" ได้ในหนึ่งเซสชันเล่น
// (ui.js เปิด/ปิด <dialog> ใบเดียวกันสลับกับฉากต่อสู้ ไม่ใช่โหลดหน้าใหม่) แต่หายไปเมื่อโหลดหน้าใหม่จริง ๆ

import { MOB } from './data.js';
import { drawStandee } from './art.js';

// พื้นที่เดินได้ สัดส่วน 0-1 ของภาพฉาก [x1,y1,x2,y2] — วัดจากภาพจริงทั้ง 4 โซน (กำแพง/ประตูอยู่แถบบน
// ~0-20% ของสูง · รูปปั้น/บันไดฐานอยู่แถบล่าง ~86-100% · ซากปรักซ้าย-ขวาแถบขอบ) ยึดกรอบเดียวกันทั้ง
// 4 โซนได้เพราะเจ้าของวาดผังเดียวกันทุกโซน (ประตูบน-ลานร้าวกลาง-บันไดล่าง) ต่างแค่โทนสี/ธีมประดับ
const WALK = [0.075, 0.22, 0.925, 0.86];
const HERO_H = 0.15;
const MOB_H = 0.12;
const REACH = 0.09;                 // ระยะเดินเข้าใกล้ศัตรูแล้วปุ่ม "เริ่มต่อสู้" โผล่เหนือหัวตัวนั้น
const SPAWN_EVERY = 2600;           // ลองสร้างศัตรูใหม่ทุกเท่านี้ (ms) ถ้ายังไม่เต็มจอ
const MOVE_SPEED = 0.00015;         // สัดส่วนพื้นที่เดินต่อ ms — ศัตรูเดินจากขอบเข้ามาจุดในสนาม
export const maxOnScreen = wave => Math.min(5, 3 + Math.floor(wave / 4));

// เซสชันเดียวต่อโซน — สลับโซนแล้วเริ่มใหม่ (ของเก่าทิ้ง ตรงกับกติกาเดิมที่แต่ละโซนมีชายแดนแยกกัน)
let session = null;   // { zone, player:{x,y,tx,ty,face}, enemies:[{id,kindIdx,x,y,tx,ty,arrived,level}], nextId }

/** ได้เซสชันของโซนนี้ — สร้างใหม่ถ้ายังไม่มีหรือเพิ่งย้ายโซน */
export function frontierSession(zone) {
  if (!session || session.zone !== zone) {
    session = { zone, player: { x: (WALK[0] + WALK[2]) / 2, y: WALK[3] - 0.05, tx: null, ty: null, face: 1 },
                enemies: [], nextId: 1 };
  }
  return session;
}
/** ล้างเซสชันด้วยมือ — ปัจจุบัน ui.js ไม่เรียกจุดไหนแล้ว (กด "กลับแผนที่โซน" แค่ปิดกล่อง
 *  ไม่ล้างสนามรบ จะได้ออกไปทำธุระอื่นแล้วกลับมาสู้ต่อได้) เก็บฟังก์ชันนี้ไว้เผื่อใช้ debug/อนาคต
 *  เซสชันเปลี่ยนเองอัตโนมัติอยู่แล้วตอนย้ายโซน (ดู frontierSession ด้านบน) */
export function clearFrontierSession() { session = null; }

/** ชนะฉากต่อสู้แล้ว — ลบตัวที่แพ้ออกจากแผนที่ชายแดน (ui.js เรียกหลัง endBattle เพราะตอนนั้น
 *  makeFrontierWalk ตัวเก่าถูก destroy() ไปแล้ว ไม่มี instance ให้เรียก แต่ session ยังอยู่) */
export function removeSessionEnemy(zone, id) {
  if (!session || session.zone !== zone || id == null) return;
  const i = session.enemies.findIndex(e => e.id === id);
  if (i >= 0) session.enemies.splice(i, 1);
}

const rand = (a, b) => a + Math.random() * (b - a);
function edgePoint() {
  const [x1, y1, x2, y2] = WALK;
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return [rand(x1, x2), y1];
  if (side === 1) return [rand(x1, x2), y2];
  if (side === 2) return [x1, rand(y1, y2)];
  return [x2, rand(y1, y2)];
}
function insidePoint() {
  const [x1, y1, x2, y2] = WALK;
  const pad = 0.10;
  return [rand(x1 + pad, x2 - pad), rand(y1 + pad, y2 - pad)];
}
const clampArea = (x, y) => [Math.min(WALK[2], Math.max(WALK[0], x)), Math.min(WALK[3], Math.max(WALK[1], y))];

function loadImg(src) {
  const el = new Image();
  const rec = { el, ok: false };
  el.onload = () => { rec.ok = true; };
  el.onerror = () => { rec.ok = false; };
  el.src = src;
  return rec;
}

function label(ctx, text, x, y, size, color) {
  ctx.font = `600 ${Math.round(Math.max(10, size))}px "IBM Plex Sans Thai", system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.8)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

/** แผนที่ชายแดนหนึ่งโซน — เรียก destroy() ทุกครั้งที่ปิดหน้า/จะไปสู้ ไม่งั้นลูปเฟรมค้าง
 *  cv = canvas · g = instance เกม · opts = { bg, kinds (MOB.kinds ที่กรองแล้วของโซนนี้),
 *  wave, alive, fab (ปุ่ม DOM "เริ่มต่อสู้" ที่ ui.js สร้างไว้ให้ — ไฟล์นี้แค่โชว์/ซ่อน/จัดตำแหน่ง) } */
export function makeFrontierWalk(cv, g, opts) {
  // kinds = ดัชนีของ MOB.kinds ที่ใช้ได้ในโซนนี้ (g.zoneDef().mobs — ui.js กรองมาให้แล้ว)
  const { bg, kinds, wave, alive, fab } = opts;
  const sess = frontierSession(g.zone);
  const P = sess.player;
  const KEY = {};
  let raf = 0, last = performance.now(), dead = false, nextSpawn = 500;
  let box = { ox: 0, oy: 0, w: 1, h: 1 };
  let nearId = null;

  const bgRec = loadImg(bg);

  const px = u => box.ox + u * box.w, py = v => box.oy + v * box.h;
  const unit = () => Math.min(box.w, box.h);

  function spawnOne() {
    if (sess.enemies.length >= maxOnScreen(wave) || !kinds.length) return;
    const kindIdx = kinds[Math.floor(Math.random() * kinds.length)];
    const [ex, ey] = edgePoint();
    const [tx, ty] = insidePoint();
    sess.enemies.push({ id: sess.nextId++, kindIdx, x: ex, y: ey, tx, ty, arrived: false, level: wave });
  }

  const onKey = e => {
    if (/input|textarea/i.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
      e.preventDefault();
      KEY[k] = e.type === 'keydown';
      if (e.type === 'keydown') { P.tx = null; P.ty = null; }
    }
  };
  addEventListener('keydown', onKey);
  addEventListener('keyup', onKey);

  const onDown = e => {
    const r = cv.getBoundingClientRect();
    const cx = (e.clientX - r.left) / r.width * cv.width;
    const cy = (e.clientY - r.top) / r.height * cv.height;
    const [tx, ty] = clampArea((cx - box.ox) / box.w, (cy - box.oy) / box.h);
    P.tx = tx; P.ty = ty;
  };
  cv.addEventListener('pointerdown', onDown);

  function step(dt) {
    const sp = 0.00046 * dt;
    let dx = 0, dy = 0;
    if (KEY.a || KEY.arrowleft) dx -= 1;
    if (KEY.d || KEY.arrowright) dx += 1;
    if (KEY.w || KEY.arrowup) dy -= 1;
    if (KEY.s || KEY.arrowdown) dy += 1;
    if (!dx && !dy && P.tx != null) {
      dx = P.tx - P.x; dy = P.ty - P.y;
      if (Math.hypot(dx, dy) < 0.01) { P.tx = null; dx = dy = 0; }
    }
    const d = Math.hypot(dx, dy);
    if (d > 0) {
      const [nx, ny] = clampArea(P.x + dx / d * sp, P.y + dy / d * sp * 0.72);
      P.x = nx; P.y = ny;
      if (Math.abs(dx) > 0.001) P.face = dx < 0 ? -1 : 1;
    }
    // ศัตรูเดินจากขอบเข้ามาจุดในสนามทีละก้าว ถึงแล้วหยุดยืนรอ (ไม่ไล่ล่ายมน้อย — ดูข้อ A6 ในรายงาน)
    for (const en of sess.enemies) {
      if (en.arrived) continue;
      const ex = en.tx - en.x, ey = en.ty - en.y, ed = Math.hypot(ex, ey);
      if (ed < 0.01) { en.arrived = true; continue; }
      en.x += ex / ed * MOVE_SPEED * dt;
      en.y += ey / ed * MOVE_SPEED * dt;
    }
    // ศัตรูใกล้ที่สุดในระยะเอื้อม — ปุ่ม "เริ่มต่อสู้" โผล่เหนือหัวตัวนั้นตัวเดียว
    let bestId = null, bestD = Infinity;
    for (const en of sess.enemies) {
      const dd = Math.hypot(en.x - P.x, en.y - P.y);
      if (dd <= REACH && dd < bestD) { bestD = dd; bestId = en.id; }
    }
    nearId = bestId;
  }

  function draw(t) {
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

    if (bgRec.ok && bgRec.el.naturalWidth) {
      const im = bgRec.el, sw = im.naturalWidth, sh = im.naturalHeight;
      const s = Math.min(W / sw, H / sh);
      box = { ox: (W - sw * s) / 2, oy: (H - sh * s) / 2, w: sw * s, h: sh * s };
      ctx.fillStyle = '#0d0710'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(im, 0, 0, sw, sh, box.ox, box.oy, box.w, box.h);
    } else {
      box = { ox: 0, oy: 0, w: W, h: H };
      ctx.fillStyle = '#1c0f16'; ctx.fillRect(0, 0, W, H);
      label(ctx, 'กำลังโหลดฉากชายแดน…', W / 2, H / 2, 16, 'rgba(240,225,215,.6)');
    }

    const U = unit();
    const acts = [];
    for (const en of sess.enemies) {
      acts.push({ y: en.y, fn: () => {
        const x = px(en.x), y = py(en.y);
        const inReach = en.id === nearId;
        const kd = MOB.kinds[en.kindIdx] || MOB;
        drawStandee(ctx, kd.img, x, y, U * MOB_H, t, '👹', en.x < P.x ? 1 : -1, !en.arrived);
        if (inReach) {
          ctx.strokeStyle = `rgba(255,205,120,${0.55 + 0.35 * Math.sin(t / 260)})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.ellipse(x, y, U * 0.05, U * 0.02, 0, 0, 7); ctx.stroke();
        }
        label(ctx, `${kd.name} · ระดับ ${en.level}`, x, y + U * 0.032, U * 0.024,
              inReach ? '#ffd27a' : 'rgba(255,225,195,.8)');
      } });
    }
    acts.push({ y: P.y, fn: () => {
      const moving = P.tx != null || Object.values(KEY).some(Boolean);
      const gait = Math.floor(t / 105) % 4;
      const hop = moving && gait % 2 ? U * 0.010 : 0;
      drawStandee(ctx, 'hero-yama', px(P.x), py(P.y) - hop, U * HERO_H, t, '👑', P.face, moving);
    } });
    acts.sort((a, b) => a.y - b.y).forEach(o => o.fn());

    // ปุ่ม "เริ่มต่อสู้" ลอย — DOM element ที่ ui.js ส่งเข้ามา ไฟล์นี้แค่โชว์/ซ่อน/จัดตำแหน่งเป็น %
    // (ใช้ % แทนพิกเซลจริง กันปัญหาขนาด canvas จริง (backing store) กับขนาด CSS ไม่ตรงกันตอน dpr>1)
    if (fab) {
      if (nearId == null) { fab.hidden = true; }
      else {
        const en = sess.enemies.find(e => e.id === nearId);
        if (!en) { fab.hidden = true; }
        else {
          fab.hidden = false;
          fab.style.left = `${(px(en.x)) / W * 100}%`;
          fab.style.top = `${(py(en.y) - U * MOB_H) / H * 100}%`;
          fab.dataset.enemyId = String(en.id);
        }
      }
    }

    if (!sess.enemies.length) {
      label(ctx, 'ยังไม่มีศัตรูในสนาม — รอครู่หนึ่งให้มันเดินเข้ามา', W / 2, py(WALK[1]) - U * 0.02, 13, 'rgba(240,225,215,.72)');
    }
  }

  function frame(now) {
    if (dead) return;
    if (!alive()) { api.destroy(); return; }
    const dt = Math.min(80, now - last); last = now;
    step(dt);
    if (now >= nextSpawn) { spawnOne(); nextSpawn = now + SPAWN_EVERY; }
    draw(now);
    raf = requestAnimationFrame(frame);
  }

  const api = {
    nearId: () => nearId,
    enemyCount: () => sess.enemies.length,
    getEnemy: id => sess.enemies.find(e => e.id === id),
    removeEnemy: id => { const i = sess.enemies.findIndex(e => e.id === id); if (i >= 0) sess.enemies.splice(i, 1); },
    start() { draw(performance.now()); raf = requestAnimationFrame(frame); },
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      removeEventListener('keydown', onKey);
      removeEventListener('keyup', onKey);
      cv.removeEventListener('pointerdown', onDown);
      if (fab) fab.hidden = true;
    },
  };
  return api;
}
