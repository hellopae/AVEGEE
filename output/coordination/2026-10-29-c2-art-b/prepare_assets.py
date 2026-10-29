"""Package built-in image_gen artwork; no procedural artwork generation."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
ICONS = ['copperInferno', 'mercySeal', 'lotusSanctuary', 'laborJudgment',
         'shadowCleaver', 'abyssGatebreaker', 'karmaFracture', 'teamJudgment']
FX = {'mercySeal-shield-512': (512,512), 'lotus-shield-512': (512,512),
      'taan-shockwave-768': (768,768), 'dam-slash-512': (512,512),
      'guard-impact-768': (768,768), 'kan-mirror-shard-256': (256,256),
      'kan-impact-512': (512,512), 'yama-dash-trail-256x512': (256,512),
      'yama-impact-768': (768,768)}
records = {r['id']: r for r in json.loads((OUT/'generation-records.json').read_text())}

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

assets = []
for name in ICONS + list(FX):
    icon = name in ICONS
    size = (256,256) if icon else FX[name]
    source = Image.open(records[name]['source']).convert('RGBA')
    inset = 6 if icon else round(min(size)*.08)
    im = ImageOps.contain(source, (size[0]-2*inset,size[1]-2*inset), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', size)
    canvas.alpha_composite(im, ((size[0]-im.width)//2,(size[1]-im.height)//2))
    path = ROOT/'img/skills-v1'/('icons' if icon else 'fx')/(name+'.webp')
    path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(path, 'WEBP', lossless=True, exact=True, method=6)
    check = Image.open(path)
    assert check.size == size and check.mode == 'RGBA', name
    alpha = check.getchannel('A')
    assert alpha.getextrema() == (0,255), name
    assert all(alpha.getpixel(p)==0 for p in [(0,0),(size[0]-1,0),(0,size[1]-1),(size[0]-1,size[1]-1)]), name
    hist = alpha.histogram()
    box = alpha.getbbox()
    assert box[0] >= inset and box[1] >= inset and box[2] <= size[0]-inset and box[3] <= size[1]-inset, name
    assets.append(dict(id=name,path=str(path.relative_to(ROOT)),width=size[0],height=size[1],
                       mode=check.mode,format=check.format,alpha_extrema=list(alpha.getextrema()),
                       transparent_pixels=hist[0],partial_alpha_pixels=sum(hist[1:255]),
                       alpha_bbox=list(box),bytes=path.stat().st_size,sha256=digest(path),
                       anchor_normalized=[.5,.5],mirror_safe=True,
                       direction='up; rotate at integration' if 'dash-trail' in name else
                       'upper-right' if 'mirror-shard' in name else 'centered',
                       source_sha256=digest(Path(records[name]['source']))))

font = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 13)
def label(draw, xy, text, fill):
    draw.text(xy,text,font=font,fill=fill)

old = list((ROOT/'img/ui').glob('power-*.webp'))
for px in [256,44]:
    cellw, cellh = (290,306) if px==256 else (190,110)
    cols=4
    paths=[(ROOT/'img/skills-v1/icons'/(n+'.webp'),n) for n in ICONS]+[(p,p.stem) for p in old]
    rows=(len(paths)+cols-1)//cols
    sheet=Image.new('RGB',(cols*cellw,rows*cellh+46),'#252431');d=ImageDraw.Draw(sheet)
    label(d,(12,12),f'NEW 8 first / ORIGINAL 7 after | actual {px}px | no scaling', '#ffffff')
    for i,(p,name) in enumerate(paths):
        x=(i%cols)*cellw;y=46+(i//cols)*cellh
        im=Image.open(p).convert('RGBA').resize((px,px),Image.Resampling.LANCZOS)
        sheet.paste(im,(x+(cellw-px)//2,y+4),im)
        label(d,(x+10,y+px+13),name,'#ffffff')
    sheet.save(OUT/f'icons-comparison-{px}.png')

for theme,bg,fg in [('dark','#191a26','#ffffff'),('light','#f4f0e7','#242431')]:
    cell=300;sheet=Image.new('RGB',(900,1020),bg);d=ImageDraw.Draw(sheet)
    label(d,(12,12),f'FX / {theme} background / proportional previews, maximum 264px',fg)
    for i,name in enumerate(FX):
        x=(i%3)*cell;y=48+(i//3)*324
        im=Image.open(ROOT/'img/skills-v1/fx'/(name+'.webp')).convert('RGBA')
        im=ImageOps.contain(im,(264,264),Image.Resampling.LANCZOS)
        sheet.paste(im,(x+(cell-im.width)//2,y+(264-im.height)//2),im)
        label(d,(x+8,y+273),name,fg)
        label(d,(x+8,y+293),f'{FX[name][0]} x {FX[name][1]} RGBA',fg)
    sheet.save(OUT/f'fx-{theme}.png')

manifest=dict(schema='avegee-art-handoff-v1',generator='built-in image_gen',
              generation_calls=27,icons=8,fx=9,assets=assets,
              review_sheets=['icons-comparison-256.png','icons-comparison-44.png','fx-dark.png','fx-light.png'],
              compositing='straight RGBA alpha; normal source-over; no baked background',
              integration='art only; runtime manifest unchanged; anchors are canvas centers, tune with actors during integration',
              verification='17 decoded WebP files checked for exact dimensions, RGBA, alpha 0..255, clear corners and padding; no in-game QA performed')
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'count':len(assets),'icons':8,'fx':9,'checks':'dimensions, RGBA, alpha extrema, transparent corners, margins, decode','total_bytes':sum(a['bytes'] for a in assets)},indent=2))
