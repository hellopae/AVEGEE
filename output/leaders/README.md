# Regional rulers and the final battle

Open `preview.html` for the canonical four seated heads, possessed combat sprites and the separate final inspector. Image generation used the built-in image_gen tool; prompts, references and saved destinations are in `prompts.json`.

- Zone 1: existing father design; new standing possession sprite.
- Zone 2: existing `img/Asia/hero-boss-asia.png` Chinese ruler; new standing possession sprite.
- Zone 3: completed the unused `img/raw/West/_hero-boss-west.png` Viking ruler draft into `img/West/hero-boss-west.png`.
- Zone 4: new silver-haired circuit-robed ruler in `img/CyberHell/hero-boss-cyberhell.png`, separate from `zone-boss-cyberhell.png`.

All six generated sprite assets preserve actual transparent alpha. The two new seated sprites are registered in the zone preload manifest, so the throne and warnings display each local head. Controlled opponents use static possession keys to avoid inheriting the current zone's ruler.

Final sequence: demon waves 1–3; rest; controlled heads in waves 4–7; rest; final inspector in wave 8. Rest supports health chests, merchant purchases and Nira party changes. Animation callbacks cannot skip a rest; the player must click Continue. Heads recover after the four fights.

Four revised panels are `img/story-cyberhell-02-v2.png`, `img/story-cyberhell-03-v3.png`, `img/story-ending-01-v4.png`, `img/story-ending-02-v3.png`. The ending keeps young Yama without a staff, looking toward the defeated enemy. The peaceful panorama shows Yama, Nira and all four heads. Old image versions remain intact.

Validation: 177 Node tests passed, including the complete eight-wave victory, explicit rest continuation, healing, merchant purchases, team changes, final unlock/save and all asset references. Test output: `test-results.txt`. Browser verification checked the real rest UI, medicine use, purchases, party selection, return to rest, the correct father's possession sprite, the second rest screen, and the final inspector in wave 8.
