import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {POWER_VISUALS,powerVisual,recipeFor} from '../src/battle-fx-map.js';
import {TEX} from '../src/battle-fx-tex.js';
import {createCutsceneReadiness} from '../src/cutscene-presentation.js';
import {assertModuleRelease} from './helpers/release-imports.mjs';

const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
test('all elemental powers have shipped textures and only fire powers select fire art',()=>{
  for(const [action,visual] of Object.entries(POWER_VISUALS)) {
    for(const key of ['projectile','hand','impact']) if(visual[key]) {
      assert.ok(TEX[visual[key]],`${action} ${key}`);
      if(key==='projectile') assert.ok(existsSync(`img/fx/${visual[key]}.webp`),`${action} shipped projectile art`);
      if(!['fire','flameCharge','rage'].includes(action)) assert.doesNotMatch(visual[key],/fire/);
    }
    if(!['fire','flameCharge','rage'].includes(action)) assert.equal(visual.cast,'neutral');
  }
  assert.equal(powerVisual('ice').projectile,'fx-ice-crystal-a');
  assert.equal(powerVisual('wind'),powerVisual('windFan'));
  assert.equal(powerVisual('clockReset'),powerVisual('cooldownClock'));
  for(const action of ['ice','windFan','hypno','valkyrieSpear']) assert.notEqual(recipeFor(action),'fire_s');
});
test('cutscene readiness waits for decode, deduplicates and mounts the retained element',async()=>{
  const decoded=deferred(); let loads=0,decodes=0;
  const image={decode:()=>{decodes++;return decoded.promise;}};
  const cache=createCutsceneReadiness(async(src,timeout,loaded)=>{loads++;loaded();return image;});
  const warming=cache.warm(['ice','ice']);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(cache.image('ice'),null);
  const waiting=cache.wait('ice'); decoded.resolve();
  assert.equal(await waiting,image);await warming;
  assert.equal(cache.image('ice'),image);assert.equal(loads,1);assert.equal(decodes,1);
  assert.ok(cache.timings()[0].decodedAt>=cache.timings()[0].loadedAt);
});
test('timeout never cancels late decode; replay becomes ready without another fetch',async()=>{
  const decoded=deferred();let loads=0;
  const image={decode:()=>decoded.promise};
  const cache=createCutsceneReadiness(async()=>{loads++;return image;});
  const start=performance.now();assert.equal(await cache.wait('slow',20),null);
  assert.ok(performance.now()-start>=15);assert.equal(cache.image('slow'),null);
  decoded.resolve();await cache.warm(['slow']);
  assert.equal(await cache.wait('slow'),image);assert.equal(loads,1);
});
test('missing, rejected decode and hung images resolve safely; ceiling is capped at 300 ms',async()=>{
  const failed=createCutsceneReadiness(async()=>{throw new Error('404');});
  assert.equal(await failed.wait('bad'),null);assert.match(failed.timings()[0].error,/404/);
  const badDecode=createCutsceneReadiness(async()=>({decode:()=>Promise.reject(new Error('decode'))}));
  assert.equal(await badDecode.wait('bad'),null);
  const hung=createCutsceneReadiness(()=>new Promise(()=>{}));
  const start=performance.now();assert.equal(await hung.wait('hang',10000),null);
  assert.ok(performance.now()-start<600);assert.equal(await hung.wait(null),null);
});
test('warming one team does not warm bench members or leak readiness to a new battle',async()=>{
  const requested=[];const cache=createCutsceneReadiness(async src=>{requested.push(src);return {decode:async()=>{}};});
  await cache.warm(['yama-ice','plerng','boon']);
  assert.deepEqual(requested,['yama-ice','plerng','boon']);assert.equal(cache.image('kan'),null);
  assert.equal(createCutsceneReadiness().image('yama-ice'),null);
});
test('edited production modules share canonical release versions',()=>{
  for(const file of ['ui','battle-fx','battle-fx-map','cutscene-presentation','asset-preload','nira-combat']) assertModuleRelease(`src/${file}.js`);
  const ui=readFileSync('src/ui.js','utf8');
  assert.match(ui,/await battleCutscenes.wait\(/);
  assert.doesNotMatch(ui,/if \(k === 'rage'\) return;/);
});

const {commandHarness,battleGame}=await import('./helpers/r2-battle-runtime.mjs');
test('real command handler: ten cold readiness cycles finish once and preserve MP, damage and turn order',async()=>{
  for(let i=0;i<10;i++) {
    const action=['ice','fire','hypno'][i%3];
    const h=commandHarness(async()=>({decode:()=>i<8 ? new Promise(r=>setTimeout(r,5+i)) : new Promise(()=>{})}));
    const reference=battleGame();assert.equal(reference.confirmBattleCommand(action,'you'),true);
    const first=h.execute(action),duplicate=h.execute(action);
    assert.equal(h.phase(),'preparing');await duplicate;await first;
    assert.equal(h.mounted.length,1);
    assert.equal(!!h.mounted[0].image,i<8,'timeout renders the title without an image');
    assert.equal(h.g.mp,reference.mp);assert.equal(h.g.battle.foes[0].hp,reference.battle.foes[0].hp);
    h.finish();reference.finishBattleCommand();
    assert.equal(h.phase(),null);assert.equal(h.g.battle.commandBusy,false);
    assert.deepEqual(h.g.currentBattleTurn(),reference.currentBattleTurn());
  }
});
test('leaving the battle during decode cannot confirm a stale command',async()=>{
  const pending=deferred();const h=commandHarness(async()=>({decode:()=>pending.promise}));
  const mp=h.g.mp;const action=h.execute('ice');h.g.battle=null;pending.resolve();await action;
  assert.equal(h.mounted.length,0);assert.equal(h.g.mp,mp);assert.equal(h.phase(),null);
});

test('production ice and hypno recipes emit moving elemental projectiles from the caster',async()=>{
  const vm=await import('node:vm');
  const mapping=await import('../src/battle-fx-map.js');
  const source=readFileSync('src/battle-fx.js','utf8')
    .replace(/^import .*;$/gm,'').replace(/^export \{.*\};$/gm,'').replace(/\bexport /g,'');
  const context=vm.createContext({...mapping,TEX_KEYS:[],preloadTex(){},performance,
    requestAnimationFrame:()=>1,cancelAnimationFrame(){}});
  vm.runInContext(source+`\nE.canvas={};E.stage={style:{}};E.w=900;E.h=500;
    globalThis.run=action=>{stopBattleFx();playBattleFx({action,numbers:false,
      src:{l:50,t:150,r:150,b:350},targets:[{rect:{l:650,t:150,r:750,b:350}}]});return E.items;};`,context);
  for(const action of ['ice','hypno']) {
    const items=context.run(action),visual=powerVisual(action);
    const projectile=items.find(item=>item.tex===visual.projectile&&typeof item.x==='function');
    assert.ok(projectile,`${action} emits its mapped projectile`);
    assert.ok(projectile.x(0)<projectile.x(.5)&&projectile.x(.5)<projectile.x(1),'travels toward target');
    assert.ok(items.some(item=>item.tex===visual.hand));
    assert.ok(items.every(item=>!item.tex?.includes('fire')));
  }
});
