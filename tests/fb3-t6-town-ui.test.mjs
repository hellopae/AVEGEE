// FB3-T6 (26 Nov 2026) - town UI (MP1 MP2 MP6 MP7 MP8), the fire-training minigame (MN3), the worker cards (MN4), the controlled lords' picture (T-LIB hand-over 8) and the burning city on built sites only (hand-over 9).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { STATIONS, SPOTS, QUEUE_LINE } from '../src/data.js';
import { soulMapPosition, CONSTRUCTION_SCALE, CONSTRUCTION_DROP, BUILD_BAR_W, BUILD_BAR_H, BUILD_LABEL_SIZE, BUILD_PROMPT_L1, BUILD_PROMPT_L2, BUILD_PROMPT_H } from '../src/scene.js';
import { NOTICES } from '../src/z1-events.js';
import { trainingHit, trainingFar, trainingRadius, TRAINING_RESET, trainingAttempt } from '../src/krata-control.js';
import { artUrl } from '../src/art.js';
import { fireSpots } from '../src/city-fire.js';
globalThis.document = { documentElement:{}, createElement:() => ({ width:0, height:0, getContext:() => null }) };
globalThis.Image = class { set src(value) {} };
globalThis.devicePixelRatio ??= 1;
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const game = () => { const g = createGame(); g.save = () => true; g.onChange = () => {}; g.coin = 100000; return g; };

test('MP2: the speech pin of the soul in front follows that soul - on the pier, walking up the stairs, in its place of the queue', () => {
  const g = game(); const soul = { id:41, sp:7 }; g.queue = [soul];
  assert.deepEqual(soulMapPosition(g, soul), [...QUEUE_LINE[0]], 'queue place');
  g.courtArrivals = [{ soulId:41, zone:g.zone, phase:'dock', elapsed:0, duration:3600 }];
  const dock = soulMapPosition(g, soul); assert.deepEqual(dock, [SPOTS.ferry.from[0] - 24, SPOTS.ferry.from[1]], 'docked: on the pier (first berth), not at the queue');
  g.courtArrivals = []; g.afterlifeWalks = [{ destination:'arrival', zone:g.zone, soul, path:[[2225, 1780], [1856, 1100]], elapsed:1500, duration:3000, delay:0 }];
  const mid = soulMapPosition(g, soul); assert.ok(mid[1] < 1780 && mid[1] > 1100, `halfway up (${mid})`);
  const second = { id:42 }; g.queue = [soul, second]; g.courtArrivals = [{ soulId:42, zone:g.zone, phase:'dock' }];
  assert.deepEqual(soulMapPosition(g, second), [SPOTS.ferry.from[0] - 24, SPOTS.ferry.from[1]]);
  assert.equal(soulMapPosition(g, null), null);
  const ui = src('src/ui.js');
  assert.match(ui, /soulPin\.dataset\.followSoul = String\(s\.id\)/); assert.match(ui, /if \(d\.dataset\.followSoul\)/);
  assert.match(ui, /soulMapPosition\(g, g\.queue\.find\(q => String\(q\.id\) === d\.dataset\.followSoul\)\)/);
  assert.match(ui, /Object\.assign\(pin\.dataset,\{follow:p\.npc/, 'the quest pin over a walking reaper follows him too');
});

test('MP6: a rank that opens a building queues ONE notice for it (TH + EN), never twice, never for the tower; the level-up window no longer repeats it', () => {
  const g = game(); assert.deepEqual(g.notices, []);
  g.exp = 119; g.gainExp(5, 't'); assert.equal(g.level, 2);
  assert.deepEqual(g.notices.filter(n => n.startsWith('build-open-')), ['build-open-dab']);
  for (const k of ['dab', 'sawan', 'ngiw', 'lan', 'lokan']) { const n = NOTICES[`build-open-${k}`]; assert.ok(n?.title && n.text && n.button && n.en?.title && n.en.text && n.en.button, k); assert.match(n.title, new RegExp(STATIONS.find(s => s.k === k).name)); }
  assert.equal(NOTICES['build-open-krajok'], undefined, 'the Mirror Tower has its own window (lamp)');
  g.ackNotice('build-open-dab'); g.queueNotice('build-open-dab'); assert.ok(!g.notices.includes('build-open-dab'), 'seen once = never again');
  // the notice is queued only at the moment of the rank: an old save that is already at rank 3 is not told about the rank-2 and rank-3 buildings
  const snap = JSON.parse(JSON.stringify(Object.assign(game(), { level:3 }).snapshot())); const old = game(); old.restore(snap);
  assert.deepEqual(old.notices.filter(n => n.startsWith('build-open-')), []);
  g.exp = 319; g.gainExp(5, 't'); assert.equal(g.level, 3); assert.ok(g.notices.includes('build-open-sawan'));
  assert.ok(!/🔓/.test(src('src/ui.js').slice(src('src/ui.js').indexOf('function openLevelUp'), src('src/ui.js').indexOf('/** Reuses the intro'))), 'no repeated unlock rows in the level-up window');
});

test('MP1 MP7 MP8: the construction bar / sign / animation and the "press to build" box are smaller and the scaffold sits lower; the click box uses the same numbers', () => {
  assert.ok(BUILD_BAR_W <= 72 && BUILD_BAR_H <= 7 && BUILD_LABEL_SIZE <= 7, 'bar 120x12 / sign 10 before');
  assert.ok(CONSTRUCTION_SCALE <= .8 && CONSTRUCTION_SCALE >= .6, 'the scaffold is drawn smaller than its sheet size'); assert.ok(CONSTRUCTION_DROP >= 15, 'and lower than the foot point');
  assert.ok(BUILD_PROMPT_L1 <= 10 && BUILD_PROMPT_L2 <= 8 && BUILD_PROMPT_H <= 28, 'box was 15 / 11 / 44');
  const scene = src('src/scene.js');
  assert.match(scene, /ctx\.translate\(d\.bx, d\.by \+ CONSTRUCTION_DROP\); ctx\.scale\(CONSTRUCTION_SCALE, CONSTRUCTION_SCALE\); ctx\.translate\(-d\.bx, -d\.by\)/);
  assert.match(scene, /const drewConstruction = drawConstruction\(ctx, d, p, t, g\.zone\)/);
  assert.ok(!/ \* 14 \* UI_SCALE_MAP|w = Math\.max\(w1, w2\) \+ 20/.test(scene), 'the old box numbers are gone');
});

test('MN3: the fire-training press counts at pointerdown (not at release), taps far from the green ring are free, and a press ~300 ms after the ring touched the green one still hits', () => {
  const qte = src('src/minigames/krata-qte.js');
  assert.ok(!/pointerup|mouseup|touchend/.test(qte), 'nothing is counted on release');
  assert.match(qte, /addEventListener\('pointerdown',onPointer/); assert.match(qte, /addEventListener\('keydown'[\s\S]{0,260}press\(e\)/, 'Space / Enter press on keydown');
  assert.match(qte, /const lag=!training && ev/, 'a training press is judged on the ring that is on screen');
  assert.match(qte, /trainingFar\(radius\)/);
  // ring speed .00075 per ms: a 300 ms reaction puts the ring at radius ~.775 when 1.0 was seen
  assert.ok(trainingHit(1 - .00075 * 300), 'reaction time is inside the band'); assert.ok(trainingHit(1.13)); assert.ok(!trainingHit(1.2)); assert.ok(!trainingHit(.7));
  assert.ok(trainingFar(1.6) && trainingFar(2.2) && !trainingFar(1.4), 'far taps are free'); assert.ok(TRAINING_RESET < .74 && trainingRadius(2150) < TRAINING_RESET, 'the ring retries only after it has passed the whole band');
  // five hits are possible, the old "3 at most" was the player's bad luck with the window: 5 hits win, 3 misses lose (rules unchanged)
  let s = { hits:0, misses:0, done:false }; for (let i = 0; i < 5; i++) s = trainingAttempt(s, true); assert.ok(s.done && s.won && s.hits === 5);
  s = { hits:2, misses:0, done:false }; for (let i = 0; i < 3; i++) s = trainingAttempt(s, false); assert.ok(s.done && !s.won);
  // the hint tells the player it counts on press-down
  assert.match(readFileSync(new URL('../src/i18n.js', import.meta.url), 'utf8'), /นับตอนกดลง/);
});

test('MN4: the hired workers\' cards in Nira\'s team menu use the reaper-sized profile picture (64 px, picture left)', () => {
  assert.match(src('src/worker-ui.js'), /class="worker-service-card worker-roster-card"><span class="team-face worker-face"/);
  const css = src('src/team-hud.css');
  assert.match(css, /\.worker-roster-card\{display:grid!important;grid-template-columns:64px minmax\(0,1fr\)/); assert.match(css, /\.worker-roster-card \.worker-face\{width:64px;height:64px/);
  assert.match(css, /\.team-manage-card\{display:grid;grid-template-columns:64px minmax\(0,1fr\)/, 'the reaper card is 64 px');
  assert.match(src('index.html'), /team-hud\.css\?v=20261031-q3-fb3t6/, 'cache id bumped');
});

test('T-LIB hand-over 8: the controlled border lords have one standing picture cut from Codex\'s 3x4 sheet (the sheet itself is never drawn as a standee)', () => {
  for (const z of ['th', 'asia', 'west']) {
    const f = artUrl(`boss-frontier-${z}-signal`); assert.equal(f, `img/story-sig/boss-frontier-${z}-signal-idle.webp`); assert.ok(existsSync(new URL('../' + f, import.meta.url)), f);
    assert.ok(existsSync(new URL(`../img/story-sig/boss-frontier-${z}-signal-v1.webp`, import.meta.url)), 'Codex\'s sheet is kept untouched');
    const head = readFileSync(new URL('../' + f, import.meta.url)).subarray(0, 32); assert.equal(head.subarray(0, 4).toString(), 'RIFF'); assert.equal(head.subarray(8, 12).toString(), 'WEBP');
  }
  assert.ok(existsSync(new URL('../scripts/crop-signal-boss.py', import.meta.url)));
});

test('T-LIB hand-over 9: the burning city lists only buildings that stand (an empty pad or a scaffold does not burn); houses always', () => {
  const g = game(); const all = fireSpots().map(s => s.key), built = fireSpots(g).map(s => s.key);
  assert.ok(built.length < all.length, 'a new game has empty pads');
  assert.ok(!built.includes('krajok') && !built.includes('canteen') && !built.includes('lokan'), 'unbuilt sites do not burn');
  assert.ok(built.includes('sala') && built.includes('tarang'), 'the buildings of a new game do');
  assert.equal(built.filter(k => k.startsWith('house:')).length, all.filter(k => k.startsWith('house:')).length, 'every house');
  g.stations.push({ def:STATIONS.find(d => d.k === 'dab'), build:Date.now() + 5000, slots:[] }); assert.ok(!fireSpots(g).some(s => s.key === 'dab'), 'a scaffold does not burn');
  g.stations.at(-1).build = 0; assert.ok(fireSpots(g).some(s => s.key === 'dab'), 'a finished building does');
});
