// ui.js — แผงควบคุม · โมดัล · ลูปวาด
import { SINS, STATIONS, CREW, BAL, POWERS, SCENE, SPOTS, QUEUE_LINE,
         GUARD, LEVELS, MOB, TUTOR, ORDER_TIERS, KARMA_TIERS,
         KARMA_RELIEF, BATTLE, ZONES, TARANG } from './data.js';
import { AUDIO, saveAudio, unlock, sfx, bgm, syncBgm, primeAudio } from './sfx.js';
import { createGame, loadSave, clearSave } from './game.js';
import { render, toScene, hitStation, hitActor, nearBuild } from './scene.js';
import { stepTo, nearestWalk } from './walk.js';

const $ = s => document.querySelector(s);
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const WEIGHT = ['', 'เล็กน้อย', 'ปานกลาง', 'หนัก', 'หนักมาก', 'มหันต์'];
const INTENSITY = ['', 'ว่ากล่าว', 'เบา', 'ปานกลาง', 'หนัก', 'สาสม'];

const g = createGame();
const SAVED = loadSave();
if (SAVED) g.restore(SAVED);
const cv = $('#cv'), ctx = cv.getContext('2d');
let V3 = null, mode = '2d';        // มุมมอง 3D ปิดไว้ ดูหมายเหตุท้ายไฟล์
let tab = 'quiz', hover = null, acc = 0, last = performance.now();

/** ตัววาดฉากต่อสู้ซ้ำ — openBattle ตั้งค่าไว้ ปิดฉากแล้วเคลียร์เป็น null
 *  ลูปเฟรมใช้ตัวนี้เปิดกล่องกลับให้ ถ้าฉากยังไม่จบแต่กล่องหายไป
 *  (มี close หลุดเข้ามาได้หลายทาง — โมดัลอื่นมาแทรก, Esc, เบราว์เซอร์เอง)
 *  ผู้เล่นต้องไม่มีทาง "ค้างอยู่กับฉากต่อสู้ที่มองไม่เห็น" เด็ดขาด */
let battleUI = null;

// เฝ้าด้วย timer ไม่ใช่ลูปเฟรม — requestAnimationFrame หยุดสนิทเมื่อแท็บอยู่หลังจอ
// (เจอตอนทดสอบ 8 ก.ย. 2569: สลับแท็บกลางฉากต่อสู้แล้วกล่องหาย ไม่มีอะไรเปิดกลับให้)
setInterval(() => {
  if (battleUI && g.battle && !g.battle.over && !dlg.open) battleUI();
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
  if (mode === '3d' && V3) { V3.render(g, now); placeMarks(); }
  else render(ctx, g, now, hover, sel);
  followMarks(); drawAtk();
  requestAnimationFrame(frame);
}

// ---------- แถบทรัพยากร ----------
function bar(v, cls = '') { return `<span class="bar ${cls}"><i style="width:${Math.round(v)}%"></i></span>`; }

function drawRes() {
  const avg = g.casesDone ? Math.round(g.scoreSum / g.casesDone) : 0;
  const ot = g.orderTier(), kt = g.karmaTier();
  $('#res').innerHTML = `
    <span class="chip tap" data-ex="coin">🪙 <b>${g.coin}</b></span>
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
    <div class="tline bad"><b>ถ้าหมด (0)</b><div>จบเกม — คิวล้นจนวิญญาณเดินกลับขึ้นไปเองได้ พญายมส่งคนมารับตำแหน่งคืน</div></div>
    <div class="row"><button class="gold" data-close>เข้าใจแล้ว</button></div>`);

  if (k === 'karma') return modal(`<h2>☠️ กรรมท่าน — ${g.karma.toFixed(1)} (${esc(g.karmaTier().name)})</h2>
    <p style="font-size:var(--text-sm);line-height:var(--leading-body)">
      บาปที่ <b>ตกใส่ตัวท่านเอง</b> ไม่ใช่ของวิญญาณ — แกนของเกมทั้งเกมคือ
      "ทัณฑ์ที่เกินกรรม มันไม่ได้หายไปไหน มันมาอยู่ที่ผู้ตัดสิน"</p>
    <div class="tline"><b>ขึ้นเมื่อ</b><div>ลงทัณฑ์เกินกรรมที่เขาก่อ (ยิ่งเกินยิ่งหนัก) · ส่งผิดชนิดกรรม (+4) ·
      ซัดไฟเร่งทัณฑ์เอง (+${BAL.smiteKarma}) · ใช้สะกดจิต (+4) · ตวาดข่มขู่ (+0.5)</div></div>
    <div class="tline good"><b>ลดได้ยังไง</b><div>ตัดสินได้ห้าดาว −${KARMA_RELIEF.star5} ·
      เก็บ<b>ดอกบัวบูชา</b>ที่ตกบนแผนที่ (ตกให้เมื่อกรรมเกิน 40) −4 ·
      บูชาดอกบัวที่<b>ศาลาน้ำชา</b> ${KARMA_RELIEF.lotusCost} เบี้ย −${KARMA_RELIEF.lotusCut} (แท็บก่อสร้าง)</div></div>
    ${tiers(KARMA_TIERS, g.karmaTier(), t => '≤' + t.max)}
    <div class="tline bad"><b>ถ้าเต็ม (100)</b><div>จบเกม — ชื่อของท่านไปโผล่อยู่ในคิวเอง เป็นสำนวนที่หนาที่สุดที่โซนนี้เคยรับ</div></div>
    <div class="row"><button class="gold" data-close>เข้าใจแล้ว</button></div>`);

  if (k === 'fuel') return modal(`<h2>🔥 ฟืน — ${Math.round(g.fuel)} ดุ้น</h2>
    <p style="font-size:var(--text-sm);line-height:var(--leading-body)">
      เชื้อไฟใต้สถานี แต่ละสถานีกินไม่เท่ากัน (กระทะทองแดงกินหนักสุด · โลกันตนรกไม่กินเลย)</p>
    <div class="tline bad"><b>ถ้าหมด</b><div>สถานีที่ต้องใช้ไฟ<b>หยุดทำงานทันที</b> คดีค้าง คิวล้น ระเบียบตกตามไปด้วย —
      ไม่จบเกมทันที แต่พาไปจบทางระเบียบได้</div></div>
    <div class="tline"><b>เติมยังไง</b><div>ซื้อที่แท็บก่อสร้าง (${BAL.fuelPrice * 10} เบี้ย/10 ดุ้น) หรือเดินไปเก็บ<b>มัดฟืน</b>บนแผนที่</div></div>
    <div class="row"><button class="gold" data-close>เข้าใจแล้ว</button></div>`);

  return modal(`<h2>🪙 เบี้ยกรรม — ${g.coin}</h2>
    <p style="font-size:var(--text-sm);line-height:var(--leading-body)">
      เงินของโซน ใช้สร้างสถานี จ้างยมทูต ซื้อฟืน และบูชาดอกบัว</p>
    <div class="tline"><b>ได้จาก</b><div>ปิดคดี (คูณด้วยระเบียบของโซน) · สี่ดาว +25 · ห้าดาว +60 ·
      ปราบเปรต +${MOB.bounty} · ตรวจการผ่าน +150</div></div>
    <div class="tline"><b>เสียไปกับ</b><div>ค่าแรงยมทูตทุก ${BAL.payEvery} วาระ · ค่าสร้าง · ค่าจ้าง · ค่าฟืน</div></div>
    <div class="tline bad"><b>ถ้าติดลบถึง −300</b><div>จบเกม — ยมทูตวางเครื่องมือแล้วเดินออกไปพร้อมกัน</div></div>
    <div class="row"><button class="gold" data-close>เข้าใจแล้ว</button></div>`);
}

// ---------- แผงข้าง ----------
function deedLine(d) {
  return `<span class="tag" style="background:${SINS[d.s].color}22;color:${SINS[d.s].color}">${SINS[d.s].name}</span>${esc(d.t)} <b style="color:var(--warning)">· ${WEIGHT[d.w]}</b>`;
}

/** รูปหน้าเล็กในรายชื่อ — ไม่มีไฟล์โปรไฟล์ก็ถอยไปเป็นอีโมจิตัวเดิม */
function face(key, glyph) {
  return `<span class="g"><img src="img/${key}-profile.png" alt=""
    onerror="this.parentNode.textContent='${glyph}'"></span>`;
}

/** แผงไต่สวน — มินิเกมหลักของ Phase 2
 *  ซ้ายมือคือสิ่งที่สำนวนเขียนไว้ · ล่างคือคำให้การของเขา
 *  ผู้เล่นต้องเทียบเองว่าบรรทัดไหน "ขัดกับสำนวน" แล้วจี้บรรทัดนั้น */
function drawQuiz(b) {
  const s = g.queue[0];
  if (!s) { b.innerHTML = '<div class="empty">ยังไม่มีใครยืนอยู่หน้าแท่น — กดเดินวาระให้เรือพาคนข้ามมา</div>'; return; }

  const known = s.deeds.filter(d => d.known);
  const claimed = s.merits.filter(m => !m.exposed);
  b.innerHTML = `<div class="quiz">
    ${s.back ? `<div class="back">↩️ <b>คนนี้เคยผ่านมือท่านมาแล้ว</b> — สำนวน #${String(s.back.id).padStart(3, '0')}
        ท่านให้ไป <b>${s.back.gave} วาระ</b> แล้วปล่อยกลับไป</div>` : ''}
    <div class="head"><b>${s.name ? esc(s.name) + ' <span style="opacity:.6;font-weight:400">· ' + esc(s.who) + '</span>' : esc(s.who)}
        <span class="id">#${String(s.id).padStart(3, '0')}</span></b>
      <span class="press">จี้ได้อีก <b>${s.presses}</b> ครั้ง</span></div>
    <button class="gold" id="q-trial" style="width:100%;margin-bottom:9px">🔍 เริ่มการสอบสวน</button>
    ${s.face ? `<div class="dossier${s.pure ? ' pure' : ''}"><b>ภาพลักษณ์</b> — ${esc(s.face)}</div>` : ''}

    <div class="sec" style="margin-top:0">สำนวนที่นิราอ่านให้ฟัง</div>
    ${known.map(d => `<div class="deed">${deedLine(d)}</div>`).join('') || '<div class="deed">สำนวนว่างเปล่า</div>'}
    ${claimed.map(m => `<div class="deed" style="color:var(--success)">🪷 ${esc(m.t)}
        ${m.note ? `<i style="color:var(--warning)">— ${esc(m.note)}</i>`
                 : '<i style="color:var(--muted-foreground)">(เขาอ้างเอง ยังไม่มีใครยืนยัน)</i>'}</div>`).join('')}

    <div class="sec">คำให้การของเขา — <b style="color:var(--gold)">จี้บรรทัดที่ขัดกับสำนวน</b></div>
    ${s.lines.map(l => {
      const cls = !l.used ? '' : l.kind === 'solid' ? 'miss' : 'hit';
      return `<button class="say ${cls}" data-line="${l.i}" ${l.used || s.presses <= 0 ? 'disabled' : ''}>
        <span class="q">“</span>${esc(l.t)}<span class="q">”</span></button>`;
    }).join('')}

    <div class="sec">สิ่งที่ปรากฏบนโต๊ะแล้ว</div>
    ${s.said.slice(-7).map(x =>
      `<div class="row-truth ${x.kind === 'truth' || x.kind === 'confess' ? 'hid' : ''}">${esc(x.text)}</div>`).join('')
      || '<div class="row-truth">ยังไม่มีอะไร</div>'}
    <div class="sec"></div>
    <div style="font-size:var(--text-xs);color:var(--muted-foreground);line-height:1.7">
      จี้ถูก = ได้ความจริงมา<b>ฟรี</b> ไม่ต้องเสียพลังสักอย่าง · จี้ผิด = เสียจังหวะไปเปล่า ๆ<br>
      ถ้าอ่านไม่ออกจริง ๆ ยังใช้ <b>พลังของท่าน</b> ที่แถบบนได้เหมือนเดิม แต่ของมีจำกัด
    </div></div>`;

  const qt = b.querySelector('#q-trial');
  if (qt) qt.onclick = openTrial;
  b.querySelectorAll('[data-line]').forEach(el => el.onclick = () => {
    const r = g.press(s, +el.dataset.line);
    if (r) sfx(r.some(x => x.kind === 'truth' || x.kind === 'confess') ? 'crack' : 'deny');
    refresh();
  });
}

function drawTab() {
  const b = $('#tabbody');
  if (tab === 'quiz') return drawQuiz(b);
  if (tab === 'queue') {
    if (!g.queue.length && !g.held.length) { b.innerHTML = '<div class="empty">คิวว่าง — โซนนี้สงบผิดปกติ</div>'; return; }
    const cap = g.queueCap(), over = g.queue.length - cap;
    b.innerHTML = `<div style="font-size:var(--text-xs);margin-bottom:8px;color:${over > 0 ? 'var(--destructive)' : 'var(--muted-foreground)'}">
        คิว ${g.queue.length}/${cap} ดวง${over > 0 ? ` · <b>ล้น ${over} ดวง ระเบียบกำลังตก</b>`
          : ' · เกินความจุแล้วระเบียบจะเริ่มตก'}${g.has('tarang')
            ? ` · 🔒 ตะราง ${g.held.length}/${TARANG.hold}` : ''}</div>`;
    b.innerHTML += g.queue.map(s => `
      <div class="soul" data-soul="${s.id}">
        <div class="top"><b>${s.name ? esc(s.name) + ' · ' : ''}${esc(s.who)}${s.back ? ' <span style="color:var(--destructive);font-size:var(--text-xs)">↩️ กลับมาอีกครั้ง</span>' : ''}</b><span class="id ${s.waited > 40 ? 'wait' : ''}">#${String(s.id).padStart(3, '0')} · รอ ${s.waited} วาระ</span></div>
        ${s.deeds.map(d => `<div class="deed">${deedLine(d)}</div>`).join('')}
        ${s.merits.map(m => `<div class="deed" style="color:var(--success)">🪷 ${esc(m.t)}${m.v ? '' : ' <i>(ไม่นับเป็นบุญ)</i>'}</div>`).join('')}
      </div>`).join('');
    // คนที่ถูกขังอยู่ — ไม่นับในคิว ไม่กัดระเบียบ แต่กินค่าข้าวทุกวาระ เบิกตัวขึ้นแท่นได้ตลอด
    if (g.held.length) {
      b.innerHTML += `<div class="sec">🔒 อยู่ในตะราง — ค่าข้าว ${(TARANG.feed * g.held.length).toFixed(1)} เบี้ยต่อวาระ</div>`
        + g.held.map(s => `
        <div class="soul" style="border-color:var(--input)">
          <div class="top"><b>${s.name ? esc(s.name) + ' · ' : ''}${esc(s.who)}</b>
            <span class="id">#${String(s.id).padStart(3, '0')} · ขังมา ${s.waited} วาระ</span></div>
          ${s.deeds.filter(d => d.known).map(d => `<div class="deed">${deedLine(d)}</div>`).join('')}
          <button class="sm" data-free="${s.id}" style="margin-top:6px">🔓 เบิกตัวขึ้นแท่น</button>
        </div>`).join('');
      b.querySelectorAll('[data-free]').forEach(x =>
        x.onclick = e => { e.stopPropagation(); g.release(+x.dataset.free); refresh(); });
    }
    b.querySelectorAll('[data-soul]').forEach(x =>
      x.onclick = () => {                       // เรียกคดีนี้ขึ้นมาที่แท่นก่อน
        const i = g.queue.findIndex(s => s.id === +x.dataset.soul);
        if (i > 0) g.queue.unshift(g.queue.splice(i, 1)[0]);
        pick = { st: null, cr: null, inten: 3 };
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
           ยังจ้างได้ · เบี้ยกรรมของท่านตอนนี้ ${g.coin}</div>`
      + (canHire.length ? canHire.map(c => `
      <div class="crew">
        ${face('crew-' + c.k, c.glyph)}
        <span class="n"><b>${c.name}</b> <span class="st" style="display:inline">— ${esc(c.duty)}</span>
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
  const fallback = `this.onerror=function(){this.style.visibility='hidden'};`
                 + `this.src='img/${imgKey}.png';this.classList.remove('full')`;
  return `<div class="prof">
    <img class="full" src="img/${imgKey}-profile.png" alt=""
         onerror="${fallback}" onload="if(!this.src.includes('-profile'))this.classList.remove('full')">
    <div class="hd"><b>${esc(name)}</b>
      <div class="duty">${esc(duty)}</div>
      <div class="now">${now}</div></div></div>`;
}
const think = t => `<div class="think">${esc(t)}</div>`;
const kv = arr => `<div class="kv">${arr.map(x => `<span>${x}</span>`).join('')}</div>`;

/** ความคิดของยมบาท — เปลี่ยนตามสถานะจริง ไม่ใช่ประโยคตายตัว */
function meThought() {
  if (g.hp <= g.hpMax * 0.35) return '"บารมีเหลือเท่านี้ ถ้าพลาดอีกครั้งสองครั้งพ่อคงเรียกกลับ"';
  if (g.karma >= 45) return '"บัญชีของข้าหนาขึ้นทุกคดี... ทัณฑ์ที่เกินกรรมมันมาอยู่ที่ข้าจริง ๆ"';
  if (g.queue.length > g.queueCap()) return '"คิวล้นขนาดนี้ ระเบียบไม่มีทางขึ้น ต้องรีบปิดคดี"';
  if (g.mobs.length) return '"เปรตขึ้นมาอีกแล้ว ปล่อยไว้ระเบียบตกไปเรื่อย ๆ"';
  if (g.fuel < 12) return '"ฟืนใกล้หมด ไฟใต้กระทะดับเมื่อไหร่ทุกอย่างหยุด"';
  if (g.star5 >= 3) return '"ห้าดาวมาสามครั้งแล้ว อีกสองครั้งก็เลื่อนขั้น"';
  return '"พิพากษาให้ตรงกรรม ไม่ใช่ให้แรงที่สุด — พ่อพูดไว้แบบนั้น"';
}

/** เฉลยคดี: ความจริงทั้งหมด vs สิ่งที่เราสั่งไป */
function verdictCard(soul, r, stK, crewK, intensity, closed) {
  const st = STATIONS.find(d => d.k === stK);
  const hit = st && soul.deeds.some(d => st.tags.includes(d.s));
  const truth = soul.deeds.map(d =>
    `<div class="row-truth ${d.known ? '' : 'hid'}">${SINS[d.s].name} · ${esc(d.t)} (น้ำหนัก ${d.w})${d.known ? '' : ' ← เรื่องที่สำนวนไม่ได้เขียนไว้'}</div>`).join('');
  const merit = soul.merits.map(m =>
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
}

/** เนื้อของแผงข้อมูลตามตัวที่เลือก */
function sideBody() {
  // ---- ตัวเรา ----
  if (sel.kind === 'me') {
    const pw = POWERS.map(p => {
      const q = g.powerOf(p.k);
      const state = g.casesDone < p.unlock ? `ล็อก (${p.unlock} คดี)` : q.ammo <= 0 ? 'หมด' : q.cd > 0 ? `รอ ${q.cd} คดี` : `พร้อม ×${q.ammo}`;
      return `<div class="row-truth">${p.glyph} <b>${esc(p.name)}</b> — ${esc(p.desc)} <span style="color:var(--gold)">[${state}]</span></div>`;
    }).join('');
    return profile('hero-yama', 'ยมบาท (ตัวท่าน)', LEVELS[g.level - 1].name,
        `ลูกของพญายม ถูกส่งมาคุมโซนสุวรรณภูมิ · ปิดคดีแล้ว ${g.casesDone} เรื่อง`)
      + think(meThought())
      + kv([`❤️ บารมี ${Math.round(g.hp)}/${g.hpMax}`, `☠️ กรรม ${g.karma.toFixed(1)}`,
            `⭐ ห้าดาว ${g.star5}`, `📁 เฉลี่ย ${g.casesDone ? Math.round(g.scoreSum / g.casesDone) : 0}`,
            `🪙 ${g.coin}`, `🔥 ฟืน ${Math.round(g.fuel)}`, `🔥 ลูกไฟ ×${g.powerOf('roar').ammo}`])
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
    const now = st && st.soul
      ? `กำลังคุม <b>${esc(st.soul.who)}</b> สำนวน #${String(st.soul.id).padStart(3, '0')} ที่${esc(st.def.name)}
         · ระดับวาระ ${st.intensity} · คืบหน้า ${Math.round(100 * st.progress / st.need)}%`
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
         ${c.morale < 40 ? '<div class="row-truth hid">กำลังใจต่ำ — ทำงานช้าลง ควรให้พักที่ศาลาน้ำชา</div>' : ''}`;
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
      + think(kd.line)
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
      const rec = q.deeds.filter(d => d.known)
        .map(d => `<div class="row-truth">${SINS[d.s].name} · ${esc(d.t)} · ${WEIGHT[d.w]}</div>`).join('')
        || '<div class="row-truth">สำนวนว่างเปล่า</div>';
      const said = q.said.map(x => `<div class="row-truth ${SAID_STYLE[x.kind] || ''}">${esc(x.text)}</div>`).join('')
        || '<div class="row-truth">...เขาก้มหน้าไม่พูดอะไร</div>';
      return profile('spirit' + (q.sp || 7), q.who, `สำนวน #${String(q.id).padStart(3, '0')} · รอคิว ${q.waited} วาระ`,
          q.hard ? 'สำนวนหนาผิดปกติ — คดีนี้ถูกกับผิดปนกัน' : 'รอขึ้นแท่นพิพากษา')
        + `<div class="sec">สำนวนที่นิราอ่านได้</div>${rec}
           <div class="sec">เขาพูดว่า</div>${said}
           <div class="hintline">ยังไม่ลงทัณฑ์ — ความจริงที่เหลือต้องใช้พลังขุดเอา
             เฉลยจะขึ้นตรงนี้หลังปิดคดีแล้ว</div>`;
    }
    const st = g.stations.find(s => s.soul && s.soul.id === sel.key);
    if (st) return profile('spirit' + (st.soul.sp || 7), st.soul.who, `สำนวน #${String(st.soul.id).padStart(3, '0')} · กำลังรับทัณฑ์`,
        `${esc(st.def.name)} · คืบหน้า ${Math.round(100 * st.progress / st.need)}%`)
      + verdictCard(st.soul, st.verdict || g.judge(st), st.def.k, st.crewK, st.intensity, false);
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
  return profile('spirit' + (cl.soul.sp || 7), cl.soul.who, `สำนวน #${String(cl.soul.id).padStart(3, '0')} · ปิดคดีแล้ว`,
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
  const s0 = g.queue[0];
  $('#tab-quiz').textContent  = `ไต่สวน${s0 && s0.presses > 0 ? ` · จี้ได้ ${s0.presses}` : ''}`;
  $('#tab-queue').textContent = `คิววิญญาณ${g.queue.length ? ` (${g.queue.length})` : ''}`
    + (g.held.length ? ` · 🔒${g.held.length}` : '');
  $('#tab-crew').textContent  = `ยมทูต${hire ? ` · จ้างได้ ${hire}` : ''}`;
  $('#tab-build').textContent = `ก่อสร้าง${build ? ` · สร้างได้ ${build}` : ''}`;
  for (const el of document.querySelectorAll('.tabs [data-tab]'))
    el.setAttribute('aria-selected', el.dataset.tab === tab ? 'true' : 'false');
}

/** ปุ่มฟาดเปรต — โผล่เฉพาะตอนมีเปรตในโซน และบอกตรง ๆ ว่าลูกไฟเหลือเท่าไหร่ */
let atkSig = '';
function drawAtk() {
  const btn = $('#atk'), fire = g.powerOf('roar');
  // ปุ่มต้องบอกให้ตรงกับสิ่งที่ attack() จะทำจริงตอนกด — ลำดับเดียวกันเป๊ะ
  //   เปรตประชิด → ฟาดฟรี · ยืนที่สถานี → ซัดไฟเร่งทัณฑ์ · เปรตในระยะขว้าง+มีลูกไฟ → ขว้าง · ไกล → เดินไปหา
  const n = g.over ? null : g.nearestMob();
  const st = g.over ? null : g.stationInReach();
  const near = n && n.d <= MOB.reach;
  const canThrow = n && !near && n.d <= MOB.throw && fire.ammo > 0;
  const sig = `${g.mobs.length}/${fire.ammo}/${g.over ? 1 : 0}/${st ? st.def.k : ''}/${near ? 1 : canThrow ? 2 : 0}`;
  if (sig === atkSig) return;                  // เรียกได้ทุกเฟรม แต่แตะ DOM เฉพาะตอนเปลี่ยนจริง
  atkSig = sig;
  btn.hidden = !!g.over || (!g.mobs.length && !st);
  if (btn.hidden) return;

  const [label, color] =
      near     ? [`⚔️ ฟาดเปรต (${g.mobs.length})`, 'var(--destructive)']
    : st       ? [`🔥 ซัดไฟเร่งทัณฑ์ที่${st.def.name}`, 'var(--gold)']
    : canThrow ? [`🔥 ขว้างลูกไฟใส่เปรต · ×${fire.ammo}`, 'var(--gold)']
    : n        ? [`🏃 เดินไปหาเปรต (${g.mobs.length}) แล้วฟาด`, 'var(--muted-foreground)']
                : ['⚔️ ฟาด', 'var(--gold)'];
  btn.textContent = label;
  btn.style.color = color;
}

function refresh() { drawRes(); drawTabHeads(); drawTab(); drawSide(); drawOverlay(); drawDeck(); drawAtk(); drawCoach(); }

document.querySelectorAll('.tabs [data-side]').forEach(el =>
  el.onclick = () => { side = el.dataset.side; drawSide(); });

document.querySelectorAll('.tabs [data-tab]').forEach(el =>
  el.onclick = () => { tab = el.dataset.tab; refresh(); });   // เดิมไม่มีตัวจัดการเลย กดแท็บไม่ติดทั้งเกม

$('#atk').onclick = () => { g.attack(); refresh(); };

// ---------- โมดัล ----------
const dlg = $('#dlg');
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
let pick = { st: null, cr: null, inten: 3 };   // สิ่งที่เลือกไว้สำหรับคดีที่อยู่หน้าแท่น
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

/** วางตำแหน่ง element ที่ผูกพิกัดฉากไว้ — โหมด 2D ใช้ % ตรง ๆ โหมด 3D ต้องฉายจากกล้อง */
function place(d) {
  const sx = +d.dataset.sx, sy = +d.dataset.sy;
  if (mode === '3d' && V3) {
    const [lx, ly, front] = V3.project(sx, sy, +(d.dataset.sh || 0));
    d.style.left = lx + '%'; d.style.top = ly + '%';
    d.style.visibility = front ? '' : 'hidden';
  } else {
    d.style.left = pctX(sx); d.style.top = pctY(sy);
    d.style.visibility = '';
  }
}
function placeMarks() { for (const d of ov.children) if (d.dataset.sx) place(d); }

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
  ov.innerHTML = '';
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

  const rec = s.deeds.filter(d => d.known)
    .map(d => `<div class="line">${deedLine(d)}</div>`).join('')
    || '<div class="line">สำนวนว่างเปล่า ดิฉันเองก็ยังไม่รู้ว่าเขาทำอะไรมา</div>';
  // หมุดของนิราต้องตามตัวจริงไปด้วย — เธอเดินเตร็ดเตร่ และย้ายที่ถ้าไปรับเวรที่สถานี
  const nira = g.crewOf('nira');
  const post = nira && nira.at ? STATIONS.find(d => d.k === nira.at) : null;
  const nx = nira?.x ?? (post ? post.x : (nira ? nira.hx : 660));
  const ny = nira?.y ?? (post ? post.y : (nira ? nira.hy : 400));
  const nm = mark('', nx, ny - CH - 8, '📜',
    `<span class="who">นิรา · สำนวน #${String(s.id).padStart(3, '0')}</span>ผู้ตายเป็น<b>${esc(s.who)}</b>${rec}`);
  if (nira) nm.dataset.follow = 'nira';        // เธอเดินเตร็ดเตร่ หมุดต้องตามหัวไปทุกเฟรม

  const said = s.said.slice(-6).map(x =>
    `<div class="line ${SAID_STYLE[x.kind] || ''}">${SAID_ICON[x.kind] || ''} ${esc(x.text)}</div>`).join('')
    || '<div class="line">...เขาก้มหน้าไม่พูดอะไร</div>';
  const hasNew = s.said.some(x => x.kind === 'truth' || x.kind === 'confess' || x.kind === 'false');
  mark('soul', QUEUE_LINE[0][0], QUEUE_LINE[0][1] - CH - 8, hasNew ? '❗' : '💬',
    `<span class="who">${esc(s.who)}</span>${said}`);
}

/** แถบบัญชาการเหนือฉาก — พลัง · ปลายทาง · ผู้คุม · ระดับวาระ · ออกหมาย */
function drawDeck() {
  const s = g.queue[0];
  if (!s || g.over) {
    deckBar.innerHTML = '<div class="idle">ยังไม่มีวิญญาณยืนอยู่หน้าแท่น — กดเดินวาระให้เรือพาคนข้ามมา</div>';
    return;
  }
  // เดิมซ่อนสถานีที่ไม่ว่างทิ้งไปเลย — ผู้เล่นจึงเห็นแค่ "ไม่มีที่ให้ส่ง" โดยไม่รู้ว่าเพราะอะไร
  // (เจ้าของเจอ 8 ก.ย. 2569: สำนวนฉ้อโกง แต่กระทะทองแดงหายไปจากรายการเพราะกำลังใช้อยู่)
  // ตอนนี้โชว์ทุกหลังที่สร้างแล้ว หลังที่ติดงานเป็นปุ่มกดไม่ได้ + บอกว่าเหลืออีกกี่ %
  const dests = g.stations.filter(x => x.def.pow > 0);
  const free = dests.filter(x => !x.soul);
  // นิราไม่อยู่ในลิสต์ (เธออ่านสำนวน ไม่ลงทัณฑ์) · ท่านเองต่อท้ายเสมอ เผื่อคนไม่พอ
  // ท่านคุมได้ทีละสถานีเท่านั้น — ยืนอยู่สองที่พร้อมกันไม่ได้
  const meBusy = g.stations.some(x => x.crewK === 'me' && x.soul);
  const idle = meBusy ? g.freeCrew() : [...g.freeCrew(), g.self];
  if (pick.st && !free.some(x => x.def.k === pick.st)) pick.st = null;
  const heavenPick = !!(pick.st && STATIONS.find(d => d.k === pick.st)?.heaven);
  if (pick.cr && !idle.some(c => c.k === pick.cr)) pick.cr = null;

  deckBar.innerHTML = `
    <div class="grp"><span class="lb">พลังของท่าน</span>
      <div class="row2" id="d-pw">${POWERS.map(p => {
        const pw = g.powerOf(p.k), ready = g.powerReady(p.k);
        const why = g.casesDone < p.unlock ? `ล็อก · ${p.unlock} คดี`
                  : pw.ammo <= 0 ? 'หมด — เดินไปเก็บ'
                  : pw.cd > 0 ? `รอ ${pw.cd} คดี` : `×${pw.ammo}`;
        return `<button data-k="${p.k}" ${ready ? '' : 'disabled'} title="${esc(p.desc)}">${p.glyph} ${p.name} <span style="opacity:.55">${why}</span></button>`;
      }).join('')}</div></div>

    <div class="grp"><span class="lb">ส่งไปที่ไหน</span>
      <div class="row2" id="d-st">${dests.length ? dests.map(x => {
        const busy = !!x.soul;
        const pct = busy ? Math.round(100 * x.progress / x.need) : 0;
        return `<button data-k="${x.def.k}" ${busy ? 'disabled' : ''}
           ${x.def.k === pick.st ? 'aria-pressed="true"' : ''}
           title="${busy ? 'กำลังลงทัณฑ์อยู่ — รอให้ว่างก่อน หรือกดพักคดีนี้ไว้' : esc(x.def.desc)}"
          >${x.def.glyph} ${x.def.name}<span style="opacity:.55"> ${busy ? `ไม่ว่าง ${pct}%`
            : (x.def.tags.map(t => SINS[t].name).join('/') || 'ทั่วไป')}</span></button>`;
      }).join('') : '<span class="idle">ยังไม่ได้สร้างสถานีลงทัณฑ์สักหลัง — ไปที่แท็บก่อสร้าง</span>'}</div></div>

    <div class="grp"><span class="lb">ใครคุม</span>
      <div class="row2" id="d-cr">${!idle.length ? '<span class="idle">ไม่มีใครว่าง — รอผู้คุมออกเวร หรือจ้างเพิ่มที่แท็บยมทูต</span>' : idle.map(c =>
        `<button data-k="${c.k}" ${c.k === pick.cr ? 'aria-pressed="true"' : ''}
           title="${esc(c.self ? 'สถานีจะเดินเฉพาะตอนท่านยืนอยู่ตรงนั้น และช้ากว่ายมทูต' : c.duty || '')}"
          >${c.glyph} ${c.name}<span style="opacity:.55"> ${c.self ? 'ช้า · ต้องไปยืนเอง' : Math.round(c.morale)}</span></button>`).join('')}</div></div>

    <div class="grp"><span class="lb">${heavenPick ? 'ส่งกลับชั้นฟ้า' : 'หนักแค่ไหน'}</span>
      <div class="row2" id="d-in">${heavenPick
        ? '<span class="idle">ไม่มีวาระให้เลือก — ประตูสวรรค์ไม่ใช่ที่ลงทัณฑ์</span>'
        : [1, 2, 3, 4, 5].map(i =>
        `<button data-v="${i}" ${i === pick.inten ? 'aria-pressed="true"' : ''}>${i} ${INTENSITY[i]}</button>`).join('')}</div></div>

    <div class="grp go" style="align-items:flex-end">
      <div class="row2">
        <button id="d-skip" ${g.queue.length > 1 ? '' : 'disabled'}
          title="เลื่อนคดีนี้ไปท้ายคิว ให้คนถัดไปขึ้นแทน — ฟรี ไม่มีโทษ">⏭️ พักคดีนี้ไว้</button>
        ${g.has('tarang')
          ? `<button id="d-jail" ${g.jailFree() > 0 ? '' : 'disabled'}
               title="ขังไว้ในตะรางก่อน ออกจากคิวเลย แลกกับค่าข้าวทุกวาระ"
               >🔒 ขังไว้ก่อน <span style="opacity:.55">${g.held.length}/${g.jailFree() + g.held.length}</span></button>`
          : `<button disabled title="ต้องสร้างตะรางรอวาระก่อน (แท็บก่อสร้าง)">🔒 ขังไว้ก่อน <span style="opacity:.55">ยังไม่มีตะราง</span></button>`}
        <button class="gold" id="d-go" ${pick.st && pick.cr ? '' : 'disabled'}
          >${g.needBattle(s) ? '⚔️ ประทับตรา (เขาจะสู้)' : '⚖️ ออกหมาย'}</button>
      </div>
    </div>`;

  deckBar.querySelectorAll('#d-pw button').forEach(b => b.onclick = () => {
    g.usePower(b.dataset.k, s); drawRes(); drawSide(); drawOverlay(); drawDeck();
  });
  const sel = (id, key) => deckBar.querySelectorAll(`${id} button`).forEach(b =>
    b.onclick = () => { pick[key] = b.dataset.k ?? +b.dataset.v; drawDeck(); });
  sel('#d-st', 'st'); sel('#d-cr', 'cr'); sel('#d-in', 'inten');
  const sk = deckBar.querySelector('#d-skip');
  if (sk) sk.onclick = () => { if (g.defer()) { pick = { st: null, cr: null, inten: 3 }; sfx('deny'); refresh(); } };
  const jl = deckBar.querySelector('#d-jail');
  if (jl) jl.onclick = () => { if (g.jail(s.id)) { pick = { st: null, cr: null, inten: 3 }; sfx('stamp'); refresh(); } };
  const go = deckBar.querySelector('#d-go');
  if (go) go.onclick = () => {
    // ดวงที่ขัดขืนต้องปราบก่อนถึงจะลากเข้าสถานีได้ — แพ้แล้วเขากลับเข้าคิวไปยืนรอใหม่
    // (เส้นทางเดียวกับปุ่มออกหมายในห้องสอบสวน — ตัดสินจริงอยู่ที่ doVerdict ที่เดียว)
    const st = pick.st, cr = pick.cr, inten = pick.inten;
    if (g.needBattle(s)) {
      g.startBattle(s);
      openBattle(res => { if (res === 'win') doVerdict(s, st, cr, inten); else refresh(); });
      return;
    }
    doVerdict(s, st, cr, inten);
  };
}

const BOSS_LINE = {
  great:    '"นี่แหละที่เรียกว่าตรงกรรม" — ท่านคืนบารมีให้ส่วนหนึ่ง และสั่งจ่ายเบี้ยพิเศษ 40',
  ok:       'ท่านอ่านคำตัดสินจนจบ วางลง แล้วมองไปทางอื่น — ใช้ได้ ไม่ถึงกับดี',
  cruel:    '"ถูกฝาถูกตัว แต่เจ้าใส่เกินไปสองวาระ ส่วนเกินนั้นไม่ได้หายไปไหน มันมาอยู่ที่เจ้า"',
  bad:      '"เจ้าอ่านสำนวน หรือเจ้าเดา" — บารมีถูกหักต่อหน้าทุกคน',
  terrible: '"คำตัดสินแบบนี้ ทำให้คนที่เขาเจ็บมาแล้ว เจ็บซ้ำอีกครั้ง" — บารมีถูกหักหนัก',
};

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

function openNewGame() {
  const was = g.paused; g.paused = true; updatePlay();
  modal(`<h2>เริ่มเกมใหม่</h2>
    <p style="line-height:var(--leading-body);font-size:var(--text-sm)">
      เริ่มใหม่แล้ว<b>ความคืบหน้าที่บันทึกไว้จะหายทั้งหมด</b> —
      ตอนนี้อยู่วาระที่ ${g.tick} · ปิดคดีแล้ว ${g.casesDone} เรื่อง ·
      ${esc(LEVELS[g.level - 1].name)} ⭐${g.star5}</p>
    <div class="row"><button data-close>เล่นต่อ</button>
      <button class="gold" id="ngo">เริ่มใหม่</button></div>`,
    d => { d.querySelector('#ngo').onclick = restart; });
  onDlgClose(() => { g.paused = was; updatePlay(); });
}

/** โมดัลที่มีพญายมนั่งบัลลังก์อยู่ข้าง ๆ (รูปหายก็ยังอ่านได้) */
function bossModal(title, text, btn = 'รับทราบ') {
  const was = g.paused; g.paused = true; updatePlay();
  modal(`<h2>${esc(title)}</h2>
    <div class="boss">
      <img src="img/hero-boss-profile.png" alt=""
           onerror="this.onerror=function(){this.remove()};this.src='img/hero-boss.png';this.classList.add('standee')">
      <p style="line-height:var(--leading-body);margin:0;white-space:pre-line">${esc(text)}</p>
    </div>
    <div class="row"><button class="gold" data-close>${esc(btn)}</button></div>`);
  onDlgClose(() => { g.paused = was; updatePlay(); });
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
          <b>ทัณฑ์</b> คือผู้คุมคนเดียวที่มีตอนเริ่ม · ถ้าคนไม่พอ เลือก <b>⚖️ ท่านเอง</b> ลงไปคุมได้
          แต่สถานีจะเดินเฉพาะตอนท่านยืนอยู่ตรงนั้น และช้ากว่ายมทูต</li>
      <li><b>เดิน</b> — คลิกที่พื้น หรือกด WASD / ลูกศร ·
          ลงธารลาวาหรือแม่น้ำวิญญาณไม่ได้</li>
      <li>อ่านสำนวนจากหมุด 📜 เหนือหัว<b>นิรา</b> และคำแก้ตัวจากหมุด 💬 เหนือหัววิญญาณ (ชี้เมาส์ หรือแตะ)</li>
      <li><b>ไต่สวนก่อนตัดสิน</b> (แท็บ <b>ไต่สวน</b>) — เขาให้การ 4 บรรทัด
          บรรทัดไหน<b>ขัดกับสำนวนที่นิราเพิ่งอ่าน</b> ให้จี้บรรทัดนั้น
          จี้ถูก = เขาสารภาพเรื่องที่สำนวนไม่ได้เขียนไว้ให้<b>ฟรี</b> · จี้ผิด = เสียจังหวะไปเปล่า ๆ
          (จี้ได้ 2 ครั้งต่อคดี)</li>
      <li>ใช้พลังขุดความจริง — <b>มีจำนวนจำกัด</b> ใช้แล้วต้อง<b>เดินไปเก็บของบนแผนที่</b>มาเติม
          (หรือสร้าง<b>หอส่องกรรม</b>ให้เติมเอง)</li>
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
 *  ฉากหลังคือ img/BG-Turn-Base.jpeg (เจ้าของวาดมาให้ 8 ก.ย. 2569)
 *  ไม่มีไฟล์ก็ยังใช้ได้ พื้นหลังจะเป็นสีทึบตาม token แทน
 *  hp = null → โหมดสอบสวน (ไม่มีหลอดเลือด) · hp = ออบเจ็กต์ฉากต่อสู้ → โชว์หลอด */
function arena(title, foe, hp, shake, closable) {
  const bar = (v, max, cls, label) => hp === null ? '' : `
    <span class="hpbar ${cls}"><i style="width:${Math.max(0, Math.min(100, 100 * v / max))}%"></i></span>
    <span class="hpn">${label} ${Math.round(v)} / ${max}</span>`;
  const youImg = 'img/hero-yama.png';
  const foeSrc = typeof foe.sp === 'string' ? `img/${foe.sp}.png` : `img/spirit${foe.sp || 7}.png`;
  return `<div class="arena" style="background-image:url('img/BG-Turn-Base.jpeg')">
    ${closable ? '<button class="x" data-close title="ปิดห้องสอบสวน">✕</button>' : ''}
    <div class="ttl">${esc(title)}</div>
    <div class="fig you${shake === 'you' ? ' hit' : ''}">
      <img src="${youImg}" alt="" onerror="this.onerror=null;this.src='img/hero-yama-profile.png'">
      <span class="plate"><b>ท่าน</b><span class="sub">ยมบาทประจำ${esc(g.zoneDef().name)}</span>
        ${bar(hp ? hp.youHp : 0, hp ? hp.youMax : 1, '', 'บารมี')}</span>
    </div>
    <div class="fig foe${shake === 'foe' ? ' hit' : ''}">
      <img src="${foeSrc}" alt="" onerror="this.onerror=null;this.src='img/spirit7.png'">
      <span class="plate"><b>${esc(foe.name)}</b><span class="sub">${esc(foe.sub || '')}</span>
        ${bar(hp ? hp.foeHp : 0, hp ? hp.foeMax : 1, 'foe', 'กำลังใจ')}</span>
    </div>
  </div>`;
}

// ---------- ห้องสอบสวน ----------
// เจ้าของสั่ง 8 ก.ย. 2569: "ปรับเป็นเหมือนเกม Turn-Base RPG · เพิ่มตัวเลือกการลงทัณฑ์ให้ด้วย
// ใช้ item ได้ และถ้าวิญญาณบางตัวไม่ยอมรับ ก็จะมีต่อสู้"
// โครงจึงเป็น: เวทีข้างบน + เมนูคำสั่งสามช่อง (ไต่สวน / ของ / ตัดสิน) + บันทึกข้างล่าง
// ตัดสินจบได้ในห้องนี้เลย ไม่ต้องปิดออกไปกดที่แถบบัญชาการอีก
let trialTab = 'ask';                     // 'ask' | 'item' | 'judge'

function openTrial() {
  const s = g.queue[0];
  if (!s) return;
  const was = g.paused; g.paused = true; updatePlay();
  bgm('bgm-trial');
  trialTab = 'ask';
  let closing = false;

  const paint = () => {
    const known = s.deeds.filter(d => d.known);
    const claimed = s.merits.filter(m => !m.exposed);
    const dests = g.stations.filter(x => x.def.pow > 0);
    const meBusy = g.stations.some(x => x.crewK === 'me' && x.soul);
    const idle = meBusy ? g.freeCrew() : [...g.freeCrew(), g.self];
    if (pick.st && !dests.some(x => x.def.k === pick.st && !x.soul)) pick.st = null;
    if (pick.cr && !idle.some(c => c.k === pick.cr)) pick.cr = null;
    const heavenPick = !!(pick.st && STATIONS.find(d => d.k === pick.st)?.heaven);

    const body =
      trialTab === 'ask' ? `
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
          <b style="color:var(--gold);font-size:var(--text-sm)">เลือกข้ออ้างที่ขัดกับสำนวน</b>
          <span class="press">จี้ได้อีก <b>${s.presses}</b> ครั้ง</span></div>
        <div class="claims">${s.lines.map(l => {
          const cls = !l.used ? '' : l.kind === 'solid' ? 'miss' : 'hit';
          return `<button class="say ${cls}" data-line="${l.i}" ${l.used || s.presses <= 0 ? 'disabled' : ''}
            >${l.used ? (l.kind === 'solid' ? '✗ ' : '✓ ') : ''}<span class="q">“</span>${esc(l.t)}<span class="q">”</span></button>`;
        }).join('')}</div>`

      : trialTab === 'item' ? `
        <div style="margin-bottom:8px"><b style="color:var(--gold);font-size:var(--text-sm)">ใช้ของบีบให้สารภาพ หรือส่องความจริง</b></div>
        ${POWERS.map(p => {
          const pw = g.powerOf(p.k), ready = g.powerReady(p.k);
          const why = g.casesDone < p.unlock ? `ล็อกอยู่ — ต้องปิดคดีครบ ${p.unlock} เรื่อง`
                    : pw.ammo <= 0 ? 'หมดแล้ว — เดินไปเก็บบนแผนที่ หรือสร้างหอส่องกรรม'
                    : pw.cd > 0 ? `เพิ่งใช้ไป ต้องรออีก ${pw.cd} คดี` : `ใช้ได้ · เหลือ ${pw.ammo}`;
          return `<div class="shop"><span class="g">${p.glyph}</span>
            <span class="n"><b>${p.name}</b><div>${esc(p.desc)}</div>
              <div style="color:${ready ? 'var(--success)' : 'var(--muted-foreground)'}">${why}</div></span>
            <button class="sm" data-pw="${p.k}" ${ready ? '' : 'disabled'}>ใช้</button></div>`;
        }).join('')}`

      : `
        ${s.resist && !s.beaten ? `<div class="resist">⚔️ <b>ดวงนี้จะไม่ยอมเดินลงไปเอง</b> —
          พอท่านประทับตรา เขาจะขัดขืน ต้องปราบให้ได้ก่อนถึงจะลากเข้าสถานีได้</div>` : ''}
        ${s.pure ? '' : ''}
        <div class="verdictgrid">
          <div><span class="lb">ส่งไปที่ไหน</span><div class="row2" id="t-st">${dests.length ? dests.map(x => {
            const busy = !!x.soul;
            const pct = busy ? Math.round(100 * x.progress / x.need) : 0;
            return `<button data-k="${x.def.k}" ${busy ? 'disabled' : ''} ${x.def.k === pick.st ? 'aria-pressed="true"' : ''}
              >${x.def.glyph} ${x.def.name}<span style="opacity:.55"> ${busy ? `ไม่ว่าง ${pct}%`
                : (x.def.tags.map(t => SINS[t].name).join('/') || 'ทั่วไป')}</span></button>`;
          }).join('') : '<span class="idle">ยังไม่ได้สร้างสถานีลงทัณฑ์สักหลัง</span>'}</div></div>

          <div><span class="lb">ใครคุม</span><div class="row2" id="t-cr">${idle.length ? idle.map(c =>
            `<button data-k="${c.k}" ${c.k === pick.cr ? 'aria-pressed="true"' : ''}
              >${c.glyph} ${c.name}<span style="opacity:.55"> ${c.self ? 'ช้า · ต้องไปยืนเอง' : Math.round(c.morale)}</span></button>`).join('')
            : '<span class="idle">ไม่มีใครว่าง — รอผู้คุมออกเวร</span>'}</div></div>

          <div><span class="lb">${heavenPick ? 'ส่งกลับชั้นฟ้า' : 'หนักแค่ไหน'}</span>
            <div class="row2" id="t-in">${heavenPick
              ? '<span class="idle">ไม่มีวาระให้เลือก — ประตูสวรรค์ไม่ใช่ที่ลงทัณฑ์</span>'
              : [1, 2, 3, 4, 5].map(i =>
                `<button data-v="${i}" ${i === pick.inten ? 'aria-pressed="true"' : ''}>${i} ${INTENSITY[i]}</button>`).join('')}</div></div>

          <div class="row2" style="margin-top:2px">
            <button id="t-skip" ${g.queue.length > 1 ? '' : 'disabled'}>⏭️ พักคดีนี้ไว้</button>
            ${g.has('tarang')
              ? `<button id="t-jail" ${g.jailFree() > 0 ? '' : 'disabled'}>🔒 ขังไว้ก่อน <span style="opacity:.55">${g.held.length}/${TARANG.hold}</span></button>`
              : ''}
            <button class="gold" id="t-go" ${pick.st && pick.cr ? '' : 'disabled'} style="margin-left:auto"
              >${s.resist && !s.beaten ? '⚔️ ประทับตรา (เขาจะสู้)' : '⚖️ ออกหมาย'}</button>
          </div>
        </div>`;

    dlg.innerHTML = `
      ${arena(`สำนวน #${String(s.id).padStart(3, '0')}`,
              { name: s.name || s.who, sub: s.name ? s.who : 'ผู้ตาย', sp: s.sp || 7 }, null, null, true)}
      <div class="pad">
        ${s.face ? `<div class="dossier${s.pure ? ' pure' : ''}"><b>ภาพลักษณ์</b> — ${esc(s.face)}</div>` : ''}
        ${s.back ? `<div class="back">↩️ คนนี้เคยผ่านมือท่านมาแล้ว — สำนวน #${String(s.back.id).padStart(3, '0')}
            ท่านให้ไป <b>${s.back.gave} วาระ</b> แล้วปล่อยกลับไป</div>` : ''}

        <div class="sec" style="margin-top:0">สิ่งที่สำนวนเขียนไว้</div>
        ${known.map(d => `<div class="deed">${deedLine(d)}</div>`).join('') || '<div class="deed">สำนวนว่างเปล่า</div>'}
        ${claimed.map(m => `<div class="deed" style="color:var(--success)">🪷 ${esc(m.t)}
            ${m.note ? `<i style="color:var(--warning)">— ${esc(m.note)}</i>`
                     : '<i style="color:var(--muted-foreground)">(เขาอ้างเอง ยังไม่มีใครยืนยัน)</i>'}</div>`).join('')}

        <div class="cmd">
          <button data-cmd="ask"   ${trialTab === 'ask' ? 'aria-pressed="true"' : ''}>🗣️ ไต่สวน<small>จี้ได้อีก ${s.presses}</small></button>
          <button data-cmd="item"  ${trialTab === 'item' ? 'aria-pressed="true"' : ''}>🎒 ของ<small>${POWERS.filter(p => g.powerReady(p.k)).length} ชิ้นพร้อมใช้</small></button>
          <button data-cmd="judge" ${trialTab === 'judge' ? 'aria-pressed="true"' : ''}>⚖️ ตัดสิน<small>${s.pure ? 'ดูให้ดีก่อน' : 'เลือกทัณฑ์'}</small></button>
        </div>
        <div class="panelbox">${body}</div>

        <div class="sec">บันทึกการสอบสวน</div>
        <div class="blog">${s.said.slice(-8).map(x =>
          `<div style="${x.kind === 'truth' ? 'color:var(--gold)' : x.kind === 'confess' ? 'color:var(--warning)' :
                        x.kind === 'false' ? 'color:var(--destructive)' : ''}">${esc(x.text)}</div>`).join('')
          || '<div>ยังไม่มีอะไร — เขายืนก้มหน้าอยู่เฉย ๆ</div>'}</div>

        <div class="row"><button data-close>ปิดห้องสอบสวน</button></div>
      </div>`;

    dlg.querySelectorAll('[data-cmd]').forEach(el => el.onclick = () => { trialTab = el.dataset.cmd; paint(); });
    dlg.querySelectorAll('[data-line]').forEach(el => el.onclick = () => {
      const r = g.press(s, +el.dataset.line);
      if (r) sfx(r.some(x => x.kind === 'truth' || x.kind === 'confess') ? 'crack' : 'deny');
      paint(); refresh();
    });
    dlg.querySelectorAll('[data-pw]').forEach(el => el.onclick = () => {
      g.usePower(el.dataset.pw, s); sfx('crack'); paint(); refresh();
    });
    const bind = (id, key) => dlg.querySelectorAll(`${id} button`).forEach(b =>
      b.onclick = () => { pick[key] = b.dataset.k ?? +b.dataset.v; paint(); });
    bind('#t-st', 'st'); bind('#t-cr', 'cr'); bind('#t-in', 'inten');

    const sk = dlg.querySelector('#t-skip');
    if (sk) sk.onclick = () => { if (g.defer()) { sfx('deny'); closeTrial(); } };
    const jl = dlg.querySelector('#t-jail');
    if (jl) jl.onclick = () => { if (g.jail(s.id)) { sfx('stamp'); closeTrial(); } };

    const go = dlg.querySelector('#t-go');
    if (go) go.onclick = () => {
      // ดวงที่ขัดขืน: ปิดห้องสอบสวนแล้วเข้าฉากต่อสู้ ชนะค่อยออกหมายให้อัตโนมัติ
      if (g.needBattle(s)) {
        const st = pick.st, cr = pick.cr, inten = pick.inten;
        closeTrial();
        g.startBattle(s);
        openBattle(res => { if (res === 'win') doVerdict(s, st, cr, inten); else refresh(); });
        return;
      }
      doVerdict(s, pick.st, pick.cr, pick.inten);
      closeTrial();
    };
    dlg.querySelectorAll('[data-close]').forEach(b => b.onclick = closeTrial);
  };

  function closeTrial() {
    if (closing) return;
    closing = true;
    if (dlg.open) dlg.close();
  }

  paint();
  openDlg('rpg');
  onDlgClose(() => { g.paused = was; updatePlay(); bgm('bgm-zone'); refresh(); });
}

/** ออกหมายจริง — ใช้ร่วมกันระหว่างแถบบัญชาการกับห้องสอบสวน */
function doVerdict(soul, stK, crK, inten) {
  const heaven = !!STATIONS.find(d => d.k === stK)?.heaven;
  if (!g.assign(soul.id, stK, crK, heaven ? 1 : inten)) return false;
  sfx(heaven ? 'heaven' : 'stamp');
  pick = { st: null, cr: null, inten: 3 };
  if (g.pendingVerdict) showVerdict(g.pendingVerdict);
  refresh();
  return true;
}

// ---------- ฉากต่อสู้ ----------
// ใช้ทั้งกับวิญญาณที่ขัดขืน และกับพญายมตอนบารมีหมด (ฉากหลังไม่มีทางชนะ ตั้งใจให้แพ้)
function openBattle(after) {
  const B = g.battle;
  if (!B) return;
  bgm(B.kind === 'yama' ? 'bgm-yama' : 'bgm-battle');
  sfx('gong');
  let shake = null;

  const paint = () => {
    const b = g.battle;
    if (!b) return;
    const fireAmmo = g.powerOf('roar').ammo;
    const acts = b.over ? '' : `<div class="acts">
      <button data-act="atk">⚔️ ฟาด</button>
      <button data-act="fire" ${fireAmmo > 0 ? '' : 'disabled'}>🔥 ลูกไฟ <span style="opacity:.55">×${fireAmmo}</span></button>
      ${BATTLE.items.map(it => {
        const pw = it.power ? g.powerOf(it.power) : null;
        const ok = it.coin != null ? g.coin >= it.coin : (pw && pw.ammo > 0);
        const note = it.coin != null ? `${it.coin} เบี้ย` : `×${pw ? pw.ammo : 0}`;
        return `<button data-act="${it.k}" ${ok ? '' : 'disabled'}
          >${it.glyph} ${it.name} <span style="opacity:.55">${note}</span></button>`;
      }).join('')}
    </div>`;

    const done = b.over === 'win'
      ? '<div class="row"><button class="gold" data-fin>ลากเข้าสถานี</button></div>'
      : b.over === 'lose' && b.kind === 'yama'
      ? '<div class="row"><button class="gold" data-fin>...</button></div>'
      : b.over === 'lose'
      ? '<div class="row"><button data-fin>ปล่อยเขากลับเข้าคิว</button></div>' : '';

    dlg.innerHTML =
      arena(b.kind === 'yama' ? '👑 พญายมลงมาเอง' : '⚔️ วิญญาณขัดขืน',
            { name: b.who, sub: b.sub, sp: b.sp }, b, shake) +
      `<div class="pad">
        <div class="blog">${b.log.map(l => `<div>${esc(l)}</div>`).join('')}</div>
        ${acts}${done}
      </div>`;
    shake = null;

    dlg.querySelectorAll('[data-act]').forEach(el => el.onclick = () => {
      const k = el.dataset.act;
      const foeBefore = g.battle.foeHp, youBefore = g.battle.youHp;
      if (!g.battleAct(k)) return;
      sfx(k === 'fire' ? 'fire' : k === 'health' ? 'star' : 'hit');
      const nb = g.battle;
      shake = nb.foeHp < foeBefore ? 'foe' : nb.youHp < youBefore ? 'you' : null;
      if (nb && nb.over) sfx(nb.over === 'win' ? 'win' : 'lose');
      paint();
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
    dlg.removeEventListener('cancel', noEsc);
    dlg.removeEventListener('close', onClose);
    if (dlg.open) dlg.close();
    const done = g.endBattle();
    bgm('bgm-zone');
    updatePlay();
    refresh();
    if (after) after(done ? done.over : null);
  }

  const noEsc = e => { if (g.battle && !g.battle.over) e.preventDefault(); };
  const onClose = () => {
    // ฉากยังไม่จบ = ไม่นับว่าปิด · ตัวเฝ้าจะเปิดกล่องกลับให้เองภายในเสี้ยววินาที
    if (g.battle && !g.battle.over && reopen++ < 200) return;
    finish();
  };

  battleUI = () => { paint(); openDlg('rpg'); };
  battleUI();
  dlg.addEventListener('cancel', noEsc);
  dlg.addEventListener('close', onClose);
}

// ---------- ย้ายโซน ----------
function openZone() {
  const open = g.zonesOpen();
  const cur = g.zoneDef();
  const was = g.paused; g.paused = true; updatePlay();
  modal(`<h2>🗺️ ย้ายโซน</h2>
    <div class="hint">ตอนนี้ท่านคุม <b style="color:var(--gold)">${esc(cur.name)}</b> — ${esc(cur.sub)}</div>
    <p style="font-size:var(--text-sm);line-height:var(--leading-body)">
      ย้ายแล้ว <b>ยมทูต เบี้ยกรรม พลัง บารมี และกรรมของท่านติดตัวไปทั้งหมด</b> —
      แต่ <b style="color:var(--warning)">สถานีทัณฑ์ต้องสร้างใหม่ทั้งโซน</b> และคิวเดิมถูกโอนให้สาขาอื่นรับช่วง</p>
    ${ZONES.map(z => {
      const here = z.k === g.zone;
      const lock = g.level < z.level;
      return `<div class="shop"><span class="g">${here ? '📍' : lock ? '🔒' : '🗺️'}</span>
        <span class="n"><b>${esc(z.name)}</b><div>${esc(z.sub)}</div>
          <div style="color:var(--muted-foreground)">${lock ? `ปลดล็อกที่ ${LEVELS[z.level - 1].name}`
            : `งบตั้งต้น ${z.coin} เบี้ยกรรม`}</div></span>
        ${here ? '<button class="sm" disabled>อยู่ที่นี่</button>'
               : `<button class="sm" data-zone="${z.k}" ${lock ? 'disabled' : ''}>ย้ายไป</button>`}
      </div>`;
    }).join('')}
    ${open.length ? '' : '<div class="hint">ยังไม่มีโซนอื่นที่เปิดให้ท่าน — เลื่อนขั้นให้ถึงก่อน</div>'}
    <div class="row"><button class="gold" data-close>อยู่ที่นี่ต่อ</button></div>`,
    d => d.querySelectorAll('[data-zone]').forEach(b => b.onclick = () => {
      if (!g.moveZone(b.dataset.zone)) return;
      sfx('gong'); dlg.close(); refresh();
    }));
  onDlgClose(() => { g.paused = was; updatePlay(); });
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
function updatePlay() {
  $('#play').textContent = g.paused ? '▶ เดินวาระ' : '⏸ พัก';
  $('#spd').textContent = `ความเร็ว ×${g.speed}`;
  // ปุ่มย้ายโซนโผล่เมื่อมีโซนอื่นเปิดให้จริง ๆ เท่านั้น — ไม่งั้นกดแล้วเจอแต่กุญแจ
  const z = $('#zone');
  if (z) {
    z.hidden = !g.zonesOpen().length;
    z.textContent = `🗺️ ย้ายโซน (${g.zoneDef().name})`;
  }
}
$('#play').onclick = () => { if (!g.over) { g.paused = !g.paused; updatePlay(); } };
$('#spd').onclick = () => { g.speed = g.speed === 1 ? 2 : g.speed === 2 ? 4 : 1; updatePlay(); };
$('#help').onclick = openHelp;
$('#newgame').onclick = openNewGame;
$('#zone').onclick = openZone;

// มุมมอง 3D ปิดไว้ 6 ก.ย. 2569 — เจ้าของบอกว่า "ยังดูแปลก ๆ เอาออกดีกว่า"
// โค้ดยังอยู่ครบที่ src/view3d.js เปิดกลับได้โดยเอาปุ่ม #view กับ canvas #cv3 ใน index.html คืนมา
// แล้วกู้บล็อกตัวโหลดจาก git ที่ commit "เพิ่มมุมมอง 3D แบบ billboard"

cv.onmousemove = e => {
  const [sx, sy] = toScene(cv, e);
  const def = hitStation(sx, sy);
  hover = def ? def.k : null;
  cv.style.cursor = def ? 'pointer' : 'default';
};
cv.onmouseleave = () => { hover = null; };
cv.onclick = e => {
  const [sx, sy] = toScene(cv, e);
  onSceneClick(sx, sy);
};

/** คลิกโซนบนฉาก — ใช้ร่วมกันทั้งสองมุมมอง */
function onSceneClick(sx, sy) {
  const def = hitStation(sx, sy);
  const st = def && g.stations.find(x => x.def.k === def.k);

  // ป้าย "กดเพื่อสร้าง" มาก่อนทุกอย่าง — ตอนนั้นเรายืนอยู่ตรงจุดพอดี
  // ถ้าไปเช็คตัวละครก่อน คลิกยังไงก็โดนตัวเราเองเสมอ แล้วจะไม่มีทางกดสร้างได้เลย
  if (def && !st && nearBuild(g, g.player.x, g.player.y)?.k === def.k) return openBuild(def);

  // คลิกโดนตัวไหนสักตัว = เอาขึ้นแผงข้อมูล (มาก่อนสถานี เพราะตัวละครยืนทับกรอบสถานีได้)
  const a = hitActor(g, sx, sy);
  if (a) {
    select(a);
    if (a.kind === 'mob') g.attack();      // เปรตนอกจากดูข้อมูลแล้วก็ฟาดเลย
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
  if (st.soul) {                              // กำลังลงทัณฑ์อยู่
    const c = g.crewOf(st.crewK);
    return modal(`<h2>${def.glyph} ${esc(def.name)}</h2>
      <p style="font-size:var(--text-sm);line-height:var(--leading-body)">
        กำลังคุม <b>${esc(st.soul.who)}</b> สำนวน #${String(st.soul.id).padStart(3, '0')}<br>
        ผู้คุม: ${esc(c?.name || '—')} · ระดับวาระ ${st.intensity} ${INTENSITY[st.intensity]}<br>
        คืบหน้า ${Math.round(100 * st.progress / st.need)}%</p>
      <div class="row"><button data-close>ปิด</button></div>`);
  }
  if (def.pow === 0 || !g.queue.length) {
    return modal(`<h2>${def.glyph} ${esc(def.name)}</h2>
      <p style="font-size:var(--text-sm);line-height:var(--leading-body)">${esc(def.desc)}</p>
      <div class="row"><button data-close>ปิด</button></div>`);
  }
  pick.st = def.k; drawDeck();                // ว่าง + มีคิว → เลือกเป็นปลายทาง
}

// เดินด้วยคีย์บอร์ดด้วยก็ได้
const KEY = {};
addEventListener('keydown', e => {
  if (dlg.open || /input|textarea/i.test(e.target.tagName)) return;
  KEY[e.key.toLowerCase()] = true;
  if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault();
  if (e.key === ' ' && !g.over) { g.attack(); sfx('hit'); refresh(); }   // เว้นวรรค = ฟาดเปรตตนที่ใกล้ที่สุด
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

function openBuild(def) {
  const afford = g.coin >= def.cost;
  modal(`<h2>${def.glyph} ${esc(def.name)}</h2>
    <p style="font-size:var(--text-sm);line-height:var(--leading-body)">${esc(def.desc)}</p>
    <div class="hint">${def.tags.length ? 'ตรงกรรม: ' + def.tags.map(t => SINS[t].name).join(' · ') : 'ไม่ใช้ลงทัณฑ์'}
      · ฟืน ${def.fuel}/วาระ · แรง ${def.pow}</div>
    <div class="row"><button data-close>ยังไม่สร้าง</button>
      <button class="gold" id="bd" ${afford ? '' : 'disabled'}>สร้าง ${def.cost} เบี้ยกรรม</button></div>`,
    d => { const b = d.querySelector('#bd'); if (b) b.onclick = () => { g.build(def.k); dlg.close(); refresh(); }; });
}

// ---------- เหตุการณ์เด้ง ----------
g.onChange = () => {
  refresh();
  // ฉากพญายมลงมาเอง (บารมีหมด) เปิดอัตโนมัติ — ฉากต่อสู้กับวิญญาณเปิดจากปุ่มออกหมายเท่านั้น
  if (g.battle && g.battle.kind === 'yama' && !dlg.open) { openBattle(); return; }
  if (g.over) { g.paused = true; updatePlay(); openEnding(g.over); return; }
  if (g.pendingZone) {
    const z = g.pendingZone; g.pendingZone = null;
    bossModal(`ย้ายมา${z.name}`, `${z.intro}\n\nโซนนี้ยังไม่มีสถานีทัณฑ์สักหลัง — ` +
      'สร้างแนวไหนก่อน สำนวนแนวนั้นถึงจะเริ่มถูกส่งลงมา', 'เริ่มงาน');
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
    bossModal(`เลื่อนขั้น — ${lv.name}`,
      `"ห้าดาวห้าครั้ง ข้าเห็นแล้ว" พญายมยื่นของบางอย่างให้โดยไม่อธิบาย — ${lv.bonus}`, 'รับไว้');
    return;
  }
  if (g.pendingEvent) {
    const ev = g.pendingEvent; g.pendingEvent = null;
    const was = g.paused; g.paused = true; updatePlay();
    modal(`<h2>【${esc(ev.title)}】</h2><p style="line-height:var(--leading-body)">${esc(ev.text)}</p>
      <div class="row"><button class="gold" data-close>รับทราบ</button></div>`);
    onDlgClose(() => { g.paused = was; updatePlay(); });
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

  const art = $('#cover-art');
  const probe = new Image();                 // มีไฟล์หน้าปกค่อยใช้ ไม่มีก็อยู่กับไล่สีไปก่อน
  probe.onload = () => art.classList.add('has');
  probe.src = 'img/cover.png';

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
      on.onchange = () => { AUDIO.on = on.checked; syncBgm(); saveAudio(); if (AUDIO.on) sfx('crack'); };
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
function openIntro() {
  bossModal('พญายมเรียกพบ',
    '"สามร้อยปีที่แล้วโซนนี้มีผู้คุมสิบสองคน ตอนนี้เหลือสองคนกับกองสำนวนสูงเท่าตัวเจ้า — ' +
    'นิรา คนที่ถือแฟ้ม เธออ่านสำนวนให้เจ้าฟังอย่างเดียว อย่าสั่งเธอไปลงทัณฑ์ · ' +
    'ทัณฑ์ คนที่ยืนอยู่ข้างกระทะ นั่นคือมือเดียวที่เจ้ามีตอนนี้ ' +
    'ถ้าไม่พอก็ลงไปคุมเองซะ ข้าไม่ได้ห้าม\n\n' +
    `นี่ ${BAL.startCoin} เบี้ยกรรม ไปสร้างที่ลงทัณฑ์กับหาคนเอาเอง — จำไว้ว่าโซนนี้รับได้เฉพาะกรรม` +
    'ที่เจ้ามีที่ลงเท่านั้น สร้างอะไรไว้ สำนวนแนวนั้นถึงจะถูกส่งลงมา\n\n' +
    'แล้วจำข้อเดียวนี้ให้ขึ้นใจ — ทัณฑ์ที่เกินกรรม มันไม่ได้หายไปไหน มันมาอยู่ที่ผู้ตัดสิน"',
    'รับงาน');
}


window.G = g;
