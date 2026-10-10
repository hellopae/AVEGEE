// weapons.js — อาวุธประจำโซน (G3b · 9 ต.ค. 2569)
// ส่วนนี้เป็นฟังก์ชันล้วน ไม่แตะสถานะเกม: ตารางชื่อไฟล์ภาพ · สูตรฟาดปกติเมื่อถืออาวุธ · ผลพิเศษหลังฟาด
// game.js เรียกใช้ตอน battleAct('atk') เท่านั้น — ลูกไฟ/ผนึกน้ำแข็ง/พุ่งชนเพลิง/ท่ายมทูตไม่ผ่านที่นี่
import { WEAPONS, WEAPON_STACK_CAP, WEAPON_EFFECT_COOLDOWN, BATTLE } from './data.js';
import { t } from './i18n.js';

export const WEAPON_IDS = Object.keys(WEAPONS);
export const OUTFIT_IDS = ['th', 'asia', 'west', 'cyberhell'];
export const CRIT_MULT = 1.7;   // ตัวคูณคริเดิมของ battleAct

// ---------- ตารางไฟล์ภาพ (Kittanate/Codex วาดทับชื่อเดิมได้เลย ไม่ต้องแตะโค้ด) ----------
/** สไปรท์ฟัน 8 เฟรม ต่ออาวุธ × ชุดยมบาท — ไม่มีไฟล์ = ใช้ดาบเดิมของชุดนั้นเอง (ดู yama-sword.js) */
export const weaponSpriteSrc = (weapon, outfit) => `img/yama-sword-weapons/hero-yama-${outfit}-sword-${weapon}.webp`;
export const weaponIconSrc = weapon => `img/weapons/weapon-icon-${weapon}.png`;
/** I1-B ข้อ 1 — ไอคอนดาบธรรมดาของยมบาทน้อย (การ์ดแรกใน "อาวุธประจำโซน") · ครอปจาก img/icon-sword.png (ไอคอนดาบโจมตีปกติเดิม) ไม่แตะสี
 *  Kittanate วาดดาบใหม่ทับชื่อไฟล์นี้ได้เลย (512×512 พื้นใส) */
export const baseSwordIconSrc = 'img/weapons/weapon-icon-base.png';
/** I1-B ข้อ 1 — ข้อความพลังโจมตีของดาบธรรมดา คำนวณสดจาก stat จริง (สูตรเดียวกับแผงโปรไฟล์): ฟาดสุ่มช่วง BATTLE.atk หลังคูณเลเวล/ชุด/ฝึก
 *  normalAttackFn = g.normalAttack (ผูกกับสถานะเกม) · ค่าเดียวกันเมื่อ min=max จะแสดงเลขเดียว */
export function baseSwordAttack(normalAttackFn) {
  const lo = normalAttackFn(BATTLE.atk[0]), hi = normalAttackFn(BATTLE.atk[1]);
  return lo === hi ? String(lo) : `${lo}–${hi}`;
}
export const weaponCutsceneSrc = weapon => `img/weapons/weapon-cutscene-${weapon}.jpeg`;
/** รายชื่อไฟล์ทั้งหมดที่ต้องวาด (16 สไปรท์ + 4 ไอคอน + 4 คัตซีน) */
export const WEAPON_ART_FILES = {
  sprites: WEAPON_IDS.flatMap(w => OUTFIT_IDS.map(o => weaponSpriteSrc(w, o))),
  icons: WEAPON_IDS.map(weaponIconSrc),
  cutscenes: WEAPON_IDS.map(weaponCutsceneSrc),
};

// ---------- สูตรฟาดปกติ ----------
/** ฟาดปกติหนึ่งครั้งเมื่อถืออาวุธ (ก่อน rage)
 *  base = normalAttack(สุ่ม [11,19]) · maxBase = normalAttack(19) · r = ค่าสุ่ม [0,1) ตัวเดียวกับที่ใช้ตัดสินคริ
 *  ใช้ r ตัวเดียวกันทั้งแบบมี/ไม่มีอาวุธ — เปรียบเทียบ "ฟาดเดียวกัน" ได้ตรง (จับคู่ seed ในผลจำลอง)
 *  ready = ผลพิเศษพร้อมเกิด (คูลดาวน์หมดแล้ว) — ถ้าไม่พร้อม โบนัสคริเพิ่มไม่ทำงาน แต่โบนัสฟาด +% ยังติดตัว
 *  คืน { dmg, crit, plain, cap, proc } — plain = ฟาดเดียวกันถ้าไม่ถืออาวุธ · cap = เพดานก่อนคูณ rage · proc = คริเพิ่มของอาวุธเกิดจริง (เริ่มคูลดาวน์) */
export function meleeSwing(base, maxBase, r, weaponId, ready = true) {
  const plainCrit = r < BATTLE.crit;
  const plain = plainCrit ? Math.round(base * CRIT_MULT) : base;
  const w = WEAPONS[weaponId];
  if (!w) return { dmg:plain, crit:plainCrit, plain, cap:Infinity, proc:false };
  const crit = r < BATTLE.crit + (w.effect.type === 'crit' && ready ? w.effect.bonus : 0);
  const proc = crit && !plainCrit;
  const boosted = Math.round(base * (1 + w.atk));
  const dmg = crit ? Math.round(boosted * CRIT_MULT) : boosted;
  // เพดานรวม: ฟาดที่แรงที่สุดที่ "ไม่ถืออาวุธ" ทำได้ (ค่าสูงสุด × คริ) × WEAPON_STACK_CAP
  const cap = Math.round(Math.round(maxBase * CRIT_MULT) * WEAPON_STACK_CAP);
  return { dmg:Math.min(dmg, cap), crit, plain, cap, proc };
}

/** เพดานหลังคูณ rage (rage คูณทั้งฟาดและเพดานเท่ากัน) */
export const capWithRage = (cap, rageMult = 1) => Number.isFinite(cap) ? Math.round(cap * rageMult) : cap;

/** ผลพิเศษหลังฟาดโดน — dealt = ดาเมจจริงที่เข้าเป้า (หลัง rage/เพดาน) · rnd = ฟังก์ชันสุ่ม [0,1)
 *  ready = false (คูลดาวน์ยังไม่หมด) → ไม่เกิดผลใด ๆ และไม่สุ่มด้วย (ลำดับสุ่มของศึกไม่เปลี่ยน)
 *  คืน { burn:{turns,dmg}|null, heal:number, replay:number } (ตัวที่ไม่เกี่ยวเป็น null/0) */
export function weaponOnHit(weaponId, { dealt, targetMax, youHp, youMax }, rnd = Math.random, ready = true) {
  const out = { burn:null, heal:0, replay:0 };
  const e = WEAPONS[weaponId]?.effect;
  if (!e || dealt <= 0 || !ready) return out;
  if (e.type === 'burn' && rnd() < e.chance)
    out.burn = { turns:e.turns, dmg:Math.min(e.cap, Math.max(1, Math.round(targetMax * e.pct))) };
  else if (e.type === 'drain')
    out.heal = Math.max(0, Math.min(e.cap, Math.round(dealt * e.pct), youMax - youHp));
  else if (e.type === 'replay' && rnd() < e.chance)
    out.replay = Math.max(1, Math.round(dealt * e.ratio));
  return out;
}

// ---------- ข้อความอธิบายผล (สร้างจากตัวเลขใน data.js — เปลี่ยนสมดุลแล้วข้อความตามเอง) ----------
/** บรรทัดอธิบายอาวุธ: ฟาดปกติ +X% แล้วตามด้วยผลพิเศษ */
export function weaponEffectLines(id) {
  const w = WEAPONS[id]; if (!w) return [];
  const e = w.effect, pct = x => Math.round(x * 100);
  const lines = [t('weapon.effect.atk', { pct:pct(w.atk) })];
  if (e.type === 'burn') lines.push(t('weapon.effect.burn', { chance:pct(e.chance), hp:pct(e.pct), turns:e.turns, cap:e.cap }));
  if (e.type === 'crit') lines.push(t('weapon.effect.crit', { pts:pct(e.bonus) }));
  if (e.type === 'drain') lines.push(t('weapon.effect.drain', { pct:pct(e.pct), cap:e.cap }));
  if (e.type === 'replay') lines.push(t('weapon.effect.replay', { chance:pct(e.chance), ratio:pct(e.ratio) }));
  lines.push(t('weapon.effect.cooldown', { n:WEAPON_EFFECT_COOLDOWN }));
  return lines;
}
/** ข้อความสั้นหลังฟาด (B.weaponNote จาก game.js) */
export function weaponNoteText(note) {
  if (!note) return '';
  return t({ ignite:'battle.weapon.ignite', burn:'battle.weapon.burn', drain:'battle.weapon.drain', replay:'battle.weapon.replay' }[note.k], { n:note.n });
}

/** สถานะคูลดาวน์ผลพิเศษของอาวุธที่ถืออยู่ในศึกนี้ — null = ไม่ได้ถืออาวุธ · cd = เทิร์นที่ยังต้องรอ (0 = พร้อม) */
export const weaponCooldownState = (battle, equippedId) =>
  battle && equippedId && WEAPONS[equippedId] ? { id:equippedId, cd:Math.max(0, battle.weaponCd || 0), max:WEAPON_EFFECT_COOLDOWN } : null;
