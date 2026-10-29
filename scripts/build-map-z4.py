#!/usr/bin/env python3
"""Register built-in image_gen quadrant detail to the LIVE CyberHell painting.
No generation/API calls: inputs must be the four saved built-in outputs.
Retain original structural-edge bands, transfer freshly painted surface detail,
then use the same 4915x3277/20-WebP geometry as Zone 2. Never changes collision.
"""
import argparse, hashlib, json, sys
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0,str(Path(__file__).resolve().parent))
import town_terrain_lib as T

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--src',type=Path,required=True)
p.add_argument('--out',type=Path,default=Path('img/map-zone4/v2'))
p.add_argument('--evidence',type=Path,default=Path('output/coordination/2026-10-29-map-z4'))
a=p.parse_args()
cv2.setNumThreads(2);cv2.setRNGSeed(0)
a.out.mkdir(parents=True,exist_ok=True);a.evidence.mkdir(parents=True,exist_ok=True)
original=Image.open('img/theme-v4/map-cyberhell.webp').convert('RGB')
quads={};report={'source':'img/theme-v4/map-cyberhell.webp','generator':'built-in image_gen','quadrants':{}}
for n,b in T.QUADS.items():
    box=tuple(round(v*(original.width/1536 if i%2==0 else original.height/1024)) for i,v in enumerate(b))
    ref=original.crop(box)
    paint=Image.open(a.src/f'q-{n}.png').convert('RGB')
    if paint.width<1400 or paint.height<900:raise ValueError(f'{n}: insufficient native generated detail {paint.size}')
    # Register on the original crop grid; dense displacement is only used for
    # resampling AI detail, never for relocating source geometry or game sites.
    rgb=np.asarray(paint.resize(ref.size,Image.Resampling.LANCZOS))
    rg=np.asarray(ref)
    gray=lambda im:cv2.cvtColor(im,cv2.COLOR_RGB2GRAY)
    dis=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    dis.setFinestScale(0);dis.setGradientDescentIterations(50);dis.setVariationalRefinementIterations(10)
    flow=dis.calc(gray(rg),gray(rgb),None)
    w,h=paint.size
    flow=cv2.resize(flow,(w,h),interpolation=cv2.INTER_LINEAR)
    flow[:,:,0]*=w/ref.width;flow[:,:,1]*=h/ref.height
    yy,xx=np.mgrid[:h,:w].astype(np.float32)
    registered=cv2.remap(np.asarray(paint),xx+flow[:,:,0],yy+flow[:,:,1],cv2.INTER_CUBIC,borderMode=cv2.BORDER_REFLECT)
    quads[n]=Image.fromarray(registered)
    report['quadrants'][n]={'native':list(paint.size),'referenceBox':list(box),'inputSHA256':hashlib.sha256((a.src/f'q-{n}.png').read_bytes()).hexdigest()}

painted=T.stitch(quads).astype(np.float32)
base=np.asarray(original.resize(T.FULL,Image.Resampling.LANCZOS)).astype(np.float32)
# Retain composition and lighting at low spatial frequencies; fresh generated
# microdetail supplies the surface relief. This is not old-image sharpening.
detail=painted-cv2.GaussianBlur(painted,(0,0),5)
base_low=cv2.GaussianBlur(base,(0,0),1.5)
repaint=np.clip(base_low+detail*.85,0,255)
# Original edge geometry remains authoritative. Preserve a 2-world-pixel band
# around every source edge, including shorelines, floor symbols and masonry.
edges=cv2.Canny(cv2.GaussianBlur(np.asarray(original),(0,0),2),30,60)
protected=cv2.dilate(edges,np.ones((5,5),np.uint8))
protect=cv2.resize(protected,T.FULL,interpolation=cv2.INTER_NEAREST)>0
weight=cv2.GaussianBlur(protect.astype(np.float32),(0,0),1.5)
weight[protect]=1
sheet=np.uint8(np.rint(np.clip(base*weight[:,:,None]+repaint*(1-weight[:,:,None]),0,255)))
T.write_chunks(sheet,str(a.out),92)
T.write_preview(sheet,str(a.out/'zone4-terrain-v2-preview.webp'),92)
# Measure the DELIVERED WebP tiles, not an unencoded intermediate.
delivered=T.load_sheet_from_chunks(str(a.out))
after=Image.fromarray(delivered).resize(original.size,Image.Resampling.LANCZOS)
after.save(a.evidence/'after-world.webp',quality=95)
# Overlay source geometry: red source edges, cyan delivered edges; white coincides.
e2=cv2.Canny(cv2.GaussianBlur(np.asarray(after),(0,0),2),30,60)
ov=np.asarray(after).copy()//2
ov[edges>0]=[255,50,50];ov[e2>0]=[0,220,255];ov[(edges>0)&(e2>0)]=[255,255,255]
Image.fromarray(ov).save(a.evidence/'layout-edge-overlay.png')
dist=cv2.distanceTransform(255-e2,cv2.DIST_L2,cv2.DIST_MASK_PRECISE)
values=dist[edges>0]
report['edgeRegistration']={'coordinateSpace':'original 1678x937 world pixels','sourceEdgePixels':len(values),'within2pxFraction':float((values<=2).mean()),'p50Px':float(np.median(values)),'p95Px':float(np.percentile(values,95)),'maxPx':float(values.max()),'note':'Nearest delivered edge distance; not a semantic landmark proof. Inspect overlay and browser review.'}
# Exact max legacy zoom (2.5), 1280x720 CSS viewport, DPR1; terrain only.
# Use the camera geometry of scene.mapViewport, clamped exactly as the UI does.
for key,cx,cy in [('lava-bridge',620,455),('throne-stairs',835,505),('east-dock',1385,700)]:
    scale=1280/1678*2.5
    vw,vh=1280/scale,720/scale
    x=max(0,min(original.width-vw,cx-vw/2));y=max(0,min(original.height-vh,cy-vh/2))
    box=(x,y,x+vw,y+vh)
    canvas=Image.new('RGB',(2560,755),(22,20,30));d=ImageDraw.Draw(canvas)
    d.text((12,10),'BEFORE | zoom 2.5 | terrain-only camera reconstruction',fill='white')
    d.text((1292,10),'AFTER | zoom 2.5 | terrain-only camera reconstruction',fill='white')
    for i,im in enumerate([original,Image.fromarray(delivered)]):
        b=box if i==0 else tuple(v*(T.FULL[0]/original.width if j%2==0 else T.FULL[1]/original.height) for j,v in enumerate(box))
        canvas.paste(im.resize((1280,720),Image.Resampling.BICUBIC,box=b),(i*1280,35))
    canvas.save(a.evidence/f'zoom-max-{key}.png')
report['sheet']=list(T.FULL);report['chunks']=20
report['surfaceDetailFraction']=float((~protect).mean())
report['comparison']={}
for zone in ['map-zone2/v2','map-zone4/v2']:
    files=list(Path('img',zone).glob('r*-c*.webp'))
    report['comparison'][zone]={'tiles':len(files),'encodedBytes':sum(f.stat().st_size for f in files),'decodedRGBABytes':sum(Image.open(f).width*Image.open(f).height*4 for f in files)}
report['mobile']={'maxConcurrentLoads':3,'maxDecodedAndLoadingTiles':12,'upperBoundTileRGBABytes':12*1024*1024*4,'note':'Static allocation bound only. No mobile browser timing or device measurement in sandbox.'}
report['files']={f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(a.out.glob('*.webp'))}
(a.out/'stitch-report.json').write_text(json.dumps(report,indent=2)+'\n')
(a.evidence/'asset-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['edgeRegistration','surfaceDetailFraction','comparison','mobile']},indent=2))
