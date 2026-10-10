// I1-B ข้อ 3 — ยมฯ ต้องหันขวา (เข้าหาศัตรู) ตอนโจมตีธรรมดา ทั้ง 4 ชุด ทั้งดาบเดิมและดาบโซน
// ต้นเหตุ: class .atk ตัดการพลิก scaleX(-1) ของ "ท่ายืน" ตลอดจังหวะ 'you' (~2 วิ) ทั้งที่ฟันดาบธรรมดาโชว์ท่ายืน (canvas ดาบทับแค่ 580ms)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { figYouAtkClass, standingFacesRight, ragePoseSrc } from '../src/battle-facing.js';
import { isYamaSwordAttack } from '../src/yama-sword.js';

const STANDING = {
  th:'img/hero-yama.png', asia:'img/Asia/hero-yama-asia.png', west:'img/West/hero-yama-west.png', cyberhell:'img/CyberHell/hero-yama-cyberhell.png',
};
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('I1-B-3: ฟันดาบธรรมดาไม่ใส่ .atk (ไม่ยกเลิกการพลิกท่ายืน) — ท่ายืนหันขวาทุกชุด ทั้งก่อน/ระหว่าง/หลังแอนิเมชันดาบ', () => {
  const swordFx = { action:'atk', key:'atk', side:'foe', crew:null };
  assert.equal(isYamaSwordAttack(swordFx), true);
  for (const [style, src] of Object.entries(STANDING)) {
    const atkClass = figYouAtkClass({ usingAtk:true, sword:isYamaSwordAttack(swordFx), showRage:false });
    assert.equal(atkClass, false, `${style}: sword slash must not carry .atk`);
    assert.equal(standingFacesRight(src, { atkClass }), true, `${style}: standing pose faces right after the slash`);
    assert.equal(standingFacesRight(src), true, `${style}: idle pose faces right`);
  }
});

test('I1-B-3: กันถอยกลับ — ถ้ายัง .atk ตอนฟันดาบ ชุดโซน 1/2/4 จะหันซ้าย (นี่คืออาการเดิมที่คุณเป้เห็น)', () => {
  for (const style of ['th', 'asia', 'cyberhell']) assert.equal(standingFacesRight(STANDING[style], { atkClass:true }), false, style);
  assert.equal(standingFacesRight(STANDING.west, { atkClass:true }), true);   // ชุดปัจฉิมวาดหันขวาไม่พลิก — ไม่เคยเป็นบั๊ก
});

test('I1-B-3: ท่าฟาด/ท่าชาร์จที่วาดหันขวามาแต่ต้น (ไม่ใช่ฟันดาบ) ยังได้ .atk เหมือนเดิม', () => {
  assert.equal(figYouAtkClass({ usingAtk:true, sword:false, showRage:false }), true);   // ลูกไฟ/พุ่งชน ฯลฯ → hero-yama-atk
  assert.equal(figYouAtkClass({ usingAtk:false, sword:false, showRage:true }), true);   // พลังบ้าคลั่ง → ragePoseSrc
  assert.equal(figYouAtkClass({ usingAtk:false, sword:false, showRage:false }), false);
  for (const s of ['th', 'asia', 'west', 'cyberhell']) assert.ok(ragePoseSrc(s));
});

test('I1-B-3: arena() ใช้ figYouAtkClass กับ fx จริง และ CSS ที่ตัดการพลิกยังผูกกับ .atk เท่านั้น', () => {
  const ui = read('src/ui.js'), html = read('index.html');
  assert.match(ui, /figYouAtkClass\(\{ usingAtk, sword:isYamaSwordAttack\(fx\), showRage, standing:youImg === heroFace\(\) \}\)/);   // west-hit: + standing
  assert.doesNotMatch(ui, /\$\{usingAtk \|\| showRage \? ' atk' : ''\}/);
  assert.match(html, /\.arena \.fig\.you\.atk img,\.hud \.fig\.you\.atk img\{transform:scaleX\(1\)\}/);
  // mountBattleSword อ่านทิศจาก transform จริงของท่ายืน — ต้องเห็นการพลิก (ไม่มี .atk) ตอนฟันดาบ
  assert.match(read('src/yama-sword.js'), /startsWith\('matrix\(-1'\)/);
});

test('I1-B-3: แผ่นดาบทุกชุด (ดาบเดิมและดาบโซน) ใช้เฟรมที่หันขวา — ไม่มีตารางซ่อมทิศเหลือ', async () => {
  const { FRAME_FACING_FIX, SWORD_FRAME_MS } = await import('../src/yama-sword.js');
  assert.deepEqual({ ...FRAME_FACING_FIX }, {});
  assert.equal(SWORD_FRAME_MS.length, 8);
});
