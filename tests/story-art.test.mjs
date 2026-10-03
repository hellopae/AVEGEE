import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { STORY } from '../src/story.js';
import { ZONE_EVENTS, ZONES, MOB, authorityOf } from '../src/data.js';
import { createGame } from '../src/game.js';
const manifest = JSON.parse(readFileSync(new URL('../img/manifest.json', import.meta.url), 'utf8'));
globalThis.Image = class {};

test('all twenty story panels exist in the project and preload manifest', () => {
  const panels = Object.values(STORY).flatMap(s => s.pages);
  assert.equal(panels.length, 20);
  for (const p of panels) {
    assert.ok(existsSync(new URL('../' + p.image, import.meta.url)), p.image);
    assert.ok(manifest.rest.includes(p.image.slice(4)), p.image);
  }
});

test('cutscene minions fight in the final three opening waves and are available at the CyberHell frontier', () => {
  const event = ZONE_EVENTS.cyberhell.find(e => e.k === 'cyberFinal');
  assert.deepEqual(event.waves.slice(0,3).map(w => w[0].kind), [14,15,16]);
  const zone = ZONES.find(z => z.k === 'cyberhell');
  const g = createGame(); g.zone = 'cyberhell';
  g.zoneCases.cyberhell = 10;
  g.zoneEvents.cyberhell = {cyberRescue:'cleared',cyberBreach:'cleared'};
  g.refreshZoneEvents();
  assert.ok(g.startZoneEvent('cyberFinal'));
  for (const kind of [14,15,16]) {
    assert.ok(zone.mobs.includes(kind));
    const name = MOB.kinds[kind].img;
    const path = `CyberHell/${name}-cyberhell.png`;
    assert.ok(manifest.zones.cyberhell.includes(path));
    assert.ok(existsSync(new URL('../img/' + path, import.meta.url)));
    assert.deepEqual(g.battle.foes.map(f => f.sp), [name,name]);
    assert.ok(g.battle.foes.every(f => f.hp > 0 && f.maxHp > 0));
    while (g.battle.foes.some(f => f.hp > 0)) {
      const foe = g.battle.foes.find(f => f.hp > 0);
      g.battle.selectedFoeId = foe.id; foe.hp = 1;
      assert.equal(g.battleAct('atk'), true);
    }
    assert.equal(g.advanceZoneEventWave(kind === 16), true);
  }
  assert.equal(g.battle.foes[0].sp, 'leader-th-possessed');
});

// A branch inspector cannot silently become the helper seated at the throne.
test('reinforcements arrive after wave three, preserving both rests and the four ruler fights', () => {
  const g = createGame(); g.zone = 'cyberhell';
  g.zoneCases.cyberhell = 10;
  g.zoneEvents.cyberhell = {cyberRescue:'cleared',cyberBreach:'cleared'};
  g.refreshZoneEvents(); g.startZoneEvent('cyberFinal');
  const roster = JSON.stringify({crew:g.crew, guard:g.guard});
  const defeatWave = () => {
    while (g.battle.foes.some(f => f.hp > 0)) {
      const foe = g.battle.foes.find(f => f.hp > 0);
      g.battle.selectedFoeId = foe.id; foe.hp = 1;
      assert.equal(g.battleAct('atk'), true);
    }
  };
  g.battle.storyInterlude = null; // Comic completion consumes the opening cue.
  for (let wave = 1; wave <= 3; wave++) {
    defeatWave();
    assert.equal(g.battle.storyInterlude, wave === 3 ? 'cyber-reinforcements' : null);
    if (wave < 3) assert.equal(g.advanceZoneEventWave(), true);
  }
  assert.equal(g.zoneEventRestReady(), true);
  assert.equal(g.advanceZoneEventWave(), false);
  assert.equal(g.battle.wave, 3);
  g.battle.storyInterlude = null;
  assert.equal(g.advanceZoneEventWave(true), true);
  assert.equal(g.battle.storyInterlude, 'cyber-control');
  g.battle.storyInterlude = null;
  for (const zone of ['th','asia','west','cyberhell']) {
    assert.equal(g.battle.foes[0].sp, `leader-${zone}-possessed`);
    defeatWave();
    if (zone !== 'cyberhell') assert.equal(g.advanceZoneEventWave(), true);
  }
  assert.equal(g.zoneEventRestReady(), true);
  assert.equal(g.advanceZoneEventWave(), false);
  assert.equal(g.advanceZoneEventWave(true), true);
  assert.equal(g.battle.storyInterlude, 'cyber-duel');
  assert.equal(g.battle.foes[0].sp, 'zone-boss-cyberhell');
  assert.equal(JSON.stringify({crew:g.crew, guard:g.guard}), roster);
});

test('all four rulers have separate identities and final combat assets', () => {
  for (const z of ZONES) {
    assert.notEqual(authorityOf(z.k).full, z.bossName);
    const sprite = `leader-${z.k}-possessed.png`;
    assert.ok(existsSync(new URL('../img/' + sprite, import.meta.url)));
    assert.ok(manifest.rest.includes(sprite));
  }
  for (const [z,folder] of [['west','West'],['cyberhell','CyberHell']]) {
    const sprite = `${folder}/hero-boss-${z}.png`;
    assert.ok(existsSync(new URL('../img/' + sprite, import.meta.url)));
    assert.ok(manifest.zones[z].includes(sprite));
  }
});
