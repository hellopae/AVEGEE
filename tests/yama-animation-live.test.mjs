import test from 'node:test';
import assert from 'node:assert/strict';
import {statSync,readFileSync} from 'node:fs';
import {yamaFit} from '../src/yama-fit.js';
import {drawYamaBook,drawYamaSwordIdle,animationFrame,yamaAnimationSrc} from '../src/yama-animation.js';

globalThis.Image=class{naturalWidth=2560;set src(v){this.srcValue=v;queueMicrotask(()=>this.onload?.())}};
const draws=[];
const ctx={save(){},restore(){},translate(){},scale(){},beginPath(){},ellipse(){},fill(){},drawImage(...a){draws.push(a)}};
const ready=async fn=>{fn();await Promise.resolve();draws.length=0;assert.equal(fn(),true)};

test('all outfits use the shipped 8-frame walk with the existing full stride and fixed feet root',async()=>{
 for(const style of ['th','asia','west','cyberhell']){
  assert.ok(statSync(yamaAnimationSrc(style,'book-walk')).size>1000);
  await ready(()=>drawYamaBook(ctx,style,40,80,64,7,'down',true,0));
  for(let row=0;row<4;row++)for(let i=0;i<8;i++){
   draws.length=0;drawYamaBook(ctx,style,40,80,64,i*7,['down','left','right','up'][row],true,0);
   assert.deepEqual(draws[0].slice(1,5),[i*320,row*480,320,480]);
   const fit=yamaFit(style).book[row],k=64/fit.height;assert.deepEqual(draws[0].slice(5),[40-fit.walkFootX*k,80-fit.walkFootY*k,320*k,480*k]);
  }
  draws.length=0;drawYamaBook(ctx,style,40,80,64,56,'down',true,0);assert.equal(draws[0][1],0);
 }
});
test('stopped hero blinks using new poses without changing scale or anchor',async()=>{
 await ready(()=>drawYamaBook(ctx,'th',40,80,64,0,'up',false,0));
 const frames=[];
 for(const t of [0,1000,1320,1420,1900]){
  draws.length=0;drawYamaBook(ctx,'th',40,80,64,0,'up',false,t);frames.push(draws[0][1]/320);
  const fit=yamaFit('th').book[3],k=64/fit.height;assert.deepEqual(draws[0].slice(5),[40-fit.footX*k,80-fit.footY*k,320*k,480*k]);
 }
 assert.deepEqual(frames,[0,1,2,3,0]);
});
test('sword idle uses six poses and all zone exports are preloaded',async()=>{
 const catalog=JSON.parse(readFileSync('img/preload-catalog.json','utf8'));
 for(const z of ['th','asia','west','cyberhell']){
  for(const m of ['book-idle','book-walk','sword-idle'])assert.ok(catalog.zones[z].includes(yamaAnimationSrc(z,m)));
  await ready(()=>drawYamaSwordIdle(ctx,z,40,80,64,0));
  draws.length=0;drawYamaSwordIdle(ctx,z,40,80,64,1860);assert.equal(draws[0][1],5*640);
 }
 assert.equal(animationFrame(2120,[1000,240,420,100,100,260]),0);
});
