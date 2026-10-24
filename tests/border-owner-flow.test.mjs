import test from 'node:test';import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';import {FRONTIER} from '../src/data.js';
import {initializeBossGuides,completeBossGuideStory} from '../src/boss-guides.js';
import {dungeonEnemyPositions,dungeonWalkable,dungeonPoint} from '../src/dungeon-view.js';
import {DUNGEON_PATROLS} from '../src/zone-travel.js';
import {workersPanelHtml} from '../src/worker-ui.js';
const game=()=>{const g=createGame();(g.zoneEvents.th||={}).frontierBreach='cleared';g.save=()=>true;g.onChange=()=>{};g.coin=10000;return g;};
const win=g=>{const b=g.battle;b.foes.forEach(f=>{f.hp=1;f.atk=[0,0];});assert.equal(g.battleAct('atk'),true);assert.equal(b.over,'win');g.endBattle();return b;};
test('ordinary frontier reward keeps its frontier backdrop and selected office team',()=>{
 const g=game();g.hire('boon');g.hireGuard();g.frontierOf().team=['taan','boon'];g.startFrontierBattle();
 assert.deepEqual(g.battleCrew().map(c=>c.k),['taan','boon']);assert.equal(g.guardActive(),true);const b=win(g);
 assert.ok(b.worldBackground);assert.equal(g.pendingReward.background,b.worldBackground);assert.match(g.pendingReward.background,/frontier/i);
});
test('accepted guide journey starts with three actual combatants and preserves outside-map reward scene',()=>{
 const g=game();g.bossCleared.th=true;initializeBossGuides(g);completeBossGuideStory(g,'boss-guide-th-welcome');
 Object.assign(g.player,{x:FRONTIER.x,y:FRONTIER.y});assert.equal(g.beginBorderDungeon('asia'),true);
 const patrol=DUNGEON_PATROLS[0],p=dungeonPoint(patrol.progress);g.zoneTravel.active.position={x:p[0],y:p[1]};assert.ok(g.startDungeonEncounter({patrol:patrol.id}));
 assert.equal(g.battle.expeditionParty,true);const actors=g.battleActors();assert.equal(actors.length,3);assert.ok(actors.some(c=>c.k==='nira'));assert.ok(actors.some(c=>c.k==='guide'));
 win(g);assert.equal(g.pendingReward.background,'img/frontier-route/zone1-2-v4.webp');
});
test('enemy patrols travel smoothly along the road without snapping back to an anchor',()=>{
 const g=game();g.bossCleared.th=true;Object.assign(g.player,{x:FRONTIER.x,y:FRONTIER.y});assert.equal(g.beginBorderDungeon('asia'),true);
 let previous=null,first=null,maxTravel=0;
 for(let t=0;t<=30000;t+=32){const enemies=dungeonEnemyPositions(g,t);if(!first)first=enemies;
  for(let i=0;i<enemies.length;i++){assert.equal(dungeonWalkable(enemies[i].position,'th:asia'),true);if(previous)assert.ok(Math.hypot(enemies[i].position[0]-previous[i].position[0],enemies[i].position[1]-previous[i].position[1])<.001);maxTravel=Math.max(maxTravel,Math.hypot(enemies[i].position[0]-first[i].position[0],enemies[i].position[1]-first[i].position[1]));}previous=enemies;
 }
 assert.ok(maxTravel>.015,'patrols actually traverse a visible stretch of road');
});
test('worker office explains empty supplies and offers actual paid or inventory refill paths',()=>{
 const g=game();g.food=0;g.inventory.food=1;const w=g.hireWorker();g.setWorkerMode(w.id,'escort');
 const html=workersPanelHtml(g);assert.match(html,/เสบียงกลางหมด/);assert.match(html,/data-worker-buy-food/);assert.match(html,/data-worker-share-food/);assert.match(html,/รอเสบียง/);
 const coin=g.coin;assert.equal(g.buy('food',1),true);assert.equal(g.food,10);assert.equal(g.coin,coin-10);assert.equal(g.giveOnigiriNira(),true);assert.equal(g.food,22);assert.equal(g.inventory.food,undefined);
 assert.doesNotMatch(workersPanelHtml(g),/เสบียงกลางหมด/);assert.match(workersPanelHtml(g),/รอวิญญาณหรืองานสร้าง/);
});
