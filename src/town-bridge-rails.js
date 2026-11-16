// F13 (owner 15 Nov): the fences / parapets of the bridges were walkable ("Yama stands on the rail", b1.png).  The rails are painted into
// the ground picture, so the walk mask (8-unit cells) could not tell the deck from its rails.  Each bridge here is a narrow corridor:
// inside `rect` (the span of the bridge, landings NOT included) only points within `hw` world units of the deck's centre line `path`
// are floor (whatever the generated mask says: its 8-unit cells could not follow a 14-unit deck); the rails, the beam under the deck and the
// air beside it are not.  The bridge rects never include the landings, so the mask still decides everywhere else.  Coordinates: world units (3840 x 2560).
// Measured on the active ground of each zone (zone 1 v7r, zone 2/3 v8, zone 4 v7) with scripts/bridge-rail-overlay.py.
export const BRIDGE_RAILS = {
  th: [
    // A ice gate arch (owner b1)
    { rect:[2912, 380, 3088, 470], path:[[2904,419],[2912,418],[2931,413],[2966,409],[3000,407],[3034,408],[3069,412],[3084,415],[3096,417]], hw:10 },
  ],
  asia: [
    // A upper-right red arch
    { rect:[2855, 370, 3094, 470], path:[[2846,438],[2860,432],[2880,420],[2900,416],[2920,409],[2940,408],[2960,405],[2980,404],[3000,408],[3020,408],[3040,408],[3060,415],[3080,423],[3100,430]], hw:9 },
    // B upper-left red diag
    { rect:[842, 590, 1022, 670], path:[[838,612],[850,614],[910,624],[990,640],[1020,648],[1032,652]], hw:8 },
    // C left-mid red diag
    { rect:[822, 925, 1006, 1005], path:[[816,949],[822,950],[850,954],[900,964],[950,974],[990,982],[1008,986]], hw:8 },
    // D right-mid red arch
    { rect:[2402, 940, 2548, 1015], path:[[2396,987],[2400,986],[2446,983],[2497,984],[2548,990],[2556,992]], hw:8 },
    // E lower-right red diag
    { rect:[3142, 1525, 3335, 1608], path:[[3136,1586],[3143,1584],[3176,1576],[3240,1565],[3304,1560],[3326,1558],[3340,1556]], hw:8 },
  ],
  west: [
    // A upper-right stone arch, iron railing
    { rect:[2870, 360, 3088, 470], path:[[2866,432],[2870,431],[2895,421],[2916,413],[2950,407],[3000,404],[3050,408],[3070,413],[3085,420],[3096,425]], hw:7 },
    // B upper-left stone diag, iron railing
    { rect:[850, 580, 1020, 670], path:[[845,614],[860,614],[890,615],[950,625],[990,634],[1020,642],[1028,644]], hw:7 },
  ],
  cyberhell: [
    // A upper-right brass arch
    { rect:[2906, 380, 3086, 470], path:[[2900,428],[2908,427],[2930,418],[2965,413],[3000,412],[3040,414],[3070,418],[3083,424],[3092,428]], hw:7 },
    // B upper-left brass diag
    { rect:[850, 580, 1020, 670], path:[[845,610],[850,611],[910,622],[970,633],[1020,645],[1028,647]], hw:8 },
    // C left-mid brass diag
    { rect:[824, 925, 986, 1000], path:[[822,948],[850,952],[900,960],[950,966],[985,972],[1000,975]], hw:8 },
    // D right-mid plank
    { rect:[2412, 965, 2550, 1025], path:[[2408,997],[2420,996],[2463,998],[2514,1001],[2548,1005],[2556,1006]], hw:8 },
    // E lower-right plank
    { rect:[3135, 1520, 3330, 1610], path:[[3130,1586],[3165,1580],[3218,1573],[3283,1567],[3315,1566],[3332,1565]], hw:8 },
  ],
};
const segDist2 = (x, y, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l)) : 0;
  const px = a[0] + t * dx - x, py = a[1] + t * dy - y;
  return px * px + py * py;
};
/** Inside the rect of a bridge: 1 = on the deck strip (always floor), 0 = rail / beam / air (never floor).  -1 = not on any bridge: the zone's mask decides. */
export function bridgeSurface(zone, x, y, table = BRIDGE_RAILS) {
  const list = table[zone];
  if (!list) return -1;
  for (const b of list) {
    const r = b.rect;
    if (x < r[0] || x > r[2] || y < r[1] || y > r[3]) continue;
    let best = Infinity;
    for (let i = 1; i < b.path.length; i++) best = Math.min(best, segDist2(x, y, b.path[i - 1], b.path[i]));
    return best > b.hw * b.hw ? 0 : 1;
  }
  return -1;
}
/** true = this point is a rail / beam / air of a bridge of `zone`, i.e. must not be floor. */
export const onBridgeRail = (zone, x, y, table = BRIDGE_RAILS) => bridgeSurface(zone, x, y, table) === 0;
