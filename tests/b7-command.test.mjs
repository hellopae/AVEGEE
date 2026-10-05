import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {commandWheel} from '../src/command-wheel.js';
const segments=n=>['attack',...(n===3?['power']:[]),'item'].map(id=>({id,label:id,choices:''}));
test('B7 uses top/right/bottom Yama petals and top/right crew or Guard petals',()=>{
 const yama=commandWheel({segments:segments(3)}),crew=commandWheel({segments:segments(2)});
 for(const k of ['b1','b2','b3'])assert.ok(yama.includes(`img/ui/${k}.webp`));
 assert.ok(!yama.includes('b4.webp'));
 assert.match(crew,/segment-1[^>]+data-command="item"/);
 assert.ok(crew.includes('b4.webp'));assert.ok(!crew.includes('b3.webp'));
 assert.match(crew,/options-1" data-options="item"/);
 for(const html of [yama,crew]){assert.ok(!html.includes('Button7.png'));assert.match(html,/clip-path:polygon\(/);assert.match(html,/position:absolute;left:/);}
});
test('B7 petal files are registered manually in the manifest',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../img/manifest.json',import.meta.url)));
 const values=JSON.stringify(manifest);
 for(let i=1;i<=4;i++)assert.ok(values.includes(`ui/b${i}.webp`));
});
