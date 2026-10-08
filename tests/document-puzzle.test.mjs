import test from 'node:test';
import assert from 'node:assert/strict';
import { makePuzzle,shiftLine,solved,columnCounts,createPuzzle,GOALS,ROWS,COLS } from '../src/minigames/document-puzzle.js';
import { createGame } from '../src/game.js';
import { STATIONS } from '../src/data.js';
import { SALA_WALK,wideStationRoom } from '../src/room-art-assets.js';
globalThis.Image ??= class {};
test('all seeded boards start unsolved and inverse slides solve the exact colour goals',()=>{
 for(let seed=0;seed<300;seed++) {const {board,solution}=makePuzzle(seed);assert.equal(board.length,ROWS*COLS);assert.equal(solved(board),false);const counts=[...board].sort();for(const s of solution)shiftLine(board,s.axis,s.index,s.delta);assert.deepEqual(columnCounts(board),GOALS);assert.deepEqual([...board].sort(),counts);}
});
test('moves undo and reset; invalid lines do not alter board',()=>{
 const p=createPuzzle(7),before=[...p.board];assert.equal(p.move('row',-1,1),false);assert.equal(p.move('row',0,1),true);assert.equal(p.undo(),true);assert.deepEqual(p.board,before);p.move('column',2,-1);p.reset();assert.deepEqual(p.board,before);assert.equal(p.moves(),0);
});
test('sala win awards order once, caps at 100, persists cooldown, does not award speed',()=>{
 const g=createGame();g.stations.push({def:STATIONS.find(s=>s.k==='sala'),build:0,slots:[],speedLv:0});g.order=90;
 assert.equal(g.finishDocumentPuzzle(false),false);assert.equal(g.order,90);
 assert.equal(g.finishDocumentPuzzle(true),true);assert.equal(g.order,98);assert.equal(g.finishDocumentPuzzle(true),false);assert.equal(g.order,98);
 const st=g.stations.find(s=>s.def.k==='sala');assert.equal(st.speedLv,0);
 const copy=createGame();assert.equal(copy.restore(g.snapshot()),true);assert.equal(copy.order,98);assert.equal(copy.documentPuzzleReady(copy.stations.find(s=>s.def.k==='sala')),false);
 g.tick=st.documentCd;assert.equal(g.finishDocumentPuzzle(true),true);assert.equal(g.order,100);
});
const inside=(x,y)=>SALA_WALK.some(({poly})=>{let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;});
test('sala floor reaches entrance and document desk while excluding furniture and side walls',()=>{
 for(const p of [[.5,.96],[.5,.75],[.6,.68],[.26,.56],[.5,.53]])assert.equal(inside(...p),true,`${p}`);
 for(const p of [[.75,.64],[.5,.48],[.07,.4],[.97,.7]])assert.equal(inside(...p),false,`${p}`);
 const r=wideStationRoom('th','sala');assert.deepEqual(r.actions,[[.5,.19],[.74,.57]]);assert.deepEqual(r.crew,[.6,.68]);assert.notEqual(r.walk,SALA_WALK);
});
