import {readReleaseFile,assertModuleRelease,assertStylesheetRelease} from './helpers/release-imports.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planBattleFormation} from '../src/battle-formation.js';
const read=readReleaseFile;
test('K2 interactive rows keep a stationary hit area through pointerdown and click',()=>{
 for(const f of ['src/battle-turns.css','src/trial-comment8.css']){
  const css=read(f).split('/* K2:')[1]||'';
  assert.match(css,/animation:none!important/,'disable inherited translate animations');
  assert.match(css,/transition:none!important/,'disable inherited transform transitions');
  assert.match(css,/pointer-events:none/,'closed flyouts cannot intercept input');
 }
});
test('K2 normal formation keeps allies closer on both diagonal axes',()=>{
 const slots=planBattleFormation(4,1678,937);
 assert.ok(slots[0].x/1678>=.14);
 assert.ok(slots.at(-1).x/1678<=.33);
 assert.ok((slots[3].x-slots[0].x)/(1678*.275)>=.43);
 assert.ok((slots[3].x-slots[0].x)/(1678*.275)<=.47);
 assert.ok((slots[3].y-slots[0].y)/(937*.155)>=.43);
 assert.ok((slots[3].y-slots[0].y)/(937*.155)<=.47);
 assert.equal(slots[0].stepX,1678*.065);
});
test('K2 changed entry URLs match, including review imports',()=>{
 const main=read('index.html'),review=read('output/game-review/index.html');
 for(const file of ['battle-turns.css','trial-comment8.css'])
  assert.equal(assertStylesheetRelease('src/'+file,main),assertStylesheetRelease('src/'+file,review),file);
 assert.equal(assertModuleRelease('src/ui.js',main,null,{entry:true}),assertModuleRelease('src/ui.js',review,null,{entry:true}));
 const canonical=assertModuleRelease('src/ui.js',main,null,{entry:true});
 const entry=new URL(canonical).pathname.split('/').slice(2).join('/')+new URL(canonical).search;
 assert.throws(()=>assertModuleRelease('src/ui.js',main.replace(`src="${entry}"`,'src="src/ui.js"'),null,{entry:true}),/entry script matches/,'an unversioned entry cannot bypass the import map');
 assert.throws(()=>assertModuleRelease('src/ui.js',main.replace(`src="${entry}"`,'src="src/ui.js?v=stale-fixture"'),null,{entry:true}),/entry script matches/,'a stale entry cannot create a second UI instance');

});

test('K2 pointerdown captures primary input, leaves activation to one native click',async()=>{
 const {bindCommandPress}=await import('../src/command-press.js');
 let captured=null,actions=0;
 const button=new EventTarget();
 Object.assign(button,{disabled:false,getAttribute:()=>null,setPointerCapture:id=>{captured=id;}});
 button.addEventListener('click',()=>actions++);
 const root=new EventTarget();root.contains=b=>b===button;
 bindCommandPress(root);
 const down=(props={})=>{
  const event=new Event('pointerdown');
  Object.defineProperty(event,'target',{value:{closest:()=>button}});
  Object.assign(event,{button:0,isPrimary:true,pointerId:7},props);
  root.dispatchEvent(event);
 };
 down();assert.equal(captured,7);assert.equal(actions,0,'pointerdown must not execute an action');
 button.dispatchEvent(new Event('click'));assert.equal(actions,1);
 captured=null;button.disabled=true;down();assert.equal(captured,null);
 button.disabled=false;down({button:2});assert.equal(captured,null);
 down({isPrimary:false});assert.equal(captured,null);
 button.setPointerCapture=()=>{throw new Error('pointer cancelled');};
 assert.doesNotThrow(()=>down());
});

test('K2 review: hint box cannot swallow enemy clicks and flyout names are not width-capped',()=>{
 const battle=read('src/battle-turns.css'),trial=read('src/trial-comment8.css');
 assert.match(battle,/\.battle9-confirm\{pointer-events:none\}/);
 assert.match(battle,/battle-command-cancel\{pointer-events:auto/);
 assert.match(battle,/command-options \.orb-choice b\{max-width:none/);
 assert.match(trial,/court-options \.orb-choice b\{max-width:none/);
});
