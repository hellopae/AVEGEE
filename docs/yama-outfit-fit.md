# A7 — Consistent visible outfit size and feet

The 320×480 book atlas cells did not contain equally sized bodies. Idle silhouettes ranged from 307–320 pixels by outfit/direction and their feet were horizontally offset. Dividing all cells by320 made outfit changes visibly change size and stance.

`scripts/art/measure-yama-fit.py` measures alpha>=64 of the shipped images, without modifying artwork. It generates `src/yama-fit.js`; `--write` refreshes metadata and `--report PATH` records source SHA256 hashes and native bounds. It checks236 frames in20 sources: book idle/walk, sword idle, standing and legacy walk for four outfits.

Book height uses the union of the four idle frames per direction. Idle and walking share this fixed scale; each uses a fixed sole-centre/baseline calibration, with walking calibrated from planted poses. No per-frame scale deformation is introduced. Natural airborne foot lifts and stride timing remain. Sword idle and standing/legacy fallback use the same visible-body principle. World coordinates, speed, collision and saves do not change.

Trial idle continues to fit its existing painting body box; battle sprites keep their existing alpha-based fitting. Profile icons, reclining/tea poses and combat-effect silhouettes are not resized as if they were standing bodies. Native/browser evidence records applicable map/room/trial checks separately. Owner visual acceptance remains pending.

Validation: the actual production draw calls are measured against source alpha for64 idle frames at16 outfit/direction combinations, all at the same requested height and foot baseline; median sole centres align. Eight-frame walking keeps fixed scale and anchors throughout each cycle. Twenty-four sword idle frames, standing fallback, animation timing and mirror A6 regressions are covered. No source image changes.
