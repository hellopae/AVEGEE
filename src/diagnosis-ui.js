// diagnosis-ui.js — วาด/ควบคุม "ใบวินิจฉัยวิญญาณ" (P4 เฟส 1) · โมเดลข้อมูลอยู่ diagnosis.js
// ใบเป็นชั้นทับบนฉากห้องเดียวกัน (แนวเดียวกับหอทะเบียน #st-arch) ไม่ใช่กล่องโมดัลใหม่
//   → ห้องไม่ถูกสร้างใหม่ ปิดใบแล้วกลับมายืนที่เดิม
import { t } from './i18n.js';
import { voice } from './data.js';
import { TALK_LINES } from './talk-lines.js';
import { diagnosisModel, diagnosisSubjects, nextTodo, subjectKey } from './diagnosis.js';
import { REMORSE } from './data.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SEAL = { prisonNotKed: 'img/ui/seal-return.webp', gateReborn: 'img/ui/seal-reborn.webp', gateHeaven: 'img/ui/seal-heaven.webp' };
const TONE_MARK = { good: '✓', bad: '↩', info: '✦', neutral: '…' };

/** ถ้อยคำท้ายใบ (Rae) — เลือกบทตายตัวต่อดวง (id mod จำนวนบท) ไม่กระพริบเวลาวาดซ้ำ · ผ่าน voice() */
export function closingLine(m) {
  const list = m.closing && TALK_LINES.diagnosisClosing[m.closing];
  if (!list?.length) return '';
  return voice(list[Math.abs(m.id) % list.length], m.sex);
}

const bar = (pct, cls = '') => `<span class="diag-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></span>`;
const cells = (n, cls) => Array.from({ length: 5 }, (_, i) => `<i class="${i < Math.min(5, Math.abs(n)) ? 'on ' + cls : ''}"></i>`).join('');

function deedsHtml(m) {
  if (!m.deeds.length) return `<p class="diag-empty">${esc(t('diag.noDeeds'))}</p>`;
  return m.deeds.map(d => `<div class="diag-deed ${d.relief ? 'relief' : ''} ${d.hidden ? 'hid' : ''}">
    <span class="diag-sin" style="--sin:${esc(d.color)}">${esc(d.sinName || '·')}</span>
    <span class="diag-deed-t">${esc(d.t)}${d.hidden ? `<small>${esc(t('diag.deed.hidden'))}</small>` : ''}</span>
    <span class="diag-w" role="img" aria-label="${esc(d.relief ? t('diag.deed.relief') + ' ' : '')}${esc(t('diag.deed.weight', { n: Math.abs(d.w) }))}">${cells(d.w, d.relief ? 'rel' : 'sin')}<b>${d.relief ? '−' : ''}${Math.abs(d.w)}</b></span>
  </div>`).join('');
}
function meritsHtml(m) {
  if (!m.merits.length) return `<p class="diag-empty">${esc(t('diag.noMerits'))}</p>`;
  return m.merits.map(x => `<div class="diag-merit ${x.fake ? 'fake' : ''}"><span aria-hidden="true">🪷</span><span class="diag-merit-t">${esc(x.t)}${x.fake ? `<small>${esc(t('diag.merit.fake'))}</small>` : ''}</span><b>${x.fake ? '' : '−' + esc(x.v)}</b></div>`).join('');
}
function orderHtml(m) {
  const o = m.order;
  if (!o) return '';
  const diff = o.diff;
  const verdict = diff === null ? '' : diff === 0 ? `<b class="ok">✓ ${esc(t('diag.order.exact'))}</b>`
    : diff > 0 ? `<b class="bad">▲ ${esc(t('diag.order.over', { n: diff }))}</b>` : `<b class="warn">▼ ${esc(t('diag.order.short', { n: -diff }))}</b>`;
  const dots = Array.from({ length: 5 }, (_, i) => `<i class="${i < o.intensity ? 'on' : ''} ${o.deserved !== null && i + 1 === o.deserved ? 'mark' : ''}"></i>`).join('');
  return `<p>${o.stationName ? esc(t('diag.order.sentTo', { name: o.stationName })) : `<span class="diag-nodata">${esc(t('diag.order.noData'))}</span>`}
      · ${o.keeperName ? esc(t('diag.order.keeper', { name: o.keeperName })) : ''}</p>
    <p class="diag-tier"><span class="diag-dots" aria-hidden="true">${dots}</span> ${esc(t('diag.order.level', { n: o.intensity, name: o.intensityName }))}
      ${o.deserved !== null ? `· ${esc(t('diag.order.deserved', { n: o.deserved }))}` : ''} ${verdict}</p>
    <p class="diag-served">${esc(t('diag.order.served'))}${o.score !== null ? ` · ${'★'.repeat(o.stars ?? 0)}${'☆'.repeat(5 - (o.stars ?? 0))} ${esc(t('diag.order.score', { n: o.score }))}` : ''}</p>
    ${o.boss ? `<p class="diag-boss">“${esc(o.boss)}”</p>` : ''}`;
}

function remorseHtml(m) {
  const r = m.remorse;
  const icon = `<img src="img/ui/icon-remorse.webp" alt="" width="32" height="32"><b>${esc(t('diag.remorse'))}</b>`;
  if (r.state === 'locked') {
    const why = t(r.why === 'held' ? 'diag.remorse.lockedHeld' : 'diag.remorse.lockedUninspected');
    return `<div class="diag-meter locked"><div class="diag-meter-head">${icon}<span class="diag-lock" role="status">🔒 ${esc(why)}</span></div>${bar(0)}<small>${esc(t('diag.remorse.hint', { n: REMORSE.pass }))}</small></div>`;
  }
  const ok = r.state === 'pass';
  const state = r.state === 'na' ? t('diag.remorse.na') : t(ok ? 'diag.remorse.passed' : 'diag.remorse.failed');
  const num = r.value === null ? '' : `<span class="diag-num">${r.value}</span>`;
  const meter = r.value === null ? bar(0) : `<span class="diag-bar ${ok ? 'ok' : 'bad'} with-line" style="--line:${r.pass}%"><i style="width:${r.value}%"></i></span>`;
  let parts = '';
  if (r.parts) {
    const W = REMORSE.weights, d = r.detail || {};
    const keeperHint = t('diag.part.keeper.' + (d.keeperFit || 'neutral')) + (Number.isFinite(d.stationFit) ? ` · ${t('diag.part.keeper.station', { n: Math.round(d.stationFit * 100) })}` : '');
    const intensityHint = d.over > 0 ? t('diag.part.intensity.over', { n: d.over }) : d.short > 0 ? t('diag.part.intensity.short', { n: d.short }) : t('diag.part.intensity.exact');
    const traitHint = t('diag.part.trait.' + (d.traitKey || 'accepting'));
    const row = (k, hint) => `<div class="diag-part"><span>${esc(t('diag.part.' + k))}</span>${bar(100 * r.parts[k] / W[k], 'part')}<b>${r.parts[k]}/${W[k]}</b><small>${esc(hint)}</small></div>`;
    parts = `<div class="diag-parts" aria-label="${esc(t('diag.part.title'))}"><h4>${esc(t('diag.part.title'))}</h4>${row('keeper', keeperHint)}${row('intensity', intensityHint)}${row('trait', traitHint)}</div>`;
  }
  return `<div class="diag-meter ${ok ? 'ok' : r.state === 'fail' ? 'bad' : ''}"><div class="diag-meter-head">${icon}${num}<span class="diag-state">${ok ? '✓' : r.state === 'fail' ? '✗' : '·'} ${esc(state)}</span></div>${meter}<small>${esc(t('diag.remorse.hint', { n: r.pass }))}</small>${parts}</div>`;
}
function kedHtml(m) {
  const k = m.ked;
  const icon = `<img src="img/ui/icon-deterrence.webp" alt="" width="32" height="32"><b>${esc(t('diag.ked'))}</b>`;
  if (k.locked || k.value === null) return `<div class="diag-meter locked"><div class="diag-meter-head">${icon}<span class="diag-lock" role="status">🔒 ${esc(t('diag.locked.held'))}</span></div>${bar(0)}<small>${esc(t('diag.ked.hint'))}</small></div>`;
  return `<div class="diag-meter"><div class="diag-meter-head">${icon}<span class="diag-num">${k.value}</span></div>${k.fear ? `<span class="diag-fear">🔥 ${esc(t('diag.ked.fear'))}</span>` : ''}${bar(k.value, 'ked')}<small>${esc(t('diag.ked.hint'))}</small></div>`;
}
function karmaHtml(m) {
  const k = m.karma;
  if (k.locked) return `<p class="diag-lock" role="status">🔒 ${esc(t('diag.locked.held'))}</p><small>${esc(t('diag.locked.hint'))}</small>`;
  const row = (label, val, cls) => `<div class="diag-fall ${cls}"><span>${esc(label)}</span><b>${val}</b></div>`;
  const total = k.sin;
  return `<div class="diag-karma-big ${k.left > 0 ? 'reborn' : 'heaven'}"><b>${k.left}</b><span>${esc(k.left > 0 ? t('diag.karma.toReborn') : t('diag.karma.toHeaven'))}</span></div>
    <small class="diag-expect">${esc(k.expected ? t('diag.karma.expected', { n: k.left }) : t('diag.karma.actual', { n: k.left }))}</small>
    <div class="diag-fall-list">
      ${row(t('diag.karma.sin'), k.sin, 'sin')}${k.relief ? row(t('diag.karma.relief'), '−' + k.relief, 'rel') : ''}
      ${row(t('diag.karma.merit'), '−' + k.merit, 'mer')}${row(t('diag.karma.intensity'), '−' + k.intensity, 'int')}${k.lotus ? row(t('diag.karma.lotus'), '−' + k.lotus, 'lot') : ''}
      ${row(t('diag.karma.left'), k.left, 'left')}
    </div>
    ${total > 0 ? bar(100 * k.paid / total, 'paid') + `<small>${esc(t('diag.karma.paid', { a: Math.round(k.paid * 10) / 10, b: total }))}</small>` : ''}`;
}

/** HTML ทั้งใบ */
export function diagnosisHtml(m, { pos, total, portraitSrc, escorting = false, mobile = false }) {
  const b = m.banner, seal = SEAL[b.id];
  const bannerText = b.id === 'gateHeaven' ? t(b.reward ? 'diag.b.gateHeavenReward' : 'diag.b.gateHeaven') : t('diag.b.' + b.id, { n: b.n });
  const act = m.action;
  const actDisabled = act.disabled || escorting;
  const actReason = escorting ? t('diag.act.escorting') : act.disabled && act.reason ? t(act.reason, { n: act.n }) : '';
  const closing = closingLine(m);
  const saidText = m.mode === 'held' ? m.said : closing || m.said;
  const sec = (key, title, body, open) => `<details class="diag-sec" data-sec="${key}" ${open ? 'open' : ''}><summary>${esc(title)}</summary><div class="diag-sec-body">${body}</div></details>`;
  const sections = {
    deeds: sec('deeds', `${t('diag.sec.deeds')} · ${m.deeds.length}`, (m.face ? `<p class="diag-face">${esc(m.face)}</p>` : '') + deedsHtml(m), true),
    merits: sec('merits', t('diag.sec.merits'), meritsHtml(m), !mobile),
    order: m.order ? sec('order', t('diag.sec.order'), orderHtml(m), !mobile) : '',
    said: sec('said', t('diag.sec.said'), saidText ? `<p class="diag-said">“${esc(saidText)}”</p>` : `<p class="diag-empty">${esc(t('diag.noSaid'))}</p>`, !mobile),
    meters: `<section class="diag-side-a" data-sec="meters" aria-label="${esc(t('diag.sec.meters'))}"><h3>${esc(t('diag.sec.meters'))}</h3>${kedHtml(m)}${remorseHtml(m)}</section>`,
    karma: `<section class="diag-side-b" data-sec="karma"><h3>${esc(t('diag.sec.karma'))}</h3>${karmaHtml(m)}</section>`,
  };
  return `<div class="diag" data-mode="${m.mode}" data-banner="${b.id}" role="dialog" aria-modal="true" aria-label="${esc(t('diag.title'))}">
    <header class="diag-head">
      <b class="diag-title">${esc(t('diag.title'))}</b>
      <span class="diag-chip">${esc(t('diag.mode.' + m.mode))}</span><span class="diag-id">#${String(m.id).padStart(3, '0')}</span>
      <span class="diag-nav">
        <button type="button" data-diag-prev aria-label="${esc(t('diag.prev'))}" ${total < 2 ? 'disabled' : ''}>‹</button>
        <span class="diag-pos" aria-live="polite">${pos}/${total}</span>
        <button type="button" data-diag-next aria-label="${esc(t('diag.next'))}" ${total < 2 ? 'disabled' : ''}>›</button>
      </span>
      <button type="button" class="diag-x" data-diag-close aria-label="${esc(t('diag.closeSheet'))}">✕</button>
    </header>
    <div class="diag-body">
      <section class="diag-who">
        <div class="diag-portrait"><img src="${esc(portraitSrc)}" alt="" onerror="this.onerror=null;this.src='img/spirit7.png'"></div>
        <h2>${esc(m.name)}</h2>${m.name !== m.who ? `<p class="diag-job">${esc(m.who)}</p>` : ''}
        <div class="diag-banner tone-${b.tone}" role="status">${seal ? `<img src="${seal}" alt="" width="40" height="40">` : `<span class="diag-mark" aria-hidden="true">${TONE_MARK[b.tone] || '…'}</span>`}<span>${esc(bannerText)}</span></div>
      </section>
      ${sections.deeds}${sections.meters}${sections.karma}${sections.merits}${sections.order}${sections.said}
    </div>
    <footer class="diag-foot">
      <small class="diag-foot-note" role="status">${esc(actReason)}</small>
      <button type="button" class="diag-close-btn" data-diag-close>${esc(t('room.close'))}</button>
      ${act.kind === 'none' && !act.label ? '' : `<button type="button" class="btn-gold diag-main" data-diag-act="${act.kind}" ${actDisabled ? 'disabled' : ''}>${esc(escorting ? t('diag.act.escorting') : t(act.label))}</button>`}
    </footer>
  </div>`;
}

/**
 * ติดตั้งตัวควบคุมใบบน element `box` (ชั้นทับในห้อง)
 * @param {object} o  g, roomK, box, portrait(m)=>url, onAct(m)=>({result:'close'|'stay', next?:'now'|'manual'|number}|null),
 *                    escorting(id), onOpen(), onClose(), pause/unpause
 */
export function mountDiagnosis(o) {
  const { g, roomK, box } = o;
  let cur = null;                                   // key ของดวงที่เปิดอยู่
  let opener = null;                                // element ที่กดเปิด → คืนโฟกัสตอนปิด
  const mobileQ = typeof matchMedia === 'function' ? matchMedia('(max-width:700px)') : { matches: false };
  const subjects = () => diagnosisSubjects(g, roomK);
  const find = key => subjects().find(s => subjectKey(s) === key);
  const isOpen = () => !box.hidden && cur !== null;

  function render(focusSel) {
    const list = subjects();
    let idx = list.findIndex(s => subjectKey(s) === cur);
    if (idx < 0) {                                  // ดวงนี้หายไปจากห้อง (ถูกส่งต่อแล้ว) → ไปดวงที่อยู่ตำแหน่งเดิม หรือปิดถ้าไม่เหลือ
      if (!list.length) return close();
      idx = Math.min(Math.max(0, o.lastIndex ?? 0), list.length - 1); cur = subjectKey(list[idx]);
    }
    o.lastIndex = idx;
    const m = diagnosisModel(g, list[idx]);
    const esc2 = o.escorting?.(m.id) || false;
    box.innerHTML = diagnosisHtml(m, { pos: idx + 1, total: list.length, portraitSrc: o.portrait(m), escorting: esc2, mobile: mobileQ.matches });
    bind(m, list);
    if (focusSel) box.querySelector(focusSel)?.focus();
  }

  function bind(m, list) {
    box.querySelectorAll('[data-diag-close]').forEach(b => b.onclick = () => close());
    const step = d => { const i = list.findIndex(s => subjectKey(s) === cur); const n = list[(i + d + list.length) % list.length]; cur = subjectKey(n); render('[data-diag-act]:not(:disabled), [data-diag-close]'); };
    box.querySelector('[data-diag-prev]').onclick = () => step(-1);
    box.querySelector('[data-diag-next]').onclick = () => step(1);
    const act = box.querySelector('[data-diag-act]');
    if (act) act.onclick = () => {
      if (act.disabled) return;
      const r = o.onAct(m, api);
      if (!r) { render(); return; }
      if (r.result === 'stay') { render('[data-diag-act]:not(:disabled), [data-diag-close]'); return; }
      const except = subjectKey({ kind: m.mode, soul: m.soul });
      close(true);
      if (r.next === 'manual') return;
      const open = () => { const n = nextTodo(g, roomK, except, o.escorting); if (n) show(subjectKey(n)); };
      if (r.next === 'now' || r.next === undefined) open(); else setTimeout(open, r.next);
    };
  }

  function show(key, from) {
    if (!find(key)) return false;
    const wasOpen = isOpen();
    cur = key;
    if (!wasOpen) { opener = from || document.activeElement; o.onOpen?.(); }
    box.hidden = false;
    render('[data-diag-act]:not(:disabled), [data-diag-close]');
    return true;
  }
  function close(silent) {
    if (box.hidden && cur === null) return;
    box.hidden = true; box.innerHTML = ''; cur = null;
    o.onClose?.();
    if (!silent) { const el = opener; opener = null; if (el && el.isConnected) el.focus?.({ preventScroll: true }); }
  }

  // ปัดซ้าย/ขวา = ดวงก่อน/ถัดไป (มือถือ) · ลูกศร = เหมือนกัน · Esc ปิดใบ (ไม่ปิดห้อง) · Tab วนอยู่ในใบ
  let sx = 0, sy = 0, st = 0;
  box.addEventListener('touchstart', e => { const p = e.changedTouches[0]; sx = p.clientX; sy = p.clientY; st = Date.now(); }, { passive: true });
  box.addEventListener('touchend', e => {
    const p = e.changedTouches[0], dx = p.clientX - sx, dy = p.clientY - sy;
    if (Date.now() - st > 700 || Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * .5) return;
    box.querySelector(dx < 0 ? '[data-diag-next]' : '[data-diag-prev]')?.click();
  }, { passive: true });
  box.onkeydown = e => {
    if (!isOpen()) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key === 'ArrowLeft' && !/summary|input/i.test(e.target.tagName)) { e.preventDefault(); box.querySelector('[data-diag-prev]')?.click(); return; }
    if (e.key === 'ArrowRight' && !/summary|input/i.test(e.target.tagName)) { e.preventDefault(); box.querySelector('[data-diag-next]')?.click(); return; }
    if (e.key === 'Tab') {
      const fs = [...box.querySelectorAll('button:not(:disabled), summary')].filter(x => x.offsetParent !== null);
      if (!fs.length) return;
      const first = fs[0], last = fs[fs.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  const api = { show, close, isOpen, refresh: () => { if (isOpen()) render(); }, openNext: () => { const n = nextTodo(g, roomK, null, o.escorting); if (n) show(subjectKey(n)); }, current: () => cur };
  return api;
}
