import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { drawExitMarker } from '../src/exit-marker.js';
import { t, setLang, getLang } from '../src/i18n.js';

test('R1: exit markers ignore legacy labels and retain the ground trigger footprint', () => {
  for (const dir of [[0, 1], [0, -1], [1, 0], [-1, 1]]) {
    const text = [], arcs = [], vertices = [];
    const ctx = new Proxy({
      fillText: (...args) => text.push(args), strokeText: (...args) => text.push(args),
      arc: (...args) => arcs.push(args),
      moveTo: (x, y) => vertices.push([x, y]), lineTo: (x, y) => vertices.push([x, y]),
      createRadialGradient: () => ({ addColorStop() {} }),
    }, { get: (o, k) => o[k] ?? (() => {}), set: (o, k, v) => (o[k] = v, true) });
    drawExitMarker(ctx, 150, 200, { rx: 40, ry: 20, u: 390, dir, label: 'กลับเมือง', reduced: true });
    assert.deepEqual(text, [], 'no exit text, even with an old caller supplying a label');
    assert.equal(arcs[0][2], 40, 'ground footprint radius is unchanged');
    assert.equal(vertices.length, 18, 'all three double-stroked chevrons still render');
    assert.ok(vertices.every(([x, y]) => Math.hypot(x - 150, y - 200) < 25), 'arrow stays compact at mobile units');
  }
});

test('R1: production frontier HUD renders localized menu labels in both languages', () => {
  globalThis.document = { documentElement: {} };
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  const start = ui.indexOf('  dlg.innerHTML = `', ui.indexOf('function openFrontierWalk('));
  const source = ui.slice(start, ui.indexOf("  openDlg('frontier-map-dialog');", start));
  const previous = getLang();
  try {
    for (const lang of ['th', 'en']) {
      setLang(lang);
      const dlg = {};
      vm.runInNewContext(source, {
        dlg, g: { coin: 1, food: 2, order: 3, karma: 4, level: 1, hp: 100, hpMax: 100 },
        esc: String, t, artUrl: () => '', heroFace: () => '', HERO_NAME: 'ยามา', wave: 1, maxOnScreen: () => 2,
      });
      for (const key of ['hud.heroName', 'room.hud.book', 'hud.bag']) assert.ok(dlg.innerHTML.includes(t(key)), key);
      if (lang === 'th') {
        assert.doesNotMatch(dlg.innerHTML, /YAMA|GUIDE|BOOK|BAG/);
        assert.equal(t('room.hud.book'), 'หนังสือคู่มือ');
        assert.equal(t('hud.bag'), 'กระเป๋า');
        assert.equal(t('hud.mute'), 'ปิดเสียง');
      }
    }
  } finally { setLang(previous); }
});
