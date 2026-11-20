// T4 · Magic Lamp / summon system (owner 18-19 Nov 2026: G14-G18, D2, D4, "แก้ G15/G17 - หอกระจก", H2).
// Text: Rae R2 part A sections 2-3 (src/lamp-text.js). Pure state logic - no DOM - so tests and the UI share one set of rules.
//
//   · three treasures: mirror = reveal the truth · lamp = summon · clock = reset cooldowns. A spent treasure is refilled at the Mirror Tower (the `krajok` station).
//   · the lamp comes from Sita (sita-lamp, case 12). Slots: 1 at first, +1 per Mirror Tower minigame of Zone 2/3/4 (max 4).
//   · a summoned helper comes out, uses its special move ONCE, goes back (D2: "ใช้ท่าไม้ตายได้ 3 ครั้ง") - 3 uses, then it must be recharged at the tower.
//   · a helper is unlocked by the event of that character (D4). Only Hanuman has an event yet; the data below already holds all 12 of the owner's list
//     and a helper without `ready:true` is never shown.

/** Owner / Rae open question 13: when does the first lamp slot appear? 'receive' = the moment Sita hands over the lamp (Rae's default, used now) ·
 *  'minigame' = only after the Zone 1 Mirror Tower minigame (then NA-1 loses its last sentence and the Summon button stays locked until then). */
export const LAMP_FIRST_SLOT_ON = 'receive';
/** TEMPORARY: the "Upgrade (temporary)" button on the Mirror Tower panel. The real upgrade is a minigame per zone (not built yet, owner: do it last).
 *  Set to false and the button, its DEV tag and the `devUpgrade` entry point are gone - nothing else depends on it. */
export const LAMP_DEV_UPGRADE_BUTTON = true;
export const LAMP_MAX_SLOTS = 4;
/** Special moves a helper can use before it must be recharged (D2). */
export const SUMMON_USES = 3;
/** Which lamp level the Mirror Tower of each zone gives (owner: minigame Zone 1 -> 1 helper ... Zone 4 -> 4). */
export const TOWER_LAMP_LEVEL = Object.freeze({ th:1, asia:2, west:3, cyberhell:4 });

/** The lamp's own icon (Rae R2 A, table A1: `img/ui/item-magic-lamp.webp`, plus `-lit` for the lit one). Not drawn yet -> null = the UI shows the 🪔 glyph and asks for no file.
 *  When Kittanate's drawing is saved at that path, set this to the path (one line). */
export const LAMP_ICON_SRC = 'img/ui/item-magic-lamp-lit.webp';   // Codex E2 (20 Nov)
import { KUMAN_THONG } from './z1-wanthong.js';
import { YOMATHAT_HELPER } from './z2-gate.js';
import { WUKONG_HELPER, ART as WUKONG_ART } from './z2b-wukong.js';   // T6/3
import { LIANGANG_HELPER, ART as HARBOR_ART } from './z2b-harbor.js';   // T6/4
import { RYUJIN_HELPER, ART as RYUJIN_ART } from './z2b-ryujin.js';   // T6/5
import { EIRLIN_HELPER, EIRLIN_ART } from './z3e-eirlin.js';   // T7b/4
import { JORM_HELPER, SEV_ART } from './z3f-severin.js';   // T7b-2/5
import { THOR_HELPER, LUCIFER_HELPER, COL_ART } from './z4b-colosseum.js';   // T8a/2
import { LUPIN_HELPER, Z4L_ART } from './z4f-lupin.js';   // T8b/6
import { MUSASHI_HELPER, ART as CERBERUS_ART } from './z2b-cerberus.js';   // T6/7   // T5'/1: the second helper's text lives with his story
const art = (key, ext = 'webp') => `img/summon/${key}.${ext}`;
/** The 12 summonable helpers (Rae R2 A-D "สรุปตัวอัญเชิญ"). `event` = the story beat that unlocks it (D4). `ready` = that beat exists in the game now.
 *  Pictures: `img/summon/{icon,battle,cut}-<key>.webp` - a real drawing saved under that name replaces the placeholder, no code change. */
export const SUMMONERS = Object.freeze({
  hanuman:{ k:'hanuman', no:1, name:{ th:'หนุมาน', en:'Hanuman' }, glyph:'🐒', event:'sita-lamp', ready:true,
    art:{ icon:art('icon-hanuman'), battle:art('battle-hanuman'), cut:art('cut-hanuman-beyond-clouds') },
    move:{ name:{ th:'เหาะเหนือเมฆ', en:'Beyond the Clouds' }, kind:'group',
      desc:{ th:'หนุมานเหาะทะลวงฟ้า พุ่งผ่านศัตรูทั้งสนามด้วยฝ่ามือเปล่า', en:'Hanuman streaks across the sky and sweeps through every foe with an open palm.' },
      damage:{ base:44, perLevel:2 } },   // "ตีหมู่ แรงปานกลาง" - a little above the wind fan (36), well under the Valkyrie spear (88). Toby's first number, tune freely
    say:{ call:{ th:'หนุมาน: "พระนางฝากข้ามา ท่านยมบาทน้อย ถอยหลังข้าไว้"', en:'Hanuman: "My lady sent me. Lord Yama, stand behind me."' },
      use:{ th:'หนุมาน: "ข้าไม่ชักอาวุธ แต่ข้าไม่ออมมือ!"', en:'Hanuman: "I draw no weapon, but I hold nothing back!"' },
      end:{ th:'หนุมาน: "ไฟของข้าเหลือเท่านี้ ท่านใช้ให้คุ้ม"', en:'Hanuman: "That is all my flame allows. Spend it well."' } } },
  // T5'/1 (Rae R2 A 4.7): Golden Aegis = a team shield for about one round + a small heal, and the fallen are helped back to their feet. File names are Rae's table C6 / C7.
  kumanthong:{ k:'kumanthong', no:2, name:KUMAN_THONG.name, glyph:'👦', event:'z1-khunphaen-win', ready:true,
    art:{ icon:art('kuman-thong-icon'), battle:art('kuman-thong-battle'), cut:art('cut-kuman-golden-aegis') },
    move:{ ...KUMAN_THONG.move, kind:'guard', shield:{ base:22, perLevel:2 }, heal:{ base:14, perLevel:1 }, raise:25 }, say:KUMAN_THONG.say },
  // T5'/5 (Rae R2 A 8.4): Flame Blade, Brother's Guard = one heavy hit on the chosen foe + the whole team takes less damage until their next turn (the existing "defend" rule)
  yomathat:{ k:'yomathat', no:3, name:YOMATHAT_HELPER.name, glyph:'🔥', event:'z2-yomathat-gift', ready:true,
    art:{ icon:art('icon-yomathat'), battle:art('battle-yomathat'), cut:art('cut-yomathat-flame-guard') },
    move:{ ...YOMATHAT_HELPER.move, kind:'strike', damage:{ base:78, perLevel:3 }, guardTeam:true }, say:YOMATHAT_HELPER.say },
  // T6/3 (Rae R2 B 3.3): Strand Barrage = ONE foe (the chosen one), 3 quick hits of moderate power (`hits`: the sum is applied at once, like the other helpers' single move)
  wukong:{ k:'wukong', no:4, name:WUKONG_HELPER.name, glyph:'🐵', event:'z2-wukong-flame', ready:true, art:{ icon:WUKONG_ART.icon, battle:WUKONG_ART.battle, cut:WUKONG_ART.cut },
    move:{ ...WUKONG_HELPER.move, kind:'strike', hits:3, damage:{ base:28, perLevel:1 } }, say:WUKONG_HELPER.say },
  // T6/4 (Rae R2 B 4.6): Chain Line = a light hit on every foe + their attacks are weaker for one round (`weaken`: x0.6 for that foe's next blow(s) of the round). The chain is a line across the field - it binds no one.
  liangang:{ k:'liangang', no:5, name:LIANGANG_HELPER.name, glyph:'⛓️', event:'boss-guide-asia-welcome', ready:true, art:{ icon:HARBOR_ART.icon, battle:HARBOR_ART.battle, cut:HARBOR_ART.cut },
    move:{ ...LIANGANG_HELPER.move, kind:'group', damage:{ base:22, perLevel:1 }, weaken:{ rounds:1, mult:.6 } }, say:LIANGANG_HELPER.say },
  // T6/5 (Rae R2 B 5.8): Dragon Beneath the Cave = a strong group hit (a blue wave with the dragon's shadow in it), above Hanuman, under the Valkyrie spear (88)
  ryujin:{ k:'ryujin', no:6, name:RYUJIN_HELPER.name, glyph:'🐉', event:'z2-ryujin-win', ready:true, art:{ icon:RYUJIN_ART.icon, battle:RYUJIN_ART.battle, cut:RYUJIN_ART.cut },
    move:{ ...RYUJIN_HELPER.move, kind:'group', damage:{ base:62, perLevel:3 } }, say:RYUJIN_HELPER.say },
  // T6/7 (Rae R2 B 7.4): Two Blades, One Way = ONE foe, 2 quick hits, high power (the sum lands at once)
  musashi:{ k:'musashi', no:7, name:MUSASHI_HELPER.name, glyph:'⚔️', event:'boss-guide-asia-farewell', ready:true, art:{ icon:CERBERUS_ART.icon, battle:CERBERUS_ART.battle, cut:CERBERUS_ART.cut },
    move:{ ...MUSASHI_HELPER.move, kind:'strike', hits:2, damage:{ base:48, perLevel:2 } }, say:MUSASHI_HELPER.say },
  // T7b/4 (Rae R2 C 4.4): Spear to the Sound of Battle = ONE foe, one strong hit (above Ryujin's 62, under the Valkyrie spear's 88 on every foe)
  eirlin:{ k:'eirlin', no:8, name:EIRLIN_HELPER.name, glyph:'🔱', event:'z3-eirlin-win', ready:true, art:{ icon:EIRLIN_ART.icon, battle:EIRLIN_ART.battle, cut:EIRLIN_ART.cut },
    move:{ ...EIRLIN_HELPER.move, kind:'strike', hits:1, damage:{ base:72, perLevel:3 } }, say:EIRLIN_HELPER.say },
  // T7b-2/5 (Rae R2 C 5.4): Coil Around the World = a moderate group hit (under Ryujin's 62); "slows every foe for one round" is not in the engine yet
  jormungandr:{ k:'jormungandr', no:9, name:JORM_HELPER.name, glyph:'🐍', event:'z3-sev-collateral', ready:true, art:{ icon:SEV_ART.icon, battle:SEV_ART.battle, cut:SEV_ART.cut },
    move:{ ...JORM_HELPER.move, kind:'group', damage:{ base:52, perLevel:2 } }, say:JORM_HELPER.say },
  // T8a/2 (Rae R2 D 1.6-a): The Hammer Commands the Field = a medium-high group hit + every foe loses its next act with a 60 % chance (`stun`)
  thor:{ k:'thor', no:10, name:THOR_HELPER.name, glyph:'🔨', event:'col-thor-win', ready:true, art:{ icon:COL_ART.thorIcon, battle:COL_ART.thorBattle, cut:COL_ART.thorCut },
    move:{ ...THOR_HELPER.move, kind:'group', damage:{ base:66, perLevel:3 }, stun:{ rounds:1, chance:.6 } }, say:THOR_HELPER.say },
  // T8a/2 (Rae R2 D 1.7-a): The Founder's Decree = ONE foe, a heavy blow + that foe's next blow(s) of the round are lighter (`weaken` on the target only)
  lucifer:{ k:'lucifer', no:11, name:LUCIFER_HELPER.name, glyph:'🌟', event:'col-lucifer-win', ready:true, art:{ icon:COL_ART.luciferIcon, battle:COL_ART.luciferBattle, cut:COL_ART.luciferCut },
    move:{ ...LUCIFER_HELPER.move, kind:'strike', hits:1, damage:{ base:78, perLevel:3 }, weaken:{ rounds:1, mult:.6, target:true } }, say:LUCIFER_HELPER.say },
  // T8b/6 (Rae R2 D 9.4): The Mask Turns the Beat = ONE foe, a light-medium blow + that foe loses its next act (`stun`, target only). Under Thor (66 on every foe) and Lucifer (78 on one foe).
  lupin:{ k:'lupin', no:12, name:LUPIN_HELPER.name, glyph:'🎩', event:'z4-lupin-win', ready:true, art:{ icon:Z4L_ART.icon, battle:Z4L_ART.battle, cut:Z4L_ART.moveCut },
    move:{ ...LUPIN_HELPER.move, kind:'strike', hits:1, damage:{ base:58, perLevel:2 }, stun:{ rounds:1, chance:1, target:true } }, say:LUPIN_HELPER.say },
});
export const SUMMONER_KEYS = Object.freeze(Object.keys(SUMMONERS));
export const summonerOf = k => SUMMONERS[k] || null;
const pick = (row, lang) => (row && (row[lang] ?? row.th)) || '';
export const summonerName = (k, lang = 'th') => pick(SUMMONERS[k]?.name, lang);
export const summonerMoveName = (k, lang = 'th') => pick(SUMMONERS[k]?.move?.name, lang);

/** Treasure keys, in the order of Rae's cards. */
export const TREASURES = Object.freeze(['mirror', 'lamp', 'clock']);

export const freshMagic = () => ({ v:1, lamp:{ owned:false, level:0, slots:[null, null, null, null], used:{}, towers:{}, lowSeen:false }, unlocked:{} });

/** Old saves have no `magic`: make the object whole (never throws). Returns it. */
export function ensureMagic(g) {
  const m = g.magic && typeof g.magic === 'object' ? g.magic : (g.magic = freshMagic());
  const l = m.lamp && typeof m.lamp === 'object' ? m.lamp : (m.lamp = freshMagic().lamp);
  l.owned = !!l.owned; l.level = Math.max(0, Math.min(LAMP_MAX_SLOTS, Math.floor(Number(l.level) || 0)));
  if (!Array.isArray(l.slots)) l.slots = [null, null, null, null];
  l.slots = Array.from({ length:LAMP_MAX_SLOTS }, (_, i) => (SUMMONERS[l.slots[i]] ? l.slots[i] : null));
  if (!l.used || typeof l.used !== 'object') l.used = {};
  if (!l.towers || typeof l.towers !== 'object') l.towers = {};
  l.lowSeen = !!l.lowSeen;
  if (!m.unlocked || typeof m.unlocked !== 'object') m.unlocked = {};
  for (const k of Object.keys(m.unlocked)) if (!SUMMONERS[k]) delete m.unlocked[k];
  return m;
}

export const lampOwned = g => !!ensureMagic(g).lamp.owned;
/** How many slots the lamp has right now (0 before the lamp, or before the first minigame when LAMP_FIRST_SLOT_ON is 'minigame'). */
export const lampSlotCount = g => { const l = ensureMagic(g).lamp; return l.owned ? l.level : 0; };
export const summonerUnlocked = (g, k) => !!(SUMMONERS[k] && ensureMagic(g).unlocked[k]);
/** Helpers the player has met (shown in the bag) - never one whose event is not in the game yet. */
export const unlockedSummoners = g => SUMMONER_KEYS.filter(k => SUMMONERS[k].ready && summonerUnlocked(g, k));
export const summonUsesLeft = (g, k) => Math.max(0, SUMMON_USES - (Number(ensureMagic(g).lamp.used[k]) || 0));
/** Helpers standing in a slot that the lamp actually has (a slot above the level is never offered). */
export function slottedSummoners(g) {
  const l = ensureMagic(g).lamp, n = lampSlotCount(g);
  return l.slots.slice(0, n).filter(k => k && summonerUnlocked(g, k));
}

/** Unlock a helper (D4: its own event has been passed). Returns true the first time. */
export function unlockSummoner(g, k) {
  if (!SUMMONERS[k]) return false;
  const m = ensureMagic(g);
  if (m.unlocked[k]) return false;
  m.unlocked[k] = true; m.lamp.used[k] = 0;
  return true;
}

/** The lamp arrives (end of `sita-lamp`). Hanuman is unlocked; with LAMP_FIRST_SLOT_ON 'receive' there is one slot and he stands in it. Returns false if already owned. */
export function receiveLamp(g) {
  const m = ensureMagic(g), l = m.lamp;
  if (l.owned) return false;
  l.owned = true;
  unlockSummoner(g, 'hanuman');
  if (LAMP_FIRST_SLOT_ON === 'receive') { l.level = Math.max(l.level, 1); if (!l.slots.slice(0, l.level).includes('hanuman')) l.slots[0] = 'hanuman'; }
  return true;
}

/** Put a helper in slot `i` (null = empty it). A helper is in one slot at most. Returns '' (ok) or a reason key. */
export function setSlot(g, i, k) {
  const l = ensureMagic(g).lamp;
  if (!l.owned) return 'noLamp';
  if (!Number.isInteger(i) || i < 0 || i >= lampSlotCount(g)) return 'locked';
  if (k == null) { l.slots[i] = null; return ''; }
  if (!SUMMONERS[k] || !summonerUnlocked(g, k)) return 'unmet';
  const at = l.slots.indexOf(k); if (at >= 0 && at !== i) l.slots[at] = l.slots[i];   // swap if he already stands in another slot
  l.slots[i] = k;
  return '';
}

/** Why `k` cannot be summoned in `battle` right now - '' (can) | 'noLamp' | 'cannot' | 'empty' | 'unmet' | 'spent'. */
export function summonWhy(g, k, battle = g.battle) {
  if (!lampOwned(g)) return 'noLamp';
  if (!battle || battle.over || SUMMON_BLOCKED_KINDS.includes(battle.kind) || battle.breachFinale === 'ready') return 'cannot';
  if (!slottedSummoners(g).includes(k)) return 'empty';
  if (!SUMMONERS[k]?.ready) return 'unmet';
  if (summonUsesLeft(g, k) <= 0) return 'spent';
  return '';
}
/** Fights where the lamp stays still: the two "Yama himself" scenes end the run at once, they are not fights to help in. */
export const SUMMON_BLOCKED_KINDS = Object.freeze(['yama', 'dad']);

/** T5'/1: a 'guard' move (Kuman Thong's Golden Aegis) - how much shield / heal it gives at Yama's level, and how much HP a fallen teammate is helped up with. */
export function summonGuard(g, k) {
  const m = SUMMONERS[k]?.move; if (m?.kind !== 'guard') return null;
  const lv = Math.max(1, g.level || 1) - 1, at = d => Math.max(1, Math.round(d.base + lv * d.perLevel));
  return { shield:at(m.shield), heal:at(m.heal), raise:m.raise || 25 };
}
/** Damage of a helper's move at Yama's level (group hit: every living foe takes this). */
export function summonDamage(g, k) {
  const d = SUMMONERS[k]?.move?.damage; if (!d) return 0;
  return Math.max(1, Math.round(d.base + (Math.max(1, g.level || 1) - 1) * d.perLevel)) * Math.max(1, SUMMONERS[k].move.hits || 1);   // `hits` = quick blows in one go (the sum lands at once)
}

/** Spend one use. Returns { used, left, out } - `out` = true when that was the last one. */
export function spendSummon(g, k) {
  const l = ensureMagic(g).lamp;
  l.used[k] = Math.min(SUMMON_USES, (Number(l.used[k]) || 0) + 1);
  return { used:l.used[k], left:SUMMON_USES - l.used[k], out:l.used[k] >= SUMMON_USES };
}
/** Every owned helper is out of moves (the NA-3 window shows once, after a fight). */
export const lampAllSpent = g => { const s = slottedSummoners(g); return s.length > 0 && s.every(k => summonUsesLeft(g, k) <= 0); };

/** Mirror Tower: refill. `item` = 'mirror' | 'lamp' | 'clock' | 'all'. Returns the keys that were actually refilled. */
export function rechargeTreasures(g, item = 'all') {
  const done = [], l = ensureMagic(g).lamp;
  const want = item === 'all' ? TREASURES : [item];
  for (const it of want) {
    const s = treasureState(g, it);
    if (s.state !== 'spent' && s.state !== 'partial') continue;
    if (it === 'mirror') { const p = g.powerOf?.('mirror'); if (p) p.ammo = p.max; }
    else if (it === 'lamp') { l.used = {}; l.lowSeen = false; }
    done.push(it);
  }
  return done;
}

/** { state: 'none' | 'charged' | 'partial' | 'spent', n, max } for one treasure card. */
export function treasureState(g, item) {
  if (item === 'lamp') {
    const l = ensureMagic(g).lamp;
    if (!l.owned) return { state:'none' };
    const mine = slottedSummoners(g), max = mine.length * SUMMON_USES, n = mine.reduce((a, k) => a + summonUsesLeft(g, k), 0);
    // unlocked helpers that are not in a slot keep their uses too: the tower refills them as well
    const anyUsed = unlockedSummoners(g).some(k => summonUsesLeft(g, k) < SUMMON_USES);
    return { state:!anyUsed ? 'charged' : (max && n <= 0 ? 'spent' : 'partial'), n, max };
  }
  if (item === 'mirror') {
    const p = g.powerOf?.('mirror');
    if (!p || g.powerLocked?.(p)) return { state:'none' };
    const n = p.ammo, max = p.max;
    return { state:n >= max ? 'charged' : n <= 0 ? 'spent' : 'partial', n, max };
  }
  if (item === 'clock') {
    return (g.abilities?.cooldownClock || g.inventory?.cooldownClock) ? { state:'charged' } : { state:'none' };
  }
  return { state:'none' };
}

/** Mirror Tower upgrade (TEMPORARY button - LAMP_DEV_UPGRADE_BUTTON). Zone N's tower lifts the lamp to level N (never down). Returns '' | 'noLamp' | 'already'. */
export function devUpgradeLamp(g, zone) {
  if (!LAMP_DEV_UPGRADE_BUTTON) return 'off';
  const m = ensureMagic(g), l = m.lamp;
  if (!l.owned) return 'noLamp';
  if (l.towers[zone]) return 'already';
  l.towers[zone] = true;
  l.level = Math.max(l.level, TOWER_LAMP_LEVEL[zone] || 1);
  return '';
}
