// K5: pick where the battle command flyout / hint strip goes, from measured rectangles
// (stage-local px: {l,t,r,b}). Pure numbers, no DOM, so tests can pin the behaviour.
// hard = rectangles that must stay readable (enemy sprites, name plates, HP bars)
// soft = things we would rather not cover (allies, team HUD, talk box) but may if nothing else fits.
const area = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
const padRect = (r, p) => ({ l:r.l - p, t:r.t - p, r:r.r + p, b:r.b + p });

/** candidates: [{ key, x, y, penalty? }] top-left corners of a box of `size` ({w,h}).
 *  Returns the lowest-cost candidate with its (possibly shortened) height, or null.
 *  A box that has to be shortened keeps scrolling inside; shortening is cheaper than covering an enemy. */
export function planPlacement({ size, candidates, hard = [], soft = [], bounds, minH = 40, margin = 4 }) {
  let best = null;
  for (const c of candidates) {
    const y = Math.max(bounds.t, c.y), h = Math.min(size.h, bounds.b - y);
    if (h < Math.min(minH, size.h)) continue;
    if (c.x < bounds.l - 0.5 || c.x + size.w > bounds.r + 0.5) continue;
    const box = { l:c.x, t:y, r:c.x + size.w, b:y + h };
    const hardHit = hard.reduce((s, r) => s + area(box, padRect(r, margin)), 0);
    const softHit = soft.reduce((s, r) => s + area(box, r), 0);
    const cost = hardHit * 100 + softHit * 3 + (size.h - h) * size.w * 2 + Math.abs(y - c.y) * 20 + (c.penalty || 0);
    if (!best || cost < best.cost) best = { key:c.key, x:c.x, y, h, hardHit, softHit, cost };
  }
  return best;
}
