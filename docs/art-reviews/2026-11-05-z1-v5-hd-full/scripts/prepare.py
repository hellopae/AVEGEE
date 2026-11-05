"""Prepare only assigned crops using approved repair mask formula; no generation."""
from pathlib import Path
import json, hashlib
import numpy as np
from PIL import Image, ImageDraw
R=Path(__file__).resolve().parents[4]
O=Path(__file__).resolve().parents[1]
P=Path('/Users/agapae/agapae-work/.codex-worktrees/20261105T020514Z-5d66c53d/docs/art-reviews/2026-11-05-z1-v5-hd')
W,H=4915,3277
im=Image.new('RGB',(W,H)); sources=[]
def provenance(p):
 sources.append(dict(path=str(p),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),bytes=p.stat().st_size))
for row in range(1,5):
 for col in range(1,6):
  p=R/f'img/map-zone1/v5/r{row}-c{col}.webp';im.paste(Image.open(p),((col-1)*1024,(row-1)*1024));provenance(p)
repairs=[(2,3,'r2-c3-v1.webp',80,48,[[590,115,975,345],[365,515,1024,870],[110,710,365,940]]),(3,3,'r3-c3-pier-v1.webp',16,16,[[630,40,1000,360]]),(1,3,'r1-c3-v1.webp',16,16,[[290,775,850,1024]])]
for row,col,name,border,fade,boxes in repairs:
 mask=np.zeros((1024,1024),np.float32)
 for x0,y0,x1,y1 in boxes:
  x=np.arange(x1-x0)+.5;y=np.arange(y1-y0)+.5
  a=np.minimum(np.minimum(x/42,(x1-x0-x)/42),1)[None,:]*np.minimum(np.minimum(y/42,(y1-y0-y)/42),1)[:,None]
  mask[y0:y1,x0:x1]=1-(1-mask[y0:y1,x0:x1])*(1-a)
 q=np.arange(1024)+.5;edge=np.clip(np.minimum((q-border)/fade,(1024-border-q)/fade),0,1)
 mask*=edge[:,None]*edge[None,:]
 p=R/'img/map-zone1/repairs'/name;provenance(p)
 art=Image.open(p).convert('RGB').resize((1024,1024))
 im.paste(art,((col-1)*1024,(row-1)*1024),Image.fromarray(np.uint8(mask*255)))
provenance(R/'src/town-terrain-repair.js');provenance(P/'objects-inventory.json')
inv=json.loads((P/'objects-inventory.json').read_text()); tiles=[]
sheet=Image.new('RGB',(1280,1280))
for ci,chunk in enumerate(['r1-c2','r1-c3']):
 out=O/chunk; (out/'inputs').mkdir(parents=True,exist_ok=True)
 ox=(int(chunk[-1])-1)*1024;oy=0
 im.crop((ox,0,ox+1024,1024)).save(out/'inputs/v5-repaired.webp',lossless=True)
 objects=[o for o in inv if chunk in o['chunk']]
 (out/'inputs/objects.json').write_text(json.dumps(objects,ensure_ascii=False,indent=2))
 for ry in range(2):
  for cx in range(2):
   id=f'q{ry+1}{cx+1}';x=ox+cx*512;y=ry*512
   x0=max(0,x-64);y0=max(0,y-64);x1=min(W,x+576);y1=min(H,y+576)
   crop=im.crop((x0,y0,x1,y1));crop.save(out/f'inputs/{id}-v5.png')
   crop.save(out/f'inputs/{id}-v5.webp',lossless=True)
   removal=[]
   for obj in inv:
    if obj['action']=='keep-baked':continue
    bx,by,bw,bh=obj['bboxWorld'];bx*=W/3840;by*=H/2560;bw*=W/3840;bh*=H/2560
    if bx<x1 and bx+bw>x0 and by<y1 and by+bh>y0:
     removal.append(dict(id=obj['id'],kind=obj['kind'],bboxCropPx1x=[round(bx-x0,1),round(by-y0,1),round(bw,1),round(bh,1)]))
   tiles.append(dict(chunk=chunk,id=id,coreGlobalPx1x=[x,y,512,512],contextGlobalPx1x=[x0,y0,x1-x0,y1-y0],coreChunkPx1x=[cx*512,ry*512,512,512],contextChunkPx1x=[x0-ox,y0,x1-x0,y1-y0],remove=removal))
   thumb=crop.resize((320,320));sheet.paste(thumb,((ci*2+cx)*320,ry*320))
 sheet.paste(im.crop((ox,0,ox+1024,1024)).resize((640,640)),(ci*640,640))
(O/'tiles.json').write_text(json.dumps(tiles,indent=2))
(O/'source-provenance.json').write_text(json.dumps(sources,indent=2))
sheet.save(O/'inputs-overview.jpg',quality=90)
print(json.dumps(tiles,indent=2))
