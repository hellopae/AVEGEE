# Zone 2 flowing surfaces

The C3 repaint had no flow field, so the shared town renderer left its painted
water and lava still. This change supplies a separately traced field for that
registered repaint and enables the existing bounded N4 engine for Asia.

Generate with `python3 scripts/bake-zone2-flow.py --debug /tmp/zone2-flow-review`.
Dependencies match the existing flow baker: NumPy, OpenCV, SciPy, Pillow, plus
Node for the actual walk-floor exclusion. The baker loads the runtime terrain
tiles, narrows hand-traced corridors by colour, removes the Asia walkable floor
with an additional margin, and erodes the remaining surface. It never edits
terrain art, collision or walkability. No dilation/closing expands a surface.

The existing kind4/kind5 encoding denotes cyan water and downward waterfalls;
it does not add an ice gameplay mechanic. Zone 1 retains its original field;
Zone 3 and disabled Zone 4 remain pending their own traced fields.

The engine also checks the post-step Float32 position before drawing, preventing
one-frame excursions onto a bank in narrow channels. Existing reduced-motion
early return and particle cap420 stay in force. The new data is about47KB.

Shado fire, snow, leaf, sparkle and attack candidates were not selected after
review. This change uses the existing procedural sprites and simulator. Full
L3 biome/scene coverage and physical mobile performance are separate checks.
