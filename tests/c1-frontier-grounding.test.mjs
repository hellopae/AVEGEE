import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {ROUTE_GEOMETRY} from '../src/route-geometry.js';
import {drawFrontierAmbient,drawFrontierTree} from '../src/frontier-ambient.js';
test('frontier tree contact remains at the authored root, under the canopy at every world scale',()=>{
  for(const scale of [1,2,3])for(const big of [false,true])for(const anchor of [[.5,1],[.56,.98]]){
    const tree={x:.45,y:.63,big},ellipses=[],images=[],transforms=[];
    const ctx={save(){},restore(){},translate(...v){transforms.push(v);},scale(...v){transforms.push(v);},beginPath(){},ellipse(...v){ellipses.push(v);},fill(){},drawImage(...v){images.push(v);}};
    const w=1672*scale,h=941*scale;
    drawFrontierAmbient(ctx,{x:31,y:-17,w,h,reduced:true,trees:[tree],waterfalls:[]});
    assert.deepEqual(transforms,[[31,-17],[w,h]]);
    const contact=ellipses.find(e=>e[0]===tree.x&&e[1]===tree.y);assert.ok(contact,'root has its own centered contact shadow');
    assert.ok(contact[2]*w<30*scale&&contact[3]*h<3*scale,'contact remains compact');
    assert.ok(ellipses.some(e=>e[0]>tree.x&&e[1]>tree.y),'cast shadow follows the map light');
    const image={complete:true,naturalWidth:1200,naturalHeight:1280};
    drawFrontierTree(ctx,tree,{x:31+tree.x*w,y:-17+tree.y*h,height:h,image,anchor});
    const [,x,y,width,height]=images[0];assert.ok(Math.abs(y+height*anchor[1]-(-17+tree.y*h))<1e-9);assert.ok(Math.abs(x+width*anchor[0]-(31+tree.x*w))<1e-9);
  }
});
test('only the approved 1-2 route selects transparent replacement trees; other areas keep their own art',()=>{
  const art=ROUTE_GEOMETRY['th:asia'].ambient.treeArt;
  assert.deepEqual(Object.keys(art).sort(),['green','lightgreen','red']);
  for(const file of Object.values(art)){
    assert.ok(existsSync(file));const png=readFileSync(file);
    assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png[25],6,'PNG keeps RGBA transparency');
  }
  assert.equal(ROUTE_GEOMETRY['asia:west'].ambient.treeArt,undefined);
  assert.equal(ROUTE_GEOMETRY['west:cyberhell'].ambient.treeArt,undefined);
});
