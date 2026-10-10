// I1-B ข้อ 5 — ปุ่มปิดเสียงใช้รูปไอคอน · ไม่มีปุ่มข้อความ Mute · สถานะปุ่มด่วน/หน้าตั้งค่า/AUDIO ตรงกัน
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

// ---------- ข้อ 5: ปุ่มปิดเสียง ----------
test('I1-B-5: ไม่มีปุ่มข้อความ Mute — ปุ่มด่วนใช้รูป icon-sound / icon-sound-close ไม่ใช้อีโมจิ', () => {
  const ui = read('src/ui.js'), html = read('index.html');
  assert.doesNotMatch(ui, /id="s-mute"/); assert.doesNotMatch(ui, /#s-mute/);
  assert.doesNotMatch(ui, /🔊 ปิดเสียง|🔇 เปิดเสียง|🔊 เสียง|🔇 ปิดเสียงอยู่/);
  assert.match(html, /<button id="mute"[^>]*><img src="img\/ui\/icon-sound\.png" alt=""><\/button>/);
  assert.doesNotMatch(html, /🔊 เสียง/);
  assert.match(ui, /icon-sound-close/);
  for (const f of ['icon-sound', 'icon-sound-close', 'icon-music', 'icon-music-close']) assert.ok(statSync(new URL(`../img/ui/${f}.png`, import.meta.url)).size > 500, f);
});
test('I1-B-5: ปุ่มด่วน + ไอคอนในหน้าตั้งค่า + AUDIO สถานะตรงกัน (ไม่มีกรณีปิดรวมแต่ไอคอนเปิด)', () => {
  const ui = read('src/ui.js');
  // เซฟเก่าที่ปิดรวม (on=false) ถูกย้ายเป็น bgmOn=sfxOn=false และ on=true เสมอ
  assert.match(ui, /if \(AUDIO\.on === false\) \{ AUDIO\.on = true; AUDIO\.bgmOn = false; AUDIO\.sfxOn = false; saveAudio\(\); \}/);
  assert.match(ui, /const allMuted = \(\) => AUDIO\.bgmOn === false && AUDIO\.sfxOn === false;/);
  assert.match(ui, /AUDIO\.on = true; AUDIO\.bgmOn = turnOn; AUDIO\.sfxOn = turnOn;/);
  // ไอคอนในหน้าตั้งค่ากดแล้วสลับรูป + ปุ่มด่วนวาดซ้ำ
  assert.match(ui, /img\.src = `img\/ui\/\$\{off \? offIcon : onIcon\}\.png`;[^]*syncBgm\(\); saveAudio\(\); drawMute\(\);/);
});
