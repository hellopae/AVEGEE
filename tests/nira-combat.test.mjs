import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
import {isFrontierDuoBattle,niraCombatFrame,niraCombatSheet,playNiraHealingCutscene} from '../src/nira-combat.js';

function setup() {
  const game=createGame();game.save=()=>true;game.onChange=()=>{};game.coin=10000;
  game.hire('taan');game.hire('boon');game.hireGuard();game.party.members=['taan','boon'];
  game.startBattle({id:900,who:'test',deserved:4,resist:true});
  game.battle.foes.forEach(foe=>{foe.hp=foe.maxHp=10000;foe.atk=[1,1];});
  game.battle.dungeonToken='th:asia:test';
  return game;
}
const niraTurn=game=>{
  game.beginBattleTurns();
  assert.equal(game.currentBattleTurn().id,'you');
  assert.equal(game.confirmBattleCommand('defend'),true);game.finishBattleCommand();
  assert.equal(game.currentBattleTurn().id,'global:nira');
};

test('outside frontier fights use only Yama and Nira despite the selected party and hired guard',()=>{
  const game=setup();
  for(const zone of ['th','asia','west','cyberhell']) {
    game.zone=zone;
    assert.deepEqual(game.battleActors().map(actor=>actor.id),['you','global:nira']);
    assert.equal(game.guardActive(),false);assert.equal(game.enemyGuard(),null);
    assert.equal(game.battleAct('guard'),false);
    assert.equal(game.battleAct('crew:taan'),false);
  }
  delete game.battle.dungeonToken;
  assert.ok(game.battleActors().some(actor=>actor.k==='taan'));
  assert.equal(game.guardActive(),true,'ordinary town battles retain selected party');
  assert.equal(isFrontierDuoBattle({kind:'frontier'}),true);
  assert.equal(isFrontierDuoBattle({challenge:true,sceneBiome:'cave'}),true);
  assert.equal(isFrontierDuoBattle({kind:'zoneEvent'}),false);
});

test('Nira gets a distinct turn and normal attack without spending healing cooldown',()=>{
  const game=setup(),nira=game.crewOf('nira');niraTurn(game);
  const foe=game.battle.foes[0],before=foe.hp;
  assert.equal(game.confirmBattleCommand('strike'),true);
  assert.equal(before-foe.hp,18);assert.equal(nira.helpRemainingMs||0,0);
  assert.equal(game.battle.helper.k,'nira');assert.equal(game.battle.helper.lunge,true);
  game.finishBattleCommand();assert.equal(game.currentBattleTurn().side,'foe');
});

test('outside battles need no hired office helper or selected frontier team',()=>{
  const game=createGame();game.save=()=>true;game.onChange=()=>{};
  game.crew=game.crew.filter(actor=>actor.k==='nira');game.frontierOf().team=[];
  assert.ok(game.startFrontierBattle());
  assert.deepEqual(game.battle.team,['nira']);
  assert.deepEqual(game.battleActors().map(actor=>actor.id),['you','global:nira']);
});

test('Nira heals Yama or herself with capped HP, animation metadata and cooldown',()=>{
  for(const target of ['you','global:nira']) {
    const game=setup(),nira=game.crewOf('nira');niraTurn(game);
    game.battle.youHp=game.battle.youMax-20;nira.morale=50;
    const before=target==='you'?game.battle.youHp:nira.morale;
    assert.equal(game.confirmBattleCommand('crew:nira',target),true);
    const after=target==='you'?game.battle.youHp:nira.morale;
    assert.ok(after>before);assert.ok(after<= (target==='you'?game.battle.youMax:100));
    assert.equal(game.battle.dmg.healActorId,target);
    assert.equal(game.battle.helper.pose,'heal');assert.equal(game.battle.helper.lunge,false);
    assert.ok(nira.helpRemainingMs>0);
    game.finishBattleCommand();
    assert.ok(game.crewHelpWhy(nira).includes('รออีก'));
  }
});

test('full recipient and excluded party targets cannot consume Nira healing',()=>{
  const game=setup(),nira=game.crewOf('nira');niraTurn(game);
  game.battle.youHp=game.battle.youMax;
  assert.equal(game.confirmBattleCommand('crew:nira','you'),false);
  assert.equal(game.confirmBattleCommand('crew:nira',game.crewOf('taan').id),false);
  assert.equal(nira.helpRemainingMs||0,0);
});

test('downed Nira leaves the queue without admitting another companion',()=>{
  const game=setup(),nira=game.crewOf('nira');nira.morale=0;
  assert.deepEqual(game.battleActors().map(actor=>actor.id),['you']);
  assert.ok(game.battleTimeline().every(unit=>unit.side!=='ally'||unit.id==='you'));
});

test('combat art uses all four regional sheets and the four animation rows',()=>{
  for(const zone of ['th','asia','west','cyberhell']) assert.equal(niraCombatSheet(zone),`img/nira-combat/nira-${zone}-sheet-v1.webp`);
  for(const [row,pose] of ['idle','attack','hurt','heal'].entries()) {
    assert.deepEqual(niraCombatFrame(pose,0),{row,column:0});
    assert.deepEqual(niraCombatFrame(pose,450),{row,column:3});
    assert.deepEqual(niraCombatFrame(pose,600),{row,column:0});
  }
  assert.doesNotThrow(()=>playNiraHealingCutscene({open:false},'th','fallback.png'));
});

test('healing cutscene has an accessible fallback, visible title and immediate skip',()=>{
  const savedDocument=globalThis.document,savedImage=globalThis.Image;
  try {
    globalThis.Image=class {};
    globalThis.document={createElement:tag=>({tag,style:{},children:[],setAttribute(k,v){this[k]=v;},
      append(...children){this.children.push(...children);},remove(){this.removed=true;}})};
    let overlay;const dialog={open:true,querySelector:()=>null,appendChild:node=>{overlay=node;}};
    playNiraHealingCutscene(dialog,'asia','img/Asia/crew-nira-asia.png');
    assert.equal(overlay.role,'status');assert.match(overlay['aria-label'],/นิรา/);
    assert.equal(overlay.children[0].src,'img/Asia/crew-nira-asia.png');
    assert.equal(overlay.children[1].textContent,'นิรา · แสงฟื้นบารมี');
    assert.equal(overlay.children[2].tag,'button');
    overlay.onclick();assert.equal(overlay.removed,true);
  } finally {
    globalThis.document=savedDocument;globalThis.Image=savedImage;
  }
});
