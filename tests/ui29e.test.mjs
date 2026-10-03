import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createGame } from '../src/game.js';
import { STATIONS, isTrialDestination } from '../src/data.js';
import { nearBuild } from '../src/scene.js';
import { setLang, t } from '../src/i18n.js';

globalThis.Image = class {};
globalThis.document = { documentElement:{} };
const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
const esc = value => String(value).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]));
// Execute the production rendering branch rather than duplicating its empty-state logic.
const choicesSource = ui.slice(ui.indexOf('    const destinationChoices ='), ui.indexOf('    const shownCrew ='));
const renderChoices = g => vm.runInNewContext(`${choicesSource}\ndestinationChoices;`, {
  g, dests:g.trialDestinations(), s:g.queue[0], pick:{}, answer:null,
  t, esc, blockText:() => '', stBg:() => '', orbImg:() => '',
});

test('29E: fresh zone shows TH/EN next steps; build and manual jail hold are real actions', () => {
  const g = createGame();
  g.canMoveZone = () => true;
  assert.equal(g.moveZone('asia'), true);
  assert.deepEqual(g.stations.map(st => st.def.k), ['sala', 'tarang']);
  g.queue.push({id:29001, name:'Test soul'});
  assert.equal(g.trialDestinations().length, 0);
  for (const lang of ['th', 'en']) {
    setLang(lang);
    const hint = t('trial.noDestinations');
    assert.match(renderChoices(g), /trial-empty-hint/);
    assert.ok(renderChoices(g).includes(esc(hint)));
    assert.ok(hint.includes(t('trial.lockCase')), 'names the actual hold button');
    assert.match(hint, lang === 'th' ? /ปิดห้องสอบสวน.*ป้ายก่อสร้างบนแผนที่.*หากตะรางมีที่ว่าง/ : /close the interrogation room.*construction sign on the map.*If the jail has room/);
  }
  assert.equal(g.held.length, 0, 'souls are not automatically held');
  assert.equal(g.jail(29001), true);
  assert.equal(g.held[0].id, 29001);
  g.coin = 99999;
  const def = STATIONS.find(isTrialDestination);
  const site = nearBuild(g, def.x, def.y);
  assert.ok(site, 'a map construction sign can be reached');
  assert.equal(g.build(site.k), true);
  assert.doesNotMatch(renderChoices(g), /trial-empty-hint/, 'hint disappears once a destination exists');
  assert.equal(g.release(29001), true);
  assert.equal(g.queue[0].id, 29001);
  // Full/absent jail really prevents holding, as the hint warns.
  while (g.jailFree() > 0) g.held.push({id:30000 + g.held.length});
  assert.equal(g.jail(29001), false);
  g.stations = g.stations.filter(st => st.def.k !== 'tarang');
  assert.equal(g.jail(29001), false);
  setLang('th');
});

test('29E: event alert has one close action, no pause/X; close dismisses and start still works', () => {
  const alertSource = ui.slice(ui.indexOf('function openEventAlert('), ui.indexOf('\nfunction openPrisonAlert('));
  const modalSource = ui.slice(ui.indexOf('function modal('), ui.indexOf('\nconst SAID_STYLE'));
  for (const lang of ['th', 'en']) {
    setLang(lang);
    const g = createGame();
    (g.zoneEvents.th ||= {}).prisonBreak = 'pending';
    let afterClose, started = 0;
    const closeButton = {}, goButton = {};
    const dlg = {
      open:false, innerHTML:'',
      querySelectorAll: selector => selector === '[data-close]' ? [closeButton] : [],
      querySelector: selector => selector === '[data-event-go]' ? goButton : null,
      close() { this.open = false; afterClose(); },
    };
    const context = vm.createContext({
      g, dlg, t, esc, artUrl:k => k, ITEMS:{health:{img:'health'}},
      pauseForDlg:() => { g.paused = true; },
      openDlg: cls => { dlg.className = cls; dlg.open = true; },
      onDlgClose: cb => { afterClose = cb; },
    });
    vm.runInContext(`${modalSource}\n${alertSource}`, context);
    context.openEventAlert('prisonBreak', 'Event', 'Description', 'foe.png', 'Start', () => { started++; }, true);
    assert.equal(dlg.className, 'event-alert');
    assert.equal((dlg.innerHTML.match(/data-close/g) || []).length, 1);
    assert.ok(dlg.innerHTML.includes(`data-close>${t('common.close')}</button>`));
    assert.doesNotMatch(dlg.innerHTML, /data-event-pause|✕|Ⅱ|event-alert-controls/);
    goButton.onclick();
    assert.equal(started, 1);
    closeButton.onclick();
    assert.equal(dlg.open, false);
    assert.equal(g.eventMapClosed['th:prisonBreak'], true);
    assert.ok(g.mobs.some(m => m.eventKey === 'prisonBreak'), 'dismiss keeps the event available on the map');
  }
  // Ack-only alerts (frontier march notice) show just the one gold "ack" button, which itself closes.
  {
    setLang('th');
    const g = createGame();
    let afterClose;
    const ack = {}, dlg = {open:false, innerHTML:'', querySelectorAll: s => s === '[data-close]' ? [ack] : [], querySelector: s => s === '[data-event-go]' ? ack : null,
      close() { this.open = false; afterClose(); }};
    const context = vm.createContext({g, dlg, t, esc, artUrl:k => k, ITEMS:{health:{img:'health'}}, pauseForDlg:() => {}, openDlg:() => { dlg.open = true; }, onDlgClose:cb => { afterClose = cb; }});
    vm.runInContext(`${modalSource}\n${alertSource}`, context);
    context.openEventAlert('x', 'Event', 'Description', 'foe.png', 'Ack', () => dlg.close(), false, true);
    assert.equal((dlg.innerHTML.match(/data-close/g) || []).length, 1);
    assert.doesNotMatch(dlg.innerHTML, new RegExp(`data-close>${t('common.close')}</button>`));
    ack.onclick();
    assert.equal(dlg.open, false);
  }
  // The shared corner-close observer must continue excluding event alerts.
  const observer = ui.slice(ui.indexOf('new MutationObserver(() => {'), ui.indexOf('// ตัวจับกลาง'));
  assert.match(observer, /dlg\.classList\.contains\('event-alert'\)/);
  setLang('th');
});
