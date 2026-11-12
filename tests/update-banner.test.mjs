// "มีเวอร์ชันใหม่" notice (12 Nov 2569): build stamp -> version.json -> comparison in the tab.  Browser run: docs/art-reviews/2026-11-12-update-banner/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, copyFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readBuildId, fetchLatestBuild, createVersionWatch, isUpdatePreview, mountVersionCheck, PLACEHOLDER, POLL_MS, ASSET_CHECK_GAP_MS } from '../src/version-check.js';
import { stamp } from '../scripts/stamp-build.mjs';

const html = readFileSync('index.html', 'utf8');
const metaDoc = content => ({ querySelector: sel => (sel === 'meta[name="avegee-deploy"]' && content != null ? { getAttribute: () => content } : null) });

test('readBuildId: stamped id is used, placeholder / missing meta means "dev, check off"', () => {
  assert.equal(readBuildId(metaDoc('abc12345')), 'abc12345');
  assert.equal(readBuildId(metaDoc(PLACEHOLDER)), null);
  assert.equal(readBuildId(metaDoc('  ')), null);
  assert.equal(readBuildId(metaDoc(null)), null);
});

test('fetchLatestBuild asks version.json?t=<now> without the HTTP cache and returns the build id', async () => {
  let seen;
  const fetchImpl = async (url, opt) => { seen = { url, opt }; return { ok: true, json: async () => ({ build: 'def67890', time: 'x' }) }; };
  const id = await fetchLatestBuild({ fetchImpl, base: 'https://example.test/AVEGEE/index.html', now: 1234 });
  assert.equal(id, 'def67890');
  assert.equal(seen.url, 'https://example.test/AVEGEE/version.json?t=1234');
  assert.equal(seen.opt.cache, 'no-store');
});

test('fetchLatestBuild is silent on every failure: offline, 404, bad JSON, wrong shape, no fetch', async () => {
  const base = 'https://example.test/index.html';
  const cases = [
    async () => { throw new TypeError('Failed to fetch'); },
    async () => ({ ok: false, status: 404, json: async () => ({}) }),
    async () => ({ ok: true, json: async () => { throw new SyntaxError('bad json'); } }),
    async () => ({ ok: true, json: async () => ({ nope: 1 }) }),
    async () => ({ ok: true, json: async () => ({ build: '' }) }),
    async () => ({ ok: true, json: async () => null }),
    async () => null,
  ];
  for (const fetchImpl of cases) assert.equal(await fetchLatestBuild({ fetchImpl, base }), null);
  assert.equal(await fetchLatestBuild({ fetchImpl: undefined, base }), null);
});

test('watch: same build stays quiet, a different build latches stale once and stops asking', async () => {
  let latest = 'abc12345', calls = 0, stale = [];
  const w = createVersionWatch({ current: 'abc12345', fetchLatest: async () => { calls++; return latest; }, onStale: v => stale.push(v) });
  assert.equal(await w.check(), false);
  assert.equal(calls, 1); assert.deepEqual(stale, []);
  latest = 'def67890';
  assert.equal(await w.check(), true);
  assert.deepEqual(stale, ['def67890']);
  assert.equal(await w.check(), true);               // latched
  assert.equal(calls, 2);                            // no more network once stale
  assert.deepEqual(stale, ['def67890']);
});

test('watch: failed checks never flip to stale and never throw', async () => {
  const w = createVersionWatch({ current: 'abc12345', fetchLatest: async () => null });
  assert.equal(await w.check(), false);
  const w2 = createVersionWatch({ current: 'abc12345', fetchLatest: async () => { throw new Error('boom'); } });
  assert.equal(await w2.check(), false);
  assert.equal(w2.stale, false);
});

test('watch: unstamped build (current = null) is disabled and never fetches', async () => {
  let calls = 0;
  const w = createVersionWatch({ current: null, fetchLatest: async () => { calls++; return 'x'; } });
  assert.equal(await w.check(), false);
  assert.equal(calls, 0);
});

test('watch: overlapping checks share one request; a broken-image re-check is spaced out by minGapMs', async () => {
  let calls = 0, t = 1000, release;
  const gate = new Promise(r => { release = r; });
  const w = createVersionWatch({ current: 'a1b2c3d4', now: () => t, fetchLatest: async () => { calls++; await gate; return 'a1b2c3d4'; } });
  const p1 = w.check(), p2 = w.check();
  release(); await Promise.all([p1, p2]);
  assert.equal(calls, 1);
  t += 5000;
  assert.equal(await w.check({ minGapMs: ASSET_CHECK_GAP_MS }), false);
  assert.equal(calls, 1);                            // too soon -> skipped
  t += ASSET_CHECK_GAP_MS;
  await w.check({ minGapMs: ASSET_CHECK_GAP_MS });
  assert.equal(calls, 2);
});

test('timing constants match the brief: every 10 minutes', () => { assert.equal(POLL_MS, 600000); });

test('stamp-build writes the id into index.html and version.json (what the Pages workflow runs on _site/)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'stamp-'));
  copyFileSync('index.html', join(dir, 'index.html'));
  assert.equal(stamp(dir, 'deadbeefcafe1234', '2026-11-12T00:00:00.000Z'), 'deadbeefcafe');
  const out = readFileSync(join(dir, 'index.html'), 'utf8');
  assert.match(out, /<meta name="avegee-deploy" content="deadbeefcafe">/);
  assert.ok(!out.includes(PLACEHOLDER));
  assert.deepEqual(JSON.parse(readFileSync(join(dir, 'version.json'), 'utf8')), { build: 'deadbeefcafe', time: '2026-11-12T00:00:00.000Z' });
  assert.throws(() => stamp(dir, 'cafebabe'), /no <meta/);                 // already stamped: refuse to guess
  const bad = mkdtempSync(join(tmpdir(), 'stamp-')); writeFileSync(join(bad, 'index.html'), '<meta name="avegee-deploy" content="__BUILD_ID__">');
  assert.throws(() => stamp(bad, ''), /bad build id/);
  assert.throws(() => stamp(bad, '../../x'), /bad build id/);
});

test('repo index.html carries the placeholder (dev = off), loads the module last, and ships the banner + icon styles', () => {
  assert.match(html, /<meta name="avegee-deploy" content="__BUILD_ID__">/);
  assert.match(html, /<meta name="avegee-build" content="[^"]+">/);          // the old meta (scripts/build-guide-exit-review.mjs reads it) is untouched
  assert.ok(html.indexOf('<script type="module" src="src/version-check.js?v=') > html.indexOf('<script type="module" src="src/ui.js?v='));
  assert.ok(existsSync('img/ui/icon-restart.webp'), 'the in-game icon is the existing drawn asset');
  assert.match(html, /#update-banner\{/); assert.match(html, /#update-chip\{/);
  assert.match(html, /#title:not\(\.ready\) #update-banner/);
});

test('Pages workflow stamps the staged _site only, version.json is generated not committed', () => {
  const wf = readFileSync('.github/workflows/pages.yml', 'utf8');
  assert.match(wf, /node scripts\/stamp-build\.mjs _site "\$\{GITHUB_SHA::8\}"/);
  assert.ok(wf.indexOf('cp -r src img audio _site/') < wf.indexOf('stamp-build.mjs'));
  assert.ok(!existsSync('version.json'));
});

test('texts: both languages say what the brief says', () => {
  const src = readFileSync('src/version-check.js', 'utf8');
  assert.ok(src.includes('มีเวอร์ชันใหม่ แตะเพื่อโหลดใหม่'));
  assert.ok(src.includes('New version available — tap to reload'));
});

test('preview flag: only ?update=preview turns it on, nothing else (no other value, no hash, no storage)', () => {
  assert.equal(isUpdatePreview('?update=preview'), true);
  assert.equal(isUpdatePreview('?x=1&update=preview'), true);
  for (const s of ['', '?', '?update=1', '?update=', '?update=Preview', '?updates=preview', '#update=preview', null, undefined]) assert.equal(isUpdatePreview(s), false, String(s));
});

// A tiny DOM: just enough of what mountVersionCheck touches.
function fakeWin({ build, search = '', title = 'home', latest = build }) {
  const mk = tag => { const el = { tag, hidden: false, children: [], dataset: {}, listeners: {}, classList: { toggle() {}, contains: c => el._cls?.has(c) }, _cls: new Set(),
    set innerHTML(v) { el._html = v; }, setAttribute() {}, addEventListener(t, f) { el.listeners[t] = f; }, appendChild(c) { el.children.push(c); },
    querySelector: () => ({ textContent: '' }) }; return el; };
  const titleEl = mk('div'); if (title === 'gone') titleEl._cls.add('gone');
  const byId = { title: titleEl };
  const doc = { baseURI: 'https://x.test/AVEGEE/index.html', documentElement: { dataset: {}, lang: 'th' }, body: mk('body'),
    querySelector: sel => sel === 'meta[name="avegee-deploy"]' && build ? { getAttribute: () => build } : null,
    getElementById: id => byId[id] ?? null, createElement: mk, addEventListener() {} };
  let reloads = 0, fetches = 0;
  const win = { document: doc, location: { search, reload: () => { reloads++; } }, setInterval: () => 0, addEventListener() {},
    fetch: async () => { fetches++; return { ok: true, json: async () => ({ build: latest }) }; }, G: { save: () => true } };
  return { win, doc, counts: () => ({ reloads, fetches }),
    visible: () => { const [banner, chip] = [titleEl.children[0], doc.body.children[0]]; return { banner: !banner.hidden, chip: !chip.hidden }; },
    tapBanner: () => titleEl.children[0].listeners.click(), tapChip: () => doc.body.children[0].listeners.click() };
}

test('preview on a stamped build whose version matches: banner on Home, icon in play, no latch, no reload on tap', async () => {
  const home = fakeWin({ build: 'abc12345', search: '?update=preview' });
  const m = mountVersionCheck(home.win);
  await m.watch.check();
  assert.equal(m.watch.stale, false);                                    // the preview never pretends the server said "newer"
  assert.deepEqual(home.visible(), { banner: true, chip: false });
  home.tapBanner();
  assert.equal(home.counts().reloads, 0);
  assert.equal(home.doc.documentElement.dataset.updateAvailable, '');
  assert.equal(home.doc.documentElement.dataset.updatePreview, '1');
  const play = fakeWin({ build: 'abc12345', search: '?update=preview', title: 'gone' });
  mountVersionCheck(play.win);
  assert.deepEqual(play.visible(), { banner: false, chip: true });
  play.tapChip();
  assert.equal(play.counts().reloads, 0);
});

test('preview also works on an unstamped dev build (nothing to compare, but the strip draws)', () => {
  const dev = fakeWin({ build: null, search: '?update=preview' });
  assert.ok(mountVersionCheck(dev.win));
  assert.deepEqual(dev.visible(), { banner: true, chip: false });
  assert.equal(dev.counts().fetches, 0);
});

test('no flag = unchanged behaviour: matching build shows nothing, unstamped dev mounts nothing, a real newer build still shows and reloads', async () => {
  const same = fakeWin({ build: 'abc12345' });
  const m = mountVersionCheck(same.win); await m.watch.check();
  assert.deepEqual(same.visible(), { banner: false, chip: false });
  assert.equal(same.doc.documentElement.dataset.updatePreview, '');
  assert.equal(mountVersionCheck(fakeWin({ build: null }).win), null);
  const newer = fakeWin({ build: 'abc12345', latest: 'def67890', search: '?update=preview' });   // preview + really stale: the real path wins, tap reloads
  const n = mountVersionCheck(newer.win); await n.watch.check();
  assert.equal(n.watch.stale, true);
  newer.tapBanner();
  assert.equal(newer.counts().reloads, 1);
  const real = fakeWin({ build: 'abc12345', latest: 'def67890' });
  const r = mountVersionCheck(real.win); await r.watch.check();
  assert.deepEqual(real.visible(), { banner: true, chip: false });
  real.tapBanner();
  assert.equal(real.counts().reloads, 1);
});
