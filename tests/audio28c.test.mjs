// 28C — เพลงสลับด้วย fade ไม่มีเสียงซ้อน/ไม่สร้างของซ้ำ + เสียงท่าไม้ตายทุกท่า
// sfx.js แตะ window/document/Audio/AudioContext จึงจำลองขึ้นมาก่อน import (ไม่ต้องมีเบราว์เซอร์)
import test from 'node:test';
import assert from 'node:assert/strict';
import { POWERS, BATTLE } from '../src/data.js';

// ---------- เบราว์เซอร์ปลอม ----------
const created = { audio: [], ac: 0 };
let fakeNow = 0;
const intervals = new Map(); let nextId = 1;
const docListeners = [];

class FakeAudio {
  constructor() {
    created.audio.push(this);
    this._vol = 1; this.paused = true; this.loop = false; this.preload = '';
    this.currentTime = 0; this.srcSets = 0; this._src = ''; this.playCalls = 0; this.pauseCalls = 0;
  }
  get volume() { return this._vol; }
  set volume(v) { if (!(v >= 0 && v <= 1)) throw new RangeError('volume ' + v); this._vol = v; }  // เหมือนของจริง
  get src() { return this._src; }
  set src(v) { this._src = v; this.srcSets++; }
  play() { this.paused = false; this.playCalls++; return Promise.resolve(); }
  pause() { this.paused = true; this.pauseCalls++; }
}

class FakeNode {
  constructor(kind, ctx) { this.kind = kind; this.ctx = ctx; this.out = null; this.peak = 0;
    this.frequency = { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} };
    this.gain = { value: 0,
      setValueAtTime: (v) => { this.peak = Math.max(this.peak, v); },
      exponentialRampToValueAtTime: (v) => { this.peak = Math.max(this.peak, v); } };
    this.type = ''; }
  connect(n) { this.out = n; return n; }
  start(t) { this.t0 = t; if (this.kind === 'bufsrc') this.t1 = t + this.buffer.length / 48000; }
  stop(t) { this.t1 = t; }
}
const layers = [];   // ทุกชั้นเสียงที่ถูกสร้าง { start, end, peak }
class FakeAC {
  constructor() { created.ac++; this.currentTime = 0; this.sampleRate = 48000; this.state = 'running'; this.destination = {}; }
  resume() {} suspend() {}
  createOscillator() { const n = new FakeNode('osc', this); layers.push(n); return n; }
  createBufferSource() { const n = new FakeNode('bufsrc', this); layers.push(n); return n; }
  createGain() { return new FakeNode('gain', this); }
  createBiquadFilter() { return new FakeNode('filter', this); }
  createBuffer(_c, n) { return { getChannelData: () => new Float32Array(n), length: n }; }
}
function layerPeak(n) { let x = n; while (x) { if (x.kind === 'gain') return x.peak || x.gain.value; x = x.out; } return 0; }

globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.Audio = FakeAudio;
globalThis.document = { hidden: false, addEventListener: (ev, fn) => docListeners.push([ev, fn]), removeEventListener() {} };
globalThis.addEventListener = () => {};
globalThis.window = { AudioContext: FakeAC, requestIdleCallback: fn => setTimeout(fn, 0) };
globalThis.fetch = async (url) => ({ ok: /audio\/bgm-(title|zone|battle)\.mp3$/.test(url) });
Object.defineProperty(globalThis, 'performance', { value: { now: () => fakeNow }, configurable: true });
globalThis.setInterval = (fn) => { const id = nextId++; intervals.set(id, fn); return id; };
globalThis.clearInterval = (id) => { intervals.delete(id); };
function advance(ms, stepMs = 40) {            // เดินเวลาปลอม + ยิง ticker ของ sfx.js
  for (let t = 0; t < ms; t += stepMs) {
    fakeNow += stepMs;
    for (const fn of [...intervals.values()]) fn();
    checkInvariants();
  }
}

const S = await import('../src/sfx.js');
const { AUDIO } = S;

let maxPlaying = 0, maxVolSum = 0;
function checkInvariants() {
  const playing = created.audio.filter(a => !a.paused);
  maxPlaying = Math.max(maxPlaying, playing.length);
  maxVolSum = Math.max(maxVolSum, playing.reduce((s, a) => s + a.volume, 0));
}

test('เข้า-ออกฉากต่อสู้ซ้ำ 10 ครั้ง: 1 AudioContext, <audio> ต่อเพลงตัวเดียว, ไม่สลับ src, ไม่ซ้อนเกินสองเพลง, ผลรวมไม่เกิน bgm', async () => {
  AUDIO.on = true; AUDIO.bgm = 0.22; AUDIO.sfx = 0.55;
  S.unlock();
  await S.primeAudio(['bgm-title', 'bgm-zone', 'bgm-battle']);
  await S.bgm('bgm-zone'); advance(1500);
  const zone = created.audio.find(a => a.src.endsWith('bgm-zone.mp3'));
  assert.ok(zone && !zone.paused);
  zone.currentTime = 42;                       // เพลงโซนเล่นมาถึงวิที่ 42

  for (let i = 0; i < 10; i++) {
    await S.bgm('bgm-battle'); S.sfx('gong'); advance(1500);
    await S.bgm('bgm-zone'); advance(1500);
    zone.currentTime = 42 + i;                 // เล่นต่อ ไม่ถูกรีเซ็ตกลับต้นเพลง
  }
  assert.equal(created.ac, 1, 'AudioContext ต้องมีตัวเดียว');
  assert.equal(created.audio.length, 2, '<audio> ต้องมีแค่ zone กับ battle');
  for (const a of created.audio) assert.equal(a.srcSets, 1, 'src ต้องตั้งครั้งเดียว ' + a.src);
  assert.ok(maxPlaying <= 2, 'ซ้อนกันเกินสองเพลง: ' + maxPlaying);
  assert.ok(maxVolSum <= AUDIO.bgm + 1e-9, `ผลรวมความดัง ${maxVolSum} เกิน bgm ${AUDIO.bgm}`);
  const battle = created.audio.find(a => a.src.endsWith('bgm-battle.mp3'));
  assert.ok(battle.paused, 'จบฉากต่อสู้แล้วเพลงต่อสู้ต้องหยุด');
  assert.equal(battle.currentTime, 0, 'เพลงต่อสู้เริ่มใหม่จากต้นทุกศึก');
  assert.ok(!zone.paused && Math.abs(zone.volume - AUDIO.bgm) < 1e-9, 'เหลือเพลงโซนดังเต็มที่ตั้งไว้');
  assert.equal(zone.currentTime, 51, 'เพลงโซนไม่ถูกเด้งกลับต้นเพลง');
});

test('crossfade มี fade จริง: ไม่มีขั้นความดังกระโดดเกินหนึ่งก้าวของ ticker', async () => {
  AUDIO.on = true; AUDIO.bgm = 0.6;
  const battle = created.audio.find(a => a.src.endsWith('bgm-battle.mp3'));
  const zone = created.audio.find(a => a.src.endsWith('bgm-zone.mp3'));
  await S.bgm('bgm-battle');
  assert.equal(battle.volume, 0, 'เพลงใหม่ต้องเริ่มที่ความดัง 0 ไม่ใช่เต็มทันที');
  let prev = battle.volume, maxJump = 0;
  for (let i = 0; i < 30; i++) { advance(40); maxJump = Math.max(maxJump, Math.abs(battle.volume - prev)); prev = battle.volume; }
  assert.ok(maxJump <= 0.6 * (40 / 700) + 1e-6, 'ก้าว fade ใหญ่เกิน ' + maxJump);
  assert.ok(Math.abs(battle.volume - 0.6) < 1e-9 && zone.paused);
  await S.bgm('bgm-zone'); advance(1500);
});

test('สลับรัวในมิลลิวินาทีเดียวกัน 40 ครั้ง: ไม่ซ้อน ไม่เกิน bgm ไม่ขว้าง RangeError', async () => {
  AUDIO.on = true; AUDIO.bgm = 1;              // สไลเดอร์เสียงสุด = กรณีแย่ที่สุดของ clipping
  maxPlaying = 0; maxVolSum = 0;
  for (let i = 0; i < 40; i++) { await S.bgm(i % 2 ? 'bgm-zone' : 'bgm-battle'); advance(40); }
  await S.bgm('bgm-zone'); advance(1500);
  assert.ok(maxVolSum <= 1 + 1e-9, 'ผลรวมความดัง ' + maxVolSum);
  assert.equal(created.audio.length, 2);
  assert.equal(created.audio.filter(a => !a.paused).length, 1);
});

test('ค่า bgm เสียหายใน localStorage (เกิน 1 / NaN) ไม่ทำให้พัง', async () => {
  for (const bad of [5, -1, NaN, 'x']) {
    AUDIO.bgm = bad; AUDIO.on = true;
    await S.bgm('bgm-battle'); advance(800);
    S.syncBgm();
    for (const a of created.audio) assert.ok(a.volume >= 0 && a.volume <= 1);
    await S.bgm('bgm-zone'); advance(800);
  }
  AUDIO.bgm = 0.22;
});

test('ปิดเสียง (AUDIO.on=false): เพลงความดัง 0 ทุก element', async () => {
  AUDIO.on = false; S.syncBgm();
  for (const a of created.audio) assert.equal(a.volume, 0);
  AUDIO.on = true; S.syncBgm();
});

// ---------- เสียงท่าไม้ตาย ----------
const SPECIAL_ACTS = ['fire', 'flameCharge', 'windFan', 'rage', 'valkyrieSpear', 'cooldownClock', 'ice', 'hypno'];

test('ทุกท่าไม้ตายในฉากต่อสู้และพลังในวงไต่สวนมีเสียงของตัวเองที่มีจริงในตาราง', () => {
  const names = new Set(S.SFX_NAMES);
  for (const k of SPECIAL_ACTS) {
    const n = S.powerSfx(k, {});
    assert.ok(names.has(n), `${k} → ${n} ไม่มีใน BANK`);
    assert.notEqual(n, 'hit', `${k} ยังใช้เสียงโจมตีธรรมดา`);
  }
  assert.equal(S.powerSfx('fire', { bigFire: true }), 'bigfire');
  assert.equal(S.powerSfx('fire', {}), 'fire');
  for (const p of POWERS) {
    const n = S.powerSfx(p.k, {});
    assert.ok(names.has(n) && n !== 'hit', `พลังไต่สวน ${p.k} ไม่มีเสียง`);
  }
  // ทุกท่าที่เมนูต่อสู้มี (BATTLE.items) ต้องได้เสียง · ท่าธรรมดา/ยมทูตช่วย = hit
  for (const it of BATTLE.items) assert.ok(names.has(S.powerSfx(it.k, {})), it.k);
  assert.equal(S.powerSfx('atk'), 'hit');
  assert.equal(S.powerSfx('crew:plerng'), 'hit');
  assert.equal(S.powerSfx('guard'), 'hit');
  // เสียงของท่าต่าง ๆ ต้องไม่ซ้ำกันเอง (ท่าไม้ตาย 8 ท่า + ลูกไฟใหญ่ = 9 เสียงต่างกัน)
  const set = new Set([...SPECIAL_ACTS.map(k => S.powerSfx(k, {})), 'bigfire']);
  assert.equal(set.size, 9);
});

test('เสียงใหม่ทุกเสียงดังขึ้นจริง สั้นไม่เกิน ~1 วิ และผลรวมชั้นที่ซ้อนกันไม่เกิน 0.8 (ไม่กลบเพลง/ไม่ล้น)', () => {
  AUDIO.on = true; AUDIO.sfx = 1;              // สไลเดอร์ sfx สูงสุด = กรณีแย่ที่สุด
  for (const name of ['bigfire', 'charge', 'wind', 'rage', 'spear', 'clock', 'ice', 'hypno', 'roar', 'mirror']) {
    layers.length = 0;
    S.sfx(name);
    assert.ok(layers.length >= 2, name + ' ไม่มีเสียงออก');
    const L = layers.map(n => ({ s: n.t0, e: n.t1, p: layerPeak(n) }));
    assert.ok(Math.max(...L.map(x => x.e)) - Math.min(...L.map(x => x.s)) <= 1.1, name + ' ยาวเกินไป');
    const worst = Math.max(...L.map(a => L.filter(b => b.s < a.e && b.e > a.s).reduce((s, b) => s + b.p, 0)));
    assert.ok(worst <= 0.8, `${name} ผลรวมซ้อน ${worst.toFixed(2)} สูงเกิน`);
  }
  AUDIO.sfx = 0.55;
});

test('ปิดเสียง effect แล้วเงียบ: AUDIO.on=false หรือสไลเดอร์ sfx=0 ไม่สร้างโหนดเสียงเลย', () => {
  for (const mode of ['off', 'zero']) {
    AUDIO.on = mode !== 'off'; AUDIO.sfx = mode === 'zero' ? 0 : 0.55;
    layers.length = 0;
    for (const n of S.SFX_NAMES) S.sfx(n);
    assert.equal(layers.length, 0, mode + ' ยังมีเสียงออก');
  }
  AUDIO.on = true; AUDIO.sfx = 0.55;
  layers.length = 0; S.sfx('ice');
  assert.ok(layers.length > 0, 'เปิดแล้วต้องมีเสียง');
});
