# img/summon — Magic Lamp helpers (T4)

Naming (Rae R2 A, section 11): `icon-<key>.webp` (bag icon) · `battle-<key>.webp` (sprite in the fight) · `cut-<key>-<move>.webp` (special-move cutscene 1672x941, no text in the picture).
A real drawing saved under the same name replaces the placeholder - no code change (paths are in `src/lamp.js` SUMMONERS[k].art).

Placeholders (copies of Kittanate's existing Hanuman art, until Codex draws the real ones):
- `icon-hanuman.webp` = `../z1-events/boss-hanuman-th-profile.webp`
- `battle-hanuman.webp` = `../z1-events/boss-hanuman-th.webp`
- `cut-hanuman-beyond-clouds.webp` = `../z1-events/cut-hanuman-sweep-th.webp`
- `../z1-events/cut-sita-lamp-th.webp` (cutscene `sita-lamp`) = `../z1-events/cut-hanuman-yields-th.webp`

## FB3-EV5 (26 Nov 2026) - summon v2: the lamp cutscene and the helper standing in the team
- `cut-lamp-summon-{th,asia,west,cyberhell}.webp` - the cutscene when Yama lights the Magic Lamp and the chosen helper steps out (one per zone, the same for every helper). 1672x941, opaque, no text in the picture (like every `cut-*`).
  Not drawn yet (Codex C4): until a file exists the game shows `../ui/item-magic-lamp-lit.webp` on a golden card. Saving a drawing under that name is all it takes (`src/lamp.js` `lampCutSources`).
- `battle-<key>.webp` (`kuman-thong-battle.webp` for Kuman Thong) is the sprite that STANDS IN THE TEAM now, so its facing counts: the team faces RIGHT. The game mirrors every ally picture unless the name is in `TEAM_DRAWN_FACING_RIGHT`
  (`src/battle-facing.js`). Judged from the placeholders: drawn facing right = wukong, ryujin, jormungandr, thor, lucifer, lupin, musashi, kumanthong (not mirrored) · hanuman is drawn facing left (mirrored) · eirlin, liangang, yomathat square to the camera.
  A redrawn picture that faces another way -> edit that one set, nothing else.
- Size on the stage: every helper stands at the team's adult height (Kuman Thong, a boy, at Yama's height) - `src/character-scale.js` `SUMMON_SCALE`. Transparent padding is never counted (the visible pixels are measured).
