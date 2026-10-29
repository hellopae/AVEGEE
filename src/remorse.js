// remorse.js — ความสำนึกของวิญญาณ (P4 · คุณเป้ 23 ต.ค. 2569 D1: คำนวณตายตัว ไม่สุ่ม)
// คำนวณครั้งเดียวตอนจบทัณฑ์ (game.js finish) เก็บใน entry.remorse = { total, parts:{keeper,intensity,trait}, detail }
// น้ำหนักทุกตัวอยู่ที่ data.js REMORSE · ใช้เฉพาะข้อมูลที่เกมมีอยู่แล้ว (สีนิสัยวิญญาณ, ผู้คุมที่เหมาะกับสี, ความพอดีของทัณฑ์, ความตรงสถานี)
import { REMORSE } from './data.js';
import { spiritTrait, traitForKeeper } from './interrogation.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round1 = v => Math.round(v * 10) / 10;

/** ผู้คุมนี้เหมาะกับสีนิสัยของวิญญาณไหม: 'match' | 'mismatch' | 'neutral' (ทัณฑ์/ดำ ไม่ผูกกับสี) */
export function keeperFitOf(keeperK, traitKey) {
  const tied = traitForKeeper(keeperK);
  return !tied ? 'neutral' : tied.key === traitKey ? 'match' : 'mismatch';
}

/**
 * @param {{soul:object, keeperK:string|null, intensity:number, verdict:{tham?:number}}} a
 * @returns {{total:number, parts:{keeper:number,intensity:number,trait:number}, detail:object}}
 */
export function calcRemorse({ soul, keeperK, intensity, verdict }) {
  const W = REMORSE.weights;
  const traitKey = spiritTrait(soul).key;
  const deserved = soul?.deserved ?? 0;
  const short = Math.max(0, deserved - intensity), over = Math.max(0, intensity - deserved);
  const keeperFit = keeperFitOf(keeperK, traitKey);
  const stationFit = clamp((Number.isFinite(verdict?.tham) ? verdict.tham : 0) / 100, 0, 1);
  const keeper = W.keeper * (REMORSE.keeperFit[keeperFit] * (1 - REMORSE.stationShare) + stationFit * REMORSE.stationShare);
  const inten = W.intensity * clamp(1 - short * REMORSE.shortPenalty - over * REMORSE.overPenalty, 0, 1);
  const trait = W.trait * (REMORSE.trait[traitKey] ?? REMORSE.trait.accepting);
  const parts = { keeper: round1(keeper), intensity: round1(inten), trait: round1(trait) };
  return { total: clamp(Math.round(keeper + inten + trait + (soul?.remorseBonus || 0)), 0, 100), parts,
    detail: { traitKey, keeperFit, stationFit, short, over } };
}

/** ตัวเลขรวมของ entry — เซฟเก่าที่ไม่มี remorse → undefined (ผู้เรียกใช้การสุ่มแบบเดิมต่อไป) */
export const remorseOf = entry => {
  const r = entry?.remorse;
  return Number.isFinite(r) ? r : Number.isFinite(r?.total) ? r.total : undefined;
};
export const isRepentant = total => total >= REMORSE.pass;
