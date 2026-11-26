// FB3-T8 review (Dale, Claudy's decisions 27 Nov): Kumphan's character card no longer says he guarded the gate before the player was born (he appeared and came to help Yama), and the
// Thai text of the Guard-freeing window says "ผู้เฝ้าด่าน" / the Guard's own name - never the English word "Guard".
import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTER_HISTORY } from '../src/e1-content.js';
import { RETURN_GUARD_EVENTS, RETURN_GUARD_NAMES } from '../src/signal-arc.js';
import { LIB_TEXT } from '../src/liberation-text.js';

test('Kumphan\'s card: he appeared and helped Yama at the frontier gate, then took the gate duty - not "guarded the gate before you were born"', () => {
  const text = CHARACTER_HISTORY.find(c => c.id === 'guard@th').text;
  assert.match(text, /กุมภัณฑ์ ยักษ์ที่ปรากฏตัวมาช่วยยามาสู้ที่ประตูชายแดนสุวรรณภูมิ แล้วรับหน้าที่เฝ้าประตูนับแต่นั้น เขาเคยเป็นยักษ์ที่เบียดเบียนผู้เดินทาง/);
  assert.ok(!/มาก่อนท่านเกิด/.test(text));
});

test('the Guard-freeing window never shows the English word "Guard" in Thai text; it names the Guard of the zone', () => {
  for (const [zone, name] of Object.entries(RETURN_GUARD_NAMES)) {
    const ev = RETURN_GUARD_EVENTS[zone];
    assert.equal(ev.alert.th, `ยามากับนิราต้องช่วย${name.th}ให้หลุดจากคำสั่งก่อนเข้าประตู`);
    assert.ok(!/Guard/.test(ev.alert.th) && !/Guard/.test(ev.title.th));
  }
  for (const row of Object.values(LIB_TEXT)) assert.ok(!/Guard/.test(row.th), row.th);
});
