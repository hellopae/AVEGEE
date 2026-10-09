import test from 'node:test';
import assert from 'node:assert/strict';
import { makePuzzle,findMatches,legalMoves,reshuffleBoard,createPuzzle,GOALS,ROWS,COLS } from '../src/minigames/document-puzzle.js';
import { createGame } from '../src/game.js';
import { STATIONS } from '../src/data.js';
import { SALA_WALK,wideStationRoom } from '../src/room-art-assets.js';
globalThis.Image ??= class {};
const stable=board=>{
 assert.equal(board.length,ROWS*COLS);assert.ok(board.every(c=>Number.isInteger(c)&&c>=0&&c<4));
 assert.deepEqual(findMatches(board),[]);assert.ok(legalMoves(board).length>0);
};
test('300 seeded boards have no initial matches, always have a legal swap, and are reproducible',()=>{
 for(let seed=0;seed<300;seed++) {
  const {board}=makePuzzle(seed);stable(board);
  assert.deepEqual(makePuzzle(seed).board,board);
  const p=createPuzzle(seed);assert.deepEqual(p.view().board,board);
  assert.deepEqual(p.view().collected,[0,0,0,0]);assert.deepEqual(p.view().goals,GOALS);assert.equal(p.view().won,false);
 }
});
test('only adjacent matching swaps count as moves; invalid and no-match swaps preserve state',()=>{
 const p=createPuzzle(7),before=p.view();
 for(const pair of [[-1,0],[0,ROWS*COLS],[13,14],[0,2],[0,0],[0,0.5]]) {
  const result=p.swap(...pair);assert.equal(result.ok,false);assert.equal(result.reason,'not-adjacent');assert.deepEqual(p.view(),before);
 }
 const allowed=legalMoves(before.board).map(pair=>pair.join(','));
 const bad=Array.from({length:COLS-1},(_,a)=>[a,a+1]).find(pair=>!allowed.includes(pair.join(',')));
 assert.equal(p.swap(...bad).reason,'no-match');assert.deepEqual(p.view(),before);
 assert.equal(p.swap(...p.hint()).ok,true);assert.equal(p.view().moves,1);stable(p.view().board);
 assert.deepEqual(p.reset(),before);assert.deepEqual(p.view(),before);
 const detached=p.view();detached.board.fill(-1);detached.collected.fill(99);detached.goals.fill(99);
 assert.deepEqual(p.view(),before);
});
test('crossing and long runs count once per connected category, with no wrapped row matches',()=>{
 const board=Array.from({length:ROWS*COLS},(_,i)=>(Math.floor(i/COLS)+i%COLS)%4);
 const cross=[18,31,32,33,46];for(const i of cross)board[i]=0;
 for(const [i,color] of [[4,2],[30,1],[34,2],[60,3]])board[i]=color;
 for(const i of [65,66,67])board[i]=0;board[64]=1;board[68]=1;
 const groups=findMatches(board);assert.equal(groups.length,2);
 assert.deepEqual(groups.map(g=>g.cells),[cross,[65,66,67]]);
 for(const group of groups){assert.equal(group.color,0);assert.ok(group.cells.includes(group.anchor));}
 const long=Array.from({length:ROWS*COLS},(_,i)=>(Math.floor(i/COLS)+i%COLS)%4);
 for(let row=0;row<ROWS;row++)long[row*COLS]=0;
 assert.deepEqual(findMatches(long).map(g=>g.cells),[[0,14,28,42,56]]);
 const wrapped=Array.from({length:ROWS*COLS},(_,i)=>(Math.floor(i/COLS)+i%COLS)%4);
 wrapped[13]=wrapped[14]=wrapped[15]=2;
 assert.equal(findMatches(wrapped).some(g=>g.cells.includes(13)&&g.cells.includes(14)),false);
 assert.deepEqual(findMatches([0,0,0]),[]);assert.deepEqual(findMatches(Array(ROWS*COLS)),[]);assert.deepEqual(legalMoves([0,1]),[]);
});
test('cascades expose each matched frame, count groups rather than books, and preserve gravity order',()=>{
 const p=createPuzzle(0),result=p.swap(...p.hint());assert.equal(result.ok,true);assert.ok(result.frames.length>1);
 const totals=[0,0,0,0];
 for(let i=0;i<result.frames.length;i++) {
  const frame=result.frames[i];assert.deepEqual(frame.groups,findMatches(frame.board));
  for(const group of frame.groups)totals[group.color]++;
  assert.deepEqual(frame.collected,totals);
  const removed=new Set(frame.groups.flatMap(g=>g.cells));
  const next=result.frames[i+1]?.board??p.view().board;
  if(i<result.frames.length-1||!result.reshuffled)for(let column=0;column<COLS;column++) {
   const survivors=Array.from({length:ROWS},(_,row)=>row*COLS+column).filter(cell=>!removed.has(cell)).map(cell=>frame.board[cell]);
   assert.deepEqual(Array.from({length:survivors.length},(_,row)=>next[(ROWS-survivors.length+row)*COLS+column]),survivors);
  }
 }
 assert.deepEqual(p.view().collected,totals);assert.equal(p.view().moves,1);stable(p.view().board);
});
test('blue can be matched despite its zero goal and winning requires the other three categories',()=>{
 const p=createPuzzle(8),result=p.swap(...p.hint());
 assert.equal(result.ok,true);assert.ok(p.view().collected[2]>0);assert.equal(p.view().won,false);
 for(let seed=0;seed<30;seed++) {
  const game=createPuzzle(seed);let previous=[0,0,0,0];let steps=0;
  while(!game.view().won&&steps<500) {
   const move=game.hint();assert.ok(move);const result=game.swap(...move);assert.equal(result.ok,true);steps++;
   const state=game.view();assert.equal(state.moves,steps);
   assert.equal(state.won,GOALS.every((goal,color)=>state.collected[color]>=goal));
   assert.ok(state.collected.every((n,color)=>n>=previous[color]));previous=state.collected;
   stable(state.board);
  }
  assert.equal(game.view().won,true,`seed ${seed} should be completable`);
  const complete=game.view();assert.equal(game.hint(),null);assert.equal(game.swap(0,1).reason,'finished');assert.deepEqual(game.view(),complete);
 }
});
test('dead boards and impossible color distributions recover to a stable playable board',()=>{
 const dead=Array.from({length:ROWS*COLS},(_,i)=>(Math.floor(i/COLS)+i%COLS)%4),before=[...dead];
 assert.deepEqual(findMatches(dead),[]);assert.deepEqual(legalMoves(dead),[]);
 for(let seed=0;seed<20;seed++)stable(reshuffleBoard(dead,seed));
 assert.deepEqual(dead,before);stable(reshuffleBoard(Array(ROWS*COLS).fill(0),0));
 assert.throws(()=>reshuffleBoard([0,1]),TypeError);
});
test('sala win awards order once, caps at 100, persists cooldown, does not award speed',()=>{
 const g=createGame();g.save=()=>true;g.stations.push({def:STATIONS.find(s=>s.k==='sala'),build:0,slots:[],speedLv:0});g.order=90;
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

test('failed reward save leaves order and cooldown unchanged and permits retry',()=>{
 const g=createGame();g.stations.push({def:STATIONS.find(s=>s.k==='sala'),build:0,slots:[]});g.order=95;
 const before=g.snapshot();g.save=()=>false;
 assert.equal(g.finishDocumentPuzzle(true),false);
 const after=g.snapshot();after.at=before.at;assert.deepEqual(after,before);
 assert.equal(g.documentPuzzleReady(g.stations.find(s=>s.def.k==='sala')),true);
 g.save=()=>true;assert.equal(g.finishDocumentPuzzle(true),true);assert.equal(g.order,100);
 assert.equal(g.finishDocumentPuzzle(true),false);
});
