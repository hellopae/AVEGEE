// Q6 occlusion pieces for 'th:asia' = img/frontier-route/zone1-2-v6.webp (3344 x 1882).
// polygon = silhouette of the painted structure in source pixels, traced by scripts/q6-trace-occluder.py
// (colour segmentation of the art, never hand-redrawn). baseline = y of the structure's foot on the floor:
// an actor whose feet are above (smaller y than) the baseline stands behind the piece and is covered by it.
// Only structures whose roof/body overlaps the walk mask need a piece. Checked 2026-10-31: the two golden
// towers are the only ones (the twin arches stand beyond the floor edge, no tree canopy overlaps the floor).
// To replace a piece: edit its polygon/baseline here. Never edit the map image or the walk mask.
export default Object.freeze({
  routeId:'th:asia', size:[3344,1882],
  pieces:Object.freeze([
    Object.freeze({id:'tower-west', baseline:825, polygon:[
      [2189,698],[2193,708],[2186,717],[2182,718],[2189,728],[2185,732],[2178,730],[2180,741],[2184,745],
      [2178,751],[2172,745],[2172,752],[2163,756],[2151,744],[2146,751],[2141,748],[2142,764],[2149,771],
      [2149,787],[2141,792],[2141,823],[2237,824],[2239,822],[2234,816],[2236,802],[2226,795],[2226,773],
      [2240,760],[2246,751],[2242,745],[2234,746],[2229,754],[2226,753],[2220,756],[2210,746],[2215,738],
      [2212,733],[2200,725],[2205,720],[2205,716],[2199,711],[2197,704],[2200,701],[2197,698]
    ]}),
    Object.freeze({id:'tower-east', baseline:985, polygon:[
      [2576,859],[2573,863],[2571,880],[2564,883],[2567,887],[2563,891],[2564,895],[2561,898],[2553,895],
      [2558,905],[2555,909],[2541,910],[2534,894],[2530,895],[2531,897],[2527,902],[2517,892],[2515,894],
      [2518,912],[2525,919],[2525,937],[2522,940],[2515,940],[2513,944],[2514,984],[2607,983],[2608,979],
      [2604,972],[2604,962],[2607,955],[2597,948],[2601,942],[2598,939],[2598,924],[2609,917],[2612,912],
      [2613,902],[2609,900],[2608,904],[2602,909],[2594,910],[2585,900],[2591,891],[2581,881],[2580,869]
    ]}),
  ]),
});
