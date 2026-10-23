#!/usr/bin/env python3
"""M2: join the four painted quadrants of a zone's town ground into the 4915x3277 sheet, cut it into 1024 px chunks and
write the 1536x1024 preview.   Never touches Zone 1's files.

  python3 scripts/stitch-town-terrain.py --zone asia            # reads img/raw/map-zone2/q-{nw,ne,sw,se}.png, writes img/map-zone2/v1/
  python3 scripts/stitch-town-terrain.py --zone asia --dry-run  # checks sizes only
  python3 scripts/stitch-town-terrain.py --zone west --src DIR --out DIR --keep-full /tmp/full.png

Quadrant files: PNG, 3:2, at least 1536x1024 (smaller is refused). They are 864x576 preview px each; the overlaps are
192 px (left-right) and 128 px (top-bottom) of the 1536x1024 preview — see town_terrain_lib.py.
Outputs: <out>/r{1-4}-c{1-5}.webp (q92, same size class as Zone 1), <out>/<zoneN>-terrain-v1-preview.webp, <out>/stitch-report.json.
"""
import argparse, hashlib, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import town_terrain_lib as T

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('--zone', required=True, choices=sorted(T.ZONES))
ap.add_argument('--src'); ap.add_argument('--out'); ap.add_argument('--keep-full')
ap.add_argument('--quality', type=int, default=92)
ap.add_argument('--dry-run', action='store_true')
a = ap.parse_args()
folder, short = T.ZONES[a.zone]
src = a.src or os.path.join(ROOT, 'img/raw', folder)
out = a.out or os.path.join(ROOT, 'img', folder, 'v1')
if os.path.realpath(out).startswith(os.path.realpath(os.path.join(ROOT, 'img/map-zone1'))):
    sys.exit('refusing to write into Zone 1 ground')
quads = {}
for n in T.QUADS:
    p = os.path.join(src, f'q-{n}.png')
    if not os.path.exists(p): sys.exit(f'missing {p}')
    im = Image.open(p)
    w, h = im.size
    if w < 1536 or h < 1024 or abs(w / h - 1.5) > .02: sys.exit(f'{p}: {w}x{h} is not a 3:2 image of at least 1536x1024')
    quads[n] = im.convert('RGB')
    print(f'{n}: {w}x{h}  -> box {T.final_box(n)}')
if a.dry_run: sys.exit(0)
sheet = T.stitch(quads)
chunks = T.write_chunks(sheet, out, a.quality)
prev = os.path.join(out, f'{short}-terrain-v1-preview.webp')
T.write_preview(sheet, prev, a.quality)
if a.keep_full: Image.fromarray(sheet).save(a.keep_full)
rep = {'zone': a.zone, 'sheet': list(T.FULL), 'chunks': len(chunks), 'preview': os.path.basename(prev),
       'quadrants': {n: list(quads[n].size) for n in quads},
       'upscale': {n: round((T.final_box(n)[2] - T.final_box(n)[0]) / quads[n].size[0], 3) for n in quads},
       'sha256': {name: hashlib.sha256(open(os.path.join(out, name), 'rb').read()).hexdigest()[:16] for name, _ in chunks}}
json.dump(rep, open(os.path.join(out, 'stitch-report.json'), 'w'), indent=1)
print(f'wrote {len(chunks)} chunks + preview to {out}')
