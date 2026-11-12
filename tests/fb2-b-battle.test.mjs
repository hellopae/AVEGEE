import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fitAllySizes} from '../src/character-scale.js';
import {planBattleFormation} from '../src/battle-formation.js';
import {foeNeedsMirror,soulPoseBaseKey,FOE_DRAWN_FACING_RIGHT} from '../src/battle-facing.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');

test('FB2-v2: two teammates of the same drawn height are the same height whatever slot they stand in; Yama keeps his own slot',()=>{
  const box={l:.1,t:.04,w:.5,h:.8};
  for(const order of [['plerng','boon','yama'],['boon','plerng','yama'],['taan','plerng','boon','yama']]){
    const actors=order.map(key=>({key,box,aspect:1})),slots=planBattleFormation(order.length,1440,900);
    const sizes=fitAllySizes(900*.24,actors,slots,{width:1440,height:900});
    const crewH=sizes.slice(0,-1).map(s=>s.h);
    for(const h of crewH)assert.ok(Math.abs(h-crewH[0])<1e-9,`${order}: all crew equal`);
    assert.ok(sizes.at(-1).h<crewH[0],'Yama stays smaller than a teammate');
  }
});
test('FB2-v2: Yama never falls back to the standing-with-book picture while a teammate acts or the enemy strikes',()=>{
  const ui=read('src/ui.js');
  assert.match(ui,/else mountBattleSwordIdle\(stage, g\.outfit \|\| g\.zone\);/);
  assert.doesNotMatch(ui,/else if \(!phase && !b\.over\) mountBattleSwordIdle/);
  const sw=read('src/yama-sword.js');
  assert.match(sw,/if\(swordIdleDrawn\)standing\.style\.visibility='hidden'/,'idle canvas hides the reference picture at mount');
});
test('FB2-9: spirits drawn facing right are mirrored to face the team on the left; their scared/cry poses follow their standing picture',()=>{
  for(const k of ['img/Thai/spirit-clerk-th-v2.webp','img/Thai/spirit-woman-th-v2.webp','img/Asia/spirit-clerk-asia-v2.webp','img/West/spirit-elder-woman-west-v2.webp'])assert.equal(foeNeedsMirror(k),true,k);
  assert.equal(foeNeedsMirror('img/soul-poses/clerk-th-caught-lie-v1.webp'),true);
  assert.equal(foeNeedsMirror('img/soul-poses/elder-woman-th-cry-v1.webp'),true);
  assert.equal(foeNeedsMirror('img/soul-poses/officer-th-necessity-v1.webp'),false);
  assert.equal(foeNeedsMirror('img/Thai/spirit-girl-th-v2.webp'),false,'drawn facing left already: untouched');
  assert.equal(soulPoseBaseKey('img/soul-poses/elder-woman-cyberhell-scared-v1.webp'),'spirit-elder-woman-cyberhell');
  assert.equal(soulPoseBaseKey('img/Thai/spirit-clerk-th-v2.webp'),'');
  for(const k of FOE_DRAWN_FACING_RIGHT)assert.match(k,/^(mob-|spirit-)/);
});
test('FB2-v2: the cloud-shadow cut over name plates is feathered, not a hard rectangle',()=>{
  const src=read('src/scene-atmosphere.js');
  assert.match(src,/shadowOffsetX=OFF/);assert.match(src,/shadowBlur=12\*kk/);
});
