"""Source-head compositing explicitly authorized by the follow-up brief.
Retains the individually drawn animation bodies, arms, food and walking legs.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image,ImageDraw,ImageChops,ImageOps
from scipy import ndimage
OUT=Path(__file__).resolve().parents[2]
REPO=OUT.parents[2]
EV=Path(__file__).resolve().parent
PREV=Path('/Users/agapae/agapae-work/.toby-worktrees/.codex-worktrees/20261111T065049Z-44a264e5/docs/art-reviews/2026-11-10-worker-cook')
# Source column 1 except Asia's open-eye column 0. Head contours exclude collars.
CONFIG={
 'cyberhell':dict(col=1,cut=155,neck=162,oldx=197,newx=208,pivot=190,width=1.05,head=[(0,0),(320,0),(320,164),(266,164),(250,174),(202,179),(177,171),(155,167),(0,167)]),
 'th':dict(col=1,cut=172,neck=161,oldx=188,newx=209,pivot=189,width=1.07,head=[(0,0),(320,0),(320,161),(276,161),(257,174),(223,179),(196,169),(172,165),(0,165)]),
 'asia':dict(col=0,cut=156,neck=163,oldx=175,newx=204,pivot=184,width=1.06,head=[(0,0),(320,0),(320,162),(255,162),(239,174),(214,181),(190,177),(164,166),(0,166)]),
 'west':dict(col=1,cut=140,neck=166,oldx=174,newx=211,pivot=183,width=1.06,head=[(0,0),(320,0),(320,173),(275,173),(263,181),(249,187),(221,192),(198,185),(179,178),(161,174),(0,174)])
}

def clean(frame):
 a=np.array(frame);mask=a[:,:,3]>40
 lab,n=ndimage.label(mask);counts=np.bincount(lab.ravel());counts[0]=0
 main=lab==counts.argmax()
 keep=ndimage.binary_dilation(main,iterations=1)
 a[~keep]=0
 return Image.fromarray(a)

def get_head(zone):
 c=CONFIG[zone];src=Image.open(REPO/f'img/workers/worker-{zone}-sheet-v2.webp').convert('RGBA')
 src=clean(src.crop((c['col']*320,0,(c['col']+1)*320,320)))
 mask=Image.new('L',(320,320));ImageDraw.Draw(mask).polygon(c['head'],fill=255)
 src.putalpha(ImageChops.multiply(src.getchannel('A'),mask))
 return src

report=[]
for zone,c in CONFIG.items():
 atlas=Image.open(PREV/f'worker-{zone}-cook-v1.webp').convert('RGBA')
 out=Image.new('RGBA',atlas.size)
 h=get_head(zone);h.save(EV/f'head-{zone}-source.webp',lossless=True)
 for row in range(2):
  # Canonical left view follows drawWorker's existing horizontal reflection.
  head=ImageOps.mirror(h) if row else h
  for f in range(8):
   old=atlas.crop((f*320,row*320,(f+1)*320,(row+1)*320))
   mirrored=bool(row)
   work=ImageOps.mirror(old) if mirrored else old
   # Body-only transform. Upper-neck alignment tapers to the existing foot anchor.
   cut,neck=c['cut'],c['neck'];bottom=315 if zone=='cyberhell' else 320
   body=work.crop((0,cut,320,bottom))
   erase={'th':6,'cyberhell':10,'west':0,'asia':0}[zone]
   if erase:body.paste((0,0,0,0),(0,0,320,erase))
   sx=c['width'];sy=(bottom-neck)/(bottom-cut)
   # Position at the neck, preserve horizontal foot midpoint at the bottom.
   offset=c['newx']-(c['pivot']+(c['oldx']-c['pivot'])*sx)
   # output -> input affine, offset fades toward the feet.
   height=bottom-neck
   affine=(1/sx,offset/(height*sx),c['pivot']*(1-1/sx)-offset/sx,0,1/sy,0)
   body=body.transform((320,height),Image.Transform.AFFINE,affine,Image.Resampling.BICUBIC)
   new=Image.new('RGBA',(320,320));new.alpha_composite(body,(0,neck))
   if mirrored:new=ImageOps.mirror(new)
   new.alpha_composite(head)
   new=clean(new)
   out.alpha_composite(new,(f*320,row*320))
 out.save(OUT/f'worker-{zone}-cook-v1.webp',lossless=True,method=6)
 report.append({'zone':zone,'sourceIdleColumn':c['col'],'sourceHeadContour':c['head'],'bodyTransform':c,'frames':16,'headPixelsFromOriginal':True})
(EV/'composition.json').write_text(json.dumps(report,indent=2)+'\n')
# Native-size before/after plates.
for z in CONFIG:
 old=Image.open(PREV/f'worker-{z}-cook-v1.webp').convert('RGBA');new=Image.open(OUT/f'worker-{z}-cook-v1.webp').convert('RGBA')
 plate=Image.new('RGB',(1280,1376),(229,230,233));d=ImageDraw.Draw(plate)
 for r in range(4):
  a=old if r%2==0 else new;row=r//2
  for j,f in enumerate([0,3,4,7]):
   cell=a.crop((f*320,row*320,(f+1)*320,(row+1)*320))
   plate.paste(cell,(j*320,r*344+24),cell);d.text((j*320+5,r*344+5),f'{z} {"before" if r%2==0 else "after"} row{row} f{f+1}',fill='black')
 plate.save(EV/f'{z}-composite.jpg',quality=86)
