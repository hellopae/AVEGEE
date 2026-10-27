# L3: frozen town and border 2–3

Use the existing procedural pipeline. No Shado replacement was selected.

- Zone3 now loads `img/map-zone3/v1/flow-v1.png` (about77KB), using the
  existing capped flow engine. Regenerate with
  `python3 scripts/bake-zone2-flow.py --zone west --debug /tmp/west-flow`.
  Registered channel paths are shared where aligned, with the former lava
  channels treated entirely as cyan water. Colour/corridor masks exclude
  blue snow shadows and the actual West walkable floor. Kinds4/5 only; no lava.
- Frozen/cyber towns no longer run the warm-canopy leaf pass or the extra
  hardcoded Zone1 eastern snow-plateau pass. Their existing sky weather remains.
  Zones1/2 retain their original local leaves and eastern snow.
- Border2–3 has8 authored waterfall strokes,26 drifting leaves confined to
  the warm left44%, and48 snowflakes in the cold right52%. The intermediate
  transition strip is clear. Reduced motion skips these moving accents.
- Border1–2 keeps its prior data/renderer defaults; route geometry, walk masks,
  NPCs, checkpoints, combat and scene layout are unchanged. Border3–4 and
  Town4 remain disabled pending their owner masks.

The masks and biome boundaries are visual data, not collision changes. Tests
guard actual floor exclusion, bridge samples, particle budgets and weather
separation. Physical mobile performance and OS preference acceptance remain
separate from desktop/iframe fixtures.
