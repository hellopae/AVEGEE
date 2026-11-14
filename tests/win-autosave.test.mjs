// Z2-EVENTS step 0 — a won event fight is saved the moment it is won (before the "back to the zone" button).
// Found in Z1: reload between "won" and the button loaded the save taken at the start of the fight -> event back to pending, reward and fight twice.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, loadSave } from '../src/game.js';
import { STATIONS } from '../src/data.js';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
const store = new Map();                                // the real browser save: localStorage (the in-memory snapshot would hide the bug)
Object.defineProperty(globalThis, 'localStorage', { configurable:true, value:{ getItem:k => store.get(k) ?? null, setItem:(k, v) => store.set(k, String(v)), removeItem:k => store.delete(k) } });

const station = k => ({ def:STATIONS.find(d => d.k === k), crewK:null, intensity:3, fire:0, build:0, slots:[] });
const reloadFromDisk = () => { const loaded = createGame(); loaded.restore(loadSave()); return loaded; };

test('prison break: reload after the win and before the end-of-fight button keeps it cleared, reward is not paid twice', () => {
  const g = createGame(); g.stations.push(station('sawan'), station('krata'));
  g.zoneCases.th = 3; g.refreshZoneEvents('th');
  assert.equal(g.zoneEventStatus('prisonBreak'), 'pending');
  const b = g.startPrisonBreak(); assert.ok(b);
  g.save();                                              // the save a player has from the start of the fight
  for (const f of g.battle.foes) f.atk = [0, 0];
  for (let i = 0; i < 40 && !g.battle.over; i++) { const f = g.battle.foes.find(x => x.hp > 0); f.hp = 1; g.battle.selectedFoeId = f.id; g.battleAct('atk'); }
  assert.equal(g.battle.over, 'win');
  const coin = g.coin;                                   // paid at the win
  const loaded = reloadFromDisk();                       // reload BEFORE the button: what the browser has in localStorage
  assert.equal(loaded.zoneEventStatus('prisonBreak'), 'cleared', 'the win is not lost');
  assert.equal(loaded.coin, coin, 'the reward is kept once');
  assert.equal(loaded.startPrisonBreak(), null, 'the fight cannot be fought again');
  g.endBattle();                                         // pressing the button afterwards changes nothing
  assert.equal(g.zoneEventStatus('prisonBreak'), 'cleared'); assert.equal(g.coin, coin);
});
