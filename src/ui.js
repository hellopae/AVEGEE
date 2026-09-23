import { commandWheel, bindCommandWheel, crewAbility, crewCooldown, cooldownText } from './command-wheel.js';
// ui.js — แผงควบคุม · โมดัล · ลูปวาด
import { SINS, STATIONS, CREW, BAL, POWERS, SCENE, SPOTS, QUEUE_LINE,
         GUARD, LEVELS, MOB, TUTOR, ORDER_TIERS, KARMA_TIERS, ITEMS,
         KARMA_RELIEF, BATTLE, ZONES, TARANG, FX_OF, ROOMS, ROOM_DEFAULT,
         ORDER_WARN, crewName, FRONTIER, MERCHANT, UPGRADES } from './data.js';
import { AUDIO, saveAudio, unlock, sfx, bgm, syncBgm, primeAudio } from './sfx.js';
import { createGame, loadSave, clearSave, sameLabel } from './game.js';
import { render, toScene, hitStation, hitActor, nearBuild, hitFrontier } from './scene.js';
import { makeRoom } from './room.js';
import { stepTo, nearestWalk } from './walk.js';
import { soulKey, artUrl, zoneImg, bindZone, bindHeroStyle, warmZone } from './art.js';

const $ = s => document.querySelector(s);
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/** ชื่อตัวผู้เล่น — "Yama" คือชื่อฝรั่งของพญายมซึ่งเป็น "พ่อ" ของเรา ไม่ใช่ตัวเรา
 *  ตัวเราคือยมบาทมือใหม่ ลูกของท่าน จึงใช้ "ยมน้อย" ให้ต่างจากพ่อชัด ๆ
 *  (เจ้าของถามว่าเขียนไทยว่าอะไรดี 8 ก.ย. 2569 — เปลี่ยนที่นี่ที่เดียวได้ทั้งเกม) */
const HERO_NAME = 'ยมน้อย';

/** รูปยมบาทบนเวที — ใช้ท่าเฉียง img/hero-yama-side.png ถ้ามีไฟล์ ไม่มีก็ท่ายืนตรงตามเดิม
 *  (ท่ายืนตรงหันหน้าเข้ากล้อง จึงไม่มีทางหันเข้าหาคู่กรณีได้จนกว่าจะมีรูปท่าเฉียง)
 *  ทุก path ของรูปตัวละครใน ui.js ผ่าน artUrl() — อยู่โซนไหนได้รูปของโซนนั้นก่อน (art.js) */
const heroFace = () => (heroFace.ok && artUrl('hero-yama-side')) || artUrl('hero-yama');
{ const im = new Image(); im.onload = () => { heroFace.ok = true; }; im.src = 'img/hero-yama-side.png'; }

/** ท่าลงทัณฑ์บนเวทีต่อสู้ (ข้อ 5 ของเจ้าของ 11 ก.ย. 2569)
 *  จังหวะที่ท่านลงมือใส่คู่กรณี ให้เปลี่ยนเป็น hero-yama-atk · จังหวะอื่นกลับไปท่ายืนเดิม
 *  artUrl คืน null = "โซนนี้มียมบาทแล้วแต่ยังไม่มีท่าฟาด" → ใช้ท่ายืนของโซน ไม่หยิบท่าโซน 1 มาปน
 *  (โซนปัจฉิมยังไม่มี hero-yama-west-atk — ตอนนี้จึงยืนนิ่งตอนฟาด ไม่ใช่หน้าเปลี่ยนเป็นคนละคน)
 *  โหลดไฟล์ไว้ล่วงหน้า ไม่งั้นเฟรมแรกที่สลับท่าจะว่างวูบหนึ่งระหว่างรอไฟล์ */
const heroAtk = () => artUrl('hero-yama-atk') || heroFace();
{ const u = artUrl('hero-yama-atk'); if (u) new Image().src = u; }

const WEIGHT = ['', 'เล็กน้อย', 'ปานกลาง', 'หนัก', 'หนักมาก', 'มหันต์'];
// ระดับ 5 เปลี่ยนจาก "สาสม" เป็น "มหันต์" (ข้อ B.2 คุณเป้ 24 ก.ย. 2569) — ให้ตรงกับคำที่ WEIGHT ใช้อยู่แล้ว
// (WEIGHT[5] = "มหันต์" มาก่อนแล้ว แต่ INTENSITY[5] สะกดคนละคำ ผู้เล่นอ่านแล้วงงว่าเป็นคำเดียวกันไหม)
const INTENSITY = ['', 'ว่ากล่าว', 'เบา', 'ปานกลาง', 'หนัก', 'มหันต์'];

const g = createGame();
const SAVED = loadSave();
if (SAVED) g.restore(SAVED);
bindZone(() => g.zone);          // รูปประจำโซน — art.js ต้องรู้ก่อนวาดเฟรมแรก
bindHeroStyle(() => g.outfit || g.zone); // ชุด Yama เป็นรางวัลสะสม เลือกข้ามโซนได้
const cv = $('#cv'), ctx = cv.getContext('2d');
let tab = 'queue', hover = null, acc = 0, last = performance.now();

/** ตัววาดฉากต่อสู้ซ้ำ — openBattle ตั้งค่าไว้ ปิดฉากแล้วเคลียร์เป็น null
 *  ลูปเฟรมใช้ตัวนี้เปิดกล่องกลับให้ ถ้าฉากยังไม่จบแต่กล่องหายไป
 *  (มี close หลุดเข้ามาได้หลายทาง — โมดัลอื่นมาแทรก, Esc, เบราว์เซอร์เอง)
 *  ผู้เล่นต้องไม่มีทาง "ค้างอยู่กับฉากต่อสู้ที่มองไม่เห็น" เด็ดขาด */
let battleUI = null;
let lastBattleEnd = 0;      // เวลาที่ฉากต่อสู้ล่าสุดปิดลง — ใช้เว้นจังหวะก่อนเปิดฉากใหม่

// เฝ้าด้วย timer ไม่ใช่ลูปเฟรม — requestAnimationFrame หยุดสนิทเมื่อแท็บอยู่หลังจอ
// (เจอตอนทดสอบ 8 ก.ย. 2569: สลับแท็บกลางฉากต่อสู้แล้วกล่องหาย ไม่มีอะไรเปิดกลับให้)
setInterval(() => {
  releaseDlgPause();       // กล่องปิดไปแล้วแต่ยังไม่ได้คืนค่าพัก — ดูหมายเหตุที่ pauseForDlg()
  if (battleUI && g.battle && !g.battle.over && !dlg.open) battleUI();
  updateTrialBtn();        // ปุ่มสอบสวนต้องตามการเดินให้ทันแม้ลูปเฟรมจะหยุด (แท็บอยู่หลังจอ)
  updateMobFab();          // ปุ่มสู้เหนือหัวผีก็ต้องเก็บกวาดตัวเองได้แม้ลูปเฟรมจะหยุด
  updateBossFab();
  updateFrontierFab();
  // พ่อลงมาตบเพราะตัดสินพลาดติดกันสามสำนวน — รอจนกว่าโมดัลอื่นจะปิดก่อน
  // startDadFight() เรียก this.onChange() เองอยู่แล้ว ซึ่งเปิดฉากต่อสู้ให้เองในตัว (ดู g.onChange ท้ายไฟล์)
  // ห้ามเรียก openBattle() ซ้ำตรงนี้ — เจอ 17 ก.ย. 2569 ว่าเรียกซ้ำทำให้มี onClose สองชุดค้างอยู่บน dlg
  // ชุดเก่าจะมาปิดกล่องกระทะทองแดงทิ้งทันทีที่ฉากต่อสู้จบ (ดู CONCEPT §22.6)
  if (g.dadFight && !g.battle && !g.over && !dlg.open && !fx && Date.now() - lastBattleEnd > 1600) {
    g.startDadFight();
  }
}, 400);

// ---------- ลูป ----------
let saveAt = 0;
function frame(now) {
  const dt = Math.min(120, now - last); last = now;
  if (!g.over) { keyWalk(dt); g.stepWorld(dt); }   // ตัวละครเดินตามเวลาจริง ไม่ผูกกับวาระ
  if (now > saveAt) { saveAt = now + 4000; g.save(); }
  if (!g.paused && !g.over) {
    acc += dt;
    const step = BAL.tickMs / g.speed;
    while (acc >= step) { acc -= step; g.step(); if (g.over || g.paused) break; }
  }
  render(ctx, g, now, hover, sel);
  followMarks(); drawAtk(); updateTrialBtn(); updateMobFab(); updateBossFab(); updateFrontierFab(); drawPauseTag();
  requestAnimationFrame(frame);
}

/** ป้าย "พักอยู่" ทับฉาก — เกมที่พักอยู่กับเกมที่กำลังเล่นเคยหน้าตาเหมือนกันเป๊ะ
 *  ต่างกันแค่ตัวหนังสือบนปุ่มเล็ก ๆ ใต้ฉาก ผู้เล่นจึงนั่งรอทัณฑ์ที่ไม่มีวันเดิน
 *  ไม่ขึ้นตอนเปิดกล่องข้อความ เพราะกล่องพักเกมให้อยู่แล้วโดยตั้งใจ */
let pauseTagOn = null;
function drawPauseTag() {
  const on = g.paused && !g.over && !dlg.open && !g.bossWalk;
  if (on === pauseTagOn) return;
  pauseTagOn = on;
  document.querySelector('.stage').classList.toggle('resting', on);
}

// ---------- แถบทรัพยากร ----------
function bar(v, cls = '') { return `<span class="bar ${cls}"><i style="width:${Math.round(v)}%"></i></span>`; }

function drawRes() {
  const avg = g.casesDone ? Math.round(g.scoreSum / g.casesDone) : 0;
  const ot = g.orderTier(), kt = g.karmaTier();
  $('#res').innerHTML = `
    <span class="chip tap" data-ex="coin">🪙 <b>${Math.round(g.coin)}</b></span>
    <span class="chip tap" data-ex="fuel">🔥 <b>${Math.round(g.fuel)}</b></span>
    <span class="chip tap" data-ex="hp">❤️ บารมี ${bar(100 * g.hp / g.hpMax, 'hp')} <b>${Math.round(g.hp)}</b></span>
    <span class="chip tap" data-ex="order">⚖️ ระเบียบ ${bar(g.order)} <b>${Math.round(g.order)}</b>
      <i style="font-style:normal;opacity:.6">${esc(ot.name)}</i></span>
    <span class="chip tap" data-ex="karma">☠️ กรรมท่าน ${bar(g.karma, 'karma')} <b>${g.karma.toFixed(1)}</b>
      <i style="font-style:normal;opacity:.6">${esc(kt.name)}</i></span>
    <span class="chip">📁 <b>${g.casesDone}</b> คดี · เฉลี่ย ${avg}</span>
    <span class="chip">🎖️ ${esc(LEVELS[g.level - 1].name)} · ⭐${g.star5}</span>
    ${g.mobs.length ? `<span class="chip" style="color:var(--destructive)">👹 เปรต ${g.mobs.length} ตน</span>` : ''}`;
  $('#res').querySelectorAll('[data-ex]').forEach(el => el.onclick = () => explainBar(el.dataset.ex));
  $('#tickinfo').textContent = `วาระที่ ${g.tick} · ตรวจการรอบหน้าอีก ${g.nextKpi} วาระ · ผ่านแล้ว ${g.kpiPassed}/${BAL.kpiWin}`;
}

/** กดที่แถบไหนก็บอกได้ว่ามันมีไว้ทำอะไร ตอนนี้อยู่ขั้นไหน และหมด/เต็มแล้วเกิดอะไร
 *  (เจ้าของอ่านแล้วไม่รู้ว่าระเบียบกับกรรมท่านมีไว้ทำไม — 7 ก.ย. 2569) */
function explainBar(k) {
  const tiers = (list, now, fmt) => list.map(t =>
    `<div class="tline${t === now ? ' on' : ''}"><b>${esc(fmt(t))}</b> · ${esc(t.name)}<div>${esc(t.eff)}</div></div>`).join('');

  if (k === 'hp') return modal(`<h2>❤️ บารมี — ${Math.round(g.hp)}/${g.hpMax}</h2>
    <p style="font-size:var(--text-sm);line-height:var(--leading-body)">
      ความน่าเชื่อถือที่พญายมมีให้ท่าน <b>คือชีวิตของท่านในเกมนี้</b></p>
    <div class="tline"><b>หายเมื่อไหร่</b><div>คำตัดสินได้ 0 ดาว หรือลงทัณฑ์เกินกรรมสองวาระขึ้นไป = โดนลูกไฟ บารมีหาย 1 ใน 5 ·
      ได้ 1 ดาว = หาย 10</div></div>
    <div class="tline"><b>ได้คืนเมื่อไหร่</b><div>ตัดสินได้ห้าดาว (พ่อคืนให้นิดหน่อย — และคืนน้อยลงถ้ากรรมท่านสูง) ·
      เดินไปเก็บ<b>หีบยาอายุวัฒนะ</b>ที่ตกอยู่บนแผนที่ +20</div></div>
    <div class="tline bad"><b>ถ้าหมด</b><div>จบเกมทันที — พญายมเรียกตราคืนจากมือท่านต่อหน้าทุกคน</div></div>
    <div class="row"><button class="gold" data-close>เข้าใจแล้ว</button></div>`);

  if (k === 'order') return modal(`<h2>⚖️ ระเบียบ — ${Math.round(g.order)} (${esc(g.orderTier().name)})</h2>
    <p style="font-size:var(--text-sm);line-height:var(--leading-body)">
      โซนนี้เดินเป็นระบบแค่ไหน <b>เป็นตัวคูณรายได้ของท่านทุกคดี</b> และเป็นตัวเลขที่พญายมใช้ตรวจการ</p>
    <div class="tline"><b>ขึ้นเมื่อ</b><div>ปิดคดีได้คะแนนดี · ปราบเปรต (+3) · มีหอทะเบียนกรรม (+${BAL.orderGainSala}/วาระ)</div></div>
    <div class="tline"><b>ลงเมื่อ</b><div>คิวเกิน ${g.queueCap()} ดวง (ยิ่งล้นยิ่งตกเร็ว${g.has('tarang') ? ' · ตะรางขยายให้แล้ว' : ' — สร้างตะรางรอวาระขยายได้'}) · ปล่อยเปรตไว้ · คำตัดสินคะแนนต่ำ ·
      ตรวจการไม่ผ่าน (−10) · กรรมท่านสูงเกิน 75</div></div>
    ${tiers(ORDER_TIERS, g.orderTier(), t => t.min + '+')}
    <div class="tline bad"><b>ถ้าหมด (0)</b><div>พญายมเตือนให้ตั้งหลักได้สามครั้ง หลังจากนั้นท่านจะลงมาปราบและส่งยมบาทไปรับโทษในกระทะทองแดง</div></div>
    <div class="row"><button class="gold" data-close>เข้าใจแล้ว</button></div>`);

  if (k === 'karma') return modal(`<h2>☠️ กรรมท่าน — ${g.karma.toFixed(1)} (${esc(g.karmaTier().name)})</h2>
    <p style="font-size:var(--text-sm);line-height:var(--leading-body)">
      บาปที่ <b>ตกใส่ตัวท่านเอง</b> ไม่ใช่ของวิญญาณ — แกนของเกมทั้งเกมคือ
      "ทัณฑ์ที่เกินกรรม มันไม่ได้หายไปไหน มันมาอยู่ที่ผู้ตัดสิน"</p>
    <div class="tline"><b>ขึ้นเมื่อ</b><div>ลงทัณฑ์เกินกรรมที่เขาก่อ (ยิ่งเกินยิ่งหนัก) · ส่งผิดชนิดกรรม (+4) ·
      ใช้สะกดจิต (+4) · ตวาดข่มขู่ (+0.5)</div></div>
    <div class="tline good"><b>ลดได้ยังไง</b><div>ตัดสินได้ห้าดาว −${KARMA_RELIEF.star5} ·
      เก็บ<b>ดอกบัวบูชา</b>ที่ตกบนแผนที่ (ตกให้เมื่อกรรมเกิน 40) −4 ·
      บูชาดอกบัวที่<b>ศาลาน้ำชา</b> ${KARMA_RELIEF.lotusCost} เบี้ย −${KARMA_RELIEF.lotusCut} (แท็บก่อสร้าง)</div></div>
    ${tiers(KARMA_TIERS, g.karmaTier(), t => '≤' + t.max)}
    <div class="tline bad"><b>ถ้าเต็ม (100)</b><div>พญายมลงมาปราบด้วยตัวเอง แพ้แล้วถูกส่งลงกระทะทองแดง บารมีเหลือ 1 และกรรมลดลงหลังชดใช้บางส่วน</div></div>
    <div class="row"><button class="gold" data-close>เข้าใจแล้ว</button></div>`);

  if (k === 'fuel') return modal(`<h2>🔥 ฟืน — ${Math.round(g.fuel)} ดุ้น</h2>
    <p style="font-size:var(--text-sm);line-height:var(--leading-body)">
      เชื้อไฟใต้สถานี แต่ละสถานีกินไม่เท่ากัน (กระทะทองแดงกินหนักสุด · โลกันตนรกไม่กินเลย)</p>
    <div class="tline bad"><b>ถ้าหมด</b><div>สถานีที่ต้องใช้ไฟ<b>หยุดทำงานทันที</b> คดีค้าง คิวล้น ระเบียบตกตามไปด้วย —
      ไม่จบเกมทันที แต่พาไปจบทางระเบียบได้</div></div>
    <div class="tline"><b>เติมยังไง</b><div>ซื้อที่แท็บก่อสร้าง (${BAL.fuelPrice * 10} เบี้ย/10 ดุ้น) หรือเดินไปเก็บ<b>มัดฟืน</b>บนแผนที่</div></div>
    <div class="row"><button class="gold" data-close>เข้าใจแล้ว</button></div>`);

  return modal(`<h2>🪙 เบี้ยกรรม — ${Math.round(g.coin)}</h2>
    <p style="font-size:var(--text-sm);line-height:var(--leading-body)">
      เงินของโซน ใช้สร้างสถานี จ้างยมทูต ซื้อฟืน และบูชาดอกบัว</p>
    <div class="tline"><b>ได้จาก</b><div>ปิดคดี (คูณด้วยระเบียบของโซน) · สี่ดาว +25 · ห้าดาว +60 ·
      ปราบเปรต +${MOB.bounty} · ตรวจการผ่าน +150</div></div>
    <div class="tline"><b>เสียไปกับ</b><div>ค่าแรงยมทูตทุก ${BAL.payEvery} วาระ · ค่าสร้าง · ค่าจ้าง · ค่าฟืน</div></div>
    <div class="tline bad"><b>ถ้าติดลบถึง −300</b><div>จบเกม — ยมทูตวางเครื่องมือแล้วเดินออกไปพร้อมกัน</div></div>
    <div class="row"><button class="gold" data-close>เข้าใจแล้ว</button></div>`);
}

// ---------- แผงข้าง ----------
/** น้ำหนักติดลบ = ข้อเท็จจริงที่ "ลดกรรม" ของคดีนั้น (เช่น เหตุที่ทำให้เห็นใจ)
 *  เดิมเอาไปเปิดตาราง WEIGHT ตรง ๆ แล้วได้คำว่า undefined ห้อยท้ายสำนวน
 *  (เจ้าของเจอ 10 ก.ย. 2569 ในคดีของน้องแพรวา) */
const weightLabel = w => w < 0 ? 'บรรเทาโทษ' : (WEIGHT[w] || '');
function deedLine(d) {
  const w = weightLabel(d.w);
  return `<span class="tag" style="background:${SINS[d.s].color}22;color:${SINS[d.s].color}">${SINS[d.s].name}</span>${esc(d.t)}`
    + (w ? ` <b style="color:var(--${d.w < 0 ? 'success' : 'warning'})">· ${w}</b>` : '');
}

/** สิ่งที่นิราอ่านได้ก่อนสอบสวน: ภาพลักษณ์ + บุญที่อ้างเท่านั้น
 *  ไม่ติดป้ายว่าบุญไหนจริง/ปลอม เพราะนั่นคือคำตอบของคดี */
function publicMeritLine(m, cls = 'deed') {
  return `<div class="${cls}" style="color:var(--success)">🪷 ${esc(m.t)}`
    + (m.note ? ` <i style="color:var(--warning)">— ${esc(m.note)}</i>` : '') + '</div>';
}
function publicDossier(s, cls = 'deed') {
  const faceLine = s.face ? `<div class="${cls}" style="color:var(--accent-foreground)">${esc(s.face)}</div>` : '';
  const merits = s.merits.filter(m => !m.exposed).map(m => publicMeritLine(m, cls)).join('');
  const found = s.deeds.filter(d => d.known && d.visible !== false)
    .map(d => `<div class="${cls}">${deedLine(d)}</div>`).join('');
  return faceLine + merits + found;
}

/** รูปหน้าเล็กในรายชื่อ — ไม่มีไฟล์โปรไฟล์ก็ถอยไปเป็นอีโมจิตัวเดิม */
function face(key, glyph) {
  return `<span class="g"><img src="${artUrl(key + '-profile') || artUrl(key)}" alt=""
    onerror="this.parentNode.textContent='${glyph}'"></span>`;
}

function drawTab() {
  const b = $('#tabbody');
  if (tab === 'queue') {
    const sentenced = g.sentences.filter(x => x.zone === g.zone);
    if (!g.queue.length && !g.held.length && !sentenced.length) { b.innerHTML = '<div class="empty">คิวว่าง — โซนนี้สงบผิดปกติ</div>'; return; }
    const cap = g.queueCap(), over = g.queue.length - cap;
    b.innerHTML = `<div style="font-size:var(--text-xs);margin-bottom:8px;color:${over > 0 ? 'var(--destructive)' : 'var(--muted-foreground)'}">
        คิว ${g.queue.length}/${cap} ดวง${over > 0 ? ` · <b>ล้น ${over} ดวง ระเบียบกำลังตก</b>`
          : ' · เกินความจุแล้วระเบียบจะเริ่มตก'}${g.has('tarang')
            ? ` · 🔒 ตะราง ${g.held.length}/${TARANG.hold}` : ''}</div>`;
    b.innerHTML += g.queue.map(s => `
      <div class="soul" data-soul="${s.id}">
        <div class="top"><b>${s.name ? esc(s.name) + ' · ' : ''}${esc(s.who)}${s.back ? ' <span style="color:var(--destructive);font-size:var(--text-xs)">↩️ ยังไม่สำนึก · กลับเข้าคิวก่อนเกิดใหม่</span>' : ''}</b><span class="id ${s.waited > 40 ? 'wait' : ''}">#${String(s.id).padStart(3, '0')} · รอ ${s.waited} วาระ</span></div>
        ${s.case ? publicDossier(s) : s.deeds.filter(d => d.known).map(d => `<div class="deed">${deedLine(d)}</div>`).join('')}
        ${s.case ? '' : s.merits.filter(m => !m.exposed).map(publicMeritLine).join('')}
      </div>`).join('');
    // คนที่ถูกขังอยู่ — ไม่นับในคิว ไม่กัดระเบียบ แต่กินค่าข้าวทุกวาระ เบิกตัวขึ้นแท่นได้ตลอด
    if (g.held.length) {
      b.innerHTML += `<div class="sec">🔒 อยู่ในตะราง — ค่าข้าว ${(TARANG.feed * g.held.length).toFixed(1)} เบี้ยต่อวาระ</div>`
        + g.held.map(s => `
        <div class="soul" style="border-color:var(--input)">
          <div class="top"><b>${s.name ? esc(s.name) + ' · ' : ''}${esc(s.who)}</b>
            <span class="id">#${String(s.id).padStart(3, '0')} · ขังมา ${s.waited} วาระ</span></div>
          ${s.case ? publicDossier(s) : s.deeds.filter(d => d.known).map(d => `<div class="deed">${deedLine(d)}</div>`).join('')}
          <button class="sm" data-free="${s.id}" style="margin-top:6px">🔓 เบิกตัวขึ้นแท่น</button>
        </div>`).join('');
      b.querySelectorAll('[data-free]').forEach(x =>
        x.onclick = e => { e.stopPropagation(); g.release(+x.dataset.free); refresh(); });
    }
    if (sentenced.length) b.innerHTML += `<div class="sec">🔒 หลังรับทัณฑ์ — ${sentenced.length} ดวง</div>`
      + sentenced.map(x => `<div class="soul"><div class="top"><b>${esc(x.soul.name || x.soul.who)}</b>
        <span class="id">#${String(x.soul.id).padStart(3, '0')}</span></div>
        <div class="deed">${x.stage === 'prison'
          ? x.inspected ? (x.repentant ? 'นิราตรวจแล้ว: เข็ดแล้ว · รอส่งไปประตูสวรรค์' : 'นิราตรวจแล้ว: ยังไม่เข็ด · รอส่งกลับคิว')
            : g.tick < (x.readyAt ?? x.until ?? 0) ? `อยู่ในตะราง · ตรวจได้อีก ${Math.max(0, (x.readyAt ?? x.until) - g.tick)} วาระ` : 'อยู่ในตะราง · รอนิราตรวจ'
          : x.checked ? `บุญตรวจแล้ว: กรรมคงเหลือ ${x.karmaLeft} · รอส่ง${x.karmaLeft > 0 ? 'ไปเกิดใหม่' : 'ขึ้นสวรรค์'}` : 'อยู่ที่ประตูสวรรค์ · รอบุญตรวจ'}</div></div>`).join('');
    b.querySelectorAll('[data-soul]').forEach(x =>
      x.onclick = () => {                       // เรียกคดีนี้ขึ้นมาที่แท่นก่อน
        const i = g.queue.findIndex(s => s.id === +x.dataset.soul);
        if (i > 0) g.queue.unshift(g.queue.splice(i, 1)[0]);
        pick = { st: null, cr: null, inten: null };
        refresh();
      });

  } else if (tab === 'crew') {
    const canHire = CREW.filter(c => !g.crew.some(x => x.k === c.k));
    b.innerHTML = g.crew.map(c => `
      <div class="crew">
        ${face('crew-' + c.k, c.glyph)}
        <span class="n"><b>${c.name}</b>
          <div class="st">แรง ${c.raeng} · ระเบียบ ${c.rabiab} · ปัญญา ${c.panya} · เมตตา ${c.metta}</div>
          <div class="st">กำลังใจ ${Math.round(c.morale)} · ${c.reader ? '<b style="color:var(--gold)">อ่านสำนวนให้ท่าน — ไม่รับเวรลงทัณฑ์</b>' : c.at ? 'ประจำ' + (STATIONS.find(s => s.k === c.at)?.name ?? '') : 'ว่าง — รอรับเวร'} · ค่าแรง ${c.pay}</div>
        </span>
      </div>`).join('')
      + `<div style="font-size:var(--text-xs);color:var(--muted-foreground);margin:12px 0 6px">
           ยังจ้างได้ · เบี้ยกรรมของท่านตอนนี้ ${Math.round(g.coin)}</div>`
      + (canHire.length ? canHire.map(c => `
      <div class="crew">
        ${face('crew-' + c.k, c.glyph)}
        <span class="n"><b>${crewName(c, g.zone)}</b> <span class="st" style="display:inline">— ${esc(c.duty)}</span>
          <div class="st">แรง ${c.raeng} · ระเบียบ ${c.rabiab} · ปัญญา ${c.panya} · เมตตา ${c.metta} · ค่าแรง ${c.pay}</div>
          <div class="st">${esc(c.line)}</div></span>
        <button class="sm" data-hire="${c.k}" ${g.coin < c.hire ? 'disabled' : ''}>จ้าง ${c.hire}</button>
      </div>`).join('') : '<div class="empty">จ้างครบทุกคนแล้ว</div>')
      // ยักษ์ทวารบาลอยู่ในแท็บนี้ด้วย — เป็นคน ไม่ใช่สิ่งก่อสร้าง
      // (เดิมตัวจัดการปุ่มไปรออยู่แท็บก่อสร้าง แต่ไม่เคยมีใครวาดปุ่มให้ เลยจ้างไม่ได้เลย)
      + `<div style="font-size:var(--text-xs);color:var(--muted-foreground);margin:12px 0 6px">ยามประจำโซน</div>
      <div class="crew">
        ${face(GUARD.img, '🛡️')}
        <span class="n"><b>${GUARD.name}</b>
          <div class="st">${esc(GUARD.desc)} · ค่าแรง ${GUARD.pay}</div>
          <div class="st">${esc(GUARD.line)}</div></span>
        ${g.guard ? '<button class="sm" disabled>จ้างแล้ว</button>'
                  : `<button class="sm" id="hireg" ${g.coin < GUARD.hire ? 'disabled' : ''}>จ้าง ${GUARD.hire}</button>`}
      </div>`;
    b.querySelectorAll('[data-hire]').forEach(el =>
      el.onclick = () => { g.hire(el.dataset.hire); refresh(); });
    const hg2 = b.querySelector('#hireg');
    if (hg2) hg2.onclick = () => { g.hireGuard(); refresh(); };

  } else {
    b.innerHTML = `
      <div class="shop"><span class="g">🔥</span>
        <span class="n"><b>ฟืน 10 ดุ้น</b><div>เชื้อไฟใต้สถานี หมดแล้วทุกอย่างหยุด</div></span>
        <button class="sm" id="buyfuel" ${g.coin < BAL.fuelPrice * 10 ? 'disabled' : ''}>ซื้อ ${BAL.fuelPrice * 10}</button>
      </div>
      `
      + (g.stations.some(x => x.def.k === 'tea') ? `
      <div class="shop"><span class="g">🪷</span>
        <span class="n"><b>ดอกบัวบูชา</b><div>วางที่ศาลาน้ำชา — ลดกรรมของท่านเอง ${KARMA_RELIEF.lotusCut}
          (ตอนนี้กรรมท่าน ${g.karma.toFixed(1)})</div></span>
        <button class="sm" id="buylotus" ${g.karma <= 0 || g.coin < KARMA_RELIEF.lotusCost ? 'disabled' : ''}>บูชา ${KARMA_RELIEF.lotusCost}</button>
      </div>` : '')
      + `<div style="font-size:var(--text-xs);color:var(--muted-foreground);margin:12px 0 6px">
           สถานีทัณฑ์ — <b>สร้างแนวไหน สำนวนแนวนั้นถึงจะถูกส่งเข้าคิว</b><br>
           ตอนนี้โซนนี้รับได้: ${g.activeTags().map(t => `<span class="tag" style="background:${SINS[t].color}22;color:${SINS[t].color}">${SINS[t].name}</span>`).join(' ') || 'ยังไม่มีเลย'}</div>`
      + STATIONS.filter(s => s.cost > 0).map(s => {
        const built = g.stations.some(x => x.def.k === s.k);
        const open = s.tags.filter(t => !g.activeTags().includes(t)).map(t => SINS[t].name);
        return `<div class="shop"><span class="g">${s.glyph}</span>
          <span class="n"><b>${s.name}</b><div>${esc(s.desc)}</div>
            ${s.use ? `<div style="color:var(--gold)">${esc(s.use)}</div>` : ''}
            <div>${s.tags.length ? 'ตรงกรรม: ' + s.tags.map(t => SINS[t].name).join(' · ') : 'ไม่ใช้ลงทัณฑ์'} · ฟืน ${s.fuel}/วาระ</div>
            ${!built && open.length ? `<div style="color:var(--gold)">สร้างแล้วจะเริ่มมีสำนวน "${open.join(' · ')}" ส่งเข้าคิว</div>` : ''}</span>
          <button class="sm" data-build="${s.k}" ${built || g.coin < s.cost ? 'disabled' : ''}>${built ? 'สร้างแล้ว' : 'สร้าง ' + s.cost}</button>
        </div>`;
      }).join('');
    const bf = $('#buyfuel'); if (bf) bf.onclick = () => { g.buy('fuel', 1); refresh(); };
    const bl = $('#buylotus'); if (bl) bl.onclick = () => { g.buy('lotus'); refresh(); };
    b.querySelectorAll('[data-build]').forEach(el =>
      el.onclick = () => { g.build(el.dataset.build); refresh(); });
  }
}

// ---------- แผงข้อมูล (dashboard) ----------
// แทนที่แถบบันทึกเดิม — กดตัวละคร/วิญญาณบนฉากแล้วดูรายละเอียดตรงนี้
// บันทึกยังอยู่ ย้ายไปเป็นแท็บที่สองของแผงเดียวกัน
let side = 'info';                  // 'info' | 'log'
let sel = { kind: 'me', key: 0 };   // ตัวที่กำลังดูอยู่

/** ตั้งตัวที่กำลังดู แล้ววาดใหม่ทันที (สลับมาแท็บข้อมูลให้ด้วย) */
function select(s) { sel = s; side = 'info'; refresh(); }

const nameOfSt = k => STATIONS.find(d => d.k === k)?.name ?? '—';

/** หัวโปรไฟล์: รูป + ชื่อ + หน้าที่ + กำลังทำอะไรอยู่
 *  ลองรูปโปรไฟล์เต็มใบก่อน (img/<key>-profile.png) ไม่มีค่อยถอยไปใช้รูป standee เดิม
 *  → gen รูปโปรไฟล์ตัวไหนมาใหม่ ก็แค่วางไว้ img/raw/<key>-profile.jpeg แล้วรัน scripts/prep-art.py
 *    ไม่ต้องแตะโค้ดสักบรรทัด (7 ก.ย. 2569) */
function profile(imgKey, name, duty, now) {
  // ไม่มีทั้งรูปโปรไฟล์และรูป standee ก็ซ่อนกรอบไปเลย อย่าปล่อยไอคอนรูปแตกไว้
  const std = artUrl(imgKey);
  const fallback = `this.onerror=function(){this.style.visibility='hidden'};`
                 + `this.src='${std}';this.classList.remove('full')`;
  return `<div class="prof">
    <img class="full" src="${artUrl(imgKey + '-profile') || std}" alt=""
         onerror="${fallback}" onload="if(!this.src.includes('-profile'))this.classList.remove('full')">
    <div class="hd"><b>${esc(name)}</b>
      <div class="duty">${esc(duty)}</div>
      <div class="now">${now}</div></div></div>`;
}
const think = t => `<div class="think">${esc(t)}</div>`;
const kv = arr => `<div class="kv">${arr.map(x => `<span>${x}</span>`).join('')}</div>`;

/** ความคิดของยมบาท — เปลี่ยนตามสถานะจริง ไม่ใช่ประโยคตายตัว */
function meThought() {
  if (g.hp <= g.hpMax * 0.35) return '"บารมีเหลือเท่านี้ ถ้าหมดพ่อคงลงมาจัดการข้าเอง"';
  if (g.karma >= 45) return '"บัญชีของข้าหนาขึ้นทุกคดี... ทัณฑ์ที่เกินกรรมมันมาอยู่ที่ข้าจริง ๆ"';
  if (g.queue.length > g.queueCap()) return '"คิวล้นขนาดนี้ ระเบียบไม่มีทางขึ้น ต้องรีบปิดคดี"';
  if (g.mobs.length) return '"เปรตขึ้นมาอีกแล้ว ปล่อยไว้ระเบียบตกไปเรื่อย ๆ"';
  if (g.fuel < 12) return '"ฟืนใกล้หมด ไฟใต้กระทะดับเมื่อไหร่ทุกอย่างหยุด"';
  if (g.star5 >= 3) return '"ห้าดาวมาสามครั้งแล้ว อีกสองครั้งก็เลื่อนขั้น"';
  return '"พิพากษาให้ตรงกรรม ไม่ใช่ให้แรงที่สุด — พ่อพูดไว้แบบนั้น"';
}

/** เฉลยคดี: ความจริงทั้งหมด vs สิ่งที่เราสั่งไป
 *  17 ก.ย. 2569 — คุณเป้สั่ง: hidden/reveal เปิดได้แค่หลังสอบสวนหรือใช้พลังเท่านั้น
 *  ก่อนหน้านี้ฟังก์ชันนี้โชว์ soul.deeds/merits "ทั้งชุด" ไม่กรองเลย ไม่ว่า closed จะเป็นอะไร
 *  พอถูกเรียกตอนวิญญาณ "กำลังรับทัณฑ์" (stx ใน infoOf, closed=false) — คือแค่ลากไปส่งสถานี
 *  ยังไม่ทันสอบสวน/ใช้พลังสักครั้ง — เรื่องที่ซ่อนไว้กับบุญปลอมก็โชว์เต็มอยู่ดี ทั้งที่ข้อความ
 *  hint ก่อนหน้านั้นบอกผู้เล่นไว้เองว่า "เฉลยจะขึ้นตรงนี้หลังปิดคดีแล้ว" (ui.js บรรทัด ~489)
 *  ตอนนี้: ระหว่างรับทัณฑ์ (!closed) กรองเหลือเฉพาะที่ known/exposed จริงแล้วเท่านั้น
 *  ปิดคดีแล้ว (closed) ถึงโชว์เต็มชุด — ตรงกับ hint เดิมทุกตัวอักษร ไม่ได้แก้ข้อความอะไร */
function verdictCard(soul, r, stK, crewK, intensity, closed) {
  const st = STATIONS.find(d => d.k === stK);
  const shownDeeds = closed ? soul.deeds : soul.deeds.filter(d => d.known);
  // "ตรงชนิดกรรม" ต้องเทียบกับเรื่องที่เห็นแล้วเท่านั้นด้วย — ไม่งั้นสถานีจะขึ้น "ตรงชนิดกรรม"
  // เพราะเรื่องที่ซ่อนไว้ (ยังไม่สอบสวน) บังเอิญตรง ทั้งที่ผู้เล่นไม่เคยเห็นเรื่องนั้นเลย
  const hit = st && shownDeeds.some(d => st.tags.includes(d.s));
  const truth = shownDeeds.map(d =>
    `<div class="row-truth ${d.known ? '' : 'hid'}">${SINS[d.s].name} · ${esc(d.t)} (น้ำหนัก ${d.w})${d.known ? '' : ' ← เรื่องที่สำนวนไม่ได้เขียนไว้'}</div>`).join('')
    || '<div class="row-truth">สำนวนว่างเปล่า</div>';
  const shownMerits = closed ? soul.merits : soul.merits.filter(m => !m.fake || m.exposed);
  const merit = shownMerits.map(m =>
    `<div class="row-truth ${m.fake ? 'fake' : ''}">🪷 ${esc(m.t)}${m.fake ? ' ← บุญปลอม เขากุขึ้นเอง' : ` (ลด ${m.v} วาระ)`}</div>`).join('')
    || '<div class="row-truth">ไม่มีบุญถ่วงเลย</div>';

  const diff = intensity - soul.deserved;
  const judgement = diff === 0 ? '<b style="color:var(--success)">พอดีกรรมเป๊ะ</b>'
    : diff > 0 ? `<b style="color:var(--destructive)">หนักเกินไป ${diff} วาระ</b> — ส่วนเกินกลายเป็นกรรมของท่าน +${r.karma}`
               : `<b style="color:var(--warning)">เบาไป ${-diff} วาระ</b> — เขายังไม่สำนึก`;

  return `<div class="sec">ความจริงทั้งหมด (ตอนนี้เห็นได้แล้ว)</div>${truth}
    <div class="sec">บุญที่อ้าง</div>${merit}
    <div class="sec">${closed ? 'ท่านตัดสินไปว่า' : 'ท่านสั่งไปว่า'}</div>
    <div class="row-truth">ส่ง<b>${esc(st?.name ?? '—')}</b> ${hit ? '<span style="color:var(--success)">ตรงชนิดกรรม</span>' : '<span style="color:var(--destructive)">ไม่ตรงชนิดกรรม</span>'}
      · ผู้คุม ${esc(g.crewOf(crewK)?.name ?? CREW.find(c => c.k === crewK)?.name ?? '—')}</div>
    <div class="row-truth">ระดับวาระ <b>${intensity} ${INTENSITY[intensity]}</b> · สมควรได้รับ <b>${soul.deserved}</b> → ${judgement}</div>
    ${kv([`ธรรม ${r.tham}`, `เข็ด ${r.ked}`, `ระเบียบ ${r.rab}`, `รวม ${r.score}`,
          '★'.repeat(r.stars ?? 0) + '☆'.repeat(5 - (r.stars ?? 0))])}`;
}

function drawSide() {
  const box = $('#side');
  $('#side-info').setAttribute('aria-selected', side === 'info' ? 'true' : 'false');
  $('#side-log').setAttribute('aria-selected', side === 'log' ? 'true' : 'false');

  if (side === 'log') {
    box.className = 'log';
    box.innerHTML = g.logs.map(l =>
      `<div class="${l.kind}"><span style="opacity:.45">[${String(l.t).padStart(3, '0')}]</span> ${esc(l.text)}</div>`).join('');
    return;
  }
  box.className = 'sidebody';

  // แถวปุ่มเลือกตัว — กดบนฉากก็ได้ กดตรงนี้ก็ได้
  const chips = [`<button data-sel="me:0" ${sel.kind === 'me' ? 'aria-pressed="true"' : ''}>👑 ตัวท่าน</button>`]
    .concat(g.crew.map(c => `<button data-sel="crew:${c.k}" ${sel.kind === 'crew' && sel.key === c.k ? 'aria-pressed="true"' : ''}>${c.glyph} ${esc(c.name)}</button>`))
    .concat(g.guard ? [`<button data-sel="guard:0" ${sel.kind === 'guard' ? 'aria-pressed="true"' : ''}>🛡️ ยักษ์</button>`] : [])
    .concat(g.mobs.map((m, i) => `<button data-sel="mob:${i}" ${sel.kind === 'mob' && sel.key === i ? 'aria-pressed="true"' : ''}>👹 เปรต</button>`))
    .concat(g.closed.length ? [`<button data-sel="closed:0" ${sel.kind === 'closed' ? 'aria-pressed="true"' : ''}>📁 คดีที่ปิดแล้ว</button>`] : []);
  let html = `<div class="picker">${chips.join('')}</div>`;

  html += sideBody();
  box.innerHTML = html;
  box.querySelectorAll('[data-sel]').forEach(el => el.onclick = () => {
    const [kind, key] = el.dataset.sel.split(':');
    select({ kind, key: /^\d+$/.test(key) ? +key : key });
  });
  const office = box.querySelector('#open-nira-office');
  if (office) office.onclick = openNiraOffice;
}

/** เนื้อของแผงข้อมูลตามตัวที่เลือก */
function sideBody() {
  // ---- ตัวเรา ----
  if (sel.kind === 'me') {
    const pw = POWERS.map(p => {
      const q = g.powerOf(p.k);
      const state = g.powerLocked(p) ? `ล็อก (ขั้น ${p.lv})` : q.ammo <= 0 ? 'หมด' : q.cd > 0 ? `รอ ${q.cd} คดี` : `พร้อม ×${q.ammo}`;
      return `<div class="row-truth">${p.glyph} <b>${esc(p.name)}</b> — ${esc(p.desc)} <span style="color:var(--gold)">[${state}]</span></div>`;
    }).join('');
    return profile('hero-yama', 'ยมบาท (ตัวท่าน)', LEVELS[g.level - 1].name,
        `ลูกของพญายม ถูกส่งมาคุมโซนสุวรรณภูมิ · ปิดคดีแล้ว ${g.casesDone} เรื่อง`)
      + think(meThought())
      + kv([`❤️ บารมี ${Math.round(g.hp)}/${g.hpMax}`, `☠️ กรรม ${g.karma.toFixed(1)}`,
            `⭐ ห้าดาว ${g.star5}`, `📁 เฉลี่ย ${g.casesDone ? Math.round(g.scoreSum / g.casesDone) : 0}`,
            `🪙 ${Math.round(g.coin)}`, `🔥 ฟืน ${Math.round(g.fuel)}`, `🔥 ลูกไฟ ×${g.powerOf('roar').ammo}`])
      + `<div class="sec">หน้าที่</div>
         <div class="row-truth">พิพากษาให้ <b>ตรงกรรม</b> — ตรงชนิดบาป และหนักพอดี ไม่ใช่หนักที่สุด</div>
         <div class="sec">ความสามารถ</div>${pw}
         <div class="hintline">กดตัวละครหรือวิญญาณบนฉากเพื่อดูข้อมูลของเขา</div>`;
  }

  // ---- ยมทูต ----
  if (sel.kind === 'crew') {
    const c = g.crewOf(sel.key);
    if (!c) return '<div class="empty">ยมทูตคนนี้ไม่ได้อยู่ในสังกัดแล้ว</div>';
    const st = c.at ? g.stations.find(s => s.def.k === c.at) : null;
    const now = st && st.slots.length
      ? `กำลังคุม <b>${st.slots.map(sl => esc(sl.soul.who)).join(' · ')}</b> ที่${esc(st.def.name)}
         · ${st.slots.length}/${g.stCap(st)} ดวง
         · คืบหน้าดวงแรก ${Math.round(100 * st.slots[0].progress / st.slots[0].need)}%`
      : c.reader ? `ยืนอ่านสำนวนอยู่ข้างแท่นพิพากษา — คิวตอนนี้ ${g.queue.length} ดวง`
      : c.at ? `ประจำ${esc(nameOfSt(c.at))} รอสำนวนถัดไป` : 'ว่าง — รอรับเวร';
    const strong = [['แรง', c.raeng], ['ระเบียบ', c.rabiab], ['ปัญญา', c.panya], ['เมตตา', c.metta]]
      .sort((a, b) => b[1] - a[1]);
    return profile('crew-' + c.k, c.name, c.duty, now)
      + think(c.say && Date.now() < c.sayUntil ? c.say : pickStable(c.says, c.k))
      + kv([`แรง ${c.raeng}`, `ระเบียบ ${c.rabiab}`, `ปัญญา ${c.panya}`, `เมตตา ${c.metta}`,
            `กำลังใจ ${Math.round(c.morale)}`, `ค่าแรง ${c.pay}`])
      + `<div class="sec">ถนัดอะไร</div>
         <div class="row-truth">เด่นที่ <b>${strong[0][0]} ${strong[0][1]}</b> · อ่อนที่ ${strong[3][0]} ${strong[3][1]}</div>
         <div class="row-truth">${crewNote(c)}</div>
         ${c.morale < 40 ? '<div class="row-truth hid">กำลังใจต่ำ — ทำงานช้าลง ควรให้พักที่ศาลาน้ำชา</div>' : ''}
         ${c.k === 'nira' ? '<button class="gold" id="open-nira-office">📋 จ้างคน · จัดทีม · ฝึกยมทูต</button>' : ''}`;
  }

  // ---- ยักษ์ทวารบาล ----
  if (sel.kind === 'guard') {
    if (!g.guard) return '<div class="empty">ยังไม่ได้จ้างยักษ์ทวารบาล</div>';
    return profile(GUARD.img, GUARD.name, 'ยามประจำโซน',
        g.mobs.length ? `กำลังไล่เปรต ${g.mobs.length} ตน` : 'ไม่มีเปรต — เฝ้าท่าเรือฝั่งขวาอยู่')
      + think(GUARD.line)
      + kv([`ค่าแรง ${GUARD.pay}/งวด`])
      + `<div class="sec">หน้าที่</div><div class="row-truth">${esc(GUARD.desc)}</div>`;
  }

  // ---- เปรต ----
  if (sel.kind === 'mob') {
    const m = g.mobs[sel.key];
    if (!m) return '<div class="empty">เปรตตนนั้นถูกปราบไปแล้ว</div>';
    const fire = g.powerOf('roar');
    const kd = MOB.kinds[m.kind ?? 0] || { name: MOB.name, img: MOB.img, line: '"หิว... หิว..."' };
    return profile(kd.img, kd.name, 'วิญญาณที่หลุดออกมาก่อกวน',
        `กัดระเบียบไป ${(MOB.drain).toFixed(2)} ต่อวาระ ตราบใดที่ยังอยู่`)
      + (kd.line ? think(kd.line) : '')
      + kv([`เลือด ${m.hp}/${MOB.hp}`, `ปราบได้ +${MOB.bounty} เบี้ยกรรม`, `ระเบียบ +3`])
      + `<div class="sec">ปราบยังไง</div>
         <div class="row-truth">กดปุ่ม ⚔️ ที่แถบล่าง · กดเว้นวรรค · หรือคลิกที่ตัวมันบนฉาก —
           ใช้<b>ลูกไฟ</b>หนึ่งลูก ตอนนี้มี <b>×${fire.ammo}</b></div>
         ${fire.ammo ? '' : '<div class="row-truth hid">ลูกไฟหมด — เดินไปเก็บลูกไฟที่ตกอยู่บนแผนที่ก่อน</div>'}`;
  }

  // ---- วิญญาณ ----
  if (sel.kind === 'soul') {
    const q = g.queue.find(s => s.id === sel.key);
    if (q) {                                        // ยังไม่ลงทัณฑ์ — เห็นแค่ที่เขาพูด
      const rec = q.case ? publicDossier(q, 'row-truth') : q.deeds.filter(d => d.known)
        .map(d => `<div class="row-truth">${SINS[d.s].name} · ${esc(d.t)} · ${weightLabel(d.w)}</div>`).join('')
        || '<div class="row-truth">สำนวนว่างเปล่า</div>';
      const said = q.said.map(x => `<div class="row-truth ${SAID_STYLE[x.kind] || ''}">${esc(x.text)}</div>`).join('')
        || '<div class="row-truth">...เขาก้มหน้าไม่พูดอะไร</div>';
      return profile(soulKey(q.sp || 7), q.who, `สำนวน #${String(q.id).padStart(3, '0')} · รอคิว ${q.waited} วาระ`,
          q.hard ? 'สำนวนหนาผิดปกติ — คดีนี้ถูกกับผิดปนกัน' : 'รอขึ้นแท่นพิพากษา')
        + `<div class="sec">สำนวนที่นิราอ่านได้</div>${rec}
           <div class="sec">เขาพูดว่า</div>${said}
           <div class="hintline">ยังไม่ลงทัณฑ์ — ความจริงที่เหลือต้องใช้พลังขุดเอา
             เฉลยจะขึ้นตรงนี้หลังปิดคดีแล้ว</div>`;
    }
    let stx = null, slotx = null;
    for (const st0 of g.stations) {
      const sl = st0.slots.find(x => x.soul.id === sel.key);
      if (sl) { stx = st0; slotx = sl; break; }
    }
    if (stx) return profile(soulKey(slotx.soul.sp || 7), slotx.soul.who,
        `สำนวน #${String(slotx.soul.id).padStart(3, '0')} · กำลังรับทัณฑ์`,
        `${esc(stx.def.name)} · คืบหน้า ${Math.round(100 * slotx.progress / slotx.need)}%`)
      + verdictCard(slotx.soul, slotx.verdict || g.judge(stx, slotx), stx.def.k, stx.crewK, slotx.intensity, false);
    const cl = g.closed.find(x => x.soul.id === sel.key);
    if (cl) return closedCard(cl);
    return '<div class="empty">ไม่พบวิญญาณดวงนี้แล้ว</div>';
  }

  // ---- รายการคดีที่ปิดแล้ว ----
  if (sel.kind === 'closed') {
    if (!g.closed.length) return '<div class="empty">ยังไม่มีคดีที่ปิดครบวาระ</div>';
    return `<div class="sec" style="border:0;margin-top:0">คดีที่ปิดแล้ว — กดเพื่อดูเฉลย</div>`
      + g.closed.map(x => `<div class="soul" data-sel="soul:${x.soul.id}">
          <div class="top"><b>${esc(x.soul.who)}</b>
            <span class="id">#${String(x.soul.id).padStart(3, '0')} · ${'★'.repeat(x.verdict.stars ?? 0)}${'☆'.repeat(5 - (x.verdict.stars ?? 0))}</span></div>
          <div class="deed">${esc(nameOfSt(x.stK))} · วาระ ${x.intensity} · รวม ${x.verdict.score} คะแนน</div>
        </div>`).join('');
  }
  return '<div class="empty">เลือกตัวละครหรือวิญญาณเพื่อดูข้อมูล</div>';
}

function closedCard(cl) {
  const r = cl.verdict;
  return profile(soulKey(cl.soul.sp || 7), cl.soul.who, `สำนวน #${String(cl.soul.id).padStart(3, '0')} · ปิดคดีแล้ว`,
      `ปิดที่วาระ ${cl.tick} · พญายมให้ ${'★'.repeat(r.stars ?? 0)}${'☆'.repeat(5 - (r.stars ?? 0))}`)
    + verdictCard(cl.soul, r, cl.stK, cl.crewK, cl.intensity, true);
}

/** ประโยคประจำตัว — เลือกแบบคงที่ต่อคน จะได้ไม่กระพริบเปลี่ยนทุกครั้งที่ refresh */
function pickStable(arr, key) {
  let h = 0; for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return arr[Math.abs(h) % arr.length];
}

/** ข้อสังเกตว่าคนนี้เหมาะกับงานแบบไหน — อ่านจากสเตตัสจริง */
function crewNote(c) {
  if (c.panya >= 8) return 'ปัญญาสูง — ส่งไปคุมคดีที่สำนวนคลุมเครือ จะได้คะแนนธรรมเพิ่ม';
  if (c.metta >= 8) return 'เมตตาสูง — ถึงเผลอสั่งเกินกรรม กรรมที่ตกใส่ท่านก็เบากว่าคนอื่น';
  if (c.raeng >= 8) return 'แรงเยอะ — ทัณฑ์เสร็จเร็ว แต่เมตตาต่ำ เผลอสั่งเกินแล้วกรรมตกหนัก';
  if (c.rabiab >= 8) return 'ระเบียบสูง — คะแนนแกนระเบียบดีขึ้นทุกคดีที่เขาคุม';
  return 'สเตตัสกลาง ๆ ใช้ได้ทั่วไป';
}

/** ป้ายบนหัวแท็บ — บอกว่ามีอะไรให้กดบ้าง ไม่ต้องเปิดดูเอง */
function drawTabHeads() {
  const hire = CREW.filter(c => !g.crew.some(x => x.k === c.k)).length + (g.guard ? 0 : 1);
  const build = STATIONS.filter(s => s.cost > 0 && !g.stations.some(x => x.def.k === s.k)).length;
  $('#tab-queue').textContent = `คิววิญญาณ${g.queue.length ? ` (${g.queue.length})` : ''}`
    + (g.held.length ? ` · 🔒${g.held.length}` : '');
  $('#tab-crew').textContent  = `ยมทูต${hire ? ` · จ้างได้ ${hire}` : ''}`;
  $('#tab-build').textContent = `ก่อสร้าง${build ? ` · สร้างได้ ${build}` : ''}`;
  for (const el of document.querySelectorAll('.tabs [data-tab]'))
    el.setAttribute('aria-selected', el.dataset.tab === tab ? 'true' : 'false');
}

/** ลงมือกับเปรต — ประชิดแล้วเปิด "หน้าต่อสู้" · ยังไกลอยู่ก็เดินไป/ขว้างลูกไฟตามเดิม
 *  (ฟาดบนแผนที่ยังใช้ได้ผ่านการขว้าง — หน้าต่อสู้คือทางที่ได้เบี้ยกรรมมากกว่า แต่เสี่ยงกว่า) */
function tryFight() {
  if (g.over || g.battle || dlg.open) return;
  const i = g.mobInReach();
  if (i >= 0) { g.startMobBattle(i); openBattle(); return; }
  g.attack(); sfx('hit'); refresh();
}

/** ปุ่มฟาดเปรต — โผล่เฉพาะตอนมีเปรตในโซน และบอกตรง ๆ ว่าลูกไฟเหลือเท่าไหร่ */
let atkSig = '';
function drawAtk() {
  const btn = $('#atk'), fab = $('#fab-atk'), fire = g.powerOf('roar');
  const n = g.over ? null : g.nearestMob();
  const near = n && n.d <= MOB.reach;
  const canThrow = n && !near && n.d <= MOB.throw && fire.ammo > 0;
  const sig = `${g.mobs.length}/${fire.ammo}/${g.over ? 1 : 0}/${near ? 1 : canThrow ? 2 : 0}`;
  if (sig === atkSig) return;
  atkSig = sig;
  btn.hidden = !!g.over || !g.mobs.length;
  fab.hidden = btn.hidden;
  if (btn.hidden) return;
  const [label, color] = near
    ? [`⚔️ เข้าต่อสู้กับเปรต (${g.mobs.length})`, 'var(--destructive)']
    : canThrow ? [`🔥 ขว้างลูกไฟใส่เปรต · ×${fire.ammo}`, 'var(--gold)']
    : [`🏃 เดินไปหาเปรต (${g.mobs.length}) แล้วเข้าต่อสู้`, 'var(--muted-foreground)'];
  btn.textContent = label;
  btn.style.color = color;
  fab.textContent = near ? '⚔️ เข้าต่อสู้' : canThrow ? `🔥 ขว้างลูกไฟ ×${fire.ammo}` : '🏃 ไปหาเปรต';
  fab.classList.toggle('hot', !!near);
  fab.classList.toggle('gold', !near && !!canThrow);
}

function refresh() { drawRes(); drawTabHeads(); drawTab(); drawSide(); drawOverlay(); drawDeck(); drawAtk(); drawCoach(); drawMiniGoal(); syncAva(); syncTitle(); }

function drawMiniGoal() {
  const el = $('#mini-goal');
  const goal = g.miniGoals[g.zone] || { truth:0, earned:false };
  el.textContent = goal.earned
    ? `📜 ภารกิจสาขาสำเร็จ — แฟ้มหลักฐานพร้อมใช้ก่อนสู้${g.zoneDef().bossName}`
    : `📜 เป้าหมายสั้น ๆ: สอบสวนจนเปิดความจริง แล้วตัดสินได้อย่างน้อย 78 คะแนน ${goal.truth}/3 คดี · รางวัล 90 เบี้ยกรรม`;
}

/** บรรทัดใต้ชื่อเกม — เดิมเขียน "นรกโซนสุวรรณภูมิ · ยมบาทฝึกหัด" ไว้ตายตัวใน index.html
 *  ย้ายโซนหรือเลื่อนขั้นแล้วมันยังบอกโซนแรกกับขั้นแรกอยู่ทั้งเกม (เจอตอนทดสอบข้อ 7) */
function syncTitle() {
  const el = $('#hdr-sub');
  if (!el) return;
  const want = `นรก${g.zoneDef().name} · ${LEVELS[g.level - 1].name}`;
  if (el.textContent !== want) el.textContent = want;
}

/** รูปหน้าตัวเรามุมซ้ายบน — เปลี่ยนตามโซน (ใน index.html เขียนของโซน 1 ไว้ตายตัว)
 *  จำค่าที่ตั้งไว้เอง ไม่เทียบกับ src จริง ไม่งั้นพอ onerror สลับไปรูปสำรอง จะตั้งกลับวนไม่จบ */
function syncAva() {
  warmZone();
  const a = $('#ava');
  if (!a) return;
  const want = artUrl('hero-yama-profile') || artUrl('hero-yama');
  if ((a.dataset.want || 'img/hero-yama-profile.png') === want) return;
  a.dataset.want = want;
  a.onerror = function () { this.onerror = () => this.remove(); this.src = artUrl('hero-yama'); };
  a.src = want;
}

document.querySelectorAll('.tabs [data-side]').forEach(el =>
  el.onclick = () => { side = el.dataset.side; drawSide(); });

document.querySelectorAll('.tabs [data-tab]').forEach(el =>
  el.onclick = () => { tab = el.dataset.tab; refresh(); });   // เดิมไม่มีตัวจัดการเลย กดแท็บไม่ติดทั้งเกม

$('#atk').onclick = tryFight;
$('#fab-atk').onclick = tryFight;
function goTrial() {
  // ยืนไม่ถึงแท่นก็เดินไปให้ก่อน แล้วค่อยกดใหม่ — ไม่ปิดกั้นเฉย ๆ โดยไม่บอกทาง
  if (!onBench()) { g.walkTo(SPOTS.bench.x + 40, SPOTS.bench.y); return; }
  openTrial();
}

// ---------- โมดัล ----------
const dlg = $('#dlg');

// ตัวจับกลางสำหรับปุ่มปิดทุกปุ่มในทุกโมดัล — ผูกครั้งเดียวตอนโหลดหน้า
// เดิมแต่ละโมดัลผูก onclick ให้ปุ่มของตัวเองตอน render ซึ่งพลาดได้หลายทาง
// (render ใหม่แล้วผูกไม่ทัน · onclick ถูกทับ · ตัวล็อกภายในค้าง)
// เจ้าของเจอ 8 ก.ย. 2569: กด "ปิดห้องสอบสวน" แล้วป๊อปอัปไม่ยอมปิด
// event delegation แบบนี้ไม่มีทางหลุด เพราะไม่ได้ผูกกับปุ่มตัวไหนเลย
//   ⚠️ ฉากต่อสู้ไม่ได้รับผลกระทบ — ปุ่มในนั้นใช้ data-fin ไม่ใช่ data-close
//      และถึงปิดไป ตัวเฝ้าก็เปิดกลับให้อยู่ดีถ้าฉากยังไม่จบ
dlg.addEventListener('click', e => {
  if (e.target.closest('[data-close]') && dlg.open) dlg.close();
});

function modal(html, onOpen) {
  dlg.innerHTML = html;
  openDlg('');
  dlg.querySelectorAll('[data-close]').forEach(b => b.onclick = () => dlg.close());
  if (onOpen) onOpen(dlg);
}

const SAID_STYLE = { deny:'', claim:'', truth:'truth', confess:'confess', false:'false', hint:'' };
const SAID_ICON  = { deny:'🗣️', claim:'🪷', truth:'', confess:'', false:'', hint:'↳' };

// ---------- ชั้นซ้อนบนฉาก + แถบบัญชาการ ----------
const ov = $('#ov'), deckBar = $('#deck');
let pick = { st: null, cr: null, inten: null }; // ต้องเลือกสถานที่ ผู้คุม และความแรงก่อนออกหมาย
let fx = null;                                  // คะแนน + เสียงพญายม (โชว์ชั่วคราว)

const CH = 82;                                  // ความสูงตัวละครบนฉาก ต้องตรงกับ CREW_H ใน scene.js
const pctX = x => (x / SCENE.w * 100) + '%';
const pctY = y => (y / SCENE.h * 100) + '%';

/** หมุดเหนือหัวตัวละคร — ชี้เมาส์ถึงจะกางบับเบิล */
function mark(cls, x, y, pin, html, show = false) {
  const side = x < SCENE.w * 0.26 ? 'aL' : x > SCENE.w * 0.74 ? 'aR' : '';
  const d = document.createElement('div');
  d.className = `mark ${cls} ${side} ${show ? 'show' : ''}`;
  d.dataset.sx = x; d.dataset.sy = y;
  d.innerHTML = `<div class="pin">${pin}</div><div class="bub">${html}</div>`;
  // มือถือไม่มี hover — แตะหมุดเพื่อเปิด/ปิด และปิดอันอื่นที่ค้างอยู่
  d.querySelector('.pin').onclick = ev => {
    ev.stopPropagation();
    const on = d.classList.contains('show');
    ov.querySelectorAll('.mark.show').forEach(m => m.classList.remove('show'));
    if (!on) d.classList.add('show');
  };
  ov.appendChild(d);
  place(d);
  return d;
}

/** วางตำแหน่ง element ที่ผูกพิกัดฉากไว้ */
function place(d) {
  const sx = +d.dataset.sx, sy = +d.dataset.sy;
  d.style.left = pctX(sx); d.style.top = pctY(sy);
  d.style.visibility = '';
}

/** หมุดที่ผูกกับตัวละครที่เดินได้ — อัปเดตพิกัดทุกเฟรม ไม่ต้องรอ refresh */
function followMarks() {
  for (const d of ov.children) {
    if (!d.dataset.follow) continue;
    const c = g.crewOf(d.dataset.follow);
    if (!c || c.x == null) continue;
    d.dataset.sx = c.x; d.dataset.sy = c.y - CH - 8;
    place(d);
  }
}

function drawOverlay() {
  // ปุ่มสู้เหนือหัวผีต้องรอดจากการล้างชั้นซ้อน — ทดสอบ 12 ก.ย. 2569 เจอว่าถ้าปล่อยให้
  // ถูกล้างแล้วสร้างใหม่ทุกรอบ refresh (ราว 0.7 วินาทีครั้ง) ผู้เล่นที่กดคาบเกี่ยวจังหวะนั้น
  // จะ "กดแล้วไม่ติด" เพราะปุ่มที่รับ mousedown ถูกถอดออกไปก่อน mouseup
  const keepFab = ov.querySelector('.mobfab');
  const keepBossFab = ov.querySelector('.bossfab');
  const keepFrontierFab = ov.querySelector('.frontierfab');
  ov.innerHTML = '';
  if (keepFab) ov.appendChild(keepFab);
  if (keepBossFab) ov.appendChild(keepBossFab);
  if (keepFrontierFab) ov.appendChild(keepFrontierFab);
  if (g.over) return;
  const s = g.queue[0];

  if (fx) {
    const col = fx.score >= 78 ? 'var(--success)' : fx.score >= 50 ? 'var(--gold)' : 'var(--destructive)';
    const d = document.createElement('div');
    d.className = 'score';
    d.dataset.sx = SPOTS.bench.x; d.dataset.sy = SPOTS.bench.y - 104;
    const st = '★'.repeat(fx.stars) + '☆'.repeat(5 - fx.stars);
    d.innerHTML = `<span style="color:${col};font-size:2rem;letter-spacing:2px">${st}</span>` +
      `<small style="color:${col}">${fx.score} คะแนน · ธรรม ${fx.tham} · เข็ด ${fx.ked}</small>`;
    ov.appendChild(d); place(d);
    mark('boss', SPOTS.throne.x, SPOTS.throne.y - CH - 8, '👑',
      `<span class="who">พญายม</span>${esc(fx.line)}`, true);
  }
  if (!s) return;

  // ปุ่มเริ่มสอบสวนลอยอยู่เหนือบัลลังก์ — เจ้าของสั่ง 9 ก.ย. 2569 ว่าต้องมีปุ่มอยู่ในฉากด้วย
  // (เดิมอยู่แต่ในแถบบัญชาการเหนือฉาก ซึ่งบนมือถือต้องเลื่อนหา)
  const tb = document.createElement('button');
  tb.className = 'trialfab';
  tb.dataset.sx = SPOTS.throne.x; tb.dataset.sy = SPOTS.throne.y - 96;
  tb.onclick = ev => { ev.stopPropagation(); goTrial(); };
  ov.appendChild(tb); place(tb);

  const rec = s.case ? publicDossier(s, 'line') : s.deeds.filter(d => d.known)
    .map(d => `<div class="line">${deedLine(d)}</div>`).join('')
    || '<div class="line">สำนวนว่างเปล่า ดิฉันเองก็ยังไม่รู้ว่าเขาทำอะไรมา</div>';
  // หมุดของนิราต้องตามตัวจริงไปด้วย — เธอเดินเตร็ดเตร่ และย้ายที่ถ้าไปรับเวรที่สถานี
  const nira = g.crewOf('nira');
  const post = nira && nira.at ? STATIONS.find(d => d.k === nira.at) : null;
  const nx = nira?.x ?? (post ? post.x : (nira ? nira.hx : 660));
  const ny = nira?.y ?? (post ? post.y : (nira ? nira.hy : 400));
  const nm = mark('', nx, ny - CH - 8, '📜',
    `<span class="who">นิรา · สำนวน #${String(s.id).padStart(3, '0')}</span>ผู้ตายเป็น<b>${esc(s.name || s.who)}</b>${rec}`);
  if (nira) nm.dataset.follow = 'nira';        // เธอเดินเตร็ดเตร่ หมุดต้องตามหัวไปทุกเฟรม

  const said = s.said.slice(-6).map(x =>
    `<div class="line ${SAID_STYLE[x.kind] || ''}">${SAID_ICON[x.kind] || ''} ${esc(x.text)}</div>`).join('')
    || '<div class="line">...เขาก้มหน้าไม่พูดอะไร</div>';
  const hasNew = s.said.some(x => x.kind === 'truth' || x.kind === 'confess' || x.kind === 'false');
  mark('soul', QUEUE_LINE[0][0], QUEUE_LINE[0][1] - CH - 8, hasNew ? '❗' : '💬',
    `<span class="who">${esc(s.who)}</span>${said}`);
}

/** ยืนอยู่บนแท่นพิพากษาหรือยัง — เจ้าของสั่ง 8 ก.ย. 2569 ว่าห้องสอบสวน
 *  ต้องเปิดได้จากตรงนี้เท่านั้น ไม่ใช่กดจากแท็บข้างล่างเมื่อไหร่ก็ได้ */
const BENCH_REACH = 170;
function onBench() {
  return Math.hypot(g.player.x - SPOTS.bench.x, g.player.y - SPOTS.bench.y) <= BENCH_REACH;
}

/** อัปเดตปุ่มสอบสวนทุกเฟรม — แถบบัญชาการวาดใหม่แค่ตอนเปลี่ยนวาระ ตามการเดินไม่ทัน */
function updateTrialBtn() {
  const s = g.queue[0];
  const near = onBench();
  const b = deckBar.querySelector('#d-trial');
  if (b) {
    if (!s) { b.disabled = true; b.textContent = '🔍 ยังไม่มีใครหน้าแท่น'; b.className = ''; }
    else { b.disabled = false; b.className = near ? 'gold' : ''; b.textContent = near ? '🔍 เริ่มการสอบสวน' : '🚶 เดินไปแท่นพิพากษา'; }
  }
  // ปุ่มเดียวกันลอยอยู่เหนือบัลลังก์บนฉาก — ขึ้นเฉพาะตอนมีคนยืนหน้าแท่นจริง
  const f = ov.querySelector('.trialfab');
  if (!f) return;
  f.hidden = !s || !!g.over || !!g.battle;
  if (f.hidden) return;
  f.textContent = near ? '🔍 เริ่มการสอบสวน' : '🚶 ไปแท่นพิพากษา';
  f.classList.toggle('gold', near);
}

/** ปุ่มสู้ลอยเหนือหัวผี (ข้อ 3 ของเจ้าของ 11 ก.ย. 2569)
 *  เดินเข้าไปในระยะ MOB.fabReach ของผีตนไหน ปุ่มโผล่เหนือหัวตนนั้น
 *  กดแล้วเข้าฉากต่อสู้กับ "ตนนั้น" ทันที ไม่ต้องขยับเข้าไปให้ประชิดอีก
 *  สร้างใหม่ทุกครั้งที่หาย เพราะ drawOverlay() ล้าง #ov ทิ้งทุกรอบ refresh
 *  ตำแหน่งอัปเดตทุกเฟรม — ผีเดินตลอดเวลา ปุ่มต้องติดหัวมันไปด้วย */
function updateMobFab() {
  const gone = () => { const e = ov.querySelector('.mobfab'); if (e) e.remove(); };
  if (g.over || g.battle || dlg.open || !g.mobs.length) return gone();
  const n = g.nearestMob();
  if (!n || n.d > MOB.fabReach) return gone();
  let f = ov.querySelector('.mobfab');
  if (!f) {
    f = document.createElement('button');
    f.className = 'mobfab';
    f.textContent = '⚔️ เข้าต่อสู้';
    f.onclick = ev => {
      ev.stopPropagation();
      if (g.over || g.battle || dlg.open) return;
      const m = g.nearestMob();
      if (!m || m.d > MOB.fabReach) return;
      g.startMobBattle(m.i); openBattle();
    };
    ov.appendChild(f);
  }
  f.dataset.sx = n.m.x; f.dataset.sy = n.m.y - MOB.h - 8;
  place(f);
}

/** บอสที่แพ้แล้วเฝ้าสะพาน ไม่กลับมาเองตามวาระ — เดินเข้าไปใกล้จึงเลือกท้าสู้ได้ */
function updateBossFab() {
  const gone = () => { const e = ov.querySelector('.bossfab'); if (e) e.remove(); };
  const pier = g.bossPierCanTalk();
  if (g.over || g.battle || dlg.open || (!g.bossCanChallenge() && !pier)) return gone();
  let f = ov.querySelector('.bossfab');
  if (!f) {
    f = document.createElement('button');
    f.className = 'bossfab';
    f.onclick = ev => {
      ev.stopPropagation();
      if (dlg.open) return;
      if (g.bossPierCanTalk()) return openBossPier();
      if (g.bossCanChallenge() && g.startZoneBoss(true)) openBattle();
    };
    ov.appendChild(f);
  }
  f.textContent = pier ? `💬 คุยกับ${g.zoneDef().bossName}` : `⚔️ ท้าสู้${g.zoneDef().bossName}`;
  f.dataset.sx = pier ? 1260 : 790; f.dataset.sy = 558 - 115;
  place(f);
}

/** ประตูชายแดนเปิดได้เมื่อเดินมาถึงเท่านั้น เหมือนสถานที่อื่นในฉาก */
function updateFrontierFab() {
  const gone = () => { const e = ov.querySelector('.frontierfab'); if (e) e.remove(); };
  const near = Math.hypot(g.player.x - FRONTIER.x, g.player.y - FRONTIER.y) <= FRONTIER.reach;
  if (!near || g.over || g.battle || dlg.open) return gone();
  let f = ov.querySelector('.frontierfab');
  if (!f) {
    f = document.createElement('button');
    f.className = 'frontierfab';
    f.textContent = '🏯 เข้าด่านชายแดน';
    f.onclick = ev => { ev.stopPropagation(); if (!g.battle && !dlg.open) openFrontier(); };
    ov.appendChild(f);
  }
  f.dataset.sx = FRONTIER.bx; f.dataset.sy = FRONTIER.by - FRONTIER.bw + 18;
  place(f);
}

/** แถบบัญชาการเหนือฉาก — เหลือ "ทางเข้าห้องสอบสวน" อย่างเดียว
 *  เดิมแถบนี้มีครบชุด: พลังของท่าน · ส่งไปที่ไหน · ใครคุม · หนักแค่ไหน ·
 *  พักคดีนี้ไว้ · ขังไว้ก่อน · ออกหมาย — ซ้ำกับหน้า "เริ่มการสอบสวน" ทุกตัว
 *  (เจ้าของสั่งตัด 12 ก.ย. 2569) ตัวไหนไปอยู่ที่ไหนในหน้านั้น:
 *    พลังของท่าน            → .hud-items แถบล่าง (ไอคอน + จำนวนกระสุน + เหตุผลที่กดไม่ได้)
 *    ส่งไปที่ไหน/ใครคุม/หนักแค่ไหน → ปุ่มคำสั่ง cmd('st'|'cr'|'inten') + แผงตัวเลือกฝั่งขวา
 *    พักคดีนี้ไว้            → #t-skip
 *    ขังไว้ก่อน             → #t-jail (โผล่เมื่อมีตะราง — ในแถบเดิมเป็นปุ่มกดไม่ได้เปล่า ๆ)
 *    ออกหมาย/ประทับตรา      → #t-go (เส้นทางตัดสินจริงคือ doVerdict ที่เดียวกันอยู่แล้ว)
 *  **ไม่ตัด** ปุ่ม 🔍 เริ่มการสอบสวน เพราะเป็นทางเข้าหน้านั้น ไม่มีในหน้านั้นเอง
 *  ผลข้างเคียงที่ตั้งใจ: ต้องเดินไปแท่นพิพากษาก่อนจึงสั่งอะไรได้ — ตรงกับกติกา 8 ก.ย. 2569
 *  ที่ว่าห้องสอบสวนเปิดจากแท่นเท่านั้น (ปุ่มลอยเหนือบัลลังก์ .trialfab ก็พาไปที่เดียวกัน) */
function drawDeck() {
  const s = g.queue[0];
  if (!s || g.over) {
    deckBar.innerHTML = '<div class="idle">ยังไม่มีวิญญาณยืนอยู่หน้าแท่น — กดเดินวาระให้เรือพาคนข้ามมา</div>';
    return;
  }
  deckBar.innerHTML = `
    <div class="grp"><span class="lb">แท่นพิพากษา</span>
      <div class="row2"><button class="gold" id="d-trial">🔍 เริ่มการสอบสวน</button></div></div>`;
  const tr = deckBar.querySelector('#d-trial');
  if (tr) tr.onclick = goTrial;
  updateTrialBtn();
}

/** คำตัดสินของพ่อต่อคำตัดสินของเรา — ป้ายสั้นสำหรับแฟ้มทะเบียนกรรม (ข้อ 2 ของเจ้าของ 11 ก.ย. 2569)
 *  ข้อความยาวเต็มอยู่ที่ BOSS_LINE ซึ่งเป็นบทเดียวกับที่พ่อพูดตอนปิดคดี — ในแฟ้มจึงไม่มีคำใหม่
 *  คีย์ตรงกับ r.boss ที่ judge() ตั้ง (game.js) เป๊ะ */
const DAD_TAG = {
  great:    { t:'พ่อว่าตรงกรรม',      c:'var(--success)' },
  ok:       { t:'พ่อว่าใช้ได้',        c:'var(--gold)' },
  cruel:    { t:'พ่อว่าลงเกินกรรม',    c:'var(--destructive)' },
  bad:      { t:'พ่อว่าเดา ไม่ได้อ่าน', c:'var(--destructive)' },
  terrible: { t:'พ่อตีกลับทั้งเรื่อง',  c:'var(--destructive)' },
};

/** เซฟเก่าไม่มี boss ในแฟ้ม — เดาย้อนจากคะแนนด้วยเกณฑ์เดียวกับ judge() ใน game.js
 *  (เรื่องที่ตัดสินไว้ก่อน 12 ก.ย. 2569 จึงยังอ่านคำตัดสินของพ่อได้ ไม่ต้องเริ่มเกมใหม่)
 *  แก้เกณฑ์ใน judge() เมื่อไหร่ ต้องแก้ตรงนี้ด้วย */
function dadGrade(x) {
  if (x.boss) return x.boss;
  if (x.over >= 2 && x.score >= 50) return 'cruel';
  if (x.score < 35) return 'terrible';
  if (x.score < 50) return 'bad';
  if (x.score >= 82) return 'great';
  return 'ok';
}

const BOSS_LINE = {
  great:    '"นี่แหละที่เรียกว่าตรงกรรม" — ท่านคืนบารมีให้ส่วนหนึ่ง และสั่งจ่ายเบี้ยพิเศษ 40',
  ok:       'ท่านอ่านคำตัดสินจนจบ วางลง แล้วมองไปทางอื่น — ใช้ได้ ไม่ถึงกับดี',
  cruel:    '"ถูกฝาถูกตัว แต่เจ้าใส่เกินไปสองวาระ ส่วนเกินนั้นไม่ได้หายไปไหน มันมาอยู่ที่เจ้า"',
  bad:      '"เจ้าอ่านสำนวน หรือเจ้าเดา" — บารมีถูกหักต่อหน้าทุกคน',
  terrible: '"คำตัดสินแบบนี้ ทำให้คนที่เขาเจ็บมาแล้ว เจ็บซ้ำอีกครั้ง" — บารมีถูกหักหนัก',
};

let bossBridgeTimer = 0;
function beginBossBridgeWalk() {
  if (g.bossWalk || bossBridgeTimer || !g.bossReady()) return;
  g.bossGuarding.th = false;
  g.bossWalk = {
    started: Date.now(), duration: 2600,
    from: [770, 620], to: [800, 430],
  };
  pauseForDlg();
  sfx('gong');
  const finishWalk = () => {
    if (g.over || !g.bossReady()) { g.bossWalk = null; bossBridgeTimer = 0; return; }
    if (dlg.open) { bossBridgeTimer = setTimeout(finishWalk, 300); return; }
    bossBridgeTimer = 0;
    if (g.startZoneBoss()) openBattle();
  };
  bossBridgeTimer = setTimeout(finishWalk, 2600);
}

/** ฉากมาถึงของบอสประจำโซน — 3-4 บรรทัดสลับผู้พูด ก่อนสู้ครั้งแรกเท่านั้น (17 ก.ย. 2569)
 *  รีแมตช์ (bossArriveSeen ติดไปแล้ว) ข้ามตรงไปสู้เลย · ใช้ภาพ Intro-Boss-Zone<N> เป็นพื้นหลังถ้ามี
 *  บทมาจาก Rae ผ่าน Reese fact-check แล้ว (ดู ZONES[].bossArrive ใน data.js) ห้ามแก้ถ้อยคำ */
function openBossArrive(z, onDone) {
  const lines = z.bossArrive || [];
  if (!lines.length) { onDone(); return; }
  const zn = ZONES.findIndex(x => x.k === z.k) + 1;
  // ภาพบอสระยะใกล้พร้อมพื้นหลังในตัว (คุณเป้สั่ง 17 ก.ย. 2569 "ใช้รูปโปรไฟล์ตรงไหนก็ตามที่เกมโชว์ภาพบอส")
  // — ยังไม่มีทุกโซน จึงถอยไปใช้ฉากมาถึงเดิมถ้าไม่มี · โซน 1 ไม่ผ่านโฟลเดอร์โซนเลย ข้ามการเช็คนี้ไปเลย
  // เพราะ artUrl() คืน path ตรง ๆ เสมอแม้ไฟล์ไม่มีจริง (จะเข้าใจผิดว่าเจอไฟล์ทั้งที่ยังไม่โหลดสำเร็จ)
  const bossProfile = z.k !== 'th' && zoneImg(`Boss Zone${zn}-profile`);
  const bg = (bossProfile && bossProfile.src) || artUrl(`Intro-Boss-Zone${zn}`) || artUrl('hero-boss');
  pauseForDlg();
  let i = 0;
  const paint = () => {
    const line = lines[i];
    const m = line.match(/^([^:]{1,14}):\s*(.+)$/);
    const speaker = m ? m[1] : z.bossName;
    const text = (m ? m[2] : line).replace(/^"|"$/g, '');
    dlg.innerHTML = `<div class="intro-comic" role="region" aria-label="ฉากมาถึง ${esc(z.bossName)} หน้า ${i + 1} จาก ${lines.length}">
      <div class="intro-comic-frame">
        <img src="${bg}" alt="" onerror="this.onerror=null;this.src='${artUrl('hero-boss')}'">
        <div class="intro-comic-head"><span>👑 ${esc(z.bossName)}มาถึงแล้ว</span><span>${i + 1} / ${lines.length}</span></div>
        <div class="intro-comic-caption"><h2>${esc(speaker)}</h2><p>${esc(text)}</p></div>
      </div>
      <div class="intro-comic-controls"><button class="gold" id="arrive-next">${i + 1 === lines.length ? '⚔️ สู้เลย' : 'หน้าถัดไป →'}</button></div>
    </div>`;
    dlg.querySelector('#arrive-next').onclick = () => { if (++i >= lines.length) dlg.close(); else paint(); };
  };
  openDlg('intro-comic-dialog');
  onDlgClose(onDone);
  paint();
}

/** การ์ตูนแนะนำสาขาใหม่ — ใช้ภาพ intro-zone<N> ที่เจ้าของวาดไว้หนึ่งภาพต่อโซน
 *  แสดงเฉพาะครั้งแรกที่ย้ายเข้า ส่วนการกลับสาขาเดิมใช้กล่องสรุปสั้น ๆ เพื่อไม่ขัดจังหวะซ้ำ */
function openZoneArrival(z) {
  const zn = ZONES.findIndex(x => x.k === z.k) + 1;
  const image = artUrl(`intro-zone${zn}`);
  pauseForDlg();
  dlg.innerHTML = `<div class="intro-comic" role="region" aria-label="แนะนำ ${esc(z.name)}">
    <div class="intro-comic-frame">
      <img src="${image}" alt="" onerror="this.onerror=null;this.src='${artUrl('scene')}'">
      <div class="intro-comic-head"><span>อเวจี · เปิดสาขาใหม่</span><span>โซน ${zn}</span></div>
      <div class="intro-comic-caption">
        <h2>${esc(z.name)}</h2>
        <p>${esc(z.intro)}<br>${esc(z.sub)}</p>
      </div>
    </div>
    <div class="intro-comic-controls"><span class="hint">นิราตามท่านมา · สถานีและยมทูตต้องเริ่มจัดการใหม่ในแต่ละสาขา</span>
      <button class="gold" data-close>เริ่มงาน</button></div>
  </div>`;
  openDlg('intro-comic-dialog');
}

function showVerdict(v) {
  g.pendingVerdict = null;
  sfx(v.stars >= 5 ? 'star' : v.stars <= 1 ? 'hurt' : 'gong');
  fx = { ...v, line: BOSS_LINE[v.boss] || BOSS_LINE.ok };
  g.bossUntil = performance.now() + 7000;      // พ่อมานั่งบัลลังก์ให้เห็นชั่วครู่
  clearTimeout(showVerdict.t);
  showVerdict.t = setTimeout(() => {
    fx = null; drawOverlay();
    if (g.over) { g.paused = true; updatePlay(); openEnding(g.over); }
  }, 7000);
}

function openEnding(o) {
  if (o.k === 'dad') {
    pauseForDlg();
    const z = g.zoneDef();
    modal(`<h2>👑 Game Over</h2>
      <div class="boss"><img class="standee" src="${artUrl('hero-boss')}" alt="พญายมบาท"
        onerror="this.remove()">
        <p style="line-height:var(--leading-body);margin:0">${esc(o.text)}</p></div>
      <div class="hint">${esc(z.name)} · ${g.zone === 'th'
        ? 'เริ่มเกมใหม่จากโซนแรก' : 'เริ่มโซนนี้ใหม่ โดยเก็บสาขาที่ผ่านมาก่อนหน้าไว้'}</div>
      <div class="row"><button class="gold" id="again">${g.zone === 'th' ? 'เริ่มเกมใหม่' : 'เริ่มโซนนี้ใหม่'}</button></div>`,
      d => d.querySelector('#again').onclick = restartCurrentZone);
    return;
  }
  modal(`<h2>${esc(o.title)}</h2>
    <p style="line-height:var(--leading-body)">${esc(o.text)}</p>
    <div class="hint">ปิดคดีทั้งหมด ${g.casesDone} เรื่อง · คะแนนเฉลี่ย ${g.casesDone ? Math.round(g.scoreSum / g.casesDone) : 0} ·
      กรรมที่ท่านสะสมเอง ${g.karma.toFixed(1)}</div>
    <p style="font-size:var(--text-sm);line-height:var(--leading-body);color:var(--muted-foreground)">
      คืนนั้นนิราวางแฟ้มเล่มหนึ่งไว้บนโต๊ะโดยไม่พูดอะไร ชื่อบนปกคือชื่อของท่าน</p>
    <div class="row"><button id="mine">📕 เปิดแฟ้มของท่าน</button>
      <button class="gold" id="again">เริ่มใหม่</button></div>`,
    d => {
      d.querySelector('#again').onclick = restart;
      d.querySelector('#mine').onclick = () => openLedger(o);
    });
}

/** แฟ้มของท่านเอง — ทุกคดีที่ลงเกินกรรม กับทุกคดีที่ปล่อยเบาจนเขากลับมา
 *  นี่คือ "คำตัดสินของเกมที่มีต่อผู้เล่น" ตัวเลขทุกตัวมาจากที่ผู้เล่นทำเองจริง ๆ */
function openLedger(o) {
  const L = g.ledger;
  const over  = L.filter(x => x.over > 0).sort((a, b) => b.over - a.over || b.karma - a.karma);
  const short = L.filter(x => x.short > 0);
  const wrong = L.filter(x => x.tham < 40);
  const five  = L.filter(x => x.stars === 5).length;
  const sumK  = Math.round(over.reduce((s, x) => s + x.karma, 0) * 10) / 10;

  const row = x => `<div class="row-truth">
    #${String(x.id).padStart(3, '0')} · ${esc(x.who)}${x.back ? ' <span style="color:var(--destructive)">(กลับมารอบสอง)</span>' : ''}
    — สมควร ${x.deserved} วาระ แต่ท่านให้ไป ${x.deserved + x.over}
    <b style="color:var(--destructive)">เกิน ${x.over}</b> · กรรมตกมา +${x.karma}</div>`;

  const verdict =
      !L.length            ? 'แฟ้มยังว่างเปล่า ท่านยังไม่ได้ตัดสินอะไรเลย'
    : !over.length         ? 'ทั้งเล่มไม่มีคดีไหนที่ท่านลงเกินกรรมเลยสักคดี — หน้าสุดท้ายว่างเปล่า และนั่นคือคำชมที่พ่อไม่เคยพูดออกมา'
    : sumK >= 40           ? 'แฟ้มของท่านหนากว่าสำนวนของคนส่วนใหญ่ที่ท่านตัดสินไปทั้งวัน'
                           : 'ไม่หนามาก แต่ก็ไม่ใช่แฟ้มเปล่า — ทุกบรรทัดในนี้ท่านเขียนเอง';

  modal(`<h2>📕 สำนวนของ ${esc('ยมบาทประจำโซนสุวรรณภูมิ')}</h2>
    <div class="hint">ปิดคดี ${g.casesDone} เรื่อง · ห้าดาว ${five} ครั้ง ·
      ลงเกินกรรม ${over.length} คดี · เบาไป ${short.length} คดี · ส่งผิดที่ ${wrong.length} คดี ·
      คดีที่เขากลับมาเพราะท่านปล่อยเบา ${g.returned} คดี</div>

    <div class="sec">คดีที่ท่านลงเกินกรรม — กรรมส่วนเกินรวม ${sumK}</div>
    ${over.length ? over.slice(0, 14).map(row).join('') +
      (over.length > 14 ? `<div class="row-truth" style="color:var(--muted-foreground)">…และอีก ${over.length - 14} คดี</div>` : '')
      : '<div class="row-truth" style="color:var(--success)">ไม่มีเลยสักคดี</div>'}

    <div class="sec">คดีที่ท่านปล่อยเบาไป</div>
    ${short.length ? `<div class="row-truth">${short.length} คดี — ในนั้น <b>${g.returned} คน</b>กลับมายืนหน้าแท่นอีกครั้ง
        พร้อมเรื่องที่เขาไปทำต่อหลังท่านปล่อยไป</div>`
      : '<div class="row-truth" style="color:var(--success)">ไม่มีเลยสักคดี</div>'}

    <p style="font-size:var(--text-sm);line-height:var(--leading-body);border-top:1px solid var(--border);padding-top:10px;margin-top:14px">
      <b style="color:var(--gold)">นิรา:</b> "${esc(verdict)}ค่ะ"</p>
    <div class="row"><button id="backend">ย้อนกลับ</button>
      <button class="gold" id="again2">เริ่มใหม่</button></div>`,
    d => {
      d.querySelector('#again2').onclick = restart;
      d.querySelector('#backend').onclick = () => openEnding(o);
    });
}

/** เริ่มใหม่จริง ๆ — หยุดบันทึกอัตโนมัติก่อน ไม่งั้นลูปเฟรมอาจเขียนเซฟทับตอนกำลังรีโหลด */
function restart() {
  saveAt = Infinity; clearSave();
  sessionStorage.setItem('avegee.fresh', '1');   // เริ่มใหม่แล้วเข้าเกมเลย ไม่ต้องผ่านหน้าปกอีกรอบ
  location.reload();
}

function restartCurrentZone() {
  if (g.zone === 'th' || !g.zoneEntry) return restart();
  const entry = JSON.parse(JSON.stringify(g.zoneEntry));
  saveAt = Infinity;
  if (!g.restore(entry)) { saveAt = 0; return; }
  g.zoneEntry = entry;
  g.hp = g.hpMax; g.order = Math.max(72, g.order);
  g.reds = 0; g.yamaDone = false; g.over = null;
  if (!g.save()) { saveAt = 0; return; }
  sessionStorage.setItem('avegee.fresh', '1');
  location.reload();
}

/** โมดัลที่มีพญายมนั่งบัลลังก์อยู่ข้าง ๆ (รูปหายก็ยังอ่านได้) */
function bossModal(title, text, btn = 'รับทราบ') {
  pauseForDlg();
  modal(`<h2>${esc(title)}</h2>
    <div class="boss">
      ${artUrl('hero-boss-profile') ? `<img src="${artUrl('hero-boss-profile')}" alt=""
           onerror="this.onerror=function(){this.remove()};this.src='${artUrl('hero-boss')}';this.classList.add('standee')">`
        : `<img class="standee" src="${artUrl('hero-boss')}" alt="" onerror="this.remove()">`}
      <p style="line-height:var(--leading-body);margin:0;white-space:pre-line">${esc(text)}</p>
    </div>
    <div class="row"><button class="gold" data-close>${esc(btn)}</button></div>`);
}

/** กระทะทองแดง — แพ้พ่อครบสามครั้งเตือนแล้ว ไม่ใช่ Game Over อีกต่อไป (17 ก.ย. 2569)
 *  แค่โชว์ภาพลงทัณฑ์ + บอกให้ไปพักที่ศาลาน้ำชา แล้วปล่อยเล่นต่อทันที ไม่รีเซ็ตโซน */
function openDadPunish(p) {
  pauseForDlg();
  modal(`<div class="punish-stage" style="background-image:url('img/BG-Krata.webp')">
      <div class="punish-vignette"></div>
      <div class="punish-title"><small>บทลงทัณฑ์ของผู้ตัดสิน</small><b>${esc(p.title)}</b></div>
      <div class="punish-yama"><img src="${heroFace()}" alt="ยมน้อยอยู่ในกระทะทองแดง"></div>
      <div class="punish-dad"><img src="${artUrl('hero-boss')}" alt="พญายม"><span>“ความยุติธรรมต้องเริ่มจากผู้ตัดสินเอง”</span></div>
      <div class="punish-heat">♨</div>
    </div>
    <div class="punish-copy"><p>${esc(p.text)}</p>
      <div class="hint">บารมีเหลือ ${Math.max(0, Math.round(g.hp))} — เดินไปที่ 🍵 ศาลาน้ำชาเพื่อพักฟื้น</div>
      <div class="row"><button class="gold" data-close data-punish-done disabled>รับโทษ...</button></div>
    </div>`, d => {
      d.classList.add('punish-scene');
      const b = d.querySelector('[data-punish-done]');
      setTimeout(() => { if (b?.isConnected) { b.disabled = false; b.textContent = 'กลับไปคุมโซน'; } }, 1700);
    });
}

function openHelp() {
  modal(`<h2>วิธีเล่น</h2>
    <p style="line-height:var(--leading-body);font-size:var(--text-sm)">
    ท่านคือยมบาทมือใหม่ที่พ่อส่งมาคุมนรกโซนไทย งานคือ <b>พิพากษาให้ตรงกรรม</b> ไม่ใช่ลงโทษให้แรงที่สุด<br>
    <span style="color:var(--muted-foreground);font-size:var(--text-xs)">
    เกมจะค่อย ๆ สอนทีละเรื่องเองผ่านแถบสีทองใต้หัวเรื่อง — หน้านี้ไว้เปิดย้อนดูตอนลืม</span></p>

    <div class="tline"><b>สามแถบที่ต้องดูตลอด</b><div>
      ❤️ <b>บารมี</b> = ชีวิตของท่าน หมดแล้วจบเกม ·
      ⚖️ <b>ระเบียบ</b> = คูณรายได้ทุกคดี แตะ 0 แล้วโดนเรียกกลับ ·
      ☠️ <b>กรรมท่าน</b> = บาปที่ตกใส่ตัวเอง เต็ม 100 แล้วชื่อท่านไปอยู่ในคิว<br>
      <b>กดที่แถบไหนก็ได้บนหัวเรื่อง</b> เพื่อดูว่ามันขึ้นลงเพราะอะไร และหมดแล้วเกิดอะไร</div></div>

    <ol style="line-height:var(--leading-body);font-size:var(--text-sm);padding-left:1.2em">
      <li><b>ทีมของท่าน</b> — <b>นิรา</b> อ่านสำนวนให้ฟังอย่างเดียว (ไม่รับเวรลงทัณฑ์) ·
          <b>ทัณฑ์</b> คือผู้คุมคนเดียวที่มีตอนเริ่ม · ถ้าคนไม่พอให้จ้างยมทูตเพิ่ม
          แต่สถานีจะเดินเฉพาะตอนท่านยืนอยู่ตรงนั้น และช้ากว่ายมทูต</li>
      <li><b>เดิน</b> — คลิกที่พื้น หรือกด WASD / ลูกศร ·
          ลงธารลาวาหรือแม่น้ำวิญญาณไม่ได้</li>
      <li>อ่านสำนวนจากหมุด 📜 เหนือหัว<b>นิรา</b> และคำแก้ตัวจากหมุด 💬 เหนือหัววิญญาณ (ชี้เมาส์ หรือแตะ)</li>
      <li><b>ไต่สวนก่อนตัดสิน</b> — คดีทั่วไปให้มองหาคำที่ขัดกับสำนวน ส่วนคดีมีชื่อจะเริ่มจาก
          <b>ภาพลักษณ์ภายนอก</b>เท่านั้น ให้เลือกประเด็นที่น่าสงสัยเพื่อค่อย ๆ เปิดรายการกรรม
          จี้ถูก = เขาสารภาพเรื่องที่ยังไม่เปิดให้<b>ฟรี</b> · จี้ผิด = เสียจังหวะไปเปล่า ๆ
          (จี้ได้ 2 ครั้งต่อคดี)</li>
      <li>ใช้พลังขุดความจริง — <b>มีจำนวนจำกัด</b> ใช้แล้วต้องเข้าไปในสถานีที่เกี่ยวข้อง
          และ<b>เดินไปเก็บไอเท็มในฉาก</b>มาเติม</li>
      <li><b>คำตัดสินไม่จบที่คดีนั้น</b> — ตัดสินเบาไป เขาไม่เข็ด ปล่อยไปแล้วไปก่อเรื่องต่อ
          แล้ว<b>กลับมายืนหน้าแท่นอีกครั้ง</b>พร้อมสำนวนที่หนากว่าเดิม (มีป้าย ↩️ ในคิว)</li>
      <li>จบเกมแล้วนิราจะวาง<b>แฟ้มชื่อของท่านเอง</b>ไว้ — เปิดอ่านได้จริง
          ข้างในคือทุกคดีที่ท่านลงเกินกรรม และทุกคนที่กลับมาเพราะท่านปล่อยเบา</li>
      <li>เลือก <b>สถานีที่ตรงชนิดกรรม</b> + <b>ระดับวาระให้พอดี</b> แล้วออกหมาย</li>
      <li><b>สถานีที่มี = สำนวนที่จะได้รับ</b> — โซนนี้รับได้เฉพาะกรรมที่ท่านมีที่ลง
          มีแต่กระทะทองแดง ก็มีแต่คดีฉ้อโกงกับมัวเมา · สร้างป่าดาบเพิ่ม คดีฆ่า/ทำร้ายกับวจีทุจริตถึงจะเริ่มเข้าคิว
          (แท็บ <b>ก่อสร้าง</b> บอกไว้ทุกหลังว่าสร้างแล้วเปิดแนวไหน)</li>
      <li>พญายมให้ดาว 0–5 ดวงทุกคดี · <b>ห้าดาวครบห้าครั้ง = เลื่อนขั้น</b> ·
          ห้าดาวยัง<b>ลดกรรมของท่าน</b>ให้ด้วยครั้งละ ${KARMA_RELIEF.star5}</li>
      <li><b>ศูนย์ดาว = โดนลูกไฟ</b> บารมีหาย 1 ใน 5 · โดนครบห้าครั้งจบเกม
          เดินไปเก็บ<b>หีบยา</b>เติมบารมีได้</li>
      <li><b>กรรมท่านลดได้</b> — ห้าดาว · เก็บ<b>ดอกบัว</b>ที่ตกบนแผนที่ตอนกรรมเกิน 40 ·
          หรือสร้าง<b>ศาลาน้ำชา</b>แล้วบูชาดอกบัวที่แท็บก่อสร้าง (${KARMA_RELIEF.lotusCost} เบี้ย ลด ${KARMA_RELIEF.lotusCut})</li>
      <li>ทุก ๆ ไม่กี่คดีจะมี <b>เปรต</b> ขึ้นมาก่อกวน (กรรมท่านยิ่งสูงยิ่งมาถี่) ปล่อยไว้ระเบียบตกเรื่อย ๆ —
          <b>เดินเข้าไปใกล้แล้วฟาดได้ฟรี ไม่ต้องใช้ลูกไฟ</b> ป้ายเหนือหัวมันจะบอกเองว่ากดได้แล้ว ·
          กดได้ 3 ทาง: ปุ่ม <b>⚔️</b> ที่แถบล่าง · กด <b>เว้นวรรค</b> · หรือคลิกที่ตัวมัน<br>
          มี<b>ลูกไฟ</b>อยู่ก็<b>ขว้างจากไกลได้เลย</b>ไม่ต้องเดินไป (ลูกละตน) หรือจ้าง<b>ยักษ์ทวารบาล</b>ให้ไล่ปราบแทน</li>
      <li><b>เร่งทัณฑ์เอง</b> — ไปยืนที่สถานีที่กำลังลงทัณฑ์ แล้วกด <b>เว้นวรรค</b>
          — แต่<b>ลงมือเองก็เป็นกรรมของท่าน</b> ครั้งละนิดหน่อย
          ส่งคนเมตตาสูงอย่างบุญไปคุม กรรมจะตกใส่ท่านครึ่งเดียว</li>
      <li><b>กดตัวละครหรือวิญญาณบนฉาก</b> แล้วดูรายละเอียดที่แผง <b>ข้อมูล</b> ด้านขวา —
          <b>คดีที่ปิดแล้วจะเฉลยความจริงทั้งหมด</b>ว่าเราตัดสินถูกหรือพลาดตรงไหน</li>
      <li>บางคดี<b>ถูกกับผิดปนกัน</b> จนสำนวนด้านเดียวตัดสินไม่ได้ — พวกนี้ต้องใช้พลังก่อน</li>
    </ol>
    <p style="font-size:var(--text-xs);color:var(--muted-foreground)">เกมบันทึกเองอัตโนมัติทุกไม่กี่วินาที ปิดแล้วเปิดใหม่เล่นต่อได้</p>
    <div class="row"><button class="gold" data-close>เข้าใจแล้ว</button></div>`);
}

// ---------- Phase 3 · หน้าต่างมินิเกม ----------
// เจ้าของสั่งไว้ 7 ก.ย. 2569 ว่าทั้งไต่สวนและต่อสู้ต้องเป็น "หน้าต่างเด้งขึ้นมา
// เหมือนเกม Turn-based RPG มีโปรไฟล์ทั้งสองฝ่าย และมีตัว SD ยืนอยู่"
// สองหน้าต่างจึงใช้แถบ .duel ตัวเดียวกัน ต่างกันแค่ของที่อยู่ข้างล่าง

/** เปิดกล่องโมดัลแบบ "ชนกับของเดิมไม่ได้"
 *  <dialog>.showModal() บนกล่องที่เปิดอยู่แล้วจะโยน InvalidStateError แล้วเงียบไปเลย
 *  ผลคือหน้าต่างมินิเกมเปิดไม่ติดและปุ่มข้างในไม่ผูก handler — ตัวที่ชนบ่อยที่สุดคือ
 *  โมดัลบทเรียนของพญายม ซึ่งเด้งพอดีตอน g.fights ขยับจาก 0 เป็น 1 (เจอ 8 ก.ย. 2569) */
let dlgGen = 0;
function openDlg(cls = '') {
  // event 'close' ของ <dialog> ยิงแบบ async — ปิดกล่องเก่าแล้วเปิดกล่องใหม่ทันที
  // ตัว handler ของกล่องเก่าจะมาทำงาน "หลัง" กล่องใหม่เปิดไปแล้ว แล้วไปลบ class
  // และคืนค่า paused ของกล่องใหม่ทิ้ง (เจอ 8 ก.ย. 2569: ห้องสอบสวนเปิดมาแต่หน้าตาเป็นกล่องธรรมดา)
  // ตัวนับรุ่นแก้ตรงนี้ — handler เก่าเช็คแล้วรู้ว่าไม่ใช่รุ่นตัวเอง ก็ถอยออกไปเงียบ ๆ
  dlgGen++;
  if (dlg.open) dlg.close();
  dlg.className = cls;
  try { dlg.showModal(); return true; }
  catch (e) { console.error('[อเวจี] เปิดกล่องไม่ได้', e); return false; }
}

/** พักเกมไว้ระหว่างมีกล่องเปิดอยู่ — ตัวจัดการตัวเดียวของทั้งไฟล์
 *
 *  ของเดิมแต่ละกล่องจำ `was = g.paused` ของตัวเอง แล้วคืนค่านั้นตอนปิด ซึ่งพังเมื่อ
 *  กล่องถูก "แทนที่" ด้วยกล่องใหม่ (openDlg เขียนทับ innerHTML ไม่ได้ยิง close):
 *  กล่องใหม่จะจำค่าที่กล่องเก่าตั้งไว้ = พัก แล้วคืนค่า "พัก" ให้ตอนปิด
 *  เกมจึงค้างถาวรโดยหน้าตาเหมือนกำลังเล่นอยู่ — ทัณฑ์ 0% ยมทูตยืนนิ่ง
 *  (เจ้าของเจอ 8 ก.ย. 2569 · ก่อนหน้านั้นไม่มีใครสังเกตเพราะเกมเริ่มมาแบบพักอยู่แล้ว)
 *
 *  ตอนนี้จำค่าไว้ที่เดียวตอนกล่อง "ใบแรก" เปิด แล้วคืนตอน <dialog> ปิดจริง ๆ
 *  กล่องจะสลับกันกี่ใบระหว่างนั้นก็ไม่กระทบ */
let userPaused = false;      // ผู้เล่นกดปุ่มพักเอง — อย่างเดียวที่ทำให้เกมพักค้างได้
function pauseForDlg() { if (!g.paused) { g.paused = true; updatePlay(); } }

/** ไม่มีกล่องเปิดค้างแล้ว = กลับไปเป็นไปตามที่ผู้เล่นสั่งไว้
 *
 *  **ห้ามกลับไปใช้วิธี "จำค่า paused ตอนเปิดแล้วคืนตอนปิด"** — พลาดครั้งเดียวเกมค้างถาวร
 *  เพราะกล่องใบถัดไปจะไปจำค่าที่ค้างนั้นต่อ แล้วคืนค่าค้างให้ตลอดไป
 *  (ไล่จับกันมาสามรอบวันที่ 8 ก.ย. 2569) ตอนนี้ความจริงมีแหล่งเดียวคือ userPaused
 *
 *  **และห้ามผูกกับ event 'close' ของ <dialog>** — เบราว์เซอร์ไม่ยิง close เลยตลอดเวลาที่
 *  แท็บไม่ได้อยู่หน้าจอ ผูกไว้เมื่อไหร่ = สลับแท็บกลางกล่องแล้วเกมค้างพัก
 *  เช็คจากตัวจับเวลาแทน · ได้ผลพลอยได้: ตอนกล่องแค่ "ถูกแทนที่" ด้วยใบใหม่
 *  (openDlg close แล้ว showModal ในจังหวะเดียวกัน) dlg.open ยังเป็น true อยู่ จึงไม่คืนผิดจังหวะ */
function releaseDlgPause() {
  if (dlg.open || g.bossWalk || g.over || g.paused === userPaused) return;
  g.paused = userPaused; updatePlay();
}
dlg.addEventListener('close', () => setTimeout(releaseDlgPause, 0));   // ทางลัดให้ไวขึ้นเฉย ๆ

/** ผูก handler ตอนปิด ที่จะทำงานเฉพาะกล่อง "รุ่นปัจจุบัน" เท่านั้น */
function onDlgClose(fn) {
  const gen = dlgGen;
  const h = () => {
    dlg.removeEventListener('close', h);
    if (gen !== dlgGen) return;         // กล่องถูกแทนที่ไปแล้ว — ไม่ใช่เรื่องของ handler ตัวนี้
    fn();
  };
  dlg.addEventListener('close', h);
}

/** เวที Turn-based RPG — ใช้ร่วมกันทั้งห้องสอบสวนและฉากต่อสู้
 *  ฉากหลังคือ img/BG-Turn-Base.webp (เจ้าของวาดมาให้ 8 ก.ย. 2569)
 *  ไม่มีไฟล์ก็ยังใช้ได้ พื้นหลังจะเป็นสีทึบตาม token แทน
 *  hp = null → โหมดสอบสวน (ไม่มีหลอดเลือด) · hp = ออบเจ็กต์ฉากต่อสู้ → โชว์หลอด */
function arena(title, foe, hp, act, closable, fx, helper, controls = '', squad = []) {
  // act = { lunge:'you'|'foe', struck:'you'|'foe' } — ใครพุ่ง ใครโดน ในจังหวะนี้
  const cls = side => (act && act.lunge === side ? ' lunge' : '') + (act && act.struck === side ? ' struck' : '');
  // fx = { key, side } เอฟเฟกต์ตอนลงมือ · hp.dmg = เลขความเสียหายรอบล่าสุด
  const fxAt = side => {
    if (!fx || fx.side !== side) return '';
    const d = FX_OF[fx.key] || FX_OF.atk;
    return `<img class="fx" src="img/${d.img}.png" alt=""
      onerror="this.onerror=null;this.outerHTML='<span class=&quot;fx glyph&quot;>${d.glyph}</span>'">`;
  };
  const dmgAt = (side, v) => v > 0
    ? `<span class="dmg ${side}">−${v > 900 ? '∞' : v}</span>` : '';
  const bar = (v, max, cls, label) => hp === null ? '' : `
    <span class="hpbar ${cls}"><i style="width:${Math.max(0, Math.min(100, 100 * v / max))}%"></i></span>
    <span class="hpn">${label} ${Math.round(v)} / ${max}</span>`;
  // ท่าลงทัณฑ์เฉพาะจังหวะที่เราลงมือใส่เขา — ใช้ของบำรุง (fx ลงที่ตัวเอง) ยังยืนท่าเดิม
  const youImg = (act && act.lunge === 'you' && (!fx || fx.side === 'foe')) ? heroAtk() : heroFace();
  const foeSrc = typeof foe.sp === 'string' ? artUrl(foe.sp) || `img/${foe.sp}.png` : `img/spirit${foe.sp || 7}.png`;
  const bg = hp?.bg || 'img/BG-Turn-Base.webp';
  return `<div class="arena" style="background-image:url('${esc(bg)}')">
    <span class="corner-tick tl"></span><span class="corner-tick tr"></span>
    <span class="corner-tick bl"></span><span class="corner-tick br"></span>
    ${closable ? '<button class="x" data-close title="ปิดห้องสอบสวน">✕</button>' : ''}
    <div class="ttl">${esc(title)}</div>
    ${helper && !squad.length ? `<div class="fig helper${act && act.lunge === 'you' ? ' lunge' : ''}">
      <img src="${artUrl('crew-' + helper.k)}" alt=""
           onerror="this.onerror=null;this.src='${artUrl('crew-' + helper.k + '-profile') || artUrl('crew-' + helper.k)}'">
      <span class="plate"><b>${esc(helper.name)}</b><span class="sub">เข้ามาช่วย</span></span>
    </div>` : ''}
    ${squad.length ? `<div class="battle-squad">${squad.map(c => `<span>
      <img src="${artUrl('crew-' + c.k)}" alt="${esc(c.name)}"><b>${esc(c.name)}</b>${crewCooldown(c,g.crewCooldown(c),BATTLE.crewCd)}</span>`).join('')}</div>` : ''}
    <div class="fig you${cls('you')}">
      ${fxAt('you')}${dmgAt('you', hp && hp.dmg ? hp.dmg.you : 0)}
      <img src="${youImg}" alt="" onerror="this.onerror=null;this.src='${artUrl('hero-yama-profile') || artUrl('hero-yama')}'">
      <span class="plate"><b>${esc(HERO_NAME)}</b><span class="sub">ยมบาทประจำ${esc(g.zoneDef().name)}</span>
        ${bar(hp ? hp.youHp : 0, hp ? hp.youMax : 1, '', 'บารมี')}</span>
    </div>
    <div class="fig foe${cls('foe')}">
      ${fxAt('foe')}${dmgAt('foe', hp && hp.dmg ? hp.dmg.foe : 0)}
      <img src="${foeSrc}" alt="" onerror="this.onerror=null;this.src='img/spirit7.png'">
      <span class="plate"><b>${esc(foe.name)}</b><span class="sub">${esc(foe.sub || '')}</span>
        ${bar(hp ? hp.foeHp : 0, hp ? hp.foeMax : 1, 'foe', 'กำลังใจ')}</span>
    </div>
    ${controls}
  </div>`;
}

/** ภาพคั่นสั้น ๆ ตอนใช้ท่าพิเศษ ชุดไหนยังไม่มีภาพให้ข้ามอย่างเงียบ ๆ */
function actionCutsceneSrc(k) {
  const pose = k === 'hypno' ? 'hyp' : k === 'mirror' ? 'mi'
             : k === 'ice' ? 'ice'
             : k === 'fire' ? 'atk' : null;
  if (!pose) return null;
  const style = g.outfit || g.zone;
  if (style === 'th') return `img/hero-yama-${pose}-cutscene.jpeg`;
  const folders = { asia:'Asia', west:'West', cyberhell:'CyberHell' };
  return folders[style] ? `img/${folders[style]}/hero-yama-${style}-${pose}-cutscene.jpeg` : null;
}

function playActionCutscene(k) {
  const src = actionCutsceneSrc(k);
  if (!src || !dlg.open) return;
  dlg.querySelector('.action-cutscene')?.remove();
  const cut = document.createElement('div');
  cut.className = 'action-cutscene';
  cut.innerHTML = `<img src="${src}" alt="ภาพคั่นท่าพิเศษ">`;
  cut.querySelector('img').onerror = () => cut.remove();
  dlg.appendChild(cut);
  setTimeout(() => cut.remove(), 580);
}

// ---------- ห้องสอบสวน (HUD แบบเกม Turn-based RPG) ----------
// เจ้าของออกแบบเลย์เอาต์มาเอง 8 ก.ย. 2569 โดยอ้างอิงเกมแนว tactics:
//   ฉากเป็นพื้นหลังเต็มจอ · HUD ลอยทับเป็นชั้น ๆ ไม่ใช่แผงเรียงลงมา
//   บน = แถบสถานะ · ซ้าย = แถวคำสั่งแนวตั้ง · ขวาบน = สำนวน+คำให้การ
//   ล่างซ้าย = โปรไฟล์ยมน้อย + ของ · ล่างขวา = โปรไฟล์วิญญาณ
// เปิดได้จากแท่นพิพากษาเท่านั้น (ดู drawDeck) — แท็บ "ไต่สวน" เดิมถูกถอดออกแล้ว
let trialCmd = 'ask';        // แผงขวาเป็นการไต่สวนเสมอ; ตัวเลือกคำตัดสินอยู่ในวงคำสั่งบนเวที

function openTrial() {
  const s = g.queue[0];
  if (!s) return;
  pauseForDlg();
  bgm('bgm-trial');
  trialCmd = 'ask';

  const paint = () => {
    // เปลี่ยนแท็บแล้ววาดเนื้อหาห้องสอบสวนใหม่ แต่บนมือถืออย่ากระโดดกลับไปหัวกล่อง
    const scrollAt = dlg.querySelector('.hud')?.scrollTop || 0;
    const known   = s.deeds.filter(d => d.known && d.visible !== false);
    const claimed = s.merits.filter(m => !m.exposed);
    const dests   = g.stations.filter(x => x.def.pow > 0);
    const idle    = g.freeCrew();
    if (pick.st && !dests.some(x => x.def.k === pick.st && g.stFree(x) > 0)) pick.st = null;
    if (pick.cr && !idle.some(c => c.k === pick.cr)) pick.cr = null;
    const stDef  = pick.st && STATIONS.find(d => d.k === pick.st);
    const heaven = !!(stDef && stDef.heaven);
    const ready  = !!(pick.st && pick.cr && (heaven || pick.inten));

    // ---- แถบสถานะบนสุด ----
    const ot = g.orderTier(), kt = g.karmaTier();
    const top = `
      <span class="chip">🪙 <b>${Math.round(g.coin)}</b></span>
      <span class="chip">🔥 <b>${Math.round(g.fuel)}</b></span>
      <span class="chip">❤️ บารมี ${bar(100 * g.hp / g.hpMax, 'hp')} <b>${Math.round(g.hp)}</b></span>
      <span class="chip">⚖️ ระเบียบ ${bar(g.order)} <b>${Math.round(g.order)}</b></span>
      <span class="chip">☠️ กรรม ${bar(g.karma, 'karma')} <b>${g.karma.toFixed(1)}</b></span>
      <span class="ttl">สำนวน #${String(s.id).padStart(3, '0')}</span>`;

    // ---- ปุ่มด้านบน + วงคำสั่งข้างยมน้อย ----
    const topActions =
      `<button data-cmd="ask">ไต่สวน<br>ได้อีก ${s.presses} ครั้ง</button><button id="t-guide">หนังสือ<br>คู่มือ</button>
       <button id="t-jail" ${g.has('tarang') && g.jailFree() > 0 ? '' : 'disabled'} title="${g.has('tarang') ? 'ต้องมีที่ว่างในตะราง' : 'สร้างตะรางรอวาระก่อน'}">🔒 ขังไว้ก่อน</button>
       <button id="t-skip" ${g.queue.length > 1 ? '' : 'disabled'}>⏭️ พักคดีนี้</button>`;
    const orbImg = (src, alt = '') => `<img src="${src}" alt="${esc(alt)}">`;
    const powerDefs = POWERS.filter(p => ['roar', 'mirror', 'hypno'].includes(p.k));
    const powerImg = { roar:'img/icon-fang.png', mirror:'img/item-mirror.png', hypno:'img/fx-hypno.png' };
    const powerChoices = powerDefs.map(p => {
      const pw = g.powerOf(p.k), ok = g.powerReady(p.k);
      const why = g.powerLocked(p) ? `ล็อก · ต้องเป็น${LEVELS[p.lv - 1].name}ก่อน`
                : pw.ammo <= 0 ? 'หมดแล้ว — เดินไปเก็บบนแผนที่'
                : pw.cd > 0 ? `รออีก ${pw.cd} คดี` : p.desc;
      return `<button class="orb-choice" data-pw="${p.k}" ${ok ? '' : 'disabled'} title="${esc(p.name + ' — ' + why)}">
        ${orbImg(powerImg[p.k], p.name)}<b>${esc(p.name)}</b><i>×${pw.ammo}</i></button>`;
    }).join('');
    const destinationChoices = dests.length ? dests.map(x => {
      const busy = g.stFree(x) <= 0, bg = stBg(x.def.k);
      return `<button class="orb-choice" data-k="${x.def.k}" data-pickkey="st" ${busy ? 'disabled' : ''}
        ${x.def.k === pick.st ? 'aria-pressed="true"' : ''} title="${esc(x.def.name + (busy ? ' · เต็ม' : ''))}">
        ${orbImg(bg, x.def.name)}<b>${esc(x.def.name)}</b></button>`;
    }).join('') : '<span class="idle">ยังไม่มีสถานที่</span>';
    const crewChoices = idle.length ? idle.map(c =>
      `<button class="orb-choice" data-k="${c.k}" data-pickkey="cr" ${c.k === pick.cr ? 'aria-pressed="true"' : ''}
        title="${esc(c.name + ' · แรง ' + c.raeng + ' · ระเบียบ ' + c.rabiab + ' · ปัญญา ' + c.panya + ' · เมตตา ' + c.metta)}">
        ${orbImg(artUrl(c.self ? 'hero-yama-profile' : `crew-${c.k}-profile`) || artUrl(c.self ? 'hero-yama' : `crew-${c.k}`), c.name)}
        <b>${esc(c.name)}</b><small>แรง ${c.raeng} · ระเบียบ ${c.rabiab}</small></button>`).join('') : '<span class="idle">ไม่มีใครว่าง</span>';
    // ไอคอนวงกลม 5 สีจาก img/raw/icon.jpeg (ข้อ B.4 คุณเป้ 24 ก.ย. 2569) — ตัดเฉพาะวงกลมด้วย
    // scripts อ่านที่ AGAPAE Agent/Output/Toby/ ไม่มีตัวหนังสือฝังในรูป ใช้ป้ายชื่อ HTML เดิม (<b>) ต่อท้าย
    const forceIcon = i => `img/icon-force-${i}.png`;
    const forceChoices = heaven ? '' : [1, 2, 3, 4, 5].map(i =>
      `<button class="orb-choice" data-v="${i}" data-pickkey="inten" ${i === pick.inten ? 'aria-pressed="true"' : ''}
        title="ระดับ ${i} ${esc(INTENSITY[i])}">${orbImg(forceIcon(i), INTENSITY[i])}<b>${esc(INTENSITY[i])}</b></button>`).join('');
    const crewNow = pick.cr && g.crewOf(pick.cr);
    const selected = [
      stDef && `<span class="command-selected selected-place">${orbImg(stBg(stDef.k))}<b>${esc(stDef.name)}</b></span>`,
      crewNow && `<span class="command-selected selected-crew">${orbImg(artUrl(crewNow.self ? 'hero-yama-profile' : `crew-${crewNow.k}-profile`))}<b>${esc(crewNow.name)}</b></span>`,
      (pick.inten || heaven) && `<span class="command-selected selected-force">${heaven ? '<strong>🕊️</strong>' : orbImg(forceIcon(pick.inten), INTENSITY[pick.inten])}<b>${heaven?'อัตโนมัติ':INTENSITY[pick.inten]}</b></span>`
    ].filter(Boolean).join('');
    const trialWheel = commandWheel({ready, selected, groups:[
      {choices:powerChoices},{choices:destinationChoices},{choices:crewChoices},{choices:forceChoices,disabled:heaven}
    ]});

    // ข้อความไต่สวนอยู่ขวาตลอดเวลา ส่วนตัวเลือกคำตัดสินย้ายไปเป็นวงไอคอนแล้ว
    const opt = `<h4>${s.case ? 'เลือกประเด็นที่จะสอบสวน' : 'ข้ออ้างของเขา — เลือกข้อที่ขัดกับสำนวน'}</h4>` + s.lines.map(l => {
      const cls = !l.used ? '' : l.kind === 'solid' ? 'miss' : 'hit';
      return `<button class="say ${cls}" data-line="${l.i}" ${l.used || s.presses <= 0 ? 'disabled' : ''}
        >${l.used ? (l.kind === 'solid' ? '✗ ' : '✓ ') : ''}“${esc(l.t)}”</button>`;
    }).join('');

    const foeSrc = typeof s.sp === 'string' ? artUrl(s.sp) || `img/${s.sp}.png` : `img/spirit${s.sp || 7}.png`;
    dlg.innerHTML = `
    <div class="hud trial-hud" style="background-image:url('img/BG-Turn-Base.webp')">
      <div class="hud-scrim"></div>
      <span class="corner-tick tl"></span><span class="corner-tick tr"></span>
      <span class="corner-tick bl"></span><span class="corner-tick br"></span>
      <button class="x" data-close title="ปิดห้องสอบสวน">✕</button>

      <div class="hud-body">
        <div class="hud-stage">
          <span class="trial-case-no">สำนวน #${String(s.id).padStart(3, '0')}</span>
          <div class="fig you"><img src="${heroFace()}" alt=""
                 onerror="this.onerror=null;this.src='${artUrl('hero-yama')}'">
            <span class="nm">${esc(HERO_NAME)}</span></div>
          <div class="fig foe"><img src="${esc(foeSrc)}" alt=""
                 onerror="this.onerror=null;this.src='img/spirit7.png'">
            <span class="nm">${esc(s.name || s.who)}</span></div>
          ${trialWheel}
        </div>

        <div class="hud-right">
          <div class="trial-top-actions" aria-label="คำสั่งคดี">${topActions}</div>
          <div class="hud-card hud-rec">
            <h4>สำนวนที่นิราอ่านให้ฟัง</h4>
            ${s.face ? `<div class="deed" style="color:var(--accent-foreground);margin-bottom:4px">${esc(s.face)}</div>` : ''}
            ${claimed.map(m => `<div class="deed" style="color:var(--success)">🪷 ${esc(m.t)}
              ${m.note ? `<i style="color:var(--warning)">— ${esc(m.note)}</i>` : ''}</div>`).join('')}
            ${known.map(d => `<div class="deed">${deedLine(d)}</div>`).join('')}
            ${!s.face && !claimed.length && !known.length ? '<div class="deed">สำนวนว่างเปล่า</div>' : ''}
            ${s.back ? `<div class="deed" style="color:var(--destructive)">↩️ ลงทัณฑ์ ${s.back.gave} วาระแล้วยังไม่สำนึก · ถูกส่งกลับเข้าคิวก่อนเกิดใหม่</div>` : ''}
          </div>

          <div class="hud-card hud-opt">${opt}</div>

          <div class="hud-card">
            <h4>บันทึกการสอบสวน</h4>
            <div class="hud-log">${s.said.slice(-6).map(x =>
              `<div class="${x.kind === 'truth' || x.kind === 'confess' ? 'hi' : ''}">${esc(x.text)}</div>`).join('')
              || '<div>ยังไม่มีอะไร — เขายืนก้มหน้าอยู่เฉย ๆ</div>'}</div>
          </div>
        </div>
      </div>

      <div class="hud-bottom">
        <div class="port you">
          <img src="${artUrl('hero-yama-profile') || artUrl('hero-yama')}" alt=""
               onerror="this.onerror=null;this.src='${artUrl('hero-yama')}'">
          <span class="who2"><b>${esc(HERO_NAME)}</b><small>${esc(LEVELS[g.level - 1].name)} · ⭐${g.star5}</small></span>
        </div>
        <!-- การ์ดรูป+ชื่อวิญญาณ (.port.foe) เอาออก 18 ก.ย. 2569 (ข้อ A ของคุณเป้) — บนจอแคบมันทับ
             .hud-log ด้านบน และข้อมูลตัวตนซ้ำกับ .fig.foe ที่อยู่บนเวทีอยู่แล้ว (รูป+ชื่อเดียวกัน)
             เอาออกทุกจอ ไม่ใช่แค่จอแคบ — ดูสะอาดกว่าและไม่เสียข้อมูลอะไรไป การ์ดยมน้อยฝั่งซ้ายคงไว้ -->
      </div>
    </div>`;

    if (scrollAt) dlg.querySelector('.hud').scrollTop = scrollAt;

    // ---- ผูกปุ่ม ----
    bindCommandWheel(dlg);
    dlg.querySelector('[data-cmd="ask"]').onclick = () => dlg.querySelector('[data-line]:not(:disabled)')?.focus();
    dlg.querySelector('#t-guide').onclick = () => {
      const guide = document.createElement('dialog');
      guide.className = 'court-guide';
      guide.innerHTML = `<button class="guide-close">ปิดคู่มือ ✕</button><h2>คู่มือนรก</h2>
        <p>กติกาของอเวจี · อ่านสำนวน → ไต่สวน → เลือกสถานที่ ผู้คุม และความแรง → ออกหมาย</p>
        <h3>ส่งคดีไปที่ไหน</h3><p>เลือกสถานที่ให้ตรงกับกรรมหลักที่พบในสำนวน ต้องสร้างสถานที่และมีที่ว่างก่อน</p>
        <table><thead><tr><th>คดี</th><th>สถานที่</th></tr></thead><tbody>${STATIONS.filter(x=>x.tags.length).map(x=>`<tr><td>${x.tags.map(k=>SINS[k]?.name||k).join(' / ')}</td><td>${x.name}</td></tr>`).join('')}</tbody></table>
        <p>ผู้บริสุทธิ์ใช้ประตูสวรรค์ ซึ่งไม่ต้องเลือกความแรง หอทะเบียนกรรมรับงานทั่วไปได้ แต่ควรเลือกสถานที่เฉพาะกรรมเมื่อมีพร้อม</p>
        <h3>เลือกระดับความแรงและบรรเทาโทษ</h3><p>ระดับ 1 ว่ากล่าว · 2 เบา · 3 ปานกลาง · 4 หนัก · 5 มหันต์ ใช้ความหนักของการกระทำทั้งหมดประกอบกัน อย่าเลือกสูงสุดทุกคดี</p>
        <p>ไต่สวนเพื่อเปิดเผยข้อเท็จจริงและตรวจบุญที่อ้าง บุญที่เป็นจริงช่วยลดโทษ ส่วนคำอ้างเท็จไม่นับ การลงโทษเกินเพิ่มกรรมของท่าน ลงโทษเบาเกินอาจไม่ทำให้สำนึก หากยังไม่พร้อมให้พักคดี หรือขังรอเมื่อมีตะรางและที่ว่าง</p>
        <p>เมื่อรับทัณฑ์ครบ วิญญาณจะไปตะราง ตรวจรายชื่อกับนิรา: เข็ดแล้วส่งต่อไปประตูสวรรค์ ยังไม่เข็ดส่งกลับคิว ที่ประตูสวรรค์ให้บุญตรวจกรรมคงเหลือ: ยังมีกรรมส่งไปเกิดใหม่ หมดกรรมส่งขึ้นสวรรค์และรับรางวัลจากพ่อ</p>
        <h3>เลือกผู้คุม</h3><p>แรงช่วยให้งานเร็ว ระเบียบช่วยคุณภาพงาน ปัญญาสูงช่วยให้สำนึก เมตตาช่วยลดกรรมจากโทษที่เกิน แต่ไม่ทำให้คำตัดสินผิดกลายเป็นถูก</p>
        ${CREW.filter(c=>!c.reader).map(c=>`<p><b>${c.name}</b> — ${c.duty}<br>แรง ${c.raeng} · ระเบียบ ${c.rabiab} · ปัญญา ${c.panya} · เมตตา ${c.metta}<br>ในสนามรบ: ${crewAbility(c.k)}</p>`).join('')}
        <h3>ทีมต่อสู้</h3><p>จัดทีมยมทูตได้ 2 คนก่อนเข้าสู้ ใช้ความสามารถของแต่ละคนผ่านเมนูยมทูต คูลดาวน์คนละ ${BATTLE.crewCd} วินาที และใช้กำลังใจ ${BATTLE.crewMorale} หน่วย แถบสีเหลืองเต็มจึงพร้อมใช้ใหม่</p>`;
      dlg.append(guide); guide.showModal();
      guide.querySelector('button').onclick=()=>guide.close();
      guide.addEventListener('close',()=>guide.remove());
    };
    dlg.querySelectorAll('[data-pickkey]').forEach(el => el.onclick = () => {
      pick[el.dataset.pickkey] = el.dataset.k ?? +el.dataset.v;
      paint();
    });
    dlg.querySelectorAll('[data-line]').forEach(el => el.onclick = () => {
      const r = g.press(s, +el.dataset.line);
      if (r) sfx(r.some(x => x.kind === 'truth' || x.kind === 'confess') ? 'crack' : 'deny');
      paint(); refresh();
    });
    dlg.querySelectorAll('[data-pw]').forEach(el => el.onclick = () => {
      const k = el.dataset.pw;
      if (!g.usePower(k, s)) return;
      sfx('crack'); paint(); refresh(); playActionCutscene(k);
    });

    const sk = dlg.querySelector('#t-skip');
    if (sk) sk.onclick = () => { if (g.defer()) { sfx('deny'); dlg.close(); } };
    const jl = dlg.querySelector('#t-jail');
    if (jl) jl.onclick = () => { if (g.jail(s.id)) { sfx('stamp'); dlg.close(); } };

    const go = dlg.querySelector('#t-go');
    if (go) go.onclick = () => {
      const st = pick.st, cr = pick.cr, inten = pick.inten;
      if (g.needBattle(s)) {                     // เปิดฉากใหม่ทับกล่องเดิมผ่าน openDlg รุ่นเดียว ลด race จาก close event
        if (!g.startBattle(s)) return;
        openBattle(res => { if (res === 'win') doVerdict(s, st, cr, inten); else refresh(); });
        return;
      }
      doVerdict(s, st, cr, inten);
      dlg.close();
    };
  };

  paint();
  openDlg('hudwrap');
  onDlgClose(() => { bgm('bgm-zone'); refresh(); });
}

/** ออกหมายจริง — ใช้ร่วมกันระหว่างแถบบัญชาการกับห้องสอบสวน */
function doVerdict(soul, stK, crK, inten) {
  const heaven = !!STATIONS.find(d => d.k === stK)?.heaven;
  if (!g.assign(soul.id, stK, crK, heaven ? 1 : inten)) return false;
  sfx(heaven ? 'heaven' : 'stamp');
  pick = { st: null, cr: null, inten: null };
  if (g.pendingVerdict) showVerdict(g.pendingVerdict);
  refresh();
  return true;
}

// ---------- ศูนย์จัดทีม / ร้านค้า / ผู้ตรวจการ ----------
function openNiraOffice() {
  pauseForDlg();
  const paint = () => {
    const party = g.party?.members || [];
    dlg.innerHTML = `<h2>📋 โต๊ะนิรา — บุคลากรและทีมต่อสู้</h2>
      <p class="hint">เลือกยมทูตเข้าทีมต่อสู้ได้ 2 คน เมื่อเข้าสนามรบจะมาช่วยยมน้อย ระหว่างอยู่บนแผนที่ยังทำงานประจำต่อ ไม่ต้องเดินตาม</p>
      <div class="market-grid">${CREW.filter(c => !c.reader).map(def => {
        const c = g.crew.find(x => x.k === def.k), on = c && party.includes(c.k);
        const train = c ? UPGRADES.crewBase * ((c.upLv || 0) + 1) : 0;
        return `<article class="shop-card"><img src="${artUrl('crew-' + def.k + '-profile') || artUrl('crew-' + def.k)}" alt="">
          <span><b>${esc(c?.name || crewName(def, g.zone))}</b><small>${esc(def.duty)}</small>
          ${c ? `<small>แรง ${c.raeng} · ระเบียบ ${c.rabiab} · ฝึกขั้น ${c.upLv || 0}</small><small>ท่าสู้: ${crewAbility(c.k)} · คูลดาวน์ ${BATTLE.crewCd} วินาที</small>` : `<small>ค่าจ้าง ${def.hire} เบี้ย · ท่าสู้: ${crewAbility(def.k)}</small>`}</span>
          ${c ? `<button data-party="${c.k}" class="sm" ${!on && party.length >= 2 ? 'disabled' : ''}>${on ? '✓ ทีมต่อสู้' : 'เข้าทีมสู้'}</button>
                  <button data-train="${c.k}" class="sm" ${g.coin < train || (c.upLv || 0) >= UPGRADES.max ? 'disabled' : ''}>ฝึกแรง ${train}</button>`
              : `<button data-hire="${def.k}" class="sm gold" ${g.coin < def.hire ? 'disabled' : ''}>จ้าง</button>`}
        </article>`;
      }).join('')}</div>
      <div class="row"><button data-guard-team ${!g.guard ? 'disabled' : ''}>🛡️ ${g.party?.guard ? 'ให้ยักษ์กลับไปเฝ้าประตู' : 'ให้ยักษ์ร่วมทีม'}</button>
        <button class="gold" data-close>เสร็จแล้ว</button></div>`;
    dlg.querySelectorAll('[data-hire]').forEach(b => b.onclick = () => { if (g.hire(b.dataset.hire)) { sfx('coin'); paint(); refresh(); } });
    dlg.querySelectorAll('[data-party]').forEach(b => b.onclick = () => { if (g.toggleParty(b.dataset.party)) { sfx('crack'); paint(); refresh(); } });
    dlg.querySelectorAll('[data-train]').forEach(b => b.onclick = () => { if (g.upgradeCrew(b.dataset.train)) { sfx('coin'); paint(); refresh(); } });
    const guard = dlg.querySelector('[data-guard-team]'); if (guard) guard.onclick = () => { if (g.togglePartyGuard()) { paint(); refresh(); } };
  };
  paint(); openDlg('nira-office');
}

function openMerchant() {
  pauseForDlg();
  const paint = () => {
    const mats = Object.entries(g.inventory || {}).filter(([k,n]) => n > 0 && ITEMS[k]?.material);
    dlg.innerHTML = `<div class="merchant-heading"><img src="img/merchant-profile.jpeg" alt="พ่อค้าควันทอง"><div><h2>🧳 ${esc(MERCHANT.name)}</h2><p class="hint">${esc(MERCHANT.line)} · มี ${Math.round(g.coin)} เบี้ยกรรม</p></div></div>
      <h3>ขายของจากชายแดน</h3><div class="market-grid">${mats.length ? mats.map(([k,n]) => {
        const d = ITEMS[k]; return `<article class="shop-card"><span class="shop-glyph">${d.glyph}</span><span><b>${esc(d.name)} ×${n}</b><small>${d.sell} เบี้ยต่อชิ้น</small></span>
          <button data-sell="${k}">ขาย 1</button><button data-sell-all="${k}" class="gold">ขายทั้งหมด</button></article>`;
      }).join('') : '<div class="hint">ยังไม่มีของสนามรบในกระเป๋า</div>'}</div>
      <h3>สินค้า</h3><div class="market-grid">${MERCHANT.stock.map(s => {
        const d = ITEMS[s.k], lock = g.level < s.lv;
        return `<article class="shop-card"><span class="shop-glyph">${d.glyph}</span><span><b>${esc(d.name)}${s.qty ? ` ×${s.qty}` : ''}</b><small>${lock ? `ปลดที่ขั้น ${LEVELS[s.lv - 1].name}` : `${s.cost} เบี้ยกรรม`}</small></span>
          <button data-buy="${s.k}" class="gold" ${lock || g.coin < s.cost ? 'disabled' : ''}>ซื้อ</button></article>`;
      }).join('')}</div>
      <h3>อัปเกรดพลัง</h3><div class="market-grid">${POWERS.map(p => {
        const lv = g.upgrades?.powers?.[p.k] || 0, cost = UPGRADES.powerBase * (lv + 1), lock = g.powerLocked(p);
        return `<article class="shop-card"><span class="shop-glyph">${p.glyph}</span><span><b>${esc(p.name)} ขั้น ${lv + 1}</b><small>เพิ่มจำนวนที่เก็บได้ · ${cost} เบี้ย</small></span>
          <button data-power-up="${p.k}" ${lock || lv >= UPGRADES.max || g.coin < cost ? 'disabled' : ''}>อัปเกรด</button></article>`;
      }).join('')}</div><div class="row"><button class="gold" data-close>กลับแผนที่</button></div>`;
    dlg.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => { if (g.sellMaterial(b.dataset.sell)) { sfx('coin'); paint(); refresh(); } });
    dlg.querySelectorAll('[data-sell-all]').forEach(b => b.onclick = () => { if (g.sellMaterial(b.dataset.sellAll, true)) { sfx('coin'); paint(); refresh(); } });
    dlg.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { if (g.buyMerchant(b.dataset.buy)) { sfx('coin'); paint(); refresh(); } });
    dlg.querySelectorAll('[data-power-up]').forEach(b => b.onclick = () => { if (g.upgradePower(b.dataset.powerUp)) { sfx('gong'); paint(); refresh(); } });
  };
  paint(); openDlg('merchant');
}

function openBossPier() {
  const z = g.zoneDef();
  pauseForDlg();
  modal(`<h2>👑 ${esc(z.bossName)}</h2><p class="hint">${esc(z.bossWin?.[1] || 'เขายืนดูแลท่าเรืออยู่')}</p>
    <div class="row"><button data-rematch>⚔️ ประลองใหม่</button><button data-zone-menu>🗺️ เปลี่ยนโซน</button><button class="gold" data-close>ไว้คราวหน้า</button></div>`, d => {
      d.querySelector('[data-rematch]').onclick = () => { if (g.startZoneBoss('rematch')) { dlg.close(); openBattle(); } };
      d.querySelector('[data-zone-menu]').onclick = () => { dlg.close(); openZone(); };
    });
}

// ---------- ด่านชายแดนนรก ----------
function openFrontier() {
  pauseForDlg();
  const helpers = g.crewHelpers();
  const state = g.frontierOf();
  state.team = (state.team || []).filter(k => helpers.some(c => c.k === k));
  if (!state.team.length && helpers[0]) state.team = [helpers[0].k];
  g.save();

  const paint = () => {
    const chosen = state.team || [];
    const wave = (state.clears || 0) + 1;
    dlg.innerHTML = `<div class="frontier-screen" style="background-image:url('${FRONTIER.bg}')">
      <div class="frontier-shade"></div>
      <button class="x" data-close title="กลับแผนที่">✕</button>
      <header><small>กิจกรรมต่อสู้ประจำโซน</small><h2>🏯 ${esc(FRONTIER.name)}</h2>
        <p>ผีและปีศาจกำลังรวมตัวหลังประตู จัดทีมยมทูตไม่เกิน ${FRONTIER.teamMax} คนแล้วต้านพวกมันเป็นระลอก</p></header>
      <div class="frontier-party">
        <div class="frontier-hero"><img src="${heroFace()}" alt=""><b>${esc(HERO_NAME)}</b></div>
        ${chosen.map(k => {
          const c = helpers.find(x => x.k === k); if (!c) return '';
          return `<div class="frontier-hero mate"><img src="${artUrl('crew-' + c.k)}" alt=""><b>${esc(c.name)}</b></div>`;
        }).join('')}
      </div>
      <section class="frontier-panel">
        <div class="frontier-head"><span><b>ระลอกที่ ${wave}</b><small>${esc(g.zoneDef().name)} · ผ่านแล้ว ${state.clears || 0} ระลอก</small></span>
          <span class="frontier-loot">รางวัล: เบี้ยกรรม + ของสนามรบ</span></div>
        <div class="frontier-team"><h3>จัดทีมยมทูต <small>${chosen.length}/${FRONTIER.teamMax}</small></h3>
          <div class="frontier-cards">${helpers.length ? helpers.map(c => {
            const on = chosen.includes(c.k), full = !on && chosen.length >= FRONTIER.teamMax;
            return `<button data-frontier-crew="${c.k}" class="frontier-card${on ? ' selected' : ''}" ${full ? 'disabled' : ''}>
              <img src="${artUrl('crew-' + c.k + '-profile') || artUrl('crew-' + c.k)}" alt="">
              <span><b>${esc(c.name)}</b><small>แรง ${c.raeng} · กำลังใจ ${Math.round(c.morale)}</small></span>
              <i>${on ? '✓ เข้าทีม' : 'เลือก'}</i></button>`;
          }).join('') : '<div class="hint">ยังไม่มียมทูตสายต่อสู้ — จ้างได้ที่นิรา</div>'}</div>
        </div>
        <div class="frontier-actions"><button data-close>กลับแผนที่</button>
          <button class="gold" data-frontier-start ${chosen.length ? '' : 'disabled'}>⚔️ เริ่มป้องกันชายแดน</button></div>
      </section>
    </div>`;
    dlg.querySelectorAll('[data-frontier-crew]').forEach(b => b.onclick = () => {
      if (g.setFrontierTeam(b.dataset.frontierCrew)) { sfx('crack'); paint(); }
    });
    const start = dlg.querySelector('[data-frontier-start]');
    if (start) start.onclick = () => {
      if (!g.startFrontierBattle()) return;
      dlg.close();
      openBattle((_, done) => openFrontierResult(done));
    };
  };
  paint();
  openDlg('frontier');
}

function openFrontierResult(done) {
  if (!done) return;
  const win = done.over === 'win';
  const item = done.reward?.item && ITEMS[done.reward.item];
  pauseForDlg();
  modal(`<h2>${win ? '🏯 รักษาชายแดนไว้ได้' : '⚔️ ทีมถอยกลับเข้าประตู'}</h2>
    <div class="frontier-result ${win ? 'win' : 'lose'}">
      <b>ระลอกที่ ${done.wave}</b>
      <p>${win ? `ได้รับ ${done.reward.coin} เบี้ยกรรม${item ? ` และ ${item.glyph} ${esc(item.name)} ×1` : ''}`
                : 'ชายแดนยังไม่แตก พักฟื้นหรือจัดทีมใหม่แล้วค่อยกลับมาสู้ได้'}</p>
      ${item ? '<small>ของสนามรบถูกเก็บเข้ากระเป๋า รอขายให้พ่อค้านรก</small>' : ''}
    </div>
    <div class="row"><button data-close>กลับแผนที่</button><button class="gold" data-frontier-again>จัดทีมระลอกต่อไป</button></div>`, d => {
      d.querySelector('[data-frontier-again]').onclick = openFrontier;
    });
}

// ---------- ฉากต่อสู้ ----------
// ใช้ทั้งกับวิญญาณที่ขัดขืน และกับพญายมตอนบารมีหมด (ฉากหลังไม่มีทางชนะ ตั้งใจให้แพ้)
function openBattle(after) {
  const B = g.battle;
  if (!B) return;
  pauseForDlg();     // ฉากต่อสู้ก็คือกล่องใบหนึ่ง — คืนค่าพักตอนปิดเหมือนกล่องอื่นทุกใบ
  // เพลง bgm-yama ไม่เคยมีไฟล์จริงเลย (audio/ มีแค่ bgm-title, bgm-zone) — ยิง HEAD 404 สามนามสกุล
  // ทุกครั้งที่สู้บอส/พ่อ ไม่มีประโยชน์ ใช้ bgm-battle ทุกฉากต่อสู้เหมือนกันหมด (คุณเป้สั่ง 17 ก.ย. 2569)
  // ระบบ FALLBACK ใน sfx.js จะถอยไปเล่น bgm-zone เองอัตโนมัติถ้ายังไม่มีไฟล์ bgm-battle จริง
  bgm('bgm-battle');
  sfx('gong');
  // phase = null (นิ่ง) · 'you' (ตาเรา) · 'foe' (ตาเขา) — ระหว่างเล่นจังหวะ ปุ่มถูกล็อก
  // phaseAt = เวลาที่เริ่มจังหวะ ใช้กู้เมื่อจังหวะค้าง (ดู phaseGuard ท้ายฟังก์ชัน)
  let phase = null, fxNow = null, phaseTimer = 0, phaseAt = 0;

  const paint = () => {
    const b = g.battle;
    if (!b) return;
    // ระหว่างจังหวะ "ตาเรา" ให้โชว์ภาพนิ่งตอนที่เขายังไม่สวน เลือดฝั่งเราจึงยังไม่ลด
    const view = phase === 'you' && b.mid
        ? { ...b, foeHp: b.mid.foeHp, youHp: b.mid.youHp, talk: b.mid.talk,
            dmg: { foe: b.dmg ? b.dmg.foe : 0, you: 0 } }
      : phase === 'foe'
        ? { ...b, dmg: { foe: 0, you: b.dmg ? b.dmg.you : 0 } }
        : { ...b, dmg: { foe: 0, you: 0 } };
    const act = phase === 'you' ? { lunge: 'you', struck: 'foe' }
              : phase === 'foe' ? { lunge: 'foe', struck: 'you' } : null;
    const fireAmmo = g.powerOf('roar').ammo;
    const battleHelpers = g.battleCrew();
    const prep = b.kind === 'zoneBoss' && !b.prep && !b.over ? `<div class="boss-prep">
      <b>เลือกเตรียมศึกหนึ่งอย่าง</b><div class="acts">
      <button data-prep="proof" ${g.miniGoals[b.zone]?.earned ? '' : 'disabled'}>📜 แฟ้มหลักฐาน ${g.miniGoals[b.zone]?.earned ? '· ลดพลังบอส 24' : '· ต้องเปิดโปง 3 คดี'}</button>
      <button data-prep="crew" ${g.crewHelpers().length ? '' : 'disabled'}>🛡️ ยมทูตคุ้มกัน · บารมีศึก +18</button>
      <button data-prep="power">🔥 เตรียมลูกไฟ · เพิ่ม 1 ลูก</button>
      </div></div>` : '';
    const battleChoice = (k, icon, label, ok, note = '') => `<button class="orb-choice" data-act="${k}" ${ok ? '' : 'disabled'}
      title="${esc(label + (note ? ' · ' + note : ''))}"><img src="${icon}" alt=""><b>${esc(label)}</b>${note ? `<i>${esc(note)}</i>` : ''}</button>`;
    const battleItem = k => BATTLE.items.find(x => x.k === k);
    const itemChoice = (k, icon) => {
      const it = battleItem(k), pw = it?.power ? g.powerOf(it.power) : null;
      const ok = !!it && (it.coin != null ? g.coin >= it.coin : !!(pw && pw.ammo > 0 && !g.powerLocked(pw)));
      const note = it?.coin != null ? `${it.coin} เบี้ย` : `×${pw ? pw.ammo : 0}`;
      return battleChoice(k, icon, it?.name || k, ok, note);
    };
    const powerChoices = battleChoice('fire', 'img/fx-fireball.png', 'ลูกไฟ', fireAmmo > 0, `×${fireAmmo}`)
      + itemChoice('ice', 'img/fx-ice.png') + itemChoice('hypno', 'img/fx-hypno.png');
    const itemChoices = itemChoice('tea', 'img/item-tea.png') + itemChoice('health', 'img/item-health.png');
    const crewActions = battleHelpers.length ? battleHelpers.map(c => {
      const why=g.crewHelpWhy(c);
      return `<button class="orb-choice" data-act="crew:${c.k}" data-crew-action="${c.k}" ${why?'disabled':''} title="${esc(why || crewAbility(c.k))}"><img src="${artUrl('crew-'+c.k+'-profile') || artUrl('crew-'+c.k)}" alt=""><b>${esc(c.name)}</b><small>${crewAbility(c.k)}</small></button>`;
    }).join('') : '<span class="idle">ยังไม่มีทีม — จัดทีมยมทูตก่อนเข้าสู้ครั้งถัดไป</span>';
    const acts = (b.kind === 'zoneBoss' && !b.prep) || (b.over && !phase) ? '' : commandWheel({battle:true,busy:!!phase,groups:[
      {action:'atk'},{choices:powerChoices},{choices:crewActions},{choices:itemChoices}
    ]});

    const finLabel =
        b.over === 'win'  ? (b.kind === 'zoneBoss' ? 'เปิดทางไปโซนถัดไป' : b.kind === 'frontier' ? 'รับรางวัลชายแดน' : b.kind === 'mob' ? 'กลับไปคุมโซน' : 'ลากเข้าสถานี')
      : b.over === 'lose' ? (b.kind === 'yama' ? 'ฟังคำตัดสินของพ่อ'
                          : b.kind === 'dad'  ? 'ฟังคำตัดสินของพ่อ'
                          : b.kind === 'zoneBoss' ? 'กลับไปตั้งหลักที่สะพาน'
                          : b.kind === 'frontier' ? 'ถอยกลับเข้าประตู'
                          : b.kind === 'mob'  ? 'ถอยกลับไปตั้งหลัก'
                                              : 'ปล่อยเขากลับเข้าคิว') : '';
    // เดิมมีเงื่อนไข `&& !phase` ด้วย — พอจังหวะอนิเมชันค้าง (เจ้าของเจอ 8 ก.ย. 2569)
    // กล่องจะไม่มีปุ่มอะไรเลยสักปุ่ม: ปุ่มโจมตีถูกล็อกเพราะ busy ปุ่มจบก็ไม่ถูกวาด
    // = ทางตัน ปิดกล่องไม่ได้ · ฉากจบแล้วต้องมีทางออกเสมอ ไม่ว่าอนิเมชันจะค้างหรือไม่
    const done = b.over
      ? `<div class="row"><button class="${b.over === 'win' ? 'gold' : ''}" data-fin>${finLabel}</button></div>` : '';

    dlg.innerHTML =
      arena(b.kind === 'yama' ? '👑 พญายมลงมาเอง'
          : b.kind === 'dad'   ? '👑 พ่อลงมาเอง — ตัดสินพลาดสามสำนวนติด'
          : b.kind === 'zoneBoss' ? '👑 บอสโซน — ทดสอบก่อนย้ายสาขา'
          : b.kind === 'frontier' ? `🏯 ชายแดนนรก — ระลอกที่ ${b.wave}`
          : b.kind === 'mob'   ? '👹 ผีบุกเข้าโซน'
                               : '⚔️ วิญญาณขัดขืน',
            { name: b.who, sub: b.sub, sp: b.sp }, view, act, false, fxNow,
            b.helper && Date.now() - b.helper.at < 1400 ? b.helper : null,
            acts, battleHelpers) +
      `<div class="pad">
        <div class="talkbox">${esc(view.talk || '...')}</div>
        ${phase ? `<div class="turnhint">${phase === 'you' ? '⚔️ ตาของท่าน' : '↩️ เขาสวนกลับ'}</div>` : ''}
        ${prep}${done}
      </div>`;

    dlg.querySelectorAll('[data-prep]').forEach(el => el.onclick = () => {
      if (g.prepareBoss(el.dataset.prep)) { sfx('stamp'); paint(); refresh(); }
    });
    bindCommandWheel(dlg);

    dlg.querySelectorAll('[data-act]').forEach(el => el.onclick = () => {
      if (phase) return;                       // กำลังเล่นจังหวะอยู่ ห้ามกดซ้อน
      const k = el.dataset.act;
      if (!g.battleAct(k)) return;
      sfx(k === 'fire' ? 'fire' : (k === 'health' || k === 'tea') ? 'star' : 'hit');
      if (k.startsWith('crew:')) refresh();     // กำลังใจของเขาลด แผงข้างล่างต้องอัปเดตด้วย
      const nb = g.battle;

      // ---- จังหวะที่ 1: ตาของท่าน ----
      phase = 'you'; phaseAt = Date.now();
      const effect = ({'crew:plerng':'fire','crew:kan':'hypno','crew:boon':'health'})[k] || k;
      fxNow = { key: FX_OF[effect] ? effect : 'atk', side: (effect === 'health' || effect === 'tea') ? 'you' : 'foe' };
      paint();
      playActionCutscene(k);

      clearTimeout(phaseTimer);
      phaseTimer = setTimeout(() => {
        if (!g.battle) return;
        // เขาตายคาที่ หรือไม่ได้สวนกลับ (โดนสตัน/ท่านแพ้ไปแล้ว) → ไม่ต้องมีจังหวะที่ 2
        const counter = (nb.dmg && nb.dmg.you > 0);
        if (!counter) { phase = null; fxNow = null; paint(); if (nb.over) sfx(nb.over === 'win' ? 'win' : 'lose'); return; }

        // ---- จังหวะที่ 2: เขาสวนกลับ ----
        phase = 'foe'; phaseAt = Date.now();
        fxNow = { key: 'foe', side: 'you' };
        sfx('hurt');
        paint();
        phaseTimer = setTimeout(() => {
          phase = null; fxNow = null;
          if (g.battle) { paint(); if (g.battle.over) sfx(g.battle.over === 'win' ? 'win' : 'lose'); }
        }, 780);
      }, 780);
    });
    const fin = dlg.querySelector('[data-fin]');
    if (fin) fin.onclick = finish;
  };

  // ---- ฉากต่อสู้ "ปิดไม่ได้จนกว่าจะจบ" ----
  // พบ 8 ก.ย. 2569 ว่ามี event close หลุดเข้ามาได้โดยไม่มี cancel นำหน้าและไม่มีใครกดอะไร
  // ผลคือผู้เล่น "แพ้ฟรี" กลางฉาก เลยไม่ผูกการจบฉากไว้กับ event close อีกต่อไป
  let reopen = 0, finished = false;

  function finish() {
    if (finished) return;
    finished = true;
    battleUI = null;
    lastBattleEnd = Date.now();
    clearTimeout(phaseTimer);
    clearInterval(phaseGuard);
    clearInterval(crewTimer);
    dlg.removeEventListener('cancel', noEsc);
    dlg.removeEventListener('close', onClose);
    if (dlg.open) dlg.close();
    const done = g.endBattle();
    // 'dad' ไม่ใช่ Game Over อีกต่อไป (17 ก.ย. 2569) — เกมเดินต่อ เพลงจึงต้องกลับมาเป็นเพลงโซนด้วย
    // 'yama' เท่านั้นที่ยังเป็นจบเกมจริง ไม่ต้องกลับเพลง
    if (done?.kind !== 'yama') bgm('bgm-zone');
    updatePlay();
    refresh();
    if (after) after(done ? done.over : null, done);
  }

  const noEsc = e => { if (g.battle && !g.battle.over) e.preventDefault(); };
  const onClose = () => {
    // ฉากยังไม่จบ = ไม่นับว่าปิด · ตัวเฝ้าจะเปิดกล่องกลับให้เองภายในเสี้ยววินาที
    if (g.battle && !g.battle.over && reopen++ < 200) return;
    finish();
  };

  // จังหวะอนิเมชันค้าง = ปุ่มถูกล็อกค้างไปด้วย ผู้เล่นทำอะไรไม่ได้เลย
  // (setTimeout พลาดได้หลายทาง — แท็บอยู่หลังจอ เครื่องหน่วง กล่องถูกวาดใหม่ระหว่างทาง)
  // เกินสี่วินาทีเมื่อไหร่ ปลดล็อกแล้ววาดใหม่ ไม่ปล่อยให้ค้าง
  const phaseGuard = setInterval(() => {
    if (!phase || Date.now() - phaseAt < 4000) return;
    phase = null; fxNow = null;
    if (g.battle) paint();
  }, 600);

  const crewTimer = setInterval(() => {
    for (const c of g.battleCrew()) {
      const remaining=g.crewCooldown(c), progress=100*(1-remaining/BATTLE.crewCd);
      const bar=dlg.querySelector(`[data-cooldown="${c.k}"]`);
      if(bar){bar.setAttribute('aria-valuenow',Math.round(progress));bar.querySelector('i').style.width=progress+'%';}
      const label=dlg.querySelector(`[data-cooldown-label="${c.k}"]`);
      if(label)label.textContent=remaining?cooldownText(remaining):'พร้อม';
      const button=dlg.querySelector(`[data-crew-action="${c.k}"]`);
      if(button){button.disabled=!!phase||!!g.battle?.over||!!g.crewHelpWhy(c);button.title=g.crewHelpWhy(c)||crewAbility(c.k);}
    }
  },1000);
  battleUI = () => { paint(); openDlg('rpg'); };
  battleUI();
  dlg.addEventListener('cancel', noEsc);
  dlg.addEventListener('close', onClose);
}

// ---------- ย้ายโซน ----------
// การ์ดเกาะ img/Zone<N>.webp — รวม CyberHell เป็นโซนที่เล่นได้จริงแล้ว
function openZone() {
  const cur = g.zoneDef();
  pauseForDlg();
  const cards = ZONES.map((z, i) => {
    const here = z.k === g.zone;
    const lock = !g.canMoveZone(z.k);
    const prev = ZONES[i - 1];
    const why = lock ? (g.level < z.level ? `ต้องเป็น ${LEVELS[z.level - 1].name}` : `ต้องชนะ${prev.bossName}ก่อน`)
      : z.sub;
    return `<div class="isle-card${here ? ' here' : ''}${lock ? ' locked' : ''}">
      <span class="badge">${here ? '📍' : lock ? '🔒' : ''}</span>
      <img src="img/Zone${i + 1}.webp" alt="${esc(z.name)}" loading="lazy">
      <b>${esc(z.name)}</b><small>${esc(why)}</small>
      ${here ? '<button class="sm" disabled>อยู่ที่นี่</button>'
             : `<button class="sm" data-zone="${z.k}" ${lock ? 'disabled' : ''}>ย้ายไป</button>`}
    </div>`;
  }).join('');
  modal(`<h2>🗺️ ย้ายโซน</h2>
    <div class="hint">ตอนนี้ท่านคุม <b style="color:var(--gold)">${esc(cur.name)}</b> — ${esc(cur.sub)}
      · ย้ายแล้ว <b>คน เบี้ยกรรม พลัง บารมี กรรม ติดตัวไปหมด</b> แต่
      <b style="color:var(--warning)">สถานีทัณฑ์ต้องสร้างใหม่ทั้งโซน</b></div>
    <div class="isle-grid">${cards}</div>
    <div class="row"><button class="gold" data-close>อยู่ที่นี่ต่อ</button></div>`,
    d => { d.classList.add('zonepick'); d.querySelectorAll('[data-zone]').forEach(b => b.onclick = () => {
      if (!g.moveZone(b.dataset.zone)) return;
      sfx('gong'); dlg.close(); refresh();
    }); });
}

function openOutfit() {
  pauseForDlg();
  modal(`<h2>👘 ห้องเครื่อง Yama</h2>
    <p class="outfit-note">เลือกชุดที่ได้รับแล้ว สวมได้ทุกสาขา</p>
    <div class="outfit-list">
    ${ZONES.map(z => {
      const lock = g.level < z.level, here = (g.outfit || g.zone) === z.k;
      const folders = { asia:'Asia', west:'West', cyberhell:'CyberHell' };
      const face = z.k === 'th' ? 'img/hero-yama.png' : `img/${folders[z.k]}/hero-yama-${z.k}.png`;
      return `<div class="outfit-card${here ? ' selected' : ''}${lock ? ' locked' : ''}">
        <img src="${face}" alt="ชุด${esc(z.name)}" loading="lazy">
        <span class="outfit-info"><b>ชุด${esc(z.name.replace(/^โซน/, ''))}</b>
          <small>${esc(z.sub)}</small>
          <span>${lock ? `🔒 ต้องเป็น ${esc(LEVELS[z.level - 1].name)}` : here ? '✓ กำลังสวม' : 'พร้อมสวม'}</span></span>
        ${here ? '<button class="sm" disabled>ชุดปัจจุบัน</button>'
               : `<button class="sm" data-outfit="${z.k}" ${lock ? 'disabled' : ''}>สวม</button>`}
      </div>`;
    }).join('')}
    </div>
    <div class="row"><button class="gold" data-close>เสร็จแล้ว</button></div>`,
    d => { d.classList.add('outfit'); d.querySelectorAll('[data-outfit]').forEach(b => b.onclick = () => {
      if (!g.setOutfit(b.dataset.outfit)) return;
      warmZone(b.dataset.outfit); sfx('gong'); dlg.close(); refresh();
    }); });
}

function bagUseWhy(k) {
  const d = ITEMS[k];
  if (!d) return 'ไม่รู้จักไอเทมนี้';
  if (d.material) return `สินค้า · พ่อค้านรกรับซื้อ ${d.sell} เบี้ยกรรม`;
  if (d.hp && g.hp >= g.hpMax) return 'บารมีเต็มแล้ว';
  if (d.karma < 0 && g.karma <= 0) return 'ยังไม่มีกรรมให้ชำระ';
  if (d.power) {
    const p = g.powerOf(d.power);
    if (!p || g.powerLocked(p)) return 'พลังนี้ยังไม่ปลดล็อก';
    if (p.ammo >= p.max) return 'พลังเต็มแล้ว';
  }
  return '';
}

function outfitCards() {
  return ZONES.map(z => {
    const lock = g.level < z.level, here = (g.outfit || g.zone) === z.k;
    const folders = { asia:'Asia', west:'West', cyberhell:'CyberHell' };
    const face = z.k === 'th' ? 'img/hero-yama.png' : `img/${folders[z.k]}/hero-yama-${z.k}.png`;
    return `<div class="outfit-card${here ? ' selected' : ''}${lock ? ' locked' : ''}">
      <img src="${face}" alt="ชุด${esc(z.name)}" loading="lazy">
      <span class="outfit-info"><b>ชุด${esc(z.name.replace(/^โซน/, ''))}</b>
        <small>${esc(z.sub)}</small>
        <span>${lock ? `🔒 ต้องเป็น ${esc(LEVELS[z.level - 1].name)}` : here ? '✓ กำลังสวม' : 'เก็บอยู่ในกระเป๋า'}</span></span>
      ${here ? '<button class="sm" disabled>ชุดปัจจุบัน</button>'
             : `<button class="sm" data-bag-outfit="${z.k}" ${lock ? 'disabled' : ''}>สวม</button>`}
    </div>`;
  }).join('');
}

function openBag() {
  pauseForDlg();
  const carried = Object.entries(g.inventory || {}).filter(([k, n]) => ITEMS[k] && n > 0);
  const itemCards = carried.length ? carried.map(([k, n]) => {
    const d = ITEMS[k], why = bagUseWhy(k);
    return `<div class="bag-item">
      <img src="${artUrl(d.img) || `img/${d.img}.png`}" alt="${esc(d.name)}" loading="lazy">
      <span class="n"><b>${esc(d.glyph)} ${esc(d.name)} ×${n}</b>
        <small>${esc(why || d.say)}</small></span>
      <button class="gold" data-use-item="${k}" ${why ? 'disabled' : ''}>${d.material ? 'รอขาย' : 'ใช้'}</button>
    </div>`;
  }).join('') : '<div class="bag-empty">ยังไม่มีของในกระเป๋า<br><small>เดินเข้าใกล้ไอเทมตามฉากเพื่อเก็บ</small></div>';

  modal(`<h2>🎒 กระเป๋าของยมน้อย</h2>
    <div class="hint">ของที่เก็บได้จะไม่ถูกใช้ทันที เลือกใช้เมื่อจำเป็น และติดตัวไปทุกโซน</div>
    <div class="bag-title">ของใช้ · ${carried.reduce((s, [, n]) => s + n, 0)} ชิ้น</div>
    <div class="bag-list">${itemCards}</div>
    <div class="bag-title">ชุดที่ได้รับ</div>
    <div class="outfit-list">${outfitCards()}</div>
    <div class="row"><button class="gold" data-close>ปิดกระเป๋า</button></div>`, d => {
      d.classList.add('bag');
      d.querySelectorAll('[data-use-item]').forEach(b => b.onclick = () => {
        if (!g.useBag(b.dataset.useItem)) return;
        sfx('gong'); openBag(); refresh();
      });
      d.querySelectorAll('[data-bag-outfit]').forEach(b => b.onclick = () => {
        if (!g.setOutfit(b.dataset.bagOutfit)) return;
        warmZone(b.dataset.bagOutfit); sfx('gong'); openBag(); refresh();
      });
    });
}

// ---------- บทเรียนทีละขั้น ----------
// เจ้าของบอก 7 ก.ย. 2569 ว่า "ดูยากไป ต้องค่อยสอนทีละอย่าง"
// กติกา: ทีละขั้นเท่านั้น และขั้นจะโผล่ตอนที่เรื่องนั้นเพิ่งมีความหมายจริง (เงื่อนไข when อยู่ใน data.js)
// ขั้นที่ boss:true พญายมมาพูดเองแล้วหยุดเกม · ที่เหลือขึ้นเป็นแถบโค้ชโดยไม่ขัดจังหวะ
const coachEl = $('#coach');
let coachStep = null;

function markTaught(k) {
  if (!g.taught.includes(k)) g.taught.push(k);
  coachStep = null;
  g.save();
  drawCoach();
}

function drawCoach() {
  // ยังอยู่หน้าปก — ห้ามสอนอะไรทั้งนั้น ไม่งั้นโมดัลบทที่ 1 จะเด้งทับปกตั้งแต่ยังไม่ได้กดเริ่ม
  if (!$('#title')?.classList.contains('gone')) { coachEl.hidden = true; return; }
  // มีฉากต่อสู้ค้างอยู่ = ห้ามสอนอะไรทั้งนั้น ไม่งั้นโมดัลบทเรียนจะไปเปิดชนกับฉากต่อสู้
  // แล้ว showModal ของฉากต่อสู้จะพังเงียบ ๆ (ปุ่มข้างในไม่ผูก handler)
  if (g.battle) { coachEl.hidden = true; return; }
  if (g.over) { coachEl.hidden = true; return; }
  if (dlg.open) return;              // มีโมดัลค้างอยู่ — รอปิดก่อน (dlg.showModal ซ้อนกันไม่ได้)
  if (!coachStep) coachStep = TUTOR.find(t => !g.taught.includes(t.k) && t.when(g)) || null;
  if (!coachStep) { coachEl.hidden = true; return; }

  // ขั้นของพญายมต้องเป็นโมดัล — ท่านพูดเองแล้วเกมหยุดฟัง
  if (coachStep.boss) {
    const st = coachStep;
    coachEl.hidden = true;
    // ปิดขั้นนี้ตรงนี้เลย แล้วปล่อยให้ตัวจับ close ของ dlg เป็นคนเรียกขั้นถัดไป
    // (ห้ามเรียก markTaught ที่วน drawCoach ต่อ ไม่งั้นโมดัลของพญายมจะซ้อนกันแล้ว showModal พัง)
    if (!g.taught.includes(st.k)) g.taught.push(st.k);
    coachStep = null;
    g.save();
    bossModal(st.title, st.text + (st.hint ? `\n\n▸ ${st.hint}` : ''), 'รับทราบ');
    return;
  }
  const n = TUTOR.indexOf(coachStep) + 1;
  coachEl.hidden = false;
  coachEl.innerHTML = `
    <div class="txt"><b>${esc(coachStep.title)}</b>
      <p>${esc(coachStep.text)}</p>
      ${coachStep.hint ? `<div class="tip">▸ ${esc(coachStep.hint)}</div>` : ''}</div>
    <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
      <span class="step">${n}/${TUTOR.length}</span>
      <button class="sm" id="coach-ok">เข้าใจแล้ว</button></div>`;
  $('#coach-ok').onclick = () => markTaught(coachStep.k);
}

// ---------- ปุ่ม ----------
/** ปลดพักให้วาระเดิน — ต้องเรียก **ก่อน** เปิดกล่องฉากเปิด
 *  เพราะ pauseForDlg() จำค่า paused ตอนกล่องใบแรกเปิด แล้วคืนค่านั้นตอนปิด
 *  ถ้าเข้าเกมมาแบบพักอยู่ ค่าที่ถูกคืนก็คือ "พัก" ตลอดไป */
function resume() { userPaused = false; if (!g.over && g.paused) { g.paused = false; updatePlay(); } }

function updatePlay() {
  $('#play').textContent = g.paused ? '▶ เดินวาระ' : '⏸ พัก';
  $('#spd').textContent = `ความเร็ว ×${g.speed}`;
  // ปุ่มย้ายโซนโผล่เมื่อมีโซนอื่นเปิดให้จริง ๆ เท่านั้น — ไม่งั้นกดแล้วเจอแต่กุญแจ
  const z = $('#zone');
  if (z) {
    z.hidden = !g.zonesOpen().length;
    z.textContent = `🗺️ ย้ายโซน (${g.zoneDef().name})`;
  }
  const outfit = $('#outfit');
  if (outfit) outfit.hidden = g.outfitsOpen().length < 2;
  const bag = $('#bag');
  if (bag) {
    const n = Object.values(g.inventory || {}).reduce((s, v) => s + (Number(v) || 0), 0);
    bag.textContent = `🎒 กระเป๋า${n ? ` (${n})` : ''}`;
  }
}
$('#play').onclick = () => { if (!g.over) { userPaused = !g.paused; g.paused = userPaused; updatePlay(); } };
$('#spd').onclick = () => { g.speed = g.speed === 1 ? 2 : g.speed === 2 ? 4 : 1; updatePlay(); };
$('#help').onclick = openHelp;
$('#zone').onclick = openZone;
const outfitButton = $('#outfit');
if (outfitButton) outfitButton.onclick = openOutfit;
$('#bag').onclick = openBag;
$('#settings').onclick = openSettings;
$('#menu').onclick = goMenu;

/** กลับไปหน้าเมนู — บันทึกก่อน แล้วโหลดใหม่โดยไม่ตั้งธง fresh
 *  หน้าปกจะขึ้นมาพร้อมปุ่ม "เล่นต่อ" (ต่างจากปุ่มเดิมที่ลบเซฟทิ้งเลย) */
function goMenu() {
  g.save();
  saveAt = Infinity;                       // กันลูปเฟรมเขียนเซฟทับตอนกำลังรีโหลด
  sessionStorage.removeItem('avegee.fresh');
  location.reload();
}

/** ปุ่มปิด/เปิดเสียงรวม — สลับได้ทันทีโดยไม่ต้องเข้าหน้าตั้งค่า */
function drawMute() {
  const b = $('#mute');
  if (!b) return;
  b.textContent = AUDIO.on ? '🔊 เสียง' : '🔇 ปิดเสียงอยู่';
  b.style.opacity = AUDIO.on ? '' : '.6';
}
$('#mute').onclick = () => {
  AUDIO.on = !AUDIO.on;
  syncBgm(); saveAudio(); drawMute();
  if (AUDIO.on) { unlock(); bgm(g.battle ? 'bgm-battle' : 'bgm-zone'); sfx('crack'); }
};
drawMute();

cv.onmousemove = e => {
  const [sx, sy] = toScene(cv, e);
  const def = hitStation(sx, sy);
  const frontier = hitFrontier(g, sx, sy);
  const actor = hitActor(g, sx, sy);
  hover = frontier ? FRONTIER.k : def ? def.k : null;
  cv.style.cursor = (def || frontier || actor) ? 'pointer' : 'default';
};
cv.onmouseleave = () => { hover = null; };
cv.onclick = e => {
  const [sx, sy] = toScene(cv, e);
  onSceneClick(sx, sy);
};

/** คลิกโซนบนฉาก — ใช้ร่วมกันทั้งสองมุมมอง */
function onSceneClick(sx, sy) {
  if (hitFrontier(g, sx, sy)) {
    const near = Math.hypot(g.player.x - FRONTIER.x, g.player.y - FRONTIER.y) <= FRONTIER.reach;
    if (near) return openFrontier();
    if (g.walkTo(FRONTIER.x, FRONTIER.y))
      g.log(`เดินไป${FRONTIER.name} — เข้าได้เมื่อยืนใกล้ซุ้มประตู`, 'act');
    else g.log(`${FRONTIER.name}อยู่ในจุดที่เดินไปไม่ถึง`, 'bad');
    return;
  }
  const def = hitStation(sx, sy);
  const st = def && g.stations.find(x => x.def.k === def.k);

  const enterStation = key => {
    const d = STATIONS.find(x => x.k === key);
    if (!d) return;
    const near = Math.hypot(g.player.x - d.x, g.player.y - d.y) <= 86;
    if (near) return openStation(key);
    if (g.walkTo(d.x, d.y))
      g.log(`เดินไปหา${d.name} — เข้าได้เมื่อยืนใกล้ทางเข้า`, 'act');
    else g.log(`${d.name}อยู่ในจุดที่เดินไปไม่ถึง`, 'bad');
  };

  // ป้าย "กดเพื่อสร้าง" มาก่อนทุกอย่าง — ตอนนั้นเรายืนอยู่ตรงจุดพอดี
  // ถ้าไปเช็คตัวละครก่อน คลิกยังไงก็โดนตัวเราเองเสมอ แล้วจะไม่มีทางกดสร้างได้เลย
  if (def && !st && nearBuild(g, g.player.x, g.player.y)?.k === def.k) return openBuild(def);

  // คลิกโดนตัวไหนสักตัว = เอาขึ้นแผงข้อมูล (มาก่อนสถานี เพราะตัวละครยืนทับกรอบสถานีได้)
  const a = hitActor(g, sx, sy);
  if (a) {
    if (a.kind === 'station') { enterStation(a.key); return; }
    if (a.kind === 'merchant') {
      if (Math.hypot(g.player.x - MERCHANT.x, g.player.y - MERCHANT.y) <= MERCHANT.reach) return openMerchant();
      g.walkTo(MERCHANT.x, MERCHANT.y); g.log(`เดินไปหา${MERCHANT.name} — ซื้อขายได้เมื่อยืนใกล้`, 'act'); return;
    }
    if (a.kind === 'boss') {
      if (g.bossPierCanTalk()) return openBossPier();
      g.walkTo(1260, 558); return;
    }
    if (a.kind === 'crew' && a.key === 'nira') {
      const c = g.crewOf('nira');
      if (c && Math.hypot(g.player.x - c.x, g.player.y - c.y) <= 105) return openNiraOffice();
    }
    select(a);
    if (a.kind === 'mob') tryFight();      // เปรตนอกจากดูข้อมูลแล้วก็เข้าต่อสู้เลย
    refresh();
    return;
  }

  if (!def) {                                  // คลิกที่โล่ง = สั่งให้เดินไปตรงนั้น
    if (!g.walkTo(sx, sy))                     // อ้อมลาวาให้เอง · ไปไม่ได้จริงค่อยบอก
      g.log('ตรงนั้นเดินไปไม่ถึง — ต้องข้ามลาวาหรือแม่น้ำวิญญาณ', 'bad');
    return;
  }
  if (!st) {                                   // ยังไม่ได้สร้าง และยังยืนไม่ถึงจุด → เดินไปก่อน
    if (!g.walkTo(def.x, def.y)) g.log('ตรงนั้นเดินไปไม่ถึง', 'bad');
    return;
  }
  if (st.build) {
    return modal(`<h2>${def.glyph} ${esc(def.name)}</h2>
      <p style="font-size:var(--text-sm);line-height:var(--leading-body)">กำลังก่อสร้างอยู่ — รออีกสักครู่</p>
      <div class="row"><button data-close>ปิด</button></div>`);
  }
  // อาคารที่สร้างแล้วต้องเดินไปถึงก่อน จึงเปิดฉากด้านในได้
  // คลิกจากไกล = สั่งเดินไปทางเข้า; เมื่อถึงแล้วคลิกอีกครั้งเพื่อเข้า
  return enterStation(def.k);
}

// เดินด้วยคีย์บอร์ดด้วยก็ได้
const KEY = {};
addEventListener('keydown', e => {
  if (dlg.open || /input|textarea/i.test(e.target.tagName)) return;
  KEY[e.key.toLowerCase()] = true;
  if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault();
  if (e.key === ' ' && !g.over) { tryFight(); }        // เว้นวรรค = สู้กับเปรตตนที่ใกล้ที่สุด
});
addEventListener('keyup', e => { KEY[e.key.toLowerCase()] = false; });

function keyWalk(dt) {
  const P = g.player, sp = 0.32 * dt;
  let dx = 0, dy = 0;
  if (KEY.a || KEY.arrowleft) dx -= 1;
  if (KEY.d || KEY.arrowright) dx += 1;
  if (KEY.w || KEY.arrowup) dy -= 1;
  if (KEY.s || KEY.arrowdown) dy += 1;
  if (!dx && !dy) return;
  const d = Math.hypot(dx, dy);
  stepTo(P, dx / d * sp, dy / d * sp);          // ลาวา/แม่น้ำกันไว้ ชนแล้วไถลไปตามขอบ
  P.tx = null; P.path = null; g.huntMob = false; // กดปุ่มแล้วยกเลิกจุดหมายที่คลิกไว้ (รวมคำสั่งไล่เปรต)
  if (dx) P.face = dx < 0 ? -1 : 1;
}

/** ---------- หน้าของสถานีหนึ่งหลัง (9 ก.ย. 2569) ----------
 *  เจ้าของสั่ง: กดสถานีแล้วต้องเห็น "ฉากของหลังนั้น" พร้อมรายละเอียดว่ามันมีไว้ทำอะไร
 *  และมีอะไรให้กดจริง ๆ ตรงนั้น — ไม่ใช่กล่องข้อความสองบรรทัดเหมือนเดิม
 *  ฉากหลังคือ img/BG-<ชื่อคีย์>.jpeg ที่เจ้าของวาดมาเอง ไม่มีไฟล์ก็ถอยไปใช้เวทีกลาง */
const stBg = k => artUrl(`BG-${k[0].toUpperCase()}${k.slice(1)}`, 'webp');   // โซนอื่นมีฉากห้องของตัวเองได้

/** จุดยึดของห้อง — ฉากห้องของโซนที่องค์ประกอบต่างจากโซน 1 มีชุดจุดยึดของตัวเองใน ROOMS[k].zones
 *  ใช้เฉพาะตอนที่ฉากของโซนนั้นมีจริง (ยังไม่มีไฟล์ = ใช้ฉากโซน 1 ก็ต้องใช้จุดยึดโซน 1) */
function roomFor(k) {
  const base = ROOMS[k] || ROOM_DEFAULT;
  const cap = `BG-${k[0].toUpperCase()}${k.slice(1)}`;
  const own = base.zones && base.zones[g.zone];
  return own && stBg(k) !== `img/${cap}.webp` ? { ...base, ...own } : base;
}

function openStation(k) {
  const def = STATIONS.find(d => d.k === k);
  const room = roomFor(k);
  let myGen = -1;                       // รุ่นของกล่องที่หน้านี้เป็นเจ้าของ (ตั้งค่าหลัง openDlg)
  let R = null;                         // ตัวคุมฉากในห้อง (src/room.js)

  const mine = () => myGen < 0 || (dlg.open && dlgGen === myGen);

  /** เนื้อหาฝั่งซ้าย/ขวา — วาดใหม่ได้บ่อยโดยไม่แตะ canvas ของฉาก
   *  (ถ้าวาดทั้งกล่องใหม่ทุกครั้ง ตัวละครในห้องจะกระโดดกลับจุดเริ่มทุก 0.7 วินาที) */
  const panels = () => {
    const st = g.stations.find(x => x.def.k === k);
    if (!st) return;
    const cap = g.stCap(st), v = def.visit;
    const inside = !!(R && R.inReach());

    const acts = [];
    // ปุ่ม "เติมพลัง" ถูกถอดออก 12 ก.ย. 2569 (ข้อ 4 ของเจ้าของ) — สถานีวางของไว้ในฉากแทน
    // เหลือไว้แค่บรรทัดบอกว่าของชิ้นนั้นวางอยู่หรือยัง จะได้ไม่ต้องเดินไปลุ้นเอง
    if (v?.drop) {
      const item = ITEMS[v.drop];
      const ready = g.items.some(it => it.from === k);
      const left = Math.max(0, (st.visitCd || 0) - g.tick);
      acts.push(`<button disabled>${item?.glyph || '🎁'} ${esc(item?.name || 'ของประจำสถานี')}
        <small>${ready ? 'วางอยู่ในฉากแล้ว · เดินไปเก็บใส่กระเป๋าได้เลย'
          : left ? `กำลังเตรียม · อีก ${left} วาระ` : 'กำลังนำมาวางในฉาก'}</small></button>`);
    }
    // ข้อ A คุณเป้ 24 ก.ย. 2569 — ปุ่ม "นั่งพัก" เฉพาะศาลาน้ำชา ฟื้นบารมีฟรีแลกเวลา (ดู room.js setSit)
    if (R?.canSit) {
      const isSitting = R.sitting();
      const hpFull = g.hp >= g.hpMax;
      acts.push(isSitting
        ? `<button class="gold" id="s-sit">🧎 ลุกขึ้น<small>บารมี ${Math.round(g.hp)}/${g.hpMax} — ลุกได้ทุกเมื่อ</small></button>`
        : `<button id="s-sit" ${inside && !hpFull ? '' : 'disabled'}>🧎 นั่งพัก<small>${hpFull ? 'บารมีเต็มแล้ว — ไม่ต้องนั่ง'
            : inside ? 'ฟรี ไม่เสียเบี้ยกรรม — ฟื้นช้า ๆ ตามเวลาที่นั่ง' : 'เดินเข้าไปยืนตรงจุดในศาลาก่อน'}</small></button>`);
    }
    if (def.archive) acts.push(`<button class="gold" id="s-arch" ${inside ? '' : 'disabled'}>
        📜 เปิดแฟ้มทะเบียนกรรม<small>${inside ? `ประวัติวิญญาณทุกดวงที่ผ่านมือท่าน · ${g.ledger.length} เรื่อง`
          : 'เดินขึ้นบันไดไปยืนหน้าคัมภีร์ก่อน'}</small></button>`);
    if (k === 'tarang' && g.held.length)
      acts.push(...g.held.map(h => `<button data-rel="${h.id}">🔓 ปล่อย ${esc(h.who)}<small>ออกไปขึ้นแท่นตัดสิน</small></button>`));
    if (k === 'tarang') {
      const sentenced = g.sentences.filter(x => x.zone === g.zone && x.stage === 'prison');
      acts.push(`<div class="st-desc">📋 ตรวจรายชื่อกับนิรา · รับทัณฑ์ครบแล้ว ${sentenced.length} ดวง</div>`);
      for (const x of sentenced) {
        const name = esc(x.soul.name || x.soul.who), ready = g.tick >= (x.readyAt ?? x.until ?? 0);
        acts.push(`<div class="st-desc">#${String(x.soul.id).padStart(3, '0')} ${name} · ${x.inspected
          ? x.repentant ? 'เข็ดแล้ว' : 'ยังไม่เข็ด'
          : ready ? 'พร้อมตรวจ' : `รออีก ${(x.readyAt ?? x.until) - g.tick} วาระ`}</div>`);
        acts.push(x.inspected
          ? `<button class="gold" data-prison-send="${x.soul.id}" ${inside && (!x.repentant || g.stations.some(st => st.def.k === 'sawan' && !st.build)) ? '' : 'disabled'}>${x.repentant ? '🕊️ ส่งไปประตูสวรรค์' : '↩️ ส่งกลับเข้าคิว'}<small>${x.repentant && !g.stations.some(st => st.def.k === 'sawan' && !st.build) ? 'ต้องสร้างประตูสวรรค์ให้เสร็จก่อน · ' : ''}${name}</small></button>`
          : `<button data-prison-check="${x.soul.id}" ${inside && ready ? '' : 'disabled'}>📋 ให้นิราตรวจ<small>${name}</small></button>`);
      }
    }
    if (k === 'sawan') {
      const arrivals = g.sentences.filter(x => x.zone === g.zone && x.stage === 'gate');
      acts.push(`<div class="st-desc">📜 ตรวจกรรมกับบุญ · รอที่ประตู ${arrivals.length} ดวง<br>กรรมคงเหลือคิดจากกรรมทั้งหมด หักบุญจริงและวาระที่รับทัณฑ์แล้ว<br>ส่งไปเกิดใหม่ ${g.reborn} · ขึ้นสวรรค์ ${g.ascended} ดวง</div>`);
      for (const x of arrivals) {
        const name = esc(x.soul.name || x.soul.who);
        acts.push(`<div class="st-desc">#${String(x.soul.id).padStart(3, '0')} ${name}${x.checked ? ` · กรรมคงเหลือ ${x.karmaLeft}` : ' · รอตรวจกรรม'}</div>`);
        acts.push(x.checked
          ? `<button class="gold" data-gate-send="${x.soul.id}" ${inside ? '' : 'disabled'}>${x.karmaLeft > 0 ? '✨ ส่งไปเกิดใหม่' : '🌟 ส่งขึ้นสวรรค์'}<small>${x.karmaLeft > 0 ? `กรรมคงเหลือ ${x.karmaLeft}` : 'หมดกรรม · รับรางวัลจากพ่อ'} · ${name}</small></button>`
          : `<button data-gate-check="${x.soul.id}" ${inside ? '' : 'disabled'}>📜 ให้บุญตรวจกรรม<small>${name}</small></button>`);
      }
    }
    if (cap && g.stFree(st) > 0 && g.queue.length)
      acts.push(`<button id="s-pick">📍 เลือกเป็นปลายทาง<small>ของสำนวนที่อยู่หน้าแท่นตอนนี้</small></button>`);
    if (cap) {
      const speedCost = UPGRADES.stationBase * ((st.speedLv || 0) + 1);
      const capCost = UPGRADES.stationBase * ((st.capLv || 0) + 1);
      const fuelCost = UPGRADES.stationBase * ((st.fuelLv || 0) + 1);
      acts.push(`<button data-st-up="speed" ${g.coin < speedCost || (st.speedLv || 0) >= UPGRADES.max ? 'disabled' : ''}>⚙️ เร่งการทำงาน ขั้น ${st.speedLv || 0}<small>${speedCost} เบี้ย · เร็วขึ้น 12%</small></button>`,
        `<button data-st-up="capacity" ${g.coin < capCost || (st.capLv || 0) >= UPGRADES.max ? 'disabled' : ''}>👻 เพิ่มช่องรับ ขั้น ${st.capLv || 0}<small>${capCost} เบี้ย · เพิ่มได้ 1 ดวง</small></button>`,
        `<button data-st-up="fuel" ${g.coin < fuelCost || (st.fuelLv || 0) >= UPGRADES.max ? 'disabled' : ''}>🪵 ประหยัดฟืน ขั้น ${st.fuelLv || 0}<small>${fuelCost} เบี้ย · ใช้ฟืนน้อยลง</small></button>`);
    }

    const L = dlg.querySelector('#st-left'), Rg = dlg.querySelector('#st-right'), T = dlg.querySelector('#st-top');
    if (T) T.innerHTML = `
        <span class="chip">🪙 <b>${Math.round(g.coin)}</b></span>
        <span class="chip">🔥 <b>${Math.round(g.fuel)}</b></span>
        <span class="chip" id="st-hp-chip">❤️ ${bar(100 * g.hp / g.hpMax, 'hp')} <b>${Math.round(g.hp)}</b></span>
        ${st.fire > 0 ? `<span class="chip" style="color:var(--destructive)">🔥 ไฟไหม้ ${Math.round(st.fire)}%</span>` : ''}
        <span class="ttl">${def.glyph} ${esc(def.name)}</span>`;
    if (L) L.innerHTML = `
          <div class="hud-card">
            <h4>ที่นี่คือที่ไหน</h4>
            <div class="st-desc">${esc(def.desc)}</div>
          </div>
          <div class="hud-card">
            <h4>เอาไว้ทำอะไร</h4>
            <div class="st-desc">${esc(def.use || (cap ? 'ที่ลงทัณฑ์ตามชนิดกรรม' : '—'))}</div>
            <div class="st-meta">${def.tags.length ? 'ตรงกรรม: ' + def.tags.map(t => SINS[t].name).join(' · ') : 'ไม่ใช้ลงทัณฑ์'}
              · ฟืน ${def.fuel}/วาระ${cap ? ` · รับได้ ${st.slots.length}/${cap} ดวง` : ''}</div>
          </div>`;
    if (Rg) Rg.innerHTML = `
          <div class="hud-card st-acts">
            <h4>ทำอะไรได้ตรงนี้</h4>
            ${acts.join('') || '<div class="st-desc">ยังไม่มีอะไรให้ทำที่นี่ตอนนี้</div>'}
          </div>
          <div class="hud-card">
            <h4>ผู้คุมประจำหลังนี้</h4>
            <div class="st-desc">${st.crewK ? esc(g.crewOf(st.crewK)?.name || '—')
              + (g.crewOf(st.crewK)?.self ? ' (ท่านเอง)' : '')
              : 'ยังไม่มีใครประจำ'}</div>
          </div>`;

    const on = (id, fn) => { const b = dlg.querySelector(id); if (b) b.onclick = fn; };
    on('#s-pick',  () => { pick.st = k; dlg.close(); refresh(); });
    on('#s-arch',  () => { showArchive(true); sfx('stamp'); });
    on('#s-sit',   () => { R.setSit(!R.sitting()); panels(); });
    dlg.querySelectorAll('[data-rel]').forEach(b => b.onclick = () => {
      if (g.release(+b.dataset.rel)) { sfx('stamp'); panels(); refresh(); }
    });
    const afterCheck = ok => { if (ok) { sfx('stamp'); panels(); refresh(); } };
    dlg.querySelectorAll('[data-prison-check]').forEach(b => b.onclick = () => afterCheck(g.inspectPrison(+b.dataset.prisonCheck)));
    dlg.querySelectorAll('[data-prison-send]').forEach(b => b.onclick = () => afterCheck(g.moveFromPrison(+b.dataset.prisonSend)));
    dlg.querySelectorAll('[data-gate-check]').forEach(b => b.onclick = () => afterCheck(g.inspectGate(+b.dataset.gateCheck)));
    dlg.querySelectorAll('[data-gate-send]').forEach(b => b.onclick = () => afterCheck(g.resolveGate(+b.dataset.gateSend)));
    dlg.querySelectorAll('[data-st-up]').forEach(b => b.onclick = () => {
      if (g.upgradeStation(k, b.dataset.stUp)) { sfx('coin'); panels(); refresh(); }
    });
  };

  /** แฟ้มทะเบียนกรรม — ประวัติทุกดวงที่เคยผ่านมือท่าน (เจ้าของสั่ง 10 ก.ย. 2569)
   *  ทับอยู่บนฉากในห้องเดียวกัน ไม่ใช่กล่องใหม่ — ปิดแล้วกลับมายืนที่เดิม */
  function showArchive(on) {
    const box = dlg.querySelector('#st-arch');
    if (!box) return;
    box.hidden = !on;
    if (!on) return;
    const L = [...g.ledger].reverse();               // ล่าสุดอยู่บนสุด
    const five = L.filter(x => x.stars === 5).length;
    const over = L.filter(x => x.over > 0).length;
    const short = L.filter(x => x.short > 0).length;
    const wrong = L.filter(x => x.tham < 40).length;
    // คำตัดสินของพ่อ — รวมทั้งแฟ้ม (ข้อ 2 ของเจ้าของ 11 ก.ย. 2569)
    const byDad = {};
    for (const x of L) { const k = dadGrade(x); byDad[k] = (byDad[k] || 0) + 1; }
    const overVaras = L.reduce((a, x) => a + (x.over || 0), 0);
    const shortVaras = L.reduce((a, x) => a + (x.short || 0), 0);
    const passed = (byDad.great || 0) + (byDad.ok || 0);
    const rows = L.map(x => {
      const cl = g.closed.find(c => c.soul.id === x.id);
      const stars = '★'.repeat(x.stars ?? 0) + '☆'.repeat(5 - (x.stars ?? 0));
      const col = x.stars >= 4 ? 'var(--success)' : x.stars <= 1 ? 'var(--destructive)' : 'var(--gold)';
      const deeds = cl ? cl.soul.deeds.map(d => esc(d.t)).join(' · ') : '';
      const gr = dadGrade(x), tag = DAD_TAG[gr] || DAD_TAG.ok;
      // คลาดไปกี่วาระ — เลขเดียวที่เจ้าของถามหาตรง ๆ ("เราตัดสินผิดไปเท่าไร")
      const miss = (x.over || 0) - (x.short || 0);
      const missTxt = miss > 0 ? `หนักเกินไป ${miss} วาระ`
                    : miss < 0 ? `เบาไป ${-miss} วาระ`
                    : 'จำนวนวาระตรงพอดี';
      return `<div class="arch-row">
        <div class="arch-top">
          <b>#${String(x.id).padStart(3, '0')} ${esc(x.who)}</b>
          <span style="color:${col}">${stars}</span>
          <span class="arch-meta">${x.score} คะแนน · วาระที่ ${x.tick}</span>
        </div>
        <div class="arch-meta">สมควร ${x.deserved} วาระ · ท่านให้ไป ${x.deserved + x.over - x.short}
          ${x.over > 0 ? `<b style="color:var(--destructive)">เกิน ${x.over} · กรรมตกมา +${x.karma}</b>` : ''}
          ${x.short > 0 ? `<b style="color:var(--warning)">เบาไป ${x.short}</b>` : ''}
          ${x.tham < 40 ? '<b style="color:var(--destructive)">ส่งผิดชนิดกรรม</b>' : ''}
          ${x.back ? '<b style="color:var(--destructive)">กลับมารอบสอง</b>' : ''}</div>
        ${deeds ? `<div class="arch-deed">${deeds}</div>` : ''}
        <div class="arch-dad" style="border-left-color:${tag.c}">
          <b style="color:${tag.c}">👑 ${tag.t}</b> · ${esc(missTxt)}
          <span>${esc((BOSS_LINE[gr] || BOSS_LINE.ok).replace(/\s+—\s+.*$/, ''))}</span>
        </div>
      </div>`;
    }).join('');
    box.innerHTML = `
      <div class="arch-head">
        <b>📜 แฟ้มทะเบียนกรรม — โซน${esc(g.zoneDef().name.replace(/^โซน/, ''))}</b>
        <button id="s-arch-x">✕ ปิดแฟ้ม</button>
      </div>
      <div class="arch-sum">ปิดคดีแล้ว ${g.casesDone} เรื่อง · ห้าดาว ${five} ·
        ลงเกินกรรม ${over} · เบาไป ${short} · ส่งผิดชนิดกรรม ${wrong} ·
        กลับมาใหม่ ${g.returned}</div>
      <div class="arch-dadsum">
        <b>👑 พ่อว่าอย่างไรบ้าง</b>
        ${L.length ? `ผ่านสายตาท่าน <b style="color:var(--success)">${passed}</b> จาก ${L.length} เรื่อง` +
          ` (ตรงกรรม ${byDad.great || 0} · ใช้ได้ ${byDad.ok || 0})` +
          ` · ท่านติงว่าลงเกินกรรม <b style="color:var(--destructive)">${byDad.cruel || 0}</b>` +
          ` · ตีกลับ <b style="color:var(--destructive)">${(byDad.bad || 0) + (byDad.terrible || 0)}</b>` +
          `<br>รวมแล้วท่านลงหนักเกินไป <b>${overVaras}</b> วาระ และเบาไป <b>${shortVaras}</b> วาระ`
          : 'ยังไม่มีเรื่องให้ท่านอ่าน'}
      </div>
      <div class="arch-list">${rows || '<div class="arch-meta">แฟ้มยังว่างเปล่า — ท่านยังไม่ได้ตัดสินใครเลย</div>'}</div>`;
    box.querySelector('#s-arch-x').onclick = () => showArchive(false);
  }

  // ---- โครงของหน้า วาดครั้งเดียว: canvas ของฉากต้องไม่ถูกสร้างใหม่ ----
  dlg.innerHTML = `
    <div class="hud st-hud">
      <button class="x" data-close title="ปิด">✕</button>
      <div class="hud-top" id="st-top"></div>
      <div class="hud-body">
        <div class="hud-left st-left" id="st-left"></div>
        <div class="st-room"><canvas id="st-cv" width="900" height="620"></canvas>
          <div class="st-arch" id="st-arch" hidden></div></div>
        <div class="hud-right" id="st-right"></div>
      </div>
    </div>`;
  openDlg('hudwrap');           // กรอบเดียวกับห้องสอบสวน — .hud ต้องการกรอบใสเต็มความกว้าง
  myGen = dlgGen;

  const cv2 = dlg.querySelector('#st-cv');
  R = makeRoom(cv2, g, def, room, stBg(k), 'img/BG-Turn-Base.webp', mine);
  R.st = g.stations.find(x => x.def.k === k);
  R.onAct = () => {
    // ศาลาน้ำชา: เว้นวรรค/ปุ่มขวาที่จุดนั่งสลับนั่ง-ลุกได้เลย ไม่ต้องไล่กดปุ่มในแผงขวา (ข้อ A 24 ก.ย. 2569)
    if (R.canSit) { R.setSit(!R.sitting()); panels(); return; }
    panels();           // เว้นวรรคในห้องเปิดข้อมูลล่าสุด; การส่งวิญญาณต้องกดเลือกชื่อ
  };
  R.onCollect = () => { panels(); refresh(); };
  let wasNear = null, wasSitting = false;
  R.onFrame = near => {
    // นั่งอยู่ — บารมีขยับทุกเฟรมจริง อัปเดตเฉพาะตัวเลขที่หัวกล่องแบบเบา ๆ ไม่วาดทั้งแผงใหม่ทุกเฟรม
    if (R.sitting()) {
      const chip = dlg.querySelector('#st-hp-chip');
      if (chip) chip.innerHTML = `❤️ ${bar(100 * g.hp / g.hpMax, 'hp')} <b>${Math.round(g.hp)}</b>`;
    }
    if (R.sitting() !== wasSitting) { wasSitting = R.sitting(); panels(); }  // เต็มแล้วลุกเอง → วาดปุ่มใหม่
    if (near === wasNear) return;     // แตะ DOM เฉพาะตอนสถานะเปลี่ยนจริง
    wasNear = near; panels();
  };
  R.start();
  window.__room = R;            // ไว้ส่องตอนดีบักในเบราว์เซอร์ เหมือน window.G
  panels();

  // แผงข้อมูลอัปเดตตามวาระที่เดินอยู่ (ทัณฑ์คืบหน้า · ไฟไหม้ · คิว)
  const tm = setInterval(() => {
    if (!mine()) { clearInterval(tm); return; }
    const st = g.stations.find(x => x.def.k === k);
    if (!st) { dlg.close(); return; }
    R.st = st;
    panels();
  }, 900);
  // ไม่ผูกการเก็บกวาดไว้กับ event close — ทั้งลูปเฟรมและตัวจับเวลาเช็ค mine() เองอยู่แล้ว
  // (close ยิงแบบ async · ใบที่ปิดไปตอน openDlg จะมาถึงหลังกล่องใหม่เปิด แล้วเก็บของใหม่ทิ้ง)
}

function openBuild(def) {
  const taan = g.crew.find(c => c.k === 'taan'), afford = g.coin >= def.cost && !!taan && !taan.buildK;
  modal(`<h2>${def.glyph} ${esc(def.name)}</h2>
    <p style="font-size:var(--text-sm);line-height:var(--leading-body)">${esc(def.desc)}</p>
    <div class="hint">${def.tags.length ? 'ตรงกรรม: ' + def.tags.map(t => SINS[t].name).join(' · ') : 'ไม่ใช้ลงทัณฑ์'}
      · ฟืน ${def.fuel}/วาระ · แรง ${def.pow}${!taan ? ' · ต้องจ้างทัณฑ์ที่โต๊ะนิราก่อน' : taan.buildK ? ' · ทัณฑ์กำลังสร้างหลังอื่นอยู่' : ' · ทัณฑ์จะเดินมาสร้างให้'}</div>
    <div class="row"><button data-close>ยังไม่สร้าง</button>
      <button class="gold" id="bd" ${afford ? '' : 'disabled'}>สร้าง ${def.cost} เบี้ยกรรม</button></div>`,
    d => { const b = d.querySelector('#bd'); if (b) b.onclick = () => { g.build(def.k); dlg.close(); refresh(); }; });
}

/** หน้าต่างเลื่อนขั้น — บอกเป็นรายการว่าได้ความสามารถอะไรเพิ่ม (ข้อ 1 ของเจ้าของ 11 ก.ย. 2569)
 *  รายการมาจาก LEVELS[].gains ซึ่งต้องตรงกับที่ checkLevel() ใน game.js ทำจริง
 *  โซนที่เพิ่งเปิดอ่านจาก ZONES ตอนนี้เลย ไม่ hardcode — เพิ่มโซนใหม่แล้วบรรทัดนี้ตามเอง
 *  (g.level ถูกบวกไปแล้วตอนเรียกถึงตรงนี้ ขั้นก่อนหน้าจึงเป็น g.level - 2) */
function openLevelUp(lv) {
  pauseForDlg();
  sfx('star');
  const prev = LEVELS[g.level - 2];
  const zonesNew = g.pendingZoneOpen || ZONES.filter(z => z.level === g.level && z.k !== g.zone);
  g.pendingZoneOpen = null;                 // บอกในกล่องนี้แล้ว ไม่ต้องเด้งซ้ำอีกกล่อง
  const rows = [
    ...(lv.gains || []),
    ...zonesNew.map(z => ({ g: '🗺️', t: `เปิด${z.name}ให้ท่านคุม`,
                            d: `${z.sub} · กดปุ่ม 🗺️ ย้ายโซน ใต้ฉากเมื่อไหร่ก็ได้ ` +
                               'สาขาที่ทิ้งไว้ถูกเก็บไว้ให้ ย้ายกลับมาเมื่อไหร่ก็ยังอยู่' })),
  ];
  const face = artUrl('hero-yama-profile') || artUrl('hero-yama');
  modal(`<h2>🎖️ เลื่อนขั้น</h2>
    <div class="lvup">
      <img src="${face}" alt="" onerror="this.onerror=function(){this.remove()};this.src='${artUrl('hero-yama')}'">
      <div class="rank">
        ${prev ? `<div class="from">จาก ${esc(prev.name)}</div>` : ''}
        <div class="to">${esc(lv.name)}</div>
      </div>
    </div>
    <p style="font-size:var(--text-sm);line-height:var(--leading-body);margin:0 0 var(--space-3)">
      "สำนวนที่เจ้าตัดสินถูก ข้านับอยู่ทุกเรื่อง" — พญายมยื่นของให้โดยไม่อธิบาย</p>
    <div style="font-size:var(--text-xs);color:var(--muted-foreground);margin-bottom:6px">ท่านได้เพิ่ม</div>
    ${rows.length
      ? rows.map(r => `<div class="gain"><span class="g">${esc(r.g)}</span>
          <span class="n"><b>${esc(r.t)}</b><span>${esc(r.d)}</span></span></div>`).join('')
      : '<div class="hint">ขั้นนี้ยังไม่มีของแถม — แต่ชื่อขั้นของท่านเปลี่ยนแล้ว</div>'}
    <div class="row"><button class="gold" data-close>รับไว้</button></div>`);
}

// ---------- เหตุการณ์เด้ง ----------
g.onChange = () => {
  refresh();
  // ฉากพญายมลงมาเอง (บารมีหมด/ตัดสินแดงครบสาม) เปิดอัตโนมัติ
  // ฉากต่อสู้กับวิญญาณเปิดจากปุ่มออกหมาย · ฉากต่อสู้กับผีเปิดจากปุ่มบนแผนที่เท่านั้น
  if (g.battle && (g.battle.kind === 'yama' || g.battle.kind === 'dad') && !dlg.open) { openBattle(); return; }
  // startDadFight() เรียก this.onChange() เองข้างในอยู่แล้ว ซึ่งเข้าเงื่อนไข if แรกด้านบนให้เปิดฉากสู้ให้เอง
  // ห้ามเรียก openBattle() ซ้ำตรงนี้ — เรียกซ้ำแล้วมี onClose ของฉากสู้สองชุดค้างอยู่บน dlg element เดียวกัน
  // ชุดเก่าที่ไม่มีใครเคลียร์จะมาเรียก dlg.close() ทับกล่องถัดไป (กระทะทองแดง) ทิ้งทันที (เจอ 17 ก.ย. 2569)
  if (g.dadFight && !g.battle && !dlg.open) { g.startDadFight(); return; }
  if (g.over) { g.paused = true; updatePlay(); openEnding(g.over); return; }
  // แพ้พ่อครบสามครั้งเตือน — โชว์กระทะทองแดงแล้วเล่นต่อ (ไม่ใช่ Game Over อีกต่อไป)
  if (g.pendingDadPunish && !dlg.open) {
    const p = g.pendingDadPunish; g.pendingDadPunish = null;
    openDadPunish(p); return;
  }
  if (!g.battle && g.bossPending && !dlg.open && !g.pendingVerdict && !g.pendingLevel && !g.pendingZone) {
    const z = g.zoneDef();
    const proceed = () => {
      if (g.zone === 'th') { beginBossBridgeWalk(); return; }
      if (g.startZoneBoss()) openBattle();
    };
    // ฉากมาถึงขึ้นก่อนครั้งแรกเท่านั้น — รีแมตช์ (ติดธงแล้ว) ข้ามตรงไปสู้เลยตามใบงาน
    if (!g.bossArriveSeen[g.zone]) {
      g.bossArriveSeen[g.zone] = true; g.save();
      openBossArrive(z, proceed);
    } else proceed();
    return;
  }
  if (g.pendingZone) {
    const z = g.pendingZone; g.pendingZone = null;
    if (!z.back) openZoneArrival(z);
    else bossModal(`กลับมาที่${z.name}`,
      `${z.sub}\n\nสถานี ยมทูต และคิวที่ท่านทิ้งไว้ที่สาขานี้ยังอยู่ครบเหมือนวันที่ท่านจากไป`, 'เริ่มงาน');
    return;
  }
  // สาขาใหม่เพิ่งปลดล็อก — เด้งเองเฉพาะตอนที่ไม่มีหน้าต่างเลื่อนขั้นตามมา
  // (pendingZoneOpen ถูกตั้งใน checkLevel เสมอ ซึ่งตั้ง pendingLevel ด้วยทุกครั้ง
  //  หน้าต่างเลื่อนขั้นมีบรรทัด "เปิดโซน..." อยู่แล้ว ถ้าเด้งทั้งคู่ = บอกเรื่องเดียวกันสองกล่องติด)
  if (g.pendingZoneOpen && !g.pendingLevel) {
    const zs = g.pendingZoneOpen; g.pendingZoneOpen = null;
    bossModal('เปิดสาขาใหม่ให้ท่านแล้ว',
      `ขั้น "${LEVELS[g.level - 1].name}" เปิด${zs.map(z => z.name).join(' และ ')}ให้ท่านคุมได้แล้ว\n\n` +
      'กดปุ่ม 🗺️ ย้ายโซน ใต้ฉากเมื่อไหร่ก็ได้', 'รับทราบ');
    return;
  }
  // คิวล้นจนระเบียบหมด — เตือนก่อนสามครั้ง พร้อมบอกวิธีแก้ให้ผู้เล่นใหม่
  if (g.pendingOrderWarn) {
    const w = g.pendingOrderWarn; g.pendingOrderWarn = null;
    bossModal(`ตักเตือนเรื่องคิวล้น ${w.n}/${w.of}`,
      `${w.text}\n\n${ORDER_WARN.how}\n\n` +
      (w.n < w.of ? `ระเบียบถูกยกให้ตั้งหลักใหม่แล้ว — เหลือโอกาสอีก ${w.of - w.n} ครั้ง`
                  : 'ครั้งหน้าไม่มีเตือนแล้ว พ่อจะลงมาเอง'), 'รับทราบ');
    return;
  }
  // เตือนก่อนพ่อลงมา — แดงหนึ่ง/สองครั้งขึ้นเตือน ครั้งที่สามคือของจริง
  if (g.pendingWarn) {
    const w = g.pendingWarn; g.pendingWarn = null;
    bossModal(`คำตัดสินแดง ${w.n}/${w.of}`,
      `${w.text}\n\n${w.fireball ? `🔥 ลูกไฟจากบัลลังก์ฟาดถูก — บารมีเหลือ ${Math.max(0, Math.round(g.hp))}\n\n` : ''}` +
      `อีก ${w.of - w.n} สำนวนที่ตัดสินพลาด พ่อจะลงมาเอง — ` +
      'ตัดสินให้ได้สีเขียวหนึ่งครั้งก็ล้างที่สะสมไว้แล้ว', 'รับทราบ');
    return;
  }
  if (g.pendingKpi) {
    const k = g.pendingKpi; g.pendingKpi = null;
    bossModal(k.pass ? 'ตรวจการ — ผ่าน' : 'ตรวจการ — ไม่ผ่าน',
      k.pass
        ? `"ระเบียบ ${Math.round(g.order)} คะแนนเฉลี่ย ${k.avg} ... พอใช้ได้" ท่านพูดแค่นั้นแล้วก็เงียบ — ผ่านแล้ว ${g.kpiPassed} จาก 3 รอบ`
        : `"ระเบียบ ${Math.round(g.order)} คะแนนเฉลี่ย ${k.avg}" ท่านอ่านตัวเลขออกเสียงช้า ๆ ทีละตัว แล้วไม่พูดอะไรต่อ`);
    return;
  }
  if (g.pendingLevel) {
    const lv = g.pendingLevel; g.pendingLevel = null;
    openLevelUp(lv);
    return;
  }
  if (g.pendingEvent) {
    const ev = g.pendingEvent; g.pendingEvent = null;
    pauseForDlg();
    modal(`<h2>【${esc(ev.title)}】</h2><p style="line-height:var(--leading-body)">${esc(ev.text)}</p>
      <div class="row"><button class="gold" data-close>รับทราบ</button></div>`);
    }
};

dlg.addEventListener('close', () => setTimeout(drawCoach, 0));   // ปิดโมดัลแล้วค่อยต่อบทเรียนขั้นถัดไป

addEventListener('pointerdown', e => {          // แตะที่อื่นแล้วปิดบับเบิลที่กางอยู่
  if (!e.target.closest('.mark')) ov.querySelectorAll('.mark.show').forEach(m => m.classList.remove('show'));
}, true);

// ---------- หน้าปก ----------
// เกมไม่เริ่มเดินจนกว่าจะกดจากหน้าปก — ลูปเฟรมจึงต้องรอ ไม่งั้นบันทึกอัตโนมัติ
// จะเขียนทับเซฟเก่าตั้งแต่ก่อนผู้เล่นจะได้เลือกว่าจะเล่นต่อหรือเริ่มใหม่
const titleEl = $('#title');
let started = false;

/** เริ่มเล่นจริง — เรียกได้ครั้งเดียว */
function startPlay(fresh) {
  if (started) return;
  started = true;
  unlock();                                  // เบราว์เซอร์ยอมให้เล่นเสียงได้หลังการกดครั้งแรกเท่านั้น
  titleEl.classList.add('gone');
  resume();                                  // ต้องมาก่อนกล่องฉากเปิด — ดูหมายเหตุที่ resume()
  updatePlay();
  if (fresh) {
    // เพลงหน้าปกแทบไม่มีใครได้ยิน — ปกอยู่บนจอไม่กี่วินาที และเบราว์เซอร์ห้ามเล่นเสียง
    // ก่อนผู้ใช้กดอะไรสักอย่าง ซึ่งการกดครั้งแรกก็คือปุ่ม "เริ่มเกม" พอดี
    // เลยให้เพลงหน้าปกเล่นคลุมฉากเปิดของพญายมไปเลย แล้วค่อยสลับเป็นเพลงโซนตอนท่านพูดจบ
    bgm('bgm-title');
    openIntro();
    onDlgClose(() => bgm('bgm-zone'));
  } else {
    bgm('bgm-zone');
  }
  refresh();
  last = performance.now();
  requestAnimationFrame(frame);
}

function buildTitle() {
  // เบราว์เซอร์ห้ามเล่นเสียงก่อนผู้ใช้แตะจอ — ปลุกเพลงหน้าปกตอนแตะครั้งแรกที่ไหนก็ได้บนปก
  const wake = () => { unlock(); bgm('bgm-title'); titleEl.removeEventListener('pointerdown', wake); };
  titleEl.addEventListener('pointerdown', wake);

  // หน้าปกเป็น webp ตั้งแต่ 8 ก.ย. 2569 — png เดิม 1.3 MB คือไฟล์ใหญ่สุดของทั้งเกม
  // และเป็นภาพแรกที่ต้องมาถึง (144 KB แล้ว) · ถ้าวันหลังดรอป cover.png กลับมาก็ยังใช้ได้
  // ไม่มีสักไฟล์ก็ยังสวยอยู่ได้ด้วยไล่สีใน CSS
  const art = $('#cover-art');
  (function probeCover(list) {
    if (!list.length) return;
    const [url, ...rest] = list;
    const probe = new Image();
    probe.onload = () => { art.style.backgroundImage = `url('${url}')`; art.classList.add('has'); };
    probe.onerror = () => probeCover(rest);
    probe.src = url;
  })(['img/cover.webp', 'img/cover.png']);

  const rs = $('#t-resume');
  if (SAVED) {
    rs.hidden = false;
    const lv = LEVELS[Math.max(0, (SAVED.level || 1) - 1)];
    const z = ZONES.find(x => x.k === (SAVED.zone || 'th')) || ZONES[0];
    $('#t-resume-info').textContent =
      `${z.name} · วาระที่ ${SAVED.tick || 0} · ปิดคดีแล้ว ${SAVED.casesDone || 0} · ${lv.name} ⭐${SAVED.star5 || 0}`;
    rs.onclick = () => { sfx('gong'); startPlay(false); };
  }
  $('#t-new').onclick = () => {
    unlock(); sfx('gong');
    if (!SAVED) return startPlay(true);
    modal(`<h2>เริ่มเกมใหม่</h2>
      <p style="line-height:var(--leading-body);font-size:var(--text-sm)">
        มีเกมที่บันทึกไว้อยู่ — เริ่มใหม่แล้ว<b>ความคืบหน้าทั้งหมดจะหายไป</b></p>
      <div class="row"><button data-close>ยกเลิก</button>
        <button class="gold" id="ngo">เริ่มใหม่</button></div>`,
      d => d.querySelector('#ngo').onclick = () => {
        clearSave();
        sessionStorage.setItem('avegee.fresh', '1');   // โหลดใหม่แล้วข้ามหน้าปกไปเลย
        location.reload();
      });
  };
  $('#t-intro').onclick = () => openIntro(true);
  $('#t-set').onclick = () => { unlock(); openSettings(); };
}

// ---------- ตั้งค่า ----------
function openSettings() {
  modal(`<h2>⚙ ตั้งค่า</h2>
    <div class="setrow"><label>เปิดเสียงทั้งหมด</label>
      <input type="checkbox" id="s-on" ${AUDIO.on ? 'checked' : ''}></div>
    <div class="setrow"><label>เสียงเพลง</label>
      <input type="range" id="s-bgm" min="0" max="100" value="${Math.round(AUDIO.bgm * 100)}">
      <b id="s-bgm-v" style="width:34px;text-align:right;font-variant-numeric:tabular-nums">${Math.round(AUDIO.bgm * 100)}</b></div>
    <div class="setrow"><label>เสียงเอฟเฟกต์</label>
      <input type="range" id="s-sfx" min="0" max="100" value="${Math.round(AUDIO.sfx * 100)}">
      <b id="s-sfx-v" style="width:34px;text-align:right;font-variant-numeric:tabular-nums">${Math.round(AUDIO.sfx * 100)}</b></div>
    <div class="setrow"><label>ความเร็วเดินวาระ</label>
      <span class="opts" id="s-spd">${[1, 2, 4].map(v =>
        `<button data-v="${v}" ${g.speed === v ? 'aria-pressed="true"' : ''}>×${v}</button>`).join('')}</span></div>
    <div class="hint">เสียงเอฟเฟกต์ทั้งหมดสังเคราะห์ในโค้ด ไม่มีไฟล์ให้โหลด ·
      เพลงอ่านจาก <b>audio/</b> ยังไม่มีไฟล์ก็เล่นได้ตามปกติ เงียบเฉย ๆ</div>
    <div class="sec">ข้อมูลที่บันทึกไว้</div>
    <div class="hint">${SAVED ? `มีเกมที่บันทึกไว้ — วาระที่ ${SAVED.tick || 0} · ปิดคดีแล้ว ${SAVED.casesDone || 0}`
                              : 'ยังไม่มีเกมที่บันทึกไว้'}</div>
    <div class="row"><button id="s-wipe" ${SAVED ? '' : 'disabled'}
        style="border-color:var(--destructive);color:var(--destructive)">ลบข้อมูลที่บันทึกไว้</button>
      <button class="gold" data-close>เสร็จแล้ว</button></div>`,
    d => {
      const on = d.querySelector('#s-on');
      on.onchange = () => { AUDIO.on = on.checked; syncBgm(); saveAudio(); drawMute(); if (AUDIO.on) sfx('crack'); };
      const bind = (id, key) => {
        const r = d.querySelector(id), out = d.querySelector(id + '-v');
        r.oninput = () => { AUDIO[key] = r.value / 100; out.textContent = r.value; syncBgm(); };
        r.onchange = () => { saveAudio(); if (key === 'sfx') sfx('stamp'); };
      };
      bind('#s-bgm', 'bgm'); bind('#s-sfx', 'sfx');
      d.querySelectorAll('#s-spd button').forEach(b => b.onclick = () => {
        g.speed = +b.dataset.v; updatePlay();
        d.querySelectorAll('#s-spd button').forEach(x =>
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      });
      d.querySelector('#s-wipe').onclick = () => {
        clearSave(); sessionStorage.setItem('avegee.fresh', '1'); location.reload();
      };
    });
}

// ฉากเปิดต้องมาก่อน refresh() — ไม่งั้น drawCoach จะเปิดโมดัลบทที่ 1 ทับ แล้วบทที่ 1 หายไปเลย
primeAudio();                            // รู้ path เพลงไว้ก่อน (ดูเหตุผลใน sfx.js — Brave ไม่ปล่อยให้ play() ช้า)
const FRESH = sessionStorage.getItem('avegee.fresh');
sessionStorage.removeItem('avegee.fresh');
updatePlay();
buildTitle();
if (FRESH) startPlay(true);              // เพิ่งกด "เริ่มใหม่" มา ไม่ต้องกลับไปหน้าปกอีกรอบ
else refresh();                          // วาดแผงไว้ใต้หน้าปก จะได้ไม่กระพริบตอนกดเริ่ม

/** ฉากเปิด — พญายมมาบ่น มอบหมายงาน แนะนำคนสองคนที่เหลือ แล้วยัดเบี้ยกรรมให้ก้อนหนึ่ง
 *  โผล่เฉพาะเกมใหม่ ไม่ใช่ทุกครั้งที่เปิดหน้าเว็บ (เดิมเด้งทุกครั้งแม้โหลดเซฟเก่า) */
function openIntro(fromTitle = false) {
  const pages = [
    { title:'สามร้อยปีที่ไม่มีใครอยากพูดถึง', art:'scene', line:'โซนสุวรรณภูมิเคยมีผู้คุมสิบสองคน ตอนนี้เหลือสองคน และสำนวนที่ยังไม่มีใครกล้าเปิดอ่าน' },
    { title:'งานแรกของลูกพญายม', art:'hero-boss', line:'“เจ้าจะไม่ตัดสินจากหน้าตา จากคำร่ำลือ หรือจากความโกรธของตัวเอง” พ่อวางตรายมบาทลงในมือยมน้อย' },
    { title:'แฟ้มเล่มแรก', art:'crew-nira', line:'นิราอ่านเพียงสิ่งที่คนบนโลกเห็น บางวิญญาณดูดี บางวิญญาณดูร้าย แต่สิ่งที่ซ่อนอยู่จะปรากฏก็ต่อเมื่อเจ้าสอบสวน' },
    { title:'คำตัดสินเดินได้', art:'hero-yama', line:'เมื่อออกหมาย ยมทูตจะพาวิญญาณไปยังสถานที่ที่เจ้าสร้างไว้ ตัดสินให้ตรงกรรมและตรงวาระ เพราะทุกคำสั่งมีผลตามมา' },
    { title:'กฎข้อเดียวที่ห้ามลืม', art:'hero-boss', line:`“ทัณฑ์ที่เกินกรรมไม่ได้หายไปไหน มันกลับมาอยู่ในบัญชีของผู้ตัดสิน” พ่อให้ ${BAL.startCoin} เบี้ยกรรม แล้วปล่อยให้เจ้ารับสำนวนแรก` },
  ];
  let page = 0;
  const paint = () => {
    const p = pages[page], image = `img/intro-panel-0${page + 1}.webp`;
    dlg.innerHTML = `<div class="intro-comic" role="region" aria-label="เรื่องเปิดเกม หน้า ${page + 1} จาก ${pages.length}">
      <div class="intro-comic-frame">
        <img src="${image}" alt="" onerror="this.onerror=null;this.src='${artUrl(p.art)}'">
        <div class="intro-comic-head"><span>อเวจี · บทนำ</span><span>${page + 1} / ${pages.length}</span></div>
        <div class="intro-comic-caption"><h2>${esc(p.title)}</h2><p>${esc(p.line)}</p></div>
      </div>
      <div class="intro-comic-controls"><button id="intro-skip">${fromTitle ? 'ปิดบทนำ' : 'ข้ามบทนำ'}</button><button class="gold" id="intro-next">${page + 1 === pages.length ? (fromTitle ? 'กลับหน้าเมนู' : 'รับงาน') : 'หน้าถัดไป →'}</button></div>
    </div>`;
    dlg.querySelector('#intro-skip').onclick = () => dlg.close();
    dlg.querySelector('#intro-next').onclick = () => { if (++page === pages.length) dlg.close(); else paint(); };
  };
  if (!fromTitle) pauseForDlg();
  openDlg('intro-comic-dialog');
  paint();
}


window.G = g;
