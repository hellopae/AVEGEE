// T3/5 (owner 15-18 Nov, F13 follow-up "ตัดรั้วออกมาดีกว่าครับ"): the rail on the NEAR side of each of the 13 bridges is painted into the ground picture, so it never hid the legs of
// somebody standing on the deck behind it.  The rail is cut out in CODE: at depth of the bridge's near edge the very pixels of the graded ground that make up the rail band are drawn again,
// clipped to that band (town-terrain drawTownGroundRectIfReady - the same graded chunks the camera shows, so lighting / fog / grade match to the pixel).  Nothing is drawn, recoloured
// or filtered; the picture is untouched.  Characters whose feet are above the near edge (on the deck) are drawn first and the rail band lands over their lowest few pixels.
import { BRIDGE_RAILS } from './town-bridge-rails.js';
import { drawTownGroundRectIfReady } from './town-terrain.js?v=k1d';

/** where the rail band starts / ends relative to the deck centre line: from the post tops (a fraction of the deck half-width below the centre line) to just below the near edge (world units) */
export const RAIL_BAND = Object.freeze({ topK: .45, below: 8, slices: 3 });
export const RAIL_FRONT = { on: true };        // false = draw nothing (before / after evidence, one switch if the owner wants the old look back)
export const setBridgeRailFront = on => { RAIL_FRONT.on = !!on; };

/** y of the deck centre line of bridge `b` at x (linear between path points; clamped at the ends) */
export function deckY(b, x) {
  const p = b.path;
  if (x <= p[0][0]) return p[0][1];
  for (let i = 1; i < p.length; i++) if (x <= p[i][0]) { const a = p[i - 1], c = p[i], t = c[0] === a[0] ? 0 : (x - a[0]) / (c[0] - a[0]); return a[1] + (c[1] - a[1]) * t; }
  return p[p.length - 1][1];
}
/** the slices of the rail band of bridge `b`: [{ poly:[[x,y]...], depth, rect:[x,y,w,h] }] (world units) */
export function railBandSlices(b, band = RAIL_BAND) {
  const [x0, , x1] = b.rect, out = [], n = band.slices, step = (x1 - x0) / n, N = 6;
  for (let s = 0; s < n; s++) {
    const a = x0 + s * step, e = a + step, top = [], bottom = [];
    let depth = -Infinity;
    for (let i = 0; i <= N; i++) {
      const x = a + (e - a) * i / N, yc = deckY(b, x);
      top.push([x, yc + b.hw * band.topK]); bottom.push([x, yc + b.hw + band.below]);
      depth = Math.max(depth, yc + b.hw);
    }
    const poly = [...top, ...bottom.reverse()];
    const ys = poly.map(p => p[1]);
    out.push({ poly, depth: depth + 1, rect: [a, Math.min(...ys), e - a, Math.max(...ys) - Math.min(...ys)] });
  }
  return out;
}
/** queue the rail bands of the bridges of `zone` that touch the camera view into the scene's depth-sorted layer list `at(y, fn)` */
export function addBridgeRailFrontLayers(at, ctx, zone, time = 0, table = BRIDGE_RAILS) {
  const list = RAIL_FRONT.on && table[zone];
  if (!list) return 0;
  const m = ctx.getTransform?.();
  const view = m && !m.b && !m.c && m.a > 0 && m.d > 0 ? [-m.e / m.a, -m.f / m.d, ctx.canvas.width / m.a, ctx.canvas.height / m.d] : null;
  let queued = 0;
  for (const b of list) {
    const r = b.rect;
    if (view && (r[2] < view[0] - 60 || r[0] > view[0] + view[2] + 60 || r[3] + 40 < view[1] - 60 || r[1] > view[1] + view[3] + 60)) continue;
    for (const s of railBandSlices(b)) {
      queued++;
      at(s.depth, () => {
        ctx.save(); ctx.beginPath();
        s.poly.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
        ctx.closePath(); ctx.clip();
        drawTownGroundRectIfReady(ctx, s.rect, time);
        ctx.restore();
      });
    }
  }
  return queued;
}
