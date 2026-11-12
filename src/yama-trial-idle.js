// N2 — Yama stands still in the interrogation room: the map's drawn book-idle pose (blink only, feet and head never move)
// replaces the static painting that used to bob up and down via CSS. Frames come from the same atlas the map uses
// (img/yama-animation-v1/<style>/book-idle.webp, row 0 = facing the camera). Each frame is composed ONCE at native
// resolution into a canvas that has the same aspect/ratio and the same visible body box as the painting it replaces, so every
// existing CSS rule for `.trial-hud .hud-stage .fig img` (height, position) keeps working untouched.
// Any failure = the painting simply stays (still). Reduced motion = the painting stays (still).
import { yamaAnimationSrc, yamaAnimationStyle, animationFrame } from './yama-animation.js?v=20261015-live-v1';

// FB2-v1: the four atlas poses are four separate drawings (crown/horns/robe redrawn each time, head and robe sit 1-4 px apart),
// so the old cycle 0 -> 1 -> 2 -> 3 -> 0 popped drawing-to-drawing four times per cycle and read as a stutter on every blink.
// Now every change goes through pose 0 (hold -> blink -> hold -> glance -> hold: two pops per blink instead of three) and each
// pose is registered onto pose 0 (whole pixels, search +-6) so the head/body stay put. Nothing is recoloured or resized.
export const TRIAL_IDLE_TIMING = Object.freeze([1300, 120, 1100, 320]);
export const TRIAL_IDLE_POSES = Object.freeze([0, 2, 0, 1]);   // atlas column shown during each TRIAL_IDLE_TIMING slot
const FRAME_W = 320, FRAME_H = 480, COLS = 4, ROW = 0, ALPHA = 8, ALIGN_RANGE = 6;

const atlases = new Map();   // src -> Promise<HTMLImageElement|null>
const built = new Map();     // `${style}|${paintingSrc}` -> Promise<string[]|null> (4 object URLs)
const ready = new Map();     // style -> frame URLs once built (re-renders attach instantly, no flash of the painting)
const live = new Set();      // <img> currently animated
let timer = 0;

const load = src => {
  if (!atlases.has(src)) atlases.set(src, new Promise(res => {
    const im = new Image(); im.onload = () => res(im); im.onerror = () => { atlases.delete(src); res(null); }; im.src = src;
  }));
  return atlases.get(src);
};
const bboxOf = (ctx, w, h) => {
  const d = ctx.getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > ALPHA) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : { x0, y0, x1: x1 + 1, y1: y1 + 1 };
};
/** Whole-pixel shift (dx,dy) that lays `cur` onto `ref` (RGBA, w*h, premultiplied by alpha) with the least colour difference inside `box`;
 *  rows above `box.headY` (crown/face) count double so the face is what stays still. Pure — exported for tests. */
export function bestShift(ref, cur, w, h, box, range = ALIGN_RANGE) {
  const diff = (dx, dy, st) => {
    let sum = 0;
    for (let y = box.y0; y < box.y1; y += st) {
      const sy = y - dy; if (sy < 0 || sy >= h) { sum += 255 * 3 * w / st; continue; }
      const wgt = y < box.headY ? 2 : 1;
      for (let x = box.x0; x < box.x1; x += st) {
        const sx = x - dx, i = (y * w + x) * 4, j = (sy * w + sx) * 4;
        if (sx < 0 || sx >= w) { sum += 255 * 3 * wgt; continue; }
        const a = ref[i + 3] / 255, b = cur[j + 3] / 255;
        sum += wgt * (Math.abs(ref[i] * a - cur[j] * b) + Math.abs(ref[i + 1] * a - cur[j + 1] * b) + Math.abs(ref[i + 2] * a - cur[j + 2] * b));
      }
    }
    return sum;
  };
  // coarse pass on every 2nd pixel (4x cheaper — this runs once per outfit on the main thread, phones included), then an exact pass around the winner
  let best = { d: diff(0, 0, 2), dx: 0, dy: 0 };
  for (let dy = -range; dy <= range; dy++) for (let dx = -range; dx <= range; dx++) {
    if (!dx && !dy) continue;
    const d = diff(dx, dy, 2); if (d < best.d * 0.98) best = { d, dx, dy };   // need a real improvement (>2%) to move a pose off its drawn place
  }
  let fine = { d: diff(best.dx, best.dy, 1), dx: best.dx, dy: best.dy };
  for (let dy = best.dy - 1; dy <= best.dy + 1; dy++) for (let dx = best.dx - 1; dx <= best.dx + 1; dx++) {
    const d = diff(dx, dy, 1); if (d < fine.d) fine = { d, dx, dy };
  }
  const zero = diff(0, 0, 1);
  return zero <= fine.d * 1.02 ? { dx: 0, dy: 0 } : { dx: fine.dx, dy: fine.dy };
}
const toUrl = canvas => new Promise(res => canvas.toBlob(b => res(b ? URL.createObjectURL(b) : null), 'image/png'));

/** Compose the 4 idle frames to match the painting's body box. Exported for tests/tools. */
export async function buildIdleFrames(style, painting) {
  const atlas = await load(yamaAnimationSrc(style, 'book-idle'));
  const W = painting.naturalWidth, H = painting.naturalHeight;
  if (!atlas || !W || !H) return null;
  const probe = document.createElement('canvas'); probe.width = W; probe.height = H;
  const pctx = probe.getContext('2d', { willReadFrequently: true }); pctx.drawImage(painting, 0, 0);
  const body = bboxOf(pctx, W, H); if (!body) return null;
  // sprite body box = union over the 4 frames, so the anchor never wobbles between frames
  const sc = document.createElement('canvas'); sc.width = FRAME_W; sc.height = FRAME_H;
  const sctx = sc.getContext('2d', { willReadFrequently: true });
  let u = null; const pix = [];
  for (let f = 0; f < COLS; f++) {
    sctx.clearRect(0, 0, FRAME_W, FRAME_H);
    sctx.drawImage(atlas, f * FRAME_W, ROW * FRAME_H, FRAME_W, FRAME_H, 0, 0, FRAME_W, FRAME_H);
    const b = bboxOf(sctx, FRAME_W, FRAME_H); if (!b) return null;
    pix.push(sctx.getImageData(0, 0, FRAME_W, FRAME_H).data);
    u = u ? { x0: Math.min(u.x0, b.x0), y0: Math.min(u.y0, b.y0), x1: Math.max(u.x1, b.x1), y1: Math.max(u.y1, b.y1) } : b;
  }
  // register poses 1..3 onto pose 0 (the pose that is on screen most of the time and never moves)
  const box = { x0: u.x0, x1: u.x1, y0: u.y0, y1: u.y1, headY: u.y0 + Math.round((u.y1 - u.y0) * 0.6) };
  const shifts = pix.map((d, f) => f ? bestShift(pix[0], d, FRAME_W, FRAME_H, box) : { dx: 0, dy: 0 });
  // k: output pixels per sprite pixel, chosen so the body is as tall as the painting's (sprite drawn 1:1, no resampling)
  const k = (body.y1 - body.y0) / (u.y1 - u.y0), outW = Math.max(1, Math.round(W / k)), outH = Math.max(1, Math.round(H / k));
  const dx = Math.round((body.x0 + body.x1) / 2 / k - (u.x0 + u.x1) / 2), dy = Math.round(body.y1 / k - u.y1);
  const urls = [];
  for (let f = 0; f < COLS; f++) {
    const c = document.createElement('canvas'); c.width = outW; c.height = outH;
    c.getContext('2d').drawImage(atlas, f * FRAME_W, ROW * FRAME_H, FRAME_W, FRAME_H, dx + shifts[f].dx, dy + shifts[f].dy, FRAME_W, FRAME_H);
    const url = await toUrl(c); if (!url) return null; urls.push(url);
    try { const im = new Image(); im.src = url; await im.decode(); } catch { /* decoding early is only a smoothness aid */ }   // no blank frame on the first swap
  }
  return urls;
}

function tick() {
  timer = 0;
  const frame = animationFrame(performance.now(), TRIAL_IDLE_TIMING);
  for (const img of [...live]) {
    if (!img.isConnected) { live.delete(img); continue; }
    const pose = TRIAL_IDLE_POSES[frame], url = img._yamaIdle[pose]; if (img.dataset.yamaIdleFrame !== String(pose)) { img.src = url; img.dataset.yamaIdleFrame = String(pose); }
  }
  if (live.size) {
    // wake at the next frame boundary
    const t = performance.now() % TRIAL_IDLE_TIMING.reduce((a, b) => a + b, 0); let acc = 0, wait = 60;
    for (const d of TRIAL_IDLE_TIMING) { acc += d; if (t < acc) { wait = acc - t + 5; break; } }
    timer = setTimeout(tick, wait);
  }
}

/** Swap the trial's Yama painting <img> for the standing idle animation. Safe to call on every re-render. */
export function mountYamaTrialIdle(img, style) {
  if (!img || typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;   // painting stays, perfectly still
  style = yamaAnimationStyle(style);
  const attach = urls => { img._yamaIdle = urls; img.dataset.yamaIdle = style; img.dataset.yamaIdleFrame = ''; live.add(img);
    // P2: draw the current frame NOW (not at the next timer wake) — a re-render used to show the static painting for up to a second
    if (timer) { clearTimeout(timer); timer = 0; }
    tick(); };
  if (ready.has(style)) { attach(ready.get(style)); return; }
  const start = () => {
    if (!img.isConnected || !img.naturalWidth) return;
    const key = `${style}|${img.currentSrc || img.src}`;
    if (!built.has(key)) built.set(key, buildIdleFrames(style, img).catch(() => null).then(u => { if (!u) built.delete(key); return u; }));
    built.get(key).then(urls => {
      if (!urls) return;
      ready.set(style, urls);
      if (img.isConnected) attach(urls);
    });
  };
  if (img.complete) start(); else img.addEventListener('load', start, { once: true });
}
