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

test('the lamp comes with ONE window (it carries the tower sentence); the separate tower window is marked seen, so a reload never shows it', async () => {
  const { createGame } = await import('../src/game.js');
  globalThis.document = { documentElement:{} }; globalThis.Image = class { set src(v) {} };
  const g = createGame(); g.save = () => true; g.onChange = () => {};
  g.giveLamp();
  assert.deepEqual(g.notices.filter(n => n.startsWith('lamp-')), ['lamp-received']);
  assert.equal(g.storySeen['notice:lamp-tower-open'], true);
  const h = createGame(); h.save = () => true; h.onChange = () => {};
  h.restore(JSON.parse(JSON.stringify(g.snapshot())));
  assert.deepEqual(h.notices.filter(n => n.startsWith('lamp-')), ['lamp-received'], 'reload: still the one lamp window, no tower window');
  const { NOTICES } = await import('../src/z1-events.js');
  assert.match(NOTICES['lamp-received'].text, /หอส่องกรรม/);
  assert.match(NOTICES['lamp-received'].en.text, /Mirror Tower/);
});
