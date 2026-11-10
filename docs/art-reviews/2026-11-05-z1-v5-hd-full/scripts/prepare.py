"""Prepare exact v5 + runtime-repair crops; no generation and no source edits."""
from pathlib import Path
import json, hashlib
import numpy as np
from PIL import Image
O=Path(__file__).resolve().parents[1]
ROOT=O.parents[2]
INV=Path('/Users/agapae/agapae-work/.codex-worktrees/20261105T020514Z-5d66c53d/docs/art-reviews/2026-11-05-z1-v5-hd/objects-inventory.json')
LUMPS=Path('/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Toby/2026-11-05-v5-white-lumps.json')
REF=Path('/Users/agapae/agapae-work/.codex-worktrees/20261105T025229Z-00c52f6e/docs/art-reviews/2026-11-05-z1-v5-plaza-detail')
SX,SY=4915/3840,3277/2560
master=Image.new('RGB',(4915,3277)); sources=[]
for p in sorted((ROOT/'img/map-zone1/v5').glob('r*-c*.webp')):
 r,c=map(int,p.stem.replace('r','').split('-c'));master.paste(Image.open(p),((c-1)*1024,(r-1)*1024))
 sources.append(dict(path=str(p.relative_to(ROOT)),sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
# Reproduce repairOverlay alpha: union of rectangular product ramps plus outer edge fill.
repairs=[(2,3,'r2-c3-v1.webp',80,48,[[590,115,975,345],[365,515,1024,870],[110,710,365,940]]),(3,3,'r3-c3-pier-v1.webp',16,16,[[630,40,1000,360]]),(1,3,'r1-c3-v1.webp',16,16,[[290,775,850,1024]])]
for r,c,name,border,fade,boxes in repairs:
 p=ROOT/'img/map-zone1/repairs'/name; art=Image.open(p).convert('RGB').resize((1024,1024),Image.Resampling.LANCZOS)
 mask=np.zeros((1024,1024),np.float32)
 for x0,y0,x1,y1 in boxes:
  x=np.arange(x1-x0)+.5;y=np.arange(y1-y0)+.5
  a=np.minimum(np.minimum(x/42,(x1-x0-x)/42),1);b=np.minimum(np.minimum(y/42,(y1-y0-y)/42),1)
  v=b[:,None]*a[None,:];mask[y0:y1,x0:x1]=1-(1-mask[y0:y1,x0:x1])*(1-v)
 xy=np.arange(1024)+.5;edge=np.clip(np.minimum((xy-border)/fade,(1024-border-xy)/fade),0,1)
 mask*=edge[None,:]*edge[:,None]
 xy0=((c-1)*1024,(r-1)*1024);master.paste(art,xy0,Image.fromarray(np.uint8(np.rint(mask*255))))
 sources.append(dict(path=str(p.relative_to(ROOT)),sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
objects=json.loads(INV.read_text());lumps=json.loads(LUMPS.read_text())['lumps']; manifest=[]
for chunk in ['r1-c2','r1-c3']:
 d=O/chunk;(d/'inputs').mkdir(parents=True,exist_ok=True);col=int(chunk[-1]);ox=(col-1)*1024
 selected=[]
 for o in objects:
  if chunk not in o['chunk'] or o['action']=='keep-baked':continue
  x,y,w,h=o['bboxWorld'];selected.append(dict(o,masterPx=[x*SX,y*SY,w*SX,h*SY],removalVerified=False))
 selected_lumps=[l for l in lumps if chunk in l['chunks'] and 'delete' in l['review']]
 (d/'removed.json').write_text(json.dumps(dict(objects=selected,whiteLumps=selected_lumps,allRemovalsVisuallyVerified=False),ensure_ascii=False,indent=2))
 tiles=[]
 for row in range(2):
  for col0 in range(2):
   name=f'q{row+1}{col0+1}';x=ox+col0*512;y=row*512
   x0=x-64;y0=max(0,y-64);x1=x+576;y1=y+576
   p=d/'inputs'/f'{name}-v5.webp';master.crop((x0,y0,x1,y1)).save(p,lossless=True,method=6)
   rect=[x0,y0,x1-x0,y1-y0];targets=[]
   for o in selected:
    a,b,w,h=o['masterPx']
    if a+w>x0 and a<x1 and b+h>y0 and b<y1:targets.append(dict(id=o['id'],kind=o['kind'],bboxInputPx=[round(a-x0),round(b-y0),round(w),round(h)]))
   for l in selected_lumps:
    a,b,w,h=l['masterPx']
    if a+w>x0 and a<x1 and b+h>y0 and b<y1:targets.append(dict(id=l['id'],kind='embedded white fog lump',bboxInputPx=[a-x0,b-y0,w,h]))
   tiles.append(dict(id=name,coreMasterPx1x=[x,y,512,512],contextMasterPx1x=rect,coreChunkPx1x=[col0*512,row*512,512,512],contextChunkPx1x=[x0-ox,y0,x1-x0,y1-y0],removalTargets=targets))
 (d/'inputs/tiles.json').write_text(json.dumps(tiles,indent=2));manifest+= [dict(chunk=chunk,**t) for t in tiles]
# Approved native reference: style only, not geometry.
Image.open(REF/'tiles-2x2/q11-native.webp').save(O/'style-reference.webp',lossless=True,method=6)
(O/'inputs-provenance.json').write_text(json.dumps(dict(sources=sources,inventory=str(INV),inventorySha256=hashlib.sha256(INV.read_bytes()).hexdigest(),lumps=str(LUMPS),lumpsSha256=hashlib.sha256(LUMPS.read_bytes()).hexdigest(),reference=str(REF),repairSource='src/town-terrain-repair.js',repairSourceSha256=hashlib.sha256((ROOT/'src/town-terrain-repair.js').read_bytes()).hexdigest()),indent=2))
if not (O/'generation-prompts.json').exists():
 (O/'generation-prompts.json').write_text(json.dumps(dict(tool='built-in image_gen.imagegen',plannedCount=8,generations=[]),indent=2))
print(json.dumps(manifest,indent=2))
