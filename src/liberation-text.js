// FB3-L2 / FB3-L3 (owner 26 Nov): the words of the forced team at the gate of a seized zone. PLACEHOLDER wording from Toby - Rae writes the real text (round R2).
// Keys: `team.*` = the team page of the Guard duel and of the lord's fight in Zones 1-3 (seized world, walk back); each has Thai and English.
const L = (th, en) => ({ th, en });
export const LIB_TEXT = Object.freeze({
  'team.forcedHead':L('ทีมบังคับ', 'Fixed team'),
  'team.duel':L('ที่ประตู ไปได้แค่ ยามา กับ นิรา', 'At the gate only Yama and Nira can go'),
  'team.lord':L('ยามา · นิรา · {guard} (ที่เพิ่งปลดสะกด)', 'Yama · Nira · {guard} (just freed)'),
  'team.lockedReason':L('ถูกสะกดอยู่ เข้าทีมไม่ได้', 'Under the spell - cannot join'),
  'team.lockedAll':L('ยมทูตทุกคนในเมืองถูกสะกดอยู่ จึงเข้าทีมไม่ได้', 'Every reaper in the city is under the spell and cannot join'),
});
export function lib(key, vars = null, lang = 'th') {
  const row = LIB_TEXT[key]; if (!row) return key;
  const out = row[lang] ?? row.th;
  return vars ? out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : out;
}
