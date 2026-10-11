// west-hit — ยมบาทต้อง "หันขวา" (เข้าหาศัตรู) ทุกท่า × ทุกชุด ในฉากต่อสู้ — เทสต์กันถอยกลับ
// ข้อมูลวัดจริงใน browser (390x844, 10-11 ต.ค. 2569) อยู่ใน Output/Toby/2026-10-10-avegee-west-hit.md
// ตารางทิศที่ภาพวาดมา (POSE_DRAWN_FACING_RIGHT) มาจากการเปิดดูภาพจริงทุกไฟล์ ไม่ใช่เดา
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { figYouAtkClass, heroPoseFacesRight, teamNeedsMirror, TEAM_DRAWN_FACING_RIGHT, POSE_DRAWN_FACING_RIGHT, ragePoseSrc } from '../src/battle-facing.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const STYLES = {
  th:        { stand:'img/hero-yama.png',                        atk:'img/hero-yama-atk.png',                         cry:'img/hero-yama-cry.png' },
  asia:      { stand:'img/Asia/hero-yama-asia.png',              atk:'img/Asia/hero-yama-asia-atk.png',               cry:'img/Asia/hero-yama-asia-cry.png' },
  west:      { stand:'img/West/hero-yama-west.png',              atk:'img/West/hero-yama-west-atk-R.png',             cry:'img/West/hero-yama-west-cry.png' },
  cyberhell: { stand:'img/CyberHell/hero-yama-cyberhell.png',    atk:'img/CyberHell/hero-yama-cyberhell-atk-R.png',   cry:'img/CyberHell/hero-yama-cyberhell-cry.png' },
};

test('west-hit: ท่าโดนตี (cry) หันขวาทุกชุด รวมชุดปัจฉิม — cry ทุกชุดวาดหันซ้าย ต้องถูกพลิก (ไม่ใช่ face-native)', () => {
  for (const [style, p] of Object.entries(STYLES)) {
    assert.ok(existsSync(new URL('../' + p.cry, import.meta.url)), `${style}: cry file exists`);
    assert.equal(teamNeedsMirror(p.cry), true, `${style}: cry must be mirrored`);
    assert.equal(heroPoseFacesRight(p.cry), true, `${style}: cry faces right`);
  }
  // กันถอยกลับ: ถ้าใครเผลอขึ้นทะเบียน cry ปัจฉิมเป็น "วาดหันขวา" (ตามนิสัยของท่ายืนปัจฉิม) cry จะหันซ้าย
  assert.equal(TEAM_DRAWN_FACING_RIGHT.has('hero-yama-west-cry'), false);
  assert.equal(POSE_DRAWN_FACING_RIGHT.has('hero-yama-west-cry'), false);
  // และถ้า cry ไปติด .atk (ยกเลิกการพลิก) จะหันซ้ายทุกชุด — ห้ามเกิด: hurtNow ไม่เคยได้ .atk (ดู arena())
  for (const p of Object.values(STYLES)) assert.equal(heroPoseFacesRight(p.cry, { atkClass:true }), false);
});

test('west-hit: ท่ายืนและท่า atk/rage หันขวาทุกชุด (ท่ายืน+ท่าฟาด มี/ไม่มี .atk ตามที่ ui.js ใช้จริง)', () => {
  for (const [style, p] of Object.entries(STYLES)) {
    assert.equal(heroPoseFacesRight(p.stand), true, `${style}: stand`);
    assert.equal(heroPoseFacesRight(p.atk, { atkClass:true }), true, `${style}: atk pose with .atk`);
    // ชุดปัจฉิมขึ้นทะเบียน face-native (ไม่พลิก) อยู่แล้ว → มีหรือไม่มี .atk ก็หันขวา · ชุดอื่นต้องมี .atk ไม่งั้นถูกพลิกกลับไปหันซ้าย
    assert.equal(heroPoseFacesRight(p.atk, { atkClass:false }), style === 'west', `${style}: atk pose without .atk`);
    assert.equal(ragePoseSrc(style).replace(/\?.*/, ''), p.atk, `${style}: rage pose = atk pose`);
  }
});

test('west-hit: สกิลที่ยังไม่มีท่า atk ของชุดนั้น (ถอยไปโชว์ท่ายืน) ห้ามได้ .atk — ไม่งั้นโซน 4 หันซ้าย', () => {
  // วัดใน browser: ชุดไซเบอร์เฮลล์ ลูกไฟ → ท่ายืน + .atk = matrix(1) หันซ้าย (ก่อนแก้)
  assert.equal(figYouAtkClass({ usingAtk:true, sword:false, showRage:false, standing:true }), false);
  assert.equal(figYouAtkClass({ usingAtk:true, sword:false, showRage:false, standing:false }), true);
  assert.equal(figYouAtkClass({ usingAtk:false, sword:false, showRage:true, standing:false }), true);
  assert.equal(figYouAtkClass({ usingAtk:true, sword:true, showRage:false, standing:false }), false);
  for (const p of Object.values(STYLES)) assert.equal(heroPoseFacesRight(p.stand, { atkClass:false }), true);
});

test('west-hit: arena() — ท่าโดนตีไม่เคยได้ .atk และส่ง standing ให้ figYouAtkClass · CSS ยังผูก .atk กับการยกเลิกพลิกเท่านั้น', () => {
  const ui = read('src/ui.js'), html = read('index.html');
  assert.match(ui, /const youImg = hurtNow \? heroCry\(\)/);
  assert.match(ui, /figYouAtkClass\(\{ usingAtk, sword:isYamaSwordAttack\(fx\), showRage, standing:youImg === heroFace\(\) \}\)/);
  // hurtNow ชนะ usingAtk/showRage เสมอ: showRage = charged && !hurtNow && !usingAtk · และ usingAtk มีเฉพาะจังหวะ lunge:'you' (struck:'you' มีเฉพาะ lunge:'foe')
  assert.match(ui, /const showRage = charged && !hurtNow && !usingAtk;/);
  assert.match(ui, /phase === 'foe' \? \(confuseHit \? \{ struck: 'foe' \} : \{ lunge: 'foe', struck: 'you' \}\)/);
  assert.match(html, /\.arena \.fig\.you img,\.hud \.fig\.you img\{transform:scaleX\(-1\)\}/);
  assert.match(html, /\.arena \.fig\.you\.atk img,\.hud \.fig\.you\.atk img\{transform:scaleX\(1\)\}/);
  assert.match(html, /\.arena \.fig\.you img\.face-native[^{]*\{transform:none\}/);
  assert.match(html, /sword-schools[^"]*-westhit-skillatk-minigame-review-20261011(?:-i2c)?"/);   // cache-bust
});
