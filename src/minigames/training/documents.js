// B8 sala → นิรา — Document sorting. Tap two neighbouring documents to swap them. Two sets in 45 s:
//   set 1 = by number (1 → 6), set 2 = by category (● → ▲ → ■) and then by number inside a category.
// Boards are made by scrambling the sorted order with a few adjacent swaps, so every board is solvable
// (adjacent swaps reach any order); the fewest swaps needed = the number of inversions.
import { rng, el, clockText } from './kit.js';

export const SECONDS = 45, SIZE = 6, SETS = 2, CATEGORIES = ['●', '▲', '■'];
const keyOf = (mode, d) => mode === 'category' ? d.c * 10 + d.n : d.n;

export function inversions(list, mode) {
  let n = 0;
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (keyOf(mode, list[i]) > keyOf(mode, list[j])) n++;
  return n;
}
export const isSorted = (list, mode) => inversions(list, mode) === 0;

/** { mode, target:[docs sorted], start:[docs scrambled], minSwaps } — deterministic for (seed, index). */
export function makeSet(seed, index) {
  const r = rng(seed * 104729 + index * 7919 + 3), mode = index === 0 ? 'number' : 'category';
  const numbers = [1, 2, 3, 4, 5, 6];
  for (let i = 5; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [numbers[i], numbers[j]] = [numbers[j], numbers[i]]; }
  const docs = mode === 'number'
    ? numbers.map((n, i) => ({ id: i, n: i + 1, c: i % 3 }))
    : numbers.map((n, i) => ({ id: i, n, c: Math.floor(i / 2) }));
  const target = [...docs].sort((a, b) => keyOf(mode, a) - keyOf(mode, b));
  for (let attempt = 0; attempt < 100; attempt++) {
    const start = [...target], swaps = 4 + Math.floor(r() * 3);
    for (let s = 0; s < swaps; s++) { const p = Math.floor(r() * (SIZE - 1)); [start[p], start[p + 1]] = [start[p + 1], start[p]]; }
    const minSwaps = inversions(start, mode);
    if (minSwaps >= 3 && minSwaps <= 6) return { mode, target, start, minSwaps };
  }
  const start = [...target]; [start[0], start[1]] = [start[1], start[0]]; [start[2], start[3]] = [start[3], start[2]]; [start[4], start[5]] = [start[5], start[4]];
  return { mode, target, start, minSwaps: inversions(start, mode) };
}

export function create(seed = 1) {
  const sets = Array.from({ length: SETS }, (_, i) => { const s = makeSet(seed, i); return { ...s, docs: [...s.start], swaps: 0, solved: false }; });
  let time = 0, current = 0, selected = null, done = false;
  const setScore = s => s.solved ? 50 * (1 - Math.min(.3, .05 * (s.swaps - s.minSwaps)))
    : 20 * s.docs.filter((d, i) => d.id === s.target[i].id).length / SIZE;
  return {
    sets,
    step(dt) {
      if (done || !Number.isFinite(dt) || dt <= 0) return;
      time = Math.min(SECONDS, time + dt);
      if (time >= SECONDS) done = true;
    },
    input(a) {
      if (done || !a || typeof a !== 'object' || a.type !== 'tap' || !Number.isInteger(a.index) || a.index < 0 || a.index >= SIZE) return;
      const s = sets[current];
      if (selected == null || selected === a.index) { selected = selected === a.index ? null : a.index; return; }
      if (Math.abs(selected - a.index) !== 1) { selected = a.index; return; }
      [s.docs[selected], s.docs[a.index]] = [s.docs[a.index], s.docs[selected]];
      s.swaps++; selected = null;
      if (isSorted(s.docs, s.mode)) {
        s.solved = true;
        if (current + 1 < SETS) current++; else done = true;
      }
    },
    view() {
      const s = sets[Math.min(current, SETS - 1)];
      return { kind: 'documents', time, seconds: SECONDS, set: current + 1, sets: SETS, mode: s.mode, selected, swaps: s.swaps, minSwaps: s.minSwaps,
        docs: s.docs.map((d, i) => ({ n: d.n, c: d.c, right: d.id === s.target[i].id })), solvedSets: sets.filter(x => x.solved).length, done };
    },
    score() { return Math.round(sets.reduce((sum, s) => sum + setScore(s), 0)); },
    completed() { return sets.every(s => s.solved); },
  };
}

export function mount(host, engine, ctx) {
  const info = el('p', { cls: 'tr-info' });
  const rule = el('p', { cls: 'tr-label' });
  const row = el('div', { cls: 'tr-docs' });
  const buttons = Array.from({ length: SIZE }, (_, i) => {
    const num = el('b', { cls: 'tr-doc-n' }), cat = el('span', { cls: 'tr-doc-c' });
    const b = el('button', { type: 'button', cls: 'tr-doc' }, num, cat);
    ctx.listen(b, 'click', () => ctx.input({ type: 'tap', index: i }));
    row.append(b);
    return { b, num, cat };
  });
  const hint = el('p', { cls: 'tr-label', text: 'แตะเอกสารสองใบที่อยู่ติดกันเพื่อสลับ · Tap two neighbouring documents to swap them' });
  host.replaceChildren(info, rule, row, hint);
  return {
    update(v, pause) {
      info.textContent = pause ? 'หยุดพัก / Paused' : clockText(`ชุด / Set ${v.set}/${v.sets} · สลับ / Swaps ${v.swaps} (${v.minSwaps})`, v.seconds, v.time);
      rule.textContent = v.mode === 'number'
        ? 'เรียงเลข น้อย → มาก / Sort by number, low → high'
        : `เรียงหมวด ${CATEGORIES.join(' → ')} แล้วเลขน้อย → มาก / By category ${CATEGORIES.join(' → ')}, then number`;
      v.docs.forEach((d, i) => {
        const x = buttons[i];
        x.num.textContent = String(d.n);
        x.cat.textContent = v.mode === 'category' ? CATEGORIES[d.c] : '';
        x.b.setAttribute('class', `tr-doc c${v.mode === 'category' ? d.c : 'x'}${i === v.selected ? ' sel' : ''}${d.right ? ' right' : ''}`);
        x.b.setAttribute('aria-label', `เอกสาร ${d.n}${v.mode === 'category' ? ` หมวด ${CATEGORIES[d.c]}` : ''} / Document ${d.n}`);
        x.b.setAttribute('aria-pressed', String(i === v.selected));
        x.b.disabled = pause;
      });
    },
  };
}
