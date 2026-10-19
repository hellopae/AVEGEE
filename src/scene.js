import {bossJusticeCase,bossJusticeActors} from './boss-justice.js';
import {zoneWorkers,drawWorker} from './workers.js';
import { drawAnimatedSprite } from './combat-sprites.js?v=night-v1';
import { drawLocalLight } from './scene-style.js';
import { TOWN_DAIS } from './town-layout.js?v=k1d';
import { drawTownTerrain, townTerrainImage } from './town-terrain.js?v=k1d';
import { drawTownFlow } from './town-flow.js?v=n4';
import { drawTownNightEffects, drawTownClouds } from './town-night-effects.js?v=night-v1';
import { drawTownGround, isTownZone, drawTownBackdrop, drawTownFloor, drawTownForeground, drawTownHouse, townHouseDepth, townHouseSites, townHouseKey } from './town-map.js?v=l1';
import { drawTownDistantScenery, drawTownSceneryShadows, addTownSceneryLayers, drawTownHouseLights, townPropArt } from './town-scenery.js?v=l1';
import { updateTownShade, drawTownShadows, drawContactAO, drawActorShadow, withTownShade, visibleBase } from './town-shade.js?v=l1';
import { westRescuePending, westRescueActors, westSpiritsFrozen } from './west-events.js';
import { actorStanding } from './actor-recovery.js';
import { devaMapActors, prisonEventBurning } from './deva-map.js';
import { finalEventActors, finalRestSpot } from './final-event.js';
import { drawMapAmbientGround, drawMapAmbientSky } from './map-ambient.js?v=mapfx-k1d';
// Zone 1 uses tiled terrain and independent depth-sorted props; other realms retain paintings.
// ระบบพิกัดเดียวกับที่เป้วาดฉากมา (SCENE.w x SCENE.h) — โค้ดย่อให้พอดี canvas ตอนวาด

import { SCENE, STATIONS, SPOTS, QUEUE_LINE, ITEMS, MOB, GUARD, BUILD_TIME, REPAIR_TIME, FRONTIER, MERCHANT, ZONE_EVENTS } from './data.js';
import { img, zoneImg, drawFallbackGround, drawStandee, drawHeroWalk, drawCrewWalk, drawBuilding, drawSoul, drawBoat,
         drawFire, drawVignette, drawStationShadow, footOf, rr, topOf, depthOf, bodyBoxOf, soulKey } from './art.js';
import { buildWalk } from './walk.js?v=k1d';
import { walkDirection } from './walk-direction.js';
import { escortCrewPosition, soulWalkPosition } from './escort.js';
import { t as tr } from './i18n.js';
import { waitingEvents } from './npc-stand.js';

export const UI_SCALE_MAP = 1.2;
const MAP_NAME_SIZE = 8; // Character names and floating dialogue share the same map type size.
const CHAR_SCALE_BASE = 0.8;
// L1: on the Zone 1 painted map the actors read too big next to the buildings (owner, 15 Oct 2569):
// Yama stood ~42% of a tall small house (h = 1.46 w) and ~65% of a low one; target 1/3-2/5 -> -25%.
// Town zone only; other maps keep 0.8.
export const TOWN_CHAR_K = 0.75;
export let CHAR_SCALE_MAP = CHAR_SCALE_BASE;   // live binding: ui.js hit padding / pins read the current value
let CREW_H = 82 * CHAR_SCALE_MAP, HERO_H = 92 * CHAR_SCALE_MAP, SOUL_H = 64 * CHAR_SCALE_MAP;
/** Relative actor size of the zone being drawn (1 everywhere except the Zone 1 town). */
export const mapCharK = () => CHAR_SCALE_MAP / CHAR_SCALE_BASE;
export function setMapCharScale(zone) {
  CHAR_SCALE_MAP = CHAR_SCALE_BASE * (isTownZone(zone) ? TOWN_CHAR_K : 1);
  CREW_H = 82 * CHAR_SCALE_MAP; HERO_H = 92 * CHAR_SCALE_MAP; SOUL_H = 64 * CHAR_SCALE_MAP;
}
const CHAR_HIT_PAD_MAP = 12; // touch padding around the smaller standees
const mapStandee = (ctx, key, x, y, h, t, ...rest) =>
  drawStandee(ctx, key, x, y, h * CHAR_SCALE_MAP, t, ...rest);
let lastHeroX = NaN, lastHeroY = NaN, heroMovingUntil = 0, heroWalkDistance = 0, heroDirection = 'down';
let lastHeroActor = null, lastHeroZone = null;
const crewWalkTracks = new WeakMap();
const reducedMotion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
let ambientTime = 0;
const mapViews = new WeakMap();
export const setMapViewport = (cv, view) => mapViews.set(cv, view);

/** One camera projection shared by canvas, pointer inversion and the DOM overlay. */
export function mapViewport(width, height, bw, bh, camera) {
  const z = camera.z;
  const axis = (view, size, center) => size <= view ? (view - size) / 2
    : Math.max(view - size, Math.min(0, view / 2 - center));
  return { width, height, sx:bw / SCENE.w * z, sy:bh / SCENE.h * z,
    tx:axis(width, bw * z, camera.x / SCENE.w * bw * z),
    ty:axis(height, bh * z, camera.y / SCENE.h * bh * z) };
}

/** Resize only when viewport or DPR changes, never once per animation frame. */
export function prepareMapCanvas(ctx) {
  const cv = ctx.canvas, view = mapViews.get(cv);
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  const width = view ? Math.max(1, Math.round(view.width * dpr)) : SCENE.w;
  const height = view ? Math.max(1, Math.round(view.height * dpr)) : SCENE.h;
  if (cv.width !== width) cv.width = width;
  if (cv.height !== height) cv.height = height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const dx = view ? width / view.width : 1, dy = view ? height / view.height : 1;
  ctx.setTransform(view ? view.sx * dx : 1, 0, 0, view ? view.sy * dy : 1,
    view ? view.tx * dx : 0, view ? view.ty * dy : 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (typeof ctx.getTransform === 'function' && !Object.hasOwn(ctx, 'drawImage')) installSpriteCache(ctx);
}

/** Downscaled sprites (512px art drawn at ~90px) look dotted with plain bilinear, but 'high' quality
 *  resampling every frame costs ~4x frame time at DPR 2. Resample each (image, source rect, device size)
 *  once with 'high' quality, then blit the cached canvas ~1:1. Only plain scale/translate draws qualify. */
const SPRITE_CACHE_MAX = 900;
let spriteCache = new WeakMap(), spriteCacheCount = 0;
export const spriteCacheStats = { built: 0, hits: 0 };
function installSpriteCache(ctx) {
  const raw = ctx.drawImage;
  // Upscaled / ~1:1 draws (map layers, masks, glows) gain nothing from 'high' quality and it is very slow at DPR 2.
  const plain = (self, im, a) => {
    const q = self.imageSmoothingQuality; self.imageSmoothingQuality = 'low';
    try { return raw.call(self, im, ...a); } finally { self.imageSmoothingQuality = q; }
  };
  ctx.drawImage = function (im, ...a) {
    if (a.length !== 4 && a.length !== 8) return raw.call(this, im, ...a);
    const m = this.getTransform();
    if (!m || m.b || m.c) return raw.call(this, im, ...a);
    const decoded = im instanceof HTMLImageElement ? im.complete && im.naturalWidth : im.width;
    if (!decoded) return raw.call(this, im, ...a);
    let sx = 0, sy = 0, sw = im.naturalWidth || im.width, sh = im.naturalHeight || im.height, dx, dy, dw, dh;
    if (a.length === 4) [dx, dy, dw, dh] = a; else [sx, sy, sw, sh, dx, dy, dw, dh] = a;
    const pw = Math.abs(dw * m.a), ph = Math.abs(dh * m.d);
    if (pw < 1 || ph < 1 || !(im instanceof HTMLImageElement || im.__sprite) || (sw <= pw * 1.4 && sh <= ph * 1.4)) return plain(this, im, a);
    const qw = Math.ceil(pw / 2) * 2, qh = Math.ceil(ph / 2) * 2, key = `${sx},${sy},${sw},${sh},${qw},${qh}`;
    let per = spriteCache.get(im);
    if (!per) { per = new Map(); spriteCache.set(im, per); }
    let c = per.get(key);
    if (!c) {
      if (spriteCacheCount >= SPRITE_CACHE_MAX) { spriteCache = new WeakMap(); spriteCacheCount = 0; per = new Map(); spriteCache.set(im, per); }
      c = document.createElement('canvas'); c.width = qw; c.height = qh;
      const g2 = c.getContext('2d');
      g2.imageSmoothingEnabled = true; g2.imageSmoothingQuality = 'high';
      g2.drawImage(im, sx, sy, sw, sh, 0, 0, qw, qh);
      per.set(key, c); spriteCacheCount++; spriteCacheStats.built++;
    } else spriteCacheStats.hits++;
    return plain(this, c, [0, 0, qw, qh, dx, dy, dw, dh]);
  };
}
const groundCache = new WeakMap();
/** Map ground at the exact device size. Per-frame 'high' quality resampling of a 1678px image to a 2x
 *  display is ~7x slower than a 1:1 blit, so resample once per (bg, size) and copy pixels afterwards.
 *  Falls back to a direct draw when the transform is not a plain scale+translate. */
function drawMapGround(ctx, bg) {
  const m = ctx.getTransform ? ctx.getTransform() : null;
  if (!m || m.b || m.c || m.a <= 0 || m.d <= 0) { ctx.drawImage(bg, 0, 0, SCENE.w, SCENE.h); return; }
  const w = Math.max(1, Math.round(SCENE.w * m.a)), h = Math.max(1, Math.round(SCENE.h * m.d));
  // Close town zoom can project a 20k-pixel map; do not allocate an offscreen canvas
  // for that whole world. Let the viewport clip a decoded-image draw instead.
  if(w>4096||h>4096) {ctx.drawImage(bg,0,0,SCENE.w,SCENE.h);return;}
  let c = groundCache.get(bg);
  if (!c || c.width !== w || c.height !== h) {
    c = document.createElement('canvas'); c.width = w; c.height = h;
    const g2 = c.getContext('2d');
    g2.imageSmoothingEnabled = true; g2.imageSmoothingQuality = 'high';
    g2.drawImage(bg, 0, 0, w, h);
    groundCache.set(bg, c);
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, Math.round(m.e), Math.round(m.f));
  ctx.drawImage(c, 0, 0);
  ctx.restore();
}
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
  w *= mapCharK();
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

export function render(ctx, g, t, hover, sel, cameraView = null) {
  prepareMapCanvas(ctx);
  setMapCharScale(g.zone);

  // ฉากใหม่ของโซนมาก่อนภาพในโฟลเดอร์รุ่นเก่า
  const zk = g.zoneDef ? g.zoneDef().scene : 'scene';
  const legacyBg = (g.zone === 'west' ? img('scene-west-dusk-v3') : null) || img(zk) || zoneImg('scene') || img('scene');
  const bg = img('theme-map-' + g.zone) || legacyBg;
  if (isTownZone(g.zone)) {
    drawTownTerrain(ctx,img,t,!!reducedMotion?.matches);
  } else if (bg) {
    // Resample the original decoded map once per output size (high quality), then blit 1:1 each frame.
    drawMapGround(ctx, bg);
    // โซนปัจฉิมเป็นธารน้ำแข็งสีฟ้า ผังเดียวกับโซน 1: ใช้ mask ลาวาโซน 1 กันข้ามธาร
    // Painted gold and glowing details are decorative; navigation uses the original terrain mask.
    const maskBg = g.zone === 'west' ? img('scene-v2-opt') : legacyBg;
    if (buildWalk(bg, maskBg)) g.syncBlocks(true);
  }
  else drawFallbackGround(ctx, SCENE.w, SCENE.h, STATIONS, g);

  ambientTime = t; // Decorative motion continues behind dialogue and pause panels.
  if (bg && !isTownZone(g.zone)) drawMapAmbientGround(ctx, bg, g.zone, ambientTime, SCENE.w, SCENE.h, !!reducedMotion?.matches);
  const town = isTownZone(g.zone), reduced = !!reducedMotion?.matches;
  const sceneryHouse = town ? img('town-house-th') : null;
  const sceneryTree = town ? img('town-tree-th') : null;
  const sceneryWaterfall = town ? img('town-waterfall-th') : null;
  if(town) {
    drawTownClouds(ctx,t,reduced);
    drawTownDistantScenery(ctx,sceneryHouse,sceneryTree,cameraView,reduced,img);
    // L1: one sun for the whole town. Casters = props + houses + built stations + gate + dais (baked once).
    updateTownShade(img, townHouseKey, [...g.stations.filter(st=>!st.build).map(st=>st.def), FRONTIER],
      p=>townPropArt(p,sceneryTree,sceneryWaterfall,img));
    drawTownShadows(ctx);
    drawTownSceneryShadows(ctx,sceneryHouse,sceneryTree,sceneryWaterfall,cameraView,reduced,img);
  }
  if(town&&townTerrainImage())drawTownFlow(ctx,t,reduced);   // N4: lava / rivers / falls flow over the painted ground
  drawTownGround(ctx, g);
  if (isTownZone(g.zone)) {
    const newDais=img('town-judgment-th');
    const dais=newDais||img('prop-throne-platform-v1');
    if(dais) {
      ctx.save();ctx.imageSmoothingEnabled=true;
      if(newDais){
        // K1d: the dais is placed by the owner's drawing (foot centre + width), not by the old throne spot.
        const w=TOWN_DAIS.w,h=w*dais.naturalHeight/dais.naturalWidth,top=TOWN_DAIS.y-h;
        { const b=visibleBase(dais,TOWN_DAIS.x,TOWN_DAIS.y,w,h); drawContactAO(ctx,b.x+6,b.y-4,b.w*.56,26); }
        ctx.drawImage(dais,TOWN_DAIS.x-w/2,top,w,h);
        for(const side of [-1,1]){
          const x=TOWN_DAIS.x+side*w*.207,y=top+h*.112;
          drawLocalLight(ctx,'th',x,y,w*.065,t,reduced);
          if(!reduced){
            ctx.fillStyle='rgba(255,197,86,.6)';
            for(let i=0;i<3;i++){
              const phase=(t/1700+i/3+(side+1)*.13)%1;
              ctx.globalAlpha=(1-phase)*.6;ctx.beginPath();
              ctx.ellipse(x+Math.sin(i*9+t/900)*4,y-phase*22,1.1,1.8,0,0,Math.PI*2);ctx.fill();
            }
            ctx.globalAlpha=1;
          }
        }
      }else{
        const size=440;ctx.drawImage(dais,SPOTS.throne.x-size*.508,SPOTS.throne.y-size*.20,size,size);
      }
      ctx.restore();
      ctx.imageSmoothingEnabled=false;
    }
  }

  // Ground shadows and pools of light are painted before the depth-sorted objects.
  for (const st of g.stations) {
    if (st.build) continue;
    if (town) drawStationAO(ctx, st.def); else drawStationShadow(ctx, st.def);
    if (['sala','sawan','krajok'].includes(st.def.k))
      drawLocalLight(ctx,g.zone,st.def.bx,st.def.by,st.def.bw*.24,t,!!reducedMotion?.matches);
  }
  if (town) drawStationAO(ctx, FRONTIER); else drawStationShadow(ctx, FRONTIER);
  drawLocalLight(ctx,g.zone,FRONTIER.bx,FRONTIER.by,FRONTIER.bw*.3,t,!!reducedMotion?.matches);

  const rescue = westRescuePending(g), frozen = westSpiritsFrozen(g);
  const soulTime = frozen ? (g.westFreezeAt || 0) : t;
  // Ferry sits in the river; the painted bridge/island occludes it.
  // Draw before characters and buildings so the gate and bridge retain their foreground.
  {
    const f = SPOTS.ferry, ph = soulTime / 5200, inbound = Math.cos(ph) > 0;
    const fx = f.from[0] + (f.to[0] - f.from[0]) * (Math.sin(ph) + 1) / 2;
    drawBoat(ctx, fx, f.from[1] + 120, soulTime, !rescue && inbound ? Math.min(2, g.queue.length) : 0, inbound);
    if (bg && !isTownZone(g.zone)) {
      ctx.save(); ctx.beginPath();
      const bridge = [[770,620],[904,620],[904,757],[943,790],[943,880],
        [988,937],[676,937],[704,872],[704,790],[770,755]];
      bridge.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
      ctx.closePath(); ctx.clip(); drawMapGround(ctx, bg); ctx.restore();
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
  // L1: actors on the Zone 1 map get a cast shadow on the ground and go darker inside building / tree shadows.
  const justice=bossJusticeCase(g);
  const actorSpots = [];
  const shade = (x, y, h, fn) => town ? withTownShade(ctx, x, y, h, fn) : fn(ctx);
  const spot_ = (x, y, h) => { if (town) actorSpots.push([x, y, h]); };
  const archiveHouse = isTownZone(g.zone) ? img('town-house-th') : null;
  if (archiveHouse) for (const [index,site] of townHouseSites().entries())
    at(townHouseDepth(site), () => drawTownHouse(ctx, img(townHouseKey(index)) || archiveHouse, site));
  if(town)addTownSceneryLayers(at,ctx,archiveHouse,sceneryTree,sceneryWaterfall,g,t,cameraView,reduced,img);
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
  (rescue ? [] : g.queue).forEach((s, i) => {
    const p = QUEUE_LINE[i];
    if (!p) return;
    if (sel && sel.kind === 'soul' && sel.key === s.id) ring(ctx, p[0], p[1], t, 24);
    const qh = i === 0 ? SOUL_H * 1.12 : SOUL_H;
    spot_(p[0], p[1], qh);
    shade(p[0], p[1], qh, c => drawSoul(c, p[0], p[1], qh, soulTime + s.id * 300,
             s.waited > 40 ? '#ffb0b0' : '#bfe9ff', s.sp || 7));
    if (frozen) tag(ctx, p[0], p[1]-SOUL_H-16, 0, ['!!!','#ff9a7a']);
  });

  // วิญญาณที่เพิ่งออกหมายเดินไปสถานีตามเส้นทางที่หาไว้ใน game.js
  const clock = frozen ? (g.westFreezeAt || Date.now()) : Date.now();
  g.transits = (g.transits || []).filter(v => clock < (v.arriveAt || v.started + v.duration));
  for (const v of (rescue ? [] : g.transits)) {
    const escorted = !!v.pickup;
    const waiting = escorted && clock < v.departAt;
    const crewProgress = escorted ? (clock - v.pickupAt) / (v.departAt - v.pickupAt - 650) : 1;
    const travelProgress = escorted ? (clock - v.departAt) / (v.arriveAt - v.departAt)
                                    : (clock - v.started) / v.duration;
    const soulAt = waiting ? QUEUE_LINE[0] : pointOnPath(v.outbound || v.path, travelProgress);
    const crewAt = escorted ? (waiting ? pointOnPath(v.pickup, crewProgress)
                                       : pointOnPath(v.outbound, travelProgress)) : null;
    const x = soulAt[0], y = soulAt[1];
    spot_(x, y, SOUL_H * .82);
    at(y, () => {
      shade(x, y, SOUL_H * .82, c => drawSoul(c, x, y, SOUL_H * .82, soulTime + v.id * 300, '#d9eaff', v.sp || 7));
      if (frozen) tag(ctx, x, y-SOUL_H-16, 0, ['!!!','#ff9a7a']);
      else if (waiting && v.crew) tag(ctx, x, y - SOUL_H - 12, t,
        [clock < v.departAt - 650 ? `รอ ${v.crewName} มารับ` : `${v.crewName}มารับแล้ว`, '#f7c371']);
      else if (travelProgress < .25) tag(ctx, x, y - SOUL_H - 12, t, [`→ ${v.name}`, '#f7c371']);
    });
    if (crewAt && actorStanding(g.crewOf(v.crew))) {
      const escortFace = waiting ? (QUEUE_LINE[0][0] < crewAt[0] ? -1 : 1) : (x < crewAt[0] ? -1 : 1);
      const position = [crewAt[0] - (waiting ? 0 : 24 * escortFace), crewAt[1]];
      const motion = actorWalkMotion(v, t, g.zone, position);
      spot_(position[0], position[1], CREW_H);
      at(crewAt[1] + 1, () => {
        const key = `crew-${v.crew}`;
        shade(position[0], position[1], CREW_H, c => {
          if (motion.moving && drawCrewWalk(c, key, position[0], position[1], CREW_H, motion.distance, motion.face)) return;
          drawStandee(c, motion.moving ? key : poseOr(`${key}-work`, key), position[0], position[1], CREW_H, t,
            v.crewGlyph || '👹', motion.face, motion.moving);
        });
      });
    }
  }

  // Hired assistants share actor depth and ground collision, but never enter combat parties.
  for(const actor of bossJusticeActors(g)) {
    const h=actor.id==='justice-boss'?CREW_H*1.2:CREW_H;
    spot_(actor.x,actor.y,h);
    at(actor.y+2,()=>shade(actor.x,actor.y,h,cx=>{
      drawStandee(cx,actor.art,actor.x,actor.y,h,t,'⚖️',1,!!actor.moving,actor.sourceZone);
      if(actor.bound){
        cx.save();cx.strokeStyle='#dfbf78';cx.lineWidth=3.5;cx.setLineDash([5,2]);
        for(const slope of [-1,1]){cx.beginPath();cx.moveTo(actor.x-h*.2,actor.y-h*(slope<0?.48:.62));cx.lineTo(actor.x+h*.2,actor.y-h*(slope<0?.62:.48));cx.stroke();}
        cx.restore();
      }
      mapName(cx,actor.name,actor.x,actor.y+12,'#ffe2a8');
      if(actor.id==='justice-boss'&&justice?.phase==='punishment'){
        cx.save();cx.strokeStyle='#ffd279';cx.globalAlpha=.5+.4*Math.sin(t/110);cx.lineWidth=2;
        cx.beginPath();cx.ellipse(actor.x,actor.y-h*.45,h*.45,h*.6,0,0,Math.PI*2);cx.stroke();cx.restore();
      }
    }));
  }
  for (const worker of (rescue ? [] : zoneWorkers(g))) {
    spot_(worker.x,worker.y,CREW_H*.85);
    at(worker.y+1,()=>shade(worker.x,worker.y,CREW_H*.85,c=>drawWorker(c,worker,t,CREW_H*.85)));
  }

  // The destination roster is filled only after the walk completes in game.js.
  for (const walk of (rescue ? [] : g.afterlifeWalks || []).slice(0, 24)) {
    if (walk.zone !== g.zone) continue;
    const [x, y] = afterlifeWalkPosition(walk);
    spot_(x, y, SOUL_H * .82);
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
      shade(x, y, SOUL_H * .82, c => drawSoul(c, x, y - (exit ? progress * 20 : 0), SOUL_H * .82,
        soulTime + walk.soul.id * 300, '#d9eaff', walk.soul.sp || 7));
      if (frozen) tag(ctx, x, y-SOUL_H-16, 0, ['!!!','#ff9a7a']);
      else if (!exit) tag(ctx, x, y - SOUL_H - 10, t,
        [walk.destination === 'prison' ? '⛓️ ไปตะราง'
          : walk.destination === 'gate' ? '🕊️ ไปสวรรค์' : '↩️ กลับคิว', '#f7c371']);
      ctx.restore();
    });
    // ชุด 29C — ยมทูตนำวิญญาณไปตะราง: มารับ → เดินนำหน้า วิญญาณตามติด (ตำแหน่งจริงอยู่ที่ escort.js ที่เดียว)
    if (walk.courier || (walk.escort && actorStanding(g.crewOf(walk.escort.k)))) {
      const pos = escortCrewPosition(walk.courier ? {...walk, escort:{k:walk.courier}} : walk);
      const crew = walk.courier ? {k:walk.courier,glyph:'🦇'} : g.crewOf(walk.escort.k);
      if (pos && crew) {
        const motion = actorWalkMotion(walk, t, g.zone, [pos.x, pos.y]);
        spot_(pos.x, pos.y, CREW_H);
        at(pos.y + 1, () => {
          const key = `crew-${crew.k}`;
          shade(pos.x, pos.y, CREW_H, c => {
            if (motion.moving && drawCrewWalk(c, key, pos.x, pos.y, CREW_H, motion.distance, motion.face)) return;
            drawStandee(c, motion.moving ? key : poseOr(`${key}-work`, key), pos.x, pos.y, CREW_H, t,
              crew.glyph || '👹', motion.moving ? motion.face : pos.face, motion.moving);
          });
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
  (rescue ? [] : g.mobs).forEach((m, i) => (spot_(m.x, m.y, MOB.h * CHAR_SCALE_MAP), at(1e6 + m.y, () => {
    if (sel && sel.kind === 'mob' && sel.key === i) ring(ctx, m.x, m.y, t, 28);
    const d = Math.hypot(m.x - g.player.x, m.y - g.player.y);
    const near = d <= MOB.fabReach;
    if (near) {                                       // วงแดงเต้น ๆ บอกว่าเอื้อมถึงแล้ว
      const q = 0.5 + 0.5 * Math.sin(t / 170);
      ctx.strokeStyle = `rgba(224,74,47,${0.55 + q * 0.45})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(m.x, m.y, 34, 12, 0, 0, 7); ctx.stroke();
    }
    shade(m.x, m.y, MOB.h * CHAR_SCALE_MAP, c => mapStandee(c, m.eventArt || (MOB.kinds[m.kind ?? 0] || MOB).img, m.x, m.y, MOB.h, t, '👹'));
    // เข้าระยะปุ่มสู้แล้ว ui.js วางปุ่มจริงไว้ตรงนี้ทับอยู่ — วาดป้ายซ้ำจะได้ข้อความซ้อนกันสองชั้น
    // จ้างยักษ์ทวารบาลแล้ว ปีศาจเป็นงานของยักษ์ ไม่มีป้ายชวนให้ผู้เล่นเข้าสู้
    if (d <= MOB.fabReach || actorStanding(g.guard)) return;
    tag(ctx, m.x, m.y - MOB.h * CHAR_SCALE_MAP - 8, t,
        ['⚔️ กดเพื่อเข้าสู้', '#c8b0a8']);
  })));

  // บอสเดินมาท้าสู้; แพ้แล้วเฝ้าสะพาน ชนะแล้วไปยืนที่ท่าเรือให้รีแมตช์/เปลี่ยนโซน
  if (!(justice?.art?.startsWith('zone-boss')) && (g.bossWalk || g.bossGuarding?.[g.zone] || g.bossCleared?.[g.zone])) {
    const walk = g.bossWalk;
    const progress = walk ? Math.min(1, Math.max(0, (Date.now() - walk.started) / walk.duration)) : 0;
    const cleared = !walk && g.bossCleared?.[g.zone];
    const x = walk ? walk.from[0] + (walk.to[0] - walk.from[0]) * progress : SPOTS.bossPier.x;
    const y = walk ? walk.from[1] + (walk.to[1] - walk.from[1]) * progress : SPOTS.bossPier.y;
    spot_(x, y, HERO_H * 1.12);
    at(1e5 + y, () => {
      ring(ctx, x, y, t, 32);
      shade(x, y, HERO_H * 1.12, c => drawStandee(c, 'zone-boss', x, y, HERO_H * 1.12, t, '👑', 1, !!walk && progress < 1));
      // N1 (คุณเป้ 16 ต.ค.): ชนะแล้ว = ไม่มีป้ายดำ "คุยกับ…" บนหัว — ปุ่มเหลือง 💬 (ui.js updateBossFab) วางบนหัวแทนตอนเดินเข้าใกล้
      if (!cleared) tag(ctx, x, y - HERO_H * 1.12 - 15, t,
          [walk ? `${g.zoneDef().bossName}เดินมาท้าสู้` : `${g.zoneDef().bossName}เฝ้าสะพาน`, '#f7c371']);
    });
  }

  for (const ev of waitingEvents(g)) at(1e5 + ev.y, () => {
    ring(ctx, ev.x, ev.y, t, 28);
    mapStandee(ctx, ev.art, ev.x, ev.y, 90, t, '⚠️');
    tag(ctx, ev.x, ev.y - 90 * mapCharK(), t, ['⚠️', '#f7c371']);
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

  for (const a of westRescueActors(g)) at(a.y, () => {
    mapStandee(ctx, a.art, a.x, a.y, 72, t, '⚔️');
    if (a.id === 'rescue:taan') tag(ctx, a.x, a.y-90, t, [tr('west.rescue.approach'),'#f7c371']);
  });

  // ในโซน 4 ทัณฑ์กับพ่อค้ารออยู่หน้าตะรางจนกว่าจะชนะเทวดาผู้คุม
  if (!g.zoneCaptivesFree()) {
    at(350, () => {
      mapStandee(ctx, 'crew-taan', 966, 350, 72, t, '🔒');
      mapStandee(ctx, MERCHANT.img, 1038, 350, 72, t, '🔒');
      drawCaptiveLightning(ctx, t);
      tag(ctx, 1002, 256, t, ['🔒 ช่วยทัณฑ์และพ่อค้า', '#f7c371']);
    });
  } else if (!rescue) {
    spot_(MERCHANT.x, MERCHANT.y, MERCHANT.h * CHAR_SCALE_MAP);
    at(1e5 + MERCHANT.y, () => {
      shade(MERCHANT.x, MERCHANT.y, MERCHANT.h * CHAR_SCALE_MAP, c => mapStandee(c, MERCHANT.img, MERCHANT.x, MERCHANT.y, MERCHANT.h, t, MERCHANT.glyph));
    });
  }

  // ---- ยักษ์ทวารบาล (ถ้าจ้างไว้) ----
  // ชุดที่ 10 (ข้อ C1) — ตัดฟีเจอร์ "พายักษ์มาเดินตาม" ออก (คุณเป้สั่ง 25 ก.ย. 2569) ยักษ์ยืน/เดิน
  // ไล่ปราบเปรตแถวหัวสะพานเองเสมอ (g.guard.x/y จาก stepWorld) ไม่มีโหมดตามผู้เล่นอีกต่อไปแล้ว
  if (!rescue && (actorStanding(g.guard) || g.guard?.teaRest?.phase === 'travel')) {
    const motion = actorWalkMotion(g.guard, t, g.zone);
    spot_(g.guard.x, g.guard.y, GUARD.h * CHAR_SCALE_MAP);
    at(g.guard.y, () => {
      if (sel && sel.kind === 'guard') ring(ctx, g.guard.x, g.guard.y, t, 34);
      shade(g.guard.x, g.guard.y, GUARD.h * CHAR_SCALE_MAP, c => {
        if (motion.moving && drawCrewWalk(c, GUARD.img, g.guard.x, g.guard.y,
            GUARD.h * CHAR_SCALE_MAP, motion.distance, motion.face)) return;
        mapStandee(c, GUARD.img, g.guard.x, g.guard.y, GUARD.h, t, '🛡️', motion.face, motion.moving);
      });
    });
  }

  // ---- ยมทูตในสังกัด — ยืนประจำจุด/เดินเตร็ดเตร่ (เพิ่ม 6 ก.ย. 2569)
  // เดิมโค้ดขยับ c.x/c.y อยู่ใน stepWorld แต่ไม่มีใครวาด ทีมเลยหายไปทั้งโซน
  const now0 = Date.now();
  for (const c of (rescue ? [] : g.crew)) {
    if(justice && (c.k===justice.pick?.crew || c.k==='nira' && ['dais','trial'].includes(justice.phase)))continue;
    if (!actorStanding(c) && c.teaRest?.phase !== 'travel') continue;   // G4: เดินไปศาลาน้ำชายังเห็นบนแผนที่ (พักในห้องแล้วค่อยหาย)
    if (c.x == null || c.escort) continue;
    const motion = actorWalkMotion(c, t, g.zone);
    spot_(c.x, c.y, CREW_H);
    at(c.y, () => {
      const base = 'crew-' + c.k;
      if (sel && sel.kind === 'crew' && sel.key === c.k) ring(ctx, c.x, c.y, t);
      // ข้อ D คุณเป้เจอ 25 ก.ย. 2569 — ถึงไซต์ก่อสร้างแล้ว (buildK ตั้งอยู่ + สถานีนั้นพ้น buildWait
      // แล้ว คือเลิกเดินและเริ่มลงมือจริง) ยืนสลับท่า work ↔ ยืนเฉย ๆ เป็นจังหวะ ไม่ใช่ยืนนิ่งเป็นหุ่น
      // (ก่อนถึงไซต์ยังเดินอยู่ ไม่เข้าเงื่อนไขนี้ เพราะ st จะยังเป็น buildWait:true)
      const buildingHere = c.buildK && g.stations.some(st => st.def.k === c.buildK &&
        (st.build && !st.buildWait || st.repair && !st.repairWait));
      const working = c.at || (buildingHere && Math.floor(t / 500) % 2 === 0);
      shade(c.x, c.y, CREW_H, cx => {
        const animated = !buildingHere && motion.moving &&
          drawCrewWalk(cx, base, c.x, c.y, CREW_H, motion.distance, motion.face);
        const idleNira=c.k==='nira'&&!working&&!motion.moving&&drawAnimatedSprite(cx,'nira:'+g.zone,'idle',c.x,c.y,CREW_H,t,motion.face);
        if (!animated&&!idleNira) drawStandee(cx, working && !motion.moving ? poseOr(base + (buildingHere ? '-build-work' : '-work'), base) : base,
          c.x, c.y, CREW_H, t, c.glyph, motion.face, motion.moving && !buildingHere);
      });
      mapName(ctx, c.k === 'nira' && g.niraRest ? `${c.name} · 🩹 พักฟื้น ${g.niraRest.remaining}` : c.name, c.x, c.y + 10, 'rgba(255,225,195,.72)');
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
    const arrival = g.finalEventState();
    if (arrival.presentation === 'warp') {
      ctx.save(); drawArrivalWarp(ctx, a, arrival.warpElapsed || 0);
      ctx.globalAlpha = Math.min(1, (arrival.warpElapsed || 0) / 900);
    }
    shade(a.x, a.y, 78 * CHAR_SCALE_MAP, c => drawStandee(c, a.art, a.x, a.y, 78 * CHAR_SCALE_MAP, t, a.reinforcement ? '🛡️' : '⚔️', 1, false, a.sourceZone));
    const above = !a.reinforcement && Math.round((a.x - 1110) / 80) % 2 === 1;
    mapName(ctx, `${a.name}${a.reinforcement || !a.enabled ? '' : ' · พร้อมสู้'}`, a.x, above ? a.y - 78 * CHAR_SCALE_MAP - 6 : a.y + 10, a.enabled ? '#f7c371' : '#ddd');
    if (arrival.presentation === 'warp') ctx.restore();
  });
  for (const a of devaMapActors(g)) at(a.y, () => {
    shade(a.x, a.y, 100 * CHAR_SCALE_MAP, c => drawStandee(c, a.art, a.x, a.y, 100 * CHAR_SCALE_MAP, t, '🪽', 1, !!a.moving, a.sourceZone));
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
  at(isTownZone(g.zone) ? P.y : Infinity, () => {
    if (sel && sel.kind === 'me') ring(ctx, P.x, P.y, t, 32);
    const swinging = g.swingUntil && Date.now() < g.swingUntil;
    const walking = t < heroMovingUntil;
    shade(P.x, P.y, HERO_H, c => {
      if (!swinging && drawHeroWalk(c, P.x, P.y, HERO_H, walking ? heroWalkDistance : 0, P.face, heroDirection)) return;
      drawStandee(c, swinging ? poseOr('hero-yama-atk', 'hero-yama') : 'hero-yama',
                  P.x, P.y, HERO_H, t, '👑', P.face, walking && !swinging);
    });
  });
  spot_(P.x, P.y, HERO_H);

  // วาดทั้งชั้นเรียงจากหลังมาหน้า — ฐานอยู่สูงกว่า (y น้อยกว่า) คืออยู่ไกลกว่า วาดก่อน
  for (const [ax, ay, ah] of actorSpots) drawActorShadow(ctx, ax, ay, ah);
  layer.sort((a, b) => a.y - b.y).forEach(o => o.fn());
  if(town&&archiveHouse)drawTownHouseLights(ctx,t,reduced);
  if(town)drawTownNightEffects(ctx,t,reduced);

  // บทพูดวาดทีหลังทั้งหมด จะได้ไม่โดนตัวละครตัวอื่นทับ
  // ยกสูงกว่าหัวพอสมควร เพราะช่วง y-CH-8 เป็นที่ของหมุด 📜 (ชั้น HTML ใน ui.js)
  for (const c of (rescue ? [] : g.crew))
    if (c.x != null && c.say && now0 < c.sayUntil) bubble(ctx, `${c.name}: ${c.say}`, c.x, c.y - CREW_H - (c.k === 'nira' ? 20 : 34), c.k === 'nira' ? .74 : 1);


  // ---- พญายมมาปรากฏบนบัลลังก์ตอนออกความเห็น ----
  if (!rescue && g.bossUntil && t < g.bossUntil)
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
    if (!rescue) soulBadge(ctx, g, st, frozen ? soulTime : t, sel);
    if (!rescue && frozen) { const [x,y] = badgePos(st.def); tag(ctx,x,y-BADGE_R-18,0,['!!!','#ff9a7a']); }
  }

  if (spot) buildPrompt(ctx, spot, t, g.coin >= spot.cost);

  if (bg && isTownZone(g.zone)) drawTownForeground(ctx,bg,!!archiveHouse);
  drawMapAmbientSky(ctx, g.zone, ambientTime, SCENE.w, SCENE.h, !!reducedMotion?.matches);
  drawVignette(ctx, SCENE.w, SCENE.h);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/** L1: soft contact shade under a building's measured ground band (town map only). */
function drawStationAO(ctx, def) {
  if (def.bx == null) return;
  const f = footOf(def) || [def.bx - def.bw * .32, def.by - def.bw * .05, def.bx + def.bw * .32, def.by];
  const rx = (f[2] - f[0]) / 2 * 1.08;
  drawContactAO(ctx, (f[0] + f[2]) / 2 + 4, f[3] - 2, rx, Math.max(10, rx * .22));
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
function bubble(ctx, text, x, y, scale=1) {
  const originX=x;ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);x=0;y=0;
  ctx.font = `600 ${MAP_NAME_SIZE * UI_SCALE_MAP}px "IBM Plex Sans Thai",sans-serif`;
  const w = Math.min(180 * UI_SCALE_MAP, ctx.measureText(text).width + 10 * UI_SCALE_MAP), h = 16 * UI_SCALE_MAP;
  const bx = Math.max((6-originX)/scale,Math.min((SCENE.w-6-originX)/scale-w,-w/2));
  ctx.fillStyle = 'rgba(20,9,14,.92)'; rr(ctx, bx, y - h, w, h, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(212,163,85,.55)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 7);
  ctx.fillStyle = 'rgba(20,9,14,.92)'; ctx.fill();
  ctx.fillStyle = '#f2e6dd'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + w / 2, y - h / 2 + 1, w - 10 * UI_SCALE_MAP);
  ctx.restore();
}

function mapName(ctx, text, x, y, color) {
  label(ctx, text, x, y, MAP_NAME_SIZE, color, MAP_NAME_SIZE * UI_SCALE_MAP / 3);
}

function label(ctx, text, x, y, size, color = '#fff', outline = 6) {
  ctx.font = `600 ${size * UI_SCALE_MAP}px "IBM Plex Sans Thai","Apple Color Emoji",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = outline; ctx.strokeStyle = 'rgba(0,0,0,.75)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

/** แปลงพิกัดเมาส์ -> พิกัดฉาก */
export function toScene(cv, e) {
  const r = cv.getBoundingClientRect();
  const view = mapViews.get(cv);
  if (!view) return [(e.clientX - r.left) / r.width * SCENE.w, (e.clientY - r.top) / r.height * SCENE.h];
  const x = (e.clientX - r.left) / r.width * view.width;
  const y = (e.clientY - r.top) / r.height * view.height;
  return [(x - view.tx) / view.sx, (y - view.ty) / view.sy];
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
  if (!westRescuePending(g) && g.zoneCaptivesFree() && near(MERCHANT.x, MERCHANT.y, radius(54))) return { kind:'merchant', key:0 };
  if (westRescueActors(g).some(a => near(a.x,a.y,radius(60))))
    return { kind:'zoneEvent', key:'westHypnotized' };
  if (g.bossCleared?.[g.zone] && near(SPOTS.bossPier.x, SPOTS.bossPier.y, radius(54))) return { kind:'boss', key:g.zone };
  if (westRescuePending(g)) return null;
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

// Thin perimeter bolts and ground rings keep the building and main figures visible.
function drawCaptiveLightning(ctx, time) {
  ctx.save(); ctx.strokeStyle = '#e2c1ff'; ctx.lineWidth = 2;
  ctx.shadowColor = '#9755ff'; ctx.shadowBlur = 5;
  for (const x of [926, 1078]) {
    ctx.beginPath(); ctx.moveTo(x, 272);
    for (let i=1;i<=6;i++) ctx.lineTo(x + Math.sin(time/90+i*2)*7,272+i*13);
    ctx.stroke();
  }
  ctx.beginPath(); ctx.ellipse(1002,354,84,13,0,0,Math.PI*2);ctx.stroke();
  ctx.restore();
}
function drawArrivalWarp(ctx, actor, elapsed) {
  ctx.save(); ctx.strokeStyle = `rgba(194,129,255,${.45+.4*Math.sin(elapsed/160)**2})`;
  ctx.lineWidth = 2; ctx.shadowColor = '#a566ff';ctx.shadowBlur = 8;
  for (let i=0;i<2;i++) {
    ctx.beginPath();ctx.ellipse(actor.x,actor.y+4,27+i*10+elapsed/180,8+i*3,0,0,Math.PI*2);ctx.stroke();
  }
  ctx.restore();
}
