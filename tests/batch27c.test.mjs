import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { CREW_HELP_LV, LEVELS, POWERS, TUTOR, ZONE_EVENTS } from '../src/data.js';
import { setLang, t, englishKeys } from '../src/i18n.js';

globalThis.document ??= { documentElement: {} };   // setLang แตะ document.documentElement.lang

test('27C: เรียกยมทูตช่วยในฉากสู้ได้ตั้งแต่เลเวล 1 และหน้าต่างเลื่อนขั้นไม่มีข้อเรียกยมทูต', () => {
  assert.equal(CREW_HELP_LV, 1);
  const g = createGame();
  assert.equal(g.level, 1);
  assert.equal(g.canCallCrew(), true);
  const text = JSON.stringify(LEVELS);
  assert.ok(!text.includes('เรียกยมทูต'));
});

test('27C: ตวาดข่มขู่ใช้ไอคอนเขี้ยวและไม่มี cutscene ลูกไฟ', () => {
  const roar = POWERS.find(p => p.k === 'roar');
  assert.equal(roar.glyph, 'img/icon-fang.png');
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  assert.match(ui, /if \(k === 'roar'\) return null;/);
});

test('27C: บทสอนไม่อ้างแถบแดง และไม่อ้าง emoji ⏭️/🔒 ที่เปลี่ยนเป็นไอคอนใหม่', () => {
  const karma = TUTOR.find(s => s.k === 'karma');
  assert.ok(!karma.text.includes('แถบสีแดง'));
  const stuck = TUTOR.find(s => s.k === 'stuck');
  assert.ok(!stuck.text.includes('⏭️') && !stuck.text.includes('🔒'));
});

test('27C: frontierBreach โซน 1 มี 2 ระลอก และข้อความไทย/อังกฤษไม่บอกว่า 3', () => {
  const ev = ZONE_EVENTS.th.find(e => e.k === 'frontierBreach');
  assert.equal(ev.waves.length, 2);
  for (const lang of ['th', 'en']) {
    setLang(lang);
    for (const k of ['alert', 'win']) {
      const s = t(`event.frontierBreach.${k}`);
      assert.ok(!/3 wave|three waves/i.test(s), s);
    }
    for (const k of ['prisonBreak', 'frontierBreach', 'devaTest']) {
      assert.ok(!/−8|−9/.test(t(`event.${k}.lose`)), t(`event.${k}.lose`));
    }
  }
  setLang('th');
});

test('27C: key i18n ใหม่มีทั้งไทยและอังกฤษ', () => {
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  const keys = new Set([...ui.matchAll(/t\('((?:profile|coach\.goal|build)[\w.]*)'\)/g)].map(m => m[1]));
  ['profile.power.roar', 'profile.power.mirror', 'profile.power.ice', 'profile.power.hypno',
   'profile.ab.charge', 'profile.ab.wind', 'profile.ab.rage', 'profile.ab.spear', 'profile.ab.clock'].forEach(k => keys.add(k));
  assert.ok(keys.size > 20);
  const en = new Set(englishKeys());
  for (const k of keys) assert.ok(en.has(k), `ไม่มีคำอังกฤษ ${k}`);
  setLang('th');
  for (const k of keys) assert.notEqual(t(k), k, `ไม่มีคำไทย ${k}`);
});
