import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

// H4 replaces the illustrated-board DOM test with real-room checks in h4-location-ui.test.mjs.
test('F3 transparent sprite files are included in shared manifest/preload',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../img/manifest.json',import.meta.url)));
 const catalog=JSON.parse(readFileSync(new URL('../img/preload-catalog.json',import.meta.url)));
 for(const part of ['base','pane']){
  const name=`mirror-charge-${part}.png`;
  assert.ok(manifest.critical.includes(name));assert.ok(catalog.shared.includes(`img/${name}`));
  assert.ok(existsSync(new URL('../img/'+name,import.meta.url)));
 }
 const css=readFileSync(new URL('../src/compact-ui.css',import.meta.url),'utf8');
 const src=readFileSync(new URL('../src/mirror-charge.js',import.meta.url),'utf8');
 assert.ok(src.includes('stroke="#fff1b6"'));assert.ok(src.includes('stroke="#eeb743"'));
 assert.ok(!src.includes('#aef9ff'));assert.ok(!css.includes('#8fffff'));
});
