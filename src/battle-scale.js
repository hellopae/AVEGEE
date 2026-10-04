// battle-scale.js — ปรับขนาดยมทูตฝ่ายเราในฉากต่อสู้ให้สูงใกล้เคียงยมบาทน้อย (ชุด 29C ข้อ 7)
//
// ภาพตัวละครทุกใบเป็นผืน 512×512 แต่ส่วนที่ "มีตัวจริง" (alpha > 0) กินพื้นที่ต่างกัน และกล่องภาพถูกบีบด้วย CSS ต่างกัน
// (ยมบาทน้อยสูงตาม clamp(vh) · ยมทูตในแถวทีมสูง 100% ของแถวที่เตี้ยกว่า) → ตัวที่วาดออกมาเล็กกว่ายมบาทน้อยมาก (~0.6 เท่า)
// ค่าตายตัวใน CSS แก้ไม่ได้เพราะทุกจอ/ทุกโซน/ทุกภาพขนาดต่างกัน จึง "วัดจากภาพจริง":
//   1) วัดกรอบส่วนที่ไม่โปร่งใสของแต่ละภาพ (canvas alpha, แคชตาม src)
//   2) วัดความสูงตัวจริงที่ยมบาทน้อยถูกวาดอยู่บนจอตอนนี้ (ส่วนมีตัว × ขนาดที่วาดจริง)
//   3) ตั้งขนาดภาพยมทูตแต่ละตัวให้ความสูง "ตัวจริง" = ความสูงตัวจริงของยมบาทน้อย × TARGET
//   4) เรียงเป็นแถวชิดซ้ายยมบาทน้อย เส้นเท้าเดียวกัน ให้ตัวจริงห่างกันนิดหน่อย (กล่องภาพซ้อนกันได้เพราะขอบโปร่งใส)
// ไม่ยุ่งกับตัวภาพ ไม่ย้อมสี ไม่ใส่ฟิลเตอร์ — ปรับแค่ขนาด/ตำแหน่งกล่อง

import { mirrorBox } from './battle-facing.js';

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

/** คำนวณแถวยมทูตจากตัวเลขล้วน (ไม่แตะ DOM) — แยกออกมาให้เทสต์ได้
 *  hero = { visH, oLeft, base } ความสูงตัวจริง · ขอบซ้ายตัวจริง · เส้นเท้า (พิกัดเดียวกับ stageLeft)
 *  crew = [{ box:{l,t,w,h}, aspect }] · คืน { items:[{boxW,boxH,left}], fit } (left = x ของกล่องภาพ) */
export function planSquad(hero, crew, { stageLeft = 0, pad = 4, gap = 6 } = {}) {
  const sizeAt = k => crew.map(c => {
    const visH = hero.visH * CREW_SCALE_TARGET * k;
    const boxH = visH / (c.box?.h || 1);
    return { boxH, boxW:boxH * (c.aspect || 1), oW:(c.box?.w || 1) * boxH * (c.aspect || 1) };
  });
  const sum = items => items.reduce((a, i) => a + i.oW, 0);
  const room = hero.oLeft - gap - (stageLeft + pad);
  let k = 1, items = sizeAt(k), g = gap;
  // แถวไม่พอ → ให้ตัวจริงเหลื่อมกันได้นิดหน่อยแบบแถวประจัญบาน (ไม่เกิน 35% ของความกว้างตัวจริงเฉลี่ย) ก่อนค่อยย่อขนาด
  if (sum(items) + g * (crew.length - 1) > room && crew.length > 1 && room > 0) {
    const meanW = sum(items) / crew.length;
    g = Math.max(-0.35 * meanW, (room - sum(items)) / (crew.length - 1));
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
export function fitBattleSprites(stage, heroRefSrc = null, tries = 0) {
  const seq = stage._fitSeq = (stage._fitSeq || 0) + 1;   // ผลของรอบเก่าที่เสร็จทีหลังต้องไม่ทับรอบใหม่
  const hero = stage.querySelector('.fig.you img:not(.fx)');  // .fx = เอฟเฟกต์โดนตีซ้อนอยู่ใน .fig เดียวกัน ไม่ใช่ตัวยมบาทน้อย
  const squad = stage.querySelector('.battle-squad');
  const crewImgs = squad ? [...squad.querySelectorAll('img')] : [];
  const helperImg = stage.querySelector('.fig.helper img:not(.fx)');
  if (!hero || (!crewImgs.length && !helperImg)) return Promise.resolve(false);
  // ท่าของยมบาทน้อยเปลี่ยนตลอดการต่อสู้ (ยืน · ฟาด · โดนตี) แต่ละท่ามีกรอบตัวจริงต่างกัน — ใช้ท่ายืนเป็นหลักเสมอ
  // ไม่งั้นยมทูตจะขยับขนาดตามท่าทุกครั้งที่วาดฉากใหม่
  const refImg = heroRefSrc && heroRefSrc !== (hero.getAttribute('src') || '') ? refImage(heroRefSrc) : hero;
  return Promise.all([measure(refImg), ...crewImgs.map(measure), helperImg ? measure(helperImg) : null]).then(([hb, ...rest]) => {
    if (!stage.isConnected || !hb || stage._fitSeq !== seq) return false;
    // ภาพที่ถูกพลิกกระจก (ทุกใบที่ไม่ใช่ .face-native — ดู battle-facing.js) ขอบซ้าย/ขวาของส่วนมีตัวสลับข้างกัน
    const crewBoxes = rest.slice(0, crewImgs.length).map((box, i) => crewImgs[i].classList.contains('face-native') ? box : mirrorBox(box));
    const helperBox = rest[crewImgs.length];
    const hd = drawnRect(hero), sr = stage.getBoundingClientRect();
    // ภาพท่าของยมบาทน้อยกำลังโหลด (กล่องยุบเป็น 0×0) → ยังวัดไม่ได้ อย่าตั้งขนาดยมทูตเป็นศูนย์ รอบหน้าลองใหม่
    if (!(hd.w > 4 && hd.h > 4)) {
      if (tries < 25) setTimeout(() => { if (stage.isConnected && stage._fitSeq === seq) fitBattleSprites(stage, heroRefSrc, tries + 1); }, 80);
      return false;
    }
    const heroVis = { visH:hd.h * hb.h, oLeft:hd.left + hb.l * hd.w, base:hd.top + (hb.t + hb.h) * hd.h };
    const local = { visH:heroVis.visH, oLeft:heroVis.oLeft - sr.left, base:heroVis.base - sr.top };
    if (crewImgs.length && crewBoxes.every(Boolean)) {
      const plan = planSquad(local, crewBoxes.map((box, i) => ({ box, aspect:crewImgs[i].naturalWidth / (crewImgs[i].naturalHeight || 1) })),
        { stageLeft:0 });
      const put = (el, props) => { for (const [k, v] of Object.entries(props)) el.style.setProperty(k, v, 'important'); };
      // เส้นเท้า: ขอบล่างของส่วนมีตัว = เส้นเท้ายมบาทน้อย → ขอบล่างกล่องภาพ = เท้า + ส่วนโปร่งใสด้านล่างของภาพนั้น
      put(squad, { position:'absolute', left:'0', top:'0', width:'0', height:'0', 'max-width':'none', transform:'none',
                   display:'block', gap:'0', overflow:'visible' });
      crewImgs.forEach((img, i) => {
        const p = plan.items[i], box = crewBoxes[i];
        const span = img.closest('[data-crew-pick]') || img.parentElement;
        const footGap = (1 - (box.t + box.h)) * p.boxH;
        put(span, { position:'absolute', left:`${p.left}px`, top:`${local.base + footGap - p.boxH}px`, width:`${p.boxW}px`, height:`${p.boxH}px`,
                    flex:'none', margin:'0' });
        put(img, { width:`${p.boxW}px`, height:`${p.boxH}px`, 'max-width':'none', 'max-height':'none', 'object-fit':'fill' });
      });
      squad.dataset.fit = plan.fit.toFixed(2);
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

/** ปรับรูปคัตซีนที่เพิ่งใส่เข้า .action-cutscene — รอภาพโหลดแล้ววัด · วัดไม่ได้ (file://) ก็ปล่อยตาม CSS contain */
export function fitCutsceneImage(cut, img) {
  measure(img).then(box => {
    if (!box || !cut.isConnected) return;
    const r = cut.getBoundingClientRect();
    const p = planCutscene({ cw:r.width, ch:r.height }, { nw:img.naturalWidth, nh:img.naturalHeight }, box);
    img.style.setProperty('position', 'absolute', 'important');
    img.style.setProperty('inset', 'auto', 'important');          // ต้องมาก่อน left/top (inset เป็นตัวย่อที่ล้างค่าทั้งสี่ด้าน)
    for (const [k, v] of Object.entries({ left:p.left, top:p.top, width:p.width, height:p.height }))
      img.style.setProperty(k, `${v}px`, 'important');
    img.style.setProperty('object-fit', 'fill', 'important');
  });
}
