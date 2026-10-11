# Corrected Yama sword slash — four outfits

Created with the built-in imagegen tool. Final prompts: [prompts.json](prompts.json). Each outfit portrait supplies identity/clothing; the new Thai sequence supplies the shared choreography for the other three outfits.

The first version reversed blade direction during the strike and changed the hand extension too much. This revision uses one arc: ready → windup → overhead → downward swing → horizontal contact → low follow-through → hold low → recover. A blade trail makes the sweep readable. The follow-through keeps the blade low instead of lifting it into another apparent strike.

| Outfit | Runtime atlas | Aligned transparent PNG sheet |
|---|---|---|
| สุวรรณภูมิ | hero-yama-th-sword.webp | [th-aligned.png](../raw/yama-sword-v2/th-aligned.png) |
| บูรพา | hero-yama-asia-sword.webp | [asia-aligned.png](../raw/yama-sword-v2/asia-aligned.png) |
| ปัจฉิม | hero-yama-west-sword.webp | [west-aligned.png](../raw/yama-sword-v2/west-aligned.png) |
| นรกเครือข่าย | hero-yama-cyberhell-sword.webp | [cyberhell-aligned.png](../raw/yama-sword-v2/cyberhell-aligned.png) |

Runtime: eight 640 × 640 frames in a 5120 × 640 lossless WebP atlas. Feet are aligned at (240, 570); body height is measured separately for each outfit. The PNG layout is 4 × 2. Export only isolates and aligns generated pixels; it does not draw replacement artwork.

Runtime timing: 85 / 80 / 60 / 35 / 40 / 80 / 100 / 100 ms = 580 ms. Contact occurs at 260 ms, during the existing lunge's forward hold. Preview timing adds a pause in the ready pose so each separate swing is clear. The same frames are used for ordinary battle attacks and sword training. Previous files remain available for comparison but are excluded from preloading.

Re-export: `python3 scripts/export-yama-sword-v2.py` (Pillow, NumPy, SciPy). Source PNGs: `img/raw/yama-sword-v2/`. Metadata: `src/yama-sword-v2-assets.js`.
