#!/usr/bin/env python3
"""T5': labelled placeholder pictures for the story slots of Rae R2 part A (sections 4-10) that Codex has not drawn yet (right file name, right pixel size, never stretched).
A real drawing saved under the same name replaces a placeholder with no code change.  Cutscenes: 1672x941 · sprites: transparent RGBA · profiles / icons: square.
  python3 scripts/build-t5-placeholders.py <group> [<group> ...]      groups: wanthong yomathat frontier12 guanyu boatman guanyin wukong lian musashi ryujin cerberus   (an existing file is never overwritten)"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parent.parent / 'img'
CUT = (1672, 941)
# group -> [(path under img/, (w, h), kind, label)]   kind: cut | sprite | square
GROUPS = {
 'frontier12': [
  ('z1-events/cut-frontier12-stop-th.webp', CUT, 'cut', 'PLACEHOLDER cut-frontier12-stop-th  (E2: Yomathat\'s hand on Yama\'s shoulder, same cave as E1)'),
 ],
 'guanyu': [
  ('z2-events/boss-guanyu-asia.webp', (512, 512), 'sprite', 'PLACEHOLDER boss-guanyu-asia (F1: Guan Yu, standing, polearm upright)'),
  ('z2-events/boss-guanyu-asia-profile.webp', (512, 512), 'square', 'PLACEHOLDER boss-guanyu-asia-profile'),
  ('z2-events/boss-guanyu-asia-guard.webp', (512, 512), 'sprite', 'PLACEHOLDER boss-guanyu-asia-guard (map sprite of the Zone 2 Guard)'),
  ('z2-events/cut-guanyu-gate-asia.webp', CUT, 'cut', 'PLACEHOLDER cut-guanyu-gate-asia  (F2: the red gate in haze, Guan Yu before it)'),
  ('z2-events/cut-guanyu-sweep-asia.webp', CUT, 'cut', 'PLACEHOLDER cut-guanyu-sweep-asia  (F3: Green Dragon Sweep, half circle with green glints)'),
  ('z2-events/cut-guanyu-yields-asia.webp', CUT, 'cut', 'PLACEHOLDER cut-guanyu-yields-asia  (F4: haft planted, hands before chest, bow)'),
  ('z2-events/cut-yomathat-gift-asia.webp', CUT, 'cut', 'PLACEHOLDER cut-yomathat-gift-asia  (D2: the half-open red gate, the bundle and purse; D2b: the flame lights the lamp)'),
  ('summon/cut-yomathat-flame-guard.webp', CUT, 'cut', 'PLACEHOLDER cut-yomathat-flame-guard  (D4: heavy flame-blade cut, wall of flame behind him)'),
 ],
 'boatman': [
  ('boat/boatman-lung-chaew.webp', (512, 512), 'sprite', 'PLACEHOLDER boatman-lung-chaew (G1: old boatman at the stern, straw hat, long oar)'),
  ('boat/boatman-lung-chaew-profile.webp', (512, 512), 'square', 'PLACEHOLDER boatman-lung-chaew-profile'),
  ('boat/cut-boatman-song-asia.webp', CUT, 'cut', 'PLACEHOLDER cut-boatman-song-asia  (G2: the boat on still water, Lung Chaew singing, Yama and Nira at the bow)'),
  ('boat/fx-water-song.webp', CUT, 'cut', 'PLACEHOLDER fx-water-song (G3: ripples at the end of the landing, faint gold motes; Zone 2 adds a small red lantern)'),
  ('boat/item-oar.webp', (512, 512), 'square', 'PLACEHOLDER item-oar (G4: small hand-carved oar with a faded blue ribbon)'),
 ],
 'guanyin': [   # T6/2 - Rae R2 part B, group H
  ('z2-events/soul-guanyin-father-asia.webp', (1254, 1254), 'sprite', 'PLACEHOLDER soul-guanyin-father-asia (H1: the father, an old king in faded robes, shoulders down, hands clasped)'),
  ('z2-events/soul-guanyin-father-asia-profile.webp', (1254, 1254), 'square', 'PLACEHOLDER soul-guanyin-father-asia-profile'),
  ('z2-events/cut-guanyin-descends-asia.webp', CUT, 'cut', 'PLACEHOLDER cut-guanyin-descends-asia  (H2: white light in the hall, lotus petals, Guanyin in plain white with a willow vase; Yama + Nira bow, the father kneels bottom right)'),
  ('z2-events/cut-guanyin-father-asia.webp', CUT, 'cut', 'PLACEHOLDER cut-guanyin-father-asia  (H3: she bows to her father who is bent to the floor; light from behind, petals fading)'),
 ],
 'lian': [   # T6/4 - Rae R2 part B, groups L + M1
  ('z2-events/cut-lian-gift-asia.webp', CUT, 'cut', 'PLACEHOLDER cut-lian-gift-asia  (L2: Eastern harbor at dusk, Lian Gang hands Yama (Zone 2 robes) a bundle + purse with both hands, chain on his belt binds no one; Musashi bows at back right, Nira beside Yama, small wooden boat, Lung Chaew a silhouette at the stern)'),
  ('summon/cut-liangang-chain-line.webp', CUT, 'cut', 'PLACEHOLDER cut-liangang-chain-line  (L4: links of chain floating in a line across the field between team and foes; nobody bound, nobody fallen near it; iron-grey light, hell battlefield)'),
 ],
 'musashi': [
  ('z2-events/char-musashi-asia.webp', (512, 512), 'sprite', 'PLACEHOLDER char-musashi-asia (M1: Musashi standing, ink-coloured long coat, hair tied loosely, long + short sword paired at the waist, calm, no drawn sword)'),
  ('z2-events/char-musashi-asia-profile.webp', (512, 512), 'square', 'PLACEHOLDER char-musashi-asia-profile'),
  ('summon/icon-musashi.webp', (512, 512), 'square', 'PLACEHOLDER icon-musashi (M2: half figure, two sword hilts crossed, gold frame)'),
  ('summon/battle-musashi.webp', (512, 512), 'sprite', 'PLACEHOLDER battle-musashi (M2: ready to draw both swords, hands crossed)'),
  ('summon/cut-musashi-two-blades.webp', CUT, 'cut', 'PLACEHOLDER cut-musashi-two-blades  (M3: Musashi half-turned, both swords crossed over his shoulder, two silver streaks cut a glowing blue wall of water apart, a single thin line of light across the dragon far off - NO blood, NO wound on the scales; Yama + Nira step back at left)'),
 ],
 'ryujin': [   # T6/5 - Rae R2 part B, group R
  ('z2-events/boss-ryujin-asia.webp', (512, 512), 'sprite', 'PLACEHOLDER boss-ryujin-asia (R1: jade-green eastern dragon rising half out of glowing blue water, long whiskers, branching horns, pale pearl under the jaw, calm heavy eyes - no beast fury)'),
  ('z2-events/boss-ryujin-asia-profile.webp', (512, 512), 'square', 'PLACEHOLDER boss-ryujin-asia-profile'),
  ('z2-events/cut-ryujin-open-asia.webp', CUT, 'cut', 'PLACEHOLDER cut-ryujin-open-asia  (R3: the lake swells, the dragon arches like a bridge, pearl under the jaw; Yama (Zone 2 robes) + Nira + Musashi (hand on hilt, not drawn) on the shore bottom left)'),
  ('z2-events/cut-ryujin-yields-asia.webp', CUT, 'cut', 'PLACEHOLDER cut-ryujin-yields-asia  (R4: dragon lowers to the water, head bowed, a single blue spark from the pearl drifts into the lamp at Yama\'s side; Yama + Musashi + Nira stand respectfully)'),
  ('z2-events/cut-ryujin-tide-asia.webp', CUT, 'cut', 'PLACEHOLDER cut-ryujin-tide-asia  (R7: card of the boss move Tide of Wrath - the dragon rises, every wave leans toward the camera, glowing spray, team bottom left)'),
  ('summon/icon-ryujin.webp', (512, 512), 'square', 'PLACEHOLDER icon-ryujin (R5: jade dragon face, pearl under the jaw, gold frame)'),
  ('summon/battle-ryujin.webp', (512, 512), 'sprite', 'PLACEHOLDER battle-ryujin (R5: smaller dragon curve over blue waves, fits the fight)'),
  ('summon/cut-ryujin-dragon-beneath.webp', CUT, 'cut', 'PLACEHOLDER cut-ryujin-dragon-beneath  (R6: a tall blue wave rushing at the camera with the shadow of a jade dragon coiled inside it, foes thrown back; NOT the full dragon smashing anyone)'),
 ],
 'cerberus': [   # T6/6-7 - Rae R2 part B, groups C + M4 (C1 and the howl card already exist in img/z3-events)
  ('z3-events/cut-cerberus-gate-west.webp', CUT, 'cut', 'PLACEHOLDER cut-cerberus-gate-west  (C2: half-snowed stone gate, Cerberus across the road, three plumes of white breath; Yama (Zone 2 robes) + Nira + Musashi bottom left; middle head stares at Yama, side heads at the lamp. EYES: deep red, NO green spell glow)'),
  ('z3-events/cut-cerberus-yields-west.webp', CUT, 'cut', 'PLACEHOLDER cut-cerberus-yields-west  (C3: three heads bowed together, the middle one lowest, nose near the snow before Yama; the open gate behind; Yama + Nira + Musashi calm)'),
  ('z3-events/cut-musashi-farewell-west.webp', CUT, 'cut', 'PLACEHOLDER cut-musashi-farewell-west  (M4: open stone gate, fine snow, Musashi at the mouth of the gate on the cave side lays his palm over the lamp at Yama\'s side - one silver thread into the wick; Cerberus sits by the gate, three heads bowed)'),
  ('z3-events/guard-cerberus-west.webp', (512, 512), 'sprite', 'PLACEHOLDER guard-cerberus-west (C4: Cerberus sitting or standing by the stone gate, three heads turned outward, small for the map; may be cut from C1)'),
 ],
 'z3c': [   # T7 - Rae R2 part C (grows item by item: see the T7 report for the full list)
  ('z3-events/cut-arrive-west.webp', CUT, 'cut', 'PLACEHOLDER cut-arrive-west  (sec.1 z3-arrive/z3-clear: stone square under thin snow, iron lamps, Poena + hell merchant under the first lamp, 2-3 spirits circling with faint green eyes, Yama in the Zone 3 robes, NO three-headed hound)'),
 ],
 'z3c-frontier': [   # T7/2 - Rae R2 part C sec. 2 (groups V + the old z3 list)
  ('z3-events/cut-freeze-west.webp', CUT, 'cut', 'PLACEHOLDER cut-freeze-west  (z3-freeze: the West square, spirits stopped mid-step, snow hanging in the air, Poena + Nira walking among pale statues)'),
  ('z3-events/cut-vh-frontier-west.webp', CUT, 'cut', 'PLACEHOLDER cut-vh-frontier-west  (V2: frontier in white mist, half-open gate, Van Helsing (long dark-grey coat, white lantern, scorch marks) blocks Valdric (black coat lined red, bat-headed cane); a row of still demons with yellow eyes, 2-3 demons lying at his feet; Yama + Nira bottom right; no blood)'),
  ('frontier-west-hypnosis-v2.webp', CUT, 'cut', 'PLACEHOLDER frontier-west-hypnosis-v2  (V4: Poena, Noir, Nira with dim identical eyes turning weapons/hands toward Yama, thin mist threads into their ears, Nira grips her notebook; Cerberus with GREEN eyes turning too; Valdric far off raising his cane; Van Helsing upright and unmoved beside Yama; no blood)'),
  ('z3-events/cut-valdric-down-west.webp', CUT, 'cut', 'PLACEHOLDER cut-valdric-down-west  (Valdric on one knee in the snow, bat-headed cane rolling away, bats flying back into his coat)'),
  ('z3-events/cut-vh-guard-west.webp', CUT, 'cut', 'PLACEHOLDER cut-vh-guard-west  (V3: Valdric on one knee, bats returning to his coat, Yama arms wide between them, Van Helsing opposite lowering the stake, left palm offering a lump of beeswax in old cloth; no blood)'),
  ('z3-events/cut-frontier-boss-to-dais-west.webp', CUT, 'cut', 'PLACEHOLDER cut-frontier-boss-to-dais-west  (Valdric walks ahead on the stone yard where snow melts along the lamplight; Yama + Nira follow; woken tenants line the road with blankets; Van Helsing last)'),
  ('z3-events/cut-frontier-boss-punished-west.webp', CUT, 'cut', 'PLACEHOLDER cut-frontier-boss-punished-west  (Valdric on the rim of a copper pan, coat on, steam rising, frost melting off his moustache, eastern sky pale; no blood)'),
  ('z3-events/cut-frontier-boss-released-west.webp', CUT, 'cut', 'PLACEHOLDER cut-frontier-boss-released-west  (Valdric at the manor door drawing a curtain half open, lamplight spilling into a dark room; Yama at the foot of the hill)'),
  ('z3-events/guard-vanhelsing-west.webp', (512, 512), 'sprite', 'PLACEHOLDER guard-vanhelsing-west (V1: elderly physician, long dark-grey coat, grey hair, trimmed white moustache, cold white lantern in left hand, old leather bag + sheathed short stake + beeswax lump at belt, upright with slightly dropped shoulders, no smile; NO cross, NO religious symbol)'),
  ('z3-events/guard-vanhelsing-west-profile.webp', (512, 512), 'square', 'PLACEHOLDER guard-vanhelsing-west-profile'),
 ],
 'z3d-cases': [   # T7b/3 - Rae R2 part C sec. 3 (groups L + G). NO religious symbols, NO child in any picture.
  ('z3-events/soul-soup-cook-west.webp', (1254, 1254), 'sprite', 'PLACEHOLDER soul-soup-cook-west (relative 6 version B: middle-aged woman, faded apron with stains, holding a worn wooden ladle in both hands, red eyes from stove smoke; NO child, NO sick person)'),
  ('z3-events/soul-redhood-west.webp', (1254, 1254), 'sprite', 'PLACEHOLDER soul-redhood-west (G1: elderly woman, white hair tied low, faded thin red headcloth, old wicker basket with an empty bottom, calm face, eyes still on a forest path; NO wolf, NO child)'),
  ('z3-events/soul-redhood-west-profile.webp', (1254, 1254), 'square', 'PLACEHOLDER soul-redhood-west-profile'),
  ('z3-events/soul-witch-bread-west.webp', (1254, 1254), 'sprite', 'PLACEHOLDER soul-witch-bread-west (G2: hunched old woman, apron smudged with flour and burnt sugar, thick dry palms, reddened tired eyes; NO prominent nose, NO broom, NO pointed hat, NO child, NO cage with a child, NO oven with a person)'),
  ('z3-events/soul-witch-bread-west-profile.webp', (1254, 1254), 'square', 'PLACEHOLDER soul-witch-bread-west-profile'),
  ('z3-events/soul-loki-priest-west.webp', (1254, 1254), 'sprite', 'PLACEHOLDER soul-loki-priest-west (L1: middle-aged man in a plain black robe too clean to be real, hair combed smooth, gentle smile, hands folded, pale green eyes, a floor shadow that does not match his pose (it laughs); NO cross, NO religious symbol, NO comic priest)'),
  ('z3-events/soul-loki-priest-west-profile.webp', (1254, 1254), 'square', 'PLACEHOLDER soul-loki-priest-west-profile'),
  ('z3-events/boss-loki-west.webp', (512, 512), 'sprite', 'PLACEHOLDER boss-loki-west (L2: smooth black hair, pale green eyes, dark green coat embroidered with silver thread, sly but not cruel smile, three shadows standing around him; NO horned helmet, one man not a demon)'),
  ('z3-events/boss-loki-west-profile.webp', (512, 512), 'square', 'PLACEHOLDER boss-loki-west-profile'),
  ('z3-events/cut-loki-shadows-west.webp', CUT, 'cut', 'PLACEHOLDER cut-loki-shadows-west  (card of the boss move Three Shadows: Loki\'s shadow splits into three that circle the team; no weapon in the shadows\' hands)'),
  ('z3-events/cut-loki-reveal-west.webp', CUT, 'cut', 'PLACEHOLDER cut-loki-reveal-west  (L3: the Zone 3 judgment hall, the shadow on the floor stands up apart from the man on the dais, the black robe falls away as thin cloth, under it Loki in the green silver-embroidered coat; Yama + Nira step back at the left; NO religious symbol)'),
 ],
 'z3e-eirlin': [   # T7b/4 - Rae R2 part C sec. 4 (group E). icon-eirlin / battle-eirlin are cut from her own drawing boss-tester-west (Rae E1 allows it) - not generated here
  ('z3-events/cut-eirlin-crate-west.webp', CUT, 'cut', 'PLACEHOLDER cut-eirlin-crate-west  (E2: the stone square just clear of mist, a long wooden crate open on the ground, blue-white light from spears laid in rows, Eirlin touches a spear tip over the lamp at Yama\'s side, one white feather drifting in a corner; NO religious symbol)'),
  ('summon/cut-eirlin-spear-call.webp', CUT, 'cut', 'PLACEHOLDER cut-eirlin-spear-call  (E3: Eirlin dives from the sky with a blue-white spear into ONE foe in the middle, wings fully spread, a spiral of snow around the spear, a Zone 3 hell battlefield)'),
 ],
 'z3f-severin': [   # T7b-2/5 - Rae R2 part C sec. 5 (groups J + H + the old z3 list #6 #14). icon/battle-jormungandr are cut from his own drawing boss-jormungandr-west (Rae J1 allows it) - not generated here
  ('z3-events/cut-sev-jorm-arrive-west.webp', CUT, 'cut', 'PLACEHOLDER cut-sev-jorm-arrive-west  (z3-sev-open: Severin in silver armour with blue skulls on the right-hand pier holding a thick ledger, the river of souls rising behind him, the tail of the world-serpent high above the water; Yama + Nira very small at the lower left)'),
  ('z3-events/cut-jorm-yields-west.webp', CUT, 'cut', 'PLACEHOLDER cut-jorm-yields-west  (z3-jorm-yields: the serpent loosens its coils and sinks, the tail tip free of the water, Severin opens his ledger with a surprised face, Yama + Nira at the pier)'),
  ('z3-events/cut-sev-collateral-west.webp', CUT, 'cut', 'PLACEHOLDER cut-sev-collateral-west  (J2: the right-hand harbour in day snow, the water lifts, a pale yellow serpent eye looks down, Severin stands holding the ledger and looks at it still, one blue-grey scale glows and drifts across the water into the lamp at Yama\'s side, Nira beside Yama)'),
  ('summon/cut-jorm-coil-world.webp', CUT, 'cut', 'PLACEHOLDER cut-jorm-coil-world  (J3: blue-grey coils rise from the battlefield and ring the foes in one loop - only the coils and a pale yellow eye at the edge, NOT the whole serpent striking anyone; Zone 3 hell battlefield)'),
  ('z3-events/char-home67.webp', (512, 512), 'sprite', 'PLACEHOLDER char-home67 (H1: slender man, long silver-grey coat, low cap with a thin band of blue light round the brim, holding a thin clear glass pane with glowing figures running in rows, relaxed stance with quick eyes, high-tech but plain; NOT a deerstalker, NO pipe, copied from no existing film or series)'),
  ('z3-events/char-home67-profile.webp', (512, 512), 'square', 'PLACEHOLDER char-home67-profile'),
  ('z3-events/cut-home67-pier-west.webp', CUT, 'cut', 'PLACEHOLDER cut-home67-pier-west  (H2: the Western pier in thin snow, HOME-67 leaning on a pier post holding the glass pane of glowing figures and looking at Nira who stands beside Yama; Severin\'s flagless merchant ship far away at the edge; one image for z3-home67-intro (2 pages) + z3-home67-join)'),
 ],
 'z3g-kin': [   # T7c/6 - the six relatives' souls (Rae part C sec. 8 #7-#11, #20 soul-soup-cook-west). No child in any picture, no religious symbol.
  ('z3-events/soul-false-judge-west.webp', (1254, 1254), 'sprite', 'PLACEHOLDER soul-false-judge-west (relative 1: former judge in a charcoal-grey robe, straight back, clutching a rolled writ he dares not put down)'),
  ('z3-events/soul-false-judge-west-profile.webp', (1254, 1254), 'square', 'PLACEHOLDER soul-false-judge-west-profile'),
  ('z3-events/soul-younger-brother-west.webp', (1254, 1254), 'sprite', 'PLACEHOLDER soul-younger-brother-west (relative 2: tall thin young man, soot on his fingertips, leaning left as if someone walks beside him; an adult, not a child)'),
  ('z3-events/soul-younger-brother-west-profile.webp', (1254, 1254), 'square', 'PLACEHOLDER soul-younger-brother-west-profile'),
  ('z3-events/soul-prophecy-client-west.webp', (1254, 1254), 'sprite', 'PLACEHOLDER soul-prophecy-client-west (relative 3: head of a merchant family in an old fur coat, red eyes, a small ship ledger gripped tight)'),
  ('z3-events/soul-prophecy-client-west-profile.webp', (1254, 1254), 'square', 'PLACEHOLDER soul-prophecy-client-west-profile'),
  ('z3-events/soul-carer-daughter-west.webp', (1254, 1254), 'sprite', 'PLACEHOLDER soul-carer-daughter-west (relative 4: neat woman, coat buttoned wrong, a bunch of wilted flowers)'),
  ('z3-events/soul-carer-daughter-west-profile.webp', (1254, 1254), 'square', 'PLACEHOLDER soul-carer-daughter-west-profile'),
  ('z3-events/soul-gate-sentry-west.webp', (1254, 1254), 'sprite', 'PLACEHOLDER soul-gate-sentry-west (relative 5: old leather-armoured gate sentry, right hand clenched round a big iron key, eyes on the gate)'),
  ('z3-events/soul-gate-sentry-west-profile.webp', (1254, 1254), 'square', 'PLACEHOLDER soul-gate-sentry-west-profile'),
  ('z3-events/soul-soup-cook-west-profile.webp', (1254, 1254), 'square', 'PLACEHOLDER soul-soup-cook-west-profile'),
 ],
 'z4a': [   # T8a - Rae R2 part D sec. 1-2 (groups COL C1 C2 + Z1 Z3). The bout pictures / Zone 4 souls are added by the later T8a items.
  ('z4-events/cut-z34-arrive.webp', CUT, 'cut', 'PLACEHOLDER cut-z34-arrive  (C1: iron-grey mouth of the Frontier 3-4 cave, the hell merchant at a small stall, name-plaques of fighters hung in rows on the walls, Yama (Zone 3 robes) + Nira + HOME-67 stepping in under the high ceiling)'),
  ('z4-events/cut-col-gate.webp', CUT, 'cut', 'PLACEHOLDER cut-col-gate  (C2: round stone arena with tiered stands, silent shades of spectators, Lucifer: long silver hair, black coat with gold trim, NO horns, NO wings, a straight staff, on a high balcony; NO religious symbol; NO piano / nightclub / suit)'),
  ('z4-events/cut-col-s9.webp', CUT, 'cut', 'PLACEHOLDER cut-col-s9  (bout 9: Thor raises the thunder-hammer, lightning running along the shaft; plain clothes, NOT a red cape; arena stands behind)'),
  ('z4-events/cut-col-s10.webp', CUT, 'cut', 'PLACEHOLDER cut-col-s10  (bout 10: Lucifer points the end of his staff, a curtain of light closing over the arena; NO horns, NO wings, NO religious symbol)'),
  ('z4-events/cut-z4-arrive.webp', CUT, 'cut', 'PLACEHOLDER cut-z4-arrive  (Z1: an iron city, every window with blue-green light in rows, empty streets, a harbour with no ship, Yama + Nira + HOME-67 walking; two golden cages of light in the northern square with Sysop and the hell merchant inside)'),
  ('z4-events/cut-home67-harbor-gift.webp', CUT, 'cut', 'PLACEHOLDER cut-home67-harbor-gift  (Z3: the Zone 4 harbour, HOME-67 leaning on a post hands Yama a silver-grey bundle edged with thin blue light, Nira standing beside)'),
 ],
 'wanthong': [
  ('z1-events/soul-wanthong-th.webp', (1254, 1254), 'sprite', 'PLACEHOLDER soul-wanthong-th (Lady Wanthong, court sprite)'),
  ('z1-events/soul-wanthong-th-profile.webp', (1254, 1254), 'square', 'PLACEHOLDER soul-wanthong-th-profile'),
  ('z1-events/boss-khunphaen-th.webp', (512, 512), 'sprite', 'PLACEHOLDER boss-khunphaen-th (Khun Phaen)'),
  ('z1-events/boss-khunphaen-th-profile.webp', (512, 512), 'square', 'PLACEHOLDER boss-khunphaen-th-profile'),
  ('z1-events/cut-khunphaen-arrives-th.webp', CUT, 'cut', 'PLACEHOLDER cut-khunphaen-arrives-th  (C3: doors kicked open, mist-grey horse outside)'),
  ('z1-events/cut-khunphaen-yields-th.webp', CUT, 'cut', 'PLACEHOLDER cut-khunphaen-yields-th  (C4: Khun Phaen on one knee, Wanthong stands between)'),
  ('z1-events/cut-khunphaen-gift-th.webp', CUT, 'cut', 'PLACEHOLDER cut-khunphaen-gift-th  (C5: the bow, boy with topknot - no baby)'),
  ('summon/kuman-thong.webp', (512, 512), 'sprite', 'PLACEHOLDER kuman-thong (C6 full figure)'),
  ('summon/kuman-thong-icon.webp', (512, 512), 'square', 'PLACEHOLDER kuman-thong-icon'),
  ('summon/kuman-thong-battle.webp', (512, 512), 'sprite', 'PLACEHOLDER kuman-thong-battle'),
  ('summon/cut-kuman-golden-aegis.webp', CUT, 'cut', 'PLACEHOLDER cut-kuman-golden-aegis  (C7: golden dome over the team)'),
 ],
}

# T8a/2 - the ten colosseum bouts (Rae R2 part D sec. 11 group COL C3-C32 + SUM S4 S5): sprite + profile per bout, a card per bout 1-8 (9 and 10 are in group z4a), the two big move cards. icon / battle of Thor and Lucifer are cut from col-s9 / col-s10 (Rae S1 S2 allow it).
_BOUT = ['the masterless samurai (plain old clothes, NOT Musashi)', 'the plain ninja (plain black, no named cartoon ninja)', 'Nai Khanom Tom the Muay Thai fighter (old boxing shorts, prajioud armbands, NO mongkol on the head during the bout; a wai-khru picture may hold or set the mongkol in a corner; sacred objects: never dropped, never mocked)',
         'the Minotaur keeper of the maze (half man half bull, leather armour)', 'Medusa (small snakes for hair, eyes half closed, sorrowful, not evil)', 'Captain Silverwave the pirate', 'the visitor from an old star (translucent person-shape, NOT a xenomorph)',
         'C-8, the Steel Colossus (a big robot, no named anime / film robot)', 'Thor (plain clothes, NOT a red cape, thunder-hammer)', 'Lucifer (silver hair, NO horns, NO wings, NO religious symbol, a straight staff)']
_CARD = ['One-Draw Flash: the samurai draws one single flash of light', 'Shadow Behind the Curtain: the ninja leaps from behind a curtain of shadow', 'Reverse Elbow: the elbow strike (the wai khru bow in a corner of the picture)', 'Labyrinth Charge: the Minotaur charging',
         'Gaze of Stone: a silver-blue light from the eyes (never show anyone turning to stone)', 'Broadside: the cannon with white smoke', 'Scanning Beam: a beam sweeping the team', 'Iron Fist From Above: the steel fist coming down']
GROUPS['z4b'] = []
for _i in range(10):
    GROUPS['z4b'] += [(f'z4-events/col-s{_i + 1}.webp', (512, 512), 'sprite', f'PLACEHOLDER col-s{_i + 1} (bout {_i + 1}: {_BOUT[_i]}; standing)'), (f'z4-events/col-s{_i + 1}-profile.webp', (512, 512), 'square', f'PLACEHOLDER col-s{_i + 1}-profile')]
for _i in range(8):
    GROUPS['z4b'].append((f'z4-events/cut-col-s{_i + 1}.webp', CUT, 'cut', f'PLACEHOLDER cut-col-s{_i + 1}  (bout {_i + 1} move card - {_CARD[_i]}; no blood)'))
GROUPS['z4b'] += [('summon/cut-thor-hammer-rules.webp', CUT, 'cut', 'PLACEHOLDER cut-thor-hammer-rules  (S4: Thor raises the hammer over the field, lightning in a ring around the foes)'), ('summon/cut-lucifer-decree.webp', CUT, 'cut', 'PLACEHOLDER cut-lucifer-decree  (S5: the staff points at ONE foe, glowing rule-lines (no real letters) float round it; no horns, no religious symbol)')]
# T8b - Rae R2 part D sec. 11 groups Z (souls Z5-Z8), W (WATSON-03), R (AI Scammer Robot), L (Lupin). Souls = 1254 sprite + square profile; no blood, no child, no religious symbol.
GROUPS['z4c1'] = [
  ('z4-events/soul-aiscam-cyber.webp', (1254, 1254), 'sprite', 'PLACEHOLDER soul-aiscam-cyber (Z5: retired teacher, 72, white hair combed flat, black-framed glasses, pressed shirt with the second button missing, an old phone gripped in one hand)'),
  ('z4-events/soul-aiscam-cyber-profile.webp', (1254, 1254), 'square', 'PLACEHOLDER soul-aiscam-cyber-profile'),
]
GROUPS['z4c2'] = [   # T8b/2 - Rae sec. 11 group W: WATSON-03 (a robot, tall slender silver-grey, double-lens eyes, a thin log-plate on the left forearm; NO hat, NO pipe, no film / series robot or detective) + the assist cut
  ('z4-events/guard-watson03.webp', (512, 512), 'sprite', 'PLACEHOLDER guard-watson03 (W1: tall slender silver-grey robot, double-lensed eyes, a thin log-plate on the left forearm with glowing characters scrolling up, upright but loose shoulders; NO detective hat, NO pipe)'),
  ('z4-events/guard-watson03-profile.webp', (512, 512), 'square', 'PLACEHOLDER guard-watson03-profile'),
  ('z4-events/cut-wat-assist.webp', CUT, 'cut', 'PLACEHOLDER cut-wat-assist  (W2: the lower frontier of Zone 4, the demonic wooden horse in the middle with its belly hatch open, four rows of demons frozen behind it, WATSON-03 stepping out of a metal door at the roadside, HOME-67 pointing at his glass pane, Yama and Nira on the left)'),
]
GROUPS['z4c3'] = [   # T8b/4 - Rae sec. 11 Z6 / Z7 (cases 8 and 9: adults, no blood, no religious symbol)
  ('z4-events/soul-singer-cyber.webp', (1254, 1254), 'sprite', 'PLACEHOLDER soul-singer-cyber (Z6: Cypher\'s elder sister, a woman of fifty, short plain hair, no make-up, holding an old microphone as if it were a doll)'),
  ('z4-events/soul-singer-cyber-profile.webp', (1254, 1254), 'square', 'PLACEHOLDER soul-singer-cyber-profile'),
  ('z4-events/soul-archivist-cyber.webp', (1254, 1254), 'sprite', 'PLACEHOLDER soul-archivist-cyber (Z7: Buffer\'s uncle, a man of sixty in dust-stained white cotton gloves, a large ring of keys)'),
  ('z4-events/soul-archivist-cyber-profile.webp', (1254, 1254), 'square', 'PLACEHOLDER soul-archivist-cyber-profile'),
]
GROUPS['z4c4'] = [   # T8b/3 - Rae sec. 11 Z8 (WATSON-03's quest: an adult, no blood)
  ('z4-events/soul-admin-cyber.webp', (1254, 1254), 'sprite', 'PLACEHOLDER soul-admin-cyber (Z8: the former administrator, a man of fifty in thick glasses holding a long-cold cup of coffee in both hands)'),
  ('z4-events/soul-admin-cyber-profile.webp', (1254, 1254), 'square', 'PLACEHOLDER soul-admin-cyber-profile'),
]
GROUPS['z4c5'] = [   # T8b/5 - Rae sec. 11 group R: the record hall seized (R2). R1 (a polite round white robot) is NOT drawn here: the game uses the existing drawn PHANTOM-404 (owner 15 Nov) - see the report.
  ('z4-events/cut-reveal-name.webp', CUT, 'cut', 'PLACEHOLDER cut-reveal-name  (R2: the record hall, tall cabinets sealed with mint-green sheets of light, the AI Scammer Robot in the middle, HOME-67 pointing, Yama stepping in front of him, a green beam hitting Yama\'s chest, Nira lifting her file and WATSON-03 lifting his log-plate like shields)'),
]
def font(size):
    for f in ('/System/Library/Fonts/Supplemental/Arial.ttf', '/System/Library/Fonts/Helvetica.ttc'):
        try: return ImageFont.truetype(f, size)
        except Exception: pass
    return ImageFont.load_default()
def wrap(d, text, f, width):
    words, lines, cur = text.split(' '), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=f) <= width: cur = t
        else: lines.append(cur); cur = w
    return lines + [cur]
def make(path, size, kind, label):
    w, h = size
    im = Image.new('RGBA' if kind == 'sprite' else 'RGB', size, (0, 0, 0, 0) if kind == 'sprite' else (24, 14, 20)); d = ImageDraw.Draw(im)
    m = max(6, w // 100)
    if kind == 'sprite':     # a simple standing figure on transparent: head + body + feet at the bottom edge (the real sprite stands on the bottom edge too)
        cx = w // 2; d.ellipse([cx - w * .12, h * .06, cx + w * .12, h * .06 + w * .24], fill=(120, 96, 64, 235), outline=(255, 224, 164, 255), width=m // 2 + 1)
        d.rounded_rectangle([cx - w * .2, h * .06 + w * .22, cx + w * .2, h * .97], radius=w * .05, fill=(90, 66, 52, 235), outline=(255, 224, 164, 255), width=m // 2 + 1)
        box = [m, h * .45, w - m, h * .45 + h * .22]
    else:
        d.rectangle([m, m, w - m - 1, h - m - 1], outline=(167, 129, 67), width=max(3, m // 2))
        d.line([m, m, w - m - 1, h - m - 1], fill=(60, 40, 48), width=2); d.line([w - m - 1, m, m, h - m - 1], fill=(60, 40, 48), width=2)
        box = [m * 2, h * .5 - h * .09, w - m * 2, h * .5 + h * .09]
    d.rectangle(box, fill=(24, 14, 20, 255)); f = font(max(12, int(w * (.022 if kind == 'cut' else .05))))
    y = box[1] + 8
    for line in wrap(d, f'{label}  {w}x{h}', f, box[2] - box[0] - 16):
        d.text((box[0] + 8, y), line, fill=(255, 224, 164, 255), font=f); y += f.size + 4
    out = ROOT / path; out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, 'WEBP', quality=78); print(path, im.size)
for g in sys.argv[1:]:
    for path, size, kind, label in GROUPS[g]:
        if (ROOT / path).exists(): print('keeps', path); continue
        make(path, size, kind, label)
