// Home gear bug (12 Nov 2569): closing any dialog on Home ran g.onChange(), the throw-away fresh game queued its starter powers and
// "ได้พลังใหม่ · ตวาดข่มขู่" popped over the cover.  Browser run: scripts/home-gear-update-preview-check.py -> docs/art-reviews/2026-11-12-home-gear-update-preview/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createGame } from '../src/game.js';

const ui = readFileSync('src/ui.js', 'utf8');

test('why the guard exists: a fresh game queues the starter power the moment syncDiscoveries runs', () => {
  const g = createGame();
  assert.deepEqual(g.discoveryQueue, []);
  g.syncDiscoveries();
  assert.ok(g.discoveryQueue.includes('power:roar'));
});

test('g.onChange does nothing before START (Home), before it syncs discoveries or opens any dialog', () => {
  const at = ui.indexOf('g.onChange = () => {');
  assert.ok(at > 0);
  const body = ui.slice(at, ui.indexOf('g.syncDiscoveries();', at));
  const firstCode = body.split('\n').slice(1).map(l => l.trim()).find(l => l && !l.startsWith('//'));
  assert.equal(firstCode, 'if (!started) return;', 'the Home guard must be the first statement');
});

test('openDiscovery refuses on Home too (second line of defence)', () => {
  const at = ui.indexOf('function openDiscovery()');
  const first = ui.slice(at, at + 260);
  assert.match(first, /if \(!started \|\| !id/);
});

test('the guard is not a one-way trap: startPlay flips started and still calls onChange for pending rewards', () => {
  const at = ui.indexOf('function startPlay(fresh)');
  const body = ui.slice(at, at + 1800);
  assert.match(body, /started = true;/);
  assert.match(body, /g\.onChange\(\)/);
});

test('entering a slot closes the slot menu BEFORE started flips, and the async close handler then runs with started = true', () => {
  const at = ui.indexOf('function enterSaveSlot');
  const body = ui.slice(at, at + 900);
  assert.ok(body.indexOf('dlg.close()') < body.indexOf('startPlay(fresh)'));
});

test('behaviour: the real g.onChange body on Home never syncs or opens anything; the same call during play does', () => {
  const at = ui.indexOf('g.onChange = () => {');
  const code = ui.slice(at, ui.indexOf("dlg.addEventListener('close', () => setTimeout(drawCoach", at));
  const run = started => {
    const g = createGame(), calls = []; g.syncDiscoveries = () => calls.push('sync'); g.discoveryQueue = ['power:roar'];
    const ctx = { g, started, pendingBossGuideGrant: () => null, refresh: () => calls.push('refresh'), storyPlaying: false, storyScheduled: false, rewardOpen: false,
      dlg: { open: false }, openDiscovery: () => calls.push('discovery'), openBattleReward() {}, openLevelUp() {}, drawCoach() {}, setTimeout() {} };
    vm.createContext(ctx); vm.runInContext(code, ctx);
    g.onChange();
    return calls;
  };
  assert.deepEqual(run(false), []);
  assert.deepEqual(run(true).filter(c => c !== 'refresh'), ['sync', 'discovery']);
});
