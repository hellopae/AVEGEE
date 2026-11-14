#!/usr/bin/env python3
"""Z2-EVENTS: copy the fenced js blocks of Rae's zone 2 script verbatim into src/z2-events-text.js (no retyping, so no word can drift).
  python3 scripts/extract-z2-text.py "<path to>/Output/Rae/2026-11-14-avegee-z2-events.md"
Block order is the order in her file: stories (kuroha, wukong, breach, akura, frontier boss scenes, satori, lian, guard test) and the case objects."""
import re, sys
from pathlib import Path
src = Path(sys.argv[1]).read_text(encoding='utf-8')
blocks = [b.rstrip() for b in re.findall(r"```js\n(.*?)```", src, re.S)]
STORY_IDX = [0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 17, 18, 19]
CASES = {'APEELDER': 4, 'AKURA': 13, 'SATORIFATHER': 15, 'DESERTER': 20, 'CHAINCMD': 21, 'FAKECUP': 22, 'A2': 23, 'GRANARYSISTER': 24}
out = ["// Z2-EVENTS - the zone 2 (Eastern branch) story text.",
 "// Source: Output/Rae/2026-11-14-avegee-z2-events.md (Rae, 14 Nov 2026) - the strings below are COPIED VERBATIM from her fenced code blocks by scripts/extract-z2-text.py;",
 "// the owner's decisions of 14 Nov are already folded into her file. Edit a word here and it is the game's word; nothing else in the code holds these sentences.",
 "// NOT yet through chris-culture / Reese (Rae's own note, section 11).", "",
 "/** Wukong cameo in the PHANTOM-404 scene: off by default, same reason as SITA_CAMEO (the story makes no promise yet). */",
 "export const WUKONG_CAMEO = false;", "", "export const Z2_STORIES_RAW = {"]
out += [blocks[i] for i in STORY_IDX]
out.append("};\n")
for name, i in CASES.items(): out.append(f"export const CASE_{name} = {blocks[i].strip()};\n")
(Path(__file__).resolve().parent.parent / 'src' / 'z2-events-text.js').write_text('\n'.join(out), encoding='utf-8')
