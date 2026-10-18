import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CHASE,newChase,stepChase,chaseAlerted,retreatS,chaseInReach} from '../src/dungeon-chase.js';
import {createGame} from '../src/game.js';import {FRONTIER} from '../src/data.js';
import {DUNGEON_CHECKPOINTS,DUNGEON_PROGRESS,DUNGEON_TOTAL,dungeonPoint,dungeonProjection,dungeonChaseReach} from '../src/dungeon-view.js';
globalThis.Image=class {};
const HOME=DUNGEON_PROGRESS[0]*DUNGEON_TOTAL;
const run=(c,hero,ms,opts)=>{const ev=[];for(let t=0;t<ms;t+=16){const e=stepChase(c,typeof hero==='function'?hero(t):hero,16,opts);if(e)ev.push(e);}return ev;};
const setup=()=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=10000;g.bossCleared.th=true;Object.assign(g.player,{x:FRONTIER.x,y:FRONTIER.y});assert.equal(g.beginBorderDungeon('asia'),true);return g;};
const at=(g,s)=>{const p=dungeonPoint(s/DUNGEON_TOTAL);g.zoneTravel.active.position={x:p[0],y:p[1]};};

test('enemy stays put outside its sight radius',()=>{
  const c=newChase(HOME);assert.deepEqual(run(c,HOME-CHASE.sight-.01,3000),[]);assert.equal(c.phase,'idle');assert.equal(c.s,HOME);
});
test('hero inside sight: ❗ first, then the enemy walks in and contact fires exactly once',()=>{
  const c=newChase(HOME),hero=HOME-CHASE.sight+.01;
  assert.equal(stepChase(c,hero,16),'alert');assert.ok(chaseAlerted(c));
  const alertSteps=[];for(let t=16;t<CHASE.alertMs-40;t+=16){stepChase(c,hero,16);alertSteps.push(c.s);}
  assert.ok(alertSteps.every(s=>s===HOME),'enemy waits during the ❗ beat');
  const ev=run(c,hero,4000);assert.deepEqual(ev,['contact']);assert.equal(c.phase,'contact');
  assert.ok(c.s-hero<=CHASE.contact+1e-9);assert.ok(c.s<HOME,'enemy left its post');assert.ok(c.s>=hero,'enemy never passes through Yama');
  assert.equal(stepChase(c,hero,16),null);
});
test('Yama can still walk away: faster hero escapes, enemy gives up and walks home',()=>{
  const c=newChase(HOME);let hero=HOME-.1;stepChase(c,hero,16);run(c,hero,CHASE.alertMs+50);assert.equal(c.phase,'chase');
  const ev=run(c,t=>{hero-=.00019*16;return Math.max(0,hero);},1600);assert.deepEqual(ev,[]);
  run(c,0,6000);assert.equal(c.phase,'idle');assert.equal(c.s,HOME,'back at its post');
});
test('hold (cooldown / locked) stops the chase and never produces contact',()=>{
  const c=newChase(HOME),hero=HOME-.03;assert.deepEqual(run(c,hero,5000,{hold:true}),[]);assert.equal(c.phase,'idle');
  const d=newChase(HOME);stepChase(d,hero,16);assert.ok(chaseAlerted(d));stepChase(d,hero,16,{hold:true});assert.equal(chaseAlerted(d),false,'hold drops the ❗ and the chase');
});
test('enemy only ever moves along the corridor (corridor distance), so it cannot cross unwalkable ground',()=>{
  const c=newChase(HOME);let min=Infinity;const hero=HOME-.12;
  for(let t=0;t<3000;t+=16){stepChase(c,hero,16);const p=dungeonPoint(c.s/DUNGEON_TOTAL);min=Math.min(min,dungeonProjection(p).distance);}
  assert.ok(min<1e-9);assert.ok(c.s<=HOME&&c.s>=0);
});
test('route start is outside the first enemy sight; flee spot is outside sight too',()=>{
  for(const [i,v] of DUNGEON_PROGRESS.entries()){const home=v*DUNGEON_TOTAL;assert.ok(home-retreatS(home)>=CHASE.sight||retreatS(home)===0,String(i));}
  assert.ok(HOME>CHASE.sight*CHASE.leash,'a fresh dungeon start is outside the first enemy leash, so Yama can always escape back to it');
  assert.equal(retreatS(.01),0);
});
test('game: chased encounter needs reach of the enemy post; old checkpoint button path is unchanged',()=>{
  const g=setup();at(g,0);assert.equal(dungeonChaseReach(g),false);assert.equal(g.startDungeonEncounter({chased:true}),null);
  assert.equal(g.startDungeonEncounter(),null);
  at(g,HOME-.1);assert.equal(dungeonChaseReach(g),true);assert.equal(g.startDungeonEncounter(),null,'button path still needs the checkpoint');
  const b=g.startDungeonEncounter({chased:true});assert.ok(b);assert.equal(b.kind,'mob');assert.ok(b.dungeonToken);
});
test('game: not in a dungeon -> chased start refused, city mobs keep the normal flow',()=>{
  const g=createGame();g.save=()=>true;g.onChange=()=>{};assert.equal(g.startDungeonEncounter({chased:true}),null);
  g.mobs.push({id:'city-mob',kind:0,x:g.player.x,y:g.player.y});const n=g.nearestMob();assert.ok(n);const b=g.startMobBattle(n.i);assert.ok(b);assert.equal(b.dungeonToken,null);
  g.battle.over='flee';g.endBattle();assert.equal(g.dungeonChaseCooldown,undefined,'city flee does not touch dungeon chase state');
});
test('game: fleeing a chased fight puts Yama back outside sight, enemy stays, cooldown armed',()=>{
  const g=setup();at(g,HOME-.1);const b=g.startDungeonEncounter({chased:true});assert.ok(b);
  const token=b.dungeonToken;assert.equal(g.zoneTravel.active.pending,token);
  b.over='flee';g.endBattle();
  const a=g.zoneTravel.active;assert.equal(a.pending,null);assert.equal(a.checkpoint,0,'flee does not clear the checkpoint');assert.equal(g.mobs.some(m=>m.dungeonToken),false);
  const s=dungeonProjection([a.position.x,a.position.y]).progress*DUNGEON_TOTAL;
  assert.ok(Math.abs(s-retreatS(HOME))<1e-6);assert.ok(HOME-s>=CHASE.sight-1e-6);
  assert.equal(g.dungeonChaseCooldown,true);
  // a later view mount reads the flag once, so the next fight is not instant
  const c=newChase(HOME);assert.deepEqual(run(c,s,CHASE.cooldownMs-200,{hold:true}),[]);
});
test('game: winning clears the checkpoint with no retreat; losing also steps back',()=>{
  const g=setup();at(g,HOME-.1);let b=g.startDungeonEncounter({chased:true});b.foes.forEach(f=>f.hp=1);g.battleAct('atk');assert.equal(b.over,'win');
  const before={...g.zoneTravel.active.position};g.endBattle();assert.equal(g.zoneTravel.active.checkpoint,1);assert.deepEqual(g.zoneTravel.active.position,before);assert.notEqual(g.dungeonChaseCooldown,true);
  const h=setup();at(h,HOME-.1);b=h.startDungeonEncounter({chased:true});b.over='lose';h.endBattle();assert.equal(h.zoneTravel.active.checkpoint,0);assert.equal(h.dungeonChaseCooldown,true);
});
test('wiring: view uses chase + ❗ + cut-in, ui hands chased opts to the game, cache-bust -l5',()=>{
  const view=readFileSync(new URL('../src/dungeon-view.js',import.meta.url),'utf8'),ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8'),html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(view,/stepChase\(chase,progress\*total/);assert.match(view,/❗/);assert.match(view,/onEncounter\(status\.location,\{chased:true\}\)/);
  assert.match(ui,/onEncounter:\(location,opts\)=>/);assert.match(ui,/startDungeonEncounter\(opts\?\.chased\?opts:location\?\.checkpoint\)/);assert.match(ui,/dungeon-view\.js\?v=l5/);
  assert.match(html,/src\/ui\.js\?v=(?:[^"]+-l5|20261016-(?:night-city-v1|map-polish-v1|border-nira-v2|boss-justice-workers-v1(?:-n1)?))"/);
  assert.doesNotMatch(readFileSync(new URL('../src/frontier.js',import.meta.url),'utf8'),/dungeon-chase/,'frontier defence / city mobs untouched');
});
