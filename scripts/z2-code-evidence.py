#!/usr/bin/env python3
"""Render evidence from the actual game export; never modify img/. Run audit.mjs first."""
import argparse
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--layer', type=Path, required=True)
args = parser.parse_args()
OUT = ROOT/'output/z2-code'
d = json.loads((OUT/'layout.json').read_text())
layer = Image.open(args.layer).convert('RGBA')
red = np.asarray(layer)[:, :, 3] >= 64
W, H = layer.size
K = W/d['size']['w']
floor = Image.frombytes('L', (W,H), (OUT/'floor.raw').read_bytes())
mask = Image.frombytes('L', (480,320), (OUT/'mask.raw').read_bytes()).resize((W,H), Image.Resampling.NEAREST)
mask.save(OUT/'mask.png')
floor.save(OUT/'runtime-floor.png')
canvas = Image.open(ROOT/d['terrain']).convert('RGBA').resize((W,H))
plain = canvas.copy()
shade = Image.new('RGBA', (W,H), (255,0,0,0))
shade.putalpha(Image.fromarray((red*68).astype('uint8')))
canvas.alpha_composite(shade)

rows = []
objects = []
def rect_coverage(rect):
    x1,y1,x2,y2 = rect
    yy,xx = np.mgrid[0:H,0:W]
    inside = ((xx+.5)/K>=x1)&((xx+.5)/K<=x2)&((yy+.5)/K>=y1)&((yy+.5)/K<=y2)
    return float(red[inside].mean()*100) if inside.any() else 0

def record(name,x,y,rect):
    pct = rect_coverage(rect)
    rows.append({'piece':name,'x':x,'y':y,'base':rect,'red_percent':round(pct,2)})

def add(src,x,y,w,h=None,flip=False,label=None,rect=None):
    path = ROOT/src
    if not path.exists():
        raise FileNotFoundError(path)
    im = Image.open(path).convert('RGBA')
    if h is None:
        h = w*im.height/im.width
    if flip:
        im = im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    im = im.resize((max(1,round(w*K)),max(1,round(h*K))),Image.Resampling.LANCZOS)
    objects.append((y,im,(round((x-w/2)*K),round((y-h)*K))))
    if rect is not None:
        record(label,x,y,rect)

for s in d['stations']:
    b=s['box']
    # Box placement is exported by art.stationBox; the PNG is drawn with precisely those bounds.
    add(s['src'],b['x']+b['w']/2,b['y']+b['h'],b['w'],b['h'],b.get('flip',False))
    record('station:'+s['key'],s['def']['bx'],s['def']['by'],s['base'])
for h in d['houses']:
    add(h['src'],h['x'],h['y'],h['w'],flip=h['flip'],label=h['id']+':'+h['key'],rect=h['base'])
p = d['dais']
im = Image.open(ROOT/p['src']).convert('RGBA')
a = np.asarray(im)[:,:,3]>40
ys,xs=np.nonzero(a)
bottom=ys.max()+1
band=a[max(0,bottom-round(im.height*.16)):bottom]
_,xx=np.nonzero(band)
rect=[p['x']-p['w']/2+xx.min()/im.width*p['w'],p['y']-(im.height-bottom+band.shape[0])/im.width*p['w'],
      p['x']-p['w']/2+(xx.max()+1)/im.width*p['w'],p['y']-(im.height-bottom)/im.width*p['w']]
add(p['src'],p['x'],p['y'],p['w'],label='judgment',rect=rect)
for p in d['props']:
    src=p['src']
    if not (ROOT/src).exists():
        src=p['fallback']
    add(src,p['x'],p['y'],p['w'])
    if p['kind'] in ('lamp','torch'):
        x,y,rx,ry=p['x'],p['y'],p['rx'],p['ry']
        yy,xx=np.mgrid[0:H,0:W]
        inside=((xx+.5)/K-x)**2/rx**2+((yy+.5)/K-y)**2/ry**2<=1
        pct=float(red[inside].mean()*100)
        rows.append({'piece':p['id'],'x':x,'y':y,'red_percent':round(pct,2),'ellipse':[rx,ry]})
for _,im,pos in sorted(objects,key=lambda x:x[0]):
    canvas.alpha_composite(im,pos)
    plain.alpha_composite(im,pos)
canvas.convert('RGB').save(OUT/'town-mask-objects.jpg',quality=92)
plain.convert('RGB').save(OUT/'town-objects.jpg',quality=92)
pen=ImageDraw.Draw(canvas)
for row in rows:
    x,y=row['x']*K,row['y']*K
    pen.ellipse((x-2,y-2,x+2,y+2),fill='yellow')
    if 'base' in row:
        pen.rectangle(tuple(v*K for v in row['base']),outline='yellow',width=1)
for a in d['anchors']:
    x,y=a['x']*K,a['y']*K
    pen.ellipse((x-3,y-3,x+3,y+3),fill='cyan' if a['reachable'] else 'magenta')
    pen.text((x+4,y),a['key'],fill='white',stroke_width=1,stroke_fill='black')
canvas.convert('RGB').save(OUT/'town-audit.jpg',quality=92)
(OUT/'base-overlap.json').write_text(json.dumps(rows,indent=2)+'\n')
lines=['| ชิ้น | โคน x,y (world) | ฐานตกในแดง (%) |','|---|---:|---:|']
for r in rows:
    lines.append(f"| {r['piece']} | {r['x']:.1f}, {r['y']:.1f} | {r['red_percent']:.2f} |")
(OUT/'base-overlap.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({'pieces':len(rows),'partial_bases':[r['piece'] for r in rows if 'base' in r and r['red_percent']<100]},ensure_ascii=False))

# The raw buffers are temporary transport from Node, not delivered evidence.
(OUT/'floor.raw').unlink()
(OUT/'mask.raw').unlink()
