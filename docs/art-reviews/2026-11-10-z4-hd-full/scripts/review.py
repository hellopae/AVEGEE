"""Produce review-only crops and record measurements once, without quality gates."""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from prepare import OUT, CHUNKS, write_json, master

source=master()

for chunk in CHUNKS:
    folder=OUT/chunk
    asset=folder/f'{chunk}-2x.webp'
    if not asset.exists():continue
    im=Image.open(asset).convert('RGB')
    reg=json.loads((folder/'registration.json').read_text())['parts']
    x0=min(r['coreRectPx1x'][0] for r in reg.values());y0=min(r['coreRectPx1x'][1] for r in reg.values())
    # Exact output pixels, no resize: vertical join and horizontal join contact sheets.
    sx=(reg['q12']['coreRectPx1x'][0]-x0)*2
    strips=[im.crop((max(0,sx-110),0,min(im.width,sx+110),im.height))]
    labels=['vertical internal join, actual output pixels']
    if 'q21' in reg:
        sy=(reg['q21']['coreRectPx1x'][1]-y0)*2
        horizontal=im.crop((0,max(0,sy-110),im.width,min(im.height,sy+110))).transpose(Image.Transpose.ROTATE_90)
        strips.append(horizontal);labels.append('horizontal internal join, rotated 90 deg')
    sheet=Image.new('RGB',(sum(s.width for s in strips),max(s.height for s in strips)+30))
    d=ImageDraw.Draw(sheet);pos=0
    for strip,label in zip(strips,labels):
        sheet.paste(strip,(pos,30));d.text((pos+3,6),label,fill='white');pos+=strip.width
    sheet.save(folder/'seam-strips.jpg',quality=95)

    # Source-edge distance is a descriptive proxy. Dense redraw texture may make it
    # deceptively small, so never call it a semantic structure displacement bound.
    import cv2
    base=np.asarray(source.crop((x0,y0,x0+im.width//2,y0+im.height//2)))
    small=np.asarray(im.resize((base.shape[1],base.shape[0]),Image.Resampling.LANCZOS))
    edges=cv2.Canny(cv2.cvtColor(base,cv2.COLOR_RGB2GRAY),60,130)
    newedges=cv2.Canny(cv2.cvtColor(small,cv2.COLOR_RGB2GRAY),60,130)
    dist=cv2.distanceTransform(255-newedges,cv2.DIST_L2,cv2.DIST_MASK_PRECISE)
    values=dist[edges>0]
    proxy=dict(method='Canny 60/130, source edge -> nearest redraw edge at 1x, all pixels',samples=int(values.size),
        p50Px1x=float(np.median(values)),p95Px1x=float(np.percentile(values,95)),maxPx1x=float(values.max()),
        limitations='Texture edges are not semantic boundaries. This is NOT proof of structure <=4px; no thresholds applied.')
    path=folder/'structure.json';s=json.loads(path.read_text());s['sourceEdgeNearestDistanceProxy']=proxy;write_json(path,s)
