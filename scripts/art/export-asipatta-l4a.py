"""Split generated RGBA two-sword sheets; register only the eight runtime sprites.
Usage: python3 scripts/art/export-asipatta-l4a.py th=PATH asia=PATH west=PATH cyberhell=PATH
No recoloring or runtime filters: lighting is baked by image generation.
"""
import json
import sys
from pathlib import Path
from PIL import Image

out = Path('img/asipatta-l4a')
out.mkdir(exist_ok=True)
for arg in sys.argv[1:]:
    zone, path = arg.split('=', 1)
    assert zone in ('th', 'asia', 'west', 'cyberhell')
    sheet = Image.open(path).convert('RGBA')
    for i in range(2):
        part = sheet.crop((i*sheet.width//2, 0, (i+1)*sheet.width//2, sheet.height))
        # Bound by solid sword pixels, retaining a small antialiased margin.
        box = part.getchannel('A').point(lambda v: 255 if v > 128 else 0).getbbox()
        assert box
        box = (max(0, box[0]-2), max(0, box[1]-2), min(part.width,box[2]+2), min(part.height,box[3]+2))
        sprite = part.crop(box)
        sprite.thumbnail((160,512),Image.Resampling.LANCZOS)
        sprite.save(out/f'{zone}-sword-{i+1}-l4a.png')
manifest_path = Path('img/manifest.json')
manifest = json.loads(manifest_path.read_text())
for p in sorted(out.glob('*.png')):
    rel = str(p.relative_to('img'))
    if rel not in manifest['rest']: manifest['rest'].append(rel)
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=0)+'\n')
catalog_path = Path('img/preload-catalog.json')
catalog = json.loads(catalog_path.read_text())
for zone in ('th', 'asia', 'west', 'cyberhell'):
    for p in sorted(out.glob(f'{zone}-*.png')):
        if str(p) not in catalog['zones'][zone]: catalog['zones'][zone].append(str(p))
catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2)+'\n')
