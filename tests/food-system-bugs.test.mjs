// FOOD-SYSTEM (10 พ.ย. 2569, brief 2026-11-10-avegee-food-system.md) — the two bugs Khun Pae reported, reproduced before the rewrite:
//  1) "ให้ข้าวปั้น" cannot be pressed although rice is left
//  2) the assistant on food duty never brings rice to anyone
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
import {STATIONS} from '../src/data.js';
import {resetWalk,setBlocks,setNpcDiscs} from '../src/walk.js?v=k1d';
import {teamManageHtml} from '../src/team-hud.js';
globalThis.Image??=class{};
function game(){resetWalk();setBlocks([],[]);setNpcDiscs([]);const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=10000;g.level=5;g.paused=false;g.mobs=[];(g.zoneEvents.th||={}).frontierBreach='cleared';return g;}
const kitchen=g=>{g.stations.push({def:STATIONS.find(d=>d.k==='canteen'),build:0,repair:0,fire:0,slots:[]});};
const art=()=>'';

test('BUG 1: the team window shows rice in stock (the HUD counter) but "ให้ข้าวปั้น" is disabled — one stock must drive both', ()=>{
  const g=game();g.hire('dam');
  const dam=g.crewOf('dam');dam.hunger=20;dam.morale=100;
  g.food=50;delete g.inventory.food;   // the HUD shows 50 rice balls (img/item-food.png + g.food) … the button needed a different stock
  const html=teamManageHtml(g,art);
  const button=html.match(/<button data-team-feed="th:dam"[^>]*>/)[0];
  assert.doesNotMatch(button,/disabled/,'rice is in stock → the button must work');
  assert.ok(g.feedActor(dam.id),'feeding from the stock works');
  assert.equal(dam.hunger,60);assert.equal(g.food,49);
});

test('BUG 2: a cook + a server with supply in stock feed a hungry Yomtoot by themselves — no manual order, no Plerng / Dam', ()=>{
  const g=game();kitchen(g);g.hire('dam');g.food=60;
  const cook=g.hireWorker(),server=g.hireWorker();assert.ok(cook&&server);
  assert.ok(g.setWorkerMode(cook.id,'cook'));assert.ok(g.setWorkerMode(server.id,'serve'));
  const dam=g.crewOf('dam');dam.hunger=15;dam.morale=100;[dam.x,dam.y]=[dam.hx,dam.hy];
  for(let i=0;i<2000&&dam.hunger<=15;i++){g.stepWorld(120);if(i%4===0)g.step();}
  assert.ok(dam.hunger>15,'the server delivered a meal');
  assert.ok(g.food<60,'the cook used the supply');
});
