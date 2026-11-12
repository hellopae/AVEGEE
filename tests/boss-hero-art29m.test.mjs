import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

// 29-M ข้อ 8 — ตารางภาพ "หัวหน้าเรา (นั่งเก้าอี้บนแท่น)" กับ "บอสที่ต้องสู้" ของ 4 โซน (คุณเป้ยืนยัน 3 ต.ค. 2569)
// หัวหน้ากับบอสต้องเป็นคนละไฟล์/คนละภาพ และไฟล์ต้องมีจริงทั้งบนดิสก์และใน manifest
const md5 = f => createHash('md5').update(readFileSync(new URL('../img/' + f, import.meta.url))).digest('hex');
const manifest = JSON.parse(readFileSync(new URL('../img/manifest.json', import.meta.url), 'utf8'));
const listed = new Set([...(manifest.critical || []), ...(manifest.rest || []), ...Object.values(manifest.zones).flat()]);

const TABLE = {
  th:        { hero:'hero-boss.webp',                       boss:'zone-boss.webp',                       arrive:null },
  asia:      { hero:'Asia/hero-boss-asia.webp',             boss:'Asia/zone-boss-asia.webp',             arrive:'Asia/Boss Zone2-asia-profile.webp' },
  west:      { hero:'West/hero-boss-west-v2.webp',          boss:'West/zone-boss-west.webp',             arrive:'West/Boss Zone3-west-profile.webp' },
  cyberhell: { hero:'CyberHell/hero-boss-cyberhell-v2.webp', boss:'CyberHell/zone-boss-cyberhell.webp',   arrive:'CyberHell/Boss Zone4-cyberhell-profile.webp' },
};

test('หัวหน้ากับบอสของทุกโซนเป็นคนละไฟล์ ไฟล์มีจริงและอยู่ใน manifest', () => {
  const seen = new Map();
  for (const [zone, row] of Object.entries(TABLE)) {
    for (const f of [row.hero, row.boss, row.arrive].filter(Boolean)) {
      assert.ok(existsSync(new URL('../img/' + f, import.meta.url)), `${zone}: ไม่มีไฟล์ ${f}`);
      assert.ok(listed.has(f), `${zone}: ${f} ไม่อยู่ใน manifest`);
    }
    assert.notEqual(md5(row.hero), md5(row.boss), `${zone}: ภาพหัวหน้ากับบอสเป็นไฟล์เดียวกัน`);
    if (row.arrive) assert.notEqual(md5(row.hero), md5(row.arrive), `${zone}: ภาพบอสมาถึง = ภาพหัวหน้า`);
    for (const f of [row.hero, row.boss]) {
      const h = md5(f);
      assert.ok(!seen.has(h), `${f} ซ้ำกับ ${seen.get(h)}`);
      seen.set(h, f);
    }
  }
});

test('บอสโซน 2-4 ที่ใช้ในเกม = Boss Zone<N> ที่คุณเป้ยืนยัน (ภาพเดียวกัน)', () => {
  assert.equal(md5('Asia/zone-boss-asia.webp'), md5('Asia/Boss Zone2-asia.webp'));
  assert.equal(md5('West/zone-boss-west.webp'), md5('West/Boss Zone3-west.webp'));
  assert.equal(md5('CyberHell/zone-boss-cyberhell.webp'), md5('CyberHell/Boss Zone4-cyberhell.webp'));
});

test('ภาพ "บอสมาถึง" โซน 2-4 เป็นภาพบอส ไม่ใช่หัวหน้า (profile ของบอสโซน 2 ต้องมี ไม่ตกไปใช้ฉากรวม)', () => {
  const { zones } = manifest;
  assert.ok(zones.asia.includes('Asia/Boss Zone2-asia-profile.webp'));
  assert.ok(zones.west.includes('West/Boss Zone3-west-profile.webp'));
  assert.ok(zones.cyberhell.includes('CyberHell/Boss Zone4-cyberhell-profile.webp'));
  // ไม่มี profile ของ "หัวหน้า" ปนอยู่ในชื่อ Boss Zone
  for (const z of ['asia', 'west', 'cyberhell']) for (const f of zones[z].filter(p => /Boss Zone\d/.test(p))) assert.ok(!/hero/.test(f), f);
});

test('ทุกจุดในโค้ดเรียกหัวหน้าด้วยคีย์ hero-boss และบอสด้วย zone-boss (ไม่สลับกัน)', () => {
  const src = f => readFileSync(new URL('../src/' + f, import.meta.url), 'utf8');
  // บัลลังก์/ลงทัณฑ์/พ่อลงมาเอง = หัวหน้า
  assert.match(src('scene.js'), /drawStandee\(ctx, 'hero-boss', SPOTS\.throne/);
  assert.match(src('ui.js'), /punish-dad"><img src="\$\{artUrl\('hero-boss'\)\}/);
  // ป้ายเตือนบอส · เดินเข้าแผนที่ · ศึกบอสโซน = บอส
  assert.match(src('ui.js'), /openEventAlert\('zoneBoss', z\.bossName, z\.bossSub, artUrl\('zone-boss'\)/);
  assert.match(src('scene.js'), /drawStandee\((?:ctx|c), 'zone-boss'/);   // L1: the call sits inside the town shade callback (c)
  assert.match(src('game.js'), /sp:'zone-boss', boss:true/);
});
