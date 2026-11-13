"""Compact optional review previews, omit reproducible input copies; no art changes.

Run once after assembly and landmark measurement. Full 2.8px/unit comparisons,
lossless native images and lossless assembled images are retained untouched.
"""
import gzip
import json
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parents[1]
manifest = json.loads((OUT/'source-manifest.json').read_text())
for ch in manifest['chunks']:
    d = OUT/ch
    for f in [d/'source.webp', *d.glob('q*-input.webp')]:
        f.unlink(missing_ok=True)
    f = d/'sift-correspondences.json'
    if f.exists():
        with gzip.GzipFile(str(f)+'.gz', 'wb', compresslevel=9, mtime=0) as z:
            z.write(f.read_bytes())
        f.unlink()
    reg = json.loads((d/'registration.json').read_text())
    for info in reg['parts'].values():
        info['correspondencesFile'] = 'sift-correspondences.json.gz'
    (d/'registration.json').write_text(json.dumps(reg,indent=2)+'\n')
    for name in ['source-inventory.jpg','landmarks.jpg','seam-check.jpg','structure-matches.jpg','owner-walkmask-overlay.jpg']:
        f = d/name
        with Image.open(f) as src:
            im = src.copy()
        im.thumbnail((960,540),Image.Resampling.LANCZOS)
        im.save(f, quality=45, optimize=True)
for name in ['scope-source.jpg', 'source-grid.jpg']:
    (OUT/name).unlink(missing_ok=True)
