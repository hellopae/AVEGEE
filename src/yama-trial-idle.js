// N2 — Yama stands still in the interrogation room: the map's drawn book-idle pose (blink only, feet and head never move)
// replaces the static painting that used to bob up and down via CSS. Frames come from the same atlas the map uses
// (img/yama-animation-v1/<style>/book-idle.webp, row 0 = facing the camera). Each frame is composed ONCE at native
// resolution into a canvas that has the same aspect/ratio and the same visible body box as the painting it replaces, so every
// existing CSS rule for `.trial-hud .hud-stage .fig img` (height, position) keeps working untouched.
// Any failure = the painting simply stays (still). Reduced motion = the painting stays (still).
import { yamaAnimationSrc, yamaAnimationStyle, animationFrame } from './yama-animation.js?v=20261015-live-v1';

// Same timing as `durations.book` in yama-animation.js (not exported there): hold, glance, blink, hold.
export const TRIAL_IDLE_TIMING = Object.freeze([1000, 320, 100, 480]);
const FRAME_W = 320, FRAME_H = 480, COLS = 4, ROW = 0, ALPHA = 8;

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
  let u = null;
  for (let f = 0; f < COLS; f++) {
    sctx.clearRect(0, 0, FRAME_W, FRAME_H);
    sctx.drawImage(atlas, f * FRAME_W, ROW * FRAME_H, FRAME_W, FRAME_H, 0, 0, FRAME_W, FRAME_H);
    const b = bboxOf(sctx, FRAME_W, FRAME_H); if (!b) return null;
    u = u ? { x0: Math.min(u.x0, b.x0), y0: Math.min(u.y0, b.y0), x1: Math.max(u.x1, b.x1), y1: Math.max(u.y1, b.y1) } : b;
  }
  // k: output pixels per sprite pixel, chosen so the body is as tall as the painting's (sprite drawn 1:1, no resampling)
  const k = (body.y1 - body.y0) / (u.y1 - u.y0), outW = Math.max(1, Math.round(W / k)), outH = Math.max(1, Math.round(H / k));
  const dx = Math.round((body.x0 + body.x1) / 2 / k - (u.x0 + u.x1) / 2), dy = Math.round(body.y1 / k - u.y1);
  const urls = [];
  for (let f = 0; f < COLS; f++) {
    const c = document.createElement('canvas'); c.width = outW; c.height = outH;
    c.getContext('2d').drawImage(atlas, f * FRAME_W, ROW * FRAME_H, FRAME_W, FRAME_H, dx, dy, FRAME_W, FRAME_H);
    const url = await toUrl(c); if (!url) return null; urls.push(url);
  }
  return urls;
}

function tick() {
  timer = 0;
  const frame = animationFrame(performance.now(), TRIAL_IDLE_TIMING);
  for (const img of [...live]) {
    if (!img.isConnected) { live.delete(img); continue; }
    const url = img._yamaIdle[frame]; if (img.dataset.yamaIdleFrame !== String(frame)) { img.src = url; img.dataset.yamaIdleFrame = String(frame); }
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
  const attach = urls => { img._yamaIdle = urls; img.dataset.yamaIdle = style; img.dataset.yamaIdleFrame = ''; live.add(img); if (!timer) tick(); };
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
