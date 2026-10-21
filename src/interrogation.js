/** Pure courtroom rules. Trait colors describe behavior, never guilt or sentence severity. */
const traits=Object.freeze({
  concealing:Object.freeze({key:'concealing',icon:'🧿',label:'ปิดบังความจริง',color:'#b78ae5',keeper:'kan'}),
  resisting:Object.freeze({key:'resisting',icon:'🔥',label:'ดื้อและต่อต้าน',color:'#ef7777',keeper:'plerng'}),
  accepting:Object.freeze({key:'accepting',icon:'🍃',label:'ยอมรับและพร้อมแก้ไข',color:'#83ca96',keeper:'boon'}),
});
export const KAN_SUPPORT=Object.freeze({mpCost:4,moraleCost:4,cooldownMs:30_000});
const roles=Object.freeze({
  taan:Object.freeze({key:'taan',name:'ทัณฑ์ · คุมงานเป็นระเบียบ',
    benefit:'หากตัดสินถูกและงานลงทัณฑ์จบ ระเบียบเมือง +2',
    cost:'ต้องคุมจนจบ จึงไม่ว่างไปสร้างหรือซ่อมอาคาร'}),
  boon:Object.freeze({key:'boon',name:'บุญ · ชำระกรรม',
    benefit:'หากตัดสินถูกและงานลงทัณฑ์จบ กรรมของยามา −1',
    cost:'ใช้เวลาลงทัณฑ์เพิ่ม 20% และไม่ว่างช่วยพักฟื้น'}),
  plerng:Object.freeze({key:'plerng',name:'เพลิง · ปราบความดื้อ',
    benefit:'คุมวิญญาณต่อต้านโดยไม่เสียเวลาจากการขัดขืน หากตัดสินถูกจะเข็ด แต่ไม่รับรองว่าสำนึก',
    cost:'ใช้เสบียงเพิ่ม 2 ห่อต่อหมาย ไม่มีการสุ่มบวกโทษหรือกรรม'}),
  dam:Object.freeze({key:'dam',name:'ดำ · คุมงานหมู่',
    benefit:'เมื่อมีคนงานช่วยถึงสถานีจริงและมีวิญญาณอย่างน้อย 2 ดวง งานคุมของดำเร็วขึ้นอีก 25%',
    cost:'ต้องมีคนงานมาช่วยจริง คนงานคนนั้นจะไม่ว่างเก็บวัสดุหรือซ่อมอาคาร'}),
  kan:Object.freeze({key:'kan',name:'กานต์ · เปิดความจริง',
    benefit:'ก่อนออกหมาย ช่วยเปิดข้อเท็จจริง 1 ประเด็น รวมเหตุบรรเทาโทษ หากคุมทัณฑ์ถูกต้องจนจบ เตรียมเบาะแสได้ 1 ครั้ง สะสมสูงสุด 3 ครั้ง',
    cost:'การขอเบาะแสใช้ MP 4 และกำลังใจ 4 พักพลัง 30 วินาที ใช้เบาะแสที่เตรียมไว้แทน MP ได้ แต่ยังเสียกำลังใจและพักพลัง',...KAN_SUPPORT}),
});
const keyOf=k=>k==='pleng'?'plerng':typeof k==='string'&&k?k:'ordinary';
const ordinary=Object.freeze({key:'ordinary',name:'ผู้คุม · คุมงานตามปกติ',benefit:'คุมงานได้ตามปกติ',cost:'ใช้กำลังใจและเสบียงตามปกติ'});
export function keeperRole(k){return roles[keyOf(k)]||ordinary;}

/** Internal identifiers only. Never pass this list to a public role/impact preview. */
export function hiddenIssues(soul){
  const issues=[];
  for(const [index,d]of (Array.isArray(soul?.deeds)?soul.deeds:[]).entries())
    if(d&&(d.known!==true||d.visible===false))issues.push({kind:'deed',index});
  for(const [index,m]of (Array.isArray(soul?.merits)?soul.merits:[]).entries())
    if(m?.fake===true&&m.exposed!==true)issues.push({kind:'merit',index});
  if(typeof soul?.secret==='string'&&soul.secret.trim()&&soul.secretSeen!==true)issues.push({kind:'secret'});
  return issues;
}

/** Mutates only the single selected issue. The caller records/announces the returned line. */
export function revealOneIssue(soul){
  const issue=hiddenIssues(soul)[0];if(!issue)return null;
  let text;
  if(issue.kind==='deed'){
    const d=soul.deeds[issue.index];d.known=true;d.visible=true;
    text=`🧿 กานต์เปิดข้อเท็จจริงหนึ่งประเด็น — ${d.t||'ข้อเท็จจริงในสำนวน'}`;
  }else if(issue.kind==='merit'){
    const m=soul.merits[issue.index];m.exposed=true;
    text=`🧿 กานต์ตรวจคำอ้างหนึ่งประเด็น — “${m.t||'บุญที่อ้าง'}” เป็นเรื่องแต่งขึ้น`;
  }else{
    soul.secretSeen=true;text=`🧿 กานต์เปิดข้อเท็จจริงหนึ่งประเด็น — ${soul.secret}`;
  }
  return {kind:'truth',text};
}

/** Re-evaluated after questioning; stored evidence flags already survive ordinary save/restore. */
export function spiritTrait(soul){
  if(hiddenIssues(soul).length)return traits.concealing;
  const denial=!!soul?.denied||(Array.isArray(soul?.lines)&&soul.lines.some(l=>l?.kind==='deny'&&!l.used));
  const resistance=!!soul?.resist&&!soul?.calm&&!soul?.pure;
  return denial||resistance?traits.resisting:traits.accepting;
}

/** Operational bonuses cannot turn a wrong destination or excessive/short sentence into justice. */
export function justiceCorrect(verdict){
  if(!verdict||typeof verdict!=='object')return false;
  if(verdict.heaven===true)return verdict.right===true;
  const destination=typeof verdict.destinationCorrect==='boolean'?verdict.destinationCorrect:verdict.tham===100;
  return destination&&verdict.short===0&&verdict.over===0;
}

/** A JSON-safe immutable assignment snapshot, with no hidden crime, answer, count or verdict. */
export function keeperWorkPlan(soul,keeperK){
  const keeper=keyOf(keeperK),trait=spiritTrait(soul).key,punishment=soul?.pure!==true;
  return Object.freeze({version:1,keeper,trait,
    speedMultiplier:keeper==='boon'?1/1.2:1,
    foodCost:keeper==='plerng'?2:0,
    completionOrder:keeper==='taan'&&punishment?2:0,
    completionKarma:keeper==='boon'&&punishment?-1:0,
    requiresJustice:true,
    resistanceControl:keeper==='plerng'&&trait==='resisting'&&punishment,
    crowdSupport:keeper==='dam',
  });
}
