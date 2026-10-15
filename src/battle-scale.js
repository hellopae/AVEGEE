// Measure visible sprite alpha so allied heights match across outfits and poses.
// Combat uses stable perspective slots: squad order then Yama, shared with profiles.
// The current actor steps forward for its turn; final parties use two diagonal files.
// No sprite pixels are altered. Legacy row/cutscene planners remain exported.

import { mirrorBox } from './battle-facing.js';
import { planBattleFormation } from './battle-formation.js?v=20261015-k2';
import { planTurnStep } from './battle-turn-step.js?v=20261015-l2';

/** ความสูงตัวจริงของยมทูตเทียบยมบาทน้อย — 1 = เท่ากัน · ยมบาทน้อยเป็นตัวเอกยังต้องเด่นกว่าเล็กน้อย */
export const CREW_SCALE_TARGET = 0.96;
const MIN_FIT = 0.8;           // แถวแคบเกินจริง ๆ ยอมย่อได้ไม่เกินนี้ของเป้า (ไม่ทับยมบาทน้อยกับขอบจอ)

const boxes = new Map();       // src → { l, t, w, h } เศษส่วนของภาพ (0-1) · null = วัดไม่ได้

function measure(img) {
  const src = img.currentSrc || img.src;
  if (boxes.has(src)) return Promise.resolve(boxes.get(src));
  return new Promise(resolve => {
    const run = () => {
      let box = null;
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(img, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height).data;
        let t = c.height, b = -1, l = c.width, r = -1;
        for (let yy = 0; yy < c.height; yy++) for (let xx = 0; xx < c.width; xx++) {
          if (d[(yy * c.width + xx) * 4 + 3] > 40) { if (yy < t) t = yy; if (yy > b) b = yy; if (xx < l) l = xx; if (xx > r) r = xx; }
        }
        if (b >= 0) box = { l:l / c.width, t:t / c.height, w:(r + 1 - l) / c.width, h:(b + 1 - t) / c.height };
      } catch { box = null; }                       // file:// หรือภาพข้ามโดเมน canvas อ่านไม่ได้ → ใช้ขนาดจาก CSS ตามเดิม
      boxes.set(src, box);
      resolve(box);
    };
    if (img.complete && img.naturalWidth) run();
    else { img.addEventListener('load', run, { once:true }); img.addEventListener('error', () => resolve(null), { once:true }); }
  });
}

const refs = new Map();
function refImage(src) {
  if (!refs.has(src)) { const im = new Image(); im.src = src; refs.set(src, im); }
  return refs.get(src);
}

/** ภาพถูกวาดจริงตรงไหนในกล่อง <img> (object-fit: contain + object-position) — พิกัดจอ */
function drawnRect(img) {
  const r = img.getBoundingClientRect();
  const nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
  const s = Math.min(r.width / nw, r.height / nh);
  const w = nw * s, h = nh * s;
  const pos = (getComputedStyle(img).objectPosition || '50% 50%').split(' ').map(v => parseFloat(v) / 100);
  return { left:r.left + (r.width - w) * (Number.isFinite(pos[0]) ? pos[0] : .5),
           top:r.top + (r.height - h) * (Number.isFinite(pos[1]) ? pos[1] : .5), w, h };
}

/** Visible sprite bounds, excluding transparent padding and respecting CSS mirroring. */
export async function battleSpriteRect(img) {
  const raw = await measure(img), d = drawnRect(img);
  const mirrored = getComputedStyle(img).transform.startsWith('matrix(-');
  const b = (mirrored ? mirrorBox(raw) : raw) || { l:0, t:0, w:1, h:1 };
  return { l:d.left + b.l*d.w, t:d.top + b.t*d.h,
    r:d.left + (b.l+b.w)*d.w, b:d.top + (b.t+b.h)*d.h };
}

/** คำนวณแถวยมทูตจากตัวเลขล้วน (ไม่แตะ DOM) — แยกออกมาให้เทสต์ได้
 *  hero = { visH, oLeft, base } ความสูงตัวจริง · ขอบซ้ายตัวจริง · เส้นเท้า (พิกัดเดียวกับ stageLeft)
 *  crew = [{ box:{l,t,w,h}, aspect }] · คืน { items:[{boxW,boxH,left}], fit } (left = x ของกล่องภาพ) */
export function planSquad(hero, crew, { stageLeft = 0, pad = 4, gap = 18 } = {}) {
  const sizeAt = k => crew.map(c => {
    const visH = hero.visH * CREW_SCALE_TARGET * k;
    const boxH = visH / (c.box?.h || 1);
    return { boxH, boxW:boxH * (c.aspect || 1), oW:(c.box?.w || 1) * boxH * (c.aspect || 1) };
  });
  const sum = items => items.reduce((a, i) => a + i.oW, 0);
  const room = hero.oLeft - gap - (stageLeft + pad);
  let k = 1, items = sizeAt(k), g = gap;
  // Keep visible bodies separated even when a small screen requires scaling.
  if (sum(items) + g * (crew.length - 1) > room && crew.length > 1 && room > 0) {
    g = Math.max(8, (room - sum(items)) / (crew.length - 1));
  }
  if (sum(items) + g * Math.max(0, crew.length - 1) > room && room > 0) {
    k = Math.max(MIN_FIT, (room - g * Math.max(0, crew.length - 1)) / sum(items));
    items = sizeAt(k);
  }
  // วางจากขวา (ชิดยมบาทน้อย) ไปซ้าย
  let right = hero.oLeft - gap;
  const placed = new Array(crew.length);
  for (let i = crew.length - 1; i >= 0; i--) {
    const it = items[i], oLeft = right - it.oW;
    placed[i] = { boxW:it.boxW, boxH:it.boxH, left:oLeft - (crew[i].box?.l || 0) * it.boxW };
    right = oLeft - g;
  }
  return { items:placed, fit:k, gap:g, overflow:sum(items) + g * Math.max(0, crew.length - 1) > room + 0.5 };
}

/** ปรับยมทูตทีมในฉากต่อสู้ — เรียกหลังวาดฉากทุกครั้ง (วัดภาพครั้งแรกอาจรอโหลดเล็กน้อย) */
export function fitBattleSprites(stage, heroRefSrc = null, tries = 0, motion = {}) {
  const seq = stage._fitSeq = (stage._fitSeq || 0) + 1;   // ผลของรอบเก่าที่เสร็จทีหลังต้องไม่ทับรอบใหม่
  const hero = stage.querySelector('.fig.you img:not(.fx)');  // .fx = เอฟเฟกต์โดนตีซ้อนอยู่ใน .fig เดียวกัน ไม่ใช่ตัวยมบาทน้อย
  const squad = stage.querySelector('.battle-squad');
  const crewImgs = squad ? [...squad.querySelectorAll('img')] : [];
  const helperImg = stage.querySelector('.fig.helper img:not(.fx)');
  if (!hero) return Promise.resolve(false);
  // ท่าของยมบาทน้อยเปลี่ยนตลอดการต่อสู้ (ยืน · ฟาด · โดนตี) แต่ละท่ามีกรอบตัวจริงต่างกัน — ใช้ท่ายืนเป็นหลักเสมอ
  // ไม่งั้นยมทูตจะขยับขนาดตามท่าทุกครั้งที่วาดฉากใหม่
  const refImg = heroRefSrc && heroRefSrc !== (hero.getAttribute('src') || '') ? refImage(heroRefSrc) : hero;
  return Promise.all([measure(refImg), ...crewImgs.map(measure), helperImg ? measure(helperImg) : null]).then(async ([hb, ...rest]) => {
    if (!stage.isConnected || !hb || stage._fitSeq !== seq) return false;
    // ภาพที่ถูกพลิกกระจก (ทุกใบที่ไม่ใช่ .face-native — ดู battle-facing.js) ขอบซ้าย/ขวาของส่วนมีตัวสลับข้างกัน
    const crewBoxes = rest.slice(0, crewImgs.length).map((box, i) => crewImgs[i].classList.contains('face-native') ? box : mirrorBox(box));
    const helperBox = rest[crewImgs.length];
    const hd = drawnRect(hero), sr = stage.getBoundingClientRect();
    // ภาพท่าของยมบาทน้อยกำลังโหลด (กล่องยุบเป็น 0×0) → ยังวัดไม่ได้ อย่าตั้งขนาดยมทูตเป็นศูนย์ รอบหน้าลองใหม่
    if (!(hd.w > 4 && hd.h > 4)) {
      if (tries < 25) setTimeout(() => { if (stage.isConnected && stage._fitSeq === seq) fitBattleSprites(stage, heroRefSrc, tries + 1, motion); }, 80);
      return false;
    }
    const heroVis = { visH:hd.h * hb.h, oLeft:hd.left + hb.l * hd.w, base:hd.top + (hb.t + hb.h) * hd.h };
    const local = { visH:heroVis.visH, oLeft:heroVis.oLeft - sr.left, base:heroVis.base - sr.top };
    if (stage.classList.contains('combat-arena') && crewBoxes.every(Boolean)) {
      const put = (el, props) => { for (const [k,v] of Object.entries(props)) el.style.setProperty(k,v,'important'); };
      const heroBox = hero.classList.contains('face-native') ? hb : mirrorBox(hb);
      const images = [...crewImgs,hero], actorBoxes = [...crewBoxes,heroBox];
      const plan = planBattleFormation(images.length, sr.width, sr.height);
      // L2: the actor on turn steps out until its visible bounds touch no teammate and no enemy (measured, not a fixed offset)
      const foeBounds = (await Promise.all([...stage.querySelectorAll('.fig.foe img:not(.fx)')].map(im => battleSpriteRect(im)
        .then(r => ({ l:r.l - sr.left, r:r.r - sr.left, t:r.t - sr.top, b:r.b - sr.top })).catch(() => null))))
        .filter(r => r && r.r - r.l > 4 && r.b - r.t > 4);
      if (!stage.isConnected || stage._fitSeq !== seq) return false;
      if(squad) put(squad,{position:'absolute',left:'0',top:'0',bottom:'auto',width:'100%',height:'100%',
        'max-width':'none',transform:'none',display:'block',overflow:'visible','z-index':'auto','pointer-events':'none'});
      const sizes = images.map((image,i) => {
        const box=actorBoxes[i], slot=plan[i];
        const h=local.visH * slot.scale * (image===hero?1:CREW_SCALE_TARGET)/box.h;
        const w=h*(image===hero?refImg.naturalWidth/refImg.naturalHeight:image.naturalWidth/image.naturalHeight);
        return { w, h, bounds:{ l:slot.x, r:slot.x + box.w*w, b:slot.y, t:slot.y - box.h*h } };
      });
      const stepRight = foeBounds.length ? Math.min(...foeBounds.map(r => r.l)) - 8 : sr.width * .7;
      const steps = sizes.map((sz,i) => planTurnStep({ active:sz.bounds, others:sizes.filter((_,j) => j!==i).map(o => o.bounds), foes:foeBounds,
        base:{ x:plan[i].stepX, y:plan[i].stepY }, bounds:{ l:0, t:sr.height * .3, r:stepRight, b:sr.height } }));
      images.forEach((image,i)=>{
        const box=actorBoxes[i], slot=plan[i];
        const { w, h } = sizes[i];
        const root=image.closest('[data-crew-pick]');
        const key=root.dataset.crewPick, active=key===motion.activeKey;
        put(image,{width:`${w}px`,height:`${h}px`,'max-width':'none','max-height':'none','object-fit':'fill'});
        put(root,{position:'absolute',left:`${slot.x-box.l*w}px`,top:`${slot.y-(box.t+box.h)*h}px`,bottom:'auto',
          width:`${w}px`,height:`${h}px`,margin:'0',flex:'none',display:'block','clip-path':'none',
          'z-index':String(active?30:slot.depth),'pointer-events':'auto',
          '--turn-step-x':`${steps[i].x}px`,'--turn-step-y':`${steps[i].y}px`,
          '--formation-foot':`${(box.t+box.h)*h}px`,'--formation-head':`${box.t*h}px`,'--formation-mid':`${(box.l+box.w/2)*w}px`,
          '--formation-shadow-width':`${box.w*w*.82}px`,
          '--turn-motion-delay':`${-Math.max(0,Date.now()-(motion.changedAt||0))}ms`});
        root.classList.add('formation-member');
        root.classList.toggle('turn-forward',active);
        root.classList.toggle('turn-enter',active&&motion.changedAt>0);
        root.classList.toggle('turn-return',!active&&key===motion.previousKey);
        root.dataset.formationSlot=String(i);
      });
      stage.dataset.formation='perspective';
    }
    if (helperImg && helperBox) {       // ยมทูตที่กระโดดเข้าช่วยโจมตีก็ต้องสูงเท่ากัน
      const boxH = local.visH * CREW_SCALE_TARGET / helperBox.h;
      helperImg.style.setProperty('height', `${boxH}px`, 'important');
      helperImg.style.setProperty('max-height', 'none', 'important');
    }
    return true;
  });
}

// ---------------------------------------------------------------------------------------------
// คัตซีนยมทูต/ยักษ์ทวารบาล (ชุด 29C ข้อ 8)
// ภาพคัตซีนของโซน 2–4 เป็นไฟล์ 512×512 ที่มีภาพจริงเป็นแถบกว้างอยู่ "ครึ่งล่าง" ส่วนบนโปร่งใสทั้งแถบ (ตัวไฟล์เป็นแบบนี้
// ตั้งแต่ต้น ไม่ใช่ที่ CSS ตัด) → ทางเดียวที่จะเห็นภาพทั้งใบเต็มฉากคือ "จัดตำแหน่งตามส่วนที่มีภาพจริง" ไม่แตะพิกเซลของภาพ

/** จัดภาพให้ส่วนที่ไม่โปร่งใส (box เป็นเศษส่วน 0-1 ของภาพ) พอดีฉาก cw×ch แบบ contain — คืนกรอบของ "ทั้งไฟล์" */
export function planCutscene({ cw, ch }, { nw, nh }, box) {
  const b = box || { l:0, t:0, w:1, h:1 };
  const bw = b.w * nw, bh = b.h * nh;
  const s = Math.min(cw / bw, ch / bh);
  return { scale:s, width:nw * s, height:nh * s,
           left:(cw - bw * s) / 2 - b.l * nw * s, top:(ch - bh * s) / 2 - b.t * nh * s };
}

/** ชุด 30B ข้อ 10 — ภาพคัตซีนทึบเต็มเฟรม (ไฟล์ JPEG ของยมทูต/ยักษ์โซน 1–4) ถ้าใช้ contain บนฉากที่สัดส่วนต่างจากภาพ
 *  จะเกิดแถบดำบน/ล่าง → ให้ "เต็มกรอบ" (cover) เมื่อส่วนที่ต้องตัดไม่เกิน maxCrop ของด้านใดด้านหนึ่ง (ตัวละครอยู่กลางภาพ ตัดแค่ขอบ)
 *  กรอบแคบ/แนวตั้ง (ตัดเกิน maxCrop → จะตัดหน้าตัวละคร) คืน null ให้ใช้ contain ตามเดิม · ใช้กับภาพที่ส่วนมีเนื้อเต็ม ≥ 98% เท่านั้น
 *  ไม่แตะไฟล์ภาพ — คำนวณขนาด/ตำแหน่งกล่องเท่านั้น */
export function planCutsceneCover({ cw, ch }, { nw, nh }, box, maxCrop = 0.15) {
  if (!(cw > 0 && ch > 0 && nw > 0 && nh > 0)) return null;
  if (box && (box.w < 0.98 || box.h < 0.98)) return null;
  const s = Math.max(cw / nw, ch / nh);
  const crop = Math.max(0, 1 - Math.min(cw / (nw * s), ch / (nh * s)));   // สัดส่วนที่ล้นกรอบของด้านที่ถูกตัด
  if (crop > maxCrop) return null;
  return { scale:s, width:nw * s, height:nh * s, left:(cw - nw * s) / 2, top:(ch - nh * s) / 2, crop };
}

/** ปรับรูปคัตซีนที่เพิ่งใส่เข้า .action-cutscene — รอภาพโหลดแล้ววัด · วัดไม่ได้ (file://) ก็ปล่อยตาม CSS contain */
export function fitCutsceneImage(cut, img) {
  measure(img).then(box => {
    if (!box || !cut.isConnected) return;
    const r = cut.getBoundingClientRect();
    const dims = { cw:r.width, ch:r.height }, nat = { nw:img.naturalWidth, nh:img.naturalHeight };
    // คัตซีนยมทูต/ยักษ์ (crew-cut) ภาพทึบเต็มเฟรม → เต็มกรอบไม่มีแถบดำ ถ้าตัดขอบไม่เกินเกณฑ์ (ดู planCutsceneCover)
    const p = (cut.classList.contains('crew-cut') && planCutsceneCover(dims, nat, box)) || planCutscene(dims, nat, box);
    img.style.setProperty('position', 'absolute', 'important');
    img.style.setProperty('inset', 'auto', 'important');          // ต้องมาก่อน left/top (inset เป็นตัวย่อที่ล้างค่าทั้งสี่ด้าน)
    for (const [k, v] of Object.entries({ left:p.left, top:p.top, width:p.width, height:p.height }))
      img.style.setProperty(k, `${v}px`, 'important');
    img.style.setProperty('object-fit', 'fill', 'important');
  });
}
