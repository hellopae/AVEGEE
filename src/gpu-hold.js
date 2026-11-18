// T3/13 (owner 19 Nov: "ไม่อยากให้ขึ้นจอดำเลย มันดูเหมือนเกมไม่สมบูรณ์"): after a GPU loss the map canvas is transparent (black on the stage) for ~0.5 s while the ground is baked again.
// Keep the last picture on screen meanwhile: every HOLD_EVERY_MS a small copy of the map canvas is taken into a CPU canvas (one read-back of a downscaled draw every 2.5 s - never per frame)
// and published as a JPEG blob into a plain <div> background (decoded image memory, not GPU canvas memory, so it survives the loss).  On `contextlost` the <img> is shown over the
// canvas; once the ground is painted again it fades out (200 ms).  Pure browser glue: no pixel is read at any other time, nothing is drawn into the game's canvas.
export const HOLD_EVERY_MS = 2500, HOLD_SCALE = .34, HOLD_FADE_MS = 200, HOLD_MAX_MS = 3500, HOLD_POLL_MS = 80;

export function createFrameHold(cv, { every = HOLD_EVERY_MS, scale = HOLD_SCALE, doc = globalThis.document, setTimer = globalThis.setTimeout, setEvery = globalThis.setInterval, clearEvery = globalThis.clearInterval, now = () => Date.now() } = {}) {
  if (!cv || !doc) return { show() {}, hideWhen() {}, destroy() {}, snapshotNow() {}, get state() { return { shown: false, hasPicture: false, snapshots: 0 }; } };
  const img = doc.createElement('div');   // a div, not an <img>: the page's global img rules (height:auto) squash it
  img.className = 'gpu-hold'; img.hidden = true; img.setAttribute('aria-hidden', 'true');
  img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:1;background:center/100% 100% no-repeat;transition:opacity ' + HOLD_FADE_MS + 'ms linear';
  cv.insertAdjacentElement ? cv.insertAdjacentElement('afterend', img) : cv.parentNode?.appendChild(img);
  const snap = doc.createElement('canvas'); let sctx = null; try { sctx = snap.getContext('2d', { willReadFrequently: true }); } catch {}
  const st = { shown: false, hasPicture: false, snapshots: 0, url: null, busy: false, token: 0 };
  const snapshotNow = () => {
    if (!sctx || st.busy || st.shown || doc.hidden || !cv.width || !cv.height) return;
    const w = Math.max(16, Math.round(cv.width * scale)), h = Math.max(16, Math.round(cv.height * scale));
    if (snap.width !== w || snap.height !== h) { snap.width = w; snap.height = h; }
    try { sctx.drawImage(cv, 0, 0, w, h); } catch { return; }
    st.busy = true;
    const done = blob => {
      st.busy = false; if (!blob || st.shown) return;
      const old = st.url; st.url = URL.createObjectURL(blob);
      const probe = new Image(); probe.src = st.url;   // decoded before it is needed
      (probe.decode ? probe.decode() : Promise.resolve()).catch(() => {}).then(() => { img.style.backgroundImage = 'url("' + st.url + '")'; st.hasPicture = true; if (old) URL.revokeObjectURL(old); });
      st.snapshots++;
    };
    try { snap.toBlob(done, 'image/jpeg', .72); } catch { st.busy = false; }
  };
  const timer = setEvery(snapshotNow, every);
  return {
    snapshotNow,
    /** the canvas was lost: put the last picture over it (nothing to show before the first snapshot) */
    show() { if (!st.hasPicture) return false; st.token++;
      // the page's own rules size children of .scene-box (a bare div came out 249 px high): copy the canvas's box in pixels
      img.style.inset = 'auto'; img.style.left = cv.offsetLeft + 'px'; img.style.top = cv.offsetTop + 'px'; img.style.width = cv.clientWidth + 'px'; img.style.height = cv.clientHeight + 'px'; img.style.aspectRatio = 'auto'; st.shown = true; img.style.transition = 'none'; img.style.opacity = '1'; img.hidden = false; return true; },
    /** poll `ready()` every HOLD_POLL_MS; when the ground is back (or after HOLD_MAX_MS) fade the picture out */
    hideWhen(ready, maxMs = HOLD_MAX_MS) {
      if (!st.shown) return;
      const token = st.token, t0 = now();
      const tick = () => {
        if (token !== st.token || !st.shown) return;
        let ok = false; try { ok = !!ready(); } catch { ok = true; }
        if (ok || now() - t0 >= maxMs) {
          img.style.transition = 'opacity ' + HOLD_FADE_MS + 'ms linear'; img.style.opacity = '0';
          setTimer(() => { if (token === st.token) { img.hidden = true; st.shown = false; } }, HOLD_FADE_MS + 30);
        } else setTimer(tick, HOLD_POLL_MS);
      };
      setTimer(tick, HOLD_POLL_MS);
    },
    destroy() { clearEvery(timer); img.remove(); if (st.url) URL.revokeObjectURL(st.url); },
    get state() { return { shown: st.shown, hasPicture: st.hasPicture, snapshots: st.snapshots }; },
  };
}
