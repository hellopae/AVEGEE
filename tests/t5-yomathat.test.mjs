// T5'/2-3 - Yomathat waits at the harbor, "together" puts him in the team, the cage scene in the cave (Rae R2 A sections 5 and 6).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { storyOf } from '../src/story.js';
import { NOTICES } from '../src/z1-events.js';
import { YOMATHAT, YOMATHAT_STORIES, PIER_TALK } from '../src/z1-yomathat.js';
import { bossGuideWaiting, bossGuideFollowing } from '../src/boss-guides.js';
import { FRONTIER } from '../src/data.js';
import { dungeonStatus } from '../src/zone-travel.js';
import { routeBossCave } from '../src/route-geometry.js';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
const drain = g => { for (let i = 0; i < 12 && g.storyQueue.length; i++) g.completeStory(); };
function afterBossWin() {
  const g = createGame(); g.save = () => true; g.onChange = () => {};
  g.bossCleared.th = true; g.queueStory('boss-guide-th-praise'); drain(g); return g;
}

test('after the win: the scene "he waits at the harbor", then NY-1; he stands at the harbor and the frontier gate no longer shows him', () => {
  const g = createGame(); g.save = () => true; g.onChange = () => {}; g.bossCleared.th = true;
  assert.equal(storyOf('boss-guide-th-praise').title, 'พี่รอที่ท่าเรือ'); assert.match(storyOf('boss-guide-th-praise').pages[0].line, /พี่จะรอที่ท่าเรือ เมื่อน้องพร้อม มาหาพี่/);
  g.queueStory('boss-guide-th-praise'); drain(g);
  assert.ok(g.notices.includes(YOMATHAT.waitNotice)); assert.equal(NOTICES[YOMATHAT.waitNotice].en.button, 'Understood');
  assert.equal(bossGuideWaiting(g), true); assert.equal(bossGuideFollowing(g), false);
});

test('"together": the scene, NY-2, he follows; "prepare first" changes nothing; the join survives a save', () => {
  const g = afterBossWin(); g.notices = [];
  assert.equal(g.inviteBossGuide(), true); assert.equal(g.storyQueue[0].key, 'boss-guide-th-welcome');
  assert.match(storyOf('boss-guide-th-welcome').pages[0].line, /ถ้าพี่ห้ามอะไร น้องฟังพี่ก่อนครั้งเดียว/);
  drain(g);
  assert.equal(bossGuideFollowing(g), true); assert.ok(g.notices.includes(YOMATHAT.joinNotice)); assert.match(NOTICES[YOMATHAT.joinNotice].text, /ยามา นิรา และยมทัต/);
  const copy = createGame(); copy.restore(JSON.parse(JSON.stringify(g.snapshot()))); assert.equal(bossGuideFollowing(copy), true);
  const h = afterBossWin(); assert.equal(bossGuideWaiting(h), true, 'not answering = still waiting');
  assert.equal(PIER_TALK.again.length, 2); assert.equal(PIER_TALK.go.th, 'ไปด้วยกันครับ');
});

test('the cave: the cage scene is due once, in the middle of the cave, only while he walks with Yama; its notice leads into the 3 pages', () => {
  const g = afterBossWin(); g.inviteBossGuide(); drain(g); g.notices = [];
  assert.equal(g.caveSceneDue(), false, 'not on the route');
  g.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared', frontierBreach:'cleared', sitaHanuman:'cleared', khunPhaen:'cleared', thBorderBoss:'cleared' }; g.zoneCases.th = 15;
  g.player.x = FRONTIER.x; g.player.y = FRONTIER.y; assert.equal(g.beginBorderDungeon('asia'), true);
  const st = dungeonStatus(g), cave = routeBossCave(st.route.id), a = g.zoneTravel.active;
  assert.equal(g.caveSceneDue(0), false, 'the start of the route');
  a.checkpoint = cave.checkpoint; a.cleared = st.route.checkpoints.slice(0, cave.checkpoint).map(c => c.id);
  assert.equal(g.caveSceneDue(), true, 'the middle of the cave, walking with him'); assert.equal(g.caveSceneDue(0), false);
  g.guard = null; g.bossGuides.zones.th.following = false; assert.equal(g.caveSceneDue(), false, 'he is not with them'); g.bossGuides.zones.th.following = true;
  assert.equal(storyOf(YOMATHAT.fatherStory).pages.length, 3); assert.match(storyOf(YOMATHAT.fatherStory).pages[2].line, /ครั้งเดียวที่พี่ขอ/); assert.match(storyOf(YOMATHAT.fatherStory).pages[2].line, /ความเข้มงวด/);
  g.queueNotice(YOMATHAT.caveNotice); g.ackNotice(YOMATHAT.caveNotice);
  assert.equal(g.storyQueue[0].key, YOMATHAT.fatherStory); drain(g); assert.ok(g.storySeen[YOMATHAT.fatherStory]);
  assert.equal(g.caveSceneDue(), false);
});

test('every picture exists as a .webp; the old frontier-gate guide is not drawn in Zone 1; the lines match Rae', () => {
  for (const f of ['img/z1-events/cut-yomathat-harbor-th.webp', 'img/z1-events/cut-frontier12-cage-th.webp', 'img/z1-events/cut-frontier12-stop-th.webp']) assert.ok(existsSync(new URL('../' + f, import.meta.url)), f);
  assert.ok(readFileSync(new URL('../src/frontier.js', import.meta.url), 'utf8').includes("g.zone!=='th'&&bossGuideWaiting(g)"));
  for (const k of Object.keys(YOMATHAT_STORIES)) assert.ok(storyOf(k));
  assert.match(NOTICES[YOMATHAT.caveNotice].en.text, /metal rings on metal/);
});
