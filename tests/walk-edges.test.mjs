import test from 'node:test';import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';import {canWalk,findPath,resetWalk,setBlocks} from '../src/walk.js';
globalThis.Image=class {};
test('adjacent coarse cells cannot shortcut the narrow closed gap between hillside avenues',()=>{
 createGame();resetWalk();setBlocks([],[]);
 const start=[1912,840],end=[1928,840];
 assert.equal(canWalk(...start),true);assert.equal(canWalk(...end),true);assert.equal(canWalk(1920,840),false);
 const path=findPath(...start,...end);assert.ok(path?.length>1);assert.deepEqual(path.at(-1),end);
 let from=start;
 for(const to of path){const n=Math.ceil(Math.hypot(to[0]-from[0],to[1]-from[1]));for(let i=1;i<=n;i++)assert.equal(canWalk(from[0]+(to[0]-from[0])*i/n,from[1]+(to[1]-from[1])*i/n),true);from=to;}
});
