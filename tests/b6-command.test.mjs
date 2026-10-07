import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { commandWheel } from '../src/command-wheel.js';
const setup = () => {
 const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=10000;
 g.hire('taan');g.hire('boon');g.party.members=['taan','boon'];g.hireGuard();
 g.startBattle({id:99,who:'test',deserved:4,resist:true});
 g.battle.foes.forEach(f=>{f.hp=f.maxHp=10000;f.atk=[0,0];});return g;
};
test('selection/cancel do not spend turns; selected actor attacks and duplicate confirmation is locked',()=>{
 const g=setup(),c=g.crewOf('taan'),turn=g.battle.turn,hp=g.battle.foes[0].hp;
 assert.equal(g.selectBattleActor(c.id),true);g.battle.command='atk';assert.equal(g.cancelBattleCommand(),true);
 assert.equal(g.battle.turn,turn);assert.equal(g.battle.foes[0].hp,hp);
 assert.equal(g.confirmBattleCommand('atk'),false);
 assert.equal(g.confirmBattleCommand('crew:taan'),true);assert.equal(g.battle.helper.id,c.id);
 assert.equal(c.morale,86);assert.equal(g.battle.turn,turn+1);
 assert.equal(g.confirmBattleCommand('atk'),false);assert.equal(g.selectBattleActor('you'),false);
 assert.equal(g.battleAct('atk'),false);assert.equal(g.battle.turn,turn+1);
 g.finishBattleCommand();assert.equal(g.selectBattleActor('you'),true);
});
test('items reach chosen crew/Guard/Yama; full and MP-ineligible recipients cost nothing',()=>{
 const g=setup(),c=g.crewOf('taan');g.inventory.food=3;g.inventory.holyWater=2;g.inventory.health=2;
 c.morale=60;g.guard.morale=60;g.mp=0;
 g.selectBattleActor(g.guard.id);assert.equal(g.confirmBattleCommand('food',c.id),true);assert.equal(c.morale,80);
 assert.equal(g.inventory.food,2);g.finishBattleCommand();
 assert.equal(g.confirmBattleCommand('health',g.guard.id),true);assert.ok(g.guard.morale>60);g.finishBattleCommand();
 c.morale=100;const turn=g.battle.turn;
 assert.equal(g.confirmBattleCommand('food',c.id),false);assert.equal(g.inventory.food,2);
 assert.equal(g.confirmBattleCommand('holyWater',c.id),false);assert.equal(g.inventory.holyWater,2);assert.equal(g.battle.turn,turn);
 assert.match(g.battleRecipientWhy('holyWater',c.id),/Yama only/);
 assert.equal(g.confirmBattleCommand('holyWater','you'),true);assert.equal(g.mp,30);
});
test('Boon heals chosen friend; special cooldown blocks repetition, ordinary crew attack is removed',()=>{
 const g=setup(),c=g.crewOf('boon'),friend=g.crewOf('taan');friend.morale=30;
 g.selectBattleActor(c.id);assert.equal(g.confirmBattleCommand('crew:boon',friend.id),true);
 assert.ok(friend.morale>30);assert.equal(g.battle.dmg.healActorId,friend.id);g.finishBattleCommand();
 const turn=g.battle.turn;assert.equal(g.confirmBattleCommand('crew:boon',friend.id),false);assert.equal(g.battle.turn,turn);
 assert.equal(g.confirmBattleCommand('atk'),false);
 assert.equal(g.selectBattleActor('you'),true);assert.equal(g.confirmBattleCommand('atk'),true);
});
test('one successful command schedules exactly one enemy counter',()=>{
 const g=setup();g.battle.foes.push({...g.battle.foes[0],id:'second'});
 const before=g.battle.counterIndex || 0;assert.equal(g.confirmBattleCommand('atk'),true);
 assert.equal(g.battle.counterIndex,before+1);assert.equal(g.battle.dmg.counterFoeId,g.battle.foes[0].id);
 g.finishBattleCommand();assert.equal(g.confirmBattleCommand('atk'),true);assert.equal(g.battle.counterIndex,0);assert.equal(g.battle.dmg.counterFoeId,'second');
});
test('data-driven petals carry actor identity; court retains old four segments and warrant',()=>{
 for(const n of [2,3]){const html=commandWheel({segments:Array.from({length:n},(_,i)=>({id:`s${i}`,label:`L${i}`,icon:'old.png',choices:'choice'})),actorName:'Guard',portrait:'guard.png'});
 assert.equal((html.match(/class="actor-segment/g)||[]).length,n);assert.match(html,/guard.png/);assert.match(html,/Guard/);}
 const court=commandWheel({groups:Array.from({length:4},()=>({choices:'old'}))});
 assert.equal((court.match(/class="command-segment/g)||[]).length,4);assert.match(court,/id="t-go"/);assert.match(court,/Button1.png/);
});
test('actor ownership is rechecked; down recipient and actor cannot execute',()=>{
 const g=setup(),c=g.crewOf('taan');
 assert.equal(g.confirmBattleCommand('crew:taan'),false);
 g.selectBattleActor(c.id);assert.equal(g.confirmBattleCommand('fire'),false);
 g.inventory.food=1;g.downActor(g.guard);
 const turn=g.battle.turn;assert.equal(g.confirmBattleCommand('food',g.guard.id),false);
 g.downActor(c);assert.equal(g.confirmBattleCommand('atk'),false);
 assert.equal(g.battle.turn,turn);assert.equal(g.inventory.food,1);
});
test('Kan applies hypnosis to the selected enemy',()=>{
 const g=setup();g.hire('kan');g.party.members=['kan'];
 const c=g.crewOf('kan');g.battle.foes.push({...g.battle.foes[0],id:'chosen',confuse:0});
 g.selectBattleActor(c.id);g.selectFoe('chosen');
 assert.equal(g.confirmBattleCommand('crew:kan'),true);
 assert.equal(g.battle.dmg.foeId,'chosen');assert.equal(g.battle.foes[1].confuse,1);
 assert.equal(g.battle.foes[0].confuse,0);
});

test('final battle exposes eight actors and dispatches to the selected cross-zone twin',()=>{
 const g=setup();g.restore(JSON.parse(readFileSync(new URL('./fixtures/b1-v3.json',import.meta.url))));
 const ids=['th:taan','asia:taan','west:taan','cyberhell:taan','th:kan','west:boon'];
 g.zone='cyberhell';g.guard={id:'cyberhell:guard',k:'guard',homeZone:'cyberhell',morale:100};
 for(const id of ids){g.roster[id].morale=92;g.roster[id].recoverUntil=0;g.roster[id].helpRemainingMs=0;}
 g.battle={kind:'zoneEvent',eventKey:'cyberFinal',encounter:'ruler:th',team:ids,
  foes:[{id:'foe',hp:10000,maxHp:10000,atk:[0,0]}],selectedFoeId:'foe',youHp:100,youMax:100,turn:1,log:[]};
 assert.equal(g.battleActors().length,8);g.selectBattleActor('west:taan');
 assert.equal(g.confirmBattleCommand('crew:west:taan'),true);assert.equal(g.battle.helper.id,'west:taan');
 assert.equal(g.roster['west:taan'].morale,86);assert.equal(g.roster['th:taan'].morale,92);
 assert.equal(g.battleActors().length,8);
});
