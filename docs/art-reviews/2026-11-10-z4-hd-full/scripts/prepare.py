"""Prepare exact 64-map-pixel contexts from active Zone 4 v3 (no repairs)."""
import hashlib, json
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1]
ROOT = OUT.parents[2]
CHUNKS = ['r3-c3', 'r3-c4', 'r3-c5', 'r4-c1']
FULL = (4915, 3277)

def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

def master():
    sheet = Image.new('RGB', FULL)
    for r in range(1, 5):
        for c in range(1, 6):
            sheet.paste(Image.open(ROOT/f'img/map-zone4/v3/r{r}-c{c}.webp'), ((c-1)*1024, (r-1)*1024))
    return sheet

def prepare():
    sheet = master()
    parts = []
    for chunk in CHUNKS:
        r, c = map(int, chunk.replace('r','').replace('c','').split('-'))
        x, y = (c-1)*1024, (r-1)*1024
        w, h = min(1024,FULL[0]-x), min(1024,FULL[1]-y)
        xs = [x, x+(w+1)//2, x+w]
        ys = [y,y+h] if r == 4 else [y,y+(h+1)//2,y+h]
        folder = OUT/chunk
        (folder/'inputs').mkdir(parents=True, exist_ok=True)
        for j in range(len(ys)-1):
            for i in range(2):
                q = f'q{j+1}{i+1}'
                core = [xs[i],ys[j],xs[i+1],ys[j+1]]
                ctx = [max(0,core[0]-64),max(0,core[1]-64),min(FULL[0],core[2]+64),min(FULL[1],core[3]+64)]
                ref = sheet.crop(ctx)
                ref.save(folder/'inputs'/f'{q}-reference.png')
                parts.append(dict(chunk=chunk,part=q,coreRectPx1x=core,contextRectPx1x=ctx,
                    referenceSize=list(ref.size), referenceSHA256=hashlib.sha256(ref.tobytes()).hexdigest()))
    write_json(OUT/'parts.json', parts)
    mask = Image.open(ROOT/'output/coordination/2026-10-30-z4-town-a/owner-walkmask.png').convert('L').resize(FULL,Image.Resampling.NEAREST)
    for chunk in CHUNKS:
        r,c=map(int,chunk.replace('r','').replace('c','').split('-'))
        x,y=(c-1)*1024,(r-1)*1024
        box=(x,y,min(x+1024,FULL[0]),min(y+1024,FULL[1]))
        rgb=sheet.crop(box).convert('RGBA')
        overlay=Image.new('RGBA',rgb.size,(255,40,40,0))
        overlay.putalpha(mask.crop(box).point(lambda p: 0 if p>127 else 90))
        rgb=Image.alpha_composite(rgb,overlay).convert('RGB')
        rgb.thumbnail((900,900))
        rgb.save(OUT/chunk/'inputs'/'walkmask-overlay.jpg',quality=90)

if __name__ == '__main__':
    prepare()
