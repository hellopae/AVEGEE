// 30B — ฉากต่อสู้: ทิศหันหน้า · Rage · MP จำนวนเต็ม · ปุ่มรางวัล/แพ้ · ไอคอนหัวใจ · boon เรืองแสง
import test from 'node:test';
import assert from 'node:assert/strict';
import { spriteKey, teamNeedsMirror, foeNeedsMirror, teamFaceClass, foeFaceClass, mirrorBox,
         TEAM_DRAWN_FACING_RIGHT } from '../src/battle-facing.js';

test('30B-2: spriteKey ตัด path/นามสกุล/-v2/query', () => {
  assert.equal(spriteKey('img/West/crew-guard-west-v2.png?x=1'), 'crew-guard-west');
  assert.equal(spriteKey('img/Asia/mob-gaki-asia.png'), 'mob-gaki-asia');
  assert.equal(spriteKey(null), '');
});

test('30B-2: ทีมโซน 3 ทั้ง 5 ตัวและเพลิงโซน 4 ไม่ถูกพลิก ส่วนโซน 1-2 พลิกตามธรรมเนียมเดิม', () => {
  for (const k of ['plerng', 'kan', 'boon', 'dam', 'guard'])
    assert.equal(teamNeedsMirror(`img/West/crew-${k}-west.png`), false, k);
  assert.equal(teamNeedsMirror('img/CyberHell/crew-plerng-cyberhell.png'), false);
  assert.equal(teamNeedsMirror('img/West/crew-guard-west-v2.png'), false);
  assert.equal(teamNeedsMirror('img/crew-plerng.png'), true);
  assert.equal(teamNeedsMirror('img/Asia/crew-guard-asia-v2.png'), true);
  assert.equal(teamFaceClass('img/West/crew-kan-west.png'), 'face-native');
  assert.equal(teamFaceClass('img/Asia/crew-kan-asia.png'), '');
  assert.ok(TEAM_DRAWN_FACING_RIGHT.size >= 6);
});

test('30B-2: ศัตรูที่วาดหันขวา (กากิ) ถูกพลิก ตัวอื่นแสดงตามต้นฉบับ', () => {
  assert.equal(foeNeedsMirror('img/Asia/mob-gaki-asia.png'), true);
  assert.equal(foeFaceClass('img/Asia/mob-gaki-asia.png'), 'face-flip');
  assert.equal(foeFaceClass('img/West/mob-skeleton-west.png'), '');
});

test('30B-2: mirrorBox สลับขอบซ้ายตามการพลิก และพลิกซ้ำคืนค่าเดิม', () => {
  const box = { l:.1, t:.2, w:.5, h:.7 };
  const m = mirrorBox(box);
  assert.ok(Math.abs(m.l - .4) < 1e-9);
  assert.deepEqual({ t:m.t, w:m.w, h:m.h }, { t:.2, w:.5, h:.7 });
  assert.ok(Math.abs(mirrorBox(m).l - .1) < 1e-9);
  assert.equal(mirrorBox(null), null);
});
