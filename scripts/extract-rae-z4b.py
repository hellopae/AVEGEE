#!/usr/bin/env python3
"""T8b: copy the scenes, cases, windows and lines of Rae's part D, sections 3-6 and 9 (case 4 AI Scammer · case 7 Trojan-9 + WATSON-03 + his quest · cases 8-9 relatives · case 10 record hall / AI Scammer Robot / z4-reveal · Lupin's quest)
VERBATIM into src/z4c-raw.js - never retyped.
  python3 scripts/extract-rae-z4b.py "<Output/Rae/2026-11-19-avegee-r2d-zone4-end.md>"
Everything is parsed by its shape (js blocks as they are; notices by their labels; lines by `speaker: "text" · EN speaker: "text"`); an assert fails loudly if a shape changes."""
import sys, re, json
from pathlib import Path
L = Path(sys.argv[1]).read_text(encoding='utf-8').split('\n')
def idx(prefix, start=0): return next(i for i in range(start, len(L)) if L[i].startswith(prefix))
def clean(s): return s.replace("\\'", "'").strip()
S3, S4, S5, S6, S7, S9, S10 = idx('## 3. '), idx('## 4. '), idx('## 5. '), idx('## 6. '), idx('## 7. '), idx('## 9. '), idx('## 10. ')

def blocks(a, b):
    out = []; i = a
    while i < b:
        if L[i].startswith('```js'):
            j = i + 1
            while not L[j].startswith('```'): j += 1
            out.append('\n'.join(L[i + 1:j])); i = j
        i += 1
    return out
# ---- scenes: every js block that starts with `'key': {` in 4, 6, 9
scene_blocks = [x for a, b in ((S4, S5), (S6, S7), (S9, S10)) for x in blocks(a, b) if x.lstrip().startswith("'z4-")]
assert len(scene_blocks) == 5, len(scene_blocks)
# ---- cases: the js blocks that start with `{ k:'...'` (the relatives' block holds two objects)
case_blocks = {}
for a, b in ((S3, S4), (S4, S5), (S5, S6)):
    for x in blocks(a, b):
        if x.startswith('{'):
            parts = re.split(r'\n(?=\{ k:)', x)
            for p in parts: case_blocks[re.match(r"\{\s*k:'(\w+)'", p).group(1)] = p
assert sorted(case_blocks) == ['aiscam', 'kin8', 'kin9', 'watkin'], sorted(case_blocks)

# ---- notices (windows) and banners
def notices(a, b):
    out = {}; i = a
    while i < b:
        m = re.match(r'^\*\*(N[A-Z0-9]+(?:-[A-Z0-9]+)?)\b[^*]*\*\*(.*)$', L[i])
        if m:
            key, rest = m.group(1), m.group(2); j = i + 1; blk = rest if re.match(r'^\s*(\(.*?\)\s*)?(หัวข้อ|แบนเนอร์|ไทย)', rest) else ''
            while j < b and L[j].startswith('- '): blk += ' · ' + L[j][2:]; j += 1
            out[key] = blk.strip(); i = j - 1
        i += 1
    return out
def parse_notice(blk):
    blk = clean(blk).lstrip('· ').strip(); blk = re.split(r' · ป้ายรองใต้ชื่อ', blk)[0]
    mb = re.match(r'^(?:แบนเนอร์ )?ไทย: (.*?) · EN: (.*)$', blk.strip())
    if mb: return { 'banner':{ 'th':mb.group(1).strip(), 'en':mb.group(2).strip() } }
    toks = [t.strip() for t in re.split(r' · (?=(?:หัวข้อ|ข้อความ|ปุ่ม|EN)\b)', blk)]
    th = {}; en = {}; last = None; order = []
    for t in toks:
        t = re.sub(r'^\(รูปแบบ NA-2\)\s*', '', t)
        m = re.match(r'^(หัวข้อ|ข้อความ|ปุ่ม):?\s*(.*)$', t)
        if m:
            last = {'หัวข้อ':'title', 'ข้อความ':'text', 'ปุ่ม':'button'}[m.group(1)]; v = m.group(2).strip()
            if last == 'button' and ' / ' in v and not t.startswith('ปุ่ม:'): a1, b1 = v.split(' / ', 1); th[last] = a1.strip(); en[last] = b1.strip()
            else: th[last] = v
            order.append(last); continue
        m = re.match(r'^EN:\s*(.*)$', t)
        if m: en[last] = m.group(1).strip(); continue
        raise SystemExit('notice token? ' + t[:80])
    assert set(th) == {'title', 'text', 'button'} and set(en) == {'title', 'text', 'button'}, (th.keys(), en.keys(), blk[:60])
    return { 'th':th, 'en':en }
raw_notices = {}
for a, b in ((S3, S4), (S4, S5), (S5, S6), (S6, S7), (S9, S10)):
    for k, blk in notices(a, b).items(): raw_notices[k] = parse_notice(blk)
need = ['NAS-1', 'N7-1', 'N7-2', 'NV-W', 'NK-W', 'NK8', 'NK9', 'N10-1', 'N10-2', 'NS-10', 'NQ-1', 'NQ-2', 'NU-1', 'NQ-3']
assert all(k in raw_notices for k in need), [k for k in need if k not in raw_notices]

# ---- lines `- when speaker: "th" · EN speaker: "en"` (4.3)
lines = {}
for l in L[idx('### 4.3 ', S4):idx('### 4.4 ', S4)]:
    m = re.match(r'^- (?P<when>.+?) (?P<sp>[^\s:]+): "(?P<th>.*)" · EN (?P<spen>[^:]+): "(?P<en>.*)"$', clean(l))
    if not m: continue
    w = m.group('when')
    key = 'home67Run' if 'วิ่งมาสมทบ' in w else re.sub(r'\D', '', re.search(r'ระลอก \d', w).group(0)) and 'afterWave' + re.search(r'ระลอก (\d)', w).group(1)
    lines[key] = { 'sp':{ 'th':m.group('sp'), 'en':m.group('spen').strip() }, 'th':m.group('th'), 'en':m.group('en') }
assert sorted(lines) == ['afterWave1', 'afterWave2', 'afterWave3', 'afterWave4', 'home67Run'], sorted(lines)
# ---- fight lines (6.4 and 9.3)
def fight_lines(a, b):
    out = {}
    for l in L[a:b]:
        l = clean(l)
        m = re.match(r'^- (?P<label>[^:"]+?): "(?P<th>.*?)" · EN(?: [^:]+)?: "(?P<en>.*?)"(?P<rest>.*)$', l)
        if not m: continue
        lab = m.group('label').strip(); d = { 'th':m.group('th'), 'en':m.group('en') }
        r = m.group('rest')
        mv = re.search(r'ท่า(?:บอส[^:]*)?: \*\*(.*?)\*\* / (.*?) [(]', r)
        mw = re.search(r'ข้อความเตือน: "(.*?)" · EN "(.*?)"', r)
        if mv: d['move'] = { 'th':mv.group(1), 'en':mv.group(2) }
        if mw: d['warn'] = { 'th':mw.group(1), 'en':mw.group(2) }
        out[lab] = d
    return out
sala_lines = fight_lines(idx('### 6.4 ', S6), idx("'z4-sala-win'", S6))
assert 'เริ่มสู้ AI Scammer Robot' in sala_lines and 'เลือดเหลือครึ่ง AI Scammer Robot' in sala_lines and 'นิรา เลือดเหลือครึ่ง' in sala_lines and 'WATSON-03 เลือดเหลือครึ่ง' in sala_lines, list(sala_lines)
sala_lines['move'] = sala_lines['เลือดเหลือครึ่ง AI Scammer Robot']['move']; sala_lines['warn'] = sala_lines['เลือดเหลือครึ่ง AI Scammer Robot']['warn']
lupin_lines = fight_lines(idx("```js", idx("'z4-lupin-catch'", S9) - 1) if False else idx('- เริ่มสู้ ลูแปง', S9), S10)
# the boss move of Lupin: `- ท่าบอสลูแปง (ข้อเสนอ): **..** / .. (..) · ข้อความเตือน: "th" · EN "en"`
mb = re.search(r'^- ท่าบอสลูแปง \(ข้อเสนอ\): \*\*(.*?)\*\* / (.*?) [(].*?ข้อความเตือน: "(.*?)" · EN "(.*?)"', next(l for l in L[S9:S10] if l.startswith('- ท่าบอสลูแปง')))
lupin_lines['move'] = { 'th':mb.group(1), 'en':mb.group(2) }; lupin_lines['warn'] = { 'th':mb.group(3), 'en':mb.group(4) }
assert 'เริ่มสู้ ลูแปง' in lupin_lines and 'เลือดเหลือครึ่ง ลูแปง' in lupin_lines and 'HOME-67 เลือดเหลือครึ่ง' in lupin_lines, list(lupin_lines)

# ---- the worker's talk before the choice (9.3), the two choices
talk9 = []
a9 = idx('### 9.3 ', S9); b9 = idx("```js", a9)
for l in L[a9:b9]:
    l = clean(l)
    if l.startswith('- (คุยครั้งแรก)'):
        m = re.match(r'^- \(คุยครั้งแรก\) (.+?): "(.*?)" · EN (.+?): "(.*?)"$', l); talk9.append({ 'th':f'{m.group(1)}: "{m.group(2)}"', 'en':f'{m.group(3)}: "{m.group(4)}"' })
    elif l.startswith('- ยามา: "'):
        m = re.match(r'^- ยามา: "(.*?)" · (.+?): "(.*?)" · EN Yama: "(.*?)" · Worker: "(.*?)"$', l)
        talk9.append({ 'th':f'ยามา: "{m.group(1)}"', 'en':f'Yama: "{m.group(4)}"' }); talk9.append({ 'th':f'{m.group(2)}: "{m.group(3)}"', 'en':f'Worker: "{m.group(5)}"' })
    elif l.startswith('- ทางเลือก'):
        ch = re.findall(r'\*\*\[(.*?)\]\*\*', l); ce = re.findall(r'\*\*\[(.*?)\]\*\*', L[L.index(l if l in L else next(x for x in L if clean(x) == l)) + 0]) if False else None
        th_labels = re.findall(r'\*\*\[(.*?)\]\*\*', l.split(' · EN:')[0]); en_labels = re.findall(r'\*\*\[(.*?)\]\*\*', l.split(' · EN:')[1])
        choices9 = [{ 'th':a, 'en':b } for a, b in zip(th_labels, en_labels)]
assert len(talk9) == 3 and len(choices9) == 2, (len(talk9), choices9)

# ---- WATSON-03's KIN talk (4.4): before / during / after + two choices (each: lines TH + EN on ONE bullet separated by ' · EN ')
a44 = idx('### 4.4 ', S4); kin = { 'before':None, 'during':None, 'after':None, 'choices':[] }
k = a44
for k in range(a44, S5):
    l = L[k]
    for head, key in (('- ก่อนขึ้นแท่น WATSON-03: ', 'before'), ('- ระหว่างไต่สวน WATSON-03: ', 'during'), ('- หลังตัดสิน WATSON-03: ', 'after')):
        if l.startswith(head):
            en = L[k + 1]; assert en.strip().startswith('EN WATSON-03: '), en[:40]
            kin[key] = { 'th':'WATSON-03: ' + clean(l[len(head):]), 'en':'WATSON-03: ' + clean(en.strip()[len('EN WATSON-03: '):]) }
    if l.startswith('- ทางเลือก:'):
        th_labels = re.findall(r'\*\*\[(.*?)\]\*\*', l.split(' · EN:')[0]); en_labels = re.findall(r'\*\*\[(.*?)\]\*\*', l.split(' · EN:')[1])
        kin['choices'] = [{ 'label':{ 'th':a, 'en':b }, 'lines':None } for a, b in zip(th_labels, en_labels)]
    m = re.match(r'^  - \((ยืนข้าง ๆ|อ่านรายการ)\) (.*)$', l)
    if m:
        th, en = clean(m.group(2)).split(' · EN ', 1)
        i = 0 if m.group(1).startswith('ยืน') else 1
        kin['choices'][i]['lines'] = { 'th':th.split(' · '), 'en':en.split(' · ') }
assert all(kin[x] for x in ('before', 'during', 'after')) and len(kin['choices']) == 2 and all(c['lines'] and len(c['lines']['th']) == len(c['lines']['en']) for c in kin['choices']), kin

# ---- journal notes + HOME-67 hints
def jline(prefix, a, b):
    l = clean(next(x for x in L[a:b] if x.startswith(prefix)))
    return l
j = {}
m = re.match(r'^- บันทึกสมุดตอนจบ: \*\*PHANTOM-404:\*\* (.*?) · EN \*\*PHANTOM-404:\*\* (.*)$', jline('- บันทึกสมุดตอนจบ:', S3, S4)); j['aiscam'] = { 'th':'PHANTOM-404: ' + m.group(1), 'en':'PHANTOM-404: ' + m.group(2) }
m = re.match(r'^- บันทึกสมุดหลังจบ: \*\*WATSON-03:\*\* (.*?) · EN \*\*WATSON-03:\*\* (.*)$', jline('- บันทึกสมุดหลังจบ:', S4, S5)); j['watson'] = { 'th':'WATSON-03: ' + m.group(1), 'en':'WATSON-03: ' + m.group(2) }
m = re.match(r'^- บันทึกสมุด: คดี 8 \*\*PHANTOM-404:\*\* (.*?) · EN (.*?) · คดี 9 \*\*PHANTOM-404:\*\* (.*?) · EN (.*)$', jline('- บันทึกสมุด: คดี 8', S5, S6))
j['kin8'] = { 'th':'PHANTOM-404: ' + m.group(1), 'en':'PHANTOM-404: ' + m.group(2) }; j['kin9'] = { 'th':'PHANTOM-404: ' + m.group(3), 'en':'PHANTOM-404: ' + m.group(4) }
hints = {}
for key, prefix, a, b in (('aiscam', '- ระดับใบ้เพิ่ม: HOME-67', S3, S4), ('kin9', '- ใบ้ของ HOME-67', S5, S6)):
    m = re.search(r'"(.*?)" · EN "(.*?)"$', jline(prefix, a, b)); hints[key] = { 'th':'HOME-67: "' + m.group(1) + '"', 'en':'HOME-67: "' + m.group(2) + '"' }

# ---- Lupin's helper table 9.4
LABELS = { 'ชื่อ':'name', 'ท่าไม้ตาย':'move', 'คำบรรยายท่า':'desc', 'ชนิดท่า (ข้อเสนอ)':'kind', 'บรรทัดตอนอัญเชิญ':'call', 'บรรทัดตอนใช้ท่า':'use', 'บรรทัดตอนจบท่า':'end' }
a94 = idx('#### 9.4 ', S9); helper = {}
for l in L[a94:a94 + 14]:
    m = re.match(r'^\| (.*?) \| (.*?) \| (.*?) \|$', l)
    if m and clean(m.group(1)) in LABELS: helper[LABELS[clean(m.group(1))]] = { 'th':clean(m.group(2)).replace('**', ''), 'en':clean(m.group(3)).replace('**', '') }
assert len(helper) == 7, list(helper)

out = ["// GENERATED by scripts/extract-rae-z4b.py from Output/Rae/2026-11-19-avegee-r2d-zone4-end.md (sections 3-6 and 9) - Rae's text verbatim, do not edit by hand.", ""]
out.append('export const RAW_Z4C_SCENES = Object.assign({}, ' + ', '.join('({\n' + b + '\n})' for b in scene_blocks) + ');\n')
for key, body in case_blocks.items(): out.append(f"export const RAW_Z4CASE_{key.upper()} = (\n{body}\n);\n")
for name, val in (('RAW_Z4C_NOTICES', raw_notices), ('RAW_Z4C_TROJ_LINES', lines), ('RAW_Z4C_SALA_LINES', sala_lines), ('RAW_Z4C_LUPIN_LINES', lupin_lines), ('RAW_Z4C_LUPIN_TALK', { 'talk':talk9, 'choices':choices9 }),
                  ('RAW_Z4C_WAT_KIN', kin), ('RAW_Z4C_JOURNAL', j), ('RAW_Z4C_HINTS', hints), ('RAW_Z4C_LUPIN_HELPER', helper)):
    out.append(f'export const {name} = ' + json.dumps(val, ensure_ascii=False, indent=1) + ';\n')
Path(__file__).resolve().parent.parent.joinpath('src', 'z4c-raw.js').write_text('\n'.join(out), encoding='utf-8')
print('scenes', len(scene_blocks), 'cases', sorted(case_blocks), 'notices', sorted(raw_notices), 'lines', sorted(lines), list(sala_lines), list(lupin_lines))
