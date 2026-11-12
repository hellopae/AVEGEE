import test from 'node:test';import assert from 'node:assert/strict';import {existsSync,readFileSync} from 'node:fs';
import {saveSlotMenuHtml,slotPortraitArt} from '../src/save-slot-menu.js';import {saveSlotSummary} from '../src/save-slots.js';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/b1-v3.json',import.meta.url)));
for(const zone of ['th','asia','west','cyberhell'])test(`save portraits show ${zone} owned crew plus global Nira, preserve all saved actors`,()=>{
 const d=structuredClone(fixture);d.zone=zone;const before=JSON.stringify(d),summary=saveSlotSummary(d),html=saveSlotMenuHtml([{id:1,status:'occupied',data:d},{id:2,status:'empty'},{id:3,status:'empty'}]);
 const expected=summary.actors.filter(a=>a.zone===zone||a.zone==='global'&&a.kind==='nira');const images=[...html.matchAll(/data-crew-id="([^"]+)" data-crew-zone="([^"]+)"/g)];
 assert.equal(images.length,expected.length);assert.deepEqual(images.map(m=>m[1]).sort(),expected.map(a=>a.id).sort());assert.ok(images.every(m=>m[2]===zone));assert.equal(JSON.stringify(d),before);assert.ok(summary.actors.length>images.length);
 assert.equal((html.match(/data-save-slot=/g)||[]).length,3);assert.equal((html.match(/New Game/g)||[]).length,2);assert.equal((html.match(/class="save-slot-portrait(?: is-scene-crop)?"/g)||[]).length,expected.length);
 for(const kind of ['taan','nira','dam','kan','boon','plerng','guard'])assert.ok(existsSync(new URL('../'+slotPortraitArt(kind,zone).src,import.meta.url)),`${zone}:${kind} existing region-correct art`);
 for(const icon of ['coin','justice','skull'])assert.ok(html.includes(`img/ui/icon-${icon}.webp`));for(const name of ['เบี้ยกรรม','ระเบียบ','บาป'])assert.ok(html.includes(`alt="${name}"`));
});
