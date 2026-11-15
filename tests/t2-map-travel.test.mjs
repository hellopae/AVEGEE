import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame} from '../src/game.js';
import {beginMapTravel,advanceMapTravel,skipMapTravel,mapTravelPose} from '../src/map-travel.js';

globalThis.Image??=class{};
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
function game(){const g=createGame();g.save=()=>true;g.onChange=()=>{};g.zoneTravel.visited.asia=g.zoneTravel.ports.asia=true;g.zoneTravel.ports.th=true;Object.assign(g.player,g.harbourPoint());return g;}

test('F14: by boat the destination is loaded only after the boat has floated off to the right; the zone changes after the load, not before',async()=>{
  const g=game();let loads=0,release;const gate=new Promise(r=>release=r);
  assert(beginMapTravel(g,'asia',{load:()=>{loads++;return gate;}}));
  const order=[];let moves=0;const move=g.moveZone.bind(g);g.moveZone=to=>{moves++;order.push('move');return move(to);};
  for(let i=0;i<4000&&g.mapTravel&&g.mapTravel.phase!=='depart';i++){advanceMapTravel(g,120);assert.equal(loads,0,'nothing loads before the boat departs');assert.equal(moves,0);}
  assert.equal(g.mapTravel.phase,'depart');
  for(let i=0;i<60;i++)advanceMapTravel(g,120);                  // boat reaches the far right and waits
  await new Promise(r=>setTimeout(r,0));
  assert.equal(g.mapTravel.phase,'depart');assert.equal(g.mapTravel.progress,1);assert.equal(loads,1,'load page requested once, at the far right');assert.equal(moves,0);assert.equal(g.zone,'th');
  assert.ok(mapTravelPose(g.mapTravel,0).boat.x>=g.mapTravel.pier.x+899);
  release();await gate;await new Promise(r=>setTimeout(r,0));
  advanceMapTravel(g,120);
  assert.equal(moves,1);assert.equal(g.zone,'asia');assert.equal(g.mapTravel.phase,'arrive');assert.equal(loads,1);
});

test('F14: a failed load drops the journey without changing zone; skip waits for the load too',async()=>{
  const g=game();assert(beginMapTravel(g,'asia',{load:()=>Promise.reject(new Error('x'))}));
  g.mapTravel.phase='depart';g.mapTravel.progress=0;g.mapTravel.elapsed=1e9;advanceMapTravel(g,120);
  await new Promise(r=>setTimeout(r,0));advanceMapTravel(g,120);
  assert.equal(g.mapTravel,null);assert.equal(g.zone,'th');
  const g2=game();let done=false;assert(beginMapTravel(g2,'asia',{load:async()=>{await new Promise(r=>setTimeout(r,20));done=true;}}));
  const ok=await skipMapTravel(g2);assert.equal(done,true);assert.equal(ok,true);assert.equal(g2.zone,'asia');assert.equal(g2.mapTravel,null);
});

test('F14: ui starts the ferry before loading anything (boat) and keeps loading first for the border route',()=>{
  const ui=read('src/ui.js');const body=ui.slice(ui.indexOf('async function startMapJourney'),ui.indexOf('function openOutfit()'));
  assert.match(body,/if\(mode!=='boat'\)\{[\s\S]*await preloadZone/);
  assert.match(body,/load:mode==='boat'\?\(\)=>preloadZone\(to,destOutfit\):null/);
  assert.match(body,/if\(mode==='boat'\)prewarmZone/);
});
