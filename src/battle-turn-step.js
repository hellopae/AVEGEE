// L2: how far the actor whose turn it is steps out of the formation.
// Pure numbers (stage-local px, opaque sprite bounds {l,t,r,b}) so tests can pin the behaviour.
// Rule: after the step the active sprite's bounds touch no teammate and no enemy bounds (plus a gap).

const hit = (a, b, gap) => a.l < b.r + gap && a.r > b.l - gap && a.t < b.b + gap && a.b > b.t - gap;
const overlapArea = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
const shift = (r, dx, dy) => ({ l:r.l + dx, r:r.r + dx, t:r.t + dy, b:r.b + dy });

/** active: bounds of the stepping sprite at its slot · others: teammate bounds · foes: enemy bounds
 *  base: {x,y} the old fixed step (minimum, y is negative = up) · bounds: {l,t,r,b} the step must stay inside
 *  Returns { x, y, clear } — clear=false when no clear spot exists (least overlap is returned). */
export function planTurnStep({ active, others = [], foes = [], base, bounds, gap = 6, stepPx = 4 }) {
  const obstacles = [...others, ...foes];
  const rows = [0, 1, 2, 3].map(i => base.y * (1 + i * 0.9));
  let best = null, fallback = null;
  for (const dy of rows) {
    for (let dx = base.x; ; dx += stepPx) {
      const r = shift(active, dx, dy);
      if (r.r > bounds.r || r.t < bounds.t) break;
      const blocked = obstacles.filter(o => hit(r, o, gap));
      if (!blocked.length) {
        const cost = Math.hypot(dx - base.x, dy - base.y) + Math.abs(dx) * .15 + Math.abs(dy) * .15;
        if (!best || cost < best.cost) best = { x:dx, y:dy, cost, clear:true };
        break;
      }
      const lost = blocked.reduce((s, o) => s + overlapArea(r, o), 0);
      if (!fallback || lost < fallback.lost) fallback = { x:dx, y:dy, lost, clear:false };
    }
  }
  if (best) return { x:best.x, y:best.y, clear:true };
  return fallback ? { x:fallback.x, y:fallback.y, clear:false } : { x:base.x, y:base.y, clear:false };
}
