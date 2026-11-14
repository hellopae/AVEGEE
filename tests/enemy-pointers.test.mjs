// POINTERS (owner 14 Nov): arrows to every enemy the player has to walk to.
// enemy-pointers.js is pure: targets come from the game state, the layout from the camera viewport.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { FRONTIER, MOB } from '../src/data.js';
import { resetWalk } from '../src/walk.js?v=k1d';
import { WEST_RESCUE } from '../src/west-events.js';
import { enemyPointerTargets, layoutPointers, roughDistance, perimeterPoint, perimeterParam, rayToRect, POINTER } from '../src/enemy-pointers.js';
import { TH_DICT, EN_DICT } from './helpers/i18n-dicts.mjs';

globalThis.Image = class {};

const freshGame = () => { resetWalk(); const g = createGame(); g.mobs = []; return g; };
// a 1792x958 screen, world x1 => screen x2 (sx = sy = 2), world (0,0) at screen (100, 50)
const VIEW = { width:1792, height:958, sx:2, sy:2, tx:100, ty:50 };
const mob = (id, x, y, extra = {}) => ({ id:`mob:${id}`, kind:'mob', x, y, h:78, priority:4, icon:{ art:'mob-pret' }, boss:false, ...extra });
const PLAYER = { x:500, y:300 };
const run = (targets, over = {}) => layoutPointers(targets, VIEW, { player:PLAYER, charScale:1, ...over });

test('targets: ordinary pests and event raiders both get a pointer; defeated = gone', () => {
  const g = freshGame();
  assert.deepEqual(enemyPointerTargets(g), []);
  g.mobs.push({ id:1, x:300, y:400, hp:1, kind:0 }, { id:2, x:900, y:500, hp:1, kind:1, eventKey:'prisonBreak' });
  const ts = enemyPointerTargets(g);
  assert.deepEqual(ts.map(t => [t.id, t.kind]), [['mob:1', 'mob'], ['mob:2', 'raider']]);
  assert.ok(ts[1].priority < ts[0].priority, 'event raiders come before ordinary pests');
  assert.equal(ts[0].icon.art, MOB.kinds[0].img);
  g.mobs.splice(0, 1);
  assert.deepEqual(enemyPointerTargets(g).map(t => t.id), ['mob:2']);
  g.mobs.length = 0;
  assert.deepEqual(enemyPointerTargets(g), [], 'nobody left = no pointers');
});

test('targets: nothing while a fight is open or the game is over', () => {
  const g = freshGame();
  g.mobs.push({ id:1, x:300, y:400, hp:1, kind:0 });
  g.battle = { over:null };
  assert.deepEqual(enemyPointerTargets(g), []);
  g.battle = null; g.over = 'lose';
  assert.deepEqual(enemyPointerTargets(g), []);
});

test('targets: the frontier breach points at the gate (zone 1 needs the deva test cleared first)', () => {
  const g = freshGame();
  g.zoneEvents.th = { prisonBreak:'cleared', devaTest:'pending', frontierBreach:'pending' };
  assert.deepEqual(enemyPointerTargets(g).filter(t => t.kind === 'frontier'), [], 'the breach is not open yet');
  g.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared', frontierBreach:'pending' };
  const [gate] = enemyPointerTargets(g).filter(t => t.kind === 'frontier');
  assert.ok(gate);
  assert.deepEqual([gate.x, gate.y], [FRONTIER.x, FRONTIER.y]);
  assert.equal(gate.boss, true);
  assert.equal(gate.icon.event.k, 'frontierBreach');
  g.zoneEvents.th.frontierBreach = 'cleared';
  assert.deepEqual(enemyPointerTargets(g).filter(t => t.kind === 'frontier'), [], 'cleared = the arrow goes');
});

test('targets: zones 2-4 frontier events and the Zone 3 rescue also get a pointer', () => {
  const g = freshGame();
  g.zone = 'asia';
  g.zoneEvents.asia = { asiaRageBreach:'pending' };
  assert.equal(enemyPointerTargets(g).find(t => t.kind === 'frontier')?.icon.event.k, 'asiaRageBreach');
  g.zone = 'west';
  g.zoneEvents.west = { westHypnotized:'pending' };
  g.mobs.push({ id:5, x:100, y:100, hp:1, kind:0 });
  const west = enemyPointerTargets(g);
  assert.deepEqual(west.map(t => t.id), ['rescue:west'], 'one pointer on the demons around Taan; the hidden map pests are not listed');
  assert.deepEqual([west[0].x, west[0].y], [WEST_RESCUE.x, WEST_RESCUE.y]);
  g.zoneEvents.west.westHypnotized = 'cleared';
  assert.equal(enemyPointerTargets(g).some(t => t.id === 'rescue:west'), false);
});

test('targets: challengers waiting at the pier get a pointer (zone 2 Wukong)', () => {
  const g = freshGame();
  g.zone = 'asia';
  g.zoneEvents.asia = { asiaWukong:'pending' };
  g.eventMapClosed['asia:asiaWukong'] = true;
  const w = enemyPointerTargets(g).find(t => t.kind === 'waiting');
  assert.ok(w, 'Wukong waits at the pier once the alert is acknowledged');
  assert.equal(w.icon.art, 'boss-wukong-asia');
});

test('targets: with the Guard hired the pests are his job, event raiders stay on the list', () => {
  const g = freshGame();
  g.guard = { id:'guard', x:10, y:10, hp:10 };
  g.mobs.push({ id:1, x:300, y:400, hp:1, kind:0 }, { id:2, x:900, y:500, hp:1, kind:1, eventKey:'prisonBreak' });
  if (g.guardActive()) assert.deepEqual(enemyPointerTargets(g).map(t => t.id), ['mob:2']);
  else assert.equal(enemyPointerTargets(g).length, 2, 'guard not standing in this fixture: all listed');
});

// ---------- layout ----------
test('layout: an enemy inside the screen gets a head marker, never an arrow', () => {
  const { heads, arrows } = run([mob(1, 600, 300)]);       // screen (1300, 650)
  assert.equal(arrows.length, 0);
  assert.equal(heads.length, 1);
  assert.equal(heads[0].x, 600 * 2 + 100);
  assert.ok(heads[0].y < 300 * 2 + 50 - 78 * 2, 'above the head, not on the feet');
});

test('layout: pests carry a "press to fight" label already - their marker rides above it, not on it', () => {
  const g = freshGame();
  g.mobs.push({ id:1, x:600, y:300, hp:1, kind:0 });
  const [pest] = enemyPointerTargets(g);
  assert.equal(pest.lift, POINTER.tagLift);
  const plain = run([mob(1, 600, 300)]).heads[0], lifted = run([{ ...mob(1, 600, 300), lift:pest.lift }]).heads[0];
  assert.equal(plain.y - lifted.y, POINTER.tagLift);
});

test('layout: an enemy off the screen gets an arrow on the edge pointing straight at it', () => {
  const t = mob(1, 4000, 300);                              // far to the right, level with the hero
  const { heads, arrows } = run([t]);
  assert.equal(heads.length, 0);
  assert.equal(arrows.length, 1);
  const a = arrows[0], m = POINTER.badge / 2 + POINTER.tip + POINTER.edge;
  assert.ok(Math.abs(a.x - (VIEW.width - m)) < 1, 'glued to the right edge');
  assert.ok(Math.abs(a.angle) < 0.35, `points to the right (${a.angle})`);
  assert.equal(a.dist, Math.hypot(4000 - PLAYER.x, 0));
  assert.ok(a.x >= m && a.x <= VIEW.width - m && a.y >= m && a.y <= VIEW.height - m, 'inside the safe rectangle');
});

test('layout: the arrow aims at the target from where the badge really sits (diagonals too)', () => {
  for (const [x, y] of [[-3000, -2000], [4000, 2800], [-2500, 1200], [300, -3000]]) {
    const { arrows } = run([mob(1, x, y)]);
    const a = arrows[0], sx = x * 2 + 100, sy = y * 2 + 50 - 78;
    assert.ok(a, `arrow for ${x},${y}`);
    const want = Math.atan2(sy - a.y, sx - a.x);
    assert.ok(Math.abs(Math.atan2(Math.sin(a.angle - want), Math.cos(a.angle - want))) < 1e-6);
  }
});

test('layout: close enemies off the same edge merge into one badge with a count; far apart ones stay separate', () => {
  const near = run([mob(1, 4000, 300), mob(2, 4040, 330), mob(3, 4060, 280)]);
  assert.equal(near.arrows.length, 1);
  assert.equal(near.arrows[0].count, 3);
  assert.equal(near.arrows[0].members.length, 3);
  const apart = run([mob(1, 4000, 100), mob(2, -3000, 600), mob(3, 300, 4000)]);
  assert.equal(apart.arrows.length, 3);
  assert.ok(apart.arrows.every(a => a.count === 1));
});

test('layout: the more important enemy leads a merged badge; its distance is the nearest member', () => {
  const pest = mob(1, 3000, 300), boss = mob(2, 4000, 310, { kind:'frontier', priority:0, boss:true });
  const { arrows } = run([pest, boss]);
  assert.equal(arrows.length, 1);
  assert.equal(arrows[0].target.id, 'mob:2');
  assert.equal(arrows[0].id, 'mob:2');
  assert.equal(arrows[0].dist, Math.hypot(3000 - PLAYER.x, 0));
});

test('layout: badges slide along the edge to stay clear of HUD panels', () => {
  const hud = [1792 - 300, 100, 1792, 600];                  // a minimap-like card on the right edge
  const free = run([mob(1, 4000, 300)]).arrows[0];
  const blocked = run([mob(1, 4000, 300)], { blockers:[hud] }).arrows[0];
  const r = POINTER.badge / 2, box = a => [a.x - r, a.y - r, a.x + r, a.y + r];
  const hit = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  assert.ok(hit(box(free), hud), 'the fixture really covers the straight-line spot');
  assert.ok(!hit(box(blocked), hud), 'moved off the panel');
  const want = Math.atan2(300 * 2 + 50 - 78 - blocked.y, 4000 * 2 + 100 - blocked.x);
  assert.ok(Math.abs(blocked.angle - want) < 1e-6, 'still points at the enemy from the new spot');
});

test('layout: safe-area insets keep badges inside the notch / home bar', () => {
  const { arrows } = run([mob(1, -3000, 300), mob(2, 4000, 4000)], { safe:{ t:44, r:20, b:34, l:20 } });
  const m = POINTER.badge / 2 + POINTER.tip + POINTER.edge;
  for (const a of arrows) {
    assert.ok(a.x >= 20 + m - 1e-6 && a.x <= VIEW.width - 20 - m + 1e-6);
    assert.ok(a.y >= 44 + m - 1e-6 && a.y <= VIEW.height - 34 - m + 1e-6);
  }
});

test('layout: at most POINTER.maxArrows badges; nearer / more important enemies win', () => {
  const many = Array.from({ length: 12 }, (_, i) => mob(i, 4000, -2000 + i * 600, { priority:4 }));
  const { arrows } = run(many);
  assert.ok(arrows.length <= POINTER.maxArrows);
  assert.ok(arrows.length >= 2);
});

test('layout: a 390x844 phone keeps every badge on screen and 44px+ to touch', () => {
  const view = { width:390, height:844, sx:1.2, sy:1.2, tx:-200, ty:-300 };
  const { arrows } = layoutPointers([mob(1, 4000, 100), mob(2, -2000, 1500), mob(3, 100, -2000)], view, { player:PLAYER, charScale:1 });
  assert.ok(POINTER.badge >= 44);
  assert.ok(arrows.length >= 2);
  for (const a of arrows) assert.ok(a.x >= 0 && a.x <= 390 && a.y >= 0 && a.y <= 844, `${a.x},${a.y}`);
});

test('layout: a camera with no size gives nothing instead of crashing', () => {
  assert.deepEqual(layoutPointers([mob(1, 1, 1)], null), { heads:[], arrows:[] });
  assert.deepEqual(layoutPointers([mob(1, 1, 1)], { width:0, height:0, sx:1, sy:1, tx:0, ty:0 }), { heads:[], arrows:[] });
});

test('geometry helpers: perimeter parameter round-trips and the ray hits the rectangle edge', () => {
  const r = [10, 20, 210, 120];
  for (const s of [0, 50, 200, 250, 300, 420, 599]) {
    const p = perimeterPoint(r, s);
    assert.ok(Math.abs(perimeterParam(r, p) - s) < 1e-9, `s=${s}`);
  }
  const h = rayToRect(r, 1, 0);
  assert.deepEqual([h.x, h.y], [210, 70]);
  const d = rayToRect(r, 100, 100);
  assert.ok(Math.abs(d.y - 120) < 1e-9, 'a wide rectangle is hit through the bottom edge first');
});

test('distance text is rough: whole fives, never zero', () => {
  assert.equal(roughDistance(0), 5);
  assert.equal(roughDistance(1000), 50);
  assert.equal(roughDistance(1228), 60);
});

// ---------- wiring ----------
test('wiring: markup, stylesheet, frame loop, camera peek and both language entries are in place', () => {
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/enemy-pointers.css', import.meta.url), 'utf8');
  assert.match(html, /id="enemy-pointers"/);
  assert.match(html, /href="src\/enemy-pointers\.css\?v=[^"]+"/);
  assert.match(ui, /updateEnemyPointers\(now\)/, 'redrawn every frame so a defeated enemy loses its pointer at once');
  assert.match(ui, /mapCam\.peek/, 'pressing an arrow glances the camera at the enemy');
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(css, /filter:\s*(hue-rotate|sepia|saturate|brightness)/, 'art is never recoloured in code');
  assert.ok(!/__mapCam/.test(ui), 'no leftover debug handle');
  for (const k of ['pointer.dist', 'pointer.look']) { assert.ok(TH_DICT[k], `TH ${k}`); assert.ok(EN_DICT[k], `EN ${k}`); }
});
