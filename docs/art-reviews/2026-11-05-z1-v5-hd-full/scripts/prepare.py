from pathlib import Path
import json,hashlib
from PIL import Image
O=Path(__file__).resolve().parents[1]
P=Path('/Users/agapae/agapae-work/.codex-worktrees/20261105T020514Z-5d66c53d/docs/art-reviews/2026-11-05-z1-v5-hd')
master=P/'inputs/master-lossless.webp'
inv=P/'objects-inventory.json'
lumps=Path('/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Toby/2026-11-05-v5-white-lumps.json')
im=Image.open(master).convert('RGB'); objects=json.loads(inv.read_text()); fog=json.loads(lumps.read_text())['lumps']
manifest=[]
def intersect(a,b):
 x,y,w,h=a;X,Y,W,H=b
 return x<X+W and X<x+w and y<Y+H and Y<y+h
for chunk,y0 in [('r1-c4',0),('r3-c4',2048)]:
 d=O/chunk;(d/'inputs').mkdir(parents=True,exist_ok=True);x0=3072
 im.crop((x0,y0,x0+1024,y0+1024)).save(d/'inputs/v5-repaired.webp',lossless=True)
 obs=[]
 for ob in objects:
  x,y,w,h=ob['bboxWorld'];rect=[x*4915/3840,y*3277/2560,w*4915/3840,h*3277/2560]
  if ob['action']!='keep-baked' and intersect(rect,[x0-64,max(0,y0-64),1152,1152]):obs.append(dict(ob,masterRectPx1x=rect))
 fs=[f for f in fog if 'delete' in f['review'] and intersect(f['masterPx'],[x0-64,max(0,y0-64),1152,1152])]
 (d/'inputs/removal-targets.json').write_text(json.dumps(dict(objects=obs,fog=fs),ensure_ascii=False,indent=2))
 for row in range(2):
  for col in range(2):
   name=f'q{row+1}{col+1}';cx=x0+512*col;cy=y0+512*row
   l=max(0,cx-64);t=max(0,cy-64);r=min(4915,cx+576);b=min(3277,cy+576)
   rect=[l,t,r-l,b-t];crop=im.crop((l,t,r,b));crop.save(d/f'inputs/{name}-v5.png')
   removals=[]
   for ob in obs:
    if intersect(ob['masterRectPx1x'],rect):
     a=ob['masterRectPx1x'];removals.append(dict(id=ob['id'],kind=ob['kind'],rectCropPx=[round(a[0]-l),round(a[1]-t),round(a[2]),round(a[3])]))
   fogs=[dict(id=f['id'],rectCropPx=[f['masterPx'][0]-l,f['masterPx'][1]-t,*f['masterPx'][2:]]) for f in fs if intersect(f['masterPx'],rect)]
   manifest.append(dict(chunk=chunk,id=name,coreMasterPx1x=[cx,cy,512,512],contextMasterPx1x=rect,coreChunkPx1x=[col*512,row*512,512,512],contextChunkPx1x=[l-x0,t-y0,r-l,b-t],removals=removals,fog=fogs))
(O/'inputs-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
sources=[master,inv,lumps,Path('src/town-terrain-repair.js')]
(O/'source-provenance.json').write_text(json.dumps([dict(path=str(p),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),bytes=p.stat().st_size) for p in sources],indent=2))
print(json.dumps(manifest,ensure_ascii=False,indent=2))
