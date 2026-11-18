// T3/9 (F23, owner m3.png): the document puzzle pays something when the order bar has no room for its +8
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { DOC_BONUS, STATIONS } from '../src/data.js';
import { t } from '../src/i18n.js';
globalThis.Image = class {};
const setup = order => { const g = createGame(); g.save = () => true; g.onChange = () => {}; g.order = order; g.coin = 100; g.inventory = {};
  const sala = g.stations.find(s => s.def.k === 'sala'); sala.build = 0; sala.documentCd = 0; return g; };
test('T3/9: order 50 -> nothing extra; order 96 -> the 4 that do not fit come back as coins; order 100 -> all 8 as coins + a medicine chest', () => {
  let g = setup(50); assert.deepEqual(g.documentPuzzleBonus(), { gain: 8, coin: 0, item: null });
  assert.equal(g.finishDocumentPuzzle(true), true); assert.equal(g.order, 58); assert.equal(g.coin, 100); assert.equal(g.inventory.health, undefined);
  g = setup(96); const b = g.documentPuzzleBonus(); assert.deepEqual(b, { gain: 4, coin: 4 * DOC_BONUS.coinPerLost, item: null });
  assert.equal(g.finishDocumentPuzzle(true), true); assert.equal(g.order, 100); assert.equal(g.coin, 100 + 4 * DOC_BONUS.coinPerLost);
  g = setup(100); assert.deepEqual(g.documentPuzzleBonus(), { gain: 0, coin: 8 * DOC_BONUS.coinPerLost, item: 'health' });
  assert.equal(g.finishDocumentPuzzle(true), true); assert.equal(g.order, 100); assert.equal(g.coin, 100 + 8 * DOC_BONUS.coinPerLost); assert.equal(g.inventory.health, 1);
});
test('T3/9: a failed save gives back the coins and the chest; the claim label is TH + EN', () => {
  const g = setup(100); g.save = () => false;
  assert.equal(g.finishDocumentPuzzle(true), false); assert.equal(g.coin, 100); assert.equal(g.inventory.health, undefined);
  assert.match(t('doc.claimCoin', { coin: 160 }), /160/);
});
