import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { DAD, authorityOf } from '../src/data.js';
import { authorityPunishmentCutscene, frontierIntroduction } from '../src/narrative-cutscenes.js';

const zones = ['th', 'asia', 'west', 'cyberhell'];

test('disciplinary counters use the current head and preserve punishment recovery in every zone', () => {
  for (const zone of zones) {
    const g = createGame(); g.zone = zone; g.hp = 80; g.save = () => true;
    g.startDadFight();
    assert.equal(g.battle.who, authorityOf(zone).full);
    assert.equal(g.battleAct('atk'), true);
    assert.equal(g.battle.ultimate.image, authorityPunishmentCutscene(zone));
    assert.equal(g.battle.over, 'lose');
    assert.equal(g.battle.dmg.you, 999);
    g.endBattle();
    assert.equal(g.hp, DAD.punishHp);
    assert.ok(g.pendingDadPunish);
    assert.equal(g.over, null);
  }
});

test('all frontier intros have localized dialogue and deployed artwork; head attacks are separate from possessed rulers', () => {
  const manifest = JSON.parse(readFileSync(new URL('../img/manifest.json', import.meta.url)));
  for (const zone of zones) {
    const th = frontierIntroduction(zone), en = frontierIntroduction(zone, 'en');
    assert.notEqual(th.line, en.line);
    assert.ok(th.speaker && en.speaker);
    assert.equal(th.image, en.image);
    for (const image of [th.image, authorityPunishmentCutscene(zone)]) {
      assert.ok(existsSync(new URL('../' + image, import.meta.url)), image);
      assert.ok([...manifest.critical, ...manifest.rest].includes(image.replace('img/', '')), image);
      assert.doesNotMatch(image, /possessed|leader-.*attack/);
    }
  }
  assert.equal(frontierIntroduction('unknown'), null);
});
