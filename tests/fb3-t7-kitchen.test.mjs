// FB3-T7 (26 Nov 2026) - the self-feeding kitchen (MP10), Dam and the workers inside the canteen (MN5), the rock slope (MP4), the hop onto the cushion / bed (MP5),
// the foreman's pictures of Zones 2-4 (O1) and the import-map completeness (hand-over 7).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { STATIONS, GUARD_POST, BAL } from '../src/data.js';
import { KITCHEN, canteenActive, canteenPoint, canteenState, stepCanteen, cookProgress, kitchenSpot } from '../src/canteen.js';
import { hireWorker, zoneWorkers, stepWorkers, advanceWorkers, setWorkerMode, normalizeWorkers, damCarryAssets, damSuperviseKey } from '../src/workers.js';
import { deskPoint } from '../src/foreman.js';
import { townFloorAt, townOwnerBlocked, TOWN_OWNER_BLOCKS } from '../src/town-layout.js';
import { artUrl } from '../src/art.js';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(v) {} };
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const game = () => { const g = createGame(); g.save = () => true; g.onChange = () => {}; g.coin = 100000; return g; };
function kitchen({ cook = true, serve = true } = {}) {
  const g = game(); g.level = 5; g.bossCleared.th = true; g.zoneEvents.th = { frontierBreach:'cleared' };
  assert.ok(g.hire('dam')); assert.ok(g.build('canteen')); const st = g.stations.find(s => s.def.k === 'canteen'); st.build = 0; st.buildWait = false;
  g.crewOf('taan').buildK = null; g.crewOf('dam').buildK = null;
  const c = cook && hireWorker(g, 'cook'), s = serve && hireWorker(g, 'serve');
  if (c) { const at = canteenPoint(g); c.x = at[0]; c.y = at[1]; }   // he has walked to the stall
  return { g, st, cook:c, serve:s };
}
/** run the real loops for `ms` of game time: movement / kitchen every 50 ms frame, the work tick (wage, upkeep - game.js step()) once per BAL.tickMs */
function run(g, ms) { let acc = 0; for (let t = 0; t < ms; t += 50) { acc += 50; if (acc >= BAL.tickMs) { acc -= BAL.tickMs; stepWorkers(g); } advanceWorkers(g, 50); stepCanteen(g, 50); } }

test('MP10: a cook on duty makes rice balls into the pantry by himself - no merchant, no workers resting at 0 rice', () => {
  const { g, cook } = kitchen({ serve:false }); g.food = 0; const coin = g.coin;
  run(g, 4000); assert.equal(g.food, 0, 'not yet: a batch takes cookMs'); assert.ok(cookProgress(g, cook) > .3 && cookProgress(g, cook) < 1, 'the bar over his head moves');
  run(g, KITCHEN.cookMs); assert.equal(g.food + canteenState(g).meals, KITCHEN.batch, 'one batch made (pantry + the shelf it fills)'); assert.equal(g.coin, coin - KITCHEN.coinPerBatch, 'costs the ingredients, once');
  assert.equal(cook.supplyRest, false); assert.notEqual(cook.reason, 'รอเสบียง');
  run(g, KITCHEN.cookMs * 30); assert.ok(g.food >= KITCHEN.pantryCap - KITCHEN.batch && g.food <= KITCHEN.pantryCap, `stops at the cap (${g.food})`);   // the wage (workers.js) is paid from coins as before
  assert.equal(g.workerState.ledger.cooked > 0, true);
  const cooked = g.workerState.ledger.cooked; run(g, KITCHEN.cookMs * 3); assert.equal(g.workerState.ledger.cooked, cooked, 'a full pantry makes (and buys) nothing more');
});

test('MP10: the ready shelf fills from the pantry (old rule), and a broke cook waits instead of looping or going negative', () => {
  const { g, cook } = kitchen({ serve:false }); g.food = 10; run(g, KITCHEN.mealMs * 3 + 200); assert.ok(canteenState(g).meals >= 2, `shelf ${canteenState(g).meals} food ${g.food} job ${JSON.stringify(cook.job)} funded ${cook.funded} arrived ${cook.arrived}`);
  const poor = kitchen({ serve:false }); poor.g.food = 0; poor.g.coin = 0; run(poor.g, KITCHEN.cookMs * 3); assert.equal(poor.g.food, 0); assert.equal(poor.g.coin, 0); assert.match(poor.cook.reason, /เบี้ย|ค่าจ้าง/);
});

test('MP10: a server walks the rice from the shelf to a hungry reaper by himself - the player never buys rice for the workers to keep going', () => {
  const { g, serve } = kitchen(); g.food = 0;
  const plerng = (g.coin = 5000, g.hire('plerng'), g.crewOf('plerng')); plerng.hunger = 20; plerng.morale = 40;
  run(g, 60000);
  assert.ok(g.food > 0 || canteenState(g).served > 0, 'the cook made rice (pantry / served)');
  assert.ok(plerng.hunger > 20 || canteenState(g).served > 0, `the reaper was fed (hunger ${plerng.hunger}, served ${canteenState(g).served})`);
  assert.ok(!zoneWorkers(g).some(w => w.supplyRest && w.mode === 'cook'), 'the cook never rests for lack of rice');
});

test('MP10 (old saves): saves with / without a canteen, with / without a cook load; a saved cook job keeps working; the numbers sit in one constant', () => {
  const none = game(); const snap = JSON.parse(JSON.stringify(none.snapshot())); const old = game(); old.restore(snap); assert.equal(canteenActive(old), false); run(old, 2000);
  const { g } = kitchen(); const s2 = JSON.parse(JSON.stringify(g.snapshot())); const h = game(); h.restore(s2); assert.equal(zoneWorkers(h).length, 2); h.food = 0; run(h, KITCHEN.cookMs + 3000); assert.ok(h.food > 0 || h.coin < 100000, 'the restored cook cooks');
  const legacy = normalizeWorkers({ workers:[{ id:'worker:1', homeZone:'th', mode:'cook', job:{ kind:'cook', ms:1000 } }] }); assert.equal(legacy.workers[0].job.prep, 0);
  assert.ok(Object.isFrozen(KITCHEN) && KITCHEN.cookMs > 0 && KITCHEN.batch > 0 && KITCHEN.pantryCap >= KITCHEN.batch && KITCHEN.coinPerBatch < KITCHEN.batch * 2, 'a ball costs less than the merchant\'s price (1 coin)');
  assert.ok(!/g\.buy\('food',1\)/.test(src('src/workers.js')), 'the "buy 10 for the cook" is gone');
});

test('MN5: no "go and talk to Dam" button; Dam and the idle workers stand INSIDE the stall (map) and on the room floor (canteen room)', () => {
  const ui = src('src/ui.js'); assert.ok(!/data-open-foreman|foreman\.canteen\.go/.test(ui.slice(ui.indexOf("if(k==='canteen')"), ui.indexOf("if(k==='canteen')") + 900)), 'button removed');
  const { g, st } = kitchen(); const d = st.def, inside = (p) => Math.abs(p[0] - d.bx) <= d.bw * .6 && p[1] <= d.by + .2 * d.bw && p[1] >= d.by - .3 * d.bw;
  assert.ok(inside(canteenPoint(g)), `kitchen spot inside the stall ${canteenPoint(g)}`); assert.ok(inside(deskPoint(g)), `Dam's place ${deskPoint(g)}`);
  for (let i = 0; i < 6; i++) { const p = kitchenSpot(g, i); assert.ok(p && townFloorAt(p[0], p[1]), `spot ${i} is walkable ${p}`); }
  assert.notDeepEqual(kitchenSpot(g, 0), kitchenSpot(g, 1)); 
  const room = src('src/room.js'); assert.match(room, /ROOM_CANTEEN_SPOTS/); assert.match(room, /foremanPhase\(g\)==='canteen'/);
  assert.match(src('src/worker-ui.js'), /KITCHEN\.coinPerBatch/);
});

test('MP4: the red-bush slope and the rock ledge of the owner\'s map5 are not floor; the stair lane and the bridge stay open', () => {
  assert.ok(TOWN_OWNER_BLOCKS.th.length === 2);
  for (const [x, y] of [[1147, 969], [1200, 930], [1280, 930], [1330, 940], [1360, 1060]]) assert.equal(townOwnerBlocked(x, y, 'th'), true, `${x},${y} blocked`);
  for (const [x, y] of [[1243, 1064], [1100, 1030], [1000, 1000], [900, 960], [1300, 1010]]) assert.equal(townOwnerBlocked(x, y, 'th'), false, `${x},${y} open`);
  assert.equal(townOwnerBlocked(1147, 969, 'asia'), false, 'Zone 1 only');
});

test('MP5: sit / sleep hop (a short arc, 560 ms) instead of teleporting; no floor shadow under the seated pose; a press in the air is ignored', () => {
  const room = src('src/room.js');
  assert.match(room, /const JUMP_MS = 560/); assert.match(room, /startJump\(room\.act, 'sit'\)/); assert.match(room, /startJump\(room\.bed, 'sleep'\)/);
  assert.ok(!/sitting = true; sipAt = performance\.now\(\) \+ 1800; sipping = false;\n      P\.x = room\.act/.test(room), 'no teleport onto the cushion');
  assert.match(room, /if \(jump\) return true;/); assert.match(room, /if \(locked \|\| sitting \|\| lying \|\| jump\) return;/);
  assert.match(room, /P\.face, false, null, !sitting\);/, 'seated = no contact shadow');
  assert.match(room, /ctx\.save\(\); drawContactShadow\(ctx, px\(x\), py\(y\), U \* HERO_H \* \(1 - \.3 \* lift\)\); ctx\.restore\(\);/, 'the hop keeps its shadow on the floor');
  assert.match(src('src/art.js'), /shadow = true\) \{/);
  assert.match(room, /if \(!emergency\) \{ startJump\(room\.bed, 'sleep'\); return true; \}/, 'the defeat wake-up still lies down at once');
});

test('O1: the foreman of Zones 2-4 has his strips and kitchen picture bound by name; a missing file draws nothing (the old marker stays)', () => {
  assert.deepEqual(damCarryAssets('th', 'walk'), { image:'img/crew-dam-carry-walk-v1.webp', metadata:'img/crew-dam-carry-walk-v1.json' });
  assert.deepEqual(damCarryAssets('asia', 'rice'), { image:'img/Asia/crew-dam-asia-carry-rice-v1.webp', metadata:'img/Asia/crew-dam-asia-carry-rice-v1.json' });
  assert.deepEqual(damCarryAssets('west', 'walk'), { image:'img/West/crew-dam-west-carry-walk-v1.webp', metadata:'img/West/crew-dam-west-carry-walk-v1.json' });
  assert.deepEqual(damCarryAssets('cyberhell', 'walk'), { image:'img/CyberHell/crew-dam-cyberhell-carry-walk-v1.webp', metadata:'img/CyberHell/crew-dam-cyberhell-carry-walk-v1.json' });
  assert.equal(damCarryAssets('nowhere', 'walk'), null);
  assert.equal(damSuperviseKey('th'), 'crew-dam-supervise-v1'); assert.equal(damSuperviseKey('west'), 'crew-dam-west-supervise-v1');
  assert.equal(artUrl('crew-dam-asia-supervise-v1'), 'img/Asia/crew-dam-asia-supervise-v1.webp'); assert.equal(artUrl('crew-dam-cyberhell-supervise-v1'), 'img/CyberHell/crew-dam-cyberhell-supervise-v1.webp');
  const scene = src('src/scene.js'); assert.match(scene, /damCarryReady\(g\.zone, damCarry\)/); assert.match(scene, /damSuperviseKey\(g\.zone\)/);
  assert.ok(!/g\.zone === 'th' && c\.fmCarry/.test(scene), 'no longer Zone 1 only');
});

test('hand-over 7: every module of src/ that another module imports has an import-map entry with a nonempty ?v= (so a changed file is never served stale)', () => {
  const html = src('index.html'), map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  const keys = new Set(Object.keys(map).map(k => k.split('?')[0]));
  const walk = d => readdirSync(new URL('../' + d, import.meta.url)).flatMap(n => { const p = d + '/' + n; return statSync(new URL('../' + p, import.meta.url)).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []; });
  const missing = new Set();
  for (const f of walk('src')) {
    const dir = f.split('/').slice(0, -1);
    for (const m of src(f).matchAll(/(?:from|import\s*\()\s*['"](\.{1,2}\/[^'"]+?\.js)(?:\?[^'"]*)?['"]/g)) {
      const parts = [...dir]; for (const seg of m[1].split('/')) { if (seg === '..') parts.pop(); else if (seg !== '.') parts.push(seg); }
      const key = './' + parts.join('/'); if (!keys.has(key)) missing.add(key);
    }
  }
  // the web worker file is loaded by `new Worker(...)`, not by the import map
  missing.delete('./src/terrain-bake-worker.js');
  assert.deepEqual([...missing].sort(), [], 'imported modules without an import-map entry');
  for (const f of ['z1-events.js', 'city-fire.js', 'liberation-text.js']) { const e = Object.entries(map).filter(([k]) => k.split('?')[0] === './src/' + f); assert.ok(e.length && e.every(([, v]) => /[?]v=[\w.-]+$/.test(v)), f); }
});
