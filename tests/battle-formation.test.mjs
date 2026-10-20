import test from 'node:test';
import assert from 'node:assert/strict';
import {planBattleFormation} from '../src/battle-formation.js';

test('normal party feet form a diagonal with room to step toward foes',()=>{
  for(const [w,h] of [[930,665],[367,500]])for(let count=1;count<=4;count++){
    const slots=planBattleFormation(count,w,h);
    assert.equal(slots.length,count);
    slots.forEach((p,i)=>{
      assert.ok(p.x>0&&p.x+p.stepX<w*.5);
      assert.ok(p.y>h*.5&&p.y<h*.85);
      assert.ok(p.stepX>0&&p.stepY<0);
      if(i){assert.ok(p.x>slots[i-1].x);assert.ok(p.y>slots[i-1].y);}
    });
    assert.ok(slots.at(-1).scale/slots[0].scale<1.07,'party visible heights stay close');
  }
});
test('eight-member party has two distinct diagonal files and stable back-to-front slots',()=>{
  const slots=planBattleFormation(8,930,665);
  assert.equal(slots.length,8);
  for(let i=0;i<4;i++){
    assert.ok(slots[i+4].y>slots[i].y);
    assert.ok(slots[i+4].depth>slots[i].depth);
    if(i)assert.ok(slots[i].y>slots[i-1].y&&slots[i+4].y>slots[i+3].y);
  }
  assert.ok(slots.at(-1).y<665*.85,'front row stays above profiles');
});

test('Yama and companions in two/three-member parties stay within a compact shared file',()=>{
 for(const count of [2,3])for(const width of [367,930,1280]){
  const feet=planBattleFormation(count,width,665);
  assert.ok(feet.at(-1).x-feet[0].x<=width*.08,'small parties remain closer than the former 12.5% spread');
  assert.ok(feet.at(-1).x+feet.at(-1).stepX<width*.5,'active member still leaves space before enemy side');
 }
});
