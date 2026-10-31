// Visual sizes only. Navigation radii, combat stats and authored feet stay unchanged.
export const CHARACTER_SCALE = Object.freeze({yama:.80, adult:1, nira:.95, guard:1.25, worker:1});
export function characterScale(key='adult') {
  const kind=key.replace(/^.*:/,'').replace(/^crew-/,'');
  return CHARACTER_SCALE[kind] ?? CHARACTER_SCALE.adult;
}
// Multipliers relative to each renderer's town-sized adult reference.
export const ROUTE_CHARACTER_SCALE = Object.freeze({'th:asia':.80,'asia:west':.80,'west:cyberhell':.75});
export const routeCharacterScale = route => ROUTE_CHARACTER_SCALE[route] ?? .80;
export const mapActorHeight = (key, adultHeight=82) => adultHeight*characterScale(key);
/** Q3: คนงานบนแผนที่ต้องสูง (ที่ตามองเห็น) เท่ายามา — ภาพคนงานเต็มช่อง ~95% ของความสูงช่อง (วัดจาก alpha ของ sheet ทั้ง 4 โซน)
 *  ส่วนยามาถูก fit ให้ความสูงที่เห็น = ความสูงที่วาดพอดี · CHARACTER_SCALE.worker ไม่แตะ (ใช้ลำดับขนาดของทีม/ห้อง) */
export const WORKER_MAP_FILL = .95;
export const mapWorkerHeight = (adultHeight=82) => mapActorHeight('yama', adultHeight)/WORKER_MAP_FILL;

/** One uniform fit preserves hierarchy and the existing perspective formation's envelope.
 * The previous largest companion was .96 of the hero reference. Never enlarge that
 * footprint: shrinking to the horizontal slot gap would make phone parties unreadable.
 */
export function fitAllySizes(referenceHeight, actors, slots, bounds) {
  const sizes=actors.map((a,i)=>{
    const h=referenceHeight*characterScale(a.key)*slots[i].scale/a.box.h;
    return {h,w:h*a.aspect};
  });
  let fit=Math.min(1,...actors.map(a=>.96/characterScale(a.key)));
  sizes.forEach((s,i)=>{
    const box=actors[i].box,slot=slots[i];
    fit=Math.min(fit,(slot.y-bounds.height*.08)/(box.h*s.h),(bounds.width-slot.x-4)/(box.w*s.w));
  });
  fit=Math.max(.01,Math.min(1,fit));
  return sizes.map(s=>({h:s.h*fit,w:s.w*fit}));
}
