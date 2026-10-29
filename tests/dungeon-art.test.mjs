import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {DUNGEON_ART,dungeonBackground} from '../src/dungeon-art.js';
import {DUNGEON_ROUTES} from '../src/zone-travel.js';
test('all three owner-approved routes use their own continuous maps',()=>{
  const paths=[];
  for(const route of DUNGEON_ROUTES){
    assert.equal(DUNGEON_ART[route.id].length,route.checkpoints.length);
    const backgrounds=new Set();
    for(let i=0;i<route.checkpoints.length;i++){
      const path=dungeonBackground(route.from,route.id,i);
      assert.ok(existsSync(path),path);paths.push(path);backgrounds.add(path);
    }
    assert.equal(backgrounds.size,1,route.id+' keeps one continuous map');
  }
  assert.equal(new Set(paths).size,3);
});
test('arrival keeps the final gate backdrop and malformed/legacy routes safely fall back',()=>{
  assert.equal(dungeonBackground('th','th:asia',3),dungeonBackground('th','th:asia',2));
  assert.equal(dungeonBackground('th','th:asia',-2),dungeonBackground('th','th:asia',0));
  assert.equal(dungeonBackground('th','th:asia',NaN),dungeonBackground('th','th:asia',0));
  assert.equal(dungeonBackground('asia','unknown',1),'img/theme-v4/frontier-asia.webp');
});
