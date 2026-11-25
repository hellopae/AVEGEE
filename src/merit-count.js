// merit-count.js — FB3-EV9 / FB3-MN2: a merit the soul claimed that does NOT count is marked "(ไม่นับ)" once the player has found that out.
// One rule for every case (hand-written or drawn by chance), read from data the cases already carry:
//   · `fake:true`  - the soul made it up. Found out when `exposed` is set (the "boast" line pressed, mirror / hypnosis, Kan's clue) - and always once the case is closed.
//   · `v:0`        - true, but it is not a merit (it never lowers the sentence). Its own `note` already says so while the case is open; the mark is added once the case is closed.
// Before it is found out nothing is shown (the player must work it out). This file only decides WHETHER to show the mark - it never changes how a verdict is scored
// (game.js deservedOf / the ledger already leave out every `fake` merit and a `v:0` merit adds nothing).
export const meritDoesNotCount = m => !!m && (m.fake === true || Number(m.v) === 0);
/** Show "(ไม่นับ)" on this merit now? `closed` = the case has been judged (the full truth is on the table). */
export const meritNotCountedShown = (m, closed = false) => {
  if (!meritDoesNotCount(m)) return false;
  if (m.fake === true) return !!m.exposed || !!closed;
  return !!closed;   // v:0 but true
};
/** Merits listed in the dossier / queue while a case is open: a made-up one stays on the list after it is exposed (marked), it no longer disappears. */
export const meritsOnDossier = soul => (Array.isArray(soul?.merits) ? soul.merits : []).filter(m => !m.exposed || meritDoesNotCount(m));
