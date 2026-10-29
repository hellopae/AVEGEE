import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {selectedVisibleFoeId} from '../src/battle-result.js';
import {battleWeaponHudHtml} from '../src/weapons.js';
import {ITEMS} from '../src/data.js';
import {setLang} from '../src/i18n.js';
const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
const block=ui.slice(ui.indexOf('    const pending = b.command;'),ui.indexOf("    const selection = '';",ui.indexOf('    const pending = b.command;')));
const active=(command,{k='you',phase=null,over=false}={})=>vm.runInNewContext(block+'\n({choosingTarget,needsReceiver});',{b:{command,over},actor:{k},isYama:k==='you',special:k==='guard'?'guard':`crew:${k}`,phase,ITEMS});
test('remembered enemy stays unmarked at rest; attacks and AOE ask for confirmation, heals and cancellation do not mark foes',()=>{
 for(const command of [null,'defend','flee','rage','cooldownClock','food','health'])assert.equal(active(command).choosingTarget,false,command);
 for(const command of ['atk','fire','ice','hypno','strike','crew:taan','guard'])assert.equal(active(command).choosingTarget,true,command);
 for(const k of ['boon','nira']){assert.equal(active(`crew:${k}`,{k}).choosingTarget,false);assert.equal(active(`crew:${k}`,{k}).needsReceiver,true);}
 assert.equal(active('atk',{phase:'you'}).choosingTarget,false);assert.equal(active('atk',{over:'win'}).choosingTarget,false);
 const b={selectedFoeId:'a',foes:[{id:'a',hp:0},{id:'b',hp:12}]},before=JSON.stringify(b);
 assert.equal(selectedVisibleFoeId(b),null);assert.equal(selectedVisibleFoeId({...b,choosingTarget:true}),'b');assert.equal(JSON.stringify(b),before);
 assert.match(ui, /\{\.\.\.view,choosingTarget\}/);assert.match(ui,/const available = !!\(choosingTarget && foe/);
});
test('weapon HUD collapses to sword + effect icon; actual cooldown and notes remain available on request',()=>{
 for(const [id,glyph] of [['fang','🔥'],['chain','✦'],['cane','🩸'],['trojan','↻']]){
  const b={weaponCd:3,weaponNote:{k:'drain',n:4}},before=JSON.stringify(b),html=battleWeaponHudHtml(b,id);
  assert.match(html,/<details class="battle-weapon-hud cooling" data-weapon-cd="3">/);assert.match(html,new RegExp(`weapon-icon-${id}\\.png`));assert.ok(html.includes(glyph));
  assert.match(html,/<summary title=/);assert.match(html,/weapon-hud-details/);assert.doesNotMatch(html,/battle-buff|<details[^>]* open/);assert.equal(JSON.stringify(b),before);
  assert.doesNotMatch(battleWeaponHudHtml({weaponCd:0},id),/class="battle-weapon-hud cooling"/);assert.match(battleWeaponHudHtml({weaponCd:0},id),/data-weapon-cd="0"/);
 }
 assert.match(battleWeaponHudHtml({},null),/weapon-icon-base.png/);assert.doesNotMatch(battleWeaponHudHtml({},null),/class="weapon-effect-icon"/);assert.equal(battleWeaponHudHtml({over:'win'},'fang'),'');
});
test('weapon details retain translated names and quantities',()=>{
 const oldDocument=globalThis.document;globalThis.document={documentElement:{}};
 try{setLang('en');const html=battleWeaponHudHtml({weaponCd:2,weaponNote:{k:'drain',n:4}},'cane');assert.match(html,/Cane|cane/);assert.match(html,/2/);assert.match(html,/4/);}finally{setLang('th');globalThis.document=oldDocument;}
});

test('UI-JW renders the sword details beside Yama inside his team card, outside companion scrolling',()=>{
 const start=ui.indexOf("    stage.insertAdjacentHTML('beforeend', `${b.over ? '' : `<button class=\"battle-pause\"");
 const end=ui.indexOf('    if (view.foes?.length > 1)',start);
 let html='';
 vm.runInNewContext(ui.slice(start,end),{
  stage:{insertAdjacentHTML:(_,value)=>{html=value;}},b:{},view:{youHp:80,youMax:100,foes:[]},
  g:{weapons:{equipped:'fang'},mpMax:20},mp:10,team:[],HERO_NAME:'Yama',
  battleTurnOrderHtml:()=>'',battleWeaponHudHtml,esc:String,t:String,artUrl:()=>'',meter:()=>'',
 });
 const stack=[];let parent=null,yamaParent=null;
 for(const token of html.matchAll(/<(\/?)([a-z][\w-]*)([^>]*)>/gi)){
  const [,closing,tag,attrs]=token;
  if(closing){assert.equal(stack.pop()?.tag,tag);continue;}
  if(tag==='details')parent=stack.map(n=>n.attrs).join(' ');
  if(/data-crew-pick="you"/.test(attrs))yamaParent=stack.at(-1)?.attrs;
  if(!['img','br','input','hr'].includes(tag))stack.push({tag,attrs});
 }
 assert.equal(stack.length,0);
 assert.match(parent,/battle-team-hud/);assert.match(parent,/battle-yama-card/);
 assert.doesNotMatch(parent,/battle-team-roster|<button/);
 assert.match(yamaParent,/battle-yama-card/);
 assert.match(html,/weapon-effect-icon/);assert.match(html,/<summary title=/);
 const css=readFileSync(new URL('../src/battle-result.css',import.meta.url),'utf8');
 assert.match(css,/summary\{[^}]*width:44px;height:44px/);
 assert.match(css,/\.weapon-hud-details\{[^}]*bottom:calc\(100% \+ 8px\)/);
 assert.match(css,/\.battle-team-roster\{[^}]*min-width:0[^}]*overflow-x:auto/);
 assert.doesNotMatch(css,/\.combat-arena>\.battle-weapon-hud/);
});
