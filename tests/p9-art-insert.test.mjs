// P9 — Codex round of 23 Oct inserted: Nira combat v2 (4 zones, all rows face right), worker v2 (asia/west/cyberhell), Trojan horse f6/f7
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {niraCombatSheet,niraPoseFacesRight,niraSheetIsV2,NIRA_SHEETS_V2} from '../src/nira-combat.js';

const html=readFileSync('index.html','utf8'),catalog=JSON.parse(readFileSync('img/preload-catalog.json','utf8'));
const allCatalogFiles=Object.values(catalog).flatMap(function walk(v){return Array.isArray(v)?v:v&&typeof v==='object'?Object.values(v).flatMap(walk):[];});
function webpSize(file){
  const b=readFileSync(file);assert.equal(b.toString('latin1',0,4),'RIFF');assert.equal(b.toString('latin1',8,12),'WEBP');
  const kind=b.toString('latin1',12,16);
  if(kind==='VP8X')return [1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)];
  if(kind==='VP8L'){const v=b.readUInt32LE(21);return [1+(v&0x3fff),1+((v>>14)&0x3fff)];}
  throw new Error('unexpected webp chunk '+kind);
}
const ZONES=['th','asia','west','cyberhell'];

test('P9 Nira: all four zones draw the v2 sheet (1280x1280, 4x4); v1 files stay on disk untouched',()=>{
  assert.deepEqual([...NIRA_SHEETS_V2],ZONES);
  for(const zone of ZONES) {
    const v2=`img/nira-combat/nira-${zone}-sheet-v2.webp`;
    assert.equal(niraCombatSheet(zone),v2);assert.ok(niraSheetIsV2(zone));
    assert.deepEqual(webpSize(v2),[1280,1280]);
    assert.ok(existsSync(`img/nira-combat/nira-${zone}-sheet-v1.webp`),'v1 kept (art is never overwritten)');
    assert.ok(allCatalogFiles.includes(v2),`${zone} v2 preloaded`);
  }
  assert.equal(niraCombatSheet('nowhere'),'img/nira-combat/nira-th-sheet-v2.webp','unknown zone falls back to th');
});

test('P9 Nira: v2 faces right in every pose so nothing is mirrored by the squad; a v1 sheet keeps the old rule',()=>{
  for(const zone of ZONES)for(const pose of ['idle','attack','hurt','heal'])assert.equal(niraPoseFacesRight(zone,pose),true,`${zone} ${pose}`);
  // the old behaviour is still what a non-v2 zone would get (idle/hurt drawn facing left need the ally mirror)
  const src=readFileSync('src/nira-combat.js','utf8');
  assert.match(src,/niraSheetIsV2\(zone\) \|\| pose === 'attack' \|\| pose === 'heal'/);
  assert.match(src,/!niraSheetIsV2\(zone\) && stripNeighbourLeaks\(/,'neighbour-leak strip only runs on v1 sheets');
  assert.doesNotMatch(src,/pose === 'idle' \? .*face-native/);
});

test('P9 cache-bust: nira-combat.js ends -p9',()=>{
  assert.match(html,/"\.\/src\/nira-combat\.js": "\.\/src\/nira-combat\.js\?v=[^"]*-p9"/);
});
