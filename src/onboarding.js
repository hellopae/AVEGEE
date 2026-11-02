// Existing saves with decisions or later zones keep their established flow.
export const firstCourtJob = g => g.taught?.includes('court-onboarding') && g.zone === 'th' && !g.casesDone && !(g.ledger || []).length;
export const needsFirstDestination = g => firstCourtJob(g) && !g.stations.some(s => s.def.k === 'krata' && !s.build && !s.repair && !s.fire);
export const COURT_FIRST_STEPS = 'กด “เปิดศาล” เพื่อรับวิญญาณ รอเรือส่งวิญญาณมาถึง แล้วกด “พิจารณาคดี” เพื่อเข้าสู่หน้าสอบสวน ก่อนสอบสวนครั้งแรก ให้เดินขึ้นไปสร้างกระทะทองแดงด้านบน เพื่อให้มีสถานที่รับวิญญาณหลังออกหมาย';

export function beginCourtOnboarding(g) {
 if(g.taught.includes('court-onboarding'))return false;
 // Called only for an explicitly chosen New Game, never when restoring a save.
 g.stations=g.stations.filter(s=>s.def.k!=='krata');
 g.taught.push('court-onboarding');g.syncBlocks(true);g.save();return true;
}
