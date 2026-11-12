// version-check.js — "มีเวอร์ชันใหม่" notice (12 Nov 2569)
//
// Why: a tab left open across a deploy keeps running the OLD code, which asks for file names the new deploy no longer has
// (images were renamed .png -> .webp; the old tab then 404s on every sprite).  The fix is to tell the player and let them reload.
//
// How: the deploy workflow runs scripts/stamp-build.mjs, which (1) replaces __BUILD_ID__ in <meta name="avegee-deploy"> of index.html
// with the short commit sha and (2) writes the same id to version.json beside index.html.  This module compares the two:
//   page's own meta  (what THIS tab loaded)   vs   version.json?t=<now> (what is deployed NOW).
// Not equal -> stale.  When the meta still says __BUILD_ID__ (local dev, tests) the whole thing stays off.
//
// Everything that can go wrong (offline, 404 on version.json, bad JSON, timeouts) is silent: no banner, no console error.

export const PLACEHOLDER = '__BUILD_ID__';
export const POLL_MS = 10 * 60 * 1000;          // every 10 minutes
export const ASSET_CHECK_GAP_MS = 20 * 1000;    // broken-image triggered re-checks are spaced out

/** The build id this tab was loaded with, or null when unstamped (dev). */
export function readBuildId(doc = globalThis.document) {
  const v = doc?.querySelector?.('meta[name="avegee-deploy"]')?.getAttribute('content')?.trim();
  return v && v !== PLACEHOLDER ? v : null;
}

/** Latest deployed build id, or null on ANY failure (offline, 404, bad JSON, slow). Never throws. */
export async function fetchLatestBuild({ fetchImpl = globalThis.fetch, base = globalThis.document?.baseURI, now = Date.now(), timeoutMs = 8000 } = {}) {
  try {
    if (typeof fetchImpl !== 'function') return null;
    const url = new URL('version.json', base);
    url.searchParams.set('t', String(now));
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
    try {
      const res = await fetchImpl(url.href, { cache: 'no-store', signal: ctl?.signal });
      if (!res || !res.ok) return null;
      const body = await res.json();
      return typeof body?.build === 'string' && body.build.trim() ? body.build.trim() : null;
    } finally { if (timer) clearTimeout(timer); }
  } catch { return null; }
}

/** The state machine.  check() asks the server; once a different build is seen it latches `stale` and stops asking. */
export function createVersionWatch({ current, fetchLatest, onStale = () => {}, now = () => Date.now() }) {
  const w = { stale: false, latest: null, lastAt: -Infinity, inFlight: null, enabled: !!current };
  w.check = function check({ minGapMs = 0 } = {}) {
    if (!w.enabled || w.stale) return Promise.resolve(w.stale);
    if (w.inFlight) return w.inFlight;
    if (now() - w.lastAt < minGapMs) return Promise.resolve(false);
    w.lastAt = now();
    w.inFlight = Promise.resolve().then(fetchLatest).then(latest => {
      if (latest && latest !== current) { w.stale = true; w.latest = latest; try { onStale(latest); } catch {} }
      return w.stale;
    }, () => false).finally(() => { w.inFlight = null; });
    return w.inFlight;
  };
  return w;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Browser wiring (skipped under node --test: no document)
const TEXT = {
  th: { banner: 'มีเวอร์ชันใหม่ แตะเพื่อโหลดใหม่', chip: 'มีเวอร์ชันใหม่ แตะเพื่อโหลดใหม่' },
  en: { banner: 'New version available — tap to reload', chip: 'New version available — tap to reload' },
};
const lang = () => (document.documentElement.lang === 'en' ? 'en' : 'th');

/** Save (only when a game is running) then reload.  g.save() is a no-op returning false when no slot is selected (Home). */
export function reloadNow({ win = globalThis.window, started } = {}) {
  try { if (started) win.G?.save?.(); } catch {}
  win.location.reload();
}

export function mountVersionCheck(win = globalThis.window) {
  const doc = win.document;
  const current = readBuildId(doc);
  if (!current) return null;                                   // unstamped (dev/tests): nothing to compare, stay out of the way

  const title = doc.getElementById('title');
  const playing = () => !title || title.classList.contains('gone');
  let urgent = false;

  const banner = doc.createElement('button');
  banner.id = 'update-banner'; banner.type = 'button'; banner.hidden = true;
  banner.innerHTML = '<span class="ub-dot" aria-hidden="true"></span><span class="ub-text"></span>';
  (title || doc.body).appendChild(banner);

  const chip = doc.createElement('button');
  chip.id = 'update-chip'; chip.type = 'button'; chip.hidden = true;
  chip.innerHTML = '<img src="img/ui/icon-restart.webp" alt=""><span class="uc-text"></span>';
  doc.body.appendChild(chip);

  const watch = createVersionWatch({
    current,
    fetchLatest: () => fetchLatestBuild({ base: doc.baseURI, fetchImpl: win.fetch?.bind(win) }),
    onStale: () => render(),
  });

  function render() {
    const T = TEXT[lang()];
    const showBanner = watch.stale && !playing();
    const showChip = watch.stale && playing();
    banner.hidden = !showBanner;
    banner.querySelector('.ub-text').textContent = T.banner;
    chip.hidden = !showChip;
    chip.classList.toggle('is-urgent', urgent);
    chip.querySelector('.uc-text').textContent = urgent ? T.chip : '';
    chip.setAttribute('aria-label', T.chip);
    chip.title = T.chip; banner.setAttribute('aria-label', T.banner);
    doc.documentElement.dataset.updateAvailable = watch.stale ? '1' : '';
  }
  const tap = () => reloadNow({ win, started: playing() });
  banner.addEventListener('click', tap);
  chip.addEventListener('click', tap);

  // Home <-> play switches the presentation; language switches the words.
  if (title && win.MutationObserver) new win.MutationObserver(render).observe(title, { attributes: true, attributeFilter: ['class'] });
  if (win.MutationObserver) new win.MutationObserver(render).observe(doc.documentElement, { attributes: true, attributeFilter: ['lang'] });

  // 1) when the page opens  2) every 10 minutes  3) when the tab comes back
  watch.check();
  const timer = win.setInterval(() => watch.check(), POLL_MS);
  doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'visible') watch.check(); });
  win.addEventListener('pageshow', e => { if (e.persisted) watch.check(); });   // bfcache restore counts as "tab came back"

  // 4) an image that fails to load (404 from a renamed file) while the build differs -> show right away, and loud enough to notice
  const assetFailed = () => {
    if (watch.stale) { urgent = true; return render(); }
    watch.check({ minGapMs: ASSET_CHECK_GAP_MS }).then(stale => { if (stale) { urgent = true; render(); } });
  };
  win.addEventListener('error', e => { if (e.target && e.target.tagName === 'IMG') assetFailed(); }, true);   // <img> in the DOM
  try {                                                                                                         // new Image() used by the canvas code never reaches window 'error'
    new win.PerformanceObserver(list => {
      for (const en of list.getEntries()) if (en.initiatorType === 'img' && en.responseStatus >= 400) { assetFailed(); break; }
    }).observe({ type: 'resource', buffered: false });
  } catch {}

  render();
  return { watch, banner, chip, timer, render };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') window.__versionCheck = mountVersionCheck(window);
