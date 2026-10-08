# Codex handoff — 8 October 2026: ice rooms and walking

Completed the owner's screenshots 1–4 and recordings 5–6:
- All four wide lokan rooms now use versioned `*-lokan-ice-v2.webp`: training weights are visibly translucent ice blocks. Original backgrounds retained.
- Raised lokan geometry 35 world units in every zone, including hits and service/worker positions, to clear dab below.
- Krajok exterior maximum size increased from 155×130 to 210×180. CyberHell retains its 1.3 multiplier, moved 20 units left to stay inside the map; fallback hit adjusted.
- Zone travel: Nira follows the same route as Yama at a distance, without the sideways/downward offset. Thai–West and West–CyberHell routes adjusted to painted paths.
- Interior walking now chooses all four actual directions, including mirrored-room handling. Both room and frontier motion normalize screen aspect, cap long frame deltas, reduce speed and tie animation cadence to actual movement and character height. Frontier waypoints no longer stop short and pause on every node.
- Preload catalog uses the new backgrounds with a new cache suffix.

Validation: Node suite 522 tests, 521 passed, 1 skipped, zero failures. Browser visual review of all four exterior layouts and bridge routes. Generated ice backgrounds visually checked. Existing geometry tests updated for intentional coordinates.

Separate pending artwork: owner's new father-acceptance ending request must remain uncommitted until owner reviews. Do not add a story panel yet. Unrelated Exam deletions and files/raw/reference material untouched.
