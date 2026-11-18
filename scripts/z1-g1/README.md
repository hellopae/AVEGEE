# G1 (19 Nov 2026) - how the owner's 8 drawings became numbers

The drawings are screenshots of the real game (2388x1288) with lines drawn on top.  Scratch folder = any dir that holds the files below.

1. `ground_half.png` = the v7r ground tiles pasted at half size (4915x3277 = 1.28 px per world unit).
2. SIFT + `cv2.estimateAffinePartial2D` between each drawing and `ground_half.png` -> `affine.json` (330-1600 inliers per drawing, scale 0.7236 +- 0.002): every drawing pixel is a world point (world = A*p / 1.28).
3. `strokes.py` = the colour classes of the owner's pens (blue frame, green/orange/yellow/cyan/dark-green trees, tan circles = rocks); clean masks, checked by eye.
4. `dump.py` writes `entities.json` (visible alpha box of every station / house / tree sprite in world units, drawn by the game's own rules); `frames.py` + `fit.py` match each blue frame to the sprite it surrounds and print the size factor k.
5. `trees_in.py` = the trees read from the drawings (foot = bottom of the trunk lines, crown width), `treeworld.py` -> world units, `gen.py` -> `src/town-zone1-g1.js`.
6. `reach.mjs` (flood fill of the walk mask before / after: every landmark still reachable), `occl.mjs` (does a new crown cover a door / crew post?).
7. `compare.py` (needs `boot.py`, a static server on :8802 and `affine.json` + `ground_half.png`): puts the real game at the owner's camera, warps it into the drawing's frame -> `NN-owner-vs-game-after.jpg`.  `fps.py desktop|mobile out.jsonl` walks a fixed route and counts frames.
