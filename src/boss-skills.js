// BOSS-SKILLS (14 Nov 2026): one data-driven rulebook for the special moves of any boss / event foe.
// A foe gets its moves from its definition in data.js (`skills: [ ... ]`, copied onto the live foe by game.js zoneEventFoes); nothing here knows a boss by name.
//
//   skill = {
//     id:'sweep',                       // unique per foe
//     kind:'groupHit',                  // one of BOSS_SKILL_KINDS below
//     name:{ th, en },                  // the banner while it is used / the warning tag
//     warnText:{ th, en }, useText:{ th, en },    // temporary lines (Rae polishes them)
//     when:{ hpBelow:.6, firstAct:3, everyActs:3, once:true, maxUses:2, gap:2 },   // all given conditions must hold (see below)
//     warn:1,                           // 0 = no warning, 1 = announce on one boss turn, use on the next (the player gets a whole round in between)
//     charge:false,                     // true = the warning turn is spent charging (the boss does not attack that turn)
//     power:.8,                         // groupHit / heavyHit: multiple of the boss's normal hit
//     image:'img/....webp',             // groupHit: the full-screen card (falls back to the zone's boss card)
//     summon:{ count:[2,3], hp:30, atk:[5,8], sp:'boss-wukong-clone-asia', name:{ th, en } (or a plain string), sub:{ th, en }, max:3 },     // summon only
//     heal:{ pct:.25 },                 // heal only
//   }
//
// "Act" = the boss's own turn in which it is able to act (a frozen / confused turn does not count).  hp / atk numbers are base numbers: game.js runs them through
// scaleFoeHp / scaleFoeAtk like every other foe of the zone.  Summoned foes (`summoned:true`) vanish the moment their summoner falls.
export const BOSS_SKILL_KINDS = Object.freeze({
  summon:   'เรียกลูกน้อง/ร่างแยกลงสนาม (foe ใหม่ของมันเอง · max ตัวพร้อมกัน · หายเมื่อบอสแพ้)  — ใช้เทิร์นนั้นเรียก ไม่ตี',
  groupHit: 'โจมตีหมู่ ตีทุกคนในทีมพร้อมกัน แรง = power x ตีปกติ · มีการ์ดเต็มจอ (image)',
  heavyHit: 'ตีเดี่ยวแรง = power x ตีปกติ ไม่มีการ์ด · ใช้กับ "ฟาดหนัก/ชาร์จ"',
  heal:     'ฟื้นพลังตัวเอง pct ของ HP สูงสุด — ใช้เทิร์นนั้นฟื้น ไม่ตี (ใส่ once:true เพื่อฟื้นครั้งเดียว)',
});
export const BOSS_SKILL_WHEN_KEYS = Object.freeze({
  hpBelow:  'ใช้ได้เมื่อ HP ของบอส ≤ สัดส่วนนี้ของ HP สูงสุด (0–1)',
  firstAct: 'ไม่ใช้ก่อนเทิร์นที่ n ของบอส (นับเฉพาะเทิร์นที่ขยับได้)',
  everyActs:'เมื่อถึงเทิร์นที่ firstAct แล้ว ใช้ทุก ๆ n เทิร์น (ห่างจากครั้งก่อนอย่างน้อย n เทิร์น)',
  once:     'ใช้ครั้งเดียวทั้งศึก (= maxUses 1)',
  maxUses:  'ใช้ได้มากสุดกี่ครั้งต่อศึก',
  gap:      'ห่างจากการใช้ท่านี้ครั้งก่อนอย่างน้อย n เทิร์นของบอส',
});

/** The foe's runtime state for its moves (kept on the live foe, so a save in mid-fight keeps the warning). */
export const skillState = foe => (foe.sk ||= { turns:0, pending:null, pendingLabel:null, used:{}, lastUse:{}, spawned:0 });
export const hasSkills = foe => !!(foe && Array.isArray(foe.skills) && foe.skills.length);
const livingSummons = (battle, foe) => battle.foes.filter(f => f.summoned && f.summonerId === foe.id && f.hp > 0).length;

/** Is `skill` allowed on act number `turn` of `foe`?  (pure) */
export function skillDue(battle, foe, skill, turn) {
  const w = skill.when || {}, sk = skillState(foe), used = sk.used[skill.id] || 0;
  if (w.once && used >= 1) return false;
  if (Number.isInteger(w.maxUses) && used >= w.maxUses) return false;
  if (w.hpBelow != null && !(foe.hp <= foe.maxHp * w.hpBelow)) return false;
  const first = w.firstAct ?? w.everyActs ?? 1;
  if (turn < first) return false;
  if (w.everyActs) { const last = sk.lastUse[skill.id]; if (last != null ? turn - last < w.everyActs : false) return false; }
  if (w.gap && sk.lastUse[skill.id] != null && turn - sk.lastUse[skill.id] < w.gap) return false;
  if (skill.kind === 'summon' && livingSummons(battle, foe) >= (skill.summon?.max ?? 3)) return false;
  if (skill.kind === 'heal' && foe.hp >= foe.maxHp) return false;
  return true;
}

/** What does `foe` do with its moves this turn?  Pure: returns null (a normal attack) or
 *  { skill, mode:'warn'|'run', turn, act, noAttack }.  game.js applies it (applySkillPlan) and counts the act.
 *  F3: a foe can act several times in one round (battle-turns.js).  Every number of `when` (firstAct / everyActs / gap) and the warning are counted in ROUNDS of the foe
 *  (`turn` = floor(acts done / acts per round) + 1, so with one act per round nothing changes), `act` = the plain act counter.  A warned move is used on the first act
 *  of a LATER round - the player always gets the rest of the round (every team member's turn) to answer, however many times the boss acts. */
export function planSkill(battle, foe, perRound = 1) {
  if (!hasSkills(foe)) return null;
  const sk = skillState(foe), per = Math.max(1, Math.round(perRound) || 1), act = sk.turns + 1, turn = Math.floor(sk.turns / per) + 1;
  if (sk.pending) {
    const skill = foe.skills.find(s => s.id === sk.pending);
    if (skill) {
      if (sk.pendingAt != null && turn <= sk.pendingAt) return null;   // still the round of the warning: a normal attack, the move waits for the next round
      return { skill, mode:'run', turn, act, noAttack:skill.kind === 'summon' || skill.kind === 'heal' };
    }
    sk.pending = null; sk.pendingLabel = null; sk.pendingAt = null;
  }
  for (const skill of foe.skills) {
    if (!skillDue(battle, foe, skill, turn)) continue;
    if ((skill.warn ?? 1) > 0) return { skill, mode:'warn', turn, act, noAttack:!!skill.charge };
    return { skill, mode:'run', turn, act, noAttack:skill.kind === 'summon' || skill.kind === 'heal' };
  }
  return null;
}

/** Make the summoned foes of one summon move (not yet scaled: the caller passes the zone's scaling functions).  Count is rolled from skill.summon.count. */
export function summonFoes(battle, foe, skill, { scaleHp, scaleAtk, rand = Math.random, lang = 'th' }) {
  const s = skill.summon || {}, sk = skillState(foe);
  const [lo, hi] = Array.isArray(s.count) ? s.count : [s.count ?? 2, s.count ?? 2];
  const room = Math.max(0, (s.max ?? 3) - livingSummons(battle, foe));
  const n = Math.min(room, lo + Math.floor(rand() * (hi - lo + 1)));
  const made = [];
  for (let i = 0; i < n; i++) {
    const hp = scaleHp(s.hp ?? 30);
    made.push({ id:`${foe.id}-sum-${++sk.spawned}`, who:pickText(s.name, lang) || 'ลูกน้อง', sub:pickText(s.sub, lang) || 'ร่างแยก', sp:s.sp || foe.sp, boss:false, summoned:true, summonerId:foe.id,
      hp, maxHp:hp, atk:scaleAtk(s.atk || [5, 8]), stun:0, confuse:0, speed:s.speed ?? 10 });
  }
  battle.foes.push(...made);
  return made;
}

/** A summoned foe whose summoner is down (or gone) is gone too — call before every "are all foes down?" check. */
export function settleSummons(battle) {
  for (const f of battle.foes) {
    if (!f.summoned || f.hp <= 0) continue;
    const owner = battle.foes.find(o => o.id === f.summonerId);
    if (!owner || owner.hp <= 0) f.hp = 0;
  }
}

/** Language pick of a {th,en} text (falls back to th, then to the plain string). */
export const pickText = (text, lang = 'th') => !text ? '' : typeof text === 'string' ? text : (text[lang] ?? text.th ?? '');
