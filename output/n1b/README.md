# AVEGEE N1b asset evidence

Changed assets: `img/rooms-wide/{th,asia,cyberhell}-krajok.webp` and `img/krajok-magic-mirror.png`. No game code changed. `west-krajok.webp` remains byte-identical to HEAD.

- `prompts.json`: the four actual prompts sent to built-in `image_gen`, with generation output locations. No CLI/API fallback used.
- `*-source-crop.png`: original local crop supplied to image_gen.
- `*-inpaint.png`: generated patch, normalized to its original 220×176 crop.
- `*-mask.png`: finite feather mask in full-image coordinates (ellipse + Gaussian blur radius 2).
- `*-diff-map.png`: decoded final WebP vs HEAD; orange means changed, black means identical.
- `*-diff-overlay.png`: diff locations over a dimmed original.
- `*-before-after-diff.png`: enlarged crop comparison, left original / middle final / right diff.
- `mirror-generated.png`: original generated transparent sprite, before fitting to the requested canvas.
- `th-mirror-composite-n1b.png` and `th-mirror-contact-n1b.png`: art placement preview; sprite 94×94, bottom-center anchored at background pixel (859,246), on the lotus seat.
- `verification.json`: dimensions, changed pixel bounds and counts, zero changes outside masks, mirror mode/alpha/frame checks, west byte equality, file sizes.

Run from repository root: `python3 output/n1b/build-evidence.py`. Requires Pillow and NumPy. The script reads originals from HEAD, applies local patches only, encodes RGB lossless WebP to preserve decoded pixels elsewhere, then reopens and verifies saved files. `quality=100` controls lossless encoder effort; no lossy re-encoding of the rest of the room. Full-image diff maps include encoding effects, not just an intermediate composite.

The provided worktree does not contain the N1 `krajok-magic-mirror.png` placeholder or its render code. The requested asset is therefore newly added at the specified path. Composite previews demonstrate art contact only; runtime placement and the “วางกระจก” flow were not tested here. No code, cache suffix, branch, deployment, hooks, status.json or worklog.json was changed; no commit or push was run. `-n1b` is used on placement evidence filenames.
