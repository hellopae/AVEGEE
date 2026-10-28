import { assertVersionedImports } from './helpers/versioned-imports.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TUTOR,BATTLE,STATIONS,KARMA_TIERS,TARANG} from '../src/data.js';
import {setLang,t} from '../src/i18n.js';

globalThis.document??={documentElement:{}};
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const tut=k=>TUTOR.find(x=>x.k===k);

test('P8 TUTOR.fight hint numbers match BATTLE (mp cost, lose hp, lose order) and no map-pickup claim',()=>{
  const h=tut('fight').hint;
  assert.ok(h.includes(`พลังเวท ${BATTLE.mpCost.fire}`));
  assert.ok(h.includes(`บารมีท่านหาย ${BATTLE.loseHp}`));
  assert.match(read('src/game.js'),/this\.order = clamp\(this\.order - 6, 0, 100\)/);
  assert.ok(h.includes('ระเบียบตก 6'));
  assert.doesNotMatch(h,/เก็บเพิ่มได้บนแผนที่|กระสุน/);
});

test('P8 stale claims are gone from TUTOR / explainBar / openHelp / meThought',()=>{
  const ui=read('src/ui.js'), data=read('src/data.js');
  for(const bad of ['ห้าดาวครบห้าครั้ง','ตะรางขยายให้แล้ว','เดินไปเก็บ','เดินเก็บบนแผนที่','คุยกับกานต์ที่หอส่องกรรม','จบเกมทันที','อีกสองครั้งก็เลื่อนขั้น','โดนครบห้าครั้งจบเกม','ชื่อท่านไปอยู่ในคิว'])
    assert.ok(!ui.includes(bad),'ui.js: '+bad);
  for(const bad of ['ชื่อท่านจะไปโผล่','ฟาดได้ฟรี','ซัดไฟเอง','แตะ 100 เมื่อไหร่จบเกมทันที','เก็บกล่องยา','เดินไปเก็บกล่องยา'])
    assert.ok(!data.includes(bad),'data.js: '+bad);
  assert.ok(!tut('match').hint.includes('แถบบัญชาการ')&&!tut('inten').hint.includes('หนักแค่ไหน'));
  assert.ok(!tut('stuck').text.includes('สร้างตะราง')&&tut('stuck').text.includes(`${TARANG.hold} ดวง`)&&tut('stuck').text.includes(`${TARANG.feed} เบี้ย`));
});

test('P8 ending text removed per owner decision (no "ทายาทบัลลังก์" / "ต่ำกว่า 25")',()=>{
  assert.equal(KARMA_TIERS[0].eff,'ไม่มีโทษอะไร');
  assert.doesNotMatch(tut('karma').text,/ต่ำกว่า 25|ตอนจบ/);
  assert.doesNotMatch(read('src/data.js')+read('src/ui.js'),/ทายาทบัลลังก์|ตอนจบที่ดีที่สุด/);
});

test('P8 krajok copy has no Kan and matches the mirror minigame (TH + EN)',()=>{
  const k=STATIONS.find(s=>s.k==='krajok');
  assert.doesNotMatch(k.desc+k.use,/กานต์/);
  setLang('th');assert.doesNotMatch(t('unlock.why.krajok'),/กานต์/);
  setLang('en');assert.doesNotMatch(t('unlock.why.krajok'),/Kan/);setLang('th');
});

test('P8 g5 final-attempt messages exist in TH and EN; krata-qte picks them via state.done',()=>{
  for(const k of ['hitLast','missEarlyLast','missLateLast']){
    setLang('th');const th=t('g5.'+k);setLang('en');const en=t('g5.'+k);
    assert.notEqual(th,'g5.'+k);assert.notEqual(en,'g5.'+k);assert.notEqual(th,en);
    assert.doesNotMatch(th+en,/เตรียมลูกไฟถัดไป|next fireball/);
  }
  setLang('th');
  assert.match(read('src/minigames/krata-qte.js'),/\+\(state\.done\?'Last':''\)/);
  assert.equal(t('g5.hit'),'ถูกจังหวะ · เตรียมลูกไฟถัดไป');
});

test('P8 lock badges go through i18n (rank in EN)',()=>{
  setLang('th');assert.equal(t('unlock.lockShort',{n:3}),'ขั้น 3');
  setLang('en');assert.equal(t('unlock.lockShort',{n:3}),'Rank 3');setLang('th');
  assert.doesNotMatch(read('src/ui.js'),/'🔒 ขั้น '/);
  assert.doesNotMatch(read('src/town-map.js'),/🔒 ขั้น/);
  assert.match(read('src/town-map.js'),/import \{ t \} from '\.\/i18n\.js'/);
});

test('P8 index.html versions every touched file and matches the entry script',()=>{
  const h=read('index.html');
  for(const f of ['data.js','ui.js','i18n.js','town-map.js','minigames/krata-qte.js','sentencing-guide.js'])
    assertVersionedImports(h, [f]);
});
