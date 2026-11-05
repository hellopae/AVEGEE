// SCENE-FX: the painted lava / waterfall / pond / torch frames played over the battle + interrogation backdrops.
//
// Same rule as the town map (town-fluid-fx.js): code only places, clips, blends and plays frames that were DRAWN (img/map-zone1/v5-fx/sheets, Codex);
// it never recolours or filters them.
//  * Layout = img/scene-fx/scene-fx-layout.json (scripts/build-scene-fx.py), in the px of the backdrop picture. One entry per backdrop file; a
//    backdrop with no entry (or a piece whose sheet is missing) simply gets no motion.
//  * Each piece is clipped by its own coverage mask (cut from the painted pixels: lava / fall / pond colour only, never the rock beside it).
//  * Frames are cross-faded in time (N -> N+1 and the last back to the first) with premultiplied 'lighter' adds weighted (1-m, m): a true linear mix
//    of two DRAWN frames, so nothing jumps.
//  * kinds: rect (one frame stretched over a fall), tile (a repeating texture, anchored to the picture), pulse (the painted flame pixels themselves,
//    screened back over themselves with a slow flicker), embers (placed sprites that rise and fade).
//  * Pieces draw into up to three ground canvases that sit between the backdrop and the figures (CSS mix-blend-mode overlay | screen | normal), so the
//    drawn frames blend with the painted picture exactly like the town map and never cover a character, a plate or a number.
//  * Layers are pre-scaled once per size; every frame only mixes two frames, clips and blits. Nothing is read back. The clock belongs to the caller.

const mod = (n, d) => ((n % d) + d) % d;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const SCENE_FX = Object.freeze({
  dir: 'img/scene-fx/', layout: 'img/scene-fx/scene-fx-layout.json', maxLayerPx: 1100, rescale: .08, retryMs: 8000,
});

// ------------------------------------------------------------------------------------------------ pure helpers (unit tested)
/** The two drawn frames to mix at `ms` and how much of the second: `{i, j, mix}`; wraps n-1 -> 0 without a step. */
export function sceneFxFrame(frames, fps, ms) {
  if (!(frames > 1)) return { i: 0, j: 0, mix: 0 };
  const phase = Math.max(0, ms) / 1000 * fps, base = Math.floor(phase);
  return { i: base % frames, j: (base + 1) % frames, mix: phase - base };
}
/** `img/map-zone1/battle-ice-v1.webp` out of a css `url("http://host/img/map-zone1/battle-ice-v1.webp")` / plain url. */
export function sceneFxKey(url) {
  const m = String(url || '').match(/img\/[^?#"')]+\.(?:webp|png|jpe?g)/i);
  return m ? m[0] : null;
}
export const sceneFxFor = (layout, url) => (layout && layout.scenes && layout.scenes[sceneFxKey(url)]) || null;
/** Torch / lantern flicker: 1 +- depth, two incommensurable sines so it never reads as a metronome. Always >= 0. */
export function pulseLevel(piece, sec) {
  const p = piece.period || 2.6, a = sec / p + (piece.phase || 0);
  const v = .62 + .26 * Math.sin(a * Math.PI * 2) + .12 * Math.sin(a * Math.PI * 2 * 2.7 + 1.3);
  return clamp(v, 0, 1) * (piece.depth ?? .22);
}
/** One placed sprite: spot = [x, y, w, h, rot, phase, period, dx, dy] (picture px); state at `sec` or null while it rests.
 *  mode 'rise' (embers) loops the drawn frames while drifting (dx,dy) and fading in / out; mode 'once' (lava bubbles) plays the drawn frames once per period during the first `win` of it. */
export function emberState(piece, spot, sec) {
  const period = spot[6] || 3.5, f = mod(sec / period + spot[5], 1), n = piece.frames || 8;
  if (piece.mode === 'once') {
    const win = piece.win || .5;
    if (f >= win) return { alpha: 0, i: 0, j: 0, mix: 0, ox: 0, oy: 0 };
    const g = f / win, pos = Math.min(n - 1, g * (n - 1)), i = Math.floor(pos);
    return { alpha: Math.min(1, g * 6, (1 - g) * 6), i, j: Math.min(n - 1, i + 1), mix: pos - i, ox: 0, oy: 0 };
  }
  const fr = sceneFxFrame(n, piece.fps || 7, (sec + spot[5] * period) * 1000);
  return { alpha: Math.sin(Math.PI * f) ** 1.2, ...fr, ox: spot[7] * f, oy: spot[8] * f };
}
/** Destination rectangle [x, y, w, h] (CSS px of the scene world) of a piece for a cover box `{x,y,w,h}` over a picture of `size` px. */
export function scenePieceRect(piece, box, size) {
  const s = box.w / size[0], [x, y, w, h] = piece.rect;
  return [box.x + x * s, box.y + y * s, w * s, h * s];
}

// ------------------------------------------------------------------------------------------------ loading
let layoutPromise = null, layoutValue = null;
/** Fetch the layout once. Resolves null (no motion) when it is missing or broken. */
export function loadSceneFxLayout(url = SCENE_FX.layout) {
  if (layoutValue) return Promise.resolve(layoutValue);
  if (!layoutPromise) {
    layoutPromise = (typeof fetch === 'function' ? fetch(url) : Promise.reject(new Error('no fetch')))
      .then(r => { if (!r.ok) throw new Error('scene-fx layout ' + r.status); return r.json(); })
      .then(v => (layoutValue = v)).catch(() => { layoutPromise = null; return null; });
  }
  return layoutPromise;
}
export const sceneFxLayoutNow = () => layoutValue;
export function setSceneFxLayoutForTest(value) { layoutValue = value; layoutPromise = value ? Promise.resolve(value) : null; }

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const im = new Image(); im.decoding = 'async';
    im.onload = async () => { try { if (im.decode) await im.decode(); } catch {} resolve(im); };
    im.onerror = () => reject(new Error('scene fx art unavailable: ' + url));
    im.src = url;
  });
}
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
function scaled(source, sx, sy, sw, sh, w, h) {
  const c = mk(w, h), g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(source, sx, sy, sw, sh, 0, 0, c.width, c.height); return c;
}

// ------------------------------------------------------------------------------------------------ the scene player
/** `scene` = layout.scenes[key]; `layout` for the folders; `background` = the decoded backdrop <img>.
 *  Returns { draw(groups, sec, box, {dprF}), destroy(), stats() }. `groups` = { overlay, screen, normal } -> a 2d context in CSS px (or null while it
 *  does not exist yet; the caller creates a ground canvas on demand through the getter form `groups.get(blend)`). */
export function createSceneFluid(scene, layout, background) {
  const sheets = new Map(), masks = new Map(), pieces = [];
  let loading = 0, dead = false, drawn = 0, composites = 0;
  const stats = () => ({ pieces: pieces.length, drawn, composites, ready: pieces.filter(p => p.state === 'ready').length, sheets: sheets.size });

  function sheetEntry(name) {
    let e = sheets.get(name);
    if (!e) { e = { name, state: 'idle', image: null, failedAt: 0 }; sheets.set(name, e); }
    if (e.state === 'error' && Date.now() - e.failedAt > SCENE_FX.retryMs) e.state = 'idle';
    if (e.state === 'idle' && loading < 3) {
      e.state = 'loading'; loading++;
      loadImage(layout.sheetsDir + name).then(im => { e.image = im; e.state = 'ready'; }).catch(() => { e.state = 'error'; e.failedAt = Date.now(); }).finally(() => { loading--; });
    }
    return e;
  }
  function maskEntry(name) {
    let e = masks.get(name);
    if (!e) { e = { name, state: 'idle', image: null, failedAt: 0 }; masks.set(name, e); }
    if (e.state === 'error' && Date.now() - e.failedAt > SCENE_FX.retryMs) e.state = 'idle';
    if (e.state === 'idle' && loading < 3) {
      e.state = 'loading'; loading++;
      loadImage(layout.masksDir + name + '.webp').then(im => { e.image = im; e.state = 'ready'; }).catch(() => { e.state = 'error'; e.failedAt = Date.now(); }).finally(() => { loading--; });
    }
    return e;
  }

  for (const p of scene.pieces) pieces.push({ spec: p, state: 'idle', k: 0, frames: null, mask: null, layer: null, lw: 0, lh: 0, pats: null, fixed: null });

  /** Build the pre-scaled frames / mask for `k` canvas px per picture px. false while an image is still loading. */
  function prepare(pc, k) {
    const sp = pc.spec;
    if (sp.kind === 'pulse' && (!background || !background.naturalWidth)) return false;
    const mEntry = maskEntry(sp.mask);
    if (mEntry.state !== 'ready') return false;
    let sEntry = null;
    if (sp.kind !== 'pulse') { sEntry = sheetEntry(sp.sheet); if (sEntry.state !== 'ready') return false; }
    const [rx, ry, rw, rh] = sp.rect;
    const cap = SCENE_FX.maxLayerPx, kk = Math.min(k, cap / rw, cap / rh);
    if (pc.state === 'ready' && Math.abs(kk - pc.k) / pc.k < SCENE_FX.rescale) return true;
    const lw = Math.max(2, Math.ceil(rw * kk)), lh = Math.max(2, Math.ceil(rh * kk));
    pc.k = kk; pc.lw = lw; pc.lh = lh;
    pc.maskCanvas = scaled(mEntry.image, 0, 0, mEntry.image.naturalWidth, mEntry.image.naturalHeight, lw, lh);
    pc.layer = mk(lw, lh); pc.pats = null;
    if (sp.kind === 'rect') {
      pc.frames = []; for (let f = 0; f < sp.frames; f++) pc.frames.push(scaled(sEntry.image, f * sp.frameW, 0, sp.frameW, sp.frameH, lw, lh));
    } else if (sp.kind === 'tile') {
      const tw = Math.max(4, Math.round(sp.tile[0] * kk)), th = Math.max(4, Math.round(sp.tile[1] * kk));
      pc.tileSize = [tw, th]; pc.frames = [];
      for (let f = 0; f < sp.frames; f++) pc.frames.push(scaled(sEntry.image, f * sp.frameW, 0, sp.frameW, sp.frameH, tw, th));
    } else if (sp.kind === 'pulse') {
      // the painted flame pixels, cut by the mask, once; each frame only re-blits them with a flickering alpha
      const c = mk(lw, lh), g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
      g.drawImage(background, rx, ry, rw, rh, 0, 0, lw, lh); g.globalCompositeOperation = 'destination-in'; g.drawImage(pc.maskCanvas, 0, 0);
      pc.fixed = c;
    }
    pc.state = 'ready';
    return true;
  }

  function mixInto(g, fr, drawFn) {
    g.globalCompositeOperation = 'lighter';
    if (fr.mix < .004 || fr.i === fr.j) { g.globalAlpha = 1; drawFn(fr.i); }
    else { g.globalAlpha = 1 - fr.mix; drawFn(fr.i); g.globalAlpha = fr.mix; drawFn(fr.j); }
    g.globalAlpha = 1;
  }

  function drawEmbers(pc, ctx, sec, box, size, W, H) {
    const sp = pc.spec, sEntry = sheetEntry(sp.sheet);
    if (sEntry.state !== 'ready') return 0;
    if (!pc.frames || pc.k !== box.w / size[0]) {
      const s = box.w / size[0]; pc.k = s;
      pc.frames = []; for (let f = 0; f < sp.frames; f++) pc.frames.push(scaled(sEntry.image, f * sp.frameW, 0, sp.frameW, sp.frameH, Math.max(4, Math.ceil(sp.spriteW * s)), Math.max(4, Math.ceil(sp.spriteH * s))));
    }
    const s = pc.k; let n = 0;
    ctx.save(); ctx.globalCompositeOperation = sp.blend === 'screen' ? 'lighter' : 'source-over';
    for (const sp2 of sp.spots) {
      const st = emberState(sp, sp2, sec);
      if (st.alpha < .02) continue;
      const w = sp2[2] * s, h = sp2[3] * s, x = box.x + (sp2[0] + st.ox) * s - w / 2, y = box.y + (sp2[1] + st.oy) * s - h / 2;
      if (x + w < 0 || x > W || y + h < 0 || y > H) continue;
      const a = st.alpha * (sp.opacity ?? .9);
      if (st.mix < .004 || st.i === st.j) { ctx.globalAlpha = a; ctx.drawImage(pc.frames[st.i], x, y, w, h); }
      else { ctx.globalAlpha = a * (1 - st.mix); ctx.drawImage(pc.frames[st.i], x, y, w, h); ctx.globalAlpha = a * st.mix; ctx.drawImage(pc.frames[st.j], x, y, w, h); }
      n++;
    }
    ctx.restore(); return n;
  }

  /** Call once per ground frame. `groups(blend)` returns the 2d context (CSS px space, already cleared) of the ground canvas with that blend. */
  function draw(groups, sec, box, { dprF = 1, W, H }) {
    if (dead || !box || !(box.w > 0)) return 0;
    const size = scene.size, s = box.w / size[0], k = s * dprF;
    let n = 0;
    for (const pc of pieces) {
      const sp = pc.spec;
      if (sp.kind === 'embers') {
        const ctx = groups(sp.blend === 'screen' ? 'screen' : 'normal'); if (ctx) n += drawEmbers(pc, ctx, sec, box, size, W, H); continue;
      }
      const [dx, dy, dw, dh] = scenePieceRect(sp, box, size);
      if (dx + dw < 0 || dx > W || dy + dh < 0 || dy > H) continue;      // off screen: no load, no memory
      if (!prepare(pc, k)) continue;
      const g = pc.layer.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, pc.lw, pc.lh);
      let blend, opacity;
      if (sp.kind === 'pulse') {
        const a = pulseLevel(sp, sec); if (a < .004) continue;
        blend = 'screen'; opacity = a;
        const ctx = groups(blend); if (!ctx) continue;
        ctx.save(); ctx.globalAlpha = opacity; ctx.drawImage(pc.fixed, 0, 0, pc.lw, pc.lh, dx, dy, dw, dh); ctx.restore(); n++; composites++; continue;
      }
      const fr = sceneFxFrame(sp.frames, sp.fps, sec * 1000);
      if (sp.kind === 'rect') mixInto(g, fr, i => g.drawImage(pc.frames[i], 0, 0));
      else {
        if (!pc.pats) pc.pats = pc.frames.map(c => g.createPattern(c, 'repeat'));
        // the pattern is anchored to the picture (0,0): layer origin = piece rect origin
        const ox = -sp.rect[0] * pc.k, oy = -sp.rect[1] * pc.k;
        mixInto(g, fr, i => { g.save(); g.translate(ox, oy); g.fillStyle = pc.pats[i]; g.fillRect(-ox, -oy, pc.lw, pc.lh); g.restore(); });
      }
      g.globalCompositeOperation = 'destination-in'; g.drawImage(pc.maskCanvas, 0, 0); g.globalCompositeOperation = 'source-over';
      blend = sp.blend === 'normal' ? 'normal' : sp.blend; opacity = sp.opacity;
      const ctx = groups(blend); if (!ctx) continue;
      ctx.save(); ctx.globalAlpha = opacity; ctx.imageSmoothingQuality = 'low'; ctx.drawImage(pc.layer, 0, 0, pc.lw, pc.lh, dx, dy, dw, dh); ctx.restore();
      n++; composites++;
    }
    drawn = n; return n;
  }
  function destroy() { dead = true; for (const pc of pieces) { for (const c of [pc.layer, pc.maskCanvas, pc.fixed]) if (c) c.width = c.height = 1; pc.frames = null; } sheets.clear(); masks.clear(); }
  return { draw, destroy, stats, pieces };
}
