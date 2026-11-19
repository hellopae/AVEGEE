#!/usr/bin/env python3
"""Add sprite / profile paths (relative to img/) to img/manifest.json's 'rest' list in place, without re-sorting or touching anything else (make-manifest.py rewrites the whole file).
  python3 scripts/manifest-add.py z2-events/soul-guanyin-father-asia.webp ..."""
import sys, re
from pathlib import Path
p = Path(__file__).resolve().parent.parent / 'img' / 'manifest.json'; s = p.read_text(encoding='utf-8')
for f in sys.argv[1:]:
    if f'"{f}"' in s: print('already', f); continue
    m = re.search(r'("rest": \[\n(?:"[^"\n]+",\n)*)("[^"\n]+")(\n\])', s)
    if not m: raise SystemExit('rest list not found')
    s = s[:m.end(2)] + f',\n"{f}"' + s[m.end(2):]; print('added', f)
p.write_text(s, encoding='utf-8')
