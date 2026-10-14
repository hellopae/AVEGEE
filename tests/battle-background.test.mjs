import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {battleBiomeFor,battleBackground,BATTLE_BIOMES} from '../src/battle-background.js';
test('Thai map fights select biome at the encounter location',()=>{
  assert.equal(battleBiomeFor('th',{kind:'mob'},{x:550,y:600}),'volcano');
  assert.equal(battleBiomeFor('th',{kind:'mob'},{x:3480,y:740}),'ice');
  assert.equal(battleBiomeFor('th',{kind:'mob'},{x:3450,y:1830}),'forest');
  assert.equal(battleBiomeFor('th',{kind:'mob'},{x:1920,y:1250}),null);
  assert.equal(battleBiomeFor('th',{kind:'zoneBoss'},{x:550,y:600}),null);
});
test('route encounters use forest while other realms keep their own art',()=>{
  assert.match(battleBackground('th',{kind:'mob',dungeonToken:'th:asia:0'}),/forest/);
  assert.equal(battleBackground('asia',{kind:'mob',sceneBiome:'ice'}),'img/theme-v4/arena-asia.webp');
  assert.equal(battleBackground('west',{kind:'frontier'}),'img/theme-v4/frontier-west.webp');
  for(const sceneBiome of BATTLE_BIOMES)assert.ok(existsSync(battleBackground('th',{sceneBiome})));
});
