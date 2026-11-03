import test from 'node:test';
import assert from 'node:assert/strict';
import {townReviewBox,reviewObjectBlocks,reviewObjectFootGrid} from '../src/map-review-town-objects.js';
test('an off-centre visible trunk stays on its authored ground anchor after downscaling',()=>{
 const object={kind:'tree',x:200,y:300,w:160,anchor:[.567556297,.958841463]},b=townReviewBox(object,[2048,1638],'asia',{});
 assert.equal(b.x+b.w*object.anchor[0],200);assert.equal(b.y+b.h*object.anchor[1],300);
});
test('tree roots and house ground floors block; canopies and roofs do not',()=>{
 const tree={kind:'ellipse',x:50,y:70,rx:6,ry:4},house={kind:'rect',rect:[100,120,140,130]};
 assert.equal(reviewObjectBlocks(tree,50,70),true);assert.equal(reviewObjectBlocks(tree,50,30),false);
 assert.equal(reviewObjectBlocks(house,120,125),true);assert.equal(reviewObjectBlocks(house,120,80),false);
 const grid=reviewObjectFootGrid([{collider:tree},{collider:house}],20,20,[200,200]);
 assert.equal(grid.blocked[12*20+12],1);assert.equal(grid.blocked[7*20+5],0); // pixel centres, not ellipse bounding boxes
});
test('facade scale and canteen feet use existing runtime definitions',()=>{
 const facade=townReviewBox({kind:'station',src:'img/map-v5/st-krata-th.webp',site:{k:'krata',bx:470,by:565,mapScale:1.32}},[1024,1024],'th',{});
 assert.equal(facade.x+facade.w/2,470);assert.equal(facade.y+facade.h,565);
 const canteen=townReviewBox({kind:'station',boxMode:'canteen',site:{bx:1572,by:646,bw:118}},[640,640],'th',{});
 assert.equal(canteen.y+canteen.h*.9765625,646);assert.equal(canteen.flip,true);
});
