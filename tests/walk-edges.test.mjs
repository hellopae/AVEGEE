import test from 'node:test';import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';import {canWalk,findPath,resetWalk,setBlocks} from '../src/walk.js?v=k1d';
import {TOWN_PROP_SITES} from '../src/town-layout.js?v=k1d';
globalThis.Image=class {};
// K1d: the narrow closed gap is now the root of the banyan beside the great stair (a solid ellipse on open plaza).
test('adjacent coarse cells cannot shortcut the narrow closed root between two open sides',()=>{
 createGame();resetWalk();setBlocks([],[]);
 const root=TOWN_PROP_SITES.find(p=>p.id==='banyan');
 const start=[root.x-root.rx-6,root.y],end=[root.x+root.rx+6,root.y];
 assert.equal(canWalk(...start),true);assert.equal(canWalk(...end),true);assert.equal(canWalk(root.x,root.y),false);
 const path=findPath(...start,...end);assert.ok(path?.length>1,'goes around the root');assert.deepEqual(path.at(-1),end);
 let from=start;
 for(const to of path){const n=Math.ceil(Math.hypot(to[0]-from[0],to[1]-from[1]));for(let i=1;i<=n;i++)assert.equal(canWalk(from[0]+(to[0]-from[0])*i/n,from[1]+(to[1]-from[1])*i/n),true);from=to;}
});
