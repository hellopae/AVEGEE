import {readReleaseFile,assertModuleRelease,assertStylesheetRelease} from './helpers/release-imports.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planPlacement} from '../src/battle-menu-layout.js';
const read=readReleaseFile;
const bounds={l:6,t:6,r:1600,b:860};
const foe={l:900,t:420,r:1100,b:640};            // sprite + name plate + HP bar of the first enemy

test('K5 flyout stays beside its tab when nothing is in the way',()=>{
 const plan=planPlacement({size:{w:300,h:48},bounds,hard:[],soft:[],candidates:[
  {key:'right',x:1000,y:600},{key:'left',x:400,y:600,penalty:800}]});
 assert.equal(plan.key,'right');assert.equal(plan.y,600);assert.equal(plan.hardHit,0);
});
test('K5 flyout never lands on an enemy HP bar: it moves below the enemy row',()=>{
 const plan=planPlacement({size:{w:300,h:48},bounds,hard:[foe],soft:[],candidates:[
  {key:'right',x:1000,y:600,penalty:0},{key:'right',x:1000,y:foe.b+10,penalty:130}]});
 assert.equal(plan.hardHit,0);assert.equal(plan.y,foe.b+10);
});
test('K5 flyout opens to the other side when the near side is blocked and moving costs more',()=>{
 const plan=planPlacement({size:{w:300,h:48},bounds,hard:[foe],soft:[],candidates:[
  {key:'right',x:800,y:600,penalty:0},{key:'left',x:300,y:600,penalty:800}]});
 assert.equal(plan.key,'left');
});
test('K5 a covered enemy costs more than covering an ally or the talk box',()=>{
 const ally={l:300,t:560,r:560,b:700};
 const plan=planPlacement({size:{w:300,h:48},bounds,hard:[foe],soft:[ally],candidates:[
  {key:'right',x:800,y:600},{key:'left',x:300,y:600}]});
 assert.equal(plan.key,'left');assert.ok(plan.softHit>0);assert.equal(plan.hardHit,0);
});
test('K5 a tall flyout is shortened (it scrolls) instead of running off the stage',()=>{
 const plan=planPlacement({size:{w:300,h:300},bounds,hard:[],soft:[],candidates:[{key:'right',x:1000,y:700}]});
 assert.equal(plan.h,bounds.b-700);
});
test('K5 candidates outside the stage or with no usable height are skipped',()=>{
 assert.equal(planPlacement({size:{w:300,h:200},bounds,candidates:[{key:'a',x:1500,y:100},{key:'b',x:100,y:850}]}),null);
});
test('K5 safety margin: a box that only touches the padded enemy rect still counts as a hit',()=>{
 const enemy={l:100,t:100,r:200,b:200};
 const plan=planPlacement({size:{w:50,h:50},bounds,hard:[enemy],candidates:[{key:'x',x:202,y:100}]});
 assert.ok(plan.hardHit>0);
});
test('K5 wiring: ui.js measures enemies, hint strip is thin, release entries stay consistent in both entry pages',()=>{
 const ui=read('src/ui.js'),css=read('src/battle-turns.css');
 assertModuleRelease('src/battle-menu-layout.js',read('index.html'),'src/ui.js');
 assert.match(ui,/planPlacement\(/);
 assert.match(ui,/\.fig\.foe \.plate, \.battle-boss-hud/,'enemy plates and boss HUD are obstacles');
 assert.match(css,/\.battle9-confirm\{display:flex;flex-wrap:wrap/);
 assert.match(css,/battle-command-heading\{white-space:nowrap\}/);
 assert.match(css,/battle-command-cancel\{pointer-events:auto/,'K2 click-through stays');
 for(const f of ['index.html','output/game-review/index.html']){
  assertStylesheetRelease('src/battle-turns.css',read(f));
  assertModuleRelease('src/ui.js',read(f),null,{entry:true});
 }
});
