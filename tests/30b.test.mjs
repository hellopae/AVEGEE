// 30B — ฉากต่อสู้: ทิศหันหน้า · Rage · MP จำนวนเต็ม · ปุ่มรางวัล/แพ้ · ไอคอนหัวใจ · boon เรืองแสง
import test from 'node:test';
import assert from 'node:assert/strict';
import { spriteKey, teamNeedsMirror, foeNeedsMirror, teamFaceClass, foeFaceClass, mirrorBox,
         TEAM_DRAWN_FACING_RIGHT, ragePoseSrc } from '../src/battle-facing.js';

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

import { readFileSync, existsSync } from 'node:fs';
import { createGame } from '../src/game.js';

test('30B-4: ท่า Rage ของทุกชุดชี้ไฟล์ที่มีจริง (โซน 3-4 ใช้ atk-R ที่หันขวา)', () => {
  for (const style of ['th', 'asia', 'west', 'cyberhell']) {
    const src = ragePoseSrc(style);
    assert.ok(src && existsSync(new URL(`../${src}`, import.meta.url)), `${style} -> ${src}`);
  }
  assert.match(ragePoseSrc('west'), /atk-R/);
  assert.equal(ragePoseSrc('unknown'), null);
});

test('30B-4: Rage ยังเพิ่มดาเมจ 3 ครั้งเหมือนเดิม และตัวมันเองไม่ทำดาเมจ', () => {
  const g = createGame();
  g.abilities.rage = true; g.mp = g.mpMax;
  g.battle = { kind:'mob', youHp:100, youMax:100, over:null, log:[], turn:1, dmg:null, talk:'',
    foes:[{ id:'f', who:'x', hp:9999, maxHp:9999, atk:[0, 0], stun:0, confuse:0 }], selectedFoeId:'f' };
  assert.equal(g.battleAct('rage'), true);
  assert.equal(g.battle.rageTurns, 3);
  assert.equal(g.battle.dmg.foe, 0, 'Rage ไม่ใช่การโจมตี');
  g.battleAct('fire');
  assert.equal(g.battle.rageTurns, 2);
  assert.ok(g.battle.dmg.foe >= 60, 'ลูกไฟ ×1.5');
});

test('30B-4: ui.js — Rage แสดงฝั่งเรา ไม่ขึ้นที่ศัตรู และไม่ทำให้ศัตรูสะดุ้ง', () => {
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  assert.match(ui, /effect === 'health' \|\| effect === 'tea' \|\| effect === 'rage'\) \? 'you' : 'foe'/);
  assert.match(ui, /fxNow\?\.key === 'rage' \? null/);
});

import { regenMp } from '../src/mp-regen.js';

test('30B-5: regenMp เติมเป็นจำนวนเต็ม ไม่เกิน mpMax และเก็บเศษข้ามเฟรม', () => {
  const g = { mp: 6.4219999999995, mpMax: 72 };
  const acc = { frac: 0 };
  for (let i = 0; i < 60; i++) { regenMp(g, acc, 16.7); assert.ok(Number.isInteger(g.mp), `frame ${i}: ${g.mp}`); }
  assert.ok(g.mp >= 11 && g.mp <= 12, `หนึ่งวินาทีเติม ~5: ${g.mp}`);
  const full = { mp: 71, mpMax: 72 };
  regenMp(full, { frac: 0 }, 10000);
  assert.equal(full.mp, 72);
});

test('30B-5: เซฟเก่าที่ MP เป็นทศนิยมโหลดแล้วเป็นจำนวนเต็ม + ui ปัดตัวเลขทุกจุด', () => {
  const g = createGame();
  g.mp = 6.4219999999995; g.mpMax = 72;
  const g2 = createGame();
  assert.equal(g2.restore(g.snapshot()), true);
  assert.equal(g2.mp, 6);
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  assert.match(ui, /<small>\$\{Math\.round\(mp\)\}\/\$\{g\.mpMax\}<\/small>/);
  assert.doesNotMatch(ui, /MP \$\{g\.mp\}\//);
});

import { setLang, t } from '../src/i18n.js';

test('30B-6/7: ปุ่ม "รับรางวัล" / "ฟังคำตัดสิน" มี TH+EN และไม่มีข้อความเก่าเหลือ', () => {
  globalThis.document ||= { documentElement:{} };
  for (const [lang, reward, verdict] of [['th', 'รับรางวัล', 'ฟังคำตัดสิน'], ['en', 'Collect reward', 'Hear the verdict']]) {
    setLang(lang);
    assert.equal(t('battle.reward'), reward);
    assert.equal(t('battle.verdict'), verdict);
  }
  setLang('th');
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  assert.doesNotMatch(ui, /ฟังคำตัดสินของพ่อ|รับรางวัลและกลับแผนที่/);
  assert.match(ui, /\['mob', 'zoneEvent'\]\.includes\(b\.kind\) && b\.over === 'win'/, 'ปุ่มรางวัลศึกอีเวนต์อยู่กลางจอ');
});

test('30B-7: โปรไฟล์หัวหน้าโซน 3 ต่อโค้ดไว้ มีไฟล์เมื่อไหร่ใช้เมื่อนั้น ไม่มีก็ใช้ภาพเดิม', () => {
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  assert.match(ui, /BOSS_PROFILE_ART = \{ west:'img\/West\/hero-boss-west-profile\.webp' \}/);
  assert.match(ui, /bossProfileOverride\(f\.sp, g\.zone\) \|\| /, 'override ก่อน แล้วถอยไปภาพเดิม');
});

import { ITEMS } from '../src/data.js';

test('30B-8: หัวใจสำรองไม่ใช้ภาพกล่องยาแล้ว (ชี้ item-heart + glyph ❤️) และยังชุบชีวิตเหมือนเดิม', () => {
  assert.equal(ITEMS.spareHeart.img, 'item-heart');
  assert.notEqual(ITEMS.spareHeart.img, ITEMS.health.img);
  assert.equal(ITEMS.spareHeart.glyph, '❤️');
  assert.equal(ITEMS.spareHeart.revive, true);
});
