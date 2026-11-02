import {QUESTS,questState,questTarget,questsPaused} from './side-quests.js';
import {QUEST_CASES} from './quest-cases.js';

function questObjective(q,state,target) {
  if(q.kin)return state.step===1
    ? `นำคำฝากไปคุยกับ${target.name} เพื่อรับคำตอบ`
    : `นำคำตอบกลับไปให้${target.name} เพื่อปิดภารกิจ`;
  const caseName=QUEST_CASES.find(c=>c.k===q.caseId)?.name||q.title;
  if(state.step===1)return `คุยกับ${target.name} เพื่อเรียกสำนวน “${caseName}” เข้าคิว`;
  if(state.step===2)return `พิจารณาสำนวน “${caseName}” และออกหมายให้เสร็จ แล้วกลับไปหา${target.name}`;
  if(state.step===3)return `กลับไปคุยกับ${target.name} หลังคำตัดสิน เพื่อรับฟังและตอบคำขอ`;
  return `ส่งคำตอบให้${target.name} และรับรางวัลเพื่อปิดภารกิจ`;
}
// Derived journal data only: no initialization, progress writes, or reward side effects.
export function activeQuestEntries(g){
  const paused=questsPaused(g);
  return QUESTS.filter(q=>{const s=questState(g,q.id);return s.step>0&&!s.done;}).map(q=>{
    const state=questState(g,q.id),target=questTarget(g,q);
    const {zone,npc,name,x,y}=target;
    return {id:q.id,title:q.title,zone,npc,name,x,y,objective:questObjective(q,state,target),paused:!q.kin&&paused};
  });
}
