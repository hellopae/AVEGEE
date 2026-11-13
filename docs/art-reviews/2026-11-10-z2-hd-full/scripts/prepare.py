"""Prepare this run's r4-c2..c5 cores with 64 px context; never edit game art."""
import hashlib
import json
import re
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1]
ROOT = OUT.parents[2]
CHUNKS = ['r4-c2', 'r4-c3', 'r4-c4', 'r4-c5']

def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def baseline():
    im = Image.new('RGB', (4915, 3277))
    for r in range(1, 5):
        for c in range(1, 6):
            im.paste(Image.open(ROOT / f'img/map-zone2/v2/r{r}-c{c}.webp'), ((c-1)*1024, (r-1)*1024))
    return im

def walkmask():
    source = (ROOT / 'src/town-owner-walkmask-asia.js').read_text()
    runs = json.loads(re.search(r'TOWN_OWNER_WALK_RUNS=(\[.*?\]);', source).group(1))
    a = np.zeros(480*320, np.uint8)
    i = on = 0
    for run in runs:
        a[i:i+run] = on
        i += run
        on ^= 1
    assert i == a.size
    return Image.fromarray(a.reshape(320, 480)*255).resize((4915,3277), Image.Resampling.NEAREST)

if __name__ == '__main__':
    base = baseline()
    mask = walkmask()
    parts = []
    hashes = {}
    overview = Image.new('RGB', (1400, 600), '#171717')
    for n, chunk in enumerate(CHUNKS):
        folder = OUT / chunk
        (folder / 'inputs').mkdir(parents=True, exist_ok=True)
        c = int(chunk[-1]); x0 = (c-1)*1024; x1 = min(c*1024,4915)
        cut = x0 + (x1-x0+1)//2
        for q, a, b in [('q11',x0,cut),('q12',cut,x1)]:
            context = [max(0,a-64),3008,min(4915,b+64),3277]
            path = folder / 'inputs' / f'{q}-source.webp'
            base.crop(context).save(path, 'WEBP', lossless=True, method=6)
            parts.append(dict(chunk=chunk,part=q,coreRectPx1x=[a,3072,b,3277],contextRectPx1x=context,input=str(path.relative_to(OUT)),native=f'{chunk}/{q}-native.webp'))
        p = ROOT / f'img/map-zone2/v2/{chunk}.webp'
        hashes[str(p.relative_to(ROOT))] = hashlib.sha256(p.read_bytes()).hexdigest()
        region = [x0,3008,x1,3277]
        im = base.crop(region)
        m = np.array(mask.crop(region))>0
        rgb = np.array(im).astype(float)
        rgb[m] = rgb[m]*.55 + np.array([20,250,80])*.45
        preview = Image.fromarray(rgb.astype('uint8'))
        preview.thumbnail((700,280))
        pos = ((n%2)*700,(n//2)*300)
        overview.paste(preview,pos)
        ImageDraw.Draw(overview).text(pos,chunk+' green=owner walk; top 64 px=context',fill='white')
    overview.save(OUT / 'walkmask-review.jpg',quality=94)
    write_json(OUT / 'parts.json',parts)
    write_json(OUT / 'source-hashes.json',hashes)
