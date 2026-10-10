import { createAssetQueue, loadImage, warmImage, zoneTiers, fetchWithTimeout, useImageCacheVersion } from './asset-preload.js?v=h1-h5b';
import { preloadBgm } from './sfx.js';
import { getLang } from './i18n.js';

// H1 (10 ต.ค. 2569) — หน้าโหลดรอเฉพาะ "ชั้น critical" (ดู zoneTiers ใน asset-preload.js)
// ที่เหลือของโซนโหลดเงียบๆ ตอนเครื่องว่างหลังเข้าเกม · ภาพที่ยังมาไม่ถึงไม่ทำให้เกม error
const readySet = new Set();
const queue = createAssetQueue(url => url.startsWith('audio:') ? preloadBgm(url.slice(6)) : loadImage(url), 3, readySet);
// เบื้องหลัง: ดึงไฟล์ลงแคชโดยไม่ถอดรหัสภาพ · 2 เลนเพื่อไม่แย่งแบนด์วิดท์กับเกม
const bgQueue = createAssetQueue(url => url.startsWith('audio:') ? preloadBgm(url.slice(6)) : warmImage(url), 2, readySet);
const CATALOG_VERSION = '20261008-zone3-hypnosis-ui-mirror-charge-20261009-f2-merge-f3-f4-sala-books-mirror-art-book-art-g2-intro-cover-v2-g3ca-g2b-cover-v5-h1-g5-g3cb-h4-h5b-cane-trojan-zoom-intro-v3';
if (typeof window !== 'undefined') useImageCacheVersion(CATALOG_VERSION);
let catalogPromise, active = null;
const LABELS = { th:'สุวรรณภูมิ', asia:'บูรพา', west:'ปัจฉิม', cyberhell:'นรกเครือข่าย' };
const LABELS_EN = { th:'Suvarnabhumi', asia:'the Eastern Branch', west:'the Western Branch', cyberhell:'CyberHell' };

// ข้อความหน้าโหลด — หมุนทุก ~2.5 วินาที (ชุดเดิมของ bdfa57b + ข้อความเรือข้ามฟากปัจจุบัน) · TH + EN
// อังกฤษเป็นร่างของ Dale รอ Rae ตรวจสำนวน
const NOTES = [
  zone => ({ th:`เรือข้ามฟากกำลังพาดวงวิญญาณมาสู่${LABELS[zone] || LABELS.th}…`, en:`The ferry is carrying souls to ${LABELS_EN[zone] || LABELS_EN.th}…` }),
  zone => ({ th:`กำลังเปิดประตูโซน${LABELS[zone] || LABELS.th}…`, en:`Opening the gates of ${LABELS_EN[zone] || LABELS_EN.th}…` }),
  () => ({ th:'เรือจ้างกำลังพาคนข้ามมา…', en:'The ferryman is bringing the souls across…' }),
  () => ({ th:'นิรากำลังเรียงสำนวนที่ค้างอยู่…', en:'Nira is sorting through the pending case files…' }),
  () => ({ th:'ก่อไฟใต้กระทะทองแดง…', en:'Lighting the fire beneath the copper cauldron…' }),
  () => ({ th:'ทัณฑ์ที่เกินกรรม มันไม่ได้หายไปไหน — มันมาอยู่ที่ผู้ตัดสิน', en:'Punishment beyond karma does not vanish — it falls upon the judge.' }),
];
const NOTE_MS = 2500, NOTE_FADE_MS = 400;
/** หมุนข้อความใน .note ทุก NOTE_MS แบบ fade · hold(text) แสดงข้อความ error ค้างไว้ · release() กลับมาหมุน */
function rotateNotes(el, zone) {
  const note = el.querySelector('.note');
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = 0, held = false, swap = 0;
  const text = () => { const n = NOTES[i % NOTES.length](zone); return getLang() === 'en' ? n.en : n.th; };
  const show = () => { note.textContent = text(); note.style.opacity = 1; };
  show();
  const timer = setInterval(() => {
    if (held) return;
    i++;
    if (reduce) { show(); return; }
    note.style.opacity = 0;
    swap = setTimeout(() => { if (!held) show(); }, NOTE_FADE_MS);
  }, NOTE_MS);
  return {
    hold(message) { held = true; clearTimeout(swap); note.textContent = message; note.style.opacity = 1; },
    release() { held = false; show(); },
    stop() { clearInterval(timer); clearTimeout(swap); note.style.opacity = 1; },
  };
}

async function catalog() {
  if (!catalogPromise) catalogPromise = fetchWithTimeout(`img/preload-catalog.json?v=${CATALOG_VERSION}`, { cache:'no-cache' })
    .then(async ({response:r, release}) => {
      try { if (!r.ok) throw new Error('catalog unavailable'); return await r.json(); }
      finally { release(); }
    })
    .catch(error => { catalogPromise = null; throw error; });
  return catalogPromise;
}
function screen(boot) {
  if (boot) return boot;
  const el = document.createElement('dialog');
  el.className = 'asset-loading';
  el.innerHTML = '<h1 class="brand">อเวจี</h1><div class="bar"><i></i></div><div class="pct">0%</div><p class="note"></p>';
  el.addEventListener('cancel', e => e.preventDefault());
  document.body.append(el); el.showModal();
  return el;
}
function choose(el, text, notes) {
  notes.hold(text);
  const controls = document.createElement('div'); controls.className = 'row';
  controls.innerHTML = '<button class="gold" data-retry>ลองโหลดใหม่</button><button data-skip>เข้าเกมเท่าที่โหลดได้</button>';
  el.append(controls);
  return new Promise(resolve => {
    controls.querySelector('[data-retry]').onclick = () => { controls.remove(); notes.release(); resolve(true); };
    controls.querySelector('[data-skip]').onclick = () => { controls.remove(); notes.release(); resolve(false); };
  });
}
function hasSave() {
  try { return !!localStorage.getItem('avegee.save.v2'); } catch { return false; }
}
/** ชั้น critical (กั้นหน้าโหลด) + เพลงหน้าปก · ชั้นที่เหลือ (เพลงโซน/ศึกเป็นอันดับแรกของเบื้องหลัง) */
async function tiersFor(zone, outfit, opts) {
  const t = zoneTiers(await catalog(), zone, outfit, opts);
  const background = ['audio:bgm-zone', ...t.background];
  background.splice(Math.min(25, background.length), 0, 'audio:bgm-battle');
  return { critical:[...t.critical, 'audio:bgm-title'], background, late:t.late };
}

// ---------- โหลดเบื้องหลังตอนว่าง ----------
let bgToken = 0;
const idle = () => new Promise(resolve => typeof requestIdleCallback === 'function'
  ? requestIdleCallback(resolve, { timeout:2500 }) : setTimeout(resolve, 250));
/** ทยอยโหลดชั้น background แล้วชั้น late ทีละไฟล์ 2 เลน · หยุดเมื่อมีหน้าโหลดจริง (เปลี่ยนโซน) หรือมีคำสั่งรอบใหม่ */
function warmRest(tiers) {
  const token = ++bgToken;
  const saveData = typeof navigator !== 'undefined' && navigator.connection?.saveData;
  const todo = bgQueue.missing([...tiers.background, ...(saveData ? [] : tiers.late)]);
  let next = 0;
  const lane = async () => {
    while (token === bgToken && next < todo.length) {
      if (active) { await active.catch(() => {}); continue; }
      await idle();
      if (token !== bgToken) return;
      const url = todo[next++];
      try { await bgQueue.run([url]); } catch {}
    }
  };
  return Promise.all([lane(), lane()]).catch(() => {});
}

async function run(zone, outfit, boot) {
  const opts = { firstRun: !hasSave(), arrival: !boot };
  let tiers;
  try { tiers = await tiersFor(zone, outfit, opts); } catch {}
  if (tiers && !queue.missing(tiers.critical).length) { boot?.remove(); warmRest(tiers); return; }
  const el = screen(boot);
  const notes = rotateNotes(el, zone);
  const siblings = boot ? [...document.body.children].filter(n => n !== boot && !n.inert) : [];
  siblings.forEach(n => { n.inert = true; });
  try {
    while (true) {
      let failed;
      try {
        tiers ||= await tiersFor(zone, outfit, opts);
        failed = await queue.run(queue.missing(tiers.critical), ({done,total,failed}) => {
          const percent = total ? Math.round(done / total * 100) : 0;
          el.querySelector('.bar i').style.width = `${percent}%`;
          el.querySelector('.pct').textContent = `${percent}% · ${done}/${total}${failed ? ` · ต้องลองใหม่ ${failed}` : ''}`;
        });
      } catch { failed = ['catalog']; }
      if (!failed.length) break;
      if (!await choose(el, `ยังโหลดไม่สำเร็จ ${failed.length} รายการ ตรวจการเชื่อมต่อแล้วลองใหม่ได้ครับ`, notes)) break;
    }
  } finally {
    notes.stop();
    siblings.forEach(n => { n.inert = false; });
    if (el.tagName === 'DIALOG') el.close();
    el.remove();
  }
  // เข้าเกมแล้ว: ที่เหลือของโซนทยอยโหลดตอนว่าง (ไม่รอ)
  if (tiers) setTimeout(() => warmRest(tiers), 0);
}
/** Gate both new branches and returning branches; repeat visits reuse successful URLs. */
function gateZone(zone, outfit = zone, boot = null) {
  bgToken++;   // หน้าโหลดจริงมาก่อน — หยุดงานเบื้องหลังของโซนเดิม
  if (active) return active.then(() => gateZone(zone, outfit, boot));
  active = run(zone, outfit, boot).finally(() => { active = null; });
  return active;
}

// index.html โหลดไฟล์นี้ด้วย ?v=… ส่วน ui.js import แบบไม่มี query → เบราว์เซอร์ถือเป็นโมดูลคนละตัว
// (เดิมหน้าโหลดทำงานซ้อนสองชุด) · ตัวแรกเป็นเจ้าของ ตัวที่สองส่งต่อไปที่ตัวแรก
const owner = globalThis.__avegeePreload;
if (!owner) globalThis.__avegeePreload = { preloadZone: gateZone };
export function preloadZone(zone, outfit = zone, boot = null) {
  return (owner?.preloadZone || gateZone)(zone, outfit, boot);
}

const boot = document.getElementById('boot');
if (boot && !owner) {
  let saved;
  try { saved = JSON.parse(localStorage.getItem('avegee.save.v2') || 'null'); } catch {}
  preloadZone(saved?.zone || 'th', saved?.outfit || saved?.zone || 'th', boot).then(() => {
    document.documentElement.dataset.bootReady = 'true';
    dispatchEvent(new Event('avegee:boot-ready'));
  });
}
