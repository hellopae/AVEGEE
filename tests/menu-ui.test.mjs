import test from 'node:test';
import assert from 'node:assert/strict';
import { carriedItems,weaponBonusComparison,bindMenuTabs } from '../src/menu-ui.js';
import {commandWheel} from '../src/command-wheel.js';
test('inventory filters only known carried items and separates recovery from trade goods',()=>{
 const defs={hp:{hpRatio:.25},mp:{mp:20},ore:{material:true},fire:{fireAmmo:1}};
 const inventory={hp:2,mp:0,ore:3,fire:1,unknown:99};const before=structuredClone(inventory);
 assert.deepEqual(carriedItems(inventory,defs,'recovery'),[['hp',2]]);
 assert.deepEqual(carriedItems(inventory,defs,'material'),[['ore',3]]);
 assert.deepEqual(carriedItems(inventory,defs,'other'),[['fire',1]]);
 assert.deepEqual(inventory,before);
});
test('weapon comparison distinguishes additive attack bonus from different special effects',()=>{
 const weapons={fang:{atk:.2,burn:true},cane:{atk:.2,drain:true},chain:{atk:.25}};
 assert.deepEqual(weaponBonusComparison(weapons,'fang','cane'),{current:20,next:20,delta:0});
 assert.deepEqual(weaponBonusComparison(weapons,'chain',null),{current:25,next:0,delta:-25});
});
test('menu arrows wrap and Home/End move both selected section and focus',()=>{
 let selected,focused;const buttons=['items','outfits','weapons'].map(key=>({dataset:{menuTab:key},focus(){focused=key;}}));
 bindMenuTabs({querySelectorAll:()=>buttons},'[data-menu-tab]',key=>selected=key);
 const key=(i,key)=>buttons[i].onkeydown({key,preventDefault(){}});
 key(0,'ArrowLeft');assert.equal(selected,'weapons');assert.equal(focused,'weapons');
 key(2,'Home');assert.equal(selected,'items');assert.equal(focused,'items');
 key(0,'End');assert.equal(selected,'weapons');assert.equal(focused,'weapons');
});
test('busy battle command dock keeps every tab disabled until the command completes',()=>{
 const html=commandWheel({battle:true,busy:true,actorName:'Yama',segments:[
  {id:'attack',label:'โจมตี / Attack',choices:'<button>Attack</button>'},
  {id:'item',label:'ไอเท็ม / Items',choices:'<button>Item</button>'},
 ]});
 assert.match(html,/battle-command-dock busy/);
 assert.equal((html.match(/aria-expanded="false"[^>]*disabled/g)||[]).length,2);
 assert.equal((html.match(/data-options="[^"]+" inert/g)||[]).length,2);
});
