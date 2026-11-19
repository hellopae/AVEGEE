#!/usr/bin/env python3
"""Append -<tag> to the ?v= id of the importmap targets of the given src files in index.html (so a browser that cached the old module fetches the new one).
  python3 scripts/bump-cache-id.py t6b game ui art      (names without src/ and .js; a file that is not in the importmap is reported and skipped)"""
import re, sys
from pathlib import Path
tag, names = sys.argv[1], sys.argv[2:]
root = Path(__file__).resolve().parent.parent
pages = [p for p in root.glob('*.html')]
for page in pages:
    s = page.read_text(encoding='utf-8'); changed = False
    for n in names:
        m = re.search(r': "\./src/' + re.escape(n) + r'\.js\?v=([^"]+)"', s)
        if not m: continue
        old = m.group(1)
        if old.endswith('-' + tag): continue
        s2 = s.replace(f'src/{n}.js?v={old}"', f'src/{n}.js?v={old}-{tag}"'); print(page.name, 'bumped', n, s.count(f'src/{n}.js?v={old}"')); s = s2; changed = True
    if changed: page.write_text(s, encoding='utf-8')
