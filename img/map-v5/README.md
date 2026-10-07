# Map review artwork v5

36 transparent station sprites: nine keys (`dab`, `ngiw`, `krata`, `frontier`, `sawan`, `tarang`, `lan`, `krajok`, `sala`) for `th`, `asia`, `west`, `cyberhell`.

Generated with built-in imagegen from the existing zone art and the owner’s annotated Zone 1 map, then technically cropped/exported to lossless WebP by `scripts/export-map-v5.py`. Exact prompts are in `prompts.json`. Local source PNGs are in ignored `img/raw/map-v5/`.

`src/map-art-v5.js` resolves sprites and scales to visual bounds without moving station service coordinates. The West prison is mirrored for the requested left-facing perspective. Tea/lokan and map/arena/frontier backgrounds retain v4 artwork. `src/scene.js` draws the lowered ferry behind buildings and repaints a clipped bridge/island foreground over it.

Details and validation: `docs/map-art-review-2026-10-07.md`.
