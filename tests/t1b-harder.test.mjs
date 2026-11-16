// T1b (owner 16 Nov): "make it harder" - the enemy's damage per round grows with its turns (damageExp 0.8); the per-fight corrections are complete and sane.
import test from 'node:test';import assert from 'node:assert/strict';
import {TURN_RULE,foeHitScale} from '../src/battle-turns.js';
import {FOE_TURN_FIT,FOE_HP_FIT,fightFitKey,foeFit,foeHpFit} from '../src/foe-turn-fit.js';
import {ENCOUNTER_BALANCE} from '../src/encounter-balance.js';
import {ATK_PER_PARTY} from '../src/quest-fights.js';
test('T1b: damageExp 0.8 - n turns a round deal n^0.2 times the old damage per round (x1 at one turn)',()=>{
 assert.equal(TURN_RULE.damageExp,0.8);
 assert.equal(foeHitScale(1),1);
 for(const n of [2,3,5,7])assert.ok(Math.abs(foeHitScale(n)*n-n**0.2)<1e-9,`n=${n}`);
 assert.ok(foeHitScale(3)*3>1.24&&foeHitScale(3)*3<1.26,'x1.25 at 3 turns');
});
test('T1b: every fitted fight has a multiplier for every team size 3-7, all inside the sane band; the HP correction is a mild lengthening',()=>{
 assert.ok(Object.keys(FOE_TURN_FIT).length>=22);
 for(const [k,row] of Object.entries(FOE_TURN_FIT)){for(let s=3;s<=7;s++){assert.ok(row[s]>=0.3&&row[s]<=3.5,`${k}/${s} = ${row[s]}`);}}
 for(const [k,row] of Object.entries(FOE_HP_FIT))for(const [s,v] of Object.entries(row))assert.ok(v>=1&&v<=1.5,`${k}/${s} hp x${v}`);
});
test('T1b: the Thai border breach (no event key of its own) has its fit key; fights without a fit are untouched',()=>{
 assert.equal(fightFitKey({kind:'frontierBreach'}),'frontierBreach');
 assert.equal(fightFitKey({kind:'zoneEvent',eventKey:'asiaWukong'}),'asiaWukong');
 assert.equal(fightFitKey({kind:'zoneBoss',zone:'west'}),'boss:west');
 assert.equal(fightFitKey({kind:'mob'}),null);assert.equal(foeFit({kind:'mob'},4),1);assert.equal(foeHpFit({kind:'mob'},4),1);
 assert.equal(foeFit({kind:'zoneEvent',eventKey:'asiaWukong'},5),FOE_TURN_FIT.asiaWukong[5]);
});
test('T1b: border and quest rows are refitted and complete',()=>{
 for(const [zone,sizes] of Object.entries({th:[3],asia:[3,4,5],west:[3,4,5,6],cyberhell:[3,4,5,6,7]}))for(const s of sizes)assert.ok(ENCOUNTER_BALANCE[`${zone}:frontier`][s].atk>0,`${zone}/${s}`);
 for(const q of ['sqKan','sqBoon','sqGuard','sqMerchantFeather'])for(const s of [4,5,6,7])assert.ok(ATK_PER_PARTY[q][s]>0.5&&ATK_PER_PARTY[q][s]<2,`${q}/${s}`);
});
