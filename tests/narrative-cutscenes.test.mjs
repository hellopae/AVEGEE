import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { runInNewContext } from 'node:vm';
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


test('supervisor praise reports the granted star bonus without promising blocked healing', () => {
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  const commentSource = ui.slice(ui.indexOf('const BOSS_LINE ='), ui.indexOf('let bossBridgeTimer ='));
  const comment = runInNewContext(commentSource + '\nverdictComment');
  for (const [score, bonus] of [[82, 25], [90, 60], [60, 0]]) {
    const g = createGame(); g.save = () => true; g.onChange = () => {}; g.gainExp = () => {};
    g.karma = 80; g.hp = g.hpMax - 20;
    const beforeCoin = g.coin, beforeHp = g.hp;
    g.applyVerdict({score, karma:0, tham:100, ked:100, rab:100, over:0, short:0},
      {id:99, who:'audit', said:[], deeds:[]});
    const line = comment(g.pendingVerdict);
    assert.equal(g.coin - beforeCoin, bonus);
    assert.equal(g.hp, beforeHp, 'high karma suppresses the five-star restoration');
    if (bonus) assert.ok(line.includes(`เบี้ยพิเศษ +${bonus}`));
    else assert.doesNotMatch(line, /เบี้ยพิเศษ/);
    assert.doesNotMatch(line, /คืนบารมี|พิเศษ 40/);
  }
});
