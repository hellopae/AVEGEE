"""Render offline game-scale comparisons and source stair probes, never the game."""
import json

import cv2
import numpy as np
from PIL import Image, ImageDraw

from build import OUT, SOURCE, FULL, crop, items, stitch, write, ROOT

before=stitch(SOURCE/'v7',FULL,2048)
after=stitch(OUT/'v8',FULL,2048)
source=stitch(ROOT/'img/map-zone2/v2',(4915,3277),1024)
structure=json.loads((OUT/'structure.json').read_text())
for folder in ['compare-game','structure']:
    (OUT/folder).mkdir(exist_ok=True)
for item,record in zip(items(),structure['regions']):
    box=item['contextRectPx1x'];a,b=crop(before,box),crop(after,box)
    h,w=a.shape[:2]
    gw,gh=round(w*2.8*3840/9830),round(h*2.8*2560/6554)
    game=Image.new('RGB',(gw*2,gh+36),'#151923');d=ImageDraw.Draw(game)
    for i,pixels in enumerate([a,b]):
        game.paste(Image.fromarray(pixels).resize((gw,gh),Image.Resampling.LANCZOS),(i*gw,36))
    d.text((8,10),item['id']+' | V7 / V8 | OFFLINE 2.8 device px/world; no sprites/HUD',fill='white')
    game.save(OUT/'compare-game'/f"{item['id']}.jpg",quality=95,subsampling=0)
    x,y,ex,ey=box
    ref=Image.fromarray(source[y:ey,x:ex]).resize((w,h),Image.Resampling.LANCZOS)
    sheet=Image.new('RGB',(w*2,h+36),'#151923');sheet.paste(ref,(0,36));sheet.paste(Image.fromarray(b),(w,36));d=ImageDraw.Draw(sheet)
    d.text((8,10),item['id']+' | V2 / decoded V8; NCC samples, not a semantic contour proof',fill='white')
    for probe in record['probes']:
        px,py=probe['point'];dx,dy=probe['displacement'];lx,ly=(px-x)*2,(py-y)*2+36
        color='cyan' if probe['reliable'] and probe['within4px'] else 'red' if probe['reliable'] else 'yellow'
        d.ellipse((lx-2,ly-2,lx+2,ly+2),outline=color)
        tx,ty=lx+w+dx*2,ly+dy*2
        d.line((lx+w,ly,tx,ty),fill=color,width=2);d.ellipse((tx-2,ty-2,tx+2,ty+2),outline=color)
    sheet.save(OUT/'structure'/f"{item['id']}.jpg",quality=95,subsampling=0)

# Eight successive source riser edges, selected on the V2 source before matching.
# They span the entire diagonal flight; the lower-left two are in the old ramp.
anchors=[[181,404],[246,378],[310,352],[377,324],[442,298],[511,270],[572,245],[631,221]]
box=[1490,1170,1920,1460]
ref=np.array(Image.open(OUT/'inputs/lava-actual-v2.png').convert('RGB'))
images=[ref,crop(before,box),crop(after,box)]
grays=[cv2.cvtColor(im,cv2.COLOR_RGB2GRAY).astype(np.float32) for im in images]
graybands=[cv2.GaussianBlur(a,(0,0),1.5)-cv2.GaussianBlur(a,(0,0),6) for a in grays]
records=[]
for i,(x,y) in enumerate(anchors):
    template=graybands[0][y-24:y+25,x-24:x+25]
    entry=dict(tread=i+1,sourceLocalPx2x=[x,y],sourceMapPx1x=[1490+x/2,1170+y/2])
    for label,band in zip(['v7','v8'],graybands[1:]):
        _,score,_,loc=cv2.minMaxLoc(cv2.matchTemplate(band[y-40:y+41,x-40:x+41],template,cv2.TM_CCOEFF_NORMED))
        dx,dy=loc[0]-16,loc[1]-16
        entry[label]=dict(displacementPx1x=[dx/2,dy/2],distancePx1x=float(np.hypot(dx,dy)/2),correlation=score,reliable=score>=.6)
    records.append(entry)
sheet=Image.new('RGB',(860*3,620),'#151923');d=ImageDraw.Draw(sheet)
for i,(label,pixels) in enumerate(zip(['V2 SOURCE','V7 BEFORE','V8 AFTER'],images)):
    sheet.paste(Image.fromarray(pixels),(i*860,40));d.text((i*860+8,12),label+' | 8 source riser anchors',fill='white')
    for j,(x,y) in enumerate(anchors):
        d.ellipse((i*860+x-4,y+36,i*860+x+4,y+44),outline='cyan',width=2)
        d.text((i*860+x+6,y+32),str(j+1),fill='cyan')
sheet.save(OUT/'structure/lava-treads.jpg',quality=95,subsampling=0)
write('lava-treads.json',dict(method='Eight manually selected successive V2 riser edges, bottom-left to top-right. DoG1.5/6 on 2x pixels, template49, search +/-16 output px, confidence>=.6; distances divided by2. No generated geometry.',
                             sourceTreadEdges=8,completeFlightVisuallyReviewedOffline=True,probes=records,
                             allEightV8ReliableWithin4px=all(r['v8']['reliable'] and r['v8']['distancePx1x']<=4 for r in records),
                             inGameTested=False))
mask=np.array(Image.open(OUT/'edit-mask.png'))>0
changed=np.any(after!=before,axis=2)
heat=np.zeros((*changed.shape,3),np.uint8);heat[mask & changed]=[0,210,130];heat[~mask & changed]=[255,60,70]
Image.fromarray(heat).resize((1920,1280),Image.Resampling.NEAREST).save(OUT/'outside-difference-overview.png')
print(json.dumps(dict(lavaTreads=len(records),allEightV8ReliableWithin4px=all(r['v8']['reliable'] and r['v8']['distancePx1x']<=4 for r in records),
                      v7Distances=[round(r['v7']['distancePx1x'],2) for r in records],v8Distances=[round(r['v8']['distancePx1x'],2) for r in records]),indent=2))
