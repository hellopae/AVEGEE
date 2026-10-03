import test from 'node:test';
import assert from 'node:assert/strict';
import { INTERACTION_REACH, nearestInteraction, mapInteractions, ROOM_EXITS, roomExit, nearRoomExit } from '../src/proximity.js';
globalThis.Image = class { set src(v) {} };
const { createGame, loadSave } = await import('../src/game.js');
const { ROOMS, ZONES, STATIONS, MERCHANT } = await import('../src/data.js');

test('nearest action uses one inclusive radius, disappears out of range and handles ties', () => {
  const origin = {x:0, y:0};
  const a = {id:'nira', x:INTERACTION_REACH, y:0};
  const b = {id:'merchant', x:20, y:0};
  const c = {id:'station', x:0, y:10};
  assert.equal(nearestInteraction(origin, [a]), a);
  assert.equal(nearestInteraction({x:-.01,y:0}, [a]), null);
  assert.equal(nearestInteraction(origin, [a,b,c]), c);
  assert.equal(nearestInteraction(origin, [b, {...b,id:'tie'}]), b);
  assert.equal(nearestInteraction(origin, []), null);
});

test('every room/zone gets a reachable entrance exit; config overrides distance', () => {
  for (const [key, base] of Object.entries(ROOMS)) for (const zone of ZONES) {
    const room = zone.k === 'th' && base.ui4 ? {...base,...base.ui4} : {...base,...base.zones?.[zone.k]};
    const exit = roomExit(key, zone.k, room);
    assert.ok(nearRoomExit(room.me, exit), `${key}/${zone.k}: entrance`);
    assert.ok(!nearRoomExit([exit.x,exit.y-.2],exit), `${key}/${zone.k}: away`);
  }
  ROOM_EXITS.ngiw = {asia:{x:.2,y:.9,reach:.05}};
  const exit = roomExit('ngiw','asia',ROOMS.ngiw);
  assert.ok(nearRoomExit([.23,.9],exit));
  assert.ok(!nearRoomExit([.26,.9],exit));
  delete ROOM_EXITS.ngiw;
});

test('repair targets cover zones, call actual builder and preserve special station actions', () => {
  for (const zone of ZONES) {
    const g = createGame(); g.zone = zone.k;
    const def = STATIONS.find(s => s.k === 'ngiw');
    g.stations = [{def,fire:1,build:null,repair:null}];
    g.mobs = []; g.availableBuilder = () => ({name:'ทัณฑ์'});
    const target = mapInteractions(g,MERCHANT).find(t => t.key === 'ngiw');
    assert.equal(target.kind,'repair');
    assert.equal(nearestInteraction({x:def.x,y:def.y},[target]),target);
    assert.equal(nearestInteraction({x:def.x+101,y:def.y},[target]),null);
    assert.ok(g.repairStation('ngiw'));
    assert.ok(g.stations[0].repairWait);
    assert.equal(mapInteractions(g,MERCHANT).find(t=>t.key==='ngiw').kind,'station');
    for (const key of ['tarang','sawan']) {
      g.stations = [{def:STATIONS.find(s=>s.k===key),fire:1}];
      assert.equal(mapInteractions(g,MERCHANT).find(t=>t.key===key).kind,'station');
    }
  }
});

test('old saved crew training survives load', () => {
  const g = createGame(); g.crew[0].upLv = 3;
  const storage = new Map();
  globalThis.localStorage = {setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k),removeItem:k=>storage.delete(k)};
  g.save();
  const restored = loadSave();
  assert.ok(restored); assert.equal(restored.crew[0].upLv,3);
});

test('all three map actions share the radius and follow moving Nira', () => {
  const nira = {x:10,y:20};
  const g = {crewOf:()=>nira,zoneCaptivesFree:()=>true,stations:[
    {def:{k:'tea',x:400,y:20,bx:400,by:20,bw:80},fire:0}],availableBuilder:()=>null};
  const merchant = {x:220,y:20};
  const targets = mapInteractions(g,merchant);
  assert.deepEqual(targets.map(t=>t.kind),['nira','merchant','station']);
  for (const target of targets) {
    assert.equal(nearestInteraction({x:target.x+100,y:target.y},[target]),target);
    assert.equal(nearestInteraction({x:target.x+100.1,y:target.y},[target]),null);
  }
  nira.x = 700;
  assert.equal(mapInteractions(g,merchant)[0].x,700);
  g.zoneCaptivesFree = () => false;
  assert.ok(!mapInteractions(g,merchant).some(t=>t.kind==='merchant'));
});
