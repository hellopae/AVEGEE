import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sentencingChapters,firstTrialLesson,soulTraitGuide} from '../src/sentencing-guide.js';
import {setLang,t} from '../src/i18n.js';

globalThis.document??={documentElement:{}};
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const strip=h=>h.replace(/<[^>]+>/g,'');
const chapter=n=>sentencingChapters.find(c=>c.includes(`<h3>${n}. `));

test('P7 handbook: removed claims are gone (wisdom +6, rab in score, metta karma cut, 50/33/17)',()=>{
  const all=strip(sentencingChapters.join(' ')+firstTrialLesson);
  for(const bad of [/ปัญญาตั้งแต่ 7/,/ระเบียบสูงช่วยคะแนน/,/ลดกรรมที่ตกใส่เราจาก/,/ระเบียบงาน = 48/,/50% \+ ความพอดีของโทษ 33%/,/ดูระเบียบ ปัญญา และเมตตา/,/ยมทูตคนไหน/])
    assert.doesNotMatch(all,bad,String(bad));
});

test('P7 handbook: chapters 1, 3, 4 carry the code-true numbers (77 cap, 14/8 karma, 60/40, stars, 3 reds)',()=>{
  assert.match(chapter(1),/ไม่เกิน 77/);assert.match(chapter(1),/เพิ่ม 14/);assert.match(chapter(1),/เพิ่ม 8/);
  assert.match(chapter(3),/จะเป็นผู้คุมเดิมเสมอ/);assert.match(chapter(3),/ไม่เปลี่ยนคะแนน/);
  const c4=chapter(4);assert.match(c4,/ประมาณ 60%/);assert.match(c4,/ประมาณ 40%/);assert.match(c4,/ไม่เกิน 77/);assert.match(c4,/แดงติดกัน 3 ครั้ง/);
  assert.match(soulTraitGuide,/แค่ปฏิเสธเสียงแข็ง จะเป็นสีม่วง/);
});

test('P7 ui.js: verdict card no longer shows rab; crewNote and the self-speed help line do not promise metta karma cuts',()=>{
  const ui=read('src/ui.js');
  assert.doesNotMatch(ui,/\$\{r\.rab\}/);
  assert.doesNotMatch(ui,/กรรมจะตกใส่ท่านครึ่งเดียว/);
  assert.doesNotMatch(ui,/ถึงเผลอสั่งเกินกรรม กรรมที่ตกใส่ท่านก็เบากว่า/);
  assert.match(ui,/ปัญญาสูง — ไม่เปลี่ยนคะแนนคำตัดสิน/);
});

test('P7 krata-qte: no Thai string literals left in code (comments aside); every g5 key exists in TH and EN',()=>{
  const code=read('src/minigames/krata-qte.js').split('\n').map(l=>l.replace(/\/\/.*$/,'')).join('\n');
  assert.doesNotMatch(code,/[ก-๙]/);
  for(const k of ['hintIdle','wait','passed','hit','missEarly','missLate','btnWait','btnGo','infernoUnlocked']){
    setLang('th');const th=t('g5.'+k);setLang('en');const en=t('g5.'+k);
    assert.notEqual(th,'g5.'+k);assert.notEqual(en,'g5.'+k);assert.notEqual(th,en,k);
  }
  setLang('th');
});

test('P7 P1 copy: unlock labels say ขั้น (matches the profile card), tea desc matches step(), no Lv. on lock badges',()=>{
  setLang('th');assert.equal(t('unlock.lockedAt',{n:3}),'ปลดล็อกที่ขั้น 3');
  setLang('en');assert.equal(t('unlock.lockedAt',{n:3}),'Unlocks at rank 3');setLang('th');
  assert.doesNotMatch(read('src/ui.js'),/'🔒 Lv\.'/);assert.doesNotMatch(read('src/town-map.js'),/🔒 Lv\./);
  assert.match(read('src/data.js'),/ที่พักของยมบาทและยมทูต · สร้างเสร็จแล้วนอนฟื้นบารมีได้เลย/);
});
