import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { STORY } from '../src/story.js';
import { ZONE_EVENTS, ZONES, MOB, authorityOf } from '../src/data.js';
import { createGame } from '../src/game.js';
import { finalGame, win, acknowledge } from './final-event-helpers.mjs';
const manifest = JSON.parse(readFileSync(new URL('../img/manifest.json', import.meta.url), 'utf8'));
globalThis.Image = class {};

test('all story and deva panels exist in the project and preload manifest', () => {
  const panels = Object.values(STORY).flatMap(s => s.pages);
  assert.equal(panels.length, 27);
  const catalog=JSON.parse(readFileSync(new URL('../img/preload-catalog.json', import.meta.url), 'utf8'));
  for (const p of panels) {
    assert.ok(existsSync(new URL('../' + p.image, import.meta.url)), p.image);
    if (p.image.startsWith('img/deva-intro/')) assert.ok(Object.values(catalog.zones).flat().includes(p.image),p.image);
    else assert.ok(manifest.rest.includes(p.image.slice(4)), p.image);
  }
});

test('four opening waves use existing CyberHell minions and assets', () => {
  const event=ZONE_EVENTS.cyberhell.find(e=>e.k==='cyberFinal');
  assert.deepEqual(event.waves.slice(0,4).map(w=>w[0].kind),[14,15,16,16]);
  const zone=ZONES.find(z=>z.k==='cyberhell'), g=finalGame();
  for (const [i,kind] of [14,15,16,16].entries()) {
    assert.ok(g.startFinalEncounter(`minion:${i+1}`)); assert.ok(zone.mobs.includes(kind));
    const name=MOB.kinds[kind].img, path=`CyberHell/${name}-cyberhell.png`;
    assert.ok(manifest.zones.cyberhell.includes(path)); assert.ok(existsSync(new URL('../img/'+path,import.meta.url)));
    assert.deepEqual(g.battle.foes.map(f=>f.sp),[name,name]);
    assert.ok(g.battle.foes.every(f=>f.hp>0 && f.maxHp>0));
    win(g); g.endBattle(); acknowledge(g);
  }
});

test('reinforcements follow wave four rewards; independent ruler fights preserve the roster', () => {
  const g=finalGame(); g.finalTeamCandidates(); const roster=JSON.stringify({crew:g.crew,guard:g.guard});
  for (let wave=1;wave<=4;wave++) {
    g.startFinalEncounter(`minion:${wave}`); win(g);
    assert.ok(!g.storyQueue.some(p=>p.key==='cyber-reinforcements'));
    g.endBattle(); acknowledge(g);
    if (wave<4) assert.equal(g.finalEvent.reinforcementsSeen,false);
  }
  assert.equal(g.finalEvent.reinforcementsSeen,true);
  for (const zone of ['th','asia','west','cyberhell']) {
    g.startFinalEncounter(`ruler:${zone}`); assert.equal(g.battle.foes[0].sp,`leader-${zone}-possessed`);
    win(g); g.endBattle(); acknowledge(g); assert.equal(g.battle,null);
  }
  g.startFinalEncounter('boss'); assert.equal(g.battle.storyInterlude,'cyber-duel');
  assert.equal(g.battle.foes[0].sp,'zone-boss-cyberhell');
  assert.equal(JSON.stringify({crew:g.crew,guard:g.guard}),roster);
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
