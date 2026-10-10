// H5b v2 (cover-fx-visible): ONE effect system for the settled Home cover. The v4 masks (img/cover-fx/*-v4-mask.png, 688×384,
// traced from cover-v4) say WHERE fire, lava, volcano and souls are; this file animates only inside them:
//   fire    — the painted flame pixels are re-sampled with a swaying/stretching heat warp + flickering additive glow + sparks
//   lava    — river pixels shimmer, bright sheen bands travel along the flow (river sideways, falls downward), bubbles pop
//   volcano — vein glow pulses, sheen runs down the slope, smoke and ash drift from the crater
//   souls   — never animated; the soul mask is cut out of every effect so the queue on the bridge stays exactly as drawn.
// Canvas is viewport-sized × devicePixelRatio (capped), drawn through the same cover crop as the art — not a 688×384 upscale.
export const COVER_FX_SIZE = Object.freeze([688, 384]);
export const COVER_FX_KINDS = Object.freeze(['lava', 'fire', 'volcano', 'soul']);
export const COVER_IMAGE = Object.freeze({src:'img/cover-v4.webp', w:1678, h:937});
/** Floors for "visible to the eye" — tests fail if anyone tones these back down to H5b-v1 whispers (v1 peaked at alpha .17 / .047). */
export const COVER_FX_LEVEL = Object.freeze({
  sheen:.62,            // additive travelling bands on lava (alpha at full strength)
  fireTint:[.22,.70],   // additive flame flicker range
  halo:[.30,.80],       // additive glow around each flame
  volcano:[.20,.70],    // vein pulse range
  warp:{river:2.6, fall:1.6, fire:3.8},   // image-px displacement amplitude of the heat warp
  flow:{river:[30, 3.4], fall:[34, 1.5]},   // [image px the texture travels per cycle, seconds per cycle]
  stretch:.16,          // flame lengthening
  bubbles:{desktop:12, mobile:7},
  sparks:{desktop:7, mobile:4},     // per flame
  embers:{desktop:44, mobile:22},   // lava embers
  ash:{desktop:12, mobile:7},       // volcano embers
  smoke:7
});
const MW = COVER_FX_SIZE[0], MH = COVER_FX_SIZE[1];
const FX_MAX_PIXELS = 2.6e6;
const frac = n => n - Math.floor(n);
const seed = n => frac(Math.sin(n * 127.1 + 311.7) * 43758.5453);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;

export function coverFit(width, height, iw = 1376, ih = 768) {
  const scale = Math.max(width / iw, height / ih);
  return {scale, x:(width - iw * scale) / 2, y:(height - ih * scale) / 2};
}

// ---------- mask maths (pure, run once per load) ----------
/** Where lava is a vertical fall instead of a horizontal river (mask coordinates). */
export const isFall = (x, y, w = MW, h = MH) => (x > w * .70 && y < h * .80) || (x < w * .30 && y > h * .50 && y < h * .80);
export function splitLava(a, w = MW, h = MH) {
  const river = new Uint8Array(a), fall = new Uint8Array(a.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (a[i] && isFall(x, y, w, h)) { fall[i] = a[i]; river[i] = 0; }
  }
  return {river, fall};
}
/** Separable max filter; left/right/up/down = how many mask pixels the shape GROWS in that direction. */
export function dilateAlpha(a, w, h, left, right, up, down) {
  const t = new Uint8Array(a.length), o = new Uint8Array(a.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let m = 0;
    for (let k = Math.max(0, x - right); k <= Math.min(w - 1, x + left); k++) if (a[y * w + k] > m) m = a[y * w + k];
    t[y * w + x] = m;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let m = 0;
    for (let k = Math.max(0, y - down); k <= Math.min(h - 1, y + up); k++) if (t[k * w + x] > m) m = t[k * w + x];
    o[y * w + x] = m;
  }
  return o;
}
export function blurAlpha(a, w, h, r) {
  const t = new Uint8Array(a.length), o = new Uint8Array(a.length), n = 2 * r + 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0; for (let k = -r; k <= r; k++) s += a[y * w + clamp(x + k, 0, w - 1)];
    t[y * w + x] = s / n;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0; for (let k = -r; k <= r; k++) s += t[clamp(y + k, 0, h - 1) * w + x];
    o[y * w + x] = s / n;
  }
  return o;
}
/** 4-connected blobs of alpha>127 (use on a dilated copy so one flame is one blob). */
export function labelBlobs(a, w, h, min = 12) {
  const seen = new Uint8Array(w * h), blobs = [];
  for (let i0 = 0; i0 < a.length; i0++) {
    if (a[i0] < 128 || seen[i0]) continue;
    const stack = [i0]; seen[i0] = 1;
    let count = 0, x0 = w, x1 = 0, y0 = h, y1 = 0, sx = 0;
    while (stack.length) {
      const i = stack.pop(), x = i % w, y = (i - x) / w;
      count++; sx += x; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0 && a[i - 1] > 127 && !seen[i - 1]) { seen[i - 1] = 1; stack.push(i - 1); }
      if (x < w - 1 && a[i + 1] > 127 && !seen[i + 1]) { seen[i + 1] = 1; stack.push(i + 1); }
      if (y > 0 && a[i - w] > 127 && !seen[i - w]) { seen[i - w] = 1; stack.push(i - w); }
      if (y < h - 1 && a[i + w] > 127 && !seen[i + w]) { seen[i + w] = 1; stack.push(i + w); }
    }
    if (count >= min) blobs.push({x0, y0, x1, y1, count, cx:sx / count});
  }
  return blobs.sort((p, q) => p.cx - q.cx);
}
export function alphaBounds(a, w = MW, h = MH) {
  let x0 = w, x1 = -1, y0 = h, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[y * w + x]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : {x0, y0, x1, y1};
}
/** Sample anchors on the mask (step grid), optionally dropping a keep-out rectangle given in mask coordinates. */
export function scatterPoints(a, w = MW, h = MH, step = 3, keepOut = null) {
  const pts = [];
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
    if (!a[y * w + x]) continue;
    if (keepOut && x >= keepOut[0] && x <= keepOut[2] && y >= keepOut[1] && y <= keepOut[3]) continue;
    pts.push([x, y]);
  }
  return pts;
}
/** Irregular 0..1 flicker — three incommensurate sines so it never visibly loops. */
export const flicker = (t, i = 0) => clamp(.5 + .5 * (.5 * Math.sin(t * 7.3 + i * 1.7) + .3 * Math.sin(t * 11.9 + i * 3.1) + .2 * Math.sin(t * 3.1 + i)), 0, 1);
/** Slow irregular heartbeat for the volcano veins. */
/** Two flow phases half a cycle apart and the weight of the second: result = A*(1-w1)+B*w1, always seamless. */
export function flowPhases(t, period) {
  const p0 = frac(t / period), p1 = frac(t / period + .5);
  return [p0, p1, 1 - Math.abs(2 * p0 - 1), 1 - Math.abs(2 * p1 - 1)];
}
export const pulse = t => Math.pow(.5 + .5 * Math.sin(t * 1.35 + Math.sin(t * .43) * 2), 1.6);

// ---------- engine ----------
const mkCanvas = (doc, w, h) => { const c = doc.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
function sprite(doc, size, stops) {
  const cv = mkCanvas(doc, size, size), c = cv.getContext('2d'), r = size / 2;
  const g = c.createRadialGradient(r, r, 0, r, r, r);
  for (const [at, col] of stops) g.addColorStop(at, col);
  c.fillStyle = g; c.fillRect(0, 0, size, size);
  return cv;
}
/** Tileable field of glowing streaks. orient 'h' = streaks along x (river), 'v' = along y (falls, volcano veins). */
function sheenTile(doc, tw, th, orient, s, salt) {
  const cv = mkCanvas(doc, tw, th), c = cv.getContext('2d'), n = orient === 'h' ? 16 : 12;
  for (let k = 0; k < n; k++) {
    const x = seed(k * 3 + salt) * tw, y = seed(k * 3 + 1 + salt) * th, big = .6 + seed(k * 3 + 2 + salt) * .9;
    const rx = (orient === 'h' ? 22 : 3.2) * s * big, ry = (orient === 'h' ? 3.6 : 20) * s * big;
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      c.save(); c.translate(x + ox * tw, y + oy * th); c.scale(rx, ry);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, 'rgba(255,244,170,.95)'); g.addColorStop(.45, 'rgba(255,170,50,.55)'); g.addColorStop(1, 'rgba(255,80,0,0)');
      c.fillStyle = g; c.fillRect(-1, -1, 2, 2); c.restore();
    }
  }
  return cv;
}

/**
 * Build everything that depends on canvas size once; the returned draw(c, t, fade) allocates nothing.
 * env: {doc, cw, ch, cssW, image, alphas:{lava,fire,volcano,soul}, mobile}
 */
export function createCoverEngine(env) {
  const {doc, cw, ch, image, alphas, mobile} = env;
  const lvl = COVER_FX_LEVEL, pick = o => mobile ? o.mobile : o.desktop;
  const fit = coverFit(cw, ch, COVER_IMAGE.w, COVER_IMAGE.h), s = fit.scale;
  const sx = COVER_IMAGE.w * s / MW, sy = COVER_IMAGE.h * s / MH;      // mask pixel → canvas pixel
  const dp = Math.max(.75, cw / (env.cssW || cw));                      // canvas px per CSS px (for "2–4px" sparks)
  const base = mkCanvas(doc, cw, ch), bc = base.getContext('2d');
  bc.imageSmoothingEnabled = true;
  bc.drawImage(image, fit.x, fit.y, COVER_IMAGE.w * s, COVER_IMAGE.h * s);

  const alphaCanvas = a => {
    const cv = mkCanvas(doc, MW, MH), c = cv.getContext('2d'), id = c.createImageData(MW, MH);
    for (let i = 0; i < a.length; i++) { id.data[i * 4] = 255; id.data[i * 4 + 1] = 255; id.data[i * 4 + 2] = 255; id.data[i * 4 + 3] = a[i]; }
    c.putImageData(id, 0, 0); return cv;
  };
  /** A bbox-sized work area for one mask region, clipped to what the viewport can actually see. */
  const region = (a, box, padL = 2, padR = 2, padT = 2, padB = 2, step = 3) => {
    if (!box) return null;
    const mx0 = box.x0 - padL, mx1 = box.x1 + 1 + padR, my0 = box.y0 - padT, my1 = box.y1 + 1 + padB;
    const bx0 = Math.max(0, Math.floor(fit.x + mx0 * sx)), bx1 = Math.min(cw, Math.ceil(fit.x + mx1 * sx));
    const by0 = Math.max(0, Math.floor(fit.y + my0 * sy)), by1 = Math.min(ch, Math.ceil(fit.y + my1 * sy));
    if (bx1 - bx0 < 2 || by1 - by0 < 2) return null;              // entirely off-screen (portrait crop)
    const bw = bx1 - bx0, bh = by1 - by0;
    const mask = mkCanvas(doc, bw, bh), mc = mask.getContext('2d');
    mc.imageSmoothingEnabled = true;
    mc.drawImage(alphaCanvas(a), (bx0 - fit.x) / sx, (by0 - fit.y) / sy, bw / sx, bh / sy, 0, 0, bw, bh);
    const work = mkCanvas(doc, bw, bh), fx = mkCanvas(doc, bw, bh);
    return {bx:bx0, by:by0, bw, bh, mask, work, wc:work.getContext('2d'), fx, fc:fx.getContext('2d'), step:Math.max(2, Math.round(step * s))};
  };

  // lava river + falls
  const {river, fall} = splitLava(alphas.lava);
  const riverR = region(river, alphaBounds(river), 3, 3, 3, 3, 5);
  const fallR = region(fall, alphaBounds(fall), 3, 3, 3, 3, 5);
  // fire: dilate (more upward) so the flame can lengthen, then label flames
  const fireSoft = blurAlpha(dilateAlpha(alphas.fire, MW, MH, 3, 3, 9, 1), MW, MH, 1);
  const fireTint = blurAlpha(alphas.fire, MW, MH, 1);
  const flames = labelBlobs(dilateAlpha(alphas.fire, MW, MH, 4, 4, 4, 4), MW, MH, 10).map((b, i) => {
    const r = region(fireSoft, {x0:b.x0 + 2, y0:b.y0 - 4, x1:b.x1 - 2, y1:b.y1 - 2}, 5, 5, 11, 4, 2);
    if (!r) return null;
    // flicker tint follows the painted flame itself (not the dilated warp area) so it never becomes a glowing box
    const tint = region(fireTint, {x0:b.x0 + 2, y0:b.y0 - 4, x1:b.x1 - 2, y1:b.y1 - 2}, 5, 5, 11, 4, 2);
    r.tint = mkCanvas(doc, r.bw, r.bh);
    const tc = r.tint.getContext('2d'); tc.fillStyle = 'rgb(255,120,24)'; tc.fillRect(0, 0, r.bw, r.bh);
    tc.globalCompositeOperation = 'destination-in'; tc.drawImage(tint.mask, 0, 0);
    r.i = i; r.base = b.y1 - 2; r.cx = fit.x + ((b.x0 + b.x1) / 2) * sx; r.top = fit.y + b.y0 * sy;
    // only torch-sized flames get a halo; the wide dais glow in front of the throne must not light up the characters beside it
    r.radius = (b.x1 - b.x0) <= 26 ? Math.max((b.x1 - b.x0) * sx, (b.y1 - b.y0) * sy) * .6 + 2 * s : 0;
    r.mid = fit.y + ((b.y0 + b.y1) / 2) * sy; r.wide = (b.x1 - b.x0) > 26;
    return r;
  }).filter(Boolean);
  // volcano
  const volBox = alphaBounds(alphas.volcano);
  const volR = region(alphas.volcano, volBox, 3, 3, 3, 3, 3);
  if (volR) {
    volR.tint = mkCanvas(doc, volR.bw, volR.bh);
    const tc = volR.tint.getContext('2d'); tc.fillStyle = 'rgb(255,150,50)'; tc.fillRect(0, 0, volR.bw, volR.bh);
    tc.globalCompositeOperation = 'destination-in'; tc.drawImage(volR.mask, 0, 0);
  }
  const crater = (() => {            // the highest vein pixels = the vent
    if (!volBox) return null;
    let n = 0, sxs = 0;
    for (let y = volBox.y0; y < volBox.y0 + 5; y++) for (let x = volBox.x0; x <= volBox.x1; x++) if (alphas.volcano[y * MW + x]) { n++; sxs += x; }
    return {x:fit.x + (n ? sxs / n : (volBox.x0 + volBox.x1) / 2) * sx, y:fit.y + volBox.y0 * sy};
  })();
  // souls: cut out of every effect afterwards. Slight dilation so glow never touches a ghost's edge.
  const soulBox = alphaBounds(alphas.soul);
  const soulR = region(dilateAlpha(alphas.soul, MW, MH, 1, 1, 1, 1), soulBox, 2, 2, 2, 2, 3);

  // sprites + sheen tiles
  const halo = sprite(doc, 64, [[0, 'rgba(255,214,110,.95)'], [.35, 'rgba(255,128,24,.55)'], [1, 'rgba(255,50,0,0)']]);
  const ember = sprite(doc, 16, [[0, 'rgba(255,255,230,1)'], [.3, 'rgba(255,208,90,.95)'], [1, 'rgba(255,90,10,0)']]);
  const smoke = sprite(doc, 64, [[0, 'rgba(84,58,56,.9)'], [.55, 'rgba(60,40,44,.45)'], [1, 'rgba(40,28,34,0)']]);
  const tileH = [sheenTile(doc, 260 * s, 120 * s, 'h', s, 11), sheenTile(doc, 170 * s, 90 * s, 'h', s * .7, 71)];
  const tileV = [sheenTile(doc, 90 * s, 240 * s, 'v', s, 31), sheenTile(doc, 60 * s, 160 * s, 'v', s * .7, 91)];
  const pats = new Map();
  const pat = (r, tile) => { const k = tile; if (!pats.has(k)) pats.set(k, r.fc.createPattern(tile, 'repeat')); return pats.get(k); };

  // stateless particles: position is a pure function of time, so no per-frame bookkeeping
  const keepOut = [MW * .20, MH * .14, MW * .60, MH * .66];     // throne + characters block (mask coords): lava embers never spawn there
  const riverPts = scatterPoints(river, MW, MH, 3, keepOut), volPts = scatterPoints(alphas.volcano, MW, MH, 2);
  const nBub = pick(lvl.bubbles), nEmb = pick(lvl.embers), nAsh = pick(lvl.ash), nSpark = pick(lvl.sparks);
  const at = (pts, i, k) => pts[Math.floor(seed(i * 17.3 + k * 5.1) * pts.length) % pts.length];

  /** Flow-map blend: the layer's own texture slides along the flow; two copies half a cycle apart cross-fade so the reset never shows. */
  function warpRows(L, t, amp, k1, k2) {
    const {wc, bw, bh, step} = L, [o0, o1, , w1] = flowPhases(t, lvl.flow.river[1]), D = lvl.flow.river[0] * s;
    wc.globalCompositeOperation = 'source-over'; wc.globalAlpha = 1; wc.clearRect(0, 0, bw, bh);
    for (let pass = 0; pass < 2; pass++) {
      wc.globalAlpha = pass ? w1 : 1;
      const off = (pass ? o1 : o0) * D;
      for (let y = 0; y < bh; y += step) {
        const gy = L.by + y, dx = amp * s * (Math.sin(gy * k1 + t * 1.9) + .55 * Math.sin(gy * k2 - t * 2.9)) + off;
        wc.drawImage(base, L.bx - dx, L.by + y, bw, step, 0, y, bw, step);
      }
    }
    wc.globalAlpha = 1;
  }
  function warpCols(L, t, amp) {
    const {wc, bw, bh, step} = L, [o0, o1, , w1] = flowPhases(t, lvl.flow.fall[1]), D = lvl.flow.fall[0] * s;
    wc.globalCompositeOperation = 'source-over'; wc.globalAlpha = 1; wc.clearRect(0, 0, bw, bh);
    for (let pass = 0; pass < 2; pass++) {
      wc.globalAlpha = pass ? w1 : 1;
      const off = (pass ? o1 : o0) * D;
      for (let x = 0; x < bw; x += step) {
        const gx = L.bx + x, dy = amp * s * (Math.sin(gx * .07 + t * 3.4) + .5 * Math.sin(gx * .19 - t * 5.1)) + off;
        wc.drawImage(base, L.bx + x, L.by - dy, step, bh, x, 0, step, bh);
      }
    }
    wc.globalAlpha = 1;
  }
  const paste = (c, L, alpha, op = 'source-over', src = L.work) => {
    c.globalCompositeOperation = op; c.globalAlpha = alpha; c.drawImage(src, L.bx, L.by);
  };
  function maskIn(ctx, L) { ctx.globalCompositeOperation = 'destination-in'; ctx.globalAlpha = 1; ctx.drawImage(L.mask, 0, 0); }
  function sheen(L, tiles, t, vx, vy, alpha, c) {
    const {fc, bw, bh} = L;
    fc.globalCompositeOperation = 'source-over'; fc.globalAlpha = 1; fc.clearRect(0, 0, bw, bh);
    tiles.forEach((tile, n) => {
      const tw = tile.width, th = tile.height, k = n ? .6 : 1;
      fc.setTransform(1, 0, 0, 1, frac(t * vx * s * k / tw) * tw, frac(t * vy * s * k / th) * th);
      fc.fillStyle = pat(L, tile); fc.fillRect(-tw, -th, bw + tw * 2, bh + th * 2);
    });
    fc.setTransform(1, 0, 0, 1, 0, 0);
    maskIn(fc, L);
    paste(c, L, alpha, 'lighter', L.fx);
  }

  function draw(c, t, fade = 1) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, cw, ch);
    c.imageSmoothingEnabled = true;
    // 1. lava: shimmer + flowing light
    if (riverR) {
      warpRows(riverR, t, lvl.warp.river, .045, .11); maskIn(riverR.wc, riverR); paste(c, riverR, fade);
      sheen(riverR, tileH, t, 46, 0, lvl.sheen * fade * (.85 + .15 * Math.sin(t * 1.3)), c);
    }
    if (fallR) {
      warpCols(fallR, t, lvl.warp.fall); maskIn(fallR.wc, fallR); paste(c, fallR, fade);
      sheen(fallR, tileV, t, 0, 85, lvl.sheen * fade, c);
    }
    // boiling spots on the river
    if (riverPts.length) for (let j = 0; j < nBub; j++) {
      const life = 1.1 + seed(j + 5) * .9, cyc = t / life + seed(j + 40), k = Math.floor(cyc), age = frac(cyc);
      const [px, py] = at(riverPts, j, k), r = (3 + age * 7 + seed(j) * 3) * s * (mobile ? .9 : 1);
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.sin(age * Math.PI) * .95 * fade;
      c.drawImage(halo, fit.x + px * sx - r, fit.y + py * sy - r, r * 2, r * 2);
      c.drawImage(ember, fit.x + px * sx - r * .35, fit.y + py * sy - r * .35, r * .7, r * .7);
    }
    // 2. fire: warp + flicker + halo
    for (const F of flames) {
      const {wc, bw, bh, step} = F, fl = flicker(t, F.i), f2 = flicker(t * 1.37 + 3, F.i + 9);
      const stretch = 1 + lvl.stretch * (.35 + .65 * f2), baseY = Math.max(2, fit.y + (F.base + 1) * sy - F.by);
      wc.globalCompositeOperation = 'source-over'; wc.clearRect(0, 0, bw, bh);
      for (let y = 0; y < bh; y += step) {
        const u = clamp(1 - y / baseY, 0, 1.4), srcY = baseY - (baseY - y) / stretch;
        const sway = lvl.warp.fire * s * Math.pow(u, 1.2) * (Math.sin(t * 5.2 + F.i * 2 + y * .09) + .6 * Math.sin(t * 8.9 + F.i + y * .17));
        wc.drawImage(base, F.bx - sway, F.by + srcY, bw, step / stretch, 0, y, bw, step);
      }
      maskIn(wc, F); paste(c, F, fade);
      const [a0, a1] = lvl.fireTint;
      paste(c, F, fade * (a0 + (a1 - a0) * fl), 'lighter', F.tint);
      const [h0, h1] = lvl.halo, hr = F.radius * (.85 + .3 * f2);
      if (hr) {
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = fade * (h0 + (h1 - h0) * fl);
        c.drawImage(halo, F.cx - hr, F.mid - hr * .95, hr * 2, hr * 2);
      }
      for (let j = 0, n = F.wide ? nSpark * 2 : nSpark; j < n; j++) {       // sparks leave the flame tip; the wide dais glow stays low so nothing drifts across the characters' legs
        const life = 1.4 + seed(F.i * 9 + j) * 1.4, cyc = t / life + seed(F.i * 31 + j), k = Math.floor(cyc), age = frac(cyc);
        const x = F.cx + (seed(F.i * 7 + j + k * 3) - .5) * F.bw * .6 + Math.sin(t * 2 + j + k) * 7 * s * age + (seed(j + k) - .5) * 22 * s * age;
        const y = F.top + 4 * s - age * (F.wide ? 12 + seed(j * 3 + F.i) * 12 : 26 + seed(j * 3 + F.i) * 26) * s;
        const sz = (2 + seed(j + k * 7 + F.i) * 2) * dp * 1.9;
        c.globalAlpha = Math.sin(age * Math.PI) * fade;
        c.drawImage(ember, x - sz / 2, y - sz / 2, sz, sz);
      }
    }
    // 3. volcano: pulsing veins, sheen down the slope, smoke + ash
    if (volR) {
      const [v0, v1] = lvl.volcano, p = pulse(t);
      paste(c, volR, fade * (v0 + (v1 - v0) * p), 'lighter', volR.tint);
      sheen(volR, tileV, t, 0, 60, .55 * fade * (.6 + .4 * p), c);
    }
    if (crater) {
      const p = pulse(t), hr = 17 * s * (1 + .25 * p);
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = fade * (.22 + .38 * p);
      c.drawImage(halo, crater.x - hr, crater.y - hr * .8, hr * 2, hr * 2);
      c.globalCompositeOperation = 'source-over';
      for (let m = 0; m < lvl.smoke; m++) {
        const cyc = t / 8 + m / lvl.smoke, age = frac(cyc), r = (9 + age * 26) * s;
        const x = crater.x + (Math.sin(age * 3.2 + m * 1.7) * 8 + age * 30) * s, y = crater.y - 4 * s - age * 62 * s;
        c.globalAlpha = Math.sin(age * Math.PI) * .42 * fade;
        c.drawImage(smoke, x - r, y - r, r * 2, r * 2);
      }
    }
    if (volPts.length) for (let j = 0; j < nAsh; j++) {
      const life = 2.2 + seed(j + 70) * 2, cyc = t / life + seed(j + 90), k = Math.floor(cyc), age = frac(cyc);
      const [px, py] = at(volPts, j, k), x = fit.x + px * sx + Math.sin(t + j) * 5 * s + age * 14 * s, y = fit.y + py * sy - age * (30 + seed(j) * 26) * s;
      const sz = (2 + seed(j + k) * 2) * dp * 1.8;
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.sin(age * Math.PI) * .95 * fade;
      c.drawImage(ember, x - sz / 2, y - sz / 2, sz, sz);
    }
    // 4. embers drifting up from the lava
    if (riverPts.length) for (let j = 0; j < nEmb; j++) {
      const life = 2.2 + seed(j + 120) * 2.6, cyc = t / life + seed(j + 150), k = Math.floor(cyc), age = frac(cyc);
      const [px, py] = at(riverPts, j + 200, k), x = fit.x + px * sx + Math.sin(t * 1.3 + j * 2) * 8 * s * age + (seed(j + k) - .4) * 14 * s * age;
      const y = fit.y + py * sy - age * (18 + seed(j * 5) * 34) * s, sz = (2 + seed(j + k * 3) * 2) * dp * 1.9;
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.sin(age * Math.PI) * fade;
      c.drawImage(ember, x - sz / 2, y - sz / 2, sz, sz);
    }
    // 5. souls and nothing else: erase every effect from the queue of ghosts
    if (soulR) { c.globalCompositeOperation = 'destination-out'; c.globalAlpha = 1; c.drawImage(soulR.mask, soulR.bx, soulR.by); }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  return {draw, fit, layers:{river:!!riverR, fall:!!fallR, flames:flames.length, volcano:!!volR, soul:!!soulR}};
}

// ---------- lifecycle ----------
export function coverFxActive(title, doc, motion) {
  return title.classList.contains('cover-settled') && !title.classList.contains('gone') &&
    !title.hidden && title.style.display !== 'none' && !doc.hidden && !motion.matches;
}
/** Canvas pixel size for a viewport: dpr capped at 1.5 and total pixels capped so a retina 4K window does not melt a laptop. */
export function coverFxSize(cssW, cssH, dpr = 1) {
  let f = Math.min(dpr || 1, 1.5), w = cssW * f, h = cssH * f;
  if (w * h > FX_MAX_PIXELS) { const k = Math.sqrt(FX_MAX_PIXELS / (w * h)); w *= k; h *= k; }
  return [Math.max(2, Math.round(w)), Math.max(2, Math.round(h))];
}
/** Own only the new canvas; observe H5a's event/class and the title's existing exit. */
export function installCoverFx(doc = document, win = window) {
  const title = doc.getElementById('title'), canvas = doc.getElementById('cover-fx-h5b');
  if (!title || !canvas) return () => {};
  const motion = win.matchMedia('(prefers-reduced-motion: reduce)');
  const c = canvas.getContext('2d');
  if (!c) return () => {};
  const scratchCanvas = doc.createElement('canvas');
  [scratchCanvas.width, scratchCanvas.height] = COVER_FX_SIZE;
  const scratch = scratchCanvas.getContext('2d');
  if (!scratch) return () => {};
  let raf = 0, assets = null, engine = null, loading = null, start = 0, disposed = false, failed = false, resizeTimer = 0;
  const active = () => !disposed && coverFxActive(title, doc, motion);
  const clear = () => { win.cancelAnimationFrame(raf); raf = 0; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, canvas.width, canvas.height); };
  const build = () => {
    const cssW = canvas.clientWidth || win.innerWidth || 390, cssH = canvas.clientHeight || win.innerHeight || 844;
    const [cw, ch] = coverFxSize(cssW, cssH, win.devicePixelRatio || 1);
    [canvas.width, canvas.height] = [cw, ch];
    const coarse = win.matchMedia('(pointer: coarse)').matches;
    return createCoverEngine({doc, cw, ch, cssW, image:assets.image, alphas:assets.alphas, mobile:cssW <= 700 || coarse});
  };
  const tick = now => {
    raf = 0;
    if (!active()) { clear(); return; }
    try {
      engine ||= build();
      engine.draw(c, (now - start) / 1000, (now - start) / 500 > 1 ? 1 : (now - start) / 500);
    } catch (e) { failed = true; clear(); return; }    // never leave a half-drawn frame; the still stays usable
    raf = win.requestAnimationFrame(tick);
  };
  const loadImage = src => new Promise((resolve, reject) => {
    const img = new win.Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src;
  });
  const load = () => Promise.all([loadImage(COVER_IMAGE.src), ...COVER_FX_KINDS.map(kind => loadImage(`img/cover-fx/${kind}-v4-mask.png`))])
    .then(([image, ...masks]) => {
      const alphas = {};
      COVER_FX_KINDS.forEach((kind, i) => {
        scratch.globalCompositeOperation = 'source-over'; scratch.clearRect(0, 0, ...COVER_FX_SIZE); scratch.drawImage(masks[i], 0, 0);
        const px = scratch.getImageData(0, 0, ...COVER_FX_SIZE).data, a = new Uint8Array(MW * MH);
        for (let k = 0; k < a.length; k++) a[k] = px[k * 4 + 3];
        alphas[kind] = a;
      });
      return {image, alphas};
    });
  const sync = () => {
    if (!active()) { clear(); return; }
    if (failed) return;
    if (!assets) {
      if (!loading) loading = load().then(value => { assets = value; sync(); }).catch(() => { failed = true; clear(); });
      return;
    }
    if (!raf) { start = win.performance.now(); raf = win.requestAnimationFrame(tick); }
  };
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { engine = null; }, 200);
  };
  const observer = new win.MutationObserver(sync);
  observer.observe(title, {attributes:true, attributeFilter:['class', 'hidden', 'style']});
  doc.addEventListener('avegee:cover-settled', sync);
  doc.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
  win.addEventListener?.('resize', onResize);
  sync();
  return () => {
    disposed = true; clear(); clearTimeout(resizeTimer); observer.disconnect();
    doc.removeEventListener('avegee:cover-settled', sync);
    doc.removeEventListener('visibilitychange', sync);
    motion.removeEventListener('change', sync);
    win.removeEventListener?.('resize', onResize);
  };
}
if (typeof document !== 'undefined') installCoverFx();
