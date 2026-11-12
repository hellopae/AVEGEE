import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createGame} from '../src/game.js';
import {listSaveSlots,writeSaveSlot,readSaveSlot,clearSaveSlot,slotKey,saveSlotSummary,selectSaveSlot,readActiveSlot} from '../src/save-slots.js';
import {saveSlotMenuHtml,saveSlotConfirmHtml,slotDeletedNote} from '../src/save-slot-menu.js';
const memory=()=>{const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};};
const snap=(coin)=>({...createGame().snapshot(),coin});
test('FB2-17: every occupied slot has its own trash button beside (never inside) the card; empty slots have none',()=>{
 const s=memory();writeSaveSlot(1,snap(11),s);writeSaveSlot(2,snap(22),s);
 const html=saveSlotMenuHtml(listSaveSlots(s));
 assert.equal((html.match(/data-slot-delete="/g)||[]).length,2);
 assert.match(html,/data-slot-delete="1"/);assert.match(html,/data-slot-delete="2"/);assert.doesNotMatch(html,/data-slot-delete="3"/);
 // a <button> may not contain a <button>: the trash button must come after the card's closing tag
 for(const id of [1,2]){const i=html.indexOf(`data-save-slot="${id}"`),j=html.indexOf(`data-slot-delete="${id}"`);assert.ok(j>html.indexOf('</button>',i),`slot ${id}: trash outside the card button`);}
 assert.ok(existsSync(new URL('../img/ui/icon-trash.webp',import.meta.url)),'placeholder picture exists (a real drawing overwrites it)');
});
test('FB2-17: the confirmation names the slot, shows what is in it, says it cannot be recovered; cancel is the default focus, delete is the red one',()=>{
 const s=memory();const g=snap(4321);g.playTimeMs=3661000;writeSaveSlot(2,g,s);
 const slot=readSaveSlot(2,s),html=saveSlotConfirmHtml(slot,{lang:'th'});
 assert.match(html,/SLOT 2/);assert.match(html,/01:01:01/);assert.match(html,/4,321/);assert.match(html,/ลบแล้วกู้คืนไม่ได้/);assert.match(html,/role="alertdialog"/);
 assert.match(html,/data-slot-cancel autofocus/);assert.match(html,/class="save-slot-danger" data-slot-confirm="2"/);
 assert.match(saveSlotConfirmHtml(slot,{lang:'en'}),/cannot be recovered/);assert.match(slotDeletedNote(2),/SLOT 2/);
});
test('FB2-17: a save remembers when it was written; deleting one slot leaves the others alone',()=>{
 const s=memory(),before=Date.now();writeSaveSlot(1,snap(1),s);writeSaveSlot(2,snap(2),s);writeSaveSlot(3,snap(3),s);selectSaveSlot(2,s);
 const at=saveSlotSummary(readSaveSlot(1,s).data).savedAt;assert.ok(at>=before&&at<=Date.now());
 const legacy=snap(9);assert.equal(saveSlotSummary(legacy).savedAt,null,'an old save without a date still loads');
 assert.ok(clearSaveSlot(2,s));assert.equal(s.getItem(slotKey(2)),null);assert.equal(readSaveSlot(1,s).data.coin,1);assert.equal(readSaveSlot(3,s).data.coin,3);
 assert.equal(readSaveSlot(2,s).status,'empty','the slot is a New Game slot again');assert.equal(saveSlotMenuHtml(listSaveSlots(s)).match(/data-slot-delete="/g).length,2);
});
test('FB2-17: ui.js wires trash -> confirm -> delete and Esc closes only the confirmation',()=>{
 const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
 assert.match(ui,/data-slot-delete/);assert.match(ui,/saveSlotConfirmHtml\(slot/);assert.match(ui,/clearSaveSlot\(id\)\)openSaveSlots/);assert.match(ui,/d\.addEventListener\('cancel',e=>\{if\(closeConfirm\(\)\)e\.preventDefault/);
});
