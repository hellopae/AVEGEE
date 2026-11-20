#!/usr/bin/env python3
"""T9: put Rae's English of the old signal scenes (Output/Rae/2026-11-20-avegee-todo-strings.md, heading D1-D6) into SIGNAL_STORIES in src/e1-content.js
as `en:{title}` on the scene and `en:{title,line}` on each page (story.js localizeStory reads them). The Thai is NOT touched; every row is checked
against the Thai that is already in the file (an assert fails loudly when a row does not match), and the English is copied from the table, never retyped.
  python3 scripts/extract-rae-t9-signal-en.py "<Output/Rae/2026-11-20-avegee-todo-strings.md>"
Two lines are replaced by Reese's fix (2.1: "shall not pass" is a famous film line) - see REESE below. Re-running is safe (en is overwritten)."""
import sys, re, json
from pathlib import Path
RAE = Path(sys.argv[1]).read_text(encoding='utf-8').split('\n')
TARGET = Path(__file__).resolve().parent.parent / 'src' / 'e1-content.js'
REESE = {  # Output/Reese/2026-11-20-avegee-todo-strings-factcheck.md 2.1
    'Tanthasura: "Block ... every ... road ... little ... squirt ... you ... shall ... not ... pass."': 'Tanthasura: "Block ... every ... road ... little ... squirt ... you ... cannot ... pass."',
    'Akura: "Chain ... every ... road ... outsiders ... shall not ... pass."': 'Akura: "Chain ... every ... road ... outsiders ... may ... not ... pass."',
}
L = TARGET.read_text(encoding='utf-8').split('\n')
a = next(i for i, l in enumerate(L) if l.startswith('export const SIGNAL_STORIES = {')); b = next(i for i in range(a, len(L)) if L[i] == '};')
prefix = 'export const SIGNAL_STORIES = '
data = json.loads('\n'.join(L[a:b + 1])[len(prefix):-1])
start = next(i for i, l in enumerate(RAE) if l.startswith('## D. ')); end = next(i for i in range(start, len(RAE)) if RAE[i].startswith('หมายเหตุหัว D'))
scene = None; done = 0; replaced = 0
for l in RAE[start:end]:
    if l.startswith('### D'):
        ks = re.findall(r'`([^`]+)`', l); scene = ks[0] if len(ks) == 1 else None; continue
    if not l.startswith('| '): continue
    cells = l[2:-2].split(' | ')
    if len(cells) != 4 or not cells[1].strip(): continue
    nums, level, th, en = [c.strip() for c in cells]
    m = re.match(r'(ชื่อซีน / ชื่อหน้า|ชื่อซีน|ชื่อหน้า|เนื้อหน้า|เนื้อ)\s*(\d+)?', level)
    if not m: continue
    kind, n = m.group(1), m.group(2)
    paren = re.search(r'`([^`]+)`', level)
    if paren: scene = 'signal-' + paren.group(1)
    assert scene in data, (scene, l[:60]); s = data[scene]; pi = int(n) - 1 if n else 0
    if kind == 'ชื่อซีน':
        assert s['title'] == th, (scene, th); s.setdefault('en', {})['title'] = en
    elif kind == 'ชื่อซีน / ชื่อหน้า':
        assert s['title'] == th and s['pages'][0]['title'] == th, (scene, th)
        s.setdefault('en', {})['title'] = en; s['pages'][0].setdefault('en', {})['title'] = en
    elif kind == 'ชื่อหน้า':
        assert s['pages'][pi]['title'] == th, (scene, pi, th); s['pages'][pi].setdefault('en', {})['title'] = en
    else:   # a page's text: Thai cell = the lines joined by " / ", English cell = each line in backticks joined by " / "
        assert th == s['pages'][pi]['line'].replace('\n', ' / '), (scene, pi, th[:50])
        parts = re.findall(r'`([^`]*)`', en); assert parts and ' / '.join('`' + p + '`' for p in parts) == en, (scene, pi, en[:50])
        assert len(parts) == len(s['pages'][pi]['line'].split('\n')), (scene, pi, 'line count')
        for i, p in enumerate(parts):
            if p in REESE: parts[i] = REESE[p]; replaced += 1
        s['pages'][pi].setdefault('en', {})['line'] = '\n'.join(parts)
    done += 1
assert replaced == 2, replaced
# every scene touched here must have English on the scene and the page titles; cyber-signal-win page 2 is Rae's R2 page (it replaces this one in z4g-return.js) so it gets none
for k, s in data.items():
    assert 'title' in s.get('en', {}), k
    for i, p in enumerate(s['pages']):
        if k == 'cyber-signal-win' and i == 1: assert 'en' not in p; continue
        assert 'title' in p.get('en', {}) and 'line' in p.get('en', {}), (k, i)
# keep the key order title, en, pages (readable); pages: title, line, image, en
for k, s in data.items():
    data[k] = { 'title':s['title'], 'en':s['en'], 'pages':s['pages'] }
L[a:b + 1] = (prefix + json.dumps(data, ensure_ascii=False, indent=2) + ';').split('\n')
TARGET.write_text('\n'.join(L), encoding='utf-8')
print('ok rows', done, 'reese fixes', replaced)
