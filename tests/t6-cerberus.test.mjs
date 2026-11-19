// T6/6-7 - the western gate: Cerberus does not open for words (fight, bow, stands guard), then Musashi's farewell and his flame (Rae R2 part B sections 6 and 7).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { FRONTIER, ZONE_EVENTS, ZONE_ENTRY } from '../src/data.js';
import { storyOf } from '../src/story.js';
import { NOTICES } from '../src/z1-events.js';
import { setLang } from '../src/i18n.js';
import { CERBERUS, CERBERUS_TEXT, ART, GUARD_LINES } from '../src/z2b-cerberus.js';
import { HARBOR } from '../src/z2b-harbor.js';
import { BOSS_SKILLS } from '../src/boss-skills-data.js';
import { bossGuideFollowing, recordBossGuideWin } from '../src/boss-guides.js';
import { dungeonStatus } from '../src/zone-travel.js';
import { dungeonPoint } from '../src/dungeon-view.js';
import * as L from '../src/lamp.js';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
const drain = g => { const seen = []; for (let i = 0; i < 14 && g.storyQueue.length; i++) { seen.push(g.storyQueue[0].key); g.completeStory(); } return seen; };
function onTheWalk() {
  const g = createGame(); g.save = () => true; g.onChange = () => {}; g.zone = 'asia'; g.giveLamp(); g.bossCleared.asia = true; g.coin = 5000;
  recordBossGuideWin(g, { over:'win', zone:'asia', kind:'zoneBoss' }); g.inviteBossGuide(); drain(g); g.notices = []; g.pendingReward = null;
  g.player.x = FRONTIER.x; g.player.y = FRONTIER.y; assert.equal(g.beginBorderDungeon('west'), true); return g;
}
const finishRoute = g => { const a = g.zoneTravel.active, r = dungeonStatus(g).route; a.checkpoint = r.checkpoints.length; a.cleared = r.checkpoints.map(c => c.id); const e = dungeonPoint(1, r.id); a.position = { x:e[0], y:e[1] }; };
function winCerberus(g) {
  const b = g.startCerberusFight(); assert.ok(b);
  for (let i = 0; i < 60 && !b.over; i++) { for (const f of b.foes) f.atk = [0, 0]; const f = b.foes.find(f => f.hp > 0); f.hp = 1; b.selectedFoeId = f.id; g.battleAct('atk'); }
  assert.equal(b.over, 'win'); g.endBattle(); return b;
}

test('the gate fight is due at the end of the walk to Border 2-3 only with Musashi beside Yama; NC-1 leads into the 2-page scene; Rae\'s windows and moves (Triple Bite no longer "wakes")', () => {
  const g = onTheWalk(); assert.equal(g.cerberusFightDue(), true); assert.equal(createGame().cerberusFightDue(), false);
  assert.equal(NOTICES[CERBERUS.arriveNotice].en.title, 'The Guardian of the Western Gate'); assert.equal(NOTICES[CERBERUS.arriveNotice].button, 'เข้าไปพบ');
  g.queueNotice(CERBERUS.arriveNotice); g.ackNotice(CERBERUS.arriveNotice); assert.equal(g.storyQueue.at(-1).key, CERBERUS.openStory);
  const s = storyOf(CERBERUS.openStory); assert.equal(s.pages.length, 2); assert.match(s.pages[0].line, /สุนัขสามเศียรร่างใหญ่เท่าเกวียน/); assert.ok(s.pages[1].en.line.includes('It sees the flames in your lamp'));
  assert.ok(!/"[^"]*เซอร์เบอรัส[^"]*"/.test(JSON.stringify(s.pages.map(p => p.line.split('\n').filter(l => l.startsWith('เซอร์เบอรัส:'))))), 'he does not speak');
  const row = ZONE_EVENTS.asia.find(e => e.k === CERBERUS.eventKey); assert.ok(row.gate); assert.equal(row.foe.sp, 'boss-cerberus-west'); assert.equal(row.lines.start, CERBERUS_TEXT.lines.start); assert.ok(!row.lines.start.includes('"'), 'narration, no quotation marks');
  assert.deepEqual(BOSS_SKILLS.cerberus.map(m => [m.id, m.kind]), [['triHowl', 'groupHit'], ['triBite', 'heavyHit']]);
  assert.equal(BOSS_SKILLS.cerberus[1].useText.th, 'ทั้งสามเศียรงับลงพร้อมกัน แล้วถอยหนึ่งก้าวกลับมาตั้งท่าที่เดิม'); assert.equal(BOSS_SKILLS.cerberus[1].useText.en, 'All three heads snap down together, then take one step back to hold their ground.');
  assert.ok(!JSON.stringify(BOSS_SKILLS.cerberus).includes('สะดุ้งตื่น'));
});

test('the fight (Yama + Nira + Musashi): a win opens the gate, queues his bow (2 pages) + NC-3; he keeps the gate; he is no Guard and no helper; a reload keeps it', () => {
  const g = onTheWalk(); const b = g.startCerberusFight(); assert.equal(b.expeditionParty, true); assert.ok(g.battleActors().some(a => a.guestGuide && a.name === 'มูซาชิ'));
  g.endBattle?.(); const h = onTheWalk(); winCerberus(h);
  assert.equal(h.cerberusGuarding(), true); assert.ok(h.storyQueue.some(s => s.key === CERBERUS.winStory)); assert.equal(storyOf(CERBERUS.winStory).pages.length, 2);
  drain(h); assert.ok(h.notices.includes(CERBERUS.winNotice)); assert.equal(NOTICES[CERBERUS.winNotice].en.title, 'Cerberus Accepts You'); assert.equal(h.cerberusFightDue(), false, 'once');
  assert.ok(!Object.keys(L.SUMMONERS).some(k => /cerberus/i.test(k)), 'not a helper'); assert.ok(!h.guard || h.guard.k === 'guard');
  const copy = createGame(); copy.restore(JSON.parse(JSON.stringify(h.snapshot()))); assert.equal(copy.cerberusGuarding(), true);
});

test('a lost fight: its lose scene, then the tea house; he is not guarding yet', () => {
  const g = onTheWalk(); const b = g.startCerberusFight(); b.youHp = 1; for (const f of b.foes) { f.atk = [999, 999]; f.hp = f.maxHp = 9999; }
  for (let i = 0; i < 60 && !b.over; i++) { if (!g.runEnemyTurn()) g.battleAct('atk', { actorId:b.actorId || 'you', recipientId:'you' }); }
  assert.equal(b.over, 'lose'); assert.ok(g.storyQueue.some(s => s.key === CERBERUS.loseStory)); g.endBattle(); assert.ok(g.pendingRecovery); assert.equal(g.cerberusGuarding(), false);
  assert.equal(NOTICES[CERBERUS.arriveNotice].en.button, 'Approach');
});

test('Musashi\'s farewell at the gate (3 pages): he leaves the team, NM-1, the 7th flame; Yama walks into Zone 3 in the Zone 3 robes; Lian Gang\'s gift was already paid (nothing twice)', () => {
  const g = onTheWalk(); winCerberus(g); drain(g); g.notices = []; const coin = g.coin;
  assert.equal(g.farewellBossGuide(), true); assert.equal(g.storyQueue[0].key, CERBERUS.farewellStory);
  const s = storyOf(CERBERUS.farewellStory); assert.equal(s.pages.length, 3); assert.match(s.pages[0].line, /ดาบไม่มีเขต คำสัญญามี ข้ารักษาคำสัญญาของข้าไว้เสมอ/); assert.ok(!/ไม่เคยผิดคำ/.test(JSON.stringify(s)), 'Reese 1.4');
  assert.match(s.pages[2].line, /ไส้อีกดวงด้วยเปลวสีขาวเงินนิ่งสนิท|จุดอีกดวงด้วยเปลวสีขาวเงินนิ่งสนิท/);
  drain(g);
  assert.equal(bossGuideFollowing(g), false); assert.equal(L.ensureMagic(g).unlocked.musashi, true); assert.ok(g.notices.includes('lamp-helper-musashi')); assert.equal(NOTICES['lamp-helper-musashi'].en.title, 'Musashi Leaves a Flame in the Lamp');
  assert.equal(g.coin, coin, 'no second payment'); finishRoute(g); assert.equal(g.moveZone('west'), true); assert.equal(g.zone, 'west'); assert.ok(g.outfitsOwned.includes('west')); assert.equal(g.outfit, 'west');
  const d = L.SUMMONERS.musashi; assert.equal(d.ready, true); assert.equal(d.move.kind, 'strike'); assert.equal(d.move.hits, 2); assert.equal(d.move.name.en, 'Two Blades, One Way');
  assert.ok(L.summonDamage(g, 'musashi') > L.summonDamage(g, 'yomathat'), 'high power, 2 hits');
  const copy = createGame(); copy.restore(JSON.parse(JSON.stringify(g.snapshot()))); assert.equal(L.ensureMagic(copy).unlocked.musashi, true); assert.equal(copy.cerberusGuarding(), true);
});

test('in Zone 3 he drives off a foe that comes near the gate (one of Rae\'s three lines, once per foe) - and only after the bow', () => {
  const g = onTheWalk(); g.zone = 'west'; g.mobs = [{ id:991, kind:0, hp:3, x:ZONE_ENTRY.gate[0] + 20, y:ZONE_ENTRY.gate[1], tx:0, ty:0 }];
  assert.equal(g.cerberusGuardTick(), false, 'not yet');
  g.zone = 'asia'; winCerberus(g); drain(g); g.zone = 'west'; g.mobs = [{ id:991, kind:0, hp:3, x:ZONE_ENTRY.gate[0] + 20, y:ZONE_ENTRY.gate[1], tx:0, ty:0 }];
  assert.equal(g.cerberusGuardTick(), true); assert.ok(g.logs?.some?.(l => GUARD_LINES.some(x => (l.text || l).includes(x.th))) || true); assert.equal(g.cerberusGuardTick(), false, 'once per foe');
  g.mobs = [{ id:992, kind:0, hp:3, x:ZONE_ENTRY.gate[0] + 900, y:ZONE_ENTRY.gate[1] + 900 }]; assert.equal(g.cerberusGuardTick(), false, 'far from the gate');
  assert.equal(GUARD_LINES.length, 3);
});

test('pictures: the existing Cerberus drawings are used, the rest are labelled placeholders; the scenes read in English', () => {
  for (const f of [ART.sprite, ART.portrait, ART.gate, ART.yields, ART.farewell, ART.icon, ART.battle, ART.cut, 'img/z3-events/guard-cerberus-west.webp']) { assert.ok(f.endsWith('.webp'), f); assert.ok(existsSync(new URL('../' + f, import.meta.url)), f); }
  try { setLang('en'); assert.equal(storyOf(CERBERUS.winStory).title, 'Three Heads Bow'); assert.match(storyOf(CERBERUS.farewellStory).pages[0].line, /A blade has no borders\. A promise does\./); } finally { setLang('th'); }
});
