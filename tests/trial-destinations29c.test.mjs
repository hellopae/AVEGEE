import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createGame } from '../src/game.js';
import { STATIONS, ROOMS, ZONES, isTrialDestination } from '../src/data.js';
import { resetWalk } from '../src/walk.js';

globalThis.Image = class {};

const FOLDER = { th:'', asia:'Asia/', west:'West/', cyberhell:'CyberHell/' };
const bgFile = (k, zone) => fileURLToPath(new URL(
  `../img/${FOLDER[zone]}BG-${k[0].toUpperCase()}${k.slice(1)}${zone === 'th' ? '' : '-' + zone}.webp`, import.meta.url));
const soulFor = (id, tag) => ({ id, who:`ผู้ทดสอบ${id}`, sp:1, sex:'m', deserved:3, pure:tag === 'pure',
  deeds:tag === 'pure' ? [] : [{ w:3, s:tag, t:'กรรม', known:true }], merits:[] });

test('หอทะเบียนกรรมไม่ใช่สถานที่ที่เลือกส่งวิญญาณได้ · ส่งไม่ได้ด้วย', () => {
  const sala = STATIONS.find(s => s.k === 'sala');
  assert.equal(isTrialDestination(sala), false);
  for (const s of STATIONS.filter(s => s.tags.length || s.heaven)) assert.equal(isTrialDestination(s), s.pow > 0, s.k);
  const g = createGame();
  g.crew.forEach(c => { c.at = null; });
  assert.ok(g.stations.some(s => s.def.k === 'sala'), 'โซนเริ่มต้นมีหอทะเบียน');
  assert.equal(g.trialDestinations().some(s => s.def.k === 'sala'), false);
  g.queue.push(soulFor(8801, 'kong'));
  assert.equal(g.assignBlock(8801, 'sala', 'taan')?.key, 'stationMissing');
  assert.equal(g.assign(8801, 'sala', 'taan', 3), false);
});

test('ทุกโซน: ตัวเลือกสถานที่ทุกตัวมีอยู่จริงในโซนนั้น มีฉากห้อง และส่งไปแล้วทำงานได้', () => {
  const g = createGame();
  g.level = 5; g.coin = 99999;
  for (const z of ZONES) g.bossCleared[z.k] = true;
  for (const z of ZONES) {
    if (g.zone !== z.k) assert.equal(g.moveZone(z.k), true);
    resetWalk();
    // สร้างสถานีที่ลงทัณฑ์ได้ครบทุกหลังที่เกมมีให้ (ตรงกับเมนูก่อสร้างที่ cost > 0)
    for (const def of STATIONS.filter(d => d.cost > 0 && !g.stations.some(s => s.def.k === d.k)))
      g.stations.push({ def, slots:[], crewK:null, intensity:3, build:0, buildWait:false, repair:0, repairWait:false, arrivalElapsed:0, fire:0, speedLv:0, capLv:0 });
    g.queue = []; g.mobs = []; g.sentences = [];
    const dests = g.trialDestinations();
    assert.ok(dests.length >= 2, `${z.k}: มีตัวเลือกสถานที่`);
    assert.equal(dests.some(s => s.def.k === 'sala'), false, `${z.k}: ไม่มีหอทะเบียนกรรม`);
    for (const st of dests) {
      const k = st.def.k;
      assert.ok(g.stations.includes(st), `${z.k}/${k}: สถานีอยู่ในโซนนี้จริง`);
      assert.ok(ROOMS[k], `${z.k}/${k}: มีจุดยึดฉากห้อง`);
      // ภาพฉากห้องของโซน ไม่มีก็ถอยไปใช้ภาพโซน 1 (ui.js roomFor/stBg) — ต้องมีอย่างน้อยหนึ่งไฟล์ ห้องจึงเปิดได้
      assert.ok(existsSync(bgFile(k, z.k)) || existsSync(bgFile(k, 'th')), `${z.k}/${k}: มีภาพฉากห้อง`);
      assert.ok(g.stCap(st) > 0 && g.stFree(st) > 0, `${z.k}/${k}: รับวิญญาณได้`);
      // ส่งจริง: ออกหมาย → ทัณฑ์ครบ → เข้าตะรางรอ (หรือประตูสวรรค์รอบุญตรวจ) ต้องไม่เงียบหาย
      const crew = g.crew.find(c => !c.reader && !c.at && !c.escort) || (g.hire('taan'), g.crew.find(c => c.k === 'taan'));
      crew.at = null; crew.escort = null; g.transits = [];
      const tag = st.def.heaven ? 'pure' : st.def.tags[0];
      const id = 9000 + g.queue.length + dests.indexOf(st) * 10 + ZONES.indexOf(z) * 100;
      g.queue.push(soulFor(id, tag));
      assert.equal(g.assign(id, k, crew.k, 3), true, `${z.k}/${k}: ออกหมายได้`);
      const slot = st.slots.find(x => x.soul.id === id);
      assert.ok(slot, `${z.k}/${k}: วิญญาณเข้าช่องของสถานี`);
      crew.escort = null; g.transits = [];
      g.finish(st, slot);
      g.advanceAfterlife(1e6);
      const landed = g.sentences.some(x => x.soul.id === id) || g.queue.some(x => x.id === id);
      assert.ok(landed, `${z.k}/${k}: ส่งแล้วมีผลต่อเนื่อง (เข้ารายชื่อตะราง/ประตูสวรรค์/กลับคิว)`);
      crew.at = null; crew.escort = null;
    }
  }
});
