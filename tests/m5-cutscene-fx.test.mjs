import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {actionCutsceneTheme, actionCutsceneLabel} from '../src/action-cutscene-fx.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('M5 assigns every requested special-move family an elemental presentation', () => {
  assert.equal(actionCutsceneTheme('fire'), 'fire');
  assert.equal(actionCutsceneTheme('ice'), 'ice');
  assert.equal(actionCutsceneTheme('hypno'), 'hypno');
  assert.equal(actionCutsceneTheme('windFan'), 'wind');
  assert.equal(actionCutsceneTheme('valkyrieSpear'), 'gold');
  assert.equal(actionCutsceneTheme('crew:kan', null, 'kan'), 'hypno');
  assert.equal(actionCutsceneTheme('crew:boon', null, 'boon'), 'heal');
  assert.equal(actionCutsceneTheme('crew:taan', null, 'taan'), 'club');
  assert.equal(actionCutsceneTheme('crew:dam', null, 'dam'), 'slash');
  assert.equal(actionCutsceneTheme('boss', {name:'พลังน้ำแข็ง'}), 'ice');
  assert.match(actionCutsceneLabel('windFan'), /ลม/);
});

test('M5 cut-in uses one capped canvas and avoids animated filters or shadow blur', () => {
  const fx = read('src/action-cutscene-fx.js');
  assert.match(fx, /length:42/);
  assert.match(fx, /Math\.min\(960/);
  assert.doesNotMatch(fx, /ctx\.filter|shadowBlur/);
  const html = read('index.html');
  const css = html.slice(html.indexOf('.action-cutscene{'), html.indexOf('.plate{'));
  assert.match(css, /\.cutscene-fx/);
  assert.match(css, /\.cutscene-title/);
  assert.match(css, /@keyframes cutSweep/);
  assert.doesNotMatch(css, /filter:/);
});

test('classic cut-in labels the move without mounting the M5 grid runtime', () => {
  const ui = read('src/ui.js');
  assert.doesNotMatch(ui, /mountActionCutsceneFx\(cut, theme/);
  assert.doesNotMatch(ui, /class="cutscene-sweep"/);
  assert.match(ui, /class="cutscene-title"/);
  assert.match(ui, /ACTION_CUT_MS = 1300/);
  const html = read('index.html');
  assert.match(html, /\.action-cutscene:before\{content:none\}/);
  assert.match(html, /\.cutscene-fx,\.cutscene-sweep\{display:none\}/);
});
