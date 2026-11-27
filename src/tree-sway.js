// FB3-T9 / O2 (owner 22 Nov): the trees on the town map sway in the wind - every colour, every zone, one rule.
// The roots and the trunk stand still; the canopy slides a little, the higher the more, in the same gusts as the trees inside the rooms (room-tree-wind.js `roomWindAt`).
// It is a shear of the sprite's own pixels cut into horizontal bands: nothing is recoloured, drawn over or replaced, so a drawing saved over a tree file still sways with no code change.
import { roomWindAt } from './room-tree-wind.js';
import { LossWeakMap } from './gpu-budget.js';

/** The part of the sprite (from the top, 0..1) that may move; below it the trunk and roots are drawn in one piece, exactly where they always were. */
export const SWAY_CANOPY = .56;
/** The canopy is cut into this many bands (the more, the smaller the step between two neighbours - a step of a third of a pixel cannot be seen). */
export const SWAY_BANDS = 8;
/** Largest slide of the topmost band at the peak of a gust, as a share of the tree's drawn width (same size as the rooms' trees: ~0.8 %, a little more for the bigger map trees). */
export const SWAY_AMPLITUDE = .011;
/** A gust crosses this many map pixels per room-width of travel (the rooms use image widths; the map is 3840 px wide). */
export const SWAY_WORLD_SCALE = 1400;

const smooth = x => x * x * (3 - 2 * x);

/** The slide of one band: `band` 0 = the top, SWAY_BANDS-1 = the lowest band of the canopy. Returns { dx, dy } in pixels of a tree `width` px wide; the trunk piece never moves (0, 0). */
export function swayBandOffset(timeMs, worldX, width, band) {
  if (!(band >= 0) || band >= SWAY_BANDS) return { dx:0, dy:0 };
  const { strength, wave } = roomWindAt(timeMs, worldX / SWAY_WORLD_SCALE);
  const reach = 1 - (band + .5) / SWAY_BANDS;            // 1 at the top of the canopy, 0 where the trunk starts
  const k = smooth(reach) * strength;
  return { dx:k * (1 + wave * .62) * SWAY_AMPLITUDE * width, dy:-k * (.5 + wave * .35) * SWAY_AMPLITUDE * width * .8 };
}

/** The tree's own pixels at the size it is drawn (device pixels), baked once per (sprite, size); the bands are then plain 1:1 copies, so a swaying tree costs a few blits and no resampling. */
const baked = new LossWeakMap();   // a GPU loss empties it: the next frame bakes the pixels again from the image
const BAKE_MAX = 10;
function bakeFor(image, w, h) {
  let per = baked.get(image); if (!per) { per = new Map(); baked.set(image, per); }
  const key = w + 'x' + h; let c = per.get(key);
  if (!c) {
    if (per.size >= BAKE_MAX) per.clear();
    c = document.createElement('canvas'); c.width = w; c.height = h;
    const p = c.getContext('2d'); p.imageSmoothingEnabled = true; p.imageSmoothingQuality = 'high'; p.drawImage(image, 0, 0, w, h);
    per.set(key, c);
  }
  return c;
}

/** Draw the sprite with its canopy swaying. (left, top) = the corner where a still draw would put it, w x h = its drawn size (map units). Falls back to one still draw whenever it cannot slice (no transform support, tiny size). */
export function drawSwayingTree(ctx, image, left, top, w, h, timeMs, worldX) {
  const m = ctx.getTransform?.();
  const sx = m ? Math.abs(m.a) : 1, sy = m ? Math.abs(m.d) : 1;
  const pw = Math.round(w * sx), ph = Math.round(h * sy);
  if ((m && (m.b || m.c)) || pw < 24 || ph < 24 || !(image.naturalWidth || image.width)) { ctx.drawImage(image, left, top, w, h); return false; }
  const tree = bakeFor(image, pw, ph);
  const canopyPx = Math.max(SWAY_BANDS, Math.round(ph * SWAY_CANOPY)), bandPx = canopyPx / SWAY_BANDS;
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';   // 1:1 copies of the baked pixels; the slide is a fraction of a pixel per frame, so smoothing keeps it from stepping
  const unitX = 1 / sx, unitY = 1 / sy;
  // trunk + roots: one piece, never moved
  ctx.drawImage(tree, 0, canopyPx, pw, ph - canopyPx, left, top + canopyPx * unitY, w, (ph - canopyPx) * unitY);
  for (let i = 0; i < SWAY_BANDS; i++) {
    const y0 = Math.floor(i * bandPx), y1 = i === SWAY_BANDS - 1 ? canopyPx : Math.floor((i + 1) * bandPx) + 1;   // +1 px overlap: no hairline between bands
    const { dx, dy } = swayBandOffset(timeMs, worldX, w, i);
    ctx.drawImage(tree, 0, y0, pw, y1 - y0, left + dx, top + y0 * unitY + dy, w, (y1 - y0) * unitY);
  }
  ctx.restore();
  return true;
}
