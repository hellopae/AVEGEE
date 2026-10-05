// B8 krajok → กานต์ — Mirror training. Rotate mirrors in 15° steps so the light reaches the exit and stays on it 2 s.
// Field is 0..100 in both axes. Every level is built FROM a solution (so it is always solvable) and then scrambled;
// tests/b8-training.test.mjs re-solves every seed by brute force.
import { rng, clamp, el, clockText } from './kit.js';

export const MIRROR_STEP = 15, MIRROR_STATES = 12, MIRROR_HALF = 9, EXIT_R = 6.5, HOLD_SECONDS = 2, SECONDS = 45, MAX_BOUNCES = 8;
const rad = deg => deg * Math.PI / 180, norm = a => ((a % 180) + 180) % 180;

/** Follows the beam. Returns { path:[[x,y]…], hit, order:[mirror indices in hit order] }. */
export function trace(level, angles) {
  const { source, mirrors, exit } = level;
  let x = source.x, y = source.y, dx = Math.cos(rad(source.dir)), dy = Math.sin(rad(source.dir)), last = -1;
  const path = [[x, y]], order = [];
  for (let bounce = 0; bounce <= MAX_BOUNCES; bounce++) {
    let best = Infinity, which = -1;
    mirrors.forEach((m, i) => {
      if (i === last) return;
      const mx = Math.cos(rad(angles[i])), my = Math.sin(rad(angles[i]));
      const den = dx * my - dy * mx;
      if (Math.abs(den) < 1e-9) return;
      const cx = m.x - x, cy = m.y - y;
      const t = (cx * my - cy * mx) / den, s = (cx * dy - cy * dx) / den;
      if (t > 1e-6 && Math.abs(s) <= MIRROR_HALF && t < best) { best = t; which = i; }
    });
    let edge = Infinity;
    if (dx > 1e-9) edge = Math.min(edge, (100 - x) / dx); else if (dx < -1e-9) edge = Math.min(edge, -x / dx);
    if (dy > 1e-9) edge = Math.min(edge, (100 - y) / dy); else if (dy < -1e-9) edge = Math.min(edge, -y / dy);
    const len = Math.min(best, edge);
    // closest approach of the exit disc to this segment (the beam ends inside the disc)
    const ex = exit.x - x, ey = exit.y - y, along = clamp(ex * dx + ey * dy, 0, len);
    const off = Math.hypot(ex - along * dx, ey - along * dy);
    if (off <= EXIT_R) {
      const reach = clamp(along, 0, len);
      path.push([x + dx * reach, y + dy * reach]);
      return { path, hit: true, order };
    }
    x += dx * len; y += dy * len; path.push([x, y]);
    if (which < 0) return { path, hit: false, order };
    order.push(which); last = which;
    const mx = Math.cos(rad(angles[which])), my = Math.sin(rad(angles[which])), dot = dx * mx + dy * my;
    dx = 2 * dot * mx - dx; dy = 2 * dot * my - dy;
  }
  return { path, hit: false, order };
}

/** Deterministic level for a seed: { source, mirrors, exit, solution, start }. */
export function makeLevel(seed) {
  const r = rng(seed * 7919 + 13), inField = (x, y, m) => x >= m && x <= 100 - m && y >= m && y <= 100 - m;
  for (let attempt = 0; attempt < 500; attempt++) {
    const n = r() < .5 ? 2 : 3;
    const source = { x: 0, y: 22 + r() * 56, dir: (Math.floor(r() * 5) - 2) * 15 };
    let px = source.x, py = source.y, dx = Math.cos(rad(source.dir)), dy = Math.sin(rad(source.dir));
    const mirrors = [], solution = [];
    let ok = true;
    for (let i = 0; i < n && ok; i++) {
      const dist = 24 + r() * 18, cx = px + dx * dist, cy = py + dy * dist;
      if (!inField(cx, cy, 14) || mirrors.some(m => Math.hypot(m.x - cx, m.y - cy) < 24)) { ok = false; break; }
      // incidence between 30° and 75° off the mirror line → the beam turns 60°…150°, never straight back
      const incidence = (30 + Math.floor(r() * 4) * 15) * (r() < .5 ? 1 : -1);
      const heading = Math.atan2(dy, dx) * 180 / Math.PI;
      const a = norm(Math.round((heading + incidence) / MIRROR_STEP) * MIRROR_STEP);
      const mx = Math.cos(rad(a)), my = Math.sin(rad(a)), dot = dx * mx + dy * my;
      dx = 2 * dot * mx - dx; dy = 2 * dot * my - dy; px = cx; py = cy;
      mirrors.push({ x: Math.round(cx * 10) / 10, y: Math.round(cy * 10) / 10 }); solution.push(a);
    }
    if (!ok) continue;
    const reach = 20 + r() * 12, ex = px + dx * reach, ey = py + dy * reach;
    if (!inField(ex, ey, 9) || mirrors.some(m => Math.hypot(m.x - ex, m.y - ey) < 16)) continue;
    const level = { source, mirrors, exit: { x: Math.round(ex * 10) / 10, y: Math.round(ey * 10) / 10 }, solution };
    // recomputed (rounded) positions must still hit the exit through every mirror in order
    const check = trace(level, solution);
    if (!check.hit || check.order.length !== n || check.order.some((m, i) => m !== i)) continue;
    for (let tries = 0; tries < 20; tries++) {
      const start = solution.map(a => norm(a + MIRROR_STEP * (1 + Math.floor(r() * (MIRROR_STATES - 1)))));
      if (!trace(level, start).hit) return { ...level, start };
    }
  }
  // unreachable in practice (tests sweep seeds); keep a known-good hand layout so the game never hangs
  const level = { source: { x: 0, y: 50, dir: 0 }, mirrors: [{ x: 50, y: 50 }, { x: 50, y: 20 }], exit: { x: 80, y: 20 }, solution: [45, 135] };
  return { ...level, start: [0, 0] };
}

export function create(seed = 1) {
  const level = makeLevel(seed), angles = [...level.start];
  let time = 0, hold = 0, selected = 0, solvedAt = null, done = false, beam = trace(level, angles);
  return {
    level,
    step(dt) {
      if (done || !Number.isFinite(dt) || dt <= 0) return;
      dt = Math.min(dt, SECONDS - time); time += dt;
      beam = trace(level, angles);
      if (beam.hit) { hold += dt; if (hold >= HOLD_SECONDS) { solvedAt = time; done = true; } } else hold = 0;
      if (time >= SECONDS) done = true;
    },
    input(a) {
      if (done || !a || typeof a !== 'object') return;
      const i = a.index ?? selected;
      if (!Number.isInteger(i) || i < 0 || i >= angles.length) return;
      if (a.type === 'select') selected = i;
      else if (a.type === 'rotate' && Number.isFinite(a.delta)) { selected = i; angles[i] = norm(angles[i] + Math.round(a.delta / MIRROR_STEP) * MIRROR_STEP); }
      else if (a.type === 'set' && Number.isFinite(a.angle)) { selected = i; angles[i] = norm(Math.round(a.angle / MIRROR_STEP) * MIRROR_STEP); }
      beam = trace(level, angles);
      if (!beam.hit) hold = 0;
    },
    view() { return { kind: 'mirror', time, seconds: SECONDS, angles: [...angles], selected, beam, hold, solved: solvedAt != null, done }; },
    score() { return solvedAt == null ? 0 : clamp(Math.round(100 - Math.max(0, solvedAt - 15) * (40 / 30)), 60, 100); },
    completed() { return solvedAt != null; },
  };
}

export function mount(host, engine, ctx) {
  const level = engine.level, svg = (tag, props = {}, ...kids) => el(tag, { svg: true, ...props }, ...kids);
  const info = el('p', { cls: 'tr-info', attrs: { 'aria-live': 'off' } });
  const bar = el('progress', { max: HOLD_SECONDS, value: 0, attrs: { 'aria-label': 'ค้างแสง / Hold the light' } });
  const beam = svg('polyline', { cls: 'tr-beam', attrs: { points: '' } });
  const exitRing = svg('circle', { cls: 'tr-exit', attrs: { cx: level.exit.x, cy: level.exit.y, r: EXIT_R } });
  const exitLabel = svg('text', { cls: 'tr-exit-label', text: '⛩', attrs: { x: level.exit.x, y: level.exit.y + 2.6, 'text-anchor': 'middle' } });
  const mirrors = level.mirrors.map((m, i) => {
    const line = svg('line', { cls: 'tr-mirror', attrs: { x1: m.x - MIRROR_HALF, y1: m.y, x2: m.x + MIRROR_HALF, y2: m.y } });
    const hit = svg('circle', { cls: 'tr-hit', attrs: { cx: m.x, cy: m.y, r: 10 } });
    const num = svg('text', { cls: 'tr-num', text: String(i + 1), attrs: { x: m.x, y: m.y - 11.5, 'text-anchor': 'middle' } });
    const g = svg('g', { cls: 'tr-mirror-g', attrs: { 'data-mirror': i } }, line, hit, num);
    return { g, line, hit, num, m };
  });
  const board = svg('svg', { cls: 'tr-board', attrs: { viewBox: '0 0 100 100', role: 'img', 'aria-label': 'กระจกและลำแสง / Mirrors and light beam' } },
    svg('rect', { attrs: { x: 0, y: 0, width: 100, height: 100, class: 'tr-bg' } }),
    svg('circle', { cls: 'tr-source', attrs: { cx: level.source.x + 2, cy: level.source.y, r: 3 } }),
    beam, exitRing, exitLabel, ...mirrors.map(x => x.g));
  board.style.touchAction = 'none';
  const label = el('p', { cls: 'tr-label' });
  const left = el('button', { type: 'button', cls: 'tr-btn', text: '↺ −15°' });
  const right = el('button', { type: 'button', cls: 'tr-btn', text: '↻ +15°' });
  const selectors = mirrors.map((x, i) => el('button', { type: 'button', cls: 'tr-btn tr-pick', text: `🪞${i + 1}` }));
  const row = el('div', { cls: 'tr-row' }, left, ...selectors, right);
  host.replaceChildren(info, board, bar, label, row);
  let view = engine.view();
  ctx.listen(left, 'click', () => ctx.input({ type: 'rotate', delta: -15 }));
  ctx.listen(right, 'click', () => ctx.input({ type: 'rotate', delta: 15 }));
  selectors.forEach((b, i) => ctx.listen(b, 'click', () => ctx.input({ type: 'select', index: i })));
  ctx.listen(board, 'keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); ctx.input({ type: 'rotate', delta: -15 }); }
    if (e.key === 'ArrowRight') { e.preventDefault(); ctx.input({ type: 'rotate', delta: 15 }); }
  });
  // tap a mirror to select it; drag around it to turn it (relative, so a tap never changes the angle)
  const point = e => { const b = board.getBoundingClientRect(); return { x: (e.clientX - b.left) / (b.width || 1) * 100, y: (e.clientY - b.top) / (b.height || 1) * 100, px: e.clientX, py: e.clientY }; };
  let drag = null;
  mirrors.forEach((x, i) => {
    ctx.listen(x.hit, 'pointerdown', e => {
      e.preventDefault(); ctx.input({ type: 'select', index: i });
      const p = point(e); drag = { i, a0: Math.atan2(p.y - x.m.y, p.x - x.m.x) * 180 / Math.PI, base: view.angles[i], px: p.px, py: p.py, moved: false };
      e.target.setPointerCapture?.(e.pointerId);
    });
  });
  ctx.listen(board, 'pointermove', e => {
    if (!drag) return;
    const p = point(e), m = level.mirrors[drag.i];
    if (!drag.moved && Math.hypot(p.px - drag.px, p.py - drag.py) < 10) return;
    drag.moved = true;
    const now = Math.atan2(p.y - m.y, p.x - m.x) * 180 / Math.PI;
    ctx.input({ type: 'set', index: drag.i, angle: drag.base + (now - drag.a0) });
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) ctx.listen(board, name, () => { drag = null; });
  return {
    update(v, pause) {
      view = v;
      beam.setAttribute('points', v.beam.path.map(p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' '));
      beam.setAttribute('class', v.beam.hit ? 'tr-beam lit' : 'tr-beam');
      exitRing.setAttribute('class', v.beam.hit ? 'tr-exit lit' : 'tr-exit');
      mirrors.forEach((x, i) => {
        x.g.setAttribute('class', `tr-mirror-g${i === v.selected ? ' sel' : ''}`);
        x.line.setAttribute('transform', `rotate(${v.angles[i]} ${x.m.x} ${x.m.y})`);
      });
      selectors.forEach((b, i) => b.setAttribute('aria-pressed', String(i === v.selected)));
      bar.value = v.hold;
      info.textContent = pause ? 'หยุดพัก / Paused'
        : clockText(v.beam.hit ? `ค้างแสง / Hold ${v.hold.toFixed(1)}/${HOLD_SECONDS}s` : 'ส่องแสงไปที่ทางออก ⛩ / Light the exit ⛩', v.seconds, v.time);
      label.textContent = `กระจก / Mirror ${v.selected + 1}/${v.angles.length} · ${v.angles[v.selected]}°`;
      for (const b of [left, right, ...selectors]) b.disabled = pause;
    },
  };
}
