// ui.js — แผงควบคุม · โมดัล · ลูปวาด
import { SINS, STATIONS, CREW, BAL, POWERS, SCENE, SPOTS, QUEUE_LINE,
         GUARD, LEVELS, MOB } from './data.js';
import { createGame, loadSave, clearSave } from './game.js';
import { render, toScene, hitStation } from './scene.js';
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
let tab = 'queue', hover = null, acc = 0, last = performance.now();

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
  else render(ctx, g, now, hover);
  followMarks(); drawAtk();
  requestAnimationFrame(frame);
}

// ---------- แถบทรัพยากร ----------
function bar(v, cls = '') { return `<span class="bar ${cls}"><i style="width:${Math.round(v)}%"></i></span>`; }

function drawRes() {
  const avg = g.casesDone ? Math.round(g.scoreSum / g.casesDone) : 0;
  $('#res').innerHTML = `
    <span class="chip">🪙 <b>${g.coin}</b></span>
    <span class="chip">🔥 <b>${Math.round(g.fuel)}</b></span>
    <span class="chip">❤️ บารมี ${bar(100 * g.hp / BAL.startHp, 'hp')} <b>${Math.round(g.hp)}</b></span>
    <span class="chip">⚖️ ระเบียบ ${bar(g.order)} <b>${Math.round(g.order)}</b></span>
    <span class="chip">☠️ กรรมท่าน ${bar(g.karma, 'karma')} <b>${g.karma.toFixed(1)}</b></span>
    <span class="chip">📁 <b>${g.casesDone}</b> คดี · เฉลี่ย ${avg}</span>
    <span class="chip">🎖️ ${esc(LEVELS[g.level - 1].name)} · ⭐${g.star5}</span>
    ${g.mobs.length ? `<span class="chip" style="color:var(--destructive)">👹 เปรต ${g.mobs.length} ตน</span>` : ''}`;
  $('#tickinfo').textContent = `วาระที่ ${g.tick} · ตรวจการรอบหน้าอีก ${g.nextKpi} วาระ · ผ่านแล้ว ${g.kpiPassed}/${BAL.kpiWin}`;
}

// ---------- แผงข้าง ----------
function deedLine(d) {
  return `<span class="tag" style="background:${SINS[d.s].color}22;color:${SINS[d.s].color}">${SINS[d.s].name}</span>${esc(d.t)} <b style="color:var(--warning)">· ${WEIGHT[d.w]}</b>`;
}

function drawTab() {
  const b = $('#tabbody');
  if (tab === 'queue') {
    if (!g.queue.length) { b.innerHTML = '<div class="empty">คิวว่าง — โซนนี้สงบผิดปกติ</div>'; return; }
    b.innerHTML = g.queue.map(s => `
      <div class="soul" data-soul="${s.id}">
        <div class="top"><b>${esc(s.who)}</b><span class="id ${s.waited > 40 ? 'wait' : ''}">#${String(s.id).padStart(3, '0')} · รอ ${s.waited} วาระ</span></div>
        ${s.deeds.map(d => `<div class="deed">${deedLine(d)}</div>`).join('')}
        ${s.merits.map(m => `<div class="deed" style="color:var(--success)">🪷 ${esc(m.t)}${m.v ? '' : ' <i>(ไม่นับเป็นบุญ)</i>'}</div>`).join('')}
      </div>`).join('');
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
        <span class="g">${c.glyph}</span>
        <span class="n"><b>${c.name}</b>
          <div class="st">แรง ${c.raeng} · ระเบียบ ${c.rabiab} · ปัญญา ${c.panya} · เมตตา ${c.metta}</div>
          <div class="st">กำลังใจ ${Math.round(c.morale)} · ${c.at ? 'ประจำ' + (STATIONS.find(s => s.k === c.at)?.name ?? '') : 'ว่าง'} · ค่าแรง ${c.pay}</div>
        </span>
      </div>`).join('')
      + `<div style="font-size:var(--text-xs);color:var(--muted-foreground);margin:12px 0 6px">
           ยังจ้างได้ · เบี้ยกรรมของท่านตอนนี้ ${g.coin}</div>`
      + (canHire.length ? canHire.map(c => `
      <div class="crew">
        <span class="g">${c.glyph}</span>
        <span class="n"><b>${c.name}</b> <span class="st" style="display:inline">— ${esc(c.duty)}</span>
          <div class="st">แรง ${c.raeng} · ระเบียบ ${c.rabiab} · ปัญญา ${c.panya} · เมตตา ${c.metta} · ค่าแรง ${c.pay}</div>
          <div class="st">${esc(c.line)}</div></span>
        <button class="sm" data-hire="${c.k}" ${g.coin < c.hire ? 'disabled' : ''}>จ้าง ${c.hire}</button>
      </div>`).join('') : '<div class="empty">จ้างครบทุกคนแล้ว</div>')
      // ยักษ์ทวารบาลอยู่ในแท็บนี้ด้วย — เป็นคน ไม่ใช่สิ่งก่อสร้าง
      // (เดิมตัวจัดการปุ่มไปรออยู่แท็บก่อสร้าง แต่ไม่เคยมีใครวาดปุ่มให้ เลยจ้างไม่ได้เลย)
      + `<div style="font-size:var(--text-xs);color:var(--muted-foreground);margin:12px 0 6px">ยามประจำโซน</div>
      <div class="crew">
        <span class="g">🛡️</span>
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
      <div style="font-size:var(--text-xs);color:var(--muted-foreground);margin:12px 0 6px">สถานีทัณฑ์</div>`
      + STATIONS.filter(s => s.cost > 0).map(s => {
        const built = g.stations.some(x => x.def.k === s.k);
        return `<div class="shop"><span class="g">${s.glyph}</span>
          <span class="n"><b>${s.name}</b><div>${esc(s.desc)}</div>
            <div>${s.tags.length ? 'ตรงกรรม: ' + s.tags.map(t => SINS[t].name).join(' · ') : 'ไม่ใช้ลงทัณฑ์'} · ฟืน ${s.fuel}/วาระ</div></span>
          <button class="sm" data-build="${s.k}" ${built || g.coin < s.cost ? 'disabled' : ''}>${built ? 'สร้างแล้ว' : 'สร้าง ' + s.cost}</button>
        </div>`;
      }).join('');
    const bf = $('#buyfuel'); if (bf) bf.onclick = () => { g.buy('fuel', 1); refresh(); };
    b.querySelectorAll('[data-build]').forEach(el =>
      el.onclick = () => { g.build(el.dataset.build); refresh(); });
  }
}

function drawLog() {
  $('#log').innerHTML = g.logs.map(l =>
    `<div class="${l.kind}"><span style="opacity:.45">[${String(l.t).padStart(3, '0')}]</span> ${esc(l.text)}</div>`).join('');
}

/** ป้ายบนหัวแท็บ — บอกว่ามีอะไรให้กดบ้าง ไม่ต้องเปิดดูเอง */
function drawTabHeads() {
  const hire = CREW.filter(c => !g.crew.some(x => x.k === c.k)).length + (g.guard ? 0 : 1);
  const build = STATIONS.filter(s => s.cost > 0 && !g.stations.some(x => x.def.k === s.k)).length;
  $('#tab-queue').textContent = `คิววิญญาณ${g.queue.length ? ` (${g.queue.length})` : ''}`;
  $('#tab-crew').textContent  = `ยมทูต${hire ? ` · จ้างได้ ${hire}` : ''}`;
  $('#tab-build').textContent = `ก่อสร้าง${build ? ` · สร้างได้ ${build}` : ''}`;
  for (const el of document.querySelectorAll('.tabs [data-tab]'))
    el.setAttribute('aria-selected', el.dataset.tab === tab ? 'true' : 'false');
}

/** ปุ่มฟาดเปรต — โผล่เฉพาะตอนมีเปรตในโซน และบอกตรง ๆ ว่าลูกไฟเหลือเท่าไหร่ */
let atkSig = '';
function drawAtk() {
  const btn = $('#atk'), fire = g.powerOf('roar');
  const sig = `${g.mobs.length}/${fire.ammo}/${g.over ? 1 : 0}`;
  if (sig === atkSig) return;                  // เรียกได้ทุกเฟรม แต่แตะ DOM เฉพาะตอนเปลี่ยนจริง
  atkSig = sig;
  btn.hidden = !g.mobs.length || !!g.over;
  if (btn.hidden) return;
  btn.textContent = fire.ammo > 0
    ? `⚔️ ฟาดเปรต (${g.mobs.length}) · ลูกไฟ ×${fire.ammo}`
    : '⚔️ ลูกไฟหมด — เดินไปเก็บบนแผนที่';
  btn.style.color = fire.ammo > 0 ? 'var(--gold)' : 'var(--destructive)';
}

function refresh() { drawRes(); drawTabHeads(); drawTab(); drawLog(); drawOverlay(); drawDeck(); drawAtk(); }

document.querySelectorAll('.tabs [data-tab]').forEach(el =>
  el.onclick = () => { tab = el.dataset.tab; refresh(); });   // เดิมไม่มีตัวจัดการเลย กดแท็บไม่ติดทั้งเกม

$('#atk').onclick = () => { g.attack(); refresh(); };

// ---------- โมดัล ----------
const dlg = $('#dlg');
function modal(html, onOpen) {
  dlg.innerHTML = html;
  dlg.showModal();
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
  const free = g.stations.filter(x => !x.soul && x.def.pow > 0);
  const idle = g.crew.filter(c => !c.at);
  if (pick.st && !free.some(x => x.def.k === pick.st)) pick.st = null;
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
      <div class="row2" id="d-st">${free.length ? free.map(x =>
        `<button data-k="${x.def.k}" ${x.def.k === pick.st ? 'aria-pressed="true"' : ''}>${x.def.glyph} ${x.def.name}<span style="opacity:.55"> ${x.def.tags.map(t => SINS[t].name).join('/') || 'ทั่วไป'}</span></button>`).join('')
        : '<span class="idle">ไม่มีสถานีว่าง</span>'}</div></div>

    <div class="grp"><span class="lb">ใครคุม</span>
      <div class="row2" id="d-cr">${idle.length ? idle.map(c =>
        `<button data-k="${c.k}" ${c.k === pick.cr ? 'aria-pressed="true"' : ''}>${c.glyph} ${c.name}<span style="opacity:.55"> ${Math.round(c.morale)}</span></button>`).join('')
        : '<span class="idle">ยมทูตไม่ว่าง</span>'}</div></div>

    <div class="grp"><span class="lb">หนักแค่ไหน</span>
      <div class="row2" id="d-in">${[1, 2, 3, 4, 5].map(i =>
        `<button data-v="${i}" ${i === pick.inten ? 'aria-pressed="true"' : ''}>${i} ${INTENSITY[i]}</button>`).join('')}</div></div>

    <button class="gold go" id="d-go" ${pick.st && pick.cr ? '' : 'disabled'}>⚖️ ออกหมาย</button>`;

  deckBar.querySelectorAll('#d-pw button').forEach(b => b.onclick = () => {
    g.usePower(b.dataset.k, s); drawRes(); drawLog(); drawOverlay(); drawDeck();
  });
  const sel = (id, key) => deckBar.querySelectorAll(`${id} button`).forEach(b =>
    b.onclick = () => { pick[key] = b.dataset.k ?? +b.dataset.v; drawDeck(); });
  sel('#d-st', 'st'); sel('#d-cr', 'cr'); sel('#d-in', 'inten');
  const go = deckBar.querySelector('#d-go');
  if (go) go.onclick = () => {
    if (!g.assign(s.id, pick.st, pick.cr, pick.inten)) return;
    pick = { st: null, cr: null, inten: 3 };
    if (g.pendingVerdict) showVerdict(g.pendingVerdict);
    refresh();
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
    <div class="row"><button class="gold" id="again">เริ่มใหม่</button></div>`,
    d => { d.querySelector('#again').onclick = () => { clearSave(); location.reload(); }; });
}

/** โมดัลที่มีพญายมนั่งบัลลังก์อยู่ข้าง ๆ (รูปหายก็ยังอ่านได้) */
function bossModal(title, text, btn = 'รับทราบ') {
  const was = g.paused; g.paused = true; updatePlay();
  modal(`<h2>${esc(title)}</h2>
    <div class="boss">
      <img src="img/hero-boss.png" alt="" onerror="this.remove()">
      <p style="line-height:var(--leading-body);margin:0">${esc(text)}</p>
    </div>
    <div class="row"><button class="gold" data-close>${esc(btn)}</button></div>`);
  dlg.addEventListener('close', () => { g.paused = was; updatePlay(); }, { once: true });
}

function openHelp() {
  modal(`<h2>วิธีเล่น</h2>
    <p style="line-height:var(--leading-body);font-size:var(--text-sm)">
    ท่านคือยมบาทมือใหม่ที่พ่อส่งมาคุมนรกโซนไทย งานคือ <b>พิพากษาให้ตรงกรรม</b> ไม่ใช่ลงโทษให้แรงที่สุด</p>
    <ol style="line-height:var(--leading-body);font-size:var(--text-sm);padding-left:1.2em">
      <li><b>เดิน</b> — คลิกที่พื้น หรือกด WASD / ลูกศร ·
          เดินได้เฉพาะ<b>พื้นดิน ทางเดิน สะพาน และแท่นพิพากษา</b> — ลงธารลาวาหรือแม่น้ำวิญญาณไม่ได้</li>
      <li>อ่านสำนวนจากหมุด 📜 เหนือหัว<b>นิรา</b> (เธอยืนอยู่ซ้ายแท่นตั้งแต่เริ่มเกม)
          และคำแก้ตัวจากหมุด 💬 เหนือหัววิญญาณ (ชี้เมาส์ หรือแตะ)</li>
      <li>ใช้พลังขุดความจริง — <b>พลังมีจำนวนจำกัด</b> ใช้แล้วต้อง<b>เดินไปเก็บของบนแผนที่</b>มาเติม</li>
      <li>เลือก <b>สถานีที่ตรงชนิดกรรม</b> + <b>ระดับวาระให้พอดี</b> แล้วออกหมาย</li>
      <li>พญายมให้ดาว 0–5 ดวงทุกคดี · <b>ห้าดาวครบห้าครั้ง = เลื่อนขั้น</b> ได้พลังและเงินเพิ่ม</li>
      <li><b>ศูนย์ดาว = โดนลูกไฟ</b> บารมีหาย 1 ใน 5 · โดนครบห้าครั้งจบเกม
          เดินไปเก็บ<b>หีบยา</b>เติมบารมีได้</li>
      <li>ทุก 5 คดีจะมี <b>เปรต</b> ขึ้นมาก่อกวน ปล่อยไว้ระเบียบตกเรื่อย ๆ — ฟาดได้ 3 ทาง:
          กดปุ่ม <b>⚔️ ฟาดเปรต</b> ที่แถบล่าง · กด <b>เว้นวรรค</b> · หรือคลิกที่ตัวมันบนฉาก
          (ใช้ <b>ลูกไฟ</b> ลูกละครั้ง หมดแล้วเดินไปเก็บบนแผนที่) หรือจ้าง<b>ยักษ์ทวารบาล</b>ให้ไล่ปราบแทน</li>
      <li><b>จ้างยมทูตเพิ่ม</b>อยู่ที่แท็บ <b>ยมทูต</b> ใต้ฉาก (ยักษ์ทวารบาลก็อยู่แท็บนั้น) ·
          สร้างสถานีเพิ่มอยู่ที่แท็บ <b>ก่อสร้าง</b></li>
      <li>บางคดี<b>ถูกกับผิดปนกัน</b> จนสำนวนด้านเดียวตัดสินไม่ได้ — พวกนี้ต้องใช้พลังก่อน</li>
    </ol>
    <p style="font-size:var(--text-xs);color:var(--muted-foreground)">เกมบันทึกเองอัตโนมัติทุกไม่กี่วินาที ปิดแล้วเปิดใหม่เล่นต่อได้</p>
    <div class="row"><button class="gold" data-close>เข้าใจแล้ว</button></div>`);
}

// ---------- ปุ่ม ----------
function updatePlay() {
  $('#play').textContent = g.paused ? '▶ เดินวาระ' : '⏸ พัก';
  $('#spd').textContent = `ความเร็ว ×${g.speed}`;
}
$('#play').onclick = () => { if (!g.over) { g.paused = !g.paused; updatePlay(); } };
$('#spd').onclick = () => { g.speed = g.speed === 1 ? 2 : g.speed === 2 ? 4 : 1; updatePlay(); };
$('#help').onclick = openHelp;

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
  // คลิกโดนเปรต = เดินเข้าไปฟาดมัน (เช็คก่อนสถานี เพราะมันเดินไปยืนทับกรอบสถานีได้)
  const mi = g.mobs.findIndex(m => Math.hypot(m.x - sx, m.y - sy) < 46);
  if (mi >= 0) { g.attack(); refresh(); return; }

  const def = hitStation(sx, sy);
  if (!def) {                                  // คลิกที่โล่ง = สั่งให้เดินไปตรงนั้น
    if (!g.walkTo(sx, sy))                     // อ้อมลาวาให้เอง · ไปไม่ได้จริงค่อยบอก
      g.log('ตรงนั้นเดินไปไม่ถึง — ต้องข้ามลาวาหรือแม่น้ำวิญญาณ', 'bad');
    return;
  }
  const st = g.stations.find(x => x.def.k === def.k);

  if (!st) return openBuild(def);            // ยังไม่ได้สร้าง
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
  if (e.key === ' ' && !g.over) { g.attack(); refresh(); }   // เว้นวรรค = ฟาดเปรตตนที่ใกล้ที่สุด
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
  P.tx = null; P.path = null;                   // กดปุ่มแล้วยกเลิกจุดหมายที่คลิกไว้
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
  if (g.over) { g.paused = true; updatePlay(); openEnding(g.over); return; }
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
    dlg.addEventListener('close', () => { g.paused = was; updatePlay(); }, { once: true });
  }
};

addEventListener('pointerdown', e => {          // แตะที่อื่นแล้วปิดบับเบิลที่กางอยู่
  if (!e.target.closest('.mark')) ov.querySelectorAll('.mark.show').forEach(m => m.classList.remove('show'));
}, true);

updatePlay(); refresh(); requestAnimationFrame(frame);

bossModal('โซนสุวรรณภูมิ',
  '"สามร้อยปีที่แล้วโซนนี้มีผู้คุมสิบสองคน ตอนนี้เหลือสามคนกับกองสำนวนสูงเท่าตัวเจ้า ' +
  'ข้าไม่สนว่าเจ้าจะทำยังไง แต่จำไว้ข้อเดียว — ทัณฑ์ที่เกินกรรม มันไม่ได้หายไปไหน มันมาอยู่ที่ผู้ตัดสิน"',
  'เริ่มงาน');
