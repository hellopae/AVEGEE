import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
import {initializeBossGuides,bossGuideCombatant,completeBossGuideStory} from '../src/boss-guides.js';
import {isFrontierDuoBattle} from '../src/nira-combat.js';
const setup=(zone='th')=>{
 const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=10000;
 g.zoneEvents.th={frontierBreach:'cleared'};g.hire('taan');g.hire('boon');g.hireGuard();g.frontierOf().team=['taan','boon'];g.party.members=['taan','boon'];
 g.zone=zone;g.frontierOf().team=['taan','boon'];g.snapshot();return g;
};
const journey=g=>{g.bossCleared[g.zone]=true;initializeBossGuides(g);completeBossGuideStory(g,`boss-guide-${g.zone}-welcome`);};
const encounter=g=>{g.mobs.push({id:900,kind:2,dungeonToken:`${g.zone}:travel:0`});return g.startMobBattle(g.mobs.length-1);};
test('ordinary border patrol keeps the selected keepers and hired guard even while a guide is available',()=>{
 const g=setup();journey(g);g.startFrontierBattle();
 assert.deepEqual(g.battleCrew().map(c=>c.k),['taan','boon']);assert.equal(g.guardActive(),true);
 assert.equal(g.battleActors().some(c=>c.k==='nira'||c.k==='guide'),false);
});
test('a dungeon before the guiding journey retains its selected team',()=>{
 const g=setup();encounter(g);assert.equal(isFrontierDuoBattle(g.battle),false);
 assert.deepEqual(g.battleCrew().map(c=>c.k),['taan','boon']);assert.equal(g.guardActive(),true);
});
for(const zone of ['th','asia','west'])test(`${zone} guide joins Yama and Nira as a real combatant only on the journey`,()=>{
 const g=setup(zone);journey(g);const roster=Object.keys(g.roster),party=[...g.party.members];encounter(g);
 assert.deepEqual(g.battleActors().map(c=>c.k),['yama','nira','guide']);assert.equal(g.guardActive(),false);
 const guide=bossGuideCombatant(g);assert.equal(guide.homeZone,zone);assert.ok(g.allyStats(guide).dmg>0);
 g.battle.foes.forEach(f=>{f.hp=f.maxHp=10000;f.atk=[1,1];});
 assert.equal(g.battleAct('crew:guide'),true);assert.equal(g.battle.helper.k,'guide');assert.ok(g.battle.dmg.foe>0);
 guide.morale=43;g.advanceBattleTime(1000);const cooldown=guide.helpRemainingMs;assert.ok(cooldown>0);
 const copy=createGame();copy.save=()=>true;copy.onChange=()=>{};assert.equal(copy.restore(JSON.parse(JSON.stringify(g.snapshot()))),true);
 assert.equal(bossGuideCombatant(copy).morale,43);assert.equal(bossGuideCombatant(copy).helpRemainingMs,cooldown);
 assert.deepEqual(Object.keys(g.roster),roster);assert.deepEqual(g.party.members,party);
 g.battle=null;g.startFrontierBattle();assert.equal(g.battleActors().some(c=>c.k==='guide'||c.k==='nira'),false);
});
test('guide cannot attack while down and no office replacement is added; farewell removes the guest and the route stays Yama + Nira',()=>{
 const g=setup();journey(g);encounter(g);const guide=bossGuideCombatant(g);g.downActor(guide);
 assert.deepEqual(g.battleActors().map(c=>c.k),['yama','nira']);assert.equal(g.battleAct('crew:guide'),false);
 g.battle=null;completeBossGuideStory(g,'boss-guide-th-farewell');assert.equal(bossGuideCombatant(g),null);
 // O1 (Kittanate 21 Oct): walking the route again after the farewell is Yama + Nira only. The hired keepers and the guard
 // stay with the frontier station (see the ordinary-patrol test above), not on the outer route.
 g.battle=null;g.mobs=[];encounter(g);assert.equal(isFrontierDuoBattle(g.battle),true);assert.deepEqual(g.battleActors().map(c=>c.k),['yama','nira']);assert.equal(g.guardActive(),false);
});
test('the guide receives a selectable turn and Nira can heal the guide',()=>{
 const g=setup();journey(g);encounter(g);g.battle.foes.forEach(f=>{f.hp=f.maxHp=10000;f.atk=[1,1];});
 const guide=bossGuideCombatant(g);guide.morale=40;
 assert.equal(g.currentBattleTurn().id,'you');assert.equal(g.confirmBattleCommand('defend'),true);g.finishBattleCommand();
 assert.equal(g.currentBattleTurn().id,'global:nira');assert.equal(g.confirmBattleCommand('crew:nira',guide.id),true);
 assert.ok(guide.morale>40);g.finishBattleCommand();
 assert.equal(g.currentBattleTurn().id,guide.id);
 const before=g.battle.foes[0].hp;assert.equal(g.confirmBattleCommand('strike'),true);assert.ok(g.battle.foes[0].hp<before);
 assert.equal(g.battle.helper.id,guide.id);assert.equal(g.battle.helper.lunge,true);
 assert.equal(g.battleActors().some(a=>a.k==='guard'||a.k==='taan'),false);
});
