// F2 — ชุดแก้ UI 8 ข้อ (คุณเป้ 9 ต.ค. 2569) · ใบงาน Output/Claudy/briefs/2026-10-09-avegee-f2-ui-batch.md
// sfx.js แตะ window/document/Audio/AudioContext จึงจำลองก่อน import (เหมือน audio28c.test.mjs)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// ---------- เบราว์เซอร์ปลอมสำหรับ sfx.js ----------
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };
const audios = [];
class FakeAudio { constructor(src) { this.src = src; this._v = 1; this.played = 0; audios.push(this); }
  get volume() { return this._v; } set volume(v) { if (!(v >= 0 && v <= 1)) throw new RangeError('volume'); this._v = v; }
  play() { this.played++; return Promise.resolve(); } pause() {} }
const layers = [];
class FakeNode {
  constructor(kind) { this.kind = kind; this.out = null; this.peak = 0;
    this.frequency = { setValueAtTime() {}, exponentialRampToValueAtTime() {} };
    this.gain = { value: 0, setValueAtTime: v => { this.peak = Math.max(this.peak, v); }, exponentialRampToValueAtTime: v => { this.peak = Math.max(this.peak, v); } }; }
  connect(n) { this.out = n; return n; }
  start(t) { this.t0 = t; if (this.kind === 'buf') this.t1 = t + this.len / 48000; }
  stop(t) { this.t1 = t; }
}
class FakeAC { constructor() { this.currentTime = 0; this.sampleRate = 48000; this.state = 'running'; this.destination = {}; }
  resume() {} suspend() {}
  createOscillator() { const n = new FakeNode('osc'); layers.push(n); return n; }
  createBufferSource() { const n = new FakeNode('buf'); layers.push(n); return n; }
  createGain() { return new FakeNode('gain'); }
  createBiquadFilter() { return new FakeNode('filter'); }
  createBuffer(_c, n) { return { getChannelData: () => new Float32Array(n), length: n, _n: n }; }
}
const origSet = FakeNode.prototype.start;
FakeNode.prototype.start = function (t) { if (this.kind === 'buf' && this.buffer) this.len = this.buffer.length; return origSet.call(this, t); };
Object.defineProperty(FakeNode.prototype, 'buffer', { set(b) { this._b = b; this.len = b.length; }, get() { return this._b; } });
const docListeners = [];
globalThis.Audio = FakeAudio;
globalThis.document = { hidden: false, documentElement: {}, addEventListener: (e, f) => docListeners.push([e, f]), removeEventListener() {} };
globalThis.addEventListener = () => {};
globalThis.window = { AudioContext: FakeAC, requestIdleCallback: fn => setTimeout(fn, 0) };
globalThis.fetch = async () => ({ ok: false });

const S = await import('../src/sfx.js');
const { AUDIO } = S;
const gainPeak = n => { let x = n; while (x) { if (x.kind === 'gain') return x.peak || x.gain.value; x = x.out; } return 0; };

const src = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// ---------- ข้อ 1: ปุ่ม "ฝึกตัวละคร / Train character" ----------
test('1. ไม่มีปุ่มฝึกตัวละครในการ์ดห้องแล้ว แต่จุดฝึกบนพื้น → openTraining ยังอยู่ (ระบบฝึกเบื้องหลังไม่ถูกลบ)', () => {
  const ui = src('src/ui.js');
  assert.ok(!ui.includes('st-training'));
  assert.ok(!/Train character/.test(ui) && !ui.includes('ฝึกตัวละคร / '));
  assert.match(ui, /room\.training && R\.inTrainingReach\(\) && TRAINING_GAMES\[k\]\) \{ openTraining\(k\)/);
  assert.match(ui, /function openTraining\(sk\)/);
});

// ---------- ข้อ 2: ยมบาทหันขวาหลังฟันดาบ ทุกชุด ----------
import { teamNeedsMirror, TEAM_DRAWN_FACING_RIGHT } from '../src/battle-facing.js';
import { swordDrawFrame, swordFrame, FRAME_FACING_FIX, SWORD_DURATION_MS } from '../src/yama-sword.js';
test('2. ท่ายืนของยมบาททั้ง 4 ชุดไม่ถูกพลิกจนหันซ้าย: ภาพที่วาดหันขวา (บูรพา/ปัจฉิม/นรกเครือข่าย) ขึ้นทะเบียนไม่พลิก · ภาพโซน 1 วาดหันซ้าย → พลิก', () => {
  // ทิศที่วาดมา (ตรวจจากพิกเซลตาและหัว): th/asia/cyberhell = ซ้าย (พลิก) · west = ขวา (ไม่พลิก) · ผลต้องหันขวาทุกชุด ตรงกับแผ่นดาบ (H2 แก้ asia/cyberhell)
  const drawn = { 'img/hero-yama.png':'L', 'img/Asia/hero-yama-asia.png':'L', 'img/West/hero-yama-west.png':'R', 'img/CyberHell/hero-yama-cyberhell.png':'L' };
  for (const [file, dir] of Object.entries(drawn)) {
    const facing = teamNeedsMirror(file) ? (dir === 'L' ? 'R' : 'L') : dir;
    assert.equal(facing, 'R', `${file} ต้องหันขวาเข้าหาศัตรูหลังพลิก/ไม่พลิก`);
  }
  // H2: asia/cyberhell standing art faces left (back of cap/hat points right) like th → mirrored; west stays native
  assert.ok(!TEAM_DRAWN_FACING_RIGHT.has('hero-yama-asia') && !TEAM_DRAWN_FACING_RIGHT.has('hero-yama-cyberhell') && TEAM_DRAWN_FACING_RIGHT.has('hero-yama-west'));
});
test('2. corrected sword atlases draw actual frames 0–7 for every outfit; timing remains 580ms', () => {
  for (const style of ['th', 'asia', 'west', 'cyberhell', 'unknown']) {
    assert.equal(swordDrawFrame(style, 0), 0, `${style} ready`);
    assert.equal(swordDrawFrame(style, SWORD_DURATION_MS - 1), 7, `${style} recovery`);
    assert.equal(swordDrawFrame(style, 5000), 7);
    const seen = new Set();
    for (let t = 0; t < SWORD_DURATION_MS; t++) {
      assert.equal(swordDrawFrame(style, t), swordFrame(t));
      seen.add(swordDrawFrame(style, t));
    }
    assert.deepEqual([...seen], [0, 1, 2, 3, 4, 5, 6, 7]);
  }
  assert.equal(SWORD_DURATION_MS, 580);
  assert.deepEqual(FRAME_FACING_FIX, {});
});

// ---------- ข้อ 3: ชื่อวิญญาณเล็กลง + "เพื่อลดกรรม" ----------
import { t, setLang, englishKeys } from '../src/i18n.js';
test('3. ข้อความ "เพื่อลดกรรม" / "to reduce karma" มี TH+EN และถูกวางใต้ปุ่มมอบดอกบัว (แสดงทุกขนาดจอ)', () => {
  setLang('th'); assert.equal(t('room.lotusWhy'), 'เพื่อลดกรรม');
  setLang('en'); assert.equal(t('room.lotusWhy'), 'to reduce karma');
  setLang('th');
  const ui = src('src/ui.js');
  assert.match(ui, /label:t\('room\.lotus'\), hint:t\('room\.lotusWhy'\), keep:true/);
  assert.match(src('src/flow29c.css'), /\.st-npc-tag small\.keep\{/);
  assert.match(src('src/flow29c.css'), /small:not\(\.reason\):not\(\.keep\)\{display:none\}/);
});
test('3. ป้ายชื่อวิญญาณใต้ตัว (soulLabel) เล็กกว่าเดิม U*0.025 และใช้ในห้องประตูสวรรค์/สถานีลงทัณฑ์', () => {
  const room = src('src/room.js');
  assert.match(room, /function soulLabel\(ctx, text, x, y, U\)/);
  assert.match(room, /const size = Math\.max\(10, U \* 0\.0155\)/);
  assert.equal((room.match(/soulLabel\(ctx,/g) || []).length, 4);   // นิยาม 1 + ชื่อ 2 ที่ + กรรมประตูสวรรค์ H4
  assert.ok(!/label\(ctx, entry\.soul\.name/.test(room) && !/label\(ctx, nm,/.test(room));
});

// ---------- ข้อ 4: รูปในหนังสือคู่มือ ----------
import { clockGuide } from '../src/sentencing-guide.js';
import { CREW } from '../src/data.js';
test('4. หนังสือคู่มือ: หน้านาฬิกาย้อนเวลามีรูปไอเท็ม และการ์ดยมทูตทุกคนมีรูปประจำตัวที่มีไฟล์จริง', () => {
  assert.match(clockGuide, /<img class="guide-art" src="img\/fx-clock-reset\.png"/);
  assert.ok(fs.statSync('img/fx-clock-reset.png').size > 1000);
  const ui = src('src/ui.js');
  assert.match(ui, /class="guide-card guide-crew"><img class="guide-portrait" src="\$\{esc\(crewArt\(c\)\)\}"/);
  for (const c of CREW.filter(x => !x.reader)) assert.ok(fs.existsSync(`img/crew-${c.k}.png`), `crew-${c.k}.png`);
  assert.match(src('src/compact-ui.css'), /\.guide-portrait\{/);
});

// ---------- ข้อ 5: วิญญาณในกระทะ + ไฟ ----------
import { POTS, potLayout, potSoulX, drawPotSoul } from '../src/pot-souls.js';
test('5. กระทะทองแดงทั้ง 4 โซนมีพิกัดปากกระทะ 3 ใบเรียงซ้าย→ขวาในกรอบภาพ และ potLayout อ่านโซนจากชื่อไฟล์ฉาก', () => {
  for (const z of ['th', 'asia', 'west', 'cyberhell']) {
    const p = POTS[z]; assert.equal(p.cx.length, 3);
    assert.ok(p.cx[0] < p.cx[1] && p.cx[1] < p.cx[2]);
    assert.ok(p.cx.every(x => x > 0.2 && x < 0.8));
    assert.ok(p.mouthY < p.frontY && p.frontY < p.fireY && p.rx > 0.02 && p.rx < 0.07);
    assert.equal(potLayout(`img/rooms-wide/${z}-krata.webp`), p);
    assert.ok(fs.existsSync(`img/rooms-wide/${z}-krata.webp`));
  }
  assert.equal(potLayout('img/rooms-wide/th-dab.webp'), null);
  assert.equal(potLayout('img/BG-Krata.webp'), null);
  assert.equal(potSoulX(POTS.th, 5), POTS.th.cx[2]);
});
test('5. drawPotSoul: วาดไฟหลังตัว → ตัววิญญาณ (ตัดในปากกระทะ) → แสงกองไฟ ด้วย canvas ล้วน ไม่แตะรูป และเรียกวาดตัววิญญาณเดิมหนึ่งครั้งต่อกระทะ', () => {
  const calls = []; const ctx = new Proxy({}, { get: (_, k) => k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : (...a) => { calls.push(k); }, set: () => true });
  let soulAt = null, order = [];
  const env = { px: u => 100 + u * 800, py: v => 50 + v * 450, U: 450, t: 1234 };
  drawPotSoul(ctx, POTS.asia, 1, env, (x, y) => { soulAt = [x, y]; order.push('soul'); calls.push('SOUL'); });
  assert.equal(order.length, 1);
  assert.ok(Math.abs(soulAt[0] - env.px(POTS.asia.cx[1])) < 1e-9);
  assert.ok(soulAt[1] > env.py(POTS.asia.frontY));                       // เท้าจมต่ำกว่าขอบหน้ากระทะ → ท่อนล่างถูกตัดทิ้ง
  assert.ok(calls.includes('clip') && calls.indexOf('fill') < calls.indexOf('SOUL') && calls.lastIndexOf('fill') > calls.indexOf('SOUL'));
  const room = src('src/room.js');
  assert.match(room, /const pot = def\.k === 'krata' \? potLayout\(bgSrc\) : null;/);
});

// ---------- ข้อ 6: เสียงท่าไม้ตาย ----------
test('6. เสียงท่าไม้ตาย: ชาร์จสั้น → ระเบิด/กระแทก รวม ~1.0–1.5 วิ ผลรวมความดังตอนกระแทกไม่เกิน 0.8', () => {
  AUDIO.on = true; AUDIO.sfxOn = true; AUDIO.bgmOn = true; AUDIO.sfx = 1;
  S.unlock();
  layers.length = 0;
  S.playUltimate('flameCharge');
  assert.ok(layers.length >= 6);
  const end = Math.max(...layers.map(l => l.t1)), start = Math.min(...layers.map(l => l.t0));
  assert.ok(start >= 0 && start < 0.01, 'เริ่มทันที');
  assert.ok(end >= 1.0 && end <= 1.5, `จบที่ ${end}s`);
  const impact = layers.filter(l => l.t0 >= 0.5 && l.t0 <= 0.6).reduce((s, l) => s + gainPeak(l), 0);
  assert.ok(impact > 0.5 && impact <= 0.8, `ผลรวมตอนกระแทก ${impact}`);
  for (const k of ['windFan', 'rage', 'valkyrieSpear', 'ice', 'hypno']) { layers.length = 0; S.playUltimate(k); assert.ok(layers.length >= 6, k); }
  layers.length = 0; S.playUltimate('fire'); S.playUltimate('atk'); assert.equal(layers.length, 0, 'ท่าที่ไม่ใช่ไม้ตายไม่ใช้เสียงนี้');
  assert.ok(S.isUltimatePower('flameCharge') && !S.isUltimatePower('mirror') && !S.isUltimatePower('cooldownClock'));
});
test('6. เคารพปุ่มปิดเสียง (สวิตช์รวม และ สวิตช์เสียงเอฟเฟกต์) · มี hook เสียงพากย์: เติมหนึ่งบรรทัดใน VOICE_LINES แล้วเล่นตามหลังจังหวะกระแทก', async () => {
  for (const mute of [{ on: false }, { sfxOn: false }, { sfx: 0 }]) {
    Object.assign(AUDIO, { on: true, sfxOn: true, bgmOn: true, sfx: 1 }, mute);
    layers.length = 0; S.playUltimate('rage'); assert.equal(layers.length, 0, JSON.stringify(mute));
    S.sfx('stamp'); assert.equal(layers.length, 0, 'sfx() ปกติก็ต้องเงียบ ' + JSON.stringify(mute));
  }
  Object.assign(AUDIO, { on: true, sfxOn: true, bgmOn: true, sfx: 0.6 });
  assert.deepEqual(S.VOICE_LINES, {});                       // ตอนนี้ยังไม่มีเสียงพากย์ = ไม่เล่น/ไม่ขอไฟล์
  audios.length = 0; S.playUltimate('rage'); await new Promise(r => setTimeout(r, 700)); assert.equal(audios.length, 0);
  S.VOICE_LINES.rage = 'audio/voice/rage.mp3';
  S.playUltimate('rage'); await new Promise(r => setTimeout(r, 700));
  assert.equal(audios.length, 1); assert.equal(audios[0].src, 'audio/voice/rage.mp3'); assert.equal(audios[0].played, 1); assert.equal(audios[0].volume, 0.6);
  audios.length = 0; AUDIO.sfxOn = false; S.playUltimate('rage'); await new Promise(r => setTimeout(r, 700)); assert.equal(audios.length, 0, 'ปิดเสียง → ไม่มีเสียงพากย์');
  delete S.VOICE_LINES.rage; AUDIO.sfxOn = true;
});
test('6. ui.js ใช้เสียงใหม่เฉพาะท่าไม้ตายที่ขึ้นคัตซีนจริง ที่ทั้งฉากต่อสู้และวงไต่สวน · ท่าอื่นใช้เสียงสั้นเดิม', () => {
  const ui = src('src/ui.js');
  assert.match(ui, /function powerSound\(k\) \{\s*if \(isUltimatePower\(k\) && actionCutsceneSrc\(k\)\) playUltimate\(k\);\s*else sfx\(powerSfx\(k, g\.abilities\)\);/);
  assert.equal((ui.match(/powerSound\(k\);/g) || []).length, 2);
});

// ---------- ข้อ 7: ปุ่มปิดเสียงเพลง/เอฟเฟกต์ ----------
test('7. ไอคอนปิดเสียงอยู่ใน img/ui และลง manifest + preload catalog ด้วยมือ', () => {
  for (const n of ['icon-sound', 'icon-sound-close', 'icon-music', 'icon-music-close']) {
    assert.ok(fs.statSync(`img/ui/${n}.png`).size > 1000, n);
    assert.ok(JSON.parse(src('img/preload-catalog.json')).shared.includes(`img/ui/${n}.png`), `catalog ${n}`);
    assert.ok(JSON.stringify(JSON.parse(src('img/manifest.json'))).includes(`ui/${n}.png`), `manifest ${n}`);
  }
});
test('7. สวิตช์เสียงเพลง/เอฟเฟกต์แยกกัน: เซฟเก่าไม่มีคีย์ = เปิด · ปิดเพลง = ความดังเพลงเป็น 0 · ปิดเอฟเฟกต์ = sfx() เงียบ แต่เพลงยังดัง', () => {
  assert.equal(S.AUDIO.sfxOn === false, false); assert.equal(S.AUDIO.bgmOn === false, false);
  Object.assign(AUDIO, { on: true, sfxOn: false, bgmOn: true, sfx: 0.55 });
  layers.length = 0; S.sfx('gong'); assert.equal(layers.length, 0);
  Object.assign(AUDIO, { on: true, sfxOn: true, bgmOn: false });
  S.sfx('gong'); assert.ok(layers.length > 0, 'เอฟเฟกต์ยังดังเมื่อปิดแค่เพลง');
  S.saveAudio(); assert.equal(JSON.parse(store['avegee.audio']).bgmOn, false);   // จำค่าไว้ใน localStorage
  const ui = src('src/ui.js');
  assert.match(ui, /id="s-bgm-toggle"/); assert.match(ui, /id="s-sfx-toggle"/);
  assert.match(ui, /bindToggle\('#s-bgm-toggle', 'bgmOn', 'icon-music', 'icon-music-close'\)/);
  assert.match(ui, /bindToggle\('#s-sfx-toggle', 'sfxOn', 'icon-sound', 'icon-sound-close'\)/);
  setLang('th'); assert.equal(t('settings.musicToggle'), 'เปิด/ปิดเสียงเพลง');
  setLang('en'); assert.equal(t('settings.soundsToggle'), 'Turn sound effects on/off'); setLang('th');
  assert.ok(englishKeys().includes('settings.musicToggle') && englishKeys().includes('room.lotusWhy'));
  Object.assign(AUDIO, { on: true, sfxOn: true, bgmOn: true });
});

// ---------- ข้อ 8: ปุ่ม "เข้าไป" ----------
import { stationButtonPos, BUTTON_ROOF_DROP } from '../src/proximity.js';
test('8. ปุ่ม "เข้าไป" เลื่อนลงจากยอดแหลมมาอยู่บนหลังคา (27% ของความสูงอาคาร) และไม่ใช้ class anchor-top', () => {
  assert.equal(BUTTON_ROOF_DROP, 0.27);
  const p = stationButtonPos({ k: 'sala', bx: 1477, by: 309, bw: 196 }, 124, [1379, 124, 1575, 309]);
  assert.equal(p.anchor, 'roof'); assert.ok(Math.abs(p.by - (124 + 185 * 0.27)) < 1e-9); assert.equal(p.bx, 1477);
  assert.match(src('src/ui.js'), /toggle\('anchor-top', target\.anchor === 'top'\)/);
});

// ---------- คำสั่งห้าม ----------
test('ไม่แตะ walk*/room walking และมินิเกมกระจก (ใบ F1/F3) · เวอร์ชัน cache-bust ขยับแล้ว', () => {
  assert.match(src('index.html'), /compact-ui\.css\?v=20261009-f2/);
  assert.match(src('index.html'), /flow29c\.css\?v=20261009-f2/);
  assert.match(src('index.html'), /src\/ui\.js\?v=20261009-f2/);
});
