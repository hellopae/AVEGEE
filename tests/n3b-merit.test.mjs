// N3b (16 ต.ค. 2569) — ข้อความบุญ 🪷 ตามผลตรวจ Rae + บุญสุ่มที่ผูกเพศต้องไม่ตกกับวิญญาณอีกเพศ
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { MERITS, HARD_CASES, SEX_OF, WHO } from '../src/data.js';
import { ALL_CASES } from '../src/cases.js';

const ORDAIN = 'เคยบวชให้แม่หนึ่งพรรษา';

test('N3b สุ่ม 2000 วิญญาณ: ไม่มีวิญญาณหญิง (f/g) ได้ "บวชให้แม่" ทั้งบุญจริงและบุญที่อ้างเอง', () => {
  const g = createGame();
  let female = 0, male = 0, maleOrdain = 0;
  for (let i = 0; i < 2000; i++) {
    g.queue = [];
    g.spawnSoul();
    const s = g.queue[0];
    if (s.case || s.hard) continue;
    const isMale = SEX_OF[s.who] === 'm';
    isMale ? male++ : female++;
    for (const m of s.merits) {
      assert.ok(!('sex' in m), 'ฟิลด์ sex ต้องไม่รั่วเข้า merit ของ soul');
      if (!isMale) assert.notEqual(m.t, ORDAIN, `${s.who} (${s.sex}) ได้ "${ORDAIN}"`);
      else if (m.t === ORDAIN) maleOrdain++;
    }
    for (const said of s.said) if (!isMale) assert.ok(!said.text.includes('บวชให้แม่'), 'คำอ้างบนโต๊ะของหญิงต้องไม่มี "บวชให้แม่"');
  }
  assert.ok(female > 200 && male > 200, `ต้องมีทั้งสองเพศในตัวอย่าง (f=${female}, m=${male})`);
  assert.ok(maleOrdain > 0, 'ชายยังต้องสุ่มได้ "บวชให้แม่" (ไม่ใช่กรองจนหาย)');
});

test('N3b merit ผูกเพศมีเฉพาะ "บวชให้แม่" และมีแท็ก sex:m ส่วนที่เหลือใช้ได้ทุกเพศ', () => {
  const tied = MERITS.filter(m => m.sex);
  assert.deepEqual(tied.map(m => m.t), [ORDAIN]);
  assert.equal(tied[0].sex, 'm');
  assert.ok(WHO.some(w => SEX_OF[w] !== 'm'));
});

test('N3b ข้อความบุญใหม่ครบ 8 ข้อ และข้อความเดิมไม่เหลือในซอร์ส', () => {
  const hard = Object.fromEntries(HARD_CASES.map(c => [c.who, c.merit.t]));
  assert.equal(hard['เจ้าของกิจการ'], 'ไม่เคยปลดลูกน้องออก แม้ปีที่บริษัทขาดทุน');
  assert.equal(hard['อดีตข้าราชการ'], 'ยอมเสียงานและอนาคตตัวเอง ไม่หวังตอบแทน');
  const cm = k => ALL_CASES.find(c => c.k === k).merits.map(m => m.t);
  assert.ok(cm('boy').includes('ไม่เคยมีประวัติทำร้ายใครมาก่อนวันนั้นเลย'));
  assert.ok(cm('healer').includes('ไม่เคยปิดบังสิ่งที่ทำ ให้ตรวจสอบได้ตลอด'));
  assert.deepEqual(cm('A14'), ['ออกเงินซ่อมสะพานไม้ให้ชาวบ้านข้ามคลอง']);
  assert.deepEqual(cm('A15'), ['ติวหนังสือให้นักเรียนทุนน้อยโดยไม่คิดเงิน']);
  assert.deepEqual(cm('A18'), ['บริจาคเครื่องสูบน้ำให้หมู่บ้านเกษตรกรช่วงแล้ง']);
  assert.deepEqual(cm('A20'), ['ออกค่ารักษาพนักงานที่ป่วยหนักเองหลายราย']);
  // ข้อ solid ของ asia ต้องทวนข้อความ merit ใหม่ ไม่ใช่ของเดิม
  for (const [k, txt] of [['A14','สะพานไม้'],['A15','ติวหนังสือ'],['A18','เครื่องสูบน้ำ'],['A20','ค่ารักษาพนักงาน']]) {
    const c = ALL_CASES.find(x => x.k === k);
    assert.ok(c.claims.some(l => l.kind === 'solid' && l.t.includes(txt)), `${k} solid ต้องทวน merit ใหม่`);
  }
  const old = ['รู้ล่วงหน้าว่าตัวเองจะโดนอะไร','ไม่เหลือติดตัวแม้แต่บาทเดียว','ขอโทษล่วงหน้า','แม้รู้ว่าผิดกฎหมาย','ปลาที่ซื้อมาเอง','ญาติทำบุญอุทิศให้ทุกปี',
    'จ้างแรงงานท้องถิ่น','คนรุ่นใหม่สนใจ','คนรุ่นใหม่หันมาสนใจ','เกษตรกรเข้าถึงสินค้า','สร้างงานให้ผู้คนจำนวนมาก'];
  for (const f of ['data.js','cases.js','cases-asia.js','game.js','ui.js','i18n.js']) {
    const src = readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
    for (const o of old) assert.ok(!src.includes(o), `${f} ยังมีข้อความเดิม "${o}"`);
  }
});

test('N3b MERITS สุ่ม: ปล่อยปลาเป็นบุญปกติ v:1 ไม่มีวงเล็บ · ญาติอุทิศถูกแทนด้วยบุญที่วิญญาณทำเอง', () => {
  const fish = MERITS.find(m => m.t === 'ปล่อยปลาทุกวันเกิดมาตลอดชีวิต');
  assert.ok(fish); assert.equal(fish.v, 1);
  const funeral = MERITS.find(m => m.t === 'ช่วยงานศพคนในหมู่บ้านไม่เคยเว้นสักงาน');
  assert.ok(funeral); assert.equal(funeral.v, 1);
  assert.ok(!MERITS.some(m => m.v === 0), 'ไม่มีบุญสุ่มที่ v:0 เหลืออยู่');
  assert.ok(!MERITS.some(m => /ปลาที่ซื้อมาเอง|ญาติทำบุญอุทิศให้/.test(m.t)));
  assert.equal(MERITS.length, 7);
});

test('N3b ข้อความบุญใหม่ไม่ยาวเกินค่าอ้างอิง (HARD ≤45, ที่เหลือ ≤60)', () => {
  const texts = [...HARD_CASES.map(c => c.merit.t), ...ALL_CASES.flatMap(c => ['boy','healer','A14','A15','A18','A20'].includes(c.k) ? c.merits.map(m => m.t) : [])];
  for (const t of texts) assert.ok([...t].length <= 60, t);
  for (const t of ['ไม่เคยปลดลูกน้องออก แม้ปีที่บริษัทขาดทุน','ยอมเสียงานและอนาคตตัวเอง ไม่หวังตอบแทน']) assert.ok([...t].length <= 45);
});
