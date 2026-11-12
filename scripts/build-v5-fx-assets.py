#!/usr/bin/env python3
"""Z1-V5-FX: copy the painted fluid / cloud frames Codex drew (HD run) into img/map-zone1/v5-fx/.

Usage: python3 scripts/build-v5-fx-assets.py <path to docs/art-reviews/2026-11-05-z1-v5-fluids-hd>

What it does (nothing else - the painted art is copied byte for byte, never recoloured):
  * sheets/*.webp           copied unchanged (the fog-bank sheet is NOT copied: owner 5 Nov, white lumps looked pasted on)
  * masks/<region>.webp     the grayscale coverage PNGs (0..255) turned into white + alpha=coverage, lossless,
                            because the game clips with destination-in (alpha), exactly like the review page
  * fx-layout.json          a slim copy of the review layout: pieces in draw order, fog pieces dropped
Layout space = the 4915x3277 master of v5 == the 3840x2560 world. It does NOT change when the ground is swapped for v7.
"""
import json, shutil, sys
from pathlib import Path
from PIL import Image
import numpy as np

src = Path(sys.argv[1]) if len(sys.argv) > 1 else None
if not src or not (src / 'fx-layout.json').exists():
    sys.exit(__doc__)
out = Path(__file__).resolve().parent.parent / 'img/map-zone1/v5-fx'
(out / 'sheets').mkdir(parents=True, exist_ok=True)
(out / 'masks').mkdir(parents=True, exist_ok=True)

layout = json.loads((src / 'fx-layout.json').read_text())
GROUP = [('spirit-river', 'river'), ('lava-surface', 'lava'), ('ice-stream', 'ice'), ('waterfall-ice', 'waterfall'),
         ('lavafall', 'lavafall'), ('bank-foam', 'foam'), ('cloud-sea', 'cloud'), ('cloud-puff', 'cloud')]

def group_of(pid):
    for prefix, g in GROUP:
        if pid.startswith(prefix):
            return g
    return None

pieces, sheets, masks = [], set(), set()
for p in layout['pieces']:
    pid = p['id']
    if pid.startswith('fog-bank'):
        continue
    g = group_of(pid)
    assert g, pid
    q = {'id': pid, 'group': g, 'sheet': Path(p['sheet']).name, 'frames': p['frames'], 'fps': p['fps'],
         'blend': p['blend'], 'opacity': p['opacity'], 'maskRectPx': p['maskRectPx'],
         'mask': Path(p['mask']).stem, 'frameW': p['frameW'], 'frameH': p['frameH']}
    if p.get('clipMask'):
        q['clipMask'] = Path(p['clipMask']).stem
    if 'driftWorld' in p:
        q['kind'] = 'puff'
        for k in ('driftWorld', 'driftOriginWorld', 'spriteWorld', 'rectWorld'):
            q[k] = p[k]
    elif p.get('tileInRegion'):
        q['kind'] = 'tile'
        q['tileWorld'] = p['tileWorld']
    else:
        q['kind'] = 'rect'
    sheets.add(q['sheet'])
    masks.add(q['mask'])
    if 'clipMask' in q:
        masks.add(q['clipMask'])
    pieces.append(q)

for s in sorted(sheets):
    shutil.copyfile(src / 'sheets' / s, out / 'sheets' / s)
for m in sorted(masks):
    cov = np.asarray(Image.open(src / 'masks/regions' / (m + '.png')).convert('L'))
    rgba = np.zeros(cov.shape + (4,), np.uint8)
    rgba[..., :3] = 255
    rgba[..., 3] = cov
    Image.fromarray(rgba, 'RGBA').save(out / 'masks' / (m + '.webp'), lossless=True, quality=100, method=6)

slim = {'schemaVersion': 3, 'note': 'Z1 v5 fluid / cloud frames. Space = masterSize px == worldSize units. Built by scripts/build-v5-fx-assets.py',
        'worldSize': layout['worldSize'], 'masterSize': layout['masterSize'],
        'sheets': sorted(sheets), 'pieces': pieces}
(out / 'fx-layout.json').write_text(json.dumps(slim, ensure_ascii=False, separators=(',', ':')))
total = sum(f.stat().st_size for f in out.rglob('*') if f.is_file())
print(f'{len(pieces)} pieces, {len(sheets)} sheets, {len(masks)} masks, {total/1e6:.2f} MB')
