// อินโทร v3 (สืบจาก H5a): สแปลช intro-opening-v3.mp4 เล่นจนจบครั้งเดียว → ค้างเฟรมสุดท้าย → dissolve เข้าปก cover-v4
// home-intro-v5.mp4 (ยมฯ หันหน้า) เลิกใช้ในลำดับนี้ — ไฟล์ยังอยู่ แต่ไม่มีโค้ดเรียก
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';

const ui = readFileSync('src/ui.js', 'utf8');
const html = readFileSync('index.html', 'utf8');
const VIDEO = 'img/intro-opening-v3.mp4';

test('splash ships intro-opening-v3.mp4: faststart H.264, 1300x708, ~19 s, <= 6 MB', () => {
  assert.ok(existsSync(VIDEO));
  assert.ok(statSync(VIDEO).size <= 6 * 1024 * 1024);
  const buf = readFileSync(VIDEO);
  const head = buf.subarray(0, 8192);
  assert.ok(head.includes(Buffer.from('moov')), 'moov atom must be near the start (faststart)');
  assert.ok(head.includes(Buffer.from('avc1')), 'H.264');
  const tag = html.match(/<video[^>]*id="splash-video"[^>]*>/)[0];
  assert.match(tag, /src="img\/intro-opening-v3\.mp4"/);
  for (const attr of ['muted', 'playsinline']) assert.match(tag, new RegExp(`\\b${attr}\\b`));
  assert.doesNotMatch(tag, /\bloop\b/);
  assert.doesNotMatch(html, /intro-opening-v2/);
});

test('still cover is cover-v4 everywhere (css note, probe order, critical preload) and cover-v5 is not the cover', () => {
  assert.ok(existsSync('img/cover-v4.webp'));
  const probe = ui.match(/\}\)\(\[('img\/cover[^\]]*)\]\)/)[1].split(',').map(s => s.trim().replace(/'/g, ''));
  assert.deepEqual(probe, ['img/cover-v4.webp', 'img/cover-v3.webp', 'img/cover.webp', 'img/cover.png']);
  assert.doesNotMatch(html, /cover-v5\.webp/);
  assert.doesNotMatch(ui, /cover-v5\.webp/);
});

test('home-intro-v5 (front-facing Yama) is no longer referenced, and there is no #cover-vfx video layer', () => {
  assert.doesNotMatch(ui, /home-intro-v5\.mp4/);
  assert.doesNotMatch(html, /home-intro-v5|id="cover-vfx"|class="cover-vfx"/);
  assert.doesNotMatch(ui, /prepareCoverVideo|playCoverVideo|handoffToCoverVideo|SPLASH_CUT|coverVfx/);
  for (const f of ['img/manifest.json', 'img/preload-catalog.json']) assert.ok(!readFileSync(f, 'utf8').includes('home-intro-v5'), f);
});

test('sequence: plays to the end (ended -> slow dissolve), skip / error / reduced motion / 25 s timeout all reach the cover', () => {
  assert.match(ui, /splashVideo\.addEventListener\('ended', \(\) => revealTitle\(true\)/);   // ไม่ตัดกลางคัน
  assert.match(ui, /splashVideo\.addEventListener\('error', \(\) => revealTitle\(\)/);
  assert.match(ui, /\$\('#splash-skip'\)\.onclick = \(\) => revealTitle\(\)/);
  assert.match(ui, /if \(reducedMotion\) return revealTitle\(\)/);
  assert.match(ui, /setTimeout\(\(\) => revealTitle\(\), 25000\)/);
  assert.match(ui, /function settleCover\(\)/);
  assert.match(ui, /avegee:cover-settled/);
  assert.match(ui, /titleEl\.classList\.add\('ready', 'cover-settled'\)/);
  assert.match(html, /#splash\.leaving\.slow\{transition-duration:\.9s\}/);
  // เมนู/โลโก้ซ่อนจนกว่า .ready — และ .ready ต้องมีทางใส่เสมอ (settleCover ถูกเรียกจาก hideSplash ทุกเส้นทาง)
  assert.match(html, /#title \.title-menu\{opacity:0;visibility:hidden/);
  assert.match(html, /#title\.ready \.title-menu\{opacity:1;visibility:visible/);
  assert.match(ui, /splashEl\.hidden = true; if \(!started\) settleCover\(\)/);
  assert.match(ui, /if \(reduced\) \{ splashEl\.hidden = true; return settleCover\(\); \}/);
});

test('runtime: hideSplash/revealTitle/settleCover behave (ended slow, skip fast, only once, reduced motion immediate)', async () => {
  const start = ui.indexOf('let coverSettled = false;');
  const end = ui.indexOf('/** เริ่มเล่นจริง — เรียกได้ครั้งเดียว */');
  const body = ui.slice(start, end);
  for (const reduced of [false, true]) {
    const classes = new Set(), events = [], timers = [];
    const mk = () => ({ hidden:false, classList:{ add:(...c) => c.forEach(x => classes.add(x)), toggle:(c, on) => on ? classes.add(c) : classes.delete(c) } });
    const titleEl = mk(), splashEl = mk();
    const paused = { n:0 };
    const splashVideo = { pause() { paused.n++; } };
    const fn = new Function('titleEl', 'splashEl', 'splashVideo', 'coverArtEl', 'matchMedia', 'document', 'CustomEvent', 'setTimeout', 'started',
      `let splashDone = false; ${body}; return { revealTitle, hideSplash, settleCover };`);
    const api = fn(titleEl, splashEl, splashVideo, null, () => ({ matches:reduced }),
      { dispatchEvent:e => events.push(e.type) }, class { constructor(t) { this.type = t; } },
      (f, ms) => timers.push([f, ms]), false);
    const slow = !reduced;
    api.revealTitle(slow); api.revealTitle(slow);      // เรียกซ้ำ = ทำครั้งเดียว
    assert.equal(paused.n, 1);
    if (reduced) {
      assert.equal(splashEl.hidden, true); assert.deepEqual(events, ['avegee:cover-settled']);
    } else {
      assert.ok(classes.has('leaving') && classes.has('slow'));
      assert.deepEqual(timers.map(t => t[1]), [900]);
      assert.equal(splashEl.hidden, false); assert.equal(events.length, 0);
      timers[0][0]();                                  // dissolve จบ → ปกนิ่ง + เมนู + H5b
      assert.equal(splashEl.hidden, true); assert.deepEqual(events, ['avegee:cover-settled']);
    }
    assert.ok(titleEl.classList && classes.has('ready') && classes.has('cover-settled'));
  }
  // skip = dissolve เร็ว (380 ms ไม่มีคลาส slow)
  const classes = new Set(), timers = [];
  const el = () => ({ hidden:false, classList:{ add:(...c) => c.forEach(x => classes.add(x)), toggle:(c, on) => on ? classes.add(c) : classes.delete(c) } });
  const fn = new Function('titleEl', 'splashEl', 'splashVideo', 'coverArtEl', 'matchMedia', 'document', 'CustomEvent', 'setTimeout', 'started',
    `let splashDone = false; ${body}; return { revealTitle };`);
  fn(el(), el(), { pause() {} }, null, () => ({ matches:false }), { dispatchEvent() {} }, class {}, (f, ms) => timers.push([f, ms]), false).revealTitle();
  assert.ok(!classes.has('slow')); assert.deepEqual(timers.map(t => t[1]), [380]);
});

test('end-of-video handoff: cover art starts at the video scale (k) and eases back to 1 during the dissolve', () => {
  const start = ui.indexOf('function coverMatchScale()');
  const end = ui.indexOf('/** slow = วิดีโอเล่นจบ');
  const k = (vw, vh, w = 1300, h = 708) => new Function('splashEl', 'splashVideo',
    `${ui.slice(start, end)}; return coverMatchScale();`)({ clientWidth:vw, clientHeight:vh }, { videoWidth:w, videoHeight:h });
  assert.ok(Math.abs(k(390, 844) - 1.0247) < 0.002, 'portrait: video is ~2.5% tighter than the still');
  assert.ok(Math.abs(k(1600, 900) - 1.0247) < 0.002, '16:9');
  assert.equal(k(2400, 1000), 1);                              // กว้างกว่า 1.84 : ทั้งคู่ผูกความกว้าง ไม่ต้องชดเชย
  assert.equal(k(0, 0), 1); assert.equal(k(1600, 900, 0, 0), 1);
  const mid = k(1000, 556);                                    // 1.80 อยู่ระหว่างสองอัตราส่วน
  assert.ok(mid > 1 && mid < 1.0247);
  assert.match(ui, /coverArtEl\.style\.transform = `scale\(\$\{coverMatchScale\(\)\}\)`/);
  assert.match(ui, /coverArtEl\.style\.transform = 'scale\(1\)'/);
});
