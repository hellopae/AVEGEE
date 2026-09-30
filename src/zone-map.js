// ตำแหน่งบนภาพ img/zone-world-map.webp (ร้อยละของความกว้าง/สูง)
export const ZONE_MAP = {
  th:        { marker:[18, 72], gate:[29, 55] },
  asia:      { marker:[33, 17], gate:[33, 32] },
  west:      { marker:[78, 72], gate:[68, 65] },
  cyberhell: { marker:[80, 18], gate:[68, 31] },
};

// ทางเดินข้ามสะพานที่มองเห็นในภาพ; ย้อนเส้นทางเดิมได้เมื่อกลับสาขา
const BRIDGES = [
  ['th', 'asia',      [[29,55],[28,46],[25,39],[29,32],[33,32]]],
  ['th', 'west',      [[29,55],[37,55],[43,61],[49,69],[57,69],[63,66],[68,65]]],
  ['asia', 'cyberhell', [[33,32],[41,28],[49,30],[55,32],[62,31],[68,31]]],
  ['west', 'cyberhell', [[68,65],[70,57],[67,49],[61,42],[61,35],[68,31]]],
];

export function zoneMapRoute(from, to) {
  if (!ZONE_MAP[from] || !ZONE_MAP[to]) return [];
  if (from === to) return [ZONE_MAP[from].gate];
  const queue = [[from, []]], seen = new Set([from]);
  while (queue.length) {
    const [zone, legs] = queue.shift();
    for (const [a, b, points] of BRIDGES) {
      if (zone !== a && zone !== b) continue;
      const next = zone === a ? b : a;
      if (seen.has(next)) continue;
      const leg = zone === a ? points : [...points].reverse();
      const route = [...legs, leg];
      if (next === to) return route.flatMap((part, i) => i ? part.slice(1) : part);
      seen.add(next); queue.push([next, route]);
    }
  }
  return [];
}
