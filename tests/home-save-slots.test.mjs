import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,loadSave,clearSave} from '../src/game.js';
import {LEGACY_SAVE_KEY,ACTIVE_SLOT_KEY,SLOT_MIGRATION_KEY,slotKey,listSaveSlots,readSaveSlot,writeSaveSlot,migrateLegacySave,selectSaveSlot,readActiveSlot,clearSaveSlot,saveSlotSummary} from '../src/save-slots.js';
import {saveSlotMenuHtml,formatPlayTime} from '../src/save-slot-menu.js';
function memory(entries=[]) {const data=new Map(entries);return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};}
const snapshot=()=>createGame().snapshot();
function withStorage(storage,fn){const before=Object.getOwnPropertyDescriptor(globalThis,'localStorage');Object.defineProperty(globalThis,'localStorage',{configurable:true,value:storage});try{return fn();}finally{if(before)Object.defineProperty(globalThis,'localStorage',before);else delete globalThis.localStorage;}}
test('legacy save is copied exactly into slot1 once; backup and other slots survive',()=>{
 const data=snapshot();data.coin=987;data.karma=23;const raw=JSON.stringify(data),s=memory([[LEGACY_SAVE_KEY,raw]]);
 assert.deepEqual(migrateLegacySave(s),{ok:true,migrated:true});assert.equal(s.getItem(slotKey(1)),raw);assert.equal(s.getItem(LEGACY_SAVE_KEY),raw);assert.equal(s.getItem(slotKey(2)),null);assert.equal(s.getItem(slotKey(3)),null);
 const revised={...data,coin:456};assert.ok(writeSaveSlot(1,revised,s));assert.deepEqual(migrateLegacySave(s),{ok:true,migrated:false});assert.equal(readSaveSlot(1,s).data.coin,456);
});
test('migration never overwrites occupied slot1 and malformed records are not empty games',()=>{
 const legacy=JSON.stringify(snapshot()),existing=JSON.stringify({...snapshot(),coin:789});const s=memory([[LEGACY_SAVE_KEY,legacy],[slotKey(1),existing],[slotKey(2),'{bad json']]);
 assert.ok(migrateLegacySave(s).ok);assert.equal(s.getItem(slotKey(1)),existing);assert.equal(readSaveSlot(2,s).status,'invalid');assert.equal(writeSaveSlot(2,snapshot(),s),false);assert.equal(s.getItem(slotKey(2)),'{bad json');
 const malformed=memory([[LEGACY_SAVE_KEY,'{bad json']]);assert.equal(migrateLegacySave(malformed).reason,'invalid-legacy');assert.equal(malformed.getItem(LEGACY_SAVE_KEY),'{bad json');
});
test('quota and unavailable storage fail without losing original data',()=>{
 const raw=JSON.stringify(snapshot()),s=memory([[LEGACY_SAVE_KEY,raw]]);s.setItem=()=>{throw Error('quota');};assert.equal(migrateLegacySave(s).ok,false);assert.equal(s.getItem(LEGACY_SAVE_KEY),raw);assert.equal(s.getItem(slotKey(1)),null);assert.equal(selectSaveSlot(1,s),false);
 const broken={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};assert.ok(listSaveSlots(broken).every(s=>s.status==='unavailable'));assert.equal(writeSaveSlot(1,snapshot(),broken),false);
});
test('real game API isolates three selected slots and refuses writes before a choice',()=>withStorage(memory(),()=>{
 const g=createGame();g.saveSlot=null;assert.equal(g.save(),false);assert.equal(localStorage.data.size,0);
 for(let id=1;id<=3;id++){const game=createGame();game.saveSlot=id;game.coin=id*123;game.karma=id*7;assert.ok(game.save());}
 assert.equal(localStorage.getItem(LEGACY_SAVE_KEY),null);
 for(let id=1;id<=3;id++){const game=createGame();assert.ok(game.restore(loadSave(id)));game.saveSlot=id;assert.equal(game.coin,id*123);assert.equal(game.karma,id*7);}
 const slot2=localStorage.getItem(slotKey(2));const game=createGame();game.saveSlot=1;game.coin=777;assert.ok(game.save());assert.equal(localStorage.getItem(slotKey(2)),slot2);assert.equal(loadSave(1).coin,777);
}));
test('restart clears only its selected slot and cannot resurrect the copied legacy save',()=>{
 const data=snapshot(),raw=JSON.stringify(data),s=memory([[LEGACY_SAVE_KEY,raw]]);migrateLegacySave(s);writeSaveSlot(2,{...data,coin:999},s);selectSaveSlot(1,s);
 assert.ok(clearSaveSlot(1,s));assert.equal(s.getItem(slotKey(1)),null);assert.equal(readSaveSlot(2,s).data.coin,999);assert.equal(readActiveSlot(s),1);assert.ok(migrateLegacySave(s).ok);assert.equal(s.getItem(slotKey(1)),null);assert.equal(s.getItem(LEGACY_SAVE_KEY),raw);
 withStorage(s,()=>{assert.equal(clearSave(null),false);assert.ok(clearSave(2));});assert.equal(s.getItem(slotKey(2)),null);
});
test('playtime survives real snapshot/restore, excludes inactive gaps and does not invent legacy history',()=>{
 const g=createGame();for(let i=0;i<65;i++)g.recordPlayTime(1000);g.recordPlayTime(5000,false);g.recordPlayTime(NaN);assert.equal(g.playTimeMs,65000);assert.equal(formatPlayTime(g.playTimeMs),'00:01:05');
 const copy=createGame();assert.ok(copy.restore(g.snapshot()));assert.equal(copy.playTimeMs,65000);assert.equal(copy.playTimePartial,false);copy.recordPlayTime(4000);assert.equal(copy.playTimeMs,66000,'long frame is bounded rather than counting offline time');
 const old=g.snapshot();delete old.playTimeMs;delete old.playTimePartial;assert.ok(copy.restore(old));assert.equal(copy.playTimeMs,0);assert.equal(copy.playTimePartial,true);assert.equal(saveSlotSummary(old).playTimePartial,true);
});
test('slot cards show all requested fields and owned crew across branches, with exactly three choices',()=>{
 const data=JSON.parse(readFileSync(new URL('./fixtures/b1-v3.json',import.meta.url)));data.playTimeMs=3723000;data.coin=12345;data.order=87;data.karma=22;
 const s=memory();writeSaveSlot(1,data,s);const html=saveSlotMenuHtml(listSaveSlots(s));assert.equal((html.match(/data-save-slot=/g)||[]).length,3);assert.equal((html.match(/New Game/g)||[]).length,2);
 for(const text of ['01:02:03','12,345','87','22','เวลาเล่น','เบี้ยกรรม','ระเบียบ','บาป','ยมทูต'])assert.ok(html.includes(text),text);
 const info=saveSlotSummary(data);assert.equal(info.actors.filter(a=>a.kind==='nira').length,1);assert.ok(info.actors.some(a=>a.zone==='th'));assert.ok(info.actors.some(a=>a.zone==='cyberhell'));
});
test('Home exposes one START action and cache aliases retain a single refreshed game module',()=>{
 const html=readFileSync('index.html','utf8'),home=html.slice(html.indexOf('<div id="title">'),html.indexOf('<div class="wrap">'));assert.ok(home.includes('id="t-start"'));assert.equal(home.includes('id="t-new"'),false);assert.equal(home.includes('id="t-resume"'),false);
 const map=JSON.parse(html.match(/<script type="importmap">\s*([\s\S]*?)\s*<\/script>/)[1]).imports;const ui=readFileSync('src/ui.js','utf8');const source=ui.match(/import \{ createGame, loadSave, clearSave, sameLabel \} from '([^']+)'/)[1];assert.equal(map[source.replace('./game.js','./src/game.js')],map['./src/game.js']);assert.ok(map['./src/game.js'].includes('home-slots'));assert.ok(html.includes('src="'+map['./src/ui.js'].replace('./src/','src/')+'"'));
});
