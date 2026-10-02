import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame } from '../src/game.js';

// hotfix 2 ต.ค. 2569 — f075d79 ใส่ f.sp?.startsWith() ใน HUD บอสของฉากต่อสู้
// แต่ศึกวิญญาณทั่วไป (kind:'soul') มี sp เป็นตัวเลข → TypeError ฉากวาดครึ่งเดียว ปุ่มไม่ผูก handler

test('ศึกวิญญาณใช้รูปตามคดี และ HUD ยังรองรับ sp ตัวเลขจากเซฟเก่า', () => {
  const g = createGame();
  const b = g.startBattle({ id:7, deserved:3, who:'test', sp:6 });
  assert.equal(b.kind, 'soul');
  const foes = b.foes?.length ? b.foes : [b];
  for (const f of foes) {
    const sp = f.sp ?? b.sp;
    assert.equal(sp, 'spirit-worker', 'ศึกใหม่ใช้ภาพตามอาชีพแทนหมายเลขเก่า');
    for (const value of [sp, 6, null]) assert.doesNotThrow(() => String(value ?? '').startsWith('leader-'));
  }
});

test('ui.js ไม่เรียก string method บน sp ตรง ๆ (sp เป็นได้ทั้งตัวเลขและสตริง)', () => {
  const src = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /\.sp\??\.(startsWith|endsWith|match|replace|includes|split|slice)\(/);
  assert.match(src, /String\(f\.sp \?\? ''\)\.startsWith\('leader-'\)/);
});
