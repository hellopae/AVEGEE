# Boss stories and playable CyberHell minions

Open `preview.html` to browse all 17 story panels and the three transparent enemy sprites. The page also works directly from disk. `test-playback.html` runs the real game UI with test buttons and suppresses save writes; use a local HTTP server for that page.

- Zone 1, after case 8: two frontier waves ending in the frontier boss unlock Big Fireball.
- Zone 1, after case 10: the elder brother's final attack injures the hero; the hero awakens Flame Charge and wins. Five story panels followed by a power popup.
- Zone 2, after case 10: boss plus two demons; Nira takes the surprise attack, the hero awakens Rage. Five story panels and a power popup. Rage boosts three attacks by 50% and rests for three turns. Nira rests for three world turns; visit her at a finished tea pavilion, or the initial pavilion if tea has not been built yet.
- Zone 3, after case 10: boss plus two demons; victory grants Ice. Two story panels and a power popup.
- Zone 4, after case 10: shield demons, spear demons, hammer demons, a rest stop, the controlled father and the seated rulers of Asia, West and CyberHell, another rest stop, then the hostile CyberHell inspector. Eight combat waves total; story panels run before waves 1, 4 and 8. Both rest stops wait for explicit confirmation to continue, and allow health chests, the merchant and Nira team management. Victory plays two ending panels showing peaceful rule of all four zones.

The CyberHell army appears both in the cutscene and in playable encounters. The three new enemy types are also added to the random frontier and world mob roster for Zone 4. Existing bots, bugs and worms remain in the roster.

Zone 2–4 panels reference their actual map assets: teal skull cave and red lanterns, snowy ice cave, and purple circuit/server cave. Assets are copied unchanged from image generation; transparent sprites preserve their generated alpha.

Image prompts and source paths are in `prompts.json`. Final panels live in `img/story-*.png`; enemy sprites live in `img/CyberHell/mob-cyber-*-cyberhell.png`, with root PNG fallbacks for the initial asset load.

Validation: see ../leaders/test-results.txt for the current full Node suite. Browser checks confirmed next/back/skip and power-popup completion, the Zone 2 map and Nira scene, the Zone 4 opening cutscene, and selectable shield demons in wave 1. Screenshots are `nira-cutscene.png` and `battle-wave-1.png`.

Regional rulers are distinct from hostile inspectors. Head 2 uses the existing hero-boss-asia design; Head 3 uses the unused Viking ruler draft; Head 4 is a new silver-haired circuit-robed king. Their four possession sprites are img/leader-*-possessed.png. Seated Head 3 and 4 are registered in their zone asset manifests. The ruler gallery and generation prompts are in ../leaders/.

The seated West and CyberHell rulers now use compact chibi proportions, with previous sprites retained as `hero-boss-*-v1.png` and new versions as `hero-boss-*-v2.png`. The game uses the updated canonical filenames. `story-cyberhell-02-v3.png` seats all four captives directly on the ground, without chairs. This panel and `story-cyberhell-03-v4.png` use coherent eye-level cavern perspective and receding floor/architecture instead of overhead map backgrounds. The selected story references and galleries use these new versions. Built-in image generation prompts and original generated paths are recorded in `../leaders/perspective-edits.json`.
