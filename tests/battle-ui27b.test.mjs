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

test('frontier breach wave count comes from event data (3 demon waves + the border boss)', () => {
  const waves = ZONE_EVENTS.th.find(e => e.k === 'frontierBreach').waves.length;
  assert.equal(waves, 4);
  const g = createGame();
  g.zoneCases.th = 9;
  g.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared', frontierBreach:'pending' };
  g.setFrontierTeam('taan');
  g.startFrontierBreach();
  assert.match(g.battle.foes[0].sub, new RegExp(`ระลอก 1/${waves - 1}`));
  for (const lang of ['th', 'en']) {
    setLang(lang);
    for (const k of ['event.frontierBreach.alert', 'event.frontierBreach.win'])
      assert.match(t(k), /\b3\b|three/i, `${lang}:${k}`);   // Z1-EVENTS: the owner's breach is 3 waves, then the border boss
  }
  setLang('th');
});
