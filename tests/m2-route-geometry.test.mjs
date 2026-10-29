// M2 R1: route geometry table. Zone 1-2 must behave exactly as before; the new routes are data until switched on.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTE_GEOMETRY, isWildernessRoute, routeBossCave, enableRoute, disableRoute } from '../src/route-geometry.js';
import { dungeonPatrols, DUNGEON_PATROLS, beginDungeon, nextDungeonEncounter, resolveDungeonEncounter, initializeZoneTravel, dungeonStatus, openDungeonRoutes } from '../src/zone-travel.js';
import { DUNGEON_CORRIDOR, DUNGEON_PROGRESS, DUNGEON_CHECKPOINTS, dungeonCheckpointProgress, dungeonPoint, dungeonWalkable, dungeonRouteTotal,
  dungeonGuideAnchor, dungeonEnemyPositions } from '../src/dungeon-view.js?v=l5';
import { dungeonBackground } from '../src/dungeon-art.js';

const game = () => { const g = { zone:'th', bossCleared:{}, zoneSave:{}, zoneEvents:{} }; initializeZoneTravel(g); return g; };

test('Zone 1-2 preserves story anchors and uses owner mask/tree layout', () => {
  assert.equal(DUNGEON_CORRIDOR.length, 31);
  assert.deepEqual(DUNGEON_CORRIDOR[0], [.12,.22]); assert.deepEqual(DUNGEON_CORRIDOR[30], [.91,.79]);
  const r = ROUTE_GEOMETRY['th:asia'];
  assert.deepEqual([...r.checkpointVertex], [7,15,23]);
  assert.deepEqual(r.pads.map(p => [...p]), [[.12,.22,.052,.036],[.26,.33,.062,.035],[.42,.43,.042,.028],[.53,.75,.085,.042],[.91,.79,.042,.033]]);
  assert.deepEqual([...r.patrolProgress], [.08,.19,.32,.48,.66,.90]);
  assert.deepEqual(DUNGEON_PATROLS.map(p => [p.id, p.progress, p.foe, p.level, p.name]),
    [0,1,2,3,4,5].map(i => [`th:asia:patrol:${i}`, [.08,.19,.32,.48,.66,.90][i], [2,3,2,5,3,5][i], 1 + Math.floor(i / 2), 'ปีศาจลาดตระเวน']));
  assert.deepEqual(dungeonPatrols('th:asia'), DUNGEON_PATROLS);
  assert.equal(dungeonBackground('th', 'th:asia', 1), 'img/frontier-route/zone1-2-v6.webp');
  assert.equal(r.ambient.trees.length, 80); assert.equal(r.ambient.waterfalls.length, 6);
  // checkpoints sit on the trail at vertices 7 / 15 / 23 (the cave is the third)
  assert.deepEqual(DUNGEON_CHECKPOINTS.map(p => p.map(v => +v.toFixed(2))), [[.42,.43],[.79,.50],[.53,.75]]);
  assert.deepEqual(dungeonCheckpointProgress('th:asia'), DUNGEON_PROGRESS);
  assert.deepEqual(r.bossCave, { zone:'th', checkpoint:2, eventKey:'thBorderBoss', breachKey:'frontierBreach', guide:[.055,.01], interactReach:.065 });
  assert.deepEqual(routeBossCave('th:asia'), r.bossCave);
  assert.equal(dungeonWalkable([.12,.22], 'th:asia'), true); assert.equal(dungeonWalkable([.53,.78], 'th:asia'), true); assert.equal(dungeonWalkable([.5,.1], 'th:asia'), false);
});

test('route 3-4 uses its independent owner floor and ordinary checkpoints', () => {
  const id='west:cyberhell',r=ROUTE_GEOMETRY[id];
  assert.equal(isWildernessRoute(id),true);assert.equal(routeBossCave(id),null);assert.equal(r.captainCave,null);
  assert.equal(dungeonPatrols(id).length,6);
  assert.deepEqual(dungeonPoint(0,id),r.corridor[0]);
  assert.equal(dungeonBackground('west',id,2),'img/frontier-route/zone3-4-v1.webp');
});

test('owner-fitted route 2-3 has its own picture and patrols, with ordinary checkpoint fights', () => {
  const id='asia:west', r=ROUTE_GEOMETRY[id];
  assert.equal(isWildernessRoute(id),true); assert.equal(routeBossCave(id),null);
  assert.equal(dungeonBackground('asia',id,1),'img/frontier-route/zone2-3-v3-cave.png');
  assert.deepEqual(dungeonPoint(0,id),r.corridor[0]);
  assert.ok(dungeonPoint(1,id).every((n,i)=>Math.abs(n-r.corridor.at(-1)[i])<1e-12));
  const p=dungeonPatrols(id);
  assert.deepEqual(p.map(x=>[x.id,x.progress,x.foe]),[0,1,2,3,4,5].map(i=>[`asia:west:patrol:${i}`,[.08,.19,.32,.48,.66,.90][i],[6,7,6,9,7,9][i]]));
  const g=game();g.zone='asia';g.bossCleared.asia=true;assert.equal(beginDungeon(g,'west'),true);
  const wins=[];for(let i=0;i<3;i++){const e=nextDungeonEncounter(g);wins.push([e.kindIdx,e.boss]);assert.equal(resolveDungeonEncounter(g,e.token,true),true);}
  assert.deepEqual(wins,[[6,false],[7,false],[9,false]]);assert.equal(dungeonStatus(g).ready,true);
  const g2=game();g2.zone='asia';g2.bossCleared.asia=true;beginDungeon(g2,'west');
  const en=dungeonEnemyPositions(g2,0);assert.equal(en.length,9);assert.equal(en.some(e=>e.boss||e.locked),false);
});

test('Zone 1-2 cave rules still come from its row: boss at checkpoint 2, locked until checkpoint 1 is won and the boss event is pending', () => {
  const g = game(); g.bossCleared.th = false; g.zoneEvents.th = { frontierBreach:'cleared' };
  assert.equal(openDungeonRoutes(g).some(r => r.id === 'th:asia'), true, 'opens early after the breach');
  assert.equal(beginDungeon(g, 'asia'), true);
  const en = dungeonEnemyPositions(g, 0).filter(e => e.checkpoint !== undefined);
  assert.deepEqual(en.map(e => [e.checkpoint, e.boss, e.locked]), [[0,false,false],[1,false,false],[2,true,true]]);
  assert.equal(nextDungeonEncounter(g, 2), null, 'cave fight is closed while checkpoint 0 is open');
  g.zoneEvents.th.thBorderBoss = 'pending';
  for (let i = 0; i < 2; i++) { const e = nextDungeonEncounter(g); resolveDungeonEncounter(g, e.token, true); }
  const cave = nextDungeonEncounter(g); assert.equal(cave.boss, true);
  assert.equal(resolveDungeonEncounter(g, cave.token, true), false, 'a boss checkpoint cannot be won as an ordinary fight');
  const anchor = dungeonGuideAnchor(g), c = dungeonPoint(DUNGEON_PROGRESS[2]);
  assert.ok(Math.abs(anchor[0] - (c[0] + .055)) < 1e-12 && Math.abs(anchor[1] - (c[1] + .01)) < 1e-12);
});
