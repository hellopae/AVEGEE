import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
import {soulPortrait} from '../src/soul-portraits.js';
import {SPOTS} from '../src/data.js';
import {resetWalk,setBlocks,setNpcDiscs,canWalk,findPath} from '../src/walk.js';
globalThis.Image=class {};
const game=()=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};return g;};
test('mirrors unlock only after beating zone-one tester and preserve the reward through save/restore',()=>{
 const g=game();g.level=2;
 assert.equal(g.powerOf('mirror').ammo,0);assert.equal(g.powerLocked(g.powerOf('mirror')),true);
 g.items.push({k:'mirror',x:100,y:100});assert.equal(g.collectItem(g.items.length-1),false);
 g.inventory.mirror=2;g.powerOf('mirror').ammo=2;
 const loaded=game();assert.equal(loaded.restore(g.snapshot()),true);
 assert.equal(loaded.inventory.mirror,undefined);assert.equal(loaded.powerOf('mirror').ammo,0);
 loaded.zoneEvents.th.prisonBreak='cleared';loaded.zoneEvents.th.devaTest='pending';loaded.startDevaTest();loaded.battle.foes[0].hp=1;loaded.battleAct('atk');
 assert.equal(loaded.devaTestStatus(),'cleared');assert.equal(loaded.inventory.mirror,1);
 const won=game();won.restore(loaded.snapshot());assert.equal(won.inventory.mirror,1);assert.equal(won.powerLocked(won.powerOf('mirror')),false);
 won.zone='west';assert.equal(won.powerLocked(won.powerOf('mirror')),false);
});
test('young conscript and graduate keep young identities in courtroom, battle and old saves',()=>{
 assert.equal(soulPortrait({case:'recruit',who:'พลทหารเกณฑ์หนุ่ม',sex:'m'}),'spirit-recruit');
 assert.equal(soulPortrait({who:'นักศึกษาเพิ่งจบ',sex:'m'}),'spirit-graduate');
 const g=game();g.queue=[{id:44,who:'นักศึกษาเพิ่งจบ',sex:'m',sp:'spirit-worker'}];
 const loaded=game();loaded.restore(g.snapshot());assert.equal(loaded.queue[0].sp,'spirit-graduate');
});
test('boss pier edges have return paths and a delayed frame cannot overshoot a waypoint',()=>{
 resetWalk();setBlocks([],[]);setNpcDiscs([[SPOTS.bossPier.x,SPOTS.bossPier.y]]);
 for(const offset of [-45,-35,35,45]) {
  const x=SPOTS.bossPier.x+offset,y=SPOTS.bossPier.y;
  if(canWalk(x,y)) assert.ok(findPath(x,y,1300,600,true),`return from ${x},${y}`);
 }
 const g=game();g.syncBlocks=()=>{};g.paused=false;
 g.player={x:900,y:300,tx:906,ty:300,path:[[906,300]],face:1};g.stepWorld(200);
 assert.ok(g.player.x<=906);g.stepWorld(200);assert.equal(g.player.path,null);
});
