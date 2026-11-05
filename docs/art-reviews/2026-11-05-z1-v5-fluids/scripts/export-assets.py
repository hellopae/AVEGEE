"""Slice painted source cells; spatial export only, no temporal synthesis.
Every output frame is sourced from its corresponding individually painted cell.
"""
from pathlib import Path
import json,shutil,hashlib,math
import numpy as np
import cv2
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
OLD=Path('/Users/agapae/agapae-work/.codex-worktrees/20261104T191411Z-285bbd21/docs/art-reviews/2026-11-05-fx-art-z1')
for d in ['sheets','strips']: (ROOT/d).mkdir(exist_ok=True)
regions=json.loads((ROOT/'regions.json').read_text())['regions']
assets=[];layout=[];reviews=[]

def cells(name):
    p=ROOT/f'sources/{name}.png'
    if not p.exists():p=p.with_suffix('.webp')
    im=Image.open(p).convert('RGBA')
    return [im.crop((round(c*im.width/4),round(r*im.height/2),round((c+1)*im.width/4),round((r+1)*im.height/2))) for r in range(2) for c in range(4)]

def spatial_edges(im,band=10):
    # Join opposing spatial edges of each independently painted cell. No frame
    # translation, warping, temporal blend, duplicated endpoint or opacity ramp.
    a=np.asarray(im).copy().astype(float)
    for j in range(band):
        k=1-j/band;avg=(a[:,j]+a[:,-1-j])/2
        a[:,j]=a[:,j]*(1-k)+avg*k;a[:,-1-j]=a[:,-1-j]*(1-k)+avg*k
    for j in range(band):
        k=1-j/band;avg=(a[j]+a[-1-j])/2
        a[j]=a[j]*(1-k)+avg*k;a[-1-j]=a[-1-j]*(1-k)+avg*k
    return Image.fromarray(np.uint8(a.clip(0,255)))

def metrics(fr):
    a=[np.asarray(f.resize((128,128))).astype(float)/255 for f in fr]
    a=[np.concatenate([v[:,:,:3]*v[:,:,3:],v[:,:,3:]],2) for v in a]
    diffs=[float(np.abs(a[i]-a[(i+1)%len(a)]).mean()) for i in range(len(a))]
    return {'adjacentPremultipliedMAE':diffs,'wrapMAE':diffs[-1],'medianInteriorMAE':float(np.median(diffs[:-1])),'wrapToInteriorRatio':diffs[-1]/max(.00001,float(np.median(diffs[:-1]))),'distinctFrameHashes':len({hashlib.sha256(f.tobytes()).hexdigest() for f in fr}),'assessment':'numerical continuity only; visual review required'}

def save(name,fr,source,tile=False):
    w,h=fr[0].size
    sheet=Image.new('RGBA',(w*8,h))
    for i,f in enumerate(fr):sheet.paste(f,(i*w,0))
    sheet.save(ROOT/f'sheets/{name}.webp',lossless=True,method=6)
    strip=Image.new('RGB',(8*180,180),(28,29,37))
    for i,f in enumerate(fr):
        f=f.copy();f.thumbnail((176,150));strip.paste(f,(i*180+(180-f.width)//2,18),f)
    d=ImageDraw.Draw(strip)
    for i in range(8):d.text((i*180+6,3),f'{i+1}',fill='white')
    strip.save(ROOT/f'strips/{name}-frame-strip.jpg',quality=88)
    m=metrics(fr);m.update({'id':name,'sheet':f'sheets/{name}.webp','frames':8,'source':source,'temporalSynthesis':False,'tileable':tile})
    if tile:
        m['maxOpposingEdgeError']=max(int(np.abs(np.asarray(f).astype(int)[:,0]-np.asarray(f).astype(int)[:,-1]).max()) for f in fr)
        m['maxTopBottomEdgeError']=max(int(np.abs(np.asarray(f).astype(int)[0]-np.asarray(f).astype(int)[-1]).max()) for f in fr)
    reviews.append(m)
    asset={'id':name,'sheet':m['sheet'],'frameW':w,'frameH':h,'frames':8,'source':source,'frameStrip':f'strips/{name}-frame-strip.jpg','new':True}
    assets.append(asset);return asset

def placed(asset,reg,opacity,fps,blend='normal',tile=False,tileWorld=None):
    x={'id':asset['id']+'--'+reg['id'],'sheet':asset['sheet'],'frameW':asset['frameW'],'frameH':asset['frameH'],'frames':asset['frames'],'fps':fps,'loop':True,'blend':blend,'opacity':opacity,'regionId':reg['id'],'scrollDir':reg['flowDir'],'scrollSpeed':0,'mask':reg['mask'],'maskRectPx':reg['maskRectPx'],'frameOrder':list(range(8))}
    if tile:x.update({'tileInRegion':True,'tileWorld':tileWorld})
    else:x['rectWorld']=reg['rectWorld']
    layout.append(x)

# Reuse only the accepted sheets that are actually rendered.
manifest=json.loads((OLD/'fx-manifest.json').read_text())
for name in ['spirit-river','lava-surface']:
    a=next(v for v in manifest['assets'] if v['id']==name)
    shutil.copy2(OLD/a['sheet'],ROOT/a['sheet'])
    asset={k:a[k] for k in ['id','sheet','frameW','frameH','frames']};asset['new']=False;asset['sourceRun']='FX-ART-Z1';assets.append(asset)
    im=Image.open(ROOT/asset['sheet']).convert('RGBA');fr=[im.crop((i*a['frameW'],0,(i+1)*a['frameW'],a['frameH'])) for i in range(8)]
    rv=metrics(fr);rv.update({'id':name,'reused':True,'frames':8});reviews.append(rv)
    for reg in regions:
        if reg['kind']==name or (name=='lava-surface' and reg['kind']=='lava'):
            placed(asset,reg,.36 if name=='spirit-river' else .48,8 if name=='spirit-river' else 7,'overlay',True,[a['frameW']/2.56,a['frameH']/2.56])

ice=save('ice-stream',[spatial_edges(f.resize((384,384),Image.Resampling.LANCZOS)) for f in cells('ice-stream')],'sources/ice-stream.webp',True)
for reg in regions:
    if reg['kind']=='ice-stream':placed(ice,reg,.4,8,'overlay',True,[150,150])

for kind,name in [('waterfall','waterfall-ice'),('lavafall','lavafall')]:
    src=cells(name)
    # Common, locked crop around the painted curtain, never per-frame recentering.
    alpha=np.maximum.reduce([np.asarray(f.resize((444,444)))[:,:,3] for f in src])
    yy,xx=np.where(alpha>48);box=(max(0,int(xx.min())-2),0,min(444,int(xx.max())+3),444)
    for reg in regions:
        if reg['kind']!=kind:continue
        x,y,w,h=reg['maskRectPx']
        # Master's exact horizontal scale is 1.2799479, slightly below nominal
        # 1.28. Ceil the world-sized frame so the >=2.56 requirement is literal.
        fw=math.ceil(reg['rectWorld'][2]*2.56);fh=math.ceil(reg['rectWorld'][3]*2.56)
        mask=Image.open(ROOT/reg['mask']).resize((fw,fh),Image.Resampling.NEAREST)
        fr=[]
        for f in src:
            f=f.resize((444,444),Image.Resampling.LANCZOS).crop(box).resize((fw,fh),Image.Resampling.LANCZOS)
            a=np.asarray(f).copy();a[:,:,3]=((a[:,:,3].astype(np.uint16)*np.asarray(mask).astype(np.uint16))//255).astype('uint8')
            fr.append(Image.fromarray(a))
        asset=save(reg['id'],fr,f'sources/{name}.webp; common crop {box}; map-specific fixed mask')
        asset['outputPixelsPerWorldUnit']=[fw/reg['rectWorld'][2],fh/reg['rectWorld'][3]]
        placed(asset,reg,.46 if kind=='waterfall' else .5,8 if kind=='waterfall' else 7,'overlay')

fog=save('fog-bank-valleys',[spatial_edges(f.resize((384,384),Image.Resampling.LANCZOS)) for f in cells('fog-bank')],'sources/fog-bank.webp',True)
for reg in regions:
    if reg['kind']=='fog':placed(fog,reg,.16,3,'overlay',True,[150,150])

# The foam art is a long thin painted ribbon; the bank mask is an INNER narrow
# ring of actual liquid, not random particles or round cloud placements.
for kind,name in [('spirit-river','bank-foam-spirit'),('ice-stream','bank-foam-ice')]:
    fr=[spatial_edges(f.resize((384,96),Image.Resampling.LANCZOS),6) for f in cells(name)]
    asset=save(name,fr,f'sources/{name}.webp',True)
    for reg in regions:
        if reg['kind']!=kind:continue
        a=np.asarray(Image.open(ROOT/reg['mask'])).copy()
        dist=cv2.distanceTransform(a,cv2.DIST_L2,3)
        bank=((dist>=2)&(dist<=7)).astype('uint8')*255
        path=f"masks/regions/{reg['id']}-bank.png";Image.fromarray(bank).save(ROOT/path,optimize=True)
        placed(asset,reg,.28,8,'overlay',True,[150,37.5]);layout[-1]['clipMask']=path

# Preserve original painted sources losslessly for provenance, not giant PNGs.
for path in (ROOT/'sources').glob('*.png'):
    if path.stem=='review':path.unlink();continue
    Image.open(path).save(path.with_suffix('.webp'),lossless=True,method=6);path.unlink()
for path in (ROOT/'sources').glob('*review.jpg'):path.unlink()
(ROOT/'fx-layout.json').write_text(json.dumps({'schemaVersion':1,'worldSize':[3840,2560],'masterSize':[4915,3277],'maskPolicy':'destination-in region mask after drawing every layer; optional clipMask further narrows bank foam','animationPolicy':'painted frame replacement only; fixed placement; scrollDir metadata only, scrollSpeed=0','assets':assets,'pieces':layout},ensure_ascii=False,indent=2))
(ROOT/'loop-review.json').write_text(json.dumps({'method':'premultiplied RGBA MAE on 128px review proxy, no duplicate endpoint','assets':reviews,'visualReview':'see preview-clip.mp4; perceptual approval remains with map artist'},indent=2))
thumbs=[]
for a in assets:
    if a.get('new'):
        im=Image.open(ROOT/a['frameStrip']);thumbs.append((a['id'],im))
contact=Image.new('RGB',(1440,len(thumbs)*205),(25,26,33));d=ImageDraw.Draw(contact)
for i,(name,im) in enumerate(thumbs):d.text((8,i*205+4),name,fill='white');contact.paste(im,(0,i*205+23))
contact.save(ROOT/'frame-strip.jpg',quality=84)
print('assets',len(assets),'placements',len(layout),'new',len(thumbs))
