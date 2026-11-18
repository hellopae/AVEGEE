// G1 (owner 18-19 Nov, drawings 1-8 in ~/agapae-work/feedback/2026-11-18-owner): zone 1 building sizes / facing and tree + rock placement.
// Everything here is DATA for zone 1 only (town-layout.js applies it through TOWN_ZONE_LAYOUT.th; zones 2-4 keep the old base layout).
// How the numbers were found: each drawing is a screenshot of the real game; scripts/z1-g1-measure.py matches it to the ground picture (SIFT, 330-1600 inliers)
// so every drawn line becomes a world point.  Building factor k = (foot y - top of the owner's frame) / (foot y - top of the visible sprite): the foot stays put, the sprite
// grows or shrinks around it, so doors / feet / paths do not move.  Trees: foot = bottom of the trunk lines, w = crown width of the drawn outline.
// Report: Output/Toby/2026-11-19-avegee-g1.md in the Claudy repo.

// ---- buildings: index of TOWN_HOUSE_SITES -> {k: size factor (1 = same), flip: new facing (true/false) or undefined = same} ----
export const G1_HOUSES = {
  1:{k:1.30},            // drawing 2 right-hand upper house
  2:{k:1.24},            // drawing 2 lower-left house
  4:{k:1.15},            // drawing 2 lower-right house
  5:{k:1.33},            // drawing 1 top-centre house
  6:{k:1.09,flip:false}, // drawing 1 lower-left house: size + the circular arrow (mirror it)
  7:{k:0.91},            // drawing 1 lower-right house (smaller)
  8:{k:1.07},            // drawing 5 small house on the lava stair
  9:{flip:true},         // drawing 4 top house: the circular arrow (mirror it), size already as drawn
};
// stations drawn with a frame: factor on the sprite (mapScale and bw)
export const G1_STATION_K = { tea:0.88, sala:0.88 };

// ---- trees: [id, foot x, foot y, crown width, biome]  (biome city = green banyan, lava = red, ice = snow, heaven = gold-tree placeholder) ----
export const G1_TREES = [
  ['g1-o1-1',1678,1231,184,'city'],  // crop-top
  ['g1-o1-2',2074,1248,170,'city'],  // crop-top
  ['g1-o1-3',1311,1396,113,'city'],  // crop-left
  ['g1-o2-2',2243,718,157,'city'],
  ['g1-o2-3',2364,906,119,'city'],  // est-panel
  ['g1-o2-4',1532,881,141,'city'],
  ['g1-o2-5',1685,825,137,'city'],  // drawn at 1640,825: the crown covered Dam's post by the canteen (1613,698): moved 45 east
  ['g1-o2-6',1464,1081,143,'city'],
  ['g1-o2-7',2248,1087,133,'city'],
  ['g1-o3-1',1515,287,91,'city'],
  ['g1-o3-2',1473,385,86,'city'],
  ['g1-o3-3',1513,477,102,'city'],
  ['g1-o3-4',1595,503,102,'city'],
  ['g1-o3-5',1745,503,103,'city'],  // drawn at 1657,503 = ON the Tarang door point (1667,493): moved 88 east so the door stays open and Yama is not hidden at the door
  ['g1-o3-6',1441,649,100,'city'],
  ['g1-o3-7',1833,361,142,'city'],
  ['g1-o3-8',1903,415,94,'city'],
  ['g1-o3-9',1829,635,101,'city'],
  ['g1-o4-1',467,1626,149,'lava'],
  ['g1-o4-2',738,1663,136,'lava'],
  ['g1-o5-1',207,432,86,'lava'],  // crop-top est
  ['g1-o5-2',285,483,97,'lava'],
  ['g1-o5-3',346,431,80,'lava'],  // crop-top est
  ['g1-o5-4',564,408,86,'lava'],  // crop-top est
  ['g1-o5-5',678,503,120,'lava'],
  ['g1-o5-6',609,851,127,'lava'],
  ['g1-o6-1',3444,415,129,'ice'],
  ['g1-o6-2',3662,407,94,'ice'],  // panel
  ['g1-o6-3',3378,747,155,'ice'],
  ['g1-o6-4',3522,800,131,'ice'],
  ['g1-o6-5',2890,871,138,'city'],
  ['g1-o6-6',3063,813,147,'city'],
  ['g1-o6-7',3092,1001,136,'city'],
  ['g1-o7-1',3168,1128,147,'city'],  // crop-top
  ['g1-o7-2',3272,1165,139,'city'],
  ['g1-o7-4',2934,1586,126,'city'],
  ['g1-o7-5',3011,1577,101,'city'],
  ['g1-o7-6',3622,1444,85,'city'],  // est
  ['g1-o8-1',2339,372,110,'heaven'],
  ['g1-o8-2',2449,293,79,'heaven'],  // est
  ['g1-o8-3',2398,431,107,'heaven'],
  ['g1-o8-4',2649,344,79,'heaven'],  // est
  ['g1-o8-5',2767,406,119,'heaven'],
  ['g1-o8-6',2613,574,136,'heaven'],
];
// existing trees that the drawings move / resize: id -> [x, y, w]
export const G1_TREE_MOVES = {'lava-tree-2': [734, 902, 137], 'tree-11': [3272, 1517, 143]};
// existing trees the owner crossed out (drawing 4)
export const G1_TREE_REMOVED = ['lava-tree-5','lava-tree-6'];
// ---- rocks (drawing 6, small orange circles): [x, foot y, width] ----
export const G1_ROCKS = [
  [3375,774,37],
  [3410,776,42],
  [3548,831,41],
  [3062,842,45],
  [2882,890,33],
  [2907,876,22],
  [2975,874,25],
  [3429,930,45],
  [3471,917,48],
  [3523,907,36],
  [3389,935,22],
  [3410,956,25],
  [3185,1015,43],  // moved off the quarry door pad (door 3232,956)
  [3220,1031,23],
  [3310,1004,45],
  [3341,998,28],
];
