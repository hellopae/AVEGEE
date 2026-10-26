// M2 — ZONE SKIN: which painted town art / light rules a zone uses.  No imports (data.js, art, scene and every town-*
// module read this file; it must stay at the bottom of the import graph).
//
// Zone 1 ('th') is the reference skin and is always on.  Zones 2-4 ('asia' / 'west' / 'cyberhell') keep their OLD map
// system (one 1678x937 picture, walk mask read from colours) until their skin is switched on.  Switching a zone on
// is data only:
//   1. put the art files in place (names below, see PLANNED_ART and `terrain`)
//   2. list the finished role groups in that zone's `use` (e.g. ['judgment','houses','trees','lamp','torch','rock'])
//      — a role that is not listed falls back to the zone-1 sprite, so a half-finished skin still plays
//   3. set `enabled: true`
// Nothing in the engine mentions a zone name any more: isTownZone(), the terrain chunk loader, the flow map, the
// scenery / shade / light code and syncSceneZone() all read the active skin from here.
export const TOWN_SKIN_ZONES = Object.freeze(['th', 'asia', 'west', 'cyberhell']);

// ---- role keys stay the historical ones ('town-tree-th' = "the main tree", whatever the zone) so every call
//      site and test keeps working; only the file each key resolves to changes per zone. ----
const ZONE1_ART = Object.freeze({
  'town-judgment-th':        'img/theme-v4/town-judgment-th-v2.webp',
  'town-tree-th':            'img/theme-v4/town-tree-th-v1.webp',
  'town-tree-red-th':        'img/theme-v4/town-tree-red-th-v1.webp',
  'town-tree-snow-th':       'img/theme-v4/town-tree-snow-th-v1.webp',
  'town-prop-palm':          'img/theme-v4/town-palm-th-v1.webp',
  'town-prop-lamp-gold':     'img/theme-v4/town-lamp-gold-th-v1.webp',
  'town-prop-rock':          'img/map-zone1/prop-rock-v1.webp',
  'town-prop-torch-pillar':  'img/map-zone1/torch-pillar-v1.webp',
  'town-residence-front-one':'img/town-district/house-front-one-v1.webp',
  'town-residence-right-one':'img/town-district/house-right-one-v1.webp',
  'town-residence-left-two': 'img/town-district/house-left-two-v1.webp',
  'town-residence-right-two':'img/town-district/house-right-two-v1.webp',
});

// Z2: change any filename on one row when the replacement art arrives. Coordinates live in town-layout.js.
export const ASIA_TOWN_SPRITES = {
  stations: {
    sala:'img/map-v5/st-sala-asia-v3.webp',
    tea:'img/theme-v4/st-tea-asia-v3.webp',
    sawan:'img/map-v5/st-sawan-asia-v3.webp',
    krajok:'img/map-v5/st-krajok-asia-v3.webp',
  },
  judgment: {'town-judgment-th':'img/theme-v4/town-judgment-asia-v3.webp'},
  houses: {
    'town-residence-front-one':'img/town-district/house-front-one-asia-v3.webp',
    'town-residence-right-one':'img/town-district/house-right-one-asia-v3.webp',
    'town-residence-left-two':'img/town-district/house-left-two-asia-v3.webp',
    'town-residence-right-two':'img/town-district/house-right-two-asia-v3.webp',
  },
  trees: {
    'town-tree-th':'img/theme-v4/town-tree-asia-v1.webp',
    'town-tree-red-th':'img/theme-v4/town-tree-b-asia-v1.webp',
    'town-tree-snow-th':'img/theme-v4/town-tree-c-west-v1.webp',
    'town-prop-palm':'img/theme-v4/town-landmark-asia-v1.webp',
    'town-tree-sakura':'img/theme-v4/town-tree-sakura-asia-v1.webp',
    'town-tree-willow':'img/theme-v4/town-tree-willow-asia-v1.webp',
  },
  lamp: {'town-prop-lamp-gold':'img/theme-v4/town-lamp-asia-v3.webp'},
  torch: {'town-prop-torch-pillar':'img/map-zone2/torch-pillar-v3.webp'},
};

/** File naming convention for a zone's sprites (Mind's art spec, M1).  k = asia | west | cyberhell, folder = map-zone2/3/4. */
export const PLANNED_ART = (k, folder) => Object.freeze({
  judgment: { 'town-judgment-th':        `img/theme-v4/town-judgment-${k}-v2.webp` },
  houses:   { 'town-residence-front-one':`img/town-district/house-front-one-${k}-v1.webp`,
              'town-residence-right-one':`img/town-district/house-right-one-${k}-v1.webp`,
              'town-residence-left-two': `img/town-district/house-left-two-${k}-v1.webp`,
              'town-residence-right-two':`img/town-district/house-right-two-${k}-v1.webp` },
  trees:    { 'town-tree-th':            `img/theme-v4/town-tree-${k}-v1.webp`,      // main tree (Zone 1: green)
              'town-tree-red-th':        `img/theme-v4/town-tree-b-${k}-v1.webp`,    // beside the lava (Zone 1: red)
              'town-tree-snow-th':       `img/theme-v4/town-tree-c-${k}-v1.webp`,    // cold side (Zone 1: snow)
              'town-prop-palm':          `img/theme-v4/town-landmark-${k}-v1.webp` },// landmark tree (Zone 1: palm)
  lamp:     { 'town-prop-lamp-gold':     `img/theme-v4/town-lamp-${k}-v1.webp` },
  torch:    { 'town-prop-torch-pillar':  `img/${folder}/torch-pillar-v1.webp` },
  rock:     { 'town-prop-rock':          `img/${folder}/prop-rock-v1.webp` },
  ...(k==='asia'?Object.fromEntries(Object.entries(ASIA_TOWN_SPRITES).filter(([group])=>group!=='stations')):{}),
});

const FLAME_FIRE = 'img/fx/fx-fire-flame-{k}.webp';            // frames a, b, c
const FACADE_SIZES = Object.freeze({ sala:[280,330], tea:[260,270], sawan:[260,300], krajok:[280,340] });
const ZONE1_FACADES = Object.freeze(Object.fromEntries(Object.keys(FACADE_SIZES).map(k => [k, `img/map-v5/st-${k}-th-v2.webp`])));

// Light sources.  `fire` is the original reader (hot orange/red = fire).  A `hue` source marks bright, saturated pixels
// of that hue range as glowing (Mind M1 spec section 6).  `color` is the glow tint, rgb 0-255.
const FIRE = Object.freeze({ type:'fire' });
const ICE = Object.freeze({ type:'hue', hue:[185,210], vMin:.85, sMin:.8, color:[127,216,255] });         // #7FD8FF  zone 3 ice
const CYAN = Object.freeze({ type:'hue', hue:[175,195], vMin:.85, sMin:.8, color:[53,232,255] });         // #35E8FF  zone 4 energy / pylon flame
const VIOLET = Object.freeze({ type:'hue', hue:[265,285], vMin:.85, sMin:.8, color:[164,104,255] });      // #A468FF  zone 4 crystal

const terrain = (folder, name) => ({
  dir:`img/${folder}/v1/`, preview:`img/${folder}/v1/${name}-terrain-v1-preview.webp`,
  fullPx:{ w:4915, h:3277 }, chunk:1024, repairs:false,
});

/** The table.  Edit data here; never branch on a zone name elsewhere. */
export const ZONE_SKIN = {
  th: {
    enabled: true,
    terrain: { dir:'img/map-zone1/v5/', preview:'img/map-zone1/v5/zone1-terrain-v5-preview.webp',
               fullPx:{ w:4915, h:3277 }, chunk:1024, repairs:true },
    flowUrl: 'img/map-zone1/v4/flow-v4.png',
    use: ['judgment','houses','trees','lamp','torch','rock'],
    art: { ...ZONE1_ART },
    stations: { suffix:'th', facade:{ ...ZONE1_FACADES }, facadeSizes:{ ...FACADE_SIZES } },
    stationFlip: null,                 // null = STATION_FLIP[zone] of data.js
    treeTint: true, treeTintAuto: false,   // the shared green tree is baked darker (town-scenery TREE_TINT)
    light: { emit:[FIRE], flame:FLAME_FIRE },
  },
  asia: {
    enabled: true,
    // M3b: Q5 repaired ground; never apply Zone 1's terrain repairs or flow to this art.
    terrain: terrain('map-zone2', 'zone2'),
    flowUrl: null, // Optional effects wait for a profile traced against the new water/lava.
    use: ['judgment','houses','trees','lamp','torch','rock'],
    // Own Asia tree sprites disable TREE_TINT through finalize().
    stations: { suffix:'asia', facade:{...ASIA_TOWN_SPRITES.stations}, facadeSizes:{ ...FACADE_SIZES } },
    stationFlip: null,
    light: { emit:[FIRE], flame:FLAME_FIRE },
  },
  west: {
    enabled: true,
    terrain: terrain('map-zone3', 'zone3'),
    flowUrl: null,
    use: ['judgment','houses','trees','lamp','torch','rock'],
    stations: { suffix:'west', facade:{
      sala:'img/map-v5/st-sala-west-v2.webp',
      tea:'img/theme-v4/st-tea-west-v2.webp',
      sawan:'img/map-v5/st-sawan-west-v2.webp',
      krajok:'img/map-v5/st-krajok-west-v2.webp',
    }, facadeSizes:{ ...FACADE_SIZES } },
    stationFlip: null,
    // Mind M1 section 6: ice / glacier glows pale blue; real fire (braziers, torches) stays warm orange.
    light: { emit:[FIRE, ICE], flame:FLAME_FIRE,
             night:{ tint:'#16254F', highlight:'#9CC8FF' } },   // data only: no grade formula yet (needs Mind's multipliers)
  },
  cyberhell: {
    enabled: false,
    terrain: terrain('map-zone4', 'zone4'),
    flowUrl: null,
    use: [],
    stations: { suffix:'cyberhell', facade:{}, facadeSizes:{ ...FACADE_SIZES } },
    stationFlip: null,
    // Mind M1 section 6: cyan energy + violet crystal glow; lava / orange fire stays; torch flame is cyan.
    light: { emit:[FIRE, CYAN, VIOLET], flame:'img/fx/fx-cyan-flame-{k}.webp',
             night:{ tint:'#1B0F3A' } },                         // data only (see west)
  },
};
const FOLDER = { asia:'map-zone2', west:'map-zone3', cyberhell:'map-zone4' };
function finalize(zone, rebuildArt = true) {
  const s = ZONE_SKIN[zone];
  if (zone !== 'th' && rebuildArt) {
    const planned = PLANNED_ART(zone, FOLDER[zone]);
    s.art = Object.assign({}, ...(s.use || []).map(group => planned[group] || {}));
  }
  // a zone with its own main tree no longer needs the shared tree darkened in code (unless the table says otherwise)
  if (s.treeTintAuto !== false) { s.treeTintAuto = true; s.treeTint = !s.art['town-tree-th']; }
  s.light.emit = s.light.emit || [FIRE];
  return s;
}
for (const z of TOWN_SKIN_ZONES) finalize(z);

export const townSkinOf = zone => (ZONE_SKIN[zone]?.enabled ? ZONE_SKIN[zone] : null);
/** Does this zone use the painted-town map system (chunked ground, 3840x2560 world, scenery, houses)? */
export const isTownZone = zone => !!townSkinOf(zone);
/** Zone-1 default for a role key (what every zone used before skins existed). */
export const ZONE1_TOWN_ART = ZONE1_ART;
/** File for a role key in a skin-enabled zone, or null (caller falls back to the zone-1 file). */
export const townSkinArt = (zone, key) => townSkinOf(zone)?.art[key] || null;

// ---- active zone: the skin the shared town modules (terrain chunks, flow, shade, light) are drawing right now ----
let active = 'th';
const listeners = new Set();
export const activeTownZone = () => active;
export const activeTownSkin = () => ZONE_SKIN[active];
export function setActiveTownZone(zone) {
  const next = isTownZone(zone) ? zone : 'th';
  if (next === active) return active;
  active = next;
  for (const fn of listeners) fn(active);
  return active;
}
export const onActiveTownZone = fn => { listeners.add(fn); return () => listeners.delete(fn); };

/** Dev / test hook: switch a zone's skin on at run time (patch is merged over the table entry).
 *  `fake: true` borrows Zone 1's ground and sprites so the engine can be exercised before the real art exists. */
export function enableTownSkin(zone, patch = {}, { fake = false } = {}) {
  const s = ZONE_SKIN[zone];
  if (!s || zone === 'th') throw new Error('unknown or reference zone ' + zone);
  if (fake) Object.assign(s, { terrain:{ ...ZONE_SKIN.th.terrain }, flowUrl:ZONE_SKIN.th.flowUrl, art:{ ...ZONE1_ART }, treeTint:true, treeTintAuto:false });
  Object.assign(s, patch, { enabled:true });
  if ('treeTint' in patch) s.treeTintAuto = false;
  finalize(zone, !fake && !('art' in patch));
  return s;
}
export function disableTownSkin(zone) {
  if (zone === 'th') throw new Error('zone 1 is always a town');
  ZONE_SKIN[zone].enabled = false;
  if (active === zone) setActiveTownZone('th');
}
