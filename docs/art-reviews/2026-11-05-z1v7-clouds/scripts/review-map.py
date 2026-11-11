"""Whole-map contact previews and measured coverage evidence; no authored art changes."""
from pathlib import Path
from PIL import Image,ImageDraw
import json,numpy as np,cv2
R=Path(__file__).resolve().parents[1]
cfg=json.loads((R/'clouds.json').read_text());W,H=cfg['fullPx']
bg=Image.open(R/'input/v7-overview.jpg').resize((1500,1000)).convert('RGBA')
for v in ['A','B']:
    layer=Image.new('RGBA',bg.size)
    for f in cfg['layers']:
        if f['variant']!=v:continue
        x,y,w,h=f['rectPx2x'];l,t,r,b=round(x*1500/W),round(y*1000/H),round((x+w)*1500/W),round((y+h)*1000/H)
        im=Image.open(R/f['file']).convert('RGBA').resize((r-l,b-t),Image.Resampling.LANCZOS)
        layer.paste(im,(l,t))
    Image.alpha_composite(bg,layer).convert('RGB').save(R/'previews'/f'overview-{v}.jpg',quality=91)
protected=Image.open(R/'protected-terrain-mask.png').resize(bg.size,Image.Resampling.NEAREST)
p=Image.new('RGBA',bg.size,(30,180,250));p.putalpha(protected.point(lambda a:round(a*.4)))
im=Image.alpha_composite(bg,p)
m=Image.open(R/'cloud-layer-mask.png');small=m.resize(bg.size,Image.Resampling.LANCZOS)
t=Image.new('RGBA',bg.size,(255,20,225));t.putalpha(small.point(lambda a:round(a*.75)))
im=Image.alpha_composite(im,t).convert('RGB')
ImageDraw.Draw(im).text((15,10),'Cyan = protected summit/ice | Pink = retained cloud support',fill='white')
im.save(R/'previews/protected-review.jpg',quality=94)
mask=np.asarray(m)
coverage=json.loads((R/'coverage-review.json').read_text())
for f in coverage['legacyBanks']:
    x,y,w,h=f['referenceBoxPx1x'];f['currentSupportPixelsInBox2x']=int(np.count_nonzero(mask[y*2:(y+h)*2,x*2:(x+w)*2]))
for f in coverage['ownerDeletions']:
    owner=next(a for a in json.loads((R/'input/white-lumps.json').read_text())['lumps'] if a['id']==f['id'])
    x,y,w,h=owner['v7Px2x'];f['supportPixelsInOwnerBox']=int(np.count_nonzero(mask[y:y+h,x:x+w]))
(R/'coverage-review.json').write_text(json.dumps(coverage,indent=2))
handoff=json.loads((R/'terrain-handoff.json').read_text())
for request,region in zip(handoff['requests'],json.loads((R/'regions.json').read_text())['regions']):
    assert request['id']==region['id']
    roi=np.zeros(mask.shape,np.uint8);points=np.rint(np.array(region['polygonProxy1500'])*[W/1500,H/1000]).astype('int32');cv2.fillPoly(roi,[points],255)
    y,x=np.nonzero((roi>0)&(mask>0));request['activeSupportPixels']=len(x)
    request['boxPx2x']=[int(x.min()),int(y.min()),int(x.max()-x.min()+1),int(y.max()-y.min()+1)] if len(x) else None
(R/'terrain-handoff.json').write_text(json.dumps(handoff,indent=2,ensure_ascii=False))
print('Rebuilt full-map A/B, protected-area preview, legacy/deletion coverage and terrain handoff from current exports.')
