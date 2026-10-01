import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { ZONE_EVENTS } from '../src/data.js';
globalThis.document ??= { documentElement:{} };
const { t, setLang } = await import('../src/i18n.js');

test('battle HUD labels exist in Thai and English', () => {
  for (const lang of ['th', 'en']) {
    setLang(lang);
    for (const k of ['battle.hp', 'battle.mp', 'battle.morale']) assert.notEqual(t(k), k, `${lang}:${k}`);
  }
  setLang('th');
});

test('frontier breach wave count comes from event data, not a hardcoded 3', () => {
  const waves = ZONE_EVENTS.th.find(e => e.k === 'frontierBreach').waves.length;
  assert.equal(waves, 2);
  const g = createGame();
  g.zoneCases.th = 8;
  g.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared', frontierBreach:'pending' };
  g.setFrontierTeam('taan');
  g.startFrontierBreach();
  assert.match(g.battle.foes[0].sub, new RegExp(`Wave 1/${waves}`));
  for (const lang of ['th', 'en']) {
    setLang(lang);
    for (const k of ['event.frontierBreach.alert', 'event.frontierBreach.win'])
      assert.doesNotMatch(t(k), /\b3\b|three/i, `${lang}:${k}`);
  }
  setLang('th');
});
