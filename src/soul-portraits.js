import { ALL_CASES } from './cases.js';
import { SEX_OF } from './data.js';

const CASE_BY_KEY = new Map(ALL_CASES.map(c => [c.k, c]));
// Handwritten identities take precedence over their old numbered fallback art.
// In particular A2 is a bandit, not the wealthy man represented by spirit2.
const CASE_ROLES = {
  A1:'cleric', A2:'worker', A3:'officer', A4:'executive', A5:'business',
  A6:'executive', A7:'cleric', A8:'woman', A9:'business', A10:'business',
  A11:'clerk', A12:'woman', A13:'officer', A14:'business', A15:'executive',
  A16:'clerk', A17:'business', A18:'business', A19:'executive', A20:'business',
  pol:'officer', gen:'officer', nun:'woman', recruit:'officer', star:'worker',
  lord:'business', girl:'girl', boy:'boy', deva:'worker', nurse:'woman', monk:'cleric',
  orchard:'woman', trader:'executive', sister:'clerk', novice:'woman', inspector:'officer',
  hunter:'business', gadget:'business', sergeant:'officer', accountant:'executive',
  scapegoat:'worker', hammer:'woman', prophet:'cleric', healer:'worker', heir:'executive',
};

export function soulIdentity(soul) {
  const key = soul?.case || soul?.caseK;
  const named = CASE_BY_KEY.get(key);
  return { named, key, sex:named?.sex || soul?.sex || SEX_OF[soul?.who] || 'm',
    description:[named?.name || soul?.name, named?.who || soul?.who].filter(Boolean).join(' ') };
}

export function soulArchetype(soul) {
  const { key, sex, description } = soulIdentity(soul);
  const girl = sex === 'g', boy = sex === 'b';
  if (girl) return 'girl';
  if (boy) return 'boy';
  const female = sex === 'f';
  if (female) {
    // Age words describing a parent/patient do not age the caregiver herself.
    const ownAge = description.replace(/(?:บิดา|มารดา|ผู้ป่วย)(?:ชรา|วัยเกษียณ|สูงวัย|สูงอายุ)/g, '');
    if (/ชรา|เกษียณ|สูงวัย|สูงอายุ|elderly/i.test(ownAge)) return 'elder-woman';
    // An adult merchant/manager must never inherit the male business image.
    if (CASE_ROLES[key]) return ['woman','clerk'].includes(CASE_ROLES[key]) ? CASE_ROLES[key] : 'woman';
    if (/นักเรียน|เด็กหญิง|schoolgirl/i.test(description)) return 'girl';
    if (/สาว|นักศึกษา|เลขา|พนักงาน|ออนไลน์|clerk|student/i.test(description) &&
        !/ชรา|เกษียณ|สูงวัย|สูงอายุ|elderly/i.test(description)) return 'clerk';
    return 'woman';
  }
  if (CASE_ROLES[key]) return CASE_ROLES[key];
  if (/นักเรียน|เด็กชาย|schoolboy/i.test(description)) return 'boy';
  if (sex === 'monk' || /พระ|เจ้าอาวาส|ศิษย์วัด|ลัทธิ|นักบวช|priest|monk/i.test(description)) return 'cleric';
  if (/ตำรวจ|ทหาร|ข้าราชการ|ขุนนาง|เจ้าหน้าที่|ตรวจสอบ|officer|soldier/i.test(description)) return 'officer';
  // Business is a visual profession/body archetype, never a verdict or guilt
  // marker. Young investors retain a younger executive appearance.
  if (/เจ้าของกิจการ|นายหน้าที่ดิน|เจ้าของที่ดิน|เจ้าของบริษัท|พ่อค้า|ประธานบริษัท|เจ้าของกลุ่มธุรกิจ|businessman|merchant/i.test(description))
    return /หนุ่ม|นักศึกษา|เพิ่งจบ|young|student/i.test(description) ? 'executive' : 'business';
  if (/ผู้บริหาร|นักลงทุน|บัญชี|นายหน้า|พนักงานออฟฟิศ|นักวิจัย|ศาสตราจารย์|executive|accountant/i.test(description)) return 'executive';
  return 'worker';
}

export function soulPortrait(soul, zone = 'th') {
  // All four branches resolve the semantic key through their own art aliases.
  // Keeping old numeric or soul-* keys would reintroduce the original mismatch
  // after Thai restyling (e.g. spirit4 now denotes a male officer).
  return `spirit-${soulArchetype(soul)}`;
}

export function applySoulPortrait(soul, zone = 'th') {
  if (!soul) return soul;
  soul.sex = soulIdentity(soul).sex;
  soul.sp = soulPortrait(soul, zone);
  return soul;
}

/** Reconcile old saves once, including souls outside the visible queue. */
export function reconcileSoulPortraits(game) {
  const seen = new WeakSet();
  const apply = (soul, zone) => {
    if (!soul || typeof soul !== 'object' || seen.has(soul)) return;
    seen.add(soul); applySoulPortrait(soul, zone);
  };
  const branch = (state, zone) => {
    (state.queue || []).forEach(s => apply(s, zone));
    (state.held || []).forEach(s => apply(s, zone));
    (state.stations || []).forEach(st => (st.slots || []).forEach(slot => apply(slot.soul, zone)));
  };
  branch(game, game.zone || 'th');
  Object.entries(game.zoneSave || {}).forEach(([zone, state]) => branch(state, zone));
  (game.sentences || []).forEach(entry => apply(entry.soul, entry.zone || game.zone));
  (game.closed || []).forEach(entry => apply(entry.soul, entry.zone || game.zone));
  (game.afterlifeWalks || []).forEach(entry => apply(entry.soul, entry.zone || game.zone));
  (game.returning || []).forEach(entry => apply(entry, entry.zone || game.zone));
}
