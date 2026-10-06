# Yama ordinary sword slash — 4 outfits

Created with the built-in imagegen tool using each existing Yama outfit as the character reference. Full final prompts: [prompts.json](prompts.json).

| Outfit | Runtime atlas | Aligned PNG sprite sheet |
|---|---|---|
| สุวรรณภูมิ | hero-yama-th-sword.webp | ../raw/yama-sword-v1/th-aligned.png |
| บูรพา | hero-yama-asia-sword.webp | ../raw/yama-sword-v1/asia-aligned.png |
| ปัจฉิม | hero-yama-west-sword.webp | ../raw/yama-sword-v1/west-aligned.png |
| นรกเครือข่าย | hero-yama-cyberhell-sword.webp | ../raw/yama-sword-v1/cyberhell-aligned.png |

Each transparent atlas is 5120 × 640, eight 640 × 640 frames in one row. PNG sheets have the same eight frames in a 4 × 2 grid. Feet anchor (240, 570) is fixed; outfit-specific body height is in `src/yama-sword-assets.js`. Generated source pixels are preserved; the export only isolates frames, aligns feet and packs the atlas.

Frames: ready, windup, overhead preparation, forward slash, contact, follow-through, recovery, ready. Timing: 50 / 60 / 60 / 55 / 75 / 70 / 80 / 130 ms (580 ms total).

Ordinary Yama attacks retain the existing lunge while playing this slash. Other actor attacks and special cutscenes keep their existing behavior. Sword training uses the selected Yama outfit; animation and input freeze when training pauses. Quitting stops its animation loop.

Re-export: `python3 scripts/export-yama-sword.py` (Pillow, NumPy, SciPy). Original generated PNGs are in `img/raw/yama-sword-v1/` and are excluded from game preloading.
