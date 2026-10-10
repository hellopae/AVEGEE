import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { teaRoom } from '../src/tea-recovery.js';
import { teamNeedsMirror } from '../src/battle-facing.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

// ข้อ 3 — ศาลาน้ำชา: ยมบาทนั่งบนเบาะ/นอนกลางฟูก แต่ยังเดินไปถึงจุดได้จากพื้นที่เดินของห้อง
test('H2-3: tea pavilion seat and bed sit on the cushion / mattress and stay within reach of the walkable floor in all 4 zones', () => {
  const REACH = 0.17;
  for (const zone of ['th', 'asia', 'west', 'cyberhell']) {
    const r = teaRoom(zone), [x1, y1, x2, y2] = r.walk;
    const nearest = ([x, y]) => [Math.max(x1, Math.min(x2, x)), Math.max(y1, Math.min(y2, y))];
    for (const key of ['act', 'bed']) {
      const [px, py] = nearest(r[key]);
      assert.ok(Math.hypot(px - r[key][0], (py - r[key][1]) * .7) <= REACH, `${zone}/${key}: reachable from the floor`);
    }
    assert.ok(r.bed[1] < 0.45 && r.bed[1] > 0.3, `${zone}: bed point is on the mattress (high on the picture), not the front edge`);
    assert.ok(r.act[1] < 0.55, `${zone}: seat is on the cushion row`);
  }
  // measured cushion centres (fraction of the 1672x941 picture) — seat must be within 0.03 of the front-left cushion
  const cushion = { th: [0.227, 0.49], asia: [0.274, 0.484], west: [0.236, 0.47], cyberhell: [0.353, 0.508] };
  for (const [zone, [cx, cy]] of Object.entries(cushion)) {
    const [x, y] = teaRoom(zone).act;
    assert.ok(Math.abs(x - cx) < 0.03 && Math.abs(y - cy) < 0.04, `${zone}: seat ${x},${y} over cushion ${cx},${cy}`);
  }
});

// ข้อ 4 — ปุ่มจัดเอกสารเลื่อนขึ้น
test('H2-4: sala "sort documents" button moved up', () => {
  assert.match(read('src/room-art-assets.js'), /actions:key === 'sala' \? \[\[\.50,\.19\],\[\.74,\.51\]\]/);
});

// ข้อ 5 — ปุ่มเก็บไอเท็มของศึกชายแดน
test('H2-5: frontier win button is floated above the card row (own class, not the bottom .pad)', () => {
  const ui = read('src/ui.js'), css = read('src/flow29c.css');
  assert.match(ui, /b\.kind === 'frontier'\) \{ finRow\.classList\.add\('fin-float', 'fin-center', 'fin-main', 'fin-above-cards'\)/);
  assert.match(css, /\.fin-above-cards\{left:61%;top:52%/);
  assert.match(css, /\.fin-above-cards\{left:50%;top:47%/);
});

// ข้อ 6 — วงคำสั่งไม่ทับตัวละคร
test('H2-6: command wheel is placed beside the right-most team member (desktop) and Yama moves left in portrait', () => {
  const ui = read('src/ui.js'), css = read('src/command-wheel.css');
  assert.match(ui, /teamRight \+ 6/);
  assert.doesNotMatch(ui, /cx - w \* 0\.41/);
  assert.match(css, /not\(\.final-team\)>\.fig\.you\{left:28%\}/);
  assert.match(css, /not\(\.final-team\) \.actor-wheel\{bottom:33%\}/);
  assert.match(css, /not\(\.final-team\) \.combat-wheel \.command-options\{left:5%;max-width:152px\}/);
});

// ข้อ 7 — ท่ายืนหลังฟาดหันขวา ตรงกับแผ่นดาบ
test('H2-7: asia and cyberhell standing art is mirrored like zone 1 so it faces right after the slash; west stays native', () => {
  assert.equal(teamNeedsMirror('img/Asia/hero-yama-asia.png'), true);
  assert.equal(teamNeedsMirror('img/CyberHell/hero-yama-cyberhell.png'), true);
  assert.equal(teamNeedsMirror('img/hero-yama.png'), true);
  assert.equal(teamNeedsMirror('img/West/hero-yama-west.png'), false);
  assert.equal(teamNeedsMirror('img/West/hero-yama-west-atk-R.png'), false);
});

// ข้อ 2 — ซูมแผนที่ + กล้องตามนุ่ม
test('H2-2: map zoom control exists and the camera eases with the frontier formula (130ms)', () => {
  const ui = read('src/ui.js'), html = read('index.html');
  assert.match(html, /id="hud-zoom"/);
  assert.match(ui, /const MAP_ZOOM_LEVELS = \[1, 2\.5\]/);
  assert.match(ui, /1 - Math\.exp\(-dt \/ 130\)/);
  assert.match(ui, /updateMapCamera\(now\);\n\s+render\(ctx, g, now, hover, sel\);/);
});

// ข้อ 3 (ต่อ) — ลุกจากเบาะแล้วต้องกลับเข้าพื้นที่เดินได้ (จุดนั่งอยู่เหนือขอบพื้นที่เดินได้)
import { createGame } from '../src/game.js';
import { STATIONS } from '../src/data.js';
import { makeRoom } from '../src/room.js';
globalThis.Image ??= class {};
test('H2-3: standing up from the cushion puts Yama back inside the walkable floor in every zone (manual and MP-full stand-up)', () => {
  const prevWindow = globalThis.window, prevDocument = globalThis.document;
  const noop = () => {};
  const ctx = new Proxy({}, { get: (obj, key) => key in obj ? obj[key] : key === 'measureText' ? () => ({ width: 0 }) : () => new Proxy({}, { get: () => noop }) });
  globalThis.window = { addEventListener: noop, removeEventListener: noop };
  globalThis.devicePixelRatio = 1; globalThis.addEventListener = noop; globalThis.removeEventListener = noop;
  globalThis.document = { createElement: () => ({ getContext: () => ctx }) };
  const cv = { width: 900, height: 620, getContext: () => ctx, addEventListener: noop, removeEventListener: noop, getBoundingClientRect: () => ({ width: 900, height: 620 }) };
  try {
    for (const zone of ['th', 'asia', 'west', 'cyberhell']) {
      for (const how of ['manual', 'mpFull']) {
        const g = createGame(); g.save = () => true; g.onChange = () => {}; g.zone = zone; g.mp = 0;
        const room = teaRoom(zone); room.me = [room.act[0] + .03, room.act[1] + .02];
        const R = makeRoom(cv, g, STATIONS.find(d => d.k === 'tea'), room, `img/tea-${zone}-recovery.png`, null);
        assert.equal(R.setSit(true), true, `${zone}: sits`);
        assert.deepEqual(R.pos().slice(0, 2), room.act);
        if (how === 'manual') R.setSit(false); else { g.mp = g.mpMax; R.tick(50); }
        assert.equal(R.sitting(), false);
        const [x, y] = R.pos(), [x1, y1, x2, y2] = room.walk;
        assert.ok(x >= x1 && x <= x2 && y >= y1 && y <= y2, `${zone}/${how}: after standing up at ${x},${y} Yama is on the walkable floor`);
      }
    }
  } finally { globalThis.window = prevWindow; globalThis.document = prevDocument; }
});
