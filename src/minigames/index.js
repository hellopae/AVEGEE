// src/minigames/index.js — ทะเบียนมินิเกม "เร่งการทำงาน" ของแต่ละสถานี (ชุดที่ 9 คุณเป้ 24 ก.ย. 2569)
//
// ที่มา: ปุ่ม "⚙️ เร่งการทำงาน" เดิมจ่ายเบี้ยกรรม — คุณเป้สั่งเปลี่ยนเป็นเล่นมินิเกมแทน (ไม่หักเบี้ยแล้ว)
// เกมที่ใช้มาจากข้อเสนอ Minnie (Output/Minnie/2026-09-18-avegee-station-minigames.md)
// "10 แบบที่แนะนำ" — เอามาเฉพาะ 7 หลังที่มีปุ่มนี้จริง (สถานีที่ def.pow > 0 ดู src/game.js stCap())
//
// เพิ่มเกมใหม่ = เขียนไฟล์ src/minigames/<k>.js ที่ export default ตามรูปแบบด้านล่าง แล้วเพิ่ม 1 บรรทัด
// ในอ็อบเจ็กต์ MINIGAMES นี้ — ui.js เรียกผ่านทะเบียนนี้ที่เดียว ไม่ import ไฟล์เกมตรง ๆ
//
// รูปแบบของแต่ละไฟล์เกม (ดู src/minigames/util.js ประกอบ):
//   export default {
//     name: 'ชื่อเกมที่โชว์บนหัวกล่อง',
//     icon: 'อิโมจิ 1 ตัว',
//     tip: 'คำอธิบาย 1 บรรทัดก่อนเริ่ม (โชว์ทุกครั้งที่เปิด)',
//     run(host, { level, alive, onWin, onLose }) {
//       // วาด DOM ใส่ host แล้วคืนฟังก์ชัน stop() ที่ยกเลิก timer/rAF ของตัวเอง
//       return () => { ... };
//     },
//   };

import sala from './sala.js';
import krata from './krata.js';
import dab from './dab.js';
import lokan from './lokan.js';
import ngiw from './ngiw.js';
import lan from './lan.js';
import sawan from './sawan.js';

export const MINIGAMES = { sala, krata, dab, lokan, ngiw, lan, sawan };
