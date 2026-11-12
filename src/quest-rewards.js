// QUEST-REWARDS (10 พ.ย. 2569, คุณเป้) — รางวัลจบภารกิจตามระดับความยาก
// ระดับความยากมาจาก Rae (Output/Rae/2026-11-10-avegee-quest-dialogue.md + quest-battle-script.md)
// รางวัลเดิมของแต่ละภารกิจ (award() ใน side-quests.js: เบี้ยกรรม/ระเบียบ/ของตามทางที่เลือก) ไม่เปลี่ยน
// ตารางนี้คือ "ของเพิ่มตามระดับ" ที่ให้ทับลงไปอีกชั้น + ท่าไม้ตายสำหรับภารกิจที่ต้องสู้
//   easy     ง่าย      เบี้ยกรรมนิดหน่อย + ของใช้ 1-2 ชนิด (หีบยา / ห่อเสบียง / น้ำมนต์)
//   mid      กลาง      เบี้ยกรรม +40 + ชุดของใหญ่ขึ้น (+ วัตถุดิบขายได้ หรือน้ำชา)
//   hard     ยาก       เบี้ยกรรม +60 + ชุดของ + ท่าไม้ตายใหม่ (ต้องสู้)
//   veryHard ยากมาก    เบี้ยกรรม +80 + ชุดของ + ท่าไม้ตายใหม่ (ต้องสู้)
// ของทุกชิ้นใช้คีย์ใน ITEMS ที่มีอยู่แล้ว · ท่าไม้ตายอยู่ใน combat-skills.js (quest:<id ภารกิจ>)
import { ITEMS } from './data.js';
import { COMBAT_SKILLS } from './combat-skills.js';

export const QUEST_TIER_LABEL = Object.freeze({ easy:'ง่าย', mid:'กลาง', hard:'ยาก', veryHard:'ยากมาก' });

export const QUEST_REWARDS = Object.freeze({
  // ---- ง่าย ----
  sqDam:          { tier:'easy', coin:20, items:{ health:1 }, onlyIfVerdictRight:true },   // ตัดสินพลาด = ปิดทางล้มเหลวเดิม เบี้ย 30 ไม่มีของ
  kinTaan:        { tier:'easy', coin:20, items:{ health:1, food:1 } },
  kinPlerng:      { tier:'easy', coin:20, items:{ holyWater:2 } },
  kinKan:         { tier:'easy', coin:20, items:{ health:1, holyWater:1 } },
  kinBoonCousin:  { tier:'easy', coin:20, items:{ holyWater:1, food:1 } },
  kinBoonGrand:   { tier:'easy', coin:10, items:{ holyWater:1 } },
  kinDamBro:      { tier:'easy', coin:20, items:{ health:1, food:2 } },
  kinDamCousin:   { tier:'easy', coin:10, items:{ food:2 } },
  kinGuard:       { tier:'easy', coin:20, items:{ health:1, holyWater:1 } },
  // ---- กลาง ----
  sqNira:         { tier:'mid', coin:40, items:{ health:1, holyWater:1, food:2, tea:2 } },
  sqTaan:         { tier:'mid', coin:40, items:{ health:1, holyWater:1, food:2, ashStone:2 } },
  sqPlerng:       { tier:'mid', coin:40, items:{ health:1, holyWater:1, food:2, emberWood:2 } },
  sqMerchant:     { tier:'mid', coin:40, items:{ health:1, holyWater:1, food:2, bladeShard:2 } },
  // ---- ยาก (ต้องสู้ + ท่าไม้ตาย) ----
  sqGuard:        { tier:'hard', coin:60, items:{ health:2, holyWater:2, bladeShard:2 }, skill:'gatekeeperStand' },
  // ---- ยากมาก (ต้องสู้ + ท่าไม้ตาย) ----
  sqKan:          { tier:'veryHard', coin:80, items:{ health:3, holyWater:2, ashStone:2 }, skill:'eyeAwaitingPermission' },
  sqBoon:         { tier:'veryHard', coin:80, items:{ health:3, holyWater:2, tea:2 }, skill:'letterDelivered' },
});

export const questSkillOf = id => QUEST_REWARDS[id]?.skill || null;
export const questNeedsFight = id => !!questSkillOf(id);

/** ของเพิ่มตามระดับของภารกิจนี้ ณ สถานะนี้ → { coin, items } (ไม่มีของ = {coin:0, items:{}}) */
export function questBonus(q, s) {
  const row = QUEST_REWARDS[q?.id];
  if (!row) return { coin:0, items:{} };
  if (row.onlyIfVerdictRight && !s?.verdict?.right) return { coin:0, items:{} };
  return { coin:row.coin || 0, items:{ ...row.items } };
}

/** แถวสำหรับแสดงรางวัลล่วงหน้า/หลังรับ — { tier, label, coin, items:[{k,n,name}], skill:{id,name,known}|null } */
export function questRewardPreview(g, q) {
  const row = QUEST_REWARDS[q?.id];
  if (!row) return null;
  const s = g?.sideQuests?.[q.id];
  const skill = row.skill ? { id:row.skill, name:COMBAT_SKILLS[row.skill].name, known:!!s?.fought || !!s?.reward?.skill } : null;
  return { tier:row.tier, label:QUEST_TIER_LABEL[row.tier], coin:row.coin,
    items:Object.entries(row.items).map(([k, n]) => ({ k, n, name:ITEMS[k]?.name || k })), skill, fight:!!row.skill };
}
