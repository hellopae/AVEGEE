import test from 'node:test';
import assert from 'node:assert/strict';
import { planDash, dashTiming, dashPosition, createDashSequence, isMeleeAction } from '../src/battle-dash.js';
import { createGame } from '../src/game.js';

test('B1 measured endpoint leaves a sprite-width-aware gap in either direction and aligns feet', () => {
 const a={l:100,r:150,t:200,b:300}, b={l:500,r:640,t:180,b:320};
 const d=planDash(a,b); assert.equal(a.r+d.x,b.l-8);assert.equal(a.b+d.y,b.b);assert.equal(d.face,1);
 const e=planDash(b,a);assert.equal(b.l+e.x,a.r+8);assert.equal(b.b+e.y,a.b);assert.equal(e.face,-1);
});
test('B1 outbound, contact hold, return and exact home position',()=>{
 const t=dashTiming(), d={x:300,y:-30};
 assert.deepEqual(dashPosition(0,d,t),{x:0,y:0});
 assert.equal(dashPosition(145,d,t).x,150);
 assert.deepEqual(dashPosition(t.arrive,d,t),d);
 assert.deepEqual(dashPosition(t.hit,d,t),d);
 assert.equal(dashPosition(t.returning+85,d,t).x,150);
 assert.deepEqual(dashPosition(t.end,d,t),{x:0,y:0});
});
const setup=()=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};g.party.members=[];g.startBattle({id:99,who:'test',deserved:4,resist:true});g.battle.foes.forEach(f=>{f.hp=f.maxHp=10000;});g.beginBattleTurns();return g;};
for(const reduced of [false,true])test(`B1 real command damages exactly once at contact and holds the turn until home (reduced=${reduced})`,()=>{
 const g=setup(), b=g.battle, hp=b.foes[0].hp, timing=dashTiming({reduced});let calls=0,position;
 const advance=createDashSequence({timing,delta:{x:300,y:20},onPosition:p=>position=p,
  onHit:()=>{calls++;assert.equal(g.confirmBattleCommand('atk'),true);},
  onFinish:()=>{assert.deepEqual(position,{x:0,y:0});g.finishBattleCommand();}});
 advance(timing.hit-1);assert.equal(b.foes[0].hp,hp);assert.equal(g.currentBattleTurn().id,'you');
 advance(timing.hit);const after=b.foes[0].hp;assert.ok(after<hp);assert.equal(b.commandBusy,true);
 advance(timing.hit+1);advance(timing.end-1);assert.equal(b.foes[0].hp,after);assert.equal(calls,1);assert.equal(g.currentBattleTurn().id,'you');
 advance(timing.end);assert.equal(b.commandBusy,false);assert.equal(g.currentBattleTurn().side,'foe');advance(timing.end+100);assert.equal(calls,1);
 if(reduced)for(const at of [0,100,timing.hit,timing.end])assert.deepEqual(dashPosition(at,{x:300,y:20},timing),{x:0,y:0});
});
test('B1 a delayed tick still dispatches pose, one hit, return then finish in order',()=>{
 const events=[], t=dashTiming();const advance=createDashSequence({timing:t,delta:{x:1,y:0},onPosition:()=>{},onPose:()=>events.push('pose'),onHit:()=>events.push('hit'),onReturn:()=>events.push('return'),onFinish:()=>events.push('finish')});
 advance(5000);advance(6000);assert.deepEqual(events,['pose','hit','return','finish']);
});
test('B1 only physical melee recipes opt in; ranged, magic, healing and items stay on their existing path',()=>{
 for(const a of ['atk','strike','guard','crew:taan','crew:dam'])assert.equal(isMeleeAction(a),true,a);
 for(const a of ['fire','flameCharge','ice','wind','windFan','valkyrieSpear','hypno','crew:kan','crew:plerng','crew:boon','crew:nira','food','tea','health','rage','mirror','cooldownClock','defend','flee'])assert.equal(isMeleeAction(a),false,a);
});
