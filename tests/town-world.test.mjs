import { harbourTravel } from './helpers/travel.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

// This suite exercises declarative city navigation; image silhouettes have their
// own tests. A missing image must not attempt network access during a save test.
globalThis.Image = class { set src(value) { this._src=value; } get src() { return this._src; } };
globalThis.fetch = async () => ({ ok:false });
const storage = new Map();
Object.defineProperty(globalThis,'localStorage',{ configurable:true,value:{
  getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),
  removeItem:key=>storage.delete(key),
} });

const { createGame } = await import('../src/game.js');
const { SCENE,SPOTS,STATIONS,CREW,FRONTIER,MERCHANT,GUARD_POST,ZONES,MAP_BUILDING_SCALE } = await import('../src/data.js');
const { TOWN_SIZE,TOWN_STATION_SITES,TOWN_SPOTS,TOWN_CREW,TOWN_HOUSES } = await import('../src/town-layout.js');
const { canWalk,findPath,resetWalk,setBlocks,setNpcDiscs } = await import('../src/walk.js');
const clone = value => structuredClone(value);

test('new game starts in the large city with city station and NPC anchors',()=>{
  // Restarting while a branch is active must also rebuild city actor homes.
  const previous=createGame();previous.bossCleared.th=true;harbourTravel(previous, 'asia');
  const g=createGame();
  assert.equal(g.zone,'th');
  assert.deepEqual(SCENE,TOWN_SIZE);
  assert.deepEqual([g.player.x,g.player.y],[TOWN_SPOTS.bench.x+60,TOWN_SPOTS.bench.y]);
  for(const [key,site] of Object.entries(TOWN_STATION_SITES)) {
    const def=STATIONS.find(s=>s.k===key);
    assert.deepEqual([def.x,def.y,def.bx,def.by],[site.x,site.y,site.bx,site.by],key);
  }
  for(const [key,home] of Object.entries(TOWN_CREW)) {
    const def=CREW.find(c=>c.k===key);
    assert.deepEqual([def.hx,def.hy],home,key);
  }
  for(const actor of g.crew)assert.deepEqual([actor.hx,actor.hy],TOWN_CREW[actor.k],actor.k+' live home');
  assert.equal(g.snapshot().townMapVersion,2);
});

test('old city save preserves progress and migrates positions only once',()=>{
  const source=createGame();
  source.coin=987;source.inventory={tea:3,health:2,emberWood:6};
  source.storySeen={'west-hypnosis':true};source.storyQueue=[{key:'th',stage:'comic'}];
  const extra=STATIONS.find(s=>s.k==='tea');
  source.stations.push({...clone(source.stations[0]),def:extra,slots:[],speedLv:2,capLv:1});
  const old=clone(source.snapshot());
  delete old.townMapVersion;delete old.zoneTravel;
  old.player={...old.player,x:880,y:455,tx:1000,ty:500,path:[[1000,500]]};
  for(const c of old.crew) {c.x=820;c.y=400;}
  for(const c of Object.values(old.roster||{})) if(c.homeZone==='th') {c.x=820;c.y=400;}
  const savedStations=old.stations.map(s=>({k:s.k,speedLv:s.speedLv,capLv:s.capLv}));
  const restored=createGame();
  assert.equal(restored.restore(old),true);
  assert.equal(restored.coin,987);
  assert.deepEqual(restored.inventory,old.inventory);
  assert.deepEqual(restored.storySeen,old.storySeen);
  assert.deepEqual(restored.storyQueue,old.storyQueue);
  assert.deepEqual(restored.stations.map(s=>({k:s.def.k,speedLv:s.speedLv,capLv:s.capLv})),savedStations);
  assert.deepEqual([restored.player.x,restored.player.y],[TOWN_SPOTS.bench.x+60,TOWN_SPOTS.bench.y]);
  assert.equal(restored.player.path,null,'obsolete route is discarded');
  const nira=restored.crewOf('nira');
  assert.deepEqual([nira.hx,nira.hy],TOWN_CREW.nira);
  assert.ok(nira.x==null||nira.x!==820||nira.y!==400,'NPC old coordinate is discarded');

  // A subsequent save reload must keep the player's new district location.
  restored.player.x=900;restored.player.y=1200;restored.player.path=null;
  const migrated=clone(restored.snapshot());
  assert.equal(migrated.townMapVersion,2);
  const again=createGame();
  assert.equal(again.restore(migrated),true);
  assert.deepEqual([again.player.x,again.player.y],[900,1200]);
  assert.equal(again.coin,987);
  assert.deepEqual(again.inventory,old.inventory);
});

test('travel restores legacy branch geometry and returns to the city without moving other zones',()=>{
  const g=createGame();
  for(const z of ZONES)g.bossCleared[z.k]=true;
  const cityBuildings=g.stations.map(s=>s.def.k);
  for(const zone of ['asia','west','cyberhell']) {
    assert.equal(harbourTravel(g, zone),true);
    assert.deepEqual(SCENE,{w:1678,h:937},zone+' keeps its original world');
    assert.deepEqual(SPOTS.bench,{x:820,y:455});
    assert.deepEqual(SPOTS.throne,{x:836,y:447});
    assert.deepEqual(SPOTS.bossPier,{x:1390,y:690});
    assert.deepEqual(SPOTS.ferry,{from:[470,682],to:[1380,682]});
    const sala=STATIONS.find(s=>s.k==='sala');
    assert.deepEqual([sala.x,sala.y,sala.bx,sala.by,sala.bw],[1477,299,1477,309,196*MAP_BUILDING_SCALE]);
    const lan=STATIONS.find(s=>s.k==='lan');
    assert.deepEqual([lan.x,lan.y,lan.bx,lan.by],[455,605,460,590],zone+' retains reachable M2 quarry site');
    const sawan=STATIONS.find(s=>s.k==='sawan');
    assert.deepEqual([sawan.x,sawan.y,sawan.bx,sawan.by],[792,346,752,336]);
    assert.deepEqual([FRONTIER.x,FRONTIER.y],[835,840]);
    assert.deepEqual(GUARD_POST,[720,890]);
    assert.equal(harbourTravel(g, 'th'),true);
    assert.deepEqual(SCENE,TOWN_SIZE);
    assert.deepEqual(SPOTS.bench,TOWN_SPOTS.bench);
    assert.deepEqual(SPOTS.ferry,TOWN_SPOTS.ferry);
    assert.deepEqual(g.stations.map(s=>s.def.k),cityBuildings,'branch buildings retained');
    for(const [key,site] of Object.entries(TOWN_STATION_SITES)) {
      const def=STATIONS.find(s=>s.k===key);
      assert.deepEqual([def.x,def.y,def.bx,def.by],[site.x,site.y,site.bx,site.by],key+' returns to city');
    }
  }
});

test('loading an old save in another branch migrates its stored city without relocating the active branch',()=>{
  const source=createGame();source.bossCleared.th=true;
  source.zoneEvents.th={thBorderBoss:'cleared'};
  const cityBuildings=source.stations.map(s=>s.def.k);
  assert.equal(harbourTravel(source, 'asia'),true);
  source.player.x=880;source.player.y=455;source.player.path=null;
  const old=clone(source.snapshot());delete old.townMapVersion;delete old.zoneTravel;
  for(const actor of Object.values(old.roster))if(actor.homeZone==='th') {actor.x=463;actor.y=443;}
  const restored=createGame();assert.equal(restored.restore(old),true);
  assert.equal(restored.zone,'asia');
  assert.deepEqual(SCENE,{w:1678,h:937});
  assert.deepEqual([restored.player.x,restored.player.y],[880,455]);
  const nira=restored.crewOf('nira'),branchHome=CREW.find(c=>c.k==='nira');
  assert.deepEqual([nira.hx,nira.hy],[branchHome.hx,branchHome.hy],'following Nira keeps active branch home');
  assert.equal(harbourTravel(restored, 'th'),true);
  assert.deepEqual(SCENE,TOWN_SIZE);
  assert.deepEqual(restored.stations.map(s=>s.def.k),cityBuildings);
  for(const c of restored.crew)assert.deepEqual([c.hx,c.hy],TOWN_CREW[c.k],c.k+' restored city home');
});

test('city routes reach every plot, built doorway, merchant and frontier through walkable ground',()=>{
  for(const built of [false,true]) {
    const g=createGame();
    if(built)g.stations=STATIONS.map(def=>({def,build:0,slots:[],fire:0,intensity:3}));
    resetWalk();setBlocks([],[]);setNpcDiscs([]);g.syncBlocks(true);
    const start=[SPOTS.bench.x,SPOTS.bench.y];
    const targets=[...STATIONS,MERCHANT,FRONTIER];
    for(const d of targets) {
      const label=`${built?'built':'initial'}/${d.k||'merchant'}`;
      assert.equal(canWalk(d.x,d.y),true,label+' door walkable');
      const path=findPath(...start,d.x,d.y);
      assert.deepEqual(path?.at(-1),[d.x,d.y],label+' reaches exact door');
      let from=start;
      for(const to of path) {
        const n=Math.max(1,Math.ceil(Math.hypot(to[0]-from[0],to[1]-from[1])/4));
        for(let i=1;i<=n;i++) {
          const x=from[0]+(to[0]-from[0])*i/n,y=from[1]+(to[1]-from[1])*i/n;
          assert.equal(canWalk(x,y),true,`${label} route avoids blocked ground at ${x},${y}, segment ${from} → ${to}`);
        }
        from=to;
      }
    }
    for(const [x1,y1,x2,y2] of TOWN_HOUSES)
      assert.equal(canWalk((x1+x2)/2,(y1+y2)/2),false,'housing remains solid');
    assert.equal(canWalk(900,2400),false,'river remains blocked outside frontier');
  }
});

test('city exploration retains previous-boss gates for zone travel',()=>{
  const g=createGame();g.level=5;
  assert.equal(g.canMoveZone('th'),true);
  assert.equal(g.canMoveZone('asia'),false);
  assert.equal(g.canMoveZone('west'),false);
  assert.equal(g.canMoveZone('cyberhell'),false);
  assert.equal(g.moveZone('asia'),false,'large city does not bypass boss gate');
  g.bossCleared.th=true;
  assert.equal(g.canMoveZone('asia'),true);
  assert.equal(g.canMoveZone('west'),false);
  g.bossCleared.asia=true;
  assert.equal(g.canMoveZone('west'),true);
  assert.equal(g.canMoveZone('cyberhell'),false);
  g.bossCleared.west=true;
  assert.equal(g.canMoveZone('cyberhell'),true);
});
