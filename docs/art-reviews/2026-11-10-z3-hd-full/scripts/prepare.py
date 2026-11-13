"""Prepare immutable 1x context crops. Run from the repository root."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parents[1]
CHUNKS = ['r1-c5', 'r2-c1', 'r2-c2', 'r2-c3']

def prepare():
    atlas = Image.new('RGB', (4915, 3277))
    hashes = {}
    for r in range(1, 5):
        for c in range(1, 6):
            f = ROOT / f'img/map-zone3/v1/r{r}-c{c}.webp'
            hashes[str(f.relative_to(ROOT))] = hashlib.sha256(f.read_bytes()).hexdigest()
            atlas.paste(Image.open(f), ((c-1)*1024, (r-1)*1024))
    spec = {}
    for chunk in CHUNKS:
        r, c = int(chunk[1]), int(chunk[4])
        x, y = (c-1)*1024, (r-1)*1024
        w, h = min(1024, 4915-x), 1024
        xs, ys = [x, x+(w+1)//2, x+w], [y, y+512, y+h]
        d = OUT / chunk
        d.mkdir(exist_ok=True)
        atlas.crop((x,y,x+w,y+h)).save(d/'source.webp', lossless=True)
        qs = {}
        for iy in range(2):
            for ix in range(2):
                q = f'q{iy+1}{ix+1}'
                core = [xs[ix], ys[iy], xs[ix+1], ys[iy+1]]
                ctx = [max(0,core[0]-64), max(0,core[1]-64), min(4915,core[2]+64), min(3277,core[3]+64)]
                atlas.crop(ctx).save(d/f'{q}-input.webp', lossless=True)
                qs[q] = dict(coreRectPx1x=core, contextRectPx1x=ctx)
        spec[chunk] = dict(chunkRectPx1x=[x,y,x+w,y+h], parts=qs)
    (OUT/'source-manifest.json').write_text(json.dumps(dict(sourceHashes=hashes, repairs=False, chunks=spec), indent=2)+'\n')

if __name__ == '__main__':
    prepare()
