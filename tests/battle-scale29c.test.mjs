import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { planSquad, planCutscene, CREW_SCALE_TARGET } from '../src/battle-scale.js';

const img = rel => fileURLToPath(new URL(`../img/${rel}`, import.meta.url));
const FOLDERS = ['', 'Asia/', 'West/', 'CyberHell/'];
const SPRITE = /^crew-(taan|plerng|dam|kan|boon|guard)(-(asia|west|cyberhell))?(-v2)?\.png$/;

// วัดกรอบส่วนที่ไม่โปร่งใสของภาพจริงด้วย PIL (เกณฑ์ alpha > 40 เดียวกับ src/battle-scale.js)
function boxesOf(files) {
  const out = execFileSync('python3', ['-c', `
import json, sys
from PIL import Image
res = {}
for p in sys.argv[1:]:
    im = Image.open(p).convert("RGBA")
    a = im.split()[3].point(lambda v: 255 if v > 40 else 0)
    bb = a.getbbox()
    w, h = im.size
    res[p] = None if not bb else {"l": bb[0]/w, "t": bb[1]/h, "w": (bb[2]-bb[0])/w, "h": (bb[3]-bb[1])/h, "aspect": w/h}
print(json.dumps(res))`, ...files], { maxBuffer:4_000_000 });
  return JSON.parse(out);
}

const crewFiles = FOLDERS.flatMap(f => readdirSync(img(f || '.')).filter(n => SPRITE.test(n)).map(n => img(f + n)));

test('มีภาพยมทูต/ยักษ์ให้ตรวจครบทุกโซน', () => {
  for (const f of FOLDERS) assert.ok(crewFiles.some(p => p.includes(`/img/${f}crew-kan`)), `${f || 'th'}: crew-kan`);
  assert.ok(crewFiles.filter(p => /crew-guard/.test(p)).length >= 4, 'ยักษ์ทวารบาลทุกโซน');
});

test('ทุกโซน ทุกยมทูต (รวมยักษ์ทวารบาล): ความสูงตัวจริงใกล้เคียงยมบาทน้อยในขนาดจอเดสก์ท็อปและมือถือ', () => {
  const boxes = boxesOf(crewFiles);
  const cases = [
    // [ชื่อ, ความสูงตัวจริงของยมบาทน้อยบนจอ, ขอบซ้ายตัวจริง, ซ้ายสุดของฉาก]
    ['desktop 1440', 215, 515, 0.92], ['laptop 1024', 150, 330, 0.92], ['mobile 390', 79, 125, 0.85],
  ];
  for (const [name, visH, oLeft, minRatio] of cases) {
    {
      for (const zone of FOLDERS) {
        const group = crewFiles.filter(p => p.includes(`/img/${zone}crew-`));
        const pick = ['kan', 'plerng', 'guard'].map(k => group.find(p => p.includes(`crew-${k}`))).filter(Boolean);
        const crew = pick.map(p => ({ box:boxes[p], aspect:boxes[p].aspect }));
        const plan = planSquad({ visH, oLeft, base:0 }, crew, { stageLeft:0 });
        plan.items.forEach((it, i) => {
          const vis = it.boxH * crew[i].box.h;
          const ratio = vis / visH;
          assert.ok(ratio >= minRatio && ratio <= 1.0, `${name} ${zone || 'th'} ${pick[i].split('/').pop()}: สูงตัวจริง ${vis.toFixed(1)} / ยมบาท ${visH} = ${ratio.toFixed(2)}`);
          const oL = it.left + crew[i].box.l * it.boxW;
          assert.ok(oL >= 4 - 0.5, `${name}: ตัวซ้ายสุดไม่หลุดขอบ ${oL.toFixed(1)}`);
        });
        const last = plan.items.at(-1), lb = crew.at(-1).box;
        assert.ok(last.left + (lb.l + lb.w) * last.boxW <= oLeft - 5, `${name}: ไม่ทับยมบาทน้อย`);
      }
    }
  }
  assert.ok(CREW_SCALE_TARGET >= 0.9 && CREW_SCALE_TARGET <= 1);
});

test('ภาพยมทูตที่กรอบตัวจริงเตี้ย/แคบต่างกัน ได้ความสูงตัวจริงเท่ากันหมด (ไม่ใช่ความสูงกล่องภาพ)', () => {
  const crew = [{ box:{ l:.2, t:.05, w:.4, h:.9 }, aspect:1 }, { box:{ l:.1, t:.2, w:.7, h:.75 }, aspect:1 }, { box:{ l:0, t:0, w:1, h:1 }, aspect:1.5 }];
  const plan = planSquad({ visH:200, oLeft:600, base:0 }, crew);
  const vis = plan.items.map((it, i) => it.boxH * crew[i].box.h);
  vis.forEach(v => assert.ok(Math.abs(v - 200 * CREW_SCALE_TARGET) < 0.01, `${v}`));
});

// ---- ข้อ 8: คัตซีนยมทูต/ยักษ์ทวารบาลไม่ตกขอบ ทุกตัวทุกโซน ----
const CUT = /^crew-(taan|plerng|dam|kan|boon|guard)(-(asia|west|cyberhell))?-cutscene(-(asia|west|cyberhell))?\.(png|jpeg)$/;
const cutFiles = FOLDERS.flatMap(f => readdirSync(img(f || '.')).filter(n => CUT.test(n)).map(n => img(f + n)));

test('คัตซีนยมทูต/ยักษ์ทวารบาลทุกใบทุกโซน: ส่วนที่มีภาพจริงอยู่ในฉากครบและเต็มอย่างน้อยหนึ่งแกน', () => {
  assert.equal(cutFiles.length, 6 + 18, 'โซน 1 หกใบ (ยมทูต 5 + ยักษ์) + โซน 2–4 โซนละหกใบ');
  const boxes = boxesOf(cutFiles);
  const dims = JSON.parse(execFileSync('python3', ['-c', `
import json, sys
from PIL import Image
print(json.dumps({p: Image.open(p).size for p in sys.argv[1:]}))`, ...cutFiles]).toString());
  const shapes = [['desktop', 1414, 874], ['laptop', 1000, 600], ['mobile', 367, 826], ['small', 334, 700]];
  let squareWithEmptyTop = 0;
  for (const f of cutFiles) {
    const box = boxes[f], [nw, nh] = dims[f];
    assert.ok(box, `${f}: มีส่วนที่ไม่โปร่งใส`);
    if (box.t > 0.2) squareWithEmptyTop++;
    for (const [name, cw, ch] of shapes) {
      const p = planCutscene({ cw, ch }, { nw, nh }, box);
      const l = p.left + box.l * p.width, t = p.top + box.t * p.height;
      const r = l + box.w * p.width, b = t + box.h * p.height;
      const tag = `${name} ${f.split('/img/')[1]}`;
      assert.ok(l >= -0.5 && t >= -0.5 && r <= cw + 0.5 && b <= ch + 0.5, `${tag}: ภาพจริง ${l.toFixed(0)},${t.toFixed(0)}–${r.toFixed(0)},${b.toFixed(0)} ต้องอยู่ใน ${cw}×${ch}`);
      assert.ok((r - l) >= cw * 0.98 || (b - t) >= ch * 0.98, `${tag}: เต็มอย่างน้อยหนึ่งแกน`);
    }
  }
  assert.ok(squareWithEmptyTop >= 12, `มีภาพโซน 2–4 ที่ครึ่งบนโปร่งใสจริง (พบ ${squareWithEmptyTop} ใบ)`);
});
