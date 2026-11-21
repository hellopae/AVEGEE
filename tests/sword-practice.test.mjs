import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
import {STATIONS,ZONES} from '../src/data.js';
import {actorFromLegacy,syncRoster} from '../src/roster.js';
import {battleBackground} from '../src/battle-background.js';
import {wideStationRoom} from '../src/room-art-assets.js';

const makeGrove=g=>g.stations.push({def:STATIONS.find(s=>s.k==='dab'),slots:[],build:0,repair:0,fire:0});

test('sword practice requires a working Sword Grove and discards all battle spending and injuries',()=>{
  const g=createGame();g.stations=g.stations.filter(st=>st.def.k!=='dab');
  g.onChange=()=>{}; g.save=()=>true;
  assert.equal(g.startSwordPractice(),null);
  makeGrove(g);
  g.guard=actorFromLegacy({morale:73},'th','guard');syncRoster(g);
  Object.assign(g,{hp:42,mp:9,coin:91,karma:12});
  g.inventory.health=2;g.party.members=['taan'];
  const original={inventory:g.inventory,guard:g.guard,roster:g.roster,mp:g.mp,hp:g.hp,coin:g.coin,karma:g.karma,exp:g.exp,fights:g.fights};
  const drill=g.startSwordPractice();
  assert.ok(drill);
  assert.equal(g.startSwordPractice(),null);
  assert.ok(g.battleActors().some(a=>a.k==='guard'));
  assert.equal(drill.foes[0].sp,'sword-practice-dummy');
  g.guard.morale=10;
  g.inventory.health--;
  g.mp=2;g.coin=0;g.karma=100;
  drill.foes[0].hp=1;
  assert.equal(g.battleAct('atk'),true);
  assert.equal(drill.over,'win');
  g.endBattle();
  for (const [key,value] of Object.entries(original)) assert.equal(g[key],value,key);
  assert.equal(g.inventory.health,2);assert.equal(g.guard.morale,73);
  assert.equal(g.pendingReward,null);
  const again=g.startSwordPractice();again.over='lose';g.endBattle();
  assert.equal(g.pendingRecovery,null);
  assert.equal(g.hp,42);
});

test('the practice arena uses the currently open Sword Grove and every zone has a stand and approach',()=>{
  for(const zone of ZONES)
    assert.ok(wideStationRoom(zone.k,'dab').practice.approach.every(n=>n>0&&n<1));
  const {image}=wideStationRoom('th','dab');
  assert.equal(battleBackground('th',{kind:'practice',worldBackground:image},{}),image);
});
