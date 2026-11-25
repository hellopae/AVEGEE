// FB3-BT2: how tall an enemy stands on the battle stage, as a multiple of the team's "adult" height (Kan / Dam / Plerng / Taan = 1.0).
// Owner 26 Nov: "an ordinary human soul is already much bigger than the team" -> every enemy is sized from the MEASURED visible pixels of its picture
// (transparent padding never counts), by a tier table, so a ghost is about as tall as Boon / Kan, a demon a little taller, a boss clearly taller but not a wall.
// No pixel of any picture is touched: only the box the <img> is drawn in changes.
import { spriteKey } from './battle-facing.js';
import { BATTLE_TRIM } from './character-scale.js';
const BOON_TRIM = BATTLE_TRIM.boon;

/** Visible height of a foe in units of the team's adult height. */
export const FOE_TIER = Object.freeze({
  human:1.00,      // souls of people, spirits, story souls and fighters who are plain humans (EV12: Khun Phaen is one of these)
  ghost:1.00,      // ordinary ghosts and hungry ghosts: as tall as Boon / Kan
  minion:1.10,     // small odd monsters and machines
  demon:1.25,      // demons and big animals: "a little bigger"
  brute:1.40,      // the heavy ones of a demon family
  boss:1.65,       // bosses: clearly bigger, never a wall in front of the team
  bigBoss:1.85,    // the zone bosses / throne bosses
  giant:2.00,      // dragons, snakes and the three-headed hound
});
/** Wide pictures (crouching, floating hair, snakes): never wider than this many times the tier height. */
export const FOE_MAX_ASPECT = 1.5;
/** Khun Phaen is "an ordinary man" (EV12): the same height as Boon (0.93) and Kan (1.00) within 5 % of both. */
export const KHUNPHAEN_UNITS = 0.965;

const SPECIAL = Object.freeze({
  'boss-khunphaen-th':KHUNPHAEN_UNITS,
  'mob-q-ashsmoke':FOE_TIER.ghost*.8,
  'mob-hitodama':FOE_TIER.ghost*.9, 'mob-hitodama-asia':FOE_TIER.ghost*.9,
  'mob-pop':FOE_TIER.minion, 'mob-kasha-asia':FOE_TIER.minion,
  'mob-bot':FOE_TIER.minion, 'mob-bot-cyberhell':FOE_TIER.minion, 'mob-bug':FOE_TIER.minion, 'mob-bug-cyberhell':FOE_TIER.minion,
  'mob-worm':FOE_TIER.minion, 'mob-worm-cyberhell':FOE_TIER.minion,
  'mob-werewolf':FOE_TIER.demon, 'mob-krahang':FOE_TIER.minion,
  'mob-cyber-guard':FOE_TIER.demon, 'mob-cyber-guard-cyberhell':FOE_TIER.demon,
  'mob-cyber-lancer':FOE_TIER.demon, 'mob-cyber-lancer-cyberhell':FOE_TIER.demon,
  'mob-cyber-brute':FOE_TIER.brute, 'mob-cyber-brute-cyberhell':FOE_TIER.brute,
  'mob-q-ashsmoke-big':FOE_TIER.demon, 'mob-q-gauze-big':FOE_TIER.demon, 'mob-q-tale-big':FOE_TIER.demon,
  'col-s4':FOE_TIER.demon, 'col-s8':FOE_TIER.brute, 'col-s7':FOE_TIER.human,
  'boss-ryujin-asia':FOE_TIER.giant, 'boss-jormungandr-west':FOE_TIER.giant,
  'boss-cerberus-west':FOE_TIER.giant, 'boss-cerberus-gate-west':FOE_TIER.giant, 'guard-cerberus-west':FOE_TIER.giant,
  'boss-wukong-clone-asia':FOE_TIER.demon,
  'boss-hanuman-th':FOE_TIER.boss, 'boss-wukong-asia':FOE_TIER.boss, 'boss-guanyu-asia':FOE_TIER.boss, 'boss-guanyu-asia-guard':FOE_TIER.boss,
  'boss-loki-west':FOE_TIER.boss, 'boss-phantom404-cyberhell':FOE_TIER.boss,
  'hero-boss':FOE_TIER.bigBoss, 'zone-boss':FOE_TIER.bigBoss,
});

/** Tier (units of the team's adult height) for one enemy picture. Unknown pictures are treated as ordinary ghosts, never as bosses. */
export function foeUnits(src, { boss = false } = {}) {
  const key = spriteKey(src).replace(/^(.*?)(-profile)$/, '$1');
  if (Object.hasOwn(SPECIAL, key)) return SPECIAL[key];
  if (/^(hero-boss|zone-boss|boss zone\d)/i.test(key)) return FOE_TIER.bigBoss;
  if (/^(boss-frontier|boss-tester)/.test(key)) return FOE_TIER.bigBoss;
  if (/^leader-.*-possessed$/.test(key)) return FOE_TIER.boss;
  if (/^boss-/.test(key)) return FOE_TIER.boss;
  if (/^crew-guard/.test(key)) return 1.25;          // a hypnotised teammate keeps the height he has on our side
  if (/^crew-nira/.test(key)) return .95;
  if (/^crew-boon/.test(key)) return FOE_TIER.human * BOON_TRIM;
  if (/^crew-/.test(key)) return FOE_TIER.human;
  if (/^(spirit|soul|char|col-s|guard-)/.test(key)) return FOE_TIER.human;
  if (/^mob-q-/.test(key)) return FOE_TIER.ghost;
  if (/^mob-/.test(key)) return FOE_TIER.ghost;
  if (/\/soul-poses\//.test(String(src))) return FOE_TIER.human;
  return boss ? FOE_TIER.boss : FOE_TIER.ghost;
}

/** Size of the enemy picture's box so that its VISIBLE part is `units` x adultVis tall (width capped for wide pictures and for the room it has).
 *  box = visible fraction of the picture { w, h } (0-1) · aspect = naturalWidth / naturalHeight · returns { w, h } px of the whole <img> box. */
export function planFoeSize({ box, aspect, adultVis, units, roomW = Infinity }) {
  if (!box || !(box.h > 0) || !(box.w > 0) || !(aspect > 0) || !(adultVis > 0)) return null;
  let visH = adultVis * units;
  const visW = h => h * (box.w * aspect) / box.h;       // visible width at visible height h
  const maxW = Math.min(visH * FOE_MAX_ASPECT, roomW);
  if (visW(visH) > maxW) visH = maxW * box.h / (box.w * aspect);
  const h = visH / box.h;
  return { h, w:h * aspect, visH };
}
