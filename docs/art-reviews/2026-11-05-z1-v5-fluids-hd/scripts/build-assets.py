"""Spatial slicing of ImageGen paintings; no synthetic temporal frames."""
from pathlib import Path
import json, hashlib
import numpy as np
import cv2
from PIL import Image, ImageDraw
R=Path(__file__).resolve().parents[1]
model=json.loads((R/'reference/fx-layout-v5.json').read_text())
regions=json.loads((R/'regions.json').read_text())['regions']
reviews=[]
# A narrow INWARD feather removes hard color-selection stair steps. Coverage
# never extends beyond an inherited fluid mask; support is unchanged on reruns.
for reg in regions:
    if reg['kind'] not in ['lava','lavafall','ice-stream','waterfall']:continue
    path=R/reg['mask'];a=np.asarray(Image.open(path))
    distance=cv2.distanceTransform((a>0).astype('uint8'),cv2.DIST_L2,3)
    feather=np.rint(np.clip(distance/2.5,0,1)*255).astype('uint8')
    Image.fromarray(feather).save(path)

def spatial_edges(f,band=16):
    # Match opposing SPATIAL tile edges within each existing painting.
    # No frame is generated, shifted, faded, blended with another frame or copied.
    a=np.asarray(f).astype(float).copy()
    for j in range(band):
        k=1-j/band;avg=(a[:,j]+a[:,-1-j])/2
        a[:,j]=a[:,j]*(1-k)+avg*k;a[:,-1-j]=a[:,-1-j]*(1-k)+avg*k
    for j in range(band):
        k=1-j/band;avg=(a[j]+a[-1-j])/2
        a[j]=a[j]*(1-k)+avg*k;a[-1-j]=a[-1-j]*(1-k)+avg*k
    return Image.fromarray(np.uint8(a.clip(0,255)))

def cells(name):
    frames=[]
    for batch in ['a','b']:
        p=R/f'sources/{name}-{batch}.webp'
        if not p.exists():p=p.with_suffix('.png')
        im=Image.open(p).convert('RGBA')
        frames.extend(im.crop((c*im.width//2,r*im.height//2,(c+1)*im.width//2,(r+1)*im.height//2)) for r in range(2) for c in range(2))
    if name in ['lavafall','waterfall-ice']:
        # Extract each independently painted sprite from transparent packing.
        # This does not create temporal frames: all eight are unique paintings.
        # Normalize their export rectangle; never upscale beyond native coverage.
        boxes=[]
        for f in frames:
            _,_,stats,_=cv2.connectedComponentsWithStats((np.asarray(f)[:,:,3]>100).astype('uint8'))
            x,y,w,h,_=stats[1:][np.argmax(stats[1:,4])]
            boxes.append((int(x),int(y),int(x+w),int(y+h)))
        size=(min(b[2]-b[0] for b in boxes),min(b[3]-b[1] for b in boxes))
        frames=[f.crop(box).resize(size,Image.Resampling.LANCZOS) for f,box in zip(frames,boxes)]
        (R/f'sources/{name}-extraction.json').write_text(json.dumps({'cellSize':[627,627],'spriteBoxes':boxes,'outputSize':size,'note':'trim transparent packing around 8 separately painted sprites; no extra temporal frames'},indent=2))
    return frames

def save(name,frames):
    w,h=frames[0].size
    sheet=Image.new('RGBA',(w*len(frames),h))
    for i,f in enumerate(frames):sheet.paste(f,(i*w,0))
    sheet.save(R/f'sheets/{name}.webp',quality=95,method=6)
    a=[]
    for f in frames:
        v=np.asarray(f.resize((128,128))).astype(float)/255
        a.append(np.concatenate([v[:,:,:3]*v[:,:,3:],v[:,:,3:]],2))
    diffs=[float(np.abs(a[i]-a[(i+1)%len(a)]).mean()) for i in range(len(a))]
    mid=float(np.median([d for i,d in enumerate(diffs) if i not in [3,7]]))
    ratios=[diffs[i]/max(mid,1e-8) for i in [3,7]]
    reviews.append({'id':name,'nativeCellSize':[w,h],'distinctHashes':len({hashlib.sha256(f.tobytes()).hexdigest() for f in frames}),'adjacentPremultipliedMAE':diffs,'medianWithinBatch':mid,'batchBoundaryRatios':ratios,'boundaryCriterion':1.5,'meetsBoundaryCriterion':max(ratios)<=1.5,'temporalSynthesis':False})
    strip=Image.new('RGB',(1440,200),(25,25,32));d=ImageDraw.Draw(strip)
    for i,f in enumerate(frames):
        f=f.copy();f.thumbnail((175,175));strip.paste(f,(i*180,22),f);d.text((i*180+5,3),str(i+1),fill='white')
    (R/'strips').mkdir(exist_ok=True);strip.save(R/f'strips/{name}.jpg',quality=90)
    return {'id':name,'sheet':f'sheets/{name}.webp','frameW':w,'frameH':h,'frames':len(frames),'source':[f'sources/{name}-a.webp',f'sources/{name}-b.webp'],'nativePaintedFrames':True}

assets={}
for name in ['lava-surface','lavafall','ice-stream','waterfall-ice','cloud-sea']:
    fr=cells(name)
    if name in ['lava-surface','ice-stream','cloud-sea']:fr=[spatial_edges(f) for f in fr]
    assets[name]=save(name,fr)
for p in model['pieces']:
    oldid=p['id'].split('--')[0]
    name=('waterfall-ice' if oldid.startswith('waterfall-ice-') else 'lavafall' if oldid.startswith('lavafall-') else oldid)
    if name not in assets:continue
    a=assets[name]
    for k in ['sheet','frameW','frameH','frames']:p[k]=a[k]
    p['opacity']={'lava-surface':.68,'lavafall':.72,'ice-stream':.58,'waterfall-ice':.7}[name]
    # Keep existing blend and world footprint to make comparison attributable.
    p['sourceAsset']=name
reg=next(v for v in regions if v['id']=='cloud-sea')
# Clouds replace old fog only where the new cloud region is authored.
model['pieces']=[p for p in model['pieces'] if p['regionId'] not in ['fog-bank-gold-upper','fog-bank-gold-lower']]
base={'regionId':'cloud-sea','mask':reg['mask'],'maskRectPx':reg['maskRectPx'],'rectWorld':reg['rectWorld'],'frames':8,'fps':3,'loop':True,'blend':'normal','opacity':.38,'frameOrder':list(range(8)),'scrollSpeed':0}
model['pieces'].append(dict(base,id='cloud-sea-curls',**{k:assets['cloud-sea'][k] for k in ['sheet','frameW','frameH']},tileInRegion=True,tileWorld=[260,260]))
# Four genuinely drawn static RGBA puffs. Only these pieces may translate.
cloudpath=R/'sources/cloud-puffs.png'
if not cloudpath.exists():cloudpath=cloudpath.with_suffix('.webp')
cloud=Image.open(cloudpath).convert('RGBA')
w,h=cloud.width//2,cloud.height//2
for i,(pos,vel) in enumerate([([2090,260],[3,-.35]),([2210,595],[-2.4,.25]),([2960,275],[2,.3]),([2520,746],[-2.6,-.2])]):
    c,r=i%2,i//2;f=cloud.crop((c*w,r*h,(c+1)*w,(r+1)*h));f.save(R/f'sheets/cloud-puff-{i+1}.webp',lossless=True,method=6)
    p=dict(base,id=f'cloud-puff-{i+1}',sheet=f'sheets/cloud-puff-{i+1}.webp',frameW=w,frameH=h,frames=1,fps=1,frameOrder=[0],opacity=.52,driftWorld=vel,clipRegion='cloud-sea',driftOriginWorld=pos,spriteWorld=[70+i*5,48+i*4],wrapWithinMaskBounds=True)
    model['pieces'].append(p)
    assets[f'cloud-puff-{i+1}']={'id':f'cloud-puff-{i+1}','sheet':p['sheet'],'frameW':w,'frameH':h,'frames':1,'source':'sources/cloud-puffs.webp','staticPaintedPuff':True}
model['assets']=[a for a in model['assets'] if not (a['id'] in ['lava-surface','ice-stream'] or a['id'].startswith(('lavafall-','waterfall-ice-')))]+list(assets.values())
model['schemaVersion']=2
model['animationPolicy']='Eight individually painted frames per fluid/curl; frame replacement only. Four static painted puffs translate in world units/sec, wrap at cloud region bounds and clip every frame. Camera never drives motion.'
(R/'fx-layout.json').write_text(json.dumps(model,ensure_ascii=False,indent=2))
(R/'loop-review.json').write_text(json.dumps({'method':'128px premultiplied RGBA MAE, source order row-major A1..A4 B1..B4; no temporal blending, warping, fades or duplicate endpoints','assets':reviews,'visualApproval':'pending artist review; numerical continuity does not establish artistic quality'},indent=2))
# Preserve the exact PNG generation outputs losslessly in WebP.
for p in (R/'sources').glob('*.png'):
    Image.open(p).save(p.with_suffix('.webp'),lossless=True,method=6)
    p.unlink()
print(json.dumps(reviews,indent=2))
