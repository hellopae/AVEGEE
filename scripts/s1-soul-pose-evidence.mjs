// Run from the repository root. Evidence only; never changes case narratives.
import { readFileSync, writeFileSync } from 'node:fs';
import { ALL_CASES } from '../src/cases.js';
import { soulArchetype } from '../src/soul-portraits.js';
import { regionalSpiritAliases } from '../src/regional-spirits.js';
import { CASE_POSE_TYPES, soulPoseAssets } from '../src/soul-poses.js';
const out = 'output/coordination/2026-10-28-s1-soul-poses';
const exceptions = {
 A5:'คำตอบลดทอนความรับผิดเรื่องตลาด แต่ไม่ได้ปฏิเสธการใช้กองกำลังโดยตรง จัด other แบบระมัดระวัง',
 A11:'คำขอเลื่อนการยอมรับการตายของบิดา ไม่ใช่คำปฏิเสธลายเซ็นปลอมโดยตรง และไม่ใช่ necessity',
 A13:'การเปิดผลยาที่ไม่ได้มาตรฐานยังไม่หักล้างคำอ้างว่าอนุมัติตามเอกสาร จัด other',
 A19:'เปิดพฤติกรรมปั่นราคาเพิ่ม แต่ยังไม่หักล้างข้ออ้างช่องกฎหมายโดยตรง จัด other',
};
const rows = ALL_CASES.map(c => {
 const file = c.zone === 'asia' ? 'src/cases-asia.js' : 'src/cases.js';
 const lines = readFileSync(file,'utf8').split('\n');
 const line = lines.findIndex(l => c.zone === 'asia' ? l.includes(`C(${c.k.slice(1)},`) : l.includes(`k:'${c.k}'`)) + 1;
 const type = CASE_POSE_TYPES[c.k];
 const claim = c.claims.find(l => l.kind === (type === 'necessity' ? 'plea' : 'deny')) || c.claims[0];
 const reason = exceptions[c.k] || (type === 'caught_lie' ? 'ปฏิเสธแล้วเปิดข้อเท็จจริงขัดคำอ้าง' : type === 'necessity' ? 'ยอมรับการกระทำและเปิดเหตุบรรเทา/ไม่มีทางช่วยเหลือ (ไม่ใช่การตัดสินว่ายกเว้นความผิด)' : 'ไม่มีคำให้การเท็จหรือเหตุจำเป็นที่เปิดด้วยการจี้');
 const art = c.k === 'devaMonk' ? 'img/soul-deva.png' : soulArchetype({case:c.k}) === 'recruit' ? 'img/Thai/spirit-recruit-th-v3.png' : soulArchetype({case:c.k}) === 'graduate' ? 'img/West/spirit-graduate-west-v3.png' : 'img/' + regionalSpiritAliases(c.zone || 'th')[`spirit-${soulArchetype({case:c.k})}-${c.zone || 'th'}`];
 const evidence = `คำให้การ: “${claim.t}”${claim.reveal ? ` → “${claim.reveal}”` : ''}${type === 'necessity' ? `; เหตุบรรเทา: ${(c.hidden || []).map(d=>d.t).join(' / ')}` : ''}`;
 return `| ${c.zone || 'th'} | ${c.k} | ${c.name} | ${type} | ${reason}; ${evidence} ([สำนวน](../../../${file}#L${line})) | ${art} | ${soulPoseAssets(art).length && type === 'caught_lie' ? 'พร้อม: officer caught_lie (ใช้ซ้ำต่อภาพ)' : type === 'other' ? 'คงเดิม' : 'ค้างวาด'} |`;
});
writeFileSync(`${out}/case-review.md`, `# S1 — ตารางคัดคดีจากสำนวนจริง\n\nตรวจครบ ${ALL_CASES.length} คดีตั้งชื่อ: ไทย 25 + asia 20 ไม่แก้ข้อความ/ผลตัดสิน ตัดสินประเภทด้วยความหมายคำให้การและเฉลย ไม่ใช้สี/คะแนน/เพียง kind tragic\n\n| โซน | id | ชื่อ | ประเภท | เหตุผลและหลักฐาน | ภาพเดิม | สถานะ |\n|---|---|---|---|---|---|---|\n${rows.join('\n')}\n\nwest: ไม่มี named cases (CASES_BY_ZONE.west=[]); cyberhell: ไม่มี named pool (fallback []) — src/cases.js:719–720 และ src/game.js:523–524 คดีสุ่มและคดีกลับมารับโทษซ้ำคง reaction เดิม ไม่อนุมานท่าจากคะแนนหรือสำนวนสุ่ม ภาพ regional ใช้ตาม artUrl ใน src/art.js; รูปเป็น archetype ต่อโซน ไม่ใช่ portrait แยกต่อคดี\n\nข้อสังเกต A1: มีคำปฏิเสธว่าไฟเกิดเอง จัด caught_lie แม้มีเหตุบรรเทา; ไม่มีภาพท่า Asia จึงยังคง reaction เดิม ส่วน A5/A11/A13/A19 จัด other เพราะข้อความยังไม่ยืนยันว่าคำอ้างถูกหักล้างโดยตรง\n`);
writeFileSync(`${out}/comparison.html`, `<!doctype html><meta charset="utf-8"><title>S1 drawing comparison</title><style>body{background:#232630;color:#fff;font:18px system-ui;margin:24px}.pair{display:flex;flex-wrap:wrap}figure{margin:12px;flex:1;min-width:260px}img{width:100%;max-width:500px;background:repeating-conic-gradient(#555 0% 25%,#777 0% 50%) 0/20px 20px}</style><h1>Officer — caught_lie</h1><p>Recovered drawing; same canvas 1254×1254, RGBA. Renderer alignment still needs visual review.</p><div class="pair"><figure><figcaption>Original</figcaption><img src="originals/spirit-officer-th-v2.png"></figure><figure><figcaption>Recovered replacement</figcaption><img src="officer-caught-lie-source.png"></figure></div><p>Necessity drawing is pending. No replacement is enabled for it.</p>`);
