# img/fx — battle effect textures (M2)

Drop `fx-<group>-<name>.webp` files here to replace the built-in gradient stand-ins. **No code change needed** — the game tries
`img/fx/<key>.webp` for every key in `src/battle-fx-tex.js` (`TEX`) and falls back to the stand-in when the file is missing.

- Names, sizes, backgrounds (BLK = pure black for `lighter` blending, ALPHA = transparent), atlas cell counts: `docs/battle-fx-art-spec-2026-10-16.md`
- The code never recolors or filters these files; colour variants are separate keys.
- Preview every effect on the real battle background: open `output/battle-fx-lab/index.html` through a local server (`python3 -m http.server 8777`, then
  `/output/battle-fx-lab/index.html`) and press the buttons.
