// M1 — battle / interrogation camera. Contract: docs/battle-camera-api.md
// Only `.cam-world` (the scene: background + sprites) is scaled / panned with a CSS transform. HUD, menus and cards are
// siblings of the world and never zoom. No CSS filters; the dim is an opacity overlay.
// Pure planners (clampCenter / planCamera / mapRect / shakeAmount) are exported so tests can pin the numbers.

export const CAMERA_FX_KEY = 'avegee.cameraFx';
export const MIN_ZOOM = 1, MAX_ZOOM = 1.6;

/** Default choreography numbers (ms at speed x1). One place for tuning. */
export const CAMERA_TIMING = Object.freeze({
  select:    { zoom:1.10, ms:240 },
  attack:    { zoom:1.16, ms:200, windup:220, panAt:200, panMs:160, impactAt:360, recoverAt:760 },
  skill:     { zoom:1.26, ms:260, windup:300, impactAt:520, panLead:200, recoverGap:560, dimAlpha:.42 },
  foeAttack: { zoom:1.14, ms:200, windup:200, panAt:180, panMs:160, impactAt:340, recoverAt:740 },
  heal:      { zoom:1.18, ms:160, windup:160, impactAt:300, recoverAt:700 },
  ask:       { zoom:1.18, ms:260 },
  reveal:    { zoom:1.32, ms:240, impactAt:200 },
  recoverMs: 280,
  hitStop:   { light:0, heavy:70, crit:90 },
});

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const ease = {
  out:t => 1 - Math.pow(1 - t, 3),
  inOut:t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  in:t => t * t * t,
  linear:t => t,
};

/** Centre of the view (world px) kept inside the world so no edge shows. */
export function clampCenter(W, H, z, cx, cy) {
  const hw = W / (2 * z), hh = H / (2 * z);
  return { cx:clamp(cx, hw, W - hw), cy:clamp(cy, hh, H - hh) };
}

/** CSS numbers for "zoom z around centre (cx,cy)" — origin 0 0, translate then scale. */
export function viewTransform(W, H, z, cx, cy) {
  const c = clampCenter(W, H, z, cx, cy);
  return { z, tx:W / 2 - z * c.cx, ty:H / 2 - z * c.cy, cx:c.cx, cy:c.cy };
}

/** Contact time of a drawn attack animation (ms from its start). The manifest has no explicit hit frame, so the strike is taken at the
 *  start of the frame ~55 % of the way through the sequence (e.g. 6 frames -> frame 4). Used to line the camera impact up with combat-sprites. */
export function strikeTime(durations) {
  if (!Array.isArray(durations) || !durations.length) return null;
  const idx = Math.min(durations.length - 1, Math.max(1, Math.ceil(durations.length * .55)));
  return durations.slice(0, idx).reduce((a, b) => a + b, 0);
}

export const unionRect = rs => {
  const a = rs.filter(Boolean);
  if (!a.length) return null;
  return a.reduce((u, r) => ({ l:Math.min(u.l, r.l), t:Math.min(u.t, r.t), r:Math.max(u.r, r.r), b:Math.max(u.b, r.b) }));
};

/** Pick zoom + centre for "look at `focus` at `zoom`" while every rect in keepVisible stays inside the view.
 *  All in world px at zoom 1. Zoom is lowered (not below minZoom) when the rects cannot fit. */
export function planCamera({ W, H, focus, zoom = 1.2, keepVisible = [], margin = 14, minZoom = MIN_ZOOM, maxZoom = MAX_ZOOM }) {
  let z = clamp(zoom, minZoom, maxZoom);
  const keep = unionRect(keepVisible);
  if (keep) {
    const kw = keep.r - keep.l + 2 * margin, kh = keep.b - keep.t + 2 * margin;
    if (kw > 0 && kh > 0) z = Math.max(minZoom, Math.min(z, W / kw, H / kh));
  }
  let { cx, cy } = clampCenter(W, H, z, focus.x, focus.y);
  if (keep) {
    const hw = W / (2 * z), hh = H / (2 * z);
    // horizontal: view [cx-hw, cx+hw] must contain [keep.l-margin, keep.r+margin]
    const minCx = keep.r + margin - hw, maxCx = keep.l - margin + hw;
    const minCy = keep.b + margin - hh, maxCy = keep.t - margin + hh;
    if (minCx <= maxCx) cx = clamp(cx, minCx, maxCx);
    if (minCy <= maxCy) cy = clamp(cy, minCy, maxCy);
    ({ cx, cy } = clampCenter(W, H, z, cx, cy));
  }
  return { z, cx, cy };
}

/** unzoomed rect -> where it is drawn under transform {z,tx,ty} (box-relative px) */
export const mapRect = (r, v) => ({ l:r.l * v.z + v.tx, r:r.r * v.z + v.tx, t:r.t * v.z + v.ty, b:r.b * v.z + v.ty });
export const unmapRect = (r, v) => ({ l:(r.l - v.tx) / v.z, r:(r.r - v.tx) / v.z, t:(r.t - v.ty) / v.z, b:(r.b - v.ty) / v.z });

/** Shake: power 1..3 -> amplitude px / duration ms (2px,150ms · 3px,200ms · 4px,250ms). */
export function shakeSpec(power = 1) {
  const p = clamp(+power || 1, .5, 3);
  return { amp:1 + p, ms:100 + 50 * p };
}
/** Offset at `elapsed` ms into a shake (decaying, deterministic). */
export function shakeAt(spec, elapsed) {
  if (!spec || elapsed >= spec.ms || elapsed < 0) return { x:0, y:0, amp:0 };
  const d = Math.pow(1 - elapsed / spec.ms, 2), a = spec.amp * d;
  return { x:Math.sin(elapsed * .11 + 1.3) * a, y:Math.cos(elapsed * .17) * a * .8, amp:a };
}

// ------------------------------------------------------------------------------------------------------
const PERF = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const raf = fn => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : setTimeout(() => fn(PERF()), 16));
const caf = id => (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(id) : clearTimeout(id));

function readEnabled() {
  try { return localStorage.getItem(CAMERA_FX_KEY) !== '0'; } catch { return true; }
}
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createBattleCamera() {
  let stage = null, world = null, dimEl = null, ro = null;
  let enabled = readEnabled();
  const st = { z:1, fx:.5, fy:.5 };            // fx/fy = centre as fractions of the world (survives resizes)
  let tween = null, shake = null, punchAnim = null, freeze = null, vAcc = 0, loopId = 0, inFrame = false;
  let timers = [], dimAlpha = 0, litSpec = null, cueSeq = 0, cueKey = '';
  let applied = { z:1, tx:0, ty:0 }, size = { w:0, h:0 };
  const layers = new Map(), screens = new Map(), listeners = new Map();
  const api = { timeScale:1 };

  const vnow = () => { const n = PERF(); return n - vAcc - (freeze ? n - freeze.start : 0); };
  const motionOn = () => enabled && !reducedMotion();
  const dur = ms => Math.max(0, ms / (api.timeScale || 1));

  // ---- geometry ------------------------------------------------------------------------------------
  const measure = () => {
    if (!stage) return { w:0, h:0 };
    size = { w:stage.clientWidth, h:stage.clientHeight };
    return size;
  };
  /** left/top of the world's padding box in screen px (the stage never moves) */
  const origin = () => { const r = stage.getBoundingClientRect(); return { x:r.left + stage.clientLeft, y:r.top + stage.clientTop }; };
  const inWorld = el => !!(world && el && world.contains(el));

  /** getBoundingClientRect, but as if the camera were at rest. Elements outside the world are returned as-is. */
  function rectOf(el, mode = 'layout') {
    const r = el.getBoundingClientRect();
    if (!stage || !world || !stage.isConnected || !inWorld(el)) return r;
    const o = origin();
    const unz = unmapRect({ l:r.left - o.x, r:r.right - o.x, t:r.top - o.y, b:r.bottom - o.y }, applied);
    let v = unz;
    if (mode === 'settled') { const s = settledView(); v = mapRect(unz, s); }
    return { left:o.x + v.l, right:o.x + v.r, top:o.y + v.t, bottom:o.y + v.b, width:v.r - v.l, height:v.b - v.t,
             x:o.x + v.l, y:o.y + v.t, toJSON() { return this; } };
  }
  /** transform the camera will have once the running move ends */
  function settledView() {
    const { w, h } = size.w ? size : measure();
    const s = tween ? tween.to : st;
    return viewTransform(w, h, s.z, s.fx * w, s.fy * h);
  }
  /** the sprite box of a character (its visible <img>), stage-local zoom-1 px */
  const spriteBox = el => {
    const img = el.matches?.('img') ? el : el.querySelector?.('img:not(.fx)');
    let r = img ? rectOf(img) : null;
    if (!r || !(r.width > 0 && r.height > 0)) r = rectOf(el);      // a new pose image that is still loading has no box yet
    if (!(r.width > 0 && r.height > 0)) return null;
    const o = origin();
    return { l:r.left - o.x, r:r.right - o.x, t:r.top - o.y, b:r.bottom - o.y };
  };

  const resolveEls = target => {
    if (!world || target == null) return [];
    if (Array.isArray(target)) return target.flatMap(resolveEls);
    if (typeof Element !== 'undefined' && target instanceof Element) return [target];
    if (typeof target !== 'string') return [];
    const q = sel => [...world.querySelectorAll(sel)];
    if (target === 'you') return q('[data-crew-pick="you"], [data-cam="you"]').slice(0, 1);
    if (target === 'guard') return q('[data-crew-pick="guard"]').slice(0, 1);
    if (target.startsWith('crew:')) return resolveEls(target.slice(5));
    if (target.startsWith('foe:')) return q(`[data-foe-id="${CSS.escape(target.slice(4))}"]`);
    if (target === 'foe') return q('[data-foe-id]:not(.down)').slice(0, 1);
    if (target === 'foes') return q('[data-foe-id]:not(.down)');
    if (target === 'allies') return q('.fig.you, .battle-squad [data-crew-pick], .formation-member, .fig.helper');
    if (target === 'all' || target === 'wide') return [];
    const cam = q(`[data-cam="${CSS.escape(target)}"]`);        // interrogation scene: 'you' / 'suspect'
    if (cam.length) return cam.slice(0, 1);
    const byKey = q(`[data-crew-pick="${CSS.escape(target)}"]`);
    return byKey.length ? byKey.slice(0, 1) : [];
  };
  /** rect (stage-local, zoom 1) for any target form, or null */
  function targetBox(target) {
    if (!stage) return null;
    const { w, h } = size.w ? size : measure();
    if (target === 'all' || target === 'wide') return { l:0, t:0, r:w, b:h };
    if (target && typeof target === 'object' && !Array.isArray(target) && !(typeof Element !== 'undefined' && target instanceof Element)) {
      if (Number.isFinite(target.x) && Number.isFinite(target.y)) return { l:target.x, r:target.x, t:target.y, b:target.y };
      if (Number.isFinite(target.fx) && Number.isFinite(target.fy)) return { l:target.fx * w, r:target.fx * w, t:target.fy * h, b:target.fy * h };
    }
    if (Array.isArray(target)) return unionRect(target.map(targetBox));
    return unionRect(resolveEls(target).map(spriteBox));
  }
  const pointOf = target => { const b = targetBox(target); return b ? { x:(b.l + b.r) / 2, y:(b.t + b.b) / 2 } : null; };

  // ---- render --------------------------------------------------------------------------------------
  function render() {
    if (!stage || !world || !world.isConnected) return;
    const { w, h } = measure();
    if (!w || !h) return;
    const now = vnow();
    let z = st.z, jx = 0, jy = 0, amp = 0;
    if (punchAnim) {
      const p = clamp((now - punchAnim.t0) / punchAnim.ms, 0, 1);
      z *= 1 + punchAnim.amount * (1 - ease.out(p));
      if (p >= 1) punchAnim = null;
    }
    if (shake) {
      const s = shakeAt(shake.spec, now - shake.t0);
      jx = s.x; jy = s.y; amp = s.amp;
      if (now - shake.t0 >= shake.spec.ms) shake = null;
    }
    // while shaking, scale up a hair so the jitter never exposes the stage edge
    if (amp > 0) z *= 1 + 2 * amp / Math.min(w, h);
    const v = viewTransform(w, h, z, st.fx * w, st.fy * h);
    applied = { z:v.z, tx:v.tx + jx, ty:v.ty + jy };
    const css = z === 1 && !jx && !jy && v.tx === 0 && v.ty === 0 ? '' : `translate(${applied.tx.toFixed(2)}px,${applied.ty.toFixed(2)}px) scale(${v.z.toFixed(4)})`;
    if (world._camCss !== css) { world.style.transform = css; world._camCss = css; }
    stage.classList.toggle('cam-zoomed', v.z > 1.001);
  }

  function setBusy(on) {
    if (world) world.classList.toggle('cam-busy', on);
    if (stage) stage.classList.toggle('cam-moving', on);
  }

  // ---- loop ----------------------------------------------------------------------------------------
  function frame() {
    loopId = 0; inFrame = true;
    const n = PERF();
    if (freeze && n >= freeze.until) { vAcc += n - freeze.start; freeze = null; world?.classList.remove('cam-frozen'); }
    const now = vnow();
    // a cue's clock starts at its first rendered frame, so a long paint right before it cannot make the whole lead-in vanish
    for (const t of timers) if (t.at === Infinity) t.at = now + t.rel;
    if (tween) {
      const p = clamp((now - tween.t0) / tween.dur, 0, 1), e = tween.ease(p);
      st.z = tween.from.z + (tween.to.z - tween.from.z) * e;
      st.fx = tween.from.fx + (tween.to.fx - tween.from.fx) * e;
      st.fy = tween.from.fy + (tween.to.fy - tween.from.fy) * e;
      if (p >= 1) { const t = tween; tween = null; setBusy(false); t.resolve(); }
    }
    render();
    // scheduled steps (virtual clock — a hit-stop pushes them back)
    if (timers.length) {
      const due = timers.filter(t => t.at <= now).sort((a, b) => a.at - b.at);
      if (due.length) { timers = timers.filter(t => !due.includes(t)); due.forEach(t => { try { t.fn(); } catch (e) { console.error(e); } }); }
    }
    inFrame = false;
    if (tween || shake || punchAnim || freeze || timers.length) loopId = raf(frame);
    else { world?.classList.remove('cam-will'); emit('settled', {}); }
  }
  const kick = () => { if (!loopId && !inFrame) loopId = raf(frame); world?.classList.add('cam-will'); };

  function emit(name, info) {
    (listeners.get(name) || []).slice().forEach(fn => { try { fn(info); } catch (e) { console.error(e); } });
  }
  
  // ---- moves ---------------------------------------------------------------------------------------
  function focus(target, opts = {}) {
    const box = targetBox(target);
    if (!stage || !box) {
      // the target may not be measurable yet (image still decoding) — look again shortly, a few times
      if (stage && (opts._try || 0) < 6 && target != null) {
        const seq = cueSeq;
        timers.push({ at:Infinity, rel:dur(90), cue:true, fn:() => { if (seq === cueSeq) focus(target, { ...opts, _try:(opts._try || 0) + 1 }); } });
        kick();
      }
      return Promise.resolve();
    }
    const { w, h } = size.w ? size : measure();
    const pt = { x:(box.l + box.r) / 2 + (opts.offset?.x || 0), y:(box.t + box.b) / 2 + (opts.offset?.y || 0) };
    const wide = target === 'all' || target === 'wide';
    const keep = opts.keepVisible ? [targetBox(opts.keepVisible)].filter(Boolean) : [];
    const plan = planCamera({ W:w, H:h, focus:pt, zoom:wide ? 1 : opts.zoom ?? st.z, keepVisible:keep });
    return moveTo({ z:plan.z, fx:plan.cx / w, fy:plan.cy / h }, opts.ms ?? 260, opts.ease || 'out');
  }
  function moveTo(to, ms, easeName = 'out') {
    if (tween) { const t = tween; tween = null; t.resolve(); }
    const same = Math.abs(to.z - st.z) < .002 && Math.abs(to.fx - st.fx) < .002 && Math.abs(to.fy - st.fy) < .002;
    if (same) { setBusy(false); return Promise.resolve(); }
    if (!motionOn()) { st.z = 1; st.fx = .5; st.fy = .5; render(); return Promise.resolve(); }   // disabled / reduced motion: the scene stays wide
    if (ms <= 0) { st.z = to.z; st.fx = to.fx; st.fy = to.fy; render(); return Promise.resolve(); }
    return new Promise(resolve => {
      tween = { from:{ z:st.z, fx:st.fx, fy:st.fy }, to, t0:vnow(), dur:Math.max(16, dur(ms)), ease:ease[easeName] || ease.out, resolve };
      setBusy(true); kick();
    });
  }
  const reset = (opts = {}) => { dim(false, { ms:opts.ms }); return moveTo({ z:1, fx:.5, fy:.5 }, opts.ms ?? CAMERA_TIMING.recoverMs, opts.ease || 'inOut'); };

  function doShake(power = 1) {
    if (!motionOn()) return;
    const spec = shakeSpec(power), now = vnow();
    if (shake) { const left = shake.spec.ms - (now - shake.t0); if (left > 0 && shake.spec.amp >= spec.amp && left > spec.ms) return; }
    shake = { spec:{ amp:spec.amp, ms:dur(spec.ms) }, t0:now }; kick();
  }
  function hitStop(ms = 75) {
    if (!motionOn()) return;
    const len = clamp(ms, 40, 120), n = PERF();
    if (freeze) { freeze.until = Math.max(freeze.until, n + len); return; }
    freeze = { start:n, until:n + len }; world?.classList.add('cam-frozen'); kick();
  }
  function punch(amount = .04, ms = 180) { if (!motionOn()) return; punchAnim = { amount, ms:dur(ms), t0:vnow() }; kick(); }

  // "lit" actors sit above the dim overlay. Formation members carry an inline !important z-index, so raise inline too (and restore it after).
  const LIT_Z = '40';
  function clearLit(root) {
    (root || world)?.querySelectorAll?.('.cam-lit').forEach(el => {
      el.classList.remove('cam-lit');
      const old = el.dataset.camZ;
      if (old !== undefined) { if (old) { const [v, pr] = old.split('|'); el.style.setProperty('z-index', v, pr); } else el.style.removeProperty('z-index'); delete el.dataset.camZ; }
    });
  }
  function applyLit(on) {
    if (!world) return;
    clearLit();
    if (!on || !litSpec) return;
    resolveEls(litSpec).forEach(el => {
      el.classList.add('cam-lit');
      el.dataset.camZ = el.style.getPropertyValue('z-index') ? `${el.style.getPropertyValue('z-index')}|${el.style.getPropertyPriority('z-index')}` : '';
      el.style.setProperty('z-index', LIT_Z, 'important');
    });
  }
  function dim(on, opts = {}) {
    const alpha = on ? clamp(opts.alpha ?? CAMERA_TIMING.skill.dimAlpha, .35, .5) : 0;
    dimAlpha = alpha;
    litSpec = on ? (opts.lit ?? litSpec) : null;
    if (dimEl) {
      dimEl.style.transitionDuration = motionOn() ? `${Math.round(dur(opts.ms ?? 180))}ms` : '0ms';
      dimEl.style.opacity = String(alpha);
    }
    applyLit(on);
  }
  function flash(opts = {}) {
    if (!motionOn() || !stage) return;
    const layer = screenLayer('flash');
    layer.style.background = opts.color || '#fff';
    const a = opts.alpha ?? .85, ms = Math.round(dur(opts.ms ?? 160));
    layer.style.transition = 'none'; layer.style.opacity = String(a);
    void layer.offsetWidth;
    layer.style.transition = `opacity ${ms}ms ease-out`; layer.style.opacity = '0';
  }

  // ---- layers --------------------------------------------------------------------------------------
  function layer(name = 'fx') {
    let el = layers.get(name);
    if (!el) { el = document.createElement('div'); el.className = `cam-layer cam-${name}`; layers.set(name, el); }
    if (world && el.parentNode !== world) world.appendChild(el);
    return el;
  }
  function screenLayer(name = 'screen') {
    let el = screens.get(name);
    if (!el) { el = document.createElement('div'); el.className = `cam-screen cam-screen-${name}`; el.style.opacity = '0'; screens.set(name, el); }
    if (stage && el.parentNode !== stage) world?.after(el);
    return el;
  }

  // ---- attach (after every paint) -------------------------------------------------------------------
  function attach(el) {
    if (ro) { ro.disconnect(); ro = null; }
    stage = el && el.isConnected ? el : null;
    world = stage ? stage.querySelector(':scope > .cam-world') : null;
    if (!world) { stage = null; return false; }
    dimEl = world.querySelector(':scope > .cam-dim');
    if (!dimEl) { dimEl = document.createElement('div'); dimEl.className = 'cam-dim'; world.appendChild(dimEl); }
    dimEl.style.transitionDuration = '0ms'; dimEl.style.opacity = String(dimAlpha);
    layers.forEach(l => world.appendChild(l));
    screens.forEach(l => world.after(l));
    measure();
    applyLit(dimAlpha > 0);
    world.classList.toggle('cam-busy', !!tween); stage.classList.toggle('cam-moving', !!tween);
    if (freeze) world.classList.add('cam-frozen');
    render();
    if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(() => { measure(); render(); }); ro.observe(stage); }
    if (tween || shake || timers.length) kick();
    return true;
  }
  function detach() {
    if (ro) { ro.disconnect(); ro = null; }
    cancelCue(); if (tween) { const t = tween; tween = null; t.resolve(); }
    shake = null; punchAnim = null; freeze = null; vAcc = 0; timers = [];
    st.z = 1; st.fx = .5; st.fy = .5; dimAlpha = 0; litSpec = null; cueKey = '';
    layers.forEach(l => l.remove()); screens.forEach(l => l.remove());
    if (loopId) { caf(loopId); loopId = 0; }
    stage = world = dimEl = null; applied = { z:1, tx:0, ty:0 };
  }

  // ---- timelines -----------------------------------------------------------------------------------
  function cancelCue() { cueSeq++; timers = timers.filter(t => !t.cue); }
  /** a cue that is replaced mid-way still owes its sync events (windup / impact / recover): fire them now, once, in order */
  function flushEmits() {
    const owed = timers.filter(t => t.cue && t.emitName);
    timers = timers.filter(t => !t.cue);
    owed.forEach(t => emit(t.emitName, t.info));
  }
  function play(steps = []) {
    flushEmits();
    const mySeq = ++cueSeq;
    let finish; const done = new Promise(r => { finish = r; });
    let last = 0;
    for (const s of steps) {
      last = Math.max(last, s.at || 0);
      const t = { at:Infinity, rel:dur(s.at || 0), cue:true, emitName:s.emit, info:s.info || {}, fn:() => {
        if (mySeq !== cueSeq) return;
        if (s.reset) reset(typeof s.reset === 'object' ? s.reset : {});
        if (s.dim !== undefined) { const d = s.dim; dim(!!d, typeof d === 'object' ? d : {}); }
        if (s.focus) { const f = s.focus; if (f && typeof f === 'object' && 'target' in f) focus(f.target, f); else focus(f, {}); }
        if (s.shake) doShake(s.shake);
        if (s.hitStop) hitStop(s.hitStop === true ? 75 : s.hitStop);
        if (s.flash) flash(typeof s.flash === 'object' ? s.flash : {});
        if (s.punch) punch(s.punch === true ? .04 : s.punch);
        if (s.emit) emit(s.emit, s.info || {});
      } };
      timers.push(t);
    }
    timers.push({ at:Infinity, rel:dur(last + 20), cue:true, fn:() => { if (mySeq === cueSeq) finish(); } });
    kick();
    return { done, cancel:() => { if (mySeq === cueSeq) { cueSeq++; timers = timers.filter(t => !t.cue); finish(); } } };
  }

  /** The default choreography. See docs/battle-camera-api.md §4 */
  function cue(kind, ctx = {}) {
    const T = CAMERA_TIMING, info = { user:ctx.user, targets:ctx.targets, action:ctx.action, power:ctx.power || 1, crit:!!ctx.crit, scope:ctx.scope || 'single' };
    const power = clamp(ctx.power || 1, 1, 3);
    const stop = power >= 3 ? T.hitStop.crit : power >= 2 ? T.hitStop.heavy : T.hitStop.light;
    const impactFx = { shake:power, hitStop:stop || undefined, flash:ctx.flash || power >= 3 ? { alpha:.55 } : undefined, emit:'impact', info };
    if (kind === 'idle') { const r = play([{ at:0, reset:true }]); cueKey = 'idle'; return { ...r, impactAt:0 }; }
    if (kind === 'select') {
      const key = `select:${JSON.stringify(ctx.user)}`;
      const r = play([{ at:0, dim:false, focus:{ target:ctx.user, zoom:T.select.zoom, ms:T.select.ms, keepVisible:ctx.keepVisible ?? ['foes', ctx.user] } }]);
      cueKey = key; return { ...r, impactAt:0 };
    }
    cueKey = kind;
    // optional: ctx.impactAt (ms from the cue start) re-times windup / pan / impact / recover around a drawn animation's contact frame
    const retime = c => {
      const impactAt = clamp(ctx.impactAt ?? c.impactAt, 200, 1100);
      return { ...c, impactAt, windup:Math.min(c.windup, impactAt - 100), panAt:Math.max(40, impactAt - c.panMs), recoverAt:impactAt + (c.recoverAt - c.impactAt) };
    };
    if (kind === 'attack') {
      const c = retime(T.attack), steps = [
        { at:0, focus:{ target:ctx.user, zoom:c.zoom, ms:c.ms, keepVisible:ctx.targets } },
        { at:c.windup, emit:'windup', info },
        { at:c.panAt, focus:{ target:ctx.targets, zoom:c.zoom, ms:c.panMs } },
        { at:c.impactAt, ...impactFx },
        { at:c.recoverAt, emit:'recover', info }, { at:c.recoverAt, reset:true }];
      return { ...play(steps), impactAt:c.impactAt };
    }
    if (kind === 'foe-attack') {
      const c = retime(T.foeAttack), steps = [
        { at:0, focus:{ target:ctx.user, zoom:c.zoom, ms:c.ms, keepVisible:ctx.targets } },
        { at:c.windup, emit:'windup', info },
        { at:c.panAt, focus:ctx.scope === 'all' ? { target:'all', ms:c.panMs + 60 } : { target:ctx.targets, zoom:c.zoom, ms:c.panMs } },
        { at:c.impactAt, ...impactFx },
        { at:c.recoverAt, emit:'recover', info }, { at:c.recoverAt, reset:true }];
      return { ...play(steps), impactAt:c.impactAt };
    }
    if (kind === 'heal') {
      const c = T.heal, steps = [
        { at:0, focus:{ target:ctx.targets || ctx.user, zoom:c.zoom, ms:c.ms } },
        { at:c.windup, emit:'windup', info },
        { at:c.impactAt, emit:'impact', info, flash:ctx.flash ? { color:'#bff5c8', alpha:.35 } : undefined },
        { at:c.recoverAt, emit:'recover', info }, { at:c.recoverAt, reset:true }];
      return { ...play(steps), impactAt:c.impactAt };
    }
    if (kind === 'skill') {
      const c = T.skill, cut = ctx.cutMs > 0 ? ctx.cutMs : 0;
      const impactAt = cut > 0 ? Math.max(c.windup + 120, cut - 60) : c.impactAt;   // lands as the cutscene fades out
      const lit = ctx.scope === 'all' ? undefined : [ctx.user, ctx.targets].flat().filter(Boolean);
      const wantDim = ctx.dim !== false;
      const steps = [
        { at:0, dim:wantDim ? { alpha:c.dimAlpha, lit } : false, focus:{ target:ctx.user, zoom:c.zoom, ms:c.ms, keepVisible:ctx.scope === 'all' ? undefined : ctx.targets } },
        { at:c.windup, emit:'windup', info },
        { at:Math.max(c.windup + 20, impactAt - c.panLead), focus:ctx.scope === 'all' ? { target:'all', ms:c.panLead + 60 } : { target:ctx.targets || ctx.user, zoom:c.zoom - .04, ms:c.panLead } },
        { at:impactAt, ...impactFx, punch:ctx.scope === 'all' ? .05 : undefined },
        { at:impactAt + c.recoverGap, emit:'recover', info }, { at:impactAt + c.recoverGap, reset:true }];
      return { ...play(steps), impactAt };
    }
    if (kind === 'interrogate-ask') {
      const c = T.ask;
      return { ...play([{ at:0, focus:{ target:ctx.targets || ctx.user, zoom:c.zoom, ms:c.ms } }]), impactAt:0 };
    }
    if (kind === 'interrogate-reveal') {
      const c = T.reveal;
      return { ...play([{ at:0, focus:{ target:ctx.targets || ctx.user, zoom:c.zoom, ms:c.ms } },
        { at:c.impactAt, flash:true, shake:1.5, emit:'impact', info }]), impactAt:c.impactAt };
    }
    return { done:Promise.resolve(), cancel() {}, impactAt:0 };
  }

  // ---- public --------------------------------------------------------------------------------------
  Object.assign(api, {
    attach, detach, focus, reset, shake:doShake, hitStop, dim, flash, punch, cue, play, layer, screenLayer,
    pointOf, rectOf, size:() => ({ ...(size.w ? size : measure()) }),
    on(name, fn) { const a = listeners.get(name) || []; a.push(fn); listeners.set(name, a); return () => api.off(name, fn); },
    off(name, fn) { listeners.set(name, (listeners.get(name) || []).filter(f => f !== fn)); },
    setEnabled(on) {
      enabled = !!on;
      try { localStorage.setItem(CAMERA_FX_KEY, enabled ? '1' : '0'); } catch {}
      if (!enabled) { if (tween) { const t = tween; tween = null; t.resolve(); } shake = null; punchAnim = null; st.z = 1; st.fx = .5; st.fy = .5; setBusy(false); render(); }
    },
    get enabled() { return enabled; },
    get reduced() { return reducedMotion(); },
    get currentCue() { return cueKey; },
    state: () => ({ zoom:st.z, cx:st.fx * (size.w || 0), cy:st.fy * (size.h || 0), dim:dimAlpha, moving:!!tween, enabled, reduced:reducedMotion(), pending:timers.length, running:!!loopId || inFrame }),
    /** test/debug: the transform actually written to the world right now */
    applied: () => ({ ...applied }),
    stageEl: () => stage,
  });
  return api;
}

export const camera = createBattleCamera();
