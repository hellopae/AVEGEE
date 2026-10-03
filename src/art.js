// art.js — ชั้นวาดภาพทั้งหมด
// กฎ: ทุกชิ้นต้องมี placeholder ที่โค้ดวาดเองได้ ถ้ามีไฟล์ img/<key>.png ให้ใช้ไฟล์แทนอัตโนมัติ
// => ดรอปรูปจริงลง img/ แล้วเกมเปลี่ยนหน้าตาทันที โดยไม่ต้องแตะโค้ดสักบรรทัด

import { regionalSpiritAliases, SPIRIT_ARCHETYPES } from './regional-spirits.js';
import { crewWalkSheet } from './crew-walk-assets.js';
import { heroWalkSheet } from './hero-walk-assets.js';

const CACHE = new Map();
const HERO_WALK_STRIDE = 14; // world units per sprite frame; walk speed stays unchanged

// ---------- รูปประจำโซน (11 ก.ย. 2569) ----------
// โซน 2-3 มีรูปของตัวเองในโฟลเดอร์ย่อย: img/Asia/<key>-asia.png · img/West/<key>-west.png
// อยู่โซนไหนก็หาของโซนนั้นก่อน ไม่มีค่อยถอยไปใช้ img/<key>.png ของโซน 1
// รายชื่อไฟล์มาจาก img/manifest.json (zones) — ไม่ยิงถามทีละไฟล์ให้ 404 เต็มคอนโซล
// โซน 1 ใช้ภาพวิญญาณชุดใหม่ ส่วนภาพตัวละครและอาคารเดิมยังใช้เส้นทางเดิม
let zoneOf = () => 'th';
let heroStyleOf = () => null;             // ชุด Yama เลือกแยกจากโซนที่กำลังคุมได้
const ZMAP = {};                         // zone → { ชื่อไฟล์ไม่มีนามสกุล: path ใต้ img/ }
let BOXES = {};                          // กรอบเนื้อภาพของอาคาร st-* (0-1) — ดู boxes ใน make-manifest.py
let STATION_SIZES = {};                  // ขนาดภาพจริงของสถานีหลังครอป
const warmed = new Set();
let epoch = 0;
/** เลขรุ่นของข้อมูลรูป — ขยับเมื่อ manifest มาถึง (กรอบอาคารของโซนอาจเปลี่ยน)
 *  game.syncBlocks ใส่เลขนี้ใน signature ไม่งั้นฐานอาคารที่วัดไว้ก่อน manifest มาจะค้างทั้งเกม */
export const artEpoch = () => epoch;
/** ให้ art.js รู้ว่าตอนนี้อยู่โซนไหน — ui.js ผูกกับ g.zone ครั้งเดียวตอนเริ่ม */
export function bindZone(fn) { zoneOf = fn; }
export function bindHeroStyle(fn) { heroStyleOf = fn; }
/** เริ่มโหลดรูปทั้งชุดของโซนนี้ล่วงหน้า — เรียกซ้ำได้ ทำจริงครั้งเดียวต่อโซน
 *  (ไม่งั้นย้ายโซนแล้วอาคารเป็นกล่องเปล่าอยู่ครู่หนึ่งระหว่างรอไฟล์) */
export function warmZone(z = zoneOf()) {
  if (warmed.has(z) || !ZMAP[z]) return;
  warmed.add(z);
  for (const p of Object.values(ZMAP[z])) if (!p.includes('/BG-') && !p.includes('/spirit-')) load('img/' + p); // Soul art loads on demand; do not fetch the whole cast on arrival.
}
// ใส่รุ่นใน URL เพราะ GitHub Pages เคยค้าง manifest เก่าที่ไม่มีรายการโซน แม้ไฟล์ภาพใหม่ขึ้นแล้ว
fetch('img/manifest.json?v=20261003-29f-art', { cache: 'no-cache' })
  .then(r => r.ok ? r.json() : null)
  .then(m => {
    for (const [z, list] of Object.entries((m && m.zones) || {})) {
      const mapZone = z === 'thai' ? 'th' : z;
      ZMAP[mapZone] = {};
      if (mapZone !== z) ZMAP[z] = ZMAP[mapZone];
      for (const p of list) ZMAP[z][p.split('/').pop().replace(/\.[a-z]+$/i, '')] = p;
      for (const [key, path] of Object.entries(regionalSpiritAliases(mapZone))) {
        if (list.includes(path)) ZMAP[z][key] = path;
      }
      const guard = `crew-guard-${z}`;
      if (ZMAP[z][`${guard}-v2`]) ZMAP[z][guard] = ZMAP[z][`${guard}-v2`];
      // 28D: use the compact ruler revision for every existing hero-boss caller.
      if (z === 'west' || z === 'cyberhell') {
        const ruler = `hero-boss-${z}`;
        if (ZMAP[z][`${ruler}-v2`]) ZMAP[z][ruler] = ZMAP[z][`${ruler}-v2`];
      }
    }
    BOXES = (m && m.boxes) || {};
    STATION_SIZES = (m && m.stationSizes) || {};
    epoch++;
    warmZone();
  })
  .catch(() => { /* ไม่มี manifest = ไม่มีรูปโซน ใช้โซน 1 ทั้งหมด เกมไม่พัง */ });

/** ท่าพิเศษ — ชื่อไฟล์โซนใส่ชื่อโซนก่อนคำท้าย: hero-yama-asia-profile · crew-taan-asia-work
 *  ต้องตรงกับ POSES ใน scripts/prep-art.py */
const POSE = /-(build-work|profile|work|atk|side|walk|cry)$/;
const zoneStem = (key, z) => { const m = key.match(POSE); return m ? `${key.slice(0, -m[0].length)}-${z}${m[0]}` : `${key}-${z}`; };

/** path ของไฟล์ที่ต้องใช้กับคีย์นี้ในโซนตอนนี้
 *  คืน null = "ท่านี้ของโซนนี้ยังไม่มี แต่ตัวละครของโซนมีแล้ว" → ผู้เรียกต้องถอยไปท่ายืน
 *  (กันหน้าไม่ตรง: ยมทูตโซน 2 ยังไม่มีท่าทำงาน ถ้าหยิบท่าทำงานโซน 1 มาจะกลายเป็นคนละตัว
 *   — Mind ชี้ไว้ 10 ก.ย. 2569 · ใช้กับ -profile -work -atk -side -walk เหมือนกันหมด) */
export function artUrl(key, ext = 'png') {
  const z = key.startsWith('hero-yama') ? (heroStyleOf() || zoneOf()) : zoneOf();
  const map = ZMAP[z];
  if (key === 'hero-yama-walk-4dir') return heroWalkSheet(z).src;
  if (/^crew-(nira|taan|plerng|dam|kan|boon|guard)-walk$/.test(key))
    return crewWalkSheet(key.slice(0, -5), z)?.src || null;
  // Semantic soul assets ship at known paths, including before the async manifest arrives.
  const soulKey = key.replace(POSE, '');
  if (soulKey.startsWith('spirit-') && SPIRIT_ARCHETYPES.includes(soulKey.slice(7))) {
    if (soulKey !== key) return null; // No separate profile pose: use the full sprite.
    const path = regionalSpiritAliases(z)[`${key}-${z}`] || regionalSpiritAliases('th')[`${key}-th`];
    return 'img/' + path;
  }
  if (z === 'th' && map && /^(spirit\d+|soul-)/.test(key)) {
    const regional = regionalSpiritAliases('th')[`${key}-th`];
    if (regional && Object.values(map).includes(regional)) return 'img/' + regional;
  }
  if (map) {
    const hit = map[zoneStem(key, z)];
    if (hit) return 'img/' + hit;
    const m = key.match(POSE);
    if (m && map[zoneStem(key.slice(0, -m[0].length), z)]) return null;
  }
  return `img/${key === 'crew-guard' && ext === 'png' ? 'crew-guard-v2' : key}.${ext}`;
}

function load(src) {
  if (CACHE.has(src)) return CACHE.get(src);
  const el = new Image();
  const rec = { el, ok: false };
  el.onload = () => { rec.ok = true; };
  el.onerror = () => { rec.ok = false; };
  el.src = src;
  CACHE.set(src, rec);
  return rec;
}

/** ขอรูปจริง คืน null ถ้ายังไม่มีไฟล์ (แล้วผู้เรียกวาด placeholder เอง) */
export function img(key) {
  const src = artUrl(key);
  if (!src) return null;
  const r = load(src);
  return r.ok ? r.el : null;
}

/** รูปของโซนนี้เท่านั้น — ไม่มีก็ null (ไม่ถอยไปโซน 1) ใช้กับฉากโซนที่มีชื่อไฟล์ของตัวเองอยู่แล้ว */
export function zoneImg(key) {
  const z = zoneOf(), hit = ZMAP[z] && ZMAP[z][zoneStem(key, z)];
  if (!hit) return null;
  const r = load('img/' + hit);
  return r.ok ? r.el : null;
}

export const hash = (x, y) => {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

// ---------- พื้นสำรอง (ใช้ตอนยังไม่มี img/scene.png) ----------
export const PAT = 256;
const PATS = new Map();

function patternFor(ctx, type) {
  if (PATS.has(type)) return PATS.get(type);
  const im = img('tile-' + type);
  if (!im) return null;
  const off = document.createElement('canvas');
  off.width = off.height = PAT;
  const oc = off.getContext('2d');
  oc.imageSmoothingEnabled = false;
  oc.drawImage(im, 0, 0, PAT, PAT);
  const pat = ctx.createPattern(off, 'repeat');
  PATS.set(type, pat);
  return pat;
}

/** ฉากยังไม่มา — ปูพื้นหินแล้ววางแท่นสถานีให้พอเล่นได้ */
export function drawFallbackGround(ctx, w, h, stations, g) {
  const rock = patternFor(ctx, 'rock');
  ctx.fillStyle = rock || '#1c0f16';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(18,7,13,.30)';
  ctx.fillRect(0, 0, w, h);
  for (const def of stations) {
    if (!g.stations.some(s => s.def.k === def.k)) continue;
    const [x1, y1, x2, y2] = def.hit;
    ctx.fillStyle = 'rgba(46,28,36,.92)';
    rr(ctx, x1, y1, x2 - x1, y2 - y1, 14); ctx.fill();
    ctx.strokeStyle = '#7d3a3f'; ctx.lineWidth = 4; ctx.stroke();
  }
}

/** กรอบวาดสถานี: bw คือความกว้างอ้างอิงของผืนเดิม 512px
 *  รักษาขนาดเนื้อภาพและสัดส่วนเดิม ยึดกึ่งกลางเนื้อภาพกับขอบล่างที่ (bx,by)
 *  ภาพโซนอื่นกว้างไม่เกินโซน 1 และสูงไม่เกิน 1.5 เท่า เพื่อไม่ทับทางเดิน */
const TALLER = 1.5;
export function stationBox(def) {
  if (def.bx == null) return null;
  const key = 'st-' + def.k, im = img(key);
  if (!im) return null;
  if (def.k === 'frontier')
    return { im, x: def.bx - def.bw / 2, y: def.by - def.bw, w: def.bw, h: def.bw };
  const src = artUrl(key);
  const sourceKey = src.split('/').pop().replace(/\.png$/, '');
  const B = BOXES[sourceKey] || [0, 0, 1, 1];
  const sourceW = (B[2] - B[0]) * im.naturalWidth;
  const sourceH = (B[3] - B[1]) * im.naturalHeight;
  if (!sourceW || !sourceH) return null;
  let scale = def.bw / 512;
  if (sourceKey !== key) {
    const A = BOXES[key], base = STATION_SIZES[key];
    if (A && base) {
      const baseW = (A[2] - A[0]) * base[0] * def.bw / 512;
      const baseH = (A[3] - A[1]) * base[1] * def.bw / 512;
      scale = Math.min(baseW / sourceW, baseH * TALLER / sourceH);
    }
  }
  // def.flip = วาดกลับด้านแนวนอน (28A: ศาลาน้ำชาโซนบูรพา) — ไม่แตะไฟล์ภาพ แค่กลับตอนวาด/ตอนวัดพิกเซล
  const cxFrac = def.flip ? 1 - (B[0] + B[2]) / 2 : (B[0] + B[2]) / 2;
  return { im, w: im.naturalWidth * scale, h: im.naturalHeight * scale, flip: !!def.flip,
           x: def.bx - cxFrac * im.naturalWidth * scale,
           y: def.by - B[3] * im.naturalHeight * scale };
}

/** กรอบ "ฐานอาคาร" ที่เดินทับไม่ได้ — วัดจากพิกเซลจริงของสไปรท์ ไม่ใช่กรอกมือ
 *  (เจ้าของทำผังสีแดงมาให้ 8 ก.ย. 2569 ว่าเดินทับอาคารได้ทุกหลัง ต้องปิด)
 *  อ่านแถบล่างของเนื้อภาพแล้วคืนกรอบในพิกัดฉาก — วาดรูปใหม่แล้วกรอบขยับตามเอง
 *  คืน null ถ้ารูปยังโหลดไม่เสร็จ (ผู้เรียกลองใหม่รอบหน้าได้) */
const footCache = new Map();
export function footOf(def) {
  if (def.bx == null) return null;
  const box = stationBox(def);
  if (!box || !box.im.naturalWidth) return null;
  // คนละโซนคนละรูป และกรอบอาจเปลี่ยนตอน manifest มาถึงทีหลัง — จำแยกตามทั้งสองอย่าง
  const im = box.im, ck = `${def.k}|${im.src}|${box.x | 0},${box.y | 0},${box.w | 0}|${box.flip ? 'f' : ''}`;
  if (footCache.has(ck)) return footCache.get(ck);
  const N = 72;                                   // ย่อลงก่อนอ่านพิกเซล พอสำหรับวัดฐาน
  const c = document.createElement('canvas');
  c.width = N; c.height = N;
  const cx = c.getContext('2d', { willReadFrequently: true });
  cx.drawImage(im, 0, 0, N, N);
  let d;
  try { d = cx.getImageData(0, 0, N, N).data; } catch { footCache.set(ck, null); return null; }
  const solid = (x, y) => d[(y * N + (box.flip ? N - 1 - x : x)) * 4 + 3] > 40;
  let bot = -1;
  for (let y = N - 1; y >= 0 && bot < 0; y--)
    for (let x = 0; x < N; x++) if (solid(x, y)) { bot = y; break; }
  if (bot < 0) { footCache.set(ck, null); return null; }
  const band = Math.max(2, Math.round(N * 0.16));  // แถบล่างของตัวอาคาร = ส่วนที่ติดพื้น
  let x1 = N, x2 = -1;
  for (let y = Math.max(0, bot - band); y <= bot; y++)
    for (let x = 0; x < N; x++) if (solid(x, y)) { if (x < x1) x1 = x; if (x > x2) x2 = x; }
  if (x2 < x1) { footCache.set(ck, null); return null; }
  const sx = v => box.x + v / N * box.w;
  const sy = v => box.y + v / N * box.h;
  // เผื่อขอบเข้ามานิดหนึ่งทั้งสองข้าง จะได้เดินเฉียดขอบอาคารได้ ไม่ใช่ชนอากาศ
  const pad = (sx(x2) - sx(x1)) * 0.06;
  const r = [sx(x1) + pad, sy(bot - band), sx(x2) - pad, sy(bot)];
  footCache.set(ck, r);
  return r;
}

/** กรอบเนื้อภาพทั้งหลังในพิกัดฉาก [x1,y1,x2,y2] — วัดจากพิกเซลจริงเหมือน footOf
 *  footOf = แถบล่างที่ติดพื้น · bodyBoxOf = ทั้งก้อนรวมหลังคา
 *  ใช้ตอบคำถามว่า "ยืนตรงนี้แล้วอาคารบังไหม" */
const bodyCache = new Map();
export function bodyBoxOf(def) {
  if (def.bx == null) return null;
  const box = stationBox(def);
  if (!box || !box.im.naturalWidth) return null;
  const im = box.im, ck = `${def.k}|${im.src}|${box.x | 0},${box.y | 0},${box.w | 0}|${box.flip ? 'f' : ''}`;
  if (bodyCache.has(ck)) return bodyCache.get(ck);
  const N = 72;
  const c = document.createElement('canvas');
  c.width = N; c.height = N;
  const cx = c.getContext('2d', { willReadFrequently: true });
  cx.drawImage(im, 0, 0, N, N);
  let d;
  try { d = cx.getImageData(0, 0, N, N).data; } catch { bodyCache.set(ck, null); return null; }
  let x1 = N, y1 = N, x2 = -1, y2 = -1;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++)
      if (d[(y * N + (box.flip ? N - 1 - x : x)) * 4 + 3] > 40) {
        if (x < x1) x1 = x;
        if (x > x2) x2 = x;
        if (y < y1) y1 = y;
        y2 = y;
      }
  const r = x2 < x1 ? null
    : [box.x + x1 / N * box.w, box.y + y1 / N * box.h,
       box.x + (x2 + 1) / N * box.w, box.y + (y2 + 1) / N * box.h];
  bodyCache.set(ck, r);
  return r;
}

/** ความลึกของอาคารสำหรับเรียงชั้นวาด — **ขอบหลังของแถบฐานที่ติดพื้น** ไม่ใช่ def.by
 *  def.by คือ "ขอบหน้าสุด" ของสไปรท์ (ปลายบันได/ปลายลานหน้า) ซึ่งเป็นค่าที่ผิดสำหรับเรียงชั้น:
 *  สไปรท์อาคารเป็นภาพมุมเฉียง ฐานกินพื้นเป็น **แถบ** ไม่ใช่เส้นเดียว ใครที่ยืนบนแถบนั้น
 *  (= ยืนบนลานหน้าอาคาร ซึ่งคือจุดประจำของยมทูตหลายคน) จะมี y น้อยกว่า by เสมอ
 *  → ถูกวาดก่อนอาคาร → จมหายไปทั้งตัว (เจ้าของทักซ้ำ 12 ก.ย. 2569: บุญที่ศาลาน้ำชา · กานต์ที่หอทะเบียน)
 *  วัดจากพิกเซลจริง รูปเปลี่ยนแล้วขยับตามเอง — ไม่ใช่การกรอกพิกัดใหม่ด้วยมือ */
export function depthOf(def) {
  const r = footOf(def);
  return r ? r[1] : (def.by ?? def.y);
}

/** ยืนที่ (x,y) แล้วอาคารหลังนี้บังไหม — อยู่ในช่วงกว้างของเนื้อภาพ และลึกกว่าแถบฐาน */
export function hiddenAt(def, x, y) {
  const b = bodyBoxOf(def);
  if (!b) return false;
  return x > b[0] && x < b[2] && y >= b[1] - 8 && y < depthOf(def);
}

/** ยอดของอาคารในพิกัดฉาก — วัดจากพิกเซลจริงเหมือนกัน
 *  ใช้วางป้ายวงกลมเหนือหลังคา · สไปรท์ส่วนใหญ่มีที่ว่างเหนือเนื้อภาพเยอะ
 *  ถ้าใช้ (by - bw) ตรง ๆ ป้ายจะลอยไปอยู่กลางฟ้าเหนืออาคารหลายสิบพิกเซล */
const topCache = new Map();
export function topOf(def) {
  if (def.bx == null) return null;
  const box = stationBox(def);
  if (!box || !box.im.naturalWidth) return null;
  const im = box.im, ck = `${def.k}|${im.src}|${box.x | 0},${box.y | 0},${box.w | 0}|${box.flip ? 'f' : ''}`;
  if (topCache.has(ck)) return topCache.get(ck);
  const N = 72;
  const c = document.createElement('canvas');
  c.width = N; c.height = N;
  const cx = c.getContext('2d', { willReadFrequently: true });
  cx.drawImage(im, 0, 0, N, N);
  let d;
  try { d = cx.getImageData(0, 0, N, N).data; } catch { topCache.set(ck, null); return null; }
  let top = -1;
  for (let y = 0; y < N && top < 0; y++)
    for (let x = 0; x < N; x++) if (d[(y * N + x) * 4 + 3] > 40) { top = y; break; }
  const r = top < 0 ? null : box.y + top / N * box.h;
  topCache.set(ck, r);
  return r;
}

/** เงาทอดใต้อาคาร — ข้อ B คุณเป้เจอ 25 ก.ย. 2569: อาคาร/สถานีทุกหลังดูลอย ไม่มีอะไรยึดกับพื้น
 *  ใช้ footOf(def) (แถบฐานจริงที่วัดจากพิกเซล เหมือนที่ใช้กันเดินทับ) เป็นฐานวางวงรีเงา
 *  ไม่มีรูปให้วัด (ยังโหลดไม่เสร็จ/ยังไม่มีไฟล์) ก็ประมาณจาก bx/by/bw แทนไว้ก่อน ไม่ปล่อยว่าง
 *  ทิศเดียวกันทุกหลังทั้งแผนที่ (เยื้องขวา-ล่างนิดเดียว) จะได้ดูเหมือนแสงมาจากทิศเดียวกันหมด
 *  วาดเป็นวงรีโปร่งแสงนุ่ม ๆ ก่อนตัวอาคารเสมอ ไม่แตะป้าย/ปุ่ม HTML (คนละชั้นกับ canvas)
 *  footOf มี cache อยู่แล้วในตัว (ดูฟังก์ชันนั้น) เรียกทุกเฟรมได้โดยไม่กระทบเฟรมเรตมือถือ */
export function drawStationShadow(ctx, def) {
  if (def.bx == null) return;
  const r = footOf(def) || [def.bx - def.bw * 0.32, def.by - def.bw * 0.05,
                             def.bx + def.bw * 0.32, def.by + def.bw * 0.05];
  const cx = (r[0] + r[2]) / 2, cy = r[3];
  const rw = Math.max(10, (r[2] - r[0]) / 2 * 1.1), rh = Math.max(5, rw * 0.24);
  ctx.save();
  ctx.globalAlpha = 0.38;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(cx + rw * 0.12, cy + rh * 0.35, rw, rh, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** อาคารสถานี — ไฟล์ img/st-<k>.png วางกึ่งกลาง-ฐานที่ (bx,by) กว้าง bw
 *  ไม่มีไฟล์ก็ไม่วาดอะไร (ฉากรุ่นเก่ามีอาคารวาดติดมาอยู่แล้ว) */
export function drawBuilding(ctx, def, t, uiScale = 1) {
  if (def.bx == null) return;
  const b = stationBox(def);
  if (b) {
    if (b.flip) {                                 // กลับด้านแนวนอนรอบกึ่งกลางกรอบวาด
      ctx.save(); ctx.translate(b.x + b.w, b.y); ctx.scale(-1, 1);
      ctx.drawImage(b.im, 0, 0, b.w, b.h); ctx.restore();
    } else ctx.drawImage(b.im, b.x, b.y, b.w, b.h);
    return;
  }

  // ยังไม่มีไฟล์ img/st-<k>.png — วาดกล่องหินแทนไว้ก่อน
  // 7 ก.ย. 2569: ดงต้นงิ้วชื่อไฟล์ผิดกติกาแล้ว "สร้างเสร็จแต่จอว่างเปล่า" อยู่หลายวัน
  // โดยไม่มีอะไรบอกเลย — ต่อจากนี้อย่างน้อยต้องเห็นว่ามันมีอยู่ตรงนั้น
  const w = def.bw * 0.72, h = def.bw * 0.52;
  const x = def.bx - w / 2, y = def.by - h;
  ctx.save();
  ctx.fillStyle = 'rgba(42,24,32,.94)';
  rr(ctx, x, y, w, h, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(212,163,85,.85)'; ctx.lineWidth = 2;
  ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]);
  ctx.textAlign = 'center';
  ctx.font = `${Math.round(h * 0.34)}px system-ui, sans-serif`;
  ctx.fillStyle = '#ffd9b0';
  ctx.fillText(def.glyph, def.bx, y + h * 0.46);
  ctx.font = `600 ${12 * uiScale}px "IBM Plex Sans Thai", system-ui, sans-serif`;
  ctx.fillStyle = '#d4a355';
  ctx.fillText(def.name, def.bx, y + h * 0.78);
  ctx.restore();
}

// ---------- ตัวละคร ----------
/** วางตัวละครแบบ standee: เท้าอยู่ที่ (x,y) สูง h ในพิกัดฉาก
 *  ยังไม่มีรูปก็วาดเงา + สัญลักษณ์แทน เกมเล่นได้เหมือนกัน */
export function drawStandee(ctx, key, x, y, h, t, glyph = '❓', face = 1, walking = false) {
  const gait = Math.floor(t / 105) % 2;
  const bob = walking ? (gait ? -h * 0.065 : 0) : Math.sin(t / 700 + x) * (h * 0.012);
  ctx.fillStyle = 'rgba(0,0,0,.42)';
  ctx.beginPath(); ctx.ellipse(x, y, h * 0.24, h * 0.075, 0, 0, 7); ctx.fill();
  const im = img(key);
  if (im) {
    if (walking) {
      // จังหวะสองเฟรมแบบ Office Agent: เด้ง สลับยืด/หด และเอียงตามก้าว
      const sx = gait ? 0.965 : 1.045, sy = gait ? 1.045 : 0.965;
      ctx.save(); ctx.translate(x, y + bob); ctx.rotate((gait ? 1 : -1) * face * 0.035);
      ctx.scale(face * sx, sy); ctx.drawImage(im, -h / 2, -h, h, h); ctx.restore();
    } else if (face < 0) {                 // เดินไปทางซ้าย — พลิกกระจก
      ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1);
      ctx.drawImage(im, -h / 2, y - h + bob, h, h); ctx.restore();
    } else ctx.drawImage(im, x - h / 2, y - h + bob, h, h);
    return;
  }
  ctx.font = `${Math.round(h * 0.62)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(glyph, x, y - h * 0.1 + bob);
}

/** สี่เฟรมในภาพแถบเดียว; คืน false เมื่อชุดที่สวมยังไม่มีภาพเดิน */
export function drawHeroWalk(ctx, x, y, h, distance, face = 1, direction = face < 0 ? 'left' : 'right') {
  const sheet = heroWalkSheet(heroStyleOf() || zoneOf());
  const four = img('hero-yama-walk-4dir');
  if (four?.naturalWidth && four?.naturalHeight) {
    const phase = Math.floor(Math.max(0, distance) / HERO_WALK_STRIDE) % 4;
    const box = (sheet.directions[direction] || sheet.directions.down)[phase];
    const height = h * sheet.heightScale, scale = height / sheet.frameSize.h;
    const width = sheet.frameSize.w * scale;
    ctx.fillStyle = 'rgba(0,0,0,.42)';
    ctx.beginPath(); ctx.ellipse(x, y, h * .24, h * .075, 0, 0, 7); ctx.fill();
    // Every direction is drawn explicitly, including the book and asymmetric clothing.
    ctx.drawImage(four, box.x, box.y, box.w, box.h,
      x - width / 2 + box.ox * scale, y - h * sheet.footOffset - height + box.oy * scale,
      box.w * scale, box.h * scale);
    return true;
  }
  const im = img('hero-yama-walk');
  if (!im || !im.naturalWidth || !im.naturalHeight) return false;
  const frameW = im.naturalWidth / 4;
  const frame = Math.floor(distance / HERO_WALK_STRIDE) % 4;
  const drawW = h * frameW / im.naturalHeight;
  ctx.fillStyle = 'rgba(0,0,0,.42)';
  ctx.beginPath(); ctx.ellipse(x, y, h * 0.24, h * 0.075, 0, 0, 7); ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  // สไปรท์เดินทั้ง 4 ชุดวาดหันซ้าย (ต่างจากท่ายืนที่หันขวา) จึงกลับเครื่องหมาย: face>0 = ไปขวา ต้องพลิก
  ctx.scale(-face, 1);
  ctx.drawImage(im, frame * frameW, 0, frameW, im.naturalHeight,
                -drawW / 2, -h + 2, drawW, h);
  ctx.restore();
  return true;
}

/** Native RGBA walk frames preserve scale and anchors; phase follows actual travel. */
export function drawCrewWalk(ctx, key, x, y, h, distance, face = 1) {
  const im = img(`${key}-walk`);
  if (!im || !im.naturalWidth || !im.naturalHeight) return false;
  const sheet = crewWalkSheet(key, zoneOf());
  const frameW = im.naturalWidth / 4;
  const frame = Math.floor(Math.max(0, distance) / HERO_WALK_STRIDE) % 4;
  const box = sheet?.frames?.[frame] || { x:frame * frameW, y:0, w:frameW, h:im.naturalHeight };
  const drawH = h * (sheet?.heightScale ?? 1);
  const footY = y - h * (sheet?.footOffset ?? 0);
  const size = sheet?.frameSize || box;
  const pixelScale = drawH / size.h;
  const drawW = pixelScale * size.w;
  ctx.fillStyle = 'rgba(0,0,0,.42)';
  ctx.beginPath(); ctx.ellipse(x, y, h * 0.24, h * 0.075, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(x, footY);
  const direction = face < 0 ? -1 : 1;
  ctx.scale(sheet?.rightFacing === false ? -direction : direction, 1);
  ctx.drawImage(im, box.x, box.y, box.w, box.h, -drawW / 2 + (box.ox || 0) * pixelScale,
    -drawH + (box.oy || 0) * pixelScale, box.w * pixelScale, box.h * pixelScale);
  ctx.restore();
  return true;
}

/** วิญญาณ — ใช้สไปรท์ spirit1..3 ถ้ามี ไม่มีก็วาดดวงเรืองแสงเอง
 *  h = ความสูงบนฉาก · เท้า(ปลายหาง)อยู่ที่ y */
/** จำนวนแบบวิญญาณที่มีไฟล์อยู่ — เพิ่มไฟล์ img/spiritN.png แล้วบวกเลขนี้ */
export const SPIRIT_KINDS = 10;

/** sp → คีย์รูป · เลข = วิญญาณสุ่ม (spirit1..SPIRIT_KINDS) · ข้อความ = สำนวนที่มีชื่อ (img/soul-<k>.png)
 *  ทุกที่ที่แปลง sp เป็นรูปต้องผ่านตัวนี้ — เดิมป้ายบนแผนที่กับแผงข้อมูลต่อ 'spirit' + sp เอง
 *  สำนวนที่มีชื่อเลยได้ "spiritsoul-monk" รูปไม่ขึ้นสักเรื่อง (10 ก.ย. 2569) */
export const soulKey = (sp = 7) =>
  typeof sp === 'string' ? sp : 'spirit' + ((sp - 1) % SPIRIT_KINDS + 1);

export function drawSoul(ctx, x, y, h, t, tint = '#bfe9ff', sp = 7) {
  const bob = Math.sin(t / 520 + x) * (h * 0.05);
  // ยังไม่มีไฟล์ของสำนวนที่มีชื่อ ก็ถอยไปใช้ผีสามัญ ไม่ปล่อยให้เป็นช่องว่าง
  const im = img(soulKey(sp)) || img('spirit7');
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath(); ctx.ellipse(x, y, h * 0.20, h * 0.055, 0, 0, 7); ctx.fill();
  if (im) {
    ctx.save();
    ctx.globalAlpha = 0.93;
    ctx.drawImage(im, x - h / 2, y - h + bob, h, h);
    ctx.restore();
    if (tint !== '#bfe9ff') {          // รอนานแล้ว — ย้อมแดงเตือน
      ctx.save(); ctx.globalAlpha = 0.28; ctx.globalCompositeOperation = 'source-atop';
      ctx.restore();
    }
    return;
  }
  const r = h * 0.24;
  ctx.fillStyle = 'rgba(140,200,255,.14)';
  ctx.beginPath(); ctx.arc(x, y + bob - r, r * 2.0, 0, 7); ctx.fill();
  ctx.fillStyle = tint;
  ctx.beginPath();
  ctx.moveTo(x, y + bob);
  ctx.quadraticCurveTo(x - r, y + bob - r * 1.1, x - r * 0.72, y + bob - r * 1.75);
  ctx.arc(x, y + bob - r * 2.0, r * 0.78, Math.PI * 0.86, Math.PI * 0.14);
  ctx.quadraticCurveTo(x + r, y + bob - r * 1.1, x, y + bob);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,10,26,.65)';
  ctx.beginPath(); ctx.arc(x - r * 0.30, y + bob - r * 2.05, r * 0.13, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.30, y + bob - r * 2.05, r * 0.13, 0, 7); ctx.fill();
}

/** ไฟลุกรอบตัว — ใช้สไปรท์ลูกไฟซ้อนกันหลายใบ ไม่มีไฟล์ก็วาดเปลวด้วยโค้ดแทน */
export function drawFire(ctx, x, y, w, t, n = 3) {
  const im = img('fx-fireball');
  for (let i = 0; i < n; i++) {
    const ph = t / (300 + i * 70) + i * 2.1;
    const dx = (i - (n - 1) / 2) * w * 0.42 + Math.sin(ph) * w * 0.06;
    const h = w * (0.55 + 0.22 * (0.5 + 0.5 * Math.sin(ph * 1.7)));
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.35 * (0.5 + 0.5 * Math.sin(ph * 2.3));
    if (im) ctx.drawImage(im, x + dx - h / 2, y - h, h, h);
    else {
      ctx.fillStyle = '#ff8a2a';
      ctx.beginPath();
      ctx.moveTo(x + dx, y - h);
      ctx.quadraticCurveTo(x + dx + h * 0.36, y - h * 0.35, x + dx, y);
      ctx.quadraticCurveTo(x + dx - h * 0.36, y - h * 0.35, x + dx, y - h);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** เรือข้ามธารลาวา — วิญญาณที่มาไม่ทันคิวนั่งมากับลำนี้ */
export function drawBoat(ctx, x, y, t, riders = 0, inbound = true) {
  const bob = Math.sin(t / 620) * 5;
  const W = 132;
  const im = img('prop-boat');
  if (im) {                                  // รูปจริงหัวนาคอยู่ซ้าย = หันซ้าย · ขามาให้พลิกกระจก
    ctx.save();
    ctx.translate(x, y - W * 0.78 + bob);
    if (inbound) ctx.scale(-1, 1);
    ctx.drawImage(im, -W / 2, 0, W, W);
    ctx.restore();
  }
  else {
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(x, y + 14 + bob, 86, 15, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a2118';                       // ตัวเรือ
    ctx.beginPath();
    ctx.moveTo(x - 84, y - 16 + bob);
    ctx.quadraticCurveTo(x, y + 26 + bob, x + 84, y - 16 + bob);
    ctx.quadraticCurveTo(x, y + 4 + bob, x - 84, y - 16 + bob);
    ctx.fill();
    ctx.strokeStyle = '#6b3d2a'; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = '#2a1a20'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath();                                  // คนแจว + ถ่อ
    ctx.moveTo(x + 44, y - 22 + bob); ctx.lineTo(x + 78, y + 30 + bob); ctx.stroke();
    ctx.fillStyle = '#2f1b26';
    ctx.beginPath(); ctx.ellipse(x + 40, y - 44 + bob, 15, 26, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 40, y - 74 + bob, 13, 0, 7); ctx.fill();
  }
  for (let i = 0; i < riders; i++)
    drawSoul(ctx, x - 22 + i * 30, y - 14 + bob, 38, t + i * 500, '#bfe9ff', i + 1);
}

// ---------- บรรยากาศ ----------
export function drawEmbers(ctx, w, h, t) {
  for (let i = 0; i < 46; i++) {
    const sp = 0.4 + hash(i, 3) * 0.9;
    const x = (hash(i, 1) * w + Math.sin(t / 2200 + i) * 60) % w;
    const y = h - ((t * 0.05 * sp + hash(i, 2) * h) % (h + 120));
    const a = 0.18 + 0.34 * hash(i, 5) * (0.5 + 0.5 * Math.sin(t / 700 + i));
    ctx.fillStyle = `rgba(255,${150 + hash(i, 9) * 70 | 0},80,${a})`;
    ctx.fillRect(x, y, 6, 6);
  }
}

export function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.34, w / 2, h / 2, h * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(8,3,6,.52)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
