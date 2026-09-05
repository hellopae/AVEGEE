// ui.js — แผงควบคุม · โมดัล · ลูปวาด
import { SINS, STATIONS, CREW, BAL, POWERS } from './data.js';
import { createGame } from './game.js';
import { render, toScene, hitStation } from './scene.js';

const $ = s => document.querySelector(s);
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const WEIGHT = ['', 'เล็กน้อย', 'ปานกลาง', 'หนัก', 'หนักมาก', 'มหันต์'];
const INTENSITY = ['', 'ว่ากล่าว', 'เบา', 'ปานกลาง', 'หนัก', 'สาสม'];

const g = createGame();
const cv = $('#cv'), ctx = cv.getContext('2d');
let tab = 'queue', hover = null, acc = 0, last = performance.now();

// ---------- ลูป ----------
function frame(now) {
  const dt = Math.min(120, now - last); last = now;
  if (!g.paused && !g.over) {
    acc += dt;
    const step = BAL.tickMs / g.speed;
    while (acc >= step) { acc -= step; g.step(); if (g.over || g.paused) break; }
  }
  render(ctx, g, now, hover);
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
    <span class="chip">📁 <b>${g.casesDone}</b> คดี · เฉลี่ย ${avg}</span>`;
  $('#tickinfo').textContent = `วาระที่ ${g.tick} · ตรวจการรอบหน้าอีก ${g.nextKpi} วาระ · ผ่านแล้ว ${g.kpiPassed}/3`;
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
    b.querySelectorAll('[data-soul]').forEach(el =>
      el.onclick = () => openAssign(+el.dataset.soul));

  } else if (tab === 'crew') {
    b.innerHTML = g.crew.map(c => `
      <div class="crew">
        <span class="g">${c.glyph}</span>
        <span class="n"><b>${c.name}</b>
          <div class="st">แรง ${c.raeng} · ระเบียบ ${c.rabiab} · ปัญญา ${c.panya} · เมตตา ${c.metta}</div>
          <div class="st">กำลังใจ ${Math.round(c.morale)} · ${c.at ? 'ประจำ' + (STATIONS.find(s => s.k === c.at)?.name ?? '') : 'ว่าง'} · ค่าแรง ${c.pay}</div>
        </span>
      </div>`).join('')
      + '<div style="font-size:var(--text-xs);color:var(--muted-foreground);margin:12px 0 6px">ยังจ้างได้</div>'
      + CREW.filter(c => !g.crew.some(x => x.k === c.k)).map(c => `
      <div class="crew">
        <span class="g">${c.glyph}</span>
        <span class="n"><b>${c.name}</b>
          <div class="st">แรง ${c.raeng} · ระเบียบ ${c.rabiab} · ปัญญา ${c.panya} · เมตตา ${c.metta}</div>
          <div class="st">${esc(c.line)}</div></span>
        <button class="sm" data-hire="${c.k}" ${g.coin < c.hire ? 'disabled' : ''}>จ้าง ${c.hire}</button>
      </div>`).join('');
    b.querySelectorAll('[data-hire]').forEach(el =>
      el.onclick = () => { g.hire(el.dataset.hire); refresh(); });

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

function refresh() { drawRes(); drawTab(); drawLog(); }

// ---------- โมดัล ----------
const dlg = $('#dlg');
function modal(html, onOpen) {
  dlg.innerHTML = html;
  dlg.showModal();
  dlg.querySelectorAll('[data-close]').forEach(b => b.onclick = () => dlg.close());
  if (onOpen) onOpen(dlg);
}

const SAID_STYLE = {
  deny:    { icon: '🗣️', color: 'var(--muted-foreground)' },
  claim:   { icon: '🪷', color: 'var(--muted-foreground)' },
  truth:   { icon: '',   color: 'var(--gold)' },
  confess: { icon: '',   color: 'var(--warning)' },
  false:   { icon: '',   color: 'var(--destructive)' },
  hint:    { icon: '↳',  color: 'var(--muted-foreground)' },
};

/** ฉากไต่สวน — วิญญาณยืนหน้าแท่น นิราอ่านสำนวน เราใช้พลังแล้วตัดสิน */
function openAssign(soulId, preferStation = null) {
  const s = g.queue.find(x => x.id === soulId);
  if (!s) return;
  const wasPaused = g.paused; g.paused = true; updatePlay();
  let stK = preferStation, crK = null, inten = 3;

  const draw = d => {
    const free = g.stations.filter(x => !x.soul && x.def.pow > 0);
    const idle = g.crew.filter(c => !c.at);
    d.querySelector('#record').innerHTML = s.deeds.filter(x => x.known)
      .map(x => `<div class="deed">${deedLine(x)}</div>`).join('')
      || '<div class="hint">สำนวนว่างเปล่า — นิราเองก็ยังไม่รู้ว่าเขาทำอะไรมา</div>';
    d.querySelector('#said').innerHTML = s.said.map(x => {
      const st = SAID_STYLE[x.kind] || SAID_STYLE.hint;
      return `<div class="deed" style="color:${st.color}">${st.icon} ${esc(x.text)}</div>`;
    }).join('') || '<div class="hint">เขายังไม่พูดอะไรเลย</div>';
    d.querySelector('#powers').innerHTML = POWERS.map(p => {
      const ready = g.powerReady(p.k), pw = g.powerOf(p.k);
      const why = g.casesDone < p.unlock ? `ปลดล็อกที่ ${p.unlock} คดี`
                : pw.cd > 0 ? `รออีก ${pw.cd} คดี` : p.desc;
      return `<button data-pw="${p.k}" ${ready ? '' : 'disabled'} title="${esc(p.desc)}">
        ${p.glyph} ${p.name}<br><span style="font-size:10px;opacity:.7">${esc(why)}</span></button>`;
    }).join('');
    d.querySelector('#opt-st').innerHTML = free.length ? free.map(x =>
      `<button data-k="${x.def.k}" ${x.def.k === stK ? 'aria-pressed="true"' : ''}>${x.def.glyph} ${x.def.name}<br>
        <span style="font-size:10px;opacity:.7">${x.def.tags.map(t => SINS[t].name).join('/') || 'ทั่วไป'}</span></button>`).join('')
      : '<span class="hint">ไม่มีสถานีว่าง — รอคดีที่ทำอยู่ให้จบ หรือไปสร้างเพิ่มที่แท็บก่อสร้าง</span>';
    d.querySelector('#opt-cr').innerHTML = idle.length ? idle.map(c =>
      `<button data-k="${c.k}" ${c.k === crK ? 'aria-pressed="true"' : ''}>${c.glyph} ${c.name}<br>
        <span style="font-size:10px;opacity:.7">กำลังใจ ${Math.round(c.morale)}</span></button>`).join('')
      : '<span class="hint">ยมทูตไม่ว่างสักคน</span>';
    d.querySelectorAll('#opt-in button').forEach(b =>
      b.setAttribute('aria-pressed', String(+b.dataset.v === inten)));

    d.querySelectorAll('[data-pw]').forEach(b => b.onclick = () => {
      g.usePower(b.dataset.pw, s); draw(d); drawRes();
    });
    const sel = (wrap, cb) => d.querySelectorAll(`${wrap} button`).forEach(b =>
      b.onclick = () => { cb(b.dataset.k ?? b.dataset.v); draw(d); });
    sel('#opt-st', v => stK = v);
    sel('#opt-cr', v => crK = v);
    sel('#opt-in', v => inten = +v);
    d.querySelector('#go').disabled = !(stK && crK);
  };

  modal(`
    <h2>แท่นพิพากษา — สำนวน #${String(s.id).padStart(3, '0')}</h2>
    <div class="boss" style="gap:var(--space-3);margin-bottom:var(--space-4)">
      <img src="img/crew-nira.png" alt="" style="width:84px;height:84px" onerror="this.remove()">
      <div style="min-width:0">
        <div style="font-size:var(--text-sm)"><b>นิรา</b> อ่านสำนวน: ผู้ตายเป็น<b>${esc(s.who)}</b></div>
        <div id="record" style="margin-top:4px"></div>
      </div>
    </div>

    <div class="field">
      <label>เขาพูดว่าอะไร — คำพูดของวิญญาณเชื่อไม่ได้ทั้งหมด</label>
      <div id="said"></div>
    </div>

    <div class="field">
      <label>พลังของท่าน — ใช้แล้วต้องรอหลายคดีกว่าจะใช้ซ้ำได้</label>
      <div class="opts" id="powers"></div>
    </div>

    <div class="field">
      <label>สถานีทัณฑ์ — เลือกให้ตรงชนิดกรรม</label>
      <div class="opts" id="opt-st"></div>
    </div>
    <div class="field">
      <label>ยมทูตผู้คุม</label>
      <div class="opts" id="opt-cr"></div>
    </div>
    <div class="field">
      <label>ระดับวาระ — หนักเกินกรรม ส่วนเกินจะตกเป็นกรรมของท่านเอง</label>
      <div class="opts" id="opt-in">${[1, 2, 3, 4, 5].map(i =>
        `<button data-v="${i}">${i} ${INTENSITY[i]}</button>`).join('')}</div>
    </div>
    <div class="row"><button data-close>พักคดีไว้ก่อน</button><button class="gold" id="go" disabled>ออกหมาย</button></div>
  `, d => {
    draw(d);
    d.querySelector('#go').onclick = () => {
      g.assign(soulId, stK, crK, inten);
      dlg.close();
      refresh();
      if (g.pendingVerdict) openVerdict(g.pendingVerdict);
      else { g.paused = wasPaused; updatePlay(); }
    };
    dlg.addEventListener('close', () => { refresh(); }, { once: true });
  });
}

const BOSS_LINE = {
  great:    ['พญายมพยักหน้า', '"นี่แหละที่เรียกว่าตรงกรรม" ท่านคืนบารมีให้ส่วนหนึ่ง และสั่งจ่ายเบี้ยพิเศษให้ 40'],
  ok:       ['พญายมไม่พูดอะไร', 'ท่านอ่านคำตัดสินจนจบ วางลง แล้วมองไปทางอื่น — แปลว่าใช้ได้ ไม่ถึงกับดี'],
  cruel:    ['พญายมมองหน้าเจ้าตรง ๆ', '"คำตัดสินถูกฝาถูกตัว แต่เจ้าใส่เกินไปสองวาระ ส่วนเกินนั้นไม่ได้หายไปไหน มันมาอยู่ที่เจ้า" — บารมีถูกหัก'],
  bad:      ['พญายมเงียบไปนาน', '"เจ้าอ่านสำนวนหรือเจ้าเดา" ท่านหักบารมีของเจ้าไปต่อหน้าทุกคน'],
  terrible: ['พญายมลุกจากบัลลังก์', '"คำตัดสินแบบนี้ ทำให้คนที่เขาเจ็บมาแล้ว เจ็บซ้ำอีกครั้ง" — บารมีถูกหักหนัก'],
};

function openVerdict(v) {
  g.pendingVerdict = null;
  const [head, body] = BOSS_LINE[v.boss] || BOSS_LINE.ok;
  const row = (k, val) => `<div style="display:flex;justify-content:space-between;font-size:var(--text-sm);padding:2px 0">
    <span style="color:var(--muted-foreground)">${k}</span><b>${val}</b></div>`;
  modal(`<h2>คำตัดสิน — ${esc(v.who)}</h2>
    <div class="boss">
      <img src="img/hero-boss.png" alt="" onerror="this.remove()">
      <div style="flex:1;min-width:0">
        <div style="font-size:2.4rem;font-family:var(--font-display);color:${v.score >= 78 ? 'var(--success)' : v.score >= 50 ? 'var(--gold)' : 'var(--destructive)'};line-height:1">${v.score}<span style="font-size:1rem;opacity:.6"> / 100</span></div>
        ${row('ตรงกรรม (ธรรม)', v.tham)}
        ${row('สาสมพอดี (เข็ด)', v.ked)}
        ${row('งานเป็นระเบียบ', v.rab)}
        ${v.karma ? row('กรรมที่ตกใส่ท่าน', '+' + v.karma) : ''}
      </div>
    </div>
    <p style="line-height:var(--leading-body);margin-top:var(--space-4)"><b>${esc(head)}</b><br>${esc(body)}</p>
    <div class="row"><button class="gold" data-close>รับทราบ</button></div>`);
  dlg.addEventListener('close', () => {
    refresh();
    if (g.over) { g.paused = true; updatePlay(); openEnding(g.over); }
  }, { once: true });
}

function openEnding(o) {
  modal(`<h2>${esc(o.title)}</h2>
    <p style="line-height:var(--leading-body)">${esc(o.text)}</p>
    <div class="hint">ปิดคดีทั้งหมด ${g.casesDone} เรื่อง · คะแนนเฉลี่ย ${g.casesDone ? Math.round(g.scoreSum / g.casesDone) : 0} ·
      กรรมที่ท่านสะสมเอง ${g.karma.toFixed(1)}</div>
    <div class="row"><button class="gold" onclick="location.reload()">เริ่มใหม่</button></div>`);
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
      <li>กดวิญญาณในคิว อ่านสำนวนว่าเขาทำอะไรมา หนักแค่ไหน มีบุญถ่วงไหม</li>
      <li>เลือก <b>สถานีที่ตรงชนิดกรรม</b> (คนโกงลงกระทะทองแดง ไม่ใช่ต้นงิ้ว) → ได้คะแนน <b>ธรรม</b></li>
      <li>เลือก <b>ระดับวาระ</b> ให้พอดีกรรม → ได้คะแนน <b>เข็ด</b><br>
          เบาไป เขาไม่สำนึก · <span class="warn">หนักเกิน ส่วนเกินกลายเป็นกรรมของท่านเอง</span></li>
      <li>อย่าให้คิวล้น ระเบียบจะตก · ระเบียบถึง 0 พ่อเรียกกลับ</li>
      <li>ผ่านตรวจการ 3 รอบแล้วจบเกม — ตอนจบขึ้นกับ<b>กรรมที่ท่านสะสมเอง</b></li>
    </ol>
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
document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
  tab = b.dataset.tab;
  document.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-selected', x === b));
  drawTab();
});

// คลิกบนฉาก
cv.onmousemove = e => {
  const [sx, sy] = toScene(cv, e);
  const def = hitStation(sx, sy);
  hover = def ? def.k : null;
  cv.style.cursor = def ? 'pointer' : 'default';
};
cv.onmouseleave = () => { hover = null; };
cv.onclick = e => {
  const [sx, sy] = toScene(cv, e);
  const def = hitStation(sx, sy);
  if (!def) return;
  const st = g.stations.find(x => x.def.k === def.k);

  if (!st) return openBuild(def);          // ยังไม่ได้สร้าง
  if (st.soul) {                            // กำลังลงทัณฑ์อยู่
    const c = g.crewOf(st.crewK);
    return modal(`<h2>${def.glyph} ${esc(def.name)}</h2>
      <p style="font-size:var(--text-sm);line-height:var(--leading-body)">
        กำลังคุม <b>${esc(st.soul.who)}</b> สำนวน #${String(st.soul.id).padStart(3, '0')}<br>
        ผู้คุม: ${esc(c?.name || '—')} · ระดับวาระ ${st.intensity} ${INTENSITY[st.intensity]}<br>
        คืบหน้า ${Math.round(100 * st.progress / st.need)}%</p>
      <div class="row"><button data-close>ปิด</button></div>`);
  }
  if (def.pow === 0) {                      // ศาลาน้ำชา — ไม่ใช่ที่ลงทัณฑ์
    return modal(`<h2>${def.glyph} ${esc(def.name)}</h2>
      <p style="font-size:var(--text-sm);line-height:var(--leading-body)">${esc(def.desc)}</p>
      <div class="row"><button data-close>ปิด</button></div>`);
  }
  if (!g.queue.length) {
    return modal(`<h2>${def.glyph} ${esc(def.name)}</h2>
      <p style="font-size:var(--text-sm)">ว่างอยู่ แต่ยังไม่มีวิญญาณในคิว</p>
      <div class="row"><button data-close>ปิด</button></div>`);
  }
  openAssign(g.queue[0].id, def.k);         // ว่าง + มีคิว → ออกหมายเลย
};

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
  if (g.pendingEvent) {
    const ev = g.pendingEvent; g.pendingEvent = null;
    const was = g.paused; g.paused = true; updatePlay();
    modal(`<h2>【${esc(ev.title)}】</h2><p style="line-height:var(--leading-body)">${esc(ev.text)}</p>
      <div class="row"><button class="gold" data-close>รับทราบ</button></div>`);
    dlg.addEventListener('close', () => { g.paused = was; updatePlay(); }, { once: true });
  }
};

updatePlay(); refresh(); requestAnimationFrame(frame);

bossModal('โซนสุวรรณภูมิ',
  '"สามร้อยปีที่แล้วโซนนี้มีผู้คุมสิบสองคน ตอนนี้เหลือสามคนกับกองสำนวนสูงเท่าตัวเจ้า ' +
  'ข้าไม่สนว่าเจ้าจะทำยังไง แต่จำไว้ข้อเดียว — ทัณฑ์ที่เกินกรรม มันไม่ได้หายไปไหน มันมาอยู่ที่ผู้ตัดสิน"',
  'เริ่มงาน');
