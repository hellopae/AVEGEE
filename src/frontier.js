// src/frontier.js — แผนที่ชายแดน: เดินสำรวจ + เลือกศัตรูเข้าสู้เอง (ข้อ A ชุด 14 คุณเป้ 26 ก.ย. 2569)
//
// เดิม: กดเข้าชายแดน → จัดทีม → ตัดเข้าฉากสู้ทันที (สุ่มศัตรู) → ชนะ เก็บของ → กลับ "แผนที่โซน"
// ตอนนี้:  กดเข้าชายแดน → จัดทีม (หน้าเดิม ไม่แตะ) → เข้า "แผนที่ชายแดน" (ไฟล์นี้) →
//   ยมบาทน้อยเดินเอง (คลิก/แตะ/WASD เหมือนแผนที่หลัก) จากประตูบน → ศัตรูค่อย ๆ บุกจากประตูล่าง
//   จนถึงจุดในสนามแล้ว "หยุดยืนรอ" (ไม่ไล่ล่าเรา — ดูเหตุผลเลือกแบบนี้ในรายงาน Toby ข้อ A6) →
//   เดินเข้าไปใกล้ตัวไหน ปุ่ม "เริ่มต่อสู้" ลอยขึ้นเหนือหัวตัวนั้น → กดแล้วตัดเข้าฉากต่อสู้เดิมกับตัวนั้น
//   เป๊ะ (ไม่แตะฉากต่อสู้/ค่าพลัง/คูลดาวน์เลย) → ชนะ เก็บของที่ตก → กลับมา "แผนที่ชายแดน" ต่อ (ไฟล์นี้)
//   ตัวที่แพ้หายไปจากสนาม ตัวอื่นยังยืนรออยู่เหมือนเดิม
//
// เก็บ "เซสชันชายแดน" (ตำแหน่งยมบาทน้อย + รายชื่อศัตรูที่ยังยืนอยู่) ไว้ในตัวแปรโมดูลนี้เอง
// **ไม่ผ่าน g.snapshot()/restore()** — ตั้งใจ ใบงานอนุญาตให้ "ออกเกมกลางชายแดนแล้วกลับมา = เริ่ม
// ชายแดนใหม่ได้" (ข้อ A8) เพราะของที่ทิ้งไว้ในสนามไม่มีค่าอะไรต้องรักษา (ต่างจากสถานี/ยมทูตในโซน)
// อยู่ในหน่วยความจำ JS เฉย ๆ จึงอยู่รอดข้าม "เปิด/ปิดกล่องระหว่างไปสู้แล้วกลับมา" ได้ในหนึ่งเซสชันเล่น
// (ui.js เปิด/ปิด <dialog> ใบเดียวกันสลับกับฉากต่อสู้ ไม่ใช่โหลดหน้าใหม่) แต่หายไปเมื่อโหลดหน้าใหม่จริง ๆ

import { MOB } from './data.js';
import { drawStandee, drawHeroWalk } from './art.js';
import { walkDirection } from './walk-direction.js';
import { frontierWalkable, frontierPath, frontierSegmentClear } from './frontier-navigation.js';

// ทางเดินและสิ่งกีดขวางแต่ละโซนอยู่ใน frontier-navigation.js
const HERO_H = 0.085;
const MOB_H = 0.115;
const REACH = 0.09;                 // ระยะเดินเข้าใกล้ศัตรูแล้วปุ่ม "เริ่มต่อสู้" โผล่เหนือหัวตัวนั้น
const GATE = [0.5, 0.19], NIRA = [0.575, 0.265], GUARD = [0.43, 0.265];
export const nearFrontierGate = p => Math.hypot(p.x - GATE[0], p.y - GATE[1]) <= REACH;
export const nearFrontierNira = p => Math.hypot(p.x - NIRA[0], p.y - NIRA[1]) <= REACH;
const SPAWN_EVERY = 2600;           // ลองสร้างศัตรูใหม่ทุกเท่านี้ (ms) ถ้ายังไม่เต็มจอ
const MOVE_SPEED = 0.00015;         // สัดส่วนพื้นที่เดินต่อ ms — ศัตรูเดินจากขอบเข้ามาจุดในสนาม
export const maxOnScreen = wave => Math.min(5, 3 + Math.floor(wave / 4));

// เซสชันเดียวต่อโซน — สลับโซนแล้วเริ่มใหม่ (ของเก่าทิ้ง ตรงกับกติกาเดิมที่แต่ละโซนมีชายแดนแยกกัน)
let session = null;   // { zone, player:{x,y,tx,ty,face}, enemies:[{id,kindIdx,x,y,tx,ty,arrived,level}], nextId }

/** ได้เซสชันของโซนนี้ — สร้างใหม่ถ้ายังไม่มีหรือเพิ่งย้ายโซน */
export function frontierSession(zone) {
  if (!session || session.zone !== zone) {
    session = { zone, player: { x: 0.485, y: 0.35, tx: null, ty: null, face: 1 },
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
  return [rand(0.47, 0.53), 0.955];
}
function insidePoint() {
  return [rand(0.20, 0.80), rand(0.47, 0.70)];
}

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
  const { bg, kinds, wave, alive, fab, gate, nira } = opts;
  const sess = frontierSession(g.zone);
  const P = sess.player;
  if (!frontierWalkable(g.zone, P.x, P.y)) { P.x = .485; P.y = .35; }
  let route = P.tx == null ? [] : frontierPath(g.zone,[P.x,P.y],[P.tx,P.ty]);
  const routes = new Map();
  const KEY = {};
  let raf = 0, last = performance.now(), dead = false, nextSpawn = 500;
  let box = { ox: 0, oy: 0, w: 1, h: 1 };
  let nearId = null;
  let walkDistance = 0, direction = 'down', movedAt = 0;

  const bgRec = loadImg(bg);

  const px = u => box.ox + u * box.w, py = v => box.oy + v * box.h;
  const unit = () => Math.min(box.w, box.h);

  function spawnOne() {
    if (sess.enemies.length >= maxOnScreen(wave) || !kinds.length) return;
    const kindIdx = kinds[Math.floor(Math.random() * kinds.length)];
    const [ex, ey] = edgePoint();
    let [tx, ty] = insidePoint();
    for (let tries=0; tries<50 && !frontierWalkable(g.zone,tx,ty); tries++) [tx,ty]=insidePoint();
    if (!frontierWalkable(g.zone,tx,ty)) return;
    sess.enemies.push({ id: sess.nextId++, kindIdx, x: ex, y: ey, tx, ty, arrived: false, level: wave });
  }

  const onKey = e => {
    if (/input|textarea/i.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
      e.preventDefault();
      KEY[k] = e.type === 'keydown';
      if (e.type === 'keydown') { P.tx = null; P.ty = null; route = []; }
    }
  };
  addEventListener('keydown', onKey);
  addEventListener('keyup', onKey);

  const onDown = e => {
    const r = cv.getBoundingClientRect();
    const cx = (e.clientX - r.left) / r.width * cv.width;
    const cy = (e.clientY - r.top) / r.height * cv.height;
    route = frontierPath(g.zone, [P.x,P.y], [(cx-box.ox)/box.w,(cy-box.oy)/box.h]);
    const target=route.at(-1);
    P.tx=target?.[0] ?? null; P.ty=target?.[1] ?? null;
  };
  cv.addEventListener('pointerdown', onDown);

  function step(dt) {
    const beforeX = P.x, beforeY = P.y;
    const sp = 0.00046 * dt;
    let dx = 0, dy = 0;
    if (KEY.a || KEY.arrowleft) dx -= 1;
    if (KEY.d || KEY.arrowright) dx += 1;
    if (KEY.w || KEY.arrowup) dy -= 1;
    if (KEY.s || KEY.arrowdown) dy += 1;
    if (!dx && !dy && P.tx != null) {
      const target=route[0] || [P.tx,P.ty];
      dx = target[0] - P.x; dy = target[1] - P.y;
      if (Math.hypot(dx,dy)<.006) { route.shift(); if(!route.length) P.tx=null; dx=dy=0; }
    }
    const d = Math.hypot(dx, dy);
    if (d > 0) {
      const stride=Math.min(sp,d), nx=P.x+dx/d*stride, ny=P.y+dy/d*stride;
      if(frontierSegmentClear(g.zone,[P.x,P.y],[nx,ny])) {P.x=nx;P.y=ny;}
      else if(frontierSegmentClear(g.zone,[P.x,P.y],[nx,P.y])) P.x=nx;
      else if(frontierSegmentClear(g.zone,[P.x,P.y],[P.x,ny])) P.y=ny;
      if (Math.abs(dx) > 0.001) P.face = dx < 0 ? -1 : 1;
    }
    const actualX = (P.x - beforeX) * box.w, actualY = (P.y - beforeY) * box.h;
    if (Math.hypot(actualX, actualY) > .15) {
      walkDistance += Math.hypot(actualX, actualY) / unit() * 640;
      direction = walkDirection(actualX, actualY, direction);
      movedAt = performance.now();
    }
    // ศัตรูเดินจากขอบเข้ามาจุดในสนามทีละก้าว ถึงแล้วหยุดยืนรอ (ไม่ไล่ล่ายมบาทน้อย — ดูข้อ A6 ในรายงาน)
    for (const en of sess.enemies) {
      if (en.arrived) continue;
      if(!routes.has(en.id)) routes.set(en.id,frontierPath(g.zone,[en.x,en.y],[en.tx,en.ty]));
      const path=routes.get(en.id), target=path[0];
      if(!target) { en.arrived=true; continue; }
      const ex = target[0] - en.x, ey = target[1] - en.y, ed = Math.hypot(ex, ey);
      if (ed < 0.006) { path.shift(); if(!path.length) en.arrived=true; continue; }
      en.x += ex / ed * Math.min(ed,MOVE_SPEED * dt);
      en.y += ey / ed * Math.min(ed,MOVE_SPEED * dt);
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
      // Fill the viewport without stretching the map. Narrow screens follow Yama;
      // pointer coordinates still map back to the same navigation polygons.
      const s = Math.max(W / sw, H / sh), w = sw * s, h = sh * s;
      box = { ox: Math.max(W-w,Math.min(0,W/2-P.x*w)),
              oy: Math.max(H-h,Math.min(0,H/2-P.y*h)), w, h };
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
      const moving = t - movedAt < 120;
      if (!drawHeroWalk(ctx, px(P.x), py(P.y), U * HERO_H, moving ? walkDistance : 0, P.face, direction))
        drawStandee(ctx, 'hero-yama', px(P.x), py(P.y), U * HERO_H, t, '👑', P.face, moving);
    } });
    if(g.guard) acts.push({ y: GUARD[1], fn: () => drawStandee(ctx, 'crew-guard', px(GUARD[0]), py(GUARD[1]), U * .10, t, '🛡️') });
    acts.push({ y: NIRA[1], fn: () => drawStandee(ctx, 'crew-nira', px(NIRA[0]), py(NIRA[1]), U * HERO_H, t, '📋') });
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
    for (const [button, shown, x, y] of [
      [gate, nearFrontierGate(P), GATE[0], GATE[1]],
      [nira, nearFrontierNira(P), NIRA[0], NIRA[1]],
    ]) {
      if (!button) continue;
      button.hidden = !shown;
      if (shown) {
        button.style.left = `${px(x) / W * 100}%`;
        button.style.top = `${(py(y) - U * HERO_H) / H * 100}%`;
      }
    }

    if (!sess.enemies.length) {
      label(ctx, 'ยังไม่มีศัตรูในสนาม — รอครู่หนึ่งให้มันเดินเข้ามา', W / 2, py(.22) - U * 0.02, 13, 'rgba(240,225,215,.72)');
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
      if (gate) gate.hidden = true;
      if (nira) nira.hidden = true;
    },
  };
  return api;
}
