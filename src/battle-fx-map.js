// M2: battle move -> effect recipe. Pure data/functions (no DOM) so the mapping can be tested in node.
// Recipe ids are implemented in battle-fx.js (RECIPES). Damage values are never changed here — they only pick a visual tier.

/** Every recipe the engine knows. `heal` etc. are also drawn by the interrogation scene where relevant. */
export const RECIPE_IDS = Object.freeze([
  'slash', 'slash_cross', 'slash_multi', 'club', 'club_big',
  'fire_s', 'fire_m', 'fire_l', 'fire_charge',
  'ice', 'wind', 'hypno', 'spear',
  'heal', 'rage', 'clock', 'mirror',
  'foe_claw_s', 'foe_claw_m', 'foe_claw_l', 'foe_ult', 'burn',
]);

/** Fireball size tier from the damage the game already computed (fireDmg 40 +20 bigFire +2/level; Plerng 40+). */
export const FIRE_TIER_MEDIUM = 45;
export const FIRE_TIER_LARGE = 70;
export const fireTier = dmg => dmg >= FIRE_TIER_LARGE ? 'fire_l' : dmg >= FIRE_TIER_MEDIUM ? 'fire_m' : 'fire_s';

/** Enemy counter-attack tier from the damage dealt to our side. foeAtk is 7-15, mob 6-13, zone bosses up to ~40. */
export const FOE_TIER_MEDIUM = 14;
export const FOE_TIER_LARGE = 24;
export const foeTier = dmg => dmg >= FOE_TIER_LARGE ? 'foe_claw_l' : dmg >= FOE_TIER_MEDIUM ? 'foe_claw_m' : 'foe_claw_s';

const CREW_RECIPE = {
  taan: 'club',            // ทัณฑ์/โกคุ ฟาดกระบอง
  guard: 'club_big',       // ยักษ์ทวารบาล ฟาดแรง
  dam: 'slash_multi',      // ดำ โจมตีช่วย
  kan: 'hypno',            // กานต์ สะกดจิต
  boon: 'heal',            // บุญ ฟื้นบารมี
  plerng: null,            // เพลิง ปล่อยไฟ — tier by damage
};

/** Fixed (action key -> recipe). Items that heal are handled by `heal` below. */
const ACTION_RECIPE = {
  atk: 'slash', strike: 'slash',
  fire: null,                 // tier by damage
  flameCharge: 'fire_charge',
  windFan: 'wind', wind: 'wind',
  ice: 'ice',
  hypno: 'hypno',
  valkyrieSpear: 'spear',
  rage: 'rage',
  cooldownClock: 'clock', clockReset: 'clock',
  mirror: 'mirror',
  guard: 'club_big',
  health: 'heal', tea: 'heal', holyWater: 'heal', food: 'heal', spareHeart: 'heal', healthLarge: 'heal', holyWaterLarge: 'heal',
};

/** Which recipe an action key (the `k` used by openBattle: 'atk', 'fire', 'crew:plerng', 'tea', ...) plays.
 *  opts: { dmg, crit, replay } — only used to pick a tier. Returns null for moves with no effect (defend/flee). */
export function recipeFor(action, opts = {}) {
  const { dmg = 0, crit = false, replay = 0 } = opts;
  if (action === 'defend' || action === 'flee') return null;
  if (typeof action === 'string' && action.startsWith('crew:')) {
    const k = action.slice(5);
    return CREW_RECIPE[k] === undefined ? 'slash' : CREW_RECIPE[k] || fireTier(dmg);
  }
  if (action === 'foe') return foeTier(dmg);
  if (action === 'fire') return fireTier(dmg);
  if (action === 'atk') return crit ? 'slash_cross' : replay > 0 ? 'slash_multi' : 'slash';
  return ACTION_RECIPE[action] || 'slash';
}

/** Weapon id (fang/chain/cane/trojan) -> slash colour set. Texture key suffix of fx-slash-arc-*. */
export const WEAPON_SLASH = Object.freeze({ fang:'ember', chain:'white', cane:'crimson', trojan:'cyan' });
export const slashColorOf = weapon => WEAPON_SLASH[weapon] || 'white';

/** Every action key the battle can issue, for the "all moves covered" test. */
export const ALL_ACTIONS = Object.freeze([
  'atk', 'strike', 'fire', 'flameCharge', 'windFan', 'rage', 'valkyrieSpear', 'cooldownClock', 'hypno', 'ice',
  'guard', 'crew:taan', 'crew:plerng', 'crew:dam', 'crew:kan', 'crew:boon',
  'tea', 'health', 'holyWater', 'healthLarge', 'holyWaterLarge', 'food', 'foe',
]);

/** Per-recipe metadata. `hit` = ms from the recipe's own start to the moment damage lands (damage numbers + shake line up with it).
 *  `camera` = what the M1 battle camera should do for this move (docs/battle-camera-api.md §5.1): hit weight, single/all targets, dim the background, flash. */
export const RECIPE_META = Object.freeze({
  slash:       { hit:240, camera:{ power:1, scope:'single', dim:false, flash:false } },
  slash_cross: { hit:280, camera:{ power:3, scope:'single', dim:true,  flash:true } },
  slash_multi: { hit:525, camera:{ power:2, scope:'single', dim:false, flash:false } },
  club:        { hit:110, camera:{ power:2, scope:'single', dim:false, flash:false } },
  club_big:    { hit:110, camera:{ power:3, scope:'single', dim:true,  flash:true } },
  fire_s:      { hit:200, camera:{ power:1, scope:'single', dim:true,  flash:false } },
  fire_m:      { hit:370, camera:{ power:2, scope:'single', dim:true,  flash:false } },
  fire_l:      { hit:570, camera:{ power:3, scope:'single', dim:true,  flash:true } },
  fire_charge: { hit:520, camera:{ power:3, scope:'single', dim:true,  flash:true } },
  ice:         { hit:250, camera:{ power:2, scope:'all',    dim:true,  flash:true } },
  wind:        { hit:300, camera:{ power:2, scope:'all',    dim:true,  flash:false } },
  hypno:       { hit:500, camera:{ power:1, scope:'all',    dim:true,  flash:false } },
  spear:       { hit:400, camera:{ power:3, scope:'single', dim:true,  flash:true } },
  heal:        { hit:300, camera:{ power:1, scope:'all',    dim:false, flash:false } },
  rage:        { hit:0,   camera:{ power:1, scope:'single', dim:true,  flash:false } },
  clock:       { hit:0,   camera:{ power:1, scope:'single', dim:true,  flash:false } },
  mirror:      { hit:0,   camera:{ power:1, scope:'single', dim:false, flash:false } },
  foe_claw_s:  { hit:170, camera:{ power:1, scope:'single', dim:false, flash:false } },
  foe_claw_m:  { hit:170, camera:{ power:2, scope:'single', dim:false, flash:false } },
  foe_claw_l:  { hit:170, camera:{ power:3, scope:'single', dim:true,  flash:true } },
  foe_ult:     { hit:80,  camera:{ power:3, scope:'all',    dim:true,  flash:true } },
  burn:        { hit:0,   camera:{ power:1, scope:'single', dim:false, flash:false } },
});

/** Which M1 camera cue a move plays, and when that cue's impact lands (ms at speed x1). Mirrors docs/battle-camera-api.md §4 so M2 can start
 *  a recipe early enough for its own hit moment to coincide. Pass the real CAMERA_TIMING from battle-camera.js to override these defaults. */
export const DEFAULT_CUE_TIMING = Object.freeze({ attack:360, skill:520, 'foe-attack':340, heal:300, skillCutExtra:60 });
export function cueKindFor(phaseKind, action) {
  if (phaseKind === 'foe') return 'foe-attack';
  if (action === 'atk' || action === 'strike') return 'attack';
  const r = recipeFor(action);
  return r === 'heal' ? 'heal' : 'skill';
}
export function cueImpactAt(kind, cutMs = 0, timing = DEFAULT_CUE_TIMING) {
  if (kind === 'skill' || kind === 'foe-attack' && cutMs > 0) return cutMs > 0 ? cutMs + (timing.skillCutExtra ?? 60) : timing.skill;
  return timing[kind] ?? 0;
}
