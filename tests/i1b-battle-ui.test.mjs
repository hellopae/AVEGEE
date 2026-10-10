// I1-B — การ์ดดาบเดิมในกระเป๋า · ตำแหน่งวงคำสั่ง · ปุ่มเก็บไอเท็ม · ปุ่มเสียง
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { BATTLE } from '../src/data.js';
import { baseSwordAttack, baseSwordIconSrc } from '../src/weapons.js';
import { t, setLang } from '../src/i18n.js';
import { placeWheel, placeFinButton, WHEEL_ART } from '../src/wheel-place.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

// ---------- ข้อ 1: การ์ดแรก ----------
test('I1-B-1: ชื่อ/ข้อความการ์ดดาบเดิม ตรงตามคุณเป้ (ไทย) และมีฉบับอังกฤษ', () => {
  globalThis.document ??= { documentElement:{} };   // setLang แตะ document.documentElement.lang
  setLang('th');
  assert.equal(t('weapon.base'), 'ดาบของยมฑูตน้อย');
  assert.equal(t('weapon.baseNote', { n:'11–19' }), 'พลังโจมตี 11–19');
  assert.doesNotMatch(t('weapon.base') + t('weapon.baseNote', { n:1 }), /ไม่ถืออาวุธใหม่|ดาบเดิมของชุด/);
  setLang('en');
  assert.match(t('weapon.baseNote', { n:5 }), /Attack 5/);
  setLang('th');
});
test('I1-B-1: ไอคอนเป็นไฟล์ดาบจริง 512×512 และการ์ดใช้ไอคอนนั้น (ไม่ใช่รูปยมฯ)', () => {
  assert.equal(baseSwordIconSrc, 'img/weapons/weapon-icon-base.png');
  const png = readFileSync(new URL('../' + baseSwordIconSrc, import.meta.url));
  assert.equal(png.readUInt32BE(16), 512); assert.equal(png.readUInt32BE(20), 512);
  assert.ok(statSync(new URL('../' + baseSwordIconSrc, import.meta.url)).size > 5000);
  const ui = read('src/ui.js');
  assert.match(ui, /<img src="\$\{baseSwordIconSrc\}"/);
  assert.match(ui, /t\('weapon\.baseNote', \{ n:baseSwordAttack\(b => g\.normalAttack\(b\)\) \}\)/);
});
test('I1-B-1: "พลังโจมตี N" คำนวณสดจาก stat จริง — เปลี่ยนตามเลเวล/ชุดโซน/การฝึก ไม่ hardcode', () => {
  const g = createGame();
  const text = () => baseSwordAttack(b => g.normalAttack(b));
  const expect = () => `${g.normalAttack(BATTLE.atk[0])}–${g.normalAttack(BATTLE.atk[1])}`;
  assert.equal(text(), expect());
  const seen = new Set([text()]);
  g.level = 5; assert.equal(text(), expect()); seen.add(text());
  g.level = 12; assert.equal(text(), expect()); seen.add(text());
  assert.ok(seen.size === 3, `value must change with level: ${[...seen]}`);
  for (const z of ['th', 'asia', 'west', 'cyberhell']) { g.zone = z; assert.equal(text(), expect(), z); }
  // ค่าเดี่ยว (min=max) แสดงเป็นเลขเดียว
  assert.equal(baseSwordAttack(() => 20), '20');
  assert.equal(baseSwordAttack(b => b + 1), `${BATTLE.atk[0] + 1}–${BATTLE.atk[1] + 1}`);
});

// ---------- ข้อ 2: วงคำสั่ง ----------
const A = WHEEL_ART;
const artOf = (p, wheel) => ({ l:p.left + A.x0 * wheel.w, r:p.left + A.x1 * wheel.w, t:p.top + A.y0 * wheel.h, b:p.top + A.y1 * wheel.h });
const overlap = (a, b) => a.l < b.r - 2 && a.r > b.l + 2 && a.t < b.b - 2 && a.b > b.t + 2;
const within = (a, area) => a.l >= -0.5 && a.t >= -0.5 && a.r <= area.w + 0.5 && a.b <= area.h + 0.5;
// ฉากตัวอย่างจากการวัดจริงใน browser (arena ขนาดต่างๆ)
const SCENES = {
  desktop1440:{ area:{ w:1414, h:874 }, wheel:{ w:258, h:316 }, team:[{ l:365, t:409, r:570, b:630 }, { l:481, t:410, r:693, b:625 }], foe:[{ l:1090, t:405, r:1190, b:620 }] },
  landscape844:{ area:{ w:818, h:364 }, wheel:{ w:170, h:208 }, team:[{ l:204, t:145, r:322, b:263 }, { l:278, t:117, r:401, b:257 }], foe:[{ l:600, t:100, r:700, b:250 }] },
  portrait390:{ area:{ w:364, h:818 }, wheel:{ w:150, h:184 }, team:[{ l:48, t:496, r:125, b:573 }, { l:102, t:407, r:182, b:567 }], foe:[{ l:190, t:255, r:320, b:390 }] },
  portrait360:{ area:{ w:334, h:714 }, wheel:{ w:150, h:184 }, team:[{ l:43, t:430, r:113, b:501 }, { l:94, t:354, r:167, b:495 }], foe:[{ l:170, t:215, r:300, b:345 }] },
};
for (const [name, sc] of Object.entries(SCENES)) {
  test(`I1-B-2: วงอยู่ขวาของตัวที่ถึงตา ไม่ทับตัวละคร ไม่ล้นจอ — ${name}`, () => {
    const me = sc.team[sc.team.length - 1];                    // ยมบาท = ขวาสุดของทีม
    const p = placeWheel({ area:sc.area, wheel:sc.wheel, me, team:sc.team, foes:sc.foe });
    const art = artOf(p, sc.wheel);
    assert.ok(within(art, sc.area), `inside the arena ${JSON.stringify(art)}`);
    for (const r of [...sc.team, ...sc.foe]) assert.ok(!overlap(art, r), `must not cover ${JSON.stringify(r)} (wheel ${JSON.stringify(art)})`);
    assert.ok(art.l >= me.r, 'to the right of the active character');
    assert.ok(art.l - me.r < 90, `close to the active character (gap ${Math.round(art.l - me.r)}px)`);
    assert.ok(art.t < me.t + (me.b - me.t) * 0.5, 'in the upper half beside the character');
  });
}
test('I1-B-2: ตัวละครคนซ้ายถึงตา — วงอยู่ขวาบนของตัวนั้น และก้นวงไม่ลงมาทับหัวเพื่อนข้างขวา', () => {
  const sc = SCENES.desktop1440, me = sc.team[0];
  const p = placeWheel({ area:sc.area, wheel:sc.wheel, me, team:sc.team, foes:sc.foe });
  const art = artOf(p, sc.wheel);
  assert.ok(art.l >= me.r);
  assert.ok(!overlap(art, sc.team[1]));
});
test('I1-B-2: ยักษ์/ยมทูตที่อยู่ซ้ายสุดถึงตา — วงอยู่ขวาบน ไม่ตกลงไปอยู่ใต้ตัวละคร ไม่ทับใคร', () => {
  const sc = SCENES.desktop1440;
  for (const me of sc.team.slice(0, -1)) {
    const p = placeWheel({ area:sc.area, wheel:sc.wheel, me, team:sc.team, foes:sc.foe });
    const art = artOf(p, sc.wheel);
    assert.ok(within(art, sc.area));
    for (const r of [...sc.team, ...sc.foe]) assert.ok(r === me || !overlap(art, r), `${JSON.stringify(art)} vs ${JSON.stringify(r)}`);
    assert.ok(art.b <= Math.min(...sc.team.map(r => r.t)) + 1, 'above every head, not below the row');
  }
});
test('I1-B-2: ui.js ใช้ placeWheel ทุกขนาดจอ (ไม่จำกัดเฉพาะ ≥701px) และตามเมื่อปรับขนาดจอ', () => {
  const ui = read('src/ui.js');
  assert.match(ui, /placeWheel\(\{ area:/);
  assert.doesNotMatch(ui, /matchMedia\('\(min-width:701px\)'\)\.matches\) return;\n\s+const area/);
  assert.doesNotMatch(ui, /teamRight \+ 6/);
  assert.match(ui, /new ResizeObserver\(place\)\.observe\(stage\)/);
});

// ---------- ข้อ 4: ปุ่มเก็บไอเท็ม ----------
test('I1-B-4: ปุ่มเก็บไอเท็มที่ตกอยู่ ~78% ของปุ่มหลักเดิม และอยู่กลางด้านล่าง ไม่ใช่กลางฉาก', () => {
  const css = read('src/flow29c.css'), ui = read('src/ui.js');
  const old = { minW:250, minH:60, padX:30, font:24 };                  // .fin-main button เดิม (เดสก์ท็อป)
  const m = css.match(/\.fin-main\.fin-above-cards button\{min-width:min\((\d+)px,56vw\);min-height:(\d+)px;padding:(\d+)px (\d+)px;font-size:clamp\((\d+)px,([\d.]+)vw,(\d+)px\)\}/);
  assert.ok(m, 'desktop size rule present');
  const [minW, minH, padX, font] = [m[1], m[2], m[4], m[7]].map(Number);
  for (const [now, was] of [[minW, old.minW], [minH, old.minH], [padX, old.padX], [font, 24]]) {
    const r = now / was; assert.ok(r >= 0.75 && r <= 0.82, `scale ${r.toFixed(2)}`);
  }
  assert.match(css, /\.fin-above-cards\{left:50%;top:auto;bottom:3\.5%;transform:translateX\(-50%\)\}/);
  assert.match(css, /\.fin-above-cards\{left:68%;top:auto;bottom:3%;transform:translateX\(-50%\)\}/);
  assert.doesNotMatch(css, /fin-above-cards\{left:61%/);
  assert.match(ui, /placeFinButton\(\{ area:/);                          // จัดกลางช่องว่างระหว่างการ์ดทีม/ศัตรูจริง
  assert.match(ui, /\.battle-team-hud \.battle-portrait, \.battle-boss-hud, \.battle-scene-talk/);
});
// กรอบการ์ดจริงที่วัดใน browser (พิกัดในกรอบฉาก) — ทีมครบ 4 ใบ + การ์ดศัตรู
const FIN_SCENES = {
  desktop1440:{ area:{ w:1414, h:874 }, btn:{ w:195, h:53 }, cards:[[128,673,229,833],[243,673,344,833],[358,673,459,833],[474,673,574,847],[947,700,1314,847]] },
  landscape844:{ area:{ w:818, h:364 }, btn:{ w:150, h:38 }, cards:[[74,233,140,344],[142,233,208,344],[210,233,276,344],[278,233,364,352],[548,267,760,352]] },
  portrait390:{ area:{ w:364, h:818 }, btn:{ w:150, h:42 }, cards:[[12,686,84,793],[88,686,160,793],[164,686,236,793],[240,686,312,805],[128,596,364,662]] },
  portrait360:{ area:{ w:334, h:714 }, btn:{ w:150, h:42 }, cards:[[12,584,84,691],[88,584,160,691],[164,584,236,691],[240,584,312,703],[116,500,334,566]] },
};
for (const [name, sc] of Object.entries(FIN_SCENES)) {
  test(`I1-B-4: ปุ่มเก็บไอเท็มไม่ทับการ์ดและอยู่ในฉาก — ${name}`, () => {
    const obstacles = sc.cards.map(([l, t, r, b]) => ({ l, t, r, b }));
    const p = placeFinButton({ area:sc.area, btn:sc.btn, obstacles });
    const rect = { l:p.x - sc.btn.w / 2, r:p.x + sc.btn.w / 2, t:p.y - sc.btn.h, b:p.y };
    assert.ok(rect.l >= 0 && rect.r <= sc.area.w && rect.t >= 0 && rect.b <= sc.area.h, 'inside arena');
    for (const o of obstacles) assert.ok(!overlap(rect, o), `must not cover card ${JSON.stringify(o)}`);
    if (name.startsWith('desktop') || name.startsWith('landscape')) {
      assert.ok(rect.b > sc.area.h * 0.9, 'sits at the bottom of the arena');
      assert.ok(Math.abs(p.x - sc.area.w / 2) < sc.area.w * 0.2, 'near the horizontal centre');
    }
  });
}
