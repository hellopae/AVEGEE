// B8 ngiw → ดำ — Hacking the thorn tree. Every 2.5 s a chopping mark appears on the trunk (and, in half of the
// slots, a thorn somewhere else). Tap marks, avoid thorns: 12 marks in 30 s, 8 must be cut; a thorn costs half a mark.
import { rng, el, clockText } from './kit.js';

export const SECONDS = 30, SLOTS = 12, SLOT = 2.5, LIFE = 1.6, NEED = 8, COLS = 3, ROWS = 4, THORN_SLOTS = 6, THORN_COST = .5;

/** Deterministic schedule: [{ cut:cell, thorn:cell|null }] — thorn never shares the cut cell, consecutive cuts differ. */
export function makeSchedule(seed) {
  const r = rng(seed * 15485863 + 11), cells = COLS * ROWS;
  const order = Array.from({ length: SLOTS }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const thornAt = new Set(order.slice(0, THORN_SLOTS));
  const slots = []; let previous = -1;
  for (let i = 0; i < SLOTS; i++) {
    let cut; do { cut = Math.floor(r() * cells); } while (cut === previous);
    let thorn = null;
    if (thornAt.has(i)) { do { thorn = Math.floor(r() * cells); } while (thorn === cut); }
    slots.push({ cut, thorn }); previous = cut;
  }
  return slots;
}

export function create(seed = 1) {
  const schedule = makeSchedule(seed), used = schedule.map(() => ({ cut: false, thorn: false }));
  let time = 0, cuts = 0, thorns = 0, lastThornAt = -9;
  const here = () => { const slot = Math.min(SLOTS - 1, Math.floor(time / SLOT)), local = time - slot * SLOT; return { slot, local, open: time < SECONDS && local <= LIFE }; };
  return {
    schedule,
    step(dt) {
      if (time >= SECONDS || !Number.isFinite(dt) || dt <= 0) return;
      time = Math.min(SECONDS, time + dt);
    },
    input(a) {
      if (time >= SECONDS || !a || typeof a !== 'object' || a.type !== 'tap') return;
      const { slot, open } = here();
      if (!open || a.slot !== slot || used[slot][a.kind] !== false) return;      // only the spot that is on screen right now
      if (a.kind === 'thorn' && schedule[slot].thorn == null) return;
      used[slot][a.kind] = true;
      if (a.kind === 'cut') cuts++; else { thorns++; lastThornAt = time; }
    },
    view() {
      const { slot, local, open } = here(), spots = [];
      if (open) {
        const s = schedule[slot], life = 1 - local / LIFE;
        if (!used[slot].cut) spots.push({ key: `cut:${slot}`, kind: 'cut', slot, cell: s.cut, col: s.cut % COLS, row: Math.floor(s.cut / COLS), life });
        if (s.thorn != null && !used[slot].thorn) spots.push({ key: `thorn:${slot}`, kind: 'thorn', slot, cell: s.thorn, col: s.thorn % COLS, row: Math.floor(s.thorn / COLS), life });
      }
      return { kind: 'targets', time, seconds: SECONDS, slot: slot + 1, slots: SLOTS, spots, cuts, thorns, hurt: time - lastThornAt < .45, done: time >= SECONDS };
    },
    score() { return Math.round(Math.max(0, Math.min(100, (cuts - THORN_COST * thorns) / SLOTS * 100))); },
    completed() { return cuts >= NEED; },
  };
}

export function mount(host, engine, ctx) {
  const info = el('p', { cls: 'tr-info' });
  const trunk = el('div', { cls: 'tr-trunk' });
  const legend = el('p', { cls: 'tr-label', text: '🪓 ฟัน / Chop · 🌵 หนาม — อย่าแตะ / Do not touch' });
  host.replaceChildren(info, trunk, legend);
  let shown = '', buttons = [];
  const tap = (spot, e) => { e?.preventDefault?.(); ctx.input({ type: 'tap', slot: spot.slot, kind: spot.kind }); };
  return {
    update(v, pause) {
      const key = v.spots.map(s => s.key).join();
      if (key !== shown) {
        shown = key;
        buttons = v.spots.map(s => {
          const b = el('button', { type: 'button', cls: `tr-spot ${s.kind}`, text: s.kind === 'cut' ? '🪓' : '🌵',
            attrs: { 'aria-label': s.kind === 'cut' ? 'จุดฟัน / Chop mark' : 'หนาม อย่าแตะ / Thorn, do not touch' } });
          b.style.left = `${(s.col + .5) / 3 * 100}%`; b.style.top = `${(s.row + .5) / 4 * 100}%`;
          ctx.listen(b, 'pointerdown', e => tap(s, e));
          ctx.listen(b, 'click', e => tap(s, e));
          return b;
        });
        trunk.replaceChildren(...buttons);
      }
      v.spots.forEach((s, i) => { buttons[i].style.opacity = String(.45 + .55 * s.life); buttons[i].disabled = pause; });
      trunk.setAttribute('class', `tr-trunk${v.hurt ? ' hurt' : ''}`);
      info.textContent = pause ? 'หยุดพัก / Paused'
        : clockText(`🪓 ${v.cuts}/${NEED} · 🌵 ${v.thorns} · ${Math.min(v.slots, v.slot)}/${v.slots}`, v.seconds, v.time);
    },
  };
}
