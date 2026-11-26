#!/usr/bin/env python3
"""FB3-T6: rebuild tests/fixtures/fb3-t6-runtime-changes.json — the reversible snippets (before / after) of every change this work made to the
runtime files whose hashes authenticate the BALANCE-2 evidence (tests/balance2.test.mjs). Undoing them in order gives back the file at BASE byte for byte.
  python3 scripts/build-fb3-t6-hash-fixture.py [BASE=0055de1c]
Run it again after any further edit to game.js / data.js in FB3-T6."""
import difflib, json, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
BASE = sys.argv[1] if len(sys.argv) > 1 else '0055de1c'   # main when T6 started (T-LIB merged)
names = list(json.loads((ROOT / 'output/coordination/2026-10-30-balance2/after.json').read_text())['runtimeHashes'])
out = {}
for name in names:
    rel = f'src/{name}.js'
    old = subprocess.run(['git', 'show', f'{BASE}:{rel}'], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    new = (ROOT / rel).read_text(encoding='utf-8')
    if old == new: continue
    a, b = old.splitlines(keepends=True), new.splitlines(keepends=True)
    ops = [op for op in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes() if op[0] != 'equal']
    merged = []                                  # a rewritten block shows up as several neighbouring hunks (a pure deletion has no unique text of its own): join hunks closer than 8 lines
    for op in ops:
        if merged and op[1] - merged[-1][2] <= 8: merged[-1] = ('replace', merged[-1][1], op[2], merged[-1][3], op[4])
        else: merged.append(op)
    ops = merged
    changes, source = [], new          # `source` = what the test holds while it undoes the snippets one after another
    for tag, i1, i2, j1, j2 in reversed(ops):          # bottom-up: earlier line numbers of `new` stay valid
        lo, hi = 0, 0
        while True:
            before = ''.join(a[max(0, i1 - lo):i2 + hi]); after = ''.join(b[max(0, j1 - lo):j2 + hi])
            if after and source.count(after) == 1: break
            if lo > 60: raise SystemExit(f'{rel}: cannot isolate hunk at new line {j1 + 1}')
            lo += 1; hi += 1
            if i1 - lo < 0 or j1 - lo < 0 or i2 + hi > len(a) or j2 + hi > len(b): lo = min(lo, i1, j1); hi = min(hi, len(a) - i2, len(b) - j2)
        assert a[max(0, i1 - lo):i1] == b[max(0, j1 - lo):j1] and a[i2:i2 + hi] == b[j2:j2 + hi], 'context differs'
        source = source.replace(after, before, 1); changes.append({'before': before, 'after': after})
    assert source == old, f'{rel}: undo does not give back {BASE}'
    out[name] = changes[::-1]          # the test walks its list in reverse, newest work package last in the array
(ROOT / 'tests/fixtures/fb3-t6-runtime-changes.json').write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print({k: len(v) for k, v in out.items()}, 'of', names)
