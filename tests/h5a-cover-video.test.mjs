// H5a: วิดีโอเปิดหน้าปก (home-intro-v5.mp4) — ไฟล์ ขนาด และกติกาการผูกกับเกม
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';

const ui = readFileSync('src/ui.js', 'utf8');
const html = readFileSync('index.html', 'utf8');
const VIDEO = 'img/home-intro-v5.mp4';

test('cover intro video ships, stays <= 4 MB and is faststart H.264', () => {
  assert.ok(existsSync(VIDEO));
  assert.ok(statSync(VIDEO).size <= 4 * 1024 * 1024);
  const head = readFileSync(VIDEO).subarray(0, 8192);
  assert.ok(head.includes(Buffer.from('moov')), 'moov atom must be near the start (faststart)');
  assert.ok(head.includes(Buffer.from('avc1')), 'H.264');
});

test('cover video is lazy, non-looping, muted/inline and outside the critical preload', () => {
  const tag = html.match(/<video[^>]*id="cover-vfx"[^>]*>/)[0];
  for (const attr of ['muted', 'playsinline', 'hidden']) assert.match(tag, new RegExp(`\\b${attr}\\b`));
  assert.doesNotMatch(tag, /\bloop\b/);
  assert.doesNotMatch(tag, /\bsrc=/);
  assert.match(tag, /preload="none"/);
  assert.ok(ui.includes("'img/home-intro-v5.mp4"));
  for (const f of ['img/manifest.json', 'img/preload-catalog.json']) assert.ok(!readFileSync(f, 'utf8').includes('home-intro-v5'), f);
});

test('sequence: fire logo cut -> cover video; skip / reduced motion / save-data / failure all fall back to the still', () => {
  assert.match(ui, /SPLASH_CUT = 4\.9/);
  assert.match(ui, /function handoffToCoverVideo\(\)/);
  assert.match(ui, /function settleCover\(/);
  assert.match(ui, /function skipCoverVideo\(/);
  assert.match(ui, /prefers-reduced-motion: reduce\)'\)\.matches \|\| navigator\.connection\?\.saveData/);
  assert.match(ui, /COVER_WAIT_MS/);
  assert.match(ui, /COVER_STALL_MS/);
  assert.match(ui, /avegee:cover-settled/);
  assert.match(html, /#splash\.dim video/);
  assert.match(html, /#title \.cover-vfx\.fading\{opacity:0\}/);
});
