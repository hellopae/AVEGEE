// FB3-T10 / O3 (owner 21 and 26 Nov): where the open air of each room picture is - the only places the room's weather may be drawn (cloud shadows, falling leaves, lava glints, light shafts,
// snow, rain). Data, not code: every point is [u, v] in 0..1 of the FULL room picture (before any `room.crop`), so one table serves every screen size and crop.
//   floor   = the open floor / plaza / deck (cloud shadows and light fall on it) - null for a room whose floor is indoors
//   outside = the view past the terrace: sky and mountains at the top, the cliff / lava below the railing, the sides (lava glints, falling snow / rain / leaves)
//   lava    = where the glints of the lava may show (default: `outside`). Wide rooms only use the drop beyond the side railings.
//   leaves  = [x0, y0, x1, y1] boxes along the terrace edge where leaves blow in (Zone 1)
// Buildings, roofs and indoors are in none of them, so nothing falls through a roof. A picture not found here gets no weather (never a guess).
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

/** The wide terrace rooms (krata, dab, lokan, ngiw, lan, sawan, tarang, sala, krajok): building across the back, open floor in the middle, railing and the drop in front. */
const WIDE = Object.freeze({
  floor: [[.13, .53], [.87, .53], [.92, .77], [.08, .77]],
  // The top and side edges cross different roofs and walls in this series. Weather stays on the terrace.
  outside: [],
  lava: [rect(0, .93, .19, 1), rect(.81, .93, 1, 1)],
  leaves: [[0, .45, .12, .95], [.88, .45, 1, .95], [.2, .78, .8, .92]],
});
/** The tea house deck (the picture the room crops into). */
const TEA = Object.freeze({
  floor: [[.07, .47], [.45, .42], [.93, .52], [.93, .80], [.50, .92], [.07, .78]],
  outside: [[[0, 0], [.55, 0], [.35, .14], [0, .30]], rect(0, .30, .04, 1), rect(0, .93, 1, 1)],
  lava: [rect(0, .30, .04, 1), rect(0, .93, 1, 1)],
  leaves: [[0, .4, .15, .95], [.7, .6, 1, .95]],
});
/** The canteen terrace (one picture for Zone 1, another for the rest). */
const CANTEEN = Object.freeze({
  floor: [[.14, .50], [.46, .40], [.80, .58], [.80, .82], [.45, .92], [.14, .70]],
  outside: [[[0, 0], [.50, 0], [.32, .14], [0, .32]], [[0, .32], [.08, .50], [.10, 1], [0, 1]]],
  lava: [[[0, .32], [.08, .50], [.10, 1], [0, 1]]],
  leaves: [[0, .3, .2, .95], [.7, .6, 1, .95]],
});
/** Per-picture corrections (file stem -> areas); everything else falls back on its family above. */
const OVERRIDES = Object.freeze({
  // Zone 3's tea house is a closed log hall with a fireplace: only the window at the top-left looks outside, the floor is indoors - no snow on it
  'tea-west-recovery': Object.freeze({ floor:null, outside:[[[0, 0], [.18, 0], [.10, .15], [0, .21]]], lava:[], leaves:[] }),
});

/** The file stem of a room picture: 'img/rooms-wide/th-krata-v2.webp?v=3' -> 'th-krata-v2'. */
export const roomPictureStem = src => String(src || '').split('?')[0].split('/').pop().replace(/\.\w+$/, '');
const FAMILY = [[/^(th|asia|west|cyberhell)-(krata|dab|lokan|ngiw|lan|sawan|tarang|sala|krajok)(-|$)/, WIDE], [/^tea-/, TEA], [/^interior(-th)?$/, CANTEEN]];
/** The open areas of a room picture, or null (no weather). */
export function openAreasOf(bgSrc) {
  const stem = roomPictureStem(bgSrc);
  if (OVERRIDES[stem]) return OVERRIDES[stem];
  const hit = FAMILY.find(([re]) => re.test(stem));
  return hit ? hit[1] : null;
}
export const ROOM_AREA_FAMILIES = Object.freeze({ WIDE, TEA, CANTEEN });
