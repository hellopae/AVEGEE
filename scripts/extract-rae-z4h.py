#!/usr/bin/env python3
"""T8d: copy the scenes, windows, lines and tables of Rae's part D, section 8 (case 15 - the final battle: 3 waves, reinforcements, the four possessed lords, Archon-Zero, the dais and the ending)
VERBATIM into src/z4h-raw.js - never retyped.
  python3 scripts/extract-rae-z4h.py "<Output/Rae/2026-11-19-avegee-r2d-zone4-end.md>"
Parsed by shape (js blocks as they are; windows / lines / tables by their labels); an assert fails loudly if a shape changes."""
import sys, re, json
from pathlib import Path
L = Path(sys.argv[1]).read_text(encoding='utf-8').split('\n')
def idx(prefix, start=0): return next(i for i in range(start, len(L)) if L[i].startswith(prefix))
def clean(s): return s.replace("\\'", "'").strip()
S8, S9 = idx('## 8. '), idx('## 9. ')
def blocks(a, b):
    out = []; i = a
    while i < b:
        if L[i].startswith('```js'):
            j = i + 1
            while not L[j].startswith('```'): j += 1
            out.append('\n'.join(L[i + 1:j])); i = j
        i += 1
    return out
bl = blocks(S8, S9)
assert len(bl) == 4, len(bl)
fo, reinf, control, coda = bl
assert "'z4-final-open'" in fo and "'cyber-reinforcements'" in reinf and "'cyber-reinforcements-advance'" in reinf and "'cyber-control'" in control and "'ending-coda'" in coda
scenes = [fo, reinf, control, coda]

# ---- NF-1 / NF-2 windows: `**NF-n · ...**` then bullets  - หัวข้อ: TH · EN: EN  - ข้อความ: TH  - EN: EN  - ปุ่ม: TH · EN: EN
def window(key):
    i = next(i for i in range(S8, S9) if L[i].startswith(f'**{key} '))
    j = i + 1; bl_ = []
    while j < S9 and L[j].startswith('- '): bl_.append(clean(L[j][2:])); j += 1
    d = {}
    for b in bl_:
        m = re.match(r'^หัวข้อ: (.*?) · EN: (.*)$', b)
        if m: d['title'] = (m.group(1), m.group(2)); continue
        m = re.match(r'^ข้อความ: (.*?)(?: · EN: (.*))?$', b)
        if m:
            d['text_th'] = m.group(1)
            if m.group(2): d['text_en'] = m.group(2)
            continue
        m = re.match(r'^EN: (.*)$', b)
        if m: d['text_en'] = m.group(1); continue
        m = re.match(r'^ปุ่ม: (.*?) · EN: (.*)$', b)
        if m: d['button'] = (m.group(1), m.group(2)); continue
        m = re.match(r'^\*\*คำเตือนเพิ่ม[^*]*\*\*\s*TH (.*) · EN (.*)$', b)
        if m: d['warn'] = (m.group(1), m.group(2)); continue
    assert {'title', 'text_th', 'text_en', 'button'} <= set(d), (key, list(d))
    return { 'th':{ 'title':d['title'][0], 'text':d['text_th'], 'button':d['button'][0] }, 'en':{ 'title':d['title'][1], 'text':d['text_en'], 'button':d['button'][1] }, **({ 'warn':{ 'th':d['warn'][0], 'en':d['warn'][1] } } if 'warn' in d else {}) }
nf1, nf2 = window('NF-1'), window('NF-2')
assert 'warn' in nf2 and nf2['th']['button'] == 'เริ่ม / ยังก่อน' and nf2['en']['button'] == 'Begin / Not yet', nf2
nf1['th']['button'] = nf1['th']['button']; assert nf1['th']['button'] == 'ไปที่นั่น' and nf1['en']['button'] == 'Go there'
# ---- NF-3: banner `ไทย: A · B / C / D · E · F · EN: ...`
nf3l = clean(next(L[i] for i in range(S8, S9) if L[i].startswith('**NF-3 ')))
m = re.match(r'^\*\*NF-3[^*]*\*\*\s*ไทย: (.*?) · EN: (.*)$', nf3l); assert m, nf3l
nf3 = { 'th':[x.strip() for x in m.group(1).split(' · ')], 'en':[x.strip() for x in m.group(2).split(' · ')] }
assert len(nf3['th']) == 4 and len(nf3['en']) == 4 and re.search(r'\d / \d / \d', nf3['th'][1]) and re.search(r'\d / \d / \d', nf3['en'][1]), nf3

# ---- cyber-approach (8.2): page title, text, the tail lines
a82, a83 = idx('### 8.2 ', S8), idx('### 8.3 ', S8)
ap = [clean(l[2:]) for l in L[idx('**`cyber-approach`', a82):a83] if l.startswith('- ')]
approach = {}
for b in ap:
    m = re.match(r'^ชื่อหน้า: "(.*?)" · EN "(.*)"$', b)
    if m: approach['title'] = { 'th':m.group(1), 'en':m.group(2) }; continue
    m = re.match(r'^ข้อความ: (.*?) · EN: (.*)$', b)
    if m: approach['text'] = { 'th':m.group(1), 'en':m.group(2) }; continue
    m = re.match(r'^ท้ายหน้า ยมบาทน้อย: "(.*?)" · นิรา: "(.*?)" · EN Yama: "(.*?)" Nira: "(.*?)"$', b)
    if m: approach['tail'] = { 'th':[f'ยมบาทน้อย: "{m.group(1)}"', f'นิรา: "{m.group(2)}"'], 'en':[f'Yama: "{m.group(3)}"', f'Nira: "{m.group(4)}"'] }; continue
assert set(approach) == {'title', 'text', 'tail'}, approach

# ---- 8.3 table: the labels on the four reinforcements
labels = {}
for l in L[a83:idx('### 8.4 ', S8)]:
    m = re.match(r'^\| โซน (\d) \| (.*?) \| (.*) \|$', clean(l))
    if not m: continue
    cell = m.group(3).split(' (**')[0]; th, en = cell.split(' · ')
    labels[{ '1':'th', '2':'asia', '3':'west', '4':'cyberhell' }[m.group(1)]] = { 'th':th.strip(), 'en':en.strip() }
assert sorted(labels) == ['asia', 'cyberhell', 'th', 'west'] and labels['cyberhell']['th'] == 'ผู้เฝ้าด่านโซน 4' and labels['cyberhell']['en'] == 'Zone 4 Gate Guard', labels

# ---- 8.4 table: before / after lines of the four possessed lords
a84, a85 = idx('### 8.4 ', S8), idx('### 8.5 ', S8)
rulers = {}
for l in L[a84:a85]:
    l = clean(l)
    m = re.match(r'^\| \d (.*?) `leader-(\w+)-possessed` \| (.*?) \| (.*) \|$', l)
    if not m: continue
    zone = m.group(2); name = re.sub(r' \(.*\)$', '', m.group(1)).strip()
    mb = re.match(r'^"(.*?)" / "(.*)"$', m.group(3).strip()); ma = re.match(r'^"(.*?)" / "(.*)"$', m.group(4).strip()); assert mb and ma, l
    rulers[zone] = { 'nameTh':name, 'before':{ 'th':mb.group(1), 'en':mb.group(2) }, 'after':{ 'th':ma.group(1), 'en':ma.group(2) } }
assert sorted(rulers) == ['asia', 'cyberhell', 'th', 'west'], sorted(rulers)

# ---- 8.5: the lines of the duel and after it
a86 = idx('### 8.6 ', S8); win_at = idx('**บรรทัดหลังชนะ', a85)
def lines(a, b):
    out = {}
    for l in L[a:b]:
        m = re.match(r'^- (?P<label>.+?): "(?P<th>.*?)" · EN(?: (?P<spen>[^:]+))?: "(?P<en>.*)"$', clean(l))
        if m: out.setdefault(m.group('label').strip(), []).append({ 'th':m.group('th'), 'en':m.group('en'), 'spEn':m.group('spen') })
    return out
duel = lines(a85, win_at); after = lines(win_at, a86)
need_d = ['เริ่มสู้ อาร์คอน-ศูนย์', 'เลือดเหลือครึ่ง อาร์คอน-ศูนย์', 'นิรา เลือดเหลือครึ่ง']
assert all(k in duel for k in need_d) and any(k.startswith('เลือดเหลือครึ่ง HOME-67') for k in duel), list(duel)
assert sorted(after) == ['HOME-67', 'ยมบาทน้อย', 'อาร์คอน-ศูนย์'], list(after)
duel_out = { 'start':duel['เริ่มสู้ อาร์คอน-ศูนย์'][0], 'half':duel['เลือดเหลือครึ่ง อาร์คอน-ศูนย์'][0], 'halfHome67':next(v for k, v in duel.items() if k.startswith('เลือดเหลือครึ่ง HOME-67'))[0], 'halfNira':duel['นิรา เลือดเหลือครึ่ง'][0] }
win_out = [{ 'speaker':{ 'th':k, 'en':{ 'อาร์คอน-ศูนย์':'Archon-Zero', 'HOME-67':'HOME-67' }.get(k) or after[k][0]['spEn'] }, **{ x:after[k][0][x] for x in ('th', 'en') } } for k in ('อาร์คอน-ศูนย์', 'HOME-67', 'ยมบาทน้อย')]
assert [w['speaker']['en'] for w in win_out] == ['Archon-Zero', 'HOME-67', 'Yama'], win_out

out = ["// GENERATED by scripts/extract-rae-z4h.py from Output/Rae/2026-11-19-avegee-r2d-zone4-end.md (section 8) - Rae's text verbatim, do not edit by hand.", ""]
out.append('export const RAW_Z4H_SCENES = Object.assign({}, ' + ', '.join('({\n' + b + '\n})' for b in scenes) + ');\n')
for name, val in (('RAW_Z4H_NF1', nf1), ('RAW_Z4H_NF2', nf2), ('RAW_Z4H_NF3', nf3), ('RAW_Z4H_APPROACH', approach), ('RAW_Z4H_REINFORCEMENT_LABELS', labels),
                  ('RAW_Z4H_RULERS', rulers), ('RAW_Z4H_DUEL', duel_out), ('RAW_Z4H_AFTER_WIN', win_out)):
    out.append(f'export const {name} = ' + json.dumps(val, ensure_ascii=False, indent=1) + ';\n')
Path(__file__).resolve().parent.parent.joinpath('src', 'z4h-raw.js').write_text('\n'.join(out), encoding='utf-8')
print('ok', nf1['th']['title'], '|', nf2['th']['button'], '|', nf3['th'], '|', list(labels), list(rulers), list(duel_out), [w['speaker'] for w in win_out])
