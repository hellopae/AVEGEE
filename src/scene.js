import { actorStanding } from './actor-recovery.js';
import { devaMapActors, prisonEventBurning } from './deva-map.js';
import { finalEventActors, finalRestSpot } from './final-event.js';
import { drawMapAmbientGround, drawMapAmbientSky } from './map-ambient.js';
// scene.js — ฉากเป็นภาพวาดใบเดียว โค้ดวางตัวละคร/คิว/เอฟเฟกต์ทับตามพิกัด
// แทนระบบ tile grid เดิมทั้งหมด (6 ก.ย. 2569) เหตุผลอยู่ใน CONCEPT.md §เทคนิค
// ระบบพิกัดเดียวกับที่เป้วาดฉากมา (SCENE.w x SCENE.h) — โค้ดย่อให้พอดี canvas ตอนวาด

import { SCENE, STATIONS, SPOTS, QUEUE_LINE, ITEMS, MOB, GUARD, BUILD_TIME, REPAIR_TIME, FRONTIER, MERCHANT, ZONE_EVENTS } from './data.js';
import { img, zoneImg, drawFallbackGround, drawStandee, drawHeroWalk, drawCrewWalk, drawBuilding, drawSoul, drawBoat,
         drawFire, drawVignette, rr, topOf, depthOf, bodyBoxOf, soulKey } from './art.js';
import { buildWalk } from './walk.js';
import { walkDirection } from './walk-direction.js';
import { escortCrewPosition, soulWalkPosition } from './escort.js';
import { t as tr } from './i18n.js';
import { waitingEvents } from './npc-stand.js';

export const UI_SCALE_MAP = 1.2;
export const CHAR_SCALE_MAP = 0.8;
const CHAR_HIT_PAD_MAP = 12; // touch padding around the smaller standees
const CREW_H = 82 * CHAR_SCALE_MAP;
const HERO_H = 92 * CHAR_SCALE_MAP;
const SOUL_H = 64 * CHAR_SCALE_MAP;
const mapStandee = (ctx, key, x, y, h, t, ...rest) =>
  drawStandee(ctx, key, x, y, h * CHAR_SCALE_MAP, t, ...rest);
let lastHeroX = NaN, lastHeroY = NaN, heroMovingUntil = 0, heroWalkDistance = 0, heroDirection = 'down';
let lastHeroActor = null, lastHeroZone = null;
const crewWalkTracks = new WeakMap();
const reducedMotion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
let ambientTime = 0;
/** Movement is sampled from coordinates, never from a pending path or idle time. */
export function actorWalkMotion(actor, time, zone = 'th', position = null) {
  const [x, y] = position || [actor.x, actor.y];
  let state = crewWalkTracks.get(actor);
  if (!state || state.zone !== zone || !Number.isFinite(x) || !Number.isFinite(y)) {
    state = { x, y, zone, distance:0, movingUntil:0, face:actor.face || 1 };
    crewWalkTracks.set(actor, state);
    return { ...state, moving:false };
  }
  const dx = x - state.x, dy = y - state.y, moved = Math.hypot(dx, dy);
  if (moved > 0.15 && moved < 30) {
    state.distance += moved; state.movingUntil = time + 120;
    if (Math.abs(dx) > 0.15) state.face = dx < 0 ? -1 : 1;
  } else if (moved >= 30) {
    // Teleports, rescue placement and branch changes are not a walking step.
    state.distance = 0; state.movingUntil = 0;
  }
  state.x = x; state.y = y;
  return { ...state, moving:time < state.movingUntil };
}


/** ใช้รูปท่าพิเศษถ้ามีไฟล์จริง ไม่มีก็ใช้ท่ายืนปกติ
 *  => ดรอป img/hero-yama-atk.png หรือ img/crew-<k>-work.png ลงไปแล้วเห็นผลทันที ไม่ต้องแก้โค้ด */
const poseOr = (alt, base) => img(alt) ? alt : base;

/** ย่อฉากให้พอดีความกว้าง canvas — คืนอัตราส่วนไว้ใช้แปลงพิกัดเมาส์ */
export const scaleFor = cv => cv.width / SCENE.w;

/** วงแหวนใต้เท้าตัวที่เลือกอยู่ในแผงข้อมูล */
/** ป้ายลอยเหนือหัว — พื้นทึบ + ขอบสี อ่านออกบนฉากมืด ๆ ได้ทุกจุด
 *  ใช้กับเปรตเป็นหลัก แต่เขียนให้ทั่วไปไว้ เผื่อของอย่างอื่นต้องบอกว่า "กดได้" */
function tag(ctx, x, y, t, [text, color]) {
  const bob = Math.sin(t / 420) * 2;
  ctx.save();
  ctx.font = `600 ${13 * UI_SCALE_MAP}px "IBM Plex Sans Thai", system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 16 * UI_SCALE_MAP, h = 21 * UI_SCALE_MAP, yy = y + bob;
  ctx.fillStyle = 'rgba(20,10,14,.88)';
  rr(ctx, x - w / 2, yy - h / 2, w, h, 7 * UI_SCALE_MAP); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = color; ctx.fillText(text, x, yy + 0.5);
  ctx.restore();
}

function ring(ctx, x, y, t, w = 30) {
  const q = 0.5 + 0.5 * Math.sin(t / 260);
  ctx.strokeStyle = `rgba(255,210,140,${0.5 + q * 0.4})`; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.34, 0, 0, 7); ctx.stroke();
}

/** เดินตามระยะจริงของเส้น ไม่ใช่หารเวลาเท่ากันทุก waypoint (ช่วงสั้น/ยาวจึงไม่กระตุก) */
function pointOnPath(path, progress) {
  if (!path?.length) return [0, 0];
  if (path.length === 1) return path[0];
  const lengths = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  let left = Math.max(0, Math.min(1, progress)) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i] || i === lengths.length - 1) {
      const q = lengths[i] ? left / lengths[i] : 0;
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * q,
              path[i][1] + (path[i + 1][1] - path[i][1]) * q];
    }
    left -= lengths[i];
  }
  return path[path.length - 1];
}

export function afterlifeWalkPosition(walk) {
  return soulWalkPosition(walk);          // ชุด 29C: หักช่วงที่วิญญาณยืนรอยมทูตมารับ (walk.delay) ออกให้แล้ว
}

export function render(ctx, g, t, hover, sel) {
  const cv = ctx.canvas;
  // ชุดที่ 15b (28 ก.ย. 2569, ตรวจโดย Dale) — canvas #cv ในมาร์กอัปยังคงแอตทริบิวต์เดิม
  // width="1527" height="704" (สัดส่วน 2.17:1) ค้างจากก่อนเปลี่ยน SCENE เป็น scene-v2.png
  // (1678×937, สัดส่วน 1.79:1) ผลคือ sc = cv.width/SCENE.w ตัวเดียวถูกใช้ทั้งสองแกน แล้ว
  // เนื้อหาสูง SCENE.h*sc เกิน cv.height ไป ~149px — บัฟเฟอร์ canvas ตัดส่วนล่างสุดของแผนที่
  // ทิ้งไปเงียบๆ (ท่าเรือ/ประตูชายแดน/บันไดส่วนล่างหายไปจริง ไม่ใช่แค่ภาพเพี้ยน) ก่อนที่ CSS
  // จะยืดบัฟเฟอร์ที่ถูกตัดไปแล้วให้เต็มกล่อง .scene-box ซ้ำอีกชั้น (fitSceneBox() ใน ui.js
  // ใช้ SCENE.w/h คำนวณกล่องถูกอยู่แล้ว ปัญหาอยู่ที่แอตทริบิวต์ของ <canvas> เท่านั้น)
  // แก้โดยให้ความละเอียดจริงของ canvas ตามอัตราส่วน SCENE เสมอ (sc จะเป็น 1:1 พอดีสำหรับ
  // โซน th) — ไม่แตะ index.html/ui.js ตามข้อห้ามของใบงาน ทำที่นี่แทนเพราะ render() เรียกทุกเฟรม
  if (cv.width !== SCENE.w || cv.height !== SCENE.h) { cv.width = SCENE.w; cv.height = SCENE.h; }
  const sc = scaleFor(cv);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.setTransform(sc, 0, 0, sc, 0, 0);   // ตั้งแต่บรรทัดนี้ วาดด้วยพิกัดฉากได้เลย
  ctx.imageSmoothingEnabled = false;

  // ฉากใหม่ของโซนมาก่อนภาพในโฟลเดอร์รุ่นเก่า
  const zk = g.zoneDef ? g.zoneDef().scene : 'scene';
  const legacyBg = (g.zone === 'west' ? img('scene-west-dusk-v3') : null) || img(zk) || zoneImg('scene') || img('scene');
  const bg = img('theme-map-' + g.zone) || legacyBg;
  if (bg) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bg, 0, 0, SCENE.w, SCENE.h);
    ctx.imageSmoothingEnabled = false;
    // โซนปัจฉิมเป็นธารน้ำแข็งสีฟ้า ผังเดียวกับโซน 1: ใช้ mask ลาวาโซน 1 กันข้ามธาร
    // Painted gold and glowing details are decorative; navigation uses the original terrain mask.
    const maskBg = g.zone === 'west' ? img('scene-v2-opt') : legacyBg;
    if (buildWalk(bg, maskBg)) g.syncBlocks(true);
  }
  else drawFallbackGround(ctx, SCENE.w, SCENE.h, STATIONS, g);

  ambientTime = t; // Decorative motion continues behind dialogue and pause panels.
  if (bg) drawMapAmbientGround(ctx, bg, g.zone, ambientTime, SCENE.w, SCENE.h, !!reducedMotion?.matches);

  // Ferry sits in the river; the painted bridge/island occludes it.
  // Draw before characters and buildings so the gate and bridge retain their foreground.
  {
    const f = SPOTS.ferry, ph = t / 5200, inbound = Math.cos(ph) > 0;
    const fx = f.from[0] + (f.to[0] - f.from[0]) * (Math.sin(ph) + 1) / 2;
    drawBoat(ctx, fx, f.from[1] + 120, t, inbound ? Math.min(2, g.queue.length) : 0, inbound);
    if (bg) {
      ctx.save(); ctx.beginPath();
      const bridge = [[770,620],[904,620],[904,757],[943,790],[943,880],
        [988,937],[676,937],[704,872],[704,790],[770,755]];
      bridge.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
      ctx.closePath(); ctx.clip(); ctx.drawImage(bg,0,0,SCENE.w,SCENE.h); ctx.restore();
    }
  }

  // ---- จุดที่สร้างสถานีได้ ----
  // เดิมเป็นกรอบประ + ป้ายชื่อ-ราคา ลอยค้างเต็มแผนที่ตลอดเวลา เจ้าของบอกว่ารก (6 ก.ย. 2569)
  // ตอนนี้เงียบสนิทจนกว่ายมบาทจะเดินเข้าไปในเขตนั้น แล้วป้าย "กดเพื่อสร้าง" ค่อยโผล่
  const spot = nearBuild(g, g.player.x, g.player.y);

  // ---- ชั้นของที่ "ยืนอยู่บนพื้น" ----
  // อาคารกับตัวละครอยู่ชั้นเดียวกัน เรียงตามพิกัด y ของฐาน แล้ววาดจากหลังมาหน้า
  // (เจ้าของสั่ง 9 ก.ย. 2569: เดินไปหลังอาคารแล้วอาคารต้องบังตัวเรา ไม่ใช่เดินทับ)
  const layer = [];
  const at = (y, fn) => layer.push({ y, fn });
  // ความลึกของอาคารใช้ depthOf (ขอบหลังของแถบฐานที่วัดจากพิกเซลจริง) ไม่ใช่ def.by
  // เหตุผลเต็มอยู่ที่ depthOf ใน art.js — โดยย่อ: by คือขอบหน้าสุดของสไปรท์
  // ใช้เรียงแล้วคนที่ยืนบนลานหน้าอาคารจะถูกวาดก่อนอาคารเสมอ = หายไปทั้งตัว
  for (const st of g.stations) at(depthOf(st.def), () => drawStation(ctx, g, st, t));
  // ทุกสาขามีด่านชายแดนของตัวเอง ใช้ประตูผังเดียวกันแต่เก็บระลอกแยกโซน
  at(depthOf(FRONTIER), () => drawBuilding(ctx, FRONTIER, t, UI_SCALE_MAP));

  // ---- ไฮไลต์สถานีที่เมาส์ชี้ ----
  if (hover) {
    const def = hover === FRONTIER.k ? FRONTIER : STATIONS.find(d => d.k === hover);
    const shown = def && (def.k === FRONTIER.k
      ? true
      : (g.stations.some(x => x.def.k === def.k) || spot?.k === def.k));
    if (shown) {
      const [x1, y1, x2, y2] = stationHitBox(def);
      ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 2.5;
      rr(ctx, x1, y1, x2 - x1, y2 - y1, 8); ctx.stroke();
    }
  }

  // ---- คิววิญญาณ ยืนเรียงขึ้นสะพานมาที่แท่นพิพากษา ----
  g.queue.forEach((s, i) => {
    const p = QUEUE_LINE[i];
    if (!p) return;
    if (sel && sel.kind === 'soul' && sel.key === s.id) ring(ctx, p[0], p[1], t, 24);
    drawSoul(ctx, p[0], p[1], i === 0 ? SOUL_H * 1.12 : SOUL_H, t + s.id * 300,
             s.waited > 40 ? '#ffb0b0' : '#bfe9ff', s.sp || 7);
  });

  // วิญญาณที่เพิ่งออกหมายเดินไปสถานีตามเส้นทางที่หาไว้ใน game.js
  const clock = Date.now();
  g.transits = (g.transits || []).filter(v => clock < (v.arriveAt || v.started + v.duration));
  for (const v of g.transits) {
    const escorted = !!v.pickup;
    const waiting = escorted && clock < v.departAt;
    const crewProgress = escorted ? (clock - v.pickupAt) / (v.departAt - v.pickupAt - 650) : 1;
    const travelProgress = escorted ? (clock - v.departAt) / (v.arriveAt - v.departAt)
                                    : (clock - v.started) / v.duration;
    const soulAt = waiting ? QUEUE_LINE[0] : pointOnPath(v.outbound || v.path, travelProgress);
    const crewAt = escorted ? (waiting ? pointOnPath(v.pickup, crewProgress)
                                       : pointOnPath(v.outbound, travelProgress)) : null;
    const x = soulAt[0], y = soulAt[1];
    at(y, () => {
      drawSoul(ctx, x, y, SOUL_H * .82, t + v.id * 300, '#d9eaff', v.sp || 7);
      if (waiting && v.crew) tag(ctx, x, y - SOUL_H - 12, t,
        [clock < v.departAt - 650 ? `รอ ${v.crewName} มารับ` : `${v.crewName}มารับแล้ว`, '#f7c371']);
      else if (travelProgress < .25) tag(ctx, x, y - SOUL_H - 12, t, [`→ ${v.name}`, '#f7c371']);
    });
    if (crewAt && actorStanding(g.crewOf(v.crew))) {
      const escortFace = waiting ? (QUEUE_LINE[0][0] < crewAt[0] ? -1 : 1) : (x < crewAt[0] ? -1 : 1);
      const position = [crewAt[0] - (waiting ? 0 : 24 * escortFace), crewAt[1]];
      const motion = actorWalkMotion(v, t, g.zone, position);
      at(crewAt[1] + 1, () => {
        const key = `crew-${v.crew}`;
        if (motion.moving && drawCrewWalk(ctx, key, position[0], position[1], CREW_H, motion.distance, motion.face)) return;
        drawStandee(ctx, motion.moving ? key : poseOr(`${key}-work`, key), position[0], position[1], CREW_H, t,
          v.crewGlyph || '👹', motion.face, motion.moving);
      });
    }
  }

  // The destination roster is filled only after the walk completes in game.js.
  for (const walk of (g.afterlifeWalks || []).slice(0, 24)) {
    if (walk.zone !== g.zone) continue;
    const [x, y] = afterlifeWalkPosition(walk);
    at(y, () => {
      const exit = walk.destination === 'exit';
      const progress = Math.min(1, walk.elapsed / walk.duration);
      ctx.save();
      if (exit) {
        ctx.globalAlpha = 1 - progress;
        const glow = ctx.createRadialGradient(x, y - 26, 3, x, y - 26, 44);
        glow.addColorStop(0, walk.exitKind === 'ascended' ? 'rgba(255,244,181,.45)' : 'rgba(190,228,255,.35)');
        glow.addColorStop(1, 'rgba(255,244,181,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(x, y - 26, 44, 0, Math.PI * 2); ctx.fill();
      }
      if (sel?.kind === 'soul' && sel.key === walk.soul.id) ring(ctx, x, y, t, 24);
      drawSoul(ctx, x, y - (exit ? progress * 20 : 0), SOUL_H * .82,
        t + walk.soul.id * 300, '#d9eaff', walk.soul.sp || 7);
      if (!exit) tag(ctx, x, y - SOUL_H - 10, t,
        [walk.destination === 'prison' ? '⛓️ ไปตะราง'
          : walk.destination === 'gate' ? '🕊️ ไปสวรรค์' : '↩️ กลับคิว', '#f7c371']);
      ctx.restore();
    });
    // ชุด 29C — ยมทูตนำวิญญาณไปตะราง: มารับ → เดินนำหน้า วิญญาณตามติด (ตำแหน่งจริงอยู่ที่ escort.js ที่เดียว)
    if (walk.escort && actorStanding(g.crewOf(walk.escort.k))) {
      const pos = escortCrewPosition(walk), crew = g.crewOf(walk.escort.k);
      if (pos && crew) {
        const motion = actorWalkMotion(walk, t, g.zone, [pos.x, pos.y]);
        at(pos.y + 1, () => {
          const key = `crew-${crew.k}`;
          if (motion.moving && drawCrewWalk(ctx, key, pos.x, pos.y, CREW_H, motion.distance, motion.face)) return;
          drawStandee(ctx, motion.moving ? key : poseOr(`${key}-work`, key), pos.x, pos.y, CREW_H, t,
            crew.glyph || '👹', motion.moving ? motion.face : pos.face, motion.moving);
        });
      }
    }
  }

  // ---- ของที่ตกอยู่บนพื้น ----
  for (const it of g.items.filter(x => !x.from)) at(it.y, () => {
    const def = ITEMS[it.k];
    const p = 0.5 + 0.5 * Math.sin(t / 480 + it.x);
    ctx.fillStyle = `rgba(255,210,120,${0.10 + p * 0.14})`;
    ctx.beginPath(); ctx.arc(it.x, it.y - def.h * 0.35, def.h * 0.75, 0, 7); ctx.fill();
    drawStandee(ctx, def.img, it.x, it.y + Math.sin(t / 480 + it.x) * 3, def.h, t, def.glyph || '🎁');
  });

  // ---- เปรตที่มาก่อกวน ----
  // ปีศาจบนแผนที่เข้าฉากต่อสู้เสมอ; ลูกไฟใช้ได้เฉพาะในฉากต่อสู้
  // ผีวาดทับอาคารเสมอ (แต่ยังอยู่ใต้ตัวเรา) — เจ้าของเจอ 10 ก.ย. 2569 ว่ามันไปยืนหลังอาคาร
  // แล้วหายไปทั้งตัว ทั้งที่เป็นสิ่งเดียวที่ต้องรีบหาให้เจอ
  g.mobs.forEach((m, i) => at(1e6 + m.y, () => {
    if (sel && sel.kind === 'mob' && sel.key === i) ring(ctx, m.x, m.y, t, 28);
    const d = Math.hypot(m.x - g.player.x, m.y - g.player.y);
    const near = d <= MOB.fabReach;
    if (near) {                                       // วงแดงเต้น ๆ บอกว่าเอื้อมถึงแล้ว
      const q = 0.5 + 0.5 * Math.sin(t / 170);
      ctx.strokeStyle = `rgba(224,74,47,${0.55 + q * 0.45})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(m.x, m.y, 34, 12, 0, 0, 7); ctx.stroke();
    }
    mapStandee(ctx, m.eventArt || (MOB.kinds[m.kind ?? 0] || MOB).img, m.x, m.y, MOB.h, t, '👹');
    // เข้าระยะปุ่มสู้แล้ว ui.js วางปุ่มจริงไว้ตรงนี้ทับอยู่ — วาดป้ายซ้ำจะได้ข้อความซ้อนกันสองชั้น
    // จ้างยักษ์ทวารบาลแล้ว ปีศาจเป็นงานของยักษ์ ไม่มีป้ายชวนให้ผู้เล่นเข้าสู้
    if (d <= MOB.fabReach || actorStanding(g.guard)) return;
    tag(ctx, m.x, m.y - MOB.h * CHAR_SCALE_MAP - 8, t,
        ['⚔️ กดเพื่อเข้าสู้', '#c8b0a8']);
  }));

  // บอสเดินมาท้าสู้; แพ้แล้วเฝ้าสะพาน ชนะแล้วไปยืนที่ท่าเรือให้รีแมตช์/เปลี่ยนโซน
  if (g.bossWalk || g.bossGuarding?.[g.zone] || g.bossCleared?.[g.zone]) {
    const walk = g.bossWalk;
    const progress = walk ? Math.min(1, Math.max(0, (Date.now() - walk.started) / walk.duration)) : 0;
    const cleared = !walk && g.bossCleared?.[g.zone];
    const x = walk ? walk.from[0] + (walk.to[0] - walk.from[0]) * progress : SPOTS.bossPier.x;
    const y = walk ? walk.from[1] + (walk.to[1] - walk.from[1]) * progress : SPOTS.bossPier.y;
    at(1e5 + y, () => {
      ring(ctx, x, y, t, 32);
      drawStandee(ctx, 'zone-boss', x, y, HERO_H * 1.12, t, '👑', 1, !!walk && progress < 1);
      tag(ctx, x, y - HERO_H * 1.12 - 15, t,
          [walk ? `${g.zoneDef().bossName}เดินมาท้าสู้` : cleared ? `คุยกับ${g.zoneDef().bossName}` : `${g.zoneDef().bossName}เฝ้าสะพาน`, '#f7c371']);
    });
  }

  for (const ev of waitingEvents(g)) at(1e5 + ev.y, () => {
    ring(ctx, ev.x, ev.y, t, 28);
    mapStandee(ctx, ev.art, ev.x, ev.y, 90, t, '⚠️');
    tag(ctx, ev.x, ev.y - 90, t, ['⚠️', '#f7c371']);
  });

  // ชุด 29C ข้อ 9 — event ปีศาจชายแดนบุก (รับทราบแล้ว รอให้ยมบาทเดินไป): เครื่องหมายเรืองแสงที่ประตูชายแดน
  // ลูกศรชี้ลงเด้งอยู่เหนือซุ้มประตู + ป้ายชื่อ + วงแหวนแดงที่พื้น · หายไปเมื่อสู้เริ่มหรือ event จบ
  if (g.breachMarch?.()) {
    const gx = FRONTIER.x, gy = FRONTIER.y;
    at(1e5 + gy, () => {
      const q = 0.5 + 0.5 * Math.sin(t / 240);
      ctx.save();
      ctx.strokeStyle = `rgba(255,96,72,${0.55 + q * 0.4})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(gx, gy, 70 + q * 8, 24 + q * 3, 0, 0, 7); ctx.stroke();
      const bob = Math.sin(t / 200) * 8, ay = gy - 150 + bob;
      ctx.fillStyle = '#ff6a4a'; ctx.strokeStyle = '#2a0c08'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(gx - 20, ay - 24); ctx.lineTo(gx + 20, ay - 24); ctx.lineTo(gx, ay + 10); ctx.closePath();
      ctx.stroke(); ctx.fill();
      ctx.restore();
      tag(ctx, gx, ay - 48, t, ['⚠️ ' + tr('event.frontierBreach.marker'), '#ff9a7a']);
    });
  }

  if (g.zone === 'west' && g.zoneEventStatus('westHypnotized') === 'pending') {
    [[1110,465],[1240,535],[1335,615]].forEach(([bx,by], i) => {
      const x = bx + Math.sin(t / 800 + i * 2) * 18;
      const y = by + Math.cos(t / 1100 + i * 2) * 9;
      at(y, () => {
        mapStandee(ctx, 'mob-skeleton', x, y, 58, t, '💀');
        if (i === 1) tag(ctx, x, y - 63, t, ['🌀 วิญญาณถูกสะกดจิต', '#c8b4ef']);
      });
    });
  }

  // ในโซน 4 ทัณฑ์กับพ่อค้ารออยู่หน้าตะรางจนกว่าจะชนะเทวดาผู้คุม
  if (!g.zoneCaptivesFree()) {
    at(350, () => {
      mapStandee(ctx, 'crew-taan', 966, 350, 72, t, '🔒');
      mapStandee(ctx, MERCHANT.img, 1038, 350, 72, t, '🔒');
      tag(ctx, 1002, 256, t, ['🔒 ช่วยทัณฑ์และพ่อค้า', '#f7c371']);
    });
  } else at(1e5 + MERCHANT.y, () => {
    mapStandee(ctx, MERCHANT.img, MERCHANT.x, MERCHANT.y, MERCHANT.h, t, MERCHANT.glyph);
  });

  // ---- ยักษ์ทวารบาล (ถ้าจ้างไว้) ----
  // ชุดที่ 10 (ข้อ C1) — ตัดฟีเจอร์ "พายักษ์มาเดินตาม" ออก (คุณเป้สั่ง 25 ก.ย. 2569) ยักษ์ยืน/เดิน
  // ไล่ปราบเปรตแถวหัวสะพานเองเสมอ (g.guard.x/y จาก stepWorld) ไม่มีโหมดตามผู้เล่นอีกต่อไปแล้ว
  if (actorStanding(g.guard)) {
    const motion = actorWalkMotion(g.guard, t, g.zone);
    at(g.guard.y, () => {
      if (sel && sel.kind === 'guard') ring(ctx, g.guard.x, g.guard.y, t, 34);
      if (motion.moving && drawCrewWalk(ctx, GUARD.img, g.guard.x, g.guard.y,
          GUARD.h * CHAR_SCALE_MAP, motion.distance, motion.face)) return;
      mapStandee(ctx, GUARD.img, g.guard.x, g.guard.y, GUARD.h, t, '🛡️', motion.face, motion.moving);
    });
  }

  // ---- ยมทูตในสังกัด — ยืนประจำจุด/เดินเตร็ดเตร่ (เพิ่ม 6 ก.ย. 2569)
  // เดิมโค้ดขยับ c.x/c.y อยู่ใน stepWorld แต่ไม่มีใครวาด ทีมเลยหายไปทั้งโซน
  const now0 = Date.now();
  for (const c of g.crew) {
    if (!actorStanding(c)) continue;
    if (c.x == null || c.escort) continue;
    const motion = actorWalkMotion(c, t, g.zone);
    at(c.y, () => {
      const base = 'crew-' + c.k;
      if (sel && sel.kind === 'crew' && sel.key === c.k) ring(ctx, c.x, c.y, t);
      // ข้อ D คุณเป้เจอ 25 ก.ย. 2569 — ถึงไซต์ก่อสร้างแล้ว (buildK ตั้งอยู่ + สถานีนั้นพ้น buildWait
      // แล้ว คือเลิกเดินและเริ่มลงมือจริง) ยืนสลับท่า work ↔ ยืนเฉย ๆ เป็นจังหวะ ไม่ใช่ยืนนิ่งเป็นหุ่น
      // (ก่อนถึงไซต์ยังเดินอยู่ ไม่เข้าเงื่อนไขนี้ เพราะ st จะยังเป็น buildWait:true)
      const buildingHere = c.buildK && g.stations.some(st => st.def.k === c.buildK &&
        (st.build && !st.buildWait || st.repair && !st.repairWait));
      const working = c.at || (buildingHere && Math.floor(t / 500) % 2 === 0);
      const animated = !buildingHere && motion.moving &&
        drawCrewWalk(ctx, base, c.x, c.y, CREW_H, motion.distance, motion.face);
      if (!animated) drawStandee(ctx, working && !motion.moving ? poseOr(base + (buildingHere ? '-build-work' : '-work'), base) : base,
        c.x, c.y, CREW_H, t, c.glyph, motion.face, motion.moving && !buildingHere);
      label(ctx, c.k === 'nira' && g.niraRest ? `${c.name} · 🩹 พักฟื้น ${g.niraRest.remaining}` : c.name, c.x, c.y + 13, 10.5, 'rgba(255,225,195,.72)');
      if (c.morale < 35) label(ctx, '💤', c.x + CREW_H * 0.32, c.y - CREW_H + 6, 16);
    });
  }
  const camp = finalRestSpot(g);
  if (camp) at(camp.y, () => {
    mapStandee(ctx, ITEMS.tea.img, camp.x, camp.y, 50, t, '🍵');
    label(ctx, 'ค่ายพัก · นอนฟื้นบารมี', camp.x, camp.y + 15, 11, '#f7c371');
  });
  // ผู้ท้าชิงยืนห่างกันแค่ 80px (และไล่ลงทีละ 20px) แต่ป้ายชื่อยาวกว่านั้น → ตัวคี่วางป้ายไว้เหนือหัว ตัวคู่ไว้ใต้เท้า
  // ตัดสินจากตำแหน่ง x (คงที่แม้ตัวก่อนหน้าถูกปราบไปแล้ว) · ตัดคำว่า "รอ" ออก (ป้ายสีเทา = ยังไม่ถึงคิว)
  for (const a of finalEventActors(g)) at(a.y, () => {
    drawStandee(ctx, a.art, a.x, a.y, 78 * CHAR_SCALE_MAP, t, a.reinforcement ? '🛡️' : '⚔️', 1, false, a.sourceZone);
    const above = !a.reinforcement && Math.round((a.x - 1110) / 80) % 2 === 1;
    label(ctx, `${a.name}${a.reinforcement || !a.enabled ? '' : ' · พร้อมสู้'}`, a.x, above ? a.y - 78 * CHAR_SCALE_MAP - 6 : a.y + 15, 10.5, a.enabled ? '#f7c371' : '#ddd');
  });
  for (const a of devaMapActors(g)) at(a.y, () => {
    drawStandee(ctx, a.art, a.x, a.y, 100 * CHAR_SCALE_MAP, t, '🪽', 1, false, a.sourceZone);
    if (a.enabled) label(ctx, a.label, a.x, a.y + 18, 12, '#f7c371');
  });
  // ---- ตัวเรา — เดินไปไหนก็ได้ ----
  const P = g.player;
  if (lastHeroActor !== P || lastHeroZone !== g.zone) {
    lastHeroActor = P; lastHeroZone = g.zone;
    lastHeroX = NaN; lastHeroY = NaN; heroMovingUntil = 0; heroWalkDistance = 0; heroDirection = 'down';
  }
  if (Number.isFinite(lastHeroX)) {
    const moved = Math.hypot(P.x - lastHeroX, P.y - lastHeroY);
    if (moved > 0.15) {
      if (moved < 30) {
        heroWalkDistance += moved;
        heroDirection = walkDirection(P.x - lastHeroX, P.y - lastHeroY, heroDirection);
      }
      heroMovingUntil = t + 120;
    }
  }
  lastHeroX = P.x; lastHeroY = P.y;
  if (P.tx != null) {                          // จุดหมายที่คลิกไว้
    const q = 0.5 + 0.5 * Math.sin(t / 200);
    ctx.strokeStyle = `rgba(255,210,140,${0.35 + q * 0.35})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(P.tx, P.ty, 10 + q * 5, 0, 7); ctx.stroke();
  }
  // ตัวเราวาดท้ายสุดเสมอ — เจ้าของสั่ง 10 ก.ย. 2569 ว่าเดินไปตรงไหนก็ต้องเห็นตัวเอง
  // (บันไดกับพญานาคของหอทะเบียนกินพื้นที่ลงมาเยอะ ยืนตรงนั้นแล้วหายไปทั้งตัว)
  // ตัวละครอื่นกับอาคารยังเรียงตามพิกัด y กันเองเหมือนเดิม
  at(Infinity, () => {
    if (sel && sel.kind === 'me') ring(ctx, P.x, P.y, t, 32);
    const swinging = g.swingUntil && Date.now() < g.swingUntil;
    const walking = t < heroMovingUntil;
    if (!swinging && drawHeroWalk(ctx, P.x, P.y, HERO_H, walking ? heroWalkDistance : 0, P.face, heroDirection)) return;
    drawStandee(ctx, swinging ? poseOr('hero-yama-atk', 'hero-yama') : 'hero-yama',
                P.x, P.y, HERO_H, t, '👑', P.face, walking && !swinging);
  });

  // วาดทั้งชั้นเรียงจากหลังมาหน้า — ฐานอยู่สูงกว่า (y น้อยกว่า) คืออยู่ไกลกว่า วาดก่อน
  layer.sort((a, b) => a.y - b.y).forEach(o => o.fn());

  // บทพูดวาดทีหลังทั้งหมด จะได้ไม่โดนตัวละครตัวอื่นทับ
  // ยกสูงกว่าหัวพอสมควร เพราะช่วง y-CH-8 เป็นที่ของหมุด 📜 (ชั้น HTML ใน ui.js)
  for (const c of g.crew)
    if (c.x != null && c.say && now0 < c.sayUntil) bubble(ctx, `${c.name}: ${c.say}`, c.x, c.y - CREW_H - 34);


  // ---- พญายมมาปรากฏบนบัลลังก์ตอนออกความเห็น ----
  if (g.bossUntil && t < g.bossUntil)
    drawStandee(ctx, 'hero-boss', SPOTS.throne.x, SPOTS.throne.y, HERO_H * 1.2, t, '👹');

  // ---- ลูกไฟที่เพิ่งฟาด ----
  const now = Date.now();
  g.fxHits = g.fxHits.filter(f => now - f.t < 620);
  for (const f of g.fxHits) {
    const k = (now - f.t) / 620;
    ctx.save(); ctx.globalAlpha = 1 - k;
    drawStandee(ctx, 'fx-fireball', f.x, f.y - 30 - k * 26, 54 + k * 40, t, '🔥');
    ctx.restore();
  }

  // ---- ป้ายวงกลมบอกว่าสถานีไหนมีวิญญาณอยู่กี่ดวง ----
  // เจ้าของสั่ง 9 ก.ย. 2569: บนแผนที่ไม่ต้องเห็นตัววิญญาณแล้ว เห็นแค่ไอคอนกับจำนวน
  // อยากดูของจริงให้กดเข้าไปในสถานี (ป๊อปอัปมีฉากของหลังนั้นเอง)
  for (const st of g.stations) {
    if (st.build || !st.slots.length) continue;
    soulBadge(ctx, g, st, t, sel);
  }

  if (spot) buildPrompt(ctx, spot, t, g.coin >= spot.cost);

  drawMapAmbientSky(ctx, g.zone, ambientTime, SCENE.w, SCENE.h, !!reducedMotion?.matches);
  drawVignette(ctx, SCENE.w, SCENE.h);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/** อาคารหนึ่งหลังบนแผนที่ — รวมนั่งร้านตอนกำลังสร้าง และไฟไหม้ตอนผีมาเผา */
function drawStation(ctx, g, st, t) {
  const d = st.def;
  if (st.build) {                                   // กำลังก่อสร้าง — นั่งร้าน + แถบเวลา
    const left = Math.max(0, st.build - Date.now());
    const p = 1 - left / BUILD_TIME;
    const bw = d.bw || 200, im = img('st-building');
    if (im) {
      const bh = bw * im.naturalHeight / im.naturalWidth;
      ctx.drawImage(im, d.bx - bw / 2, d.by - bh, bw, bh);
    }
    else drawBuilding(ctx, d, t, UI_SCALE_MAP);
    const W = 120 * UI_SCALE_MAP, bx = d.bx - W / 2, by = d.by + 10;
    ctx.fillStyle = 'rgba(0,0,0,.74)'; rr(ctx, bx, by, W, 12 * UI_SCALE_MAP, 6); ctx.fill();
    ctx.fillStyle = '#d4a355';        rr(ctx, bx, by, W * Math.max(0.02, p), 12 * UI_SCALE_MAP, 6); ctx.fill();
    // ข้อ G คุณเป้เจอ 25 ก.ย. 2569 — "ทัณฑ์" เป็นชื่อตัวละคร หาตัวจริงที่กำลังสร้างหลังนี้อยู่
    // (buildK ตรงกับ d.k) แล้วใช้ชื่อของเขา (ตามโซนผ่าน crewName แล้ว) แทนพิมพ์ "ทัณฑ์" ตรง ๆ
    const builder = g.crew.find(c => c.buildK === d.k);
    label(ctx, st.buildWait ? `🔨 รอ${builder?.name || 'ทัณฑ์'}เดินมาเริ่มงาน` : `🏗️ กำลังก่อสร้าง ${Math.round(Math.max(0, p) * 100)}%`, d.bx, by - 12, 14, '#ffe7c4');
    return;
  }
  drawBuilding(ctx, d, t, UI_SCALE_MAP);
  if (d.k === 'tarang' && prisonEventBurning(g)) {
    // flames climb from the base to the roofline (smaller sprites so the building stays readable)
    const bw = d.bw || 180, top = topOf(d) ?? d.by - bw, mid = (d.by + top) / 2;
    [[-.3,d.by-6,60],[0,d.by-6,68],[.3,d.by-6,60],[-.2,mid+14,54],[.2,mid+14,54],[0,top+44,56]]
      .forEach(([fx,fy,fw],i) => drawFire(ctx, d.bx + fx * bw, fy, fw, t + i*350, 2));
  }
  if (st.repair) {
    const builder = g.crew.find(c => c.buildK === d.k);
    label(ctx, st.repairWait ? `🔧 รอ${builder?.name || 'ทัณฑ์'}เดินมาซ่อม`
      : `🔧 กำลังซ่อม ${Math.round(Math.max(0, 1 - (st.repair - Date.now()) / REPAIR_TIME) * 100)}%`,
      d.bx, d.by + 34, 14, '#ffe7c4');
  }
  if (st.fire > 0) {                                // ผีกำลังเผาอยู่ — ไฟไต่ขึ้นตามความเสียหาย
    const bw = d.bw || 180;
    const n = 1 + Math.round(st.fire / 34);
    if (g.mobs.some(m => m.at === d.k)) for (let i = 0; i < n; i++)
      drawFire(ctx, d.bx - bw * 0.28 + i * (bw * 0.28), d.by - 6, 34 + st.fire * 0.22, t + i * 400, 3);
    const q = 0.5 + 0.5 * Math.sin(t / 150);
    ctx.save(); ctx.globalAlpha = 0.55 + q * 0.45;
    label(ctx, '⚠️', d.bx, (topOf(d) ?? d.by - (d.bw || 180)) - 18, 34, '#ff6a4a');
    ctx.restore();
    const W = 110 * UI_SCALE_MAP, bx = d.bx - W / 2, by = d.by + 24;
    ctx.fillStyle = 'rgba(0,0,0,.7)'; rr(ctx, bx, by, W, 8 * UI_SCALE_MAP, 4); ctx.fill();
    ctx.fillStyle = '#ff6a4a';        rr(ctx, bx, by, W * (st.fire / 100), 8 * UI_SCALE_MAP, 4); ctx.fill();
  }
}

/** ป้ายวงกลม "มีวิญญาณอยู่กี่ดวง" เหนือสถานี — กดแล้วเปิดป๊อปอัปของสถานีนั้น
 *  วงแหวนรอบนอกคือความคืบหน้าของดวงที่ใกล้ครบวาระที่สุด */
export const BADGE_R = 27 * UI_SCALE_MAP;
/** จุดที่ป้ายวงกลมลอยอยู่ — ทั้งตอนวาดและตอนเช็คคลิกต้องใช้ตัวนี้ตัวเดียวกัน */
export function badgePos(def) {
  const top = topOf(def);
  const y = top != null ? top - BADGE_R - 6 : (def.by ?? def.y) - (def.bw || 180) * 0.5 - 30;
  return [def.bx ?? def.x, Math.max(BADGE_R + 4, y)];
}
function soulBadge(ctx, g, st, t, sel) {
  const d = st.def;
  const [x, y] = badgePos(d);
  const front = st.slots.reduce((a, b) => (a && a.progress / a.need > b.progress / b.need ? a : b), null);
  const p = front ? Math.min(1, front.progress / front.need) : 0;
  const im = img(soulKey(st.slots[0].soul.sp || 7)) || img('spirit7');
  const bob = Math.sin(t / 620) * 2.5;
  const cy = y + bob;

  ctx.save();
  ctx.beginPath(); ctx.arc(x, cy, BADGE_R, 0, 7);
  ctx.fillStyle = 'rgba(18,8,13,.92)'; ctx.fill();
  ctx.save(); ctx.clip();
  if (im) ctx.drawImage(im, x - BADGE_R, cy - BADGE_R - 4, BADGE_R * 2, BADGE_R * 2 + 8);
  else { ctx.fillStyle = '#bfe9ff'; ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('👻', x, cy + 9); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(212,163,85,.9)'; ctx.lineWidth = 2.5; ctx.stroke();

  // วงแหวนคืบหน้า
  ctx.beginPath(); ctx.arc(x, cy, BADGE_R + 4, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
  ctx.strokeStyle = d.fx === 'fx-ice' ? '#8fd8ff' : '#ff9d3a'; ctx.lineWidth = 4; ctx.stroke();

  // จำนวนดวง
  const n = st.slots.length;
  ctx.beginPath(); ctx.arc(x + BADGE_R - 2, cy + BADGE_R - 6, 13 * UI_SCALE_MAP, 0, 7);
  ctx.fillStyle = '#7d2f2a'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,225,195,.85)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
  label(ctx, `${n}`, x + BADGE_R - 2, cy + BADGE_R - 5, 15, '#ffe7c4');
  if (sel && sel.kind === 'station' && sel.key === d.k) ring(ctx, x, cy + BADGE_R + 8, t, 30);
}

/** สถานีที่ยังไม่ได้สร้าง ซึ่งยมบาทยืนอยู่ใกล้พอจะสร้างได้
 *  วัดจาก "จุดยืนของผู้คุม" (def.x,def.y) ไม่ใช่กรอบ hit — เพราะบางกรอบ (ลานตรากตรำ)
 *  พื้นข้างในเป็นหลุมลาวาที่เหยียบไม่ได้ ถ้าใช้กรอบจะเข้าไปยืนสร้างไม่ได้เลย
 *  ใกล้หลายอันพร้อมกันก็เอาอันที่ใกล้ที่สุด */
export const BUILD_REACH = 150;
export function nearBuild(g, x, y) {
  let best = null, bd = BUILD_REACH;
  for (const d of STATIONS) {
    if (g.stations.some(s => s.def.k === d.k)) continue;
    const dist = Math.hypot(d.x - x, d.y - y);
    if (dist < bd) { bd = dist; best = d; }
  }
  return best;
}

/** กรอบจริงของป้าย "กดเพื่อสร้าง" ที่ลอยเหนือหัวตัวละคร — แยกออกมาให้ buildPrompt() (วาด)
 *  กับ hitBuildPrompt() (เช็คคลิก ใน ui.js) ใช้สูตรเดียวกันเป๊ะ ไม่มีทางเพี้ยนจากกัน
 *  (ชุดที่ 10 คุณเป้ 25 ก.ย. 2569 ข้อ E3 — เดิมกรอบคลิกจริงคือ def.hit ที่ระดับพื้น แต่ป้ายลอยอยู่
 *  เหนือหัวตัวละคร cy = def.y-122 ซึ่งบางหลัง (โดยเฉพาะหลังเตี้ย/แคบ) ป้ายลอยพ้นกรอบ def.hit ไปเลย
 *  ผู้เล่นเห็นป้าย "กดตรงนี้" แล้วกดตรงป้ายจริง ๆ แต่กรอบคลิกจริงอยู่คนละที่ กดเท่าไหร่ก็ไม่ติด) */
function buildPromptRect(ctx, def, afford) {
  const cx = def.x, cy = Math.max(46, (topOf(def) ?? def.by - def.bw) - 40 * UI_SCALE_MAP);
  const l1 = `${def.glyph} ${def.name}`;
  const l2 = afford ? `⚒ กดตรงนี้เพื่อสร้าง — ${def.cost} เบี้ยกรรม` : `🔒 ต้องมี ${def.cost} เบี้ยกรรม`;
  ctx.font = `700 ${15 * UI_SCALE_MAP}px "IBM Plex Sans Thai","Apple Color Emoji",sans-serif`;
  const w1 = ctx.measureText(l1).width;
  ctx.font = `600 ${11 * UI_SCALE_MAP}px "IBM Plex Sans Thai","Apple Color Emoji",sans-serif`;
  const w2 = ctx.measureText(l2).width;
  const w = Math.max(w1, w2) + 20 * UI_SCALE_MAP, h = 44 * UI_SCALE_MAP;
  const bx = Math.max(6, Math.min(SCENE.w - w - 6, cx - w / 2)), by = cy - h / 2;
  return { bx, by, w, h };
}

/** ป้าย "กดเพื่อสร้าง" ที่โผล่เฉพาะตอนยมบาทยืนอยู่ในเขตนั้น */
function buildPrompt(ctx, def, t, afford) {
  const [x1, y1, x2, y2] = def.hit;
  const q = 0.5 + 0.5 * Math.sin(t / 420);

  // เส้นประวิ่งรอบเขต บอกว่าอาคารจะลงตรงไหน
  ctx.save();
  ctx.strokeStyle = `rgba(255,205,120,${0.28 + q * 0.30})`;
  ctx.lineWidth = 2.5; ctx.setLineDash([11, 9]); ctx.lineDashOffset = -t / 55;
  rr(ctx, x1 + 6, y1 + 6, x2 - x1 - 12, y2 - y1 - 12, 10); ctx.stroke();
  ctx.restore();

  const { bx, by, w, h } = buildPromptRect(ctx, def, afford);
  const l1 = `${def.glyph} ${def.name}`;
  const l2 = afford ? `⚒ กดตรงนี้เพื่อสร้าง — ${def.cost} เบี้ยกรรม` : `🔒 ต้องมี ${def.cost} เบี้ยกรรม`;

  ctx.fillStyle = 'rgba(18,8,13,.93)'; rr(ctx, bx, by, w, h, 10); ctx.fill();
  ctx.strokeStyle = afford ? `rgba(212,163,85,${0.60 + q * 0.40})` : 'rgba(150,116,96,.65)';
  ctx.lineWidth = 2; ctx.stroke();
  label(ctx, l1, bx + w / 2, by + 14 * UI_SCALE_MAP, 15, '#ffe7c4');
  label(ctx, l2, bx + w / 2, by + 31 * UI_SCALE_MAP, 11, afford ? '#d4a355' : '#b09a92');
}

/** คลิกโดนป้าย "กดเพื่อสร้าง" ของ def ไหม — ใช้กรอบเดียวกับที่วาดจริงเป๊ะ (buildPromptRect ข้างบน)
 *  afford ไม่ผลต่อขนาดกรอบจริง (ข้อความสองแบบยาวใกล้กัน) ใส่ true ไปตรง ๆ ได้เสมอ */
export function hitBuildPrompt(ctx, def, sx, sy) {
  const { bx, by, w, h } = buildPromptRect(ctx, def, true);
  return sx >= bx && sx <= bx + w && sy >= by && sy <= by + h;
}

/** บทพูดสั้น ๆ ลอยเหนือหัว — แบบเดียวกับ ofcSay ในผังออฟฟิศ */
function bubble(ctx, text, x, y) {
  ctx.font = `600 ${8 * UI_SCALE_MAP}px "IBM Plex Sans Thai",sans-serif`;
  const w = Math.min(180 * UI_SCALE_MAP, ctx.measureText(text).width + 10 * UI_SCALE_MAP), h = 16 * UI_SCALE_MAP;
  const bx = Math.max(6, Math.min(SCENE.w - w - 6, x - w / 2));
  ctx.fillStyle = 'rgba(20,9,14,.92)'; rr(ctx, bx, y - h, w, h, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(212,163,85,.55)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 7);
  ctx.fillStyle = 'rgba(20,9,14,.92)'; ctx.fill();
  ctx.fillStyle = '#f2e6dd'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + w / 2, y - h / 2 + 1, w - 10 * UI_SCALE_MAP);
}

function label(ctx, text, x, y, size, color = '#fff') {
  ctx.font = `600 ${size * UI_SCALE_MAP}px "IBM Plex Sans Thai","Apple Color Emoji",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,.75)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

/** แปลงพิกัดเมาส์ -> พิกัดฉาก */
export function toScene(cv, e) {
  const r = cv.getBoundingClientRect();
  return [(e.clientX - r.left) / r.width * SCENE.w, (e.clientY - r.top) / r.height * SCENE.h];
}

/** คลิกโดนสถานีไหน (คืน def — จะสร้างแล้วหรือยังไม่สร้างก็ได้) */
const stationHitBox = def => typeof document === 'undefined' ? def.hit : (bodyBoxOf(def) || def.hit);
export function hitStation(sx, sy) {
  // ไล่จากกรอบเล็กไปใหญ่ เผื่อกรอบซ้อนกัน จะได้เลือกอันที่เจาะจงกว่า
  return [...STATIONS]
    .sort((a, b) => area(stationHitBox(a)) - area(stationHitBox(b)))
    .find(d => {
      const h = stationHitBox(d);
      return sx >= h[0] && sx <= h[2] && sy >= h[1] && sy <= h[3];
    }) || null;
}

/** คลิกโดนซุ้มประตูชายแดนหรือไม่ */
export function hitFrontier(g, sx, sy) {
  const h = FRONTIER.hit;
  return sx >= h[0] && sx <= h[2] && sy >= h[1] && sy <= h[3];
}
const area = h => (h[2] - h[0]) * (h[3] - h[1]);

/** คลิกโดนตัวไหนบนฉาก — คืน {kind,key} ที่แผงข้อมูลเอาไปแสดงต่อ
 *  ไล่จากตัวที่ผู้เล่นตั้งใจกดมากที่สุดไปหาน้อยที่สุด (เปรต > วิญญาณ > ยมทูต > ตัวเรา) */
export function hitActor(g, sx, sy) {
  const radius = base => base * CHAR_SCALE_MAP + CHAR_HIT_PAD_MAP;
  const near = (x, y, r = radius(44)) => Math.hypot(x - sx, y - sy) < r && sy < y + 16 * CHAR_SCALE_MAP;
  const rest = finalRestSpot(g);
  if (rest && near(rest.x,rest.y,radius(40))) return { kind:'finalRest', ...rest };
  for (const a of devaMapActors(g)) if (a.enabled && near(a.x,a.y,radius(45))) return { ...a, kind:'devaEncounter' };
  for (const a of finalEventActors(g)) if (!a.reinforcement && near(a.x,a.y,radius(45))) return { kind:'finalEncounter', key:a.id, x:a.x,y:a.y, enabled:a.enabled };
  for (const ev of waitingEvents(g)) if (near(ev.x, ev.y, radius(70))) return { kind:'zoneEvent', key:ev.key };
  if (g.bossGuarding?.[g.zone] && near(SPOTS.bossPier.x, SPOTS.bossPier.y, radius(75)))
    return { kind:'bossPending', key:g.zone };
  if (g.zoneCaptivesFree() && near(MERCHANT.x, MERCHANT.y, radius(54))) return { kind:'merchant', key:0 };
  if (g.zone === 'west' && g.zoneEventStatus('westHypnotized') === 'pending' &&
      [[1110,465],[1240,535],[1335,615]].some(([x,y]) => near(x,y,radius(78))))
    return { kind:'zoneEvent', key:'westHypnotized' };
  if (g.bossCleared?.[g.zone] && near(SPOTS.bossPier.x, SPOTS.bossPier.y, radius(54))) return { kind:'boss', key:g.zone };
  for (let i = 0; i < g.mobs.length; i++)
    if (near(g.mobs[i].x, g.mobs[i].y)) return g.mobs[i].eventKey
      ? { kind:'eventRaider', key:g.mobs[i].eventKey } : { kind: 'mob', key: i };
  // ป้ายวงกลมเหนือสถานี — กดแล้วเปิดหน้าสถานีนั้น
  for (const st of g.stations) {
    if (st.build || !st.slots.length) continue;
    const [bx, by] = badgePos(st.def);
    if (Math.hypot(bx - sx, by - sy) < BADGE_R + 8) return { kind: 'station', key: st.def.k };
  }
  for (let i = 0; i < g.queue.length; i++) {
    const p = QUEUE_LINE[i];
    if (p && near(p[0], p[1], radius(34))) return { kind: 'soul', key: g.queue[i].id };
  }
  for (const walk of g.afterlifeWalks || []) {
    if (walk.zone !== g.zone) continue;
    const [x, y] = afterlifeWalkPosition(walk);
    if (near(x, y, radius(34))) return { kind:'soul', key:walk.soul.id };
  }
  for (const c of g.crew)
    if (actorStanding(c) && c.x != null && near(c.x, c.y)) return { kind: 'crew', key: c.k };
  if (actorStanding(g.guard) && near(g.guard.x, g.guard.y)) return { kind: 'guard', key: 0 };
  if (near(g.player.x, g.player.y)) return { kind: 'me', key: 0 };
  return null;
}
