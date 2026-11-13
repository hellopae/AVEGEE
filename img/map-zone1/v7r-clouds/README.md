Codex Z1-V7-CLOUDS sea-mist layers (docs/art-reviews/2026-11-05-z1v7-clouds, run 20261111T024557Z-ac27b779).

Byte for byte from Codex: layer-A / layer-B (20 RGBA webp chunks each on the 2048 px grid of the 9830 x 6554 master), clouds.json, puffs/puff-01..08.png.
Derived by scripts/build-cloud-mix-assets.py (never shown, never recoloured): mask-q.png + mask-q.json (Codex's cloud mask, 4x smaller, clip for the puffs), clouds-bounds.json (per chunk, the box that holds any cloud: a speed-up).

Default since 13 Nov: the MIX (src/town-clouds-codex.js): Codex's layers are the paint of the cloud pieces of the flow shader (it slides them along the cloud flow field, A/B cross-fade),
drawn directly under the shader where it has no cloud piece, and the 8 puffs drift slowly on top.  ?clouds=shader = the original shader clouds, ?clouds=codex = Codex laid over them.
