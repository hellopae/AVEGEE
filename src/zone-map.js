// ตำแหน่งบนภาพ img/zone-world-map.webp (ร้อยละของความกว้าง/สูง)
export const ZONE_MAP = {
  th:        { marker:[18, 72], gate:[38.3, 65] },
  asia:      { marker:[33, 17], gate:[23.3, 31.8] },
  west:      { marker:[78, 72], gate:[65.8, 70] },
  cyberhell: { marker:[80, 18], gate:[74, 36] },
};

// ทางเดินข้ามสะพานที่มองเห็นในภาพ; ย้อนเส้นทางเดิมได้เมื่อกลับสาขา
const BRIDGES = [
  ['th', 'asia', [[38.3,65],[38,64],[35,61],[32,59],[28,56],[24,53],[22,47],[21,43],[20.5,39],[22,36],[23.3,31.8]]],
  ['th', 'west', [[38.3,65],[42,69.5],[46,72.5],[49,72.5],[52,72],[55,72.5],[59,72],[62,71.5],[65.8,70]]],
  ['asia', 'cyberhell', [[23.3,31.8],[27,31],[30,31],[33,33],[37,34],[41,34],[44,33],[46.5,31],[48,34.5],[51,34.5],[55,34.5],[59,32.5],[62,30],[65,31.5],[70,34.5],[74,36]]],
  ['west', 'cyberhell', [[65.8,70],[68,68],[70,64],[72,58],[72,53],[73,49],[74,45],[74,40],[74,36]]],
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
