"""Prepare unmodified master crops; coordinates are global master 1x pixels."""
import json, re, hashlib
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1]
ROOT = OUT.parents[2]
CHUNKS = ['r3-c3', 'r3-c4', 'r3-c5', 'r4-c1']

def baseline():
    im = Image.new('RGB', (4915, 3277))
    for r in range(1, 5):
        for c in range(1, 6):
            im.paste(Image.open(ROOT/f'img/map-zone2/v2/r{r}-c{c}.webp'), ((c-1)*1024, (r-1)*1024))
    return im

def write_json(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2)+'\n')

def prepare():
    master = baseline()
    runs = json.loads(re.search(r'TOWN_OWNER_WALK_RUNS=(\[.*?\]);', (ROOT/'src/town-owner-walkmask-asia.js').read_text()).group(1))
    flat = np.zeros(480*320, np.uint8)
    i = 0
    for n, length in enumerate(runs):
        flat[i:i+length] = n % 2
        i += length
    assert i == flat.size
    mask = Image.fromarray(flat.reshape(320,480)*255).resize(master.size, Image.Resampling.NEAREST)
    specs = {}
    for chunk in CHUNKS:
        r,c = map(int,re.findall(r'\d+',chunk))
        x,y=(c-1)*1024,(r-1)*1024
        w,h=min(1024,4915-x),min(1024,3277-y)
        dst = OUT/chunk
        (dst/'inputs').mkdir(parents=True, exist_ok=True)
        xs=[0,(w+1)//2,w]; ys=[0,h] if r==4 else [0,512,h]
        parts=[]
        for ri in range(len(ys)-1):
            for ci in range(2):
                q=f'q{ri+1}{ci+1}'
                core=[x+xs[ci],y+ys[ri],x+xs[ci+1],y+ys[ri+1]]
                ctx=[max(0,core[0]-64),max(0,core[1]-64),min(4915,core[2]+64),min(3277,core[3]+64)]
                crop=master.crop(ctx)
                crop.save(dst/'inputs'/f'{q}-source.webp',lossless=True,method=6)
                parts.append(dict(id=q,coreRectPx1x=core,contextRectPx1x=ctx,inputSize=list(crop.size)))
        specs[chunk]=dict(chunkRectPx1x=[x,y,x+w,y+h],parts=parts)
        crop=master.crop((x,y,x+w,y+h)).convert('RGBA')
        tint=Image.new('RGBA',crop.size,(255,60,40,0)); tint.putalpha(mask.crop((x,y,x+w,y+h)).point(lambda p:80 if p else 0))
        overlay=Image.alpha_composite(crop,tint).convert('RGB')
        d=ImageDraw.Draw(overlay)
        for gx in range(0,w,128):
            d.line((gx,0,gx,h),fill='yellow',width=1);d.text((gx+2,4),str(gx),fill='yellow')
        for gy in range(0,h,128):
            d.line((0,gy,w,gy),fill='yellow',width=1);d.text((4,gy+12),str(gy),fill='yellow')
        overlay.save(dst/'inputs'/'walkmask-overlay.jpg',quality=88)
    write_json(OUT/'crop-plan.json',specs)
    sources=['src/zone-skin.js','src/town-layout.js','src/town-owner-walkmask-asia.js','src/town-asia-trees.js']+[f'img/map-zone2/v2/r{r}-c{c}.webp' for r in range(1,5) for c in range(1,6)]
    write_json(OUT/'source-hashes.json',{p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in sources})

if __name__=='__main__': prepare()
